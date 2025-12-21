package com.pixl.backend.dto;

public class QualityProgress {
    
    private String quality;
    private String status; // QUEUED, PROCESSING, COMPLETED, FAILED
    private Integer progress; // 0-100 for processing
    private String workerId;
    
    public QualityProgress() {}
    
    public QualityProgress(String quality, String status) {
        this.quality = quality;
        this.status = status;
    }
    
    // Getters and Setters
    public String getQuality() {
        return quality;
    }
    
    public void setQuality(String quality) {
        this.quality = quality;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Integer getProgress() {
        return progress;
    }
    
    public void setProgress(Integer progress) {
        this.progress = progress;
    }
    
    public String getWorkerId() {
        return workerId;
    }
    
    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }
}