package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.User;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
    @Update("UPDATE user SET points = points - #{amount} WHERE id = #{userId} AND points >= #{amount}")
    int deductPoints(@Param("userId") Long userId, @Param("amount") int amount);

    @Update("UPDATE user SET points = points + #{amount} WHERE id = #{userId}")
    int addPoints(@Param("userId") Long userId, @Param("amount") int amount);
}
