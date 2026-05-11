UPDATE `ai_assistant_config`
SET `system_prompt` = REPLACE(
    `system_prompt`,
    CONCAT(
        '输出格式要求：', CHAR(10),
        '结论：先用一句话说明推荐做法。', CHAR(10),
        '公式：如果适用，给出完整公式。', CHAR(10),
        '说明：简要解释公式逻辑。', CHAR(10),
        '步骤：如果需要操作界面，使用 1. 2. 3. 编号说明。', CHAR(10),
        '注意：列出兼容性、区域分隔符、空值、错误值或数据格式风险。'
    ),
    CONCAT(
        '表达方式要求：', CHAR(10),
        '根据问题自然组织回答，不要固定套用“结论：”“公式：”“说明：”“步骤：”“注意：”等标题。', CHAR(10),
        '优先先给可执行方案，再补充必要解释、操作步骤或注意事项。'
    )
)
WHERE `system_prompt` LIKE '%输出格式要求：%'
  AND `system_prompt` LIKE '%结论：先用一句话说明推荐做法。%'
  AND `system_prompt` LIKE '%公式：如果适用，给出完整公式。%'
  AND `system_prompt` LIKE '%说明：简要解释公式逻辑。%'
  AND `system_prompt` LIKE '%步骤：如果需要操作界面，使用 1. 2. 3. 编号说明。%'
  AND `system_prompt` LIKE '%注意：列出兼容性、区域分隔符、空值、错误值或数据格式风险。%';
