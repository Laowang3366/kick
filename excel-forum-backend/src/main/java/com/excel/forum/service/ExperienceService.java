package com.excel.forum.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.excel.forum.entity.UserExpLog;

import java.time.LocalDate;
import java.util.Map;

public interface ExperienceService extends IService<UserExpLog> {
    String BIZ_POST_DIRECT_PUBLISH = "post_direct_publish";
    String BIZ_POST_APPROVED = "post_approved";
    String BIZ_REPLY_CREATE = "reply_create";
    String BIZ_DAILY_CHECKIN = "daily_checkin";

    boolean addExp(Long userId, String bizType, Long bizId, Integer amount, String reason);

    void awardPostDirectPublish(Long userId, Long postId, String postTitle);

    void awardPostApproved(Long userId, Long postId, String postTitle);

    void awardReplyCreate(Long userId, Long replyId);

    void awardDailyCheckin(Long userId, LocalDate checkinDate, Integer gainedExp);

    Map<String, Object> getProgress(Integer expValue);

    Map<String, Object> getUserExpLogs(Long userId, Integer page, Integer size);
}
