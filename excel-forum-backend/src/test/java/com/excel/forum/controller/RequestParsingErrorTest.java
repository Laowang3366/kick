package com.excel.forum.controller;

import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PointsRecordService;
import com.excel.forum.service.PointsRuleService;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.ReportService;
import com.excel.forum.service.SiteNotificationService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RequestParsingErrorTest {

    @Mock
    private PostService postService;

    @Mock
    private UserService userService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private ReplyService replyService;

    @Mock
    private LikeService likeService;

    @Mock
    private FavoriteService favoriteService;

    @Mock
    private PostViewService postViewService;

    @Mock
    private ForumEventService forumEventService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ExperienceService experienceService;

    @Mock
    private ReportService reportService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PointsRuleService pointsRuleService;

    @Mock
    private PointsRecordService pointsRecordService;

    @Mock
    private QuestionService questionService;

    @Mock
    private SiteNotificationService siteNotificationService;

    @Mock
    private PostDraftService postDraftService;

    @Mock
    private ExperienceProperties experienceProperties;

    @Mock
    private ExperienceRuleService experienceRuleService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PostController postController = new PostController(
                postService,
                userService,
                categoryService,
                replyService,
                likeService,
                favoriteService,
                postViewService,
                forumEventService,
                notificationService,
                experienceService
        );
        AdminController adminController = new AdminController(
                userService,
                postService,
                categoryService,
                replyService,
                reportService,
                passwordEncoder,
                forumEventService,
                notificationService,
                pointsRuleService,
                pointsRecordService,
                questionService,
                siteNotificationService,
                postDraftService,
                experienceService,
                experienceProperties,
                experienceRuleService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(postController, adminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void malformedPostJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .requestAttr("userId", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"broken\","))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("请求体格式错误"));
    }

    @Test
    void malformedAdminNotificationJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/admin/notifications")
                        .requestAttr("userId", 3L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"broken\","))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("请求体格式错误"));
    }
}
