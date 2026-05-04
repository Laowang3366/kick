package com.excel.forum.config;

import org.springframework.http.CacheControl;

import java.time.Duration;

public final class PublicCacheHeaders {
    public static final CacheControl SHORT_PUBLIC_CACHE = CacheControl
            .maxAge(Duration.ofSeconds(30))
            .cachePublic();

    private PublicCacheHeaders() {
    }
}
