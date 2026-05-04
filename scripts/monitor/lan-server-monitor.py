#!/usr/bin/env python3
"""
Collect a lightweight health snapshot from the LAN deployment server.

The script is intentionally read-only. SSH credentials come from environment
variables or CLI options; no secrets are stored in this repository.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import sys
import textwrap
from dataclasses import dataclass
from typing import Any


DEFAULT_HOST = "192.168.1.17"
DEFAULT_USER = "server"
DEFAULT_SERVICES = (
    "nginx",
    "kick-backend.service",
    "docker",
    "redis-server",
)
DEFAULT_DB_CONTAINER = "mysql8"
DEFAULT_HEALTH_ENDPOINTS = (
    "http://127.0.0.1:8080/api/public/home-overview",
    "https://lan.excelcc.cn/api/public/home-overview",
    "https://lan.excelcc.cn/api/tutorials/home",
    "https://lan.excelcc.cn/api/practice/categories",
)


REMOTE_COLLECTOR = r"""
import glob
import json
import os
import re
import shlex
import socket
import ssl
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


INTERVAL = float(os.environ.get("MONITOR_INTERVAL", "1"))
LOG_LINES = int(os.environ.get("MONITOR_LOG_LINES", "80"))
DB_CONTAINER = os.environ.get("MONITOR_DB_CONTAINER", "mysql8")
SERVICES = [item for item in os.environ.get("MONITOR_SERVICES", "").split(",") if item]
HEALTH_ENDPOINTS = [item for item in os.environ.get("MONITOR_HEALTH_ENDPOINTS", "").split(",") if item]
ENV_FILE = os.environ.get("MONITOR_ENV_FILE", "/www/wwwroot/kick-backend/.env.production")


