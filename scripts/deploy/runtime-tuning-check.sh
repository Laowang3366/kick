#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="${SERVICE:-kick-backend.service}"
ENV_FILE="${ENV_FILE:-/www/wwwroot/kick-backend/.env.production}"
PORT="${PORT:-8080}"
APP_CONFIG="${APP_CONFIG:-excel-forum-backend/src/main/resources/application.yml}"

section() {
  printf '\n== %s ==\n' "$1"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

redact_env_file() {
  local file="$1"
  if [[ ! -r "$file" ]]; then
    printf 'env file not readable: %s\n' "$file"
    return 0
  fi

  awk '
    /^[[:space:]]*($|#)/ { next }
    /^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=/ {
      line=$0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      eq=index(line, "=")
      key=substr(line, 1, eq - 1)
      value=substr(line, eq + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
      if (key ~ /(PASS|PASSWORD|SECRET|TOKEN|KEY|CREDENTIAL|PRIVATE)/) {
        print key "=<redacted>"
      } else {
        print key "=" value
      }
    }
  ' "$file"
}

section "Host"
hostname || true
printf 'date: %s\n' "$(date -Is 2>/dev/null || date)"
if have nproc; then
  printf 'cpu_count: %s\n' "$(nproc)"
fi
if [[ -r /proc/meminfo ]]; then
  awk '/MemTotal|MemAvailable/ { print $1 " " $2 " " $3 }' /proc/meminfo
fi

section "Systemd service"
if have systemctl; then
  systemctl is-active "$SERVICE" || true
  systemctl show "$SERVICE" \
    --property=MainPID \
    --property=ExecStart \
    --property=EnvironmentFiles \
    --property=FragmentPath \
    --property=DropInPaths \
    --no-pager || true
  systemctl status "$SERVICE" --no-pager -l || true
else
  printf 'systemctl not found\n'
fi

section "Java process"
main_pid=""
if have systemctl; then
  main_pid="$(systemctl show "$SERVICE" --property=MainPID --value 2>/dev/null || true)"
fi
if [[ -n "$main_pid" && "$main_pid" != "0" ]] && have ps; then
  ps -o pid,ppid,etime,rss,vsz,cmd -p "$main_pid" || true
fi
if have pgrep; then
  pgrep -af 'java|forum-1.0.0.jar' || true
fi
if [[ -n "$main_pid" && "$main_pid" != "0" && -r "/proc/${main_pid}/cmdline" ]]; then
  tr '\0' ' ' <"/proc/${main_pid}/cmdline"
  printf '\n'
fi

section "Runtime env file"
printf 'path: %s\n' "$ENV_FILE"
redact_env_file "$ENV_FILE"

section "Selected runtime keys"
if [[ -r "$ENV_FILE" ]]; then
  redact_env_file "$ENV_FILE" | grep -E '^(JAVA_OPTS|SERVER_TOMCAT_|DB_POOL_|REDIS_)' || true
else
  printf 'no readable env file\n'
fi

section "Application defaults"
if [[ -r "$APP_CONFIG" ]]; then
  grep -E 'SERVER_TOMCAT_|DB_POOL_|REDIS_' "$APP_CONFIG" || true
else
  printf 'application config not readable: %s\n' "$APP_CONFIG"
fi

section "Listen backlog and sockets"
if have sysctl; then
  sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog net.ipv4.ip_local_port_range 2>/dev/null || true
fi
if have ss; then
  ss -ltnpi "sport = :${PORT}" || true
  ss -ant "sport = :${PORT}" | awk 'NR == 1 || /ESTAB|SYN-RECV|TIME-WAIT|CLOSE-WAIT/' || true
else
  printf 'ss not found\n'
fi

section "Database and Redis listeners"
if have ss; then
  ss -ltnp '( sport = :3306 or sport = :6379 )' || true
fi
if have docker; then
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | grep -Ei 'mysql|redis' || true
fi

section "Notes"
printf 'This script is read-only. It prints configured env values, kernel backlog limits, current service state, and socket state.\n'
printf 'JAVA_OPTS in the env file has no effect unless the service ExecStart expands it before java -jar.\n'
