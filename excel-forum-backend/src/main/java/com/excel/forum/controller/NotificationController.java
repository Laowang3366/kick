package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Notification;
import com.excel.forum.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestAttribute Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        
        Map<String, Object> notifications = notificationService.getUserNotifications(userId, type, page, limit);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestAttribute Long userId) {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("is_read", 0);
        long count = notificationService.count(queryWrapper);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@RequestAttribute Long userId, @PathVariable Long id) {
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok("标记成功");
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@RequestAttribute Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok("全部标记成功");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@RequestAttribute Long userId, @PathVariable Long id) {
        notificationService.deleteNotification(userId, id);
        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }

    @DeleteMapping("/batch")
    public ResponseEntity<?> deleteBatch(@RequestAttribute Long userId, @RequestBody Map<String, Object> body) {
        java.util.List<Integer> ids = (java.util.List<Integer>) body.get("ids");
        if (ids != null && !ids.isEmpty()) {
            notificationService.deleteBatch(userId, ids.stream().map(Long::valueOf).collect(java.util.stream.Collectors.toList()));
        }
        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }
}
