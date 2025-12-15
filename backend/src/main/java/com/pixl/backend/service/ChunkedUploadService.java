package com.pixl.backend.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.pixl.backend.dto.InitiateUploadResponse;
import com.pixl.backend.dto.UploadProgressResponse;
import com.pixl.backend.model.UploadSession;
import com.pixl.backend.model.UploadStatus;
import com.pixl.backend.model.Video;
import com.pixl.backend.model.VideoStatus;
import com.pixl.backend.repository.UploadSessionRepository;
import com.pixl.backend.repository.VideoRepository;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.context.Scope;
import io.opentelemetry.api.trace.Tracer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;



@Service
public class ChunkedUploadService {
    private final UploadSessionRepository uploadSessionRepository;
    private final VideoRepository videoRepository;
    private final MinioService minioService;
    private final Tracer tracer;
    private final Counter videoUploadCounter;
    private final Counter uploadSuccessCounter;
    private final Counter uploadFailureCounter;
    private final Timer chunkUploadTimer;

    @Value("${app.upload.chunk-size}")
    private Integer defaultChunkSize;
    
    public ChunkedUploadService(UploadSessionRepository uploadSessionRepository, VideoRepository videoRepository, MinioService minioService, Tracer tracer, Counter videoUploadCounter, Counter uploadSuccessCounter, Counter uploadFailureCounter, Timer chunkUploadTimer) {
        this.uploadSessionRepository = uploadSessionRepository;
        this.videoRepository = videoRepository;
        this.minioService = minioService;
        this.tracer = tracer;
        this.videoUploadCounter = videoUploadCounter;
        this.uploadSuccessCounter = uploadSuccessCounter;
        this.uploadFailureCounter = uploadFailureCounter;
        this.chunkUploadTimer = chunkUploadTimer;
    }

    public InitiateUploadResponse initiateUpload(String filename, Long fileSize, String title, String description) throws IOException{

        Span span = tracer.spanBuilder("initiateUpload").startSpan();
        try(Scope scope = span.makeCurrent()) {

            span.setAttribute("filename", filename);
            span.setAttribute("file.size", fileSize);
            span.setAttribute("title", title);
            
            videoUploadCounter.increment();

            String uploadId = UUID.randomUUID().toString();

            UploadSession session = new UploadSession(uploadId, filename, fileSize, defaultChunkSize);
            uploadSessionRepository.save(session);

            Video video = new Video(title, description);
            video.setId(uploadId);
            video.setTitle(title);
            video.setDescription(description);
            video.setOriginalFilename(filename);
            video.setFileSize(fileSize);
            video.setStatus(VideoStatus.UPLOADED);

            videoRepository.save(video);

            span.setAttribute("upload.id", uploadId);
            span.setAttribute("total.chunks", session.getTotalChunks());
            span.addEvent("Upload session created");

            System.out.println("[ChunkedUpload] Initiated upload: " + uploadId + " for file: " + filename);

            return new InitiateUploadResponse(uploadId, defaultChunkSize, session.getTotalChunks());

            
        } catch (Exception e) {

            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            uploadFailureCounter.increment();
            throw e;
            
        } finally {
            span.end();
        }

    }

