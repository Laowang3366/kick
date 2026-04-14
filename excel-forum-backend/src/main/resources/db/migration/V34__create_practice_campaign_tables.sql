CREATE TABLE IF NOT EXISTS `practice_world` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_practice_world_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practice_chapter` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `world_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `unlock_star` INT NOT NULL DEFAULT 0,
    `required_level` INT NOT NULL DEFAULT 0,
    `sort_order` INT NOT NULL DEFAULT 0,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_practice_chapter_world_name` (`world_id`, `name`),
    KEY `idx_practice_chapter_world` (`world_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practice_level` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `chapter_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `level_type` VARCHAR(32) NOT NULL DEFAULT 'normal',
    `difficulty` VARCHAR(32) NOT NULL DEFAULT 'easy',
    `target_time_seconds` INT NOT NULL DEFAULT 300,
    `reward_exp` INT NOT NULL DEFAULT 10,
    `reward_points` INT NOT NULL DEFAULT 5,
    `first_pass_bonus` INT NOT NULL DEFAULT 0,
    `sort_order` INT NOT NULL DEFAULT 0,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_practice_level_question` (`question_id`),
    KEY `idx_practice_level_chapter` (`chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_level_progress` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `level_id` BIGINT NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'locked',
    `stars` INT NOT NULL DEFAULT 0,
    `best_score` INT NOT NULL DEFAULT 0,
    `best_time_seconds` INT DEFAULT NULL,
    `pass_count` INT NOT NULL DEFAULT 0,
    `fail_count` INT NOT NULL DEFAULT 0,
    `first_pass_time` DATETIME DEFAULT NULL,
    `last_attempt_time` DATETIME DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_level_progress` (`user_id`, `level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_chapter_progress` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `chapter_id` BIGINT NOT NULL,
    `unlocked` TINYINT(1) NOT NULL DEFAULT 0,
    `completed` TINYINT(1) NOT NULL DEFAULT 0,
    `total_stars` INT NOT NULL DEFAULT 0,
    `cleared_levels` INT NOT NULL DEFAULT 0,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_chapter_progress` (`user_id`, `chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practice_attempt` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `level_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `attempt_type` VARCHAR(32) NOT NULL DEFAULT 'campaign',
    `result_status` VARCHAR(32) NOT NULL DEFAULT 'failed',
    `score` INT NOT NULL DEFAULT 0,
    `stars` INT NOT NULL DEFAULT 0,
    `used_seconds` INT DEFAULT NULL,
    `error_count` INT NOT NULL DEFAULT 0,
    `gained_exp` INT NOT NULL DEFAULT 0,
    `gained_points` INT NOT NULL DEFAULT 0,
    `is_first_pass` TINYINT(1) NOT NULL DEFAULT 0,
    `submit_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_challenge` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `challenge_date` DATE NOT NULL,
    `level_id` BIGINT NOT NULL,
    `reward_exp` INT NOT NULL DEFAULT 20,
    `reward_points` INT NOT NULL DEFAULT 10,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_daily_challenge_date` (`challenge_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_wrong_question` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `level_id` BIGINT DEFAULT NULL,
    `wrong_count` INT NOT NULL DEFAULT 1,
    `last_wrong_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved` TINYINT(1) NOT NULL DEFAULT 0,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_wrong_question` (`user_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `practice_world` (`name`, `description`, `sort_order`, `enabled`)
SELECT 'Excel 闯关', '从基础到进阶，逐步攻克 Excel 关卡试炼', 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM `practice_world` WHERE `name` = 'Excel 闯关'
);

INSERT INTO `practice_chapter` (`world_id`, `name`, `description`, `unlock_star`, `required_level`, `sort_order`, `enabled`)
SELECT
    1,
    qc.`name`,
    COALESCE(qc.`description`, CONCAT(qc.`name`, ' 章节')),
    0,
    0,
    COALESCE(qc.`id`, 0),
    1
FROM `question_category` qc
WHERE EXISTS (
    SELECT 1
    FROM `question` q
    WHERE q.`question_category_id` = qc.`id`
      AND q.`enabled` = 1
      AND q.`type` = 'excel_template'
)
AND NOT EXISTS (
    SELECT 1
    FROM `practice_chapter` pc
    WHERE pc.`world_id` = 1
      AND pc.`name` = qc.`name`
);

INSERT INTO `practice_chapter` (`world_id`, `name`, `description`, `unlock_star`, `required_level`, `sort_order`, `enabled`)
SELECT 1, '未分类挑战', '未分类的模板练习集合', 0, 0, 999999, 1
WHERE EXISTS (
    SELECT 1
    FROM `question` q
    WHERE q.`enabled` = 1
      AND q.`type` = 'excel_template'
      AND q.`question_category_id` IS NULL
)
AND NOT EXISTS (
    SELECT 1
    FROM `practice_chapter` pc
    WHERE pc.`world_id` = 1
      AND pc.`name` = '未分类挑战'
);

INSERT INTO `practice_level` (
    `chapter_id`,
    `question_id`,
    `title`,
    `level_type`,
    `difficulty`,
    `target_time_seconds`,
    `reward_exp`,
    `reward_points`,
    `first_pass_bonus`,
    `sort_order`,
    `enabled`
)
SELECT
    pc.`id`,
    q.`id`,
    COALESCE(NULLIF(q.`title`, ''), CONCAT('关卡 ', q.`id`)),
    CASE
        WHEN COALESCE(q.`difficulty`, 1) >= 4 THEN 'boss'
        WHEN COALESCE(q.`difficulty`, 1) = 3 THEN 'elite'
        ELSE 'normal'
    END,
    CASE
        WHEN COALESCE(q.`difficulty`, 1) >= 4 THEN 'expert'
        WHEN COALESCE(q.`difficulty`, 1) = 3 THEN 'hard'
        WHEN COALESCE(q.`difficulty`, 1) = 2 THEN 'medium'
        ELSE 'easy'
    END,
    CASE
        WHEN COALESCE(q.`difficulty`, 1) >= 4 THEN 720
        WHEN COALESCE(q.`difficulty`, 1) = 3 THEN 540
        WHEN COALESCE(q.`difficulty`, 1) = 2 THEN 420
        ELSE 300
    END,
    CASE
        WHEN COALESCE(q.`difficulty`, 1) >= 4 THEN 50
        WHEN COALESCE(q.`difficulty`, 1) = 3 THEN 35
        WHEN COALESCE(q.`difficulty`, 1) = 2 THEN 20
        ELSE 10
    END,
    COALESCE(NULLIF(q.`points`, 0), 5),
    0,
    q.`id`,
    1
FROM `question` q
LEFT JOIN `question_category` qc ON q.`question_category_id` = qc.`id`
JOIN `practice_chapter` pc
  ON pc.`world_id` = 1
 AND pc.`name` = COALESCE(qc.`name`, '未分类挑战')
WHERE q.`enabled` = 1
  AND q.`type` = 'excel_template'
  AND NOT EXISTS (
      SELECT 1
      FROM `practice_level` pl
      WHERE pl.`question_id` = q.`id`
  );
