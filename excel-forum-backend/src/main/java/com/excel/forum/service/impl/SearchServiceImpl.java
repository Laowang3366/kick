package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.QuestionCategory;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.service.QuestionCategoryService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.SearchService;
import com.excel.forum.service.TutorialArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
public class SearchServiceImpl implements SearchService {
    private final TutorialArticleService tutorialArticleService;
    private final QuestionService questionService;
    private final QuestionCategoryService questionCategoryService;

    @Override
    public Map<String, Object> searchTutorials(String keyword, int limit) {
        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword.isEmpty()) {
            return Map.of("records", List.of());
        }
        List<Map<String, Object>> records = tutorialArticleService.list(new QueryWrapper<TutorialArticle>()
                        .eq("enabled", true)
                        .and(wrapper -> wrapper
                                .like("title", normalizedKeyword)
                                .or()
                                .like("summary", normalizedKeyword)
                                .or()
                                .like("content", normalizedKeyword)
                                .or()
                                .like("function_tags", normalizedKeyword))
                        .orderByDesc("home_featured")
                        .orderByAsc("sort_order")
                        .orderByAsc("id"))
                .stream()
                .limit(limit)
                .map(this::toTutorialResult)
                .collect(Collectors.toList());
        return Map.of("records", records);
    }

    @Override
    public Map<String, Object> searchQuestions(String keyword, int limit) {
        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword.isEmpty()) {
            return Map.of("records", List.of());
        }
        Map<Long, QuestionCategory> categoryMap = questionCategoryService.list().stream()
                .filter(category -> category.getId() != null)
                .collect(Collectors.toMap(QuestionCategory::getId, item -> item, (left, right) -> left));
        List<Map<String, Object>> records = questionService.list(new QueryWrapper<Question>()
                        .eq("enabled", true)
                        .eq("type", "excel_template")
                        .and(wrapper -> wrapper
                                .like("title", normalizedKeyword)
                                .or()
                                .like("explanation", normalizedKeyword))
                        .orderByAsc("difficulty")
                        .orderByAsc("id"))
                .stream()
                .limit(limit)
                .map(question -> {
                    QuestionCategory category = categoryMap.get(question.getQuestionCategoryId());
                    List<String> tags = new ArrayList<>();
                    if (category != null && category.getName() != null) {
                        tags.add(category.getName());
                    }
                    if (question.getDifficulty() != null) {
                        tags.add("难度 " + question.getDifficulty());
                    }
                    return buildSearchItem(
                            "question",
                            question.getId(),
                            defaultText(question.getTitle(), "练习题 " + question.getId()),
                            defaultText(question.getExplanation(), "进入练习题查看详情"),
                            tags,
                            "/practice/question/" + question.getId()
                    );
                })
                .collect(Collectors.toList());
        return Map.of("records", records);
    }

    @Override
    public Map<String, Object> searchFunctions(String keyword, int limit) {
        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword.isEmpty()) {
            return Map.of("records", List.of());
        }

        Map<String, List<TutorialArticle>> articlesByFunction = new LinkedHashMap<>();
        for (TutorialArticle article : tutorialArticleService.list(new QueryWrapper<TutorialArticle>()
                .eq("enabled", true)
                .orderByDesc("home_featured")
                .orderByAsc("sort_order")
                .orderByAsc("id"))) {
            for (String tag : splitTags(article.getFunctionTags())) {
                String normalizedTag = tag.toLowerCase();
                if (!normalizedTag.contains(normalizedKeyword)) {
                    continue;
                }
                articlesByFunction.computeIfAbsent(tag, key -> new ArrayList<>()).add(article);
            }
        }

        List<Map<String, Object>> records = articlesByFunction.entrySet().stream()
                .limit(limit)
                .map(entry -> {
                    TutorialArticle firstArticle = entry.getValue().get(0);
                    Set<String> tags = new LinkedHashSet<>();
                    tags.add("函数标签");
                    tags.addAll(splitTags(firstArticle.getFunctionTags()));
                    return buildSearchItem(
                            "function",
                            "fn:" + entry.getKey().toLowerCase(),
                            entry.getKey(),
                            "关联 " + entry.getValue().size() + " 篇教程",
                            new ArrayList<>(tags),
                            "/?article=" + firstArticle.getId()
                    );
                })
                .collect(Collectors.toList());
        return Map.of("records", records);
    }

    @Override
    public Map<String, Object> searchAll(String keyword, int limitPerType) {
        return Map.of(
                "tutorials", searchTutorials(keyword, limitPerType).get("records"),
                "questions", searchQuestions(keyword, limitPerType).get("records"),
                "functions", searchFunctions(keyword, limitPerType).get("records")
        );
    }

    private Map<String, Object> toTutorialResult(TutorialArticle article) {
        Map<String, Object> item = buildSearchItem(
                "tutorial",
                article.getId(),
                defaultText(article.getTitle(), "教程"),
                defaultText(article.getSummary(), "点击查看教程详情"),
                splitTags(article.getFunctionTags()),
                "/?article=" + article.getId()
        );
        item.put("categoryId", article.getCategoryId());
        return item;
    }

    private Map<String, Object> buildSearchItem(String type, Object id, String title, String summary, List<String> tags, String targetUrl) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("type", type);
        item.put("id", id);
        item.put("title", title);
        item.put("summary", summary);
        item.put("tags", tags == null ? List.of() : tags);
        item.put("targetUrl", targetUrl);
        return item;
    }

    private List<String> splitTags(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split("[,，\\s]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null ? "" : keyword.trim().toLowerCase();
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
