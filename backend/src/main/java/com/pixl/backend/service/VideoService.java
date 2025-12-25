package com.pixl.backend.service;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.pixl.backend.model.Video;
import com.pixl.backend.repository.VideoRepository;

@Service
public class VideoService {

    private final String uploadDir = "uploads/videos/";
    private final VideoRepository videoRepository;

    public Video uploadVideo(String Title, String Description, MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if(!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        if(file.isEmpty()) {
            throw new IOException("Failed to store empty file.");
        }

        Path filePath = uploadPath.resolve(file.getOriginalFilename());
        Files.copy(file.getInputStream(), filePath);

        Video video = new Video(Title, Description);
        video.setOriginalFilename(file.getOriginalFilename());
        video.setFilePath(filePath.toString());
        video.setFileSize(file.getSize());

        return videoRepository.save(video);
    }

    public List<Video> getAllVideos() {
        return videoRepository.findAllByOrderByCreatedAtDesc();
    }

    public Video getVideo(String id) {
        return videoRepository.findById(id).orElseThrow(() -> new RuntimeException("Video not found"));
    }

    public void incrementVideoViews(String id) {
        Video video = getVideo(id);
        Long currentViews = video.getViewsCount();
        if(currentViews == null) {
            currentViews = 0L;
        }
        video.setViewsCount(currentViews + 1);
        videoRepository.save(video);

        System.out.println("✅ Video views incremented for video ID: " + id);
        System.out.println("    New views count: " + video.getViewsCount());
    }

    public VideoService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }
    

}
