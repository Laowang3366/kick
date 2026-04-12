package com.excel.forum.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.excel.forum.entity.ForumEvent;
import com.excel.forum.entity.Post;
import com.excel.forum.entity.User;
import com.excel.forum.service.ExperienceRuleService;
import com.excel.forum.service.ExperienceService;
import com.excel.forum.service.ForumEventService;
import com.excel.forum.service.NotificationService;
import com.excel.forum.service.PointsTaskService;
import com.excel.forum.service.PostPublishingService;
import com.excel.forum.service.PostService;
import com.excel.forum.service.UserService;
import com.excel.forum.service.dto.PostPublishCommand;
import com.excel.forum.service.dto.PostPublishResult;
import com.excel.forum.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PostPublishingServiceImpl implements PostPublishingService {
    private static final Pattern MENTION_PATTERN = Pattern.compile("@([\\w\\u4e00-\\u9fa5-]+)");

    private final PostService postService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final ExperienceService experienceService;
    private final ExperienceRuleService experienceRuleService;
    private final PointsTaskService pointsTaskService;
    private final ForumEventService forumEventService;
    private final HtmlSanitizer htmlSanitizer;

    @Override
    @Transactional
    public PostPublishResult publish(PostPublishCommand command) {
        User author = userService.getById(command.getUserId());
        boolean requiresReview = author == null || "user".equals(author.getRole());

        Post post = new Post();
        post.setUserId(command.getUserId());
        post.setTitle(command.getTitle());
        post.setTitleStyle(command.getTitleStyle());
        post.setContent(htmlSanitizer.sanitize(command.getContent()));
        post.setCategoryId(command.getCategoryId());
        post.setStatus(requiresReview ? -1 : 0);
        post.setType(0);
        post.setRewardPoints(command.getRewardPoints() == null ? 0 : command.getRewardPoints());
        post.setViewCount(0);
        post.setLikeCount(0);
        post.setReplyCount(0);
        post.setShareCount(0);
        post.setFavoriteCount(0);
        post.setIsLocked(false);
        post.setIsTop(false);
        post.setIsEssence(false);
        post.setAttachments(command.getAttachments());
        post.setTags(command.getTags());
        post.setReviewStatus(requiresReview ? "pending" : "approved");
        post.setReviewReason(null);
        postService.save(post);

        if (requiresReview) {
            notifyReviewers(author, post);
        }

        PostPublishResult result = new PostPublishResult();
        result.setPost(post);
        result.setRequiresReview(requiresReview);

        if (!requiresReview) {
            result.setExpGained(experienceRuleService.resolveFixedExp(ExperienceService.BIZ_POST_DIRECT_PUBLISH, 10));
            experienceService.awardPostDirectPublish(command.getUserId(), post.getId(), post.getTitle());
            collectReward(result, pointsTaskService.awardTask(command.getUserId(), PointsTaskService.TASK_DAILY_POST, post.getId(), "完成今日发帖"));
            collectReward(result, pointsTaskService.awardTask(command.getUserId(), PointsTaskService.TASK_FIRST_POST, null, "完成首次发帖"));
        }

        createMentionNotifications(author, post, command.getUserId());
        forumEventService.publishEvent(ForumEvent.postUpdated(post.getId(), Map.of("action", "created")));
        return result;
    }

    private void notifyReviewers(User author, Post post) {
        List<User> reviewers = userService.list(new QueryWrapper<User>().in("role", "admin", "moderator"));
        String authorName = author != null ? author.getUsername() : "匿名";
        for (User reviewer : reviewers) {
            notificationService.createNotification(
                    reviewer.getId(),
                    "review_request",
                    "用户「" + authorName + "」发布了新帖子「" + post.getTitle() + "」，等待审核",
                    post.getId(),
                    post.getUserId()
            );
        }
    }

    private void createMentionNotifications(User author, Post post, Long userId) {
        String content = post.getContent();
        if (content == null || content.isBlank()) {
            return;
        }
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            String username = matcher.group(1);
            User mentionedUser = userService.findByUsername(username);
            if (mentionedUser != null && !Objects.equals(mentionedUser.getId(), userId)) {
                notificationService.createNotification(
                        mentionedUser.getId(),
                        "MENTION",
                        (author != null ? author.getUsername() : "有人") + " 在帖子「" + post.getTitle() + "」中提到了你",
                        post.getId(),
                        userId
                );
            }
        }
    }

    private void collectReward(PostPublishResult result, Map<String, Object> reward) {
        if (reward != null) {
            result.getPointsRewards().add(reward);
        }
    }
}
