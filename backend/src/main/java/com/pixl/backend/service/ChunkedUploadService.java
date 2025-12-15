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



@Service
public class ChunkedUploadService {
    private final UploadSessionRepository uploadSessionRepository;
    private final VideoRepository videoRepository;
    private final MinioService minioService;

    @Value("${app.upload.chunk-size}")
    private Integer defaultChunkSize;
    
    public ChunkedUploadService(UploadSessionRepository uploadSessionRepository, VideoRepository videoRepository, MinioService minioService) {
        this.uploadSessionRepository = uploadSessionRepository;
        this.videoRepository = videoRepository;
        this.minioService = minioService;
    }

    public InitiateUploadResponse initiateUpload(String filename, Long fileSize, String title, String description) throws IOException{

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

        System.out.println("[ChunkedUpload] Initiated upload: " + uploadId + " for file: " + filename);

        return new InitiateUploadResponse(uploadId, defaultChunkSize, session.getTotalChunks());
    }

    public UploadProgressResponse uploadChunk(String uploadId, Integer chunkNumber, MultipartFile chunk) throws Exception{
        UploadSession session = uploadSessionRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        String chunkObjectName = uploadId + "_chunk_" + chunkNumber;
        minioService.uploadChunk(chunkObjectName, chunk.getBytes());

        session.addChunk(chunkNumber);
        uploadSessionRepository.save(session);

        System.out.println("[ChunkedUpload] Uploaded chunk " + chunkNumber + " for uploadId: " + uploadId);
        return new UploadProgressResponse(
            uploadId,
            session.getUploadedChunks().size(),
            session.getTotalChunks(),
            session.getProgress(),
            session.getStatus().name()
        );
    }

    public Video completeUpload(String uploadId) throws Exception{
        UploadSession session = uploadSessionRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        if(!session.isComplete()) {
            throw new RuntimeException("Upload is not complete");
        }

        System.out.println("[ChunkedUpload] Completing upload for uploadId: " + uploadId);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        for(int i = 0; i < session.getTotalChunks(); i++) {
            String chunkObjectName = uploadId + "_chunk_" + i;
            byte[] chunkData = minioService.downloadChunk(chunkObjectName);
            outputStream.write(chunkData);

            minioService.deleteChunk(chunkObjectName);
        }

        byte[] finalFileData = outputStream.toByteArray();

        String fileExtension = session.getFilename().substring(
            session.getFilename().lastIndexOf(".")
        );
        String finalObjectName = uploadId + fileExtension;
        
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(finalFileData)) {
            minioService.uploadOriginalVideo(finalObjectName, inputStream, finalFileData.length);
        }

        session.setStatus(UploadStatus.COMPLETED);
        uploadSessionRepository.save(session);

        Video video = videoRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Video not found"));

        video.setFilePath(finalObjectName);
        video.setFileSize((long)finalFileData.length);
        video.setStatus(VideoStatus.READY);

        System.out.println("[ChunkedUpload] Upload completed for uploadId: " + uploadId);

        return videoRepository.save(video);
    }

    public UploadProgressResponse getProgress(String uploadId) {
        UploadSession session = uploadSessionRepository.findById(uploadId)
            .orElseThrow(() -> new RuntimeException("Upload session not found"));
        
        return new UploadProgressResponse(
            uploadId,
            session.getUploadedChunks().size(),
            session.getTotalChunks(),
            session.getProgress(),
            session.getStatus().name()
        );
    }
}
