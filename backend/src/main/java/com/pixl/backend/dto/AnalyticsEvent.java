package com.pixl.backend.dto;

import java.time.LocalDateTime;

public class AnalyticsEvent {
    
    private String videoId;
    private String userId;
    private String eventType;  // view, play, pause, seek, complete, quality_change, buffer
    private LocalDateTime timestamp;
    private Float videoTime;
    private String quality;
    private Integer bufferDurationMs;
    private String userAgent;
    private String ipAddress;
    private String sessionId;
    
    public AnalyticsEvent() {
        this.timestamp = LocalDateTime.now();
    }
    
    public AnalyticsEvent(String videoId, String userId, String eventType) {
        this.videoId = videoId;
        this.userId = userId;
        this.eventType = eventType;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getVideoId() {
        return videoId;
    }
    
    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }
    
    public String getUserId() {
        return userId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    public String getEventType() {
        return eventType;
    }
    
    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public Float getVideoTime() {
        return videoTime;
    }
    
    public void setVideoTime(Float videoTime) {
        this.videoTime = videoTime;
    }
    
    public String getQuality() {
        return quality;
    }
    
    public void setQuality(String quality) {
        this.quality = quality;
    }
    
    public Integer getBufferDurationMs() {
        return bufferDurationMs;
    }
    
    public void setBufferDurationMs(Integer bufferDurationMs) {
        this.bufferDurationMs = bufferDurationMs;
    }
    
    public String getUserAgent() {
        return userAgent;
    }
    
    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
    
    public String getIpAddress() {
        return ipAddress;
    }
    
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}