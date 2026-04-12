ALTER TABLE `question_excel_template`
    ADD COLUMN `answer_sheet` VARCHAR(120) DEFAULT NULL COMMENT '答题工作表' AFTER `template_file_url`,
    ADD COLUMN `answer_range` VARCHAR(64) DEFAULT NULL COMMENT '答题区域' AFTER `answer_sheet`,
    ADD COLUMN `answer_snapshot_json` LONGTEXT DEFAULT NULL COMMENT '标准答案快照JSON' AFTER `answer_range`,
    ADD COLUMN `check_formula` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否检测公式' AFTER `answer_snapshot_json`;

ALTER TABLE `practice_answer`
    ADD COLUMN `reward_points` INT NOT NULL DEFAULT 0 COMMENT '本题奖励积分' AFTER `score`,
    ADD COLUMN `reward_granted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否发放奖励积分' AFTER `reward_points`;
