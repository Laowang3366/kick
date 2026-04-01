package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Category;
import com.excel.forum.mapper.CategoryMapper;
import com.excel.forum.service.CategoryService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {
    @Override
    public List<Category> getTree() {
        // 暂时返回所有分类，前端自己构建树形结构
        return list();
    }
}