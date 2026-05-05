package com.excel.forum.config;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Component
public class PublicReadCache {
    private static final Duration DEFAULT_TTL = Duration.ofSeconds(30);

    private final long ttlNanos;
    private final ConcurrentHashMap<String, CacheSlot> slots = new ConcurrentHashMap<>();

    public PublicReadCache() {
        this(DEFAULT_TTL);
    }

    PublicReadCache(Duration ttl) {
        this.ttlNanos = ttl.toNanos();
    }

    public <T> T get(String key, Supplier<T> supplier) {
        CacheSlot slot = slots.computeIfAbsent(key, ignored -> new CacheSlot());
        long now = System.nanoTime();
        CacheEntry cached = slot.entry;
        if (cached != null && cached.isFresh(now)) {
            return cached.typedValue();
        }

        synchronized (slot) {
            now = System.nanoTime();
            cached = slot.entry;
            if (cached != null && cached.isFresh(now)) {
                return cached.typedValue();
            }
            T value = supplier.get();
            slot.entry = new CacheEntry(value, System.nanoTime() + ttlNanos);
            return value;
        }
    }

    private static final class CacheSlot {
        private volatile CacheEntry entry;
    }

    private record CacheEntry(Object value, long expiresAtNanos) {
        private boolean isFresh(long nowNanos) {
            return nowNanos < expiresAtNanos;
        }

        @SuppressWarnings("unchecked")
        private <T> T typedValue() {
            return (T) value;
        }
    }
}
