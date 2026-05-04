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

## 2026-05-05 00:20 Asia/Shanghai

- 范围：后端 `excel-forum-backend` 高并发稳定性修复与性能优化；生产默认关闭 MyBatis SQL stdout，避免高并发下 journald/stdout I/O 放大；首页 `home-overview` 练习统计改为数据库计数与 distinct 用户查询，避免全表拉取 `practice_answer`、`practice_record`；新增 V47 索引优化练习统计与题库查询；Tomcat backlog/连接/线程与 Hikari 连接池增加生产可覆盖默认值；修复 `production-deploy.sh` 中 `GIT_PULL_BEFORE_BUILD=0` 被 `deploy.env` 覆盖的问题，保证 bundle 回退发布不再误拉 GitHub。
- 验证：本地 `mvn -q -Dtest=PublicControllerTest,ProductionConfigurationTest test` 通过；本地 `mvn -q test` 通过；本地 `mvn -q -DskipTests package` 通过；本地 `npm run build` 通过（仍有既有大 chunk 警告）；Git Bash `bash -n scripts/deploy/production-deploy.sh scripts/deploy/deploy-from-git-bundle.sh` 通过；部署前 800 并发混合读压测 42,204 请求全 200、P99 约 754ms，但 3 分钟内应用 journal 产生 75,356 行、SQL `Preparing` 6,667 行；部署后 `kick-backend.service` 为 `active`，服务器仓库 `fc173a7` 且 worktree clean，`http://127.0.0.1:8080/api/public/home-overview`、`http://192.168.1.17/api/public/home-overview`、`/practice`、`/api/tutorials/home`、`/api/practice/categories` 均返回 200；8080 listen backlog 为 1000；LAN 数据库 `flyway_v47=1` 且 `idx_practice_answer_correct`、`idx_practice_record_status_submit_user`、`idx_question_enabled_type_category` 均存在；部署后同组 800 并发混合读压测 41,813 请求全 200、P99 约 797ms；压测后 3 分钟内应用 journal 54 行，SQL `Preparing=0`、`SqlSession=0`，MySQL `Connection_errors_max_connections=0`、`Slow_queries=0`。
- 部署：本地提交 `84e849a` 与 `fc173a7` 因本机 GitHub push 出现 `Recv failure: Connection was reset`，使用 `scripts/deploy/export-git-bundle.sh` 导出 `codex-online-snapshot-20260417-20260505-001500-fc173a7.bundle`，上传到 `/www/wwwroot/kick-deploy/bundles/codex-online-snapshot-20260417-20260505-001500-fc173a7.bundle`，将 LAN 部署机 `/www/wwwroot/kick-deploy/repo` 快进到 `fc173a7` 后，以 `GIT_PULL_BEFORE_BUILD=0` 复用现有 `production-deploy.sh` 发布到 `http://192.168.1.17` / `lan.excelcc.cn` LAN 环境；未更新公共生产目标 `https://www.excelcc.cn/`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260504-161708`
- 备注：首次 bundle 发布暴露两处运维问题：部署仓 `.git/FETCH_HEAD` 和部分 `node_modules` 为 root 属主导致导入失败，已限定在 `/www/wwwroot/kick-deploy/repo` 内恢复为 `server:server`；`server` 用户无非交互式 `systemctl restart kick-backend.service` 权限，普通用户发布触发脚本回滚，最终使用 sudo 执行同一发布脚本并在发布后恢复部署仓属主。前一次失败发布产生的 `/www/wwwroot/kick-deploy/backups/20260504-161621` 为回滚过程遗留，不作为本次成功备份记录。

## 2026-05-04 05:37 Asia/Shanghai

- 范围：后端 `excel-forum-backend` 补充函数运营内容与题库种子内容；新增 `SUMIF`、`DAYS` 教程并完善 `SUM`、`AVERAGE`、`COUNTIF`、`IF`、`VLOOKUP`、`LEFT` 教程正文；新增 8 道函数训练 Excel 模板题、8 个模板文件生成逻辑、配套题库分类、教程关联和闯关关卡；固化 GitHub 拉取失败时的 Git bundle 导出/导入发布脚本与部署文档；`production-deploy.sh` 后端打包改为 `mvn -q clean -DskipTests package`，避免服务器 stale migration class 进入发布 JAR。
- 验证：本地 `mvn -q clean -Dtest=SeedPracticeWorkbookInitializerTest test` 通过；本地临时库 Flyway 启动验证通过，`V44/V45/V46` 顺序正确且种子计数为 8 道题、8 个模板、8 篇教程、8 个关卡；本地 `mvn -q test` 通过；本地 `mvn -q clean -DskipTests package` 通过；Git Bash `bash -n` 通过 `scripts/deploy/export-git-bundle.sh`、`scripts/deploy/deploy-from-git-bundle.sh`、`scripts/deploy/production-deploy.sh`；LAN 部署机 `homeserver` 仓库为 `78aae1d` 且 worktree clean，`kick-backend.service` 为 `active`，服务器本机 `http://127.0.0.1:8080/api/public/home-overview` 返回 200；`https://lan.excelcc.cn/`、`https://lan.excelcc.cn/practice`、`https://lan.excelcc.cn/api/public/home-overview`、`https://lan.excelcc.cn/api/tutorials/home`、`https://lan.excelcc.cn/api/practice/categories` 均返回 200；教程首页响应包含 `SUMIF` 与 `DAYS`；LAN 数据库 `flyway_v46=1`、`seed_questions=8`、`seed_templates=8`、`tutorial_rows=8`、`practice_levels=8`。
- 部署：本地提交 `78aae1d` 已推送到 `origin/codex/online-snapshot-20260417`；LAN 部署机访问 GitHub 443 超时，使用 `scripts/deploy/export-git-bundle.sh` 导出 `content-78aae1d.bundle`，上传到 `/www/wwwroot/kick-deploy/bundles/content-78aae1d.bundle`，将 `/www/wwwroot/kick-deploy/repo` 快进到当前分支后，以 `GIT_PULL_BEFORE_BUILD=0` 复用现有 `production-deploy.sh` 完成发布到 `https://lan.excelcc.cn/`。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260503-213349`
- 备注：本次先前一次 `899f4ec` 回退发布因服务器 `target/classes` 残留旧版 V44 migration 导致发布脚本回滚，服务已自动恢复；`c08d386` 增加 clean package 后重新发布成功。LAN 仓库原本没有新导入脚本，先用等价 bootstrap 脚本完成 bundle fast-forward，导入后仓库已包含正式 `deploy-from-git-bundle.sh`；服务器前端构建仍提示既有大 chunk 警告，本次未调整依赖拆包。

## 2026-05-01 03:24 Asia/Shanghai

- 范围：前端 `reace_web` 移动端底部导航遮挡修复；应用根布局由 `h-screen` 改为 `h-dvh`，适配手机浏览器动态底部工具栏；移动端主内容底部预留从 `104px` 提升到 `176px + env(safe-area-inset-bottom)`，教程页复用同一预留规则，避免固定底部导航压住页面底部内容。
- 验证：本地先新增 `getAppShellClassName` 断言并确认 `npx vitest run src/app/lib/layout-display.test.ts` 因 helper 缺失失败；实现后 `npx vitest run src/app/lib/layout-display.test.ts` 通过 8 个测试；本地 `npx vitest run` 通过 10 个测试文件、40 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；本地构建 CSS 包含 `100dvh` 和 `176px + env(safe-area-inset-bottom)`；服务器当前提交为 `d15ada6`，`kick-backend.service` 为 `active`，服务器本机 `http://127.0.0.1:8080/api/public/home-overview` 返回 200；`https://lan.excelcc.cn/practice` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；线上 CSS `/assets/index-RleXVVql.css` 包含 `100dvh` 和 `pb-[calc(176px+env(safe-area-inset-bottom))]` 对应规则。
- 部署：本地提交 `d15ada6` 已推送到 `origin/codex/online-snapshot-20260417`；内网部署机直接从 GitHub 拉取时出现 `curl 28 Failed to connect to github.com port 443`，改用 Git bundle 将当前分支导入服务器部署仓并通过 `GIT_PULL_BEFORE_BUILD=0` 执行 `scripts/deploy/production-deploy.sh`，发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-192209`
- 备注：本地和服务器前端构建仍提示既有大 chunk 警告；服务器到 GitHub 443 连接仍不稳定，本次未调整依赖树和部署拓扑。

## 2026-04-30 23:55 Asia/Shanghai

- 范围：前端 `reace_web` 通知中心分类展示调整；移除通知列表上方的大分类快捷卡片；从通知筛选中删除“帖子互动”分类；旧链接 `?tab=posts` 自动按“全部通知”展示；移动端改为直接展示通知列表，不再通过分类卡片弹出列表。
- 验证：本地新增 `src/app/lib/notification-display.test.ts`，先验证缺失 helper 失败，再实现后通过；本地 `npx vitest run src/app/lib/notification-display.test.ts` 通过 3 个测试；本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/notification-display.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 38 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；构建产物与通知页源码均不再包含“帖子互动”和“点击查看该分类通知”；服务器发布提交 `d91853b` 后 `kick-backend.service` 为 `active`，本机 `http://127.0.0.1:8080/api/public/home-overview` 返回 200；`https://lan.excelcc.cn/notifications?tab=posts` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；Selenium 以 1250x870 视口验证线上通知页不含“帖子互动”和“点击查看该分类通知”，无横向溢出。
- 部署：本地提交 `d91853b` 已推送到 `origin/codex/online-snapshot-20260417`；服务器直接从 GitHub 拉取时出现 `GnuTLS recv error (-110)`，改用 Git bundle 将当前分支导入服务器仓库并通过 `GIT_PULL_BEFORE_BUILD=0` 执行 `scripts/deploy/production-deploy.sh`，发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-155313`
- 备注：本地和服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树；因部署命令输出含 Windows 控制台不可编码字符，部署结果通过服务器 HEAD、服务状态、健康接口、最新备份和线上页面复验确认。

## 2026-04-30 20:23 Asia/Shanghai

- 范围：前端 `reace_web` Lite 头部中间断点导航修复；在大于移动端、小于桌面端的宽度下隐藏移动抽屉入口，改为显示顶部公共导航；收紧头部间距、使用短导航文案，并将分类搜索延后到 `xl` 断点显示，避免导航模块被挤没。
- 验证：本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 35 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从当前分支提交 `6f3362a` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；服务器 `kick-backend.service` 为 `active`，本机 `http://127.0.0.1:8080/api/public/home-overview` 返回 200；Selenium 以 834x866 和 960x866 视口验证顶部入口“首页 / 教程 / 练习 / 模板 / 更多”可见、移动抽屉入口隐藏且无横向溢出，以 319x866 移动视口验证移动菜单和通知入口仍可见且无横向溢出。
- 部署：本地提交 `6f3362a` 已推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-121800`
- 备注：本地和服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树；内置浏览器插件可读取当前标签页信息，但本次对 `lan.excelcc.cn` 的 DOM 访问仍被插件 allowed 校验阻止，故使用 Selenium 做页面复验。

## 2026-04-30 19:59 Asia/Shanghai

- 范围：前端 `reace_web` 首页头部调整；删除桌面端顶部浅绿色提示条“Excel 学习路径升级完成 / 模板中心与练习闯关全新改版 / 立即体验”；将首页头部、移动抽屉和首页主标题中的“Excel社区”同步改为“Excel学习平台”。
- 验证：本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 33 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；服务器从当前分支提交 `5b7cdf4` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；Selenium 以 960x866 桌面视口和 319x866 移动视口验证公告条已移除、头部品牌显示为“Excel学习平台”、首页主标题不再包含旧名称且无横向溢出。
- 部署：本地提交 `5b7cdf4` 已推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-115612`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树；内置浏览器插件可读取当前标签页信息，但本次对 `lan.excelcc.cn` 的 DOM 访问仍被插件 allowed 校验阻止，故使用 Selenium 做页面复验。