def run(args, timeout=10, input_text=None, env=None):
    try:
        completed = subprocess.run(
            args,
            input=input_text,
            text=True,
            capture_output=True,
            timeout=timeout,
            env=env,
        )
        return {
            "ok": completed.returncode == 0,
            "code": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    except Exception as exc:
        return {"ok": False, "code": None, "stdout": "", "stderr": str(exc)}


def read_cpu_stat():
    with open("/proc/stat", "r", encoding="utf-8") as handle:
        parts = handle.readline().split()
    values = [int(value) for value in parts[1:]]
    idle = values[3] + values[4]
    total = sum(values)
    return idle, total


def collect_cpu():
    idle_a, total_a = read_cpu_stat()
    time.sleep(max(INTERVAL, 0.1))
    idle_b, total_b = read_cpu_stat()
    total_delta = max(total_b - total_a, 1)
    idle_delta = max(idle_b - idle_a, 0)
    usage = 100.0 * (1.0 - idle_delta / total_delta)
    return {"usage_percent": round(usage, 2), "sample_seconds": INTERVAL}


def collect_memory():
    meminfo = {}
    with open("/proc/meminfo", "r", encoding="utf-8") as handle:
        for line in handle:
            key, raw_value = line.split(":", 1)
            meminfo[key] = int(raw_value.strip().split()[0]) * 1024

    total = meminfo.get("MemTotal", 0)
    available = meminfo.get("MemAvailable", 0)
    used = max(total - available, 0)
    swap_total = meminfo.get("SwapTotal", 0)
    swap_free = meminfo.get("SwapFree", 0)
    swap_used = max(swap_total - swap_free, 0)
    return {
        "total_bytes": total,
        "available_bytes": available,
        "used_bytes": used,
        "used_percent": round(100.0 * used / total, 2) if total else None,
        "swap_total_bytes": swap_total,
        "swap_used_bytes": swap_used,
        "swap_used_percent": round(100.0 * swap_used / swap_total, 2) if swap_total else 0,
    }


def collect_disks():
    output = run(["df", "-P", "-B1"], timeout=8)
    disks = []
    if not output["ok"]:
        return {"items": disks, "error": output["stderr"]}
    ignored = {"tmpfs", "devtmpfs", "overlay", "squashfs"}
    for line in output["stdout"].splitlines()[1:]:
        parts = line.split()
        if len(parts) < 6 or parts[0] in ignored:
            continue
        try:
            total = int(parts[1])
            used = int(parts[2])
            available = int(parts[3])
        except ValueError:
            continue
        mountpoint = parts[5]
        if mountpoint.startswith(("/run", "/snap", "/proc", "/sys", "/dev")):
            continue
        disks.append(
            {
                "filesystem": parts[0],
                "mountpoint": mountpoint,
                "total_bytes": total,
                "used_bytes": used,
                "available_bytes": available,
                "used_percent": round(100.0 * used / total, 2) if total else None,
            }
        )
    return {"items": disks}


def read_net_dev():
    data = {}
    with open("/proc/net/dev", "r", encoding="utf-8") as handle:
        for line in handle.readlines()[2:]:
            iface, values = line.split(":", 1)
            iface = iface.strip()
            fields = values.split()
            data[iface] = {"rx": int(fields[0]), "tx": int(fields[8])}
    return data


def collect_network():
    first = read_net_dev()
    time.sleep(max(INTERVAL, 0.1))
    second = read_net_dev()
    items = []
    for iface, now in sorted(second.items()):
        if iface == "lo" or iface not in first:
            continue
        rx_rate = max(now["rx"] - first[iface]["rx"], 0) / max(INTERVAL, 0.1)
        tx_rate = max(now["tx"] - first[iface]["tx"], 0) / max(INTERVAL, 0.1)
        items.append(
            {
                "interface": iface,
                "rx_bytes_per_second": round(rx_rate, 2),
                "tx_bytes_per_second": round(tx_rate, 2),
                "rx_total_bytes": now["rx"],
                "tx_total_bytes": now["tx"],
            }
        )
    return {"items": items}


def collect_services():
    items = []
    for service in SERVICES:
        active = run(["systemctl", "is-active", service], timeout=5)
        enabled = run(["systemctl", "is-enabled", service], timeout=5)
        items.append(
            {
                "name": service,
                "active": active["stdout"].strip() or active["stderr"].strip(),
                "enabled": enabled["stdout"].strip() or enabled["stderr"].strip(),
                "ok": active["stdout"].strip() == "active",
            }
        )
    return {"items": items}


def parse_env_file(path):
    env = {}
    try:
        for raw in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    except Exception as exc:
        env["_error"] = str(exc)
    return env


def collect_database():
    env_file = parse_env_file(ENV_FILE)
    if "_error" in env_file:
        return {"ok": False, "error": "cannot read env file: " + env_file["_error"]}

    db_url = env_file.get("DB_URL", "")
    if db_url.startswith("jdbc:"):
        db_url = db_url[len("jdbc:") :]
    parsed = urlparse(db_url)
    db_name = parsed.path.lstrip("/")
    username = env_file.get("DB_USERNAME", "")
    password = env_file.get("DB_PASSWORD", "")
    if not db_name or not username:
        return {"ok": False, "error": "missing DB_URL or DB_USERNAME in env file"}

    docker_check = run(["docker", "inspect", "-f", "{{.State.Running}}", DB_CONTAINER], timeout=8)
    if not docker_check["ok"] or docker_check["stdout"].strip() != "true":
        return {
            "ok": False,
            "database": db_name,
            "container": DB_CONTAINER,
            "error": "database container is not running or docker is unavailable",
            "detail": docker_check["stderr"].strip(),
        }

    sql = '''
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';
SHOW VARIABLES LIKE 'max_connections';
SELECT COUNT(*) AS processlist_count FROM information_schema.PROCESSLIST;
'''
    mysql_script = f'''\
export MYSQL_PWD={shlex.quote(password)}
exec mysql --default-character-set=utf8mb4 -u {shlex.quote(username)} {shlex.quote(db_name)} -N -B <<'SQL_MONITOR'
{sql}
SQL_MONITOR
'''
    mysql_cmd = [
        "docker",
        "exec",
        "-i",
        DB_CONTAINER,
        "sh",
        "-s",
    ]
    result = run(mysql_cmd, timeout=12, input_text=mysql_script)
    if not result["ok"]:
        return {
            "ok": False,
            "database": db_name,
            "container": DB_CONTAINER,
            "error": result["stderr"].strip() or result["stdout"].strip(),
        }

    values = {}
    for line in result["stdout"].splitlines():
        parts = line.split("\t")
        if len(parts) == 2:
            values[parts[0]] = parts[1]
        elif len(parts) == 1 and parts[0].isdigit():
            values["processlist_count"] = parts[0]

    def to_int(key):
        try:
            return int(values.get(key, 0))
        except ValueError:
            return 0

    connected = to_int("Threads_connected")
    max_connections = to_int("max_connections")
    return {
        "ok": True,
        "database": db_name,
        "container": DB_CONTAINER,
        "threads_connected": connected,
        "threads_running": to_int("Threads_running"),
        "max_connections": max_connections,
        "processlist_count": to_int("processlist_count"),
        "connection_used_percent": round(100.0 * connected / max_connections, 2)
        if max_connections
        else None,
    }


def tail_file(path, line_count):
    result = run(["tail", "-n", str(line_count), path], timeout=8)
    if not result["ok"]:
        return None, result["stderr"].strip() or result["stdout"].strip()
    return result["stdout"].splitlines(), None


def collect_logs():
    candidates = []
    for pattern in (
        "/www/wwwlogs/*.log",
        "/var/log/nginx/*.log",
        "/www/wwwroot/kick-backend/*.log",
    ):
        candidates.extend(glob.glob(pattern))

    selected = []
    seen = set()
    for path in sorted(candidates):
        if path in seen:
            continue
        seen.add(path)
        name = os.path.basename(path).lower()
        if any(token in name for token in ("error", "access", "kick", "backend")):
            selected.append(path)
        if len(selected) >= 8:
            break

    error_pattern = re.compile(
        r"(\[(?:error|crit|alert|emerg)\]|\b(?:ERROR|WARN|FATAL|Exception|Traceback|panic|failed)\b)"
    )
    logs = []
    for path in selected:
        lines, error = tail_file(path, LOG_LINES)
        if error:
            logs.append({"source": path, "ok": False, "error": error})
            continue
        matches = [line for line in lines if error_pattern.search(line)]
        status_5xx = sum(1 for line in lines if re.search(r"\s5\d\d\s", line))
        logs.append(
            {
                "source": path,
                "ok": True,
                "lines_checked": len(lines),
                "error_like_count": len(matches),
                "http_5xx_count": status_5xx,
                "recent_error_like": matches[-5:],
            }
        )

    journal = []
    for service in ("nginx", "kick-backend.service"):
        result = run(
            ["journalctl", "-u", service, "-n", str(LOG_LINES), "--no-pager"],
            timeout=10,
        )
        lines = result["stdout"].splitlines()
        matches = [line for line in lines if error_pattern.search(line)]
        journal.append(
            {
                "source": f"journal:{service}",
                "ok": result["ok"],
                "lines_checked": len(lines),
                "error_like_count": len(matches),
                "recent_error_like": matches[-5:],
                "error": "" if result["ok"] else result["stderr"].strip(),
            }
        )
    return {"files": logs, "journals": journal}


def collect_http():
    items = []
    context = ssl._create_unverified_context()
    for url in HEALTH_ENDPOINTS:
        started = time.time()
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "kick-lan-monitor/1.0"})
            with urllib.request.urlopen(request, timeout=8, context=context) as response:
                response.read(256)
                status = response.getcode()
            elapsed_ms = round((time.time() - started) * 1000, 2)
            items.append({"url": url, "ok": 200 <= status < 400, "status": status, "elapsed_ms": elapsed_ms})
        except Exception as exc:
            elapsed_ms = round((time.time() - started) * 1000, 2)
            status = getattr(exc, "code", None)
            items.append({"url": url, "ok": False, "status": status, "elapsed_ms": elapsed_ms, "error": str(exc)})
    return {"items": items}


