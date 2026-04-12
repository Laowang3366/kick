ALTER TABLE practice_question_submission
    ADD COLUMN review_note TEXT NULL AFTER status,
    ADD COLUMN reviewer_id BIGINT NULL AFTER review_note,
    ADD COLUMN reviewed_time DATETIME NULL AFTER reviewer_id;

CREATE INDEX idx_practice_question_submission_status_time
    ON practice_question_submission(status, create_time);
