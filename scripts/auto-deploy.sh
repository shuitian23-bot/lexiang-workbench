#!/bin/bash
# 智能自动部署：每分钟由 cron 调用。
# 拉取 origin/main；只有「后端文件」变动才重启 pm2(lexiang)，
# 纯前端/静态改动（html/css/js/图片/文案/changelog）只 pull 不重启——避免改个文字就重启整个服务。
set -uo pipefail
cd /opt/projects/lexiang || exit 0

GIT=/usr/bin/git
PM2=/usr/local/bin/pm2

sudo -u ubuntu "$GIT" fetch origin main -q || exit 0
# 本地领先/分叉时不动，避免覆盖现场
"$GIT" merge-base --is-ancestor HEAD origin/main || exit 0

LOCAL=$("$GIT" rev-parse HEAD)
REMOTE=$("$GIT" rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0

# 即将拉取的改动文件清单
CHANGED=$("$GIT" diff --name-only HEAD origin/main)
sudo -u ubuntu "$GIT" pull -q || exit 0

# 后端文件正则：改了这些才需要重启 node 进程
BACKEND='^(server\.js|app\.js|routes/|core/|skills/|db/|config/|middleware/|services/|lib/|package\.json|package-lock\.json|\.env)'

TS=$(date '+%F %T')
if echo "$CHANGED" | grep -qE "$BACKEND"; then
  "$PM2" restart lexiang
  echo "$TS [restart] 后端改动，已重启 lexiang ← $(echo "$CHANGED" | tr '\n' ' ')"
else
  echo "$TS [skip] 仅前端/静态改动，不重启 ← $(echo "$CHANGED" | tr '\n' ' ')"
fi
