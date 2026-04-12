package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Category;
import com.excel.forum.entity.CategoryFollow;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.entity.dto.CategoryWithPostCount;
import com.excel.forum.entity.dto.PostDTO;
import com.excel.forum.service.CategoryFollowService;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserEntitlementService;
import com.excel.forum.service.UserService;
import com.excel.forum.util.DtoConverter;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {
    private final CategoryFollowService categoryFollowService;
    private final CategoryService categoryService;
    private final PostService postService;
    private final ReplyService replyService;
    private final UserService userService;
    private final UserEntitlementService userEntitlementService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<Category>> getCategories() {
        QueryWrapper<Category> queryWrapper = new QueryWrapper<>();
        queryWrapper.orderByAsc("sort_order").orderByAsc("id");
        List<Category> categories = categoryService.list(queryWrapper);
        Map<Long, Long> postCountMap = categoryService.countActivePostsByCategoryIds(categories.stream()
                .map(Category::getId)
                .filter(Objects::nonNull)
                .toList());
        categories.forEach(category -> category.setPostCount(postCountMap.getOrDefault(category.getId(), 0L)));
        return ResponseEntity.ok(categories);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getCategoryById(@PathVariable Long id) {
        Category category = categoryService.getById(id);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<Long, Long> postCountMap = categoryService.countActivePostsByCategoryIds(List.of(id));
        Map<Long, Long> replyCountMap = categoryService.countActiveRepliesByCategoryIds(List.of(id));
        long postCount = postCountMap.getOrDefault(id, 0L);
        long replyCount = replyCountMap.getOrDefault(id, 0L);
        long onlineMemberCount = categoryService.countVisibleOnlineFollowers(id);

        QueryWrapper<Post> latestPostQuery = new QueryWrapper<>();
        latestPostQuery.eq("category_id", id);
        latestPostQuery.eq("status", 0);
        latestPostQuery.orderByDesc("is_top").orderByDesc("create_time");
        latestPostQuery.last("LIMIT 1");
        Post latestPost = postService.getOne(latestPostQuery, false);
        PostDTO latestPostDto = null;
        if (latestPost != null) {
            try {
                List<PostDTO> latestPosts = DtoConverter.convertPosts(List.of(latestPost), userService, userEntitlementService, categoryService, replyService);
                if (!latestPosts.isEmpty()) {
                    latestPostDto = latestPosts.get(0);
                }
            } catch (Exception e) {
                log.warn("构建板块最新帖子摘要失败: categoryId={}, postId={}", id, latestPost.getId(), e);
            }
        }
        List<Map<String, Object>> moderators = loadModeratorsForCategory(id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", category.getId());
        result.put("name", category.getName());
        result.put("description", category.getDescription());
        result.put("groupName", category.getGroupName());
        result.put("sortOrder", category.getSortOrder());
        result.put("postCount", postCount);
        result.put("replyCount", replyCount);
        result.put("onlineMemberCount", onlineMemberCount);
        result.put("latestPost", latestPostDto);
        result.put("moderators", moderators);
        
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/hot")
    public ResponseEntity<List<CategoryWithPostCount>> getHotCategories(@RequestParam(defaultValue = "3") Integer limit) {
        List<Category> categories = categoryService.list();
        List<Long> categoryIds = categories.stream()
                .map(Category::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, Long> postCountMap = categoryService.countActivePostsByCategoryIds(categoryIds);
        Map<Long, Long> replyCountMap = categoryService.countActiveRepliesByCategoryIds(categoryIds);
        
        List<CategoryWithPostCount> result = categories.stream()
            .map(category -> new CategoryWithPostCount(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getGroupName(),
                category.getSortOrder(),
                postCountMap.get(category.getId()),
                replyCountMap.get(category.getId())
            ))
            .sorted(Comparator.comparingLong(CategoryWithPostCount::getPostCount).reversed())
            .limit(limit)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    private List<Map<String, Object>> loadModeratorsForCategory(Long categoryId) {
        if (categoryId == null) {
            return Collections.emptyList();
        }

        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("role", "moderator")
                .select("id", "username", "avatar", "managed_categories");

        return userService.list(queryWrapper).stream()
                .filter(user -> parseManagedCategoryIds(user).contains(categoryId.intValue()))
                .map(user -> {
                    Map<String, Object> moderator = new HashMap<>();
                    moderator.put("id", user.getId());
                    moderator.put("username", user.getUsername());
                    moderator.put("avatar", user.getAvatar());
                    return moderator;
                })
                .toList();
    }

    private List<Integer> parseManagedCategoryIds(User user) {
        if (user == null || user.getManagedCategories() == null || user.getManagedCategories().isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(user.getManagedCategories(), new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            log.warn("解析版主管理板块失败: userId={}", user.getId(), e);
            return Collections.emptyList();
        }
    }
}
