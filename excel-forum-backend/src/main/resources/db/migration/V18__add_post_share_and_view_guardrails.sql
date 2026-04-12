ALTER TABLE `post_view`
    ADD COLUMN `viewer_key` VARCHAR(96) DEFAULT NULL COMMENT 'viewer dedupe key' AFTER `ip_address`;

UPDATE `post_view`
SET `viewer_key` = CASE
    WHEN `user_id` IS NOT NULL THEN CONCAT('u:', `user_id`)
    WHEN `ip_address` IS NOT NULL AND `ip_address` <> '' THEN CONCAT('ip:', `ip_address`)
    ELSE CONCAT('anon:', `id`)
END
WHERE `viewer_key` IS NULL;

DELETE pv1 FROM `post_view` pv1
INNER JOIN `post_view` pv2
    ON pv1.`post_id` = pv2.`post_id`
    AND pv1.`viewer_key` = pv2.`viewer_key`
    AND pv1.`id` > pv2.`id`;

ALTER TABLE `post_view`
    MODIFY COLUMN `viewer_key` VARCHAR(96) NOT NULL;

CREATE UNIQUE INDEX `uk_post_view_post_viewer`
    ON `post_view` (`post_id`, `viewer_key`);

CREATE TABLE IF NOT EXISTS `post_share` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_post_share_user_post` (`user_id`, `post_id`),
    KEY `idx_post_share_post_id` (`post_id`),
    CONSTRAINT `fk_post_share_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_post_share_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
