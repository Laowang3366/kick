package com.excel.forum.service.dto;

import lombok.Data;

@Data
public class PostPublishCommand {
    private Long userId;
    private String title;
    private String titleStyle;
    private String content;
    private Long categoryId;
    private Integer rewardPoints;
    private String attachments;
    private String tags;
}
