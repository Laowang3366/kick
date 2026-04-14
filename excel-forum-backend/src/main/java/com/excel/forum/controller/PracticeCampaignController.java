package com.excel.forum.controller;

import com.excel.forum.service.PracticeCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/practice/campaign")
@RequiredArgsConstructor
public class PracticeCampaignController {
    private final PracticeCampaignService practiceCampaignService;

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(@RequestAttribute(value = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(practiceCampaignService.getCampaignOverview(userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/chapters")
    public ResponseEntity<?> getChapters(@RequestAttribute(value = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(practiceCampaignService.getCampaignChapters(userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/chapters/{chapterId}")
    public ResponseEntity<?> getChapterDetail(
            @PathVariable Long chapterId,
            @RequestAttribute(value = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(practiceCampaignService.getCampaignChapterDetail(chapterId, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/levels/{levelId}")
    public ResponseEntity<?> getLevelDetail(
            @PathVariable Long levelId,
            @RequestAttribute(value = "userId", required = false) Long userId) {
        try {
            return ResponseEntity.ok(practiceCampaignService.getCampaignLevelDetail(levelId, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
