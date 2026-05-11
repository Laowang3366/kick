package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class AdminAiAssistantDefaultPromptRequest {
    private String promptFileName;
    private String systemPrompt;
}
