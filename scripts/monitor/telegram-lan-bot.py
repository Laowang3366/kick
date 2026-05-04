#!/usr/bin/env python3
"""
Telegram bot for querying the LAN server monitor on demand.

Required environment variables:
  TG_BOT_TOKEN          Telegram bot token.
  LAN_MONITOR_PASSWORD  SSH password for the LAN server, unless --key-file is used.

Optional:
  TG_ALLOWED_CHAT_IDS   Comma-separated chat IDs allowed to query status.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
MONITOR_SCRIPT = SCRIPT_DIR / "lan-server-monitor.py"
TELEGRAM_LIMIT = 4096
BOT_COMMANDS: tuple[dict[str, str], ...] = (
    {"command": "start", "description": "打开命令菜单"},
    {"command": "status", "description": "查询 LAN 服务器摘要"},
    {"command": "health", "description": "查询 LAN 服务器摘要"},
    {"command": "json", "description": "查询 JSON 状态快照"},
    {"command": "whoami", "description": "显示当前 chat_id"},
    {"command": "help", "description": "显示帮助"},
)
SERVICE_LABELS = {
    "nginx": "Nginx",
    "kick-backend.service": "应用",
    "docker": "Docker",
    "redis-server": "Redis",
}
ENDPOINT_LABELS = {
    "http://127.0.0.1:8080/api/public/home-overview": "本机API",
    "https://lan.excelcc.cn/api/public/home-overview": "首页API",
    "https://lan.excelcc.cn/api/tutorials/home": "教程API",
    "https://lan.excelcc.cn/api/practice/categories": "题库API",
}
SENSITIVE_ENV_NAMES = (
    "TG_BOT_TOKEN",
    "LAN_MONITOR_PASSWORD",
    "DB_PASSWORD",
    "JWT_SECRET",
)


def load_monitor_module():
    spec = importlib.util.spec_from_file_location("lan_server_monitor", MONITOR_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load monitor script: {MONITOR_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a Telegram bot for LAN server status queries.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--token-env", default="TG_BOT_TOKEN")
    parser.add_argument("--allowed-chat-ids-env", default="TG_ALLOWED_CHAT_IDS")
    parser.add_argument("--poll-timeout", type=int, default=int(os.environ.get("TG_POLL_TIMEOUT", "25")))
    parser.add_argument("--api-timeout", type=int, default=35)
    parser.add_argument("--get-me", action="store_true", help="Check bot token and print bot identity.")
    parser.add_argument("--host", default=os.environ.get("LAN_MONITOR_HOST", "192.168.1.17"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("LAN_MONITOR_PORT", "22")))
    parser.add_argument("--user", default=os.environ.get("LAN_MONITOR_USER", "server"))
    parser.add_argument("--password-env", default="LAN_MONITOR_PASSWORD")
    parser.add_argument("--key-file", default=os.environ.get("LAN_MONITOR_KEY_FILE"))
    parser.add_argument("--monitor-timeout", type=int, default=15)
    parser.add_argument("--sample-seconds", type=float, default=0.5)
    parser.add_argument("--log-lines", type=int, default=40)
    parser.add_argument("--db-container", default=os.environ.get("LAN_MONITOR_DB_CONTAINER", "mysql8"))
    parser.add_argument("--cpu-warn", type=float, default=85.0)
    parser.add_argument("--memory-warn", type=float, default=85.0)
    parser.add_argument("--disk-warn", type=float, default=85.0)
    parser.add_argument("--db-connection-warn", type=float, default=80.0)
    parser.add_argument("--log-error-warn", type=int, default=1)
    return parser.parse_args()


class TelegramClient:
    def __init__(self, token: str, api_timeout: int) -> None:
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.api_timeout = api_timeout

    def request(self, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = None
        headers = {}
        if payload is not None:
            data = urllib.parse.urlencode(payload).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        request = urllib.request.Request(f"{self.base_url}/{method}", data=data, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self.api_timeout) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            raise RuntimeError(redact_text(f"Telegram API {method} failed: HTTP {exc.code} {body}")) from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(redact_text(f"Telegram API {method} failed: {exc}")) from exc
        result = json.loads(raw)
        if not result.get("ok"):
            raise RuntimeError(redact_text(f"Telegram API {method} failed: {result}"))
        return result["result"]

    def get_me(self) -> dict[str, Any]:
        return self.request("getMe")

    def set_my_commands(self, commands: tuple[dict[str, str], ...]) -> None:
        self.request(
            "setMyCommands",
            {"commands": json.dumps(list(commands), ensure_ascii=False)},
        )

    def get_updates(self, offset: int | None, timeout: int) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {
            "timeout": timeout,
            "allowed_updates": json.dumps(["message"]),
        }
        if offset is not None:
            payload["offset"] = offset
        return self.request("getUpdates", payload)

    def send_message(self, chat_id: int, text: str) -> None:
        for chunk in split_message(text):
            self.request(
                "sendMessage",
                {
                    "chat_id": str(chat_id),
                    "text": chunk,
                    "disable_web_page_preview": "true",
                },
            )


def split_message(text: str) -> list[str]:
    if len(text) <= TELEGRAM_LIMIT:
        return [text]
    chunks = []
    remaining = text
    while remaining:
        chunks.append(remaining[:3900])
        remaining = remaining[3900:]
    return chunks


def parse_allowed_chat_ids(raw: str | None) -> set[int]:
    if not raw:
        return set()
    values = set()
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        values.add(int(item))
    return values


def redact_text(text: str) -> str:
    redacted = text
    secrets = {os.environ.get(name, "") for name in SENSITIVE_ENV_NAMES}
    for secret in sorted({item for item in secrets if item and len(item) >= 4}, key=len, reverse=True):
        redacted = redacted.replace(secret, "***")
    return redacted


def monitor_args(args: argparse.Namespace) -> argparse.Namespace:
    return argparse.Namespace(
        host=args.host,
        port=args.port,
        user=args.user,
        password_env=args.password_env,
        key_file=args.key_file,
        timeout=args.monitor_timeout,
        sample_seconds=args.sample_seconds,
        log_lines=args.log_lines,
        db_container=args.db_container,
        json=False,
        fail_on_alert=False,
        cpu_warn=args.cpu_warn,
        memory_warn=args.memory_warn,
        disk_warn=args.disk_warn,
        db_connection_warn=args.db_connection_warn,
        log_error_warn=args.log_error_warn,
        services=None,
        health_endpoints=None,
    )


def collect_status(args: argparse.Namespace) -> tuple[dict[str, Any], list[str]]:
    monitor = load_monitor_module()
    snapshot = monitor.collect_snapshot(monitor_args(args))
    thresholds = monitor.Thresholds(
        cpu_percent=args.cpu_warn,
        memory_percent=args.memory_warn,
        disk_percent=args.disk_warn,
        db_connection_percent=args.db_connection_warn,
        log_error_count=args.log_error_warn,
    )
    alerts = monitor.find_alerts(snapshot, thresholds)
    return snapshot, alerts


def fmt_bytes(value: float | int | None) -> str:
    monitor = load_monitor_module()
    return monitor.format_bytes(value)


def fmt_seconds(value: float | int | None) -> str:
    monitor = load_monitor_module()
    return monitor.format_seconds(value)


def fmt_decimal(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value)


def fmt_percent(value: Any) -> str:
    if value is None:
        return "-"
    return f"{fmt_decimal(value)}%"


def fmt_ms(value: Any) -> str:
    if value is None:
        return "-"
    return f"{fmt_decimal(value)}ms"


def fmt_load(load_average: Any) -> str:
    if not load_average:
        return "-"
    return "/".join(fmt_decimal(float(item)) for item in load_average[:3])


def service_item_summary(item: dict[str, Any]) -> str:
    label = SERVICE_LABELS.get(str(item.get("name")), str(item.get("name") or "-"))
    if item.get("ok"):
        return f"{label} OK"
    active = item.get("active") or "unknown"
    return f"{label} WARN({active})"


def endpoint_item_summary(item: dict[str, Any]) -> str:
    url = str(item.get("url") or "")
    label = ENDPOINT_LABELS.get(url, url.replace("https://lan.excelcc.cn", "LAN").replace("http://127.0.0.1:8080", "本机"))
    status = item.get("status") if item.get("status") is not None else "ERR"
    elapsed = fmt_ms(item.get("elapsed_ms"))
    if item.get("ok"):
        return f"{label} {status} {elapsed}"
    return f"{label} WARN({status}) {elapsed}"


def log_totals(snapshot: dict[str, Any]) -> tuple[int, int, int, int]:
    error_like = 0
    http_5xx = 0
    lines_checked = 0
    unreadable = 0
    logs = snapshot.get("logs", {})
    for item in logs.get("files", []) + logs.get("journals", []):
        error_like += int(item.get("error_like_count") or 0)
        http_5xx += int(item.get("http_5xx_count") or 0)
        lines_checked += int(item.get("lines_checked") or 0)
        if item.get("ok") is False:
            unreadable += 1
    return error_like, http_5xx, lines_checked, unreadable


def database_summary(database: dict[str, Any]) -> str:
    if not database.get("ok"):
        return f"数据库: WARN {database.get('error', 'unknown error')}"
    connected = fmt_decimal(database.get("threads_connected"))
    max_connections = fmt_decimal(database.get("max_connections"))
    used_percent = fmt_percent(database.get("connection_used_percent"))
    running = fmt_decimal(database.get("threads_running"))
    process_count = fmt_decimal(database.get("processlist_count"))
    return f"数据库: 连接 {connected}/{max_connections} ({used_percent}) | 运行线程 {running} | 进程 {process_count}"


def render_status(snapshot: dict[str, Any], alerts: list[str]) -> str:
    cpu = snapshot.get("cpu", {})
    memory = snapshot.get("memory", {})
    database = snapshot.get("database", {})
    disks = snapshot.get("disks", {}).get("items", [])
    root_disk = next((item for item in disks if item.get("mountpoint") == "/"), disks[0] if disks else {})
    services = snapshot.get("services", {}).get("items", [])
    http_items = snapshot.get("http", {}).get("items", [])
    network = snapshot.get("network", {}).get("items", [])
    primary_net = next((item for item in network if item.get("interface") in ("eno1", "eth0")), network[0] if network else {})

    service_summary = " | ".join(service_item_summary(item) for item in services) or "-"
    http_summary = " | ".join(endpoint_item_summary(item) for item in http_items) or "-"
    log_errors, log_5xx, log_lines, unreadable_logs = log_totals(snapshot)
    log_summary = f"日志: 错误 {log_errors} | 5xx {log_5xx} | 检查 {log_lines} 行"
    if unreadable_logs:
        log_summary += f" | 不可读 {unreadable_logs}"

    lines = [
        f"LAN 服务器状态: {'WARN' if alerts else 'OK'}",
        f"主机: {snapshot.get('hostname', '-')} | 时间: {snapshot.get('timestamp', '-')} | Uptime: {fmt_seconds(snapshot.get('uptime_seconds'))}",
        f"资源: CPU {fmt_percent(cpu.get('usage_percent'))} | 内存 {fmt_percent(memory.get('used_percent'))} | Swap {fmt_percent(memory.get('swap_used_percent'))} | 负载 {fmt_load(snapshot.get('load_average'))}",
        f"磁盘: / {fmt_percent(root_disk.get('used_percent'))} ({fmt_bytes(root_disk.get('used_bytes'))}/{fmt_bytes(root_disk.get('total_bytes'))})",
        f"网络: {primary_net.get('interface', '-')} RX {fmt_bytes(primary_net.get('rx_bytes_per_second'))}/s | TX {fmt_bytes(primary_net.get('tx_bytes_per_second'))}/s",
        f"服务: {service_summary}",
        f"接口: {http_summary}",
        database_summary(database),
        log_summary,
        "告警: " + ("; ".join(alerts[:8]) if alerts else "无"),
    ]
    return "\n".join(lines)


def render_json(snapshot: dict[str, Any], alerts: list[str]) -> str:
    compact = {
        "timestamp": snapshot.get("timestamp"),
        "hostname": snapshot.get("hostname"),
        "cpu": snapshot.get("cpu"),
        "memory": snapshot.get("memory"),
        "disks": snapshot.get("disks"),
        "network": snapshot.get("network"),
        "services": snapshot.get("services"),
        "http": snapshot.get("http"),
        "database": snapshot.get("database"),
        "alerts": alerts,
    }
    return json.dumps(compact, ensure_ascii=False, indent=2, sort_keys=True)


def help_text(chat_id: int) -> str:
    commands = "\n".join(f"/{item['command']} - {item['description']}" for item in BOT_COMMANDS)
    return (
        "可用命令（也可点击 Telegram 输入框旁的菜单选择）:\n"
        f"{commands}\n\n"
        f"当前 chat_id: {chat_id}"
    )


def message_text(message: dict[str, Any]) -> str:
    text = message.get("text") or ""
    return text.split(maxsplit=1)[0].split("@", 1)[0].lower()


def handle_message(
    client: TelegramClient,
    args: argparse.Namespace,
    allowed_chat_ids: set[int],
    message: dict[str, Any],
) -> None:
    chat = message.get("chat") or {}
    chat_id = int(chat.get("id"))
    command = message_text(message)

    if command == "/whoami":
        client.send_message(chat_id, f"chat_id: {chat_id}")
        return

    if allowed_chat_ids and chat_id not in allowed_chat_ids:
        client.send_message(chat_id, f"未授权。当前 chat_id: {chat_id}")
        return

    if command in ("/start", "/help"):
        client.send_message(chat_id, help_text(chat_id))
        return
    if command in ("/status", "/health"):
        client.send_message(chat_id, "正在采集 LAN 服务器状态...")
        try:
            snapshot, alerts = collect_status(args)
            client.send_message(chat_id, render_status(snapshot, alerts))
        except Exception as exc:
            client.send_message(chat_id, f"采集失败: {redact_text(str(exc))}")
        return
    if command == "/json":
        client.send_message(chat_id, "正在采集 LAN 服务器 JSON 快照...")
        try:
            snapshot, alerts = collect_status(args)
            client.send_message(chat_id, render_json(snapshot, alerts))
        except Exception as exc:
            client.send_message(chat_id, f"采集失败: {redact_text(str(exc))}")
        return

    client.send_message(chat_id, help_text(chat_id))


def run_polling(args: argparse.Namespace, token: str) -> int:
    client = TelegramClient(token, args.api_timeout)
    me = client.get_me()
    client.set_my_commands(BOT_COMMANDS)
    allowed_chat_ids = parse_allowed_chat_ids(os.environ.get(args.allowed_chat_ids_env))
    print(
        f"telegram bot connected: @{me.get('username', me.get('first_name', 'unknown'))}; "
        f"allowed_chat_ids={'configured' if allowed_chat_ids else 'not configured'}; "
        f"commands_registered={len(BOT_COMMANDS)}",
        flush=True,
    )

    offset = None
    while True:
        try:
            updates = client.get_updates(offset, args.poll_timeout)
            for update in updates:
                offset = int(update["update_id"]) + 1
                message = update.get("message")
                if message:
                    handle_message(client, args, allowed_chat_ids, message)
        except KeyboardInterrupt:
            print("telegram bot stopped", flush=True)
            return 0
        except Exception as exc:
            print(f"telegram bot loop error: {exc}", file=sys.stderr, flush=True)
            time.sleep(5)


def main() -> int:
    args = parse_args()
    token = os.environ.get(args.token_env)
    if not token:
        print(f"missing token: set {args.token_env}", file=sys.stderr)
        return 1

    client = TelegramClient(token, args.api_timeout)
    if args.get_me:
        me = client.get_me()
        print(
            json.dumps(
                {
                    "id": me.get("id"),
                    "is_bot": me.get("is_bot"),
                    "username": me.get("username"),
                    "first_name": me.get("first_name"),
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        return 0

    return run_polling(args, token)


if __name__ == "__main__":
    raise SystemExit(main())
