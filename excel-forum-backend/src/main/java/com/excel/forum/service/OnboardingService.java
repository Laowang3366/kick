package com.excel.forum.service;

import com.excel.forum.entity.dto.OnboardingQuickAssessmentRequest;

import java.util.Map;

public interface OnboardingService {
    Map<String, Object> submitQuickAssessment(Long userId, OnboardingQuickAssessmentRequest request);

    Map<String, Object> getRecommendation(Long userId);

    Map<String, Object> updateLearningTrack(Long userId, String track);

    String resolveTrack(Long userId, String preferredTrack);
}
