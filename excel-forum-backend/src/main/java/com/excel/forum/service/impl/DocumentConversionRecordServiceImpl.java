package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.DocumentConversionRecord;
import com.excel.forum.mapper.DocumentConversionRecordMapper;
import com.excel.forum.service.DocumentConversionRecordService;
import org.springframework.stereotype.Service;

@Service
public class DocumentConversionRecordServiceImpl extends ServiceImpl<DocumentConversionRecordMapper, DocumentConversionRecord>
        implements DocumentConversionRecordService {
}
