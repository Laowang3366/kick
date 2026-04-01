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
  - `schema.sql` 数据库表结构

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
2. 运行 `schema.sql` 创建表结构。

## 配置修改
修改 `application.yml` 中的数据库连接信息、JWT 密钥、Redis 连接等。

## 构建运行
```bash
mvn clean package
java -jar target/forum-1.0.0.jar
```

## API 端点
- 认证：`/api/auth/login`, `/api/auth/register`, `/api/auth/current`
- 用户：`/api/users/{id}`
- 版块：`/api/categories`
- 帖子：`/api/posts`, `/api/posts/{id}`
- 文件上传：`/api/upload`

## 注意事项
- 初始管理员账户需要手动在数据库中插入。
- 积分和等级规则配置在 application.yml 中。
- 文件存储支持本地和 MinIO，通过 `file.storage.type` 配置。