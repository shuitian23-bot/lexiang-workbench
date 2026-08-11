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

# 端口来源优先级：命令行 > scripts/dev-ports.txt 里按名字查 > 从 3012 自动挑。
# 之所以要 dev-ports.txt：纯自动分配会无视早就定好的约定（生产 3001 /
# baiyu 3002 / 观 3011），还会撞上 3010(lexiang-new)、3020(codex-lexiang)、
# 3061(wangyt50) 这些没在 /opt/wt 下、自动扫描看不见的老实例。
PORTFILE="$PROD/scripts/dev-ports.txt"

# 已分配给别的工作区但还没启动的端口也要排掉，否则连建几个会全拿同一个号
# || true 不能省：set -e 下 grep 无匹配返回 1，会直接把整个脚本静默干掉
taken=$(grep -ho 'PORT=[0-9]*' "$WTROOT"/*/run-dev 2>/dev/null | cut -d= -f2 | tr '\n' ' ' || true)
port_free() {
  ss -tln 2>/dev/null | grep -q ":$1 " && return 1
  case " $taken " in *" $1 "*) return 1;; esac
  grep -qE "^[^#]\S*[[:space:]]+$1[[:space:]]*$" "$PORTFILE" 2>/dev/null && return 1
  return 0
}

port="${2:-}"
if [ -z "$port" ]; then
  port=$(awk -v n="$name" '$1==n && $2 ~ /^[0-9]+$/ {print $2; exit}' "$PORTFILE" 2>/dev/null || true)
fi
if [ -z "$port" ]; then
  for p in $(seq 3012 3059); do
    port_free "$p" && { port=$p; break; }
  done
  [ -n "$port" ] || { echo "3012-3059 全占满了，手动指定端口或写进 $PORTFILE"; exit 1; }
  echo "$name 不在 $PORTFILE 里，自动分到 $port——记得补一行进去，免得下次换号"
fi

mkdir -p "$WTROOT"

if [ -d "$wt" ]; then
  echo "工作区已存在: $wt"
else
  git -C "$PROD" fetch origin main --quiet || true
  if git -C "$PROD" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$PROD" worktree add "$wt" "$branch"
  else
    # --no-track 是关键：不加的话上游会是 origin/main，在自己工作区敲一句
    # git push 就直接推到 main，隔离白做还更危险。上游留空 → push 安全报错。
    git -C "$PROD" worktree add --no-track "$wt" -b "$branch" origin/main
  fi
fi
git -C "$wt" branch --unset-upstream 2>/dev/null || true

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
# 工作区可能由别人代建（属主不是你），git 会以 dubious ownership 拒绝工作。
# 登记到系统级白名单，所有人都生效，省得每人再配一次 --global。
sudo git config --system --get-all safe.directory 2>/dev/null | grep -qxF "$wt" \
  || sudo git config --system --add safe.directory "$wt" 2>/dev/null || true

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

改完提交（上游是空的，git push 不带参数会报错，不会误推 main）：
  git add -A && git commit -m "..."
  git push -u origin $branch         # 有 GitHub key 才需要；没有可以跳过

要上线：在 /opt/projects/lexiang 里 git merge $branch
（所有工作区共用一个 .git，不推远端也能合）
EOF
