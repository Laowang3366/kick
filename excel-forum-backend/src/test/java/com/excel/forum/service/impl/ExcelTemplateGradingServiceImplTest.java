package com.excel.forum.service.impl;

import com.excel.forum.config.FileStorageConfig;
import com.excel.forum.entity.dto.ExcelTemplateEvaluation;
import com.excel.forum.entity.dto.ExcelWorkbookSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExcelTemplateGradingServiceImplTest {

    private final ExcelTemplateGradingServiceImpl service =
            new ExcelTemplateGradingServiceImpl(new ObjectMapper(), new FileStorageConfig());

    @Test
    void gradeSimpleAnswerRuleAllowsDifferentFormulaTextWhenFormulaExists() {
        ExcelTemplateEvaluation evaluation = service.grade(
                buildSubmission(10, "AVERAGE(A1:A3)"),
                "{\"answerSheet\":\"Sheet1\",\"answerRange\":\"B2\",\"checkFormula\":true,\"score\":1}",
                "{\"rangeValues\":{\"Sheet1!B2\":[[10]]},\"rangeFormulas\":{\"Sheet1!B2\":[[\"SUM(A1:A3)\"]]}}"
        );

        assertThat(evaluation.isPassed()).isTrue();
        assertThat(evaluation.getScore()).isEqualTo(1);
        assertThat(evaluation.getRuleResults())
                .extracting(item -> item.get("passed"))
                .containsExactly(true, true);
    }

    @Test
    void gradeSimpleAnswerRuleFailsWhenExpectedFormulaIsMissing() {
        ExcelTemplateEvaluation evaluation = service.grade(
                buildSubmission(10, null),
                "{\"answerSheet\":\"Sheet1\",\"answerRange\":\"B2\",\"checkFormula\":true,\"score\":1}",
                "{\"rangeValues\":{\"Sheet1!B2\":[[10]]},\"rangeFormulas\":{\"Sheet1!B2\":[[\"SUM(A1:A3)\"]]}}"
        );

        assertThat(evaluation.isPassed()).isFalse();
        assertThat(evaluation.getScore()).isEqualTo(1);
        assertThat(evaluation.getFeedback()).contains("函数公式");
        assertThat(evaluation.getRuleResults())
                .extracting(item -> item.get("passed"))
                .containsExactly(true, false);
    }

    private ExcelWorkbookSnapshot buildSubmission(Object value, String formula) {
        ExcelWorkbookSnapshot.CellSnapshot cell = new ExcelWorkbookSnapshot.CellSnapshot();
        cell.setValue(value);
        cell.setFormula(formula);

        ExcelWorkbookSnapshot.SheetSnapshot sheet = new ExcelWorkbookSnapshot.SheetSnapshot();
        sheet.setName("Sheet1");
        sheet.setRowCount(2);
        sheet.setColumnCount(2);
        sheet.getCells().put("B2", cell);

        ExcelWorkbookSnapshot workbook = new ExcelWorkbookSnapshot();
        workbook.getSheets().add(sheet);
        return workbook;
    }
}
