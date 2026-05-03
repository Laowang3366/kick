INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '日期与时间', '日期计算、工期统计和月末处理常用函数。', 50, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '日期与时间'
);

INSERT INTO question_category (name, description, group_name, sort_order, enabled)
SELECT 'Excel基础', '面向入门用户的基础统计函数模板题。', '函数训练', 10, 1
WHERE NOT EXISTS (
    SELECT 1 FROM question_category WHERE name = 'Excel基础'
);

INSERT INTO question_category (name, description, group_name, sort_order, enabled)
SELECT '逻辑判断', '使用 IF、AND、OR 等函数处理条件分支。', '函数训练', 20, 1
WHERE NOT EXISTS (
    SELECT 1 FROM question_category WHERE name = '逻辑判断'
);

INSERT INTO question_category (name, description, group_name, sort_order, enabled)
SELECT '查找引用', '使用 VLOOKUP、XLOOKUP、INDEX/MATCH 完成跨表匹配。', '函数训练', 30, 1
WHERE NOT EXISTS (
    SELECT 1 FROM question_category WHERE name = '查找引用'
);

INSERT INTO question_category (name, description, group_name, sort_order, enabled)
SELECT '文本处理', '处理编码、姓名、标签等文本清洗任务。', '函数训练', 40, 1
WHERE NOT EXISTS (
    SELECT 1 FROM question_category WHERE name = '文本处理'
);

INSERT INTO question_category (name, description, group_name, sort_order, enabled)
SELECT '时间日期', '计算工期、账期和日期差。', '函数训练', 50, 1
WHERE NOT EXISTS (
    SELECT 1 FROM question_category WHERE name = '时间日期'
);

UPDATE question_category
SET description = CASE name
        WHEN 'Excel基础' THEN '面向入门用户的基础统计函数模板题。'
        WHEN '逻辑判断' THEN '使用 IF、AND、OR 等函数处理条件分支。'
        WHEN '查找引用' THEN '使用 VLOOKUP、XLOOKUP、INDEX/MATCH 完成跨表匹配。'
        WHEN '文本处理' THEN '处理编码、姓名、标签等文本清洗任务。'
        WHEN '时间日期' THEN '计算工期、账期和日期差。'
        ELSE description
    END,
    group_name = '函数训练',
    enabled = 1
WHERE name IN ('Excel基础', '逻辑判断', '查找引用', '文本处理', '时间日期');

INSERT INTO tutorial_article (
    category_id, title, summary, one_line_usage, content, audience_track, difficulty,
    recommend_level, function_tags, starter, home_featured, sort_order, enabled
)
SELECT tc.id,
       'SUMIF',
       '按一个条件汇总金额、数量或时长。',
       '按渠道、地区、人员等单一条件汇总指标。',
       '<h2>业务场景</h2><p>SUMIF 常用于按渠道汇总销售额、按部门汇总成本、按项目汇总工时。它适合一个条件对应一个求和区域的场景。</p><h2>语法</h2><pre><code>=SUMIF(条件区域,条件,求和区域)</code></pre><h2>实战示例</h2><p>按 G2 的渠道名称汇总 D2:D9 的销售额：</p><pre><code>=SUMIF($B$2:$B$9,G2,$D$2:$D$9)</code></pre><h2>常见错误</h2><ul><li>条件区域和求和区域必须高度一致。</li><li>复制公式时要锁定原始数据区域。</li><li>多条件汇总请改用 SUMIFS。</li></ul><h2>配套练习</h2><p>完成题库中的“渠道销售额汇总”模板题，练习锁定区域和相对引用。</p>',
       'beginner',
       'basic',
       2,
       'SUMIF,条件汇总,销售统计',
       1,
       1,
       45,
       1
FROM tutorial_category tc
WHERE tc.name = '函数基础'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'SUMIF'
  );

