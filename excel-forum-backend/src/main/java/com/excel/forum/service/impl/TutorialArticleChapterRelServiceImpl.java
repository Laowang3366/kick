package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.TutorialArticleChapterRel;
import com.excel.forum.mapper.TutorialArticleChapterRelMapper;
import com.excel.forum.service.TutorialArticleChapterRelService;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

@Service
public class TutorialArticleChapterRelServiceImpl extends ServiceImpl<TutorialArticleChapterRelMapper, TutorialArticleChapterRel>
        implements TutorialArticleChapterRelService {
    @Override
    public List<TutorialArticleChapterRel> listByArticleIds(Collection<Long> articleIds) {
        if (articleIds == null || articleIds.isEmpty()) {
            return List.of();
        }
        return list(new QueryWrapper<TutorialArticleChapterRel>()
                .in("article_id", articleIds)
                .orderByAsc("sort_order")
                .orderByAsc("id"));
    }
}
