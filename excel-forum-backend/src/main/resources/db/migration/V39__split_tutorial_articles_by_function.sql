UPDATE tutorial_article
SET title = 'SUM',
    summary = '对一组数值、多个区域或离散单元格求和。',
    content = '<h2>作用</h2><p>用于金额汇总、数量累加、成绩合计等最基础的统计场景。</p><h2>语法</h2><pre><code>=SUM(number1,[number2],...)</code></pre><h2>示例</h2><pre><code>=SUM(B2:B10)
=SUM(B2:B10,D2:D10)
=SUM(12,18,25)</code></pre><h2>注意点</h2><ul><li>文本数字默认不会参与求和。</li><li>合并单元格区域先拆开再汇总更稳妥。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '函数基础' LIMIT 1)
  AND title = 'SUM 与 AVERAGE';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'AVERAGE', '计算一组数值的平均值。',
       '<h2>作用</h2><p>常用于平均成绩、平均单价、平均耗时等场景。</p><h2>语法</h2><pre><code>=AVERAGE(number1,[number2],...)</code></pre><h2>示例</h2><pre><code>=AVERAGE(C2:C10)
=AVERAGE(C2:C10,E2:E10)</code></pre><h2>注意点</h2><ul><li>空白会忽略，但 0 会参与计算。</li><li>统计前先确认是否要剔除异常值。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'AVERAGE');

UPDATE tutorial_article
SET title = 'COUNT',
    summary = '统计区域中数值单元格的数量。',
    content = '<h2>作用</h2><p>适合统计金额、分数、数量等真正的数值记录数。</p><h2>语法</h2><pre><code>=COUNT(value1,[value2],...)</code></pre><h2>示例</h2><pre><code>=COUNT(B2:B100)
=COUNT(B2:B100,D2:D100)</code></pre><h2>注意点</h2><ul><li>日期在 Excel 内部也是数字，因此会被 COUNT 统计。</li><li>文本、空白不会被 COUNT 计入。</li></ul>',
    sort_order = 30
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '函数基础' LIMIT 1)
  AND title = 'COUNT / COUNTA / COUNTBLANK';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'COUNTA', '统计非空单元格数量。',
       '<h2>作用</h2><p>常用于统计已填报人数、已录入订单、已上传记录。</p><h2>语法</h2><pre><code>=COUNTA(value1,[value2],...)</code></pre><h2>示例</h2><pre><code>=COUNTA(A2:A100)
=COUNTA(B2:D20)</code></pre><h2>注意点</h2><ul><li>只要单元格非空就会计入，包括文本、数字、错误值。</li><li>统计记录数时优先选主键列。</li></ul>',
       40, 1
FROM tutorial_category
WHERE name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'COUNTA');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'COUNTBLANK', '统计空白单元格数量。',
       '<h2>作用</h2><p>用于检查漏填字段、缺失数据和待完善项。</p><h2>语法</h2><pre><code>=COUNTBLANK(range)</code></pre><h2>示例</h2><pre><code>=COUNTBLANK(D2:D100)</code></pre><h2>注意点</h2><ul><li>返回空字符串 <code>""</code> 的公式结果也会被视为“空白”。</li><li>做数据稽核时很实用。</li></ul>',
       50, 1
FROM tutorial_category
WHERE name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'COUNTBLANK');

UPDATE tutorial_article
SET title = 'COUNTIF',
    summary = '按单个条件统计满足要求的记录数。',
    content = '<h2>作用</h2><p>用于统计某部门人数、某状态订单数、某地区客户数。</p><h2>语法</h2><pre><code>=COUNTIF(range,criteria)</code></pre><h2>示例</h2><pre><code>=COUNTIF(B:B,&quot;华东&quot;)
=COUNTIF(C:C,&quot;&gt;=60&quot;)</code></pre><h2>注意点</h2><ul><li>条件中比较符号要放在引号内。</li><li>文本条件建议直接引用单元格，减少拼写错误。</li></ul>',
    sort_order = 60
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '函数基础' LIMIT 1)
  AND title = 'COUNTIF / COUNTIFS / SUMIFS';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'COUNTIFS', '按多个条件统计满足要求的记录数。',
       '<h2>作用</h2><p>常用于同时按地区、状态、日期等多个条件计数。</p><h2>语法</h2><pre><code>=COUNTIFS(criteria_range1,criteria1,[criteria_range2,criteria2],...)</code></pre><h2>示例</h2><pre><code>=COUNTIFS(B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)
