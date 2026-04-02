package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.Notification;
import com.excel.forum.entity.SiteNotification;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.SiteNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final SiteNotificationService siteNotificationService;

    @GetMapping("/announcements")
    public ResponseEntity<?> getAnnouncements(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Page<SiteNotification> pageParam = new Page<>(page, size);
        QueryWrapper<SiteNotification> wrapper = new QueryWrapper<>();
        wrapper.eq("status", "sent");
        if (type != null && !type.isEmpty()) {
            wrapper.eq("type", type);
        }
        wrapper.orderByDesc("send_time");
        Page<SiteNotification> result = siteNotificationService.page(pageParam, wrapper);
        return ResponseEntity.ok(Map.of("records", result.getRecords(), "total", result.getTotal()));
    }

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
        Notification notification = notificationService.getById(id);
        if (notification != null && notification.getUserId().equals(userId)) {
            notificationService.markAsRead(userId, id);

            // 如果是站内公告，递增 readCount
            if ("site_notification".equals(notification.getType()) && notification.getRelatedId() != null) {
                siteNotificationService.incrementReadCount(notification.getRelatedId());
            }
        }
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
