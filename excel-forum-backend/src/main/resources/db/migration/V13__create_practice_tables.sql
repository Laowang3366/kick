CREATE TABLE IF NOT EXISTS `practice_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
    `mode` VARCHAR(32) NOT NULL DEFAULT 'practice' COMMENT '练习模式',
    `question_count` INT NOT NULL DEFAULT 0 COMMENT '题目数量',
    `correct_count` INT NOT NULL DEFAULT 0 COMMENT '答对数量',
    `score` INT NOT NULL DEFAULT 0 COMMENT '得分',
    `status` VARCHAR(32) NOT NULL DEFAULT 'submitted' COMMENT '记录状态',
    `difficulty` INT DEFAULT NULL COMMENT '练习难度',
    `duration_seconds` INT NOT NULL DEFAULT 0 COMMENT '耗时秒数',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `submit_time` DATETIME NOT NULL COMMENT '提交时间',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_practice_record_user_id` (`user_id`),
    KEY `idx_practice_record_category_id` (`category_id`),
    KEY `idx_practice_record_submit_time` (`submit_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practice_answer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `record_id` BIGINT NOT NULL COMMENT '练习记录ID',
    `question_id` BIGINT NOT NULL COMMENT '题目ID',
    `question_type` VARCHAR(32) NOT NULL COMMENT '题目类型',
    `question_title` TEXT NOT NULL COMMENT '题目快照',
    `question_options` TEXT DEFAULT NULL COMMENT '选项快照',
    `question_explanation` TEXT DEFAULT NULL COMMENT '解析快照',
    `user_answer` TEXT DEFAULT NULL COMMENT '用户答案',
    `correct_answer` TEXT DEFAULT NULL COMMENT '正确答案',
    `is_correct` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否正确',
    `score` INT NOT NULL DEFAULT 0 COMMENT '得分',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_practice_answer_record_id` (`record_id`),
    KEY `idx_practice_answer_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `experience_rule` (`rule_key`, `name`, `description`, `min_exp`, `max_exp`, `enabled`)
VALUES ('practice_complete', '完成练习', '用户完成一次练习获得经验', 2, 2, 1)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `min_exp` = VALUES(`min_exp`),
    `max_exp` = VALUES(`max_exp`),
    `enabled` = VALUES(`enabled`);

INSERT INTO `points_rule` (`name`, `description`, `task_key`, `points`, `type`, `enabled`, `user_visible`, `sort_order`)
VALUES
    ('今日练习', '当天首次完成练习可获得积分奖励', 'daily_practice', 5, 'daily', 1, 1, 60),
    ('首次练习', '首次完成练习可获得积分奖励', 'first_practice', 12, 'once', 1, 1, 70)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `points` = VALUES(`points`),
    `type` = VALUES(`type`),
    `enabled` = VALUES(`enabled`),
    `user_visible` = VALUES(`user_visible`),
    `sort_order` = VALUES(`sort_order`);
