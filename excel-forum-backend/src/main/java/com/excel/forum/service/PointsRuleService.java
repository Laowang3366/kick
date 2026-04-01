package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.PointsRule;
import java.util.List;

public interface PointsRuleService extends IService<PointsRule> {
    List<PointsRule> getEnabledRules();
}
