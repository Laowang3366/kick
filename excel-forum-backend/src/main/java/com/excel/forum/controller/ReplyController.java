package com.excel.forum.controller;

import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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

    @PostMapping
    public ResponseEntity<?> createReply(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        Long postId = Long.valueOf(body.get("postId").toString());
        String content = body.get("content").toString();

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
        reply.setContent(content);
        reply.setLikeCount(0);
        reply.setStatus(0);
        
        if (body.containsKey("quotedReplyId") && body.get("quotedReplyId") != null) {
            reply.setParentId(Long.valueOf(body.get("quotedReplyId").toString()));
        }

        replyService.save(reply);

        post.setReplyCount(post.getReplyCount() + 1);
        postService.updateById(post);
        
        eventService.publishEvent(ForumEvent.replyUpdated(reply.getId(), postId));

        // 给帖子作者发送通知
        if (!userId.equals(post.getUserId())) {
            User replier = userService.getById(userId);
            String notificationContent = replier.getUsername() + " 回复了您的帖子《" + post.getTitle() + "》";
            notificationService.createNotification(
                post.getUserId(),
                "reply",
                notificationContent,
                postId
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", reply.getId());
        response.put("message", "回复成功");
        
        return ResponseEntity.ok(response);
    }
}
