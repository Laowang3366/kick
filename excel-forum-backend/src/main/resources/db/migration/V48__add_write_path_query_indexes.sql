-- MySQL does not provide portable ADD INDEX IF NOT EXISTS syntax across the
-- versions this project may run on. Flyway applies this migration once; use
-- scripts/perf/mysql-diagnostics.sql to check index presence before any manual
-- backport.

ALTER TABLE `practice_answer`
    ADD KEY `idx_practice_answer_record_correct_question` (`record_id`, `is_correct`, `question_id`);

ALTER TABLE `practice_attempt`
    ADD KEY `idx_practice_attempt_status_time_user` (`result_status`, `submit_time`, `user_id`),
    ADD KEY `idx_practice_attempt_user_level_status_time` (`user_id`, `level_id`, `result_status`, `submit_time`);

ALTER TABLE `user_wrong_question`
    ADD KEY `idx_user_wrong_question_unresolved_time` (`user_id`, `resolved`, `last_wrong_time`);

ALTER TABLE `message`
    ADD KEY `idx_message_from_to_time` (`from_user_id`, `to_user_id`, `create_time`, `id`),
    ADD KEY `idx_message_to_read_from_time` (`to_user_id`, `is_read`, `from_user_id`, `create_time`);

ALTER TABLE `notification`
    ADD KEY `idx_notification_user_type_time` (`user_id`, `type`, `create_time`);
