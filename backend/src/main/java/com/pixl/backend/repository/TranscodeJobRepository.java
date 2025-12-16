package com.pixl.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.pixl.backend.model.TranscodeJob;
import com.pixl.backend.model.TranscodeStatus;

@Repository
public interface TranscodeJobRepository extends JpaRepository<TranscodeJob, String> {
    List<TranscodeJob> findByVideoId(String videoId);
    List<TranscodeJob> findByStatus(String status);

    long countByStatus(TranscodeStatus status);
}