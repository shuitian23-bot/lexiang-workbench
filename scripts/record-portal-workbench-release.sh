#!/bin/bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <new|formal> <record-key> <log-title>" >&2
  exit 1
fi

ENVIRONMENT=$1
RECORD_KEY=$2
LOG_TITLE=$3
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
PUBLISHER=${PORTAL_RELEASE_PUBLISHER:-${SUDO_USER:-$(id -un)}}
VERSION=${PORTAL_RELEASE_VERSION:-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)}
RELEASED_AT=${PORTAL_RELEASED_AT:-$(TZ=Asia/Shanghai date '+%Y-%m-%d %H:%M:%S')}
LEDGER_PATH=${PORTAL_RELEASE_LEDGER_PATH:-/opt/projects/portal-workbench-release-ledger.json}
NEW_OUTPUT=${PORTAL_RELEASE_NEW_OUTPUT:-/opt/projects/lexiang-new/public/admin-vue/poc-release-ledger.json}
FORMAL_OUTPUT=${PORTAL_RELEASE_FORMAL_OUTPUT:-/opt/projects/lexiang/public/admin-vue/poc-release-ledger.json}

node "$SCRIPT_DIR/portal-release-ledger.mjs" record \
  --environment "$ENVIRONMENT" \
  --key "$RECORD_KEY" \
  --title "$LOG_TITLE" \
  --publisher "$PUBLISHER" \
  --released-at "$RELEASED_AT" \
  --version "$VERSION" \
  --ledger "$LEDGER_PATH" \
  --output "$NEW_OUTPUT" \
  --output "$FORMAL_OUTPUT"

echo "Recorded $ENVIRONMENT release for $LOG_TITLE by $PUBLISHER at $RELEASED_AT ($VERSION)"
