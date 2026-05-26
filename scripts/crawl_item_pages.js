#!/usr/bin/env node
/**
 * 主动爬 item.lenovo.com.cn 商品详情页 → 补全 products 表规格
 * 用法: node scripts/crawl_item_pages.js <urls_or_ids.txt>
 *       每行一个 productId（数字）或完整 URL（含 /product/{id}.html）
 *
 * 数据来源: mobile SSR inline `detailBasicInfo` JSON（含完整 parameters 规格数组）
 * 已存在 SKU: 只补 specs / description / image_url，不动 name / price / status（保留 OpenAPI 数据）
 * 不存在 SKU: 新插入，price=0（wiki 显示「暂未公布」），status=active
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'lexiang.db');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0) AppleWebKit/605.1.15';
const DELAY_MS = 300;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(productId) {
  return new Promise((resolve, reject) => {
    const url = `https://mitem.lenovo.com.cn/product/${productId}.html`;
    const req = https.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve(buf));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function parseBasicInfo(html) {
  const m = html.match(/var\s+detailBasicInfo\s*=\s*'(\{[\s\S]*?\})'\s*,\s*originalGoodsCode/);
  if (!m) return null;
  const jsonStr = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  try { return JSON.parse(jsonStr); } catch (e) { return null; }
}

// parameters[] 分组规格 → 扁平 key（对齐 gen_wiki_full.py 期望字段）
function flattenParams(parameters) {
  const flat = {};
  const exact = (name) => {
    for (const g of parameters || []) for (const p of g.list || [])
      if (p.parameterName === name) return String(p.parameterValue || '').trim();
    return '';
  };
  const has = (kw) => {
    for (const g of parameters || []) for (const p of g.list || [])
      if ((p.parameterName || '').includes(kw)) return String(p.parameterValue || '').trim();
    return '';
  };
  flat.os = exact('操作系统');
  flat.cpu = exact('CPU型号') || exact('CPU') || has('处理器');
  const memCap = exact('内存容量'), memType = exact('内存类型');
  flat.memory = [memCap, memType].filter(Boolean).join(' ');
  const diskCap = exact('硬盘容量'), diskType = exact('硬盘类型');
  flat.disk = [diskCap, diskType].filter(Boolean).join(' ');
  const gpuChip = exact('显卡芯片'), gpuMem = exact('显存容量');
  flat.gpu = [gpuChip, gpuMem && (gpuMem + '显存')].filter(Boolean).join(' ');
  flat.screen_size = exact('屏幕尺寸');
  flat.screen_res = exact('屏幕分辨率');
  flat.refresh = exact('屏幕刷新率');
  flat.weight = exact('重量');
  flat.color = exact('颜色');
  flat.wifi = exact('无线网卡') ? (exact('无线网卡') === '有' ? 'Wi-Fi' : exact('无线网卡')) : '';
  flat.power = exact('电池类型') || exact('电池容量') || has('电池');
  flat.port = has('接口') || has('端口');
  flat.warranty = has('保修') || has('质保');
  flat.model = exact('产品型号');
  flat.position = exact('产品定位');
  // 清掉空值
  for (const k of Object.keys(flat)) if (!flat[k]) delete flat[k];
  return flat;
}

function normUrl(u) {
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('http://')) return u.replace(/^http:\/\//, 'https://');
  return u;
}

(async () => {
  const argFile = process.argv[2];
  if (!argFile) { console.error('用法: node crawl_item_pages.js <urls_or_ids.txt>'); process.exit(1); }
  const lines = fs.readFileSync(argFile, 'utf-8').trim().split('\n')
    .map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const ids = [];
  for (const line of lines) { const m = line.match(/(\d{6,8})/); if (m) ids.push(m[1]); }
  const uniq = [...new Set(ids)];
  console.log(`输入 ${lines.length} 行 → ${uniq.length} 个唯一 productId`);

  const db = new Database(DB_PATH);
  const findRow = db.prepare('SELECT id, specs, description, image_url FROM products WHERE sku = ?');
  const updateRow = db.prepare(`UPDATE products SET specs = ?,
    description = CASE WHEN (description IS NULL OR description = '') THEN ? ELSE description END,
    image_url = CASE WHEN (image_url IS NULL OR image_url = '') THEN ? ELSE image_url END,
    updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  const insertRow = db.prepare(`INSERT INTO products
    (name, sku, category, price, status, stock, description, image_url, specs, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

  let enrich = 0, insert = 0, fail = 0, noparam = 0;
  for (let i = 0; i < uniq.length; i++) {
    const id = uniq[i];
    process.stdout.write(`[${i + 1}/${uniq.length}] ${id} `);
    try {
      const html = await fetchPage(id);
      const info = parseBasicInfo(html);
      if (!info) { console.log('✗ 无 detailBasicInfo'); fail++; await sleep(DELAY_MS); continue; }
      const sku = String(info.code || id);
      const name = info.name || `商品 ${id}`;
      const brief = info.brief && info.brief !== '无' ? info.brief : '';
      const thumb = normUrl(info.thumbnail?.path || '');
      const pcUrl = normUrl(info.url?.pc || `https://item.lenovo.com.cn/product/${id}.html`);
      const flat = flattenParams(info.parameters);
      if (Object.keys(flat).length === 0) noparam++;
      const existing = findRow.get(sku);
      let baseSpecs = {};
      if (existing && existing.specs) { try { baseSpecs = JSON.parse(existing.specs); } catch (e) {} }
      const specs = JSON.stringify({
        ...baseSpecs,
        ...flat,
        source: baseSpecs.source || 'crawl_item_pages',
        materialNumber: info.materialNumber || baseSpecs.materialNumber || '',
        productsCode: info.productsCode || baseSpecs.productsCode || '',
        buOwner: info.buOwner || baseSpecs.buOwner || '',
        marketable: info.marketable,
        url: pcUrl,
        pcDetailUrl: pcUrl,
        wapDetailUrl: normUrl(info.url?.wap || ''),
      });
      if (existing) {
        updateRow.run(specs, brief, thumb, existing.id);
        console.log(`✓补 ${name.slice(0, 28)} [${Object.keys(flat).length}规格]`);
        enrich++;
      } else {
        insertRow.run(name, sku, '', 0, 'active', 0, brief, thumb, specs);
        console.log(`✓新 ${name.slice(0, 28)} [${Object.keys(flat).length}规格]${info.marketable === 0 ? ' 未上架' : ''}`);
        insert++;
      }
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }
  db.close();
  console.log(`\n=== 完成: 补规格 ${enrich} / 新入库 ${insert} / 失败 ${fail} / 无规格字段 ${noparam} ===`);
})();
