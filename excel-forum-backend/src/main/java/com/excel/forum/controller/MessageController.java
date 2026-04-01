package com.excel.forum.controller;

import com.excel.forum.entity.Message;
import com.excel.forum.entity.User;
import com.excel.forum.service.MessageService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {
    private final MessageService messageService;
    private final UserService userService;
    private final NotificationService notificationService;

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        Map<String, Object> conversations = messageService.getConversations(userId);
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/{otherUserId}")
    public ResponseEntity<?> getMessages(
            @PathVariable Long otherUserId,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        List<Message> messages = messageService.getMessages(userId, otherUserId);
        
        // 为每条消息添加发送者信息
        List<Map<String, Object>> messageList = new ArrayList<>();
        for (Message message : messages) {
            Map<String, Object> messageMap = new HashMap<>();
            messageMap.put("id", message.getId());
            messageMap.put("content", message.getContent());
            messageMap.put("createdAt", message.getCreateTime());
            messageMap.put("isRead", message.getIsRead());
            
            User sender = userService.getById(message.getFromUserId());
            if (sender != null) {
                Map<String, Object> senderInfo = new HashMap<>();
                senderInfo.put("id", sender.getId());
                senderInfo.put("username", sender.getUsername());
                senderInfo.put("avatar", sender.getAvatar());
                messageMap.put("sender", senderInfo);
            }
            
            messageList.add(messageMap);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("messages", messageList);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        String content = body.get("content").toString();
        
        Message message = messageService.sendMessage(userId, receiverId, content);
        
        // 给接收者发送通知
        User sender = userService.getById(userId);
        String notificationContent = sender.getUsername() + " 给您发送了一条私信";
        notificationService.createNotification(
            receiverId,
            "interaction",
            notificationContent,
            message.getId(),
            userId
        );
        
        // 构建返回的消息对象
        Map<String, Object> messageResponse = new HashMap<>();
        messageResponse.put("id", message.getId());
        messageResponse.put("content", message.getContent());
        messageResponse.put("createdAt", message.getCreateTime());
        
        Map<String, Object> senderInfo = new HashMap<>();
        senderInfo.put("id", sender.getId());
        senderInfo.put("username", sender.getUsername());
        senderInfo.put("avatar", sender.getAvatar());
        messageResponse.put("sender", senderInfo);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", messageResponse);
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{otherUserId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long otherUserId,
            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        messageService.markAsRead(userId, otherUserId);
        return ResponseEntity.ok(Map.of("message", "标记成功"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "未登录"));
        }
        
        int unreadCount = messageService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", unreadCount));
    }
}
