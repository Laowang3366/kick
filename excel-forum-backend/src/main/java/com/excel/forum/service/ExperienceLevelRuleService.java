package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.ExperienceLevelRule;

import java.util.List;

public interface ExperienceLevelRuleService extends IService<ExperienceLevelRule> {
    List<ExperienceLevelRule> listOrderedRules();
    List<ExperienceLevelRule> listEnabledRules();
    ExperienceLevelRule getByLevel(Integer level);
}
