package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Category;

import java.util.List;
import java.util.Map;

public interface CategoryService extends IService<Category> {
    List<Category> getTree();
    Map<Long, Long> countActivePostsByCategoryIds(List<Long> categoryIds);
    Map<Long, Long> countActiveRepliesByCategoryIds(List<Long> categoryIds);
    long countVisibleOnlineFollowers(Long categoryId);
}
