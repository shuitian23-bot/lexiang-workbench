// 抓 lenovo 商品详情图，cache 7 天到 products.detail_images
// GET /api/product/:sku/detail-images → {images: [url...], cached: bool}
const express = require('express');
const cheerio = require('cheerio');
const db = require('../db/schema');

const router = express.Router();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const req = lib.get(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchHtml(next).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error('timeout')));
  });
}

function extractDetailImages(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const out = [];
  // 候选容器：详情/产品段落
  const containers = ['.detail-all-tab-container', '.detail_con', '.detail_bottom', '.cms_curren', '.product-detail', 'body'];
  for (const sel of containers) {
    $(sel).find('img').each(function() {
      let src = $(this).attr('src') || $(this).attr('data-src') || $(this).attr('data-original') || $(this).attr('data-lazy-src') || '';
      if (!src) return;
      src = src.trim();
      if (src.startsWith('//')) src = 'https:' + src;
      if (!/^https?:\/\//.test(src)) return;
      if (!/lefile\.cn|lenovo\./i.test(src)) return;
      // 仅 product/adminweb 或 cms uuid hash 路径（详情图常见）
      if (!/\/product\/adminweb\/|\/fes\/cms\//.test(src)) return;
      // 排除明显的 nav/icon/装饰
      if (/(nav|icon|logo|favicon|arrow|btn|button|sprite|placeholder)\.png$/i.test(src)) return;
      if (/(navnew|navold|righttop|rightbtm|leftsan|rightsan|sdefault)/i.test(src)) return;
      if (seen.has(src)) return;
      seen.add(src);
      out.push(src);
    });
    if (out.length >= 5) break;
  }
  return out.slice(0, 30);
}

router.get('/:sku/detail-images', async (req, res) => {
  const sku = String(req.params.sku || '').trim();
  if (!sku || !/^\d+$/.test(sku)) return res.status(400).json({ error: 'invalid sku' });

  const row = db.prepare('SELECT detail_images, detail_images_at FROM products WHERE sku = ?').get(sku);
  if (row && row.detail_images && row.detail_images_at && (Date.now() - row.detail_images_at < CACHE_TTL_MS)) {
    try {
      const arr = JSON.parse(row.detail_images);
      if (Array.isArray(arr) && arr.length) return res.json({ images: arr, cached: true });
    } catch {}
  }

  try {
    const html = await fetchHtml(`https://item.lenovo.com.cn/product/${sku}.html`);
    const images = extractDetailImages(html);
    if (row) {
      db.prepare('UPDATE products SET detail_images = ?, detail_images_at = ? WHERE sku = ?')
        .run(JSON.stringify(images), Date.now(), sku);
    }
    res.json({ images: images, cached: false });
  } catch (err) {
    console.warn('[detail-images]', sku, err.message);
    if (row && row.detail_images) {
      try { return res.json({ images: JSON.parse(row.detail_images), cached: true, stale: true }); } catch {}
    }
    res.status(502).json({ error: err.message, images: [] });
  }
});

module.exports = router;
