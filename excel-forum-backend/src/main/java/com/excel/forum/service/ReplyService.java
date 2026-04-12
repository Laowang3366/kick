package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Reply;

import java.util.List;
import java.util.Map;
import java.util.Set;

public interface ReplyService extends IService<Reply> {
    List<Long> findAllDescendantIds(Long replyId);
    Map<Long, Long> countActiveByPostIds(Set<Long> postIds);
}