INSERT INTO tutorial_article (
    category_id, title, summary, one_line_usage, content, audience_track, difficulty,
    recommend_level, function_tags, starter, home_featured, sort_order, enabled
)
SELECT tc.id,
       'DAYS',
       '计算两个日期之间相差多少天。',
       '用于合同履约天数、账期天数和项目周期计算。',
       '<h2>业务场景</h2><p>DAYS 用于计算结束日期与开始日期之间的自然日差，适合合同履约天数、应收账期、项目周期等运营统计。</p><h2>语法</h2><pre><code>=DAYS(结束日期,开始日期)</code></pre><h2>实战示例</h2><p>计算 C2 结束日期和 B2 开始日期之间的天数：</p><pre><code>=DAYS(C2,B2)</code></pre><h2>常见错误</h2><ul><li>参数顺序是结束日期在前、开始日期在后。</li><li>如果结果为负数，通常是日期顺序填反了。</li><li>只统计工作日时请使用 NETWORKDAYS。</li></ul><h2>配套练习</h2><p>完成题库中的“合同履约天数计算”模板题，练习日期单元格参与公式计算。</p>',
       'beginner',
       'basic',
       2,
       'DAYS,日期差,合同周期',
       1,
       1,
       145,
       1
FROM tutorial_category tc
WHERE tc.name = '日期与时间'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'DAYS'
  );

UPDATE tutorial_article
SET summary = '汇总连续区域或多个分散区域，是销售、费用和库存统计的第一入口。',
    one_line_usage = '把一组数字加总成一个结果。',
    content = '<h2>业务场景</h2><p>SUM 适合月度销售额、部门费用、库存数量等直接加总场景。只要目标是“把这些数字加起来”，通常先考虑 SUM。</p><h2>语法</h2><pre><code>=SUM(数值1,[数值2],...)</code></pre><h2>实战示例</h2><p>计算门店 1-3 月销售额：</p><pre><code>=SUM(C2:E2)</code></pre><h2>操作步骤</h2><ol><li>确认被汇总区域只包含需要统计的数字。</li><li>在结果列输入 SUM 公式。</li><li>向下填充到全部记录。</li></ol><h2>常见错误</h2><ul><li>不要把小计行和明细行放在同一求和区域内。</li><li>文本形式的数字不会稳定参与统计，应先转换为数值。</li><li>跨列复制时，检查引用区域是否跟着移动。</li></ul><h2>配套练习</h2><p>完成题库中的“季度销售合计”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 1,
    function_tags = 'SUM,求和,销售统计',
    starter = 1,
    home_featured = 1
WHERE title = 'SUM';

UPDATE tutorial_article
SET summary = '计算平均水平，适合成绩、客单价、评分等均值统计。',
    one_line_usage = '用平均值判断一组数据的中心水平。',
    content = '<h2>业务场景</h2><p>AVERAGE 常用于计算员工测评平均分、门店平均销售额、产品平均评分。它回答的是“整体水平大概是多少”。</p><h2>语法</h2><pre><code>=AVERAGE(数值1,[数值2],...)</code></pre><h2>实战示例</h2><p>计算三次测评平均分：</p><pre><code>=AVERAGE(C2:E2)</code></pre><h2>判断建议</h2><ul><li>平均值容易被极端值影响，必要时配合 MIN、MAX 检查异常。</li><li>空白单元格会被跳过，0 会参与计算。</li><li>需要按条件求平均时使用 AVERAGEIF 或 AVERAGEIFS。</li></ul><h2>配套练习</h2><p>完成题库中的“学员测评平均分”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 1,
    function_tags = 'AVERAGE,平均值,测评统计',
    starter = 1,
    home_featured = 1
WHERE title = 'AVERAGE';

UPDATE tutorial_article
SET summary = '按一个条件统计出现次数，适合达标次数、状态数量和名单计数。',
    one_line_usage = '统计满足条件的单元格数量。',
    content = '<h2>业务场景</h2><p>COUNTIF 适合统计达标月份、缺勤次数、某状态订单数量。它只处理一个条件，结果是数量。</p><h2>语法</h2><pre><code>=COUNTIF(条件区域,条件)</code></pre><h2>实战示例</h2><p>统计 B2:E2 中值为 1 的达标月份数量：</p><pre><code>=COUNTIF(B2:E2,1)</code></pre><h2>常见错误</h2><ul><li>条件是文本时需要加英文双引号。</li><li>条件区域不要包含标题行。</li><li>多个条件请改用 COUNTIFS。</li></ul><h2>配套练习</h2><p>完成题库中的“月度达标次数统计”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'COUNTIF,条件计数,达标统计',
    starter = 1,
    home_featured = 1
WHERE title = 'COUNTIF';

