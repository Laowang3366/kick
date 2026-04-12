package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class CategoryWithPostCount {
    private Long id;
    private String name;
    private String description;
    private String groupName;
    private Integer sortOrder;
    private Long postCount;
    private Long replyCount;
    
    public CategoryWithPostCount(Long id, String name, String description, String groupName, Integer sortOrder, Long postCount, Long replyCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.groupName = groupName;
        this.sortOrder = sortOrder;
        this.postCount = postCount;
        this.replyCount = replyCount;
    }
}
