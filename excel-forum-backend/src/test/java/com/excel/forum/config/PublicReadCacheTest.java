package com.excel.forum.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class PublicReadCacheTest {

    @Test
    void reusesCachedValueWithinTtlAndRefreshesAfterExpiry() throws Exception {
        PublicReadCache cache = new PublicReadCache(Duration.ofMillis(50));
        AtomicInteger calls = new AtomicInteger();

        String first = cache.get("home", () -> "value-" + calls.incrementAndGet());
        String cached = cache.get("home", () -> "value-" + calls.incrementAndGet());

        Thread.sleep(80);

        String refreshed = cache.get("home", () -> "value-" + calls.incrementAndGet());

        assertThat(first).isEqualTo("value-1");
        assertThat(cached).isEqualTo("value-1");
        assertThat(refreshed).isEqualTo("value-2");
        assertThat(calls).hasValue(2);
    }

    @Test
    void coordinatesConcurrentCacheMissesForSameKey() throws Exception {
        PublicReadCache cache = new PublicReadCache(Duration.ofSeconds(30));
        AtomicInteger calls = new AtomicInteger();
        int workers = 16;
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();

        Callable<String> task = () -> {
            ready.countDown();
            start.await();
            return cache.get("tutorials-home", () -> "payload-" + calls.incrementAndGet());
        };

        for (int i = 0; i < workers; i++) {
            futures.add(executor.submit(task));
        }

        ready.await();
        start.countDown();

        for (Future<String> future : futures) {
            assertThat(future.get()).isEqualTo("payload-1");
        }
        assertThat(calls).hasValue(1);

        executor.shutdownNow();
    }
}
