DELETE FROM tutorial_article
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '逻辑判断' LIMIT 1)
  AND title = 'IF'
  AND id NOT IN (
      SELECT keep_id
      FROM (
          SELECT MIN(id) AS keep_id
          FROM tutorial_article
          WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '逻辑判断' LIMIT 1)
            AND title = 'IF'
      ) kept
  );
