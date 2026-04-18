package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_onboarding_answer")
public class UserOnboardingAnswer {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String questionCode;
    private String answerValue;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
