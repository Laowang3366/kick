package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TutorialArticleChapterRel;

import java.util.Collection;
import java.util.List;

public interface TutorialArticleChapterRelService extends IService<TutorialArticleChapterRel> {
    List<TutorialArticleChapterRel> listByArticleIds(Collection<Long> articleIds);
}
