package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminTutorialArticleRequest {
    private Long categoryId;
    private String title;
    private String summary;
    private String oneLineUsage;
    private String content;
    private String audienceTrack;
    private String difficulty;
    private Integer recommendLevel;
    private String functionTags;
    private Boolean starter;
    private Boolean homeFeatured;
    private List<Long> relatedChapterIds;
    private List<Long> relatedQuestionIds;
    private Integer sortOrder;
    private Boolean enabled;
}
