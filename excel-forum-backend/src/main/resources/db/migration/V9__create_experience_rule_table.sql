CREATE TABLE IF NOT EXISTS `experience_rule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `rule_key` VARCHAR(100) NOT NULL COMMENT '规则键',
    `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '规则描述',
    `min_exp` INT DEFAULT 0 COMMENT '最小经验值',
    `max_exp` INT DEFAULT 0 COMMENT '最大经验值',
    `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_experience_rule_key` (`rule_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `experience_rule` (`rule_key`, `name`, `description`, `min_exp`, `max_exp`, `enabled`)
VALUES
    ('post_direct_publish', '直接发帖', '管理员直接发布帖子获得经验', 10, 10, 1),
    ('post_approved', '帖子过审', '普通用户帖子审核通过后获得经验', 10, 10, 1),
    ('reply_create', '发布回复', '用户成功发布回复获得经验', 5, 5, 1),
    ('daily_checkin', '每日签到', '每日签到随机经验范围', 1, 20, 1)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `min_exp` = VALUES(`min_exp`),
    `max_exp` = VALUES(`max_exp`),
    `enabled` = VALUES(`enabled`);