=COUNTIFS(D:D,&quot;&gt;=&quot;&amp;H2,D:D,&quot;&lt;=&quot;&amp;I2)</code></pre><h2>注意点</h2><ul><li>所有条件区域长度必须一致。</li><li>日期区间优先用单元格拼接比较符。</li></ul>',
       70, 1
FROM tutorial_category
WHERE name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'COUNTIFS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'SUMIFS', '按多个条件汇总数值结果。',
       '<h2>作用</h2><p>用于多条件销售额汇总、费用汇总、提成汇总。</p><h2>语法</h2><pre><code>=SUMIFS(sum_range,criteria_range1,criteria1,[criteria_range2,criteria2],...)</code></pre><h2>示例</h2><pre><code>=SUMIFS(E:E,B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)
=SUMIFS(F:F,A:A,G2,D:D,&quot;&gt;=&quot;&amp;H2,D:D,&quot;&lt;=&quot;&amp;I2)</code></pre><h2>注意点</h2><ul><li>汇总区域和条件区域必须行数一致。</li><li>优先用 SUMIFS，不要滥用旧式数组公式。</li></ul>',
       80, 1
FROM tutorial_category
WHERE name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'SUMIFS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'IF', '根据条件返回不同结果。',
       '<h2>作用</h2><p>用于及格判断、逾期判断、状态分支等场景。</p><h2>语法</h2><pre><code>=IF(logical_test,value_if_true,value_if_false)</code></pre><h2>示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;逾期&quot;,&quot;正常&quot;)</code></pre><h2>注意点</h2><ul><li>嵌套过深时优先改用 IFS。</li><li>文本结果别忘了加引号。</li></ul>',
       10, 1
FROM tutorial_category
WHERE name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'IF');

UPDATE tutorial_article
SET title = 'IF',
    summary = '根据条件返回不同结果。',
    content = '<h2>作用</h2><p>用于及格判断、逾期判断、状态分支等场景。</p><h2>语法</h2><pre><code>=IF(logical_test,value_if_true,value_if_false)</code></pre><h2>示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;逾期&quot;,&quot;正常&quot;)</code></pre><h2>注意点</h2><ul><li>嵌套过深时优先改用 IFS。</li><li>文本结果别忘了加引号。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '逻辑判断' LIMIT 1)
  AND title = 'IF 条件判断';

UPDATE tutorial_article
SET title = 'AND',
    summary = '要求多个条件同时成立。',
    content = '<h2>作用</h2><p>用于“同时满足”判断，比如双科及格、双字段齐全。</p><h2>语法</h2><pre><code>=AND(logical1,[logical2],...)</code></pre><h2>示例</h2><pre><code>=AND(B2&gt;=60,C2&gt;=60)
=IF(AND(D2&lt;&gt;&quot;&quot;,E2&lt;&gt;&quot;&quot;),&quot;完整&quot;,&quot;缺失&quot;)</code></pre><h2>注意点</h2><ul><li>只要有一个条件不成立就返回 FALSE。</li><li>通常与 IF 搭配使用。</li></ul>',
    sort_order = 20
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '逻辑判断' LIMIT 1)
  AND title = 'AND / OR / NOT';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'OR', '多个条件中任意一个成立即可。',
       '<h2>作用</h2><p>用于高风险判断、紧急标识、重点客户识别等场景。</p><h2>语法</h2><pre><code>=OR(logical1,[logical2],...)</code></pre><h2>示例</h2><pre><code>=OR(D2=&quot;紧急&quot;,E2=&quot;高风险&quot;)
=IF(OR(F2=&quot;VIP&quot;,G2&gt;100000),&quot;重点跟进&quot;,&quot;普通&quot;)</code></pre><h2>注意点</h2><ul><li>只要一个条件成立就返回 TRUE。</li><li>条件过多时建议拆辅助列。</li></ul>',
       30, 1
FROM tutorial_category
WHERE name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'OR');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'NOT', '对逻辑结果取反。',
       '<h2>作用</h2><p>用于排除条件、反向筛选和非空非特定值判断。</p><h2>语法</h2><pre><code>=NOT(logical)</code></pre><h2>示例</h2><pre><code>=NOT(F2=&quot;已关闭&quot;)
