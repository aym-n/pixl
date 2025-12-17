package com.pixl.backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.pixl.backend.model.Video;
import com.pixl.backend.repository.VideoRepository;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

@Service
public class ThumbnailService {
    private final MinioService minioService;
    private final VideoRepository videoRepository;
    private final Tracer tracer;

    @Value("${minio.bucket.videos-original}")
    private String originalBucket;

    @Value("${minio.bucket.thumbnails}")
    private String thumbnailsBucket;

    public ThumbnailService(MinioService minioService, VideoRepository videoRepository, Tracer tracer) {
        this.minioService = minioService;
        this.videoRepository = videoRepository;
        this.tracer = tracer;
    }

    public void generateThumbnail(String videoId) throws Exception {
        Span span = tracer.spanBuilder("generate-thumbnail").startSpan();
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("video.id", videoId);

            Video video = videoRepository.findById(videoId).orElseThrow(() -> new RuntimeException("video not found"));

            System.out.println("[ThumbnailService]: generating thumbnail for video:" + videoId);

            Span downloadSpan = tracer.spanBuilder("download-video-thumbnail").startSpan();
            Path inputPath = null;
            try (Scope downloadScope = downloadSpan.makeCurrent()) {
                inputPath = Files.createTempFile("thumb-input-", ".mp4");

                try (InputStream stream = minioService.downloadFile(originalBucket, video.getFilePath())) {
                    Files.copy(stream, inputPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }

                downloadSpan.addEvent("Video downloaded for thumbnail extraction");
            } finally {
                downloadSpan.end();
            }

            Span extractSpan = tracer.spanBuilder("extract-thumbnail-frame").startSpan();
            Path thumbnailPath = null;

            try (Scope extractScope = extractSpan.makeCurrent()) {
                thumbnailPath = Files.createTempFile("thumb-", ".jpg");

                ProcessBuilder processBuilder = new ProcessBuilder(
                        "ffmpeg",
                        "-i", inputPath.toString(),
                        "-ss", "00:00:02",
                        "-vframes", "1",
                        "-vf", "scale=640:-1",
                        "-q:v", "2",
                        "-y",
                        thumbnailPath.toString());

                extractSpan.addEvent("FFmpeg thumbnail extraction started");

                Process process = processBuilder.start();
                int exitCode = process.waitFor();

                if (exitCode != 0) {
                    String error = readProcessError(process);
                    throw new RuntimeException("FFmpeg thumbnail failed: " + error);
                }

                long thumbSize = Files.size(thumbnailPath);
                extractSpan.setAttribute("thumbnail.size", thumbSize);
                extractSpan.addEvent("Thumbnail extracted");

                System.out.println("[ThumbnailService] Thumbnail Extracted for videoId:" + videoId);
            } finally {
                extractSpan.end();
            }

            Span uploadSpan = tracer.spanBuilder("upload-thumbnail").startSpan();
            String thumbnailObjectName = null;

            try (Scope uploadScope = uploadSpan.makeCurrent()) {
                thumbnailObjectName = videoId + "-thumb.jpg";

                try (InputStream stream = Files.newInputStream(thumbnailPath)) {
                    long size = Files.size(thumbnailPath);
                    minioService.uploadFile(thumbnailsBucket, thumbnailObjectName, stream, size, "image/jpeg");
                }

                uploadSpan.addEvent("Thumbnail uploaded to MinIO");

                video.setThumbnailPath(thumbnailObjectName);
                videoRepository.save(video);

                System.out.println("[ThumbnailService] Thumbnail uploaded: " + thumbnailObjectName);

            } finally {
                uploadSpan.end();

                if (inputPath != null)
                    Files.deleteIfExists(inputPath);
                if (thumbnailPath != null)
                    Files.deleteIfExists(thumbnailPath);
            }

            span.addEvent("Thumbnail generation completed");
            System.out.println("[ThumbnailService]Thumbnail generation completed for: " + videoId);

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            System.err.println("[ThumbnailService]: Thumbnail generation failed: " + e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    private String readProcessError(Process process) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getErrorStream()))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (IOException e) {
            return "Could not read error stream";
        }
    }
}
