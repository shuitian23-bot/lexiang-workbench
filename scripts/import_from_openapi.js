#!/usr/bin/env node
// 从联想官方开放API拉取全量商品，更新products表
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = path.join(__dirname, '..', 'lexiang.db');
const API_PATH = '/router/v2/search/v2/selLenovoGoodsForBD';
const ACCESS_KEY = process.env.LENOVO_OPEN_ACCESS_KEY || process.env.LENOVO_OPEN_API_ACCESS_KEY;
const PAGE_SIZE = 500;

if (!ACCESS_KEY) {
  console.error('缺少 LENOVO_OPEN_ACCESS_KEY，无法拉取联想开放平台商品数据');
  process.exit(1);
}

function fetch(page) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    const opts = {
      hostname: 'open.lenovo.com.cn',
      path: `${API_PATH}?${query.toString()}`,
      method: 'GET',
      headers: { 'Access-Key': ACCESS_KEY }
    };
    const r = https.request(opts, res => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    });
    r.on('error', reject);
    r.end();
  });
}

// 从pcDetailUrl提取SKU: https://item.lenovo.com.cn/product/1046472.html → 1046472
function extractSku(url) {
  const m = url && url.match(/\/product\/(\d+)\.html/);
  return m ? m[1] : null;
}

function normalizeUrl(url) {
  if (!url) return '';
  const text = String(url).trim();
  if (!text) return '';
  if (text.startsWith('//')) return 'https:' + text;
  if (text.startsWith('http://')) return text.replace(/^http:\/\//, 'https://');
  return text;
}

function normalizeImageUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  if (normalized.startsWith('/')) return 'https://p1.lefile.cn' + normalized;
  return normalized;
}

