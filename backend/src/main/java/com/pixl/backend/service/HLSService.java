package com.pixl.backend.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

@Service
public class HLSService {
    private final MinioService minioService;
    private final Tracer tracer;

    @Value("${minio.bucket.videos-transcoded}")
    private String transcodedBucket;

    @Value("${app.transcode.qualities}")
    private String qualities;

    public HLSService(MinioService minioService,
            Tracer tracer) {
        this.minioService = minioService;
        this.tracer = tracer;
    }

    public void generateHLS(String videoId) {
        Span span = tracer.spanBuilder("generate-hls").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("video.id", videoId);
            System.out.println("[HLSService] generating HLS Stream for " + videoId);

            List<String> qualityLevels = Arrays.asList(qualities.split(","));

            for (String quality : qualityLevels) {
                generateHLSforQuality(videoId, quality.trim(), span);
            }

            generateMasterPlaylist(videoId, qualityLevels);

            span.addEvent("hls-generation-complete");
            System.out.println("[HLSService] HLS Stream generated for " + videoId);
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
        } finally {
            span.end();
        }
    }

    public void generateHLSforQuality(String videoId, String quality, Span parentspan) throws Exception {

        Span span = tracer.spanBuilder("generate-hls-quality").startSpan();

        try {
            span.setAttribute("quality", quality);
            String inputObjectName = videoId + "-" + quality + ".mp4";

            if (!minioService.fileExists(transcodedBucket, inputObjectName)) {
                System.out.println("[HLSService] Skipping " + quality + " - file not found");
                return;
            }

            System.out.println("[HLSService] Generating HLS for " + quality + "...");

            Path inputPath = Files.createTempFile("hls-input-", ".mp4");
            try (InputStream stream = minioService.downloadFile(transcodedBucket, inputObjectName)) {
                Files.copy(stream, inputPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            Path hlsDir = Files.createTempDirectory("hls-" + quality + "-");
            Path playlistPath = hlsDir.resolve("playlist.m3u8");

            ProcessBuilder processBuilder = new ProcessBuilder(
                    "ffmpeg",
                    "-i", inputPath.toString(),
                    "-codec:", "copy",
                    "-start_number", "0",
                    "-hls_time", "6",
                    "-hls_list_size", "0",
                    "-hls_segment_filename", hlsDir.resolve("segment%03d.ts").toString(),
                    "-f", "hls",
                    playlistPath.toString());

            Process process = processBuilder.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String error = readProcessError(process);
                throw new RuntimeException("HLS generation failed: " + error);
            }

            uploadHLSFiles(videoId, quality, hlsDir);

            Files.deleteIfExists(inputPath);
            deleteDirectory(hlsDir);

            span.addEvent("HLS quality stream generated");

        } finally {
            span.end();
        }

    }

    private void uploadHLSFiles(String videoId, String quality, Path hlsDir) throws Exception {
        Path playlistPath = hlsDir.resolve("playlist.m3u8");
        String playlistObjectName = videoId + "/hls/" + quality + "/playlist.m3u8";

        try (InputStream stream = Files.newInputStream(playlistPath)) {
            minioService.uploadFile(transcodedBucket, playlistObjectName,
                    stream, Files.size(playlistPath), "application/vnd.apple.mpegurl");
        }

        Files.list(hlsDir)
                .filter(path -> path.toString().endsWith(".ts"))
                .forEach(segmentPath -> {
                    try {
                        String segmentObjectName = videoId + "/hls/" + quality + "/"
                                + segmentPath.getFileName().toString();
                        try (InputStream stream = Files.newInputStream(segmentPath)) {
                            minioService.uploadFile(transcodedBucket, segmentObjectName,
                                    stream, Files.size(segmentPath), "video/mp2t");
                        }
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to upload segment: " + e.getMessage());
                    }
                });

    }

    private void generateMasterPlaylist(String videoId, List<String> qualityLevels) throws Exception {
        StringBuilder masterPlaylist = new StringBuilder();
        masterPlaylist.append("#EXTM3U\n");
        masterPlaylist.append("#EXT-X-VERSION:3\n\n");

        for (String quality : qualityLevels) {
            String trimmedQuality = quality.trim();
            String objectName = videoId + "-" + trimmedQuality + ".mp4";

            if (!minioService.fileExists(transcodedBucket, objectName)) {
                continue;
            }

            int bandwidth = getBandwidthForQuality(trimmedQuality);
            String resolution = getResolutionForQuality(trimmedQuality);

            masterPlaylist.append("#EXT-X-STREAM-INF:BANDWIDTH=").append(bandwidth)
                    .append(",RESOLUTION=").append(resolution).append("\n");
            masterPlaylist.append(trimmedQuality).append("/playlist.m3u8\n\n");
        }

        String masterObjectName = videoId + "/hls/master.m3u8";
        byte[] masterContent = masterPlaylist.toString().getBytes();

        minioService.uploadFile(transcodedBucket, masterObjectName, masterContent,
                "application/vnd.apple.mpegurl");

        System.out.println("[HLSService] Master playlist generated");
    }

    private int getBandwidthForQuality(String quality) {
        return switch (quality) {
            case "360p" -> 500000;
            case "480p" -> 1000000;
            case "720p" -> 2500000;
            case "1080p" -> 5000000;
            default -> 1000000;
        };
    }

    private String getResolutionForQuality(String quality) {
        return switch (quality) {
            case "360p" -> "640x360";
            case "480p" -> "854x480";
            case "720p" -> "1280x720";
            case "1080p" -> "1920x1080";
            default -> "854x480";
        };
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

    private void deleteDirectory(Path directory) throws IOException {
        if (Files.exists(directory)) {
            Files.walk(directory)
                    .sorted((a, b) -> -a.compareTo(b)) // Reverse order to delete files before directories
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            // Ignore
                        }
                    });
        }
    }

}