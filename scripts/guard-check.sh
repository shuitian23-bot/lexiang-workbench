#!/bin/bash
# 哨兵巡检：guard-markers.txt 每行「文件|唯一代码串|功能名」，标记丢失=被旧 buffer 覆盖，飞书私聊告警白羽。
# root crontab 每 2 分钟跑一次。单轮所有丢失标记合并发一条消息；同组合 2 小时内不重发（/tmp/.guard-alerted-*）。
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

LOST=""
LOST_KEYS=""
while IFS='|' read -r file marker name; do
  [ -z "$file" ] && continue
  case "$file" in \#*) continue;; esac
  if [ -f "$file" ] && grep -qF "$marker" "$file"; then
    rm -f "/tmp/.guard-alerted-$(echo -n "$file|$marker" | md5sum | cut -c1-12)"
    continue
  fi
  mtime=$(stat -c '%y %U' "$file" 2>/dev/null | cut -c1-19,30- || echo "文件不存在")
  LOST="${LOST}
· ${name}
  ${file}（最后写入 ${mtime}）"
  LOST_KEYS="${LOST_KEYS}${file}|${marker};"
done < "$MARKERS"

[ -z "$LOST" ] && exit 0

# 单轮合并去重：同一组丢失标记组合 2 小时内只报一次
dedup="/tmp/.guard-alerted-$(echo -n "$LOST_KEYS" | md5sum | cut -c1-12)"
if [ -f "$dedup" ] && [ $(( $(date +%s) - $(stat -c %Y "$dedup") )) -lt 7200 ]; then
  exit 0
fi
touch "$dedup"

count=$(echo "$LOST_KEYS" | tr ';' '\n' | grep -c '|')
send_alert "⚠️ lexiang 哨兵：${count} 个功能标记丢失（疑似被旧 buffer 覆盖）
${LOST}

处理：核对 git status/log，工作区被踩用 git checkout HEAD -- <文件> 恢复。同组合 2 小时内不再重复提醒。"
