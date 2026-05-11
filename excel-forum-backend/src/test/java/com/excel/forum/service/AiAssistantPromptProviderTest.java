package com.excel.forum.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.mock.env.MockEnvironment;

import java.nio.charset.StandardCharsets;
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

    @Test
    void bundledDefaultPromptDoesNotForceOldAnswerTemplate() throws Exception {
        Resource resource = new DefaultResourceLoader().getResource("classpath:prompts/ai-assistant-system-prompt.txt");

        String prompt;
        try (var inputStream = resource.getInputStream()) {
            prompt = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }

        assertThat(prompt)
                .contains("不要固定套用")
                .doesNotContain("标题直接写成")
                .doesNotContain("列表使用 1. 2. 3.");
    }

    @Test
    void legacyEditableDefaultPromptIsNormalized() throws Exception {
        Path promptPath = tempDir.resolve("default-prompt.txt");
        Files.writeString(promptPath, String.join("\n",
                "你是一个专业、可靠、克制的 Excel 中文助手。",
                "输出必须使用自然中文纯文本。",
                "不要使用 Markdown 排版标记，包括 #、##、---、```、**、反引号。",
                "标题直接写成“结论：”“步骤：”“公式：”，列表使用 1. 2. 3. 这样的编号。",
                "Excel 公式本身必须完整保留，例如 =SUM(A1:A10)。"
        ));
        MockEnvironment environment = new MockEnvironment()
                .withProperty("AI_ASSISTANT_EDITABLE_SYSTEM_PROMPT_FILE", promptPath.toString());
        AiAssistantPromptProvider provider = new AiAssistantPromptProvider(environment, new DefaultResourceLoader());

        AiAssistantPromptProvider.PromptSource loaded = provider.getDefaultPrompt();

        assertThat(loaded.content())
                .contains("不要固定套用")
                .doesNotContain("标题直接写成");
    }
}
