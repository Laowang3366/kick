package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminTemplateCenterRequest {
    private String title;
    private String industryCategory;
    private String useScenario;
    private String previewImageUrl;
    private String templateDescription;
    private List<String> functionsUsed;
    private String difficultyLevel;
    private Integer downloadCostPoints;
    private String templateFileUrl;
    private Integer sortOrder;
    private Boolean enabled;
}
