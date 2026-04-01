package com.excel.forum.entity.dto;

import lombok.Data;

@Data
public class PostDTO {
    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private Long userId;
    private Integer status;
    private Integer type;
    private Integer viewCount;
    private Integer likeCount;
    private Integer replyCount;
    private Integer shareCount;
    private Integer favoriteCount;
    private Boolean isLiked;
    private Boolean isFavorited;
    private Boolean isLocked = false;
    private Boolean isTop = false;
    private Boolean isEssence = false;
    private String attachments;
    private String tags;
    private String createTime;
    private String updateTime;
    
    private AuthorDTO author;
    private CategoryDTO category;
    
    @Data
    public static class AuthorDTO {
        private Long id;
        private String username;
        private String avatar;
        private Integer level;
        private Integer points;
        private String role;
    }
    
    @Data
    public static class CategoryDTO {
        private Long id;
        private String name;
    }
}
