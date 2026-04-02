package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Like;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.PostService;
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
    private final UserService userService;
    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<?> toggleLike(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
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
                Post post = postService.getById(targetId);
                if (post != null && post.getLikeCount() > 0) {
                    post.setLikeCount(post.getLikeCount() - 1);
                    postService.updateById(post);
                }
            }
        } else {
            Like like = new Like();
            like.setUserId(userId);
            like.setTargetType(targetType);
            like.setTargetId(targetId);
            likeService.save(like);
            isLiked = true;
            
            if ("post".equals(targetType)) {
                Post post = postService.getById(targetId);
                if (post != null) {
                    post.setLikeCount(post.getLikeCount() == null ? 1 : post.getLikeCount() + 1);
                    postService.updateById(post);
                    
                    // 给帖子作者发送通知
                    if (!userId.equals(post.getUserId())) {
                        User liker = userService.getById(userId);
                        String notificationContent = liker.getUsername() + " 赞了您的帖子《" + post.getTitle() + "》";
                        notificationService.createNotification(
                            post.getUserId(),
                            "like",
                            notificationContent,
                            targetId
                        );
                    }
                }
            }
        }

        int likeCount = 0;
        if ("post".equals(targetType)) {
            Post post = postService.getById(targetId);
            if (post != null) {
                likeCount = post.getLikeCount() != null ? post.getLikeCount() : 0;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("isLiked", isLiked);
        response.put("likeCount", likeCount);
        return ResponseEntity.ok(response);
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
