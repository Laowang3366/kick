package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("practice_level")
public class PracticeLevel {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long chapterId;
    private Long questionId;
    private String title;
    private String levelType;
    private String difficulty;
    private Integer targetTimeSeconds;
    private Integer rewardExp;
    private Integer rewardPoints;
    private Integer firstPassBonus;
    private Integer sortOrder;
    private Boolean enabled;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
