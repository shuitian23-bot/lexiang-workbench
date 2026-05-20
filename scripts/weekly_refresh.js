#!/usr/bin/env node
/**
 * 知识库每日自动刷新脚本
 * iKnow + biz + brand + 新闻 + 向量化 + 商品API + 品牌全量 + 补规格 + wiki生成
 * 每步有超时保护，失败不阻塞后续；跑完推送飞书汇总（更新数/0/失败原因）
 * cron: 0 4 * * * （已挂 root crontab）
 * 飞书 webhook 配 .env: FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
 */
const path = require('path');
const { execSync } = require('child_process');
process.chdir(path.join(__dirname, '..'));
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LOG = s => console.log(`[${new Date().toISOString()}] ${s}`);
const results = [];  // {n,label,status:'ok'|'fail'|'skip',detail}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时(${ms / 1000}s)`)), ms)),
  ]);
}

async function step(n, total, label, fn, timeoutMs = 300000) {
  LOG(`Step ${n}/${total}: ${label}...`);
  try {
    const detail = await withTimeout(fn(), timeoutMs, label);
    const d = (detail == null || detail === '') ? '0' : String(detail);
    LOG(`${label} ✓ ${d}`);
    results.push({ n, label, status: 'ok', detail: d });
  } catch (e) {
    const msg = (e.message || String(e)).slice(0, 200);
    LOG(`${label} ✗ ${msg}`);
    results.push({ n, label, status: 'fail', detail: msg });
  }
}

// 从子进程 stdout 抓第一个匹配组，失败返回 fallback
function pick(out, re, fallback = '0') {
  const m = (out || '').match(re);
  return m ? m[1] : fallback;
}

async function sendFeishu() {
  const url = process.env.FEISHU_WEBHOOK_URL;
  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const lines = [`📊 联想 wiki 每日刷新 · ${today}`, ''];
  for (const r of results.sort((a, b) => a.n - b.n)) {
    const icon = r.status === 'ok' ? '✅' : (r.status === 'skip' ? '⏭️' : '❌');
    const tail = r.status === 'fail' ? `失败：${r.detail}` : r.detail;
    lines.push(`${icon} ${r.label}：${tail}`);
  }
  const failN = results.filter(r => r.status === 'fail').length;
  lines.push('', failN ? `⚠️ ${failN} 步失败，请检查` : '✅ 全部成功');
  const text = lines.join('\n');
  console.log('\n' + text + '\n');

  // 优先飞书应用模式（app_id/secret + chat_id），其次自定义机器人 webhook
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  // 优先私聊用户(open_id)，否则发群(chat_id)
  const openId = process.env.FEISHU_USER_OPEN_ID;
  const chatId = process.env.FEISHU_CHAT_ID;
  const rcvType = openId ? 'open_id' : 'chat_id';
  const rcvId = openId || chatId;
  if (appId && appSecret && rcvId) {
    try {
      const tr = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const tj = await tr.json();
      const token = tj.tenant_access_token;
      if (!token) { LOG(`飞书取 token 失败：${JSON.stringify(tj).slice(0, 200)}`); return; }
      const mr = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${rcvType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receive_id: rcvId, msg_type: 'text', content: JSON.stringify({ text }) }),
      });
      const mj = await mr.json();
      LOG(`飞书推送：${mj.code === 0 ? 'OK' : JSON.stringify(mj).slice(0, 200)}`);
    } catch (e) {
      LOG(`飞书推送失败：${e.message}`);
    }
    return;
  }
  if (!url) { LOG('未配置飞书（FEISHU_APP_ID/SECRET/CHAT_ID 或 FEISHU_WEBHOOK_URL），跳过推送'); return; }
  try {
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
    });
    const j = await resp.json().catch(() => ({}));
    LOG(`飞书推送：${j.code === 0 || j.StatusCode === 0 ? 'OK' : JSON.stringify(j).slice(0, 200)}`);
  } catch (e) {
    LOG(`飞书推送失败：${e.message}`);
  }
}

