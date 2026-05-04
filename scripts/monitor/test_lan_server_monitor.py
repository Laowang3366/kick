#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from pathlib import Path


MONITOR_SCRIPT = Path(__file__).resolve().with_name("lan-server-monitor.py")


def load_monitor_module():
    spec = importlib.util.spec_from_file_location("lan_server_monitor", MONITOR_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load monitor script: {MONITOR_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class LanServerMonitorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.monitor = load_monitor_module()

    def test_remote_collector_does_not_pass_mysql_password_as_cli_arg(self) -> None:
        self.assertNotIn('f"-p{password}"', self.monitor.REMOTE_COLLECTOR)
        self.assertNotIn("f'-p{password}'", self.monitor.REMOTE_COLLECTOR)

    def test_redact_text_masks_known_secret_values(self) -> None:
        os.environ["LAN_MONITOR_PASSWORD"] = "ssh-secret"
        os.environ["TG_BOT_TOKEN"] = "bot-secret"
        try:
            redacted = self.monitor.redact_text(
                "failed with ssh-secret and bot-secret",
                extra_secrets=["db-secret"],
            )
        finally:
            os.environ.pop("LAN_MONITOR_PASSWORD", None)
            os.environ.pop("TG_BOT_TOKEN", None)

        self.assertEqual(redacted, "failed with *** and ***")
        self.assertNotIn("db-secret", self.monitor.redact_text("db-secret", extra_secrets=["db-secret"]))

    def test_find_alerts_includes_log_5xx(self) -> None:
        snapshot = {
            "cpu": {"usage_percent": 1.0},
            "memory": {"used_percent": 1.0},
            "disks": {"items": []},
            "services": {"items": []},
            "http": {"items": []},
            "database": {"ok": True, "connection_used_percent": 1.0},
            "logs": {
                "files": [{"source": "access.log", "ok": True, "error_like_count": 0, "http_5xx_count": 2}],
                "journals": [],
            },
        }
        thresholds = self.monitor.Thresholds(
            cpu_percent=90,
            memory_percent=90,
            disk_percent=90,
            db_connection_percent=90,
            log_error_count=1,
        )

        alerts = self.monitor.find_alerts(snapshot, thresholds)

        self.assertEqual(alerts, ["log access.log has 2 recent error-like entries"])


if __name__ == "__main__":
    unittest.main()
