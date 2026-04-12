package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.excel.forum.entity.PostDraft;
import com.excel.forum.entity.User;
import com.excel.forum.mapper.PostDraftMapper;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PostPublishingService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.dto.PostPublishCommand;
import com.excel.forum.service.dto.PostPublishResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Service
public class PostDraftServiceImpl extends ServiceImpl<PostDraftMapper, PostDraft> implements PostDraftService {

    private final PostService postService;
    private final UserService userService;
    private final PostPublishingService postPublishingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PostDraftServiceImpl(
            PostService postService,
            UserService userService,
            PostPublishingService postPublishingService) {
        this.postService = postService;
        this.userService = userService;
        this.postPublishingService = postPublishingService;
    }

    @Override
    @Transactional
    public PostDraft createDraft(Long userId, Map<String, Object> body) {
        QueryWrapper<PostDraft> userDraftQuery = new QueryWrapper<>();
        userDraftQuery.eq("user_id", userId);
        long totalDrafts = count(userDraftQuery);
        if (totalDrafts >= MAX_DRAFT_COUNT) {
            throw new IllegalArgumentException("草稿最多只能保存15条");
        }

        ensureEditingSlotAvailable(userId);

        PostDraft draft = new PostDraft();
        draft.setUserId(userId);
        applyDraftBody(draft, body);
        draft.setStatus(STATUS_EDITING);
        save(draft);
        return draft;
    }

    @Override
    @Transactional
    public PostDraft updateDraft(Long userId, Long draftId, Map<String, Object> body) {
        PostDraft draft = requireOwnedDraft(userId, draftId);
        applyDraftBody(draft, body);
        if (!hasText(draft.getStatus())) {
            draft.setStatus(STATUS_EDITING);
        }
        updateById(draft);
        return draft;
    }

