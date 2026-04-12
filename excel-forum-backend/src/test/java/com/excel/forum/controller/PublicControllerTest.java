package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.mapper.PracticeAnswerMapper;
import com.excel.forum.mapper.PracticeRecordMapper;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceLevelRuleService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicControllerTest {

    @Mock
    private CategoryService categoryService;

    @Mock
    private PostService postService;

    @Mock
    private UserService userService;

    @Mock
    private QuestionService questionService;

    @Mock
    private PracticeRecordMapper practiceRecordMapper;

    @Mock
    private PracticeAnswerMapper practiceAnswerMapper;

    @Mock
    private ExperienceLevelRuleService experienceLevelRuleService;

    @Mock
    private ExperienceProperties experienceProperties;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PublicController controller = new PublicController(
                categoryService,
                postService,
                userService,
                questionService,
                practiceRecordMapper,
                practiceAnswerMapper,
                experienceLevelRuleService,
                experienceProperties
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void publicRootReturnsOverviewPayload() throws Exception {
        when(categoryService.count()).thenReturn(8L);
        when(postService.count(any())).thenReturn(2L);
        when(userService.count(any())).thenReturn(1L);
        when(userService.list(org.mockito.ArgumentMatchers.<com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<com.excel.forum.entity.User>>any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.categoryCount").value(8))
                .andExpect(jsonPath("$.stats.postCount").value(2))
                .andExpect(jsonPath("$.stats.userCount").value(1))
                .andExpect(jsonPath("$.topUsers").isArray());
    }
}
