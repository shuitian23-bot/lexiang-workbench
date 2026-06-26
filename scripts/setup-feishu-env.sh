#!/bin/bash
# 防丢: .env 被覆盖时一键恢复飞书凭据
# secret 不入 git, 放 /etc/lexiang/feishu-creds.env (root:600)
# 用法: sudo bash scripts/setup-feishu-env.sh
set -e
SRC=/etc/lexiang/feishu-creds.env
ENV=/opt/projects/lexiang/.env
[ -r "$SRC" ] || { echo "$SRC 不存在/读不了, 先 sudo 写入 FEISHU_APP_ID/SECRET/USER_OPEN_ID"; exit 1; }
while IFS='=' read -r k v; do
  [[ -z "$k" || "$k" =~ ^# ]] && continue
  if grep -q "^$k=" "$ENV" 2>/dev/null; then
    sudo sed -i "s|^$k=.*|$k=$v|" "$ENV"
  else
    echo "$k=$v" | sudo tee -a "$ENV" > /dev/null
  fi
  echo "$k=${v:0:15}..."
done < "$SRC"
echo "完。pm2 reload lexiang"
