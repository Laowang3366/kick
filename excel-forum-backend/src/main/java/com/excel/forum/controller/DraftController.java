package com.excel.forum.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.PostDraft;
import com.excel.forum.service.PostDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/drafts")
@RequiredArgsConstructor
public class DraftController {

    private final PostDraftService postDraftService;

    @GetMapping
    public ResponseEntity<?> getMyDrafts(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "6") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "latest") String sort) {
        Page<PostDraft> drafts = postDraftService.listUserDrafts(userId, page, size, keyword, status, categoryId, sort);
        long editingCount = postDraftService.countEditingDrafts(userId);
        long totalDrafts = postDraftService.countUserDrafts(userId);
        return ResponseEntity.ok(Map.of(
                "records", drafts.getRecords(),
                "total", drafts.getTotal(),
                "current", drafts.getCurrent(),
                "size", drafts.getSize(),
                "pages", drafts.getPages(),
                "editingCount", editingCount,
                "allTotal", totalDrafts,
                "maxTotal", PostDraftService.MAX_DRAFT_COUNT,
                "maxEditing", PostDraftService.MAX_EDITING_DRAFT_COUNT
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDraft(@RequestAttribute Long userId, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(Map.of("draft", postDraftService.getUserDraft(userId, id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createDraft(@RequestAttribute Long userId, @RequestBody Map<String, Object> body) {
        try {
            PostDraft draft = postDraftService.createDraft(userId, body);
            PostDraft savedDraft = postDraftService.getById(draft.getId());
            return ResponseEntity.ok(Map.of(
                    "id", savedDraft.getId(),
                    "status", savedDraft.getStatus(),
                    "updateTime", savedDraft.getUpdateTime() != null ? savedDraft.getUpdateTime().toString() : "",
                    "message", "草稿已保存"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDraft(@RequestAttribute Long userId, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            PostDraft draft = postDraftService.updateDraft(userId, id, body);
            PostDraft savedDraft = postDraftService.getById(draft.getId());
            return ResponseEntity.ok(Map.of(
                    "id", savedDraft.getId(),
                    "status", savedDraft.getStatus(),
                    "updateTime", savedDraft.getUpdateTime() != null ? savedDraft.getUpdateTime().toString() : "",
                    "message", "草稿已更新"
            ));
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            int status = "草稿不存在".equals(message) ? 404 : 400;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<?> resumeDraft(@RequestAttribute Long userId, @PathVariable Long id) {
        try {
            PostDraft draft = postDraftService.resumeDraft(userId, id);
            return ResponseEntity.ok(Map.of(
                    "id", draft.getId(),
                    "status", draft.getStatus(),
                    "message", "已进入继续编辑状态"
            ));
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            int status = "草稿不存在".equals(message) ? 404 : 400;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }

    @PostMapping("/{id}/park")
    public ResponseEntity<?> parkDraft(@RequestAttribute Long userId, @PathVariable Long id) {
        try {
            PostDraft draft = postDraftService.parkDraft(userId, id);
            PostDraft savedDraft = postDraftService.getById(draft.getId());
            return ResponseEntity.ok(Map.of(
                    "id", savedDraft.getId(),
                    "status", savedDraft.getStatus(),
                    "updateTime", savedDraft.getUpdateTime() != null ? savedDraft.getUpdateTime().toString() : "",
                    "message", "草稿已暂存"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/batch-park")
    public ResponseEntity<?> batchParkDrafts(@RequestAttribute Long userId, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Number> ids = (java.util.List<Number>) body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "请选择要暂存的草稿"));
        }

        try {
            int count = 0;
            for (Long id : ids.stream().map(Number::longValue).collect(Collectors.toList())) {
                postDraftService.parkDraft(userId, id);
                count++;
            }
            return ResponseEntity.ok(Map.of("message", "已暂存 " + count + " 条草稿", "count", count));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDraft(@RequestAttribute Long userId, @PathVariable Long id) {
        try {
            postDraftService.deleteDraft(userId, id);
            return ResponseEntity.ok(Map.of("message", "草稿已删除"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/batch")
    public ResponseEntity<?> deleteDraftBatch(@RequestAttribute Long userId, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Number> ids = (java.util.List<Number>) body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "请选择要删除的草稿"));
        }

        try {
            int count = 0;
            for (Long id : ids.stream().map(Number::longValue).collect(Collectors.toList())) {
                postDraftService.deleteDraft(userId, id);
                count++;
            }
            return ResponseEntity.ok(Map.of("message", "已删除 " + count + " 条草稿", "count", count));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishDraft(@RequestAttribute Long userId, @PathVariable Long id) {
        try {
            Post post = postDraftService.publishDraft(userId, id);
            return ResponseEntity.ok(Map.of(
                    "id", post.getId(),
                    "message", post.getStatus() != null && post.getStatus() == -1 ? "草稿已发布，等待审核" : "草稿已发布"
            ));
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            int status = "草稿不存在".equals(message) ? 404 : 400;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }
}