## 2026-04-30 19:38 Asia/Shanghai

- 范围：前端 `reace_web` 登录页布局调整；移除桌面端左侧宣传海报区域，将登录/注册表单改为单列居中展示；登录页品牌文案由“Excel社区”改为“Excel练习网”，并同步登录提示文案。
- 验证：本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 33 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；服务器从当前分支提交 `c52bd51` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/auth` 返回 200；`http://127.0.0.1:8080/api/public/home-overview` 返回 200；Selenium 以 1246x866 桌面视口验证登录页已显示“Excel练习网”，且不再包含旧海报文案与“Excel社区”正文。
- 部署：本地提交 `c52bd51` 已推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-113647`
- 备注：服务器前端构建仍提示既有大 chunk 警告；本地部署命令输出采集时遇到 Windows 控制台 Unicode 打印问题，已通过服务器 HEAD、服务状态、健康接口、最新备份和线上页面复验确认部署结果。

## 2026-04-30 19:17 Asia/Shanghai

- 范围：前端 `reace_web` 移动端 Lite 头部通知入口修复；在移动端头部固定显示通知按钮，未登录时点击进入登录页，已登录时打开通知浮层；同步压缩极窄屏头部间距并隐藏品牌副标题，确保 319px 宽度下菜单、品牌、通知、账户入口同时可见。
- 验证：本地 `npx vitest run src/app/lib/layout-display.test.ts` 通过 4 个测试；本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 33 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；服务器从当前分支提交 `fc775eb` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；Selenium 以 319x866 移动视口验证头部菜单、品牌、通知、账户入口均可见且无横向溢出。
- 部署：本地提交 `fc775eb` 已推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-111439`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm ci` 仍报告既有依赖审计风险，本次未调整依赖树；内置浏览器插件可读取当前标签页信息，但本次对 `lan.excelcc.cn` 的 DOM/截图访问被插件 allowed 校验阻止，故使用 Selenium 做移动视口复验。

## 2026-04-30 19:04 Asia/Shanghai

- 范围：前端 `reace_web` 教程中心移动端布局修复；移动端打开教程阅读状态时隐藏教程目录与页面头部搜索区，阅读器作为单独内容页展示；切换文章时将主内容滚动容器重置到顶部，避免从目录底部进入详情后停留在中下部。
- 验证：本地 `npx vitest run src/app/lib/tutorial-display.test.ts` 通过 5 个测试；本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 31 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误，仅有既有 Windows 行尾提示；服务器从当前分支提交 `1e2949f` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/tutorials` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；服务器本机 `http://127.0.0.1:8080/api/public/home-overview` 返回 200。
- 部署：本地提交 `1e2949f` 已推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-110309`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm ci` 仍报告既有依赖审计风险，本次未调整依赖树。

