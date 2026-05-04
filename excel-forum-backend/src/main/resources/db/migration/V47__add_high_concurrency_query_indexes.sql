ALTER TABLE `practice_answer`
    ADD KEY `idx_practice_answer_correct` (`is_correct`);

ALTER TABLE `practice_record`
    ADD KEY `idx_practice_record_status_submit_user` (`status`, `submit_time`, `user_id`);

ALTER TABLE `question`
    ADD KEY `idx_question_enabled_type_category` (`enabled`, `type`, `question_category_id`, `difficulty`, `id`);
