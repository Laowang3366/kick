package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {
    @Select({
            "<script>",
            "SELECT p.category_id AS categoryId, COUNT(*) AS totalCount",
            "FROM post p",
            "WHERE p.status = 0",
            "<if test='categoryIds != null and categoryIds.size() > 0'>",
            "AND p.category_id IN",
            "<foreach collection='categoryIds' item='categoryId' open='(' separator=',' close=')'>",
            "#{categoryId}",
            "</foreach>",
            "</if>",
            "GROUP BY p.category_id",
            "</script>"
    })
    List<Map<String, Object>> countActivePostsByCategoryIds(@Param("categoryIds") Collection<Long> categoryIds);

    @Select({
            "<script>",
            "SELECT p.category_id AS categoryId, COUNT(r.id) AS totalCount",
            "FROM post p",
            "LEFT JOIN reply r ON r.post_id = p.id AND r.status = 0",
            "WHERE p.status = 0",
            "<if test='categoryIds != null and categoryIds.size() > 0'>",
            "AND p.category_id IN",
            "<foreach collection='categoryIds' item='categoryId' open='(' separator=',' close=')'>",
            "#{categoryId}",
            "</foreach>",
            "</if>",
            "GROUP BY p.category_id",
            "</script>"
    })
    List<Map<String, Object>> countActiveRepliesByCategoryIds(@Param("categoryIds") Collection<Long> categoryIds);

    @Select({
            "SELECT COUNT(DISTINCT u.id)",
            "FROM category_follow cf",
            "JOIN user u ON u.id = cf.user_id",
            "WHERE cf.category_id = #{categoryId}",
            "AND u.is_online = 1",
            "AND (u.show_online_status = 1 OR u.show_online_status IS NULL)"
    })
    Long countVisibleOnlineFollowers(@Param("categoryId") Long categoryId);
}
