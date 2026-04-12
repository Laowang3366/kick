package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.QuestionCategory;
import com.excel.forum.mapper.QuestionCategoryMapper;
import com.excel.forum.service.QuestionCategoryService;
import com.excel.forum.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class QuestionCategoryServiceImpl extends ServiceImpl<QuestionCategoryMapper, QuestionCategory> implements QuestionCategoryService {
    private final QuestionService questionService;

    @Override
    public List<QuestionCategory> listWithQuestionCount(boolean enabledOnly) {
        QueryWrapper<QuestionCategory> queryWrapper = new QueryWrapper<>();
        if (enabledOnly) {
            queryWrapper.eq("enabled", true);
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        List<QuestionCategory> categories = list(queryWrapper);
        categories.forEach(category -> category.setQuestionCount(countQuestions(category.getId())));
        return categories;
    }

    @Override
    public long countQuestions(Long questionCategoryId) {
        if (questionCategoryId == null) {
            return 0;
        }
        QueryWrapper<Question> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("question_category_id", questionCategoryId);
        return questionService.count(queryWrapper);
    }
}
