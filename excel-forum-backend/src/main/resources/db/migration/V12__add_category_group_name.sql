ALTER TABLE `category`
    ADD COLUMN `group_name` VARCHAR(64) NULL DEFAULT NULL COMMENT '版块分组' AFTER `description`;

UPDATE `category`
SET `group_name` = CASE
    WHEN `name` IN ('Excel基础', '函数公式', '图表制作') THEN '入门提升'
    WHEN `name` IN ('数据透视表', 'VBA编程', 'Power Query', 'Power Pivot', '数据分析') THEN '进阶应用'
    WHEN `name` IN ('模板分享', '问答互助') THEN '社区交流'
    ELSE COALESCE(`group_name`, '未分类')
END
WHERE `group_name` IS NULL OR `group_name` = '';
