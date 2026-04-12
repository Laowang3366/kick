CREATE TABLE IF NOT EXISTS `experience_level_rule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `level` INT NOT NULL COMMENT '等级值',
    `name` VARCHAR(50) NOT NULL COMMENT '等级名称',
    `threshold` INT NOT NULL DEFAULT 0 COMMENT '达到该等级所需经验阈值',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_experience_level_rule_level` (`level`),
    KEY `idx_experience_level_rule_enabled_sort` (`enabled`, `sort_order`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='等级定义规则';

INSERT INTO `experience_level_rule` (`level`, `name`, `threshold`, `enabled`, `sort_order`)
VALUES
    (1, '新手', 0, 1, 10),
    (2, '入门', 100, 1, 20),
    (3, '熟练', 500, 1, 30),
    (4, '专家', 1000, 1, 40),
    (5, '大师', 5000, 1, 50),
    (6, '传说', 10000, 1, 60)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `threshold` = VALUES(`threshold`),
    `enabled` = VALUES(`enabled`),
    `sort_order` = VALUES(`sort_order`);
