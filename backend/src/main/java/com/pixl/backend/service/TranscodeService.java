package com.pixl.backend.service;


import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.pixl.backend.dto.TranscodeMessage;
import com.pixl.backend.model.TranscodeJob;
import com.pixl.backend.model.TranscodeStatus;
import com.pixl.backend.model.Video;
import com.pixl.backend.model.VideoStatus;
import com.pixl.backend.repository.TranscodeJobRepository;
import com.pixl.backend.repository.VideoRepository;

import java.util.Arrays;
import java.util.List;


@Service
public class TranscodeService {
    private final TranscodeJobRepository transcodeJobRepository;
    private final VideoRepository videoRepository;
    private final RabbitTemplate rabbitTemplate;
    private final Tracer tracer;
    private final Counter jobQueuedCounter;

    @Value("${app.transcode.queue}")
    private String transcodeQueue;
    
    @Value("${app.transcode.qualities}")
    private String qualities;

    public TranscodeService(TranscodeJobRepository transcodeJobRepository, VideoRepository videoRepository, RabbitTemplate rabbitTemplate, Tracer tracer, MeterRegistry meterRegistry) {
        this.transcodeJobRepository = transcodeJobRepository;
        this.videoRepository = videoRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.tracer = tracer;
        this.jobQueuedCounter = meterRegistry.counter("transcode.job.queued");
    }

    public void queueTranscodeJobs(String videoId){
        Span span = tracer.spanBuilder("TranscodeService.queueTranscodeJobs").startSpan();
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("video.id", videoId);
            Video video = videoRepository.findById(videoId).orElseThrow(() -> new RuntimeException("Video not found"));

            video.setStatus(VideoStatus.PROCESSING);
            videoRepository.save(video);

            List<String> qualityLevels = Arrays.asList(qualities.split(","));
            span.setAttribute("quality.count", qualityLevels.size());

            for(String quality: qualityLevels){
                Span jobSpan = tracer.spanBuilder("TranscodeService.createTranscodeJob").startSpan();
                try(Scope jobscope = jobSpan.makeCurrent()){
                    jobSpan.setAttribute("quality", quality);

                    TranscodeJob job = new TranscodeJob(videoId, quality.trim());
                    job = transcodeJobRepository.save(job);

                    TranscodeMessage message = new TranscodeMessage(
                        job.getId(),
                        videoId,
                        quality.trim(),
                        video.getFilePath()
                    );

                    message.setTraceId(Span.current().getSpanContext().getTraceId());
                    message.setSpanId(Span.current().getSpanContext().getSpanId());

                    rabbitTemplate.convertAndSend(transcodeQueue, message);

                    jobQueuedCounter.increment();
                    jobSpan.addEvent("Job queued to RabbitMQ");

                    System.out.println("[TranscodeService] Queued transcode job: " + job.getId() + " (" + quality + ")");

                } finally {
                    jobSpan.end();
                }
            }

            span.addEvent("All transcode jobs queued");

        } catch ( Exception e) {

            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;

        } finally {

            span.end();

        }
    }


    public List<TranscodeJob> getJobsForVideo(String videoId) {
        return transcodeJobRepository.findByVideoId(videoId);
    }
    
    public long getQueuedJobCount() {
        return transcodeJobRepository.countByStatus(TranscodeStatus.QUEUED);
    }
    
    public long getProcessingJobCount() {
        return transcodeJobRepository.countByStatus(TranscodeStatus.PROCESSING);
    }
}
