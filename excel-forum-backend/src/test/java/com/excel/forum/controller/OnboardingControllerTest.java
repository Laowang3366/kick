package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Constructor;
import java.lang.reflect.Proxy;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OnboardingControllerTest {

    @Test
    void quickAssessmentReturnsTrackRecommendation() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(post("/api/onboarding/quick-assessment")
                        .requestAttr("userId", 12L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answers":[{"questionCode":"entry_level","answerValue":"beginner"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.track").value("beginner"))
                .andExpect(jsonPath("$.recommendedChapter.id").value(101));
    }

    @Test
    void getRecommendationReturnsNeedAssessmentFlag() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(get("/api/onboarding/recommendation")
                        .requestAttr("userId", 12L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.needsAssessment").value(false))
                .andExpect(jsonPath("$.track").value("beginner"));
    }

    @Test
    void updateLearningTrackReturnsUpdatedTrack() throws Exception {
        MockMvc mockMvc = buildMockMvc();

        mockMvc.perform(put("/api/me/learning-track")
                        .requestAttr("userId", 12L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"track":"intermediate"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.track").value("intermediate"))
                .andExpect(jsonPath("$.message").value("学习轨道已更新"));
    }

    private MockMvc buildMockMvc() {
        try {
            Class<?> controllerType = Class.forName("com.excel.forum.controller.OnboardingController");
            Class<?> serviceType = Class.forName("com.excel.forum.service.OnboardingService");
            Object service = Proxy.newProxyInstance(
                    serviceType.getClassLoader(),
                    new Class[]{serviceType},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "submitQuickAssessment" -> Map.of(
                                "track", "beginner",
                                "recommendedChapter", Map.of("id", 101, "name", "单元格引用"),
                                "recommendedArticle", Map.of("id", 201, "title", "SUM 函数入门")
                        );
                        case "getRecommendation" -> Map.of(
                                "needsAssessment", false,
                                "track", "beginner",
                                "recommendedChapter", Map.of("id", 101, "name", "单元格引用")
                        );
                        case "updateLearningTrack" -> Map.of(
                                "track", args[1],
                                "message", "学习轨道已更新"
                        );
                        default -> null;
                    }
            );
            Constructor<?> constructor = controllerType.getDeclaredConstructor(serviceType);
            Object controller = constructor.newInstance(service);
            return MockMvcBuilders.standaloneSetup(controller)
                    .setControllerAdvice(new GlobalExceptionHandler())
                    .build();
        } catch (ClassNotFoundException e) {
            throw new AssertionError("OnboardingController or OnboardingService is missing", e);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
