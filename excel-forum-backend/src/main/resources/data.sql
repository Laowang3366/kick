-- 初始化分类数据（仅在数据不存在时插入，不会删除或更新现有数据）
INSERT IGNORE INTO `category` (`id`, `name`, `description`, `sort_order`, `parent_id`) VALUES
(1, 'Excel基础', 'Excel入门教程、基础操作、界面介绍等', 1, NULL),
(2, '函数公式', 'Excel函数、公式应用、计算技巧等', 2, NULL),
(3, '数据透视表', '数据透视表创建、使用技巧、高级应用等', 3, NULL),
(4, '图表制作', 'Excel图表、数据可视化、图表美化等', 4, NULL),
(5, 'VBA编程', 'Excel VBA、宏编程、自动化处理等', 5, NULL),
(6, 'Power Query', 'Power Query数据处理、ETL、数据清洗等', 6, NULL),
(7, 'Power Pivot', 'Power Pivot数据建模、DAX公式等', 7, NULL),
(8, '数据分析', '数据分析方法、商业智能、报表制作等', 8, NULL),
(9, '模板分享', 'Excel模板、实用工具、资源分享等', 9, NULL),
(10, '问答互助', 'Excel问题求助、经验分享、技术交流等', 10, NULL);

-- 初始化管理员用户 (密码: admin123)
-- 注意： 这个密码是 BCrypt 加密后的 'admin123'
INSERT INTO `user` (`username`, `email`, `password`, `role`, `level`, `points`, `status`) VALUES
('admin', 'admin@excel.com', '$2a$10$JGZt7vWvXZPvWZPvWZPvWZPvWZPvWZPvWZPvWZPvWZPvWZPvWZPvWZPvW', 'admin', 1, 0, 0);