=IF(NOT(ISBLANK(B2)),&quot;已填写&quot;,&quot;未填写&quot;)</code></pre><h2>注意点</h2><ul><li>NOT 通常嵌在 IF、FILTER 等公式中使用。</li><li>复杂条件可先写成单独逻辑，再用 NOT 包裹。</li></ul>',
       40, 1
FROM tutorial_category
WHERE name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'NOT');

UPDATE tutorial_article
SET title = 'IFERROR',
    summary = '当公式出错时返回备用结果。',
    content = '<h2>作用</h2><p>用于屏蔽 <code>#N/A</code>、<code>#DIV/0!</code> 等异常显示。</p><h2>语法</h2><pre><code>=IFERROR(value,value_if_error)</code></pre><h2>示例</h2><pre><code>=IFERROR(A2/B2,0)
=IFERROR(XLOOKUP(D2,H:H,I:I),&quot;未匹配&quot;)</code></pre><h2>注意点</h2><ul><li>不要用 IFERROR 掩盖真实数据问题。</li><li>只想处理 <code>#N/A</code> 时可优先用 IFNA。</li></ul>',
    sort_order = 50
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '逻辑判断' LIMIT 1)
  AND title = 'IFERROR / IFS';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'IFS', '按多个条件顺序返回不同结果。',
       '<h2>作用</h2><p>用于分档评分、状态分级、区间判断。</p><h2>语法</h2><pre><code>=IFS(test1,result1,[test2,result2],...)</code></pre><h2>示例</h2><pre><code>=IFS(B2&gt;=90,&quot;优秀&quot;,B2&gt;=80,&quot;良好&quot;,B2&gt;=60,&quot;及格&quot;,TRUE,&quot;不及格&quot;)</code></pre><h2>注意点</h2><ul><li>条件按顺序判断，命中即停止。</li><li>最后建议用 TRUE 做兜底分支。</li></ul>',
       60, 1
FROM tutorial_category
WHERE name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'IFS');

UPDATE tutorial_article
SET title = 'VLOOKUP',
    summary = '按首列查找并返回指定列结果。',
    content = '<h2>作用</h2><p>适合旧版模板中的编码匹配、名称回填和结果查询。</p><h2>语法</h2><pre><code>=VLOOKUP(lookup_value,table_array,col_index_num,[range_lookup])</code></pre><h2>示例</h2><pre><code>=VLOOKUP(A2,$F$2:$H$20,3,FALSE)</code></pre><h2>注意点</h2><ul><li>只能从左往右查找。</li><li>精确匹配时第四参数必须写 FALSE。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '查找与引用' LIMIT 1)
  AND title = 'VLOOKUP 与 XLOOKUP';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'XLOOKUP', '新版本 Excel 推荐使用的查找函数。',
       '<h2>作用</h2><p>支持左右查找、默认精确匹配，写法更直观。</p><h2>语法</h2><pre><code>=XLOOKUP(lookup_value,lookup_array,return_array,[if_not_found])</code></pre><h2>示例</h2><pre><code>=XLOOKUP(A2,F2:F20,H2:H20,&quot;未找到&quot;)</code></pre><h2>注意点</h2><ul><li>优先在新模板中使用。</li><li>查找列重复时会返回第一条结果。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'XLOOKUP');

UPDATE tutorial_article
SET title = 'INDEX',
    summary = '按行列位置返回区域中的值。',
    content = '<h2>作用</h2><p>用于按位置取值、二维查找、动态引用。</p><h2>语法</h2><pre><code>=INDEX(array,row_num,[column_num])</code></pre><h2>示例</h2><pre><code>=INDEX(C:C,5)
=INDEX(B2:F10,3,2)</code></pre><h2>注意点</h2><ul><li>单列区域只需要行号。</li><li>常与 MATCH 搭配做稳定查找。</li></ul>',
    sort_order = 30
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '查找与引用' LIMIT 1)
  AND title = 'INDEX + MATCH';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'MATCH', '返回查找值在区域中的相对位置。',
       '<h2>作用</h2><p>常与 INDEX、CHOOSE、OFFSET 等函数组合使用。</p><h2>语法</h2><pre><code>=MATCH(lookup_value,lookup_array,[match_type])</code></pre><h2>示例</h2><pre><code>=MATCH(G2,A2:A20,0)
