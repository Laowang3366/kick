ALTER TABLE `ai_assistant_config`
    ADD COLUMN `timeout_ms` INT NOT NULL DEFAULT 60000 AFTER `reasoning_effort`;