    @Override
    public Page<PostDraft> listUserDrafts(Long userId, Integer page, Integer size, String keyword, String status, Long categoryId, String sort) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);

        if (hasText(keyword)) {
            queryWrapper.and(wrapper -> wrapper.like("title", keyword).or().like("content", keyword));
        }

        if (hasText(status)) {
            queryWrapper.eq("status", status);
        }

        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }

        queryWrapper.orderByDesc("status");
        if ("oldest".equalsIgnoreCase(sort)) {
            queryWrapper.orderByAsc("update_time");
        } else {
            queryWrapper.orderByDesc("update_time");
        }

        return page(new Page<>(page, size), queryWrapper);
    }

    @Override
    public Page<PostDraft> listAdminDrafts(Integer page, Integer size, String keyword, String status, Long categoryId, String username, Boolean expired, String sort) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();

        if (hasText(keyword)) {
            queryWrapper.and(wrapper -> wrapper.like("title", keyword).or().like("content", keyword));
        }

        if (hasText(status)) {
            queryWrapper.eq("status", status);
        }

        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }

        if (hasText(username)) {
            QueryWrapper<User> userQuery = new QueryWrapper<>();
            userQuery.like("username", username).select("id");
            List<User> matchedUsers = userService.list(userQuery);
            List<Long> userIds = matchedUsers.stream().map(User::getId).toList();
            if (userIds.isEmpty()) {
                queryWrapper.eq("user_id", -1L);
            } else {
                queryWrapper.in("user_id", userIds);
            }
        }

        if (expired != null) {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(DRAFT_EXPIRE_DAYS);
            if (expired) {
                queryWrapper.and(wrapper -> wrapper.le("update_time", cutoff)
                        .or(nested -> nested.isNull("update_time").le("create_time", cutoff)));
            } else {
                queryWrapper.and(wrapper -> wrapper.gt("update_time", cutoff)
                        .or(nested -> nested.isNull("update_time").gt("create_time", cutoff)));
            }
        }

        queryWrapper.orderByDesc("status");
        if ("oldest".equalsIgnoreCase(sort)) {
            queryWrapper.orderByAsc("update_time");
        } else if ("expiring".equalsIgnoreCase(sort)) {
            queryWrapper.orderByAsc("update_time");
        } else {
            queryWrapper.orderByDesc("update_time");
        }

        return page(new Page<>(page, size), queryWrapper);
    }

    @Override
    public PostDraft getUserDraft(Long userId, Long draftId) {
        return requireOwnedDraft(userId, draftId);
    }

    @Override
    @Transactional
    public PostDraft resumeDraft(Long userId, Long draftId) {
        PostDraft draft = requireOwnedDraft(userId, draftId);
        if (STATUS_EDITING.equals(draft.getStatus())) {
            return draft;
        }
        ensureEditingSlotAvailable(userId);
        draft.setStatus(STATUS_EDITING);
        updateById(draft);
        return draft;
    }

    @Override
    @Transactional
    public PostDraft parkDraft(Long userId, Long draftId) {
        PostDraft draft = requireOwnedDraft(userId, draftId);
        draft.setStatus(STATUS_DRAFT);
        updateById(draft);
        return draft;
    }

    @Override
    @Transactional
    public void deleteDraft(Long userId, Long draftId) {
        PostDraft draft = requireOwnedDraft(userId, draftId);
        removeById(draft.getId());
    }

    @Override
    @Transactional
    public Map<String, Object> publishDraft(Long userId, Long draftId) {
        PostDraft draft = requireOwnedDraft(userId, draftId);
        validatePublishableDraft(draft);

        PostPublishCommand publishCommand = new PostPublishCommand();
        publishCommand.setUserId(userId);
        publishCommand.setTitle(draft.getTitle().trim());
        publishCommand.setTitleStyle(draft.getTitleStyle());
        publishCommand.setContent(draft.getContent());
        publishCommand.setCategoryId(draft.getCategoryId());
        publishCommand.setRewardPoints(draft.getRewardPoints());
        publishCommand.setAttachments(draft.getAttachments());
        publishCommand.setTags(draft.getTags());
        PostPublishResult publishResult = postPublishingService.publish(publishCommand);

        removeById(draft.getId());
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("post", publishResult.getPost());
        if (publishResult.getExpGained() != null && publishResult.getExpGained() > 0) {
            result.put("expGained", publishResult.getExpGained());
        }
        if (!publishResult.getPointsRewards().isEmpty()) {
            result.put("pointsRewards", publishResult.getPointsRewards());
        }
        return result;
    }

    @Override
    public long countEditingDrafts(Long userId) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("status", STATUS_EDITING);
        return count(queryWrapper);
    }

    @Override
    public long countUserDrafts(Long userId) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        return count(queryWrapper);
    }

    @Override
    @Transactional
    public long cleanupExpiredDrafts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(DRAFT_EXPIRE_DAYS);
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.and(wrapper -> wrapper.le("update_time", cutoff)
                .or(nested -> nested.isNull("update_time").le("create_time", cutoff)));
        long expiredCount = count(queryWrapper);
        if (expiredCount > 0) {
            remove(queryWrapper);
        }
        return expiredCount;
    }

    @Override
    @Transactional
    public void deleteDraftByAdmin(Long draftId) {
        PostDraft draft = getById(draftId);
        if (draft == null) {
            throw new IllegalArgumentException("草稿不存在");
        }
        removeById(draftId);
    }

    @Override
    @Transactional
    public long deleteDraftsByAdminUser(Long userId) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        long draftCount = count(queryWrapper);
        if (draftCount > 0) {
            remove(queryWrapper);
        }
        return draftCount;
    }

    private PostDraft requireOwnedDraft(Long userId, Long draftId) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("id", draftId).eq("user_id", userId);
        PostDraft draft = getOne(queryWrapper);
        if (draft == null) {
            throw new IllegalArgumentException("草稿不存在");
        }
        return draft;
    }

    private void ensureEditingSlotAvailable(Long userId) {
        if (countEditingDrafts(userId) >= MAX_EDITING_DRAFT_COUNT) {
            throw new IllegalArgumentException("同时只能编辑3条未完成草稿，请先暂存或发布现有草稿");
        }
    }

    private void applyDraftBody(PostDraft draft, Map<String, Object> body) {
        String title = trimToNull(body.get("title"));
        String content = trimToNull(body.get("content"));
        Long categoryId = parseLong(body.get("categoryId"));
        if (categoryId == null) {
            categoryId = parseLong(body.get("forumId"));
        }

        if (title != null && title.length() > 200) {
            throw new IllegalArgumentException("标题不能超过200字");
        }

        if (content != null && content.length() > 50000) {
            throw new IllegalArgumentException("内容不能超过50000字");
        }

        Object attachments = body.get("attachments");
        Object tags = body.get("tags");

        if (!hasMeaningfulDraftContent(title, content, categoryId, attachments, tags)) {
            throw new IllegalArgumentException("请先输入要保存的内容");
        }

        draft.setTitle(title);
        draft.setTitleStyle(serializeJsonField(body.get("titleStyle")));
        draft.setContent(content);
        draft.setCategoryId(categoryId);
        draft.setAttachments(serializeJsonField(attachments));
        draft.setTags(serializeJsonField(tags));
        draft.setRewardPoints(parseInteger(body.get("rewardPoints")));
    }

    private boolean hasMeaningfulDraftContent(String title, String content, Long categoryId, Object attachments, Object tags) {
        return hasText(title)
                || hasText(content)
                || categoryId != null
                || hasCollectionValue(attachments)
                || hasCollectionValue(tags);
    }

    private boolean hasCollectionValue(Object value) {
        if (value instanceof List<?> list) {
            return !list.isEmpty();
        }
        return value != null;
    }

    private void validatePublishableDraft(PostDraft draft) {
        if (!hasText(draft.getTitle())) {
            throw new IllegalArgumentException("标题不能为空");
        }
        if (draft.getTitle().length() > 200) {
            throw new IllegalArgumentException("标题不能超过200字");
        }
        if (draft.getCategoryId() == null) {
            throw new IllegalArgumentException("请选择版块");
        }
        if (!hasText(draft.getContent())) {
            throw new IllegalArgumentException("内容不能为空");
        }
        if (draft.getContent().length() > 50000) {
            throw new IllegalArgumentException("内容不能超过50000字");
        }
    }

    private String serializeJsonField(Object value) {
        try {
            if (value == null) {
                return null;
            }
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    private String trimToNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private Long parseLong(Object value) {
        if (value == null || !hasText(value.toString())) {
            return null;
        }
        return Long.valueOf(value.toString());
    }

    private Integer parseInteger(Object value) {
        if (value == null || !hasText(value.toString())) {
            return null;
        }
        return Integer.valueOf(value.toString());
    }

    private boolean hasText(String text) {
        return text != null && !text.trim().isEmpty();
    }
}
