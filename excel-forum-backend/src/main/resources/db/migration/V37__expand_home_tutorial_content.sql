UPDATE tutorial_category
SET description = '求和、计数、条件汇总等最常见的基础统计函数。',
    sort_order = 10,
    enabled = 1
WHERE name = '函数基础';

UPDATE tutorial_category
SET description = '多条件判断、容错与逻辑组合时最常用的函数。',
    sort_order = 20,
    enabled = 1
WHERE name = '逻辑判断';

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '逻辑判断', '多条件判断、容错与逻辑组合时最常用的函数。', 20, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '逻辑判断'
);

UPDATE tutorial_category
SET description = '定位数据、跨表回填与动态匹配的核心函数。',
    sort_order = 30,
    enabled = 1
WHERE name = '查找与引用';

UPDATE tutorial_category
SET description = '字符串拆分、拼接、清洗与格式转换时常用的函数。',
    sort_order = 40,
    enabled = 1
WHERE name = '文本处理';

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '日期与时间', '日期运算、月末处理、工作日统计等高频时间函数。', 50, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '日期与时间'
);

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '数学与取整', '四舍五入、取整、求余和分段计算时常用函数。', 60, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '数学与取整'
);

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '动态数组', 'Excel 365 中最实用的筛选、排序和唯一值函数。', 70, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '动态数组'
);

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'SUM 与 AVERAGE',
       '快速掌握求和与平均值，是所有统计公式的起点。',
       '<h2>适用场景</h2><p>用于销售汇总、成绩统计、费用合计、平均客单价等最基础的数据分析场景。</p><h2>公式写法</h2><pre><code>=SUM(B2:B10)
=AVERAGE(C2:C10)</code></pre><h2>参数说明</h2><table><thead><tr><th>函数</th><th>核心参数</th><th>说明</th></tr></thead><tbody><tr><td>SUM</td><td>number1, [number2]...</td><td>可传区域、单元格或常量</td></tr><tr><td>AVERAGE</td><td>number1, [number2]...</td><td>忽略空白，但会计算 0</td></tr></tbody></table><h2>实战示例</h2><pre><code>=SUM(B2:B100)
=AVERAGE(IF(C2:C31&gt;0,C2:C31))</code></pre><blockquote><p>做平均值时先确认是否要排除 0、异常值和空白行，否则结果很容易失真。</p></blockquote><h2>常见问题</h2><ul><li>文本数字不会自动参与求和，必要时先转成数值。</li><li>平均值统计前先判断数据口径是否一致。</li></ul>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'SUM 与 AVERAGE');

UPDATE tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
SET ta.category_id = tc.id,
    ta.summary = '快速掌握求和与平均值，是所有统计公式的起点。',
    ta.content = '<h2>适用场景</h2><p>用于销售汇总、成绩统计、费用合计、平均客单价等最基础的数据分析场景。</p><h2>公式写法</h2><pre><code>=SUM(B2:B10)
=AVERAGE(C2:C10)</code></pre><h2>参数说明</h2><table><thead><tr><th>函数</th><th>核心参数</th><th>说明</th></tr></thead><tbody><tr><td>SUM</td><td>number1, [number2]...</td><td>可传区域、单元格或常量</td></tr><tr><td>AVERAGE</td><td>number1, [number2]...</td><td>忽略空白，但会计算 0</td></tr></tbody></table><h2>实战示例</h2><pre><code>=SUM(B2:B100)
=AVERAGE(IF(C2:C31&gt;0,C2:C31))</code></pre><blockquote><p>做平均值时先确认是否要排除 0、异常值和空白行，否则结果很容易失真。</p></blockquote><h2>常见问题</h2><ul><li>文本数字不会自动参与求和，必要时先转成数值。</li><li>平均值统计前先判断数据口径是否一致。</li></ul>',
    ta.sort_order = 10,
    ta.enabled = 1
WHERE ta.title = 'SUM 与 AVERAGE'
  AND tc.name = '函数基础';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'COUNT / COUNTA / COUNTBLANK',
       '计数函数决定你统计的是数字、非空还是空白。',
       '<h2>核心区别</h2><table><thead><tr><th>函数</th><th>统计对象</th><th>典型场景</th></tr></thead><tbody><tr><td>COUNT</td><td>数字</td><td>统计成绩、金额、数量</td></tr><tr><td>COUNTA</td><td>非空单元格</td><td>统计已填报人数、已录入订单</td></tr><tr><td>COUNTBLANK</td><td>空白单元格</td><td>检查未填写项</td></tr></tbody></table><h2>示例</h2><pre><code>=COUNT(B2:B100)
