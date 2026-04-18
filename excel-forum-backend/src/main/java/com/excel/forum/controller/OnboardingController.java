package com.excel.forum.controller;

import com.excel.forum.entity.dto.LearningTrackUpdateRequest;
import com.excel.forum.entity.dto.OnboardingQuickAssessmentRequest;
import com.excel.forum.service.OnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OnboardingController {
    private final OnboardingService onboardingService;

    @PostMapping("/onboarding/quick-assessment")
    public ResponseEntity<?> submitQuickAssessment(
            @RequestAttribute Long userId,
            @RequestBody OnboardingQuickAssessmentRequest request) {
        try {
            return ResponseEntity.ok(onboardingService.submitQuickAssessment(userId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/onboarding/recommendation")
    public ResponseEntity<?> getRecommendation(@RequestAttribute(value = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(onboardingService.getRecommendation(userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/me/learning-track")
    public ResponseEntity<?> updateLearningTrack(
            @RequestAttribute Long userId,
            @RequestBody LearningTrackUpdateRequest request) {
        try {
            return ResponseEntity.ok(onboardingService.updateLearningTrack(userId, request == null ? null : request.getTrack()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
