package com.excel.forum.controller;

import com.excel.forum.entity.User;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PointsRecordService;
import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/points")
@RequiredArgsConstructor
public class AdminPointsController {
    private final UserService userService;
    private final PointsRecordService pointsRecordService;
    private final NotificationService notificationService;

    @PostMapping("/grant")
    @Transactional
    public ResponseEntity<?> grantPoints(@RequestBody Map<String, Object> body) {
        String username = body.get("username") == null ? "" : body.get("username").toString().trim();
        Integer points = parseInteger(body.get("points"));
        String reason = body.get("reason") == null ? "" : body.get("reason").toString().trim();

        if (!StringUtils.hasText(username)) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名不能为空"));
        }
        if (points == null || points <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "发放积分必须大于0"));
        }
        if (!StringUtils.hasText(reason)) {
            return ResponseEntity.badRequest().body(Map.of("message", "发放原因不能为空"));
        }

        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户不存在"));
        }

        pointsRecordService.addPointsRecord(user.getId(), "管理员发放", points, reason);
        User updatedUser = userService.getById(user.getId());
        notificationService.createNotification(
                user.getId(),
                "system",
                "管理员为你发放了 " + points + " 积分，原因：" + reason,
                null
        );

        return ResponseEntity.ok(Map.of(
                "message", "积分发放成功",
                "userId", user.getId(),
                "username", user.getUsername(),
                "points", points,
                "balance", updatedUser == null ? safeInt(user.getPoints()) : safeInt(updatedUser.getPoints()),
                "reason", reason
        ));
    }

    private Integer parseInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
