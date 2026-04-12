package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("post")
public class Post {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    private String titleStyle;
    private String content;
    private Long userId;
    private Long categoryId;
    private Integer status;
    private Integer type;
    private Integer rewardPoints;
    private Long bestAnswerId;
    private Integer viewCount;
    private Integer likeCount;
    private Integer replyCount;
    private Integer shareCount;
    private Integer favoriteCount;
    @TableField("is_locked")
    private Boolean isLocked = false;
    @TableField("is_top")
    private Boolean isTop = false;
    @TableField("is_essence")
    private Boolean isEssence = false;
    private String attachments;
    private String tags;
    private String reviewStatus;
    private String reviewReason;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
