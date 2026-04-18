package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.List;

@Data
public class OnboardingQuickAssessmentRequest {
    private List<AnswerItem> answers;

    @Data
    public static class AnswerItem {
        private String questionCode;
        private String answerValue;
    }
}