=INDEX(C:C,MATCH(G2,A:A,0))</code></pre><h2>注意点</h2><ul><li>精确匹配通常写 0。</li><li>近似匹配前必须保证数据已排序。</li></ul>',
       40, 1
FROM tutorial_category
WHERE name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'MATCH');

UPDATE tutorial_article
SET title = 'XMATCH',
    summary = 'MATCH 的增强版本，支持更多查找模式。',
    content = '<h2>作用</h2><p>用于精确匹配、近似匹配、反向查找和新表动态定位。</p><h2>语法</h2><pre><code>=XMATCH(lookup_value,lookup_array,[match_mode],[search_mode])</code></pre><h2>示例</h2><pre><code>=XMATCH(G2,A2:A20,0)
=XMATCH(TODAY(),B2:B20,1)</code></pre><h2>注意点</h2><ul><li>新版 Excel 优先用 XMATCH 代替 MATCH。</li><li>可配合 INDEX 或 TAKE 做更灵活的定位。</li></ul>',
    sort_order = 50
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '查找与引用' LIMIT 1)
  AND title = 'XMATCH / CHOOSECOLS';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'CHOOSECOLS', '按列序号从区域中抽取指定列。',
       '<h2>作用</h2><p>适合从大表中提取关键字段，生成简版结果区。</p><h2>语法</h2><pre><code>=CHOOSECOLS(array,col_num1,[col_num2],...)</code></pre><h2>示例</h2><pre><code>=CHOOSECOLS(A1:F20,1,3,6)</code></pre><h2>注意点</h2><ul><li>常与 FILTER、SORT 搭配。</li><li>列序号是相对当前数组的位置，不是工作表绝对列号。</li></ul>',
       60, 1
FROM tutorial_category
WHERE name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'CHOOSECOLS');

UPDATE tutorial_article
SET title = 'LEFT',
    summary = '从文本左侧截取指定字符数。',
    content = '<h2>作用</h2><p>用于提取编号前缀、年月代码、地区码。</p><h2>语法</h2><pre><code>=LEFT(text,[num_chars])</code></pre><h2>示例</h2><pre><code>=LEFT(A2,3)</code></pre><h2>注意点</h2><ul><li>未写位数时默认截取 1 位。</li><li>源文本长度不一致时先用 LEN 校验。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '文本处理' LIMIT 1)
  AND title = 'LEFT / RIGHT / MID';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'RIGHT', '从文本右侧截取指定字符数。',
       '<h2>作用</h2><p>适合提取尾号、后缀、文件扩展名。</p><h2>语法</h2><pre><code>=RIGHT(text,[num_chars])</code></pre><h2>示例</h2><pre><code>=RIGHT(A2,4)</code></pre><h2>注意点</h2><ul><li>未写位数时默认截取 1 位。</li><li>截取扩展名时要先确认文本中是否包含点号。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'RIGHT');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'MID', '从文本中间指定位置截取字符。',
       '<h2>作用</h2><p>适合从固定格式编号中抽取中段信息。</p><h2>语法</h2><pre><code>=MID(text,start_num,num_chars)</code></pre><h2>示例</h2><pre><code>=MID(A2,2,5)</code></pre><h2>注意点</h2><ul><li>起始位置从 1 开始计数。</li><li>常与 FIND、SEARCH 搭配做动态截取。</li></ul>',
       30, 1
FROM tutorial_category
WHERE name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'MID');

UPDATE tutorial_article
SET title = 'TEXT',
    summary = '把数值按指定格式转换成文本。',
    content = '<h2>作用</h2><p>用于把日期、金额、百分比按固定展示格式输出。</p><h2>语法</h2><pre><code>=TEXT(value,format_text)</code></pre><h2>示例</h2><pre><code>=TEXT(A2,&quot;yyyy-mm-dd&quot;)
=TEXT(B2,&quot;#,##0.00&quot;)</code></pre><h2>注意点</h2><ul><li>TEXT 返回的是文本，后续不适合直接参与数值计算。</li><li>格式代码必须写对，否则结果会异常。</li></ul>',
    sort_order = 40
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '文本处理' LIMIT 1)
  AND title = 'TEXT / VALUE';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'VALUE', '把文本形式的数字转换成真正数值。',
       '<h2>作用</h2><p>用于清洗导入数据中的“文本数字”。</p><h2>语法</h2><pre><code>=VALUE(text)</code></pre><h2>示例</h2><pre><code>=VALUE(C2)</code></pre><h2>注意点</h2><ul><li>如果文本中混有非法字符会报错。</li><li>导入外部数据后经常需要配合 SUBSTITUTE 清洗再转换。</li></ul>',
       50, 1