// 映射分类：用level1-5和name推断简洁分类名
function mapCategory(item) {
  const l1 = item.goodsCategoryNameLevel1 || '';
  const l2 = item.goodsCategoryNameLevel2 || '';
  const l3 = item.goodsCategoryNameLevel3 || '';
  const l4 = item.goodsCategoryNameLevel4 || '';
  const l5 = item.goodsCategoryNameLevel5 || '';
  const name = item.name || '';
  const all = l1 + l2 + l3 + l4 + l5 + name;

  // 主品类优先（l1精确匹配）
  if (l1.includes('笔记本')) return '笔记本电脑';
  if (l1.includes('台式机') || l1.includes('一体机')) return '台式机';
  if (l1.includes('服务器')) return '服务器';
  if (l1.includes('工作站')) return '工作站';
  if (l1.includes('平板') && !l1.includes('服务')) return '平板电脑';
  if (l1.includes('手机') && !l1.includes('服务') && !l3.includes('保障') && !l3.includes('配件')) return '手机';
  if (l1.includes('显示器') && !l1.includes('服务')) return '显示器';
  if (l1.includes('打印机')) return '打印机及配件';

  // 名称关键词（覆盖乐豆购/智选等模糊分类中的真实3C产品）
  if (/ThinkPad|ThinkBook|小新|YOGA|拯救者|IdeaPad|昭阳|开天/.test(name) && /笔记本|Laptop/i.test(all)) return '笔记本电脑';
  if (/ThinkPad|ThinkBook|小新|YOGA|拯救者|IdeaPad|昭阳/.test(name)) return '笔记本电脑';
  if (/ThinkCentre|ThinkStation|开天|天逸|扬天|异能者|刃/.test(name) && !name.includes('笔记本')) return '台式机';
  if (/moto\s|motorola|联想手机/.test(name) && !name.includes('壳') && !name.includes('膜') && !name.includes('保服务')) return '手机';
  if (/拯救者\s*Y\d+t|LEGION\s*Tab|联想平板|小新\s*Pad|YOGA\s*Pad|Tab\s*P|Tab\s*M|Tab\s*K/.test(name)) return '平板电脑';
  if (/显示器|ThinkVision/.test(name) && !name.includes('支架') && !name.includes('膜')) return '显示器';

  // 服务类
  if (l1.includes('服务') || l3.includes('保障') || l3.includes('人工') || name.includes('延保') || name.includes('碎保') || name.includes('只换不修') || name.includes('上门服务')) return '服务产品';
  if (l1.includes('懂得通信') || name.includes('糖豆') || name.includes('大白话') || name.includes('懂陪伴')) return '通信服务';

  // 外设配件
  if (/键盘|鼠标|键鼠/.test(all)) return '键鼠相关';
  if (/耳机|耳麦/.test(all)) return '耳机';
  if (/电脑包|背包|内胆|双肩|单肩|箱包/.test(all)) return '包袋';
  if (/充电|电源|适配器|移动电源/.test(all)) return '充电设备';
  if (/U盘|硬盘|SSD|存储/.test(all)) return '存储设备';
  if (/支架|拓展坞|扩展坞|Hub|hub|转换器/.test(all)) return '电脑外设与配件';
  if (l1.includes('配件') || l1.includes('电脑外设')) return '电脑外设与配件';

  // 生活/积分类（保持原始标签但简化）
  if (l1.includes('乐豆购')) return '乐豆兑换';
  if (l1.includes('智选') || l1.includes('智能/生活') || l1.includes('智能生活')) return '智能生活';
  if (l1.includes('smb') || l1.includes('SMB')) return 'SMB商品';
  if (l1.includes('周边')) return '周边礼品';

  return l1.replace(/\(.*?\)/g, '').trim() || '其他';
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // 拉取全量数据
  console.log('开始拉取联想官方商品数据...');
  const firstPage = await fetch(1);
  if (firstPage.rc !== 0 || !Array.isArray(firstPage.result)) {
    throw new Error('第一页商品数据拉取失败：' + JSON.stringify(firstPage).slice(0, 300));
  }
  const total = firstPage.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`总计 ${total} 件商品，${totalPages} 页`);

  let allItems = [...firstPage.result];

  for (let p = 2; p <= totalPages; p++) {
    const res = await fetch(p);
    if (res.rc !== 0 || !res.result) {
      console.error(`第${p}页拉取失败:`, res);
      break;
    }
    allItems.push(...res.result);
    process.stdout.write(`\r已拉取 ${allItems.length}/${total}`);
  }
  console.log(`\n拉取完成: ${allItems.length} 件`);

  // API返回有大量重复SKU，先去重（同SKU取价格最高的/最后出现的）
  const deduped = new Map();
  for (const item of allItems) {
    const sku = extractSku(item.pcDetailUrl);
    if (!sku) continue;
    const existing = deduped.get(sku);
    if (!existing || parseFloat(item.pcPrice) > parseFloat(existing.pcPrice)) {
      deduped.set(sku, item);
    }
  }
  const uniqueItems = [...deduped.values()];
  console.log(`去重后: ${uniqueItems.length} 件唯一商品`);

  if (uniqueItems.length < Math.min(1000, Math.floor(total * 0.2))) {
    throw new Error(`官方商品数据过少，停止导入以保护现有商品库：${uniqueItems.length}/${total}`);
  }

  // 删除纯测试数据
  const delTest = db.prepare(`DELETE FROM products WHERE name LIKE '%test%' OR name = '' OR sku = ''`);
  const delResult = delTest.run();
  console.log(`删除测试数据: ${delResult.changes} 条`);

  // upsert
  const upsert = db.prepare(`
    INSERT INTO products (sku, name, category, price, original_price, status, stock, image_url, description, specs, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', 999, ?, ?, ?, datetime('now'))
    ON CONFLICT(sku) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price = excluded.price,
      original_price = excluded.original_price,
      status = 'active',
      stock = 999,
      image_url = excluded.image_url,
      description = excluded.description,
      specs = excluded.specs,
      updated_at = datetime('now')
  `);

  const tx = db.transaction((items) => {
    db.exec('CREATE TEMP TABLE IF NOT EXISTS tmp_openapi_skus (sku TEXT PRIMARY KEY)');
    db.exec('DELETE FROM tmp_openapi_skus');
    const touchSku = db.prepare('INSERT OR IGNORE INTO tmp_openapi_skus (sku) VALUES (?)');
    let ok = 0, skip = 0;
    for (const item of items) {
      const sku = extractSku(item.pcDetailUrl);
      if (!sku) { skip++; continue; }
      const price = parseFloat(item.pcPrice) || 0;
      const category = mapCategory(item);
      const imageUrl = normalizeImageUrl(item.gphoto);
      const specs = JSON.stringify({
        source: 'lenovo_open_api',
        lvl1: item.goodsCategoryNameLevel1 || '',
        lvl2: item.goodsCategoryNameLevel2 || '',
        lvl3: item.goodsCategoryNameLevel3 || '',
        lvl4: item.goodsCategoryNameLevel4 || '',
        lvl5: item.goodsCategoryNameLevel5 || '',
        url: normalizeUrl(item.pcDetailUrl),
        pcDetailUrl: normalizeUrl(item.pcDetailUrl),
        wapUrl: normalizeUrl(item.wapDetailUrl),
        wapDetailUrl: normalizeUrl(item.wapDetailUrl)
      });
      touchSku.run(sku);
      upsert.run(sku, item.name, category, price, price, imageUrl, item.gbrief || '', specs);
      ok++;
    }
    const offline = db.prepare(`
      UPDATE products
      SET status = 'offline', updated_at = datetime('now')
      WHERE json_extract(specs, '$.source') = 'lenovo_open_api'
        AND sku NOT IN (SELECT sku FROM tmp_openapi_skus)
    `).run();
    return { ok, skip, offline: offline.changes };
  });

  const result = tx(uniqueItems);
  console.log(`导入完成: ${result.ok} 条成功, ${result.skip} 条跳过(无SKU), ${result.offline} 条官方下架`);

  // 统计
  const stats = db.prepare(`SELECT status, count(*) as cnt FROM products GROUP BY status`).all();
  console.log('最终状态:', stats);

  const catStats = db.prepare(`SELECT category, count(*) as cnt FROM products WHERE status='active' GROUP BY category ORDER BY cnt DESC LIMIT 15`).all();
  console.log('Active品类分布:');
  catStats.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
