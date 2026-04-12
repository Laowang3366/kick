ALTER TABLE practice_question_submission
    ADD COLUMN points INT NOT NULL DEFAULT 0 AFTER difficulty,
    ADD COLUMN answer_sheet VARCHAR(255) NULL AFTER template_file_url,
    ADD COLUMN answer_range VARCHAR(64) NULL AFTER answer_sheet,
    ADD COLUMN answer_snapshot_json LONGTEXT NULL AFTER answer_range,
    ADD COLUMN check_formula TINYINT(1) NOT NULL DEFAULT 0 AFTER answer_snapshot_json,
    ADD COLUMN grading_rule_json LONGTEXT NULL AFTER check_formula,
    ADD COLUMN expected_snapshot_json LONGTEXT NULL AFTER grading_rule_json,
    ADD COLUMN sheet_count_limit INT NOT NULL DEFAULT 5 AFTER expected_snapshot_json,
    ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER sheet_count_limit;
