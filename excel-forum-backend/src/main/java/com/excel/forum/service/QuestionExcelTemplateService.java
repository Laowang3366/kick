package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.QuestionExcelTemplate;

import java.util.List;
import java.util.Map;

public interface QuestionExcelTemplateService extends IService<QuestionExcelTemplate> {
    QuestionExcelTemplate getByQuestionId(Long questionId);

    Map<Long, QuestionExcelTemplate> mapByQuestionIds(List<Long> questionIds);

    void removeByQuestionId(Long questionId);
}
