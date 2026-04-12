package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("point_log")
public class PointLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Integer pointsChange;
    private String reason;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}