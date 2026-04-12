package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Message;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.MessageMapper;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.UserService;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageServiceImpl extends ServiceImpl<MessageMapper, Message> implements MessageService {
    private final UserService userService;

    public MessageServiceImpl(UserService userService) {
        this.userService = userService;
    }

    @Override
    public Map<String, Object> getConversations(Long userId) {
        List<Map<String, Object>> summaryRows = baseMapper.selectConversationSummaries(userId);
        Set<Long> otherUserIds = summaryRows.stream()
                .map(row -> row.get("otherUserId"))
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .map(Number::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, User> userMap = otherUserIds.isEmpty()
                ? Collections.emptyMap()
                : userService.listByIds(otherUserIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, user -> user, (left, right) -> left));
        
        List<Map<String, Object>> conversations = new ArrayList<>();
        for (Map<String, Object> row : summaryRows) {
            if (!(row.get("otherUserId") instanceof Number otherUserIdNumber)) {
                continue;
            }
            Long otherUserId = otherUserIdNumber.longValue();
            User otherUser = userMap.get(otherUserId);
            if (otherUser == null) {
                continue;
            }
            Map<String, Object> conversation = new HashMap<>();
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", otherUser.getId());
            userInfo.put("username", otherUser.getUsername());
            userInfo.put("avatar", otherUser.getAvatar());
            conversation.put("id", otherUserId);
            conversation.put("user", userInfo);
            conversation.put("lastMessage", row.get("lastMessage"));
            conversation.put("lastMessageTime", row.get("lastMessageTime"));
            conversation.put("unreadCount", row.get("unreadCount") instanceof Number unread ? unread.intValue() : 0);
            conversations.add(conversation);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("conversations", conversations);
        return result;
    }

    @Override
    public Page<Message> getMessages(Long userId, Long otherUserId, Integer page, Integer size) {
        QueryWrapper<Message> queryWrapper = new QueryWrapper<>();
        queryWrapper.and(wrapper -> wrapper
            .eq("from_user_id", userId).eq("to_user_id", otherUserId)
            .or()
            .eq("from_user_id", otherUserId).eq("to_user_id", userId)
        );
        queryWrapper.orderByDesc("create_time");
        int safePage = page == null ? 1 : Math.max(page, 1);
        int safeSize = size == null ? 20 : Math.min(Math.max(size, 1), 100);
        return page(new Page<>(safePage, safeSize), queryWrapper);
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
