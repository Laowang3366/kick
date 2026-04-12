package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Follow;

import java.util.List;

public interface FollowService extends IService<Follow> {
    List<Long> getFollowingIds(Long userId);
    List<Long> getFollowerIds(Long userId);
    boolean isFollowing(Long userId, Long followUserId);
    void follow(Long userId, Long followUserId);
    void unfollow(Long userId, Long followUserId);
}
