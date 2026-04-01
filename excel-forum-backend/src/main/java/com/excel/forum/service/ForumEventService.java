package com.excel.forum.service;

import com.excel.forum.entity.ForumEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ForumEventService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishEvent(ForumEvent event) {
        log.info("Publishing forum event: type={}, targetId={}", event.getType(), event.getTargetId());
        messagingTemplate.convertAndSend("/topic/forum", event);
    }

    public void publishPostEvent(ForumEvent event) {
        messagingTemplate.convertAndSend("/topic/posts", event);
    }

    public void publishCategoryEvent(ForumEvent event) {
        messagingTemplate.convertAndSend("/topic/categories", event);
    }
}
