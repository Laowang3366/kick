ALTER TABLE tutorial_category
    ADD COLUMN audience_track VARCHAR(32) NOT NULL DEFAULT 'general' AFTER description;

UPDATE tutorial_category tc
LEFT JOIN (
    SELECT
        category_id,
        SUM(CASE WHEN audience_track = 'beginner' THEN 1 ELSE 0 END) AS beginner_count,
        SUM(CASE WHEN audience_track = 'advanced' THEN 1 ELSE 0 END) AS advanced_count
    FROM tutorial_article
    WHERE category_id IS NOT NULL
    GROUP BY category_id
) stats ON stats.category_id = tc.id
SET tc.audience_track = CASE
    WHEN COALESCE(stats.beginner_count, 0) > 0 AND COALESCE(stats.advanced_count, 0) = 0 THEN 'beginner'
    WHEN COALESCE(stats.advanced_count, 0) > 0 AND COALESCE(stats.beginner_count, 0) = 0 THEN 'advanced'
    ELSE 'general'
END;
