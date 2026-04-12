package com.excel.forum.controller;

import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.PointsTaskService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.util.HtmlSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/replies")
@RequiredArgsConstructor
public class ReplyController {
    private final ReplyService replyService;
    private final PostService postService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final ForumEventService eventService;
    private final ExperienceService experienceService;
    private final ExperienceRuleService experienceRuleService;
    private final PointsTaskService pointsTaskService;
    private final HtmlSanitizer htmlSanitizer;

    @PostMapping
    @Transactional
    public ResponseEntity<?> createReply(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        User currentUser = userService.getById(userId);
        if (currentUser == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }
        if (Boolean.TRUE.equals(currentUser.getIsMuted())) {
            return ResponseEntity.status(403).body(Map.of("message", "当前账号已被禁言，暂时无法回复"));
        }

        if (body.get("postId") == null || body.get("content") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "参数不完整"));
        }

        Long postId = Long.valueOf(body.get("postId").toString());
        String content = body.get("content").toString();

        if (content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "回复内容不能为空"));
        }

        if (content.length() > 10000) {
            return ResponseEntity.badRequest().body(Map.of("message", "回复内容不能超过10000字"));
        }

        Post post = postService.getById(postId);
        if (post == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "帖子不存在"));
        }

        if (post.getIsLocked() != null && post.getIsLocked()) {
            return ResponseEntity.status(403).body(Map.of("message", "该帖子已被锁定，无法回复"));
        }

        Reply reply = new Reply();
        reply.setUserId(userId);
        reply.setPostId(postId);
        reply.setContent(htmlSanitizer.sanitize(content));
        reply.setLikeCount(0);
        reply.setAttachments(serializeJsonField(body.get("attachments")));
        reply.setStatus(0);

        if (body.containsKey("quotedReplyId") && body.get("quotedReplyId") != null) {
            reply.setParentId(Long.valueOf(body.get("quotedReplyId").toString()));
        }

        replyService.save(reply);
        int expGained = experienceRuleService.resolveFixedExp(ExperienceService.BIZ_REPLY_CREATE, 5);
        experienceService.awardReplyCreate(userId, reply.getId());
        List<Map<String, Object>> pointsRewards = new java.util.ArrayList<>();
        collectReward(pointsRewards, pointsTaskService.awardTask(userId, PointsTaskService.TASK_DAILY_REPLY, reply.getId(), "完成今日回复"));
        collectReward(pointsRewards, pointsTaskService.awardTask(userId, PointsTaskService.TASK_FIRST_REPLY, null, "完成首次回复"));

        postService.incrementField(postId, "reply_count", 1);

        eventService.publishEvent(ForumEvent.replyUpdated(reply.getId(), postId));

        // 给帖子作者发送通知
        if (!userId.equals(post.getUserId())) {
            User replier = currentUser;
            // 截取回复内容前50字
            String replyPreview = content.replaceAll("<[^>]+>", "");
            if (replyPreview.length() > 50) replyPreview = replyPreview.substring(0, 50) + "...";
            String notificationContent = replier.getUsername() + " 回复了您的帖子《" + post.getTitle() + "》：" + replyPreview;
            notificationService.createNotification(
                post.getUserId(),
                "reply",
                notificationContent,
                postId,
                reply.getId(),
                userId
            );
        }

        // 如果是回复别人的评论，也给被回复的评论作者发送通知
        if (reply.getParentId() != null) {
            Reply parentReply = replyService.getById(reply.getParentId());
            if (parentReply != null && !userId.equals(parentReply.getUserId()) && !parentReply.getUserId().equals(post.getUserId())) {
                User replier = currentUser;
                String replyPreview = content.replaceAll("<[^>]+>", "");
                if (replyPreview.length() > 50) replyPreview = replyPreview.substring(0, 50) + "...";
                String notificationContent = replier.getUsername() + " 回复了您的评论：" + replyPreview;
                notificationService.createNotification(
                    parentReply.getUserId(),
                    "reply",
                    notificationContent,
                    postId,
                    reply.getId(),
                    userId
                );
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", reply.getId());
        response.put("message", "回复成功");
        response.put("expGained", expGained);
        if (!pointsRewards.isEmpty()) {
            response.put("pointsRewards", pointsRewards);
        }

        return ResponseEntity.ok(response);
    }

    private String serializeJsonField(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteReply(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        Reply reply = replyService.getById(id);
        if (reply == null) {
            return ResponseEntity.status(404).body(Map.of("message", "回复不存在"));
        }

        // 权限校验：回复作者、帖子作者、管理员/版主可删除
        User currentUser = userService.getById(userId);
        Post post = postService.getById(reply.getPostId());

        boolean isReplyAuthor = reply.getUserId().equals(userId);
        boolean isPostAuthor = post != null && post.getUserId().equals(userId);
        boolean isAdminOrMod = currentUser != null &&
                ("admin".equals(currentUser.getRole()) || "moderator".equals(currentUser.getRole()));

        if (!isReplyAuthor && !isPostAuthor && !isAdminOrMod) {
            return ResponseEntity.status(403).body(Map.of("message", "无权删除该回复"));
        }

        // 删除回复及其所有后代回复
        List<Long> allDescendantIds = replyService.findAllDescendantIds(reply.getId());
        List<Reply> descendants = allDescendantIds.isEmpty() ? List.of() : replyService.listByIds(allDescendantIds);
        int deletedCount = 1 + allDescendantIds.size();
        if (!allDescendantIds.isEmpty()) {
            replyService.removeByIds(allDescendantIds);
        }
        replyService.removeById(id);
        postService.recalculateReplyCount(reply.getPostId());

        if (!reply.getUserId().equals(userId)) {
            notificationService.createNotification(
                    reply.getUserId(),
                    "reply_deleted",
                    "您的回复已被删除：" + summarizeContent(reply.getContent()),
                    reply.getPostId()
            );
        }

        for (Reply descendant : descendants) {
            if (descendant != null && !descendant.getUserId().equals(userId)) {
                notificationService.createNotification(
                        descendant.getUserId(),
                        "reply_deleted",
                        "您的回复因上级回复被删除而被移除",
                        descendant.getPostId()
                );
            }
        }

        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }

    private void collectReward(List<Map<String, Object>> rewards, Map<String, Object> reward) {
        if (reward != null) {
            rewards.add(reward);
        }
    }

    private String summarizeContent(String content) {
        if (content == null || content.isBlank()) {
            return "内容摘要不可用";
        }
        String normalized = content.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 50) {
            return normalized;
        }
        return normalized.substring(0, 50) + "...";
    }
}
