package com.excel.forum.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.config.GlobalExceptionHandler;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.PostDraft;
import com.excel.forum.service.PostDraftService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DraftControllerTest {

    @Mock
    private PostDraftService postDraftService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DraftController controller = new DraftController(postDraftService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getMyDraftsReturnsPagedPayload() throws Exception {
        PostDraft draft = new PostDraft();
        draft.setId(7L);
        draft.setTitle("分页草稿");
        draft.setStatus("editing");
        draft.setCategoryId(2L);

        Page<PostDraft> page = new Page<>(2, 5, 11);
        page.setRecords(List.of(draft));
        page.setPages(3);

        when(postDraftService.listUserDrafts(3L, 2, 5, "Excel", "editing", 2L, "latest")).thenReturn(page);
        when(postDraftService.countEditingDrafts(3L)).thenReturn(2L);
        when(postDraftService.countUserDrafts(3L)).thenReturn(11L);

        mockMvc.perform(get("/api/drafts")
                        .requestAttr("userId", 3L)
                        .param("page", "2")
                        .param("size", "5")
                        .param("keyword", "Excel")
                        .param("status", "editing")
                        .param("categoryId", "2")
                        .param("sort", "latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].id").value(7L))
                .andExpect(jsonPath("$.records[0].title").value("分页草稿"))
                .andExpect(jsonPath("$.total").value(11))
                .andExpect(jsonPath("$.allTotal").value(11))
                .andExpect(jsonPath("$.current").value(2))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.pages").value(3))
                .andExpect(jsonPath("$.editingCount").value(2));
    }

    @Test
    void getDraftReturnsNotFoundWhenServiceRejectsAccess() throws Exception {
        when(postDraftService.getUserDraft(8L, 9L)).thenThrow(new IllegalArgumentException("草稿不存在"));

        mockMvc.perform(get("/api/drafts/9")
                        .requestAttr("userId", 8L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("草稿不存在"));
    }

    @Test
    void createDraftReturnsBadRequestWhenEditingLimitExceeded() throws Exception {
        when(postDraftService.createDraft(org.mockito.ArgumentMatchers.eq(5L), org.mockito.ArgumentMatchers.anyMap()))
                .thenThrow(new IllegalArgumentException("同时只能编辑3条未完成草稿，请先暂存或发布现有草稿"));

        mockMvc.perform(post("/api/drafts")
                        .requestAttr("userId", 5L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"测试草稿","content":"内容"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("同时只能编辑3条未完成草稿，请先暂存或发布现有草稿"));
    }

    @Test
    void updateDraftReturnsUpdateTime() throws Exception {
        PostDraft draft = new PostDraft();
        draft.setId(3L);
        draft.setStatus("editing");

        PostDraft savedDraft = new PostDraft();
        savedDraft.setId(3L);
        savedDraft.setStatus("editing");
        savedDraft.setUpdateTime(java.time.LocalDateTime.of(2026, 4, 4, 19, 40));

        when(postDraftService.updateDraft(org.mockito.ArgumentMatchers.eq(6L), org.mockito.ArgumentMatchers.eq(3L), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(draft);
        when(postDraftService.getById(3L)).thenReturn(savedDraft);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/drafts/3")
                        .requestAttr("userId", 6L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"更新草稿","content":"内容"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3L))
                .andExpect(jsonPath("$.status").value("editing"))
                .andExpect(jsonPath("$.updateTime").value("2026-04-04T19:40"));
    }

    @Test
    void batchParkDraftsReturnsCount() throws Exception {
        PostDraft first = new PostDraft();
        first.setId(10L);
        PostDraft second = new PostDraft();
        second.setId(11L);
        when(postDraftService.parkDraft(9L, 10L)).thenReturn(first);
        when(postDraftService.parkDraft(9L, 11L)).thenReturn(second);

        mockMvc.perform(post("/api/drafts/batch-park")
                        .requestAttr("userId", 9L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ids":[10,11]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.message").value("已暂存 2 条草稿"));

        verify(postDraftService).parkDraft(9L, 10L);
        verify(postDraftService).parkDraft(9L, 11L);
    }

    @Test
    void batchDeleteDraftsReturnsCount() throws Exception {
        mockMvc.perform(delete("/api/drafts/batch")
                        .requestAttr("userId", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ids":[21,22,23]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3))
                .andExpect(jsonPath("$.message").value("已删除 3 条草稿"));

        verify(postDraftService, times(1)).deleteDraft(7L, 21L);
        verify(postDraftService, times(1)).deleteDraft(7L, 22L);
        verify(postDraftService, times(1)).deleteDraft(7L, 23L);
    }

    @Test
    void publishDraftReturnsPublishMessage() throws Exception {
        Post post = new Post();
        post.setId(66L);
        post.setStatus(-1);
        when(postDraftService.publishDraft(4L, 12L)).thenReturn(post);

        mockMvc.perform(post("/api/drafts/12/publish")
                        .requestAttr("userId", 4L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(66L))
                .andExpect(jsonPath("$.message").value("草稿已发布，等待审核"));

        verify(postDraftService).publishDraft(4L, 12L);
    }
}
