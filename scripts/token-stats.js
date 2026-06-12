#!/usr/bin/env node
// 统计时间窗口内本机 Claude 会话的 AI 生成 token（output_tokens，按消息去重）
// 用法: node token-stats.js <since-ISO> <until-ISO>
// 口径: 该窗口内所有 session 的 assistant 输出 token 之和（约等于该功能迭代的 AI 生成量）
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DIR = '/home/baiyu/.claude/projects/-opt';
const since = new Date(process.argv[2]).getTime();
const until = new Date(process.argv[3] || Date.now()).getTime();
if (!since) { console.error('usage: token-stats.js <since> [until]'); process.exit(1); }

(async () => {
  const perMsg = new Map(); // msgId -> max output_tokens（流式多快照取最大）
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.jsonl'))
    .filter((f) => { const st = fs.statSync(path.join(DIR, f)); return st.mtimeMs >= since; });
  for (const f of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(DIR, f)), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.includes('output_tokens')) continue;
      let d; try { d = JSON.parse(line); } catch { continue; }
      const ts = new Date(d.timestamp || 0).getTime();
      if (!ts || ts < since || ts > until) continue;
      const usage = d.message?.usage;
      if (!usage) continue;
      const id = d.message?.id || d.uuid;
      const out = Number(usage.output_tokens) || 0;
      if (out > (perMsg.get(id) || 0)) perMsg.set(id, out);
    }
  }
  let total = 0;
  for (const v of perMsg.values()) total += v;
  console.log(total);
})();
