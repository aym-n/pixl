package com.pixl.backend.controller;

import com.pixl.backend.dto.InitiateUploadRequest;
import com.pixl.backend.dto.InitiateUploadResponse;
import com.pixl.backend.dto.UploadProgressResponse;
import com.pixl.backend.model.Video;
import com.pixl.backend.service.ChunkedUploadService;
import com.pixl.backend.service.MinioService;
import com.pixl.backend.service.VideoService;

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
    private final MinioService minioService;

    public VideoController(VideoService videoService, ChunkedUploadService chunkedUploadService,
            MinioService minioService) {
        this.videoService = videoService;
        this.chunkedUploadService = chunkedUploadService;
        this.minioService = minioService;
    }

    @PostMapping("/upload/initiate")
    public ResponseEntity<InitiateUploadResponse> initiateUpload(@RequestBody InitiateUploadRequest request) {
        try {
            InitiateUploadResponse response = chunkedUploadService.initiateUpload(
                    request.getFilename(),
                    request.getFileSize(),
                    request.getTitle(),
                    request.getDescription());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
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
                    uploadId, chunkNumber, chunk);
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

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadVideo(@PathVariable String id) {
        try {
            Video video = videoService.getVideo(id);

            byte[] videoData = minioService.downloadFileAsBytes(
                    "videos-original",
                    video.getFilePath());

            return ResponseEntity.ok()
                    .header("Content-Type", "video/mp4")
                    .header("Content-Disposition", "attachment; filename=\"" + video.getOriginalFilename() + "\"")
                    .body(videoData);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<byte[]> getThumbnail(@PathVariable String id) {
        try {
            Video video = videoService.getVideo(id);

            if (video.getThumbnailPath() == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] thumbnailData = minioService.downloadFileAsBytes(
                    "thumbnails",
                    video.getThumbnailPath());

            return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .header("Cache-Control", "max-age=86400") // Cache for 1 day
                    .body(thumbnailData);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}