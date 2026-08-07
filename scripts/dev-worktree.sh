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
#   scripts/dev-worktree.sh              # 用你的登录名，端口自动挑，什么都不用想
#   scripts/dev-worktree.sh <名字> [端口]
#   scripts/dev-worktree.sh --list       # 看现有工作区
#
# 建完之后:
#   cd /opt/wt/<名字> && ./dev            # 起你自己的实例，只影响你自己
#   改完 → git add -A && git commit && git push -u origin dev/<名字>
#   要上线 → 在生产目录 git merge dev/<名字>（冲突这时才出现，而且看得见）
set -euo pipefail

PROD=/opt/projects/lexiang
WTROOT=/opt/wt

if [ "${1:-}" = "--list" ]; then
  git -C "$PROD" worktree list
  exit 0
fi

name="${1:-$(id -un)}"
wt="$WTROOT/$name"
branch="dev/$name"

# 端口没给就从 3002 起往上找第一个没人用的，省得互相撞
port="${2:-}"
if [ -z "$port" ]; then
  for p in $(seq 3002 3059); do
    ss -tln 2>/dev/null | grep -q ":$p " || { port=$p; break; }
  done
  [ -n "$port" ] || { echo "3002-3059 全占满了，手动指定端口"; exit 1; }
elif ss -tln 2>/dev/null | grep -q ":$port "; then
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

# 起服务的入口，端口写死在里面，不用每次记
# 必须 sudo：.env 是 root:root 0640，普通用户读不到会拿到 0 个环境变量
# （火山 Ark key、飞书凭据全丢，AI 功能静默哑掉，且不报错，很难查）。
# 生产本来就是 root 跑的，这里保持一致，不去改密钥文件权限。
cat > "$wt/run-dev" <<EOF
#!/bin/bash
cd "\$(dirname "\$0")"
exec sudo env PORT=$port node server.js
EOF
chmod +x "$wt/run-dev"

cat <<EOF

工作区就绪: $wt   分支: $branch   端口: $port

  cd $wt
  ./run-dev                          # 起你自己的实例（首次约 90s，在加载 339M hnsw 索引）

从此你写你的文件，别人写别人的，物理上不可能互相覆盖。
改完推自己分支，要上线再 merge 回 main。
EOF
