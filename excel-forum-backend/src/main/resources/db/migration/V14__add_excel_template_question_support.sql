CREATE TABLE IF NOT EXISTS `question_excel_template` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `question_id` BIGINT NOT NULL COMMENT '题目ID',
    `template_file_url` VARCHAR(255) NOT NULL COMMENT '模板文件地址',
    `grading_rule_json` LONGTEXT NOT NULL COMMENT '判题规则JSON',
    `expected_snapshot_json` LONGTEXT DEFAULT NULL COMMENT '标准结果快照JSON',
    `sheet_count_limit` INT NOT NULL DEFAULT 5 COMMENT '工作表数量上限',
    `version` INT NOT NULL DEFAULT 1 COMMENT '模板版本',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_question_excel_template_question_id` (`question_id`),
    CONSTRAINT `fk_question_excel_template_question_id`
        FOREIGN KEY (`question_id`) REFERENCES `question` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `practice_answer`
    ADD COLUMN `grading_detail` LONGTEXT DEFAULT NULL COMMENT '模板题判题明细JSON' AFTER `correct_answer`;
