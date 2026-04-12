package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("practice_question_submission")
public class PracticeQuestionSubmission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long questionCategoryId;
    private String title;
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
    private String status;
    private String reviewNote;
    private Long reviewerId;
    private LocalDateTime reviewedTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
