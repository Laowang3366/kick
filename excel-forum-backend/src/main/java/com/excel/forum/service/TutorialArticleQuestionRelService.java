package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TutorialArticleQuestionRel;

import java.util.Collection;
import java.util.List;

public interface TutorialArticleQuestionRelService extends IService<TutorialArticleQuestionRel> {
    List<TutorialArticleQuestionRel> listByArticleIds(Collection<Long> articleIds);
}
