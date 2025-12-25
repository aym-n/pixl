package com.pixl.backend.service;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Service
public class FFmpegService {
    private final Tracer tracer;

    private static final Map<String, QualitySettings> QUALITY_MAP = new HashMap<>();
    
    static {
        QUALITY_MAP.put("360p", new QualitySettings(640, 360, "500k"));
        QUALITY_MAP.put("480p", new QualitySettings(854, 480, "1000k"));
        QUALITY_MAP.put("720p", new QualitySettings(1280, 720, "2500k"));
        QUALITY_MAP.put("1080p", new QualitySettings(1920, 1080, "5000k"));
    }

    public FFmpegService(Tracer tracer){
        this.tracer = tracer;
    }

    public Path transcode(Path inputPath, String quality, Path outputPath) throws Exception {
        Span span = tracer.spanBuilder("ffmpeg-transcode").startSpan();

        try(Scope scope = span.makeCurrent()){
            span.setAttribute("input.path", inputPath.toString());
            span.setAttribute("output.path", outputPath.toString());
            span.setAttribute("quality", quality);

            QualitySettings settings = QUALITY_MAP.get(quality);
            if(settings == null){
                throw new IllegalArgumentException("Unknown quality: " + quality);
            }

            span.setAttribute("resolution.width", settings.width);
            span.setAttribute("resolution.height", settings.height);
            span.setAttribute("bitrate", settings.bitrate);

            ProcessBuilder processBuilder = new ProcessBuilder(
                "ffmpeg",
                "-i", inputPath.toString(),
                "-c:v", "libx264",           // H.264 codec
                "-preset", "medium",          // Encoding speed/quality tradeoff
                "-crf", "23",                 // Constant Rate Factor (quality)
                "-vf", String.format("scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2", 
    settings.width, settings.height, settings.width, settings.height),
                "-c:a", "aac",                // Audio codec
                "-b:a", "128k",               // Audio bitrate
                "-movflags", "+faststart",    // Enable streaming
                "-y",                         // Overwrite output file
                outputPath.toString()
            );

            span.addEvent("FFmpeg process started");
            System.out.println("[FFmpegService] Starting FFmpeg transcode to " + quality + "...");

            Process process = processBuilder.start();
            monitorFFmpegProgress(process, span);

            int exitCode = process.waitFor();
            span.setAttribute("ffmpeg.exit_code", exitCode);
            
            if (exitCode != 0) {
                String error = readProcessError(process);
                span.recordException(new RuntimeException("FFmpeg failed: " + error));
                throw new RuntimeException("FFmpeg failed with exit code " + exitCode + ": " + error);
            }
            
            long outputSize = Files.size(outputPath);
            span.setAttribute("output.size", outputSize);
            span.addEvent("FFmpeg transcode completed");
            
            System.out.println("[FFmpegService] FFmpeg transcode completed: " + quality + 
                             " (" + (outputSize / 1024 / 1024) + " MB)");
            
            return outputPath;
        }catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }

    private void monitorFFmpegProgress(Process process, Span span) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream()))) {
                
                String line;
                while ((line = reader.readLine()) != null) {
                    // FFmpeg outputs progress to stderr
                    if (line.contains("time=")) {
                        // You could parse this and update progress
                        // For now, just log it
                    }
                }
            } catch (IOException e) {
                // Ignore
            }
        }).start();
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
    
    private static class QualitySettings {
        final int width;
        final int height;
        final String bitrate;
        
        QualitySettings(int width, int height, String bitrate) {
            this.width = width;
            this.height = height;
            this.bitrate = bitrate;
        }
    }
}
