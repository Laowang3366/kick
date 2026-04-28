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

## 2026-04-28 22:56 Asia/Shanghai

- 范围：前端 `reace_web` 后台首页教程正文编辑器更新，“内容”模式改为可视化编辑区，直接显示标题、段落、代码块等渲染效果，不再显示 `<h2>`、`<p>`、`<pre>` 等源码标签。
- 验证：`git diff --check -- reace_web/src/app/pages/AdminHomeContent.tsx` 通过；`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；Selenium 本地和线上验证教程编辑弹窗中显示“作用 / 语法 / =SUM”等渲染内容，且页面文本不包含原始 `<h2>`、`</p>`、`<pre>` 标签。
- 部署：本地提交 `4e4d6d3`；GitHub 443 连接超时未能推送远端，改用 Git bundle 传到服务器部署仓并快进 `codex/online-snapshot-20260417`，随后执行 `GIT_PULL_BEFORE_BUILD=0 bash scripts/deploy/production-deploy.sh`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-225109`
- 备注：服务器部署仓当前提交 `4e4d6d3`；站点首页返回 200；服务器本机健康端点 `http://127.0.0.1:8080/api/public/home-overview` 返回 200。待 GitHub 连接恢复后需推送本地分支，保持远端分支与服务器部署仓一致。

## 2026-04-28 22:26 Asia/Shanghai

- 范围：前端 `reace_web` 后台更新，移除后台侧边栏“积分经验中心”模块并让 `/admin/mall` 回到后台总览；优化模板中心上传按钮；首页教程条目正文编辑器改为默认渲染预览，增加内容、预览、对照模式和格式工具栏。
- 验证：`git diff --check -- reace_web/src/app/admin/config.ts reace_web/src/app/routes.tsx reace_web/src/app/pages/AdminTemplateCenter.tsx reace_web/src/app/pages/AdminHomeContent.tsx` 通过；`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；Selenium 本地和线上验证后台侧边栏不再出现“积分经验中心”、模板弹窗显示“上传预览图 / 上传模板文件”、教程编辑器默认展示渲染内容且不显示原始 `<h2>` 标签、`/admin/mall` 跳转 `/admin/overview`。
- 部署：提交 `ab95e08` 推送到 `codex/online-snapshot-20260417` 后，服务器从 `/www/wwwroot/kick-deploy/repo` 拉取该分支并执行 `bash scripts/deploy/production-deploy.sh`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-222117`
- 备注：服务器部署仓当前提交 `ab95e08`；站点首页返回 200；服务器本机健康端点 `http://127.0.0.1:8080/api/public/home-overview` 返回 200。

## 2026-04-28 21:52 Asia/Shanghai

- 范围：前端 `reace_web` 更新，积分中心功能卡片统一为深绿/浅绿体系；工具页移除“最近转换记录”卡片；模板中心空状态改为浅绿卡片样式。
- 验证：`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；`git diff --check -- reace_web/src/app/pages/Mall.tsx reace_web/src/app/pages/Tools.tsx reace_web/src/app/pages/TemplateCenter.tsx` 通过；Selenium 验证线上 `/mall`、`/tools`、`/templates`，其中 `/tools` 不再出现“最近转换记录”，模板空状态保留且颜色已调整。
- 部署：提交 `de2bff8` 推送到 `codex/online-snapshot-20260417` 后，服务器从 `/www/wwwroot/kick-deploy/repo` 拉取该分支并执行 `bash scripts/deploy/production-deploy.sh`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-214848`
- 备注：服务器部署仓当前分支 `codex/online-snapshot-20260417`，提交 `de2bff8`；后端健康接口和站点 `/templates` 均返回 200。

## 2026-04-28 19:26 Asia/Shanghai

- 范围：前端 `reace_web` 更新，积分经验中心简化为“积分余额、积分模型、使用记录”三块，移除兑换商城、任务中心、我的道具、个人中心等入口和大卡片样式。
- 验证：`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；`git diff --check -- reace_web/src/app/pages/Mall.tsx` 通过；Selenium 验证线上 `/mall` 包含“积分余额 / 积分模型 / 使用记录”，且不再出现“权益兑换 / 任务中心 / 我的道具 / 可兑换内容”。
- 部署：本地代码提交 `2d79f7a`；本机连接 GitHub 443 超时，未能推送远端，改用 Git bundle 将该提交传到服务器部署仓并快进 `codex/online-snapshot-20260417`，随后在服务器执行 `GIT_PULL_BEFORE_BUILD=0 bash scripts/deploy/production-deploy.sh` 构建发布。部署后，日志提交同步到服务器部署仓。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-192354`
- 备注：线上构建来源提交为 `2d79f7a`；服务器部署仓最新提交为本条日志提交；后端健康接口和站点 `/mall` 均返回 200。后续需在 GitHub 连接恢复后推送本地分支，保持远端分支与服务器部署仓一致。

## 2026-04-28 19:03 Asia/Shanghai

- 范围：前端 `reace_web` 更新，头像悬浮菜单去除个人信息卡片，只保留功能列表。
- 验证：`git diff --check -- reace_web/src/app/components/Layout.tsx` 通过；`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；Selenium 验证线上 `/templates` 头像菜单包含功能项且不再出现“学习工作台”卡片。
- 部署：提交 `6f834a4` 推送到 `codex/online-snapshot-20260417` 后，服务器从 `/www/wwwroot/kick-deploy/repo` 拉取该分支并执行 `bash scripts/deploy/production-deploy.sh`。推送前因 GitHub 连接短暂失败曾执行一次本地 `dist` 上传兜底，最终已被标准部署覆盖。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-190301`
- 备注：服务器部署仓当前分支 `codex/online-snapshot-20260417`，提交 `6f834a4`；后端健康检查通过。

## 2026-04-28 18:32 Asia/Shanghai

- 范围：前端 `reace_web` 更新，顶部导航调整为“首页、教程中心、小试牛刀、模板中心、更多、分类搜索”；新增“更多”悬浮菜单，收纳积分经验中心、实用功能、每日签到。
- 验证：`npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 8 个测试；`npm run build` 通过；Selenium 验证线上 `/templates` 导航顺序和“更多”悬浮列表。
- 部署：提交 `20fdc3e` 推送到 `codex/online-snapshot-20260417` 后，服务器从 `/www/wwwroot/kick-deploy/repo` 拉取该分支并执行 `bash scripts/deploy/production-deploy.sh`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-183226`
- 备注：服务器部署仓当前分支 `codex/online-snapshot-20260417`，提交 `20fdc3e`；后端健康接口和站点访问均返回 200。

## 2026-04-28 17:32 Asia/Shanghai

- 范围：前端 `reace_web` 更新，练习页章节行新增题目列表下拉入口；模板中心移除顶部大卡片。
- 验证：`npx vitest run src/app/lib/practice-campaign-ui.test.ts src/app/lib/site-navigation.test.ts` 通过 7 个测试；`npm run build` 通过。
- 部署：本地构建 `reace_web/dist` 后上传并替换服务器 `/www/wwwroot/kick-web`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260428-173216-frontend`
- 备注：线上验证 `/practice` 展开后可看到题目和 `开始答题`；`/templates` 顶部大卡片已移除。
