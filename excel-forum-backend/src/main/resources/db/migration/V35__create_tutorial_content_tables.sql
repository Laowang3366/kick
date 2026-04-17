CREATE TABLE IF NOT EXISTS tutorial_category (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tutorial_article (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    title VARCHAR(180) NOT NULL,
    summary VARCHAR(1000) NULL,
    content LONGTEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tutorial_article_category FOREIGN KEY (category_id) REFERENCES tutorial_category(id) ON DELETE CASCADE
);

CREATE INDEX idx_tutorial_category_enabled_sort ON tutorial_category(enabled, sort_order, id);
CREATE INDEX idx_tutorial_article_category_enabled_sort ON tutorial_article(category_id, enabled, sort_order, id);
