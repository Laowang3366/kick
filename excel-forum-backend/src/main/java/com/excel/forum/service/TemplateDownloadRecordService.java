package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TemplateDownloadRecord;

import java.util.List;

public interface TemplateDownloadRecordService extends IService<TemplateDownloadRecord> {
    boolean hasDownloaded(Long userId, Long templateId);

    List<TemplateDownloadRecord> listByUserId(Long userId);
}
