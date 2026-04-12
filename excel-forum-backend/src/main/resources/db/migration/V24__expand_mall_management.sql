CREATE TABLE IF NOT EXISTS `mall_item_type` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `type_value` VARCHAR(40) NOT NULL COMMENT '内部标识',
    `label` VARCHAR(80) NOT NULL COMMENT '显示名称',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_mall_item_type_value` (`type_value`),
    KEY `idx_mall_item_type_enabled_sort` (`enabled`, `sort_order`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商城商品类型';

INSERT INTO `mall_item_type` (`type_value`, `label`, `enabled`, `sort_order`)
VALUES
    ('badge', '社区头衔', 1, 10),
    ('privilege', '特权服务', 1, 20),
    ('virtual', '虚拟装扮', 1, 30),
    ('coupon', '优惠券', 1, 40),
    ('prop', '功能道具', 1, 50)
ON DUPLICATE KEY UPDATE
    `label` = VALUES(`label`),
    `enabled` = VALUES(`enabled`),
    `sort_order` = VALUES(`sort_order`);

INSERT INTO `mall_item_type` (`type_value`, `label`, `enabled`, `sort_order`)
SELECT source.`type`, source.`type`, 1, 1000
FROM (
    SELECT DISTINCT TRIM(`type`) AS `type`
    FROM `mall_item`
    WHERE `type` IS NOT NULL AND TRIM(`type`) <> ''
) source
LEFT JOIN `mall_item_type` existing
    ON existing.`type_value` COLLATE utf8mb4_0900_ai_ci = source.`type` COLLATE utf8mb4_0900_ai_ci
WHERE existing.`id` IS NULL;

ALTER TABLE `mall_item`
    ADD COLUMN `cover_image` VARCHAR(255) DEFAULT NULL COMMENT '封面图' AFTER `description`,
    ADD COLUMN `stock` INT DEFAULT NULL COMMENT '库存，NULL 表示不限' AFTER `theme_color`,
    ADD COLUMN `redeemed_count` INT NOT NULL DEFAULT 0 COMMENT '已兑换数量' AFTER `stock`,
    ADD COLUMN `per_user_limit` INT DEFAULT NULL COMMENT '每人限兑次数，NULL 表示不限' AFTER `redeemed_count`,
    ADD COLUMN `total_limit` INT DEFAULT NULL COMMENT '总限兑次数，NULL 表示不限' AFTER `per_user_limit`,
    ADD COLUMN `exchange_notice` TEXT DEFAULT NULL COMMENT '兑换须知' AFTER `total_limit`,
    ADD COLUMN `available_from` DATETIME DEFAULT NULL COMMENT '开始时间' AFTER `exchange_notice`,
    ADD COLUMN `available_until` DATETIME DEFAULT NULL COMMENT '结束时间' AFTER `available_from`,
    ADD COLUMN `delivery_type` VARCHAR(30) NOT NULL DEFAULT 'virtual_auto' COMMENT '发放方式' AFTER `available_until`;

ALTER TABLE `mall_item`
    ADD KEY `idx_mall_item_available` (`enabled`, `available_from`, `available_until`),
    ADD KEY `idx_mall_item_type_sort` (`type`, `sort_order`, `id`);

ALTER TABLE `mall_redemption`
    ADD COLUMN `remark` VARCHAR(255) DEFAULT NULL COMMENT '处理备注' AFTER `status`,
    ADD COLUMN `processed_by` BIGINT DEFAULT NULL COMMENT '处理人' AFTER `remark`,
    ADD COLUMN `processed_time` DATETIME DEFAULT NULL COMMENT '处理时间' AFTER `processed_by`;

ALTER TABLE `mall_redemption`
    ADD KEY `idx_mall_redemption_status_time` (`status`, `create_time`),
    ADD KEY `idx_mall_redemption_user_item` (`user_id`, `item_id`, `status`);

UPDATE `mall_redemption`
SET `status` = 'fulfilled'
WHERE `status` = 'completed';

UPDATE `mall_item` item
LEFT JOIN (
    SELECT `item_id`, COUNT(*) AS redeemed_count
    FROM `mall_redemption`
    WHERE `status` <> 'cancelled'
    GROUP BY `item_id`
) redemption_count
    ON redemption_count.`item_id` = item.`id`
SET item.`redeemed_count` = COALESCE(redemption_count.`redeemed_count`, 0);
