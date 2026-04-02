package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.CategoryFollow;

import java.util.List;

public interface CategoryFollowService extends IService<CategoryFollow> {
    List<Long> getFollowedCategoryIds(Long userId);
    boolean isFollowing(Long userId, Long categoryId);
    void follow(Long userId, Long categoryId);
    void unfollow(Long userId, Long categoryId);
}
