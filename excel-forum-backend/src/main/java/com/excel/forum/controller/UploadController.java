package com.excel.forum.controller;

import com.excel.forum.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {
    private final FileStorageService fileStorageService;
    private final StringRedisTemplate redisTemplate;

    private static final int MAX_UPLOADS_PER_MINUTE = 10;

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("文件为空");
        }

        // 检查文件类型
        String contentType = file.getContentType();
        if (contentType == null || !isAllowedFileType(contentType)) {
            return ResponseEntity.badRequest().body("不支持的文件类型");
        }

        // 检查文件大小 (20MB)
        if (file.getSize() > 20 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("文件大小超过限制");
        }

        // 频率限制：每分钟最多上传 MAX_UPLOADS_PER_MINUTE 次（Redis 不可用时跳过限流）
        Long userId = (Long) request.getAttribute("userId");
        if (userId != null) {
            try {
                String rateLimitKey = "upload:rate:" + userId;
                Long count = redisTemplate.opsForValue().increment(rateLimitKey);
                if (count != null && count == 1) {
                    redisTemplate.expire(rateLimitKey, 60, TimeUnit.SECONDS);
                }
                if (count != null && count > MAX_UPLOADS_PER_MINUTE) {
                    return ResponseEntity.status(429).body(Map.of("message", "上传频率过高，请稍后再试"));
                }
            } catch (RedisConnectionFailureException e) {
                log.warn("Redis 不可用，跳过上传频率限制");
            }
        }

        String fileUrl = fileStorageService.store(file);
        return ResponseEntity.ok(Map.of("url", fileUrl));
    }

    private boolean isAllowedFileType(String contentType) {
        return contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
               contentType.equals("application/vnd.ms-excel") ||
               contentType.equals("application/pdf") ||
               contentType.equals("image/png") ||
               contentType.equals("image/jpeg") ||
               contentType.equals("image/gif") ||
               contentType.equals("image/webp");
    }
}
