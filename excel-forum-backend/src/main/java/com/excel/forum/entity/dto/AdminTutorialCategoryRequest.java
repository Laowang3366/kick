package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class AdminTutorialCategoryRequest {
    private String name;
    private String description;
    private Integer sortOrder;
    private Boolean enabled;
}
