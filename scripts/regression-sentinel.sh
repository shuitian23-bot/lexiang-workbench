#!/usr/bin/env bash
# 回归哨兵: 检查 guard-markers.txt 里的功能标记是否还在磁盘文件里。
# 丢失 = 有人用旧 buffer 整文件覆盖打掉了已上线功能 → 记日志 + 飞书私聊告警(有 creds 则发)。
# cron 每 2 分钟跑一次。告警去重: 同一标记 30 分钟内只报一次。
set -u
DIR="/opt/projects/lexiang"
MARKERS="$DIR/scripts/guard-markers.txt"
LOG="/var/log/lexiang-sentinel.log"
STATE="/tmp/lexiang-sentinel-alerted"
mkdir -p "$STATE"
[ -f "$MARKERS" ] || exit 0

lost=""
while IFS='|' read -r file marker name; do
  case "$file" in \#*|"") continue;; esac
  if ! grep -qF -- "$marker" "$DIR/$file" 2>/dev/null; then
    key=$(echo "$file|$marker" | md5sum | cut -d' ' -f1)
    # 30 分钟去重
    if [ ! -f "$STATE/$key" ] || [ $(( $(date +%s) - $(stat -c %Y "$STATE/$key") )) -gt 1800 ]; then
      touch "$STATE/$key"
      lost="${lost}【${name}】${file} 丢失标记: ${marker}\n"
    fi
    echo "$(date '+%F %T') LOST [$name] $file :: $marker" >> "$LOG" 2>/dev/null || true
  fi
done < "$MARKERS"

[ -z "$lost" ] && exit 0

# 飞书私聊告警(复用 wiki 自动化同款 API; creds root-owned, cron 里 sudo -n 拿不到就只留日志)
CREDS="/etc/lexiang/feishu-creds.env"
if sudo -n test -r "$CREDS" 2>/dev/null; then
  eval "$(sudo -n grep -E '^(FEISHU_APP_ID|FEISHU_APP_SECRET|FEISHU_USER_OPEN_ID)=' "$CREDS")"
  if [ -n "${FEISHU_APP_ID:-}" ] && [ -n "${FEISHU_USER_OPEN_ID:-}" ]; then
    TOKEN=$(curl -s -m 8 -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
      -H "Content-Type: application/json" \
      -d "{\"app_id\":\"$FEISHU_APP_ID\",\"app_secret\":\"$FEISHU_APP_SECRET\"}" | \
      sed -n 's/.*"tenant_access_token":"\([^"]*\)".*/\1/p')
    if [ -n "$TOKEN" ]; then
      TEXT="⚠️ lexiang 功能被覆盖告警\n${lost}大概率是并发会话旧buffer整文件写入。请立即 git log 排查并恢复。"
      BODY=$(printf '{"receive_id":"%s","msg_type":"text","content":"{\\"text\\":\\"%s\\"}"}' "$FEISHU_USER_OPEN_ID" "$TEXT")
      curl -s -m 8 -X POST "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id" \
        -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY" >/dev/null || true
    fi
  fi
fi
exit 0
