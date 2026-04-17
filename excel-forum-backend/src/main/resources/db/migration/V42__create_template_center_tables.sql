CREATE TABLE IF NOT EXISTS template_center_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    industry_category VARCHAR(32) NOT NULL,
    use_scenario VARCHAR(255) NULL,
    preview_image_url VARCHAR(512) NULL,
    template_description TEXT NULL,
    functions_used TEXT NULL,
    difficulty_level VARCHAR(32) NOT NULL DEFAULT '入门',
    download_cost_points INT NOT NULL DEFAULT 0,
    template_file_url VARCHAR(512) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_template_center_item_category (industry_category),
    KEY idx_template_center_item_enabled (enabled),
    KEY idx_template_center_item_sort (sort_order, id)
);

CREATE TABLE IF NOT EXISTS template_download_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL,
    points_cost INT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_template_download_user_template (user_id, template_id),
    KEY idx_template_download_user (user_id),
    KEY idx_template_download_template (template_id)
);
