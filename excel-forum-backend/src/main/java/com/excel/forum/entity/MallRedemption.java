package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mall_redemption")
public class MallRedemption {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long itemId;
    private String itemName;
    private String itemType;
    private Integer price;
    private String status;
    private String remark;
    private Long processedBy;
    private LocalDateTime processedTime;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
