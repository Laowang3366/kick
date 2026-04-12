package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Like;

public interface LikeService extends IService<Like> {
    boolean isLiked(Long userId, Long replyId);
    boolean toggleLike(Long userId, String targetType, Long targetId);
}
