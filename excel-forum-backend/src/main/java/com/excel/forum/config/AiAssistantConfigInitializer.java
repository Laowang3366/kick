package com.excel.forum.config;

import com.excel.forum.service.AiAssistantConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiAssistantConfigInitializer implements ApplicationRunner {
    private final AiAssistantConfigService aiAssistantConfigService;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        aiAssistantConfigService.ensureDefaultConfig();
    }
}
