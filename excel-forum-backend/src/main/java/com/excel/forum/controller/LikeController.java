package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/likes")
@RequiredArgsConstructor
@Slf4j
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

        boolean isLiked = likeService.toggleLike(userId, targetType, targetId);

        if ("post".equals(targetType)) {
            int likeCount = syncPostLikeCount(targetId);
            log.info("点赞切换: userId={}, targetType=post, targetId={}, isLiked={}, likeCount={}", userId, targetId, isLiked, likeCount);
            if (isLiked) {
                Post post = postService.getById(targetId);
                if (post != null && !userId.equals(post.getUserId())) {
                    User liker = userService.getById(userId);
                    String notificationContent = (liker != null ? liker.getUsername() : "有人") + " 赞了您的帖子《" + post.getTitle() + "》";
                    notificationService.createNotification(
                            post.getUserId(),
                            "like",
                            notificationContent,
                            targetId,
                            userId
                    );
                }
            }
            return ResponseEntity.ok(Map.of("isLiked", isLiked, "likeCount", likeCount));
        }

        if ("reply".equals(targetType)) {
            int likeCount = syncReplyLikeCount(targetId);
            log.info("点赞切换: userId={}, targetType=reply, targetId={}, isLiked={}, likeCount={}", userId, targetId, isLiked, likeCount);
            if (isLiked) {
                Reply reply = replyService.getById(targetId);
                if (reply != null && !userId.equals(reply.getUserId())) {
                    User liker = userService.getById(userId);
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
            return ResponseEntity.ok(Map.of("isLiked", isLiked, "likeCount", likeCount));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "无效的点赞类型"));
    }

    private int syncPostLikeCount(Long postId) {
        int likeCount = (int) likeService.count(new QueryWrapper<Like>()
                .eq("target_type", "post")
                .eq("target_id", postId));
        Post update = new Post();
        update.setId(postId);
        update.setLikeCount(likeCount);
        postService.updateById(update);
        return likeCount;
    }

    private int syncReplyLikeCount(Long replyId) {
        int likeCount = (int) likeService.count(new QueryWrapper<Like>()
                .eq("target_type", "reply")
                .eq("target_id", replyId));
        UpdateWrapper<Reply> wrapper = new UpdateWrapper<>();
        wrapper.eq("id", replyId).set("like_count", likeCount);
        replyService.update(wrapper);
        return likeCount;
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
