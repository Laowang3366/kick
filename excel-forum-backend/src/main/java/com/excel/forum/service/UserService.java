package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.User;

import java.util.List;

public interface UserService extends IService<User> {
    User findByUsername(String username);
    User findByEmail(String email);
    
    void setOnline(Long userId);
    void setOffline(Long userId);
    void updateActiveTime(Long userId);
    List<User> getOnlineUsers(int limit);
    int getOnlineUserCount();
    void cleanInactiveUsers();
}