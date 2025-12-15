package com.pixl.backend.repository;

import com.pixl.backend.model.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, String> {
}
