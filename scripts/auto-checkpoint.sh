#!/bin/bash
# 自动检查点 v2：工作区有裸改 → 入库保护，但【绝不用旧工作树覆盖更新的提交】
# 修复历史事故：旧版 git add 整个工作区直接 commit，会把别人/旧 session 没提交的陈旧文件
# （如退回的 ?v、丢失 lxClampFloors 的 app.js）commit 覆盖掉刚 push 的新版本。
# v2：先 fetch+ff 同步远端最新，再只 checkpoint 仍有差异的裸改；同步时本地落后则先并入远端，
#     冲突一律保留远端（更新的）版本，不让旧改动覆盖。
# 由 baiyu crontab 每 5 分钟执行
cd /opt/projects/lexiang || exit 0

PATHS="public routes core skills config db docs server.js CLAUDE.md AGENTS.md"

# 1) 先同步远端：本地落后且可 ff 就先 ff（拿到别人/别 session 刚 push 的最新），不覆盖
git fetch origin main -q 2>/dev/null
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ]; then
  if git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
    # 本地是远端祖先 → 可安全 ff。但工作区可能有裸改挡路，先 stash 再 ff 再尝试恢复
    DIRTY=$(git status --porcelain -- $PATHS 2>/dev/null)
    if [ -n "$DIRTY" ]; then
      git stash push -q -- $PATHS 2>/dev/null
      git merge --ff-only origin/main -q 2>/dev/null
      # 恢复裸改：冲突（远端已更新同文件）→ 丢弃旧裸改，保留远端新版本
      git stash pop -q 2>/dev/null || { git checkout -- $PATHS 2>/dev/null; git stash drop -q 2>/dev/null; }
    else
      git merge --ff-only origin/main -q 2>/dev/null
    fi
  fi
fi

# 2) ff 后重新看是否还有真正的裸改需要入库
CHANGED=$(git status --porcelain -- $PATHS 2>/dev/null)
[ -z "$CHANGED" ] && exit 0

# 3) 距最后一次文件修改不足 90 秒则跳过（避免截断正在进行的编辑）
LAST_MTIME=$(echo "$CHANGED" | sed 's/^...//' | while read -r f; do [ -f "$f" ] && stat -c %Y "$f"; done | sort -rn | head -1)
[ -n "$LAST_MTIME" ] && [ $(( $(date +%s) - LAST_MTIME )) -lt 90 ] && exit 0

# 4) 只做本地 commit 留存，【不再自动 push main】
#    2026-06-28 改：自动 push 是多 session 同工作区互相覆盖线上的根因。
#    现在裸改只在本地入库（防丢、可回溯），上线必须由人手动 git push origin main。
#    这样：A 改动有本地快照保护不丢；B 谁的旧副本都不会再被 cron 自动推上线覆盖别人。
git add $PATHS 2>/dev/null
git commit -m "auto-checkpoint(本地): 工作区裸改入库留存,未推送 ($(echo "$CHANGED" | head -3 | sed 's/^...//' | tr '\n' ' '))" -q || exit 0
# 不 push。提醒：本地有未推送的 checkpoint，需人工审核后手动 push。
echo "[$(date '+%F %T')] 本地 checkpoint 已留存未推送，需人工 review 后手动 push：$(echo "$CHANGED" | head -3 | sed 's/^...//' | tr '\n' ' ')" >> /var/log/lexiang-checkpoint.log
