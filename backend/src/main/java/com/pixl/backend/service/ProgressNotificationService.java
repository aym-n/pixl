package com.pixl.backend.service;

import com.pixl.backend.dto.QualityProgress;
import com.pixl.backend.dto.TranscodeProgress;
import com.pixl.backend.dto.VideoProgressUpdate;
import com.pixl.backend.model.TranscodeJob;
import com.pixl.backend.repository.TranscodeJobRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProgressNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final TranscodeJobRepository transcodeJobRepository;

    public ProgressNotificationService(SimpMessagingTemplate messagingTemplate,
            TranscodeJobRepository transcodeJobRepository) {
        this.messagingTemplate = messagingTemplate;
        this.transcodeJobRepository = transcodeJobRepository;
    }

    public void sendUploadProgress(String videoId, int progress) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "UPLOADING",
                "Uploading video...",
                progress);

        sendUpdate(videoId, update);
    }

    public void sendUploadComplete(String videoId) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "UPLOAD_COMPLETE",
                "Upload complete! Starting transcoding...",
                100);

        sendUpdate(videoId, update);
    }

    public void sendTranscodeQueued(String videoId) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "TRANSCODING",
                "Transcode jobs queued...",
                0);

        update.setTranscodeProgress(buildTranscodeProgress(videoId));
        sendUpdate(videoId, update);
    }

    public void sendTranscodeStarted(String videoId, String quality, String workerId) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "TRANSCODING",
                "Transcoding " + quality + "...",
                null);

        update.setTranscodeProgress(buildTranscodeProgress(videoId));
        sendUpdate(videoId, update);
    }

    public void sendTranscodeProgress(String videoId, String quality, int progress) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "TRANSCODING",
                "Transcoding " + quality + ": " + progress + "%",
                null);

        update.setTranscodeProgress(buildTranscodeProgress(videoId));
        sendUpdate(videoId, update);
    }

    public void sendTranscodeComplete(String videoId, String quality) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "TRANSCODING",
                "Completed " + quality,
                null);

        update.setTranscodeProgress(buildTranscodeProgress(videoId));
        sendUpdate(videoId, update);
    }

    public void sendTranscodeFailed(String videoId, String quality, String error) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "TRANSCODING",
                "Failed to transcode " + quality + ": " + error,
                null);

        update.setTranscodeProgress(buildTranscodeProgress(videoId));
        sendUpdate(videoId, update);
    }

    public void sendHLSGenerationStarted(String videoId) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "GENERATING_HLS",
                "Generating HLS streams...",
                null);

        sendUpdate(videoId, update);
    }

    public void sendHLSGenerationComplete(String videoId) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "READY",
                "Video is ready to watch!",
                100);

        sendUpdate(videoId, update);
    }

    public void sendError(String videoId, String error) {
        VideoProgressUpdate update = new VideoProgressUpdate(
                videoId,
                "FAILED",
                "Error: " + error,
                null);

        sendUpdate(videoId, update);
    }

    private TranscodeProgress buildTranscodeProgress(String videoId) {
        List<TranscodeJob> jobs = transcodeJobRepository.findByVideoId(videoId);

        TranscodeProgress progress = new TranscodeProgress();

        List<QualityProgress> qualities = jobs.stream()
                .map(job -> {
                    QualityProgress qp = new QualityProgress(job.getQuality(), job.getStatus().name());
                    qp.setWorkerId(job.getWorkerId());
                    return qp;
                })
                .collect(Collectors.toList());

        progress.setQualities(qualities);
        progress.setTotalCount(jobs.size());

        long completed = jobs.stream()
                .filter(job -> job.getStatus().name().equals("COMPLETED"))
                .count();
        progress.setCompletedCount((int) completed);

        if (jobs.size() > 0) {
            progress.setOverallProgress((int) ((completed * 100) / jobs.size()));
        }

        return progress;
    }

    private void sendUpdate(String videoId, VideoProgressUpdate update) {
        messagingTemplate.convertAndSend("/topic/video/" + videoId, update);
        messagingTemplate.convertAndSend("/topic/progress", update);

        System.out.println("📡 WebSocket update sent: " + update.getMessage());
    }
}