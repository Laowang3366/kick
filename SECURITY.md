# Security Notes

## Secrets

- 生产环境必须显式设置 `JWT_SECRET`
- 不要把数据库、Redis、MinIO 凭据写入仓库
- GitHub Actions 如需部署或扫描，统一使用仓库 Secrets

## Uploads

- 上传目录默认为 `excel-forum-backend/uploads/`
- 生产环境建议迁移到对象存储或受控文件目录
- 上线前检查上传白名单、大小限制和访问路径

## Authentication

- 本项目使用 JWT，无服务端会话
- 所有环境都必须显式提供 `JWT_SECRET`
- 管理后台接口必须保留角色校验

## Known Risks To Review Before Release

- 管理员初始化环境变量是否只在受控阶段启用
- 文档转换接口的使用配额与审计日志
- 富文本和附件上传的 XSS / 文件绕过风险
- CORS 与 WebSocket 跨域配置是否符合生产域名