FROM tutorial_category
WHERE name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'VALUE');

UPDATE tutorial_article
SET title = 'TRIM',
    summary = '清除文本中的多余空格。',
    content = '<h2>作用</h2><p>用于清洗姓名、部门、地址等字段中的前后或多余空格。</p><h2>语法</h2><pre><code>=TRIM(text)</code></pre><h2>示例</h2><pre><code>=TRIM(A2)</code></pre><h2>注意点</h2><ul><li>TRIM 主要处理英文空格。</li><li>遇到不可见空格时可结合 CLEAN 或 SUBSTITUTE。</li></ul>',
    sort_order = 60
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '文本处理' LIMIT 1)
  AND title = 'TRIM / SUBSTITUTE / TEXTSPLIT';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'SUBSTITUTE', '把文本中的指定内容替换成新内容。',
       '<h2>作用</h2><p>用于统一分隔符、去掉无用后缀、替换旧编码。</p><h2>语法</h2><pre><code>=SUBSTITUTE(text,old_text,new_text,[instance_num])</code></pre><h2>示例</h2><pre><code>=SUBSTITUTE(B2,&quot;-&quot;,&quot;/&quot;)
=SUBSTITUTE(C2,&quot;有限公司&quot;,&quot;&quot;)</code></pre><h2>注意点</h2><ul><li>可指定只替换第几次出现。</li><li>批量清洗脏数据时非常高频。</li></ul>',
       70, 1
FROM tutorial_category
WHERE name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'SUBSTITUTE');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'TEXTSPLIT', '按分隔符把文本拆成多个单元格。',
       '<h2>作用</h2><p>适合拆分姓名、地区、标签、逗号分隔列表。</p><h2>语法</h2><pre><code>=TEXTSPLIT(text,col_delimiter,[row_delimiter])</code></pre><h2>示例</h2><pre><code>=TEXTSPLIT(D2,&quot;,&quot;)</code></pre><h2>注意点</h2><ul><li>返回动态数组，周边区域要留空。</li><li>旧版本 Excel 无法使用。</li></ul>',
       80, 1
FROM tutorial_category
WHERE name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'TEXTSPLIT');

UPDATE tutorial_article
SET title = 'TODAY',
    summary = '返回当前系统日期。',
    content = '<h2>作用</h2><p>用于逾期判断、日报日期、按天统计。</p><h2>语法</h2><pre><code>=TODAY()</code></pre><h2>示例</h2><pre><code>=TODAY()
=TODAY()-A2</code></pre><h2>注意点</h2><ul><li>TODAY 不包含具体时间。</li><li>工作簿重算时会自动更新。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '日期与时间' LIMIT 1)
  AND title = 'TODAY / NOW / DATE';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'NOW', '返回当前系统日期和时间。',
       '<h2>作用</h2><p>用于记录时间戳、时效比较和实时看板。</p><h2>语法</h2><pre><code>=NOW()</code></pre><h2>示例</h2><pre><code>=NOW()
=NOW()-A2</code></pre><h2>注意点</h2><ul><li>NOW 同时包含日期和时间。</li><li>只想保留日期时用 TODAY。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'NOW');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'DATE', '根据年、月、日组装标准日期。',
       '<h2>作用</h2><p>适合把拆开的年月日字段合成为真正日期。</p><h2>语法</h2><pre><code>=DATE(year,month,day)</code></pre><h2>示例</h2><pre><code>=DATE(2026,4,15)
=DATE(A2,B2,C2)</code></pre><h2>注意点</h2><ul><li>月和日超出范围时会自动进位。</li><li>结果是数值型日期，可继续参与计算。</li></ul>',
       30, 1
FROM tutorial_category
WHERE name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'DATE');

