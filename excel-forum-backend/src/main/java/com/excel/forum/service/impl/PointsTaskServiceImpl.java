package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.PointsRecord;
import com.excel.forum.entity.PointsRule;
import com.excel.forum.service.PointsRecordService;
import com.excel.forum.service.PointsRuleService;
import com.excel.forum.service.PointsTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PointsTaskServiceImpl implements PointsTaskService {
    private final PointsRuleService pointsRuleService;
    private final PointsRecordService pointsRecordService;

    @Override
    @Transactional
    public Map<String, Object> awardTask(Long userId, String taskKey, Long bizId, String description) {
        return awardTaskInternal(userId, taskKey, bizId, description, null);
    }

    @Override
    @Transactional
    public Map<String, Object> awardTaskForDate(Long userId, String taskKey, Long bizId, String description, LocalDate taskDate) {
        return awardTaskInternal(userId, taskKey, bizId, description, taskDate);
    }

    private Map<String, Object> awardTaskInternal(Long userId, String taskKey, Long bizId, String description, LocalDate taskDateOverride) {
        if (userId == null || taskKey == null || taskKey.isBlank()) {
            return null;
        }

        PointsRule rule = pointsRuleService.getRuleByTaskKey(taskKey);
        if (rule == null || rule.getPoints() == null || rule.getPoints() <= 0) {
            return null;
        }

        LocalDate taskDate = "daily".equals(rule.getType())
                ? (taskDateOverride == null ? LocalDate.now() : taskDateOverride)
                : null;

        if (alreadyAwarded(userId, rule, taskKey, bizId, taskDate)) {
            return null;
        }
        String recordDescription = description == null || description.isBlank()
                ? (rule.getDescription() == null || rule.getDescription().isBlank() ? rule.getName() : rule.getDescription())
                : description;

        pointsRecordService.addTaskPointsRecord(
                userId,
                rule.getId(),
                rule.getName(),
                taskKey,
                bizId,
                taskDate,
                rule.getPoints(),
                recordDescription
        );

        Map<String, Object> reward = new HashMap<>();
        reward.put("ruleId", rule.getId());
        reward.put("taskKey", taskKey);
        reward.put("name", rule.getName());
        reward.put("points", rule.getPoints());
        reward.put("type", rule.getType());
        reward.put("description", recordDescription);
        return reward;
    }

    @Override
    public List<Map<String, Object>> getUserTasks(Long userId) {
        List<PointsRule> rules = pointsRuleService.getEnabledTaskRules();
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> tasks = new ArrayList<>();
        for (PointsRule rule : rules) {
            boolean completed = isCompleted(userId, rule, today);
            long completedCount = countCompleted(userId, rule);
            Map<String, Object> task = new HashMap<>();
            task.put("id", rule.getId());
            task.put("name", rule.getName());
            task.put("description", rule.getDescription());
            task.put("taskKey", rule.getTaskKey());
            task.put("points", rule.getPoints());
            task.put("type", rule.getType());
            task.put("sortOrder", rule.getSortOrder());
            task.put("completed", completed);
            task.put("completedCount", completedCount);
            task.put("actionText", resolveActionText(rule.getTaskKey()));
            task.put("actionPath", resolveActionPath(rule.getTaskKey()));
            task.put("statusText", resolveStatusText(rule, completed, completedCount));
            tasks.add(task);
        }
        return tasks;
    }

    private boolean alreadyAwarded(Long userId, PointsRule rule, String taskKey, Long bizId, LocalDate taskDate) {
        QueryWrapper<PointsRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("task_key", taskKey);
        if ("daily".equals(rule.getType())) {
            queryWrapper.eq("task_date", taskDate == null ? LocalDate.now() : taskDate);
            if (bizId != null) {
                queryWrapper.eq("biz_id", bizId);
            }
            return pointsRecordService.count(queryWrapper) > 0;
        }
        if ("once".equals(rule.getType())) {
            queryWrapper.isNull("task_date");
            return pointsRecordService.count(queryWrapper) > 0;
        }
        queryWrapper.isNull("task_date");
        if (bizId != null) {
            queryWrapper.eq("biz_id", bizId);
        }
        return pointsRecordService.count(queryWrapper) > 0;
    }

    private boolean isCompleted(Long userId, PointsRule rule, LocalDate today) {
        QueryWrapper<PointsRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("task_key", rule.getTaskKey());
        if ("daily".equals(rule.getType())) {
            queryWrapper.eq("task_date", today);
        }
        return pointsRecordService.count(queryWrapper) > 0;
    }

    private long countCompleted(Long userId, PointsRule rule) {
        QueryWrapper<PointsRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("task_key", rule.getTaskKey());
        return pointsRecordService.count(queryWrapper);
    }

    private String resolveActionText(String taskKey) {
        return switch (taskKey) {
            case TASK_DAILY_CHECKIN -> "去签到";
            case TASK_DAILY_POST, TASK_FIRST_POST -> "去发帖";
            case TASK_DAILY_REPLY, TASK_FIRST_REPLY -> "去互动";
            case TASK_DAILY_PRACTICE, TASK_FIRST_PRACTICE -> "去练习";
            default -> "去完成";
        };
    }

    private String resolveActionPath(String taskKey) {
        return switch (taskKey) {
            case TASK_DAILY_CHECKIN -> "/";
            case TASK_DAILY_POST, TASK_FIRST_POST -> "/create-post";
            case TASK_DAILY_REPLY, TASK_FIRST_REPLY -> "/";
            case TASK_DAILY_PRACTICE, TASK_FIRST_PRACTICE -> "/practice";
            default -> "/points-history";
        };
    }

    private String resolveStatusText(PointsRule rule, boolean completed, long completedCount) {
        if ("daily".equals(rule.getType())) {
            return completed ? "今日已完成" : "今日未完成";
        }
        return completed ? "已完成 " + completedCount + " 次" : "尚未完成";
    }
}
