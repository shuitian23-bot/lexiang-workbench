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

internal_dashboard_html="$(curl -fsSL "$base_url/lexiang-dashboard/index.html?embedded=1&release-check=1")"
summary_dashboard_html="$(curl -fsSL "$base_url/lexiang-dashboard/lenovo-joy-closed-loop-dashboard.html?embedded=1&release-check=1")"
grep -q "window.__DASHBOARD_MODE__ = 'internal'" <<<"$internal_dashboard_html" || fail 'internal dashboard is not the Vue entry page'
grep -q "window.__DASHBOARD_MODE__ = 'summary'" <<<"$summary_dashboard_html" || fail 'summary dashboard is not the Vue entry page'
vue_entry_path="$(grep -oE '/lexiang-dashboard/assets/main-[A-Za-z0-9_-]+\.js' <<<"$internal_dashboard_html" | head -1)"
[[ -n "$vue_entry_path" ]] || fail 'could not find the Vue dashboard entry asset'
grep -q "$vue_entry_path" <<<"$summary_dashboard_html" || fail 'the two dashboards do not share the Vue entry asset'
check_url "$vue_entry_path"
check_url '/lexiang-dashboard/orders-data.js?v=release-check'
vue_entry_js="$(curl -fsSL "$base_url$vue_entry_path")"
grep -q '（内部）联想乐享闭环交易数据' <<<"$vue_entry_js" || fail 'internal dashboard title is incorrect'
! grep -q '（内部）联系乐享闭环交易数据' <<<"$vue_entry_js" || fail 'legacy internal dashboard title is still present'
grep -q 'getMetricTrends' <<<"$vue_entry_js" || fail 'metric trend data contract is missing'
grep -q 'getMetricChartData' <<<"$vue_entry_js" || fail 'combined metric chart data contract is missing'
grep -q '总金额趋势' <<<"$vue_entry_js" || fail 'total amount trend chart is missing'
grep -q '订单类型金额' <<<"$vue_entry_js" || fail 'order type amount chart is missing'
grep -q '饼状图' <<<"$vue_entry_js" || fail 'order type pie chart is missing'
grep -q '订单类型' <<<"$vue_entry_js" || fail 'order type detail field is missing'
grep -q 'metric-trend-tooltip' <<<"$vue_entry_js" || fail 'metric trend hover tooltip is missing'
grep -q 'order-type-tooltip' <<<"$vue_entry_js" || fail 'order type hover tooltip is missing'
grep -q '移动光标或使用左右方向键查看每日金额' <<<"$vue_entry_js" || fail 'metric trend hover and keyboard guidance is missing'
printf 'OK: internal title, six trends, and four order-type pie charts are present\n'
printf 'OK: both dashboards use the shared Vue application\n'

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
