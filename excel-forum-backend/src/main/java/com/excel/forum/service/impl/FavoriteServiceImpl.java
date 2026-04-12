package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Favorite;
import com.excel.forum.mapper.FavoriteMapper;
import com.excel.forum.service.FavoriteService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class FavoriteServiceImpl extends ServiceImpl<FavoriteMapper, Favorite> implements FavoriteService {
    @Override
    public boolean toggleFavorite(Long userId, Long postId) {
        QueryWrapper<Favorite> deleteWrapper = new QueryWrapper<>();
        deleteWrapper.eq("user_id", userId).eq("post_id", postId);
        if (baseMapper.delete(deleteWrapper) > 0) {
            return false;
        }

        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setPostId(postId);
        try {
            baseMapper.insert(favorite);
            return true;
        } catch (DuplicateKeyException ignored) {
            return true;
        }
    }
}
