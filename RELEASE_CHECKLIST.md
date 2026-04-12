# Release Checklist

## 环境

- [ ] 已配置 `DB_URL`
- [ ] 已配置 `DB_USERNAME`
- [ ] 已配置 `DB_PASSWORD`
- [ ] 已配置 `JWT_SECRET`
- [ ] 已配置 `ALLOWED_ORIGINS`
- [ ] 若需要首启管理员引导，已显式配置 `ADMIN_BOOTSTRAP_*`
- [ ] MySQL 可连接
- [ ] Redis 可连接
- [ ] 上传目录或对象存储已准备

## 数据

- [ ] 生产数据库已备份
- [ ] Flyway 迁移已在目标环境演练
- [ ] 默认管理员口令已修改
- [ ] 已确认生产环境未错误启用管理员自动引导

## 质量门禁

- [ ] 后端 `mvn test` 通过
- [ ] 后端 `mvn -q -DskipTests compile` 通过
- [ ] 前端 `npm ci` 通过
- [ ] 前端 `npm run build` 通过
- [ ] GitHub Actions 全绿
- [ ] `docs/release-audit.md` 中 P0 为 0
- [ ] `docs/release-audit.md` 中阻断项已关闭

## 烟测

- [ ] 首页可访问
- [ ] 登录可用
- [ ] 发帖 / 回复可用
- [ ] 通知 / 私信可用
- [ ] 练习模块可用
- [ ] 后台总览可访问
- [ ] 商城兑换链路可用
