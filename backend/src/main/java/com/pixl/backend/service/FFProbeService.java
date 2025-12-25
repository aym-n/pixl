package com.pixl.backend.service;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FFProbeService {
    
    private final Tracer tracer;
    
    public FFProbeService(Tracer tracer) {
        this.tracer = tracer;
    }
    
    public VideoMetadata extractMetadata(Path videoPath) throws Exception {
        Span span = tracer.spanBuilder("ffprobe-extract-metadata").startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("video.path", videoPath.toString());
            
            ProcessBuilder processBuilder = new ProcessBuilder(
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration,size,bit_rate",
                "-show_entries", "stream=codec_name,width,height,r_frame_rate",
                "-of", "default=noprint_wrappers=1",
                videoPath.toString()
            );
            
            Process process = processBuilder.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            
            int exitCode = process.waitFor();
            
            if (exitCode != 0) {
                throw new RuntimeException("FFprobe failed with exit code: " + exitCode);
            }
            
            VideoMetadata metadata = parseFFprobeOutput(output.toString());
            
            span.setAttribute("duration.seconds", metadata.getDurationSeconds());
            span.setAttribute("width", metadata.getWidth());
            span.setAttribute("height", metadata.getHeight());
            span.addEvent("Metadata extracted");
            
            System.out.println("📊 Video metadata extracted: " + 
                             metadata.getDurationSeconds() + "s, " + 
                             metadata.getWidth() + "x" + metadata.getHeight());
            
            return metadata;
            
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
    
    private VideoMetadata parseFFprobeOutput(String output) {
        VideoMetadata metadata = new VideoMetadata();
        
        // Parse duration
        Pattern durationPattern = Pattern.compile("duration=([0-9.]+)");
        Matcher durationMatcher = durationPattern.matcher(output);
        if (durationMatcher.find()) {
            double duration = Double.parseDouble(durationMatcher.group(1));
            metadata.setDurationSeconds((int) Math.round(duration));
        }
        
        // Parse width
        Pattern widthPattern = Pattern.compile("width=([0-9]+)");
        Matcher widthMatcher = widthPattern.matcher(output);
        if (widthMatcher.find()) {
            metadata.setWidth(Integer.parseInt(widthMatcher.group(1)));
        }
        
        // Parse height
        Pattern heightPattern = Pattern.compile("height=([0-9]+)");
        Matcher heightMatcher = heightPattern.matcher(output);
        if (heightMatcher.find()) {
            metadata.setHeight(Integer.parseInt(heightMatcher.group(1)));
        }
        
        // Parse codec
        Pattern codecPattern = Pattern.compile("codec_name=([a-z0-9]+)");
        Matcher codecMatcher = codecPattern.matcher(output);
        if (codecMatcher.find()) {
            metadata.setCodec(codecMatcher.group(1));
        }
        
        // Parse bitrate
        Pattern bitratePattern = Pattern.compile("bit_rate=([0-9]+)");
        Matcher bitrateMatcher = bitratePattern.matcher(output);
        if (bitrateMatcher.find()) {
            metadata.setBitrate(Long.parseLong(bitrateMatcher.group(1)));
        }
        
        return metadata;
    }
    
    public static class VideoMetadata {
        private Integer durationSeconds;
        private Integer width;
        private Integer height;
        private String codec;
        private Long bitrate;
        
        public Integer getDurationSeconds() {
            return durationSeconds;
        }
        
        public void setDurationSeconds(Integer durationSeconds) {
            this.durationSeconds = durationSeconds;
        }
        
        public Integer getWidth() {
            return width;
        }
        
        public void setWidth(Integer width) {
            this.width = width;
        }
        
        public Integer getHeight() {
            return height;
        }
        
        public void setHeight(Integer height) {
            this.height = height;
        }
        
        public String getCodec() {
            return codec;
        }
        
        public void setCodec(String codec) {
            this.codec = codec;
        }
        
        public Long getBitrate() {
            return bitrate;
        }
        
        public void setBitrate(Long bitrate) {
            this.bitrate = bitrate;
        }
    }
}