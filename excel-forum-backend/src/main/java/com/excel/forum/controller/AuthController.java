package com.excel.forum.controller;

import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.User;
import com.excel.forum.entity.dto.AuthResponse;
import com.excel.forum.entity.dto.LoginRequest;
import com.excel.forum.entity.dto.RegisterRequest;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.UserService;
import com.excel.forum.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ForumEventService eventService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userService.findByUsername(request.getUsername());
        if (user == null) {
            user = userService.findByEmail(request.getUsername());
        }

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
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
                user.getBio(),
                user.getExpertise()
        );

        return ResponseEntity.ok(new AuthResponse(token, userDTO));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userService.findByUsername(request.getUsername()) != null) {
            return ResponseEntity.badRequest().body("用户名已存在");
        }

        if (userService.findByEmail(request.getEmail()) != null) {
            return ResponseEntity.badRequest().body("邮箱已被注册");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setLevel(1);
        user.setPoints(0);
        user.setStatus(0);
        user.setRole("user");

        userService.save(user);
        
        eventService.publishEvent(ForumEvent.userUpdated(user.getId()));

        return ResponseEntity.ok("注册成功");
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(@RequestAttribute Long userId) {
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
                user.getBio(),
                user.getExpertise()
        );

        return ResponseEntity.ok(userDTO);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestAttribute Long userId) {
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
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "新密码长度至少6位"));
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
}