#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOY_ENV_DEFAULT="/www/wwwroot/kick-deploy/deploy.env"
HEALTH_ENDPOINT_DEFAULT="http://127.0.0.1:8080/api/public/home-overview"
BACKUP_ROOT_DEFAULT="/www/wwwroot/kick-deploy/backups"
HEALTH_RETRY_COUNT_DEFAULT=24
HEALTH_RETRY_DELAY_DEFAULT=5

DEPLOY_ENV_PATH="${DEPLOY_ENV:-$DEPLOY_ENV_DEFAULT}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-$HEALTH_ENDPOINT_DEFAULT}"
BACKUP_ROOT="${BACKUP_ROOT:-$BACKUP_ROOT_DEFAULT}"
HEALTH_RETRY_COUNT="${HEALTH_RETRY_COUNT:-$HEALTH_RETRY_COUNT_DEFAULT}"
HEALTH_RETRY_DELAY="${HEALTH_RETRY_DELAY:-$HEALTH_RETRY_DELAY_DEFAULT}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

validate_directory() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing directory: $path"
}

validate_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing file: $path"
}

health_check() {
  local attempt
  for (( attempt=1; attempt<=HEALTH_RETRY_COUNT; attempt++ )); do
    if curl -fsS "$HEALTH_ENDPOINT" >/dev/null; then
      log "health check passed on attempt ${attempt}"
      return 0
    fi
    sleep "$HEALTH_RETRY_DELAY"
  done
  return 1
}

rollback() {
  if [[ "${ROLLBACK_READY:-0}" != "1" ]]; then
    return 0
  fi

  log "starting rollback"

  if [[ -d "$WEB_RUNTIME_DIR" ]]; then
    rm -rf "$WEB_RUNTIME_DIR"
  fi

  if [[ -d "${BACKUP_DIR}/kick-web" ]]; then
    mv "${BACKUP_DIR}/kick-web" "$WEB_RUNTIME_DIR"
  fi

  if [[ -f "${BACKUP_DIR}/forum-1.0.0.jar" ]]; then
    install -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0644 \
      "${BACKUP_DIR}/forum-1.0.0.jar" \
      "${BACKEND_RUNTIME_DIR}/forum-1.0.0.jar"
  fi

  systemctl restart "$BACKEND_SERVICE" || true
  if health_check; then
    log "rollback recovered service"
  else
    log "rollback completed but service still unhealthy"
  fi
}

on_error() {
  local exit_code=$?
  log "deployment failed with exit code ${exit_code}"
  rollback
  exit "$exit_code"
}

trap on_error ERR

[[ -f "$DEPLOY_ENV_PATH" ]] || fail "missing deploy env: $DEPLOY_ENV_PATH"
# shellcheck disable=SC1090
source "$DEPLOY_ENV_PATH"

: "${REPO_DIR:?missing REPO_DIR}"
: "${WEB_RUNTIME_DIR:?missing WEB_RUNTIME_DIR}"
: "${BACKEND_RUNTIME_DIR:?missing BACKEND_RUNTIME_DIR}"
: "${BACKEND_SERVICE:?missing BACKEND_SERVICE}"
: "${DEPLOY_USER:?missing DEPLOY_USER}"
: "${DEPLOY_GROUP:?missing DEPLOY_GROUP}"

if [[ "$ROOT_DIR" != "$REPO_DIR" ]]; then
  fail "script must run from canonical repo: expected $REPO_DIR but got $ROOT_DIR"
fi

require_command git
require_command npm
require_command mvn
require_command curl
require_command systemctl
require_command install

validate_directory "$REPO_DIR"
validate_directory "$REPO_DIR/reace_web"
validate_directory "$REPO_DIR/excel-forum-backend"
validate_directory "$WEB_RUNTIME_DIR"
validate_directory "$BACKEND_RUNTIME_DIR"
validate_file "$BACKEND_RUNTIME_DIR/.env.production"
validate_file "$BACKEND_RUNTIME_DIR/forum-1.0.0.jar"

timestamp="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${timestamp}"
WEB_PARENT_DIR="$(dirname "$WEB_RUNTIME_DIR")"
WEB_RELEASE_DIR="${WEB_PARENT_DIR}/.kick-web-release-${timestamp}"
WEB_OLD_DIR="${WEB_PARENT_DIR}/.kick-web-old-${timestamp}"
ROLLBACK_READY=0

mkdir -p "$BACKUP_ROOT"

log "repo dir: $REPO_DIR"
log "git branch: $(git -C "$REPO_DIR" branch --show-current)"
if [[ -n "$(git -C "$REPO_DIR" status --short)" ]]; then
  log "warning: deploy repo has local modifications"
  git -C "$REPO_DIR" status --short
else
  log "deploy repo worktree is clean"
fi

log "building frontend"
(cd "$REPO_DIR/reace_web" && npm ci && npm run build)

log "building backend"
(cd "$REPO_DIR/excel-forum-backend" && mvn -q -DskipTests package)

validate_directory "$REPO_DIR/reace_web/dist"
validate_file "$REPO_DIR/excel-forum-backend/target/forum-1.0.0.jar"

log "creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -a "$WEB_RUNTIME_DIR" "${BACKUP_DIR}/kick-web"
cp -a "$BACKEND_RUNTIME_DIR/forum-1.0.0.jar" "${BACKUP_DIR}/forum-1.0.0.jar"
ROLLBACK_READY=1

log "preparing frontend release directory"
rm -rf "$WEB_RELEASE_DIR"
rm -rf "$WEB_OLD_DIR"
mkdir -p "$WEB_RELEASE_DIR"
cp -a "$REPO_DIR/reace_web/dist/." "$WEB_RELEASE_DIR/"
chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$WEB_RELEASE_DIR"

log "publishing frontend assets"
mv "$WEB_RUNTIME_DIR" "$WEB_OLD_DIR"
mv "$WEB_RELEASE_DIR" "$WEB_RUNTIME_DIR"
rm -rf "$WEB_OLD_DIR"

log "publishing backend jar"
install -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0644 \
  "$REPO_DIR/excel-forum-backend/target/forum-1.0.0.jar" \
  "$BACKEND_RUNTIME_DIR/forum-1.0.0.jar"

log "restarting backend service"
systemctl restart "$BACKEND_SERVICE"

log "waiting for backend health"
health_check

log "deployment succeeded"
