package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.Favorite;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.util.DtoConverter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Slf4j
public class FavoriteController {
    private final FavoriteService favoriteService;
    private final PostService postService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final CategoryService categoryService;
    private final ReplyService replyService;
    private final UserEntitlementService userEntitlementService;

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

        boolean isFavorited = favoriteService.toggleFavorite(userId, postId);

        if (isFavorited) {
            Post post = postService.getById(postId);
            if (post != null && !userId.equals(post.getUserId())) {
                User favoriter = userService.getById(userId);
                String notificationContent = (favoriter != null ? favoriter.getUsername() : "有人") + " 收藏了您的帖子《" + post.getTitle() + "》";
                notificationService.createNotification(
                        post.getUserId(),
                        "favorite",
                        notificationContent,
                        postId,
                        userId
                );
            }
        }

        int favoriteCount = syncFavoriteCount(postId);
        log.info("收藏切换: userId={}, postId={}, isFavorited={}, favoriteCount={}", userId, postId, isFavorited, favoriteCount);

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

    private int syncFavoriteCount(Long postId) {
        int favoriteCount = (int) favoriteService.count(new QueryWrapper<Favorite>().eq("post_id", postId));
        Post update = new Post();
        update.setId(postId);
        update.setFavoriteCount(favoriteCount);
        postService.updateById(update);
        return favoriteCount;
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyFavorites(HttpServletRequest request,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }

        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<Favorite> pageRequest = new Page<>(page, safeSize);
        QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).orderByDesc("create_time");

        Page<Favorite> result = favoriteService.page(pageRequest, queryWrapper);
        java.util.List<Post> posts = result.getRecords().stream()
                .map(favorite -> postService.getById(favorite.getPostId()))
                .filter(post -> post != null)
                .toList();
        java.util.List<PostDTO> postDtos = DtoConverter.convertPosts(posts, userService, userEntitlementService, categoryService, replyService);

        return ResponseEntity.ok(Map.of(
                "records", result.getRecords(),
                "posts", postDtos,
                "total", result.getTotal(),
                "current", result.getCurrent(),
                "size", result.getSize(),
                "pages", result.getPages()
        ));
    }
}
