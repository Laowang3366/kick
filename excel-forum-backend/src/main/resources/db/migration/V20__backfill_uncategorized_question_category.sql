INSERT INTO `question_category` (`id`, `name`, `description`, `group_name`, `sort_order`, `enabled`)
VALUES (1000000, '未分类题库', '未绑定题目分类的历史题目将归入这里', '未分组', 9999, 1)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `group_name` = VALUES(`group_name`),
    `sort_order` = VALUES(`sort_order`),
    `enabled` = VALUES(`enabled`);

UPDATE `question`
SET `question_category_id` = 1000000
WHERE `type` = 'excel_template'
  AND `enabled` = 1
  AND `question_category_id` IS NULL;

UPDATE `practice_record`
SET `question_category_id` = 1000000
WHERE `question_category_id` IS NULL
  AND EXISTS (
      SELECT 1
      FROM `practice_answer`
      WHERE `practice_answer`.`record_id` = `practice_record`.`id`
        AND `practice_answer`.`question_type` = 'excel_template'
  );
