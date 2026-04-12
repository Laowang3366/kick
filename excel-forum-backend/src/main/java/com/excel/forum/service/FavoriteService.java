package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Favorite;

public interface FavoriteService extends IService<Favorite> {
    boolean toggleFavorite(Long userId, Long postId);
}
