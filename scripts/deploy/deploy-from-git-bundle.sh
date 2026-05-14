#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOY_ENV_DEFAULT="/www/wwwroot/excelcc/kick-deploy/deploy.env"

DEPLOY_ENV_PATH="${DEPLOY_ENV:-$DEPLOY_ENV_DEFAULT}"

log() {
  printf '[bundle-deploy] %s\n' "$*"
}

fail() {
  printf '[bundle-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/deploy/deploy-from-git-bundle.sh /path/to/release.bundle

Environment:
  DEPLOY_ENV             Deploy env path. Defaults to /www/wwwroot/excelcc/kick-deploy/deploy.env.
  BRANCH or GIT_BRANCH   Target branch. Usually set in DEPLOY_ENV.
  BUNDLE_REF             Source ref inside the bundle. Defaults to refs/heads/<target branch>.
  DEPLOY_AFTER_IMPORT=0  Import only; do not run production-deploy.sh.

The script imports a Git bundle into the canonical deploy repo with a
fast-forward-only branch update, then runs production-deploy.sh with
GIT_PULL_BEFORE_BUILD=0.
USAGE
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

bundle_path="${1:-}"
[[ -n "$bundle_path" ]] || fail "missing bundle path"
[[ -f "$bundle_path" ]] || fail "missing bundle file: $bundle_path"

[[ -f "$DEPLOY_ENV_PATH" ]] || fail "missing deploy env: $DEPLOY_ENV_PATH"
# shellcheck disable=SC1090
source "$DEPLOY_ENV_PATH"

: "${REPO_DIR:?missing REPO_DIR}"

GIT_BRANCH="${GIT_BRANCH:-${BRANCH:-}}"
[[ -n "$GIT_BRANCH" ]] || fail "missing branch; set BRANCH or GIT_BRANCH in $DEPLOY_ENV_PATH"

if [[ "$ROOT_DIR" != "$REPO_DIR" ]]; then
  fail "script must run from canonical repo: expected $REPO_DIR but got $ROOT_DIR"
fi

require_command git
require_command bash
require_command date

repo_status="$(git -C "$REPO_DIR" status --short)"
if [[ -n "$repo_status" ]]; then
  printf '%s\n' "$repo_status"
  fail "deploy repo must be clean before importing a bundle"
fi

bundle_ref="${BUNDLE_REF:-refs/heads/${GIT_BRANCH}}"
if [[ "$bundle_ref" != refs/* ]]; then
  bundle_ref="refs/heads/${bundle_ref}"
fi

log "verifying bundle: $bundle_path"
git -C "$REPO_DIR" bundle verify "$bundle_path" >/dev/null

bundle_has_ref=0
available_refs=()
while read -r _ ref; do
  [[ -n "${ref:-}" ]] || continue
  available_refs+=("$ref")
  if [[ "$ref" == "$bundle_ref" ]]; then
    bundle_has_ref=1
  fi
done < <(git -C "$REPO_DIR" bundle list-heads "$bundle_path")

if [[ "$bundle_has_ref" != "1" ]]; then
  fail "bundle does not contain ${bundle_ref}; available refs: ${available_refs[*]:-none}"
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
safe_branch="${GIT_BRANCH//\//-}"
safe_branch="${safe_branch// /-}"
tmp_ref="refs/bundle/${safe_branch}-${timestamp}"

cleanup() {
  git -C "$REPO_DIR" update-ref -d "$tmp_ref" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "importing ${bundle_ref} into temporary ref"
git -C "$REPO_DIR" fetch "$bundle_path" "${bundle_ref}:${tmp_ref}"

target_commit="$(git -C "$REPO_DIR" rev-parse "$tmp_ref")"
target_short="$(git -C "$REPO_DIR" rev-parse --short "$target_commit")"

if git -C "$REPO_DIR" show-ref --verify --quiet "refs/heads/${GIT_BRANCH}"; then
  current_commit="$(git -C "$REPO_DIR" rev-parse "refs/heads/${GIT_BRANCH}")"
  if ! git -C "$REPO_DIR" merge-base --is-ancestor "$current_commit" "$target_commit"; then
    fail "bundle target ${target_short} is not a fast-forward from local ${GIT_BRANCH}"
  fi

  current_branch="$(git -C "$REPO_DIR" branch --show-current)"
  if [[ "$current_branch" != "$GIT_BRANCH" ]]; then
    log "switching git branch from ${current_branch:-detached} to ${GIT_BRANCH}"
    git -C "$REPO_DIR" checkout "$GIT_BRANCH"
  fi

  log "fast-forwarding ${GIT_BRANCH} to ${target_short}"
  git -C "$REPO_DIR" merge --ff-only "$tmp_ref"
else
  log "creating ${GIT_BRANCH} at ${target_short}"
  git -C "$REPO_DIR" checkout -b "$GIT_BRANCH" "$tmp_ref"
fi

log "repo branch: $(git -C "$REPO_DIR" branch --show-current)"
log "repo commit: $(git -C "$REPO_DIR" rev-parse --short HEAD)"

if [[ "${DEPLOY_AFTER_IMPORT:-1}" == "1" ]]; then
  log "running production deploy without GitHub pull"
  DEPLOY_ENV="$DEPLOY_ENV_PATH" GIT_PULL_BEFORE_BUILD=0 \
    bash "$REPO_DIR/scripts/deploy/production-deploy.sh"
else
  log "import complete; DEPLOY_AFTER_IMPORT=0 so deployment was not run"
fi
