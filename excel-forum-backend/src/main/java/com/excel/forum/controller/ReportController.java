package com.excel.forum.controller;

import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.Report;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;
    private final ForumEventService eventService;

    @PostMapping
    public ResponseEntity<?> createReport(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        if (body.get("targetType") == null || body.get("targetId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "参数不完整"));
        }

        String targetType = body.get("targetType").toString();
        Long targetId = Long.valueOf(body.get("targetId").toString());
        String reason = body.get("reason") != null ? body.get("reason").toString() : "";
        String description = body.get("description") != null ? body.get("description").toString() : "";

        Report report = new Report();
        report.setReporterId(userId);
        report.setTargetType(targetType);
        report.setTargetId(targetId);
        report.setReason(reason);
        report.setDescription(description);
        report.setStatus(0);
        reportService.save(report);
        
        eventService.publishEvent(ForumEvent.reportUpdated(report.getId()));

        return ResponseEntity.ok(Map.of("message", "举报成功"));
    }
}
