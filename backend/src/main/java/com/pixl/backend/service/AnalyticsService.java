package com.pixl.backend.service;

import com.clickhouse.client.api.Client;
import com.clickhouse.data.ClickHouseFormat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pixl.backend.dto.AnalyticsEvent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class AnalyticsService {
    
    private final Client clickhouseClient;
    private final Tracer tracer;
    private final Counter eventsQueuedCounter;
    private final Counter eventsFlushedCounter;
    private final ObjectMapper objectMapper;
    
    // Batch configuration
    private static final int BATCH_SIZE = 100;
    
    // Thread-safe queue for events
    private final ConcurrentLinkedQueue<AnalyticsEvent> eventQueue = new ConcurrentLinkedQueue<>();
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    public AnalyticsService(@Qualifier("clickhouseClient") Client clickhouseClient,
                           Tracer tracer,
                           MeterRegistry meterRegistry) {
        this.clickhouseClient = clickhouseClient;
        this.tracer = tracer;
        this.eventsQueuedCounter = meterRegistry.counter("analytics.events.queued");
        this.eventsFlushedCounter = meterRegistry.counter("analytics.events.flushed");
        this.objectMapper = new ObjectMapper();
        
        System.out.println("📊 Analytics Service initialized with batch size: " + BATCH_SIZE);
    }
    
    /**
     * Track an analytics event (non-blocking)
     */
    public void trackEvent(AnalyticsEvent event) {
        Span span = tracer.spanBuilder("track-analytics-event").startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("video.id", event.getVideoId());
            span.setAttribute("event.type", event.getEventType());
            
            // Add to queue
            boolean added = eventQueue.offer(event);
            
            if (added) {
                eventsQueuedCounter.increment();
                span.addEvent("Event queued for batch insert");
            } else {
                System.err.println("⚠️  Analytics queue full, event dropped");
                span.addEvent("Event dropped - queue full");
            }
            
            // Check if we should flush
            if (eventQueue.size() >= BATCH_SIZE) {
                span.addEvent("Triggering batch flush");
                flushEvents();
            }
            
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            System.err.println("❌ Failed to queue analytics event: " + e.getMessage());
        } finally {
            span.end();
        }
    }
    
    /**
     * Flush events to ClickHouse (scheduled every 5 seconds)
     */
    @Scheduled(fixedRate = 5000)
    public void scheduledFlush() {
        if (!eventQueue.isEmpty()) {
            flushEvents();
        }
    }
    
    /**
     * Flush events to ClickHouse in batch
     */
    public synchronized void flushEvents() {
        if (eventQueue.isEmpty()) {
            return;
        }
        
        Span span = tracer.spanBuilder("flush-analytics-events").startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            // Drain events from queue
            List<AnalyticsEvent> batch = new ArrayList<>();
            AnalyticsEvent event;
            
            while ((event = eventQueue.poll()) != null && batch.size() < BATCH_SIZE) {
                batch.add(event);
            }
            
            if (batch.isEmpty()) {
                return;
            }
            
            span.setAttribute("batch.size", batch.size());
            System.out.println("📊 Flushing " + batch.size() + " analytics events to ClickHouse...");
            
            // Convert events to JSONEachRow format for batch insert
            String jsonData = convertEventsToJSONEachRow(batch);
            InputStream dataStream = new ByteArrayInputStream(jsonData.getBytes(StandardCharsets.UTF_8));
            
            // Batch insert to ClickHouse
            clickhouseClient.insert(
                "analytics.video_events",
                dataStream,
                ClickHouseFormat.JSONEachRow
            ).get();
            
            eventsFlushedCounter.increment(batch.size());
            span.addEvent("Batch insert completed");
            
            System.out.println("✅ Flushed " + batch.size() + " events to ClickHouse");
            
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            System.err.println("❌ Failed to flush analytics events: " + e.getMessage());
            e.printStackTrace();
        } finally {
            span.end();
        }
    }
    
    /**
     * Convert events to JSONEachRow format for ClickHouse insert
     */
    private String convertEventsToJSONEachRow(List<AnalyticsEvent> events) {
        StringBuilder json = new StringBuilder();
        
        for (AnalyticsEvent event : events) {
            try {
                ObjectNode node = objectMapper.createObjectNode();
                
                node.put("video_id", event.getVideoId());
                node.put("user_id", event.getUserId() != null ? event.getUserId() : "");
                node.put("event_type", event.getEventType());
                node.put("timestamp", event.getTimestamp().format(DATE_TIME_FORMATTER));
                node.put("video_time", event.getVideoTime() != null ? event.getVideoTime() : 0.0f);
                node.put("quality", event.getQuality() != null ? event.getQuality() : "");
                node.put("buffer_duration_ms", event.getBufferDurationMs() != null ? event.getBufferDurationMs() : 0);
                node.put("user_agent", event.getUserAgent() != null ? event.getUserAgent() : "");
                node.put("ip_address", event.getIpAddress() != null ? event.getIpAddress() : "");
                node.put("session_id", event.getSessionId() != null ? event.getSessionId() : "");
                
                json.append(objectMapper.writeValueAsString(node)).append("\n");
                
            } catch (Exception e) {
                System.err.println("⚠️  Failed to serialize event: " + e.getMessage());
            }
        }
        
        return json.toString();
    }
    
    /**
     * Get current queue size
     */
    public int getQueueSize() {
        return eventQueue.size();
    }
    
    /**
     * Flush remaining events on shutdown
     */
    @PreDestroy
    public void shutdown() {
        System.out.println("📊 Shutting down Analytics Service, flushing remaining events...");
        flushEvents();
        System.out.println("✅ Analytics Service shutdown complete");
    }
}