UPDATE tutorial_article
SET summary = '按一个条件汇总指标，适合渠道、地区、负责人维度的小型汇总。',
    one_line_usage = '按条件把符合记录的数值加总。',
    content = '<h2>业务场景</h2><p>SUMIF 常用于按渠道汇总销售额、按部门汇总费用、按人员汇总工时。它的重点是条件区域和求和区域一一对应。</p><h2>语法</h2><pre><code>=SUMIF(条件区域,条件,求和区域)</code></pre><h2>实战示例</h2><p>按 G2 的渠道名称汇总销售额：</p><pre><code>=SUMIF($B$2:$B$9,G2,$D$2:$D$9)</code></pre><h2>常见错误</h2><ul><li>复制到下一行前，锁定原始数据区域。</li><li>条件单元格使用相对引用，方便向下填充。</li><li>两个以上条件请用 SUMIFS。</li></ul><h2>配套练习</h2><p>完成题库中的“渠道销售额汇总”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'SUMIF,条件汇总,渠道销售',
    starter = 1,
    home_featured = 1
WHERE title = 'SUMIF';

UPDATE tutorial_article
SET summary = '根据条件返回不同结果，是状态判断和风险标记的基础函数。',
    one_line_usage = '让公式根据条件自动分支。',
    content = '<h2>业务场景</h2><p>IF 适合及格判断、逾期预警、订单分层、是否优先跟进等场景。它让表格从人工判断变成自动标记。</p><h2>语法</h2><pre><code>=IF(逻辑判断,成立时结果,不成立时结果)</code></pre><h2>实战示例</h2><p>逾期天数不少于 10 天或未付金额不少于 50000 时标记为 1：</p><pre><code>=IF(OR(C2&gt;=10,D2&gt;=50000),1,0)</code></pre><h2>常见错误</h2><ul><li>返回文本时使用英文双引号。</li><li>多条件并列时用 AND 或 OR 包住条件。</li><li>复杂分层建议使用 IFS，避免多层 IF 难维护。</li></ul><h2>配套练习</h2><p>完成题库中的“高风险订单标记”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'IF,OR,风险标记',
    starter = 1,
    home_featured = 1
WHERE title = 'IF';

UPDATE tutorial_article
SET summary = '按关键字从另一张表匹配结果，适合编码、员工、商品等主数据回填。',
    one_line_usage = '根据左侧关键字从表格中查找对应信息。',
    content = '<h2>业务场景</h2><p>VLOOKUP 常用于根据员工编号带出部门、根据商品编码带出品类、根据客户编号带出区域。旧版 Excel 兼容性好。</p><h2>语法</h2><pre><code>=VLOOKUP(查找值,查找区域,返回列序号,精确匹配)</code></pre><h2>实战示例</h2><p>根据 A2 员工编号，从名单表返回第 3 列部门：</p><pre><code>=VLOOKUP(A2,名单!$A$2:$C$7,3,FALSE)</code></pre><h2>常见错误</h2><ul><li>查找值必须在查找区域第一列。</li><li>最后一个参数通常填 FALSE，避免近似匹配。</li><li>复制公式前锁定查找区域。</li></ul><h2>配套练习</h2><p>完成题库中的“员工部门匹配”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'VLOOKUP,查找引用,员工部门',
    starter = 1,
    home_featured = 1
WHERE title = 'VLOOKUP';

UPDATE tutorial_article
SET summary = '从文本左侧提取固定长度字符，适合编码拆分和前缀识别。',
    one_line_usage = '从文本开头截取指定字符数。',
    content = '<h2>业务场景</h2><p>LEFT 常用于提取商品编码前缀、地区编码、订单类型。只要规则是“从左边取几位”，就可以优先使用 LEFT。</p><h2>语法</h2><pre><code>=LEFT(文本,字符数)</code></pre><h2>实战示例</h2><p>提取商品编码前两位品类代码：</p><pre><code>=LEFT(A2,2)</code></pre><h2>常见错误</h2><ul><li>字符数按字符计算，不按字节计算。</li><li>源编码长度不一致时，先确认业务规则是否仍然适用。</li><li>从右侧截取用 RIGHT，从中间截取用 MID。</li></ul><h2>配套练习</h2><p>完成题库中的“商品编码品类提取”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'LEFT,文本截取,编码拆分',
    starter = 1,
    home_featured = 1
WHERE title = 'LEFT';

