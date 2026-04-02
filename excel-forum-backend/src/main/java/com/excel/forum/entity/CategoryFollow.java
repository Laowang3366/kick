package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("category_follow")
public class CategoryFollow {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long categoryId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
