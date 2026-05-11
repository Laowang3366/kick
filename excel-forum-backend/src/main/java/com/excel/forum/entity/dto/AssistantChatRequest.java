package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.List;

@Data
public class AssistantChatRequest {
    private String message;
    private String formula;
    private String workbookContext;
    private List<ImageAttachment> images;
    private Long tutorialArticleId;
    private Long practiceQuestionId;
    private String conversationId;

    @Data
    public static class ImageAttachment {
        private String name;
        private String mimeType;
        private Long size;
        private String dataUrl;
    }
}
