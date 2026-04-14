package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.DailyChallenge;
import com.excel.forum.entity.PracticeAnswer;
import com.excel.forum.entity.PracticeChapter;
import com.excel.forum.entity.PracticeLevel;
import com.excel.forum.entity.PracticeRecord;
import com.excel.forum.entity.PracticeWorld;
import com.excel.forum.entity.Question;
import com.excel.forum.mapper.DailyChallengeMapper;
import com.excel.forum.mapper.PracticeAnswerMapper;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.mapper.PracticeLevelMapper;
import com.excel.forum.mapper.PracticeRecordMapper;
import com.excel.forum.mapper.PracticeWorldMapper;
import com.excel.forum.service.PracticeCampaignService;
import com.excel.forum.service.QuestionCategoryService;
import com.excel.forum.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PracticeCampaignServiceImpl implements PracticeCampaignService {
    private final PracticeWorldMapper practiceWorldMapper;
    private final PracticeChapterMapper practiceChapterMapper;
    private final PracticeLevelMapper practiceLevelMapper;
    private final DailyChallengeMapper dailyChallengeMapper;
    private final PracticeRecordMapper practiceRecordMapper;
    private final PracticeAnswerMapper practiceAnswerMapper;
    private final QuestionService questionService;
    private final QuestionCategoryService questionCategoryService;

    @Override
    public Map<String, Object> getCampaignOverview(Long userId) {
        List<PracticeChapter> chapters = listEnabledChapters();
        Map<Long, List<PracticeLevel>> levelsByChapterId = listEnabledLevelsByChapterId();
        Set<Long> passedQuestionIds = findPassedQuestionIds(userId);

        List<Map<String, Object>> chapterSummaries = buildChapterSummaries(chapters, levelsByChapterId, passedQuestionIds);
        Map<String, Object> currentChapter = chapterSummaries.stream()
                .filter(item -> Boolean.TRUE.equals(item.get("unlocked")))
                .findFirst()
                .orElse(chapterSummaries.stream().findFirst().orElse(null));

        Map<String, Object> currentLevel = null;
        if (currentChapter != null) {
            Long chapterId = toLong(currentChapter.get("id"));
            List<Map<String, Object>> levels = buildLevelNodes(
                    levelsByChapterId.getOrDefault(chapterId, List.of()),
                    passedQuestionIds,
                    Boolean.TRUE.equals(currentChapter.get("unlocked"))
            );
            currentLevel = levels.stream()
                    .filter(item -> "available".equals(item.get("status")))
                    .findFirst()
                    .orElse(levels.stream().findFirst().orElse(null));
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalStars", passedQuestionIds.size());
        summary.put("clearedLevels", passedQuestionIds.size());
        summary.put("perfectLevels", 0);
        summary.put("currentStreak", calculateCurrentStreak(chapters, levelsByChapterId, passedQuestionIds));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("world", buildWorldPayload());
        response.put("currentChapter", currentChapter);
        response.put("currentLevel", currentLevel);
        response.put("dailyChallenge", buildDailyChallengePayload());
        response.put("summary", summary);
        return response;
    }

    @Override
    public Map<String, Object> getCampaignChapters(Long userId) {
        List<PracticeChapter> chapters = listEnabledChapters();
        Map<Long, List<PracticeLevel>> levelsByChapterId = listEnabledLevelsByChapterId();
        Set<Long> passedQuestionIds = findPassedQuestionIds(userId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("world", buildWorldPayload());
        response.put("chapters", buildChapterSummaries(chapters, levelsByChapterId, passedQuestionIds));
        return response;
    }

    @Override
    public Map<String, Object> getCampaignChapterDetail(Long chapterId, Long userId) {
        PracticeChapter chapter = practiceChapterMapper.selectById(chapterId);
        if (chapter == null || !Boolean.TRUE.equals(chapter.getEnabled())) {
            throw new IllegalArgumentException("章节不存在");
        }

        List<PracticeChapter> allChapters = listEnabledChapters();
        Map<Long, List<PracticeLevel>> levelsByChapterId = listEnabledLevelsByChapterId();
        Set<Long> passedQuestionIds = findPassedQuestionIds(userId);
        Map<Long, Map<String, Object>> chapterSummaryMap = buildChapterSummaries(allChapters, levelsByChapterId, passedQuestionIds)
                .stream()
                .collect(Collectors.toMap(item -> toLong(item.get("id")), item -> item, (left, right) -> left, LinkedHashMap::new));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("chapter", chapterSummaryMap.get(chapterId));
        response.put("levels", buildLevelNodes(
                levelsByChapterId.getOrDefault(chapterId, List.of()),
                passedQuestionIds,
                Boolean.TRUE.equals(chapterSummaryMap.getOrDefault(chapterId, Map.of()).get("unlocked"))
        ));
        return response;
    }

    @Override
    public Map<String, Object> getCampaignLevelDetail(Long levelId, Long userId) {
        PracticeLevel level = practiceLevelMapper.selectById(levelId);
        if (level == null || !Boolean.TRUE.equals(level.getEnabled())) {
            throw new IllegalArgumentException("关卡不存在");
        }

        PracticeChapter chapter = practiceChapterMapper.selectById(level.getChapterId());
        Question question = questionService.getById(level.getQuestionId());
        Set<Long> passedQuestionIds = findPassedQuestionIds(userId);
        List<PracticeChapter> allChapters = listEnabledChapters();
        Map<Long, List<PracticeLevel>> levelsByChapterId = listEnabledLevelsByChapterId();
        Map<Long, Map<String, Object>> chapterSummaryMap = buildChapterSummaries(allChapters, levelsByChapterId, passedQuestionIds)
                .stream()
                .collect(Collectors.toMap(item -> toLong(item.get("id")), item -> item, (left, right) -> left, LinkedHashMap::new));
        boolean chapterUnlocked = Boolean.TRUE.equals(chapterSummaryMap.getOrDefault(level.getChapterId(), Map.of()).get("unlocked"));
        Map<String, Object> levelNode = buildLevelNodes(levelsByChapterId.getOrDefault(level.getChapterId(), List.of()), passedQuestionIds, chapterUnlocked)
                .stream()
                .filter(item -> levelId.equals(toLong(item.get("id"))))
                .findFirst()
                .orElse(Map.of());

        Map<String, Object> questionPayload = new LinkedHashMap<>();
        if (question != null) {
            questionPayload.put("id", question.getId());
            questionPayload.put("title", question.getTitle());
            questionPayload.put("difficulty", question.getDifficulty());
            questionPayload.put("points", question.getPoints());
            questionPayload.put("questionCategoryId", question.getQuestionCategoryId());
            questionPayload.put("questionCategoryName", resolveQuestionCategoryName(question.getQuestionCategoryId()));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("chapter", chapterSummaryMap.get(level.getChapterId()));
        response.put("level", levelNode);
        response.put("question", questionPayload);
        return response;
    }

    private Map<String, Object> buildWorldPayload() {
        QueryWrapper<PracticeWorld> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true).orderByAsc("sort_order").orderByAsc("id");
        PracticeWorld world = practiceWorldMapper.selectOne(queryWrapper);
        if (world == null) {
            return Map.of("id", 1, "name", "Excel 闯关", "description", "从基础到进阶，逐步攻克 Excel 关卡试炼");
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", world.getId());
        payload.put("name", world.getName());
        payload.put("description", world.getDescription());
        return payload;
    }

    private List<PracticeChapter> listEnabledChapters() {
        QueryWrapper<PracticeChapter> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true).orderByAsc("sort_order").orderByAsc("id");
        return practiceChapterMapper.selectList(queryWrapper);
    }

    private Map<Long, List<PracticeLevel>> listEnabledLevelsByChapterId() {
        QueryWrapper<PracticeLevel> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("enabled", true).orderByAsc("sort_order").orderByAsc("id");
        return practiceLevelMapper.selectList(queryWrapper).stream()
                .collect(Collectors.groupingBy(PracticeLevel::getChapterId, LinkedHashMap::new, Collectors.toCollection(ArrayList::new)));
    }

    private List<Map<String, Object>> buildChapterSummaries(
            List<PracticeChapter> chapters,
            Map<Long, List<PracticeLevel>> levelsByChapterId,
            Set<Long> passedQuestionIds) {
        List<Map<String, Object>> result = new ArrayList<>();
        boolean unlockNextChapter = true;

        for (PracticeChapter chapter : chapters) {
            List<PracticeLevel> levels = levelsByChapterId.getOrDefault(chapter.getId(), List.of());
            int totalLevels = levels.size();
            int clearedLevels = (int) levels.stream().filter(item -> passedQuestionIds.contains(item.getQuestionId())).count();
            int totalStars = clearedLevels;
            boolean completed = totalLevels > 0 && clearedLevels >= totalLevels;
            boolean unlocked = unlockNextChapter;
            unlockNextChapter = completed;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", chapter.getId());
            item.put("worldId", chapter.getWorldId());
            item.put("name", chapter.getName());
            item.put("description", chapter.getDescription());
            item.put("unlockStar", chapter.getUnlockStar());
            item.put("requiredLevel", chapter.getRequiredLevel());
            item.put("unlocked", unlocked);
            item.put("completed", completed);
            item.put("totalLevels", totalLevels);
            item.put("clearedLevels", clearedLevels);
            item.put("totalStars", totalStars);
            item.put("maxStars", totalLevels * 3);
            item.put("progress", totalLevels == 0 ? 0 : Math.round((clearedLevels * 100f) / totalLevels));
            result.add(item);
        }

        return result;
    }

    private List<Map<String, Object>> buildLevelNodes(List<PracticeLevel> levels, Set<Long> passedQuestionIds, boolean chapterUnlocked) {
        List<Map<String, Object>> result = new ArrayList<>();
        boolean unlockNextLevel = chapterUnlocked;

        for (PracticeLevel level : levels) {
            boolean cleared = passedQuestionIds.contains(level.getQuestionId());
            String status;
            if (cleared) {
                status = "cleared";
                unlockNextLevel = true;
            } else if (unlockNextLevel) {
                status = "available";
                unlockNextLevel = false;
            } else {
                status = "locked";
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", level.getId());
            item.put("chapterId", level.getChapterId());
            item.put("questionId", level.getQuestionId());
            item.put("title", level.getTitle());
            item.put("levelType", level.getLevelType());
            item.put("difficulty", level.getDifficulty());
            item.put("status", status);
            item.put("stars", cleared ? 1 : 0);
            item.put("targetTimeSeconds", level.getTargetTimeSeconds());
            item.put("rewardExp", level.getRewardExp());
            item.put("rewardPoints", level.getRewardPoints());
            item.put("firstPassBonus", level.getFirstPassBonus());
            item.put("sortOrder", level.getSortOrder());
            result.add(item);
        }

        return result;
    }

    private Map<String, Object> buildDailyChallengePayload() {
        QueryWrapper<DailyChallenge> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("challenge_date", LocalDate.now()).eq("enabled", true).last("limit 1");
        DailyChallenge challenge = dailyChallengeMapper.selectOne(queryWrapper);
        if (challenge == null) {
            return null;
        }
        PracticeLevel level = practiceLevelMapper.selectById(challenge.getLevelId());
        if (level == null) {
            return null;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", challenge.getId());
        payload.put("levelId", level.getId());
        payload.put("title", level.getTitle());
        payload.put("rewardExp", challenge.getRewardExp());
        payload.put("rewardPoints", challenge.getRewardPoints());
        return payload;
    }

    private int calculateCurrentStreak(
            List<PracticeChapter> chapters,
            Map<Long, List<PracticeLevel>> levelsByChapterId,
            Set<Long> passedQuestionIds) {
        int streak = 0;
        for (PracticeChapter chapter : chapters) {
            for (PracticeLevel level : levelsByChapterId.getOrDefault(chapter.getId(), List.of())) {
                if (passedQuestionIds.contains(level.getQuestionId())) {
                    streak += 1;
                } else {
                    return streak;
                }
            }
        }
        return streak;
    }

    private Set<Long> findPassedQuestionIds(Long userId) {
        if (userId == null) {
            return Set.of();
        }
        QueryWrapper<PracticeRecord> recordQuery = new QueryWrapper<>();
        recordQuery.eq("user_id", userId).eq("status", "submitted").select("id");
        List<Long> recordIds = practiceRecordMapper.selectList(recordQuery).stream()
                .map(PracticeRecord::getId)
                .filter(Objects::nonNull)
                .toList();
        if (recordIds.isEmpty()) {
            return Set.of();
        }
        QueryWrapper<PracticeAnswer> answerQuery = new QueryWrapper<>();
        answerQuery.in("record_id", recordIds).eq("is_correct", true).select("question_id");
        return practiceAnswerMapper.selectList(answerQuery).stream()
                .map(PracticeAnswer::getQuestionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String resolveQuestionCategoryName(Long questionCategoryId) {
        if (questionCategoryId == null) {
            return "未分类挑战";
        }
        var category = questionCategoryService.getById(questionCategoryId);
        return category == null ? "未分类挑战" : category.getName();
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }
}
