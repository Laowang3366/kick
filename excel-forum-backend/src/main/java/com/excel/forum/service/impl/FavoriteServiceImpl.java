package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Favorite;
import com.excel.forum.mapper.FavoriteMapper;
import com.excel.forum.service.FavoriteService;
import org.springframework.stereotype.Service;

@Service
public class FavoriteServiceImpl extends ServiceImpl<FavoriteMapper, Favorite> implements FavoriteService {
}
