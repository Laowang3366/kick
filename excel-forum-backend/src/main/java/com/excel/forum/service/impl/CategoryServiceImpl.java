package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Category;
import com.excel.forum.mapper.CategoryMapper;
import com.excel.forum.service.CategoryService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {
    @Override
    public List<Category> getTree() {
        // 暂时返回所有分类，前端自己构建树形结构
        return list();
    }

    @Override
    public Map<Long, Long> countActivePostsByCategoryIds(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> result = new HashMap<>();
        for (Map<String, Object> row : baseMapper.countActivePostsByCategoryIds(categoryIds)) {
            if (row.get("categoryId") instanceof Number categoryId && row.get("totalCount") instanceof Number totalCount) {
                result.put(categoryId.longValue(), totalCount.longValue());
            }
        }
        return result;
    }

    @Override
    public Map<Long, Long> countActiveRepliesByCategoryIds(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> result = new HashMap<>();
        for (Map<String, Object> row : baseMapper.countActiveRepliesByCategoryIds(categoryIds)) {
            if (row.get("categoryId") instanceof Number categoryId && row.get("totalCount") instanceof Number totalCount) {
                result.put(categoryId.longValue(), totalCount.longValue());
            }
        }
        return result;
    }

    @Override
    public long countVisibleOnlineFollowers(Long categoryId) {
        if (categoryId == null) {
            return 0L;
        }
        Long total = baseMapper.countVisibleOnlineFollowers(categoryId);
        return total == null ? 0L : total;
    }
}
