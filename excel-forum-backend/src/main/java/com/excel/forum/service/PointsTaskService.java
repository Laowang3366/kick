package com.excel.forum.service;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;

public interface PointsTaskService {
    String TASK_DAILY_CHECKIN = "daily_checkin";
    String TASK_DAILY_POST = "daily_post";
    String TASK_DAILY_REPLY = "daily_reply";
    String TASK_FIRST_POST = "first_post";
    String TASK_FIRST_REPLY = "first_reply";
    String TASK_DAILY_PRACTICE = "daily_practice";
    String TASK_FIRST_PRACTICE = "first_practice";

    Map<String, Object> awardTask(Long userId, String taskKey, Long bizId, String description);

    Map<String, Object> awardTaskForDate(Long userId, String taskKey, Long bizId, String description, LocalDate taskDate);

    List<Map<String, Object>> getUserTasks(Long userId);
}
