package com.excel.forum.controller;

import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    private ForumEventService forumEventService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ExperienceService experienceService;

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
                forumEventService,
                notificationService,
                experienceService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createPostQueuesRegularUserPostForReview() throws Exception {
        User author = new User();
        author.setId(10L);
        author.setRole("user");
        when(userService.getById(10L)).thenReturn(author);
        when(postService.save(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            post.setId(99L);
            return true;
        });

        mockMvc.perform(post("/api/posts")
                        .requestAttr("userId", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Pending review post","content":"content","categoryId":1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99L))
                .andExpect(jsonPath("$.message").value("发帖成功，等待审核"));

        verify(postService).save(postCaptor.capture());
        Post savedPost = postCaptor.getValue();
        assertThat(savedPost.getStatus()).isEqualTo(-1);
        assertThat(savedPost.getReviewStatus()).isEqualTo("pending");
        assertThat(savedPost.getReviewReason()).isNull();
        assertThat(savedPost.getUserId()).isEqualTo(10L);
        assertThat(savedPost.getCategoryId()).isEqualTo(1L);
    }
}
