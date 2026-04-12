package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.MallItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface MallItemMapper extends BaseMapper<MallItem> {
    @Update("""
            UPDATE mall_item
            SET redeemed_count = redeemed_count + 1,
                stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - 1 END
            WHERE id = #{itemId}
              AND enabled = 1
              AND (stock IS NULL OR stock > 0)
              AND (total_limit IS NULL OR redeemed_count < total_limit)
            """)
    int reserveForRedeem(@Param("itemId") Long itemId);

    @Update("""
            UPDATE mall_item
            SET redeemed_count = CASE WHEN redeemed_count > 0 THEN redeemed_count - 1 ELSE 0 END,
                stock = CASE WHEN stock IS NULL THEN NULL ELSE stock + 1 END
            WHERE id = #{itemId}
            """)
    int releaseReservation(@Param("itemId") Long itemId);
}
