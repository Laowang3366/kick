package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("chat_message")
public class ChatMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String username;
    private String avatar;
    private String content;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
