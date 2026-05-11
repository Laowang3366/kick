package com.excel.forum.service.impl;

import com.excel.forum.entity.dto.AssistantChatRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AssistantServiceImplTest {

    private final AssistantServiceImpl service = new AssistantServiceImpl(
            null,
            null,
            null,
            null,
            null,
            null,
            new ObjectMapper()
    );

    @Test
    void normalizeImagesAcceptsJpgAliasAndNormalizesMimeType() {
        String base64 = Base64.getEncoder().encodeToString("jpg".getBytes(StandardCharsets.UTF_8));
        AssistantChatRequest.ImageAttachment image = new AssistantChatRequest.ImageAttachment();
        image.setName("formula.jpg");
        image.setSize(3L);
        image.setDataUrl("data:image/jpg;base64," + base64);

        List<Object> images = normalizeImages(List.of(image));

        assertThat(images).hasSize(1);
        assertThat(readRecordAccessor(images.get(0), "mimeType")).isEqualTo("image/jpeg");
        assertThat(readRecordAccessor(images.get(0), "dataUrl")).isEqualTo("data:image/jpeg;base64," + base64);
    }

    @Test
    void normalizeImagesRejectsMoreThanThreeImages() {
        String base64 = Base64.getEncoder().encodeToString("png".getBytes(StandardCharsets.UTF_8));
        List<AssistantChatRequest.ImageAttachment> images = List.of(
                image("1.png", base64),
                image("2.png", base64),
                image("3.png", base64),
                image("4.png", base64)
        );

        assertThatThrownBy(() -> normalizeImages(images))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("一次最多支持 3 张图片");
    }

    @Test
    void timeoutUsesSixtySecondsMinimum() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("AI_ASSISTANT_TIMEOUT_MS", "20000");
        AssistantServiceImpl assistantService = new AssistantServiceImpl(
                null,
                null,
                null,
                null,
                null,
                environment,
                new ObjectMapper()
        );

        Integer timeoutMs = ReflectionTestUtils.invokeMethod(assistantService, "timeoutMs");

        assertThat(timeoutMs).isEqualTo(60000);
    }

    @SuppressWarnings("unchecked")
    private List<Object> normalizeImages(List<AssistantChatRequest.ImageAttachment> images) {
        return (List<Object>) ReflectionTestUtils.invokeMethod(service, "normalizeImages", images);
    }

    private AssistantChatRequest.ImageAttachment image(String name, String base64) {
        AssistantChatRequest.ImageAttachment image = new AssistantChatRequest.ImageAttachment();
        image.setName(name);
        image.setSize(3L);
        image.setDataUrl("data:image/png;base64," + base64);
        return image;
    }

    private String readRecordAccessor(Object record, String accessorName) {
        try {
            var accessor = record.getClass().getDeclaredMethod(accessorName);
            accessor.setAccessible(true);
            return String.valueOf(accessor.invoke(record));
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
