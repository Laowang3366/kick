package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TutorialCategory;

import java.util.List;

public interface TutorialCategoryService extends IService<TutorialCategory> {
    List<TutorialCategory> listWithArticleCount(boolean enabledOnly);

    long countArticles(Long categoryId);
}
