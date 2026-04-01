package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Message;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.MessageMapper;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.UserService;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MessageServiceImpl extends ServiceImpl<MessageMapper, Message> implements MessageService {
    private final UserService userService;

    public MessageServiceImpl(UserService userService) {
        this.userService = userService;
    }

    @Override
    public Map<String, Object> getConversations(Long userId) {
        QueryWrapper<Message> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("from_user_id", userId).or().eq("to_user_id", userId);
        queryWrapper.orderByDesc("create_time");
        
        List<Message> allMessages = list(queryWrapper);
        
        Map<Long, Map<String, Object>> conversationsMap = new LinkedHashMap<>();
        
        for (Message message : allMessages) {
            Long otherUserId = message.getFromUserId().equals(userId) 
                ? message.getToUserId() 
                : message.getFromUserId();
            
            if (!conversationsMap.containsKey(otherUserId)) {
                User otherUser = userService.getById(otherUserId);
                if (otherUser != null) {
                    Map<String, Object> conversation = new HashMap<>();
                    
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", otherUser.getId());
                    userInfo.put("username", otherUser.getUsername());
                    userInfo.put("avatar", otherUser.getAvatar());
                    
                    conversation.put("id", otherUserId);
                    conversation.put("user", userInfo);
                    conversation.put("lastMessage", message.getContent());
                    conversation.put("lastMessageTime", message.getCreateTime());
                    
                    QueryWrapper<Message> unreadQuery = new QueryWrapper<>();
                    unreadQuery.eq("to_user_id", userId)
                               .eq("from_user_id", otherUserId)
                               .eq("is_read", 0);
                    conversation.put("unreadCount", count(unreadQuery));
                    
                    conversationsMap.put(otherUserId, conversation);
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("conversations", new ArrayList<>(conversationsMap.values()));
        return result;
    }

    @Override
    public List<Message> getMessages(Long userId, Long otherUserId) {
        QueryWrapper<Message> queryWrapper = new QueryWrapper<>();
        queryWrapper.and(wrapper -> wrapper
            .eq("from_user_id", userId).eq("to_user_id", otherUserId)
            .or()
            .eq("from_user_id", otherUserId).eq("to_user_id", userId)
        );
        queryWrapper.orderByAsc("create_time");
        
        return list(queryWrapper);
    }

    @Override
    public Message sendMessage(Long fromUserId, Long toUserId, String content) {
        Message message = new Message();
        message.setFromUserId(fromUserId);
        message.setToUserId(toUserId);
        message.setContent(content);
        message.setIsRead(0);
        save(message);
        return message;
    }

    @Override
    public void markAsRead(Long userId, Long otherUserId) {
        UpdateWrapper<Message> updateWrapper = new UpdateWrapper<>();
        updateWrapper.set("is_read", 1)
                    .eq("to_user_id", userId)
                    .eq("from_user_id", otherUserId)
                    .eq("is_read", 0);
        update(updateWrapper);
    }

    @Override
    public int getUnreadCount(Long userId) {
        QueryWrapper<Message> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("to_user_id", userId)
                   .eq("is_read", 0);
        return (int) count(queryWrapper);
    }
}
