#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path
from typing import Any


BOT_SCRIPT = Path(__file__).resolve().with_name("telegram-lan-bot.py")


def load_bot_module():
    spec = importlib.util.spec_from_file_location("telegram_lan_bot", BOT_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load bot script: {BOT_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TelegramLanBotTest(unittest.TestCase):
    def setUp(self) -> None:
        self.bot = load_bot_module()

    def test_command_menu_uses_all_supported_commands(self) -> None:
        class RecordingTelegramClient(self.bot.TelegramClient):
            def __init__(self) -> None:
                super().__init__("token", 10)
                self.calls: list[tuple[str, dict[str, Any] | None]] = []

            def request(self, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
                self.calls.append((method, payload))
                return {}

        client = RecordingTelegramClient()

        client.set_my_commands(self.bot.BOT_COMMANDS)

        method, payload = client.calls[-1]
        self.assertIsNotNone(payload)
        assert payload is not None
        commands = json.loads(payload["commands"])
        self.assertEqual(method, "setMyCommands")
        self.assertEqual(
            [item["command"] for item in commands],
            ["start", "status", "health", "json", "whoami", "help"],
        )
        self.assertEqual(commands[1]["description"], "查询 LAN 服务器摘要")

    def test_render_status_groups_related_fields_on_one_line(self) -> None:
        snapshot = {
            "timestamp": "2026-05-04T23:20:00+0800",
            "hostname": "homebox",
            "uptime_seconds": 90061,
            "load_average": [0.11, 0.04, 0.01],
            "cpu": {"usage_percent": 0.2},
            "memory": {"used_percent": 12.6, "swap_used_percent": 0.0},
            "disks": {"items": [{"mountpoint": "/", "used_percent": 1.3, "used_bytes": 13_000_000_000, "total_bytes": 982_000_000_000}]},
            "network": {"items": [{"interface": "eno1", "rx_bytes_per_second": 1228.8, "tx_bytes_per_second": 790.0}]},
            "services": {
                "items": [
                    {"name": "nginx", "ok": True, "active": "active"},
                    {"name": "kick-backend.service", "ok": True, "active": "active"},
                    {"name": "docker", "ok": True, "active": "active"},
                    {"name": "redis-server", "ok": False, "active": "inactive"},
                ]
            },
            "http": {
                "items": [
                    {"url": "http://127.0.0.1:8080/api/public/home-overview", "ok": True, "status": 200, "elapsed_ms": 18.1},
                    {"url": "https://lan.excelcc.cn/api/tutorials/home", "ok": True, "status": 200, "elapsed_ms": 1002.4},
                ]
            },
            "database": {
                "ok": True,
                "threads_connected": 11,
                "threads_running": 2,
                "max_connections": 151,
                "processlist_count": 11,
                "connection_used_percent": 7.28,
            },
            "logs": {
                "files": [{"ok": True, "error_like_count": 1, "http_5xx_count": 2, "lines_checked": 40}],
                "journals": [{"ok": True, "error_like_count": 3, "lines_checked": 40}],
            },
        }

        text = self.bot.render_status(snapshot, ["redis down"])

        self.assertIn("LAN 服务器状态: WARN", text)
        self.assertIn("主机: homebox | 时间: 2026-05-04T23:20:00+0800 | Uptime: 1d 1h 1m", text)
        self.assertIn("资源: CPU 0.2% | 内存 12.6% | Swap 0% | 负载 0.11/0.04/0.01", text)
        self.assertIn("服务: Nginx OK | 应用 OK | Docker OK | Redis WARN(inactive)", text)
        self.assertIn("接口: 本机API 200 18.1ms | 教程API 200 1002.4ms", text)
        self.assertIn("数据库: 连接 11/151 (7.28%) | 运行线程 2 | 进程 11", text)
        self.assertIn("日志: 错误 4 | 5xx 2 | 检查 80 行", text)
        self.assertIn("告警: redis down", text)


if __name__ == "__main__":
    unittest.main()
