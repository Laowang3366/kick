package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class PracticeCampaignSubmitRequest {
    private Long attemptId;
    private Integer usedSeconds;
    private Object userAnswer;
}
