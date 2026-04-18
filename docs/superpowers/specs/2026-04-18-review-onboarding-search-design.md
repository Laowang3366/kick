# 复习池、首登分流与搜索拆分设计

## 目标

一次性交付三个未完成能力：

1. 将现有错题本升级为带状态机与复习节奏的复习池。
2. 为首次登录用户增加轻量分流与首页个性化推荐。
3. 将搜索能力拆为教程、题目、函数和聚合四条链路，并让首页与全局搜索统一接入。

## 约束

- 保持现有 Spring Boot + MyBatis Plus + React Query 架构，不引入新基础设施。
- 现网已有 `/api/practice/campaign/wrongs`、`/api/tutorials/home`、`/api/posts/search`、`/api/users/search`，需要兼容原有页面入口。
- 以低风险上线为原则，优先复用已有教程文章、练习题、用户体系和练习闯关数据。

## 方案概览

### 1. 错题复习系统升级

- 在 `user_wrong_question` 上补齐状态字段：`status`、`next_review_at`、`review_round`、`last_review_result`、`mastered_at`、`archived_at`，保留已有 `wrong_count` 与 `last_wrong_time`。
- 状态流转采用固定状态机：
  - 首次答错：`new`
  - 进入待复习池且未掌握：`reviewing`
  - 用户通过复习或主动标记掌握：`mastered`
  - 已掌握且不再需要展示：`archived`
- 复习节奏采用固定轮次推进，成功后按照 `1d / 3d / 7d` 推迟下次复习时间；失败则回到 `reviewing` 且下次复习时间置为当前。
- 接口保留原 `/api/practice/campaign/wrongs`，但返回结构升级为：
  - `todayReviews`
  - `reviewPool`
  - `summary`
- 新增：
  - `PUT /api/practice/campaign/wrongs/{id}/review-result`
  - `PUT /api/practice/campaign/wrongs/{id}/archive`
- 原 `resolve` 语义保留，但内部按“标记掌握”处理。

### 2. 首登学习轨道分流

- 新增 `user_learning_profile` 与 `user_onboarding_answer` 两张表。
- 首登判断规则：
  - 已登录且不存在 `user_learning_profile` 记录，视为未分流用户。
- `POST /api/onboarding/quick-assessment`
  - 接收用户选择项。
  - 写入问卷答案。
  - 生成学习轨道、推荐章节、推荐文章。
  - 创建或更新 `user_learning_profile`。
- `GET /api/onboarding/recommendation`
  - 返回当前是否需要首登问卷、当前轨道、推荐章节、推荐文章和首页提示文案。
- `PUT /api/me/learning-track`
  - 允许用户后续手动切换轨道。
- 首页 `/api/tutorials/home` 增加可选 `track` 参数；已登录用户默认按画像轨道过滤并前置推荐内容，未登录用户保持现状。

### 3. 搜索链路拆分

- 新增独立搜索控制器 `/api/search`：
  - `GET /api/search/tutorials`
  - `GET /api/search/questions`
  - `GET /api/search/functions`
  - `GET /api/search/all`
- 统一返回模型字段：
  - `type`
  - `id`
  - `title`
  - `summary`
  - `tags`
  - `targetUrl`
- 数据来源：
  - 教程：`tutorial_article`
  - 题目：`question`
  - 函数：从教程 `function_tags` 中去重抽取，再回指关联教程与章节
- 首页左侧搜索直接使用 `/api/search/all`，返回教程/题目/函数三分区，不再做本地全文过滤。
- 顶部全局搜索从帖子/用户切换改为教程/题目/函数/全部四种模式，回车优先跳首个结果。

## 关键取舍

- 不引入全文索引。当前数据规模足以用 SQL `LIKE` + 标签聚合支撑，变更面更小。
- 不新增独立“复习题目页面”。继续复用现有练习入口和题目页，只扩展错题页状态与按钮行为。
- 不改动登录流程。首登问卷在首页层触发，避免改认证链路。

## 验证

- 后端：
  - 新增 controller 单测覆盖首登与搜索接口。
  - 新增错题复习 controller 单测覆盖状态流转。
- 前端：
  - `npm run build`
- 集成：
  - 后端启动后验证错题页、首页问卷、顶部搜索三条主路径可用。
