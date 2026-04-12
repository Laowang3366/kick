ALTER TABLE `user`
    ADD COLUMN `exp` INT NOT NULL DEFAULT 0 COMMENT '累计经验值' AFTER `points`;

UPDATE `user`
SET `exp` = COALESCE(`points`, 0);

UPDATE `user`
SET `level` = CASE
    WHEN `exp` >= 10000 THEN 6
    WHEN `exp` >= 5000 THEN 5
    WHEN `exp` >= 1000 THEN 4
    WHEN `exp` >= 500 THEN 3
    WHEN `exp` >= 100 THEN 2
    ELSE 1
END;
