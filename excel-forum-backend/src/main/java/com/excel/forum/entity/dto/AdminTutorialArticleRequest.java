package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class AdminTutorialArticleRequest {
    private Long categoryId;
    private String title;
    private String summary;
    private String content;
    private Integer sortOrder;
    private Boolean enabled;
}
