package com.pixl.backend.dto;

import java.io.Serializable;

public class TranscodeMessage implements Serializable {
    
    private String jobId;
    private String videoId;
    private String quality;
    private String inputPath;
    private String traceId;  
    private String spanId;
    
    public TranscodeMessage() {}
    
    public TranscodeMessage(String jobId, String videoId, String quality, String inputPath) {
        this.jobId = jobId;
        this.videoId = videoId;
        this.quality = quality;
        this.inputPath = inputPath;
    }

    public String getJobId() {
        return jobId;
    }
    
    public void setJobId(String jobId) {
        this.jobId = jobId;
    }
    
    public String getVideoId() {
        return videoId;
    }
    
    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }
    
    public String getQuality() {
        return quality;
    }
    
    public void setQuality(String quality) {
        this.quality = quality;
    }
    
    public String getInputPath() {
        return inputPath;
    }
    
    public void setInputPath(String inputPath) {
        this.inputPath = inputPath;
    }
    
    public String getTraceId() {
        return traceId;
    }
    
    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
    
    public String getSpanId() {
        return spanId;
    }
    
    public void setSpanId(String spanId) {
        this.spanId = spanId;
    }
}