## 2026-04-30 18:50 Asia/Shanghai

- 范围：前端 `reace_web` 性能调优；修复 Vite preload helper 被打入 Univer 编辑器大包导致首页提前预加载 `univer-sheets-core` 的问题；将默认 React Query 缓存新鲜期从 15 秒调整为 60 秒，并关闭普通页面数据的默认窗口聚焦重拉，减少切回页面时的批量请求抖动。
- 验证：本地 `npx vitest run src/app/lib/query-client.test.ts src/app/lib/vite-performance.test.ts src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 29 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；本地构建后的 `dist/index.html` 不再包含 `univer` 相关预加载，只保留 `react-vendor`、`motion-vendor`、`ui-vendor` 和 `vite-helper`；服务器从提交 `bc6cd05` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/` 返回 200；`https://lan.excelcc.cn/practice` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；已确认发布后的首页 HTML 不再包含 `univer` 相关预加载。
- 部署：本地提交 `bc6cd05` 已推送到 `origin/codex/online-snapshot-20260417`；服务器访问 GitHub 443 仍超时，改用 Git bundle 将当前提交导入服务器同名分支，随后通过临时部署环境设置 `GIT_PULL_BEFORE_BUILD=0` 执行 `scripts/deploy/production-deploy.sh`，服务器从当前分支提交发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260430-104908`
- 备注：Univer 编辑器大包仍按需存在，用于 Excel 模板编辑场景，但不再参与首页首屏预加载；服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。

## 2026-04-29 22:19 Asia/Shanghai

- 范围：前端 `reace_web` 个人中心移动端布局优化；移除页面内独立账号管理功能卡片；移除头像资料标题下描述；头像与昵称改为横向排列，等级显示在昵称下方；资料详情与成长进度改为两个独立入口，分别在“查看个人资料”和“成长进度”弹窗内查看。
- 验证：本地 `npx vitest run src/app/lib/profile-display.test.ts` 通过 3 个测试；本地 `npx vitest run src/app/lib/profile-display.test.ts src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 27 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从当前分支提交 `77de97b` 重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/profile` 返回 200；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；已确认发布的 `ProfileCenter-DFRb7ilu.js` 包含“查看个人资料”“成长进度”入口且不再包含“账号管理入口”卡片文本。
- 部署：本地提交 `77de97b`；因本机与服务器访问 GitHub 443 均超时或连接重置，未能推送 `origin/codex/online-snapshot-20260417`，改用 Git bundle 将提交导入服务器同名分支，随后通过临时部署环境设置 `GIT_PULL_BEFORE_BUILD=0` 执行 `scripts/deploy/production-deploy.sh`，服务器从当前分支提交发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-141758`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。待 GitHub 连接恢复后需补推 `8f03aed` 与 `77de97b` 后续提交，保持远端分支与本地、服务器分支一致。