UPDATE tutorial_article
SET summary = '计算两个日期之间相差的自然日数量。',
    one_line_usage = '用结束日期减开始日期得到间隔天数。',
    content = '<h2>业务场景</h2><p>DAYS 用于合同履约天数、订单账期、项目周期等自然日统计。它比直接相减更直观，适合给初学者建立日期计算概念。</p><h2>语法</h2><pre><code>=DAYS(结束日期,开始日期)</code></pre><h2>实战示例</h2><p>计算合同结束日期和开始日期之间的天数：</p><pre><code>=DAYS(C2,B2)</code></pre><h2>常见错误</h2><ul><li>参数顺序填反会得到负数。</li><li>日期必须是真正日期，不要是无法识别的文本。</li><li>只统计工作日时使用 NETWORKDAYS。</li></ul><h2>配套练习</h2><p>完成题库中的“合同履约天数计算”模板题。</p>',
    audience_track = 'beginner',
    difficulty = 'basic',
    recommend_level = 2,
    function_tags = 'DAYS,日期差,合同履约',
    starter = 1,
    home_featured = 1
WHERE title = 'DAYS';

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '季度销售合计：SUM 汇总门店三个月销售额',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       1,
       12,
       '在 F2:F6 输入 SUM 公式，按行汇总 1 月到 3 月销售额。',
       1
FROM question_category qc
WHERE qc.name = 'Excel基础'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '季度销售合计：SUM 汇总门店三个月销售额');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '学员测评平均分：AVERAGE 计算三次测评均分',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       1,
       12,
       '在 F2:F6 输入 AVERAGE 公式，计算每位学员三次测评平均分。',
       1
FROM question_category qc
WHERE qc.name = 'Excel基础'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '学员测评平均分：AVERAGE 计算三次测评均分');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '月度达标次数统计：COUNTIF 统计 1 的次数',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       2,
       15,
       '在 F2:F6 输入 COUNTIF 公式，统计每位员工 1-4 月达标次数。',
       1
FROM question_category qc
WHERE qc.name = 'Excel基础'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '月度达标次数统计：COUNTIF 统计 1 的次数');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '渠道销售额汇总：SUMIF 按渠道汇总金额',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       2,
       15,
       '在 H2:H4 输入 SUMIF 公式，根据 G 列渠道名称汇总 D 列销售额。',
       1
FROM question_category qc
WHERE qc.name = 'Excel基础'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '渠道销售额汇总：SUMIF 按渠道汇总金额');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '高风险订单标记：IF 与 OR 自动判断跟进优先级',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       2,
       15,
       '在 E2:E7 输入 IF 和 OR 组合公式，满足逾期或金额条件时返回 1，否则返回 0。',
       1
FROM question_category qc
WHERE qc.name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '高风险订单标记：IF 与 OR 自动判断跟进优先级');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '员工部门匹配：VLOOKUP 根据员工编号返回部门',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       2,
       15,
       '在 C2:C7 输入 VLOOKUP 公式，从“名单”工作表根据员工编号匹配部门。',
       1
FROM question_category qc
WHERE qc.name = '查找引用'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '员工部门匹配：VLOOKUP 根据员工编号返回部门');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '商品编码品类提取：LEFT 提取前两位代码',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       1,
       12,
       '在 B2:B7 输入 LEFT 公式，提取商品编码前两位作为品类代码。',
       1
FROM question_category qc
WHERE qc.name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '商品编码品类提取：LEFT 提取前两位代码');

INSERT INTO question (
    title, type, category_id, question_category_id, options, answer, difficulty, points, explanation, enabled
)
SELECT '合同履约天数计算：DAYS 计算日期间隔',
       'excel_template',
       qc.id,
       qc.id,
       NULL,
       '{}',
       1,
       12,
       '在 D2:D6 输入 DAYS 公式，计算每份合同的履约自然日天数。',
       1
