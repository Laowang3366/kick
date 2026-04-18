# 部署与运维说明

## 目标

本文档定义当前生产环境的唯一部署入口、标准部署命令、健康检查和回滚方式。

当前原则：

- 不改变现有 `Nginx + systemd + Spring Boot` 拓扑
- 生产部署源码目录唯一指向 `/www/wwwroot/kick-deploy/repo`
- `/www/wwwroot/kick-src/kick` 仅作为历史工作目录保留，不再作为发布入口

## 服务器拓扑

- 站点域名：`https://www.excelcc.cn`
- Nginx 配置：`/www/server/panel/vhost/nginx/kick.conf`
- 前端静态目录：`/www/wwwroot/kick-web`
- 后端运行目录：`/www/wwwroot/kick-backend`
- 后端服务：`kick-backend.service`
- 后端监听地址：`127.0.0.1:8080`
- 部署仓目录：`/www/wwwroot/kick-deploy/repo`
- 部署环境文件：`/www/wwwroot/kick-deploy/deploy.env`
- 后端环境文件：`/www/wwwroot/kick-backend/.env.production`
- 备份目录：`/www/wwwroot/kick-deploy/backups`

## 目录约定

生产环境只允许以下目录参与发布：

- 源码与构建入口：`/www/wwwroot/kick-deploy/repo`
- 前端运行时目录：`/www/wwwroot/kick-web`
- 后端运行时目录：`/www/wwwroot/kick-backend`
- 发布备份目录：`/www/wwwroot/kick-deploy/backups`

历史目录说明：

- `/www/wwwroot/kick-src/kick`
  这是历史工作目录，不再作为发布入口，也不应作为“当前线上源码”的判断依据。

## 标准部署

执行前确认：

- 当前操作目录为 `/www/wwwroot/kick-deploy/repo`
- 运行服务为 `kick-backend.service`
- 本次发布目标是“收敛现有部署链路”，不是临时在其他目录手工替换文件

标准部署命令：

```bash
cd /www/wwwroot/kick-deploy/repo
bash scripts/deploy/production-deploy.sh
```

部署脚本会执行：

1. 校验配置和依赖命令
2. 打印当前仓库状态
3. 构建前端 `reace_web/dist`
4. 构建后端 `excel-forum-backend/target/forum-1.0.0.jar`
5. 为当前前端目录和后端 JAR 建立时间戳备份
6. 替换运行时目录
7. 重启 `kick-backend.service`
8. 通过 HTTP 接口进行健康检查
9. 如失败则自动回滚

## 健康检查

后端健康检查统一使用：

```bash
curl -fsS http://127.0.0.1:8080/api/public/home-overview
```

服务状态检查：

```bash
systemctl status kick-backend.service --no-pager -l
systemctl is-active kick-backend.service
```

站点可达性检查：

```bash
curl -Iks https://www.excelcc.cn
```

判定标准：

- `kick-backend.service` 为 `active`
- `http://127.0.0.1:8080/api/public/home-overview` 返回 `200`
- `https://www.excelcc.cn` 首页可访问

## 回滚

每次标准部署都会在 `/www/wwwroot/kick-deploy/backups/<timestamp>` 下生成：

- `kick-web/`
- `forum-1.0.0.jar`

如果自动回滚没有完成，人工回滚步骤如下：

```bash
export ROLLBACK_DIR=/www/wwwroot/kick-deploy/backups/<timestamp>
rm -rf /www/wwwroot/kick-web
mv "$ROLLBACK_DIR/kick-web" /www/wwwroot/kick-web
install -o www -g www -m 0644 "$ROLLBACK_DIR/forum-1.0.0.jar" /www/wwwroot/kick-backend/forum-1.0.0.jar
systemctl restart kick-backend.service
curl -fsS http://127.0.0.1:8080/api/public/home-overview
```

如果只需要检查最近一次备份：

```bash
ls -lt /www/wwwroot/kick-deploy/backups
```

## 变更约束

- 不要直接在 `/www/wwwroot/kick-web` 手工编辑静态文件
- 不要直接在 `/www/wwwroot/kick-backend` 手工替换源码
- 不要从 `/www/wwwroot/kick-src/kick` 发版
- 任何对生产结构的进一步升级，优先在仓库文档与脚本里落地，再执行
