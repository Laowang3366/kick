package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("practice_answer")
public class PracticeAnswer {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long recordId;
    private Long questionId;
    private String questionType;
    private String questionTitle;
    private String questionOptions;
    private String questionExplanation;
    private String userAnswer;
    private String correctAnswer;
    private String gradingDetail;
    private Boolean isCorrect;
    private Integer score;
    private Integer rewardPoints;
    private Boolean rewardGranted;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
