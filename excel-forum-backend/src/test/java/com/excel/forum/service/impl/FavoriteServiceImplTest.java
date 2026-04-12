package com.excel.forum.service.impl;

import com.excel.forum.entity.Favorite;
import com.excel.forum.mapper.FavoriteMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FavoriteServiceImplTest {

    @Mock
    private FavoriteMapper favoriteMapper;

    private FavoriteServiceImpl favoriteService;

    @BeforeEach
    void setUp() {
        favoriteService = new FavoriteServiceImpl();
        ReflectionTestUtils.setField(favoriteService, "baseMapper", favoriteMapper);
    }

    @Test
    void toggleFavoriteReturnsFalseWhenExistingFavoriteDeleted() {
        when(favoriteMapper.delete(any())).thenReturn(1);

        boolean result = favoriteService.toggleFavorite(1L, 10L);

        assertThat(result).isFalse();
        verify(favoriteMapper).delete(any());
    }

    @Test
    void toggleFavoriteReturnsTrueWhenInsertSucceeds() {
        when(favoriteMapper.delete(any())).thenReturn(0);
        when(favoriteMapper.insert(any(Favorite.class))).thenReturn(1);

        boolean result = favoriteService.toggleFavorite(1L, 10L);

        assertThat(result).isTrue();
        verify(favoriteMapper).insert(any(Favorite.class));
    }

    @Test
    void toggleFavoriteReturnsTrueWhenDuplicateInsertOccurs() {
        when(favoriteMapper.delete(any())).thenReturn(0);
        doThrow(new DuplicateKeyException("duplicate")).when(favoriteMapper).insert(any(Favorite.class));

        boolean result = favoriteService.toggleFavorite(1L, 10L);

        assertThat(result).isTrue();
    }
}
