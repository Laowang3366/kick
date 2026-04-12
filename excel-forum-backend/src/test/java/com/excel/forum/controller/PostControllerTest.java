package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.AdminLogMapper;
import com.excel.forum.mapper.PostEditHistoryMapper;
import com.excel.forum.service.dto.PostPublishResult;
import com.excel.forum.util.HtmlSanitizer;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PointsTaskService;
import com.excel.forum.service.PostPublishingService;
import com.excel.forum.service.PostShareService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.ExperienceRuleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class PostControllerTest {

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
    private ExperienceRuleService experienceRuleService;

    @Mock
    private PointsTaskService pointsTaskService;

    @Mock
    private UserEntitlementService userEntitlementService;

    @Mock
    private AdminLogMapper adminLogMapper;

    @Mock
    private PostEditHistoryMapper postEditHistoryMapper;

    @Mock
    private HtmlSanitizer htmlSanitizer;

    @Captor
    private ArgumentCaptor<Post> postCaptor;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        PostController controller = new PostController(
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
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createPostQueuesRegularUserPostForReview() throws Exception {
        Post post = new Post();
        post.setId(99L);
        post.setUserId(10L);
        post.setCategoryId(1L);
        post.setStatus(-1);
        post.setReviewStatus("pending");
        post.setReviewReason(null);
        PostPublishResult publishResult = new PostPublishResult();
        publishResult.setPost(post);
        publishResult.setRequiresReview(true);
        User author = new User();
        author.setId(10L);
        author.setIsMuted(false);
        when(userService.getById(10L)).thenReturn(author);
        when(postPublishingService.publish(any())).thenReturn(publishResult);

        mockMvc.perform(post("/api/posts")
                        .requestAttr("userId", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Pending review post","content":"content","categoryId":1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99L))
                .andExpect(jsonPath("$.message").value("发帖成功，等待审核"));

        verify(postPublishingService).publish(any());
    }

    @Test
    void sharePostRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/posts/9/share"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("请先登录"));
    }

    @Test
    void duplicateShareDoesNotIncrementCounterTwice() throws Exception {
        Post post = new Post();
        post.setId(9L);
        post.setShareCount(3);
        when(postService.getById(9L)).thenReturn(post);
        doThrow(new DuplicateKeyException("duplicate")).when(postShareService).save(any());

        mockMvc.perform(post("/api/posts/9/share")
                        .requestAttr("userId", 6L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareCount").value(3))
                .andExpect(jsonPath("$.counted").value(false));
    }

    @Test
    void getRepliesReturnsSecondPageAndTotals() throws Exception {
        Post post = new Post();
        post.setId(7L);
        post.setUserId(10L);

        Reply topReply = new Reply();
        topReply.setId(101L);
        topReply.setPostId(7L);
        topReply.setUserId(10L);
        topReply.setContent("page-two-reply");
        topReply.setStatus(0);
        topReply.setCreateTime(LocalDateTime.of(2026, 4, 8, 10, 40));

        when(postService.getById(7L)).thenReturn(post);
        when(replyService.list(org.mockito.ArgumentMatchers.<com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Reply>>any()))
                .thenReturn(List.of(topReply));
        mockMvc.perform(get("/api/posts/7/replies")
                        .param("page", "2")
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.totalAll").value(1))
                .andExpect(jsonPath("$.replies").isArray());
    }

    @Test
    void getPostDuplicateViewDoesNotIncrementAgain() throws Exception {
        Post first = new Post();
        first.setId(12L);
        first.setUserId(9L);
        first.setCategoryId(1L);
        first.setStatus(0);
        first.setViewCount(5);
        first.setLikeCount(0);
        first.setReplyCount(0);
        first.setShareCount(0);
        first.setFavoriteCount(0);
        first.setTitle("view");
        first.setContent("content");
        first.setCreateTime(LocalDateTime.of(2026, 4, 8, 10, 0));

        when(postService.getById(12L)).thenReturn(first);
        doThrow(new DuplicateKeyException("duplicate")).when(postViewService).save(any());

        mockMvc.perform(get("/api/posts/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.post.viewCount").value(5));

        verify(postService, org.mockito.Mockito.never()).incrementField(12L, "view_count", 1);
    }

    private User authorUser(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setRole("user");
        user.setLevel(1);
        user.setPoints(0);
        return user;
    }

    private com.excel.forum.entity.Category category(Long id, String name) {
        com.excel.forum.entity.Category category = new com.excel.forum.entity.Category();
        category.setId(id);
        category.setName(name);
        return category;
    }
}