=COUNTA(A2:A100)
=COUNTBLANK(D2:D100)</code></pre><h2>使用建议</h2><ul><li>统计记录条数时优先用 COUNTA 检查主键列。</li><li>COUNT 只认数值，日期在 Excel 内部也是数字。</li></ul>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'COUNT / COUNTA / COUNTBLANK');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'COUNTIF / COUNTIFS / SUMIFS',
       '单条件、多条件计数和汇总时最常用的一组条件函数。',
       '<h2>适用场景</h2><p>用于按部门、时间、状态、地区等维度做筛选统计。</p><h2>公式写法</h2><pre><code>=COUNTIF(B:B,&quot;华东&quot;)
=COUNTIFS(B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)
=SUMIFS(E:E,B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)</code></pre><h2>参数提醒</h2><ul><li>条件区域与汇总区域行数必须一致。</li><li>日期条件建议写成单元格引用，避免文本日期比较错误。</li></ul><h2>进阶写法</h2><pre><code>=SUMIFS(E:E,A:A,G2,B:B,&quot;&gt;=&quot;&amp;H2,B:B,&quot;&lt;=&quot;&amp;I2)</code></pre><blockquote><p>多条件汇总优先考虑 SUMIFS，而不是 SUM(IF()) 这种更重的旧写法。</p></blockquote>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '函数基础'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'COUNTIF / COUNTIFS / SUMIFS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'IF 条件判断',
       '根据条件返回不同结果，是一切判断型公式的入口。',
       '<h2>标准结构</h2><pre><code>=IF(条件, 满足时结果, 不满足时结果)</code></pre><h2>常见场景</h2><ul><li>成绩是否及格</li><li>订单是否超期</li><li>库存是否低于安全值</li></ul><h2>实战示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;已逾期&quot;,&quot;正常&quot;)</code></pre><h2>使用建议</h2><p>分支超过 3 层时，优先改用 IFS、LOOKUP 或建立映射表，避免嵌套 IF 失控。</p>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'IF 条件判断');

UPDATE tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
SET ta.category_id = tc.id,
    ta.summary = '根据条件返回不同结果，是一切判断型公式的入口。',
    ta.content = '<h2>标准结构</h2><pre><code>=IF(条件, 满足时结果, 不满足时结果)</code></pre><h2>常见场景</h2><ul><li>成绩是否及格</li><li>订单是否超期</li><li>库存是否低于安全值</li></ul><h2>实战示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;已逾期&quot;,&quot;正常&quot;)</code></pre><h2>使用建议</h2><p>分支超过 3 层时，优先改用 IFS、LOOKUP 或建立映射表，避免嵌套 IF 失控。</p>',
    ta.sort_order = 10,
    ta.enabled = 1
WHERE ta.title = 'IF 条件判断'
  AND tc.name = '逻辑判断';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'AND / OR / NOT',
       '组合多个条件时，要先掌握逻辑连接函数。',
       '<h2>典型写法</h2><pre><code>=AND(B2&gt;=60,C2&gt;=60)
=OR(D2=&quot;紧急&quot;,E2=&quot;高风险&quot;)
=NOT(F2=&quot;已关闭&quot;)</code></pre><h2>常见搭配</h2><pre><code>=IF(AND(B2&gt;=60,C2&gt;=60),&quot;通过&quot;,&quot;待复查&quot;)
=IF(OR(G2=&quot;VIP&quot;,H2&gt;100000),&quot;重点跟进&quot;,&quot;普通客户&quot;)</code></pre><h2>注意点</h2><ul><li>AND 要求全部条件成立。</li><li>OR 只要任意条件成立即可。</li><li>NOT 常用于反向筛选和排除条件。</li></ul>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'AND / OR / NOT');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'IFERROR / IFS',
       '用 IFERROR 处理异常结果，用 IFS 替代多层 IF。',
       '<h2>IFERROR</h2><pre><code>=IFERROR(A2/B2,0)
