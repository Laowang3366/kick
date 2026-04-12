package com.excel.forum.service.dto;

import com.excel.forum.entity.Post;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class PostPublishResult {
    private Post post;
    private boolean requiresReview;
    private Integer expGained;
    private List<Map<String, Object>> pointsRewards = new ArrayList<>();
}
