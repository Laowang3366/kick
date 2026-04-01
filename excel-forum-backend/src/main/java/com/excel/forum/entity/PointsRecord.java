package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("points_record")
public class PointsRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String ruleName;
    private Integer change;
    private Integer balance;
    private String description;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
