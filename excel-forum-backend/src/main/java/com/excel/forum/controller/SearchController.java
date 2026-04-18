package com.excel.forum.controller;

import com.excel.forum.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    private final SearchService searchService;

    @GetMapping("/tutorials")
    public ResponseEntity<?> searchTutorials(@RequestParam("q") String keyword,
                                             @RequestParam(defaultValue = "8") Integer limit) {
        return ResponseEntity.ok(searchService.searchTutorials(keyword, safeLimit(limit)));
    }

    @GetMapping("/questions")
    public ResponseEntity<?> searchQuestions(@RequestParam("q") String keyword,
                                             @RequestParam(defaultValue = "8") Integer limit) {
        return ResponseEntity.ok(searchService.searchQuestions(keyword, safeLimit(limit)));
    }

    @GetMapping("/functions")
    public ResponseEntity<?> searchFunctions(@RequestParam("q") String keyword,
                                             @RequestParam(defaultValue = "8") Integer limit) {
        return ResponseEntity.ok(searchService.searchFunctions(keyword, safeLimit(limit)));
    }

    @GetMapping("/all")
    public ResponseEntity<?> searchAll(@RequestParam("q") String keyword,
                                       @RequestParam(defaultValue = "5") Integer limit) {
        return ResponseEntity.ok(searchService.searchAll(keyword, safeLimit(limit)));
    }

    private int safeLimit(Integer limit) {
        if (limit == null) {
            return 5;
        }
        return Math.max(1, Math.min(limit, 20));
    }
}
