CREATE TABLE `question_category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL COMMENT '题库分类名称',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '题库分类描述',
    `group_name` VARCHAR(100) DEFAULT NULL COMMENT '题库分组名称',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_question_category_enabled` (`enabled`),
    KEY `idx_question_category_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `question`
    ADD COLUMN `question_category_id` BIGINT DEFAULT NULL COMMENT '题库分类ID';

ALTER TABLE `practice_record`
    ADD COLUMN `question_category_id` BIGINT DEFAULT NULL COMMENT '题库分类ID';

INSERT INTO `question_category` (`id`, `name`, `description`, `group_name`, `sort_order`, `enabled`, `create_time`, `update_time`)
SELECT `id`, `name`, `description`, `group_name`, COALESCE(`sort_order`, 0), 1, COALESCE(`create_time`, NOW()), COALESCE(`update_time`, NOW())
FROM `category`
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `group_name` = VALUES(`group_name`),
    `sort_order` = VALUES(`sort_order`),
    `enabled` = VALUES(`enabled`);

INSERT INTO `question_category` (`id`, `name`, `description`, `group_name`, `sort_order`, `enabled`)
VALUES (1000000, '未分类题库', '未绑定题库分类的历史题目将归入这里', '未分组', 9999, 1)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `group_name` = VALUES(`group_name`),
    `sort_order` = VALUES(`sort_order`),
    `enabled` = VALUES(`enabled`);

UPDATE `question`
SET `question_category_id` = `category_id`
WHERE `question_category_id` IS NULL AND `category_id` IS NOT NULL;

UPDATE `question`
SET `question_category_id` = 1000000
WHERE `question_category_id` IS NULL;

UPDATE `practice_record`
SET `question_category_id` = `category_id`
WHERE `question_category_id` IS NULL AND `category_id` IS NOT NULL;

UPDATE `practice_record`
SET `question_category_id` = 1000000
WHERE `question_category_id` IS NULL;
