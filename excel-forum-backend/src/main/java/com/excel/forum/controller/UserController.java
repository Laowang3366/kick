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
    private final NotificationService notificationService;
    private final CategoryFollowService categoryFollowService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setPassword(null);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("avatar", user.getAvatar());
        response.put("bio", user.getBio());
        response.put("level", user.getLevel());
        response.put("points", user.getPoints());
        response.put("status", user.getStatus());
        response.put("role", user.getRole());
        response.put("excelLevel", user.getExcelLevel());
        response.put("expertise", user.getExpertise());
        response.put("isOnline", user.getIsOnline());
        response.put("lastActiveTime", user.getLastActiveTime());
        response.put("createTime", user.getCreateTime());
        response.put("updateTime", user.getUpdateTime());

        // 统计帖子数和回复数
        QueryWrapper<Post> postQuery = new QueryWrapper<>();
        postQuery.eq("user_id", id).in("status", 0, 1);
        response.put("postCount", postService.count(postQuery));

        QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
        replyQuery.eq("user_id", id).eq("status", 0);
        response.put("replyCount", replyService.count(replyQuery));

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @RequestAttribute Long userId,
            @RequestBody Map<String, Object> body) {

        if (!userId.equals(id)) {
            return ResponseEntity.status(403).body(Map.of("message", "只能修改自己的资料"));
        }

        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (body.containsKey("username")) {
            String newUsername = (String) body.get("username");
            if (newUsername != null && !newUsername.isBlank()) {
                User existing = userService.findByUsername(newUsername);
                if (existing != null && !existing.getId().equals(id)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "用户名已被占用"));
                }
                user.setUsername(newUsername.trim());
            }
        }
        if (body.containsKey("bio")) {
            user.setBio((String) body.get("bio"));
        }
        if (body.containsKey("avatar")) {
            user.setAvatar((String) body.get("avatar"));
        }
        if (body.containsKey("expertise")) {
            Object expertise = body.get("expertise");
            if (expertise instanceof List) {
                user.setExpertise(String.join(",", (List<String>) expertise));
            } else if (expertise instanceof String) {
                user.setExpertise((String) expertise);
            }
        }

        userService.updateById(user);

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
        queryWrapper.inSql("post_id", "SELECT id FROM post WHERE status IN (0, 1)");
        queryWrapper.orderByDesc("create_time");

        Page<Reply> result = replyService.page(pageRequest, queryWrapper);

        List<ReplyDTO> dtoList = result.getRecords().stream()
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
        favQuery.inSql("post_id", "SELECT id FROM post WHERE status IN (0, 1)");
        favQuery.orderByDesc("create_time");

        Page<Favorite> favResult = favoriteService.page(favPage, favQuery);

        List<PostDTO> posts = favResult.getRecords().stream()
            .map(fav -> postService.getById(fav.getPostId()))
            .filter(post -> post != null)
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
    public ResponseEntity<?> getUserFollowing(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {

        List<Long> followingIds = followService.getFollowingIds(id);
        int total = followingIds.size();
        int fromIndex = (page - 1) * limit;
        int toIndex = Math.min(fromIndex + limit, total);

        List<Long> pageIds = followingIds.subList(fromIndex, toIndex);

        List<User> followingUsers = pageIds.stream()
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
        response.put("total", total);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/followers")
    public ResponseEntity<?> getUserFollowers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {

        List<Long> followerIds = followService.getFollowerIds(id);
        int total = followerIds.size();
        int fromIndex = (page - 1) * limit;
        int toIndex = Math.min(fromIndex + limit, total);

        List<Long> pageIds = followerIds.subList(fromIndex, toIndex);

        List<User> followerUsers = pageIds.stream()
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
        response.put("total", total);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<?> followUser(@PathVariable Long id, @RequestAttribute Long userId) {
        if (userId.equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "不能关注自己"));
        }
        
        followService.follow(userId, id);

        // 给被关注者发送通知
        User follower = userService.getById(userId);
        if (follower != null) {
            String notificationContent = follower.getUsername() + " 关注了你";
            notificationService.createNotification(id, "follow", notificationContent, userId, userId);
        }

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

    // 板块关注端点
    @GetMapping("/category-follows")
    public ResponseEntity<?> getFollowedCategories(@RequestAttribute Long userId) {
        List<Long> categoryIds = categoryFollowService.getFollowedCategoryIds(userId);
        List<Map<String, Object>> categories = categoryIds.stream()
            .map(catId -> {
                Category cat = categoryService.getById(catId);
                if (cat == null) return null;
                Map<String, Object> map = new HashMap<>();
                map.put("id", cat.getId());
                map.put("name", cat.getName());
                map.put("description", cat.getDescription());
                QueryWrapper<Post> postQuery = new QueryWrapper<>();
                postQuery.eq("category_id", catId);
                postQuery.eq("status", 0);
                map.put("postCount", postService.count(postQuery));
                return map;
            })
            .filter(item -> item != null)
            .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("categories", categories, "total", categories.size()));
    }

    @PostMapping("/category-follows/{categoryId}")
    public ResponseEntity<?> followCategory(@PathVariable Long categoryId, @RequestAttribute Long userId) {
        Category category = categoryService.getById(categoryId);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        categoryFollowService.follow(userId, categoryId);
        return ResponseEntity.ok(Map.of("message", "关注成功"));
    }

    @DeleteMapping("/category-follows/{categoryId}")
    public ResponseEntity<?> unfollowCategory(@PathVariable Long categoryId, @RequestAttribute Long userId) {
        categoryFollowService.unfollow(userId, categoryId);
        return ResponseEntity.ok(Map.of("message", "取消关注成功"));
    }

    @GetMapping("/category-follows/{categoryId}/status")
    public ResponseEntity<?> isFollowingCategory(@PathVariable Long categoryId, @RequestAttribute Long userId) {
        boolean isFollowing = categoryFollowService.isFollowing(userId, categoryId);
        return ResponseEntity.ok(Map.of("isFollowing", isFollowing));
    }

    @GetMapping("/privacy")
    public ResponseEntity<?> getPrivacySettings(@RequestAttribute Long userId) {
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> settings = new HashMap<>();
        settings.put("publicProfile", user.getPublicProfile() != null ? user.getPublicProfile() : true);
        settings.put("showOnlineStatus", user.getShowOnlineStatus() != null ? user.getShowOnlineStatus() : true);
        settings.put("allowMessages", user.getAllowMessages() != null ? user.getAllowMessages() : true);
        settings.put("showFollowing", user.getShowFollowing() != null ? user.getShowFollowing() : true);
        settings.put("showFollowers", user.getShowFollowers() != null ? user.getShowFollowers() : true);
        
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/privacy")
    public ResponseEntity<?> updatePrivacySettings(
            @RequestAttribute Long userId,
            @RequestBody Map<String, Boolean> body) {
        
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (body.containsKey("publicProfile")) {
            user.setPublicProfile(body.get("publicProfile"));
        }
        if (body.containsKey("showOnlineStatus")) {
            user.setShowOnlineStatus(body.get("showOnlineStatus"));
        }
        if (body.containsKey("allowMessages")) {
            user.setAllowMessages(body.get("allowMessages"));
        }
        if (body.containsKey("showFollowing")) {
            user.setShowFollowing(body.get("showFollowing"));
        }
        if (body.containsKey("showFollowers")) {
            user.setShowFollowers(body.get("showFollowers"));
        }
        
        userService.updateById(user);
        
        return ResponseEntity.ok(Map.of("message", "隐私设置已更新"));
    }
}