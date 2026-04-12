package com.excel.forum.service;

import com.excel.forum.service.dto.PostPublishCommand;
import com.excel.forum.service.dto.PostPublishResult;

public interface PostPublishingService {
    PostPublishResult publish(PostPublishCommand command);
}
