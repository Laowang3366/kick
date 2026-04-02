package com.excel.forum.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Category;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.Reply;
import com.excel.forum.entity.User;
import com.excel.forum.entity.dto.CategoryWithPostCount;
import com.excel.forum.service.CategoryService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    private final PostService postService;
    private final ReplyService replyService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(categoryService.list());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getCategoryById(@PathVariable Long id) {
        Category category = categoryService.getById(id);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }
        
        QueryWrapper<Post> postQuery = new QueryWrapper<>();
        postQuery.eq("category_id", id);
        postQuery.eq("status", 0);
        long postCount = postService.count(postQuery);
        
        postQuery.select("id");
        List<Post> posts = postService.list(postQuery);
        long replyCount = 0;
        if (!posts.isEmpty()) {
            List<Long> postIds = posts.stream().map(Post::getId).collect(Collectors.toList());
            QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
            replyQuery.in("post_id", postIds);
            replyQuery.eq("status", 0);
            replyCount = replyService.count(replyQuery);
        }
        
        List<Map<String, Object>> moderators = new ArrayList<>();
        QueryWrapper<User> userQuery = new QueryWrapper<>();
        userQuery.eq("role", "moderator");
        List<User> allModerators = userService.list(userQuery);
        
        for (User user : allModerators) {
            if (user.getManagedCategories() != null && !user.getManagedCategories().isEmpty()) {
                try {
                    List<Integer> managedIds = objectMapper.readValue(user.getManagedCategories(), new TypeReference<List<Integer>>() {});
                    if (managedIds.contains(id.intValue())) {
                        Map<String, Object> mod = new HashMap<>();
                        mod.put("id", user.getId());
                        mod.put("username", user.getUsername());
                        mod.put("avatar", user.getAvatar());
                        moderators.add(mod);
                    }
                } catch (Exception e) {
                    // 忽略解析错误
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", category.getId());
        result.put("name", category.getName());
        result.put("description", category.getDescription());
        result.put("sortOrder", category.getSortOrder());
        result.put("postCount", postCount);
        result.put("replyCount", replyCount);
        result.put("moderators", moderators);
        
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/hot")
    public ResponseEntity<List<CategoryWithPostCount>> getHotCategories(@RequestParam(defaultValue = "3") Integer limit) {
        List<Category> categories = categoryService.list();
        
        Map<Long, Long> postCountMap = categories.stream()
            .collect(Collectors.toMap(
                Category::getId,
                category -> {
                    QueryWrapper<Post> postQuery = new QueryWrapper<>();
                    postQuery.eq("category_id", category.getId());
                    postQuery.eq("status", 0);
                    return postService.count(postQuery);
                }
            ));
        
        Map<Long, Long> replyCountMap = categories.stream()
            .collect(Collectors.toMap(
                Category::getId,
                category -> {
                    QueryWrapper<Post> postQuery = new QueryWrapper<>();
                    postQuery.eq("category_id", category.getId());
                    postQuery.eq("status", 0);
                    List<Post> posts = postService.list(postQuery);
                    if (posts.isEmpty()) {
                        return 0L;
                    }
                    List<Long> postIds = posts.stream().map(Post::getId).collect(Collectors.toList());
                    QueryWrapper<Reply> replyQuery = new QueryWrapper<>();
                    replyQuery.in("post_id", postIds);
                    replyQuery.eq("status", 0);
                    return replyService.count(replyQuery);
                }
            ));
        
        List<CategoryWithPostCount> result = categories.stream()
            .map(category -> new CategoryWithPostCount(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getSortOrder(),
                postCountMap.get(category.getId()),
                replyCountMap.get(category.getId())
            ))
            .sorted(Comparator.comparingLong(CategoryWithPostCount::getPostCount).reversed())
            .limit(limit)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
}
