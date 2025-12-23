package com.pixl.backend.controller;

import com.pixl.backend.dto.AnalyticsEvent;
import com.pixl.backend.service.AnalyticsQueryService;
import com.pixl.backend.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "http://localhost:3000")
public class AnalyticsController {
    
    private final AnalyticsService analyticsService;
    private final AnalyticsQueryService analyticsQueryService;
    
    public AnalyticsController(AnalyticsService analyticsService,
                              AnalyticsQueryService analyticsQueryService) {
        this.analyticsService = analyticsService;
        this.analyticsQueryService = analyticsQueryService;
    }
    
    /**
     * Track video playback event
     */
    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> trackEvent(
            @RequestBody AnalyticsEvent event,
            HttpServletRequest request) {
        
        if (event.getUserAgent() == null) {
            event.setUserAgent(request.getHeader("User-Agent"));
        }
        
        if (event.getIpAddress() == null) {
            event.setIpAddress(getClientIP(request));
        }
        
        if (event.getSessionId() == null) {
            event.setSessionId(UUID.randomUUID().toString());
        }
        
        analyticsService.trackEvent(event);
        
        return ResponseEntity.ok(Map.of(
            "status", "queued",
            "queueSize", analyticsService.getQueueSize()
        ));
    }
    
    /**
     * Get dashboard statistics
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> dashboard = Map.of(
            "totalViews", analyticsQueryService.getTotalViews(),
            "topVideos", analyticsQueryService.getTopVideos(10),
            "realtimeStats", analyticsQueryService.getRealtimeStats()
        );
        
        return ResponseEntity.ok(dashboard);
    }
    
    /**
     * Get video-specific analytics
     */
    @GetMapping("/videos/{id}")
    public ResponseEntity<Map<String, Object>> getVideoAnalytics(@PathVariable String id) {
        Map<String, Object> analytics = Map.of(
            "videoId", id,
            "views", analyticsQueryService.getVideoViews(id),
            "watchStats", analyticsQueryService.getVideoWatchStats(id),
            "qualityDistribution", analyticsQueryService.getQualityDistribution(id),
            "viewsOverTime", analyticsQueryService.getViewsOverTime(id)
        );
        
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/videos/{id}/views")
    public ResponseEntity<Long> getVideoViews(@PathVariable String id) {
        long views = analyticsQueryService.getVideoViews(id);
        return ResponseEntity.ok(views);
    }
    
    /**
     * Get queue status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "queueSize", analyticsService.getQueueSize(),
            "status", "running"
        ));
    }
    
    /**
     * Manually trigger flush (for testing)
     */
    @PostMapping("/flush")
    public ResponseEntity<Map<String, String>> flush() {
        analyticsService.flushEvents();
        return ResponseEntity.ok(Map.of("status", "flushed"));
    }
    
    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }
        
        return request.getRemoteAddr();
    }
}