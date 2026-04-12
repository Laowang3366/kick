package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Category;
import com.excel.forum.service.CategoryFollowService;
import com.excel.forum.service.CheckinService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.FollowService;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private PostService postService;

    @Mock
    private ReplyService replyService;

    @Mock
    private FavoriteService favoriteService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private FollowService followService;

    @Mock
    private PostViewService postViewService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private CategoryFollowService categoryFollowService;

    @Mock
    private PostDraftService postDraftService;

    @Mock
    private MessageService messageService;

    @Mock
    private ExperienceService experienceService;

    @Mock
    private UserEntitlementService userEntitlementService;

    @Mock
    private CheckinService checkinService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(
                userService,
                postService,
                replyService,
                favoriteService,
                categoryService,
                followService,
                postViewService,
                notificationService,
                categoryFollowService,
                postDraftService,
                messageService,
                experienceService,
                userEntitlementService,
                checkinService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void followUserReturnsNotFoundWhenTargetMissing() throws Exception {
        when(userService.getById(999L)).thenReturn(null);

        mockMvc.perform(post("/api/users/999/follow")
                        .requestAttr("userId", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("目标用户不存在"));

        verify(followService, never()).follow(1L, 999L);
    }

    @Test
    void followCategoryReturnsNotFoundWhenCategoryMissing() throws Exception {
        when(categoryService.getById(999L)).thenReturn(null);

        mockMvc.perform(post("/api/users/category-follows/999")
                        .requestAttr("userId", 1L))
                .andExpect(status().isNotFound());

        verify(categoryFollowService, never()).follow(1L, 999L);
    }

    @Test
    void categoryFollowStatusReturnsNotFoundWhenCategoryMissing() throws Exception {
        when(categoryService.getById(999L)).thenReturn(null);

        mockMvc.perform(get("/api/users/category-follows/999/status")
                        .requestAttr("userId", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("板块不存在"));
    }
}
