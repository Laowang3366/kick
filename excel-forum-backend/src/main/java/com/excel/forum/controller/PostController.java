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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
    private final ForumEventService eventService;
    private final NotificationService notificationService;
    private final ExperienceService experienceService;

    @PostMapping
    @Transactional
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
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

        Post post = new Post();
        User author = userService.getById(userId);
        boolean requiresReview = author == null || "user".equals(author.getRole());
        post.setUserId(userId);
        post.setTitle(title);
        post.setTitleStyle(serializeJsonField(body.get("titleStyle")));
        post.setContent(content);
        post.setCategoryId(categoryId);
        post.setStatus(requiresReview ? -1 : 0);
        post.setType(0);
        if (body.containsKey("rewardPoints") && body.get("rewardPoints") != null) {
            try {
                post.setRewardPoints(Integer.valueOf(body.get("rewardPoints").toString()));
            } catch (Exception ignored) {
                post.setRewardPoints(0);
            }
        } else {
            post.setRewardPoints(0);
        }
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setReplyCount(0);
        post.setShareCount(0);
        post.setFavoriteCount(0);
        post.setIsLocked(false);
        post.setIsTop(false);
        post.setIsEssence(false);
        post.setReviewStatus(requiresReview ? "pending" : "approved");
        post.setReviewReason(null);
        
        if (body.containsKey("attachments")) {
            try {
                Object attachmentsObj = body.get("attachments");
                if (attachmentsObj != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    post.setAttachments(mapper.writeValueAsString(attachmentsObj));
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
                }
            } catch (Exception e) {
                // ignore
            }
        }

        postService.save(post);

        if (!requiresReview) {
            experienceService.awardPostDirectPublish(userId, post.getId(), post.getTitle());
        }
        
        List<String> mentions = extractMentions(content);
        for (String username : mentions) {
            User mentionedUser = userService.findByUsername(username);
            if (mentionedUser != null && !mentionedUser.getId().equals(userId)) {
                notificationService.createNotification(
                    mentionedUser.getId(),
                    "MENTION",
                    (author != null ? author.getUsername() : "有人") + " 在帖子「" + title + "」中提到了你",
                    post.getId(),
                    userId
                );
            }
        }
        
        eventService.publishEvent(ForumEvent.postUpdated(post.getId(), Map.of("action", "created")));

        Map<String, Object> response = new HashMap<>();
        response.put("id", post.getId());
        response.put("message", requiresReview ? "发帖成功，等待审核" : "发帖成功");

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
        
        if (body.containsKey("title")) {
            post.setTitle((String) body.get("title"));
        }
        if (body.containsKey("titleStyle")) {
            post.setTitleStyle(serializeJsonField(body.get("titleStyle")));
        }
        if (body.containsKey("content")) {
            post.setContent((String) body.get("content"));
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
        
        eventService.publishEvent(ForumEvent.postUpdated(id, Map.of("action", "updated")));
        
        return ResponseEntity.ok(Map.of("message", "修改成功"));
    }

    @GetMapping
    public ResponseEntity<?> getPosts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(value = "limit", defaultValue = "10") Integer size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String sort) {
        
        Page<Post> pageRequest = new Page<>(page, size);
        QueryWrapper<Post> queryWrapper = new QueryWrapper<>();
        
        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }
        
        queryWrapper.eq("status", 0);
        
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
        
        List<PostDTO> dtoList = DtoConverter.convertPosts(result.getRecords(), userService, categoryService, replyService);

        dtoResult.setRecords(dtoList);

        return ResponseEntity.ok(dtoResult);
    }
    
    private PostDTO convertToDTO(Post post) {
        PostDTO dto = new PostDTO();
        dto.setId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setTitleStyle(post.getTitleStyle());
        dto.setContent(post.getContent());
        dto.setCategoryId(post.getCategoryId());
        dto.setUserId(post.getUserId());
        dto.setStatus(post.getStatus());
        dto.setType(post.getType());
        dto.setViewCount(post.getViewCount());
        dto.setLikeCount(post.getLikeCount());
        
        // 实时统计回复数量，确保准确性
        QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
        replyQuery.eq("post_id", post.getId());
        replyQuery.eq("status", 0);
        dto.setReplyCount((int) replyService.count(replyQuery));
        
        dto.setShareCount(post.getShareCount());
        dto.setFavoriteCount(post.getFavoriteCount());
        dto.setIsLocked(post.getIsLocked() != null ? post.getIsLocked() : false);
        dto.setIsTop(post.getIsTop() != null ? post.getIsTop() : false);
        dto.setIsEssence(post.getIsEssence() != null ? post.getIsEssence() : false);
        dto.setAttachments(post.getAttachments());
        dto.setTags(post.getTags());
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
                    canPreview = viewer != null && "admin".equals(viewer.getRole());
                }
            }
            if (!canPreview) {
                return ResponseEntity.notFound().build();
            }
        }
        String ipAddress = request.getRemoteAddr();
        
        QueryWrapper<PostView> viewQuery = new QueryWrapper<>();
        viewQuery.eq("post_id", id);
        if (userId != null) {
            viewQuery.eq("user_id", userId);
        } else {
            viewQuery.eq("ip_address", ipAddress);
            viewQuery.isNull("user_id");
        }
        
        if (postViewService.count(viewQuery) == 0) {
            PostView postView = new PostView();
            postView.setPostId(id);
            postView.setUserId(userId);
            postView.setIpAddress(ipAddress);
            postViewService.save(postView);

            postService.incrementField(id, "view_count", 1);
            post = postService.getById(id);
        }
        
        PostDTO dto = convertToDTO(post);
        
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
        int fromIndex = (page - 1) * limit;
        int toIndex = Math.min(fromIndex + limit, total);
        List<Reply> pagedTopReplies = fromIndex < total
                ? filteredTopReplies.subList(fromIndex, toIndex)
                : Collections.emptyList();

        List<ReplyDTO> dtoList = new ArrayList<>();
        for (Reply topReply : pagedTopReplies) {
            ReplyDTO topDTO = convertReplyToDTO(topReply, currentUserId);
            List<ReplyDTO> childTree = buildChildTree(topReply.getId(), directChildMap, replyMap, currentUserId);
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
    private List<ReplyDTO> buildChildTree(Long parentId, Map<Long, List<Reply>> directChildMap,
                                           Map<Long, Reply> replyMap, Long currentUserId) {
        List<Reply> directChildren = directChildMap.get(parentId);
        if (directChildren == null) return List.of();

        List<ReplyDTO> result = new ArrayList<>();
        for (Reply child : directChildren) {
            ReplyDTO childDTO = convertReplyToDTO(child, currentUserId);
            // 设置 quotedReply：如果 child.parentId 对应的回复不在 directChildMap 的顶层中，
            // convertReplyToDTO 已经通过 replyService.getById 设置了 quotedReply，这里不需要额外处理
            List<ReplyDTO> grandChildren = buildChildTree(child.getId(), directChildMap, replyMap, currentUserId);
            childDTO.setChildren(grandChildren);
            childDTO.setChildrenCount(grandChildren.size());
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
    
    private ReplyDTO convertReplyToDTO(Reply reply, Long currentUserId) {
        ReplyDTO dto = new ReplyDTO();
        dto.setId(reply.getId());
        dto.setContent(reply.getContent());
        dto.setPostId(reply.getPostId());
        dto.setParentId(reply.getParentId());
        dto.setLikeCount(reply.getLikeCount());
        dto.setStatus(reply.getStatus());
        dto.setCreateTime(reply.getCreateTime() != null ? reply.getCreateTime().toString() : null);
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
        
        if (reply.getParentId() != null) {
            Reply quotedReply = replyService.getById(reply.getParentId());
            if (quotedReply != null) {
                ReplyDTO.QuotedReplyDTO quotedDTO = new ReplyDTO.QuotedReplyDTO();
                quotedDTO.setId(quotedReply.getId());
                quotedDTO.setContent(quotedReply.getContent());
                
                User quotedAuthor = userService.getById(quotedReply.getUserId());
                if (quotedAuthor != null) {
                    ReplyDTO.AuthorDTO quotedAuthorDTO = new ReplyDTO.AuthorDTO();
                    quotedAuthorDTO.setId(quotedAuthor.getId());
                    quotedAuthorDTO.setUsername(quotedAuthor.getUsername());
                    quotedAuthorDTO.setAvatar(quotedAuthor.getAvatar());
                    quotedAuthorDTO.setLevel(quotedAuthor.getLevel());
                    quotedAuthorDTO.setPoints(quotedAuthor.getPoints());
                    quotedAuthorDTO.setRole(quotedAuthor.getRole());
                    quotedDTO.setAuthor(quotedAuthorDTO);
                }
                
                dto.setQuotedReply(quotedDTO);
            }
        }
        
        if (currentUserId != null) {
            boolean isLiked = likeService.isLiked(currentUserId, reply.getId());
            dto.setIsLiked(isLiked);
        }
        
        return dto;
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> sharePost(@PathVariable Long id) {
        Post post = postService.getById(id);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }

        postService.incrementField(id, "share_count", 1);
        post = postService.getById(id);

        return ResponseEntity.ok(Map.of("shareCount", post.getShareCount()));
    }

    @PutMapping("/{id}/top")
    public ResponseEntity<?> toggleTop(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getById(userId);
        
        if (user == null || !"admin".equals(user.getRole())) {
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
        
        if (user == null || !"admin".equals(user.getRole())) {
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
        
        if (user == null || !"admin".equals(user.getRole())) {
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
            
            eventService.publishEvent(ForumEvent.postDeleted(id));
            return ResponseEntity.ok(Map.of("message", "删除成功"));
        }
        
        return ResponseEntity.status(403).body(Map.of("message", "无权限删除此帖子"));
    }

    private List<String> extractMentions(String content) {
        List<String> mentions = new ArrayList<>();
        if (content == null) return mentions;
        Pattern pattern = Pattern.compile("@(\\S+)");
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return mentions;
    }
}
