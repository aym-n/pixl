package com.pixl.backend.worker;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.TraceFlags;
import io.opentelemetry.api.trace.TraceState;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.pixl.backend.dto.TranscodeMessage;
import com.pixl.backend.model.TranscodeJob;
import com.pixl.backend.model.TranscodeStatus;
import com.pixl.backend.model.Video;
import com.pixl.backend.model.VideoStatus;
import com.pixl.backend.repository.TranscodeJobRepository;
import com.pixl.backend.repository.VideoRepository;
import com.pixl.backend.service.FFmpegService;
import com.pixl.backend.service.HLSService;
import com.pixl.backend.service.MinioService;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class TranscodeWorker {

    private final TranscodeJobRepository transcodeJobRepository;
    private final VideoRepository videoRepository;
    private final MinioService minioService;
    private final FFmpegService ffmpegService;
    private final Tracer tracer;
    private final Timer transcodeTimer;
    private final Counter transcodeSuccessCounter;
    private final Counter transcodeFailureCounter;
    private final HLSService hlsService;

    @Value("${minio.bucket.videos-original}")
    private String originalBucket;

    @Value("${minio.bucket.videos-transcoded}")
    private String transcodedBucket;

    private final String workerId = UUID.randomUUID().toString();

    public TranscodeWorker(TranscodeJobRepository transcodeJobRepository,
            VideoRepository videoRepository,
            MinioService minioService,
            FFmpegService ffmpegService,
            Tracer tracer,
            MeterRegistry meterRegistry,
            HLSService hlsService) {
        this.transcodeJobRepository = transcodeJobRepository;
        this.videoRepository = videoRepository;
        this.minioService = minioService;
        this.ffmpegService = ffmpegService;
        this.tracer = tracer;
        this.transcodeTimer = meterRegistry.timer("transcode.duration");
        this.transcodeSuccessCounter = meterRegistry.counter("transcode.success");
        this.transcodeFailureCounter = meterRegistry.counter("transcode.failure");
        this.hlsService = hlsService;

        System.out.println("🤖 Transcode Worker started: " + workerId);
    }

    @RabbitListener(queues = "${app.transcode.queue}", concurrency = "2")
    public void processTranscodeJob(TranscodeMessage message) {
        SpanContext parentSpanContext = SpanContext.createFromRemoteParent(
                message.getTraceId(),
                message.getSpanId(),
                TraceFlags.getSampled(),
                TraceState.getDefault());

        Context parentContext = Context.root().with(Span.wrap(parentSpanContext));

        Span span = tracer.spanBuilder("process-transcode-job")
                .setParent(parentContext)
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("job.id", message.getJobId());
            span.setAttribute("video.id", message.getVideoId());
            span.setAttribute("quality", message.getQuality());
            span.setAttribute("worker.id", workerId);

            System.out.println("[TranscodeWorker] Processing transcode job: " + message.getJobId() +
                    " (" + message.getQuality() + ")");

            transcodeTimer.record(() -> {
                try {
                    executeTranscode(message, span);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            handleTranscodeFailure(message.getJobId(), e);
        } finally {
            span.end();
        }
    }

    private void executeTranscode(TranscodeMessage message, Span parentSpan) throws Exception {
        TranscodeJob job = transcodeJobRepository.findById(message.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        job.setStatus(TranscodeStatus.PROCESSING);
        job.setWorkerId(workerId);
        job.setStartedAt(LocalDateTime.now());
        transcodeJobRepository.save(job);

        parentSpan.addEvent("Job status updated to PROCESSING");

        Span downloadSpan = tracer.spanBuilder("download-original-video").startSpan();
        Path inputPath = null;

        try (Scope downloadScope = downloadSpan.makeCurrent()) {
            downloadSpan.setAttribute("bucket", originalBucket);
            downloadSpan.setAttribute("object", message.getInputPath());

            inputPath = Files.createTempFile("video-input-", ".mp4");

            try (InputStream stream = minioService.downloadFile(originalBucket, message.getInputPath())) {
                Files.copy(stream, inputPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            long inputSize = Files.size(inputPath);
            downloadSpan.setAttribute("file.size", inputSize);
            downloadSpan.addEvent("Original video downloaded");

            System.out.println("  ⬇️  Downloaded original: " + (inputSize / 1024 / 1024) + " MB");

        } finally {
            downloadSpan.end();
        }

        Path outputPath = Files.createTempFile("video-output-", "-" + message.getQuality() + ".mp4");
        ffmpegService.transcode(inputPath, message.getQuality(), outputPath);

        Span uploadSpan = tracer.spanBuilder("upload-transcoded-video").startSpan();
        String outputObjectName = null;

        try (Scope uploadScope = uploadSpan.makeCurrent()) {
            outputObjectName = message.getVideoId() + "-" + message.getQuality() + ".mp4";
            uploadSpan.setAttribute("bucket", transcodedBucket);
            uploadSpan.setAttribute("object", outputObjectName);

            long outputSize = Files.size(outputPath);

            try (InputStream stream = Files.newInputStream(outputPath)) {
                minioService.uploadFile(transcodedBucket, outputObjectName, stream, outputSize, "video/mp4");
            }

            uploadSpan.setAttribute("file.size", outputSize);
            uploadSpan.addEvent("Transcoded video uploaded");

            System.out.println("  ⬆️  Uploaded " + message.getQuality() + ": " +
                    (outputSize / 1024 / 1024) + " MB");

            job.setStatus(TranscodeStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());
            job.setOutputPath(outputObjectName);
            job.setOutputSize(outputSize);
            transcodeJobRepository.save(job);

        } finally {
            uploadSpan.end();

            Files.deleteIfExists(inputPath);
            Files.deleteIfExists(outputPath);
        }

        checkAndUpdateVideoStatus(message.getVideoId());

        transcodeSuccessCounter.increment();
        parentSpan.addEvent("Transcode job completed successfully");

        System.out.println("✅ Completed transcode job: " + message.getJobId() +
                " (" + message.getQuality() + ")");
    }

    private void handleTranscodeFailure(String jobId, Exception e) {
        try {
            TranscodeJob job = transcodeJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                job.setStatus(TranscodeStatus.FAILED);
                job.setErrorMessage(e.getMessage());
                job.setRetryCount(job.getRetryCount() + 1);
                transcodeJobRepository.save(job);

                transcodeFailureCounter.increment();

                System.err.println("❌ Transcode job failed: " + jobId + " - " + e.getMessage());
            }
        } catch (Exception ex) {
            System.err.println("Failed to update job status: " + ex.getMessage());
        }
    }

    private void checkAndUpdateVideoStatus(String videoId) {
        List<TranscodeJob> jobs = transcodeJobRepository.findByVideoId(videoId);

        boolean allCompleted = jobs.stream()
                .allMatch(job -> job.getStatus() == TranscodeStatus.COMPLETED);

        boolean anyFailed = jobs.stream()
                .anyMatch(job -> job.getStatus() == TranscodeStatus.FAILED);

        Video video = videoRepository.findById(videoId).orElse(null);
        if (video != null) {
            if (allCompleted) {

                try {
                    System.out.println("All transcodes complete, generating HLS...");
                    hlsService.generateHLS(videoId);
                } catch (Exception e) {
                    System.err.println("HLS generation failed: " + e.getMessage());
                }
                video.setStatus(VideoStatus.READY);
                videoRepository.save(video);
                System.out.println("✅ All transcode jobs completed for video: " + videoId);
            } else if (anyFailed) {
                video.setStatus(VideoStatus.FAILED);
                videoRepository.save(video);
                System.out.println("❌ Some transcode jobs failed for video: " + videoId);
            }
        }
    }
}
