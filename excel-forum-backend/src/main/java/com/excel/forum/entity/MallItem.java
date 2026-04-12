package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("mall_item")
public class MallItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String type;
    private Integer price;
    private String description;
    private String coverImage;
    private String iconKey;
    private String themeColor;
    private Integer stock;
    private Integer redeemedCount;
    private Integer perUserLimit;
    private Integer totalLimit;
    private String exchangeNotice;
    private LocalDateTime availableFrom;
    private LocalDateTime availableUntil;
    private String deliveryType;
    private Boolean enabled;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
