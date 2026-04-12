package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class ExcelTemplateEvaluation {
    private boolean passed;
    private int score;
    private int totalScore;
    private String feedback;
    private List<Map<String, Object>> ruleResults = new ArrayList<>();
    private String normalizedUserAnswer;
    private String normalizedCorrectAnswer;
}
