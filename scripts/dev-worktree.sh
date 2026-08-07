#!/bin/bash
# 一人一工作区：给自己开一个独立目录 + 独立分支 + 独立端口。
#
# 为什么要有这个：8 个人同时裸改 /opt/projects/lexiang 下同一批文件，
# 任何"整文件写入"（编辑器保存旧 buffer、AI 重写整文件、cp 部署）都会
# 静默抹掉别人这期间的改动——git 全程不知情，因为改动根本没进 git。
# 这种覆盖靠纪律修不了（锁 + 哨兵 + 自动 checkpoint 三道都上过仍在发生），
# 只能靠"不同的人写不同的路径"从结构上消灭。
#
# 用法:
#   scripts/dev-worktree.sh <你的名字> <端口>     # 建/进自己的工作区
#   scripts/dev-worktree.sh --list                # 看现有工作区
#
# 建完之后:
#   cd /opt/wt/<名字> && PORT=<端口> node server.js     # 只影响你自己
#   改完 → git add -A && git commit && git push -u origin dev/<名字>
#   要上线 → 在生产目录 git merge dev/<名字>（冲突这时才出现，而且看得见）
set -euo pipefail

PROD=/opt/projects/lexiang
WTROOT=/opt/wt

if [ "${1:-}" = "--list" ]; then
  git -C "$PROD" worktree list
  exit 0
fi

name="${1:?用法: dev-worktree.sh <你的名字> <端口>   例: dev-worktree.sh baiyu 3002}"
port="${2:?用法: dev-worktree.sh <你的名字> <端口>   例: dev-worktree.sh baiyu 3002}"
wt="$WTROOT/$name"
branch="dev/$name"

if ss -tln 2>/dev/null | grep -q ":$port "; then
  echo "端口 $port 已被占用，换一个（生产 3001 别碰）"; exit 1
fi

mkdir -p "$WTROOT"

if [ -d "$wt" ]; then
  echo "工作区已存在: $wt"
else
  git -C "$PROD" fetch origin main --quiet || true
  if git -C "$PROD" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$PROD" worktree add "$wt" "$branch"
  else
    git -C "$PROD" worktree add "$wt" -b "$branch" origin/main
  fi
fi

# 大件一律软链回生产，不复制：db 823M + wal 432M + hnsw 339M + uploads 304M
# + node_modules 400M，复制一份 2G，8 个人磁盘直接爆。
# ponytail: 软链意味着你的 dev 实例读写的是生产库。只读调试没问题；
# 要造脏数据先 cp lexiang.db 到自己工作区顶掉软链，用完删掉恢复。
for f in node_modules .env lexiang.db lexiang.db-shm lexiang.db-wal \
         lexiang.hnsw lexiang.hnsw.ids uploads data; do
  [ -e "$PROD/$f" ] && ln -sfn "$PROD/$f" "$wt/$f"
done

if [ ! -r "$PROD/.env" ]; then
  cat <<'WARN'

注意: .env 当前是 root:root 0640，你读不到，起服务会拿到 0 个环境变量
（火山 Ark key、飞书凭据全丢，AI 功能直接哑掉）。让有 sudo 的人跑一次:

  sudo chgrp dev /opt/projects/lexiang/.env && sudo chmod 640 /opt/projects/lexiang/.env

dev 组成员本来就都有 sudo（能 sudo cat 读到），这一步不放大任何权限，只是省掉 sudo。
WARN
fi

cat <<EOF

工作区就绪: $wt   分支: $branch   端口: $port

  cd $wt
  PORT=$port node server.js          # PORT 命令行传参优先于 .env

从此你写你的文件，别人写别人的，物理上不可能互相覆盖。
改完推自己分支，要上线再 merge 回 main。
EOF
