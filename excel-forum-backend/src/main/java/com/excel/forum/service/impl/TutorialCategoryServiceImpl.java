package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.mapper.TutorialCategoryMapper;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TutorialCategoryServiceImpl extends ServiceImpl<TutorialCategoryMapper, TutorialCategory> implements TutorialCategoryService {
    private final TutorialArticleService tutorialArticleService;

    @Override
    public List<TutorialCategory> listWithArticleCount(boolean enabledOnly) {
        QueryWrapper<TutorialCategory> queryWrapper = new QueryWrapper<>();
        if (enabledOnly) {
            queryWrapper.eq("enabled", true);
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        List<TutorialCategory> records = list(queryWrapper);
        records.forEach(item -> item.setArticleCount(countArticles(item.getId())));
        return records;
    }

    @Override
    public long countArticles(Long categoryId) {
        if (categoryId == null) {
            return 0;
        }
        QueryWrapper<com.excel.forum.entity.TutorialArticle> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("category_id", categoryId);
        return tutorialArticleService.count(queryWrapper);
    }
}
