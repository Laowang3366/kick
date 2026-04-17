package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TemplateDownloadRecord;
import com.excel.forum.mapper.TemplateDownloadRecordMapper;
import com.excel.forum.service.TemplateDownloadRecordService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TemplateDownloadRecordServiceImpl extends ServiceImpl<TemplateDownloadRecordMapper, TemplateDownloadRecord> implements TemplateDownloadRecordService {
    @Override
    public boolean hasDownloaded(Long userId, Long templateId) {
        if (userId == null || templateId == null) {
            return false;
        }
        QueryWrapper<TemplateDownloadRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("template_id", templateId);
        return count(queryWrapper) > 0;
    }

    @Override
    public List<TemplateDownloadRecord> listByUserId(Long userId) {
        QueryWrapper<TemplateDownloadRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).orderByDesc("create_time").orderByDesc("id");
        return list(queryWrapper);
    }
}
