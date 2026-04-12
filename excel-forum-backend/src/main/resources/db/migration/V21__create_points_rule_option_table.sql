CREATE TABLE IF NOT EXISTS `points_rule_option` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(20) NOT NULL COMMENT '选项分类: type/task_key',
    `option_value` VARCHAR(100) NOT NULL COMMENT '选项值',
    `label` VARCHAR(100) NOT NULL COMMENT '显示名称',
    `sort_order` INT DEFAULT 0 COMMENT '排序值',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_points_rule_option_kind_value` (`kind`, `option_value`),
    KEY `idx_points_rule_option_kind_sort` (`kind`, `sort_order`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分规则字典选项';

INSERT INTO `points_rule_option` (`kind`, `option_value`, `label`, `sort_order`)
VALUES
    ('type', 'daily', '每日任务', 10),
    ('type', 'once', '一次性任务', 20),
    ('type', 'system', '系统规则', 30),
    ('task_key', 'daily_checkin', '每日签到', 10),
    ('task_key', 'daily_post', '今日发帖', 20),
    ('task_key', 'daily_reply', '今日回复', 30),
    ('task_key', 'first_post', '首次发帖', 40),
    ('task_key', 'first_reply', '首次回复', 50),
    ('task_key', 'daily_practice', '今日练习', 60),
    ('task_key', 'first_practice', '首次练习', 70)
ON DUPLICATE KEY UPDATE
    `label` = VALUES(`label`),
    `sort_order` = VALUES(`sort_order`);

INSERT INTO `points_rule_option` (`kind`, `option_value`, `label`, `sort_order`)
SELECT 'type', source.type, source.type, 1000
FROM (
    SELECT DISTINCT TRIM(`type`) AS `type`
    FROM `points_rule`
    WHERE `type` IS NOT NULL AND TRIM(`type`) <> ''
) source
LEFT JOIN `points_rule_option` existing
    ON existing.`kind` = 'type'
   AND existing.`option_value` COLLATE utf8mb4_0900_ai_ci = source.`type` COLLATE utf8mb4_0900_ai_ci
WHERE existing.`id` IS NULL;

INSERT INTO `points_rule_option` (`kind`, `option_value`, `label`, `sort_order`)
SELECT 'task_key', source.task_key, source.task_key, 1000
FROM (
    SELECT DISTINCT TRIM(`task_key`) AS `task_key`
    FROM `points_rule`
    WHERE `task_key` IS NOT NULL AND TRIM(`task_key`) <> ''
) source
LEFT JOIN `points_rule_option` existing
    ON existing.`kind` = 'task_key'
   AND existing.`option_value` COLLATE utf8mb4_0900_ai_ci = source.`task_key` COLLATE utf8mb4_0900_ai_ci
WHERE existing.`id` IS NULL;
