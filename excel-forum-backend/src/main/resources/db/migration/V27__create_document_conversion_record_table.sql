CREATE TABLE IF NOT EXISTS document_conversion_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    result_file_name VARCHAR(255) NOT NULL,
    result_url VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_conversion_record_user FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE INDEX idx_document_conversion_record_user_time
    ON document_conversion_record(user_id, create_time);
