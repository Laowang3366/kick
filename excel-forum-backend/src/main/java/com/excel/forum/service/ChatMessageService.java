package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.ChatMessage;

import java.util.List;

public interface ChatMessageService extends IService<ChatMessage> {
    List<ChatMessage> getRecentMessages(int limit);
    ChatMessage sendMessage(Long userId, String username, String avatar, String content);
}