## 2026-04-29 21:35 Asia/Shanghai

- 范围：前端 `reace_web` 移动端 Lite 导航与教程页优化；底部导航收敛为“首页 / 教程 / 练习 / 我的”；移动端侧边栏仅保留“积分经验中心 / 实用功能 / 模板中心”；教程页手机端默认只展示折叠目录，展开分类后选择教程，并以独立覆盖式阅读页查看正文；移动端内容区与阅读页补充底部安全距离，避免被底栏遮挡。
- 验证：本地 `npx vitest run src/app/lib/site-navigation.test.ts src/app/lib/tutorial-display.test.ts` 通过 11 个测试；本地 `npx vitest run src/app/lib/layout-display.test.ts src/app/lib/tutorial-display.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 24 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从 `codex/online-snapshot-20260417` fast-forward 到提交 `e00d8c1` 后重新构建前后端并通过部署脚本健康检查；`https://lan.excelcc.cn/api/public/home-overview` 返回 200；`https://lan.excelcc.cn/practice` 返回 200；`https://lan.excelcc.cn/tutorials` 返回 200；Selenium 以 446x854 手机视口验证底部导航为 4 项、侧边栏仅包含 3 个辅助入口、教程列表默认不展开、展开后点击 `SUM` 可打开“教程阅读”覆盖页。
- 部署：本地提交 `e00d8c1` 推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按 `GIT_PULL_BEFORE_BUILD=1` 从当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-132848`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。

## 2026-04-29 21:08 Asia/Shanghai

- 范围：前端 `reace_web` 移动端 Lite 头部账户入口修复；未登录手机宽度显示可点击的圆形登录头像入口；已登录手机头像按钮增加不可收缩布局，避免在小米浏览器等窄视口下被品牌区挤出。
- 验证：本地 `npx vitest run src/app/lib/layout-display.test.ts src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 19 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从 `codex/online-snapshot-20260417` fast-forward 到提交 `c3b5446` 后重新构建前后端并通过部署脚本健康检查；`http://192.168.1.17/api/public/home-overview` 返回 200；`https://lan.excelcc.cn/practice` 返回 200；Selenium 以 475x1024 手机视口验证顶部菜单按钮与右上账户头像入口均可见。
- 部署：本地提交 `c3b5446` 推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按 `GIT_PULL_BEFORE_BUILD=1` 从当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-130705`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。

## 2026-04-29 20:41 Asia/Shanghai

- 范围：前端 `reace_web` 首页顶部导航修复；在 `lg` 以下宽度显示紧凑菜单入口，避免 768-1023px 区间导航模块消失；紧凑菜单补齐全部公开模块。
- 验证：本地 `npx vitest run src/app/lib/excel-formula-detection.test.ts src/app/admin/display.test.ts src/app/lib/site-navigation.test.ts src/app/lib/practice-campaign-ui.test.ts` 通过 17 个测试；本地 `npm run build` 通过；本地 `git diff --check` 无空白错误；服务器从 `codex/online-snapshot-20260417` fast-forward 到提交 `bec72f9` 后重新构建前后端并通过部署脚本健康检查；`http://192.168.1.17/api/public/home-overview` 返回 200；`http://192.168.1.17/` 返回 200；`https://lan.excelcc.cn/` 返回 200；Selenium 以 878x854 视口验证顶部菜单按钮可见，菜单内包含全部 6 个公开模块。
- 部署：本地提交 `bec72f9` 推送到 `origin/codex/online-snapshot-20260417`，随后在 `/www/wwwroot/kick-deploy/repo` 执行 `bash scripts/deploy/production-deploy.sh`，服务器按 `GIT_PULL_BEFORE_BUILD=1` 从当前分支拉取并发布到 `lan.excelcc.cn` / LAN 环境。
- 服务器备份：`/www/wwwroot/kick-deploy/backups/20260429-123653`
- 备注：服务器前端构建仍提示既有大 chunk 警告；服务器 `npm install` 仍报告既有依赖审计风险，本次未调整依赖树。

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
