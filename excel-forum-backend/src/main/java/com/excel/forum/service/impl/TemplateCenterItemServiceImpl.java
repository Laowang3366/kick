package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TemplateCenterItem;
import com.excel.forum.mapper.TemplateCenterItemMapper;
import com.excel.forum.service.TemplateCenterItemService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TemplateCenterItemServiceImpl extends ServiceImpl<TemplateCenterItemMapper, TemplateCenterItem> implements TemplateCenterItemService {
    @Override
    public List<TemplateCenterItem> listPublic(String industryCategory) {
        QueryWrapper<TemplateCenterItem> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true);
        if (industryCategory != null && !industryCategory.isBlank()) {
            queryWrapper.eq("industry_category", industryCategory.trim());
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        return list(queryWrapper);
    }
}
