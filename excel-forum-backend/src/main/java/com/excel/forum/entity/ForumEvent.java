package com.excel.forum.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForumEvent {
    private String type;
    private Long targetId;
    private String targetType;
    private Object data;
    private LocalDateTime timestamp;

    public static ForumEvent postUpdated(Long postId, Object data) {
        return ForumEvent.builder()
                .type("POST_UPDATED")
                .targetId(postId)
                .targetType("post")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent postDeleted(Long postId) {
        return ForumEvent.builder()
                .type("POST_DELETED")
                .targetId(postId)
                .targetType("post")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent categoryUpdated(Long categoryId) {
        return ForumEvent.builder()
                .type("CATEGORY_UPDATED")
                .targetId(categoryId)
                .targetType("category")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent userUpdated(Long userId) {
        return ForumEvent.builder()
                .type("USER_UPDATED")
                .targetId(userId)
                .targetType("user")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent replyUpdated(Long replyId, Long postId) {
        return ForumEvent.builder()
                .type("REPLY_UPDATED")
                .targetId(replyId)
                .targetType("reply")
                .data(postId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent reportUpdated(Long reportId) {
        return ForumEvent.builder()
                .type("REPORT_UPDATED")
                .targetId(reportId)
                .targetType("report")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static ForumEvent messageReceived(Long messageId, Long receiverId, Long senderId) {
        Map<String, Object> messageData = new HashMap<>();
        messageData.put("receiverId", receiverId);
        messageData.put("senderId", senderId);
        
        return ForumEvent.builder()
                .type("MESSAGE_RECEIVED")
                .targetId(messageId)
                .targetType("message")
                .data(messageData)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