UPDATE tutorial_article
SET title = 'DATEDIF',
    summary = '计算两个日期之间相差的天、月、年。',
    content = '<h2>作用</h2><p>用于计算工龄、合同月数、项目周期。</p><h2>语法</h2><pre><code>=DATEDIF(start_date,end_date,unit)</code></pre><h2>示例</h2><pre><code>=DATEDIF(A2,B2,&quot;d&quot;)
=DATEDIF(A2,B2,&quot;m&quot;)
=DATEDIF(A2,B2,&quot;y&quot;)</code></pre><h2>注意点</h2><ul><li>结束日期必须大于等于开始日期。</li><li>这是兼容函数，公式提示里不一定自动补全。</li></ul>',
    sort_order = 40
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '日期与时间' LIMIT 1)
  AND title = 'DATEDIF / EOMONTH';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'EOMONTH', '返回指定日期所在月的月末日期。',
       '<h2>作用</h2><p>用于账期结算、财务月末、周期边界控制。</p><h2>语法</h2><pre><code>=EOMONTH(start_date,months)</code></pre><h2>示例</h2><pre><code>=EOMONTH(C2,0)
=EOMONTH(C2,1)</code></pre><h2>注意点</h2><ul><li>第二参数 0 表示当月月末。</li><li>1 表示下月月末，-1 表示上月月末。</li></ul>',
       50, 1
FROM tutorial_category
WHERE name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'EOMONTH');

UPDATE tutorial_article
SET title = 'WORKDAY',
    summary = '按工作日顺延或倒推日期。',
    content = '<h2>作用</h2><p>用于推算交付日、复核日、审批截止日。</p><h2>语法</h2><pre><code>=WORKDAY(start_date,days,[holidays])</code></pre><h2>示例</h2><pre><code>=WORKDAY(A2,5)
=WORKDAY(A2,10,H2:H20)</code></pre><h2>注意点</h2><ul><li>默认跳过周六周日。</li><li>企业假期要单独传 holidays 区域。</li></ul>',
    sort_order = 60
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '日期与时间' LIMIT 1)
  AND title = 'WORKDAY / NETWORKDAYS';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'NETWORKDAYS', '统计两个日期之间的工作日天数。',
       '<h2>作用</h2><p>用于统计工期、请假天数、审批工作日时长。</p><h2>语法</h2><pre><code>=NETWORKDAYS(start_date,end_date,[holidays])</code></pre><h2>示例</h2><pre><code>=NETWORKDAYS(A2,B2)
=NETWORKDAYS(A2,B2,H2:H20)</code></pre><h2>注意点</h2><ul><li>起止日期都参与统计。</li><li>节假日区域建议单独维护。</li></ul>',
       70, 1
FROM tutorial_category
WHERE name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'NETWORKDAYS');

UPDATE tutorial_article
SET title = 'ROUND',
    summary = '按四舍五入规则保留指定小数位。',
    content = '<h2>作用</h2><p>用于金额、比例、均值结果的标准取整。</p><h2>语法</h2><pre><code>=ROUND(number,num_digits)</code></pre><h2>示例</h2><pre><code>=ROUND(A2,2)
=ROUND(B2,-1)</code></pre><h2>注意点</h2><ul><li>位数为负数时表示按十位、百位取整。</li><li>财务场景常用到两位小数。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '数学与取整' LIMIT 1)
  AND title = 'ROUND / ROUNDUP / ROUNDDOWN';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'ROUNDUP', '无论大小都向上取整。',
       '<h2>作用</h2><p>适合包装进位、箱数进位、最小收费单位进位。</p><h2>语法</h2><pre><code>=ROUNDUP(number,num_digits)</code></pre><h2>示例</h2><pre><code>=ROUNDUP(B2,0)
=ROUNDUP(C2,-1)</code></pre><h2>注意点</h2><ul><li>正负数都会向远离 0 的方向取整。</li><li>计费场景很常用。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'ROUNDUP');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'ROUNDDOWN', '无论大小都向下取整。',
       '<h2>作用</h2><p>适合保守估算、去尾处理、按低值结算。</p><h2>语法</h2><pre><code>=ROUNDDOWN(number,num_digits)</code></pre><h2>示例</h2><pre><code>=ROUNDDOWN(C2,0)
=ROUNDDOWN(D2,-1)</code></pre><h2>注意点</h2><ul><li>正负数都会向接近 0 的方向取整。</li><li>不要与 INT 混用概念。</li></ul>',
       30, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'ROUNDDOWN');

