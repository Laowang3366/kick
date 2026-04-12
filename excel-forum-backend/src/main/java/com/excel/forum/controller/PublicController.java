package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.entity.ExperienceLevelRule;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.PracticeAnswer;
import com.excel.forum.entity.PracticeRecord;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.PracticeAnswerMapper;
import com.excel.forum.mapper.PracticeRecordMapper;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceLevelRuleService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final CategoryService categoryService;
    private final PostService postService;
    private final UserService userService;
    private final QuestionService questionService;
    private final PracticeRecordMapper practiceRecordMapper;
    private final PracticeAnswerMapper practiceAnswerMapper;
    private final ExperienceLevelRuleService experienceLevelRuleService;
    private final ExperienceProperties experienceProperties;

    @GetMapping
    public ResponseEntity<?> getPublicOverview() {
        return getHomeOverview();
    }

    @GetMapping("/home-overview")
    public ResponseEntity<?> getHomeOverview() {
        QueryWrapper<Post> postQuery = new QueryWrapper<>();
        postQuery.eq("status", 0);

        QueryWrapper<User> userQuery = new QueryWrapper<>();
        userQuery.eq("status", 0);

        QueryWrapper<User> onlineQuery = new QueryWrapper<>();
        onlineQuery.eq("is_online", true);
        onlineQuery.and(wrapper -> wrapper.eq("show_online_status", true).or().isNull("show_online_status"));

        QueryWrapper<User> topUserQuery = new QueryWrapper<>();
        topUserQuery.eq("status", 0)
                .select("id", "username", "avatar", "bio", "level", "points", "role")
                .orderByDesc("points")
                .last("LIMIT 5");

        QueryWrapper<Question> enabledQuestionQuery = new QueryWrapper<>();
        enabledQuestionQuery.eq("enabled", true).eq("type", "excel_template");

        QueryWrapper<PracticeAnswer> practiceAnswerQuery = new QueryWrapper<>();
        practiceAnswerQuery.select("id", "is_correct");

        QueryWrapper<PracticeRecord> recentPracticeQuery = new QueryWrapper<>();
        recentPracticeQuery.eq("status", "submitted")
                .ge("submit_time", LocalDateTime.now().minusMinutes(30))
                .select("user_id");

        long questionCount = questionService.count(enabledQuestionQuery);
        List<PracticeAnswer> practiceAnswers = practiceAnswerMapper.selectList(practiceAnswerQuery);
        int totalPracticeAnswers = practiceAnswers.size();
        long passedAnswerCount = practiceAnswers.stream().filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect())).count();
        int passRate = totalPracticeAnswers == 0 ? 0 : Math.round((passedAnswerCount * 100f) / totalPracticeAnswers);
        long activePracticeUserCount = practiceRecordMapper.selectList(recentPracticeQuery).stream()
                .map(PracticeRecord::getUserId)
                .filter(userId -> userId != null)
                .distinct()
                .count();

        List<User> topUsers = userService.list(topUserQuery);
        return ResponseEntity.ok(Map.of(
                "stats", Map.of(
                        "categoryCount", categoryService.count(),
                        "postCount", postService.count(postQuery),
                        "userCount", userService.count(userQuery),
                        "onlineCount", userService.count(onlineQuery)
                ),
                "practiceStats", Map.of(
                        "questionCount", questionCount,
                        "passRate", passRate,
                        "activeUserCount", activePracticeUserCount
                ),
                "topUsers", topUsers
        ));
    }

    @GetMapping("/level-rules")
    public ResponseEntity<?> getLevelRules() {
        List<Map<String, Object>> rules = new ArrayList<>();
        List<ExperienceLevelRule> configuredRules = experienceLevelRuleService.listEnabledRules();
        if (!configuredRules.isEmpty()) {
            configuredRules.stream()
                    .sorted(Comparator
                            .comparingInt((ExperienceLevelRule rule) -> safeInt(rule.getThreshold()))
                            .thenComparingInt(rule -> safeInt(rule.getLevel())))
                    .forEach(rule -> rules.add(buildLevelRuleItem(rule.getLevel(), rule.getName(), rule.getThreshold())));
        } else {
            experienceProperties.getLevels().stream()
                    .sorted(Comparator
                            .comparingInt((ExperienceProperties.LevelRule rule) -> safeInt(rule.getThreshold()))
                            .thenComparingInt(rule -> safeInt(rule.getLevel())))
                    .forEach(rule -> rules.add(buildLevelRuleItem(rule.getLevel(), rule.getName(), rule.getThreshold())));
        }
        return ResponseEntity.ok(Map.of("rules", rules));
    }

    private Map<String, Object> buildLevelRuleItem(Integer level, String name, Integer threshold) {
        Map<String, Object> item = new HashMap<>();
        item.put("level", safeInt(level));
        item.put("name", name == null || name.isBlank() ? "未命名等级" : name);
        item.put("threshold", safeInt(threshold));
        return item;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
