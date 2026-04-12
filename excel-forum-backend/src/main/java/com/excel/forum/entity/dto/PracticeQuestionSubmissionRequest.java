package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class PracticeQuestionSubmissionRequest {
    private String title;
    private Long questionCategoryId;
    private String description;
    private Integer difficulty;
    private Integer points;
    private String templateFileUrl;
    private String answerSheet;
    private String answerRange;
    private String answerSnapshotJson;
    private Boolean checkFormula;
    private String gradingRuleJson;
    private String expectedSnapshotJson;
    private Integer sheetCountLimit;
    private Integer version;
}
