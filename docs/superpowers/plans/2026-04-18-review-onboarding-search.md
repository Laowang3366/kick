# 复习池、首登分流与搜索拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为练习平台补齐错题复习状态机、首登学习轨道和统一搜索链路，并一次性上线。

**Architecture:** 后端通过新增 Flyway 迁移、实体和 controller/service 接口承载三项能力；前端复用现有首页、错题页和布局搜索入口接入新接口，不做跨模块重构。

**Tech Stack:** Spring Boot 3.2, MyBatis Plus, Flyway, JUnit 5, React 18, Vite, React Query

---

### Task 1: 建表与实体扩展

**Files:**
- Create: `excel-forum-backend/src/main/resources/db/migration/V44__add_review_onboarding_and_search_support.sql`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/entity/UserLearningProfile.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/entity/UserOnboardingAnswer.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/mapper/UserLearningProfileMapper.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/mapper/UserOnboardingAnswerMapper.java`
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/entity/UserWrongQuestion.java`

- [ ] 写迁移，补齐错题复习字段并新增首登画像表
- [ ] 新增对应实体与 mapper
- [ ] 编译后端，确认迁移与实体字段无语法问题

### Task 2: 错题复习接口升级

**Files:**
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/service/PracticeCampaignService.java`
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/service/impl/PracticeCampaignServiceImpl.java`
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/controller/PracticeCampaignController.java`
- Create: `excel-forum-backend/src/test/java/com/excel/forum/controller/PracticeCampaignControllerTest.java`

- [ ] 先写 controller 测试，覆盖获取复习池、提交复习结果、归档与标记掌握
- [ ] 运行单测，确认失败点是接口缺失或返回结构不符
- [ ] 实现 service 状态机与 controller 新接口
- [ ] 再跑单测直到通过

### Task 3: 首登分流接口与首页推荐

**Files:**
- Create: `excel-forum-backend/src/main/java/com/excel/forum/controller/OnboardingController.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/service/OnboardingService.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/service/impl/OnboardingServiceImpl.java`
- Create: `excel-forum-backend/src/test/java/com/excel/forum/controller/OnboardingControllerTest.java`
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/controller/TutorialController.java`
- Modify: `excel-forum-backend/src/main/java/com/excel/forum/controller/UserController.java`

- [ ] 先写首登接口测试，覆盖首登推荐与手动切轨
- [ ] 运行单测，确认失败
- [ ] 实现问卷、画像生成、轨道切换与首页按轨道过滤
- [ ] 再跑单测直到通过

### Task 4: 搜索接口拆分

**Files:**
- Create: `excel-forum-backend/src/main/java/com/excel/forum/controller/SearchController.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/service/SearchService.java`
- Create: `excel-forum-backend/src/main/java/com/excel/forum/service/impl/SearchServiceImpl.java`
- Create: `excel-forum-backend/src/test/java/com/excel/forum/controller/SearchControllerTest.java`

- [ ] 先写搜索 controller 测试，覆盖教程、题目、函数和聚合四个接口
- [ ] 运行单测，确认失败
- [ ] 实现统一搜索返回模型
- [ ] 再跑单测直到通过

### Task 5: 前端首页与错题页接入

**Files:**
- Modify: `reace_web/src/app/pages/Home.tsx`
- Modify: `reace_web/src/app/pages/PracticeCampaignWrongs.tsx`
- Modify: `reace_web/src/app/lib/query-keys.ts`
- Modify: `reace_web/src/app/lib/session-store.ts`

- [ ] 接入首页首登问卷与推荐轨道展示
- [ ] 将首页搜索改为后端聚合搜索
- [ ] 将错题页改为今日待复习、复习池、已掌握操作
- [ ] 运行前端构建验证

### Task 6: 顶部搜索链路切换

**Files:**
- Modify: `reace_web/src/app/components/Layout.tsx`

- [ ] 用统一 `/api/search/*` 接口替换原帖子/用户搜索逻辑
- [ ] 调整建议面板与回车跳转策略
- [ ] 运行前端构建验证

### Task 7: 验证、提交、上线

**Files:**
- Modify: `README.md`（如需要补充接口说明）

- [ ] 运行 `cd excel-forum-backend; mvn test`
- [ ] 运行 `cd reace_web; npm run build`
- [ ] 检查 `git diff`，整理提交
- [ ] 推送分支
- [ ] 同步服务器仓库并执行部署脚本
- [ ] 对首页、错题页、搜索做线上回归
