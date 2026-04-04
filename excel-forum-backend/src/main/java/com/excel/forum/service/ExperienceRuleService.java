package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.ExperienceRule;

import java.util.List;

public interface ExperienceRuleService extends IService<ExperienceRule> {
    List<ExperienceRule> listOrderedRules();

    ExperienceRule getByRuleKey(String ruleKey);

    int resolveFixedExp(String ruleKey, int defaultValue);

    int resolveRandomExp(String ruleKey, int defaultMin, int defaultMax);
}
