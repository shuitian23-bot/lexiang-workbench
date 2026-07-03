#!/bin/bash
# 共享文件编辑互斥锁：多人/多 AI session 改同一文件前先声明占用，防互相覆盖
# 用法:
#   scripts/edit-lock.sh claim  <你的标识> <文件...>   # 占锁（被他人占用则报错退出 1）
#   scripts/edit-lock.sh release <你的标识> [文件...]  # 释放（不带文件=释放自己全部）
#   scripts/edit-lock.sh status                        # 看当前所有锁
# 锁超过 2 小时自动视为过期可被接管。锁文件在 .locks/（不入 git）。
LOCKDIR="$(cd "$(dirname "$0")/.." && pwd)/.locks"
mkdir -p "$LOCKDIR"
cmd="$1"; who="$2"
case "$cmd" in
  claim)
    shift 2
    [ -z "$who" ] || [ $# -eq 0 ] && { echo "用法: edit-lock.sh claim <标识> <文件...>"; exit 2; }
    for f in "$@"; do
      key=$(echo "$f" | tr '/' '_')
      lock="$LOCKDIR/$key.lock"
      if [ -f "$lock" ]; then
        owner=$(head -1 "$lock")
        age=$(( $(date +%s) - $(stat -c %Y "$lock") ))
        if [ "$owner" != "$who" ] && [ "$age" -lt 7200 ]; then
          echo "BLOCKED: $f 正被 [$owner] 编辑（$(sed -n 2p "$lock")起），先沟通或等释放"
          exit 1
        fi
      fi
      printf '%s\n%s\n' "$who" "$(date '+%F %T')" > "$lock"
      echo "LOCKED: $f ← $who"
    done
    ;;
  release)
    shift 2
    if [ $# -eq 0 ]; then
      for l in "$LOCKDIR"/*.lock; do
        [ -f "$l" ] && [ "$(head -1 "$l")" = "$who" ] && rm -f "$l" && echo "RELEASED: $(basename "$l" .lock)"
      done
    else
      for f in "$@"; do rm -f "$LOCKDIR/$(echo "$f" | tr '/' '_').lock" && echo "RELEASED: $f"; done
    fi
    ;;
  status)
    found=0
    for l in "$LOCKDIR"/*.lock; do
      [ -f "$l" ] || continue
      found=1
      echo "$(basename "$l" .lock) ← $(head -1 "$l") @ $(sed -n 2p "$l")"
    done
    [ "$found" = 0 ] && echo "无活动锁"
    ;;
  *) echo "用法: edit-lock.sh claim|release <标识> [文件...] | status"; exit 2;;
esac
