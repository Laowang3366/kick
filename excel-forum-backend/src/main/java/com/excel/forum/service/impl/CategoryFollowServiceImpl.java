package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.CategoryFollow;
import com.excel.forum.mapper.CategoryFollowMapper;
import com.excel.forum.service.CategoryFollowService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryFollowServiceImpl extends ServiceImpl<CategoryFollowMapper, CategoryFollow> implements CategoryFollowService {

    @Override
    public List<Long> getFollowedCategoryIds(Long userId) {
        QueryWrapper<CategoryFollow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.select("category_id");

        return list(queryWrapper).stream()
            .map(CategoryFollow::getCategoryId)
            .collect(Collectors.toList());
    }

    @Override
    public boolean isFollowing(Long userId, Long categoryId) {
        QueryWrapper<CategoryFollow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("category_id", categoryId);
        return count(queryWrapper) > 0;
    }

    @Override
    public void follow(Long userId, Long categoryId) {
        if (!isFollowing(userId, categoryId)) {
            CategoryFollow cf = new CategoryFollow();
            cf.setUserId(userId);
            cf.setCategoryId(categoryId);
            save(cf);
        }
    }

    @Override
    public void unfollow(Long userId, Long categoryId) {
        QueryWrapper<CategoryFollow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("category_id", categoryId);
        remove(queryWrapper);
    }
}
