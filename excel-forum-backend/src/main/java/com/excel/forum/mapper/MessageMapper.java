package com.excel.forum.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.excel.forum.entity.Message;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
}