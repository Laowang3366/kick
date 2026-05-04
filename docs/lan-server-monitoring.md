# LAN 服务器监控脚本

`scripts/monitor/lan-server-monitor.py` 用于从本地通过 SSH 采集 `lan.excelcc.cn` 对应服务器 `192.168.1.17` 的运行快照。脚本只读采集，不会修改服务器状态。

## 采集内容

- CPU 使用率、系统负载和 uptime
- 内存、Swap、磁盘占用
- 网卡收发速率
- `nginx`、`kick-backend.service`、`docker`、`redis-server` 服务状态
- 后端本机健康接口和 LAN 公开 API 状态
- MySQL Docker 容器 `mysql8` 的连接数、运行线程数、最大连接数
- Nginx 文件日志、Nginx journal、应用服务 journal 最近日志中的错误关键词和 5xx 数量

## 使用方式

依赖本地 Python 和 `paramiko`：

```powershell
python -m pip install paramiko
```

通过环境变量传入 SSH 密码：

```powershell
$env:LAN_MONITOR_HOST = "192.168.1.17"
$env:LAN_MONITOR_USER = "server"
$env:LAN_MONITOR_PASSWORD = "<ssh-password>"
python scripts/monitor/lan-server-monitor.py
```

输出 JSON，适合给计划任务、日志系统或后续告警脚本使用：

```powershell
python scripts/monitor/lan-server-monitor.py --json
```

发现告警时返回非 0 退出码：

```powershell
python scripts/monitor/lan-server-monitor.py --fail-on-alert
```

## 常用阈值

默认阈值：

- CPU：`85%`
- 内存：`85%`
- 磁盘：`85%`
- 数据库连接占用：`80%`
- 最近日志错误条数：`1`

可在命令中覆盖：

```powershell
python scripts/monitor/lan-server-monitor.py `
  --cpu-warn 90 `
  --memory-warn 90 `
  --disk-warn 90 `
  --db-connection-warn 75 `
  --log-error-warn 3
```

## Windows 定时任务示例

每 5 分钟执行一次，并把 JSON 输出追加到本地日志：

```powershell
$action = New-ScheduledTaskAction `
  -Execute "python" `
  -Argument "D:\project\recet_excel_project\scripts\monitor\lan-server-monitor.py --json" `
  -WorkingDirectory "D:\project\recet_excel_project"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName "KickLanServerMonitor" `
  -Action $action `
  -Trigger $trigger `
  -Description "Monitor lan.excelcc.cn server health"
```

如果用计划任务运行，需要在该任务的用户环境里配置 `LAN_MONITOR_PASSWORD`，或改用 SSH key 并通过 `--key-file` 指定私钥。

## Telegram 状态查询

`scripts/monitor/telegram-lan-bot.py` 可直接接入 Telegram Bot，通过聊天命令触发状态查询。脚本启动后会调用 Telegram `setMyCommands` 自动注册输入框旁的命令菜单，用户可以点菜单选择命令，也可以手动输入命令。

环境变量：

```powershell
$env:TG_BOT_TOKEN = "<telegram-bot-token>"
$env:LAN_MONITOR_HOST = "192.168.1.17"
$env:LAN_MONITOR_USER = "server"
$env:LAN_MONITOR_PASSWORD = "<ssh-password>"
```

启动：

```powershell
python scripts/monitor/telegram-lan-bot.py
```

验证 token 是否可用：

```powershell
python scripts/monitor/telegram-lan-bot.py --get-me
```

支持的 Telegram 菜单命令：

- `/start`：打开命令菜单和帮助
- `/status`：返回 CPU、内存、磁盘、带宽、服务、HTTP、数据库连接和日志告警摘要
- `/health`：同 `/status`
- `/json`：返回 JSON 状态快照
- `/whoami`：返回当前 Telegram `chat_id`
- `/help`：显示帮助

`/status` 输出按同类字段压缩成单行，便于手机端快速扫读：

```text
LAN 服务器状态: OK
主机: homeserver | 时间: 2026-05-04T23:20:00+0800 | Uptime: 1d 1h 1m
资源: CPU 0.2% | 内存 12.6% | Swap 0% | 负载 0.11/0.04/0.01
磁盘: / 1.3% (12.1 GiB/914.6 GiB)
网络: eno1 RX 1.2 KiB/s | TX 790.0 B/s
服务: Nginx OK | 应用 OK | Docker OK | Redis OK
接口: 本机API 200 18.1ms | 首页API 200 1002.4ms | 教程API 200 1009.2ms | 题库API 200 927.5ms
数据库: 连接 11/151 (7.28%) | 运行线程 2 | 进程 11
日志: 错误 0 | 5xx 0 | 检查 240 行
告警: 无
```

建议先给机器人发送 `/whoami`，再限制允许查询的聊天：

```powershell
$env:TG_ALLOWED_CHAT_IDS = "123456789"
python scripts/monitor/telegram-lan-bot.py
```

`TG_ALLOWED_CHAT_IDS` 未配置时，任何能访问该 Bot 的聊天都可以发起状态查询；生产长期运行时应配置该变量。

如果日志出现：

```text
Conflict: terminated by other getUpdates request
```

说明同一个 Telegram Bot token 已经有另一个长轮询实例在运行。Telegram 不允许同一 Bot 同时有多个 `getUpdates` 消费端；需要停掉旧实例后再启动本脚本，或为监控单独创建一个 Bot token。
