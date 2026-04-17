package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TutorialArticle;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface TutorialArticleService extends IService<TutorialArticle> {
    List<TutorialArticle> listByCategoryId(Long categoryId, boolean enabledOnly);
    Map<Long, List<TutorialArticle>> groupByCategoryIds(Collection<Long> categoryIds, boolean enabledOnly);
}
