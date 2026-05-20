#!/usr/bin/env node
// AI-Pointer 评测：批跑 /api/pointer/infer，量化 hint 质量
// 用法: node scripts/pointer_eval.js [baseUrl]   默认 http://127.0.0.1:3010
const http = require('http');

const BASE = process.argv[2] || 'http://127.0.0.1:3010';

// 评测集：context → 期望 hint 应满足的检查
const CASES = [
  { ctx: 'ThinkPad X1 Carbon 内存 16GB LPDDR5x-6400 焊死不可扩展，14寸 2.8K OLED，¥12999', recent: [{ name: 'ThinkPad T14', price: 7999 }], last: 'ThinkPad T14 16GB DDR4 可扩展 64GB ¥7999', want: ['焊死|扩展|16|64', '券|减|省|到手|限时|赠|分期'] },
  { ctx: '拯救者 Y9000P RTX5070 16G 2.5K 240Hz ¥9999 游戏本', recent: [], want: ['RTX|240Hz|2.5K|游戏', '券|减|省|限时|赠'] },
  { ctx: '小新 Pro 14 酷睿 Ultra5 32G 1T ¥5499 轻薄办公', recent: [{ name: '小新 Air 14', price: 4299 }], want: ['32G|Ultra|轻薄|办公', '券|省|减|限时'] },
  { ctx: 'YOGA Air 14 钛金属 1.07kg 2.8K OLED ¥7299', recent: [], want: ['钛|1.07|OLED|轻', '券|省|减|限时|赠'] },
  { ctx: '联想拯救者刃 9000K 台式机 RTX5080 i7 ¥14999', recent: [{ name: '拯救者 Y9000P', price: 9999 }], want: ['5080|台式|i7', '券|省|减|限时'] },
  { ctx: 'ThinkBook 16+ 锐龙 R7 32G ¥5999 商务本 企业购', recent: [], want: ['R7|32G|商务|企业', '券|省|减|批量|开票'] },
  { ctx: '联想小新平板 Pro GT 11.1英寸 骁龙8s ¥2399', recent: [], want: ['骁龙|11.1|平板', '券|省|减|限时|赠'] },
  { ctx: 'ThinkStation P3 工作站 至强 64G 专业卡 ¥19999', recent: [], want: ['至强|64G|工作站|专业', '券|省|减|批量|方案'] },
];

// 反向检查：hint 不应出现
const BAD = [/截至\s*20(19|2[0-4])/, /尚未发布|还没有发布/, /比官网(低|便宜)|低于官网/, /要不要(对比|看看别的)/];

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(BASE + path);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.write(data); req.end();
  });
}

(async () => {
  let pass = 0, total = 0, badHits = 0;
  console.log('AI-Pointer 评测 @ ' + BASE + '\n' + '='.repeat(70));
  for (const c of CASES) {
    total++;
    let r;
    try {
      r = await post('/api/pointer/infer', { context: c.ctx, recent_products: c.recent || [], last_pointed: c.last || null, page_url: '/shop-chat' });
    } catch (e) { console.log('✗ [ERR] ' + e.message + ' | ' + c.ctx.slice(0, 30)); continue; }
    const hint = (r && r.hint) || '';
    const ask = (r && r.ask) || '';
    let ok = !!hint && hint.length <= 60;
    const missGroups = [];
    for (const g of (c.want || [])) {
      const alts = g.split('|');
      if (!alts.some(a => hint.includes(a) || ask.includes(a))) { ok = false; missGroups.push(g); }
    }
    const bad = BAD.filter(re => re.test(hint));
    if (bad.length) { ok = false; badHits++; }
    if (ok) pass++;
    console.log((ok ? '✓' : '✗') + ' hint: ' + hint + (missGroups.length ? '  [缺:' + missGroups.join(',') + ']' : '') + (bad.length ? '  [违禁!]' : ''));
  }
  console.log('='.repeat(70));
  console.log('通过 ' + pass + '/' + total + ' = ' + Math.round(pass / total * 100) + '%  · 违禁命中 ' + badHits);
  process.exit(pass === total ? 0 : 1);
})();
