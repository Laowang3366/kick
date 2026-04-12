# Excel Forum Backend

## 项目结构
- `src/main/java/com/excel/forum/` 主代码目录
  - `entity/` 实体类
  - `mapper/` MyBatis-Plus Mapper 接口
  - `service/` 业务逻辑层
  - `controller/` 控制器
  - `config/` 配置类
  - `security/` 安全相关
  - `util/` 工具类
- `src/main/resources/` 资源文件
  - `application.yml` 配置文件
  - `db/migration/` Flyway 数据库迁移脚本
  - `schema.sql` 已废弃，仅保留历史提示，不再作为初始化入口

## 环境要求
- Java 17
- MySQL 8.0+
- Redis
- Maven 3.6+

## 数据库配置
1. 创建数据库：
```sql
CREATE DATABASE excel_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
2. 启动应用，由 Flyway 自动执行 `src/main/resources/db/migration/` 中的迁移。
3. 现有老库会在首次启用 Flyway 时自动 baseline 接管，再继续执行增量迁移。

### 迁移策略
- 结构变更只允许写入 Flyway 迁移，不要再修改 `schema.sql`。
- `DatabaseInitializer` 是旧的兜底逻辑，默认关闭；仅在紧急排障时通过 `app.db.legacy-initializer.enabled=true` 临时启用。

## 配置修改
修改 `application.yml` 中的数据库连接信息、JWT 密钥、Redis 连接等。

## 构建运行
```bash
mvn clean package
java -jar target/forum-1.0.0.jar

# 开发模式
mvn spring-boot:run
```

## API 端点
- 认证：`/api/auth/login`, `/api/auth/register`, `/api/auth/current`
- 用户：`/api/users/{id}`
- 版块：`/api/categories`
- 帖子：`/api/posts`, `/api/posts/{id}`
- 文件上传：`/api/upload`

## 注意事项
- 初始管理员账户需要手动在数据库中插入。
- 当前实现里管理员和默认分类也会由 `DataInitializer` 自动补种。
- 积分和等级规则配置在 application.yml 中。
- 文件存储支持本地和 MinIO，通过 `file.storage.type` 配置。
