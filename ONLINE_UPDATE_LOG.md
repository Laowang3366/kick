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

## 2026-04-29 16:02 Asia/Shanghai

- 范围：前端 `reace_web` 后台题库管理更新；新增 Excel 模板公式区域自动识别，上传模板后自动填写普通答题区域，并同步动态数组锚点与溢出区域，识别结果仍可手动修正。
- 验证：本地 `npx vitest run src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 16 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从 `codex/online-snapshot-20260417` fast-forward 到提交 `7f19a16` 后重新构建前后端并通过部署脚本健康检查；`http://192.168.1.17/api/public/home-overview` 返回 200；`http://192.168.1.17/admin/questions` 返回 200。
- 部署：本地提交 `7f19a16` 推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按 `GIT_PULL_BEFORE_BUILD=1` 从当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-080118`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。

## 2026-04-29 14:43 Asia/Shanghai

- 范围：前端 `reace_web` 后台管理界面修复；窄屏后台新增可打开的侧栏抽屉，侧栏内容保持可滚动；后台顶部头像与用户管理列表头像统一使用同一套头像解析和兜底规则。
- 验证：本地 `npx vitest run src/app/admin/display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 12 个测试；本地 `npm run build` 通过；服务器最终按当前分支 fast-forward 到提交 `fde0488` 后重新构建前后端并通过健康检查；`http://192.168.1.17/api/public/home-overview` 返回 200；`http://192.168.1.17/admin/users` 返回 200；已确认发布的 `AdminConsole-D5Uik13A.js` 包含移动端后台导航和统一头像解析逻辑。
- 部署：本地提交 `fde0488`；因本机连接 GitHub 443 超时，未能推送 `origin/codex/online-snapshot-20260417`，改用 Git bundle 将提交导入服务器同名分支，随后通过临时部署环境强制 `GIT_PULL_BEFORE_BUILD=1` 执行 `scripts/deploy/production-deploy.sh`，服务器从 `codex/online-snapshot-20260417` 分支 fast-forward 拉取后发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-071107`
- 备注：首次以普通用户执行部署时受部署仓 `node_modules` 权限影响，未进入运行目录替换阶段；随后以具备权限的方式重新执行成功。按要求已将服务器发布流程调整回“当前分支拉取更新”；待 GitHub 连接恢复后需补推 `codex/online-snapshot-20260417`，保持远端分支与本地、服务器分支一致。

## 2026-04-29 14:02 Asia/Shanghai

- 范围：内网服务器 `192.168.1.17` 经 Cloudflare Tunnel 暴露的 `lan.excelcc.cn` 环境初始化管理员账户；临时启用后端 `ADMIN_BOOTSTRAP_*` 引导变量创建管理员，随后移除明文引导密码并恢复 `ADMIN_BOOTSTRAP_ENABLED=false`；补充 `ALLOWED_ORIGINS` 中的 `https://lan.excelcc.cn` 和 `http://lan.excelcc.cn`。
- 验证：服务器数据库查询确认存在 1 个启用状态的 `admin` 角色账户；本机 `http://127.0.0.1:8080/api/auth/login` 登录返回 token；经 Cloudflare Tunnel 的 `https://lan.excelcc.cn/api/auth/login` 登录返回 `role=admin`；`http://192.168.1.17/api/public/home-overview` 返回 200；`kick-backend.service`、`nginx`、`cloudflared.service`、`redis-server` 均为 active。
- 部署：未重新构建应用代码；更新 `/www/wwwroot/kick-backend/.env.production` 并两次重启 `kick-backend.service`，第二次重启后环境文件不再包含 `ADMIN_BOOTSTRAP_PASSWORD`。
- 服务器备份：`/www/wwwroot/kick-backend/.env.production.bak-20260429-060011`；`/www/wwwroot/kick-backend/.env.production.bak-20260429-060129`
- 备注：管理员账号用于 `lan.excelcc.cn` 新数据库环境，创建后应首次登录立即修改初始密码。

## 2026-04-29 10:13 Asia/Shanghai

- 范围：线上服务器 `198.44.178.219` Nginx 站点加载修复；将实际加载的 `/etc/nginx/sites-available/default` 指向 `/www/wwwroot/kick-web`，并恢复 `/api`、`/uploads`、`/ws` 到 `127.0.0.1:8080` 的反向代理；启用 `www.excelcc.cn` 的 443 监听配置。
- 验证：公网 `http://198.44.178.219/` 返回 200 且标题为 `Excel社区`；公网 `http://198.44.178.219/api/public/home-overview` 返回 200；服务器本机 `curl http://127.0.0.1/api/public/home-overview` 返回 200；`nginx -t` 通过；`nginx`、`kick-backend.service`、`mysql`、`redis-server` 均为 active。
- 部署：未重新构建应用代码；仅更新服务器 Nginx 实际加载配置并执行 `systemctl reload nginx`。
- 服务器备份：`/etc/nginx/sites-available/default.bak-20260429-101215`
- 备注：故障原因是系统 Nginx 只加载 Ubuntu 默认站点 `/var/www/html`，未加载项目站点配置，导致 IP 访问显示默认 Nginx 页且 `/api` 返回 404；后端与数据库本身正常。直接用 IP 访问请使用 `http://198.44.178.219/`，`https://198.44.178.219/` 会存在证书域名不匹配问题。

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
