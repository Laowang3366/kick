package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("post_view")
public class PostView {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long postId;
    private Long userId;
    private String ipAddress;
    private String viewerKey;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
