package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}