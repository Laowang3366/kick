package com.excel.forum.util;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Category;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.entity.UserEntitlement;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.entity.dto.ReplyDTO;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 批量 DTO 转换工具，解决 N+1 查询问题
 */
public class DtoConverter {

    /**
     * 批量将 Post 列表转为 PostDTO 列表，只发 3 次批量查询（用户 + 分类 + 回复数）
     */
    public static List<PostDTO> convertPosts(List<Post> posts, UserService userService, UserEntitlementService userEntitlementService, CategoryService categoryService, ReplyService replyService) {
        if (posts == null || posts.isEmpty()) return Collections.emptyList();

        // 收集所有需要的 userId 和 categoryId
        Set<Long> userIds = posts.stream().map(Post::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> categoryIds = posts.stream().map(Post::getCategoryId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> postIds = posts.stream().map(Post::getId).filter(Objects::nonNull).collect(Collectors.toSet());

        // 批量查询
        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap() :
                userService.listByIds(userIds).stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<Long, UserEntitlement> badgeMap = userIds.isEmpty() ? Collections.emptyMap() :
                userEntitlementService.getLatestActiveBadgeMap(userIds);
        Map<Long, Category> categoryMap = categoryIds.isEmpty() ? Collections.emptyMap() :
                categoryService.listByIds(categoryIds).stream().collect(Collectors.toMap(Category::getId, c -> c, (a, b) -> a));
        
        // 批量统计回复数量
        Map<Long, Long> replyCountMap = postIds.isEmpty() ? Collections.emptyMap() : replyService.countActiveByPostIds(postIds);

        return posts.stream().map(post -> convertPost(post, userMap, badgeMap, userEntitlementService, categoryMap, replyCountMap)).collect(Collectors.toList());
    }

    public static PostDTO convertPost(Post post, UserService userService, UserEntitlementService userEntitlementService, CategoryService categoryService) {
        Map<Long, User> userMap = Collections.emptyMap();
        Map<Long, UserEntitlement> badgeMap = Collections.emptyMap();
        Map<Long, Category> categoryMap = Collections.emptyMap();
        Map<Long, Long> replyCountMap = Collections.emptyMap();
        if (post.getUserId() != null) {
            User user = userService.getById(post.getUserId());
            if (user != null) userMap = Map.of(user.getId(), user);
            UserEntitlement badge = userEntitlementService.getLatestActiveBadge(post.getUserId());
            if (badge != null) badgeMap = Map.of(post.getUserId(), badge);
        }
        if (post.getCategoryId() != null) {
            Category cat = categoryService.getById(post.getCategoryId());
            if (cat != null) categoryMap = Map.of(cat.getId(), cat);
        }
        return convertPost(post, userMap, badgeMap, userEntitlementService, categoryMap, replyCountMap);
    }

    public static PostDTO convertPost(Post post, Map<Long, User> userMap, Map<Long, UserEntitlement> badgeMap, Map<Long, Category> categoryMap, Map<Long, Long> replyCountMap) {
        return convertPost(post, userMap, badgeMap, null, categoryMap, replyCountMap);
    }

    public static PostDTO convertPost(Post post, Map<Long, User> userMap, Map<Long, UserEntitlement> badgeMap, UserEntitlementService userEntitlementService, Map<Long, Category> categoryMap, Map<Long, Long> replyCountMap) {
        PostDTO dto = new PostDTO();
        dto.setId(post.getId());
        dto.setTitle(post.getTitle());
        dto.setTitleStyle(post.getTitleStyle());
        dto.setContent(post.getContent());
        dto.setCategoryId(post.getCategoryId());
        dto.setUserId(post.getUserId());
        dto.setStatus(post.getStatus());
        dto.setType(post.getType());
        dto.setRewardPoints(post.getRewardPoints());
        dto.setViewCount(post.getViewCount());
        dto.setLikeCount(post.getLikeCount());
        
        // 使用实时统计的回复数量
        Long replyCount = replyCountMap.get(post.getId());
        dto.setReplyCount(replyCount != null ? replyCount.intValue() : 0);
        
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

        if (post.getUserId() != null) {
            User author = userMap.get(post.getUserId());
            if (author != null) {
                PostDTO.AuthorDTO authorDTO = new PostDTO.AuthorDTO();
                authorDTO.setId(author.getId());
                authorDTO.setUsername(author.getUsername());
                authorDTO.setAvatar(author.getAvatar());
                authorDTO.setLevel(author.getLevel());
                authorDTO.setPoints(author.getPoints());
                authorDTO.setRole(author.getRole());
                UserEntitlement badge = badgeMap.get(author.getId());
                if (badge == null && userEntitlementService != null) {
                    badge = userEntitlementService.getLatestActiveBadge(author.getId());
                }
                authorDTO.setMallBadge(toPostMallBadge(badge));
                dto.setAuthor(authorDTO);
            }
        }

        if (post.getCategoryId() != null) {
            Category category = categoryMap.get(post.getCategoryId());
            if (category != null) {
                PostDTO.CategoryDTO categoryDTO = new PostDTO.CategoryDTO();
                categoryDTO.setId(category.getId());
                categoryDTO.setName(category.getName());
                dto.setCategory(categoryDTO);
            }
        }

        return dto;
    }

    /**
     * 批量将 Reply 列表转为 ReplyDTO 列表
     */
    public static List<ReplyDTO> convertReplies(List<Reply> replies, UserService userService, UserEntitlementService userEntitlementService) {
        if (replies == null || replies.isEmpty()) return Collections.emptyList();

        Set<Long> userIds = new HashSet<>();
        for (Reply r : replies) {
            if (r.getUserId() != null) userIds.add(r.getUserId());
        }

        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap() :
                userService.listByIds(userIds).stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<Long, UserEntitlement> badgeMap = userIds.isEmpty() ? Collections.emptyMap() :
                userEntitlementService.getLatestActiveBadgeMap(userIds);

        return replies.stream().map(reply -> convertReply(reply, userMap, badgeMap, userEntitlementService)).collect(Collectors.toList());
    }

    public static ReplyDTO convertReply(Reply reply, Map<Long, User> userMap, Map<Long, UserEntitlement> badgeMap) {
        return convertReply(reply, userMap, badgeMap, null);
    }

    public static ReplyDTO convertReply(Reply reply, Map<Long, User> userMap, Map<Long, UserEntitlement> badgeMap, UserEntitlementService userEntitlementService) {
        ReplyDTO dto = new ReplyDTO();
        dto.setId(reply.getId());
        dto.setContent(reply.getContent());
        dto.setPostId(reply.getPostId());
        dto.setParentId(reply.getParentId());
        dto.setLikeCount(reply.getLikeCount());
        dto.setStatus(reply.getStatus());
        dto.setCreateTime(reply.getCreateTime() != null ? reply.getCreateTime().toString() : null);
        dto.setIsBestAnswer(false);

        if (reply.getUserId() != null) {
            User author = userMap.get(reply.getUserId());
            if (author != null) {
                ReplyDTO.AuthorDTO authorDTO = new ReplyDTO.AuthorDTO();
                authorDTO.setId(author.getId());
                authorDTO.setUsername(author.getUsername());
                authorDTO.setAvatar(author.getAvatar());
                authorDTO.setLevel(author.getLevel());
                authorDTO.setPoints(author.getPoints());
                authorDTO.setRole(author.getRole());
                UserEntitlement badge = badgeMap.get(author.getId());
                if (badge == null && userEntitlementService != null) {
                    badge = userEntitlementService.getLatestActiveBadge(author.getId());
                }
                authorDTO.setMallBadge(toReplyMallBadge(badge));
                dto.setAuthor(authorDTO);
            }
        }

        return dto;
    }

    private static PostDTO.MallBadgeDTO toPostMallBadge(UserEntitlement entitlement) {
        if (entitlement == null) return null;
        PostDTO.MallBadgeDTO dto = new PostDTO.MallBadgeDTO();
        dto.setName(entitlement.getDisplayName());
        dto.setStatus(entitlement.getStatus());
        dto.setEffectiveUntil(entitlement.getEffectiveUntil() == null ? null : entitlement.getEffectiveUntil().toString());
        return dto;
    }

    private static ReplyDTO.MallBadgeDTO toReplyMallBadge(UserEntitlement entitlement) {
        if (entitlement == null) return null;
        ReplyDTO.MallBadgeDTO dto = new ReplyDTO.MallBadgeDTO();
        dto.setName(entitlement.getDisplayName());
        dto.setStatus(entitlement.getStatus());
        dto.setEffectiveUntil(entitlement.getEffectiveUntil() == null ? null : entitlement.getEffectiveUntil().toString());
        return dto;
    }
}
