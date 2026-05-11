package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.AiAssistantCallLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface AiAssistantCallLogMapper extends BaseMapper<AiAssistantCallLog> {
    @Select("""
            <script>
            SELECT
                COUNT(*) AS totalCalls,
                COALESCE(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0) AS successCalls,
                COALESCE(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END), 0) AS failedCalls,
                COALESCE(SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END), 0) AS fallbackCalls,
                COUNT(DISTINCT user_id) AS activeUsers,
                MAX(create_time) AS lastCallTime
            FROM ai_assistant_call_log
            <where>
                <if test="startTime != null">create_time &gt;= #{startTime}</if>
                <if test="endTime != null">AND create_time &lt; #{endTime}</if>
            </where>
            </script>
            """)
    Map<String, Object> selectOverview(@Param("startTime") LocalDateTime startTime,
                                       @Param("endTime") LocalDateTime endTime);

    @Select("""
            <script>
            SELECT COUNT(*) FROM (
                SELECT l.user_id
                FROM ai_assistant_call_log l
                LEFT JOIN `user` u ON u.id = l.user_id
                <where>
                    <if test="startTime != null">l.create_time &gt;= #{startTime}</if>
                    <if test="endTime != null">AND l.create_time &lt; #{endTime}</if>
                    <if test="keyword != null and keyword != ''">
                        AND (u.username LIKE CONCAT('%', #{keyword}, '%') OR u.email LIKE CONCAT('%', #{keyword}, '%'))
                    </if>
                </where>
                GROUP BY l.user_id
            ) t
            </script>
            """)
    Long countUserStats(@Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime,
                        @Param("keyword") String keyword);

    @Select("""
            <script>
            SELECT
                l.user_id AS userId,
                COALESCE(u.username, CONCAT('用户#', l.user_id)) AS username,
                COALESCE(u.email, '') AS email,
                COUNT(*) AS totalCalls,
                COALESCE(SUM(CASE WHEN l.success = 1 THEN 1 ELSE 0 END), 0) AS successCalls,
                COALESCE(SUM(CASE WHEN l.success = 0 THEN 1 ELSE 0 END), 0) AS failedCalls,
                COALESCE(SUM(CASE WHEN l.fallback_used = 1 THEN 1 ELSE 0 END), 0) AS fallbackCalls,
                MAX(l.create_time) AS lastCallTime
            FROM ai_assistant_call_log l
            LEFT JOIN `user` u ON u.id = l.user_id
            <where>
                <if test="startTime != null">l.create_time &gt;= #{startTime}</if>
                <if test="endTime != null">AND l.create_time &lt; #{endTime}</if>
                <if test="keyword != null and keyword != ''">
                    AND (u.username LIKE CONCAT('%', #{keyword}, '%') OR u.email LIKE CONCAT('%', #{keyword}, '%'))
                </if>
            </where>
            GROUP BY l.user_id, u.username, u.email
            ORDER BY totalCalls DESC, lastCallTime DESC
            LIMIT #{offset}, #{size}
            </script>
            """)
    List<Map<String, Object>> selectUserStats(@Param("startTime") LocalDateTime startTime,
                                              @Param("endTime") LocalDateTime endTime,
                                              @Param("keyword") String keyword,
                                              @Param("offset") long offset,
                                              @Param("size") long size);
}