UPDATE tutorial_article
SET title = 'INT',
    summary = '向下取整为最接近的整数。',
    content = '<h2>作用</h2><p>用于按整数箱数、整批数量、整天数统计。</p><h2>语法</h2><pre><code>=INT(number)</code></pre><h2>示例</h2><pre><code>=INT(A2)</code></pre><h2>注意点</h2><ul><li>INT 对负数会继续向更小的整数取整。</li><li>与 ROUNDDOWN 在负数上的结果不同。</li></ul>',
    sort_order = 40
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '数学与取整' LIMIT 1)
  AND title = 'INT / MOD / ABS';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'MOD', '返回除法运算后的余数。',
       '<h2>作用</h2><p>用于轮班、周期编号、奇偶判断和批次分组。</p><h2>语法</h2><pre><code>=MOD(number,divisor)</code></pre><h2>示例</h2><pre><code>=MOD(B2,7)
=IF(MOD(C2,2)=0,&quot;偶数&quot;,&quot;奇数&quot;)</code></pre><h2>注意点</h2><ul><li>除数不能为 0。</li><li>周期类业务中非常实用。</li></ul>',
       50, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'MOD');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'ABS', '返回数值的绝对值。',
       '<h2>作用</h2><p>用于比较偏差、金额差额、误差值时忽略正负方向。</p><h2>语法</h2><pre><code>=ABS(number)</code></pre><h2>示例</h2><pre><code>=ABS(C2-D2)</code></pre><h2>注意点</h2><ul><li>常与 IF、MAX、MIN 搭配做偏差分析。</li><li>结果一定为非负数。</li></ul>',
       60, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'ABS');

UPDATE tutorial_article
SET title = 'CEILING',
    summary = '按指定倍数向上取整。',
    content = '<h2>作用</h2><p>用于运费进位、包装规格进位、最小采购单位进位。</p><h2>语法</h2><pre><code>=CEILING(number,significance)</code></pre><h2>示例</h2><pre><code>=CEILING(A2,5)</code></pre><h2>注意点</h2><ul><li>significance 表示取整步长。</li><li>与 ROUNDUP 不同，CEILING 按倍数而不是按位数处理。</li></ul>',
    sort_order = 70
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '数学与取整' LIMIT 1)
  AND title = 'CEILING / FLOOR / MROUND';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'FLOOR', '按指定倍数向下取整。',
       '<h2>作用</h2><p>适合按固定步长下取整，比如金额按 10 元取整。</p><h2>语法</h2><pre><code>=FLOOR(number,significance)</code></pre><h2>示例</h2><pre><code>=FLOOR(B2,10)</code></pre><h2>注意点</h2><ul><li>常见于折扣、批量、箱规场景。</li><li>与 CEILING 是相对关系。</li></ul>',
       80, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'FLOOR');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'MROUND', '按指定倍数四舍五入。',
       '<h2>作用</h2><p>用于按固定步长做标准化取整。</p><h2>语法</h2><pre><code>=MROUND(number,multiple)</code></pre><h2>示例</h2><pre><code>=MROUND(C2,0.5)</code></pre><h2>注意点</h2><ul><li>适合价格档位和规格档位处理。</li><li>multiple 要与数值单位一致。</li></ul>',
       90, 1
FROM tutorial_category
WHERE name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'MROUND');

UPDATE tutorial_article
SET title = 'FILTER',
    summary = '按条件筛选并返回满足条件的动态数组。',
    content = '<h2>作用</h2><p>用于做自动筛选结果面板、条件列表和专题视图。</p><h2>语法</h2><pre><code>=FILTER(array,include,[if_empty])</code></pre><h2>示例</h2><pre><code>=FILTER(A2:F100,C2:C100=&quot;华东&quot;)</code></pre><h2>注意点</h2><ul><li>返回动态溢出区域，周边必须留空。</li><li>无结果时建议写第三参数。</li></ul>',
    sort_order = 10
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '动态数组' LIMIT 1)
  AND title = 'FILTER / SORT / UNIQUE';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'SORT', '对动态数组或区域结果进行排序。',
       '<h2>作用</h2><p>用于按金额、日期、数量快速重排结果区。</p><h2>语法</h2><pre><code>=SORT(array,[sort_index],[sort_order],[by_col])</code></pre><h2>示例</h2><pre><code>=SORT(A2:F20,4,-1)</code></pre><h2>注意点</h2><ul><li>升序为 1，降序为 -1。</li><li>常与 FILTER 联动。</li></ul>',
       20, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'SORT');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'UNIQUE', '提取区域中的唯一值列表。',
       '<h2>作用</h2><p>用于去重名单、唯一部门、唯一编码提取。</p><h2>语法</h2><pre><code>=UNIQUE(array,[by_col],[exactly_once])</code></pre><h2>示例</h2><pre><code>=UNIQUE(B2:B100)</code></pre><h2>注意点</h2><ul><li>返回动态数组。</li><li>做数据校验和下拉源时非常方便。</li></ul>',
       30, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'UNIQUE');

