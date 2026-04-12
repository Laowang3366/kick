package com.excel.forum.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface DocumentConversionService {
    Map<String, Object> convert(MultipartFile file, String targetType);
}
