package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.QuestionCategory;

import java.util.List;

public interface QuestionCategoryService extends IService<QuestionCategory> {
    List<QuestionCategory> listWithQuestionCount(boolean enabledOnly);

    long countQuestions(Long questionCategoryId);
}
