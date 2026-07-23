#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://leaibot.cn}"
repo_dir="${REPO_DIR:-/opt/projects/lexiang}"
extension_file="$repo_dir/public/lexiang-admin-extension/closed-loop-menu.js"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

check_url() {
  local path="$1"
  local expected="${2:-200}"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$base_url$path")"
  [[ "$status" == "$expected" ]] || fail "$path returned $status, expected $expected"
  printf 'OK: %s -> %s\n' "$path" "$status"
}

[[ -f "$extension_file" ]] || fail "missing $extension_file"
node --check "$extension_file"
printf 'OK: extension syntax\n'

admin_html="$(curl -fsSL "$base_url/admin-vue/portal/home")"
injection_count="$(grep -o '/lexiang-admin-extension/closed-loop-menu.js' <<<"$admin_html" | wc -l | tr -d ' ')"
[[ "$injection_count" == "1" ]] || fail "admin extension injection count is $injection_count, expected 1"
printf 'OK: admin HTML contains one extension injection\n'

cache_headers="$(mktemp)"
cache_body="$(mktemp)"
trap 'rm -f "$cache_headers" "$cache_body"' EXIT
cache_status="$(
  curl -sS \
    -D "$cache_headers" \
    -o "$cache_body" \
    -w '%{http_code}' \
    -H 'If-None-Match: W/"legacy-admin-html"' \
    -H 'If-Modified-Since: Wed, 31 Dec 2099 23:59:59 GMT' \
    "$base_url/admin-vue/portal/home"
)"
[[ "$cache_status" == "200" ]] || fail "conditional admin HTML request returned $cache_status, expected 200"
cache_injection_count="$(grep -o '/lexiang-admin-extension/closed-loop-menu.js' "$cache_body" | wc -l | tr -d ' ')"
[[ "$cache_injection_count" == "1" ]] || fail "conditional admin HTML injection count is $cache_injection_count, expected 1"
! grep -qiE '^(ETag|Last-Modified):' "$cache_headers" || fail 'admin HTML exposes a stale validator'
grep -qi '^Cache-Control:.*no-store' "$cache_headers" || fail 'admin HTML is missing no-store cache control'
printf 'OK: stale browser validators cannot reuse pre-extension admin HTML\n'

entry_path="$(grep -oE '/admin-vue/assets/index-[A-Za-z0-9_-]+\.js' <<<"$admin_html" | head -1)"
[[ -n "$entry_path" ]] || fail "could not find the current admin entry asset"
check_url "$entry_path"

check_url '/lexiang-admin-extension/closed-loop-menu.js?v=release-check'
check_url '/lexiang-dashboard/lenovo-joy-closed-loop-dashboard.html?embedded=1'
check_url '/lexiang-dashboard/index.html?embedded=1'
check_url '/admin-vue/ops/closed-loop-dashboard'
check_url '/admin-vue/ops/internal-closed-loop-dashboard'

# 项目规范要求上线后覆盖检查这四个正式入口。
check_url '/'
check_url '/shop-chat'
check_url '/b-chat'
check_url '/biz-chat'

if grep -Rqs 'ops.closedLoopDashboard\|ops.internalClosedLoopDashboard' "$repo_dir/public/admin-vue/assets"; then
  fail 'compiled admin-vue assets still contain a direct closed-loop patch'
fi
printf 'OK: admin-vue build remains untouched by the dashboard extension\n'

printf 'PASS: closed-loop dashboard release checks completed\n'
