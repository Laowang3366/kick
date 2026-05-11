CREATE TABLE `ai_assistant_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `base_url` VARCHAR(500) NOT NULL,
    `api_key` VARCHAR(1024) NOT NULL,
    `model` VARCHAR(190) NOT NULL,
    `system_prompt` TEXT NULL,
    `prompt_file_name` VARCHAR(255) NULL,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `active` TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_by` BIGINT NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ai_assistant_config_active_enabled` (`active`, `enabled`, `sort_order`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ai_assistant_call_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `config_id` BIGINT NULL,
    `model` VARCHAR(190) NULL,
    `success` TINYINT(1) NOT NULL DEFAULT 0,
    `fallback_used` TINYINT(1) NOT NULL DEFAULT 0,
    `latency_ms` BIGINT NOT NULL DEFAULT 0,
    `error_message` VARCHAR(500) NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ai_assistant_call_user_time` (`user_id`, `create_time`),
    KEY `idx_ai_assistant_call_time_success` (`create_time`, `success`),
    KEY `idx_ai_assistant_call_config_time` (`config_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
