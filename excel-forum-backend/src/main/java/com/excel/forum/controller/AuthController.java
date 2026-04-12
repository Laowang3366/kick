package com.excel.forum.controller;

import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.User;
import com.excel.forum.entity.dto.AuthResponse;
import com.excel.forum.entity.dto.LoginRequest;
import com.excel.forum.entity.dto.RegisterRequest;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.UserService;
import com.excel.forum.util.JwtUtil;
import com.excel.forum.util.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String EMAIL_REGEX = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ForumEventService eventService;
    private final StringRedisTemplate redisTemplate;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (isRateLimited("auth:login:" + normalizeRateLimitKey(request.getUsername()), 10, 60)) {
            return ResponseEntity.status(429).body(Map.of("message", "登录过于频繁，请稍后再试"));
        }
        User user = userService.findByUsername(request.getUsername());
        if (user == null) {
            user = userService.findByEmail(request.getUsername());
        }

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            applyLoginFailureDelay();
            return ResponseEntity.badRequest().body("用户名或密码错误");
        }

        if (user.getStatus() == 1) {
            return ResponseEntity.badRequest().body("账户已被锁定，请联系管理员");
        }

        userService.setOnline(user.getId());

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatar(),
                user.getRole(),
                user.getLevel(),
                user.getPoints(),
                user.getExp(),
                user.getBio(),
                user.getExpertise(),
                user.getGender(),
                user.getJobTitle(),
                user.getLocation(),
                user.getWebsite(),
                user.getCoverImage(),
                user.getNotificationEmailEnabled() == null || user.getNotificationEmailEnabled(),
                user.getNotificationPushEnabled() == null || user.getNotificationPushEnabled(),
                user.getThemePreference()
        );

        return ResponseEntity.ok(new AuthResponse(token, userDTO));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (isRateLimited("auth:register:" + normalizeRateLimitKey(request.getUsername()), 5, 300)) {
            return ResponseEntity.status(429).body("注册过于频繁，请稍后再试");
        }
        String username = request.getUsername() != null ? request.getUsername().trim() : null;
        String email = request.getEmail() != null ? request.getEmail().trim() : null;
        String password = request.getPassword();

        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest().body("用户名不能为空");
        }
        if (username.length() > 50) {
            return ResponseEntity.badRequest().body("用户名不能超过50个字符");
        }
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("邮箱不能为空");
        }
        if (!email.matches(EMAIL_REGEX)) {
            return ResponseEntity.badRequest().body("邮箱格式不正确");
        }
        if (!isStrongPassword(password)) {
            return ResponseEntity.badRequest().body("密码必须至少8位，且只能包含字母和数字");
        }

        if (userService.findByUsername(username) != null) {
            return ResponseEntity.badRequest().body("用户名已存在");
        }

        if (userService.findByEmail(email) != null) {
            return ResponseEntity.badRequest().body("邮箱已被注册");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setLevel(1);
        user.setPoints(0);
        user.setExp(0);
        user.setStatus(0);
        user.setRole("user");

        userService.save(user);
        
        eventService.publishEvent(ForumEvent.userUpdated(user.getId()));

        return ResponseEntity.ok("注册成功");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username") == null ? null : body.get("username").trim();
        String email = body.get("email") == null ? null : body.get("email").trim();
        String newPassword = body.get("newPassword");

        if (isRateLimited("auth:forgot:" + normalizeRateLimitKey(username + ":" + email), 5, 300)) {
            return ResponseEntity.status(429).body(Map.of("message", "重置密码过于频繁，请稍后再试"));
        }
        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "请输入用户名"));
        }
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "请输入注册邮箱"));
        }
        if (!email.matches(EMAIL_REGEX)) {
            return ResponseEntity.badRequest().body(Map.of("message", "邮箱格式不正确"));
        }
        if (!isStrongPassword(newPassword)) {
            return ResponseEntity.badRequest().body(Map.of("message", "新密码必须至少8位，且只能包含字母和数字"));
        }

        User user = userService.findByUsername(username);
        if (user == null || user.getEmail() == null || !user.getEmail().equalsIgnoreCase(email)) {
            applyLoginFailureDelay();
            return ResponseEntity.badRequest().body(Map.of("message", "用户名与邮箱不匹配"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userService.updateById(user);
        eventService.publishEvent(ForumEvent.userUpdated(user.getId()));

        return ResponseEntity.ok(Map.of("message", "密码已重置，请使用新密码登录"));
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatar(),
                user.getRole(),
                user.getLevel(),
                user.getPoints(),
                user.getExp(),
                user.getBio(),
                user.getExpertise(),
                user.getGender(),
                user.getJobTitle(),
                user.getLocation(),
                user.getWebsite(),
                user.getCoverImage(),
                user.getNotificationEmailEnabled() == null || user.getNotificationEmailEnabled(),
                user.getNotificationPushEnabled() == null || user.getNotificationPushEnabled(),
                user.getThemePreference()
        );

        return ResponseEntity.ok(userDTO);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestAttribute Long userId, HttpServletRequest request) {
        String token = extractBearerToken(request);
        if (token != null) {
            jwtUtil.invalidateToken(token);
        }
        userService.setOffline(userId);
        return ResponseEntity.ok("登出成功");
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(
            @RequestAttribute Long userId,
            @RequestBody java.util.Map<String, String> body) {
        
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        
        if (oldPassword == null || oldPassword.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "请输入当前密码"));
        }
        if (!isStrongPassword(newPassword)) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "新密码必须至少8位，且只能包含字母和数字"));
        }
        
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("message", "用户不存在"));
        }
        
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "当前密码错误"));
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userService.updateById(user);
        
        return ResponseEntity.ok(java.util.Map.of("message", "密码修改成功"));
    }

    @PutMapping("/email")
    public ResponseEntity<?> changeEmail(
            @RequestAttribute Long userId,
            @RequestBody java.util.Map<String, String> body) {
        
        String newEmail = body.get("newEmail");
        String password = body.get("password");
        
        if (newEmail == null || newEmail.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "请输入新邮箱"));
        }
        if (!newEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "邮箱格式不正确"));
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "请输入密码确认身份"));
        }
        
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("message", "用户不存在"));
        }
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "密码错误"));
        }
        
        User existingUser = userService.findByEmail(newEmail);
        if (existingUser != null && !existingUser.getId().equals(userId)) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "该邮箱已被其他用户使用"));
        }
        
        user.setEmail(newEmail);
        userService.updateById(user);
        eventService.publishEvent(ForumEvent.userUpdated(userId));
        
        return ResponseEntity.ok(java.util.Map.of("message", "邮箱修改成功"));
    }

    private boolean isStrongPassword(String password) {
        return PasswordPolicy.isStrongPassword(password);
    }

    private void applyLoginFailureDelay() {
        try {
            Thread.sleep(ThreadLocalRandom.current().nextLong(180, 320));
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private boolean isRateLimited(String key, int maxRequests, int ttlSeconds) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redisTemplate.expire(key, ttlSeconds, TimeUnit.SECONDS);
            }
            return count != null && count > maxRequests;
        } catch (Exception ignored) {
            return false;
        }
    }

    private String normalizeRateLimitKey(String value) {
        if (value == null || value.isBlank()) {
            return "anonymous";
        }
        return value.trim().toLowerCase();
    }
}
