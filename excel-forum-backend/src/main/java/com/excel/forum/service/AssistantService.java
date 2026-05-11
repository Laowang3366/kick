package com.excel.forum.service;

import com.excel.forum.entity.dto.AssistantChatRequest;
import com.excel.forum.entity.dto.AssistantChatResponse;

public interface AssistantService {
    AssistantChatResponse chat(Long userId, AssistantChatRequest request);
}
