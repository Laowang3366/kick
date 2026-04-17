package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TutorialArticleQuestionRel;
import com.excel.forum.mapper.TutorialArticleQuestionRelMapper;
import com.excel.forum.service.TutorialArticleQuestionRelService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
public class TutorialArticleQuestionRelServiceImpl extends ServiceImpl<TutorialArticleQuestionRelMapper, TutorialArticleQuestionRel>
        implements TutorialArticleQuestionRelService {
    @Override
    public List<TutorialArticleQuestionRel> listByArticleIds(Collection<Long> articleIds) {
        if (articleIds == null || articleIds.isEmpty()) {
            return List.of();
        }
        return list(new QueryWrapper<TutorialArticleQuestionRel>()
                .in("article_id", articleIds)
                .orderByAsc("sort_order")
                .orderByAsc("id"));
    }
}
