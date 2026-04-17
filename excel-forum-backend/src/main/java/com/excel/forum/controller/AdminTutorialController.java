package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.entity.dto.AdminTutorialArticleRequest;
import com.excel.forum.entity.dto.AdminTutorialCategoryRequest;
import com.excel.forum.service.TutorialArticleService;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/tutorials")
@RequiredArgsConstructor
public class AdminTutorialController {
    private final TutorialCategoryService tutorialCategoryService;
    private final TutorialArticleService tutorialArticleService;
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
        List<Map<String, Object>> response = records.stream()
                .map(item -> toAdminArticleMap(item, categoryNameMap.get(item.getCategoryId())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("records", response));
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
        return ResponseEntity.ok(toAdminArticleMap(article, category.getName()));
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
        return ResponseEntity.ok(toAdminArticleMap(article, category.getName()));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id) {
        TutorialArticle article = tutorialArticleService.getById(id);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
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
        article.setContent(htmlSanitizer.sanitize(Objects.toString(request.getContent(), "")));
        article.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        article.setEnabled(request.getEnabled() == null || Boolean.TRUE.equals(request.getEnabled()));
    }

    private Map<String, Object> toAdminArticleMap(TutorialArticle article, String categoryName) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", article.getId());
        result.put("categoryId", article.getCategoryId());
        result.put("categoryName", categoryName == null ? "" : categoryName);
        result.put("title", article.getTitle());
        result.put("summary", article.getSummary() == null ? "" : article.getSummary());
        result.put("content", article.getContent() == null ? "" : article.getContent());
        result.put("sortOrder", article.getSortOrder() == null ? 0 : article.getSortOrder());
        result.put("enabled", Boolean.TRUE.equals(article.getEnabled()));
        return result;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
