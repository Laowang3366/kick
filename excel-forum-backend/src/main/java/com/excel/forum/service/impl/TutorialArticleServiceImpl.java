package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.mapper.TutorialArticleMapper;
import com.excel.forum.service.TutorialArticleService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TutorialArticleServiceImpl extends ServiceImpl<TutorialArticleMapper, TutorialArticle> implements TutorialArticleService {
    @Override
    public List<TutorialArticle> listByCategoryId(Long categoryId, boolean enabledOnly) {
        QueryWrapper<TutorialArticle> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("category_id", categoryId);
        if (enabledOnly) {
            queryWrapper.eq("enabled", true);
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        return list(queryWrapper);
    }

    @Override
    public Map<Long, List<TutorialArticle>> groupByCategoryIds(Collection<Long> categoryIds, boolean enabledOnly) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return Map.of();
        }
        QueryWrapper<TutorialArticle> queryWrapper = new QueryWrapper<>();
        queryWrapper.in("category_id", categoryIds);
        if (enabledOnly) {
            queryWrapper.eq("enabled", true);
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        return list(queryWrapper).stream()
                .collect(Collectors.groupingBy(TutorialArticle::getCategoryId, LinkedHashMap::new, Collectors.toList()));
    }
}
