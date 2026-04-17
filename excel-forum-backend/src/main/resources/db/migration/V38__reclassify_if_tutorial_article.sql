UPDATE tutorial_article
SET category_id = (
        SELECT id
        FROM tutorial_category
        WHERE name = '逻辑判断'
        LIMIT 1
    ),
    summary = '根据条件返回不同结果，是一切判断型公式的入口。',
    content = '<h2>标准结构</h2><pre><code>=IF(条件, 满足时结果, 不满足时结果)</code></pre><h2>常见场景</h2><ul><li>成绩是否及格</li><li>订单是否超期</li><li>库存是否低于安全值</li></ul><h2>实战示例</h2><pre><code>=IF(D2&gt;=60,&quot;及格&quot;,&quot;不及格&quot;)
=IF(TODAY()&gt;E2,&quot;已逾期&quot;,&quot;正常&quot;)</code></pre><h2>使用建议</h2><p>分支超过 3 层时，优先改用 IFS、LOOKUP 或建立映射表，避免嵌套 IF 失控。</p>',
    sort_order = 10,
    enabled = 1
WHERE title = 'IF 条件判断'
  AND EXISTS (
      SELECT 1
      FROM tutorial_category
      WHERE name = '逻辑判断'
  );
