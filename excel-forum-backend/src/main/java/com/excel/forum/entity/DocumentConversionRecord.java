package com.excel.forum.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("document_conversion_record")
public class DocumentConversionRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String sourceFileName;
    private String sourceType;
    private String targetType;
    private String resultFileName;
    private String resultUrl;
    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
