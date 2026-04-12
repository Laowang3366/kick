CREATE TABLE IF NOT EXISTS practice_question_submission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    question_category_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    difficulty INT NOT NULL DEFAULT 1,
    template_file_url VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_practice_question_submission_user FOREIGN KEY (user_id) REFERENCES user(id),
    CONSTRAINT fk_practice_question_submission_category FOREIGN KEY (question_category_id) REFERENCES question_category(id)
);

CREATE INDEX idx_practice_question_submission_user_time
    ON practice_question_submission(user_id, create_time);
