package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Post;

public interface PostService extends IService<Post> {
    void incrementField(Long postId, String field, int delta);
    void recalculateReplyCount(Long postId);
}
