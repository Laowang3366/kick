UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于金额汇总、数量累加、成绩合计等最基础的统计场景。</p><h2>语法</h2><pre><code>=SUM(数值1,[数值2],...)</code></pre><h2>示例</h2><pre><code>=SUM(B2:B10)
=SUM(B2:B10,D2:D10)
=SUM(12,18,25)</code></pre><h2>注意点</h2><ul><li>文本数字默认不会参与求和。</li><li>合并单元格区域先拆开再汇总更稳妥。</li></ul>'
WHERE title = 'SUM';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>常用于平均成绩、平均单价、平均耗时等场景。</p><h2>语法</h2><pre><code>=AVERAGE(数值1,[数值2],...)</code></pre><h2>示例</h2><pre><code>=AVERAGE(C2:C10)
=AVERAGE(C2:C10,E2:E10)</code></pre><h2>注意点</h2><ul><li>空白会忽略，但 0 会参与计算。</li><li>统计前先确认是否要剔除异常值。</li></ul>'
WHERE title = 'AVERAGE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合统计金额、分数、数量等真正的数值记录数。</p><h2>语法</h2><pre><code>=COUNT(值1,[值2],...)</code></pre><h2>示例</h2><pre><code>=COUNT(B2:B100)
=COUNT(B2:B100,D2:D100)</code></pre><h2>注意点</h2><ul><li>日期在 Excel 内部也是数字，因此会被 COUNT 统计。</li><li>文本、空白不会被 COUNT 计入。</li></ul>'
WHERE title = 'COUNT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>常用于统计已填报人数、已录入订单、已上传记录。</p><h2>语法</h2><pre><code>=COUNTA(值1,[值2],...)</code></pre><h2>示例</h2><pre><code>=COUNTA(A2:A100)
=COUNTA(B2:D20)</code></pre><h2>注意点</h2><ul><li>只要单元格非空就会计入，包括文本、数字、错误值。</li><li>统计记录数时优先选主键列。</li></ul>'
WHERE title = 'COUNTA';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于统计某部门人数、某状态订单数、某地区客户数。</p><h2>语法</h2><pre><code>=COUNTIF(条件区域,条件)</code></pre><h2>示例</h2><pre><code>=COUNTIF(B:B,&quot;华东&quot;)
=COUNTIF(C:C,&quot;&gt;=60&quot;)</code></pre><h2>注意点</h2><ul><li>条件中比较符号要放在引号内。</li><li>文本条件建议直接引用单元格，减少拼写错误。</li></ul>'
WHERE title = 'COUNTIF';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>常用于同时按地区、状态、日期等多个条件计数。</p><h2>语法</h2><pre><code>=COUNTIFS(条件区域1,条件1,[条件区域2,条件2],...)</code></pre><h2>示例</h2><pre><code>=COUNTIFS(B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)
=COUNTIFS(D:D,&quot;&gt;=&quot;&amp;H2,D:D,&quot;&lt;=&quot;&amp;I2)</code></pre><h2>注意点</h2><ul><li>所有条件区域长度必须一致。</li><li>日期区间优先用单元格拼接比较符。</li></ul>'
WHERE title = 'COUNTIFS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于多条件销售额汇总、费用汇总、提成汇总。</p><h2>语法</h2><pre><code>=SUMIFS(求和区域,条件区域1,条件1,[条件区域2,条件2],...)</code></pre><h2>示例</h2><pre><code>=SUMIFS(E:E,B:B,&quot;华东&quot;,C:C,&quot;已完成&quot;)
=SUMIFS(F:F,A:A,G2,D:D,&quot;&gt;=&quot;&amp;H2,D:D,&quot;&lt;=&quot;&amp;I2)</code></pre><h2>注意点</h2><ul><li>汇总区域和条件区域必须行数一致。</li><li>优先用 SUMIFS，不要滥用旧式数组公式。</li></ul>'
WHERE title = 'SUMIFS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于及格判断、逾期判断、状态分支等场景。</p><h2>语法</h2><pre><code>=IF(逻辑判断,成立时结果,不成立时结果)</code></pre><h2>示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;逾期&quot;,&quot;正常&quot;)</code></pre><h2>注意点</h2><ul><li>嵌套过深时优先改用 IFS。</li><li>文本结果别忘了加引号。</li></ul>'
WHERE title = 'IF';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于“同时满足”判断，比如双科及格、双字段齐全。</p><h2>语法</h2><pre><code>=AND(逻辑条件1,[逻辑条件2],...)</code></pre><h2>示例</h2><pre><code>=AND(B2&gt;=60,C2&gt;=60)
=IF(AND(D2&lt;&gt;&quot;&quot;,E2&lt;&gt;&quot;&quot;),&quot;完整&quot;,&quot;缺失&quot;)</code></pre><h2>注意点</h2><ul><li>只要有一个条件不成立就返回 FALSE。</li><li>通常与 IF 搭配使用。</li></ul>'
WHERE title = 'AND';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于高风险判断、紧急标识、重点客户识别等场景。</p><h2>语法</h2><pre><code>=OR(逻辑条件1,[逻辑条件2],...)</code></pre><h2>示例</h2><pre><code>=OR(D2=&quot;紧急&quot;,E2=&quot;高风险&quot;)
=IF(OR(F2=&quot;VIP&quot;,G2&gt;100000),&quot;重点跟进&quot;,&quot;普通&quot;)</code></pre><h2>注意点</h2><ul><li>只要一个条件成立就返回 TRUE。</li><li>条件过多时建议拆辅助列。</li></ul>'
WHERE title = 'OR';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于排除条件、反向筛选和非空非特定值判断。</p><h2>语法</h2><pre><code>=NOT(逻辑结果)</code></pre><h2>示例</h2><pre><code>=NOT(F2=&quot;已关闭&quot;)
=IF(NOT(ISBLANK(B2)),&quot;已填写&quot;,&quot;未填写&quot;)</code></pre><h2>注意点</h2><ul><li>NOT 通常嵌在 IF、FILTER 等公式中使用。</li><li>复杂条件可先写成单独逻辑，再用 NOT 包裹。</li></ul>'
WHERE title = 'NOT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于屏蔽 <code>#N/A</code>、<code>#DIV/0!</code> 等异常显示。</p><h2>语法</h2><pre><code>=IFERROR(原公式结果,出错时返回值)</code></pre><h2>示例</h2><pre><code>=IFERROR(A2/B2,0)
=IFERROR(XLOOKUP(D2,H:H,I:I),&quot;未匹配&quot;)</code></pre><h2>注意点</h2><ul><li>不要用 IFERROR 掩盖真实数据问题。</li><li>只想处理 <code>#N/A</code> 时可优先用 IFNA。</li></ul>'
WHERE title = 'IFERROR';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于分档评分、状态分级、区间判断。</p><h2>语法</h2><pre><code>=IFS(条件1,结果1,[条件2,结果2],...)</code></pre><h2>示例</h2><pre><code>=IFS(B2&gt;=90,&quot;优秀&quot;,B2&gt;=80,&quot;良好&quot;,B2&gt;=60,&quot;及格&quot;,TRUE,&quot;不及格&quot;)</code></pre><h2>注意点</h2><ul><li>条件按顺序判断，命中即停止。</li><li>最后建议用 TRUE 做兜底分支。</li></ul>'
WHERE title = 'IFS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合旧版模板中的编码匹配、名称回填和结果查询。</p><h2>语法</h2><pre><code>=VLOOKUP(查找值,查找区域,返回列序号,[匹配方式])</code></pre><h2>示例</h2><pre><code>=VLOOKUP(A2,$F$2:$H$20,3,FALSE)</code></pre><h2>注意点</h2><ul><li>只能从左往右查找。</li><li>精确匹配时第四参数必须写 FALSE。</li></ul>'
WHERE title = 'VLOOKUP';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>支持左右查找、默认精确匹配，写法更直观。</p><h2>语法</h2><pre><code>=XLOOKUP(查找值,查找列,返回列,[未找到时返回值])</code></pre><h2>示例</h2><pre><code>=XLOOKUP(A2,F2:F20,H2:H20,&quot;未找到&quot;)</code></pre><h2>注意点</h2><ul><li>优先在新模板中使用。</li><li>查找列重复时会返回第一条结果。</li></ul>'
WHERE title = 'XLOOKUP';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于按位置取值、二维查找、动态引用。</p><h2>语法</h2><pre><code>=INDEX(区域,行号,[列号])</code></pre><h2>示例</h2><pre><code>=INDEX(C:C,5)
=INDEX(B2:F10,3,2)</code></pre><h2>注意点</h2><ul><li>单列区域只需要行号。</li><li>常与 MATCH 搭配做稳定查找。</li></ul>'
WHERE title = 'INDEX';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>常与 INDEX、CHOOSE、OFFSET 等函数组合使用。</p><h2>语法</h2><pre><code>=MATCH(查找值,查找区域,[匹配方式])</code></pre><h2>示例</h2><pre><code>=MATCH(G2,A2:A20,0)
=INDEX(C:C,MATCH(G2,A:A,0))</code></pre><h2>注意点</h2><ul><li>精确匹配通常写 0。</li><li>近似匹配前必须保证数据已排序。</li></ul>'
WHERE title = 'MATCH';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于精确匹配、近似匹配、反向查找和新表动态定位。</p><h2>语法</h2><pre><code>=XMATCH(查找值,查找区域,[匹配模式],[搜索模式])</code></pre><h2>示例</h2><pre><code>=XMATCH(G2,A2:A20,0)
=XMATCH(TODAY(),B2:B20,1)</code></pre><h2>注意点</h2><ul><li>新版 Excel 优先用 XMATCH 代替 MATCH。</li><li>可配合 INDEX 或 TAKE 做更灵活的定位。</li></ul>'
WHERE title = 'XMATCH';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合从大表中提取关键字段，生成简版结果区。</p><h2>语法</h2><pre><code>=CHOOSECOLS(区域,列号1,[列号2],...)</code></pre><h2>示例</h2><pre><code>=CHOOSECOLS(A1:F20,1,3,6)</code></pre><h2>注意点</h2><ul><li>常与 FILTER、SORT 搭配。</li><li>列序号是相对当前数组的位置，不是工作表绝对列号。</li></ul>'
WHERE title = 'CHOOSECOLS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于提取编号前缀、年月代码、地区码。</p><h2>语法</h2><pre><code>=LEFT(文本,[截取位数])</code></pre><h2>示例</h2><pre><code>=LEFT(A2,3)</code></pre><h2>注意点</h2><ul><li>未写位数时默认截取 1 位。</li><li>源文本长度不一致时先用 LEN 校验。</li></ul>'
WHERE title = 'LEFT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合提取尾号、后缀、文件扩展名。</p><h2>语法</h2><pre><code>=RIGHT(文本,[截取位数])</code></pre><h2>示例</h2><pre><code>=RIGHT(A2,4)</code></pre><h2>注意点</h2><ul><li>未写位数时默认截取 1 位。</li><li>截取扩展名时要先确认文本中是否包含点号。</li></ul>'
WHERE title = 'RIGHT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合从固定格式编号中抽取中段信息。</p><h2>语法</h2><pre><code>=MID(文本,起始位置,截取位数)</code></pre><h2>示例</h2><pre><code>=MID(A2,2,5)</code></pre><h2>注意点</h2><ul><li>起始位置从 1 开始计数。</li><li>常与 FIND、SEARCH 搭配做动态截取。</li></ul>'
WHERE title = 'MID';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于把日期、金额、百分比按固定展示格式输出。</p><h2>语法</h2><pre><code>=TEXT(原数值,格式代码)</code></pre><h2>示例</h2><pre><code>=TEXT(A2,&quot;yyyy-mm-dd&quot;)
=TEXT(B2,&quot;#,##0.00&quot;)</code></pre><h2>注意点</h2><ul><li>TEXT 返回的是文本，后续不适合直接参与数值计算。</li><li>格式代码必须写对，否则结果会异常。</li></ul>'
WHERE title = 'TEXT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于清洗导入数据中的“文本数字”。</p><h2>语法</h2><pre><code>=VALUE(文本数字)</code></pre><h2>示例</h2><pre><code>=VALUE(C2)</code></pre><h2>注意点</h2><ul><li>如果文本中混有非法字符会报错。</li><li>导入外部数据后经常需要配合 SUBSTITUTE 清洗再转换。</li></ul>'
WHERE title = 'VALUE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于清洗姓名、部门、地址等字段中的前后或多余空格。</p><h2>语法</h2><pre><code>=TRIM(文本)</code></pre><h2>示例</h2><pre><code>=TRIM(A2)</code></pre><h2>注意点</h2><ul><li>TRIM 主要处理英文空格。</li><li>遇到不可见空格时可结合 CLEAN 或 SUBSTITUTE。</li></ul>'
WHERE title = 'TRIM';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于统一分隔符、去掉无用后缀、替换旧编码。</p><h2>语法</h2><pre><code>=SUBSTITUTE(原文本,旧内容,新内容,[替换第几次])</code></pre><h2>示例</h2><pre><code>=SUBSTITUTE(B2,&quot;-&quot;,&quot;/&quot;)
=SUBSTITUTE(C2,&quot;有限公司&quot;,&quot;&quot;)</code></pre><h2>注意点</h2><ul><li>可指定只替换第几次出现。</li><li>批量清洗脏数据时非常高频。</li></ul>'
WHERE title = 'SUBSTITUTE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合拆分姓名、地区、标签、逗号分隔列表。</p><h2>语法</h2><pre><code>=TEXTSPLIT(原文本,列分隔符,[行分隔符])</code></pre><h2>示例</h2><pre><code>=TEXTSPLIT(D2,&quot;,&quot;)</code></pre><h2>注意点</h2><ul><li>返回动态数组，周边区域要留空。</li><li>旧版本 Excel 无法使用。</li></ul>'
WHERE title = 'TEXTSPLIT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于逾期判断、日报日期、按天统计。</p><h2>语法</h2><pre><code>=TODAY()</code></pre><h2>示例</h2><pre><code>=TODAY()
=TODAY()-A2</code></pre><h2>注意点</h2><ul><li>TODAY 不包含具体时间。</li><li>工作簿重算时会自动更新。</li></ul>'
WHERE title = 'TODAY';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于记录时间戳、时效比较和实时看板。</p><h2>语法</h2><pre><code>=NOW()</code></pre><h2>示例</h2><pre><code>=NOW()
=NOW()-A2</code></pre><h2>注意点</h2><ul><li>NOW 同时包含日期和时间。</li><li>只想保留日期时用 TODAY。</li></ul>'
WHERE title = 'NOW';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合把拆开的年月日字段合成为真正日期。</p><h2>语法</h2><pre><code>=DATE(年,月,日)</code></pre><h2>示例</h2><pre><code>=DATE(2026,4,15)
=DATE(A2,B2,C2)</code></pre><h2>注意点</h2><ul><li>月和日超出范围时会自动进位。</li><li>结果是数值型日期，可继续参与计算。</li></ul>'
WHERE title = 'DATE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于计算工龄、合同月数、项目周期。</p><h2>语法</h2><pre><code>=DATEDIF(开始日期,结束日期,返回单位)</code></pre><h2>示例</h2><pre><code>=DATEDIF(A2,B2,&quot;d&quot;)
=DATEDIF(A2,B2,&quot;m&quot;)
=DATEDIF(A2,B2,&quot;y&quot;)</code></pre><h2>注意点</h2><ul><li>结束日期必须大于等于开始日期。</li><li>这是兼容函数，公式提示里不一定自动补全。</li></ul>'
WHERE title = 'DATEDIF';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于账期结算、财务月末、周期边界控制。</p><h2>语法</h2><pre><code>=EOMONTH(基准日期,偏移月数)</code></pre><h2>示例</h2><pre><code>=EOMONTH(C2,0)
=EOMONTH(C2,1)</code></pre><h2>注意点</h2><ul><li>第二参数 0 表示当月月末。</li><li>1 表示下月月末，-1 表示上月月末。</li></ul>'
WHERE title = 'EOMONTH';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于推算交付日、复核日、审批截止日。</p><h2>语法</h2><pre><code>=WORKDAY(开始日期,工作日天数,[节假日区域])</code></pre><h2>示例</h2><pre><code>=WORKDAY(A2,5)
=WORKDAY(A2,10,H2:H20)</code></pre><h2>注意点</h2><ul><li>默认跳过周六周日。</li><li>企业假期要单独传 holidays 区域。</li></ul>'
WHERE title = 'WORKDAY';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于统计工期、请假天数、审批工作日时长。</p><h2>语法</h2><pre><code>=NETWORKDAYS(开始日期,结束日期,[节假日区域])</code></pre><h2>示例</h2><pre><code>=NETWORKDAYS(A2,B2)
=NETWORKDAYS(A2,B2,H2:H20)</code></pre><h2>注意点</h2><ul><li>起止日期都参与统计。</li><li>节假日区域建议单独维护。</li></ul>'
WHERE title = 'NETWORKDAYS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于金额、比例、均值结果的标准取整。</p><h2>语法</h2><pre><code>=ROUND(数值,保留位数)</code></pre><h2>示例</h2><pre><code>=ROUND(A2,2)
=ROUND(B2,-1)</code></pre><h2>注意点</h2><ul><li>位数为负数时表示按十位、百位取整。</li><li>财务场景常用到两位小数。</li></ul>'
WHERE title = 'ROUND';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合包装进位、箱数进位、最小收费单位进位。</p><h2>语法</h2><pre><code>=ROUNDUP(数值,保留位数)</code></pre><h2>示例</h2><pre><code>=ROUNDUP(B2,0)
=ROUNDUP(C2,-1)</code></pre><h2>注意点</h2><ul><li>正负数都会向远离 0 的方向取整。</li><li>计费场景很常用。</li></ul>'
WHERE title = 'ROUNDUP';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合保守估算、去尾处理、按低值结算。</p><h2>语法</h2><pre><code>=ROUNDDOWN(数值,保留位数)</code></pre><h2>示例</h2><pre><code>=ROUNDDOWN(C2,0)
=ROUNDDOWN(D2,-1)</code></pre><h2>注意点</h2><ul><li>正负数都会向接近 0 的方向取整。</li><li>不要与 INT 混用概念。</li></ul>'
WHERE title = 'ROUNDDOWN';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于按整数箱数、整批数量、整天数统计。</p><h2>语法</h2><pre><code>=INT(数值)</code></pre><h2>示例</h2><pre><code>=INT(A2)</code></pre><h2>注意点</h2><ul><li>INT 对负数会继续向更小的整数取整。</li><li>与 ROUNDDOWN 在负数上的结果不同。</li></ul>'
WHERE title = 'INT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于轮班、周期编号、奇偶判断和批次分组。</p><h2>语法</h2><pre><code>=MOD(被除数,除数)</code></pre><h2>示例</h2><pre><code>=MOD(B2,7)
=IF(MOD(C2,2)=0,&quot;偶数&quot;,&quot;奇数&quot;)</code></pre><h2>注意点</h2><ul><li>除数不能为 0。</li><li>周期类业务中非常实用。</li></ul>'
WHERE title = 'MOD';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于比较偏差、金额差额、误差值时忽略正负方向。</p><h2>语法</h2><pre><code>=ABS(数值)</code></pre><h2>示例</h2><pre><code>=ABS(C2-D2)</code></pre><h2>注意点</h2><ul><li>常与 IF、MAX、MIN 搭配做偏差分析。</li><li>结果一定为非负数。</li></ul>'
WHERE title = 'ABS';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于运费进位、包装规格进位、最小采购单位进位。</p><h2>语法</h2><pre><code>=CEILING(数值,取整步长)</code></pre><h2>示例</h2><pre><code>=CEILING(A2,5)</code></pre><h2>注意点</h2><ul><li>significance 表示取整步长。</li><li>与 ROUNDUP 不同，CEILING 按倍数而不是按位数处理。</li></ul>'
WHERE title = 'CEILING';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合按固定步长下取整，比如金额按 10 元取整。</p><h2>语法</h2><pre><code>=FLOOR(数值,取整步长)</code></pre><h2>示例</h2><pre><code>=FLOOR(B2,10)</code></pre><h2>注意点</h2><ul><li>常见于折扣、批量、箱规场景。</li><li>与 CEILING 是相对关系。</li></ul>'
WHERE title = 'FLOOR';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于按固定步长做标准化取整。</p><h2>语法</h2><pre><code>=MROUND(数值,倍数)</code></pre><h2>示例</h2><pre><code>=MROUND(C2,0.5)</code></pre><h2>注意点</h2><ul><li>适合价格档位和规格档位处理。</li><li>multiple 要与数值单位一致。</li></ul>'
WHERE title = 'MROUND';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于做自动筛选结果面板、条件列表和专题视图。</p><h2>语法</h2><pre><code>=FILTER(原区域,筛选条件,[无结果时返回值])</code></pre><h2>示例</h2><pre><code>=FILTER(A2:F100,C2:C100=&quot;华东&quot;)</code></pre><h2>注意点</h2><ul><li>返回动态溢出区域，周边必须留空。</li><li>无结果时建议写第三参数。</li></ul>'
WHERE title = 'FILTER';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于按金额、日期、数量快速重排结果区。</p><h2>语法</h2><pre><code>=SORT(原区域,[按第几列排序],[排序方向],[是否按列排])</code></pre><h2>示例</h2><pre><code>=SORT(A2:F20,4,-1)</code></pre><h2>注意点</h2><ul><li>升序为 1，降序为 -1。</li><li>常与 FILTER 联动。</li></ul>'
WHERE title = 'SORT';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于去重名单、唯一部门、唯一编码提取。</p><h2>语法</h2><pre><code>=UNIQUE(原区域,[是否按列],[是否只保留只出现一次])</code></pre><h2>示例</h2><pre><code>=UNIQUE(B2:B100)</code></pre><h2>注意点</h2><ul><li>返回动态数组。</li><li>做数据校验和下拉源时非常方便。</li></ul>'
WHERE title = 'UNIQUE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于生成月份、编号、天数和测试样例序列。</p><h2>语法</h2><pre><code>=SEQUENCE(行数,[列数],[起始值],[步长])</code></pre><h2>示例</h2><pre><code>=SEQUENCE(12)
=SEQUENCE(4,3,100,10)</code></pre><h2>注意点</h2><ul><li>会自动溢出填充。</li><li>适合配合 DATE、INDEX 做动态模板。</li></ul>'
WHERE title = 'SEQUENCE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>适合制作测试数据、随机样本和模拟场景。</p><h2>语法</h2><pre><code>=RANDARRAY([行数],[列数],[最小值],[最大值],[是否返回整数])</code></pre><h2>示例</h2><pre><code>=RANDARRAY(5,2,1,100,TRUE)</code></pre><h2>注意点</h2><ul><li>工作簿重算时结果会变化。</li><li>正式业务数据不要直接依赖随机结果。</li></ul>'
WHERE title = 'RANDARRAY';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于只取前几行重点数据或后几行最新记录。</p><h2>语法</h2><pre><code>=TAKE(原数组,[取前几行],[取前几列])</code></pre><h2>示例</h2><pre><code>=TAKE(A2:F20,5)</code></pre><h2>注意点</h2><ul><li>负数表示从末尾截取。</li><li>适合与 SORT 后结果联动。</li></ul>'
WHERE title = 'TAKE';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于跳过表头、去掉尾部汇总行等场景。</p><h2>语法</h2><pre><code>=DROP(原数组,[丢弃几行],[丢弃几列])</code></pre><h2>示例</h2><pre><code>=DROP(A2:F20,1)</code></pre><h2>注意点</h2><ul><li>负数表示从末尾开始丢弃。</li><li>常和 TAKE、FILTER 组合使用。</li></ul>'
WHERE title = 'DROP';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于把多个结果区左右合并成一张新表。</p><h2>语法</h2><pre><code>=HSTACK(数组1,[数组2],...)</code></pre><h2>示例</h2><pre><code>=HSTACK(A2:B10,D2:E10)</code></pre><h2>注意点</h2><ul><li>行数不同会自动补空白。</li><li>适合做多视图拼表。</li></ul>'
WHERE title = 'HSTACK';

UPDATE tutorial_article
SET content = '<h2>作用</h2><p>用于把多张同结构数据表上下合并。</p><h2>语法</h2><pre><code>=VSTACK(数组1,[数组2],...)</code></pre><h2>示例</h2><pre><code>=VSTACK(A2:C5,A10:C15)</code></pre><h2>注意点</h2><ul><li>列数不同会自动补空白。</li><li>适合汇总多月、多区域同结构数据。</li></ul>'
WHERE title = 'VSTACK';
