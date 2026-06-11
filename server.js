require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const cookieParser = require('cookie-parser');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const versionInfo = require('./core/version');

// Init DB first
require('./db/schema');

// Load skill registry
const registry = require('./core/skill-registry');
registry.load();

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);  // 全局禁 ETag，防 304 命中旧 SPA 缓存
const PORT = parseInt(process.env.PORT) || 3001;

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; }  // GitHub webhook HMAC 校验需要原始 body
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionDb = require('better-sqlite3')(path.join(__dirname, 'sessions.db'));
app.use(session({
  store: new SqliteStore({ client: sessionDb, expired: { clear: true, intervalMs: 3600000 } }),
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Rate limiting：每个 IP 每分钟最多 30 次对话请求
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});

// Admin login rate limiting：每个 IP 每15分钟最多 10 次登录尝试（防暴力破解）
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录尝试过于频繁，请15分钟后再试' }
});
// Admin API 通用限流：每个 IP 每分钟 200 次（正常使用不会触发）
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '管理接口请求过于频繁，请稍后再试' }
});

// UID 中间件：匿名用户用 lexiang-uid，登录用户用 lx-token 解析出 user_id
const UID_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1年
const db = require('./db/schema');
app.use((req, res, next) => {
  // 优先判断登录态
  const token = req.cookies?.['lx-token'];
  if (token) {
    const session = db.prepare(
      `SELECT user_id FROM user_sessions WHERE id = ? AND expires_at > datetime('now')`
    ).get(token);
    if (session) {
      req.lexiangUid = `uid-${session.user_id}`;
      req.userId = session.user_id;
      return next();
    }
    // token 无效，清除
    res.clearCookie('lx-token');
  }

  // 匿名用户
  const fromHeader = req.headers['x-session-id'];
  const fromCookie = req.cookies?.['lexiang-uid'];
  let uid = fromHeader || fromCookie;
  if (!uid || uid === 'anon') {
    uid = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }
  res.cookie('lexiang-uid', uid, { maxAge: UID_MAX_AGE, httpOnly: false, path: '/', sameSite: 'lax' });
  req.lexiangUid = uid;
  req.userId = null;
  next();
});

// Static files — JS/CSS/图片缓存7天，HTML不缓存
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Health check routes（无需鉴权）
const healthRouter = require('./routes/health');
app.use('/health', healthRouter);

