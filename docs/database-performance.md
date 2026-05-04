# Database Performance Diagnostics

This note covers the write-adjacent paths that are most likely to show up during auth, practice submission, campaign attempts, messages, and notifications.

## Before Load Tests

1. Apply migrations through the normal Flyway startup path.
2. Run `scripts/perf/mysql-diagnostics.sql` against the target database and save the output with the test run.
3. Confirm the V48 indexes exist in the `information_schema.statistics` section.
4. Confirm `slow_query_log`, `long_query_time`, and `performance_schema` are in the expected state for the test environment.
5. Set sample variables before the EXPLAIN section if the default ids are not present:

```sql
SET @sample_user_id = 1;
SET @sample_other_user_id = 2;
SET @sample_level_id = 1;
SET @sample_question_id = 1;
SOURCE scripts/perf/mysql-diagnostics.sql;
```

## After Load Tests

1. Re-run `scripts/perf/mysql-diagnostics.sql`.
2. Compare `Slow_queries`, row-lock counters, table/index sizes, and the top `performance_schema.events_statements_summary_by_digest` rows.
3. Inspect EXPLAIN output for `access_type`, `key`, `rows`, and `using_filesort` on the candidate templates.
4. Check whether slow digests map to a real application path before adding another index.

## V48 Index Rationale

`practice_answer(record_id, is_correct, question_id)` supports the reward and completion checks that first find a user's submitted `practice_record` ids, then check correct answers by question. It also helps leaderboard scans that filter correct answers for a record set.

`practice_attempt(result_status, submit_time, user_id)` supports campaign ranking windows such as passed attempts for today or this week.

`practice_attempt(user_id, level_id, result_status, submit_time)` supports daily challenge completion checks after campaign submissions.

`user_wrong_question(user_id, resolved, last_wrong_time)` supports the unresolved wrong-question list ordered by latest wrong time. The existing unique key on `(user_id, question_id)` still covers upsert-style sync by question.

`message(from_user_id, to_user_id, create_time, id)` supports conversation page reads for one direction of a user pair.

`message(to_user_id, is_read, from_user_id, create_time)` supports unread counts and mark-as-read updates after messages are inserted.

`notification(user_id, type, create_time)` supports inbox filters and repeated per-user notification counts by type. The existing single-column user/read/time indexes remain available for mark-all-read and broad inbox scans.

No new auth index was added because login lookups already use unique/indexed `user.username` and `user.email`.
