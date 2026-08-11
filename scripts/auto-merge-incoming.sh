#!/bin/bash
# 自动合并 incoming/* 分支到 main。
#
# 背景：在自己电脑上开发、又没有 GitHub 推送权限的人（张蕊等），走
# `git push server HEAD:refs/heads/incoming/<名字>` 把改动推到服务器。
# 没有这个脚本的话，每一次都要白羽手工 merge，白羽就成了瓶颈。
#
# 策略：能干净合上的自动合、推、删分支、飞书告知白羽；合不上的原样留着
# 并告警——冲突必须人看，不能瞎合。
# 由 root crontab 每 5 分钟执行。
cd /opt/projects/lexiang || exit 1

# 和 auto-checkpoint.sh 抢同一个工作区，必须互斥，否则一个在 merge
# 另一个在 stash/ff，工作区会被搅成半吊子状态
exec 9>/tmp/.lexiang-worktree.lock
flock -n 9 || exit 0

source /etc/lexiang/feishu-creds.env 2>/dev/null

notify() {
  [ -n "${FEISHU_APP_ID:-}" ] || return 0
  local token
  token=$(curl -s -m 10 -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
    -H "Content-Type: application/json" \
    -d "{\"app_id\":\"$FEISHU_APP_ID\",\"app_secret\":\"$FEISHU_APP_SECRET\"}" | \
    python3 -c "import json,sys;print(json.load(sys.stdin).get('tenant_access_token',''))" 2>/dev/null)
  [ -n "$token" ] || return 0
  python3 - "$token" "$FEISHU_USER_OPEN_ID" "$1" <<'PYEOF'
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

git fetch origin main -q 2>/dev/null

for br in $(git for-each-ref --format='%(refname:short)' 'refs/heads/incoming/*'); do
  who=${br#incoming/}

  # 已经合过的残留分支，直接清掉
  if git merge-base --is-ancestor "$br" HEAD 2>/dev/null; then
    git branch -d "$br" -q 2>/dev/null
    continue
  fi

  files=$(git diff --stat "HEAD...$br" 2>/dev/null | tail -1)
  subjects=$(git log --format='· %s' "HEAD..$br" 2>/dev/null | head -5)

  if git merge --no-edit -q "$br" 2>/tmp/.merge-err-$who; then
    if git push origin main -q 2>>/var/log/lexiang-automerge.log; then
      git branch -d "$br" -q 2>/dev/null
      notify "已自动合并 $who 的改动到 main：
$subjects
$files"
    else
      # 合上了但推不动（远端有新提交）——下一轮 fetch 后会重试，不删分支
      notify "⚠ $who 的改动已合入本地 main 但 push 失败，下一轮重试。"
    fi
  else
    git merge --abort 2>/dev/null
    notify "⚠ $who 的分支 $br 合不上，需要人工处理：
$(head -3 /tmp/.merge-err-$who)
$subjects
处理：cd /opt/projects/lexiang && git merge $br"
  fi
  rm -f /tmp/.merge-err-$who
done
