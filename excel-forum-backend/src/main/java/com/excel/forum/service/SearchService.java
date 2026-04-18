package com.excel.forum.service;

import java.util.Map;

public interface SearchService {
    Map<String, Object> searchTutorials(String keyword, int limit);

    Map<String, Object> searchQuestions(String keyword, int limit);

    Map<String, Object> searchFunctions(String keyword, int limit);

    Map<String, Object> searchAll(String keyword, int limitPerType);
}
