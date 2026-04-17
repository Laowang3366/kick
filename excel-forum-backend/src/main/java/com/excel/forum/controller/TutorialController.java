package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.PracticeChapter;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialArticleChapterRel;
import com.excel.forum.entity.TutorialArticleQuestionRel;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialArticleChapterRelService;
import com.excel.forum.service.TutorialArticleQuestionRelService;
import com.excel.forum.service.TutorialCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tutorials")
@RequiredArgsConstructor
public class TutorialController {
    private final TutorialCategoryService tutorialCategoryService;
    private final TutorialArticleService tutorialArticleService;
    private final TutorialArticleChapterRelService tutorialArticleChapterRelService;
    private final TutorialArticleQuestionRelService tutorialArticleQuestionRelService;
    private final PracticeChapterMapper practiceChapterMapper;
    private final QuestionService questionService;

    @GetMapping("/home")
    public ResponseEntity<?> getHomeTutorials() {
        List<TutorialCategory> categories = tutorialCategoryService.listWithArticleCount(true);
        Map<Long, List<TutorialArticle>> articlesByCategoryId = tutorialArticleService.groupByCategoryIds(
                categories.stream().map(TutorialCategory::getId).filter(Objects::nonNull).toList(),
                true
        );
        List<Long> articleIds = articlesByCategoryId.values().stream()
                .flatMap(List::stream)
                .map(TutorialArticle::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, List<TutorialArticleChapterRel>> chapterRelMap = tutorialArticleChapterRelService.listByArticleIds(articleIds).stream()
                .collect(Collectors.groupingBy(TutorialArticleChapterRel::getArticleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, List<TutorialArticleQuestionRel>> questionRelMap = tutorialArticleQuestionRelService.listByArticleIds(articleIds).stream()
                .collect(Collectors.groupingBy(TutorialArticleQuestionRel::getArticleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, PracticeChapter> chapterMap = practiceChapterMapper.selectList(new QueryWrapper<PracticeChapter>()
                        .eq("enabled", true)
                        .orderByAsc("sort_order")
                        .orderByAsc("id"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(PracticeChapter::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
        Map<Long, Question> questionMap = questionService.list(new QueryWrapper<Question>()
                        .eq("enabled", true)
                        .eq("type", "excel_template")
                        .orderByAsc("id"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(Question::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
        List<Map<String, Object>> records = categories.stream()
                .map(category -> {
                    List<Map<String, Object>> articles = articlesByCategoryId.getOrDefault(category.getId(), List.of()).stream()
                            .map(article -> toArticleMap(
                                    article,
                                    chapterRelMap.getOrDefault(article.getId(), List.of()),
                                    chapterMap,
                                    questionRelMap.getOrDefault(article.getId(), List.of()),
                                    questionMap
                            ))
                            .collect(Collectors.toList());
                    Map<String, Object> result = new HashMap<>();
                    result.put("id", category.getId());
                    result.put("name", category.getName());
                    result.put("description", category.getDescription() == null ? "" : category.getDescription());
                    result.put("sortOrder", category.getSortOrder() == null ? 0 : category.getSortOrder());
                    result.put("articleCount", articles.size());
                    result.put("articles", articles);
                    return result;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("categories", records));
    }

    private Map<String, Object> toArticleMap(
            TutorialArticle article,
            List<TutorialArticleChapterRel> chapterRelations,
            Map<Long, PracticeChapter> chapterMap,
            List<TutorialArticleQuestionRel> questionRelations,
            Map<Long, Question> questionMap
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", article.getId());
        result.put("categoryId", article.getCategoryId());
        result.put("title", article.getTitle());
        result.put("summary", article.getSummary() == null ? "" : article.getSummary());
        result.put("oneLineUsage", defaultText(article.getOneLineUsage(), article.getSummary()));
        result.put("content", article.getContent() == null ? "" : article.getContent());
        result.put("sortOrder", article.getSortOrder() == null ? 0 : article.getSortOrder());
        result.put("audienceTrack", defaultText(article.getAudienceTrack(), "general"));
        result.put("difficulty", defaultText(article.getDifficulty(), "basic"));
        result.put("recommendLevel", article.getRecommendLevel() == null ? 0 : article.getRecommendLevel());
        result.put("functionTags", splitTags(article.getFunctionTags()));
        result.put("starter", Boolean.TRUE.equals(article.getStarter()));
        result.put("homeFeatured", Boolean.TRUE.equals(article.getHomeFeatured()));
        result.put("relatedChapters", chapterRelations.stream()
                .map(relation -> {
                    PracticeChapter chapter = chapterMap.get(relation.getChapterId());
                    if (chapter == null) {
                        return null;
                    }
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", chapter.getId());
                    item.put("name", chapter.getName());
                    item.put("description", defaultText(chapter.getDescription(), ""));
                    return item;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        result.put("relatedQuestions", questionRelations.stream()
                .map(relation -> {
                    Question question = questionMap.get(relation.getQuestionId());
                    if (question == null) {
                        return null;
                    }
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", question.getId());
                    item.put("title", defaultText(question.getTitle(), "题目 " + question.getId()));
                    return item;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        return result;
    }

    private List<String> splitTags(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split("[,，\\s]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
