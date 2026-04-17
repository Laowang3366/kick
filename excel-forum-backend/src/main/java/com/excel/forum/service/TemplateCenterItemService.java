package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.TemplateCenterItem;

import java.util.List;

public interface TemplateCenterItemService extends IService<TemplateCenterItem> {
    List<TemplateCenterItem> listPublic(String industryCategory);
}
