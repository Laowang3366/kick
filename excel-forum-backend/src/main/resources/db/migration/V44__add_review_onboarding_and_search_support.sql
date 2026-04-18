ALTER TABLE `user_wrong_question`
    ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'new' AFTER `wrong_count`,
    ADD COLUMN `next_review_at` DATETIME NULL DEFAULT NULL AFTER `status`,
    ADD COLUMN `review_round` INT NOT NULL DEFAULT 0 AFTER `next_review_at`,
    ADD COLUMN `last_review_result` VARCHAR(32) NULL DEFAULT NULL AFTER `review_round`,
    ADD COLUMN `mastered_at` DATETIME NULL DEFAULT NULL AFTER `last_review_result`,
    ADD COLUMN `archived_at` DATETIME NULL DEFAULT NULL AFTER `mastered_at`;

UPDATE `user_wrong_question`
SET `status` = CASE
        WHEN `resolved` = 1 THEN 'mastered'
        ELSE 'reviewing'
    END,
    `next_review_at` = CASE
        WHEN `resolved` = 1 THEN DATE_ADD(COALESCE(`last_wrong_time`, CURRENT_TIMESTAMP), INTERVAL 7 DAY)
        ELSE COALESCE(`last_wrong_time`, CURRENT_TIMESTAMP)
    END,
    `review_round` = CASE
        WHEN `resolved` = 1 THEN 3
        ELSE 0
    END,
    `last_review_result` = CASE
        WHEN `resolved` = 1 THEN 'pass'
        ELSE 'fail'
    END,
    `mastered_at` = CASE
        WHEN `resolved` = 1 THEN COALESCE(`update_time`, CURRENT_TIMESTAMP)
        ELSE NULL
    END
WHERE `status` IS NULL
   OR `status` = ''
   OR `next_review_at` IS NULL
   OR `last_review_result` IS NULL;

CREATE TABLE IF NOT EXISTS `user_learning_profile` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `current_track` VARCHAR(32) NOT NULL DEFAULT 'beginner',
    `self_assessment_level` VARCHAR(64) DEFAULT NULL,
    `recommended_chapter_id` BIGINT DEFAULT NULL,
    `recommended_article_id` BIGINT DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_learning_profile_user` (`user_id`),
    KEY `idx_user_learning_profile_track` (`current_track`),
    CONSTRAINT `fk_user_learning_profile_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_onboarding_answer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `question_code` VARCHAR(64) NOT NULL,
    `answer_value` VARCHAR(128) NOT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_onboarding_answer_user` (`user_id`),
    KEY `idx_user_onboarding_answer_question` (`question_code`),
    CONSTRAINT `fk_user_onboarding_answer_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
