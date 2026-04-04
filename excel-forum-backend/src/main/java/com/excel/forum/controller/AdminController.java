package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.config.ExperienceProperties;
import com.excel.forum.entity.*;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.service.*;
import com.excel.forum.util.DtoConverter;
import com.excel.forum.util.DtoConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Collection;
import java.util.Objects;
import java.util.Comparator;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final PostService postService;
    private final CategoryService categoryService;
    private final ReplyService replyService;
    private final ReportService reportService;
    private final PasswordEncoder passwordEncoder;
    private final ForumEventService eventService;
    private final NotificationService notificationService;
    private final PointsRuleService pointsRuleService;
    private final PointsRecordService pointsRecordService;
    private final QuestionService questionService;
    private final SiteNotificationService siteNotificationService;
    private final PostDraftService postDraftService;
    private final ExperienceService experienceService;
    private final ExperienceProperties experienceProperties;
    private final ExperienceRuleService experienceRuleService;

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer status) {
        
        Page<User> pageRequest = new Page<>(page, size);
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        
        if (keyword != null && !keyword.isEmpty()) {
            queryWrapper.and(wrapper -> wrapper
                .like("username", keyword)
                .or()
                .like("email", keyword)
            );
        }
        
        if (role != null && !role.isEmpty()) {
            queryWrapper.eq("role", role);
        }
        
        if (status != null) {
            queryWrapper.eq("status", status);
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<User> result = userService.page(pageRequest, queryWrapper);
        
        result.getRecords().forEach(user -> user.setPassword(null));
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", result.getRecords());
        response.put("total", result.getTotal());
        response.put("current", result.getCurrent());
        response.put("size", result.getSize());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String email = (String) body.get("email");
        String password = (String) body.get("password");
        String role = (String) body.get("role");
        Integer status = body.get("status") != null ? (Integer) body.get("status") : 0;
        @SuppressWarnings("unchecked")
        List<Integer> managedCategories = (List<Integer>) body.get("managedCategories");
        
        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名不能为空"));
        }
        
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "邮箱不能为空"));
        }
        
        if (password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "密码不能为空"));
        }
        
        QueryWrapper<User> checkWrapper = new QueryWrapper<>();
        checkWrapper.eq("username", username);
        if (userService.count(checkWrapper) > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名已存在"));
        }
        
        QueryWrapper<User> emailWrapper = new QueryWrapper<>();
        emailWrapper.eq("email", email);
        if (userService.count(emailWrapper) > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "邮箱已被注册"));
        }
        
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role != null ? role : "user");
        user.setStatus(status);
        user.setLevel(1);
        user.setPoints(0);
        user.setExp(0);
        
        if ("moderator".equals(role) && managedCategories != null && !managedCategories.isEmpty()) {
            try {
                user.setManagedCategories(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(managedCategories));
            } catch (Exception e) {
                user.setManagedCategories("[]");
            }
        }
        
        userService.save(user);
        user.setPassword(null);
        
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User existingUser = userService.getById(id);
        if (existingUser == null) {
            return ResponseEntity.notFound().build();
        }
        
        String email = (String) body.get("email");
        String role = (String) body.get("role");
        Integer status = body.get("status") != null ? (Integer) body.get("status") : existingUser.getStatus();
        @SuppressWarnings("unchecked")
        List<Integer> managedCategories = (List<Integer>) body.get("managedCategories");
        
        if (email != null) {
            existingUser.setEmail(email);
        }
        if (role != null) {
            existingUser.setRole(role);
        }
        existingUser.setStatus(status);
        
        String effectiveRole = role != null ? role : existingUser.getRole();
        
        if ("moderator".equals(effectiveRole) && managedCategories != null) {
            try {
                existingUser.setManagedCategories(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(managedCategories));
            } catch (Exception e) {
                existingUser.setManagedCategories("[]");
            }
        } else if (!"moderator".equals(effectiveRole)) {
            existingUser.setManagedCategories(null);
        }
        
        userService.updateById(existingUser);
        
        existingUser = userService.getById(id);
        existingUser.setPassword(null);
        return ResponseEntity.ok(existingUser);
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        String password = body.get("password");
        if (password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "密码不能为空"));
        }
        
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "密码长度不能少于6位"));
        }
        
        user.setPassword(passwordEncoder.encode(password));
        userService.updateById(user);
        
        return ResponseEntity.ok(Map.of("message", "密码重置成功"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        userService.removeById(id);
        return ResponseEntity.ok().build();
    }

    private PostDTO convertToDTO(Post post) {
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
        dto.setReviewStatus(post.getReviewStatus());
        dto.setReviewReason(post.getReviewReason());
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

    @GetMapping("/posts")
    public ResponseEntity<?> getPosts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        
        Page<Post> pageRequest = new Page<>(page, size);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        
        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }
        
        if (status != null && !status.isEmpty()) {
            if ("active".equalsIgnoreCase(status)) {
                queryWrapper.eq("status", 0);
            } else if ("deleted".equalsIgnoreCase(status)) {
                queryWrapper.in("status", 1, 2);
            } else if ("locked".equalsIgnoreCase(status)) {
                queryWrapper.eq("is_locked", true);
            } else {
                try {
                    Integer statusValue = Integer.parseInt(status);
                    queryWrapper.eq("status", statusValue);
                } catch (NumberFormatException e) {
                    // 忽略无效的状态值
                }
            }
        }
        
        if (keyword != null && !keyword.isEmpty()) {
            queryWrapper.like("title", keyword);
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<Post> result = postService.page(pageRequest, queryWrapper);
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", DtoConverter.convertPosts(result.getRecords(), userService, categoryService, replyService));
        response.put("total", result.getTotal());
        response.put("current", result.getCurrent());
        response.put("size", result.getSize());
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/posts/{id}/status")
    public ResponseEntity<?> updatePostStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        Integer status = body.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().body("状态不能为空");
        }
        
        post.setStatus(status);
        postService.updateById(post);
        
        return ResponseEntity.ok(post);
    }

    @PutMapping("/posts/{id}/lock")
    public ResponseEntity<?> togglePostLock(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsLocked(post.getIsLocked() == null ? true : !post.getIsLocked());
        postService.updateById(post);
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of(
            "isLocked", post.getIsLocked(),
            "isTop", post.getIsTop(),
            "isEssence", post.getIsEssence()
        )));
        
        Map<String, Object> response = new HashMap<>();
        response.put("isTop", post.getIsTop());
        response.put("isEssence", post.getIsEssence());
        response.put("isLocked", post.getIsLocked());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/posts/{id}/top")
    public ResponseEntity<?> togglePostTop(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsTop(post.getIsTop() == null ? true : !post.getIsTop());
        postService.updateById(post);
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of(
            "isTop", post.getIsTop(),
            "isEssence", post.getIsEssence(),
            "isLocked", post.getIsLocked()
        )));
        
        Map<String, Object> response = new HashMap<>();
        response.put("isTop", post.getIsTop());
        response.put("isEssence", post.getIsEssence());
        response.put("isLocked", post.getIsLocked());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/posts/{id}/essence")
    public ResponseEntity<?> togglePostEssence(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsEssence(post.getIsEssence() == null ? true : !post.getIsEssence());
        postService.updateById(post);
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of(
            "isEssence", post.getIsEssence(),
            "isTop", post.getIsTop(),
            "isLocked", post.getIsLocked()
        )));
        
        Map<String, Object> response = new HashMap<>();
        response.put("isTop", post.getIsTop());
        response.put("isEssence", post.getIsEssence());
        response.put("isLocked", post.getIsLocked());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/posts/batch-lock")
    public ResponseEntity<?> batchLockPosts(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body("请选择要锁定的帖子");
        }
        
        for (Long id : ids) {
            Post post = postService.getById(id);
            if (post != null) {
                post.setIsLocked(true);
                postService.updateById(post);
            }
        }
        
        return ResponseEntity.ok(Map.of("message", "批量锁定成功"));
    }

    @PostMapping("/posts/batch-unlock")
    public ResponseEntity<?> batchUnlockPosts(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body("请选择要解锁的帖子");
        }
        
        for (Long id : ids) {
            Post post = postService.getById(id);
            if (post != null) {
                post.setIsLocked(false);
                postService.updateById(post);
            }
        }
        
        return ResponseEntity.ok(Map.of("message", "批量解锁成功"));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        String reason = body != null ? body.get("reason") : null;
        System.out.println("删除帖子ID: " + id + ", 原因: " + reason + ", 作者ID: " + post.getUserId());
        
        post.setStatus(99);
        postService.updateById(post);
        
        String notificationContent = "您的帖子「" + post.getTitle() + "」已被管理员删除";
        if (reason != null && !reason.isEmpty()) {
            notificationContent += "，原因：" + reason;
        }
        
        System.out.println("准备发送通知: " + notificationContent);
        
        try {
            notificationService.createNotification(
                post.getUserId(),
                "post_deleted",
                notificationContent,
                id
            );
            System.out.println("通知发送成功");
        } catch (Exception e) {
            System.err.println("通知发送失败: " + e.getMessage());
            e.printStackTrace();
        }
        
        eventService.publishEvent(ForumEvent.postDeleted(id));
        
        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }
    
    @PutMapping("/posts/{id}/restore")
    public ResponseEntity<?> restorePost(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setStatus(0);
        postService.updateById(post);
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of("status", 0)));
        
        return ResponseEntity.ok(Map.of("message", "恢复成功"));
    }
    
    @PostMapping("/posts")
    public ResponseEntity<?> createPost(@RequestBody Post post, @RequestAttribute("userId") Long userId) {
        if (post.getTitle() == null || post.getTitle().isEmpty()) {
            return ResponseEntity.badRequest().body("标题不能为空");
        }
        
        if (post.getContent() == null || post.getContent().isEmpty()) {
            return ResponseEntity.badRequest().body("内容不能为空");
        }
        
        if (post.getCategoryId() == null) {
            return ResponseEntity.badRequest().body("版块不能为空");
        }
        
        post.setUserId(userId);
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setReplyCount(0);
        
        if (post.getStatus() == null) {
            post.setStatus(0);
        }
        
        if (post.getType() == null) {
            post.setType(0);
        }
        
        postService.save(post);
        
        return ResponseEntity.ok(post);
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        List<Category> categories = categoryService.list();
        
        List<Map<String, Object>> result = categories.stream().map(category -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", category.getId());
            map.put("name", category.getName());
            map.put("description", category.getDescription());
            map.put("sortOrder", category.getSortOrder());
            map.put("createTime", category.getCreateTime());
            map.put("updateTime", category.getUpdateTime());
            
            QueryWrapper<Post> postWrapper = new QueryWrapper<>();
            postWrapper.eq("category_id", category.getId());
            postWrapper.eq("status", 0);
            map.put("postCount", postService.count(postWrapper));
            
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        categoryService.save(category);
        
        eventService.publishEvent(ForumEvent.categoryUpdated(category.getId()));
        
        return ResponseEntity.ok(category);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody Category category) {
        Category existingCategory = categoryService.getById(id);
        if (existingCategory == null) {
            return ResponseEntity.notFound().build();
        }
        
        category.setId(id);
        categoryService.updateById(category);
        
        eventService.publishEvent(ForumEvent.categoryUpdated(id));
        
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        Category category = categoryService.getById(id);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("category_id", id);
        long count = postService.count(queryWrapper);
        
        if (count > 0) {
            return ResponseEntity.badRequest().body("该版块下还有帖子，无法删除");
        }
        
        categoryService.removeById(id);
        
        eventService.publishEvent(ForumEvent.categoryUpdated(id));
        
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("userCount", userService.count());
        stats.put("postCount", postService.count(new QueryWrapper<Post>().eq("status", 0)));
        stats.put("replyCount", replyService.count());
        stats.put("categoryCount", categoryService.count());
        
        QueryWrapper<Report> reportWrapper = new QueryWrapper<>();
        reportWrapper.eq("status", 0);
        stats.put("pendingReports", reportService.count(reportWrapper));
        
        QueryWrapper<Post> deletedWrapper = new QueryWrapper<>();
        deletedWrapper.in("status", 1, 2);
        stats.put("deletedPostCount", postService.count(deletedWrapper));
        
        return ResponseEntity.ok(Map.of("stats", stats));
    }
    
    @GetMapping("/replies")
    public ResponseEntity<?> getReplies(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Long postId) {
        
        Page<Reply> pageRequest = new Page<>(page, size);
        QueryWrapper<Reply> queryWrapper = new QueryWrapper<>();
        
        if (postId != null) {
            queryWrapper.eq("post_id", postId);
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<Reply> result = replyService.page(pageRequest, queryWrapper);
        
        List<Map<String, Object>> replies = result.getRecords().stream().map(reply -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", reply.getId());
            map.put("content", reply.getContent());
            map.put("likeCount", reply.getLikeCount());
            map.put("createdAt", reply.getCreateTime());
            map.put("status", reply.getStatus());
            
            User author = userService.getById(reply.getUserId());
            if (author != null) {
                Map<String, Object> authorMap = new HashMap<>();
                authorMap.put("id", author.getId());
                authorMap.put("username", author.getUsername());
                authorMap.put("avatar", author.getAvatar());
                map.put("author", authorMap);
            }
            
            Post post = postService.getById(reply.getPostId());
            if (post != null) {
                Map<String, Object> postMap = new HashMap<>();
                postMap.put("id", post.getId());
                postMap.put("title", post.getTitle());
                map.put("post", postMap);
            }
            
            return map;
        }).collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("replies", replies);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/replies/{id}")
    @Transactional
    public ResponseEntity<?> deleteReply(@PathVariable Long id) {
        Reply reply = replyService.getById(id);
        if (reply == null) {
            return ResponseEntity.notFound().build();
        }

        // 删除回复及其所有后代回复
        List<Long> allDescendantIds = replyService.findAllDescendantIds(reply.getId());
        int deletedCount = 1 + allDescendantIds.size();
        if (!allDescendantIds.isEmpty()) {
            replyService.removeByIds(allDescendantIds);
        }
        replyService.removeById(id);

        if (reply.getPostId() != null) {
            postService.incrementField(reply.getPostId(), "reply_count", -deletedCount);
        }

        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }
    
    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String status) {
        
        Page<Report> pageRequest = new Page<>(page, size);
        QueryWrapper<Report> queryWrapper = new QueryWrapper<>();
        
        if (status != null && !status.isEmpty()) {
            if ("pending".equalsIgnoreCase(status)) {
                queryWrapper.eq("status", 0);
            } else if ("handled".equalsIgnoreCase(status)) {
                queryWrapper.eq("status", 1);
            } else if ("ignored".equalsIgnoreCase(status)) {
                queryWrapper.eq("status", 2);
            }
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<Report> result = reportService.page(pageRequest, queryWrapper);
        
        List<Map<String, Object>> reports = result.getRecords().stream().map(report -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", report.getId());
            map.put("targetType", report.getTargetType());
            map.put("reason", report.getReason());
            map.put("description", report.getDescription());
            map.put("status", report.getStatus() == 0 ? "pending" : report.getStatus() == 1 ? "handled" : "ignored");
            map.put("createdAt", report.getCreateTime());
            
            User reporter = userService.getById(report.getReporterId());
            if (reporter != null) {
                Map<String, Object> reporterMap = new HashMap<>();
                reporterMap.put("id", reporter.getId());
                reporterMap.put("username", reporter.getUsername());
                reporterMap.put("avatar", reporter.getAvatar());
                map.put("reporter", reporterMap);
            }
            
            if ("post".equals(report.getTargetType())) {
                Post post = postService.getById(report.getTargetId());
                if (post != null) {
                    Map<String, Object> targetMap = new HashMap<>();
                    targetMap.put("id", post.getId());
                    targetMap.put("title", post.getTitle());
                    targetMap.put("content", post.getContent());
                    map.put("target", targetMap);
                }
            } else if ("reply".equals(report.getTargetType())) {
                Reply reply = replyService.getById(report.getTargetId());
                if (reply != null) {
                    Map<String, Object> targetMap = new HashMap<>();
                    targetMap.put("id", reply.getId());
                    targetMap.put("content", reply.getContent());
                    map.put("target", targetMap);
                }
            }
            
            return map;
        }).collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("reports", reports);
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/reports/{id}/handle")
    @Transactional
    public ResponseEntity<?> handleReport(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Report report = reportService.getById(id);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        String action = body.get("action");

        if ("delete".equals(action)) {
            if ("post".equals(report.getTargetType())) {
                Post post = postService.getById(report.getTargetId());
                if (post != null) {
                    // 发送通知给帖子作者
                    notificationService.createNotification(
                        post.getUserId(),
                        "report_delete",
                        "您的帖子《" + post.getTitle() + "》因违规被管理员删除",
                        null
                    );
                    post.setStatus(99);
                    postService.updateById(post);
                }
            } else if ("reply".equals(report.getTargetType())) {
                Reply targetReply = replyService.getById(report.getTargetId());
                if (targetReply != null) {
                    // 发送通知给回复作者
                    notificationService.createNotification(
                        targetReply.getUserId(),
                        "report_delete",
                        "您的回复因违规被管理员删除",
                        targetReply.getPostId()
                    );
                    // 删除回复及其所有后代回复
                    List<Long> allDescendantIds = replyService.findAllDescendantIds(targetReply.getId());
                    int deletedCount = 1 + allDescendantIds.size();
                    if (!allDescendantIds.isEmpty()) {
                        replyService.removeByIds(allDescendantIds);
                    }
                    replyService.removeById(targetReply.getId());
                    // 更新帖子回复数
                    postService.incrementField(targetReply.getPostId(), "reply_count", -deletedCount);
                }
            }
            report.setStatus(1);
        } else if ("ignore".equals(action)) {
            report.setStatus(2);
        }

        reportService.updateById(report);

        eventService.publishEvent(ForumEvent.reportUpdated(id));

        return ResponseEntity.ok(Map.of("message", "处理成功"));
    }
    
    @DeleteMapping("/posts/{id}/permanent")
    public ResponseEntity<?> permanentDeletePost(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        QueryWrapper<Reply> replyWrapper = new QueryWrapper<>();
        replyWrapper.eq("post_id", id);
        replyService.remove(replyWrapper);
        
        postService.removeById(id);
        
        eventService.publishEvent(ForumEvent.postDeleted(id));
        
        return ResponseEntity.ok(Map.of("message", "永久删除成功"));
    }

    @GetMapping("/posts/review")
    public ResponseEntity<?> getPostsForReview(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String reviewStatus) {
        
        Page<Post> pageRequest = new Page<>(page, size);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        
        if (reviewStatus != null && !reviewStatus.isEmpty()) {
            queryWrapper.eq("review_status", reviewStatus);
        } else {
            queryWrapper.eq("review_status", "pending");
        }
        
        queryWrapper.orderByDesc("create_time");
        
        Page<Post> result = postService.page(pageRequest, queryWrapper);
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", DtoConverter.convertPosts(result.getRecords(), userService, categoryService, replyService));
        response.put("total", result.getTotal());
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/posts/{id}/review")
    public ResponseEntity<?> reviewPost(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        String previousStatus = post.getReviewStatus();
        String status = body.get("status");
        String reason = body.get("reason");
        
        if (status == null || (!status.equals("approved") && !status.equals("rejected"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "无效的审核状态"));
        }
        
        post.setReviewStatus(status);
        post.setReviewReason("approved".equals(status) ? null : reason);
        
        if ("approved".equals(status)) {
            post.setStatus(0);
        } else {
            post.setStatus(-1);
        }
        
        postService.updateById(post);

        if ("approved".equals(status) && !"approved".equals(previousStatus)) {
            experienceService.awardPostApproved(post.getUserId(), post.getId(), post.getTitle());
        }
        
        String notificationContent = "approved".equals(status) 
            ? "您的帖子「" + post.getTitle() + "」已通过审核"
            : "您的帖子「" + post.getTitle() + "」未通过审核" + (reason != null ? "，原因：" + reason : "");
        
        notificationService.createNotification(
            post.getUserId(),
            "post_review",
            notificationContent,
            id
        );
        
        return ResponseEntity.ok(Map.of("message", "审核完成"));
    }

    @GetMapping("/drafts")
    public ResponseEntity<?> getDrafts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) Boolean expired,
            @RequestParam(defaultValue = "latest") String sort) {
        Page<PostDraft> result = postDraftService.listAdminDrafts(page, size, keyword, status, categoryId, username, expired, sort);

        List<Map<String, Object>> records = result.getRecords().stream()
                .map(this::buildAdminDraftResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "records", records,
                "total", result.getTotal(),
                "current", result.getCurrent(),
                "size", result.getSize(),
                "pages", result.getPages(),
                "maxExpireDays", PostDraftService.DRAFT_EXPIRE_DAYS
        ));
    }

    @DeleteMapping("/drafts/{id}")
    public ResponseEntity<?> deleteDraftByAdmin(@PathVariable Long id) {
        try {
            postDraftService.deleteDraftByAdmin(id);
            return ResponseEntity.ok(Map.of("message", "草稿已删除"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/drafts/by-user/{userId}")
    public ResponseEntity<?> deleteDraftsByUser(@PathVariable Long userId) {
        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }

        long count = postDraftService.deleteDraftsByAdminUser(userId);
        return ResponseEntity.ok(Map.of(
                "message", count > 0 ? "已清理该用户的 " + count + " 条草稿" : "该用户当前没有草稿",
                "count", count
        ));
    }

    @GetMapping("/levels/overview")
    public ResponseEntity<?> getLevelOverview() {
        List<ExperienceProperties.LevelRule> sortedLevels = getSortedLevelRules();
        List<User> users = userService.list(new QueryWrapper<User>()
                .select("id", "username", "avatar", "level", "exp", "points", "role", "status", "create_time"));
        List<UserExpLog> todayLogs = experienceService.list(new QueryWrapper<UserExpLog>()
                .ge("create_time", LocalDateTime.now().toLocalDate().atStartOfDay()));

        int totalExp = users.stream().mapToInt(user -> safeInt(user.getExp())).sum();
        int highestLevel = users.stream().map(User::getLevel).filter(Objects::nonNull).max(Integer::compareTo).orElse(1);
        long highestLevelUsers = users.stream().filter(user -> safeInt(user.getLevel()) == highestLevel).count();
        int todayExp = todayLogs.stream().mapToInt(log -> safeInt(log.getExpChange())).sum();

        List<Map<String, Object>> levelDistribution = new ArrayList<>();
        for (ExperienceProperties.LevelRule rule : sortedLevels) {
            int level = safeInt(rule.getLevel());
            long userCount = users.stream().filter(user -> safeInt(user.getLevel()) == level).count();
            Map<String, Object> item = new HashMap<>();
            item.put("level", level);
            item.put("name", defaultText(rule.getName(), "未命名等级"));
            item.put("threshold", safeInt(rule.getThreshold()));
            item.put("userCount", userCount);
            levelDistribution.add(item);
        }

        List<Map<String, Object>> levelRules = sortedLevels.stream().map(rule -> {
            Map<String, Object> item = new HashMap<>();
            item.put("level", safeInt(rule.getLevel()));
            item.put("name", defaultText(rule.getName(), "未命名等级"));
            item.put("threshold", safeInt(rule.getThreshold()));
            return item;
        }).collect(Collectors.toList());

        List<Map<String, Object>> expRules = experienceRuleService.listOrderedRules().stream()
                .map(this::buildExpRuleResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "stats", Map.of(
                        "userCount", users.size(),
                        "totalExp", totalExp,
                        "todayExp", todayExp,
                        "highestLevel", highestLevel,
                        "highestLevelName", resolveLevelName(highestLevel),
                        "highestLevelUsers", highestLevelUsers
                ),
                "levelRules", levelRules,
                "expRules", expRules,
                "distribution", levelDistribution
        ));
    }

    @PutMapping("/levels/exp-rules/{ruleKey}")
    public ResponseEntity<?> updateExpRule(@PathVariable String ruleKey, @RequestBody ExperienceRule body) {
        ExperienceRule existing = experienceRuleService.getByRuleKey(ruleKey);
        if (existing == null) {
            return ResponseEntity.status(404).body(Map.of("message", "经验规则不存在"));
        }

        int minExp = body.getMinExp() == null ? safeInt(existing.getMinExp()) : Math.max(body.getMinExp(), 0);
        int maxExp = body.getMaxExp() == null ? safeInt(existing.getMaxExp()) : Math.max(body.getMaxExp(), 0);
        if (maxExp < minExp) {
            return ResponseEntity.badRequest().body(Map.of("message", "最大经验不能小于最小经验"));
        }

        existing.setMinExp(minExp);
        existing.setMaxExp(maxExp);
        if (body.getName() != null && !body.getName().isBlank()) {
            existing.setName(body.getName().trim());
        }
        if (body.getDescription() != null) {
            existing.setDescription(body.getDescription().trim());
        }
        if (body.getEnabled() != null) {
            existing.setEnabled(body.getEnabled());
        }

        experienceRuleService.updateById(existing);
        return ResponseEntity.ok(buildExpRuleResponse(existing));
    }

    @GetMapping("/levels/users")
    public ResponseEntity<?> getLevelUsers(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer level) {
        Page<User> pageRequest = new Page<>(page, size);
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            queryWrapper.and(wrapper -> wrapper
                    .like("username", keyword.trim())
                    .or()
                    .like("email", keyword.trim()));
        }
        if (level != null) {
            queryWrapper.eq("level", level);
        }

        queryWrapper.orderByDesc("exp").orderByDesc("level").orderByDesc("create_time");

        Page<User> result = userService.page(pageRequest, queryWrapper);
        List<Map<String, Object>> records = result.getRecords().stream()
                .map(this::buildLevelUserResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "records", records,
                "total", result.getTotal(),
                "current", result.getCurrent(),
                "size", result.getSize(),
                "pages", result.getPages()
        ));
    }

    @PutMapping("/levels/users/{id}")
    public ResponseEntity<?> updateLevelUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User existing = userService.getById(id);
        if (existing == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }

        Integer targetLevel = parseInteger(body.get("level"));
        Integer targetExp = parseInteger(body.get("exp"));
        if (targetLevel == null || targetLevel < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "等级不能为空"));
        }
        if (targetExp == null || targetExp < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "经验值不能小于 0"));
        }

        List<ExperienceProperties.LevelRule> sortedLevels = getSortedLevelRules();
        ExperienceProperties.LevelRule currentRule = sortedLevels.stream()
                .filter(rule -> safeInt(rule.getLevel()) == targetLevel)
                .findFirst()
                .orElse(null);
        if (currentRule == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "目标等级不存在"));
        }

        int minExp = safeInt(currentRule.getThreshold());
        int maxExp = Integer.MAX_VALUE;
        for (ExperienceProperties.LevelRule rule : sortedLevels) {
            if (safeInt(rule.getLevel()) == targetLevel + 1) {
                maxExp = Math.max(safeInt(rule.getThreshold()) - 1, minExp);
                break;
            }
        }

        int normalizedExp = Math.max(targetExp, minExp);
        if (maxExp != Integer.MAX_VALUE) {
            normalizedExp = Math.min(normalizedExp, maxExp);
        }

        User updated = new User();
        updated.setId(id);
        updated.setLevel(targetLevel);
        updated.setExp(normalizedExp);
        userService.updateById(updated);

        User refreshed = userService.getById(id);
        return ResponseEntity.ok(buildLevelUserResponse(refreshed));
    }

    @GetMapping("/levels/logs")
    public ResponseEntity<?> getLevelLogs(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String bizType) {
        Page<UserExpLog> pageRequest = new Page<>(page, size);
        QueryWrapper<UserExpLog> queryWrapper = new QueryWrapper<>();

        if (bizType != null && !bizType.isBlank()) {
            queryWrapper.eq("biz_type", bizType.trim());
        }

        List<User> matchedUsers = null;
        if (username != null && !username.isBlank()) {
            matchedUsers = userService.list(new QueryWrapper<User>()
                    .select("id", "username", "avatar", "level", "exp")
                    .like("username", username.trim()));
            if (matchedUsers.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "records", List.of(),
                        "total", 0,
                        "current", pageRequest.getCurrent(),
                        "size", pageRequest.getSize(),
                        "pages", 0
                ));
            }
            queryWrapper.in("user_id", matchedUsers.stream().map(User::getId).toList());
        }

        queryWrapper.orderByDesc("create_time");
        Page<UserExpLog> result = experienceService.page(pageRequest, queryWrapper);

        List<Long> userIds = result.getRecords().stream().map(UserExpLog::getUserId).distinct().toList();
        Map<Long, User> userMap = (matchedUsers != null ? matchedUsers : userService.list(new QueryWrapper<User>()
                .select("id", "username", "avatar", "level", "exp")
                .in(!userIds.isEmpty(), "id", userIds)))
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user, (left, right) -> left));

        List<Map<String, Object>> records = result.getRecords().stream()
                .map(log -> buildLevelLogResponse(log, userMap.get(log.getUserId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "records", records,
                "total", result.getTotal(),
                "current", result.getCurrent(),
                "size", result.getSize(),
                "pages", result.getPages()
        ));
    }

    @PostMapping("/levels/recalculate")
    public ResponseEntity<?> recalculateLevels() {
        List<User> users = userService.list(new QueryWrapper<User>().select("id", "level", "exp"));
        int updated = 0;

        for (User user : users) {
            Map<String, Object> progress = experienceService.getProgress(user.getExp());
            int expectedLevel = safeInt(progress.get("level"));
            if (!Objects.equals(user.getLevel(), expectedLevel)) {
                User updatedUser = new User();
                updatedUser.setId(user.getId());
                updatedUser.setLevel(expectedLevel);
                userService.updateById(updatedUser);
                updated += 1;
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", updated > 0 ? "已重新校准 " + updated + " 个用户等级" : "所有用户等级已是最新状态",
                "updated", updated
        ));
    }

    @GetMapping("/points/rules")
    public ResponseEntity<?> getPointsRules() {
        return ResponseEntity.ok(pointsRuleService.list());
    }

    @PostMapping("/points/rules")
    public ResponseEntity<?> createPointsRule(@RequestBody PointsRule rule) {
        pointsRuleService.save(rule);
        return ResponseEntity.ok(rule);
    }

    @PutMapping("/points/rules/{id}")
    public ResponseEntity<?> updatePointsRule(@PathVariable Long id, @RequestBody PointsRule rule) {
        PointsRule existing = pointsRuleService.getById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        rule.setId(id);
        pointsRuleService.updateById(rule);
        return ResponseEntity.ok(rule);
    }

    @DeleteMapping("/points/rules/{id}")
    public ResponseEntity<?> deletePointsRule(@PathVariable Long id) {
        pointsRuleService.removeById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/points/stats")
    public ResponseEntity<?> getPointsStats() {
        Map<String, Object> stats = new HashMap<>();
        
        QueryWrapper<User> activeWrapper = new QueryWrapper<>();
        activeWrapper.gt("points", 0);
        stats.put("activeUsers", userService.count(activeWrapper));
        
        stats.put("totalPoints", 0);
        stats.put("todayPoints", 0);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/points/records")
    public ResponseEntity<?> getPointsRecords(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String username) {
        return ResponseEntity.ok(pointsRecordService.getRecordsPage(page, size, username));
    }

    @GetMapping("/questions")
    public ResponseEntity<?> getQuestions(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(questionService.getQuestionsPage(page, size, type, categoryId));
    }

    @PostMapping("/questions")
    public ResponseEntity<?> createQuestion(@RequestBody Question question) {
        if (question.getTitle() == null || question.getTitle().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "题目内容不能为空"));
        }
        questionService.save(question);
        return ResponseEntity.ok(question);
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<?> updateQuestion(@PathVariable Long id, @RequestBody Question question) {
        Question existing = questionService.getById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        question.setId(id);
        questionService.updateById(question);
        return ResponseEntity.ok(question);
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long id) {
        questionService.removeById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.ok(siteNotificationService.getNotificationsPage(page, size));
    }

    @GetMapping("/notifications/stats")
    public ResponseEntity<?> getNotificationStats() {
        return ResponseEntity.ok(siteNotificationService.getStats());
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> createNotification(@RequestBody Map<String, Object> body, @RequestAttribute("userId") Long userId) {
        SiteNotification notification = buildSiteNotification(body, new SiteNotification());
        if (notification.getTitle() == null || notification.getTitle().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "标题不能为空"));
        }
        if (notification.getContent() == null || notification.getContent().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "内容不能为空"));
        }
        
        notification.setCreatedBy(userId);
        notification.setReadCount(0);
        
        if ("sent".equals(notification.getStatus())) {
            notification.setSendTime(java.time.LocalDateTime.now());
        }
        
        siteNotificationService.save(notification);
        
        if ("sent".equals(notification.getStatus())) {
            siteNotificationService.sendNotification(notification.getId());
        }
        
        return ResponseEntity.ok(notification);
    }

    @PutMapping("/notifications/{id}")
    public ResponseEntity<?> updateNotification(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        SiteNotification existing = siteNotificationService.getById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        String previousStatus = existing.getStatus();
        SiteNotification notification = buildSiteNotification(body, existing);
        notification.setId(id);
        siteNotificationService.updateById(notification);
        if (!"sent".equals(previousStatus) && "sent".equals(notification.getStatus())) {
            siteNotificationService.sendNotification(id);
            notification = siteNotificationService.getById(id);
        }
        return ResponseEntity.ok(notification);
    }

    @PutMapping("/notifications/{id}/send")
    public ResponseEntity<?> sendNotification(@PathVariable Long id) {
        SiteNotification notification = siteNotificationService.getById(id);
        if (notification == null) {
            return ResponseEntity.notFound().build();
        }
        siteNotificationService.sendNotification(id);
        return ResponseEntity.ok(Map.of("message", "发送成功"));
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        siteNotificationService.removeById(id);
        return ResponseEntity.ok().build();
    }

    private SiteNotification buildSiteNotification(Map<String, Object> body, SiteNotification notification) {
        notification.setTitle(stringValue(body.get("title")));
        notification.setContent(stringValue(body.get("content")));
        notification.setType(defaultValue(stringValue(body.get("type")), "system"));
        notification.setStatus(defaultValue(stringValue(body.get("status")), "draft"));
        notification.setTargetType(defaultValue(stringValue(body.get("targetType")), "all"));
        notification.setTargetRoles("role".equals(notification.getTargetType()) ? normalizeTargetRoles(body.get("targetRoles")) : null);

        if ("sent".equals(notification.getStatus())) {
            if (notification.getSendTime() == null) {
                notification.setSendTime(java.time.LocalDateTime.now());
            }
        } else {
            notification.setSendTime(null);
        }

        return notification;
    }

    private String normalizeTargetRoles(Object rawTargetRoles) {
        if (rawTargetRoles == null) {
            return null;
        }
        if (rawTargetRoles instanceof String value) {
            String normalized = value.trim();
            return normalized.isEmpty() ? null : normalized;
        }
        if (rawTargetRoles instanceof Collection<?> values) {
            String normalized = values.stream()
                    .map(value -> value == null ? null : value.toString().trim())
                    .filter(value -> value != null && !value.isEmpty())
                    .collect(Collectors.joining(","));
            return normalized.isEmpty() ? null : normalized;
        }
        String normalized = rawTargetRoles.toString().trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private String defaultValue(String value, String fallback) {
        return value != null ? value : fallback;
    }

    private Map<String, Object> buildAdminDraftResponse(PostDraft draft) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", draft.getId());
        response.put("userId", draft.getUserId());
        response.put("title", draft.getTitle());
        response.put("content", draft.getContent());
        response.put("categoryId", draft.getCategoryId());
        response.put("status", draft.getStatus());
        response.put("rewardPoints", draft.getRewardPoints());
        response.put("attachments", draft.getAttachments());
        response.put("tags", draft.getTags());
        response.put("createTime", draft.getCreateTime());
        response.put("updateTime", draft.getUpdateTime());
        response.put("expireTime", resolveDraftExpireTime(draft));
        response.put("expired", isDraftExpired(draft));

        User author = userService.getById(draft.getUserId());
        if (author != null) {
            Map<String, Object> authorMap = new HashMap<>();
            authorMap.put("id", author.getId());
            authorMap.put("username", author.getUsername());
            authorMap.put("avatar", author.getAvatar());
            authorMap.put("role", author.getRole());
            response.put("author", authorMap);
        }

        Category category = draft.getCategoryId() != null ? categoryService.getById(draft.getCategoryId()) : null;
        if (category != null) {
            Map<String, Object> categoryMap = new HashMap<>();
            categoryMap.put("id", category.getId());
            categoryMap.put("name", category.getName());
            response.put("category", categoryMap);
        }

        return response;
    }

    private java.time.LocalDateTime resolveDraftExpireTime(PostDraft draft) {
        java.time.LocalDateTime baseTime = draft.getUpdateTime() != null ? draft.getUpdateTime() : draft.getCreateTime();
        if (baseTime == null) {
            return null;
        }
        return baseTime.plusDays(PostDraftService.DRAFT_EXPIRE_DAYS);
    }

    private boolean isDraftExpired(PostDraft draft) {
        java.time.LocalDateTime expireTime = resolveDraftExpireTime(draft);
        return expireTime != null && !expireTime.isAfter(java.time.LocalDateTime.now());
    }

    private List<ExperienceProperties.LevelRule> getSortedLevelRules() {
        return experienceProperties.getLevels().stream()
                .sorted(Comparator.comparingInt(rule -> safeInt(rule.getThreshold())))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildLevelUserResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("avatar", user.getAvatar());
        response.put("role", user.getRole());
        response.put("status", user.getStatus());
        response.put("level", safeInt(user.getLevel()));
        response.put("levelName", resolveLevelName(safeInt(user.getLevel())));
        response.put("exp", safeInt(user.getExp()));
        response.put("points", safeInt(user.getPoints()));
        response.put("createTime", user.getCreateTime());
        response.put("progress", experienceService.getProgress(user.getExp()));
        return response;
    }

    private Map<String, Object> buildLevelLogResponse(UserExpLog log, User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", log.getId());
        response.put("bizType", log.getBizType());
        response.put("bizLabel", mapExpRuleLabel(log.getBizType()));
        response.put("bizId", log.getBizId());
        response.put("expChange", safeInt(log.getExpChange()));
        response.put("reason", log.getReason());
        response.put("createTime", log.getCreateTime());

        if (user != null) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());
            userMap.put("avatar", user.getAvatar());
            userMap.put("level", safeInt(user.getLevel()));
            userMap.put("exp", safeInt(user.getExp()));
            response.put("user", userMap);
        }

        return response;
    }

    private Map<String, Object> buildExpRuleResponse(ExperienceRule rule) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", rule.getId());
        item.put("key", rule.getRuleKey());
        item.put("label", defaultText(rule.getName(), mapExpRuleLabel(rule.getRuleKey())));
        item.put("description", rule.getDescription());
        item.put("minExp", safeInt(rule.getMinExp()));
        item.put("maxExp", safeInt(rule.getMaxExp()));
        item.put("enabled", rule.getEnabled() == null || rule.getEnabled());
        item.put("rangeText", safeInt(rule.getMinExp()) == safeInt(rule.getMaxExp())
                ? "+" + safeInt(rule.getMinExp()) + " 经验"
                : safeInt(rule.getMinExp()) + "-" + safeInt(rule.getMaxExp()) + " 经验");
        return item;
    }

    private String resolveLevelName(int level) {
        return getSortedLevelRules().stream()
                .filter(rule -> safeInt(rule.getLevel()) == level)
                .map(ExperienceProperties.LevelRule::getName)
                .findFirst()
                .orElse("未命名等级");
    }

    private String mapExpRuleLabel(String ruleKey) {
        if (ruleKey == null || ruleKey.isBlank()) {
            return "未知来源";
        }
        return switch (ruleKey) {
            case ExperienceService.BIZ_POST_DIRECT_PUBLISH -> "直接发帖";
            case ExperienceService.BIZ_POST_APPROVED -> "帖子过审";
            case ExperienceService.BIZ_REPLY_CREATE -> "发布回复";
            case ExperienceService.BIZ_DAILY_CHECKIN -> "每日签到";
            default -> ruleKey;
        };
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private int safeInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private Integer parseInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
