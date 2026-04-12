# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

Excel 社区论坛，包含前后端两个子项目：
- **excel-forum-backend**：Spring Boot 3.2.5 后端服务（Java 17）
- **reace_web**：React 18 + Vite 前端

## 构建与运行命令

### 后端（在 `excel-forum-backend/` 目录下）
```bash
mvn clean package                       # 构建 JAR
mvn spring-boot:run                     # 开发模式运行
mvn test                                # 运行全部测试
mvn test -Dtest=AuthControllerTest      # 运行单个测试类
java -jar target/forum-1.0.0.jar        # 运行打包产物
```

### 前端（在 `reace_web/` 目录下）
```bash
npm run build    # 构建生产版本到 dist/
```
前端无 dev 脚本、无测试框架、无 linter。开发时通过 `vite build` 构建后由后端或静态服务器托管。API 基地址通过 `VITE_API_BASE_URL` 环境变量配置，默认 `http://localhost:8080`。

## 环境依赖

- Java 17, Maven 3.6+
- MySQL 8.0+（数据库名 `excel_forum`）
- Redis（用于 JWT 黑名单和缓存）
- Node.js（前端构建）

## 后端架构

标准 Spring Boot 分层架构，包路径 `com.excel.forum`：

- **controller/**：REST 控制器，核心入口有 AuthController、PostController、ReplyController、AdminController、PracticeController、MallController、ChatMessageController（WebSocket）
- **service/impl/**：业务逻辑层，使用接口+实现类模式
- **mapper/**：MyBatis-Plus Mapper 接口（`map-underscore-to-camel-case: true`）
- **entity/**：实体类 + `dto/` 子目录放请求/响应 DTO
- **config/**：SecurityConfig、WebMvcConfig、WebSocketConfig、MyBatisPlusConfig、ScheduledTasks（6 个定时任务）
- **security/**：JWT 认证过滤器（`JwtAuthenticationFilter`），token 通过 `Authorization: Bearer` 传递
- **util/**：`JwtUtil`、`HtmlSanitizer`（Jsoup）、`PasswordPolicy`、`DtoConverter`

### 认证与授权

无状态 JWT 认证（SessionCreationPolicy.STATELESS，CSRF 已禁用）：
- JwtAuthenticationFilter 从 Authorization header 提取 Bearer token，验证签名和 Redis 黑名单
- 认证成功后设置 `request.setAttribute("userId", userId)` 和 `ROLE_<角色大写>` 权限
- 登出时 token 加入 Redis 黑名单（`jwt:blacklist:<token>`，TTL = 剩余有效期）
- 生产环境必须设置 `JWT_SECRET` 环境变量，dev profile 有硬编码后备密钥

公开端点包括 `/api/auth/**`、GET `/api/posts/**`、`/api/categories/**`、`/api/public/**`。管理端点按角色分为 Moderator+Admin 和 Admin-only 两级。

CORS 通过 `ALLOWED_ORIGINS` 环境变量配置（默认 `http://localhost:5173`）。

### 数据库迁移

使用 Flyway，迁移脚本在 `src/main/resources/db/migration/`（V1~V20，含一个 Java 迁移 V2）。结构变更必须通过新增迁移脚本完成。`DatabaseInitializer` 已关闭（`app.db.legacy-initializer.enabled=false`），仅在紧急排障时启用。

`DataInitializer`（CommandLineRunner）在首次启动时自动创建默认管理员（`admin` / `admin123`）和 10 个版块分类。

MyBatis-Plus 自动填充 `createTime`/`updateTime` 字段。ID 策略为 `auto`（数据库自增）。

### 测试模式

13 个纯单元测试文件，使用 JUnit 5 + Mockito + MockMvc standalone setup：
- 所有依赖通过 `@Mock` 注入，不加载 Spring 上下文
- MockMvc 通过 `standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build()` 构建
- 认证用户通过 `requestAttr("userId", userId)` 模拟，绕过 JWT 过滤器
- 断言消息使用中文拼音（如 `"yong hu ming bu neng wei kong"`）

### 定时任务（ScheduledTasks）

每 5 分钟清理不活跃用户；每 1 小时清理过期草稿；每日凌晨 3:00-5:00 依次清理浏览记录、旧通知、重算帖子统计、清理分享/日志/编辑历史。

## 前端架构

React SPA，入口 `src/main.tsx` → `App.tsx` → 路由配置在 `routes.tsx`。

Provider 层级（由外到内）：QueryClientProvider → SessionProvider → [Toaster, GlobalFeedbackDialog, GlobalConfirmPromptDialog, RouterProvider]。两个全局弹窗组件是 SessionProvider 的同级子节点，在 RouterProvider 之前。

- **路由**：使用 `react-router` v7 的 `createBrowserRouter`，所有页面懒加载（`lazyPage` 工具函数）
- **API 调用**：统一通过 `src/app/lib/api.ts` 的 `api` 对象（get/post/put/delete），默认自动附加 JWT token，401 时清除会话并 toast 提示。`ApiError` 类含 `status` 和 `data` 属性；`silent: true` 跳过 toast 但仍抛异常；`/api/admin/` 路径自动静默
- **数据查询**：TanStack React Query v5，query key 工厂在 `src/app/lib/query-keys.ts`
- **会话管理**：`session-store.ts`（主存储 sessionStorage + localStorage 迁移逻辑 + 跨标签页 storage event 同步）+ `session.tsx`（SessionProvider + useSession hook）
- **全局弹窗**：两套事件驱动弹窗系统，均为 CustomEvent + Promise 模式
  - `GlobalFeedbackDialog`：`emitGlobalFeedback({ type, title, message, durationMs })` — success/error 反馈弹窗
  - `GlobalConfirmPromptDialog`：`openGlobalConfirm({ message, destructive?, ... })` → `Promise<boolean>` 和 `openGlobalPrompt({ message?, inputType?, ... })` → `Promise<string | null>` — 替代原生 confirm/prompt
- **UI 组件库**：`src/app/components/ui/` 下 50+ shadcn/ui 组件（Radix UI + Tailwind CSS v4 封装）
- **路径别名**：`@` 映射到 `./src`
- **样式**：Tailwind CSS v4（无 JS 配置文件，通过 `src/styles/theme.css` 定义 CSS 变量，前缀 `--color-*`、`--background`、`--foreground` 等 + 暗色主题）

### Excel 特有功能

- 两个电子表格编辑器：轻量级 `ExcelSnapshotEditor`（自定义）和完整版 `ExcelWorkbookEditor`（UniverJS）
- 客户端公式引擎（`excel.ts`），支持 SUM、AVERAGE、IF 等公式浏览器端计算
- 练习模块：题库管理、随机练习、答题评分（含 Excel 模板题判分）

### 管理后台

`src/app/admin/config.ts` 定义模块和 RBAC 规则：`admin` 可访问全部 12 个模块，`moderator` 仅限 overview、review、reports、posts、categories 这 5 个模块。

主要页面：首页、帖子详情、版块、聊天（WebSocket）、练习、商城、管理后台（多子页面）、个人中心、消息通知等。

## 开发约定

- 后端使用 Lombok，实体类不需要手写 getter/setter
- MyBatis-Plus 自动生成 SQL，单表 CRUD 不需要写 XML
- 前端 UI 组件优先使用 `components/ui/` 中已有的 Radix 封装
- API 端点统一以 `/api/` 前缀开头
- 前端中文界面，代码注释使用中文
- 禁止使用 `window.confirm()` / `window.prompt()` / `window.alert()`，一律使用 `openGlobalConfirm` / `openGlobalPrompt` / `toast` 替代
- 管理后台页面（`AdminConsole.tsx`）自包含一套 `openAdminConfirm` / `openAdminPrompt` 弹窗系统，不使用全局弹窗
- 前端无 dev server 脚本，开发时用 `npx vite build` 构建后由后端（`localhost:8080`）托管静态文件；也可 `npx vite --host` 启动 HMR 开发服务器（默认 `localhost:5173`）
