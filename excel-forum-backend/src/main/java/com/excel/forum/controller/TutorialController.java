package com.excel.forum.controller;

import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tutorials")
@RequiredArgsConstructor
public class TutorialController {
    private final TutorialCategoryService tutorialCategoryService;
    private final TutorialArticleService tutorialArticleService;

    @GetMapping("/home")
    public ResponseEntity<?> getHomeTutorials() {
        List<TutorialCategory> categories = tutorialCategoryService.listWithArticleCount(true);
        List<Map<String, Object>> records = categories.stream()
                .map(category -> {
                    List<Map<String, Object>> articles = tutorialArticleService.listByCategoryId(category.getId(), true).stream()
                            .map(this::toArticleMap)
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

    private Map<String, Object> toArticleMap(TutorialArticle article) {
        return Map.of(
                "id", article.getId(),
                "categoryId", article.getCategoryId(),
                "title", article.getTitle(),
                "summary", article.getSummary() == null ? "" : article.getSummary(),
                "content", article.getContent() == null ? "" : article.getContent(),
                "sortOrder", article.getSortOrder() == null ? 0 : article.getSortOrder()
        );
    }
}
