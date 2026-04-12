package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.PostShare;
import com.excel.forum.mapper.PostShareMapper;
import com.excel.forum.service.PostShareService;
import org.springframework.stereotype.Service;

@Service
public class PostShareServiceImpl extends ServiceImpl<PostShareMapper, PostShare> implements PostShareService {
}
