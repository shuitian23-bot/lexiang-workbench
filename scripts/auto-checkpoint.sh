#!/bin/bash
# 自动检查点：工作区有裸改（任何人直接改服务器文件）→ 自动 commit + push 入库
# 目的：①任何覆盖事故都可回滚 ②疏通 cron 自动部署的 fast-forward 检查
# 由 baiyu crontab 每 5 分钟执行
cd /opt/projects/lexiang || exit 0
CHANGED=$(git status --porcelain -- public routes core skills config db docs server.js CLAUDE.md AGENTS.md 2>/dev/null)
[ -z "$CHANGED" ] && exit 0
# 距最后一次文件修改不足 90 秒则跳过（避免截断正在进行的编辑）
LAST_MTIME=$(git status --porcelain -- public routes core skills config db docs server.js 2>/dev/null | sed 's/^...//' | while read -r f; do [ -f "$f" ] && stat -c %Y "$f"; done | sort -rn | head -1)
[ -n "$LAST_MTIME" ] && [ $(( $(date +%s) - LAST_MTIME )) -lt 90 ] && exit 0
git add public routes core skills config db docs server.js CLAUDE.md AGENTS.md 2>/dev/null
git commit -m "auto-checkpoint: 工作区裸改自动入库保护 ($(echo "$CHANGED" | head -3 | sed 's/^...//' | tr '\n' ' '))" -q || exit 0
git push origin main -q 2>>/var/log/lexiang-checkpoint.log
