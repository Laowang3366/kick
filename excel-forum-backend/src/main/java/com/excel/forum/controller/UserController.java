package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.*;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.dto.ReplyDTO;
import com.excel.forum.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final PostService postService;
    private final ReplyService replyService;
    private final FavoriteService favoriteService;
    private final CategoryService categoryService;
    private final LikeService likeService;
    private final FollowService followService;
    private final PostViewService postViewService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/online")
    public ResponseEntity<?> getOnlineUsers(@RequestParam(defaultValue = "10") int limit) {
        List<User> onlineUsers = userService.getOnlineUsers(limit);
        int totalCount = userService.getOnlineUserCount();
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", onlineUsers);
        response.put("total", totalCount);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestAttribute Long userId) {
        userService.updateActiveTime(userId);
        return ResponseEntity.ok("心跳成功");
    }

    @GetMapping("/{id}/posts")
    public ResponseEntity<?> getUserPosts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        
        Page<Post> pageRequest = new Page<>(page, limit);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", id);
        queryWrapper.in("status", 0, 1);
        queryWrapper.orderByDesc("create_time");
        
        Page<Post> result = postService.page(pageRequest, queryWrapper);
        
        List<PostDTO> dtoList = result.getRecords().stream()
            .map(this::convertPostToDTO)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("posts", dtoList);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/replies")
    public ResponseEntity<?> getUserReplies(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        
        Page<Reply> pageRequest = new Page<>(page, limit);
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", id);
        queryWrapper.eq("status", 0);
        queryWrapper.orderByDesc("create_time");
        
        Page<Reply> result = replyService.page(pageRequest, queryWrapper);
        
        List<ReplyDTO> dtoList = result.getRecords().stream()
            .filter(reply -> {
                Post post = postService.getById(reply.getPostId());
                return post != null && (post.getStatus() == 0 || post.getStatus() == 1);
            })
            .map(this::convertReplyToDTO)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("replies", dtoList);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/favorites")
    public ResponseEntity<?> getUserFavorites(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        
        Page<Favorite> favPage = new Page<>(page, limit);
        QueryWrapper<Favorite> favQuery = new QueryWrapper<>();
        favQuery.eq("user_id", id);
        favQuery.orderByDesc("create_time");
        
        Page<Favorite> favResult = favoriteService.page(favPage, favQuery);
        
        List<PostDTO> posts = favResult.getRecords().stream()
            .map(fav -> postService.getById(fav.getPostId()))
            .filter(post -> post != null && (post.getStatus() == 0 || post.getStatus() == 1))
            .map(this::convertPostToDTO)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("total", favResult.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q) {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.like("username", q);
        queryWrapper.last("LIMIT 10");
        
        List<User> users = userService.list(queryWrapper);
        users.forEach(u -> u.setPassword(null));
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", users);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/following")
    public ResponseEntity<?> getUserFollowing(@PathVariable Long id) {
        List<Long> followingIds = followService.getFollowingIds(id);
        
        List<User> followingUsers = followingIds.stream()
            .map(userId -> {
                User user = userService.getById(userId);
                if (user != null) {
                    user.setPassword(null);
                }
                return user;
            })
            .filter(user -> user != null)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", followingUsers);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/followers")
    public ResponseEntity<?> getUserFollowers(@PathVariable Long id) {
        List<Long> followerIds = followService.getFollowerIds(id);
        
        List<User> followerUsers = followerIds.stream()
            .map(userId -> {
                User user = userService.getById(userId);
                if (user != null) {
                    user.setPassword(null);
                }
                return user;
            })
            .filter(user -> user != null)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", followerUsers);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<?> followUser(@PathVariable Long id, @RequestAttribute Long userId) {
        if (userId.equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "不能关注自己"));
        }
        
        followService.follow(userId, id);
        return ResponseEntity.ok(Map.of("message", "关注成功"));
    }

    @DeleteMapping("/{id}/follow")
    public ResponseEntity<?> unfollowUser(@PathVariable Long id, @RequestAttribute Long userId) {
        followService.unfollow(userId, id);
        return ResponseEntity.ok(Map.of("message", "取消关注成功"));
    }

    @GetMapping("/{id}/is-following")
    public ResponseEntity<?> checkFollowing(@PathVariable Long id, @RequestAttribute Long userId) {
        boolean isFollowing = followService.isFollowing(userId, id);
        return ResponseEntity.ok(Map.of("isFollowing", isFollowing));
    }

    @GetMapping("/{id}/view-history")
    public ResponseEntity<?> getViewHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        
        Page<PostView> pageRequest = new Page<>(page, limit);
        QueryWrapper<PostView> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", id);
        queryWrapper.isNotNull("post_id");
        queryWrapper.orderByDesc("create_time");
        
        Page<PostView> result = postViewService.page(pageRequest, queryWrapper);
        
        List<PostDTO> posts = result.getRecords().stream()
            .map(pv -> postService.getById(pv.getPostId()))
            .filter(post -> post != null && (post.getStatus() == 0 || post.getStatus() == 1))
            .map(this::convertPostToDTO)
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }

    private PostDTO convertPostToDTO(Post post) {
        PostDTO dto = new PostDTO();
        dto.setId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setContent(post.getContent());
        dto.setCategoryId(post.getCategoryId());
        dto.setUserId(post.getUserId());
        dto.setStatus(post.getStatus());
        dto.setType(post.getType());
        dto.setViewCount(post.getViewCount());
        dto.setLikeCount(post.getLikeCount());
        dto.setReplyCount(post.getReplyCount());
        dto.setShareCount(post.getShareCount());
        dto.setFavoriteCount(post.getFavoriteCount());
        dto.setIsLocked(post.getIsLocked() != null ? post.getIsLocked() : false);
        dto.setIsTop(post.getIsTop() != null ? post.getIsTop() : false);
        dto.setIsEssence(post.getIsEssence() != null ? post.getIsEssence() : false);
        dto.setCreateTime(post.getCreateTime() != null ? post.getCreateTime().toString() : null);
        dto.setUpdateTime(post.getUpdateTime() != null ? post.getUpdateTime().toString() : null);
        
        User author = userService.getById(post.getUserId());
        if (author != null) {
            PostDTO.AuthorDTO authorDTO = new PostDTO.AuthorDTO();
            authorDTO.setId(author.getId());
            authorDTO.setUsername(author.getUsername());
            authorDTO.setAvatar(author.getAvatar());
            authorDTO.setLevel(author.getLevel());
            authorDTO.setPoints(author.getPoints());
            authorDTO.setRole(author.getRole());
            dto.setAuthor(authorDTO);
        }
        
        Category category = categoryService.getById(post.getCategoryId());
        if (category != null) {
            PostDTO.CategoryDTO categoryDTO = new PostDTO.CategoryDTO();
            categoryDTO.setId(category.getId());
            categoryDTO.setName(category.getName());
            dto.setCategory(categoryDTO);
        }
        
        return dto;
    }

    private ReplyDTO convertReplyToDTO(Reply reply) {
        ReplyDTO dto = new ReplyDTO();
        dto.setId(reply.getId());
        dto.setContent(reply.getContent());
        dto.setPostId(reply.getPostId());
        dto.setParentId(reply.getParentId());
        dto.setLikeCount(reply.getLikeCount());
        dto.setStatus(reply.getStatus());
        String timeStr = reply.getCreateTime() != null ? reply.getCreateTime().toString() : null;
        dto.setCreateTime(timeStr);
        dto.setCreatedAt(timeStr);
        dto.setIsBestAnswer(false);
        
        User author = userService.getById(reply.getUserId());
        if (author != null) {
            ReplyDTO.AuthorDTO authorDTO = new ReplyDTO.AuthorDTO();
            authorDTO.setId(author.getId());
            authorDTO.setUsername(author.getUsername());
            authorDTO.setAvatar(author.getAvatar());
            authorDTO.setLevel(author.getLevel());
            authorDTO.setPoints(author.getPoints());
            authorDTO.setRole(author.getRole());
            dto.setAuthor(authorDTO);
        }
        
        Post post = postService.getById(reply.getPostId());
        if (post != null) {
            ReplyDTO.PostInfoDTO postInfo = new ReplyDTO.PostInfoDTO();
            postInfo.setId(post.getId());
            postInfo.setTitle(post.getTitle());
            dto.setPost(postInfo);
        }
        
        return dto;
    }
}