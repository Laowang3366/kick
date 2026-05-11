package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.AiAssistantConfig;

import java.util.List;
import java.util.Map;

public interface AiAssistantConfigService extends IService<AiAssistantConfig> {
    List<Map<String, Object>> listAdminConfigs();

    AiAssistantConfig getActiveConfig();

    void ensureDefaultConfig();

    Map<String, Object> getDefaultPrompt();

    void activate(Long id);

    List<String> fetchModels(Long configId, String baseUrl, String apiKey, Boolean useSubmittedApiKey);
}
