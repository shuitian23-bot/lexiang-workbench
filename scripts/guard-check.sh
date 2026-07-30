#!/bin/bash
# 哨兵巡检：guard-markers.txt 每行「文件|唯一代码串|功能名」，标记丢失=被旧 buffer 覆盖，飞书私聊告警白羽。
# root crontab 每 2 分钟跑一次。告警去重：同一标记 2 小时内只报一次（/tmp/.guard-alerted-*）。
cd /opt/projects/lexiang || exit 1
MARKERS=scripts/guard-markers.txt
[ -f "$MARKERS" ] || exit 0
source /etc/lexiang/feishu-creds.env 2>/dev/null || exit 0

send_alert() {
  local text="$1"
  local token
  token=$(curl -s -m 10 -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
    -H "Content-Type: application/json" \
    -d "{\"app_id\":\"$FEISHU_APP_ID\",\"app_secret\":\"$FEISHU_APP_SECRET\"}" | \
    python3 -c "import json,sys;print(json.load(sys.stdin).get('tenant_access_token',''))" 2>/dev/null)
  [ -n "$token" ] || return 1
  python3 - "$token" "$FEISHU_USER_OPEN_ID" "$text" <<'PYEOF'
import json, sys, urllib.request
token, openid, text = sys.argv[1], sys.argv[2], sys.argv[3]
req = urllib.request.Request(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
    data=json.dumps({"receive_id": openid, "msg_type": "text",
                     "content": json.dumps({"text": text})}).encode(),
    headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
urllib.request.urlopen(req, timeout=10)
PYEOF
}

while IFS='|' read -r file marker name; do
  [ -z "$file" ] && continue
  case "$file" in \#*) continue;; esac
  dedup="/tmp/.guard-alerted-$(echo -n "$file|$marker" | md5sum | cut -c1-12)"
  if [ -f "$file" ] && grep -qF "$marker" "$file"; then
    rm -f "$dedup"
    continue
  fi
  # 标记丢失。2 小时内已报过则跳过
  if [ -f "$dedup" ] && [ $(( $(date +%s) - $(stat -c %Y "$dedup") )) -lt 7200 ]; then
    continue
  fi
  touch "$dedup"
  mtime=$(stat -c '%y %U' "$file" 2>/dev/null || echo "文件不存在")
  send_alert "⚠️ lexiang 哨兵告警：功能标记丢失（疑似被旧 buffer 覆盖）
文件: $file
功能: $name
标记: $marker
文件最后写入: $mtime
处理: 核对 git status/log，若工作区被踩用 git checkout HEAD -- <文件> 恢复"
done < "$MARKERS"
