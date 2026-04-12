ALTER TABLE `points_rule`
    ADD COLUMN `task_key` VARCHAR(100) DEFAULT NULL COMMENT '任务标识' AFTER `description`,
    ADD COLUMN `user_visible` TINYINT(1) DEFAULT 1 COMMENT '用户端可见' AFTER `enabled`,
    ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序值' AFTER `user_visible`;

ALTER TABLE `points_record`
    ADD COLUMN `rule_id` BIGINT DEFAULT NULL COMMENT '规则ID' AFTER `user_id`,
    ADD COLUMN `task_key` VARCHAR(100) DEFAULT NULL COMMENT '任务标识' AFTER `rule_name`,
    ADD COLUMN `biz_id` BIGINT DEFAULT NULL COMMENT '业务ID' AFTER `task_key`,
    ADD COLUMN `task_date` DATE DEFAULT NULL COMMENT '任务日期' AFTER `biz_id`;

CREATE UNIQUE INDEX `uk_points_rule_task_key` ON `points_rule` (`task_key`);
CREATE INDEX `idx_points_record_task_key` ON `points_record` (`task_key`);
CREATE INDEX `idx_points_record_task_date` ON `points_record` (`task_date`);

INSERT INTO `points_rule` (`name`, `description`, `task_key`, `points`, `type`, `enabled`, `user_visible`, `sort_order`)
VALUES
    ('每日签到', '完成每日签到可获得积分奖励', 'daily_checkin', 5, 'daily', 1, 1, 10),
    ('今日发帖', '当天首次成功发帖可获得积分奖励', 'daily_post', 8, 'daily', 1, 1, 20),
    ('今日回复', '当天首次成功回复可获得积分奖励', 'daily_reply', 4, 'daily', 1, 1, 30),
    ('首次发帖', '首次发布帖子可获得积分奖励', 'first_post', 20, 'once', 1, 1, 40),
    ('首次回复', '首次发布回复可获得积分奖励', 'first_reply', 10, 'once', 1, 1, 50)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `points` = VALUES(`points`),
    `type` = VALUES(`type`),
    `enabled` = VALUES(`enabled`),
    `user_visible` = VALUES(`user_visible`),
    `sort_order` = VALUES(`sort_order`);
