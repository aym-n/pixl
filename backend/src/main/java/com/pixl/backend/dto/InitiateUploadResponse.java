package com.pixl.backend.dto;

public class InitiateUploadResponse {
    private String uploadId;
    private Integer chunkSize;
    private Integer totalChunks;

    public InitiateUploadResponse(String uploadId, Integer chunkSize, Integer totalChunks) {
        this.uploadId = uploadId;
        this.chunkSize = chunkSize;
        this.totalChunks = totalChunks;
    }

    public String getUploadId() {
        return uploadId;
    }

    public void setUploadId(String uploadId) {
        this.uploadId = uploadId;
    }

    public Integer getChunkSize() {
        return chunkSize;
    }
    public void setChunkSize(Integer chunkSize) {
        this.chunkSize = chunkSize;
    }
    public Integer getTotalChunks() {
        return totalChunks;
    }
    public void setTotalChunks(Integer totalChunks) {
        this.totalChunks = totalChunks;
    }
}
