package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Follow;
import com.excel.forum.mapper.FollowMapper;
import com.excel.forum.service.FollowService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FollowServiceImpl extends ServiceImpl<FollowMapper, Follow> implements FollowService {

    @Override
    public List<Long> getFollowingIds(Long userId) {
        QueryWrapper<Follow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.select("follow_user_id");
        
        return list(queryWrapper).stream()
            .map(Follow::getFollowUserId)
            .collect(Collectors.toList());
    }

    @Override
    public List<Long> getFollowerIds(Long userId) {
        QueryWrapper<Follow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("follow_user_id", userId);
        queryWrapper.select("user_id");
        
        return list(queryWrapper).stream()
            .map(Follow::getUserId)
            .collect(Collectors.toList());
    }

    @Override
    public boolean isFollowing(Long userId, Long followUserId) {
        QueryWrapper<Follow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("follow_user_id", followUserId);
        return count(queryWrapper) > 0;
    }

    @Override
    public void follow(Long userId, Long followUserId) {
        if (!isFollowing(userId, followUserId)) {
            Follow follow = new Follow();
            follow.setUserId(userId);
            follow.setFollowUserId(followUserId);
            save(follow);
        }
    }

    @Override
    public void unfollow(Long userId, Long followUserId) {
        QueryWrapper<Follow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("follow_user_id", followUserId);
        remove(queryWrapper);
    }
}
