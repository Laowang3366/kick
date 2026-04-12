package com.excel.forum.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Message;
import com.excel.forum.entity.User;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MessageControllerTest {

    @Mock
    private MessageService messageService;

    @Mock
    private UserService userService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ForumEventService forumEventService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MessageController controller = new MessageController(
                messageService,
                userService,
                notificationService,
                forumEventService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getMessagesReturnsPaginationMetadataAndSenderInfo() throws Exception {
        Message message = new Message();
        message.setId(11L);
        message.setFromUserId(2L);
        message.setToUserId(1L);
        message.setContent("hello");
        message.setIsRead(0);
        message.setCreateTime(LocalDateTime.of(2026, 4, 8, 10, 20));

        Page<Message> page = new Page<>(2, 20, 25);
        page.setRecords(List.of(message));
        page.setPages(2);

        User sender = new User();
        sender.setId(2L);
        sender.setUsername("tester");
        sender.setAvatar("/avatar.png");

        when(messageService.getMessages(1L, 2L, 2, 20)).thenReturn(page);
        when(userService.listByIds(eq(java.util.Set.of(2L)))).thenReturn(List.of(sender));

        mockMvc.perform(get("/api/messages/2")
                        .requestAttr("userId", 1L)
                        .param("page", "2")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].id").value(11))
                .andExpect(jsonPath("$.messages[0].sender.username").value("tester"))
                .andExpect(jsonPath("$.total").value(25))
                .andExpect(jsonPath("$.current").value(2))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.pages").value(2));
    }
}