=IFERROR(XLOOKUP(D2,H:H,I:I),&quot;未匹配&quot;)</code></pre><p>当公式可能出现 <code>#N/A</code>、<code>#DIV/0!</code>、<code>#VALUE!</code> 时，用 IFERROR 做统一兜底。</p><h2>IFS</h2><pre><code>=IFS(B2&gt;=90,&quot;优秀&quot;,B2&gt;=80,&quot;良好&quot;,B2&gt;=60,&quot;及格&quot;,TRUE,&quot;不及格&quot;)</code></pre><blockquote><p>如果只是想屏蔽部分错误，优先使用 IFNA 等更窄的异常处理函数，避免把真实数据问题吞掉。</p></blockquote>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '逻辑判断'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'IFERROR / IFS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'VLOOKUP 与 XLOOKUP',
       '查找函数里最常见的两个入口，适合做编码匹配与结果回填。',
       '<h2>怎么选</h2><table><thead><tr><th>函数</th><th>优点</th><th>限制</th></tr></thead><tbody><tr><td>VLOOKUP</td><td>兼容旧版模板</td><td>只能从左往右找，依赖列序号</td></tr><tr><td>XLOOKUP</td><td>支持左右查找、默认精确匹配</td><td>需要较新版本 Excel</td></tr></tbody></table><h2>示例</h2><pre><code>=VLOOKUP(A2,$F$2:$H$20,3,FALSE)
=XLOOKUP(A2,F2:F20,H2:H20,&quot;未找到&quot;)</code></pre><h2>建议</h2><ul><li>新表优先用 XLOOKUP。</li><li>旧版协作模板再保留 VLOOKUP。</li><li>查找列必须唯一，否则会返回第一条匹配记录。</li></ul>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'VLOOKUP 与 XLOOKUP');

UPDATE tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
SET ta.category_id = tc.id,
    ta.summary = '查找函数里最常见的两个入口，适合做编码匹配与结果回填。',
    ta.content = '<h2>怎么选</h2><table><thead><tr><th>函数</th><th>优点</th><th>限制</th></tr></thead><tbody><tr><td>VLOOKUP</td><td>兼容旧版模板</td><td>只能从左往右找，依赖列序号</td></tr><tr><td>XLOOKUP</td><td>支持左右查找、默认精确匹配</td><td>需要较新版本 Excel</td></tr></tbody></table><h2>示例</h2><pre><code>=VLOOKUP(A2,$F$2:$H$20,3,FALSE)
=XLOOKUP(A2,F2:F20,H2:H20,&quot;未找到&quot;)</code></pre><h2>建议</h2><ul><li>新表优先用 XLOOKUP。</li><li>旧版协作模板再保留 VLOOKUP。</li><li>查找列必须唯一，否则会返回第一条匹配记录。</li></ul>',
    ta.sort_order = 10,
    ta.enabled = 1
WHERE ta.title = 'VLOOKUP 与 XLOOKUP'
  AND tc.name = '查找与引用';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'INDEX + MATCH',
       '当查找列不固定、需要更强组合能力时，用 INDEX + MATCH。',
       '<h2>核心思路</h2><p><code>MATCH</code> 先找位置，<code>INDEX</code> 再按位置取值。</p><pre><code>=INDEX(C:C,MATCH(G2,A:A,0))</code></pre><h2>优势</h2><ul><li>不怕插入删除列。</li><li>支持向左查找。</li><li>便于做二维查找。</li></ul><h2>二维查找示例</h2><pre><code>=INDEX(B2:F10,MATCH(H2,A2:A10,0),MATCH(I2,B1:F1,0))</code></pre>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'INDEX + MATCH');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'XMATCH / CHOOSECOLS',
       '适合新版本 Excel 的灵活定位与列提取组合。',
       '<h2>XMATCH</h2><pre><code>=XMATCH(G2,A2:A20,0)
=XMATCH(TODAY(),B2:B20,1)</code></pre><p>XMATCH 比 MATCH 更适合做精确匹配、近似匹配和反向搜索。</p><h2>CHOOSECOLS</h2><pre><code>=CHOOSECOLS(A1:F20,1,3,6)</code></pre><p>从大表中按列号快速抽取需要的字段，适合与 FILTER、SORT 搭配。</p>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '查找与引用'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'XMATCH / CHOOSECOLS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'LEFT / RIGHT / MID',
       '处理编号、姓名、固定格式文本时常用的截取函数。',
       '<h2>常见写法</h2><pre><code>=LEFT(A2,3)
