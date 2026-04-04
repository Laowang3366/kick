ALTER TABLE `user`
    ADD COLUMN `gender` VARCHAR(10) DEFAULT NULL COMMENT 'male/female' AFTER `bio`;
