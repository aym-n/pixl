package com.pixl.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;

@Configuration
public class MetricsConfig {
    
    @Bean
    public Counter videoUploadCounter(MeterRegistry registry) {
        return Counter.builder("video.upload.total")
            .description("Total number of video uploads")
            .register(registry);
    }
    
    @Bean
    public Counter uploadSuccessCounter(MeterRegistry registry) {
        return Counter.builder("video.upload.success")
            .description("Successful video uploads")
            .register(registry);
    }
    
    @Bean
    public Counter uploadFailureCounter(MeterRegistry registry) {
        return Counter.builder("video.upload.failure")
            .description("Failed video uploads")
            .register(registry);
    }
    
    @Bean
    public Timer uploadDurationTimer(MeterRegistry registry) {
        return Timer.builder("video.upload.duration")
            .description("Time taken to upload video")
            .register(registry);
    }
    
    @Bean
    public Timer chunkUploadTimer(MeterRegistry registry) {
        return Timer.builder("video.chunk.upload.duration")
            .description("Time taken to upload a chunk")
            .register(registry);
    }
    
    @Bean
    public Counter minioOperationCounter(MeterRegistry registry) {
        return Counter.builder("minio.operation.total")
            .description("Total MinIO operations")
            .tag("operation", "unknown")
            .register(registry);
    }
}
