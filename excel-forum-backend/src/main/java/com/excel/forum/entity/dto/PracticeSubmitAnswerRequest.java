package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class PracticeSubmitAnswerRequest {
    private Long questionId;
    private Object userAnswer;
}
