package com.pixl.backend.model;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "upload_sessions")
public class UploadSession {
    
    @Id
    private String uploadId;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private Long totalSize;
    
    @Column(nullable = false)
    private Integer totalChunks;
    
    @Column(nullable = false)
    private Integer chunkSize;

    @Enumerated(EnumType.STRING)
    private UploadStatus status = UploadStatus.IN_PROGRESS;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @ElementCollection
    @CollectionTable(name = "uploaded_chunks", joinColumns = @JoinColumn(name = "upload_id"))
    @Column(name = "chunk_number")
    private Set<Integer> uploadedChunks = new HashSet<>();


    public UploadSession() {}
    
    public UploadSession(String uploadId, String filename, Long totalSize, Integer chunkSize) {
        this.uploadId = uploadId;
        this.filename = filename;
        this.totalSize = totalSize;
        this.chunkSize = chunkSize;
        this.totalChunks = (int) Math.ceil((double) totalSize / chunkSize);
        this.expiresAt = LocalDateTime.now().plusHours(24);
    }
    
    public String getUploadId() {
        return uploadId;
    }
    
    public void setUploadId(String uploadId) {
        this.uploadId = uploadId;
    }
    
    public String getFilename() {
        return filename;
    }
    
    public void setFilename(String filename) {
        this.filename = filename;
    }
    
    public Long getTotalSize() {
        return totalSize;
    }
    
    public void setTotalSize(Long totalSize) {
        this.totalSize = totalSize;
    }
    
    public Integer getTotalChunks() {
        return totalChunks;
    }
    
    public void setTotalChunks(Integer totalChunks) {
        this.totalChunks = totalChunks;
    }
    
    public Integer getChunkSize() {
        return chunkSize;
    }
    
    public void setChunkSize(Integer chunkSize) {
        this.chunkSize = chunkSize;
    }
    
    public Set<Integer> getUploadedChunks() {
        return uploadedChunks;
    }
    
    public void setUploadedChunks(Set<Integer> uploadedChunks) {
        this.uploadedChunks = uploadedChunks;
    }
    
    public UploadStatus getStatus() {
        return status;
    }
    
    public void setStatus(UploadStatus status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }
    
    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
    
    public void addChunk(int chunkNumber) {
        this.uploadedChunks.add(chunkNumber);
    }
    
    public boolean isComplete() {
        return uploadedChunks.size() == totalChunks;
    }
    
    public double getProgress() {
        return (double) uploadedChunks.size() / totalChunks * 100;
    }
}
