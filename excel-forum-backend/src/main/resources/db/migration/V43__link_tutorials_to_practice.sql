ALTER TABLE tutorial_article
    ADD COLUMN one_line_usage VARCHAR(255) NULL AFTER summary;

ALTER TABLE tutorial_article
    ADD COLUMN audience_track VARCHAR(32) NOT NULL DEFAULT 'general' AFTER content;

ALTER TABLE tutorial_article
    ADD COLUMN difficulty VARCHAR(32) NOT NULL DEFAULT 'basic' AFTER audience_track;

ALTER TABLE tutorial_article
    ADD COLUMN recommend_level INT NOT NULL DEFAULT 0 AFTER difficulty;

ALTER TABLE tutorial_article
    ADD COLUMN function_tags VARCHAR(500) NULL AFTER recommend_level;

ALTER TABLE tutorial_article
    ADD COLUMN starter TINYINT(1) NOT NULL DEFAULT 0 AFTER function_tags;

ALTER TABLE tutorial_article
    ADD COLUMN home_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER starter;

CREATE TABLE IF NOT EXISTS tutorial_article_chapter_rel (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    article_id BIGINT NOT NULL,
    chapter_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tutorial_article_chapter_rel_article FOREIGN KEY (article_id) REFERENCES tutorial_article(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutorial_article_chapter_rel_chapter FOREIGN KEY (chapter_id) REFERENCES practice_chapter(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tutorial_article_chapter (article_id, chapter_id),
    KEY idx_tutorial_article_chapter_rel_chapter (chapter_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tutorial_article_question_rel (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    article_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tutorial_article_question_rel_article FOREIGN KEY (article_id) REFERENCES tutorial_article(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutorial_article_question_rel_question FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tutorial_article_question (article_id, question_id),
    KEY idx_tutorial_article_question_rel_question (question_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE tutorial_article
SET one_line_usage = COALESCE(NULLIF(one_line_usage, ''), summary),
    audience_track = COALESCE(NULLIF(audience_track, ''), 'beginner'),
    difficulty = COALESCE(NULLIF(difficulty, ''), 'basic'),
    recommend_level = COALESCE(recommend_level, 1),
    starter = CASE WHEN sort_order <= 20 THEN 1 ELSE starter END,
    home_featured = CASE WHEN sort_order <= 30 THEN 1 ELSE home_featured END;

INSERT INTO tutorial_article_chapter_rel (article_id, chapter_id, sort_order)
SELECT ta.id,
       pc.id,
       COALESCE(ta.sort_order, 0)
FROM tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
JOIN practice_chapter pc ON (
    (tc.name = '函数基础' AND pc.name = 'Excel基础')
    OR (tc.name = '逻辑判断' AND pc.name = '逻辑判断')
    OR (tc.name = '查找与引用' AND pc.name = '查找引用')
    OR (tc.name = '文本处理' AND pc.name = '文本处理')
    OR (tc.name = '日期与时间' AND pc.name = '时间日期')
    OR (tc.name = '动态数组' AND pc.name = '动态数组')
)
WHERE NOT EXISTS (
    SELECT 1
    FROM tutorial_article_chapter_rel rel
    WHERE rel.article_id = ta.id
      AND rel.chapter_id = pc.id
);
