INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '函数基础', '常用基础函数、统计与条件判断的入门说明。', 10, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '函数基础'
);

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '查找与引用', '用于定位数据、匹配结果和跨表引用的常见函数。', 20, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '查找与引用'
);

INSERT INTO tutorial_category (name, description, sort_order, enabled)
SELECT '文本处理', '整理字符串、拆分文本和规范格式时常用的函数。', 30, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tutorial_category WHERE name = '文本处理'
);

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'SUM 与 AVERAGE',
       '先掌握最常用的求和与平均值函数。',
       '<h2>适用场景</h2><p>对连续区域快速求和、求平均时优先使用。</p><h3>示例</h3><pre><code>=SUM(B2:B10)\n=AVERAGE(C2:C10)</code></pre><ul><li>区域中包含空白单元格时可直接跳过。</li><li>平均值统计前建议先确认异常值。</li></ul>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '函数基础'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'SUM 与 AVERAGE'
  );

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'IF 条件判断',
       '根据条件返回不同结果，是大多数逻辑公式的入口。',
       '<h2>公式结构</h2><pre><code>=IF(条件, 结果1, 结果2)</code></pre><p>适合分档、及格判断、状态标记等业务场景。</p><h3>示例</h3><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)</code></pre>',
       20,
       1
FROM tutorial_category c
WHERE c.name = '函数基础'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'IF 条件判断'
  );

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'VLOOKUP 与 XLOOKUP',
       '查找类函数里最常见的两个入口，适合做编码匹配与结果回填。',
       '<h2>使用建议</h2><p>新表优先考虑 <code>XLOOKUP</code>，兼容旧模板时再使用 <code>VLOOKUP</code>。</p><table><thead><tr><th>函数</th><th>特点</th></tr></thead><tbody><tr><td>VLOOKUP</td><td>兼容旧版，按列序号返回</td></tr><tr><td>XLOOKUP</td><td>支持左右查找，参数更直观</td></tr></tbody></table><pre><code>=VLOOKUP(A2,$F$2:$H$20,3,FALSE)\n=XLOOKUP(A2,F2:F20,H2:H20,&quot;未找到&quot;)</code></pre>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '查找与引用'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'VLOOKUP 与 XLOOKUP'
  );

INSERT INTO tutorial_article (category_id, title, summary, content, sort_order, enabled)
SELECT c.id,
       'LEFT / RIGHT / MID',
       '处理编号、姓名、固定格式文本时常用的文本截取函数。',
       '<h2>常见写法</h2><pre><code>=LEFT(A2,3)\n=RIGHT(A2,4)\n=MID(A2,2,5)</code></pre><p>先确认截取位数，再统一处理源文本格式。</p>',
       10,
       1
FROM tutorial_category c
WHERE c.name = '文本处理'
  AND NOT EXISTS (
      SELECT 1 FROM tutorial_article WHERE title = 'LEFT / RIGHT / MID'
  );
