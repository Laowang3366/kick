package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.PointsRule;
import com.excel.forum.mapper.PointsRuleMapper;
import com.excel.forum.service.PointsRuleService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PointsRuleServiceImpl extends ServiceImpl<PointsRuleMapper, PointsRule> implements PointsRuleService {
    
    @Override
    public List<PointsRule> getEnabledRules() {
        QueryWrapper<PointsRule> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true);
        return list(queryWrapper);
    }

    @Override
    public List<PointsRule> getEnabledTaskRules() {
        QueryWrapper<PointsRule> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true)
                .eq("user_visible", true)
                .isNotNull("task_key")
                .ne("task_key", "")
                .orderByAsc("sort_order")
                .orderByAsc("id");
        return list(queryWrapper);
    }

    @Override
    public PointsRule getRuleByTaskKey(String taskKey) {
        if (taskKey == null || taskKey.isBlank()) {
            return null;
        }
        QueryWrapper<PointsRule> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("task_key", taskKey)
                .eq("enabled", true)
                .last("LIMIT 1");
        return getOne(queryWrapper, false);
    }
}
