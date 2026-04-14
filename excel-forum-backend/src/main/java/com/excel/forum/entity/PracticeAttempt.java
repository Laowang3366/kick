package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("practice_attempt")
public class PracticeAttempt {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long levelId;
    private Long questionId;
    private String attemptType;
    private String resultStatus;
    private Integer score;
    private Integer stars;
    private Integer usedSeconds;
    private Integer errorCount;
    private Integer gainedExp;
    private Integer gainedPoints;
    private Boolean isFirstPass;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime submitTime;
}