FROM question_category qc
WHERE qc.name = '时间日期'
  AND NOT EXISTS (SELECT 1 FROM question WHERE title = '合同履约天数计算：DAYS 计算日期间隔');

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/sum-quarter-sales.xlsx',
       '练习',
       'F2:F6',
       '{"values":[[398000],[314000],[434000],[366000],[253000]],"formulas":[["=SUM(C2:E2)"],["=SUM(C3:E3)"],["=SUM(C4:E4)"],["=SUM(C5:E5)"],["=SUM(C6:E6)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"F2:F6","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!F2:F6":[[398000],[314000],[434000],[366000],[253000]]},"rangeFormulas":{"练习!F2:F6":[["=SUM(C2:E2)"],["=SUM(C3:E3)"],["=SUM(C4:E4)"],["=SUM(C5:E5)"],["=SUM(C6:E6)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '季度销售合计：SUM 汇总门店三个月销售额'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/average-score-review.xlsx',
       '练习',
       'F2:F6',
       '{"values":[[88.3333333333],[78.3333333333],[92.3333333333],[71.6666666667],[84]],"formulas":[["=AVERAGE(C2:E2)"],["=AVERAGE(C3:E3)"],["=AVERAGE(C4:E4)"],["=AVERAGE(C5:E5)"],["=AVERAGE(C6:E6)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"F2:F6","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!F2:F6":[[88.3333333333],[78.3333333333],[92.3333333333],[71.6666666667],[84]]},"rangeFormulas":{"练习!F2:F6":[["=AVERAGE(C2:E2)"],["=AVERAGE(C3:E3)"],["=AVERAGE(C4:E4)"],["=AVERAGE(C5:E5)"],["=AVERAGE(C6:E6)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '学员测评平均分：AVERAGE 计算三次测评均分'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/countif-attendance.xlsx',
       '练习',
       'F2:F6',
       '{"values":[[3],[3],[4],[1],[3]],"formulas":[["=COUNTIF(B2:E2,1)"],["=COUNTIF(B3:E3,1)"],["=COUNTIF(B4:E4,1)"],["=COUNTIF(B5:E5,1)"],["=COUNTIF(B6:E6,1)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"F2:F6","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!F2:F6":[[3],[3],[4],[1],[3]]},"rangeFormulas":{"练习!F2:F6":[["=COUNTIF(B2:E2,1)"],["=COUNTIF(B3:E3,1)"],["=COUNTIF(B4:E4,1)"],["=COUNTIF(B5:E5,1)"],["=COUNTIF(B6:E6,1)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '月度达标次数统计：COUNTIF 统计 1 的次数'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/sumif-channel-sales.xlsx',
       '练习',
       'H2:H4',
       '{"values":[[54000],[38700],[21400]],"formulas":[["=SUMIF($B$2:$B$9,G2,$D$2:$D$9)"],["=SUMIF($B$2:$B$9,G3,$D$2:$D$9)"],["=SUMIF($B$2:$B$9,G4,$D$2:$D$9)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"H2:H4","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!H2:H4":[[54000],[38700],[21400]]},"rangeFormulas":{"练习!H2:H4":[["=SUMIF($B$2:$B$9,G2,$D$2:$D$9)"],["=SUMIF($B$2:$B$9,G3,$D$2:$D$9)"],["=SUMIF($B$2:$B$9,G4,$D$2:$D$9)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '渠道销售额汇总：SUMIF 按渠道汇总金额'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/if-risk-flag.xlsx',
       '练习',
       'E2:E7',
       '{"values":[[0],[1],[1],[0],[1],[0]],"formulas":[["=IF(OR(C2>=10,D2>=50000),1,0)"],["=IF(OR(C3>=10,D3>=50000),1,0)"],["=IF(OR(C4>=10,D4>=50000),1,0)"],["=IF(OR(C5>=10,D5>=50000),1,0)"],["=IF(OR(C6>=10,D6>=50000),1,0)"],["=IF(OR(C7>=10,D7>=50000),1,0)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"E2:E7","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!E2:E7":[[0],[1],[1],[0],[1],[0]]},"rangeFormulas":{"练习!E2:E7":[["=IF(OR(C2>=10,D2>=50000),1,0)"],["=IF(OR(C3>=10,D3>=50000),1,0)"],["=IF(OR(C4>=10,D4>=50000),1,0)"],["=IF(OR(C5>=10,D5>=50000),1,0)"],["=IF(OR(C6>=10,D6>=50000),1,0)"],["=IF(OR(C7>=10,D7>=50000),1,0)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '高风险订单标记：IF 与 OR 自动判断跟进优先级'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/vlookup-department.xlsx',
       '练习',
       'C2:C7',
       '{"values":[["客服部"],["销售部"],["市场部"],["运营部"],["财务部"],["产品部"]],"formulas":[["=VLOOKUP(A2,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A3,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A4,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A5,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A6,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A7,名单!$A$2:$C$7,3,FALSE)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"C2:C7","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!C2:C7":[["客服部"],["销售部"],["市场部"],["运营部"],["财务部"],["产品部"]]},"rangeFormulas":{"练习!C2:C7":[["=VLOOKUP(A2,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A3,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A4,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A5,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A6,名单!$A$2:$C$7,3,FALSE)"],["=VLOOKUP(A7,名单!$A$2:$C$7,3,FALSE)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '员工部门匹配：VLOOKUP 根据员工编号返回部门'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/left-code-category.xlsx',
       '练习',
       'B2:B7',
       '{"values":[["FS"],["OA"],["EL"],["FS"],["HR"],["EL"]],"formulas":[["=LEFT(A2,2)"],["=LEFT(A3,2)"],["=LEFT(A4,2)"],["=LEFT(A5,2)"],["=LEFT(A6,2)"],["=LEFT(A7,2)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"B2:B7","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!B2:B7":[["FS"],["OA"],["EL"],["FS"],["HR"],["EL"]]},"rangeFormulas":{"练习!B2:B7":[["=LEFT(A2,2)"],["=LEFT(A3,2)"],["=LEFT(A4,2)"],["=LEFT(A5,2)"],["=LEFT(A6,2)"],["=LEFT(A7,2)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '商品编码品类提取：LEFT 提取前两位代码'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO question_excel_template (
    question_id, template_file_url, answer_sheet, answer_range, answer_snapshot_json, check_formula,
    grading_rule_json, expected_snapshot_json, sheet_count_limit, version
)
SELECT q.id,
       '/uploads/seed/practice/days-contract-duration.xlsx',
       '练习',
       'D2:D6',
       '{"values":[[46],[42],[50],[22],[46]],"formulas":[["=DAYS(C2,B2)"],["=DAYS(C3,B3)"],["=DAYS(C4,B4)"],["=DAYS(C5,B5)"],["=DAYS(C6,B6)"]]}',
       1,
       '{"answerSheet":"练习","answerRange":"D2:D6","checkFormula":true,"score":1}',
       '{"rangeValues":{"练习!D2:D6":[[46],[42],[50],[22],[46]]},"rangeFormulas":{"练习!D2:D6":[["=DAYS(C2,B2)"],["=DAYS(C3,B3)"],["=DAYS(C4,B4)"],["=DAYS(C5,B5)"],["=DAYS(C6,B6)"]]}}',
       5,
       1