=RIGHT(A2,4)
=MID(A2,2,5)</code></pre><h2>适用场景</h2><ul><li>从身份证、订单号中截取区段</li><li>提取年月编码</li><li>拆出省市、部门编号</li></ul><h2>注意点</h2><p>截取前先确认源文本长度是否一致，不一致时建议先用 LEN 校验。</p>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'LEFT / RIGHT / MID');

UPDATE tutorial_article ta
JOIN tutorial_category tc ON tc.id = ta.category_id
SET ta.category_id = tc.id,
    ta.summary = '处理编号、姓名、固定格式文本时常用的截取函数。',
    ta.content = '<h2>常见写法</h2><pre><code>=LEFT(A2,3)
=RIGHT(A2,4)
=MID(A2,2,5)</code></pre><h2>适用场景</h2><ul><li>从身份证、订单号中截取区段</li><li>提取年月编码</li><li>拆出省市、部门编号</li></ul><h2>注意点</h2><p>截取前先确认源文本长度是否一致，不一致时建议先用 LEN 校验。</p>',
    ta.sort_order = 10,
    ta.enabled = 1
WHERE ta.title = 'LEFT / RIGHT / MID'
  AND tc.name = '文本处理';

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'TEXT / VALUE',
       '文本与数值格式互转时，最容易用到的一组函数。',
       '<h2>TEXT</h2><pre><code>=TEXT(A2,&quot;yyyy-mm-dd&quot;)
=TEXT(B2,&quot;#,##0.00&quot;)</code></pre><p>把日期、金额、比例按固定格式输出成文本。</p><h2>VALUE</h2><pre><code>=VALUE(C2)</code></pre><p>当数字被当成文本存储时，用 VALUE 转回真正的数值。</p><blockquote><p>TEXT 的结果是文本，后续如果还要参与计算，不要直接拿 TEXT 的结果继续算。</p></blockquote>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'TEXT / VALUE');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'TRIM / SUBSTITUTE / TEXTSPLIT',
       '清洗空格、批量替换文本、按分隔符拆分时非常高频。',
       '<h2>TRIM</h2><pre><code>=TRIM(A2)</code></pre><p>清除多余空格，保留单词间单个空格。</p><h2>SUBSTITUTE</h2><pre><code>=SUBSTITUTE(B2,&quot;-&quot;,&quot;/&quot;)
=SUBSTITUTE(C2,&quot;有限公司&quot;,&quot;&quot;)</code></pre><h2>TEXTSPLIT</h2><pre><code>=TEXTSPLIT(D2,&quot;,&quot;)</code></pre><p>把一串逗号分隔的文本拆成多列或多行。</p>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '文本处理'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'TRIM / SUBSTITUTE / TEXTSPLIT');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'TODAY / NOW / DATE',
       '生成当前日期时间、组装标准日期时最基础的一组函数。',
       '<h2>常见写法</h2><pre><code>=TODAY()
=NOW()
=DATE(2026,4,15)</code></pre><h2>适用场景</h2><ul><li>计算逾期天数</li><li>生成日报日期</li><li>拼接年、月、日字段形成标准日期</li></ul><h2>注意点</h2><p>NOW 包含时间，TODAY 只有日期。做差值比较前先确认是否需要时间精度。</p>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'TODAY / NOW / DATE');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'DATEDIF / EOMONTH',
       '计算相差月数、年数和月末日期时很常用。',
       '<h2>DATEDIF</h2><pre><code>=DATEDIF(A2,B2,&quot;d&quot;)
=DATEDIF(A2,B2,&quot;m&quot;)
=DATEDIF(A2,B2,&quot;y&quot;)</code></pre><p>适合算在职年限、合同月数、交付周期。</p><h2>EOMONTH</h2><pre><code>=EOMONTH(C2,0)
=EOMONTH(C2,1)</code></pre><p>用于获取本月末、下月末，做财务结算和账期控制非常方便。</p>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'DATEDIF / EOMONTH');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'WORKDAY / NETWORKDAYS',
       '涉及工作日推算和工期统计时必备。',
       '<h2>典型写法</h2><pre><code>=WORKDAY(A2,5)
