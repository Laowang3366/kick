package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.PostView;
import com.excel.forum.mapper.PostViewMapper;
import com.excel.forum.service.PostViewService;
import org.springframework.stereotype.Service;

@Service
public class PostViewServiceImpl extends ServiceImpl<PostViewMapper, PostView> implements PostViewService {
}
