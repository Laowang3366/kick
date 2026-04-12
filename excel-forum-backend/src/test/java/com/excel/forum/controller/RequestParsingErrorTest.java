package com.excel.forum.controller;

import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.mapper.AdminLogMapper;
import com.excel.forum.mapper.CheckinRecordMapper;
import com.excel.forum.mapper.PostEditHistoryMapper;
import com.excel.forum.mapper.PracticeAnswerMapper;
import com.excel.forum.mapper.PracticeRecordMapper;
import com.excel.forum.util.HtmlSanitizer;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.ExperienceLevelRuleService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.FeedbackService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.FollowService;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.MallService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PointsTaskService;
import com.excel.forum.service.PointsRecordService;
import com.excel.forum.service.PointsRuleOptionService;
import com.excel.forum.service.PointsRuleService;
import com.excel.forum.service.PracticeQuestionSubmissionService;
import com.excel.forum.service.PostPublishingService;
import com.excel.forum.service.PostShareService;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.QuestionCategoryService;
import com.excel.forum.service.QuestionExcelTemplateService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.ReportService;
import com.excel.forum.service.SiteNotificationService;
import com.excel.forum.service.CategoryFollowService;
import com.excel.forum.service.ChatMessageService;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.ExcelTemplateGradingService;
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
    private PostShareService postShareService;

    @Mock
    private PostPublishingService postPublishingService;

    @Mock
    private ForumEventService forumEventService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ExperienceService experienceService;

    @Mock
    private PointsTaskService pointsTaskService;

    @Mock
    private ReportService reportService;

    @Mock
    private FeedbackService feedbackService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PointsRuleService pointsRuleService;

    @Mock
    private PointsRuleOptionService pointsRuleOptionService;

    @Mock
    private PointsRecordService pointsRecordService;

    @Mock
    private QuestionService questionService;

    @Mock
    private QuestionCategoryService questionCategoryService;

    @Mock
    private QuestionExcelTemplateService questionExcelTemplateService;

    @Mock
    private SiteNotificationService siteNotificationService;

    @Mock
    private FollowService followService;

    @Mock
    private CategoryFollowService categoryFollowService;

    @Mock
    private MessageService messageService;

    @Mock
    private ChatMessageService chatMessageService;

    @Mock
    private PracticeQuestionSubmissionService practiceQuestionSubmissionService;

    @Mock
    private MallService mallService;

    @Mock
    private PostDraftService postDraftService;

    @Mock
    private ExperienceProperties experienceProperties;

    @Mock
    private ExperienceRuleService experienceRuleService;

    @Mock
    private ExperienceLevelRuleService experienceLevelRuleService;

    @Mock
    private ExcelTemplateGradingService excelTemplateGradingService;

    @Mock
    private UserEntitlementService userEntitlementService;

    @Mock
    private PracticeRecordMapper practiceRecordMapper;

    @Mock
    private PracticeAnswerMapper practiceAnswerMapper;

    @Mock
    private CheckinRecordMapper checkinRecordMapper;

    @Mock
    private AdminLogMapper adminLogMapper;

    @Mock
    private PostEditHistoryMapper postEditHistoryMapper;

    @Mock
    private HtmlSanitizer htmlSanitizer;

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
                postShareService,
                postPublishingService,
                forumEventService,
                notificationService,
                experienceService,
                experienceRuleService,
                pointsTaskService,
                userEntitlementService,
                adminLogMapper,
                postEditHistoryMapper,
                htmlSanitizer
        );
        AdminController adminController = new AdminController(
                userService,
                postService,
                categoryService,
                replyService,
                reportService,
                feedbackService,
                likeService,
                favoriteService,
                postViewService,
                postShareService,
                followService,
                categoryFollowService,
                messageService,
                chatMessageService,
                passwordEncoder,
                forumEventService,
                notificationService,
                pointsRuleService,
                pointsRuleOptionService,
                pointsRecordService,
                pointsTaskService,
                questionService,
                questionCategoryService,
                questionExcelTemplateService,
                practiceQuestionSubmissionService,
                siteNotificationService,
                postDraftService,
                mallService,
                experienceService,
                experienceProperties,
                experienceRuleService,
                experienceLevelRuleService,
                userEntitlementService,
                excelTemplateGradingService,
                practiceRecordMapper,
                practiceAnswerMapper,
                checkinRecordMapper,
                adminLogMapper,
                postEditHistoryMapper,
                htmlSanitizer
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
