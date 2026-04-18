package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.service.PracticeCampaignService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PracticeCampaignControllerTest {

    @Mock
    private PracticeCampaignService practiceCampaignService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PracticeCampaignController controller = new PracticeCampaignController(practiceCampaignService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getWrongQuestionsReturnsReviewBuckets() throws Exception {
        when(practiceCampaignService.getCampaignWrongQuestions(7L)).thenReturn(Map.of(
                "todayReviews", java.util.List.of(Map.of("id", 1L, "status", "reviewing")),
                "reviewPool", java.util.List.of(),
                "summary", Map.of("dueCount", 1)
        ));

        mockMvc.perform(get("/api/practice/campaign/wrongs")
                        .requestAttr("userId", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayReviews[0].status").value("reviewing"))
                .andExpect(jsonPath("$.summary.dueCount").value(1));

        verify(practiceCampaignService).getCampaignWrongQuestions(7L);
    }

    @Test
    void submitWrongQuestionReviewResultReturnsSuccess() throws Exception {
        when(practiceCampaignService.submitWrongQuestionReviewResult(7L, 9L, "pass")).thenReturn(Map.of(
                "message", "复习结果已更新",
                "status", "mastered"
        ));

        mockMvc.perform(put("/api/practice/campaign/wrongs/9/review-result")
                        .requestAttr("userId", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"result":"pass"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("复习结果已更新"))
                .andExpect(jsonPath("$.status").value("mastered"));
    }

    @Test
    void archiveWrongQuestionReturnsSuccess() throws Exception {
        when(practiceCampaignService.archiveWrongQuestion(7L, 9L)).thenReturn(Map.of(
                "message", "错题已归档"
        ));

        mockMvc.perform(put("/api/practice/campaign/wrongs/9/archive")
                        .requestAttr("userId", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("错题已归档"));
    }
}
