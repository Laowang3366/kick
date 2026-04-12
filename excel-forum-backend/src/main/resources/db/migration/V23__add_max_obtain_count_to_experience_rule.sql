ALTER TABLE `experience_rule`
    ADD COLUMN `max_obtain_count` INT DEFAULT NULL COMMENT '单个用户在该规则下最多可获得次数' AFTER `enabled`;

