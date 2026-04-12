package com.excel.forum.config;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

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
        long currentPage = 1L;
        long pageSize = 200L;
        while (true) {
            Page<Post> page = postService.page(
                    new Page<>(currentPage, pageSize),
                    new QueryWrapper<Post>()
                            .eq("status", 0)
                            .select("id")
                            .orderByAsc("id")
            );
            if (page.getRecords().isEmpty()) {
                break;
            }
            Set<Long> postIds = page.getRecords().stream()
                    .map(Post::getId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());
            Map<Long, Integer> likeCountMap = countGroupedIntegers(
                    likeService.list(new QueryWrapper<Like>()
                            .eq("target_type", "post")
                            .in("target_id", postIds)
                            .select("target_id")),
                    Like::getTargetId
            );
            Map<Long, Integer> replyCountMap = countGroupedIntegers(
                    replyService.list(new QueryWrapper<com.excel.forum.entity.Reply>()
                            .eq("status", 0)
                            .in("post_id", postIds)
                            .select("post_id")),
                    com.excel.forum.entity.Reply::getPostId
            );
            Map<Long, Integer> favoriteCountMap = countGroupedIntegers(
                    favoriteService.list(new QueryWrapper<Favorite>()
                            .in("post_id", postIds)
                            .select("post_id")),
                    Favorite::getPostId
            );
            for (Post post : page.getRecords()) {
                Post update = new Post();
                update.setId(post.getId());
                update.setLikeCount(likeCountMap.getOrDefault(post.getId(), 0));
                update.setReplyCount(replyCountMap.getOrDefault(post.getId(), 0));
                update.setFavoriteCount(favoriteCountMap.getOrDefault(post.getId(), 0));
                postService.updateById(update);
            }
            if (currentPage >= page.getPages()) {
                break;
            }
            currentPage += 1L;
        }
        log.info("帖子统计字段校准完成");
    }

    private <T> Map<Long, Integer> countGroupedIntegers(java.util.List<T> records, Function<T, Long> keyExtractor) {
        if (records == null || records.isEmpty()) {
            return Collections.emptyMap();
        }
        return records.stream()
                .map(keyExtractor)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toMap(Function.identity(), item -> 1, Integer::sum));
    }
}
