package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Reply;
import com.excel.forum.mapper.ReplyMapper;
import com.excel.forum.service.ReplyService;
import org.springframework.stereotype.Service;

@Service
public class ReplyServiceImpl extends ServiceImpl<ReplyMapper, Reply> implements ReplyService {
}