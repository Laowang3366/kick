# Excel Forum Frontend

## 项目结构
- `src/api/axios` 实例和拦截器
- `src/router` 路由配置
- `src/stores` Pinia stores (用户状态)
- `src/views` 页面组件
- `src/components` 可复用组件
- `src/utils` 工具函数

## 开发命令
- `npm run dev` 启动开发服务器
- `npm run build` 构建生产版本
- `npm run preview` 预览生产构建

## 技术栈
- Vue 3 + Vite
- Vue Router
- Pinia
- Axios
- Element Plus
- Tiptap 富文本编辑器
- Highlight.js 代码高亮

## 后端 API
后端 API 前缀为 `/api`，已在 vite.config.js 中配置代理到 `http://localhost:3000`。

## 主要功能
- 用户注册/登录/个人中心
- 论坛版块浏览
- 帖子发布/编辑/详情
- 回复、点赞、收藏、举报
- 搜索、私信、通知
- 后台管理（用户、版块、帖子、回复、举报管理）

## 注意事项
- 富文本编辑器使用 Tiptap，支持代码高亮
- 文件上传限制为 .xlsx, .xlsm, .xls, .pdf, .png, .jpg，大小不超过 20MB
- 使用 highlight.js 对代码块进行语法高亮