#!/usr/bin/env node
// 自动补录更新日志：扫描新提交，对「动了乐享前台但没记 changelog」的提交，
// 用 LLM 生成大白话条目并按提交人署名追加。谁忘了记都会被自动补上。
// 由 crontab 定时执行（与 auto-checkpoint 同体系）。
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO = '/opt/projects/lexiang';
const CURSOR_FILE = path.join(REPO, '.changelog-cursor');
const CHANGELOG = path.join(REPO, 'public/changelog.json');
process.chdir(REPO);
require('dotenv').config({ path: path.join(REPO, '.env') });

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', cwd: REPO }).trim();

// 乐享前台范围（规范：GEO/workbench/基础设施不记）
const SCOPE = /^(public\/(index\.html|css\/|js\/|changelog)|routes\/|skills\/|core\/|config\/|server\.js)/;
const EXCLUDE = /^(public\/admin\/workbench|routes\/geo-dashboard|routes\/harness|public\/admin\/geo)/;

function llm(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'doubao-seed-2.0-lite',
      messages: [
        { role: 'system', content: '你为联想乐享购物网站写更新日志，读者是不懂技术的普通用户。把代码改动描述翻译成一句大白话（40-80字），说清楚用户能感知到什么变化。只输出这一句话，不要任何前缀、引号和解释。如果改动纯属内部工程（重构/脚本/文档），只输出 SKIP。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200, temperature: 0.3, thinking: { type: 'disabled' },
    });
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com', path: '/api/coding/v3/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve((JSON.parse(data).choices?.[0]?.message?.content || '').trim()); } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.setTimeout(30000, () => { req.destroy(); resolve(''); });
    req.write(body); req.end();
  });
}

function authorToName(commit) {
  const author = sh(`git log -1 --format=%an ${commit}`).toLowerCase();
  const msg = sh(`git log -1 --format=%s ${commit}`);
  if (/guan|zhangrui|观/.test(author)) return '观';
  if (/auto-checkpoint/.test(msg)) return '观'; // 裸改入库的默认归属现场协作者
  return '白羽';
}

(async () => {
  const head = sh('git rev-parse HEAD');
  let cursor = '';
  try { cursor = fs.readFileSync(CURSOR_FILE, 'utf8').trim(); } catch {}
  if (!cursor) { fs.writeFileSync(CURSOR_FILE, head); return; }
  if (cursor === head) return;

  const commits = sh(`git rev-list --reverse ${cursor}..HEAD`).split('\n').filter(Boolean);
  const pending = [];
  for (const c of commits) {
    const files = sh(`git diff-tree --no-commit-id --name-only -r ${c}`).split('\n').filter(Boolean);
    const touchedChangelog = files.includes('public/changelog.json');
    const inScope = files.filter((f) => SCOPE.test(f) && !EXCLUDE.test(f) && f !== 'public/changelog.json');
    const msg = sh(`git log -1 --format=%s ${c}`);
    if (touchedChangelog || !inScope.length) continue; // 自己记过了，或不在乐享前台范围
    if (/^(docs|chore\(changelog\)|merge|checkpoint:)/.test(msg)) continue;
    pending.push({ c, msg, files: inScope });
  }

  if (pending.length) {
    const d = JSON.parse(fs.readFileSync(CHANGELOG, 'utf8'));
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    if (d.days[0]?.date !== todayStr) d.days.unshift({ date: todayStr, items: [] });
    let added = 0;
    for (const p of pending) {
      const stat = sh(`git show --stat --format= ${p.c} | head -8`);
      const text = await llm(`提交说明: ${p.msg}\n改动文件: ${p.files.slice(0, 6).join(', ')}\n变更统计:\n${stat}`);
      if (!text || /^SKIP/i.test(text) || text.length < 10) continue;
      const who = authorToName(p.c);
      let tokenNote = '';
      if (who === '白羽') {
        try {
          const prevTs = sh(`git log -1 --format=%aI ${p.c}^`);
          const curTs = sh(`git log -1 --format=%aI ${p.c}`);
          const n = Number(sh(`node ${path.join(REPO, 'scripts/token-stats.js')} "${prevTs}" "${curTs}"`));
          if (n > 500) tokenNote = `（约${(n / 10000).toFixed(1).replace(/\.0$/, '')}万 token）`;
        } catch {}
      }
      const entry = `${text.replace(/。$/, '')}。——${who}${tokenNote}`;
      if (!d.days[0].items.some((it) => it.slice(0, 20) === entry.slice(0, 20))) {
        d.days[0].items.push(entry);
        added++;
      }
    }
    if (added) {
      fs.writeFileSync(CHANGELOG, JSON.stringify(d, null, 2));
      sh('git add public/changelog.json');
      sh(`git -c user.name=changelog-bot commit -m "chore(changelog): 自动补录 ${added} 条（提交未附日志，LLM 生成）" -q`);
      sh('git push origin main -q');
    }
  }
  fs.writeFileSync(CURSOR_FILE, sh('git rev-parse HEAD'));
})();