=NETWORKDAYS(A2,B2)
=NETWORKDAYS(A2,B2,H2:H20)</code></pre><h2>适用场景</h2><ul><li>推算交付日期</li><li>统计请假、工期、审批时长</li><li>剔除法定节假日</li></ul><blockquote><p>如果企业有固定节假日表，记得把假期区域作为第三参数传进去。</p></blockquote>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '日期与时间'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'WORKDAY / NETWORKDAYS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'ROUND / ROUNDUP / ROUNDDOWN',
       '金额、单价、税率和结果展示时最常用的取整函数。',
       '<h2>三者区别</h2><table><thead><tr><th>函数</th><th>行为</th></tr></thead><tbody><tr><td>ROUND</td><td>四舍五入</td></tr><tr><td>ROUNDUP</td><td>永远向上</td></tr><tr><td>ROUNDDOWN</td><td>永远向下</td></tr></tbody></table><h2>示例</h2><pre><code>=ROUND(A2,2)
=ROUNDUP(B2,0)
=ROUNDDOWN(C2,-1)</code></pre><p>位数为负数时表示取整到十位、百位等更高位。</p>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'ROUND / ROUNDUP / ROUNDDOWN');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'INT / MOD / ABS',
       '拆分整数、小数、求余数和绝对值时最实用。',
       '<h2>示例</h2><pre><code>=INT(A2)
=MOD(B2,7)
=ABS(C2-D2)</code></pre><h2>典型场景</h2><ul><li>INT：按整数箱数、批次数量取整</li><li>MOD：轮班、周期、尾号分组</li><li>ABS：比较差异值时忽略正负方向</li></ul>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'INT / MOD / ABS');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'CEILING / FLOOR / MROUND',
       '按指定倍数取整、分档计费和包装进位时很常用。',
       '<h2>公式写法</h2><pre><code>=CEILING(A2,5)
=FLOOR(B2,10)
=MROUND(C2,0.5)</code></pre><h2>适用场景</h2><ul><li>运费按 5 公斤进位</li><li>金额按 10 元向下取整</li><li>批量规格按固定步长处理</li></ul>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '数学与取整'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'CEILING / FLOOR / MROUND');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'FILTER / SORT / UNIQUE',
       '动态数组里最适合做结果面板的一组函数。',
       '<h2>典型组合</h2><pre><code>=FILTER(A2:F100,C2:C100=&quot;华东&quot;)
=SORT(FILTER(A2:F100,C2:C100=&quot;华东&quot;),4,-1)
=UNIQUE(B2:B100)</code></pre><h2>适用场景</h2><ul><li>做自动筛选面板</li><li>提取唯一名单</li><li>按金额、时间自动排序</li></ul><blockquote><p>这组函数返回的是动态溢出区域，周边区域必须留空。</p></blockquote>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'FILTER / SORT / UNIQUE');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'SEQUENCE / RANDARRAY',
       '批量生成序号、测试数据和模拟数组时非常方便。',
       '<h2>示例</h2><pre><code>=SEQUENCE(12)
=SEQUENCE(4,3,100,10)
=RANDARRAY(5,2,1,100,TRUE)</code></pre><h2>使用建议</h2><ul><li>SEQUENCE 适合生成月份、编号、批次序列。</li><li>RANDARRAY 适合做测试样例，不建议直接作为正式业务数据源。</li></ul>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'SEQUENCE / RANDARRAY');

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'TAKE / DROP / HSTACK / VSTACK',
       '截取数组、拼接区域时最省力的新函数组合。',
       '<h2>常见写法</h2><pre><code>=TAKE(A2:F20,5)
=DROP(A2:F20,1)
=HSTACK(A2:B10,D2:E10)
=VSTACK(A2:C5,A10:C15)</code></pre><h2>适用场景</h2><ul><li>只取前几行重点数据</li><li>跳过表头再做计算</li><li>把多个结果区横向或纵向合并</li></ul>',
       30,
       1
FROM tutorial_category c
WHERE c.name = '动态数组'
  AND NOT EXISTS (SELECT 1 FROM tutorial_article WHERE title = 'TAKE / DROP / HSTACK / VSTACK');
