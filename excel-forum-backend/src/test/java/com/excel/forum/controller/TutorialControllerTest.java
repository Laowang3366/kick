package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Question;
import com.excel.forum.entity.TutorialArticle;
import com.excel.forum.entity.TutorialCategory;
import com.excel.forum.mapper.PracticeChapterMapper;
import com.excel.forum.service.OnboardingService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.TutorialArticleChapterRelService;
import com.excel.forum.service.TutorialArticleQuestionRelService;
import com.excel.forum.service.TutorialArticleService;
import com.excel.forum.service.TutorialCategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @Mock
    private OnboardingService onboardingService;

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
                onboardingService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void homeTutorialsFilterCategoriesByTrack() throws Exception {
        TutorialCategory beginnerCategory = category(1L, "新手函数", "beginner", 1);
        TutorialCategory advancedCategory = category(2L, "进阶查找", "advanced", 2);
        TutorialCategory generalCategory = category(3L, "通用技巧", "general", 3);

        when(onboardingService.resolveTrack(null, "intermediate")).thenReturn("intermediate");
        when(tutorialCategoryService.listWithArticleCount(true)).thenReturn(List.of(beginnerCategory, advancedCategory, generalCategory));
        when(tutorialArticleService.groupByCategoryIds(anyList(), eq(true))).thenReturn(Map.of(
                2L, List.of(article(201L, 2L, "INDEX MATCH", "advanced")),
                3L, List.of(article(301L, 3L, "快捷键整理", "general"))
        ));
        when(tutorialArticleChapterRelService.listByArticleIds(anyList())).thenReturn(List.of());
        when(tutorialArticleQuestionRelService.listByArticleIds(anyList())).thenReturn(List.of());
        when(practiceChapterMapper.selectList(any())).thenReturn(List.of());
        when(questionService.list(anyQuestionQuery())).thenReturn(List.of());

        mockMvc.perform(get("/api/tutorials/home").param("track", "intermediate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.learningTrack").value("intermediate"))
                .andExpect(jsonPath("$.categories.length()").value(2))
                .andExpect(jsonPath("$.categories[0].name").value("进阶查找"))
                .andExpect(jsonPath("$.categories[1].name").value("通用技巧"));
    }

    private TutorialCategory category(Long id, String name, String audienceTrack, int sortOrder) {
        TutorialCategory category = new TutorialCategory();
        category.setId(id);
        category.setName(name);
        category.setAudienceTrack(audienceTrack);
        category.setSortOrder(sortOrder);
        category.setEnabled(true);
        category.setArticleCount(1L);
        return category;
    }

    private TutorialArticle article(Long id, Long categoryId, String title, String audienceTrack) {
        TutorialArticle article = new TutorialArticle();
        article.setId(id);
        article.setCategoryId(categoryId);
        article.setTitle(title);
        article.setAudienceTrack(audienceTrack);
        article.setEnabled(true);
        article.setContent("");
        article.setSummary("");
        article.setSortOrder(0);
        article.setRecommendLevel(0);
        return article;
    }

    @SuppressWarnings("unchecked")
    private QueryWrapper<Question> anyQuestionQuery() {
        return (QueryWrapper<Question>) any(QueryWrapper.class);
    }
}
