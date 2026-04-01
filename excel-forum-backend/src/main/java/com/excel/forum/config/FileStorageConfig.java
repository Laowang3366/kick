package com.excel.forum.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "file.storage")
public class FileStorageConfig {
    private String type = "local";
    private Local local = new Local();
    private Minio minio = new Minio();

    @Data
    public static class Local {
        private String path = "./uploads";
        private String urlPrefix = "/uploads";
    }

    @Data
    public static class Minio {
        private String endpoint;
        private String accessKey;
        private String secretKey;
        private String bucketName;
    }
}