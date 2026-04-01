package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("reply")
public class Reply {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String content;
    private Long userId;
    private Long postId;
    private Long parentId;
    private Integer likeCount;
    private Integer status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}