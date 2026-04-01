package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Message;

import java.util.List;
import java.util.Map;

public interface MessageService extends IService<Message> {
    Map<String, Object> getConversations(Long userId);
    List<Message> getMessages(Long userId, Long otherUserId);
    Message sendMessage(Long fromUserId, Long toUserId, String content);
    void markAsRead(Long userId, Long otherUserId);
    int getUnreadCount(Long userId);
}
