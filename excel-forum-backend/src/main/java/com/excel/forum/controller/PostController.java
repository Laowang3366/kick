package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.excel.forum.entity.*;
import com.excel.forum.mapper.AdminLogMapper;
import com.excel.forum.mapper.PostEditHistoryMapper;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.dto.ReplyDTO;
import com.excel.forum.service.*;
import com.excel.forum.service.dto.PostPublishCommand;
import com.excel.forum.service.dto.PostPublishResult;
import com.excel.forum.util.DtoConverter;
import com.excel.forum.util.HtmlSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Collections;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;
    private final UserService userService;
    private final CategoryService categoryService;
    private final ReplyService replyService;
    private final LikeService likeService;
    private final FavoriteService favoriteService;
    private final PostViewService postViewService;
    private final PostShareService postShareService;
    private final PostPublishingService postPublishingService;
    private final ForumEventService eventService;
    private final NotificationService notificationService;
    private final ExperienceService experienceService;
    private final ExperienceRuleService experienceRuleService;
    private final PointsTaskService pointsTaskService;
    private final UserEntitlementService userEntitlementService;
    private final AdminLogMapper adminLogMapper;
    private final PostEditHistoryMapper postEditHistoryMapper;
    private final HtmlSanitizer htmlSanitizer;

    @PostMapping
    @Transactional
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        User author = userService.getById(userId);
        if (author == null) {
            return ResponseEntity.status(404).body(Map.of("message", "用户不存在"));
        }
        if (Boolean.TRUE.equals(author.getIsMuted())) {
            return ResponseEntity.status(403).body(Map.of("message", "当前账号已被禁言，暂时无法发帖"));
        }

        String title = (String) body.get("title");
        String content = (String) body.get("content");
        Object categoryIdObj = body.get("categoryId");
        if (categoryIdObj == null) {
            categoryIdObj = body.get("forumId");
        }
        if (categoryIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "请选择版块"));
        }
        Long categoryId = Long.valueOf(categoryIdObj.toString());

        if (title == null || title.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "标题不能为空"));
        }

        if (title.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("message", "标题不能超过200字"));
        }

        if (content == null || content.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "内容不能为空"));
        }

        if (content.length() > 50000) {
            return ResponseEntity.badRequest().body(Map.of("message", "内容不能超过50000字"));
        }

        PostPublishCommand publishCommand = new PostPublishCommand();
        publishCommand.setUserId(userId);
        publishCommand.setTitle(title);
        publishCommand.setTitleStyle(serializeJsonField(body.get("titleStyle")));
        publishCommand.setContent(content);
        publishCommand.setCategoryId(categoryId);
        publishCommand.setRewardPoints(parseRewardPoints(body.get("rewardPoints")));
        publishCommand.setAttachments(serializeJsonField(body.get("attachments")));
        publishCommand.setTags(serializeJsonField(body.get("tags")));

        PostPublishResult publishResult = postPublishingService.publish(publishCommand);
        Post post = publishResult.getPost();

        Map<String, Object> response = new HashMap<>();
        response.put("id", post.getId());
        response.put("message", publishResult.isRequiresReview() ? "发帖成功，等待审核" : "发帖成功");
        if (publishResult.getExpGained() != null && publishResult.getExpGained() > 0) {
            response.put("expGained", publishResult.getExpGained());
        }
        if (!publishResult.getPointsRewards().isEmpty()) {
            response.put("pointsRewards", publishResult.getPointsRewards());
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updatePost(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (!post.getUserId().equals(userId)) {
            User user = userService.getById(userId);
            if (!"admin".equals(user.getRole())) {
                return ResponseEntity.status(403).body(Map.of("message", "无权限编辑此帖子"));
            }
        }
        
        String oldContent = post.getContent();
        if (body.containsKey("title")) {
            post.setTitle((String) body.get("title"));
        }
        if (body.containsKey("titleStyle")) {
            post.setTitleStyle(serializeJsonField(body.get("titleStyle")));
        }
        if (body.containsKey("content")) {
            post.setContent(htmlSanitizer.sanitize((String) body.get("content")));
        }
        if (body.containsKey("forumId") || body.containsKey("categoryId")) {
            Object categoryIdObj = body.get("forumId");
            if (categoryIdObj == null) {
                categoryIdObj = body.get("categoryId");
            }
            if (categoryIdObj != null) {
                post.setCategoryId(Long.valueOf(categoryIdObj.toString()));
            }
        }
        if (body.containsKey("rewardPoints")) {
            Object rewardPointsObj = body.get("rewardPoints");
            if (rewardPointsObj == null || rewardPointsObj.toString().isBlank()) {
                post.setRewardPoints(0);
            } else {
                try {
                    post.setRewardPoints(Integer.valueOf(rewardPointsObj.toString()));
                } catch (Exception ignored) {
                    // ignore invalid rewardPoints update
                }
            }
        }
        
        if (body.containsKey("attachments")) {
            try {
                Object attachmentsObj = body.get("attachments");
                if (attachmentsObj != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    post.setAttachments(mapper.writeValueAsString(attachmentsObj));
                } else {
                    post.setAttachments(null);
                }
            } catch (Exception e) {
                // ignore
            }
        }
        
        if (body.containsKey("tags")) {
            try {
                Object tagsObj = body.get("tags");
                if (tagsObj != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    post.setTags(mapper.writeValueAsString(tagsObj));
                } else {
                    post.setTags(null);
                }
            } catch (Exception e) {
                // ignore
            }
        }
        
        postService.updateById(post);

        if (body.containsKey("content")) {
            PostEditHistory history = new PostEditHistory();
            history.setPostId(id);
            history.setUserId(userId);
            history.setOldContent(oldContent);
            history.setNewContent(post.getContent());
            postEditHistoryMapper.insert(history);
        }
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of("action", "updated")));
        
        return ResponseEntity.ok(Map.of("message", "修改成功"));
    }

    @GetMapping
    public ResponseEntity<?> getPosts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(value = "limit", defaultValue = "10") Integer size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<Post> pageRequest = new Page<>(safePage, safeSize);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        
        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }
        
        queryWrapper.eq("status", 0);

        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.trim();
            queryWrapper.and(wrapper -> wrapper
                    .like("title", normalizedKeyword)
                    .or()
                    .like("content", normalizedKeyword));
        }

        if (username != null && !username.isBlank()) {
            List<Long> userIds = userService.list(new QueryWrapper<User>()
                            .select("id")
                            .like("username", username.trim()))
                    .stream()
                    .map(User::getId)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            if (userIds.isEmpty()) {
                queryWrapper.apply("1 = 0");
            } else {
                queryWrapper.in("user_id", userIds);
            }
        }

        if (startDate != null && !startDate.isBlank()) {
            try {
                LocalDateTime start = LocalDate.parse(startDate.trim()).atStartOfDay();
                queryWrapper.ge("create_time", start);
            } catch (Exception ignored) {
            }
        }

        if (endDate != null && !endDate.isBlank()) {
            try {
                LocalDateTime end = LocalDate.parse(endDate.trim()).plusDays(1).atStartOfDay();
                queryWrapper.lt("create_time", end);
            } catch (Exception ignored) {
            }
        }
        
        if ("latest".equals(sort)) {
            queryWrapper.orderByDesc("is_top").orderByDesc("create_time");
        } else if ("hot".equals(sort)) {
            queryWrapper.orderByDesc("is_top").orderByDesc("view_count");
        } else if ("essence".equals(sort)) {
            queryWrapper.eq("is_essence", true).orderByDesc("create_time");
        } else {
            queryWrapper.orderByDesc("is_top").orderByDesc("create_time");
        }
        
        Page<Post> result = postService.page(pageRequest, queryWrapper);
        
        Page<PostDTO> dtoResult = new Page<>();
        dtoResult.setCurrent(result.getCurrent());
        dtoResult.setSize(result.getSize());
        dtoResult.setTotal(result.getTotal());
        dtoResult.setPages(result.getPages());
        
        List<PostDTO> dtoList = DtoConverter.convertPosts(result.getRecords(), userService, userEntitlementService, categoryService, replyService);

        dtoResult.setRecords(dtoList);

        return ResponseEntity.ok(dtoResult);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchPosts(
            @RequestParam String q,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(value = "limit", defaultValue = "10") Integer size,
            @RequestParam(required = false) Long forumId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "latest") String sort) {

        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<Post> pageRequest = new Page<>(page, safeSize);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        String keyword = q == null ? "" : q.trim();

        if (keyword.isEmpty()) {
            return ResponseEntity.ok(Map.of("posts", Collections.emptyList(), "total", 0));
        }

        queryWrapper.eq("status", 0)
                .and(wrapper -> wrapper.like("title", keyword).or().like("content", keyword));

        if (forumId != null) {
            queryWrapper.eq("category_id", forumId);
        }

        if (username != null && !username.isBlank()) {
            List<Long> userIds = userService.list(new QueryWrapper<User>()
                            .select("id")
                            .like("username", username.trim()))
                    .stream()
                    .map(User::getId)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            if (userIds.isEmpty()) {
                queryWrapper.apply("1 = 0");
            } else {
                queryWrapper.in("user_id", userIds);
            }
        }

        if (tags != null && !tags.isBlank()) {
            for (String tag : tags.split(",")) {
                String normalized = tag.trim();
                if (!normalized.isEmpty()) {
                    queryWrapper.like("tags", normalized);
                }
            }
        }

        if (startDate != null && !startDate.isBlank()) {
            try {
                LocalDateTime start = LocalDate.parse(startDate.trim()).atStartOfDay();
                queryWrapper.ge("create_time", start);
            } catch (Exception ignored) {
            }
        }

        if (endDate != null && !endDate.isBlank()) {
            try {
                LocalDateTime end = LocalDate.parse(endDate.trim()).plusDays(1).atStartOfDay();
                queryWrapper.lt("create_time", end);
            } catch (Exception ignored) {
            }
        }

        if ("hot".equalsIgnoreCase(sort)) {
            queryWrapper.orderByDesc("view_count").orderByDesc("create_time");
        } else if ("relevance".equalsIgnoreCase(sort)) {
            queryWrapper.orderByDesc("is_top").orderByDesc("reply_count").orderByDesc("create_time");
        } else {
            queryWrapper.orderByDesc("is_top").orderByDesc("create_time");
        }

        Page<Post> result = postService.page(pageRequest, queryWrapper);
        List<PostDTO> dtoList = DtoConverter.convertPosts(result.getRecords(), userService, userEntitlementService, categoryService, replyService);

        Map<String, Object> response = new HashMap<>();
        response.put("posts", dtoList);
        response.put("total", result.getTotal());
        response.put("current", result.getCurrent());
        response.put("size", result.getSize());
        response.put("pages", result.getPages());
        return ResponseEntity.ok(response);
    }
    
    private String serializeJsonField(Object value) {
        try {
            if (value == null) {
                return null;
            }
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPost(@PathVariable Long id, HttpServletRequest request) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        Long userId = (Long) request.getAttribute("userId");
        if (post.getStatus() != null && post.getStatus() != 0) {
            boolean canPreview = false;
            if (userId != null) {
                canPreview = post.getUserId().equals(userId);
                if (!canPreview) {
                    User viewer = userService.getById(userId);
                    canPreview = viewer != null && ("admin".equals(viewer.getRole()) || "moderator".equals(viewer.getRole()));
                }
            }
            if (!canPreview) {
                return ResponseEntity.notFound().build();
            }
        }
        String ipAddress = request.getRemoteAddr();

        String viewerKey = buildViewerKey(userId, ipAddress);
        if (viewerKey != null) {
            PostView postView = new PostView();
            postView.setPostId(id);
            postView.setUserId(userId);
            postView.setIpAddress(ipAddress);
            postView.setViewerKey(viewerKey);
            try {
                postViewService.save(postView);
                postService.incrementField(id, "view_count", 1);
                post = postService.getById(id);
            } catch (DuplicateKeyException ignored) {
                // Refresh the browse timestamp so the latest revisit appears in view history.
                UpdateWrapper<PostView> updateWrapper = new UpdateWrapper<>();
                updateWrapper.eq("post_id", id)
                        .eq("viewer_key", viewerKey)
                        .set("create_time", LocalDateTime.now());
                if (userId != null) {
                    updateWrapper.set("user_id", userId);
                }
                if (ipAddress != null && !ipAddress.isBlank()) {
                    updateWrapper.set("ip_address", ipAddress);
                }
                postViewService.update(updateWrapper);
            }
        }
        
        Map<Long, User> userMap = post.getUserId() == null
                ? Collections.emptyMap()
                : userService.listByIds(List.of(post.getUserId())).stream()
                .collect(Collectors.toMap(User::getId, user -> user, (left, right) -> left));
        Map<Long, Category> categoryMap = post.getCategoryId() == null
                ? Collections.emptyMap()
                : categoryService.listByIds(List.of(post.getCategoryId())).stream()
                .collect(Collectors.toMap(Category::getId, category -> category, (left, right) -> left));
        Map<Long, Long> replyCountMap = post.getId() == null
                ? Collections.emptyMap()
                : replyService.countActiveByPostIds(Set.of(post.getId()));
        PostDTO dto = DtoConverter.convertPost(post, userMap, userEntitlementService.getLatestActiveBadgeMap(userMap.keySet()), userEntitlementService, categoryMap, replyCountMap);
        
        if (userId != null) {
            QueryWrapper<Like> likeQuery = new QueryWrapper<>();
            likeQuery.eq("user_id", userId);
            likeQuery.eq("target_type", "post");
            likeQuery.eq("target_id", id);
            dto.setIsLiked(likeService.count(likeQuery) > 0);
            
            QueryWrapper<Favorite> favQuery = new QueryWrapper<>();
            favQuery.eq("user_id", userId);
            favQuery.eq("post_id", id);
            dto.setIsFavorited(favoriteService.count(favQuery) > 0);
        } else {
            dto.setIsLiked(false);
            dto.setIsFavorited(false);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("post", dto);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/replies")
    public ResponseEntity<?> getReplies(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer limit,
            @RequestParam(required = false) String filter,
            HttpServletRequest request) {

        Long currentUserId = (Long) request.getAttribute("userId");
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Post post = postService.getById(id);
        Long postAuthorId = post != null ? post.getUserId() : null;

        // 查出帖子下所有回复（status=0）
        QueryWrapper<Reply> allWrapper = new QueryWrapper<>();
        allWrapper.eq("post_id", id);
        allWrapper.eq("status", 0);
        allWrapper.orderByAsc("create_time");
        List<Reply> allReplies = replyService.list(allWrapper);

        // 分离顶层回复和子回复
        List<Reply> allTopReplies = new ArrayList<>();
        List<Reply> allChildren = new ArrayList<>();
        Map<Long, List<Reply>> directChildMap = new HashMap<>();
        Map<Long, Reply> replyMap = new HashMap<>();

        for (Reply r : allReplies) {
            replyMap.put(r.getId(), r);
            if (r.getParentId() == null) {
                allTopReplies.add(r);
            } else {
                allChildren.add(r);
                directChildMap.computeIfAbsent(r.getParentId(), k -> new ArrayList<>()).add(r);
            }
        }

        // 总回复数（所有层级）
        long totalAllReplies = allReplies.size();

        // 根据筛选条件，找到需要展示的顶层回复ID集合
        Set<Long> displayTopReplyIds = new HashSet<>();
        if ("author".equals(filter) && postAuthorId != null) {
            // 只看楼主：找到楼主所有回复（含子回复），取其顶层祖先
            for (Reply r : allReplies) {
                if (postAuthorId.equals(r.getUserId())) {
                    displayTopReplyIds.add(findTopAncestorId(r.getId(), replyMap));
                }
            }
        } else if ("mine".equals(filter) && currentUserId != null) {
            // 我的回复：找到当前用户所有回复（含子回复），取其顶层祖先
            for (Reply r : allReplies) {
                if (currentUserId.equals(r.getUserId())) {
                    displayTopReplyIds.add(findTopAncestorId(r.getId(), replyMap));
                }
            }
        } else if ("related".equals(filter) && currentUserId != null) {
            // 与我有关：找到回复了"我的评论"的回复，取其顶层祖先
            // 即：某条回复的 parentId 指向我发表的回复
            Set<Long> myReplyIds = new HashSet<>();
            for (Reply r : allReplies) {
                if (currentUserId.equals(r.getUserId())) {
                    myReplyIds.add(r.getId());
                }
            }
            for (Reply r : allReplies) {
                if (r.getParentId() != null && myReplyIds.contains(r.getParentId()) && !currentUserId.equals(r.getUserId())) {
                    displayTopReplyIds.add(findTopAncestorId(r.getId(), replyMap));
                }
            }
        }

        // 对顶层回复做筛选和分页
        List<Reply> filteredTopReplies;
        if (displayTopReplyIds.isEmpty() && filter != null && !filter.equals("all")) {
            // 筛选条件不匹配任何回复
            filteredTopReplies = Collections.emptyList();
        } else if (!displayTopReplyIds.isEmpty()) {
            filteredTopReplies = allTopReplies.stream()
                    .filter(r -> displayTopReplyIds.contains(r.getId()))
                    .collect(Collectors.toList());
        } else {
            filteredTopReplies = allTopReplies;
        }

        // 手动分页
        int total = filteredTopReplies.size();
        int fromIndex = (safePage - 1) * safeLimit;
        int toIndex = Math.min(fromIndex + safeLimit, total);
        List<Reply> pagedTopReplies = fromIndex < total
                ? filteredTopReplies.subList(fromIndex, toIndex)
                : Collections.emptyList();

        Map<Long, User> replyAuthorMap = loadReplyAuthorMap(allReplies);
        Set<Long> likedReplyIds = loadLikedReplyIds(currentUserId, allReplies);

        List<ReplyDTO> dtoList = new ArrayList<>();
        for (Reply topReply : pagedTopReplies) {
            ReplyDTO topDTO = convertReplyToDTO(topReply, replyAuthorMap, replyMap, likedReplyIds);
            List<ReplyDTO> childTree = buildChildTree(topReply.getId(), directChildMap, replyMap, replyAuthorMap, likedReplyIds);
            topDTO.setChildren(childTree);
            int totalCount = countDescendants(topReply.getId(), directChildMap);
            topDTO.setChildrenCount(totalCount);
            dtoList.add(topDTO);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("replies", dtoList);
        response.put("total", total);
        response.put("totalAll", totalAllReplies);

        return ResponseEntity.ok(response);
    }

    /** 沿 parentId 链向上查找顶层祖先回复ID */
    private Long findTopAncestorId(Long replyId, Map<Long, Reply> replyMap) {
        Reply current = replyMap.get(replyId);
        if (current == null) return replyId;
        while (current.getParentId() != null) {
            Reply parent = replyMap.get(current.getParentId());
            if (parent == null) break;
            current = parent;
        }
        return current.getId();
    }

    /** 递归构建树形子回复 */
    private List<ReplyDTO> buildChildTree(Long parentId,
                                          Map<Long, List<Reply>> directChildMap,
                                          Map<Long, Reply> replyMap,
                                          Map<Long, User> replyAuthorMap,
                                          Set<Long> likedReplyIds) {
        List<Reply> directChildren = directChildMap.get(parentId);
        if (directChildren == null) return List.of();

        List<ReplyDTO> result = new ArrayList<>();
        for (Reply child : directChildren) {
            ReplyDTO childDTO = convertReplyToDTO(child, replyAuthorMap, replyMap, likedReplyIds);
            List<ReplyDTO> grandChildren = buildChildTree(child.getId(), directChildMap, replyMap, replyAuthorMap, likedReplyIds);
            childDTO.setChildren(grandChildren);
            childDTO.setChildrenCount(countDescendants(child.getId(), directChildMap));
            result.add(childDTO);
        }
        return result;
    }

    /** 统计所有后代回复数量 */
    private int countDescendants(Long parentId, Map<Long, List<Reply>> directChildMap) {
        List<Reply> children = directChildMap.get(parentId);
        if (children == null) return 0;
        int count = children.size();
        for (Reply child : children) {
            count += countDescendants(child.getId(), directChildMap);
        }
        return count;
    }
    
    private ReplyDTO convertReplyToDTO(Reply reply,
                                       Map<Long, User> replyAuthorMap,
                                       Map<Long, Reply> replyMap,
                                       Set<Long> likedReplyIds) {
        ReplyDTO dto = new ReplyDTO();
        dto.setId(reply.getId());
        dto.setContent(reply.getContent());
        dto.setPostId(reply.getPostId());
        dto.setParentId(reply.getParentId());
        dto.setLikeCount(reply.getLikeCount());
        dto.setAttachments(reply.getAttachments());
        dto.setStatus(reply.getStatus());
        dto.setCreateTime(reply.getCreateTime() != null ? reply.getCreateTime().toString() : null);
        dto.setIsBestAnswer(false);

        dto.setAuthor(buildReplyAuthor(replyAuthorMap.get(reply.getUserId())));

        if (reply.getParentId() != null) {
            Reply quotedReply = replyMap.get(reply.getParentId());
            if (quotedReply != null) {
                ReplyDTO.QuotedReplyDTO quotedDTO = new ReplyDTO.QuotedReplyDTO();
                quotedDTO.setId(quotedReply.getId());
                quotedDTO.setContent(quotedReply.getContent());
                quotedDTO.setAuthor(buildReplyAuthor(replyAuthorMap.get(quotedReply.getUserId())));
                dto.setQuotedReply(quotedDTO);
            }
        }

        dto.setIsLiked(likedReplyIds.contains(reply.getId()));

        return dto;
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> sharePost(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }

        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }

        boolean counted = false;
        PostShare postShare = new PostShare();
        postShare.setPostId(id);
        postShare.setUserId(userId);
        try {
            postShareService.save(postShare);
            postService.incrementField(id, "share_count", 1);
            counted = true;
        } catch (DuplicateKeyException ignored) {
            // Each user should only contribute one share count for the same post.
        }
        post = postService.getById(id);

        return ResponseEntity.ok(Map.of(
                "shareCount", post.getShareCount(),
                "counted", counted
        ));
    }

    @PutMapping("/{id}/top")
    public ResponseEntity<?> toggleTop(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getById(userId);
        
        if (!isAdminOrModerator(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "无权限操作"));
        }
        
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsTop(post.getIsTop() == null ? true : !post.getIsTop());
        postService.updateById(post);
        
        return ResponseEntity.ok(Map.of("isTop", post.getIsTop()));
    }

    @PutMapping("/{id}/essence")
    public ResponseEntity<?> toggleEssence(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getById(userId);
        
        if (!isAdminOrModerator(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "无权限操作"));
        }
        
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsEssence(post.getIsEssence() == null ? true : !post.getIsEssence());
        postService.updateById(post);
        
        return ResponseEntity.ok(Map.of("isEssence", post.getIsEssence()));
    }

    @PutMapping("/{id}/lock")
    public ResponseEntity<?> toggleLock(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getById(userId);
        
        if (!isAdminOrModerator(user)) {
            return ResponseEntity.status(403).body(Map.of("message", "无权限操作"));
        }
        
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        post.setIsLocked(post.getIsLocked() == null ? true : !post.getIsLocked());
        postService.updateById(post);
        
        return ResponseEntity.ok(Map.of("isLocked", post.getIsLocked()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deletePost(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userService.getById(userId);
        boolean isAdmin = "admin".equals(user.getRole());
        boolean isOwner = post.getUserId().equals(userId);
        
        if (isOwner || isAdmin) {
            String reason = body != null ? body.get("reason") : null;
            
            post.setStatus(99);
            postService.updateById(post);
            
            if (isAdmin && !isOwner && reason != null && !reason.isEmpty()) {
                String notificationContent = "您的帖子「" + post.getTitle() + "」已被管理员删除，原因：" + reason;
                notificationService.createNotification(
                    post.getUserId(),
                    "post_deleted",
                    notificationContent,
                    id
                );
            }

            if (isAdmin) {
                AdminLog adminLog = new AdminLog();
                adminLog.setAdminUserId(userId);
                adminLog.setAction("delete_post");
                adminLog.setTargetType("post");
                adminLog.setTargetId(id);
                adminLog.setDetail(reason);
                adminLogMapper.insert(adminLog);
            }
            
            eventService.publishEvent(ForumEvent.postDeleted(id));
            return ResponseEntity.ok(Map.of("message", "删除成功"));
        }
        
        return ResponseEntity.status(403).body(Map.of("message", "无权限删除此帖子"));
    }

    private boolean isAdminOrModerator(User user) {
        return user != null && ("admin".equals(user.getRole()) || "moderator".equals(user.getRole()));
    }

    private Integer parseRewardPoints(Object rewardPointsValue) {
        if (rewardPointsValue == null) {
            return 0;
        }
        try {
            return Integer.valueOf(rewardPointsValue.toString());
        } catch (Exception ignored) {
            return 0;
        }
    }

    private Map<Long, User> loadReplyAuthorMap(List<Reply> replies) {
        Set<Long> userIds = replies.stream()
                .map(Reply::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userService.listByIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user, (left, right) -> left));
    }

    private Set<Long> loadLikedReplyIds(Long currentUserId, List<Reply> replies) {
        if (currentUserId == null || replies.isEmpty()) {
            return Collections.emptySet();
        }
        Set<Long> replyIds = replies.stream()
                .map(Reply::getId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (replyIds.isEmpty()) {
            return Collections.emptySet();
        }
        QueryWrapper<Like> likeQuery = new QueryWrapper<>();
        likeQuery.eq("user_id", currentUserId);
        likeQuery.eq("target_type", "reply");
        likeQuery.in("target_id", replyIds);
        return likeService.list(likeQuery).stream()
                .map(Like::getTargetId)
                .collect(Collectors.toSet());
    }

    private ReplyDTO.AuthorDTO buildReplyAuthor(User user) {
        if (user == null) {
            return null;
        }
        ReplyDTO.AuthorDTO authorDTO = new ReplyDTO.AuthorDTO();
        authorDTO.setId(user.getId());
        authorDTO.setUsername(user.getUsername());
        authorDTO.setAvatar(user.getAvatar());
        authorDTO.setLevel(user.getLevel());
        authorDTO.setPoints(user.getPoints());
        authorDTO.setRole(user.getRole());
        var badge = userEntitlementService.getLatestActiveBadge(user.getId());
        if (badge != null) {
            ReplyDTO.MallBadgeDTO badgeDTO = new ReplyDTO.MallBadgeDTO();
            badgeDTO.setName(badge.getDisplayName());
            badgeDTO.setStatus(badge.getStatus());
            badgeDTO.setEffectiveUntil(badge.getEffectiveUntil() == null ? null : badge.getEffectiveUntil().toString());
            authorDTO.setMallBadge(badgeDTO);
        }
        return authorDTO;
    }

    private String buildViewerKey(Long userId, String ipAddress) {
        if (userId != null) {
            return "u:" + userId;
        }
        if (ipAddress != null && !ipAddress.isBlank()) {
            return "ip:" + ipAddress.trim();
        }
        return null;
    }
}
