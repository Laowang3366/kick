package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.PracticeChapter;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialArticleChapterRel;
import com.excel.forum.entity.UserLearningProfile;
import com.excel.forum.entity.UserOnboardingAnswer;
import com.excel.forum.entity.dto.OnboardingQuickAssessmentRequest;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.mapper.UserLearningProfileMapper;
import com.excel.forum.mapper.UserOnboardingAnswerMapper;
import com.excel.forum.service.OnboardingService;
import com.excel.forum.service.TutorialArticleChapterRelService;
import com.excel.forum.service.TutorialArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OnboardingServiceImpl implements OnboardingService {
    private final UserLearningProfileMapper userLearningProfileMapper;
    private final UserOnboardingAnswerMapper userOnboardingAnswerMapper;
    private final TutorialArticleService tutorialArticleService;
    private final TutorialArticleChapterRelService tutorialArticleChapterRelService;
    private final PracticeChapterMapper practiceChapterMapper;

    @Override
    public Map<String, Object> submitQuickAssessment(Long userId, OnboardingQuickAssessmentRequest request) {
        if (userId == null) {
            throw new IllegalArgumentException("未登录");
        }
        if (request == null || request.getAnswers() == null || request.getAnswers().isEmpty()) {
            throw new IllegalArgumentException("请先完成首登问卷");
        }
        String selfAssessmentLevel = request.getAnswers().stream()
                .filter(Objects::nonNull)
                .map(OnboardingQuickAssessmentRequest.AnswerItem::getAnswerValue)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("beginner");
        String track = normalizeTrack(selfAssessmentLevel);

        userOnboardingAnswerMapper.delete(new QueryWrapper<UserOnboardingAnswer>().eq("user_id", userId));
        for (OnboardingQuickAssessmentRequest.AnswerItem answer : request.getAnswers()) {
            if (answer == null || isBlank(answer.getQuestionCode()) || isBlank(answer.getAnswerValue())) {
                continue;
            }
            UserOnboardingAnswer entity = new UserOnboardingAnswer();
            entity.setUserId(userId);
            entity.setQuestionCode(answer.getQuestionCode().trim());
            entity.setAnswerValue(answer.getAnswerValue().trim());
            userOnboardingAnswerMapper.insert(entity);
        }

        return upsertProfileAndBuildResponse(userId, track, selfAssessmentLevel, true);
    }

    @Override
    public Map<String, Object> getRecommendation(Long userId) {
        if (userId == null) {
            return Map.of("needsAssessment", false);
        }
        UserLearningProfile profile = findProfile(userId);
        if (profile == null) {
            return Map.of(
                    "needsAssessment", true,
                    "track", "beginner",
                    "headline", "先选你的学习起点",
                    "description", "完成 1 次轻量问卷后，首页会优先推荐适合你的教程与练习。"
            );
        }
        return buildRecommendationResponse(profile, false);
    }

    @Override
    public Map<String, Object> updateLearningTrack(Long userId, String track) {
        if (userId == null) {
            throw new IllegalArgumentException("未登录");
        }
        return upsertProfileAndBuildResponse(userId, normalizeTrack(track), track, false);
    }

    @Override
    public String resolveTrack(Long userId, String preferredTrack) {
        if (!isBlank(preferredTrack)) {
            return normalizeTrack(preferredTrack);
        }
        if (userId == null) {
            return null;
        }
        UserLearningProfile profile = findProfile(userId);
        return profile == null ? null : normalizeTrack(profile.getCurrentTrack());
    }

    private Map<String, Object> upsertProfileAndBuildResponse(Long userId, String track, String selfAssessmentLevel, boolean fromAssessment) {
        TutorialArticle article = pickRecommendedArticle(track);
        PracticeChapter chapter = pickRecommendedChapter(article, track);

        UserLearningProfile profile = findProfile(userId);
        if (profile == null) {
            profile = new UserLearningProfile();
            profile.setUserId(userId);
        }
        profile.setCurrentTrack(track);
        profile.setSelfAssessmentLevel(isBlank(selfAssessmentLevel) ? track : selfAssessmentLevel);
        profile.setRecommendedArticleId(article == null ? null : article.getId());
        profile.setRecommendedChapterId(chapter == null ? null : chapter.getId());
        if (profile.getId() == null) {
            userLearningProfileMapper.insert(profile);
        } else {
            userLearningProfileMapper.updateById(profile);
        }

        Map<String, Object> response = buildRecommendationResponse(profile, false);
        response = new LinkedHashMap<>(response);
        response.put("message", fromAssessment ? "分流结果已保存" : "学习轨道已更新");
        return response;
    }

    private Map<String, Object> buildRecommendationResponse(UserLearningProfile profile, boolean needsAssessment) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("needsAssessment", needsAssessment);
        response.put("track", normalizeTrack(profile == null ? null : profile.getCurrentTrack()));
        response.put("headline", "本周学习主线已就位");
        response.put("description", "首页会优先展示更适合你当前阶段的教程与练习。");

        TutorialArticle article = profile == null || profile.getRecommendedArticleId() == null
                ? null
                : tutorialArticleService.getById(profile.getRecommendedArticleId());
        PracticeChapter chapter = profile == null || profile.getRecommendedChapterId() == null
                ? null
                : practiceChapterMapper.selectById(profile.getRecommendedChapterId());
        response.put("recommendedArticle", article == null ? null : Map.of(
                "id", article.getId(),
                "title", defaultText(article.getTitle(), "推荐教程"),
                "summary", defaultText(article.getSummary(), "")
        ));
        response.put("recommendedChapter", chapter == null ? null : Map.of(
                "id", chapter.getId(),
                "name", defaultText(chapter.getName(), "推荐章节"),
                "description", defaultText(chapter.getDescription(), "")
        ));
        return response;
    }

    private UserLearningProfile findProfile(Long userId) {
        return userLearningProfileMapper.selectOne(new QueryWrapper<UserLearningProfile>()
                .eq("user_id", userId)
                .last("limit 1"));
    }

    private TutorialArticle pickRecommendedArticle(String track) {
        List<TutorialArticle> articles = tutorialArticleService.list(new QueryWrapper<TutorialArticle>()
                .eq("enabled", true)
                .orderByDesc("starter")
                .orderByDesc("home_featured")
                .orderByAsc("recommend_level")
                .orderByAsc("sort_order")
                .orderByAsc("id"));
        return articles.stream()
                .filter(article -> matchesTrack(article.getAudienceTrack(), track))
                .min(Comparator
                        .comparing((TutorialArticle article) -> !Boolean.TRUE.equals(article.getStarter()))
                        .thenComparing(article -> !Boolean.TRUE.equals(article.getHomeFeatured()))
                        .thenComparing(article -> article.getRecommendLevel() == null ? Integer.MAX_VALUE : article.getRecommendLevel())
                        .thenComparing(article -> article.getSortOrder() == null ? Integer.MAX_VALUE : article.getSortOrder())
                        .thenComparing(article -> article.getId() == null ? Long.MAX_VALUE : article.getId()))
                .orElseGet(() -> articles.stream().findFirst().orElse(null));
    }

    private PracticeChapter pickRecommendedChapter(TutorialArticle article, String track) {
        if (article != null && article.getId() != null) {
            List<TutorialArticleChapterRel> relations = tutorialArticleChapterRelService.listByArticleIds(List.of(article.getId()));
            if (!relations.isEmpty()) {
                PracticeChapter chapter = practiceChapterMapper.selectById(relations.get(0).getChapterId());
                if (chapter != null && Boolean.TRUE.equals(chapter.getEnabled())) {
                    return chapter;
                }
            }
        }

        List<PracticeChapter> chapters = practiceChapterMapper.selectList(new QueryWrapper<PracticeChapter>()
                .eq("enabled", true)
                .orderByAsc("sort_order")
                .orderByAsc("id"));
        if (chapters.isEmpty()) {
            return null;
        }
        if ("intermediate".equals(track) && chapters.size() > 1) {
            return chapters.get(Math.min(1, chapters.size() - 1));
        }
        return chapters.get(0);
    }

    private boolean matchesTrack(String articleTrack, String track) {
        String normalizedArticleTrack = articleTrack == null ? "general" : articleTrack.trim().toLowerCase();
        if ("beginner".equals(track)) {
            return "beginner".equals(normalizedArticleTrack) || "general".equals(normalizedArticleTrack);
        }
        if ("intermediate".equals(track)) {
            return "advanced".equals(normalizedArticleTrack) || "general".equals(normalizedArticleTrack);
        }
        return true;
    }

    private String normalizeTrack(String value) {
        if (isBlank(value)) {
            return "beginner";
        }
        String normalized = value.trim().toLowerCase();
        if (normalized.contains("zero") || normalized.contains("beginner") || normalized.contains("基础") || normalized.contains("入门")) {
            return "beginner";
        }
        return "intermediate";
    }

    private String defaultText(String value, String fallback) {
        return isBlank(value) ? fallback : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