UPDATE tutorial_article
SET title = 'SEQUENCE',
    summary = '生成连续数字序列的动态数组。',
    content = '<h2>作用</h2><p>用于生成月份、编号、天数和测试样例序列。</p><h2>语法</h2><pre><code>=SEQUENCE(rows,[columns],[start],[step])</code></pre><h2>示例</h2><pre><code>=SEQUENCE(12)
=SEQUENCE(4,3,100,10)</code></pre><h2>注意点</h2><ul><li>会自动溢出填充。</li><li>适合配合 DATE、INDEX 做动态模板。</li></ul>',
    sort_order = 40
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '动态数组' LIMIT 1)
  AND title = 'SEQUENCE / RANDARRAY';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'RANDARRAY', '生成随机数组结果。',
       '<h2>作用</h2><p>适合制作测试数据、随机样本和模拟场景。</p><h2>语法</h2><pre><code>=RANDARRAY([rows],[columns],[min],[max],[whole_number])</code></pre><h2>示例</h2><pre><code>=RANDARRAY(5,2,1,100,TRUE)</code></pre><h2>注意点</h2><ul><li>工作簿重算时结果会变化。</li><li>正式业务数据不要直接依赖随机结果。</li></ul>',
       50, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'RANDARRAY');

UPDATE tutorial_article
SET title = 'TAKE',
    summary = '从数组开头或末尾截取指定行列。',
    content = '<h2>作用</h2><p>用于只取前几行重点数据或后几行最新记录。</p><h2>语法</h2><pre><code>=TAKE(array,[rows],[columns])</code></pre><h2>示例</h2><pre><code>=TAKE(A2:F20,5)</code></pre><h2>注意点</h2><ul><li>负数表示从末尾截取。</li><li>适合与 SORT 后结果联动。</li></ul>',
    sort_order = 60
WHERE category_id = (SELECT id FROM tutorial_category WHERE name = '动态数组' LIMIT 1)
  AND title = 'TAKE / DROP / HSTACK / VSTACK';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'DROP', '从数组中丢弃指定行列后返回剩余部分。',
       '<h2>作用</h2><p>用于跳过表头、去掉尾部汇总行等场景。</p><h2>语法</h2><pre><code>=DROP(array,[rows],[columns])</code></pre><h2>示例</h2><pre><code>=DROP(A2:F20,1)</code></pre><h2>注意点</h2><ul><li>负数表示从末尾开始丢弃。</li><li>常和 TAKE、FILTER 组合使用。</li></ul>',
       70, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'DROP');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'HSTACK', '把多个数组按横向并排拼接。',
       '<h2>作用</h2><p>用于把多个结果区左右合并成一张新表。</p><h2>语法</h2><pre><code>=HSTACK(array1,[array2],...)</code></pre><h2>示例</h2><pre><code>=HSTACK(A2:B10,D2:E10)</code></pre><h2>注意点</h2><ul><li>行数不同会自动补空白。</li><li>适合做多视图拼表。</li></ul>',
       80, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'HSTACK');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT id, 'VSTACK', '把多个数组按纵向上下拼接。',
       '<h2>作用</h2><p>用于把多张同结构数据表上下合并。</p><h2>语法</h2><pre><code>=VSTACK(array1,[array2],...)</code></pre><h2>示例</h2><pre><code>=VSTACK(A2:C5,A10:C15)</code></pre><h2>注意点</h2><ul><li>列数不同会自动补空白。</li><li>适合汇总多月、多区域同结构数据。</li></ul>',
       90, 1
FROM tutorial_category
WHERE name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'VSTACK');
