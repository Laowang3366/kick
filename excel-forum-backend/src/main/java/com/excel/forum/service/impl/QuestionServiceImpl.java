package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Question;
import com.excel.forum.mapper.QuestionMapper;
import com.excel.forum.service.QuestionService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class QuestionServiceImpl extends ServiceImpl<QuestionMapper, Question> implements QuestionService {
    
    @Override
    public Map<String, Object> getQuestionsPage(int page, int size, String type, Long questionCategoryId) {
        Page<Question> pageParam = new Page<>(page, size);
        QueryWrapper<Question> queryWrapper = new QueryWrapper<>();
        
        if (type != null && !type.isEmpty()) {
            queryWrapper.eq("type", type);
        }
        if (questionCategoryId != null) {
            queryWrapper.eq("question_category_id", questionCategoryId);
        }
        
        queryWrapper.orderByDesc("create_time");
        Page<Question> result = page(pageParam, queryWrapper);
        
        Map<String, Object> response = new HashMap<>();
        response.put("questions", result.getRecords());
        response.put("total", result.getTotal());
        return response;
    }
}
