ALTER TABLE `ai_assistant_config`
    ADD COLUMN `reasoning_effort` VARCHAR(32) NULL AFTER `model`;
