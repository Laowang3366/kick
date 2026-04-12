package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.Reply;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Mapper
public interface ReplyMapper extends BaseMapper<Reply> {
    @Select({
            "<script>",
            "SELECT post_id AS postId, COUNT(*) AS replyCount",
            "FROM reply",
            "WHERE status = 0",
            "<if test='postIds != null and postIds.size() > 0'>",
            "AND post_id IN",
            "<foreach collection='postIds' item='postId' open='(' separator=',' close=')'>",
            "#{postId}",
            "</foreach>",
            "</if>",
            "GROUP BY post_id",
            "</script>"
    })
    List<Map<String, Object>> countActiveByPostIds(@Param("postIds") Collection<Long> postIds);
}
