CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(255) DEFAULT NULL,
    `bio` TEXT,
    `level` INT DEFAULT 1,
    `points` INT DEFAULT 0,
    `status` TINYINT DEFAULT 0 COMMENT '0=正常, 1=禁用',
    `role` VARCHAR(20) DEFAULT 'user' COMMENT 'user, moderator, admin',
    `excel_level` VARCHAR(50) DEFAULT NULL,
    `expertise` VARCHAR(255) DEFAULT NULL COMMENT '专长标签,逗号分隔',
    `is_online` TINYINT(1) DEFAULT 0 COMMENT '是否在线',
    `last_active_time` DATETIME DEFAULT NULL COMMENT '最后活跃时间',
    `managed_categories` TEXT DEFAULT NULL COMMENT '管理的板块ID列表(JSON格式)',
    `public_profile` TINYINT(1) DEFAULT 1 COMMENT '是否公开资料',
    `show_online_status` TINYINT(1) DEFAULT 1 COMMENT '是否显示在线状态',
    `allow_messages` TINYINT(1) DEFAULT 1 COMMENT '是否允许私信',
    `show_following` TINYINT(1) DEFAULT 1 COMMENT '是否显示关注列表',
    `show_followers` TINYINT(1) DEFAULT 1 COMMENT '是否显示粉丝列表',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_is_online` (`is_online`),
    INDEX `idx_last_active_time` (`last_active_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `sort_order` INT DEFAULT 0,
    `parent_id` BIGINT DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_parent_id` (`parent_id`),
    CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `category`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `category_id` BIGINT NOT NULL,
    `status` TINYINT DEFAULT 0 COMMENT '0=正常, 1=置顶, 2=精华, 3=锁定, 99=删除',
    `type` TINYINT DEFAULT 0 COMMENT '0=普通, 1=投票, 2=悬赏',
    `reward_points` INT DEFAULT 0,
    `best_answer_id` BIGINT DEFAULT NULL,
    `view_count` INT DEFAULT 0,
    `like_count` INT DEFAULT 0,
    `reply_count` INT DEFAULT 0,
    `share_count` INT DEFAULT 0,
    `favorite_count` INT DEFAULT 0,
    `is_locked` TINYINT(1) DEFAULT 0 COMMENT '是否锁定',
    `is_top` TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
    `is_essence` TINYINT(1) DEFAULT 0 COMMENT '是否精华',
    `attachments` TEXT DEFAULT NULL COMMENT '附件JSON',
    `tags` TEXT DEFAULT NULL COMMENT '标签JSON',
    `review_status` VARCHAR(20) DEFAULT 'approved' COMMENT '审核状态',
    `review_reason` TEXT DEFAULT NULL COMMENT '审核原因',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_category_id` (`category_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_create_time` (`create_time`),
    CONSTRAINT `fk_post_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_post_category` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reply` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `post_id` BIGINT NOT NULL,
    `parent_id` BIGINT DEFAULT NULL,
    `like_count` INT DEFAULT 0,
    `status` TINYINT DEFAULT 0 COMMENT '0=正常, 1=删除',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reply_user_id` (`user_id`),
    INDEX `idx_reply_post_id` (`post_id`),
    INDEX `idx_reply_parent_id` (`parent_id`),
    CONSTRAINT `fk_reply_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reply_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reply_parent` FOREIGN KEY (`parent_id`) REFERENCES `reply`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `like` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `target_type` VARCHAR(10) NOT NULL COMMENT 'post, reply',
    `target_id` BIGINT NOT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_target` (`user_id`, `target_type`, `target_id`),
    INDEX `idx_target` (`target_type`, `target_id`),
    CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorite` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `post_id` BIGINT NOT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_post` (`user_id`, `post_id`),
    INDEX `idx_favorite_post_id` (`post_id`),
    CONSTRAINT `fk_favorite_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_favorite_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `report` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `reporter_id` BIGINT NOT NULL,
    `target_type` VARCHAR(10) NOT NULL COMMENT 'post, reply',
    `target_id` BIGINT NOT NULL,
    `reason` VARCHAR(50) NOT NULL,
    `description` TEXT,
    `status` TINYINT DEFAULT 0 COMMENT '0=待处理, 1=已处理, 2=已忽略',
    `handler_id` BIGINT DEFAULT NULL,
    `handle_time` DATETIME DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reporter_id` (`reporter_id`),
    INDEX `idx_report_target` (`target_type`, `target_id`),
    INDEX `idx_report_status` (`status`),
    CONSTRAINT `fk_report_user` FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `message` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_user_id` BIGINT NOT NULL,
    `to_user_id` BIGINT NOT NULL,
    `content` TEXT NOT NULL,
    `is_read` TINYINT DEFAULT 0,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_from_user_id` (`from_user_id`),
    INDEX `idx_to_user_id` (`to_user_id`),
    INDEX `idx_message_is_read` (`is_read`),
    INDEX `idx_message_create_time` (`create_time`),
    CONSTRAINT `fk_message_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_message_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `type` VARCHAR(20) NOT NULL COMMENT 'system, like, reply, favorite, follow, message, MENTION, post_deleted, post_review, site_notification',
    `content` TEXT NOT NULL,
    `related_id` BIGINT DEFAULT NULL,
    `reply_id` BIGINT DEFAULT NULL COMMENT '关联回复ID',
    `sender_id` BIGINT DEFAULT NULL COMMENT '发送者ID',
    `is_read` TINYINT DEFAULT 0,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_notification_user_id` (`user_id`),
    INDEX `idx_notification_is_read` (`is_read`),
    INDEX `idx_notification_create_time` (`create_time`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attachment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` BIGINT DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_attachment_post_id` (`post_id`),
    CONSTRAINT `fk_attachment_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `points_change` INT NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_point_log_user_id` (`user_id`),
    INDEX `idx_point_log_create_time` (`create_time`),
    CONSTRAINT `fk_point_log_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `follow` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '关注者',
    `follow_user_id` BIGINT NOT NULL COMMENT '被关注者',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_follow` (`user_id`, `follow_user_id`),
    INDEX `idx_follow_user` (`follow_user_id`),
    CONSTRAINT `fk_follow_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_follow_follow_user` FOREIGN KEY (`follow_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `site_notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `content` TEXT NOT NULL COMMENT '内容',
    `type` VARCHAR(20) DEFAULT 'system' COMMENT '类型: system/activity/update/urgent',
    `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/sent',
    `target_type` VARCHAR(20) DEFAULT 'all' COMMENT '目标类型: all/role',
    `target_roles` VARCHAR(100) DEFAULT NULL,
    `read_count` INT DEFAULT 0 COMMENT '阅读数',
    `total_count` INT DEFAULT 0 COMMENT '总接收数',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建者ID',
    `send_time` DATETIME DEFAULT NULL COMMENT '发送时间',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_site_notification_status` (`status`),
    INDEX `idx_site_notification_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `category_follow` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '关注者',
    `category_id` BIGINT NOT NULL COMMENT '关注的板块',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_category` (`user_id`, `category_id`),
    INDEX `idx_category_follow_category_id` (`category_id`),
    CONSTRAINT `fk_category_follow_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_category_follow_category` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_message` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT DEFAULT NULL COMMENT '用户ID',
    `username` VARCHAR(50) DEFAULT NULL COMMENT '用户名',
    `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
    `content` TEXT NOT NULL COMMENT '消息内容',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_chat_message_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `points_rule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
    `description` TEXT DEFAULT NULL COMMENT '描述',
    `points` INT DEFAULT 0 COMMENT '积分变化',
    `type` VARCHAR(20) DEFAULT 'daily' COMMENT '类型: daily/once',
    `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `points_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `rule_name` VARCHAR(100) DEFAULT NULL COMMENT '规则名称',
    `change` INT DEFAULT 0 COMMENT '积分变化',
    `balance` INT DEFAULT 0 COMMENT '变动后余额',
    `description` TEXT DEFAULT NULL COMMENT '描述',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_points_record_user_id` (`user_id`),
    INDEX `idx_points_record_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` TEXT NOT NULL COMMENT '题目内容',
    `type` VARCHAR(20) NOT NULL COMMENT '类型: single/multiple/judge/fill',
    `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
    `options` TEXT DEFAULT NULL COMMENT '选项JSON',
    `answer` TEXT NOT NULL COMMENT '答案',
    `difficulty` INT DEFAULT 3 COMMENT '难度1-5',
    `points` INT DEFAULT 10 COMMENT '分值',
    `explanation` TEXT DEFAULT NULL COMMENT '解析',
    `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_question_type` (`type`),
    INDEX `idx_question_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post_view` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT DEFAULT NULL,
    `ip_address` VARCHAR(64) DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_post_view_post_id` (`post_id`),
    INDEX `idx_post_view_user_id` (`user_id`),
    INDEX `idx_post_view_create_time` (`create_time`),
    CONSTRAINT `fk_post_view_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_post_view_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
