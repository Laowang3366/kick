package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TutorialArticle;

import java.util.List;

public interface TutorialArticleService extends IService<TutorialArticle> {
    List<TutorialArticle> listByCategoryId(Long categoryId, boolean enabledOnly);
}
