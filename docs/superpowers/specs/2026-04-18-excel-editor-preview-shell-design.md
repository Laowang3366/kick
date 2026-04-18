# Excel 编辑器预览壳层设计说明

## 目标

优化 Excel 类练习页和后台模板编辑页的首次进入体验。

已确认的交互目标：

- 页面应先秒开一个轻量只读工作簿预览
- 完整编辑能力允许在 0.5 到 2 秒内接管
- 编辑器 runtime ready 后，真实编辑器无缝接管，不要求用户离开页面

## 当前基础

- `ExcelWorkbookEditor` 已按路由级别 lazy load
- Univer runtime 已做动态加载与缓存
- 常见入口页已做编辑器预热
- 但首次真正进入编辑器时，用户仍会先看到加载态，而不是工作簿内容

## 问题

当前首屏等待虽然比早期更短，但感知上仍然被“初始化中”阻断：

- 用户启动时看不到表格内容
- 启动阶段无法先浏览工作表和答题区域
- 等待时间会被放大感知

## 选定方案

引入一个基于 `ExcelWorkbookSnapshot` 的轻量只读预览壳层，先即时渲染；真实编辑器并行挂载，ready 后再接管。

## 架构

### 1. 新增 `ExcelWorkbookPreview`

新增一个不依赖 Univer 的轻量预览组件：

- 直接消费 `ExcelWorkbookSnapshot`
- 支持工作表切换
- 只渲染必要的可见网格
- 公式单元格用 `fx` 与公式文本展示
- 支持焦点区域和答题/可编辑区域高亮
- 天然只读

这个组件的目标是快速传达工作簿结构和答题上下文，不追求完整 Excel 视觉还原。

### 2. 为编辑器暴露 ready / error 信号

扩展 `ExcelWorkbookEditor`，让父页面知道真实编辑器何时可交互。

ready 触发前提：

- Univer runtime 已加载完成
- workbook 已创建
- 初始 workbook snapshot 已写入
- 当前模式所需的权限与焦点设置已完成

error 触发前提：

- runtime 加载失败，无法继续初始化真实编辑器

### 3. 三个入口页统一接入预览壳层

接入页面：

- `Practice.tsx`
- `PracticeDetail.tsx`
- `AdminQuestions`（位于 `AdminConsole.tsx`）

共同策略：

- 优先从已有 workbook snapshot 渲染 `ExcelWorkbookPreview`
- 并行挂载 `ExcelWorkbookEditor`
- ready 前显示紧凑状态文案 `编辑器准备中`
- ready 后隐藏预览壳层，由真实编辑器接管
- runtime 失败时保留预览壳层并显示错误文案

### 4. 状态清理与防串写

为避免预览态与真实编辑器之间互相污染，需要额外处理两类状态问题：

- 只有在 `editorReady && !editorError` 时，页面才优先读取编辑器 snapshot getter；否则回退当前 workbook 状态
- 模板快照异步加载链路使用 request id 防 stale 回写，关闭弹窗或重置状态时使旧请求失效
- 关闭弹窗、取消选区或重置状态时，统一退出 fullscreen，避免浏览器停留在错误的全屏状态

## 页面行为

### 练习详情页

- 用户进入题目详情
- 先看到 workbook 只读预览、当前工作表和答题区域上下文
- 编辑器并行启动
- ready 后真实编辑器接管
- 若初始化失败，保留预览并显示错误文案

### 练习投稿页

- 用户上传模板并打开模板编辑器
- workbook snapshot 一到位就先展示预览壳层
- 真实编辑器 ready 后接管
- 若用户在模板加载或全屏选区时关闭弹窗，旧请求和 fullscreen 都会被清理

### 后台题目模板编辑页

- 管理员打开新增/编辑题目弹窗并载入模板
- 先展示预览壳层
- 真实编辑器 ready 后接管
- 失败时保留预览
- 关闭弹窗后，旧模板请求和 fullscreen 状态都会被清理

## 范围

### 本次包含

- workbook snapshot 驱动的预览壳层
- 预览中的工作表切换
- 焦点区域高亮
- 答题/可编辑区域高亮
- 编辑器 ready / error 回调
- runtime 失败保留预览
- 投稿页与后台编辑页的 stale load 防串写
- 关闭时 fullscreen 清理

### 本次不包含

- 像素级 Excel 样式还原
- 合并单元格精确渲染
- 预览态公式重算
- 预览态编辑能力
- 后端预处理或图片化方案

## 关键实现说明

### 预览渲染

直接复用前端已有 workbook snapshot：

- 依据当前选中工作表计算 active sheet
- 从已有单元格与焦点范围推导合理边界
- 限制渲染窗口，避免大表格带来过高 DOM 成本
- 空单元格仍保留网格结构

### 接管方式

避免无意义的卸载/重挂载：

- 数据可用时即挂载编辑器
- ready 前由预览壳层覆盖
- ready 后仅隐藏预览壳层
- sheet 切换走 prop 驱动，不依赖 key 强制 remount

### 状态所有权

页面仍然负责：

- selected sheet
- workbook snapshot
- answer / focus / selection range
- 投稿或后台表单状态
- editor ready / error 状态
- 模板异步加载 request 生命周期

预览组件只消费这些状态，不拥有业务状态。

## 风险

- 预览网格边界过大时，DOM 成本会抵消体验收益
- ready 如果触发过早，会出现接管时序错误
- 预览与真实编辑器如果 sheet 状态不同步，接管会显得突兀
- 异步模板请求若不做失效控制，会重新引入 stale state 回写问题

## 验证

- 新增 `ExcelWorkbookPreview` 组件测试
- 新增 `ExcelWorkbookEditor.ready` 回归测试
- 新增 `PracticeDetail.preview-shell.test.tsx`
- 新增 `Practice.preview-shell.test.tsx`
- 新增 `AdminQuestions.preview-shell.test.tsx`
- 全量前端测试 `npm test` 通过
- 生产构建 `npm run build` 通过
