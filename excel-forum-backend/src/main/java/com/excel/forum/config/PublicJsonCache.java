package com.excel.forum.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

@Component
public class PublicJsonCache {
    private final PublicReadCache publicReadCache;
    private final ObjectMapper objectMapper;

    public PublicJsonCache(PublicReadCache publicReadCache, ObjectMapper objectMapper) {
        this.publicReadCache = publicReadCache;
        this.objectMapper = objectMapper;
    }

    public String get(String key, Supplier<?> supplier) {
        return publicReadCache.get(key, () -> writeJson(supplier.get()));
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize public read cache payload", e);
        }
    }
}
