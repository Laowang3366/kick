package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.SiteNotification;
import java.util.Map;

public interface SiteNotificationService extends IService<SiteNotification> {
    Map<String, Object> getNotificationsPage(int page, int size);
    Map<String, Object> getStats();
    void sendNotification(Long id);
}
