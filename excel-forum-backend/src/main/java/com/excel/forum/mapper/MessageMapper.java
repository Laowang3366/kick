package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
    @Select({
            "WITH ranked AS (",
            "  SELECT",
            "    CASE WHEN from_user_id = #{userId} THEN to_user_id ELSE from_user_id END AS otherUserId,",
            "    content,",
            "    create_time AS createTime,",
            "    ROW_NUMBER() OVER (",
            "      PARTITION BY CASE WHEN from_user_id = #{userId} THEN to_user_id ELSE from_user_id END",
            "      ORDER BY create_time DESC, id DESC",
            "    ) AS rn,",
            "    CASE WHEN to_user_id = #{userId} AND is_read = 0 THEN 1 ELSE 0 END AS unreadInc",
            "  FROM message",
            "  WHERE from_user_id = #{userId} OR to_user_id = #{userId}",
            ")",
            "SELECT",
            "  otherUserId,",
            "  MAX(CASE WHEN rn = 1 THEN content END) AS lastMessage,",
            "  MAX(CASE WHEN rn = 1 THEN createTime END) AS lastMessageTime,",
            "  SUM(unreadInc) AS unreadCount",
            "FROM ranked",
            "GROUP BY otherUserId",
            "ORDER BY lastMessageTime DESC"
    })
    List<Map<String, Object>> selectConversationSummaries(@Param("userId") Long userId);
}
