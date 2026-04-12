package com.excel.forum.controller;

import com.excel.forum.service.CheckinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckinController {
    private final CheckinService checkinService;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(
            @RequestAttribute Long userId,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(checkinService.getCheckinStatus(userId, month));
    }

    @PostMapping
    public ResponseEntity<?> checkin(@RequestAttribute Long userId) {
        try {
            return ResponseEntity.ok(checkinService.performCheckin(userId));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/makeup")
    public ResponseEntity<?> makeupCheckin(@RequestAttribute Long userId) {
        try {
            return ResponseEntity.ok(checkinService.performMakeupCheckin(userId));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }
}