    public UploadProgressResponse uploadChunk(String uploadId, Integer chunkNumber, 
                                             MultipartFile chunk) throws Exception {
        Span span = tracer.spanBuilder("upload-chunk").startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("upload.id", uploadId);
            span.setAttribute("chunk.number", chunkNumber);
            span.setAttribute("chunk.size", chunk.getSize());
            
            return chunkUploadTimer.record(() -> {
                try {
                    UploadSession session = uploadSessionRepository.findById(uploadId)
                        .orElseThrow(() -> new RuntimeException("Upload session not found"));
                    
                    String chunkObjectName = uploadId + "_chunk_" + chunkNumber;
                    minioService.uploadChunk(chunkObjectName, chunk.getBytes());
                    
                    span.addEvent("Chunk uploaded to MinIO");
                    
                    session.addChunk(chunkNumber);
                    uploadSessionRepository.save(session);
                    
                    span.setAttribute("progress", session.getProgress());
                    span.setAttribute("uploaded.chunks", session.getUploadedChunks().size());
                    
                    System.out.println("[ChunkedUpload] Uploaded chunk " + chunkNumber + " for uploadId: " + uploadId);
                    
                    return new UploadProgressResponse(
                        uploadId,
                        session.getUploadedChunks().size(),
                        session.getTotalChunks(),
                        session.getProgress(),
                        session.getStatus().name()
                    );
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });
            
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    public Video completeUpload(String uploadId) throws Exception{

        Span span = tracer.spanBuilder("complete-upload").startSpan();
        try(Scope scope = span.makeCurrent()) {

            span.setAttribute("upload.id", uploadId);

            UploadSession session = uploadSessionRepository.findById(uploadId)
                    .orElseThrow(() -> new RuntimeException("Upload session not found"));

            if(!session.isComplete()) {
                throw new RuntimeException("Upload is not complete");
            }

            span.setAttribute("total.chunks", session.getTotalChunks());
            span.addEvent("Start chunk combination");

            System.out.println("[ChunkedUpload] Completing upload for uploadId: " + uploadId);

            Span combineSpan = tracer.spanBuilder("combine-chunks").startSpan();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            try (Scope combineScope = combineSpan.makeCurrent()) {
                for (int i = 0; i < session.getTotalChunks(); i++) {
                    String chunkObjectName = uploadId + "_chunk_" + i;
                    byte[] chunkData = minioService.downloadChunk(chunkObjectName);
                    outputStream.write(chunkData);
                    minioService.deleteChunk(chunkObjectName);
                }
                combineSpan.addEvent("All chunks combined");
            } finally {
                combineSpan.end();
            }

            byte[] finalFileData = outputStream.toByteArray();
            span.setAttribute("final.file.size", finalFileData.length);

            Span uploadSpan = tracer.spanBuilder("upload-final-file").startSpan();
            try (Scope uploadScope = uploadSpan.makeCurrent()) {
                String fileExtension = session.getFilename().substring(
                    session.getFilename().lastIndexOf(".")
                );
                String finalObjectName = uploadId + fileExtension;
                
                try (ByteArrayInputStream inputStream = new ByteArrayInputStream(finalFileData)) {
                    minioService.uploadOriginalVideo(finalObjectName, inputStream, finalFileData.length);
                }
                uploadSpan.setAttribute("object.name", finalObjectName);
                uploadSpan.addEvent("Final file uploaded to MinIO");
            } finally {
                uploadSpan.end();
            }


            session.setStatus(UploadStatus.COMPLETED);
            uploadSessionRepository.save(session);

            Video video = videoRepository.findById(uploadId)
                    .orElseThrow(() -> new RuntimeException("Video not found"));

            video.setFilePath(uploadId + session.getFilename().substring(session.getFilename().lastIndexOf(".")));
            video.setFileSize((long)finalFileData.length);
            video.setStatus(VideoStatus.READY);

            System.out.println("[ChunkedUpload] Upload completed for uploadId: " + uploadId);
            uploadSuccessCounter.increment();
            span.addEvent("Upload completed successfully");

            return videoRepository.save(video);

        } catch (Exception e) {

            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            uploadFailureCounter.increment();
            throw e;

        } finally {
            span.end();
        }
    }

    public UploadProgressResponse getProgress(String uploadId) {
        Span span = tracer.spanBuilder("get-upload-progress").startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("upload.id", uploadId);
            
            UploadSession session = uploadSessionRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));
            
            span.setAttribute("progress", session.getProgress());
            
            return new UploadProgressResponse(
                uploadId,
                session.getUploadedChunks().size(),
                session.getTotalChunks(),
                session.getProgress(),
                session.getStatus().name()
            );
        } finally {
            span.end();
        }
    }
}