FROM question q
WHERE q.title = '合同履约天数计算：DAYS 计算日期间隔'
ON DUPLICATE KEY UPDATE
    template_file_url = VALUES(template_file_url),
    answer_sheet = VALUES(answer_sheet),
    answer_range = VALUES(answer_range),
    answer_snapshot_json = VALUES(answer_snapshot_json),
    check_formula = VALUES(check_formula),
    grading_rule_json = VALUES(grading_rule_json),
    expected_snapshot_json = VALUES(expected_snapshot_json),
    sheet_count_limit = VALUES(sheet_count_limit),
    version = VALUES(version);

INSERT INTO practice_world (name, description, sort_order, enabled)
SELECT 'Excel 闯关', '从基础到进阶，逐步攻克 Excel 关卡试炼', 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM practice_world WHERE name = 'Excel 闯关'
);

INSERT INTO practice_chapter (world_id, name, description, unlock_star, required_level, sort_order, enabled)
SELECT pw.id,
       qc.name,
       qc.description,
       0,
       0,
       qc.sort_order,
       1
FROM practice_world pw
JOIN question_category qc ON qc.name IN ('Excel基础', '逻辑判断', '查找引用', '文本处理', '时间日期')
WHERE pw.name = 'Excel 闯关'
  AND NOT EXISTS (
      SELECT 1
      FROM practice_chapter pc
      WHERE pc.world_id = pw.id
        AND pc.name = qc.name
  );

