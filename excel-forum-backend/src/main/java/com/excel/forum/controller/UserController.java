package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.*;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.dto.ReplyDTO;
import com.excel.forum.service.*;
import com.excel.forum.util.DtoConverter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
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
    private final FollowService followService;
    private final PostViewService postViewService;
    private final NotificationService notificationService;
    private final CategoryFollowService categoryFollowService;
    private final PostDraftService postDraftService;
    private final MessageService messageService;
    private final ExperienceService experienceService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        user.setPassword(null);

        Long currentUserId = (Long) request.getAttribute("userId");
        boolean isSelf = currentUserId != null && currentUserId.equals(id);
        boolean isPublicProfile = isSelf || !Boolean.FALSE.equals(user.getPublicProfile());
        boolean canShowOnlineStatus = isSelf || !Boolean.FALSE.equals(user.getShowOnlineStatus());

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("avatar", user.getAvatar());
        response.put("level", user.getLevel());
        response.put("points", user.getPoints());
        response.put("exp", user.getExp());
        response.put("status", user.getStatus());
        response.put("role", user.getRole());
        response.put("createTime", user.getCreateTime());
        response.put("updateTime", user.getUpdateTime());
        response.put("publicProfile", isPublicProfile);
        response.put("showOnlineStatus", canShowOnlineStatus);
        response.put("allowMessages", user.getAllowMessages() == null || user.getAllowMessages());
        response.put("showFollowing", user.getShowFollowing() == null || user.getShowFollowing());
        response.put("showFollowers", user.getShowFollowers() == null || user.getShowFollowers());

        if (isSelf) {
            response.put("email", user.getEmail());
        }
        if (isPublicProfile) {
            response.put("bio", user.getBio());
            response.put("gender", user.getGender());
            response.put("excelLevel", user.getExcelLevel());
            response.put("expertise", user.getExpertise());
        } else {
            response.put("bio", null);
            response.put("gender", null);
            response.put("excelLevel", null);
            response.put("expertise", null);
        }
        if (canShowOnlineStatus) {
            response.put("isOnline", user.getIsOnline());
            response.put("lastActiveTime", user.getLastActiveTime());
        } else {
            response.put("isOnline", null);
            response.put("lastActiveTime", null);
        }

        // 统计帖子数和回复数
        QueryWrapper<Post> postQuery = new QueryWrapper<>();
        postQuery.eq("user_id", id).in("status", 0, 1);
        response.put("postCount", postService.count(postQuery));

        QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
        replyQuery.eq("user_id", id).eq("status", 0);
        response.put("replyCount", replyService.count(replyQuery));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/center-overview")
    public ResponseEntity<?> getPublicCenterOverview(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }

        Long currentUserId = (Long) request.getAttribute("userId");
        boolean isSelf = currentUserId != null && currentUserId.equals(id);
        boolean canShowFollowing = isSelf || !Boolean.FALSE.equals(user.getShowFollowing());
        boolean canShowFollowers = isSelf || !Boolean.FALSE.equals(user.getShowFollowers());

        long publishedPosts = countUserPosts(id, wrapper -> {
            wrapper.eq("status", 0);
            wrapper.and(inner -> inner.eq("review_status", "approved").or().isNull("review_status"));
        });
        long favoriteCount = countUserFavorites(id);
        long postLikeCount = countUserPostLikes(id);
        long replyLikeCount = countUserReplyLikes(id);
        long receivedLikeCount = postLikeCount + replyLikeCount;
        long followerCount = canShowFollowers ? followService.getFollowerIds(id).size() : 0;
        long recentFollowerCount = canShowFollowers ? countRecentFollowers(id, 7) : 0;
        long followingCount = canShowFollowing ? followService.getFollowingIds(id).size() : 0;
        long categoryFollowCount = canShowFollowing ? categoryFollowService.getFollowedCategoryIds(id).size() : 0;

        Map<String, Object> response = new HashMap<>();
        response.put("user", buildPublicCenterUser(user, currentUserId));
        Map<String, Object> stats = new HashMap<>();
        stats.put("publishedPosts", publishedPosts);
        stats.put("favoriteCount", favoriteCount);
        stats.put("postLikeCount", postLikeCount);
        stats.put("replyLikeCount", replyLikeCount);
        stats.put("receivedLikeCount", receivedLikeCount);
        stats.put("followerCount", followerCount);
        stats.put("recentFollowerCount", recentFollowerCount);
        stats.put("followingCount", followingCount);
        stats.put("categoryFollowCount", categoryFollowCount);
        response.put("stats", stats);
        response.put("privacy", Map.of(
                "publicProfile", user.getPublicProfile() == null || user.getPublicProfile(),
                "showOnlineStatus", user.getShowOnlineStatus() == null || user.getShowOnlineStatus(),
                "allowMessages", user.getAllowMessages() == null || user.getAllowMessages(),
                "showFollowing", user.getShowFollowing() == null || user.getShowFollowing(),
                "showFollowers", user.getShowFollowers() == null || user.getShowFollowers()
        ));
        Map<String, Object> accountStatus = new HashMap<>();
        accountStatus.put("status", user.getStatus());
        accountStatus.put("label", resolveAccountStatusLabel(user.getStatus()));
        accountStatus.put("description", resolveAccountStatusDescription(user.getStatus()));
        response.put("accountStatus", accountStatus);
        response.put("expProgress", experienceService.getProgress(user.getExp()));
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
        if (body.containsKey("gender")) {
            String gender = body.get("gender") == null ? null : String.valueOf(body.get("gender")).trim();
            if (gender == null || gender.isBlank()) {
                user.setGender(null);
            } else if ("male".equals(gender) || "female".equals(gender)) {
                user.setGender(gender);
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "性别设置无效"));
            }
        }
        if (body.containsKey("avatar")) {
            user.setAvatar((String) body.get("avatar"));
        }
        if (body.containsKey("expertise")) {
            Object expertise = body.get("expertise");
            if (expertise instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> expertiseList = (List<String>) expertise;
                user.setExpertise(String.join(",", expertiseList));
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
        
        List<PostDTO> dtoList = DtoConverter.convertPosts(result.getRecords(), userService, categoryService, replyService);

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

        List<Post> postList = favResult.getRecords().stream()
            .map(fav -> postService.getById(fav.getPostId()))
            .filter(post -> post != null)
            .collect(Collectors.toList());
        List<PostDTO> posts = DtoConverter.convertPosts(postList, userService, categoryService, replyService);
        
        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("total", favResult.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q) {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.like("username", q);
        queryWrapper.last("LIMIT 10");  // 硬编码常量，无注入风险
        
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
            @RequestParam(defaultValue = "10") Integer limit,
            HttpServletRequest request) {

        User targetUser = userService.getById(id);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }
        Long currentUserId = (Long) request.getAttribute("userId");
        boolean canShowFollowing = (currentUserId != null && currentUserId.equals(id))
                || !Boolean.FALSE.equals(targetUser.getShowFollowing());
        if (!canShowFollowing) {
            return ResponseEntity.ok(Map.of("users", Collections.emptyList(), "total", 0));
        }

        List<Long> followingIds = followService.getFollowingIds(id);
        int total = followingIds.size();
        int fromIndex = (page - 1) * limit;
        int toIndex = Math.min(fromIndex + limit, total);

        List<Long> pageIds = fromIndex >= total
            ? Collections.emptyList()
            : followingIds.subList(fromIndex, toIndex);

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
            @RequestParam(defaultValue = "10") Integer limit,
            HttpServletRequest request) {

        User targetUser = userService.getById(id);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }
        Long currentUserId = (Long) request.getAttribute("userId");
        boolean canShowFollowers = (currentUserId != null && currentUserId.equals(id))
                || !Boolean.FALSE.equals(targetUser.getShowFollowers());
        if (!canShowFollowers) {
            return ResponseEntity.ok(Map.of("users", Collections.emptyList(), "total", 0));
        }

        List<Long> followerIds = followService.getFollowerIds(id);
        int total = followerIds.size();
        int fromIndex = (page - 1) * limit;
        int toIndex = Math.min(fromIndex + limit, total);

        List<Long> pageIds = fromIndex >= total
            ? Collections.emptyList()
            : followerIds.subList(fromIndex, toIndex);

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
        
        List<Post> postList = result.getRecords().stream()
            .map(pv -> postService.getById(pv.getPostId()))
            .filter(post -> post != null && (post.getStatus() == 0 || post.getStatus() == 1))
            .collect(Collectors.toList());
        List<PostDTO> posts = DtoConverter.convertPosts(postList, userService, categoryService, replyService);
        
        Map<String, Object> response = new HashMap<>();
        response.put("posts", posts);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/center/overview")
    public ResponseEntity<?> getCenterOverview(@RequestAttribute Long userId) {
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }

        long publishedPosts = countUserPosts(userId, wrapper -> {
            wrapper.eq("status", 0);
            wrapper.and(inner -> inner.eq("review_status", "approved").or().isNull("review_status"));
        });
        long pendingPosts = countUserPosts(userId, wrapper -> wrapper.eq("review_status", "pending"));
        long rejectedPosts = countUserPosts(userId, wrapper -> wrapper.eq("review_status", "rejected"));
        long replyCount = countUserReplies(userId);
        long favoriteCount = countUserFavorites(userId);
        long historyCount = countUserHistory(userId);
        long draftCount = postDraftService.countUserDrafts(userId);
        long editingDraftCount = postDraftService.countEditingDrafts(userId);
        long expiringDraftCount = countExpiringDrafts(userId, 3);
        long postLikeCount = countUserPostLikes(userId);
        long replyLikeCount = countUserReplyLikes(userId);
        long receivedLikeCount = postLikeCount + replyLikeCount;
        long followerCount = followService.getFollowerIds(userId).size();
        long recentFollowerCount = countRecentFollowers(userId, 7);
        long followingCount = followService.getFollowingIds(userId).size();
        long categoryFollowCount = categoryFollowService.getFollowedCategoryIds(userId).size();
        long unreadNotifications = countUnreadNotifications(userId);
        int unreadMessages = messageService.getUnreadCount(userId);
        int conversationCount = extractConversationCount(messageService.getConversations(userId));

        PostDraft recentDraft = getLatestDraft(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("user", buildCenterUser(user));
        Map<String, Object> stats = new HashMap<>();
        stats.put("publishedPosts", publishedPosts);
        stats.put("pendingPosts", pendingPosts);
        stats.put("rejectedPosts", rejectedPosts);
        stats.put("replyCount", replyCount);
        stats.put("favoriteCount", favoriteCount);
        stats.put("historyCount", historyCount);
        stats.put("draftCount", draftCount);
        stats.put("editingDraftCount", editingDraftCount);
        stats.put("expiringDraftCount", expiringDraftCount);
        stats.put("postLikeCount", postLikeCount);
        stats.put("replyLikeCount", replyLikeCount);
        stats.put("receivedLikeCount", receivedLikeCount);
        stats.put("followerCount", followerCount);
        stats.put("recentFollowerCount", recentFollowerCount);
        stats.put("followingCount", followingCount);
        stats.put("categoryFollowCount", categoryFollowCount);
        stats.put("unreadNotifications", unreadNotifications);
        stats.put("unreadMessages", unreadMessages);
        stats.put("conversationCount", conversationCount);
        response.put("stats", stats);
        response.put("privacy", Map.of(
                "publicProfile", user.getPublicProfile() == null || user.getPublicProfile(),
                "showOnlineStatus", user.getShowOnlineStatus() == null || user.getShowOnlineStatus(),
                "allowMessages", user.getAllowMessages() == null || user.getAllowMessages(),
                "showFollowing", user.getShowFollowing() == null || user.getShowFollowing(),
                "showFollowers", user.getShowFollowers() == null || user.getShowFollowers()
        ));
        Map<String, Object> accountStatus = new HashMap<>();
        accountStatus.put("status", user.getStatus());
        accountStatus.put("label", resolveAccountStatusLabel(user.getStatus()));
        accountStatus.put("description", resolveAccountStatusDescription(user.getStatus()));
        response.put("accountStatus", accountStatus);
        response.put("recentDraft", recentDraft != null ? serializeDraftSummary(recentDraft) : null);
        response.put("recentNotifications", getRecentNotifications(userId, 5));
        response.put("expProgress", experienceService.getProgress(user.getExp()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/center/exp-logs")
    public ResponseEntity<?> getCenterExpLogs(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.ok(experienceService.getUserExpLogs(userId, page, size));
    }

    @GetMapping("/center/activity")
    public ResponseEntity<?> getCenterActivity(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "12") Integer limit) {
        List<Map<String, Object>> activities = new ArrayList<>();

        QueryWrapper<Notification> notificationQuery = new QueryWrapper<>();
        notificationQuery.eq("user_id", userId).orderByDesc("create_time").last("LIMIT 6");
        notificationService.list(notificationQuery).forEach(notification ->
                activities.add(buildActivityItem(
                        "notification",
                        notification.getId(),
                        notificationTitle(notification.getType()),
                        notification.getContent(),
                        notification.getCreateTime(),
                        "/notifications",
                        notification.getType()
                )));

        QueryWrapper<PostDraft> draftQuery = new QueryWrapper<>();
        draftQuery.eq("user_id", userId).orderByDesc("update_time").last("LIMIT 4");
        postDraftService.list(draftQuery).forEach(draft ->
                activities.add(buildActivityItem(
                        "draft",
                        draft.getId(),
                        "保存草稿",
                        (draft.getTitle() == null || draft.getTitle().isBlank() ? "未命名草稿" : draft.getTitle()) + " · " + resolveDraftStatusLabel(draft.getStatus()),
                        draft.getUpdateTime() != null ? draft.getUpdateTime() : draft.getCreateTime(),
                        "/drafts/" + draft.getId() + "/edit",
                        draft.getStatus()
                )));

        QueryWrapper<Post> postQuery = new QueryWrapper<>();
        postQuery.eq("user_id", userId).ne("status", 99).orderByDesc("update_time").last("LIMIT 4");
        postService.list(postQuery).forEach(post ->
                activities.add(buildActivityItem(
                        "post",
                        post.getId(),
                        resolvePostActivityTitle(post),
                        post.getTitle(),
                        post.getUpdateTime() != null ? post.getUpdateTime() : post.getCreateTime(),
                        "/post/" + post.getId(),
                        resolvePostBucket(post)
                )));

        QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
        replyQuery.eq("user_id", userId).eq("status", 0).orderByDesc("create_time").last("LIMIT 4");
        replyService.list(replyQuery).forEach(reply ->
                activities.add(buildActivityItem(
                        "reply",
                        reply.getId(),
                        "发布回复",
                        summarizeText(reply.getContent(), 48),
                        reply.getCreateTime(),
                        "/post/" + reply.getPostId(),
                        "reply"
                )));

        activities.sort((left, right) -> {
            LocalDateTime rightTime = (LocalDateTime) right.get("_time");
            LocalDateTime leftTime = (LocalDateTime) left.get("_time");
            if (leftTime == null && rightTime == null) {
                return 0;
            }
            if (leftTime == null) {
                return 1;
            }
            if (rightTime == null) {
                return -1;
            }
            return rightTime.compareTo(leftTime);
        });

        List<Map<String, Object>> result = activities.stream()
                .limit(limit)
                .peek(item -> item.remove("_time"))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("activities", result));
    }

    @GetMapping("/center/posts")
    public ResponseEntity<?> getCenterPosts(
            @RequestAttribute Long userId,
            @RequestParam(defaultValue = "published") String bucket,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit) {
        Page<Post> pageRequest = new Page<>(page, limit);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).ne("status", 99).orderByDesc("update_time");

        switch (bucket) {
            case "pending" -> queryWrapper.eq("review_status", "pending");
            case "rejected" -> queryWrapper.eq("review_status", "rejected");
            default -> {
                queryWrapper.eq("status", 0);
                queryWrapper.and(wrapper -> wrapper.eq("review_status", "approved").or().isNull("review_status"));
            }
        }

        Page<Post> result = postService.page(pageRequest, queryWrapper);
        List<PostDTO> posts = DtoConverter.convertPosts(result.getRecords(), userService, categoryService, replyService);
        return ResponseEntity.ok(Map.of(
                "records", posts,
                "total", result.getTotal(),
                "current", result.getCurrent(),
                "size", result.getSize()
        ));
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

    private long countUserPosts(Long userId, java.util.function.Consumer<QueryWrapper<Post>> customizer) {
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).ne("status", 99);
        customizer.accept(queryWrapper);
        return postService.count(queryWrapper);
    }

    private long countUserReplies(Long userId) {
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("status", 0);
        return replyService.count(queryWrapper);
    }

    private long countUserFavorites(Long userId) {
        QueryWrapper<Favorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        return favoriteService.count(queryWrapper);
    }

    private long countUserHistory(Long userId) {
        QueryWrapper<PostView> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).isNotNull("post_id");
        return postViewService.count(queryWrapper);
    }

    private long countUserPostLikes(Long userId) {
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("COALESCE(SUM(like_count), 0) AS total");
        queryWrapper.eq("user_id", userId).ne("status", 99);
        return extractTotalValue(postService.getMap(queryWrapper));
    }

    private long countUserReplyLikes(Long userId) {
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("COALESCE(SUM(like_count), 0) AS total");
        queryWrapper.eq("user_id", userId).eq("status", 0);
        return extractTotalValue(replyService.getMap(queryWrapper));
    }

    private long countRecentFollowers(Long userId, int days) {
        QueryWrapper<Follow> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("follow_user_id", userId)
                .ge("create_time", LocalDateTime.now().minusDays(days));
        return followService.count(queryWrapper);
    }

    private long countUnreadNotifications(Long userId) {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).eq("is_read", 0);
        return notificationService.count(queryWrapper);
    }

    private long countExpiringDrafts(Long userId, int thresholdDays) {
        LocalDateTime warningCutoff = LocalDateTime.now().minusDays(PostDraftService.DRAFT_EXPIRE_DAYS - thresholdDays);
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId)
                .and(wrapper -> wrapper.le("update_time", warningCutoff)
                        .or(nested -> nested.isNull("update_time").le("create_time", warningCutoff)));
        return postDraftService.count(queryWrapper);
    }

    private PostDraft getLatestDraft(Long userId) {
        QueryWrapper<PostDraft> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).orderByDesc("update_time").last("LIMIT 1");
        return postDraftService.getOne(queryWrapper, false);
    }

    private int extractConversationCount(Map<String, Object> conversationsResult) {
        Object conversations = conversationsResult.get("conversations");
        if (conversations instanceof List<?> list) {
            return list.size();
        }
        return 0;
    }

    private long extractTotalValue(Map<String, Object> valueMap) {
        if (valueMap == null || valueMap.get("total") == null) {
            return 0L;
        }
        Object total = valueMap.get("total");
        if (total instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(total.toString());
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private Map<String, Object> buildCenterUser(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("avatar", user.getAvatar());
        response.put("bio", user.getBio());
        response.put("gender", user.getGender());
        response.put("level", user.getLevel());
        response.put("points", user.getPoints());
        response.put("exp", user.getExp());
        response.put("role", user.getRole());
        response.put("status", user.getStatus());
        response.put("excelLevel", user.getExcelLevel());
        response.put("expertise", user.getExpertise());
        response.put("isOnline", user.getIsOnline());
        response.put("lastActiveTime", user.getLastActiveTime());
        response.put("createTime", user.getCreateTime());
        return response;
    }

    private Map<String, Object> buildPublicCenterUser(User user, Long currentUserId) {
        boolean isSelf = currentUserId != null && currentUserId.equals(user.getId());
        boolean isPublicProfile = isSelf || !Boolean.FALSE.equals(user.getPublicProfile());
        boolean canShowOnlineStatus = isSelf || !Boolean.FALSE.equals(user.getShowOnlineStatus());

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("avatar", user.getAvatar());
        response.put("level", user.getLevel());
        response.put("points", user.getPoints());
        response.put("exp", user.getExp());
        response.put("role", user.getRole());
        response.put("status", user.getStatus());
        response.put("createTime", user.getCreateTime());
        response.put("gender", isPublicProfile ? user.getGender() : null);
        response.put("allowMessages", user.getAllowMessages() == null || user.getAllowMessages());
        response.put("showFollowing", user.getShowFollowing() == null || user.getShowFollowing());
        response.put("showFollowers", user.getShowFollowers() == null || user.getShowFollowers());
        response.put("publicProfile", isPublicProfile);
        response.put("showOnlineStatus", canShowOnlineStatus);

        if (isSelf) {
            response.put("email", user.getEmail());
        }
        if (isPublicProfile) {
            response.put("bio", user.getBio());
            response.put("excelLevel", user.getExcelLevel());
            response.put("expertise", user.getExpertise());
        } else {
            response.put("bio", null);
            response.put("excelLevel", null);
            response.put("expertise", null);
        }
        if (canShowOnlineStatus) {
            response.put("isOnline", user.getIsOnline());
            response.put("lastActiveTime", user.getLastActiveTime());
        } else {
            response.put("isOnline", null);
            response.put("lastActiveTime", null);
        }
        return response;
    }

    private List<Map<String, Object>> getRecentNotifications(Long userId, int limit) {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId).orderByDesc("create_time").last("LIMIT " + limit);
        return notificationService.list(queryWrapper).stream()
                .map(notification -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", notification.getId());
                    item.put("type", notification.getType());
                    item.put("title", notificationTitle(notification.getType()));
                    item.put("content", notification.getContent());
                    item.put("isRead", notification.getIsRead());
                    item.put("createTime", notification.getCreateTime());
                    item.put("link", "/notifications");
                    return item;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> serializeDraftSummary(PostDraft draft) {
        LocalDateTime baseTime = draft.getUpdateTime() != null ? draft.getUpdateTime() : draft.getCreateTime();
        LocalDateTime expireTime = baseTime != null ? baseTime.plusDays(PostDraftService.DRAFT_EXPIRE_DAYS) : null;
        Map<String, Object> result = new HashMap<>();
        result.put("id", draft.getId());
        result.put("title", draft.getTitle());
        result.put("status", draft.getStatus());
        result.put("statusLabel", resolveDraftStatusLabel(draft.getStatus()));
        result.put("updateTime", draft.getUpdateTime());
        result.put("expireTime", expireTime);
        return result;
    }

    private String resolveDraftStatusLabel(String status) {
        if (PostDraftService.STATUS_EDITING.equals(status)) {
            return "继续编辑中";
        }
        return "已暂存";
    }

    private String resolvePostActivityTitle(Post post) {
        String bucket = resolvePostBucket(post);
        return switch (bucket) {
            case "pending" -> "帖子进入审核";
            case "rejected" -> "帖子审核未通过";
            default -> "发布帖子";
        };
    }

    private String resolvePostBucket(Post post) {
        if ("pending".equals(post.getReviewStatus())) {
            return "pending";
        }
        if ("rejected".equals(post.getReviewStatus())) {
            return "rejected";
        }
        return "published";
    }

    private Map<String, Object> buildActivityItem(String kind, Long id, String title, String description, LocalDateTime time, String link, String status) {
        Map<String, Object> item = new HashMap<>();
        item.put("kind", kind);
        item.put("id", id);
        item.put("title", title);
        item.put("description", description);
        item.put("time", time);
        item.put("link", link);
        item.put("status", status);
        item.put("_time", time);
        return item;
    }

    private String notificationTitle(String type) {
        return switch (type) {
            case "reply" -> "收到回复";
            case "like" -> "收到点赞";
            case "favorite" -> "帖子被收藏";
            case "follow" -> "新增粉丝";
            case "message" -> "收到私信";
            case "MENTION" -> "有人提到了你";
            case "post_review" -> "审核结果";
            case "post_deleted" -> "帖子被删除";
            case "site_notification" -> "全站公告";
            case "level_up" -> "等级提升";
            default -> "通知更新";
        };
    }

    private String summarizeText(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        String normalized = content.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength) + "...";
    }

    private String resolveAccountStatusLabel(Integer status) {
        if (status == null || status == 0) {
            return "正常";
        }
        if (status == 1) {
            return "受限";
        }
        if (status == 2) {
            return "封禁";
        }
        return "状态未知";
    }

    private String resolveAccountStatusDescription(Integer status) {
        if (status == null || status == 0) {
            return "当前账号状态正常，可继续发帖、回复与互动。";
        }
        if (status == 1) {
            return "账号当前存在部分限制，如发言或操作范围受限。";
        }
        if (status == 2) {
            return "账号当前已被封禁，如有疑问请联系管理员。";
        }
        return "请前往设置或联系管理员确认账号状态。";
    }
}
