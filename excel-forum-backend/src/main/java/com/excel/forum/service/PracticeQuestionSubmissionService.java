package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.PracticeQuestionSubmission;

import java.util.Map;

public interface PracticeQuestionSubmissionService extends IService<PracticeQuestionSubmission> {
    Map<String, Object> getReviewPage(int page, int size, String status);
}
