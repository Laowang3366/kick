package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.SiteNotification;
import com.excel.forum.entity.PostDraft;
import com.excel.forum.entity.User;
import com.excel.forum.entity.UserExpLog;
import com.excel.forum.entity.ExperienceRule;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PointsRecordService;
import com.excel.forum.service.PointsRuleService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.QuestionService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.ReportService;
import com.excel.forum.service.SiteNotificationService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private PostService postService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private ReplyService replyService;

    @Mock
    private ReportService reportService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ForumEventService forumEventService;

    @Mock
    private NotificationService notificationService;

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
    private ExperienceService experienceService;

    @Mock
    private ExperienceProperties experienceProperties;

    @Mock
    private ExperienceRuleService experienceRuleService;

    @Captor
    private ArgumentCaptor<SiteNotification> notificationCaptor;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AdminController controller = new AdminController(
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
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createNotificationNormalizesRoleArray() throws Exception {
        when(siteNotificationService.save(any(SiteNotification.class))).thenAnswer(invocation -> {
            SiteNotification notification = invocation.getArgument(0);
            notification.setId(8L);
            return true;
        });

        mockMvc.perform(post("/api/admin/notifications")
                        .requestAttr("userId", 3L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"role-target","type":"system","content":"hello","sendType":"draft","targetType":"role","targetRoles":["user","admin"],"status":"draft"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(8L))
                .andExpect(jsonPath("$.targetRoles").value("user,admin"))
                .andExpect(jsonPath("$.targetType").value("role"));

        verify(siteNotificationService).save(notificationCaptor.capture());
        SiteNotification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.getTargetRoles()).isEqualTo("user,admin");
        assertThat(savedNotification.getCreatedBy()).isEqualTo(3L);
        assertThat(savedNotification.getStatus()).isEqualTo("draft");
    }

    @Test
    void getDraftsReturnsAdminDraftPayload() throws Exception {
        PostDraft draft = new PostDraft();
        draft.setId(12L);
        draft.setUserId(5L);
        draft.setTitle("治理草稿");
        draft.setContent("草稿内容");
        draft.setCategoryId(2L);
        draft.setStatus("editing");
        draft.setUpdateTime(LocalDateTime.of(2026, 4, 4, 10, 0));

        Page<PostDraft> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(draft));
        page.setPages(1);

        com.excel.forum.entity.User user = new com.excel.forum.entity.User();
        user.setId(5L);
        user.setUsername("tester");
        user.setRole("user");

        com.excel.forum.entity.Category category = new com.excel.forum.entity.Category();
        category.setId(2L);
        category.setName("Excel");

        when(postDraftService.listAdminDrafts(1, 10, "治理", "editing", 2L, "tester", false, "latest")).thenReturn(page);
        when(userService.getById(5L)).thenReturn(user);
        when(categoryService.getById(2L)).thenReturn(category);

        mockMvc.perform(get("/api/admin/drafts")
                        .param("page", "1")
                        .param("size", "10")
                        .param("keyword", "治理")
                        .param("status", "editing")
                        .param("categoryId", "2")
                        .param("username", "tester")
                        .param("expired", "false")
                        .param("sort", "latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].id").value(12L))
                .andExpect(jsonPath("$.records[0].author.username").value("tester"))
                .andExpect(jsonPath("$.records[0].category.name").value("Excel"))
                .andExpect(jsonPath("$.maxExpireDays").value(10));
    }

    @Test
    void deleteDraftsByUserReturnsCount() throws Exception {
        com.excel.forum.entity.User user = new com.excel.forum.entity.User();
        user.setId(6L);
        user.setUsername("cleaner");
        when(userService.getById(6L)).thenReturn(user);
        when(postDraftService.deleteDraftsByAdminUser(6L)).thenReturn(4L);

        mockMvc.perform(delete("/api/admin/drafts/by-user/6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(4))
                .andExpect(jsonPath("$.message").value("已清理该用户的 4 条草稿"));
    }

    @Test
    void getLevelUsersReturnsProgressAndLevelName() throws Exception {
        User user = new User();
        user.setId(9L);
        user.setUsername("leveler");
        user.setRole("user");
        user.setLevel(2);
        user.setExp(120);
        user.setPoints(8);

        Page<User> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(user));
        page.setPages(1);

        when(userService.page(any(Page.class), any(QueryWrapper.class))).thenReturn(page);
        when(experienceService.getProgress(120)).thenReturn(java.util.Map.of(
                "exp", 120,
                "level", 2,
                "levelName", "入门",
                "currentInLevel", 20,
                "totalInLevel", 400,
                "remainingExp", 380,
                "maxLevel", false
        ));
        ExperienceProperties.LevelRule levelRule = new ExperienceProperties.LevelRule();
        levelRule.setLevel(2);
        levelRule.setName("入门");
        levelRule.setThreshold(100);
        when(experienceProperties.getLevels()).thenReturn(List.of(levelRule));

        mockMvc.perform(get("/api/admin/levels/users")
                        .param("page", "1")
                        .param("size", "10")
                        .param("keyword", "lev")
                        .param("level", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].username").value("leveler"))
                .andExpect(jsonPath("$.records[0].level").value(2))
                .andExpect(jsonPath("$.records[0].levelName").value("入门"))
                .andExpect(jsonPath("$.records[0].progress.exp").value(120));
    }

    @Test
    void getLevelLogsReturnsMappedBizLabel() throws Exception {
        UserExpLog log = new UserExpLog();
        log.setId(11L);
        log.setUserId(5L);
        log.setBizType(ExperienceService.BIZ_DAILY_CHECKIN);
        log.setExpChange(6);
        log.setReason("每日签到");

        Page<UserExpLog> page = new Page<>(1, 10, 1);
        page.setRecords(List.of(log));
        page.setPages(1);

        User user = new User();
        user.setId(5L);
        user.setUsername("tester");
        user.setLevel(1);
        user.setExp(6);

        when(experienceService.page(any(Page.class), any(QueryWrapper.class))).thenReturn(page);
        when(userService.list(any(QueryWrapper.class))).thenReturn(List.of(user));

        mockMvc.perform(get("/api/admin/levels/logs")
                        .param("page", "1")
                        .param("size", "10")
                        .param("bizType", ExperienceService.BIZ_DAILY_CHECKIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].bizLabel").value("每日签到"))
                .andExpect(jsonPath("$.records[0].user.username").value("tester"))
                .andExpect(jsonPath("$.records[0].expChange").value(6));
    }

    @Test
    void updateExpRulePersistsRange() throws Exception {
        ExperienceRule rule = new ExperienceRule();
        rule.setId(1L);
        rule.setRuleKey(ExperienceService.BIZ_DAILY_CHECKIN);
        rule.setName("每日签到");
        rule.setDescription("旧说明");
        rule.setMinExp(1);
        rule.setMaxExp(20);
        rule.setEnabled(true);

        when(experienceRuleService.getByRuleKey(ExperienceService.BIZ_DAILY_CHECKIN)).thenReturn(rule);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/admin/levels/exp-rules/daily_checkin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minExp":2,"maxExp":16,"description":"新的随机范围","enabled":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minExp").value(2))
                .andExpect(jsonPath("$.maxExp").value(16))
                .andExpect(jsonPath("$.rangeText").value("2-16 经验"));

        verify(experienceRuleService).updateById(rule);
        assertThat(rule.getMinExp()).isEqualTo(2);
        assertThat(rule.getMaxExp()).isEqualTo(16);
    }
}
