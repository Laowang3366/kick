package com.excel.forum.entity.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ExcelTemplateRuleConfig {
    private String answerSheet;
    private String answerRange;
    private List<List<Object>> expectedAnswerValues = new ArrayList<>();
    private Boolean checkFormula = false;
    private Integer score;
    private List<String> requiredSheets = new ArrayList<>();
    private List<CellRule> cellRules = new ArrayList<>();
    private List<RangeRule> rangeRules = new ArrayList<>();
    private List<HeaderRule> headerRules = new ArrayList<>();

    @Data
    public static class CellRule {
        private String sheet;
        private String cell;
        private Object expectedValue;
        private Integer score;
        private String label;
    }

    @Data
    public static class RangeRule {
        private String sheet;
        private String range;
        private List<List<Object>> expectedValues = new ArrayList<>();
        private Integer score;
        private String label;
    }

    @Data
    public static class HeaderRule {
        private String sheet;
        private String range;
        private List<String> expectedHeaders = new ArrayList<>();
        private Integer score;
        private String label;
    }
}
