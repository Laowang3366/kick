CREATE TABLE IF NOT EXISTS `user_exp_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `biz_type` VARCHAR(64) NOT NULL,
    `biz_id` BIGINT DEFAULT NULL,
    `exp_change` INT NOT NULL DEFAULT 0,
    `reason` VARCHAR(255) DEFAULT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_exp_log_biz` (`user_id`, `biz_type`, `biz_id`),
    KEY `idx_user_exp_log_user_id` (`user_id`),
    KEY `idx_user_exp_log_create_time` (`create_time`),
    CONSTRAINT `fk_user_exp_log_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
