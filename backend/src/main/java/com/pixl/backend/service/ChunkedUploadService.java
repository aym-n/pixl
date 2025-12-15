package com.pixl.backend.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
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

    @Value("${app.upload.directory}")
    private String uploadDirectory;
    
    @Value("${app.upload.chunk-directory}")
    private String chunkDirectory;
    
    @Value("${app.upload.chunk-size}")
    private Integer defaultChunkSize;
    
    public ChunkedUploadService(UploadSessionRepository uploadSessionRepository, VideoRepository videoRepository) {
        this.uploadSessionRepository = uploadSessionRepository;
        this.videoRepository = videoRepository;
    }

    public InitiateUploadResponse initiateUpload(String filename, Long fileSize, String title, String description) throws IOException{
        Files.createDirectories(Paths.get(chunkDirectory));
        Files.createDirectories(Paths.get(uploadDirectory));

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
        return new InitiateUploadResponse(uploadId, defaultChunkSize, session.getTotalChunks());
    }

    public UploadProgressResponse uploadChunk(String uploadId, Integer chunkNumber, MultipartFile chunk) throws IOException{
        UploadSession session = uploadSessionRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        if(session.getUploadedChunks().contains(chunkNumber)) {
            throw new RuntimeException("Chunk already uploaded");
        }

        String chunkPath = Paths.get(chunkDirectory, uploadId + "_chunk_" + chunkNumber).toString();
        Files.copy(chunk.getInputStream(), Paths.get(chunkPath));

        session.addChunk(chunkNumber);
        uploadSessionRepository.save(session);

                return new UploadProgressResponse(
            uploadId,
            session.getUploadedChunks().size(),
            session.getTotalChunks(),
            session.getProgress(),
            session.getStatus().name()
        );
    }

    public Video completeUpload(String uploadId) throws IOException{
        UploadSession session = uploadSessionRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        if(!session.isComplete()) {
            throw new RuntimeException("Upload is not complete");
        }

        String finalFilePath = Paths.get(uploadDirectory, session.getFilename()).toString();
        Files.createFile(Paths.get(finalFilePath));

        for(int i = 0; i < session.getTotalChunks(); i++) {
            String chunkPath = Paths.get(chunkDirectory, uploadId + "_chunk_" + i).toString();
            Files.write(Paths.get(finalFilePath), Files.readAllBytes(Paths.get(chunkPath)), java.nio.file.StandardOpenOption.APPEND);
            Files.delete(Paths.get(chunkPath));
        }

        session.setStatus(UploadStatus.COMPLETED);
        uploadSessionRepository.save(session);

        Video video = videoRepository.findById(uploadId)
                .orElseThrow(() -> new RuntimeException("Video not found"));

        video.setFilePath(finalFilePath);
        video.setStatus(VideoStatus.READY);
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
