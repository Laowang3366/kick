package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.PostDraft;

import java.util.Map;

public interface PostDraftService extends IService<PostDraft> {
    int MAX_DRAFT_COUNT = 15;
    int MAX_EDITING_DRAFT_COUNT = 3;
    int DRAFT_EXPIRE_DAYS = 10;
    String STATUS_DRAFT = "draft";
    String STATUS_EDITING = "editing";

    PostDraft createDraft(Long userId, Map<String, Object> body);

    PostDraft updateDraft(Long userId, Long draftId, Map<String, Object> body);

    Page<PostDraft> listUserDrafts(Long userId, Integer page, Integer size, String keyword, String status, Long categoryId, String sort);

    Page<PostDraft> listAdminDrafts(Integer page, Integer size, String keyword, String status, Long categoryId, String username, Boolean expired, String sort);

    PostDraft getUserDraft(Long userId, Long draftId);

    PostDraft resumeDraft(Long userId, Long draftId);

    PostDraft parkDraft(Long userId, Long draftId);

    void deleteDraft(Long userId, Long draftId);

    Map<String, Object> publishDraft(Long userId, Long draftId);

    long countEditingDrafts(Long userId);

    long countUserDrafts(Long userId);

    long cleanupExpiredDrafts();

    void deleteDraftByAdmin(Long draftId);

    long deleteDraftsByAdminUser(Long userId);
}
