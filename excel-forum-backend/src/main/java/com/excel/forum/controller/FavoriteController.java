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

        Long postId = Long.valueOf(body.get("targetId").toString());

        QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.eq("post_id", postId);

        Favorite existingFavorite = favoriteService.getOne(queryWrapper);

        boolean isFavorited;
        if (existingFavorite != null) {
            favoriteService.removeById(existingFavorite.getId());
            isFavorited = false;
            
            Post post = postService.getById(postId);
            if (post != null && post.getFavoriteCount() != null && post.getFavoriteCount() > 0) {
                post.setFavoriteCount(post.getFavoriteCount() - 1);
                postService.updateById(post);
            }
        } else {
            Favorite favorite = new Favorite();
            favorite.setUserId(userId);
            favorite.setPostId(postId);
            favoriteService.save(favorite);
            isFavorited = true;
            
            Post post = postService.getById(postId);
            if (post != null) {
                post.setFavoriteCount(post.getFavoriteCount() == null ? 1 : post.getFavoriteCount() + 1);
                postService.updateById(post);
                
                // 给帖子作者发送通知
                if (!userId.equals(post.getUserId())) {
                    User favoriter = userService.getById(userId);
                    String notificationContent = favoriter.getUsername() + " 收藏了您的帖子《" + post.getTitle() + "》";
                    notificationService.createNotification(
                        post.getUserId(),
                        "interaction",
                        notificationContent,
                        postId
                    );
                }
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
