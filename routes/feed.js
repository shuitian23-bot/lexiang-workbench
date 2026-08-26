// 子站分类 feed: GET /api/site/feed?site=shop|b|biz [&section=key&limit=24&offset=0]
const express = require('express');
const db = require('../db/schema');
const router = express.Router();

const ORDER_BY_WHITELIST = {
  'id_desc':         'id DESC',
  'sort_desc':       'sort_order DESC, id DESC',
  'sort_id_desc':    'sort_order DESC, id DESC',
  'price_asc':       'price ASC, sort_order DESC',
  'price_desc':      'price DESC',
};

// 排除测试/归档/虚拟卡券类
const EXCLUDED_CATEGORIES = ['测试分类', '测试父级分类0831', 'ho测试1老数据', '归档', '新分类0928', '非标类型', '其他'];

// 子站维度全局排除关键词
const SITE_EXCLUDE_KEYWORDS = {
  shop: ['工作站','ThinkStation','服务器','机架式','ThinkCentre','二手优品','ThinkPad','ThinkBook','天逸','扬天','昭阳','企业购','SMB','SR258','SR258','商用台','thinkplus','百应','会议平板','智能会议','ThinkVision','ThinkSmart','开天','启天'],
  b:    ['服务器','机架式','拯救者','刃9000K','Legion','YOGA Book','YOGA Pro','Moto','二手优品'],
  biz:  ['二手优品','拯救者','小新','YOGA Book','Moto','POLO','T-Shirt','T恤','礼品','马年限定','企业购','SMB'],
};

// 「主机品类」: 整机/工作站/平板 等核心商品，排除配件/服务/卡券
const MAIN_DEVICE_CATS = ['笔记本','台式机','工作站','服务器','平板','手机'];
const MAIN_PC_CATS = ['笔记本','台式机','工作站'];

// 子站分区配置
const SITE_SECTIONS = {
  // 个人及家庭
  shop: [
    { key:'new',     title:'新品上架', subtitle:'刚到货的好物',     filter:{ orderBy:'id_desc', categories:['笔记本','平板','手机','台式机'], priceMin:1500 } },
    { key:'select',  title:'超值精选', subtitle:'高性价比之选',     filter:{ categories:MAIN_PC_CATS, priceMin:3000, priceMax:6500, nameLikeAny:['拯救者','小新','YOGA','Yoga','异能者','Legion'], orderBy:'sort_desc' } },
    { key:'hot',     title:'高端旗舰', subtitle:'性能与设计巅峰',     filter:{ categories:MAIN_PC_CATS, priceMin:10000, priceMax:40000, nameLikeAny:['拯救者','小新','YOGA','Yoga','Legion'], orderBy:'price_desc' } },
    { key:'legion',  title:'拯救者',   subtitle:'游戏性能旗舰',     filter:{ categories:MAIN_PC_CATS, nameLikeAny:['拯救者','Legion'], priceMin:4500 } },
    { key:'xiaoxin', title:'小新',     subtitle:'轻薄办公首选',     filter:{ categories:MAIN_PC_CATS, nameLikeAny:['小新'], priceMin:2500 } },
    { key:'yoga',    title:'YOGA',     subtitle:'设计师与全场景',   filter:{ categories:['笔记本','平板'], nameLikeAny:['YOGA','Yoga'], priceMin:4000 } },
    { key:'mobile',  title:'手机/平板', subtitle:'移动生产力',       filter:{ categories:['手机','平板'], priceMin:500 } },
    { key:'access',  title:'智能配件', subtitle:'桌面好物',         filter:{ categories:['选件'], priceMin:0 } },
  ],
  // 中小企业
  b: [
    { key:'new',       title:'新品上架',  subtitle:'最新企业商用',  filter:{ orderBy:'id_desc', categories:['ThinkPad','ThinkBook','扬天','办公'] } },
    { key:'smb',       title:'SMB 精选',  subtitle:'中小企业必备',   filter:{ categories:['ThinkPad','ThinkBook','扬天','办公'], orderBy:'sort_desc' } },
    { key:'hot',       title:'高端商用',  subtitle:'旗舰商务首选',     filter:{ categories:['ThinkPad','ThinkBook'], priceMin:10000, orderBy:'price_desc' } },
    { key:'thinkpad',  title:'ThinkPad',  subtitle:'商务旗舰',       filter:{ categories:['ThinkPad'] } },
    { key:'thinkbook', title:'ThinkBook', subtitle:'中小企业首选',   filter:{ categories:['ThinkBook'] } },
    { key:'tianyi',    title:'扬天', subtitle:'轻量化办公',     filter:{ categories:['扬天'] } },
    { key:'office',    title:'办公', subtitle:'办公设备与方案',      filter:{ categories:['办公'] } },
    { key:'service',   title:'企业服务',  subtitle:'部署与运维',     filter:{ categories:['服务'], orderBy:'sort_desc' } },
  ],
  // 政教及大企业
  biz: [
    { key:'new',         title:'新品上架',  subtitle:'最新政企机型',  filter:{ orderBy:'id_desc', categories:['笔记本','台式机','工作站','服务器','选件'] } },
    { key:'notebook',    title:'笔记本', subtitle:'政企移动办公', filter:{ categories:['笔记本'] } },
    { key:'hot',         title:'旗舰政企',  subtitle:'高性能科研采购',   filter:{ categories:['工作站','服务器','台式机'], priceMin:15000, priceMax:80000, orderBy:'price_desc' } },
    { key:'workstation', title:'工作站',    subtitle:'科研与设计',     filter:{ categories:['工作站','台式机'], nameLikeAny:['工作站','ThinkStation'] } },
    { key:'server',      title:'服务器',    subtitle:'数据中心',       filter:{ categories:['服务器'] } },
    { key:'desktop',     title:'台式机', subtitle:'稳定商用台式', filter:{ categories:['台式机'] } },
    { key:'accessory',   title:'选件', subtitle:'政企采购选件', filter:{ categories:['选件'] } },
  ],
};

