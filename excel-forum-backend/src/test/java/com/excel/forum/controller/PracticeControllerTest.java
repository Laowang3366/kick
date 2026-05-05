package com.excel.forum.controller;

import com.excel.forum.config.PublicReadCache;
import com.excel.forum.service.ExcelTemplateGradingService;
import com.excel.forum.service.PracticeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PracticeControllerTest {

    @Mock
    private PracticeService practiceService;

    @Mock
    private ExcelTemplateGradingService excelTemplateGradingService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PracticeController controller = new PracticeController(
                practiceService,
                excelTemplateGradingService,
                new PublicReadCache()
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void categoriesReturnsShortPublicCacheHeader() throws Exception {
        when(practiceService.getPracticeCategories()).thenReturn(Map.of(
                "categories", List.of(Map.of("id", 1L, "name", "函数基础"))
        ));

        mockMvc.perform(get("/api/practice/categories"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, allOf(
                        containsString("public"),
                        containsString("max-age=30")
                )))
                .andExpect(jsonPath("$.categories[0].id").value(1));
    }

    @Test
    void categoriesReusesShortLivedServerCache() throws Exception {
        when(practiceService.getPracticeCategories()).thenReturn(Map.of(
                "categories", List.of(Map.of("id", 1L, "name", "函数基础"))
        ));

        mockMvc.perform(get("/api/practice/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].id").value(1));
        mockMvc.perform(get("/api/practice/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].id").value(1));

        verify(practiceService, times(1)).getPracticeCategories();
    }

    @Test
    void questionListDoesNotReturnPublicCacheHeaderBecauseItCanUseUserContext() throws Exception {
        when(practiceService.getPracticeQuestionList(null, 7L)).thenReturn(Map.of(
                "questions", List.of()
        ));

        mockMvc.perform(get("/api/practice/question-list").requestAttr("userId", 7L))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.CACHE_CONTROL));
    }
}
