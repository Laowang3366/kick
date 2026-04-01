package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class CategoryWithPostCount {
    private Long id;
    private String name;
    private String description;
    private Integer sortOrder;
    private Long postCount;
    private Long replyCount;
    
    public CategoryWithPostCount(Long id, String name, String description, Integer sortOrder, Long postCount, Long replyCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.sortOrder = sortOrder;
        this.postCount = postCount;
        this.replyCount = replyCount;
    }
}
