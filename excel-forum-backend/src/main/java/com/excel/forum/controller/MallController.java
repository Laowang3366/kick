package com.excel.forum.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/mall")
public class MallController {

    private static final Map<String, Object> MALL_OFFLINE_RESPONSE = Map.of("message", "积分商城已下线");

    @GetMapping("/items")
    public ResponseEntity<?> getItems(
            @RequestParam(required = false) String type,
            @RequestAttribute(value = "userId", required = false) Long userId) {
        return mallOffline();
    }

    @GetMapping("/types")
    public ResponseEntity<?> getTypes() {
        return mallOffline();
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(@RequestAttribute Long userId) {
        return mallOffline();
    }

    @PostMapping("/redeem")
    public ResponseEntity<?> redeem(@RequestAttribute Long userId, @RequestBody Map<String, Object> body) {
        return mallOffline();
    }

    @GetMapping("/redemptions")
    public ResponseEntity<?> getRedemptions(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return mallOffline();
    }

    private ResponseEntity<Map<String, Object>> mallOffline() {
        return ResponseEntity.status(HttpStatus.GONE).body(MALL_OFFLINE_RESPONSE);
    }
}
