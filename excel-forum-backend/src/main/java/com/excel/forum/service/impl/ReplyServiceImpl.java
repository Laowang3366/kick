package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.Reply;
import com.excel.forum.mapper.ReplyMapper;
import com.excel.forum.service.ReplyService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReplyServiceImpl extends ServiceImpl<ReplyMapper, Reply> implements ReplyService {
    
    @Override
    public List<Long> findAllDescendantIds(Long replyId) {
        List<Long> descendantIds = new ArrayList<>();
        collectDescendantIds(replyId, descendantIds);
        return descendantIds;
    }

    @Override
    public Map<Long, Long> countActiveByPostIds(Set<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Map<String, Object> row : baseMapper.countActiveByPostIds(postIds)) {
            Object postId = row.get("postId");
            Object replyCount = row.get("replyCount");
            if (postId instanceof Number postIdNumber && replyCount instanceof Number replyCountNumber) {
                counts.put(postIdNumber.longValue(), replyCountNumber.longValue());
            }
        }
        return counts;
    }
    
    private void collectDescendantIds(Long parentId, List<Long> descendantIds) {
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("parent_id", parentId);
        List<Reply> children = list(queryWrapper);
        
        for (Reply child : children) {
            descendantIds.add(child.getId());
            collectDescendantIds(child.getId(), descendantIds);
        }
    }
}
