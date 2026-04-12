package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.PointsRuleOption;

import java.util.List;

public interface PointsRuleOptionService extends IService<PointsRuleOption> {
    List<PointsRuleOption> listByKind(String kind);
    PointsRuleOption getByKindAndValue(String kind, String optionValue);
}
