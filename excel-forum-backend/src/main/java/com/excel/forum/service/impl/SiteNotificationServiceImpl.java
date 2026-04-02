package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.SiteNotification;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.SiteNotificationMapper;
import com.excel.forum.service.SiteNotificationService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SiteNotificationServiceImpl extends ServiceImpl<SiteNotificationMapper, SiteNotification> implements SiteNotificationService {
    
    private final UserService userService;
    private final NotificationService notificationService;

    @Override
    public Map<String, Object> getNotificationsPage(int page, int size) {
        Page<SiteNotification> pageParam = new Page<>(page, size);
        QueryWrapper<SiteNotification> queryWrapper = new QueryWrapper<>();
        queryWrapper.orderByDesc("create_time");
        
        Page<SiteNotification> result = page(pageParam, queryWrapper);
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", result.getRecords());
        response.put("total", result.getTotal());
        return response;
    }

    @Override
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("total", count());
        
        QueryWrapper<SiteNotification> sentWrapper = new QueryWrapper<>();
        sentWrapper.eq("status", "sent");
        stats.put("sent", count(sentWrapper));
        
        QueryWrapper<SiteNotification> draftWrapper = new QueryWrapper<>();
        draftWrapper.eq("status", "draft");
        stats.put("draft", count(draftWrapper));
        
        QueryWrapper<User> userWrapper = new QueryWrapper<>();
        userWrapper.eq("status", 0);
        stats.put("totalUsers", userService.count(userWrapper));
        
        return stats;
    }

    @Override
    public void sendNotification(Long id) {
        SiteNotification notification = getById(id);
        if (notification == null) return;
        
        notification.setStatus("sent");
        notification.setSendTime(LocalDateTime.now());
        
        QueryWrapper<User> userWrapper = new QueryWrapper<>();
        userWrapper.eq("status", 0);
        
        if ("role".equals(notification.getTargetType()) && notification.getTargetRoles() != null) {
            userWrapper.in("role", notification.getTargetRoles().split(","));
        }
        
        List<User> users = userService.list(userWrapper);
        notification.setTotalCount(users.size());
        
        updateById(notification);
        
        for (User user : users) {
            notificationService.createNotification(
                user.getId(),
                "site_notification",
                notification.getTitle(),
                notification.getId()
            );
        }
    }

    @Override
    public void incrementReadCount(Long siteNotificationId) {
        SiteNotification sn = getById(siteNotificationId);
        if (sn != null) {
            sn.setReadCount(sn.getReadCount() == null ? 1 : sn.getReadCount() + 1);
            updateById(sn);
        }
    }
}