// Prometheus metrics（无需鉴权）
app.get('/metrics', (req, res) => {
  // 复用 health router 的 metrics-export
  req.url = '/metrics-export';
  healthRouter(req, res, () => {
    res.status(404).send('Not found');
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', chatLimiter, require('./routes/chat'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.post('/api/admin/login', adminLoginLimiter); // 登录接口严格限流
app.use('/api/admin', adminLimiter, require('./routes/admin'));
app.use('/api/harness', adminLimiter, require('./routes/harness'));
app.use('/api/uploader', require('./routes/uploader'));
app.use('/api/log', require('./routes/log'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/leai', require('./routes/leai'));
app.use('/api/lenovo', require('./routes/lenovo-proxy'));
app.use('/api/product', require('./routes/product_detail_images'));
app.use('/api/pointer', require('./routes/pointer'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/geo-dashboard', adminLimiter, require('./routes/geo-dashboard'));
app.use('/api/pipeline', adminLimiter, require('./routes/pipeline'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/site', require('./routes/feed'));
app.use('/', require('./routes/sitemap'));

// 子站规则: 把商品归到 shop(个人及家庭)/b(中小企业)/biz(政教大企业)
function siteWhereClause(site) {
  if (site === 'shop') return ` AND (category IN ('手机','平板电脑','耳机','包袋') OR (category='笔记本电脑' AND (name LIKE '%小新%' OR name LIKE '%YOGA%' OR name LIKE '%拯救者%' OR name LIKE '%Lecoo%' OR name LIKE '%Lenovo%来酷%')))`;
  // b=中小企业普惠自助: ThinkPad/ThinkBook/扬天/瑞天 + 办公外设(PRD 5.8.7); 昭阳/开天/启天归 biz, 与 core/agent.js 子站提示词口径一致
  if (site === 'b') return ` AND (category IN ('打印机及配件','显示器','键鼠相关') OR (category='笔记本电脑' AND (name LIKE '%ThinkPad%' OR name LIKE '%ThinkBook%' OR name LIKE '%扬天%' OR name LIKE '%瑞天%' OR name LIKE '%企业购%')) OR (category='台式机' AND (name LIKE '%ThinkCentre%' OR name LIKE '%扬天%' OR name LIKE '%瑞天%' OR name LIKE '%企业购%')))`;
  if (site === 'biz') return ` AND (category IN ('服务器','工作站','服务产品') OR name LIKE '%昭阳%' OR name LIKE '%开天%' OR name LIKE '%启天%')`;
  return '';
}
function parseProductSpecs(specs) {
  try {
    return JSON.parse(specs || '{}') || {};
  } catch {
    return {};
  }
}

function normalizeSpuName(name = '') {
  return String(name)
    .replace(/[【\[][^】\]]*(张凌赫|同款|拼团活动商品|家用办公|企业购|专业电竞|定制款|补贴|活动|国补)[^】\]]*[】\]]/g, '')
    .replace(/\b(20\d{2}款|20\d{2}|新品|AI元启|至?尊版|酷睿版|锐龙版|标准版|Ultra版|Pro版|GT版|旗舰版)\b/gi, ' ')
    .replace(/\b(\d+(\.\d+)?英寸|\d+(\.\d+)?寸|\d+(\.\d+)?[Kk]|[0-9]+Hz)\b/g, ' ')
    .replace(/\b(\d+GB|\d+G|\d+TB|\d+T|\d+\+\d+G|\d+\+\d+GB|\d+\+\d+T|\d+\+\d+TB|[0-9]+GB\+[0-9]+GB|[0-9]+GB\+[0-9]+TB)\b/gi, ' ')
    .replace(/\b(Windows\s*11|Android|Office\s*20\d{2}|RTX\s*\d+\w*|R[3579][- ]?\d+\w*|Ultra\s*\d+|i[3579][- ]?\d+\w*|骁龙\s*\w+)\b/gi, ' ')
    .replace(/(深灰|深空灰|月蚀灰|冰魄白|银色|灰色|黑色|白色|蓝色|紫色|棉花糖白|天青色|月光银|续罗紫|日光映潮|鸽子灰|轻薄)/g, ' ')
    .replace(/[｜|/（）()，,、:+\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getSpuKey(row) {
  const specs = parseProductSpecs(row?.specs);
  const candidates = [
    specs.spu,
    specs.spuId,
    specs.spu_id,
    specs.productSpu,
    specs.product_spu,
    specs.productModel,
    specs.product_model,
    specs.model,
    specs.型号,
    specs.系列,
    specs.lvl5,
    specs.lvl4,
  ].filter(Boolean);
  const explicit = candidates.find(v => {
    const value = String(v).trim();
    return value.length >= 3 && !/^(lenovo|lecoo|moto|手机|笔记本|台式机|服务|配件)$/i.test(value);
  });
  if (explicit) return `${row.category || ''}:${String(explicit).trim().toLowerCase()}`;
  return `${row.category || ''}:${normalizeSpuName(row.name || row.sku || '') || row.sku || row.name || ''}`;
}


function buildPromotionTags(row) {
  const name = row?.name || '';
  const desc = row?.description || '';
  const category = row?.category || '';
  const text = `${name} ${desc}`;
  const tags = [];
  const push = tag => { if (tag && !tags.includes(tag) && tags.length < 2) tags.push(tag); };
  if (/教育|学生|认证|校园/.test(text)) push('教育特惠');
  if (/国补|国家补贴|补贴|政府补贴/.test(text)) push('国补优惠');
  if (/券|优惠券/.test(text)) {
    const coupon = text.match(/(\d{2,5})\s*元?优惠券/);
    push(coupon ? `${coupon[1]}优惠券` : '优惠券');
  }
  const fullCut = text.match(/满\s*(\d{3,6})\s*减\s*(\d{2,5})/);
  if (fullCut) push(`满${fullCut[1]}减${fullCut[2]}`);
  if (/5折|五折|半价/.test(text)) push('5折券');
  if (/以旧换新|换新/.test(text)) push('以旧换新');
  if (/拼团/.test(text)) push('拼团优惠');
  if (/会员/.test(text)) push('会员权益');
  if (!tags.length && category === '笔记本电脑') push('教育特惠');
  if (tags.length < 2 && Number(row?.original_price || 0) > Number(row?.price || 0)) push('限时优惠');
  if (tags.length < 2) push(category === '服务产品' ? '官方服务' : '官方优惠');
  return tags.slice(0, 2);
}

function collapseProductsToSpu(rows, limit) {
  const groups = new Map();
  for (const row of rows) {
    const key = getSpuKey(row);
    const current = groups.get(key);
    if (!current || Number(row.price || 0) < Number(current.price || 0)) {
      groups.set(key, row);
    }
  }
  return Array.from(groups.values()).slice(0, limit).map(r => ({
    ...r,
    spu_key: getSpuKey(r),
    promotion_tags: buildPromotionTags(r),
    image_url: (r.image_url || '').replace(/^http:\/\//, 'https://')
  }));
}


function classifySite(p) {
  const c = p.category || '', n = p.name || '';
  if (['服务器', '工作站', '服务产品'].includes(c)) return 'biz';
  if (/昭阳|开天|启天/.test(n)) return 'biz';
  if (['打印机及配件', '显示器', '键鼠相关'].includes(c)) return 'b';
  if (c === '笔记本电脑') {
    if (/ThinkPad|ThinkBook|扬天|瑞天|企业购/.test(n)) return 'b';
    if (/小新|YOGA|拯救者|Lecoo|来酷/.test(n)) return 'shop';
  }
  if (c === '台式机' && /ThinkCentre|扬天|瑞天|企业购/.test(n)) return 'b';
  if (['手机', '平板电脑', '耳机', '包袋'].includes(c)) return 'shop';
  return '';
}

// 精选产品列表（landing page 用，按子站分类过滤）
app.get('/api/products', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 20);
  // 找相似：按源 sku 同 category 同价位带(±50%)拉，排除源
  const similar = req.query.similar;
  if (similar) {
    const src = db.prepare('SELECT category, price, name FROM products WHERE sku = ?').get(similar);
    if (!src) return res.json([]);
    let simWhere = `status = 'active' AND image_url IS NOT NULL AND image_url != '' AND sku != ? AND category = ?`;
    // 同子站约束: 笔记本/台式机跨子站, 防个人家庭找相似混进企业购(ThinkPad/开天等)
    simWhere += siteWhereClause(classifySite(src));
    const params = [similar, src.category];
    if (src.price > 0) {
      simWhere += ` AND price BETWEEN ? AND ?`;
      params.push(Math.round(src.price * 0.5), Math.round(src.price * 1.6));
    }
    params.push(src.price || 0, limit);
    const rows = db.prepare(`SELECT sku, name, price, original_price, image_url, description, category, specs
      FROM products WHERE ${simWhere} ORDER BY ABS(price - ?) ASC LIMIT ?`).all(...params);
    return res.json(collapseProductsToSpu(rows, limit));
  }
  const site = req.query.site; // shop=消费, b=企业购, biz=商用
  let where = `status = 'active' AND image_url IS NOT NULL AND image_url != '' AND price > 500
    AND SUBSTR(image_url, -30) NOT IN (
      SELECT SUBSTR(image_url, -30) FROM products WHERE image_url IS NOT NULL AND image_url != ''
      GROUP BY SUBSTR(image_url, -30) HAVING count(*) > 5
    )`;
  const category = req.query.category;
  if (category) {
    where += ` AND category = ?`;
  } else if (site) {
    // 与 siteWhereClause 单一口径, 避免两处 SQL 各改各的再次分叉
    where += siteWhereClause(site);
  }
  const queryLimit = Math.min(limit * 6, 100);
  const params = category ? [category, queryLimit] : [queryLimit];
  const rows = db.prepare(`SELECT sku, name, price, original_price, image_url, description, category, specs
    FROM products WHERE ${where} ORDER BY RANDOM() LIMIT ?`).all(...params);
  res.json(collapseProductsToSpu(rows, limit));
});

// 商品详情 API
app.get('/api/products/:sku', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE sku = ?').get(req.params.sku);
  if (!row) return res.status(404).json({ error: 'not found' });
  let specs = {};
  try { specs = JSON.parse(row.specs || '{}'); } catch {}
  res.json({ ...row, specs });
});

// 商详「✨ 适合你」千人千面理由: flash 快模型 + 用户画像, 1 句 ≤40 字
app.get('/api/products/:sku/reason', (req, res) => {
  const row = db.prepare('SELECT name, price, description, category FROM products WHERE sku = ?').get(req.params.sku);
  if (!row) return res.status(404).json({ error: 'not found' });
  let profileText = '';
  try {
    const { getProfilePrompt } = require('./core/profiler');
    if (req.userId) profileText = (getProfilePrompt(req.userId) || '').slice(0, 400);
  } catch (e) {}
  const sys = '你是联想导购。用一句话(≤40字, 不要换行/列表/客套)说这款机型为什么适合"这位用户", 结合其画像与商品卖点, 口语化直给。无画像则按机型亮点给通用一句话适配点。';
  const usr = '商品：' + row.name + '｜¥' + (row.price||'-') + '｜' + (row.description||'').slice(0,120) + (profileText ? ('\n用户画像：' + profileText) : '\n(无画像, 给通用适配点)');
  const body = JSON.stringify({
    model: 'doubao-seed-2.0-lite',
    messages: [{ role:'system', content: sys }, { role:'user', content: usr }],
    max_tokens: 80, temperature: 0.5, thinking: { type: 'disabled' }
  });
  const https = require('https');
  const r2 = https.request({
    hostname: 'ark.cn-beijing.volces.com', path: '/api/coding/v3/chat/completions', method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, (ar) => {
    let data = ''; ar.on('data', c => data += c);
    ar.on('end', () => {
      try { const j = JSON.parse(data); const reason = (j.choices?.[0]?.message?.content || '').trim().replace(/^["'「『]|["'」』]$/g,''); res.json({ reason: reason || '' }); }
      catch (e) { res.json({ reason: '' }); }
    });
  });
  r2.on('error', () => res.json({ reason: '' }));
  r2.setTimeout(15000, () => { r2.destroy(); res.json({ reason: '' }); });
  r2.write(body); r2.end();
});

function normalizeLenovoUrl(url) {
  if (!url) return '';
  const text = String(url).trim();
  if (!text) return '';
  if (text.startsWith('//')) return 'https:' + text;
  if (text.startsWith('http://')) return text.replace(/^http:\/\//, 'https://');
  return text;
}

function canonicalProductUrl(row) {
  if (!row) return '';
  let specs = {};
  try { specs = JSON.parse(row.specs || '{}'); } catch {}
  const candidates = [specs.url, specs.pcDetailUrl, specs.wapUrl, specs.mobileUrl]
    .map(normalizeLenovoUrl)
    .filter(Boolean);
  const preferred = candidates.find(u => /\/\/(b|item|tk)\.lenovo\.com\.cn\//.test(u)) || candidates[0];
  if (row.status !== 'active') {
    return 'https://s.lenovo.com.cn/search/?key=' + encodeURIComponent(row.name || row.sku || '联想');
  }
  return preferred || (row.sku ? `https://item.lenovo.com.cn/product/${row.sku}.html` : '');
}

// 链接解析：把模型可能写错的联想商品页，按 SKU 修正为产品库里的真实 URL
app.get('/api/resolve-link', (req, res) => {
  const raw = normalizeLenovoUrl(req.query.url);
  if (!raw) return res.status(400).json({ error: 'missing url' });
  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).json({ error: 'invalid url' }); }

  let resolved = raw;
  let source = 'input';
  let product = null;
  const productMatch = parsed.pathname.match(/\/product\/(\d+)\.html/i);
  if (/lenovo\.com\.cn$/i.test(parsed.hostname) && productMatch) {
    const sku = productMatch[1];
    const row = db.prepare('SELECT sku, name, status, specs FROM products WHERE sku = ?').get(sku);
    if (row) {
      const canonical = canonicalProductUrl(row);
      if (canonical) {
        resolved = canonical;
        source = 'products';
        product = { sku: row.sku, name: row.name, status: row.status };
      }
    }
  }

  res.json({ url: resolved, changed: resolved !== raw, source, product });
});

// Preview proxy — 绕过外部站点 X-Frame-Options 限制
app.get('/api/preview', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).send('Invalid URL');
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });
    const ct = resp.headers.get('content-type') || 'text/html';
    if (ct.includes('text/html')) {
      let html = await resp.text();
      const origin = new URL(url).origin;
      if (!html.includes('<base')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}/">`);
      }
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      res.set('Content-Type', ct);
      const buf = Buffer.from(await resp.arrayBuffer());
      res.send(buf);
    }
  } catch(e) {
    res.status(502).send('Preview failed: ' + e.message);
  }
});

// SPA fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/workbench.html'));
});
app.get('/admin/*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/workbench.html'));
});
// Share page
app.get('/share/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/share.html'));
});
// SPU 变体：同一 SPU 下全部在售 SKU（详情页配置选择器/价格区间/SPU 内对比用）
app.get('/api/products/:sku/variants', (req, res) => {
  const src = db.prepare(`SELECT * FROM products WHERE sku = ?`).get(req.params.sku);
  if (!src) return res.status(404).json({ error: 'not found' });
  const key = getSpuKey(src);
  const candidates = db.prepare(`SELECT sku, name, price, original_price, image_url, description, category, specs
    FROM products WHERE status = 'active' AND category = ?`).all(src.category || '');
  const variants = candidates
    .filter((row) => getSpuKey(row) === key)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 12)
    .map((row) => ({ ...row, specs: parseProductSpecs(row.specs), image_url: (row.image_url || '').replace(/^http:\/\//, 'https://') }));
  const prices = variants.map((v) => Number(v.price || 0)).filter((p) => p > 0);
  res.json({
    spu_key: key,
    count: variants.length,
    price_min: prices.length ? Math.min(...prices) : null,
    price_max: prices.length ? Math.max(...prices) : null,
    variants,
  });
});

// 留资线索落库：前端留资弹窗提交（企业采购/政企意向/换新等场景）
app.post('/api/leads', (req, res) => {
  const { scenario, site_type, company, contact, need, conv_id } = req.body || {};
  if (!company && !contact && !need) return res.status(400).json({ error: 'empty lead' });
  const clip = (v) => String(v || '').slice(0, 200);
  const result = db.prepare(`INSERT INTO leads (scenario, site_type, company, contact, need, conv_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    clip(scenario), clip(site_type), clip(company), clip(contact), clip(need),
    Number(conv_id) || null, req.userId || null
  );
  res.json({ id: result.lastInsertRowid, ok: true });
});

// lxHint 形态配置（legacy 旧浮窗 / chip 新情境转化条 / off 关闭）— 改 config/lxhint.json 即时生效，无需重启
app.get('/api/config/lxhint', (req, res) => {
  let mode = 'chip';
  try { mode = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'config/lxhint.json'), 'utf8')).mode || 'chip'; } catch (e) {}
  if (['legacy', 'chip', 'off'].indexOf(mode) < 0) mode = 'chip';
  res.set('Cache-Control', 'no-store');
  res.json({ mode });
});
// SPA 兜底彻底禁缓存：no-store + 关 ETag/Last-Modified 防 304 命中旧
function _sendIndexNoCache(res) {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  res.sendFile(path.join(__dirname, 'public/index.html'), { etag: false, lastModified: false, cacheControl: false });
}
// 三子站 — 复用主页，前端根据 URL 前缀切换导航和内容
for (const prefix of ['/shop-chat', '/b-chat', '/biz-chat']) {
  app.get(prefix, (req, res) => _sendIndexNoCache(res));
  app.get(prefix + '/*path', (req, res) => _sendIndexNoCache(res));
}
app.get('/*path', (req, res) => _sendIndexNoCache(res));

// 记录活跃请求数量，用于优雅关闭
let activeRequests = 0;
app.use((req, res, next) => {
  activeRequests++;
  // close 在响应结束或连接断开时必触发一次；用 once 防重复递减导致计数漂负
  res.once('close', () => { activeRequests--; });
  next();
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 LeAI Agent Platform running on http://localhost:${PORT}`);
  console.log(`📚 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Default admin: admin / admin123`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📦 Version: ${versionInfo.version} (${versionInfo.commitHash})\n`);

  // L3.4 监控采集：启动时立即采集一次，之后每小时一次
  const { collectMetrics } = require('./core/monitor');
  collectMetrics().catch(e => console.error('[Monitor] 初始采集失败:', e.message));
  setInterval(() => {
    collectMetrics().catch(e => console.error('[Monitor] 定时采集失败:', e.message));
  }, 60 * 60 * 1000);
});

// 优雅关闭
let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Shutdown] 收到 ${signal} 信号，开始优雅关闭...`);

  // 硬兜底：无论 checkAndExit 是否卡住，deadline+2s 后强制退出，
  // 防止进程僵死（listener 已关但进程不退，pm2 误报 online → nginx 502）
  const hardKill = setTimeout(() => {
    console.error('[Shutdown] 硬超时，强制退出');
    process.exit(1);
  }, 12000);
  hardKill.unref();

  // 停止接收新连接
  server.close(() => {
    console.log('[Shutdown] HTTP server 已关闭');
  });

  const deadline = 10000; // 最多等10秒
  const start = Date.now();

  function checkAndExit() {
    if (activeRequests <= 0 || Date.now() - start >= deadline) {
      if (activeRequests > 0) {
        console.log(`[Shutdown] 超时（${deadline}ms），强制退出（仍有 ${activeRequests} 个活跃请求）`);
      } else {
        console.log('[Shutdown] 所有请求已完成，关闭 DB 连接...');
      }
      try {
        const db = require('./db/schema');
        if (db && typeof db.close === 'function') db.close();
        console.log('[Shutdown] DB 已关闭');
      } catch (e) {
        console.error('[Shutdown] 关闭 DB 出错:', e.message);
      }
      console.log('[Shutdown] 进程退出');
      process.exit(0);
    } else {
      console.log(`[Shutdown] 等待 ${activeRequests} 个请求完成...`);
      setTimeout(checkAndExit, 500);
    }
  }

  setTimeout(checkAndExit, 100);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
