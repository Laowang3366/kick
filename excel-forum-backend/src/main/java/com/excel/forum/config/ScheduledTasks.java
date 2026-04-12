package com.excel.forum.config;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.Favorite;
import com.excel.forum.entity.Like;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.PostEditHistory;
import com.excel.forum.entity.PostShare;
import com.excel.forum.entity.PostView;
import com.excel.forum.entity.Notification;
import com.excel.forum.mapper.AdminLogMapper;
import com.excel.forum.mapper.PostEditHistoryMapper;
import com.excel.forum.service.PostDraftService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.FavoriteService;
import com.excel.forum.service.LikeService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PostShareService;
import com.excel.forum.service.PostViewService;
import com.excel.forum.service.ReplyService;
import com.excel.forum.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class ScheduledTasks {
    private final UserService userService;
    private final PostDraftService postDraftService;
    private final PostViewService postViewService;
    private final PostService postService;
    private final ReplyService replyService;
    private final LikeService likeService;
    private final FavoriteService favoriteService;
    private final NotificationService notificationService;
    private final PostShareService postShareService;
    private final AdminLogMapper adminLogMapper;
    private final PostEditHistoryMapper postEditHistoryMapper;

    @Scheduled(fixedRate = 300000)
    public void cleanInactiveUsers() {
        log.debug("开始清理不活跃用户");
        userService.cleanInactiveUsers();
        log.debug("清理不活跃用户完成");
    }

    @Scheduled(fixedRate = 3600000)
    public void cleanExpiredDrafts() {
        long cleanedCount = postDraftService.cleanupExpiredDrafts();
        if (cleanedCount > 0) {
            log.info("已自动清理 {} 条超过 {} 天未发布的草稿", cleanedCount, PostDraftService.DRAFT_EXPIRE_DAYS);
        }
    }

    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanOldPostViews() {
        QueryWrapper<PostView> queryWrapper = new QueryWrapper<>();
        queryWrapper.lt("create_time", java.time.LocalDateTime.now().minusDays(30));
        if (postViewService.remove(queryWrapper)) {
            log.info("已清理超过 30 天的帖子浏览记录");
        }
    }

    @Scheduled(cron = "0 30 3 * * ?")
    public void cleanOldNotifications() {
        QueryWrapper<Notification> queryWrapper = new QueryWrapper<>();
        queryWrapper.lt("create_time", java.time.LocalDateTime.now().minusDays(90));
        if (notificationService.remove(queryWrapper)) {
            log.info("已清理超过 90 天的通知记录");
        }
    }

    @Scheduled(cron = "0 0 5 * * ?")
    public void cleanOldOperationHistory() {
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(180);

        QueryWrapper<PostShare> shareQuery = new QueryWrapper<>();
        shareQuery.lt("create_time", cutoff);
        if (postShareService.remove(shareQuery)) {
            log.info("已清理超过 180 天的分享记录");
        }

        QueryWrapper<com.excel.forum.entity.AdminLog> adminLogQuery = new QueryWrapper<>();
        adminLogQuery.lt("create_time", cutoff);
        int removedAdminLogs = adminLogMapper.delete(adminLogQuery);
        if (removedAdminLogs > 0) {
            log.info("已清理 {} 条超过 180 天的管理员操作日志", removedAdminLogs);
        }

        QueryWrapper<PostEditHistory> editHistoryQuery = new QueryWrapper<>();
        editHistoryQuery.lt("edit_time", cutoff);
        int removedEditHistory = postEditHistoryMapper.delete(editHistoryQuery);
        if (removedEditHistory > 0) {
            log.info("已清理 {} 条超过 180 天的帖子编辑历史", removedEditHistory);
        }
    }

    @Scheduled(cron = "0 0 4 * * ?")
    public void recalculatePostStats() {
        java.util.List<Post> posts = postService.list(new QueryWrapper<Post>().eq("status", 0));
        for (Post post : posts) {
            long actualLikeCount = likeService.count(new QueryWrapper<Like>().eq("target_type", "post").eq("target_id", post.getId()));
            long actualReplyCount = replyService.count(new QueryWrapper<com.excel.forum.entity.Reply>().eq("post_id", post.getId()).eq("status", 0));
            long actualFavoriteCount = favoriteService.count(new QueryWrapper<Favorite>().eq("post_id", post.getId()));
            Post update = new Post();
            update.setId(post.getId());
            update.setLikeCount((int) actualLikeCount);
            update.setReplyCount((int) actualReplyCount);
            update.setFavoriteCount((int) actualFavoriteCount);
            postService.updateById(update);
        }
        log.info("帖子统计字段校准完成");
    }
}
