package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Category;

import java.util.List;

public interface CategoryService extends IService<Category> {
    List<Category> getTree();
}