// Dynamic sitemap: 三子站 + 热门商品详情页
const express = require('express');
const db = require('../db/schema');
const router = express.Router();

const BASE = 'https://leaibot.cn';

const STATIC_URLS = [
  { loc: BASE + '/',          changefreq: 'daily',  priority: '1.0' },
  { loc: BASE + '/shop-chat', changefreq: 'daily',  priority: '0.9' },
  { loc: BASE + '/b-chat',    changefreq: 'daily',  priority: '0.9' },
  { loc: BASE + '/biz-chat',  changefreq: 'daily',  priority: '0.9' },
];

router.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // 仅静态页：三子站 + 首页。商品详情走联想官网（外链不进自己 sitemap），避免站内死链。
  const urls = STATIC_URLS
    .map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
    .join('\n');

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
});

module.exports = router;
