package com.pixl.backend.controller;

import com.pixl.backend.dto.InitiateUploadRequest;
import com.pixl.backend.dto.InitiateUploadResponse;
import com.pixl.backend.dto.UploadProgressResponse;
import com.pixl.backend.model.Video;
import com.pixl.backend.service.ChunkedUploadService;
import com.pixl.backend.service.VideoService;

import jakarta.persistence.criteria.CriteriaBuilder.In;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = "*")
public class VideoController {

    private final VideoService videoService;
    private final ChunkedUploadService chunkedUploadService;

    public VideoController(VideoService videoService, ChunkedUploadService chunkedUploadService) {
        this.videoService = videoService;
        this.chunkedUploadService = chunkedUploadService;
    }

    @PostMapping("/upload/initiate")
    public ResponseEntity<InitiateUploadResponse> initiateUpload(@RequestBody InitiateUploadRequest request) {
        try {
            InitiateUploadResponse response = chunkedUploadService.initiateUpload(
                request.getFilename(),
                request.getFileSize(),
                request.getTitle(),
                request.getDescription()
            );
            return ResponseEntity.ok(response);
        }catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

        @PostMapping("/upload/chunk")
    public ResponseEntity<UploadProgressResponse> uploadChunk(
            @RequestParam("uploadId") String uploadId,
            @RequestParam("chunkNumber") Integer chunkNumber,
            @RequestParam("chunk") MultipartFile chunk) {
        try {
            UploadProgressResponse response = chunkedUploadService.uploadChunk(
                uploadId, chunkNumber, chunk
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/upload/complete")
    public ResponseEntity<Video> completeUpload(@RequestParam("uploadId") String uploadId) {
        try {
            Video video = chunkedUploadService.completeUpload(uploadId);
            return ResponseEntity.ok(video);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/upload/progress/{uploadId}")
    public ResponseEntity<UploadProgressResponse> getProgress(@PathVariable String uploadId) {
        try {
            UploadProgressResponse response = chunkedUploadService.getProgress(uploadId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping
    public ResponseEntity<List<Video>> getAllVideos() {
        return ResponseEntity.ok(videoService.getAllVideos());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Video> getVideo(@PathVariable String id) {
        return ResponseEntity.ok(videoService.getVideo(id));
    }
}