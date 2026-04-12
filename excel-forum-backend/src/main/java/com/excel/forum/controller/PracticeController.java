package com.excel.forum.controller;

import com.excel.forum.entity.dto.PracticeSubmitRequest;
import com.excel.forum.entity.dto.PracticeQuestionSubmissionRequest;
import com.excel.forum.service.ExcelTemplateGradingService;
import com.excel.forum.service.PracticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/practice")
@RequiredArgsConstructor
public class PracticeController {
    private final PracticeService practiceService;
    private final ExcelTemplateGradingService excelTemplateGradingService;

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(practiceService.getPracticeCategories());
    }

    @GetMapping("/question-list")
    public ResponseEntity<?> getQuestionList(
            @RequestParam(required = false) Long questionCategoryId,
            @RequestAttribute(value = "userId", required = false) Long userId) {
        return ResponseEntity.ok(practiceService.getPracticeQuestionList(questionCategoryId, userId));
    }

    @GetMapping("/questions")
    public ResponseEntity<?> getQuestions(
            @RequestParam(required = false) Long questionCategoryId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "10") Integer count,
            @RequestParam(required = false) Integer difficulty) {
        return ResponseEntity.ok(practiceService.getPracticeQuestions(
                questionCategoryId != null ? questionCategoryId : categoryId,
                count,
                difficulty
        ));
    }

    @GetMapping("/questions/{questionId}")
    public ResponseEntity<?> getQuestionDetail(@PathVariable Long questionId) {
        try {
            return ResponseEntity.ok(practiceService.getPracticeQuestionDetail(questionId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/template-snapshot")
    public ResponseEntity<?> getTemplateSnapshot(@RequestParam String fileUrl) {
        try {
            return ResponseEntity.ok(excelTemplateGradingService.loadWorkbookSnapshot(fileUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard(
            @RequestParam(required = false) Long questionCategoryId,
            @RequestParam(defaultValue = "10") Integer limit) {
        return ResponseEntity.ok(practiceService.getPracticeLeaderboard(questionCategoryId, limit));
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitPractice(
            @RequestAttribute Long userId,
            @RequestBody PracticeSubmitRequest request) {
        try {
            return ResponseEntity.ok(practiceService.submitPractice(userId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/submissions")
    public ResponseEntity<?> submitPracticeQuestion(
            @RequestAttribute Long userId,
            @RequestBody PracticeQuestionSubmissionRequest request) {
        try {
            return ResponseEntity.ok(practiceService.submitPracticeQuestion(userId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/submissions/mine")
    public ResponseEntity<?> getMyPracticeSubmissions(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.ok(practiceService.getPracticeSubmissionProgress(userId, page, size));
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.ok(practiceService.getPracticeHistory(userId, page, size));
    }

    @GetMapping("/history/{id}")
    public ResponseEntity<?> getHistoryDetail(@RequestAttribute Long userId, @PathVariable Long id) {
        Map<String, Object> detail = practiceService.getPracticeHistoryDetail(userId, id);
        if (detail == null) {
            return ResponseEntity.status(404).body(Map.of("message", "练习记录不存在"));
        }
        return ResponseEntity.ok(detail);
    }
}
