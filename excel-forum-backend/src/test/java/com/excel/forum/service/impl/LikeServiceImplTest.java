package com.excel.forum.service.impl;

import com.excel.forum.entity.Like;
import com.excel.forum.mapper.LikeMapper;
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
class LikeServiceImplTest {

    @Mock
    private LikeMapper likeMapper;

    private LikeServiceImpl likeService;

    @BeforeEach
    void setUp() {
        likeService = new LikeServiceImpl();
        ReflectionTestUtils.setField(likeService, "baseMapper", likeMapper);
    }

    @Test
    void toggleLikeReturnsFalseWhenExistingLikeDeleted() {
        when(likeMapper.delete(any())).thenReturn(1);

        boolean result = likeService.toggleLike(1L, "post", 10L);

        assertThat(result).isFalse();
        verify(likeMapper).delete(any());
    }

    @Test
    void toggleLikeReturnsTrueWhenInsertSucceeds() {
        when(likeMapper.delete(any())).thenReturn(0);
        when(likeMapper.insert(any(Like.class))).thenReturn(1);

        boolean result = likeService.toggleLike(1L, "post", 10L);

        assertThat(result).isTrue();
        verify(likeMapper).insert(any(Like.class));
    }

    @Test
    void toggleLikeReturnsTrueWhenDuplicateInsertOccurs() {
        when(likeMapper.delete(any())).thenReturn(0);
        doThrow(new DuplicateKeyException("duplicate")).when(likeMapper).insert(any(Like.class));

        boolean result = likeService.toggleLike(1L, "post", 10L);

        assertThat(result).isTrue();
    }
}