async function run() {
  const T = 9;
  LOG('=== 知识库每日刷新开始 ===');

  // 1. iKnow 增量500
  await step(1, T, 'iKnow知识库', async () => {
    const { crawlLenovo } = require('../knowledge/lenovo_crawler');
    const r = await crawlLenovo('daily_iknow_' + Date.now(), { keyword: ' ', maxArticles: 500 });
    return r ? `入库${r.done || r.ingested || 0} 跳过${r.skipped || 0}` : '0';
  }, 600000);

  // 2. biz 企业站
  await step(2, T, 'biz企业站', async () => {
    const { crawlBizLenovo } = require('../knowledge/biz_lenovo_crawler');
    const r = await crawlBizLenovo('daily_biz_' + Date.now());
    return r ? `入库${r.ingested || r.done || 0}` : '0';
  }, 120000);

  // 3. brand/ESG/合作伙伴
  await step(3, T, 'brand/ESG', async () => {
    const { crawlBrandSites } = require('../knowledge/brand_crawl');
    const r = await crawlBrandSites();
    return `入库${r.done || r.ingested || 0}`;
  }, 300000);

  // 4. 新闻
  await step(4, T, '联想新闻', async () => {
    const { crawlNews } = require('../knowledge/news_crawler');
    const r = await crawlNews();
    return `入库${r.ingested || 0} 跳过${r.skipped || 0}`;
  }, 300000);

  // 5. 增量向量化
  await step(5, T, '增量向量化', async () => {
    const { buildVectors } = require('../knowledge/build_vectors');
    const r = await buildVectors();
    return `成功${r.done || 0} 失败${r.failed || 0}`;
  }, 600000);

  // 6. 商品 OpenAPI + 补真价(OpenAPI 给占位的, 走 f.lenovo 商城运行时端点拿真价)
  await step(6, T, '商品OpenAPI+补真价', async () => {
    const out = execSync('node /opt/projects/lexiang/scripts/import_from_openapi.js', {
      timeout: 300000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
    let priceOut = '';
    try {
      priceOut = execSync('python3 /opt/projects/lexiang/scripts/fetch_real_prices.py', {
        timeout: 600000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
      });
    } catch (e) { priceOut = '补真价失败'; }
    return `OpenAPI更新${pick(out, /(?:更新|入库|upsert)[^\d]*(\d+)/i)} 补真价${pick(priceOut, /补真价\s*(\d+)/)}`;
  }, 900000);

  // 7. 品牌新闻全量
  await step(7, T, '品牌新闻全量', async () => {
    const out = execSync('python3 /opt/projects/lexiang/scripts/crawl_brand_full.py', {
      timeout: 1500000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
    return `新增${pick(out, /新[增入]\D*(\d+)/)} 更新${pick(out, /更新\D*(\d+)/)}`;
  }, 1500000);

  // 8. 补缺规格
  await step(8, T, '补缺商品规格', async () => {
    try {
      execSync('python3 /opt/projects/lexiang/scripts/select_missing_specs.py', {
        timeout: 120000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
      });
    } catch (e) { /* 退出码1=空清单 */ }
    const fs = require('fs');
    const lst = '/opt/projects/lexiang/data/missing_specs.txt';
    if (fs.existsSync(lst) && fs.readFileSync(lst, 'utf-8').trim()) {
      const out = execSync(`node /opt/projects/lexiang/scripts/crawl_item_pages.js ${lst}`, {
        timeout: 1800000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
      });
      return `补规格${pick(out, /补规格\D*(\d+)/)} 失败${pick(out, /失败\D*(\d+)/)} 待续${pick(out, /无规格字段\D*(\d+)/)}`;
    }
    return '无待补，跳过';
  }, 1800000);

  // 9. wiki 页面生成
  await step(9, T, 'wiki页面生成', async () => {
    const out = execSync('python3 /opt/projects/lexiang/scripts/gen_wiki_full.py', {
      timeout: 600000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
    return `知识${pick(out, /新生成知识页:\s*([\d,]+)/)} 商品${pick(out, /新生成商品页:\s*([\d,]+)/)} 总${pick(out, /articles\.json:\s*([\d,]+)/)}`;
  }, 600000);

  LOG('=== 每日刷新完成 ===');
  await sendFeishu();
  process.exit(0);
}

run().catch(async e => { console.error(e); await sendFeishu(); process.exit(1); });
