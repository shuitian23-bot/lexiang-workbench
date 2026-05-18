#!/usr/bin/env node
/**
 * 知识库每日自动刷新脚本
 * iKnow + biz + brand + 新闻 + 向量化 + 商品API + 品牌全量 + wiki生成
 * 每步有超时保护，失败不阻塞后续步骤
 * cron: 0 3 * * * (每天凌晨3点)
 */
const path = require('path');
const { execSync } = require('child_process');
process.chdir(path.join(__dirname, '..'));
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LOG = s => console.log(`[${new Date().toISOString()}] ${s}`);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时(${ms/1000}s)`)), ms)),
  ]);
}

async function step(n, total, label, fn, timeoutMs = 300000) {
  LOG(`Step ${n}/${total}: ${label}...`);
  try {
    const result = await withTimeout(fn(), timeoutMs, label);
    LOG(`${label} ✓`);
    return result;
  } catch (e) {
    LOG(`${label} ✗ ${e.message.slice(0, 200)}`);
    return null;
  }
}

async function run() {
  const T = 9;
  LOG('=== 知识库每日刷新开始 ===');

  // 1. iKnow — 增量模式，只抓最新500篇（去重后实际入库仅新增部分）
  await step(1, T, 'iKnow 知识库(增量500)', async () => {
    const { crawlLenovo } = require('../knowledge/lenovo_crawler');
    await crawlLenovo('daily_iknow_' + Date.now(), { keyword: ' ', maxArticles: 500 });
  }, 600000);

  // 2. biz 企业站（超时2分钟，这个爬虫容易卡死）
  await step(2, T, 'biz 企业站', async () => {
    const { crawlBizLenovo } = require('../knowledge/biz_lenovo_crawler');
    await crawlBizLenovo('daily_biz_' + Date.now());
  }, 120000);

  // 3. brand/ESG/合作伙伴
  await step(3, T, 'brand/ESG/合作伙伴', async () => {
    const { crawlBrandSites } = require('../knowledge/brand_crawl');
    const r = await crawlBrandSites();
    LOG(`  入库 ${r.done || r.ingested || 0}`);
  }, 300000);

  // 4. 新闻
  await step(4, T, '联想新闻', async () => {
    const { crawlNews } = require('../knowledge/news_crawler');
    const r = await crawlNews();
    LOG(`  入库 ${r.ingested}，跳过 ${r.skipped}`);
  }, 300000);

  // 5. 增量向量化
  await step(5, T, '增量向量化', async () => {
    const { buildVectors } = require('../knowledge/build_vectors');
    const r = await buildVectors();
    LOG(`  成功 ${r.done}，失败 ${r.failed}`);
  }, 600000);

  // 6. 商品API
  await step(6, T, '商品数据(open API)', async () => {
    execSync('node /opt/projects/lexiang/scripts/import_from_openapi.js', {
      timeout: 300000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
  }, 300000);

  // 7. 品牌新闻全量
  await step(7, T, '品牌新闻全量(brand.lenovo)', async () => {
    execSync('python3 /opt/projects/lexiang/scripts/crawl_brand_full.py', {
      timeout: 600000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
  }, 600000);

  // 8. 补缺规格：扫无规格整机 → 爬 item 详情页补 specs（持续重试直到补完，新品发布后自动补上价格/参数）
  await step(8, T, '补缺商品规格(item详情)', async () => {
    try {
      execSync('python3 /opt/projects/lexiang/scripts/select_missing_specs.py', {
        timeout: 120000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
      });
    } catch (e) { /* 退出码1=空清单，非错误 */ }
    const fs = require('fs');
    const lst = '/opt/projects/lexiang/data/missing_specs.txt';
    if (fs.existsSync(lst) && fs.readFileSync(lst, 'utf-8').trim()) {
      execSync(`node /opt/projects/lexiang/scripts/crawl_item_pages.js ${lst}`, {
        timeout: 1800000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
      });
    } else {
      LOG('  无待补规格，跳过');
    }
  }, 1800000);

  // 9. wiki 页面生成（最后跑，依赖前面所有数据）
  await step(9, T, 'wiki 页面生成', async () => {
    execSync('python3 /opt/projects/lexiang/scripts/gen_wiki_full.py', {
      timeout: 600000, encoding: 'utf-8', cwd: '/opt/projects/lexiang', stdio: 'pipe',
    });
  }, 600000);

  LOG('=== 每日刷新完成 ===');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
