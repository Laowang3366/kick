package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class AdminAiAssistantModelRequest {
    private Long configId;
    private String baseUrl;
    private String apiKey;
}
