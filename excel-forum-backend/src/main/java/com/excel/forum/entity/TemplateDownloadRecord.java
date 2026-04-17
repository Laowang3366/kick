package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("template_download_record")
public class TemplateDownloadRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long templateId;
    private Integer pointsCost;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
