package com.excel.forum.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatResponse {
    private String conversationId;
    private String answer;
    private List<Map<String, Object>> relatedTutorials;
    private List<Map<String, Object>> relatedQuestions;
    private String model;
    private boolean fallbackUsed;
}
