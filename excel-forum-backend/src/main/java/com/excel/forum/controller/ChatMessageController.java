package com.excel.forum.controller;

import com.excel.forum.entity.ChatMessage;
import com.excel.forum.entity.User;
import com.excel.forum.service.ChatMessageService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatMessageController {
    private final ChatMessageService chatMessageService;
    private final UserService userService;
    private final NotificationService notificationService;

    @GetMapping("/messages")
    public ResponseEntity<?> getMessages(@RequestParam(defaultValue = "50") int limit) {
        List<ChatMessage> messages = chatMessageService.getRecentMessages(limit);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestAttribute Long userId, @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("消息内容不能为空");
        }

        User user = userService.getById(userId);
        if (user == null) {
            return ResponseEntity.badRequest().body("用户不存在");
        }
        if (Boolean.TRUE.equals(user.getIsMuted())) {
            return ResponseEntity.status(403).body(Map.of("message", "当前账号已被禁言，暂时无法在公共聊天室发言"));
        }

        ChatMessage message = chatMessageService.sendMessage(
            userId,
            user.getUsername(),
            user.getAvatar(),
            content.trim()
        );

        List<String> mentions = extractMentions(content);
        for (String username : mentions) {
            User mentionedUser = userService.findByUsername(username);
            if (mentionedUser != null && !mentionedUser.getId().equals(userId)) {
                notificationService.createNotification(
                    mentionedUser.getId(),
                    "MENTION",
                    user.getUsername() + " 在聊天中提到了你",
                    message.getId(),
                    userId
                );
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", message.getId());
        response.put("userId", message.getUserId());
        response.put("username", message.getUsername());
        response.put("avatar", message.getAvatar());
        response.put("content", message.getContent());
        response.put("createTime", message.getCreateTime());

        return ResponseEntity.ok(response);
    }

    private List<String> extractMentions(String content) {
        List<String> mentions = new ArrayList<>();
        Pattern pattern = Pattern.compile("@(\\S+)");
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return mentions;
    }
}
