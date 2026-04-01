package com.excel.forum.service.impl;

import com.excel.forum.config.FileStorageConfig;
import com.excel.forum.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalFileStorageService implements FileStorageService {
    private final FileStorageConfig fileStorageConfig;

    @Override
    public String store(MultipartFile file) {
        try {
            String uploadDir = fileStorageConfig.getLocal().getPath();
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);

            return fileStorageConfig.getLocal().getUrlPrefix() + "/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }

    @Override
    public void delete(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith(fileStorageConfig.getLocal().getUrlPrefix())) {
            return;
        }
        String fileName = fileUrl.substring(fileStorageConfig.getLocal().getUrlPrefix().length() + 1);
        Path filePath = Paths.get(fileStorageConfig.getLocal().getPath()).resolve(fileName);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // 忽略删除失败
        }
    }
}