package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Post;
import com.excel.forum.mapper.PostMapper;
import com.excel.forum.service.PostService;
import org.springframework.stereotype.Service;

@Service
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {
}