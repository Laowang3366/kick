package com.excel.forum.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiAssistantPromptProvider {
    private static final String CLASSPATH_DEFAULT_PROMPT = "classpath:prompts/ai-assistant-system-prompt.txt";
    private static final String BUILTIN_DEFAULT_PROMPT = String.join("\n",
            "你是一个专业、可靠、克制的 Excel 中文助手。",
            "输出必须使用自然中文纯文本。",
            "不要使用 Markdown 排版标记，包括 #、##、---、```、**、反引号。",
            "标题直接写成“结论：”“步骤：”“公式：”，列表使用 1. 2. 3. 这样的编号。",
            "Excel 公式本身必须完整保留，例如 =SUM(A1:A10)。"
    );

    private final Environment environment;
    private final ResourceLoader resourceLoader;

    public PromptSource getDefaultPrompt() {
        PromptSource filePrompt = firstReadableFilePrompt(
                environment.getProperty("AI_ASSISTANT_SYSTEM_PROMPT_FILE"),
                environment.getProperty("AI_ASSISTANT_SYSTEM_PROMPT_PATH"),
                environment.getProperty("AI_ASSISTANT_SYSTEM_PROMPT_FILE_PATH")
        );
        if (filePrompt != null) {
            return filePrompt;
        }

        String inlinePrompt = trimToNull(environment.getProperty("AI_ASSISTANT_SYSTEM_PROMPT"));
        if (inlinePrompt != null) {
            return new PromptSource(
                    defaultIfBlank(environment.getProperty("AI_ASSISTANT_SYSTEM_PROMPT_FILE_NAME"), "AI_ASSISTANT_SYSTEM_PROMPT"),
                    inlinePrompt
            );
        }

        PromptSource classpathPrompt = readPromptResource(CLASSPATH_DEFAULT_PROMPT, "ai-assistant-system-prompt.txt");
        if (classpathPrompt != null) {
            return classpathPrompt;
        }

        return new PromptSource("builtin-default", BUILTIN_DEFAULT_PROMPT);
    }

    public String resolveSystemPrompt(String configuredPrompt) {
        String prompt = trimToNull(configuredPrompt);
        return prompt == null ? getDefaultPrompt().content() : prompt;
    }

    private PromptSource firstReadableFilePrompt(String... locations) {
        for (String location : locations) {
            String normalized = trimToNull(location);
            if (normalized == null) {
                continue;
            }
            PromptSource promptSource = readPromptResource(toResourceLocation(normalized), displayFileName(normalized));
            if (promptSource != null) {
                return promptSource;
            }
        }
        return null;
    }

    private PromptSource readPromptResource(String location, String fileName) {
        try {
            Resource resource = resourceLoader.getResource(location);
            if (!resource.exists()) {
                return null;
            }
            try (InputStream inputStream = resource.getInputStream()) {
                String content = trimToNull(new String(inputStream.readAllBytes(), StandardCharsets.UTF_8));
                if (content == null) {
                    log.warn("AI assistant prompt file is empty: {}", location);
                    return null;
                }
                return new PromptSource(fileName, content);
            }
        } catch (Exception e) {
            log.warn("AI assistant prompt file read failed: {}", location);
            return null;
        }
    }

    private String toResourceLocation(String location) {
        if (location.startsWith("classpath:") || location.startsWith("file:")) {
            return location;
        }
        return "file:" + location;
    }

    private String displayFileName(String location) {
        if (location.startsWith("classpath:")) {
            return location.substring("classpath:".length());
        }
        if (location.startsWith("file:")) {
            location = location.substring("file:".length());
        }
        try {
            Path fileName = Path.of(location).getFileName();
            return fileName == null ? location : fileName.toString();
        } catch (Exception ignored) {
            return location;
        }
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public record PromptSource(String fileName, String content) {
    }
}
