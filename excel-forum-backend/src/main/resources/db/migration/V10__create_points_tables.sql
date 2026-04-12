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