INSERT INTO practice_level (
    chapter_id, question_id, title, level_type, difficulty, target_time_seconds,
    reward_exp, reward_points, first_pass_bonus, sort_order, enabled
)
SELECT pc.id,
       q.id,
       q.title,
       CASE WHEN q.difficulty >= 4 THEN 'boss' WHEN q.difficulty = 3 THEN 'elite' ELSE 'normal' END,
       CASE WHEN q.difficulty >= 4 THEN 'expert' WHEN q.difficulty = 3 THEN 'hard' WHEN q.difficulty = 2 THEN 'medium' ELSE 'easy' END,
       CASE WHEN q.difficulty >= 3 THEN 540 WHEN q.difficulty = 2 THEN 420 ELSE 300 END,
       CASE WHEN q.difficulty >= 3 THEN 35 WHEN q.difficulty = 2 THEN 20 ELSE 10 END,
       q.points,
       CASE WHEN q.difficulty >= 3 THEN 5 ELSE 0 END,
       CASE q.title
           WHEN '季度销售合计：SUM 汇总门店三个月销售额' THEN 10
           WHEN '学员测评平均分：AVERAGE 计算三次测评均分' THEN 20
           WHEN '月度达标次数统计：COUNTIF 统计 1 的次数' THEN 30
           WHEN '渠道销售额汇总：SUMIF 按渠道汇总金额' THEN 40
           WHEN '高风险订单标记：IF 与 OR 自动判断跟进优先级' THEN 50
           WHEN '员工部门匹配：VLOOKUP 根据员工编号返回部门' THEN 60
           WHEN '商品编码品类提取：LEFT 提取前两位代码' THEN 70
           WHEN '合同履约天数计算：DAYS 计算日期间隔' THEN 80
           ELSE q.id
       END,
       1
FROM question q
JOIN question_category qc ON qc.id = q.question_category_id
JOIN practice_world pw ON pw.name = 'Excel 闯关'
JOIN practice_chapter pc ON pc.world_id = pw.id AND pc.name = qc.name
WHERE q.title IN (
    '季度销售合计：SUM 汇总门店三个月销售额',
    '学员测评平均分：AVERAGE 计算三次测评均分',
    '月度达标次数统计：COUNTIF 统计 1 的次数',
    '渠道销售额汇总：SUMIF 按渠道汇总金额',
    '高风险订单标记：IF 与 OR 自动判断跟进优先级',
    '员工部门匹配：VLOOKUP 根据员工编号返回部门',
    '商品编码品类提取：LEFT 提取前两位代码',
    '合同履约天数计算：DAYS 计算日期间隔'
)
AND NOT EXISTS (
    SELECT 1 FROM practice_level pl WHERE pl.question_id = q.id
);

INSERT INTO tutorial_article_question_rel (article_id, question_id, sort_order)
SELECT ta.id,
       q.id,
       10
FROM tutorial_article ta
JOIN question q ON (
    (ta.title = 'SUM' AND q.title = '季度销售合计：SUM 汇总门店三个月销售额')
    OR (ta.title = 'AVERAGE' AND q.title = '学员测评平均分：AVERAGE 计算三次测评均分')
    OR (ta.title = 'COUNTIF' AND q.title = '月度达标次数统计：COUNTIF 统计 1 的次数')
    OR (ta.title = 'SUMIF' AND q.title = '渠道销售额汇总：SUMIF 按渠道汇总金额')
    OR (ta.title = 'IF' AND q.title = '高风险订单标记：IF 与 OR 自动判断跟进优先级')
    OR (ta.title = 'VLOOKUP' AND q.title = '员工部门匹配：VLOOKUP 根据员工编号返回部门')
    OR (ta.title = 'LEFT' AND q.title = '商品编码品类提取：LEFT 提取前两位代码')
    OR (ta.title = 'DAYS' AND q.title = '合同履约天数计算：DAYS 计算日期间隔')
)
WHERE NOT EXISTS (
    SELECT 1
    FROM tutorial_article_question_rel rel
    WHERE rel.article_id = ta.id
      AND rel.question_id = q.id
);

INSERT INTO tutorial_article_chapter_rel (article_id, chapter_id, sort_order)
SELECT ta.id,
       pc.id,
       COALESCE(ta.sort_order, 0)
FROM tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
JOIN practice_world pw ON pw.name = 'Excel 闯关'
JOIN practice_chapter pc ON pc.world_id = pw.id
 AND (
    (tc.name = '函数基础' AND pc.name = 'Excel基础')
    OR (tc.name = '逻辑判断' AND pc.name = '逻辑判断')
    OR (tc.name = '查找与引用' AND pc.name = '查找引用')
    OR (tc.name = '文本处理' AND pc.name = '文本处理')
    OR (tc.name = '日期与时间' AND pc.name = '时间日期')
 )
WHERE ta.title IN ('SUM', 'AVERAGE', 'COUNTIF', 'SUMIF', 'IF', 'VLOOKUP', 'LEFT', 'DAYS')
  AND NOT EXISTS (
      SELECT 1
      FROM tutorial_article_chapter_rel rel
      WHERE rel.article_id = ta.id
        AND rel.chapter_id = pc.id
  );