def main():
    started = time.time()
    uptime_seconds = 0.0
    try:
        uptime_seconds = float(Path("/proc/uptime").read_text().split()[0])
    except Exception:
        pass

    snapshot = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "hostname": socket.gethostname(),
        "uptime_seconds": round(uptime_seconds, 2),
        "load_average": list(os.getloadavg()) if hasattr(os, "getloadavg") else [],
        "cpu": collect_cpu(),
        "memory": collect_memory(),
        "disks": collect_disks(),
        "network": collect_network(),
        "services": collect_services(),
        "http": collect_http(),
        "database": collect_database(),
        "logs": collect_logs(),
    }
    snapshot["collector_elapsed_seconds"] = round(time.time() - started, 2)
    print(json.dumps(snapshot, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
"""


@dataclass(frozen=True)
class Thresholds:
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    db_connection_percent: float
    log_error_count: int


SENSITIVE_ENV_NAMES = (
    "LAN_MONITOR_PASSWORD",
    "TG_BOT_TOKEN",
    "DB_PASSWORD",
    "JWT_SECRET",
)


def redact_text(text: str, extra_secrets: list[str] | tuple[str, ...] | None = None) -> str:
    redacted = text
    secrets = [os.environ.get(name, "") for name in SENSITIVE_ENV_NAMES]
    if extra_secrets:
        secrets.extend(extra_secrets)
    for secret in sorted({item for item in secrets if item and len(item) >= 4}, key=len, reverse=True):
        redacted = redacted.replace(secret, "***")
    return redacted


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect a read-only health snapshot from the LAN server.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--host", default=os.environ.get("LAN_MONITOR_HOST", DEFAULT_HOST))
    parser.add_argument("--port", type=int, default=int(os.environ.get("LAN_MONITOR_PORT", "22")))
    parser.add_argument("--user", default=os.environ.get("LAN_MONITOR_USER", DEFAULT_USER))
    parser.add_argument(
        "--password-env",
        default="LAN_MONITOR_PASSWORD",
        help="Environment variable containing the SSH password.",
    )
    parser.add_argument("--key-file", default=os.environ.get("LAN_MONITOR_KEY_FILE"))
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--sample-seconds", type=float, default=1.0)
    parser.add_argument("--log-lines", type=int, default=80)
    parser.add_argument("--db-container", default=os.environ.get("LAN_MONITOR_DB_CONTAINER", DEFAULT_DB_CONTAINER))
    parser.add_argument("--json", action="store_true", help="Print raw JSON instead of a human report.")
    parser.add_argument("--fail-on-alert", action="store_true", help="Exit with code 2 when alerts are present.")
    parser.add_argument("--cpu-warn", type=float, default=85.0)
    parser.add_argument("--memory-warn", type=float, default=85.0)
    parser.add_argument("--disk-warn", type=float, default=85.0)
    parser.add_argument("--db-connection-warn", type=float, default=80.0)
    parser.add_argument("--log-error-warn", type=int, default=1)
    parser.add_argument(
        "--service",
        action="append",
        dest="services",
        help="Service to check. Repeat to override defaults.",
    )
    parser.add_argument(
        "--health-endpoint",
        action="append",
        dest="health_endpoints",
        help="HTTP endpoint to check. Repeat to override defaults.",
    )
    return parser.parse_args()


def require_paramiko():
    try:
        import paramiko  # type: ignore

        return paramiko
    except ImportError:
        print(
            "Missing dependency: paramiko. Install it with `python -m pip install paramiko`.",
            file=sys.stderr,
        )
        raise SystemExit(1)


def build_remote_command(args: argparse.Namespace) -> str:
    services = args.services or list(DEFAULT_SERVICES)
    health_endpoints = args.health_endpoints or list(DEFAULT_HEALTH_ENDPOINTS)
    env = {
        "MONITOR_INTERVAL": str(args.sample_seconds),
        "MONITOR_LOG_LINES": str(args.log_lines),
        "MONITOR_DB_CONTAINER": args.db_container,
        "MONITOR_SERVICES": ",".join(services),
        "MONITOR_HEALTH_ENDPOINTS": ",".join(health_endpoints),
    }
    exports = " ".join(f"{key}={shlex.quote(value)}" for key, value in env.items())
    return f"{exports} python3 - <<'PY_MONITOR'\n{REMOTE_COLLECTOR}\nPY_MONITOR"


def collect_snapshot(args: argparse.Namespace) -> dict[str, Any]:
    paramiko = require_paramiko()
    password = os.environ.get(args.password_env)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            hostname=args.host,
            port=args.port,
            username=args.user,
            password=password,
            key_filename=args.key_file,
            timeout=args.timeout,
            banner_timeout=args.timeout,
            auth_timeout=args.timeout,
        )
        command = build_remote_command(args)
        _, stdout, stderr = client.exec_command(command, timeout=max(args.timeout, 60))
        stdout_text = stdout.read().decode("utf-8", "replace")
        stderr_text = stderr.read().decode("utf-8", "replace")
        exit_code = stdout.channel.recv_exit_status()
    finally:
        client.close()

    if exit_code != 0:
        raise RuntimeError(redact_text(f"remote collector failed with code {exit_code}: {stderr_text.strip()}"))
    try:
        return json.loads(stdout_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            redact_text(f"remote collector returned invalid JSON: {exc}\n{stdout_text}\n{stderr_text}")
        ) from exc


def format_bytes(value: float | int | None) -> str:
    if value is None:
        return "-"
    units = ("B", "KiB", "MiB", "GiB", "TiB")
    amount = float(value)
    for unit in units:
        if abs(amount) < 1024 or unit == units[-1]:
            return f"{amount:.1f} {unit}"
        amount /= 1024
    return f"{amount:.1f} TiB"


def format_seconds(seconds: float | int | None) -> str:
    if seconds is None:
        return "-"
    seconds = int(seconds)
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, _ = divmod(seconds, 60)
    if days:
        return f"{days}d {hours}h {minutes}m"
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def find_alerts(snapshot: dict[str, Any], thresholds: Thresholds) -> list[str]:
    alerts: list[str] = []
    cpu = snapshot.get("cpu", {}).get("usage_percent")
    if cpu is not None and cpu >= thresholds.cpu_percent:
        alerts.append(f"CPU usage {cpu}% >= {thresholds.cpu_percent}%")

    memory = snapshot.get("memory", {}).get("used_percent")
    if memory is not None and memory >= thresholds.memory_percent:
        alerts.append(f"memory usage {memory}% >= {thresholds.memory_percent}%")

    for disk in snapshot.get("disks", {}).get("items", []):
        used_percent = disk.get("used_percent")
        if used_percent is not None and used_percent >= thresholds.disk_percent:
            alerts.append(f"disk {disk.get('mountpoint')} usage {used_percent}% >= {thresholds.disk_percent}%")

    for service in snapshot.get("services", {}).get("items", []):
        if not service.get("ok"):
            alerts.append(f"service {service.get('name')} is {service.get('active')}")

    for item in snapshot.get("http", {}).get("items", []):
        if not item.get("ok"):
            alerts.append(f"HTTP check failed: {item.get('url')} status={item.get('status')} error={item.get('error', '')}")

    database = snapshot.get("database", {})
    if not database.get("ok"):
        alerts.append(f"database check failed: {database.get('error', 'unknown error')}")
    else:
        db_percent = database.get("connection_used_percent")
        if db_percent is not None and db_percent >= thresholds.db_connection_percent:
            alerts.append(f"DB connections {db_percent}% >= {thresholds.db_connection_percent}%")

    for log in snapshot.get("logs", {}).get("files", []) + snapshot.get("logs", {}).get("journals", []):
        count = int(log.get("error_like_count") or 0) + int(log.get("http_5xx_count") or 0)
        if count >= thresholds.log_error_count:
            alerts.append(f"log {log.get('source')} has {count} recent error-like entries")
    return alerts


def print_human_report(snapshot: dict[str, Any], alerts: list[str]) -> None:
    print(f"LAN server monitor: {snapshot.get('hostname')} @ {snapshot.get('timestamp')}")
    print(f"Uptime: {format_seconds(snapshot.get('uptime_seconds'))}")
    load_average = snapshot.get("load_average") or []
    if load_average:
        print("Load average: " + ", ".join(f"{item:.2f}" for item in load_average))

    cpu = snapshot.get("cpu", {})
    memory = snapshot.get("memory", {})
    print(f"CPU: {cpu.get('usage_percent', '-')}% over {cpu.get('sample_seconds', '-')}s")
    print(
        "Memory: "
        f"{memory.get('used_percent', '-')}% "
        f"({format_bytes(memory.get('used_bytes'))} / {format_bytes(memory.get('total_bytes'))})"
    )
    print(
        "Swap: "
        f"{memory.get('swap_used_percent', '-')}% "
        f"({format_bytes(memory.get('swap_used_bytes'))} / {format_bytes(memory.get('swap_total_bytes'))})"
    )

    print("\nDisks:")
    for disk in snapshot.get("disks", {}).get("items", []):
        print(
            f"  {disk.get('mountpoint')}: {disk.get('used_percent')}% "
            f"({format_bytes(disk.get('used_bytes'))} / {format_bytes(disk.get('total_bytes'))})"
        )

    print("\nNetwork:")
    for iface in snapshot.get("network", {}).get("items", []):
        print(
            f"  {iface.get('interface')}: "
            f"rx {format_bytes(iface.get('rx_bytes_per_second'))}/s, "
            f"tx {format_bytes(iface.get('tx_bytes_per_second'))}/s"
        )

    print("\nServices:")
    for service in snapshot.get("services", {}).get("items", []):
        status = "OK" if service.get("ok") else "WARN"
        print(f"  [{status}] {service.get('name')}: {service.get('active')} ({service.get('enabled')})")

    print("\nHTTP:")
    for item in snapshot.get("http", {}).get("items", []):
        status = "OK" if item.get("ok") else "WARN"
        print(f"  [{status}] {item.get('status')} {item.get('elapsed_ms')}ms {item.get('url')}")

    database = snapshot.get("database", {})
    print("\nDatabase:")
    if database.get("ok"):
        print(
            f"  {database.get('database')} in {database.get('container')}: "
            f"threads_connected={database.get('threads_connected')}, "
            f"threads_running={database.get('threads_running')}, "
            f"max_connections={database.get('max_connections')}, "
            f"used={database.get('connection_used_percent')}%"
        )
    else:
        print(f"  WARN {database.get('error')}")

    print("\nLogs:")
    for log in snapshot.get("logs", {}).get("files", []):
        if log.get("ok"):
            print(
                f"  {log.get('source')}: "
                f"errors={log.get('error_like_count')}, "
                f"5xx={log.get('http_5xx_count', 0)}, "
                f"lines={log.get('lines_checked')}"
            )
        else:
            print(f"  {log.get('source')}: unreadable ({log.get('error')})")
    for log in snapshot.get("logs", {}).get("journals", []):
        status = "OK" if log.get("ok") else "WARN"
        print(f"  [{status}] {log.get('source')}: errors={log.get('error_like_count')}, lines={log.get('lines_checked')}")

    print("\nAlerts:")
    if alerts:
        for alert in alerts:
            print(f"  - {alert}")
    else:
        print("  none")


def main() -> int:
    args = parse_args()
    thresholds = Thresholds(
        cpu_percent=args.cpu_warn,
        memory_percent=args.memory_warn,
        disk_percent=args.disk_warn,
        db_connection_percent=args.db_connection_warn,
        log_error_count=args.log_error_warn,
    )
    try:
        snapshot = collect_snapshot(args)
    except Exception as exc:
        print(f"monitor failed: {redact_text(str(exc))}", file=sys.stderr)
        return 1

    alerts = find_alerts(snapshot, thresholds)
    if args.json:
        output = dict(snapshot)
        output["alerts"] = alerts
        print(json.dumps(output, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print_human_report(snapshot, alerts)

    if alerts and args.fail_on_alert:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
