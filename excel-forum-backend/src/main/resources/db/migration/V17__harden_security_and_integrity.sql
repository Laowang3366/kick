CREATE UNIQUE INDEX `uk_points_record_task_reward`
    ON `points_record` (`user_id`, `task_key`, `biz_id`, `task_date`);

CREATE TABLE IF NOT EXISTS `admin_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `admin_user_id` BIGINT NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `target_type` VARCHAR(64) NOT NULL,
    `target_id` BIGINT DEFAULT NULL,
    `detail` TEXT DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_admin_log_admin_user_id` (`admin_user_id`),
    INDEX `idx_admin_log_action` (`action`),
    INDEX `idx_admin_log_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post_edit_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `old_content` LONGTEXT,
    `new_content` LONGTEXT,
    `edit_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_post_edit_history_post_id` (`post_id`),
    INDEX `idx_post_edit_history_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
