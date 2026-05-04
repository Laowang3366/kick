#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DEFAULT="${SCRIPT_DIR}/kick-lan.conf.template"
SITE_CONF_DEFAULT="/etc/nginx/sites-available/kick-lan.conf"
BACKUP_DIR_DEFAULT="/etc/nginx/sites-available"

APPLY=0
TEMPLATE_PATH="${TEMPLATE_PATH:-$TEMPLATE_DEFAULT}"
SITE_CONF="${SITE_CONF:-$SITE_CONF_DEFAULT}"
BACKUP_DIR="${BACKUP_DIR:-$BACKUP_DIR_DEFAULT}"

log() {
  printf '[nginx-lan] %s\n' "$*"
}

fail() {
  printf '[nginx-lan] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/deploy/nginx/install-kick-lan-nginx.sh [--dry-run|--apply]

Default mode is --dry-run. --apply is required before the script writes
/etc/nginx/sites-available/kick-lan.conf or reloads Nginx.

Environment:
  TEMPLATE_PATH  Source template. Defaults to scripts/deploy/nginx/kick-lan.conf.template.
  SITE_CONF      Target site config. Defaults to /etc/nginx/sites-available/kick-lan.conf.
  BACKUP_DIR     Backup directory. Defaults to /etc/nginx/sites-available.
USAGE
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --dry-run)
      APPLY=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

[[ -f "$TEMPLATE_PATH" ]] || fail "missing template: $TEMPLATE_PATH"

require_command nginx
require_command date

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_path="${BACKUP_DIR}/$(basename "$SITE_CONF").${timestamp}.bak"

log "template: $TEMPLATE_PATH"
log "target: $SITE_CONF"

if [[ "$APPLY" != "1" ]]; then
  log "dry run; no files will be changed"
  if [[ -f "$SITE_CONF" ]] && command -v diff >/dev/null 2>&1; then
    diff -u "$SITE_CONF" "$TEMPLATE_PATH" || true
  else
    log "target file missing or diff unavailable; showing planned install only"
  fi
  nginx -t
  exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
  fail "--apply must run as root because it writes /etc/nginx and reloads nginx"
fi

mkdir -p "$BACKUP_DIR"

if [[ -f "$SITE_CONF" ]]; then
  cp -a "$SITE_CONF" "$backup_path"
  log "backup written: $backup_path"
else
  log "target does not exist; no backup created"
fi

restore_backup() {
  if [[ -f "$backup_path" ]]; then
    cp -a "$backup_path" "$SITE_CONF"
    log "restored backup after failed validation"
    nginx -t >/dev/null 2>&1 || true
  fi
}

trap restore_backup ERR

install -m 0644 "$TEMPLATE_PATH" "$SITE_CONF"
nginx -t
systemctl reload nginx

trap - ERR
log "nginx reloaded with $SITE_CONF"
if [[ -f "$backup_path" ]]; then
  log "rollback backup: $backup_path"
fi
