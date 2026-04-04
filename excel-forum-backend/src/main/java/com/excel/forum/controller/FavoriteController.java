package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Favorite;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.service.FavoriteService;
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
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;
    private final PostService postService;
    private final UserService userService;
    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<?> toggleFavorite(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        if (body.get("targetId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "参数不完整"));
        }
        Long postId = Long.valueOf(body.get("targetId").toString());

        QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("post_id", postId);

        Favorite existingFavorite = favoriteService.getOne(queryWrapper);

        boolean isFavorited;
        if (existingFavorite != null) {
            favoriteService.removeById(existingFavorite.getId());
            isFavorited = false;

            postService.incrementField(postId, "favorite_count", -1);
        } else {
            Favorite favorite = new Favorite();
            favorite.setUserId(userId);
            favorite.setPostId(postId);
            favoriteService.save(favorite);
            isFavorited = true;

            postService.incrementField(postId, "favorite_count", 1);

            // 给帖子作者发送通知
            Post post = postService.getById(postId);
            if (post != null && !userId.equals(post.getUserId())) {
                User favoriter = userService.getById(userId);
                String notificationContent = (favoriter != null ? favoriter.getUsername() : "有人") + " 收藏了您的帖子《" + post.getTitle() + "》";
                notificationService.createNotification(
                    post.getUserId(),
                    "favorite",
                    notificationContent,
                    postId
                );
            }
        }

        Post updatedPost = postService.getById(postId);
        int favoriteCount = updatedPost != null && updatedPost.getFavoriteCount() != null
            ? updatedPost.getFavoriteCount() : 0;

        Map<String, Object> response = new HashMap<>();
        response.put("isFavorited", isFavorited);
        response.put("favoriteCount", favoriteCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkFavorite(
            @RequestParam Long postId,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        
        boolean isFavorited = false;
        if (userId != null) {
            QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("user_id", userId);
            queryWrapper.eq("post_id", postId);
            isFavorited = favoriteService.count(queryWrapper) > 0;
        }

        return ResponseEntity.ok(Map.of("isFavorited", isFavorited));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyFavorites(HttpServletRequest request,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.orderByDesc("create_time");
        
        return ResponseEntity.ok(favoriteService.list(queryWrapper));
    }
}
