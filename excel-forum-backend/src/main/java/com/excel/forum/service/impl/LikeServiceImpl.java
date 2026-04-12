package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Like;
import com.excel.forum.mapper.LikeMapper;
import com.excel.forum.service.LikeService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class LikeServiceImpl extends ServiceImpl<LikeMapper, Like> implements LikeService {
    
    @Override
    public boolean isLiked(Long userId, Long replyId) {
        QueryWrapper<Like> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("target_id", replyId);
        queryWrapper.eq("target_type", "reply");
        return this.count(queryWrapper) > 0;
    }

    @Override
    public boolean toggleLike(Long userId, String targetType, Long targetId) {
        QueryWrapper<Like> deleteWrapper = new QueryWrapper<>();
        deleteWrapper.eq("user_id", userId)
                .eq("target_type", targetType)
                .eq("target_id", targetId);
        if (baseMapper.delete(deleteWrapper) > 0) {
            return false;
        }

        Like like = new Like();
        like.setUserId(userId);
        like.setTargetType(targetType);
        like.setTargetId(targetId);
        try {
            baseMapper.insert(like);
            return true;
        } catch (DuplicateKeyException ignored) {
            return true;
        }
    }
}
