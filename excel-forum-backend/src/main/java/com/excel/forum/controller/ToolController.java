package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.DocumentConversionRecord;
import com.excel.forum.service.DocumentConversionService;
import com.excel.forum.service.DocumentConversionRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tools")
@RequiredArgsConstructor
public class ToolController {
    private final DocumentConversionService documentConversionService;
    private final DocumentConversionRecordService documentConversionRecordService;

    @PostMapping("/convert")
    public ResponseEntity<?> convertDocument(
            @RequestAttribute(value = "userId", required = false) Long userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("targetType") String targetType) {
        try {
            Map<String, Object> result = new HashMap<>(documentConversionService.convert(file, targetType));
            DocumentConversionRecord record = new DocumentConversionRecord();
            record.setUserId(userId);
            record.setSourceFileName(file.getOriginalFilename());
            record.setSourceType(String.valueOf(result.get("sourceType")));
            record.setTargetType(String.valueOf(result.get("targetType")));
            record.setResultFileName(String.valueOf(result.get("fileName")));
            record.setResultUrl(String.valueOf(result.get("url")));
            record.setStatus("success");
            documentConversionRecordService.save(record);
            result.put("recordId", record.getId());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getConversionHistory(@RequestAttribute Long userId) {
        List<Map<String, Object>> records = documentConversionRecordService.list(new QueryWrapper<DocumentConversionRecord>()
                        .eq("user_id", userId)
                        .orderByDesc("create_time")
                        .last("LIMIT 12"))
                .stream()
                .map(item -> {
                    Map<String, Object> record = new HashMap<>();
                    record.put("id", item.getId());
                    record.put("sourceFileName", item.getSourceFileName());
                    record.put("sourceType", item.getSourceType());
                    record.put("targetType", item.getTargetType());
                    record.put("resultFileName", item.getResultFileName());
                    record.put("resultUrl", item.getResultUrl());
                    record.put("status", item.getStatus());
                    record.put("createTime", item.getCreateTime());
                    return record;
                })
                .toList();
        return ResponseEntity.ok(Map.of("records", records));
    }
}
