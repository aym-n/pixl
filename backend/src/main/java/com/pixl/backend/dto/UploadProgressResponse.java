package com.pixl.backend.dto;

import java.io.ObjectInputFilter.Status;

public class UploadProgressResponse {
    private String uploadId;
    private Integer uploadedChunks;
    private Integer totalChunks;
    private double progress;
    private String status;
    
    public UploadProgressResponse(String uploadId, Integer uploadedChunks, Integer totalChunks, 
                                  Double progress, String status) {
        this.uploadId = uploadId;
        this.uploadedChunks = uploadedChunks;
        this.totalChunks = totalChunks;
        this.progress = progress;
        this.status = status;
    }

    public String getUploadId() {
        return uploadId;
    }
    
    public void setUploadId(String uploadId) {
        this.uploadId = uploadId;
    }
    
    public Integer getUploadedChunks() {
        return uploadedChunks;
    }
    
    public void setUploadedChunks(Integer uploadedChunks) {
        this.uploadedChunks = uploadedChunks;
    }
    
    public Integer getTotalChunks() {
        return totalChunks;
    }
    
    public void setTotalChunks(Integer totalChunks) {
        this.totalChunks = totalChunks;
    }
    
    public Double getProgress() {
        return progress;
    }
    
    public void setProgress(Double progress) {
        this.progress = progress;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
}
