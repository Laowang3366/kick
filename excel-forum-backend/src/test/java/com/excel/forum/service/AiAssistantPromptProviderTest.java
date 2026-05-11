package com.excel.forum.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.mock.env.MockEnvironment;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class AiAssistantPromptProviderTest {

    @TempDir
    Path tempDir;

    @Test
    void saveDefaultPromptWritesEditablePromptFile() throws Exception {
        Path promptPath = tempDir.resolve("default-prompt.txt");
        MockEnvironment environment = new MockEnvironment()
                .withProperty("AI_ASSISTANT_EDITABLE_SYSTEM_PROMPT_FILE", promptPath.toString());
        AiAssistantPromptProvider provider = new AiAssistantPromptProvider(environment, new DefaultResourceLoader());

        AiAssistantPromptProvider.PromptSource saved = provider.saveDefaultPrompt("ignored.txt", "默认 prompt 内容");
        AiAssistantPromptProvider.PromptSource loaded = provider.getDefaultPrompt();

        assertThat(saved.fileName()).isEqualTo("default-prompt.txt");
        assertThat(loaded.content()).isEqualTo("默认 prompt 内容");
        assertThat(Files.readString(promptPath)).contains("默认 prompt 内容");
    }

    @Test
    void saveDefaultPromptUsesStableFileWhenNoPathConfigured() throws Exception {
        String originalUserDir = System.getProperty("user.dir");
        System.setProperty("user.dir", tempDir.toString());
        try {
            AiAssistantPromptProvider provider = new AiAssistantPromptProvider(new MockEnvironment(), new DefaultResourceLoader());

            AiAssistantPromptProvider.PromptSource saved = provider.saveDefaultPrompt("../custom-prompt.txt", "内容");
            AiAssistantPromptProvider.PromptSource loaded = provider.getDefaultPrompt();

            assertThat(saved.fileName()).isEqualTo("ai-assistant-system-prompt.txt");
            assertThat(loaded.content()).isEqualTo("内容");
            assertThat(Files.readString(tempDir.resolve("prompts").resolve("ai-assistant-system-prompt.txt"))).contains("内容");
        } finally {
            System.setProperty("user.dir", originalUserDir);
        }
    }
}
