package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.ChatMessage;
import com.excel.forum.mapper.ChatMessageMapper;
import com.excel.forum.service.ChatMessageService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatMessageServiceImpl extends ServiceImpl<ChatMessageMapper, ChatMessage> implements ChatMessageService {
    
    @Override
    public List<ChatMessage> getRecentMessages(int limit) {
        QueryWrapper<ChatMessage> queryWrapper = new QueryWrapper<>();
        queryWrapper.orderByDesc("create_time");
        Page<ChatMessage> page = new Page<>(1, limit);
        List<ChatMessage> messages = page(page, queryWrapper).getRecords();
        java.util.Collections.reverse(messages);
        return messages;
    }

    @Override
    public ChatMessage sendMessage(Long userId, String username, String avatar, String content) {
        ChatMessage message = new ChatMessage();
        message.setUserId(userId);
        message.setUsername(username);
        message.setAvatar(avatar);
        message.setContent(content);
        save(message);
        return message;
    }
}
