package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Category;
import com.excel.forum.entity.dto.CategoryWithPostCount;
import com.excel.forum.service.CategoryFollowService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryFollowService categoryFollowService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private PostService postService;

    @Mock
    private ReplyService replyService;

    @Mock
    private UserService userService;

    @Mock
    private UserEntitlementService userEntitlementService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        CategoryController controller = new CategoryController(
                categoryFollowService,
                categoryService,
                postService,
                replyService,
                userService,
                userEntitlementService,
                new ObjectMapper()
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getCategoriesUsesAggregatedPostCounts() throws Exception {
        Category first = new Category();
        first.setId(1L);
        first.setName("Excel基础");
        Category second = new Category();
        second.setId(2L);
        second.setName("函数公式");

        when(categoryService.list(org.mockito.ArgumentMatchers.<com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Category>>any()))
                .thenReturn(List.of(first, second));
        when(categoryService.countActivePostsByCategoryIds(List.of(1L, 2L))).thenReturn(Map.of(1L, 3L, 2L, 7L));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].postCount").value(3))
                .andExpect(jsonPath("$[1].postCount").value(7));
    }

    @Test
    void getHotCategoriesUsesAggregatedStats() throws Exception {
        Category first = new Category();
        first.setId(1L);
        first.setName("Excel基础");
        first.setDescription("基础");
        first.setGroupName("入门");
        first.setSortOrder(1);

        Category second = new Category();
        second.setId(2L);
        second.setName("函数公式");
        second.setDescription("函数");
        second.setGroupName("进阶");
        second.setSortOrder(2);

        when(categoryService.list()).thenReturn(List.of(first, second));
        when(categoryService.countActivePostsByCategoryIds(List.of(1L, 2L))).thenReturn(Map.of(1L, 5L, 2L, 2L));
        when(categoryService.countActiveRepliesByCategoryIds(List.of(1L, 2L))).thenReturn(Map.of(1L, 9L, 2L, 1L));

        mockMvc.perform(get("/api/categories/hot").param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].postCount").value(5))
                .andExpect(jsonPath("$[0].replyCount").value(9))
                .andExpect(jsonPath("$[1].id").value(2));
    }
}
