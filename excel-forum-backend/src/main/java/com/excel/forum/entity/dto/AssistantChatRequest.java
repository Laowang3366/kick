package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class AssistantChatRequest {
    private String message;
    private String formula;
    private String workbookContext;
    private Long tutorialArticleId;
    private Long practiceQuestionId;
    private String conversationId;
}
