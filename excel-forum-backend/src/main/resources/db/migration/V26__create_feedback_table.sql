CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    status INT NOT NULL DEFAULT 0,
    handler_id BIGINT NULL,
    handle_note VARCHAR(255) NULL,
    handle_time DATETIME NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES user(id),
    CONSTRAINT fk_feedback_handler FOREIGN KEY (handler_id) REFERENCES user(id)
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_create_time ON feedback(create_time);
