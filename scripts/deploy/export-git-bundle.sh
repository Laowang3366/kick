#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUNDLE_DIR_DEFAULT="${TMPDIR:-/tmp}/kick-deploy-bundles"

log() {
  printf '[bundle-export] %s\n' "$*"
}

fail() {
  printf '[bundle-export] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/deploy/export-git-bundle.sh [output.bundle]

Environment:
  BRANCH or GIT_BRANCH  Branch ref to export. Defaults to the current branch.
  BUNDLE_DIR            Output directory when output.bundle is not provided.
  OVERWRITE_BUNDLE=1    Allow replacing an existing bundle file.

The script exports the committed branch history as a Git bundle for the
server-side deploy-from-git-bundle.sh fallback flow.
USAGE
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command git
require_command date
require_command mkdir
require_command dirname
require_command basename

GIT_BRANCH="${GIT_BRANCH:-${BRANCH:-}}"
if [[ -z "$GIT_BRANCH" ]]; then
  GIT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
fi
[[ -n "$GIT_BRANCH" ]] || fail "missing branch; set BRANCH/GIT_BRANCH or check out a branch"

source_ref="refs/heads/${GIT_BRANCH}"
git -C "$ROOT_DIR" show-ref --verify --quiet "$source_ref" \
  || fail "local branch not found: $GIT_BRANCH"

if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet; then
  git -C "$ROOT_DIR" status --short --untracked-files=no
  fail "tracked changes must be committed before creating a deployment bundle"
fi

untracked_status="$(git -C "$ROOT_DIR" status --short --untracked-files=all)"
if [[ -n "$untracked_status" ]]; then
  log "warning: untracked files are not included in the bundle"
  printf '%s\n' "$untracked_status"
fi

commit_short="$(git -C "$ROOT_DIR" rev-parse --short "$source_ref")"
timestamp="$(date +%Y%m%d-%H%M%S)"
safe_branch="${GIT_BRANCH//\//-}"
safe_branch="${safe_branch// /-}"

output_path="${1:-${BUNDLE_OUTPUT:-${BUNDLE_DIR:-$BUNDLE_DIR_DEFAULT}/${safe_branch}-${timestamp}-${commit_short}.bundle}}"
output_dir="$(dirname "$output_path")"

mkdir -p "$output_dir"

if [[ -e "$output_path" && "${OVERWRITE_BUNDLE:-0}" != "1" ]]; then
  fail "bundle already exists: $output_path"
fi

log "exporting ${GIT_BRANCH} at ${commit_short}"
git -C "$ROOT_DIR" bundle create "$output_path" "$source_ref"
git -C "$ROOT_DIR" bundle verify "$output_path" >/dev/null

log "bundle written: $output_path"
log "upload target example: /www/wwwroot/excelcc/kick-deploy/bundles/$(basename "$output_path")"