function buildQuery(filter, limit, offset, site, siteExcludeKeywords = []) {
  const where = [
    "status = 'active'",
    "image_url IS NOT NULL",
    "image_url != ''",
    `category NOT IN (${EXCLUDED_CATEGORIES.map(()=>'?').join(',')})`,
  ];
  const params = [...EXCLUDED_CATEGORIES];
  where.push('specs LIKE ?');
  params.push(`%"site":"${site}"%`);

  siteExcludeKeywords.forEach(s => { where.push('name NOT LIKE ?'); params.push(`%${s}%`); });

  if (filter.categories?.length) {
    where.push(`category IN (${filter.categories.map(()=>'?').join(',')})`);
    params.push(...filter.categories);
  }
  if (filter.nameLikeAny?.length) {
    const ors = filter.nameLikeAny.map(()=>'name LIKE ?').join(' OR ');
    where.push(`(${ors})`);
    params.push(...filter.nameLikeAny.map(s => `%${s}%`));
  }
  if (filter.nameNotLike?.length) {
    filter.nameNotLike.forEach(s => { where.push('name NOT LIKE ?'); params.push(`%${s}%`); });
  }
  if (typeof filter.priceMax === 'number') { where.push('price <= ?'); params.push(filter.priceMax); }
  if (typeof filter.priceMin === 'number') { where.push('price >= ?'); params.push(filter.priceMin); }

  // 默认排除测试/限定款/二手/T恤 等非主推商品
  const defaultExcludeKeywords = ['测试', '限定款T-Shirt', '徽章', 'T恤'];
  defaultExcludeKeywords.forEach(s => { where.push('name NOT LIKE ?'); params.push(`%${s}%`); });

  const orderKey = filter.orderBy && ORDER_BY_WHITELIST[filter.orderBy] ? filter.orderBy : 'sort_desc';
  const orderBy = ORDER_BY_WHITELIST[orderKey];

  const sql = `
    SELECT id, name, sku, category, price, original_price, image_url, description, specs, sort_order
    FROM products
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  return { sql, params };
}

function fetchSection(filter, limit, offset = 0, site, siteExcludeKeywords = []) {
  const { sql, params } = buildQuery(filter, Math.min(limit * 6, 288), offset, site, siteExcludeKeywords);
  const groups = new Map();
  for (const row of db.prepare(sql).all(...params)) {
    let specs = {};
    try { specs = JSON.parse(row.specs || '{}'); } catch {}
    const key = specs.spu_id ? `${specs.site || site}:${specs.spu_id}` : row.sku;
    const current = groups.get(key);
    if (!current || Number(row.price || 0) < Number(current.price || 0)) {
      groups.set(key, { ...row, name: specs.spu_name || row.name, spu_id: specs.spu_id || '', site: specs.site || site });
    }
  }
  return [...groups.values()].slice(0, limit);
}

router.get('/feed', (req, res) => {
  try {
    const site = String(req.query.site || 'shop').toLowerCase();
    const sections = SITE_SECTIONS[site];
    if (!sections) return res.status(400).json({ error: 'invalid site', valid: Object.keys(SITE_SECTIONS) });

    const sectionKey = req.query.section ? String(req.query.section) : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 48);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const siteExclude = SITE_EXCLUDE_KEYWORDS[site] || [];

    if (sectionKey) {
      const cfg = sections.find(s => s.key === sectionKey);
      if (!cfg) return res.status(404).json({ error: 'section not found' });
      const products = fetchSection(cfg.filter, limit, offset, site, siteExclude);
      return res.json({ site, section: { key: cfg.key, title: cfg.title, subtitle: cfg.subtitle }, products });
    }

    // 跨分区去重：避免同一商品霸占多个区头条
    const seenIds = new Set();
    const result = [];
    for (const cfg of sections) {
      const raw = fetchSection(cfg.filter, limit + 6, 0, site, siteExclude);
      const products = raw.filter(p => !seenIds.has(p.id)).slice(0, limit);
      products.forEach(p => seenIds.add(p.id));
      if (products.length) {
        result.push({ key: cfg.key, title: cfg.title, subtitle: cfg.subtitle, products });
      }
    }

    res.json({ site, sections: result });
  } catch (e) {
    console.error('[feed]', e);
    res.status(500).json({ error: 'internal', message: e.message });
  }
});

router.get('/sections', (req, res) => {
  const site = String(req.query.site || 'shop').toLowerCase();
  const sections = SITE_SECTIONS[site];
  if (!sections) return res.status(400).json({ error: 'invalid site' });
  res.json({ site, sections: sections.map(s => ({ key: s.key, title: s.title, subtitle: s.subtitle })) });
});

module.exports = router;
