package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.List;

@Data
public class PracticeSubmitRequest {
    private Long categoryId;
    private Long questionCategoryId;
    private String mode;
    private Integer difficulty;
    private Integer durationSeconds;
    private List<PracticeSubmitAnswerRequest> answers;
}
