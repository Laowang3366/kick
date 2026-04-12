package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.PracticeQuestionSubmission;
import com.excel.forum.entity.QuestionCategory;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.PracticeQuestionSubmissionMapper;
import com.excel.forum.service.PracticeQuestionSubmissionService;
import com.excel.forum.service.QuestionCategoryService;
import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PracticeQuestionSubmissionServiceImpl extends ServiceImpl<PracticeQuestionSubmissionMapper, PracticeQuestionSubmission>
        implements PracticeQuestionSubmissionService {

    private final UserService userService;
    private final QuestionCategoryService questionCategoryService;

    @Override
    public Map<String, Object> getReviewPage(int page, int size, String status) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<PracticeQuestionSubmission> pageRequest = new Page<>(safePage, safeSize);
        QueryWrapper<PracticeQuestionSubmission> wrapper = new QueryWrapper<>();
        if (status != null && !status.isBlank()) {
            wrapper.eq("status", status.trim());
        }
        wrapper.orderByAsc("status").orderByDesc("create_time");
        Page<PracticeQuestionSubmission> result = page(pageRequest, wrapper);

        Set<Long> userIds = result.getRecords().stream()
                .flatMap(item -> java.util.stream.Stream.of(item.getUserId(), item.getReviewerId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, User> userMap = userIds.isEmpty() ? Map.of() : userService.listByIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, item -> item, (left, right) -> left));

        Set<Long> categoryIds = result.getRecords().stream()
                .map(PracticeQuestionSubmission::getQuestionCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, QuestionCategory> categoryMap = categoryIds.isEmpty() ? Map.of() : questionCategoryService.listByIds(categoryIds).stream()
                .collect(Collectors.toMap(QuestionCategory::getId, item -> item, (left, right) -> left));

        List<Map<String, Object>> records = result.getRecords().stream().map(item -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", item.getId());
            row.put("title", item.getTitle());
            row.put("description", item.getDescription());
            row.put("difficulty", item.getDifficulty());
            row.put("points", item.getPoints());
            row.put("templateFileUrl", item.getTemplateFileUrl());
            row.put("answerSheet", item.getAnswerSheet());
            row.put("answerRange", item.getAnswerRange());
            row.put("checkFormula", item.getCheckFormula());
            row.put("status", item.getStatus());
            row.put("reviewNote", item.getReviewNote());
            row.put("createTime", item.getCreateTime());
            row.put("reviewedTime", item.getReviewedTime());
            if (item.getQuestionCategoryId() != null) {
                QuestionCategory category = categoryMap.get(item.getQuestionCategoryId());
                row.put("questionCategoryId", item.getQuestionCategoryId());
                row.put("questionCategoryName", category == null ? null : category.getName());
            }
            if (item.getUserId() != null) {
                User author = userMap.get(item.getUserId());
                if (author != null) {
                    row.put("author", Map.of(
                            "id", author.getId(),
                            "username", author.getUsername(),
                            "avatar", author.getAvatar()
                    ));
                }
            }
            if (item.getReviewerId() != null) {
                User reviewer = userMap.get(item.getReviewerId());
                if (reviewer != null) {
                    row.put("reviewer", Map.of(
                            "id", reviewer.getId(),
                            "username", reviewer.getUsername()
                    ));
                }
            }
            return row;
        }).toList();

        return Map.of(
                "records", records,
                "total", result.getTotal()
        );
    }
}
