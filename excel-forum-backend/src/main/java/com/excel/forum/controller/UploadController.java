package com.excel.forum.controller;

import com.excel.forum.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {
    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
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

        String fileUrl = fileStorageService.store(file);
        return ResponseEntity.ok(Map.of("url", fileUrl));
    }

    private boolean isAllowedFileType(String contentType) {
        return contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
               contentType.equals("application/vnd.ms-excel") ||
               contentType.equals("application/pdf") ||
               contentType.equals("image/png") ||
               contentType.equals("image/jpeg");
    }
}