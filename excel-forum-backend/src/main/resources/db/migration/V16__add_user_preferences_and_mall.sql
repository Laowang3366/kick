ALTER TABLE `user`
    ADD COLUMN `job_title` VARCHAR(100) DEFAULT NULL COMMENT 'job title',
    ADD COLUMN `location` VARCHAR(100) DEFAULT NULL COMMENT 'location',
    ADD COLUMN `website` VARCHAR(255) DEFAULT NULL COMMENT 'website',
    ADD COLUMN `cover_image` VARCHAR(255) DEFAULT NULL COMMENT 'cover image',
    ADD COLUMN `notification_email_enabled` TINYINT(1) DEFAULT 1 COMMENT 'email notification enabled',
    ADD COLUMN `notification_push_enabled` TINYINT(1) DEFAULT 1 COMMENT 'push notification enabled',
    ADD COLUMN `theme_preference` VARCHAR(20) DEFAULT 'light' COMMENT 'theme preference';

ALTER TABLE `site_notification`
    ADD COLUMN `attachments` TEXT DEFAULT NULL COMMENT 'attachments json';

CREATE TABLE IF NOT EXISTS `mall_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `price` INT NOT NULL DEFAULT 0,
    `description` VARCHAR(255) DEFAULT NULL,
    `icon_key` VARCHAR(50) DEFAULT NULL,
    `theme_color` VARCHAR(50) DEFAULT NULL,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order` INT NOT NULL DEFAULT 0,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_mall_item_name` (`name`),
    KEY `idx_mall_item_enabled_sort` (`enabled`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mall_redemption` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `item_id` BIGINT NOT NULL,
    `item_name` VARCHAR(120) NOT NULL,
    `item_type` VARCHAR(40) NOT NULL,
    `price` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_mall_redemption_user_time` (`user_id`, `create_time`),
    KEY `idx_mall_redemption_item_id` (`item_id`),
    CONSTRAINT `fk_mall_redemption_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mall_redemption_item` FOREIGN KEY (`item_id`) REFERENCES `mall_item`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `mall_item` (`id`, `name`, `type`, `price`, `description`, `icon_key`, `theme_color`, `enabled`, `sort_order`) VALUES
(1, '社区专属头衔【数据大师】', 'badge', 1000, '永久佩戴，彰显尊贵身份', 'award', 'amber', 1, 1),
(2, '高级发帖权限（带彩色标题）', 'privilege', 500, '让你的帖子在列表中脱颖而出，有效期30天', 'sparkles', 'purple', 1, 2),
(3, 'VIP专属表情包', 'virtual', 300, '解锁50个动态Excel专属表情包，聊天更欢乐', 'gift', 'rose', 1, 3),
(4, 'Excel实战课程八折券', 'coupon', 2000, '可用于兑换官方指定高级实战课程，限时使用', 'ticket', 'blue', 1, 4),
(5, '加速签到卡', 'prop', 150, '补签漏签一天，保持连续签到记录', 'clock', 'teal', 1, 5),
(6, '全站免广告（30天）', 'privilege', 800, '享受纯净无打扰的社区体验', 'zap', 'orange', 1, 6);
