package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.config.PublicJsonCache;
import com.excel.forum.config.PublicReadCache;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.TutorialArticleChapterRelService;
import com.excel.forum.service.TutorialArticleQuestionRelService;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialCategoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TutorialControllerTest {

    @Mock
    private TutorialCategoryService tutorialCategoryService;

    @Mock
    private TutorialArticleService tutorialArticleService;

    @Mock
    private TutorialArticleChapterRelService tutorialArticleChapterRelService;

    @Mock
    private TutorialArticleQuestionRelService tutorialArticleQuestionRelService;

    @Mock
    private PracticeChapterMapper practiceChapterMapper;

    @Mock
    private QuestionService questionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        TutorialController controller = new TutorialController(
                tutorialCategoryService,
                tutorialArticleService,
                tutorialArticleChapterRelService,
                tutorialArticleQuestionRelService,
                practiceChapterMapper,
                questionService,
                new PublicJsonCache(new PublicReadCache(), new ObjectMapper())
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void homeTutorialsReusesShortLivedServerCache() throws Exception {
        TutorialCategory category = new TutorialCategory();
        category.setId(1L);
        category.setName("函数基础");
        TutorialArticle article = new TutorialArticle();
        article.setId(10L);
        article.setCategoryId(1L);
        article.setTitle("SUMIF");

        when(tutorialCategoryService.list(org.mockito.ArgumentMatchers.<QueryWrapper<TutorialCategory>>any())).thenReturn(List.of(category));
        when(tutorialArticleService.groupByCategoryIds(any(), eq(true))).thenReturn(Map.of(1L, List.of(article)));
        when(tutorialArticleChapterRelService.listByArticleIds(any())).thenReturn(List.of());
        when(tutorialArticleQuestionRelService.listByArticleIds(any())).thenReturn(List.of());
        when(practiceChapterMapper.selectList(any())).thenReturn(List.of());
        when(questionService.list(org.mockito.ArgumentMatchers.<QueryWrapper<Question>>any())).thenReturn(List.of());

        mockMvc.perform(get("/api/tutorials/home"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, allOf(
                        containsString("public"),
                        containsString("max-age=30")
                )))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(startsWith("{\"categories\"")))
                .andExpect(jsonPath("$.categories[0].articles[0].title").value("SUMIF"));
        mockMvc.perform(get("/api/tutorials/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[0].articles[0].title").value("SUMIF"));

        verify(tutorialCategoryService, times(1)).list(org.mockito.ArgumentMatchers.<QueryWrapper<TutorialCategory>>any());
        verify(tutorialCategoryService, never()).listWithArticleCount(true);
        verify(tutorialArticleService, times(1)).groupByCategoryIds(any(), eq(true));
        verify(tutorialArticleChapterRelService, times(1)).listByArticleIds(any());
        verify(tutorialArticleQuestionRelService, times(1)).listByArticleIds(any());
        verify(practiceChapterMapper, times(1)).selectList(any());
        verify(questionService, times(1)).list(org.mockito.ArgumentMatchers.<QueryWrapper<Question>>any());
    }
}
