ALTER TABLE user
    ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER password;
