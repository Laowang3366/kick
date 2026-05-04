-- MySQL diagnostics for write/auth/practice query tuning.
-- Run with an application DB user that can read INFORMATION_SCHEMA and, when
-- available, performance_schema. Do not paste credentials into this file.
--
-- Optional session variables for EXPLAIN templates:
-- SET @sample_user_id = 1;
-- SET @sample_other_user_id = 2;
-- SET @sample_level_id = 1;
-- SET @sample_question_id = 1;

SELECT VERSION() AS mysql_version, DATABASE() AS current_database;

SHOW VARIABLES
WHERE Variable_name IN (
    'slow_query_log',
    'long_query_time',
    'log_queries_not_using_indexes',
    'performance_schema',
    'innodb_buffer_pool_size',
    'innodb_flush_log_at_trx_commit',
    'sync_binlog'
);

SHOW GLOBAL STATUS
WHERE Variable_name IN (
    'Threads_connected',
    'Threads_running',
    'Questions',
    'Slow_queries',
    'Created_tmp_disk_tables',
    'Handler_read_first',
    'Handler_read_key',
    'Handler_read_next',
    'Handler_read_rnd_next',
    'Innodb_row_lock_current_waits',
    'Innodb_row_lock_time',
    'Innodb_row_lock_waits'
);

SELECT
    table_name,
    table_rows,
    ROUND(data_length / 1024 / 1024, 2) AS data_mb,
    ROUND(index_length / 1024 / 1024, 2) AS index_mb,
    ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
      'user',
      'practice_record',
      'practice_answer',
      'practice_attempt',
      'user_level_progress',
      'user_chapter_progress',
      'user_wrong_question',
      'practice_question_submission',
      'points_record',
      'user_exp_log',
      'message',
      'notification',
      'site_notification'
  )
ORDER BY total_mb DESC, table_name;

SELECT
    table_name,
    index_name,
    GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', ') AS columns,
    non_unique,
    index_type
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN (
      'user',
      'practice_record',
      'practice_answer',
      'practice_attempt',
      'user_wrong_question',
      'message',
      'notification',
      'practice_question_submission',
      'points_record',
      'user_exp_log'
  )
GROUP BY table_name, index_name, non_unique, index_type
ORDER BY table_name, index_name;

SELECT
    table_name,
    index_name,
    GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', ') AS columns
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN (
      'idx_practice_answer_record_correct_question',
      'idx_practice_attempt_status_time_user',
      'idx_practice_attempt_user_level_status_time',
      'idx_user_wrong_question_unresolved_time',
      'idx_message_from_to_time',
      'idx_message_to_read_from_time',
      'idx_notification_user_type_time'
  )
GROUP BY table_name, index_name
ORDER BY table_name, index_name;

SELECT
    digest_text,
    count_star,
    ROUND(sum_timer_wait / 1000000000000, 3) AS total_seconds,
    ROUND(avg_timer_wait / 1000000000000, 6) AS avg_seconds,
    sum_rows_examined,
    sum_rows_sent,
    first_seen,
    last_seen
FROM performance_schema.events_statements_summary_by_digest
WHERE schema_name = DATABASE()
  AND digest_text REGEXP '(practice_record|practice_answer|practice_attempt|user_wrong_question|message|notification|points_record|user_exp_log|`user`)'
ORDER BY sum_timer_wait DESC
LIMIT 20;

EXPLAIN FORMAT=JSON
SELECT id
FROM practice_record
WHERE user_id = COALESCE(@sample_user_id, 1)
  AND status = 'submitted';

EXPLAIN FORMAT=JSON
SELECT COUNT(*)
FROM practice_answer
WHERE record_id IN (
    SELECT id
    FROM practice_record
    WHERE user_id = COALESCE(@sample_user_id, 1)
      AND status = 'submitted'
)
  AND question_id = COALESCE(@sample_question_id, 1)
  AND is_correct = 1;

EXPLAIN FORMAT=JSON
SELECT COUNT(*)
FROM practice_attempt
WHERE user_id = COALESCE(@sample_user_id, 1)
  AND level_id = COALESCE(@sample_level_id, 1)
  AND result_status = 'passed'
  AND submit_time >= CURRENT_DATE();

EXPLAIN FORMAT=JSON
SELECT *
FROM user_wrong_question
WHERE user_id = COALESCE(@sample_user_id, 1)
  AND resolved = 0
ORDER BY last_wrong_time DESC
LIMIT 50;

EXPLAIN FORMAT=JSON
SELECT *
FROM message
WHERE to_user_id = COALESCE(@sample_user_id, 1)
  AND from_user_id = COALESCE(@sample_other_user_id, 2)
  AND is_read = 0;

EXPLAIN FORMAT=JSON
SELECT *
FROM message
WHERE (
    from_user_id = COALESCE(@sample_user_id, 1)
    AND to_user_id = COALESCE(@sample_other_user_id, 2)
)
OR (
    from_user_id = COALESCE(@sample_other_user_id, 2)
    AND to_user_id = COALESCE(@sample_user_id, 1)
)
ORDER BY create_time DESC
LIMIT 20;

EXPLAIN FORMAT=JSON
SELECT *
FROM notification
WHERE user_id = COALESCE(@sample_user_id, 1)
  AND type IN ('system', 'site_notification', 'feedback_result')
ORDER BY create_time DESC
LIMIT 20;

EXPLAIN FORMAT=JSON
SELECT COUNT(*)
FROM notification
WHERE user_id = COALESCE(@sample_user_id, 1)
  AND type = 'site_notification';
