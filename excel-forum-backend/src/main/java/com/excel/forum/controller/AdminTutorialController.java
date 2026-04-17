package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.PracticeChapter;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialArticleChapterRel;
import com.excel.forum.entity.TutorialArticleQuestionRel;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.entity.dto.AdminTutorialArticleRequest;
import com.excel.forum.entity.dto.AdminTutorialCategoryRequest;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialArticleChapterRelService;
import com.excel.forum.service.TutorialArticleQuestionRelService;
import com.excel.forum.service.TutorialCategoryService;
import com.excel.forum.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/tutorials")
@RequiredArgsConstructor
public class AdminTutorialController {
    private final TutorialCategoryService tutorialCategoryService;
    private final TutorialArticleService tutorialArticleService;
    private final TutorialArticleChapterRelService tutorialArticleChapterRelService;
    private final TutorialArticleQuestionRelService tutorialArticleQuestionRelService;
    private final PracticeChapterMapper practiceChapterMapper;
    private final QuestionService questionService;
    private final HtmlSanitizer htmlSanitizer;

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(tutorialCategoryService.listWithArticleCount(false));
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestBody AdminTutorialCategoryRequest request) {
        String name = normalizeText(request.getName());
        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "分类名称不能为空"));
        }
        TutorialCategory category = new TutorialCategory();
        applyCategory(category, request);
        tutorialCategoryService.save(category);
        category.setArticleCount(0L);
        return ResponseEntity.ok(category);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody AdminTutorialCategoryRequest request) {
        TutorialCategory category = tutorialCategoryService.getById(id);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        String name = normalizeText(request.getName());
        if (name == null || name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "分类名称不能为空"));
        }
        applyCategory(category, request);
        tutorialCategoryService.updateById(category);
        category.setArticleCount(tutorialCategoryService.countArticles(category.getId()));
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/categories/{id}")
    @Transactional
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        TutorialCategory category = tutorialCategoryService.getById(id);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        tutorialArticleService.remove(new QueryWrapper<TutorialArticle>().eq("category_id", id));
        tutorialCategoryService.removeById(id);
        return ResponseEntity.ok(Map.of("message", "分类已删除"));
    }

    @GetMapping("/articles")
    public ResponseEntity<?> getArticles(@RequestParam(required = false) Long categoryId) {
        QueryWrapper<TutorialArticle> queryWrapper = new QueryWrapper<>();
        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        List<TutorialArticle> records = tutorialArticleService.list(queryWrapper);
        Map<Long, String> categoryNameMap = tutorialCategoryService.list().stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(TutorialCategory::getId, TutorialCategory::getName, (left, right) -> left));
        Map<Long, List<TutorialArticleChapterRel>> chapterRelMap = tutorialArticleChapterRelService.listByArticleIds(records.stream()
                        .map(TutorialArticle::getId)
                        .filter(Objects::nonNull)
                        .toList())
                .stream()
                .collect(Collectors.groupingBy(TutorialArticleChapterRel::getArticleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, String> chapterNameMap = practiceChapterMapper.selectList(new QueryWrapper<PracticeChapter>()
                        .select("id", "name")
                        .orderByAsc("sort_order").orderByAsc("id"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(PracticeChapter::getId, PracticeChapter::getName, (left, right) -> left, LinkedHashMap::new));
        Map<Long, List<TutorialArticleQuestionRel>> questionRelMap = tutorialArticleQuestionRelService.listByArticleIds(records.stream()
                        .map(TutorialArticle::getId)
                        .filter(Objects::nonNull)
                        .toList())
                .stream()
                .collect(Collectors.groupingBy(TutorialArticleQuestionRel::getArticleId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, Question> questionMap = questionService.list(new QueryWrapper<Question>()
                        .select("id", "title", "question_category_id")
                        .orderByDesc("id"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(Question::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
        List<Map<String, Object>> response = records.stream()
                .map(item -> toAdminArticleMap(
                        item,
                        categoryNameMap.get(item.getCategoryId()),
                        chapterRelMap.getOrDefault(item.getId(), List.of()),
                        chapterNameMap,
                        questionRelMap.getOrDefault(item.getId(), List.of()),
                        questionMap
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("records", response));
    }

    @GetMapping("/link-options")
    public ResponseEntity<?> getLinkOptions() {
        List<Map<String, Object>> chapters = practiceChapterMapper.selectList(new QueryWrapper<PracticeChapter>()
                        .eq("enabled", true)
                        .orderByAsc("sort_order")
                        .orderByAsc("id"))
                .stream()
                .map(item -> Map.<String, Object>of(
                        "id", item.getId(),
                        "name", item.getName(),
                        "description", defaultText(item.getDescription(), "")
                ))
                .collect(Collectors.toList());
        List<Map<String, Object>> questions = questionService.list(new QueryWrapper<Question>()
                        .eq("enabled", true)
                        .eq("type", "excel_template")
                        .orderByDesc("id"))
                .stream()
                .map(item -> Map.<String, Object>of(
                        "id", item.getId(),
                        "title", defaultText(item.getTitle(), "题目 " + item.getId()),
                        "questionCategoryId", item.getQuestionCategoryId() == null ? 0L : item.getQuestionCategoryId()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
                "chapters", chapters,
                "questions", questions
        ));
    }

    @PostMapping("/articles")
    public ResponseEntity<?> createArticle(@RequestBody AdminTutorialArticleRequest request) {
        TutorialCategory category = tutorialCategoryService.getById(request.getCategoryId());
        if (category == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "请选择有效的分类"));
        }
        String title = normalizeText(request.getTitle());
        if (title == null || title.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "条目标题不能为空"));
        }
        TutorialArticle article = new TutorialArticle();
        applyArticle(article, request);
        tutorialArticleService.save(article);
        syncArticleRelations(article.getId(), request);
        return ResponseEntity.ok(loadArticleResponse(article.getId(), category.getName()));
    }

    @PutMapping("/articles/{id}")
    public ResponseEntity<?> updateArticle(@PathVariable Long id, @RequestBody AdminTutorialArticleRequest request) {
        TutorialArticle article = tutorialArticleService.getById(id);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
        TutorialCategory category = tutorialCategoryService.getById(request.getCategoryId());
        if (category == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "请选择有效的分类"));
        }
        String title = normalizeText(request.getTitle());
        if (title == null || title.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "条目标题不能为空"));
        }
        applyArticle(article, request);
        tutorialArticleService.updateById(article);
        syncArticleRelations(article.getId(), request);
        return ResponseEntity.ok(loadArticleResponse(article.getId(), category.getName()));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id) {
        TutorialArticle article = tutorialArticleService.getById(id);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
        tutorialArticleChapterRelService.remove(new QueryWrapper<TutorialArticleChapterRel>().eq("article_id", id));
        tutorialArticleQuestionRelService.remove(new QueryWrapper<TutorialArticleQuestionRel>().eq("article_id", id));
        tutorialArticleService.removeById(id);
        return ResponseEntity.ok(Map.of("message", "条目已删除"));
    }

    private void applyCategory(TutorialCategory category, AdminTutorialCategoryRequest request) {
        category.setName(normalizeText(request.getName()));
        category.setDescription(normalizeText(request.getDescription()));
        category.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        category.setEnabled(request.getEnabled() == null || Boolean.TRUE.equals(request.getEnabled()));
    }

    private void applyArticle(TutorialArticle article, AdminTutorialArticleRequest request) {
        article.setCategoryId(request.getCategoryId());
        article.setTitle(normalizeText(request.getTitle()));
        article.setSummary(normalizeText(request.getSummary()));
        article.setOneLineUsage(normalizeText(request.getOneLineUsage()));
        article.setContent(htmlSanitizer.sanitize(Objects.toString(request.getContent(), "")));
        article.setAudienceTrack(defaultText(normalizeText(request.getAudienceTrack()), "general"));
        article.setDifficulty(defaultText(normalizeText(request.getDifficulty()), "basic"));
        article.setRecommendLevel(request.getRecommendLevel() == null ? 0 : request.getRecommendLevel());
        article.setFunctionTags(normalizeTags(request.getFunctionTags()));
        article.setStarter(Boolean.TRUE.equals(request.getStarter()));
        article.setHomeFeatured(Boolean.TRUE.equals(request.getHomeFeatured()));
        article.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        article.setEnabled(request.getEnabled() == null || Boolean.TRUE.equals(request.getEnabled()));
    }

    private Map<String, Object> toAdminArticleMap(
            TutorialArticle article,
            String categoryName,
            List<TutorialArticleChapterRel> chapterRelations,
            Map<Long, String> chapterNameMap,
            List<TutorialArticleQuestionRel> questionRelations,
            Map<Long, Question> questionMap
    ) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", article.getId());
        result.put("categoryId", article.getCategoryId());
        result.put("categoryName", categoryName == null ? "" : categoryName);
        result.put("title", article.getTitle());
        result.put("summary", article.getSummary() == null ? "" : article.getSummary());
        result.put("oneLineUsage", defaultText(article.getOneLineUsage(), ""));
        result.put("content", article.getContent() == null ? "" : article.getContent());
        result.put("audienceTrack", defaultText(article.getAudienceTrack(), "general"));
        result.put("difficulty", defaultText(article.getDifficulty(), "basic"));
        result.put("recommendLevel", article.getRecommendLevel() == null ? 0 : article.getRecommendLevel());
        result.put("functionTags", defaultText(article.getFunctionTags(), ""));
        result.put("starter", Boolean.TRUE.equals(article.getStarter()));
        result.put("homeFeatured", Boolean.TRUE.equals(article.getHomeFeatured()));
        result.put("sortOrder", article.getSortOrder() == null ? 0 : article.getSortOrder());
        result.put("enabled", Boolean.TRUE.equals(article.getEnabled()));
        result.put("relatedChapterIds", chapterRelations.stream()
                .map(TutorialArticleChapterRel::getChapterId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        result.put("relatedQuestionIds", questionRelations.stream()
                .map(TutorialArticleQuestionRel::getQuestionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList()));
        result.put("relatedChapters", chapterRelations.stream()
                .map(rel -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rel.getChapterId());
                    item.put("name", defaultText(chapterNameMap.get(rel.getChapterId()), "章节 " + rel.getChapterId()));
                    return item;
                })
                .collect(Collectors.toList()));
        result.put("relatedQuestions", questionRelations.stream()
                .map(rel -> {
                    Question question = questionMap.get(rel.getQuestionId());
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rel.getQuestionId());
                    item.put("title", question == null ? "题目 " + rel.getQuestionId() : defaultText(question.getTitle(), "题目 " + rel.getQuestionId()));
                    return item;
                })
                .collect(Collectors.toList()));
        return result;
    }

    private Map<String, Object> loadArticleResponse(Long articleId, String categoryName) {
        TutorialArticle article = tutorialArticleService.getById(articleId);
        if (article == null) {
            return Map.of();
        }
        List<TutorialArticleChapterRel> chapterRelations = tutorialArticleChapterRelService.list(new QueryWrapper<TutorialArticleChapterRel>()
                .eq("article_id", articleId)
                .orderByAsc("sort_order")
                .orderByAsc("id"));
        List<TutorialArticleQuestionRel> questionRelations = tutorialArticleQuestionRelService.list(new QueryWrapper<TutorialArticleQuestionRel>()
                .eq("article_id", articleId)
                .orderByAsc("sort_order")
                .orderByAsc("id"));
        Map<Long, String> chapterNameMap = practiceChapterMapper.selectList(new QueryWrapper<PracticeChapter>()
                        .select("id", "name"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(PracticeChapter::getId, PracticeChapter::getName, (left, right) -> left, LinkedHashMap::new));
        Map<Long, Question> questionMap = questionService.list(new QueryWrapper<Question>()
                        .select("id", "title"))
                .stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(Question::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
        return toAdminArticleMap(article, categoryName, chapterRelations, chapterNameMap, questionRelations, questionMap);
    }

    private void syncArticleRelations(Long articleId, AdminTutorialArticleRequest request) {
        tutorialArticleChapterRelService.remove(new QueryWrapper<TutorialArticleChapterRel>().eq("article_id", articleId));
        tutorialArticleQuestionRelService.remove(new QueryWrapper<TutorialArticleQuestionRel>().eq("article_id", articleId));

        List<Long> chapterIds = sanitizeIds(request.getRelatedChapterIds());
        if (!chapterIds.isEmpty()) {
            List<TutorialArticleChapterRel> chapterRelations = new ArrayList<>();
            for (int index = 0; index < chapterIds.size(); index++) {
                TutorialArticleChapterRel relation = new TutorialArticleChapterRel();
                relation.setArticleId(articleId);
                relation.setChapterId(chapterIds.get(index));
                relation.setSortOrder(index);
                chapterRelations.add(relation);
            }
            tutorialArticleChapterRelService.saveBatch(chapterRelations);
        }

        List<Long> questionIds = sanitizeIds(request.getRelatedQuestionIds());
        if (!questionIds.isEmpty()) {
            List<TutorialArticleQuestionRel> questionRelations = new ArrayList<>();
            for (int index = 0; index < questionIds.size(); index++) {
                TutorialArticleQuestionRel relation = new TutorialArticleQuestionRel();
                relation.setArticleId(articleId);
                relation.setQuestionId(questionIds.get(index));
                relation.setSortOrder(index);
                questionRelations.add(relation);
            }
            tutorialArticleQuestionRelService.saveBatch(questionRelations);
        }
    }

    private List<Long> sanitizeIds(List<Long> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Set<Long> uniqueIds = new LinkedHashSet<>();
        for (Long value : values) {
            if (value != null && value > 0) {
                uniqueIds.add(value);
            }
        }
        return new ArrayList<>(uniqueIds);
    }

    private String normalizeTags(String value) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            return null;
        }
        return List.of(normalized.split("[,，\\s]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .distinct()
                .collect(Collectors.joining(", "));
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
