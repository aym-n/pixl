package com.pixl.backend.dto;

import java.time.LocalDateTime;

public class VideoProgressUpdate {
    
    private String videoId;
    private String status;  
    private String message;
    private Integer progress;
    private TranscodeProgress transcodeProgress;
    private LocalDateTime timestamp;
    
    public VideoProgressUpdate() {
        this.timestamp = LocalDateTime.now();
    }
    
    public VideoProgressUpdate(String videoId, String status, String message, Integer progress) {
        this.videoId = videoId;
        this.status = status;
        this.message = message;
        this.progress = progress;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getVideoId() {
        return videoId;
    }
    
    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public Integer getProgress() {
        return progress;
    }
    
    public void setProgress(Integer progress) {
        this.progress = progress;
    }
    
    public TranscodeProgress getTranscodeProgress() {
        return transcodeProgress;
    }
    
    public void setTranscodeProgress(TranscodeProgress transcodeProgress) {
        this.transcodeProgress = transcodeProgress;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}