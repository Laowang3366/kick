package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("points_rule")
public class PointsRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private Integer points;
    private String type;
    private Boolean enabled;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
