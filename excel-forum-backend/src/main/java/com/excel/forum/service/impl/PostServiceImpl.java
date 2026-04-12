package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.mapper.PostMapper;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {

    private static final Set<String> ALLOWED_FIELDS = Set.of(
            "view_count", "like_count", "reply_count", "share_count", "favorite_count"
    );

    private final ReplyService replyService;

    @Override
    public void incrementField(Long postId, String field, int delta) {
        if (!ALLOWED_FIELDS.contains(field)) {
            throw new IllegalArgumentException("不允许更新的字段: " + field);
        }
        UpdateWrapper<Post> wrapper = new UpdateWrapper<>();
        wrapper.eq("id", postId)
               .setSql(field + " = COALESCE(" + field + ", 0) + " + delta);
        update(wrapper);
    }

    @Override
    public void recalculateReplyCount(Long postId) {
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("post_id", postId).eq("status", 0);
        long actualReplyCount = replyService.count(queryWrapper);
        Post update = new Post();
        update.setId(postId);
        update.setReplyCount((int) actualReplyCount);
        updateById(update);
    }
}
