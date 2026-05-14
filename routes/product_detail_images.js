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
  // lenovo 详情图用 lazy load，真实 URL 在 data-original 属性
  // 命名规律：/product/adminweb/{YYYY}/{MM}/{DD}/{随机串}-{4位数}.jpg
  $('img[data-original]').each(function() {
    let src = ($(this).attr('data-original') || '').trim();
    if (!src || src === 'error' || /\/error$/.test(src)) return;
    if (src.startsWith('//')) src = 'https:' + src;
    if (!/^https?:\/\//.test(src)) return;
    if (!/lefile\.cn/.test(src)) return;
    // 真实详情图必含 product/adminweb 路径 + 「随机串-数字.jpg」格式
    if (!/\/product\/adminweb\/(\d{4})\/\d{2}\/\d{2}\/[A-Za-z0-9]{10,}-\d+\.(jpg|jpeg|png|webp)/i.test(src)) return;
    // 优先 2024+ 上传的图（早期是装饰素材）
    const yearMatch = src.match(/\/adminweb\/(\d{4})\//);
    if (yearMatch && parseInt(yearMatch[1], 10) < 2023) return;
    if (seen.has(src)) return;
    seen.add(src);
    out.push(src);
  });
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
