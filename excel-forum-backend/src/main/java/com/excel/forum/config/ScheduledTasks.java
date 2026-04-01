package com.excel.forum.config;

import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class ScheduledTasks {
    private final UserService userService;

    @Scheduled(fixedRate = 300000)
    public void cleanInactiveUsers() {
        log.info("开始清理不活跃用户...");
        userService.cleanInactiveUsers();
        log.info("清理不活跃用户完成");
    }
}
