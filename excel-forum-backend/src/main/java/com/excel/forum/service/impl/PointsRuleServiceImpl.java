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
}
