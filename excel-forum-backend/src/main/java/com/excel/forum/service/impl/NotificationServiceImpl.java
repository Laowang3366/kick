package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Notification;
import com.excel.forum.mapper.NotificationMapper;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class NotificationServiceImpl extends ServiceImpl<NotificationMapper, Notification> implements NotificationService {

    @Autowired
    private ForumEventService forumEventService;
    
    @Override
    public Map<String, Object> getUserNotifications(Long userId, String type, Integer page, Integer limit) {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        
        if (type != null && !type.isEmpty()) {
            String[] types = type.split(",");
            if (types.length == 1) {
                queryWrapper.eq("type", types[0]);
            } else {
                queryWrapper.in("type", Arrays.asList(types));
            }
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<Notification> pageRequest = new Page<>(page, limit);
        Page<Notification> result = page(pageRequest, queryWrapper);
        
        Map<String, Object> response = new HashMap<>();
        response.put("notifications", result.getRecords());
        response.put("total", result.getTotal());
        
        return response;
    }

    @Override
    public void markAsRead(Long userId, Long notificationId) {
        UpdateWrapper<Notification> updateWrapper = new UpdateWrapper<>();
        updateWrapper.set("is_read", 1)
                    .eq("id", notificationId)
                    .eq("user_id", userId);
        update(updateWrapper);
    }

    @Override
    public void markAllAsRead(Long userId) {
        UpdateWrapper<Notification> updateWrapper = new UpdateWrapper<>();
        updateWrapper.set("is_read", 1)
                    .eq("user_id", userId)
                    .eq("is_read", 0);
        update(updateWrapper);
    }

    @Override
    public void createNotification(Long userId, String type, String content, Long relatedId) {
        createNotification(userId, type, content, relatedId, null);
    }

    @Override
    public void createNotification(Long userId, String type, String content, Long relatedId, Long senderId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setContent(content);
        notification.setRelatedId(relatedId);
        notification.setSenderId(senderId);
        notification.setIsRead(0);
        save(notification);

        // 通过 WebSocket 推送通知事件给目标用户
        try {
            forumEventService.publishNotificationEvent(userId, notification);
        } catch (Exception e) {
            log.warn("WebSocket推送通知失败: {}", e.getMessage());
        }
    }

    @Override
    public void deleteNotification(Long userId, Long notificationId) {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("id", notificationId).eq("user_id", userId);
        remove(queryWrapper);
    }

    @Override
    public void deleteBatch(Long userId, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.in("id", ids).eq("user_id", userId);
        remove(queryWrapper);
    }
}
