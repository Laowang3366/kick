package com.excel.forum.entity.dto;

import lombok.Data;
import java.util.List;

@Data
public class ReplyDTO {
    private Long id;
    private String content;
    private Long postId;
    private Long parentId;
    private Integer likeCount;
    private Integer status;
    private String attachments;
    private String createTime;
    private String createdAt;
    private AuthorDTO author;
    private Boolean isBestAnswer;
    private Boolean isLiked;
    private QuotedReplyDTO quotedReply;
    private PostInfoDTO post;
    private List<ReplyDTO> children;
    private Integer childrenCount;

    @Data
    public static class AuthorDTO {
        private Long id;
        private String username;
        private String avatar;
        private Integer level;
        private Integer points;
        private String role;
        private MallBadgeDTO mallBadge;
    }

    @Data
    public static class MallBadgeDTO {
        private String name;
        private String status;
        private String effectiveUntil;
    }

    @Data
    public static class QuotedReplyDTO {
        private Long id;
        private String content;
        private AuthorDTO author;
    }

    @Data
    public static class PostInfoDTO {
        private Long id;
        private String title;
    }
}
