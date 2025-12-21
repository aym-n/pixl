package com.pixl.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class TranscodeProgress {
    
    private List<QualityProgress> qualities;
    private Integer completedCount;
    private Integer totalCount;
    private Integer overallProgress;
    
    public TranscodeProgress() {
        this.qualities = new ArrayList<>();
    }
    
    // Getters and Setters
    public List<QualityProgress> getQualities() {
        return qualities;
    }
    
    public void setQualities(List<QualityProgress> qualities) {
        this.qualities = qualities;
    }
    
    public Integer getCompletedCount() {
        return completedCount;
    }
    
    public void setCompletedCount(Integer completedCount) {
        this.completedCount = completedCount;
    }
    
    public Integer getTotalCount() {
        return totalCount;
    }
    
    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }
    
    public Integer getOverallProgress() {
        return overallProgress;
    }
    
    public void setOverallProgress(Integer overallProgress) {
        this.overallProgress = overallProgress;
    }
}