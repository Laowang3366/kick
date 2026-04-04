package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Like;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.service.LikeService;
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
@RequestMapping("/api/likes")
@RequiredArgsConstructor
public class LikeController {
    private final LikeService likeService;
    private final PostService postService;
    private final ReplyService replyService;
    private final UserService userService;
    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<?> toggleLike(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        if (body.get("targetType") == null || body.get("targetId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "参数不完整"));
        }

        String targetType = body.get("targetType").toString();
        Long targetId = Long.valueOf(body.get("targetId").toString());

        QueryWrapper<Like> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("target_type", targetType);
        queryWrapper.eq("target_id", targetId);

        Like existingLike = likeService.getOne(queryWrapper);

        boolean isLiked;
        if (existingLike != null) {
            likeService.removeById(existingLike.getId());
            isLiked = false;

            if ("post".equals(targetType)) {
                postService.incrementField(targetId, "like_count", -1);
            } else if ("reply".equals(targetType)) {
                incrementReplyLikeCount(targetId, -1);
            }
        } else {
            Like like = new Like();
            like.setUserId(userId);
            like.setTargetType(targetType);
            like.setTargetId(targetId);
            likeService.save(like);
            isLiked = true;

            if ("post".equals(targetType)) {
                postService.incrementField(targetId, "like_count", 1);

                Post post = postService.getById(targetId);
                if (post != null && !userId.equals(post.getUserId())) {
                    User liker = userService.getById(userId);
                    String notificationContent = (liker != null ? liker.getUsername() : "有人") + " 赞了您的帖子《" + post.getTitle() + "》";
                    notificationService.createNotification(
                        post.getUserId(),
                        "like",
                        notificationContent,
                        targetId
                    );
                }
            } else if ("reply".equals(targetType)) {
                incrementReplyLikeCount(targetId, 1);

                Reply reply = replyService.getById(targetId);
                if (reply != null && !userId.equals(reply.getUserId())) {
                    User liker = userService.getById(userId);
                    // 截取回复内容前50字
                    String replyPreview = reply.getContent() != null ? reply.getContent().replaceAll("<[^>]+>", "") : "";
                    if (replyPreview.length() > 50) replyPreview = replyPreview.substring(0, 50) + "...";
                    String notificationContent = (liker != null ? liker.getUsername() : "有人") + " 赞了您的回复：" + replyPreview;
                    notificationService.createNotification(
                        reply.getUserId(),
                        "like",
                        notificationContent,
                        reply.getPostId(),
                        reply.getId(),
                        userId
                    );
                }
            }
        }

        int likeCount = 0;
        if ("post".equals(targetType)) {
            Post post = postService.getById(targetId);
            if (post != null) {
                likeCount = post.getLikeCount() != null ? post.getLikeCount() : 0;
            }
        } else if ("reply".equals(targetType)) {
            Reply reply = replyService.getById(targetId);
            if (reply != null) {
                likeCount = reply.getLikeCount() != null ? reply.getLikeCount() : 0;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("isLiked", isLiked);
        response.put("likeCount", likeCount);
        return ResponseEntity.ok(response);
    }

    private void incrementReplyLikeCount(Long replyId, int delta) {
        com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<Reply> wrapper =
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<>();
        wrapper.eq("id", replyId)
               .setSql("like_count = COALESCE(like_count, 0) + " + delta);
        replyService.update(wrapper);
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkLike(
            @RequestParam String targetType,
            @RequestParam Long targetId,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        
        boolean isLiked = false;
        if (userId != null) {
            QueryWrapper<Like> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("user_id", userId);
            queryWrapper.eq("target_type", targetType);
            queryWrapper.eq("target_id", targetId);
            isLiked = likeService.count(queryWrapper) > 0;
        }

        return ResponseEntity.ok(Map.of("isLiked", isLiked));
    }
}
