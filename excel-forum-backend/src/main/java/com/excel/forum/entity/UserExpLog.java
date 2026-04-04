package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_exp_log")
public class UserExpLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String bizType;
    private Long bizId;
    private Integer expChange;
    private String reason;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
