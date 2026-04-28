# 线上更新记录

每次更新 `https://www.excelcc.cn/` 线上版本前，先读取本文档；部署完成后，在顶部追加一条记录。

## 记录格式

```md
## YYYY-MM-DD HH:mm Asia/Shanghai
- 范围：
- 验证：
- 部署：
- 服务器备份：
- 备注：
```

## 2026-04-28 17:32 Asia/Shanghai

- 范围：前端 `reace_web` 更新，练习页章节行新增题目列表下拉入口；模板中心移除顶部大卡片。
- 验证：`npx vitest run src/app/lib/practice-campaign-ui.test.ts src/app/lib/site-navigation.test.ts` 通过 7 个测试；`npm run build` 通过。
- 部署：本地构建 `reace_web/dist` 后上传并替换服务器 `/www/wwwroot/kick-web`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-173216-frontend`
- 备注：线上验证 `/practice` 展开后可看到题目和 `开始答题`；`/templates` 顶部大卡片已移除。
