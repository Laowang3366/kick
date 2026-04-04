package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.Reply;
import java.util.List;

public interface ReplyService extends IService<Reply> {
    List<Long> findAllDescendantIds(Long replyId);
}