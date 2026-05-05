package com.excel.forum.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class PublicJsonCacheTest {

    @Test
    void serializesPayloadOnceWithinTtl() {
        PublicJsonCache cache = new PublicJsonCache(
                new PublicReadCache(Duration.ofSeconds(30)),
                new ObjectMapper()
        );
        AtomicInteger calls = new AtomicInteger();

        String first = cache.get("tutorials-home", () -> Map.of("value", calls.incrementAndGet()));
        String cached = cache.get("tutorials-home", () -> Map.of("value", calls.incrementAndGet()));

        assertThat(first).isEqualTo("{\"value\":1}");
        assertThat(cached).isEqualTo("{\"value\":1}");
        assertThat(calls).hasValue(1);
    }
}
