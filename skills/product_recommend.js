// Skill: 联想产品推荐（基于products表实时数据）
const db = require('../db/schema');

function parsePriceToken(value) {
  const text = String(value || '').trim().toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(万|w|k|千)?/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const unit = match[2];
  if (unit === '万' || unit === 'w') return Math.round(num * 10000);
  if (unit === 'k' || unit === '千') return Math.round(num * 1000);
  return Math.round(num);
}

function parseBudgetRange(budget) {
  const raw = String(budget || '').trim();
  if (!raw || /不限|无所谓|都可以|随便/.test(raw)) {
    return { minPrice: 0, maxPrice: Infinity, applied: false, label: raw };
  }

  const text = raw
    .toLowerCase()
    .replace(/[￥¥]/g, '')
    .replace(/人民币|rmb|元|块钱|块/g, '')
    .replace(/[，,]/g, '');

  const token = '(\\d+(?:\\.\\d+)?\\s*(?:万|w|k|千)?)';
  const range = text.match(new RegExp(`${token}\\s*(?:-|~|到|至|—|－)\\s*${token}`, 'i'));
  if (range) {
    const a = parsePriceToken(range[1]);
    const b = parsePriceToken(range[2]);
    if (a !== null && b !== null) {
      return {
        minPrice: Math.min(a, b),
        maxPrice: Math.max(a, b),
        applied: true,
        label: raw
      };
    }
  }

  const upper = text.match(new RegExp(`(?:不超过|不高于|低于|小于|少于|<=|≤)\\s*${token}|${token}\\s*(?:以内|以下|之内|内|封顶)`, 'i'));
  if (upper) {
    const value = parsePriceToken(upper[1] || upper[2]);
    if (value !== null) return { minPrice: 0, maxPrice: value, applied: true, label: raw };
  }

  const lower = text.match(new RegExp(`(?:不低于|高于|大于|>=|≥)\\s*${token}|${token}\\s*(?:以上|起)`, 'i'));
  if (lower) {
    const value = parsePriceToken(lower[1] || lower[2]);
    if (value !== null) return { minPrice: value, maxPrice: Infinity, applied: true, label: raw };
  }

  const around = text.match(new RegExp(`${token}\\s*(?:左右|上下|附近|大概|约)`, 'i'));
  if (around) {
    const value = parsePriceToken(around[1]);
    if (value !== null) {
      return {
        minPrice: Math.max(0, Math.round(value * 0.8)),
        maxPrice: Math.round(value * 1.2),
        applied: true,
        label: raw
      };
    }
  }

  const simpleBudget = text.match(new RegExp(`(?:预算|价位|价格)?\\s*${token}`, 'i'));
  if (simpleBudget && /预算|价位|价格/.test(text)) {
    const value = parsePriceToken(simpleBudget[1]);
    if (value !== null) return { minPrice: 0, maxPrice: value, applied: true, label: raw };
  }

  return { minPrice: 0, maxPrice: Infinity, applied: false, label: raw };
}

const BRAND_KEYWORDS = {
  thinkpad: ['thinkpad'],
  thinkbook: ['thinkbook'],
  xiaoxin: ['小新'],
  yoga: ['yoga'],
  legion: ['拯救者', 'legion', 'y7000', 'y9000', 'r7000', 'r9000'],
  ideapad: ['ideapad'],
  lecoo: ['来酷', 'lecoo'],
  moto: ['moto', 'motorola'],
  tianyi: ['天逸'],
  thinkcentre: ['thinkcentre'],
  thinkstation: ['thinkstation'],
  zhaoyang: ['昭阳'],
  kaitian: ['开天'],
  qitian: ['启天'],
  yangtian: ['扬天'],
  ruitian: ['瑞天']
};

const BRAND_SQL = {
  thinkpad: ['ThinkPad'],
  thinkbook: ['ThinkBook'],
  xiaoxin: ['小新'],
  yoga: ['YOGA', 'Yoga', 'yoga'],
  legion: ['拯救者', 'Legion', 'LEGION', 'Y7000', 'Y9000', 'R7000', 'R9000'],
  ideapad: ['IdeaPad', 'ideapad'],
  lecoo: ['来酷', 'Lecoo', 'lecoo'],
  moto: ['moto', 'Moto', 'motorola'],
  tianyi: ['天逸'],
  thinkcentre: ['ThinkCentre'],
  thinkstation: ['ThinkStation'],
  zhaoyang: ['昭阳'],
  kaitian: ['开天'],
  qitian: ['启天'],
  yangtian: ['扬天'],
  ruitian: ['瑞天']
};

const BUSINESS_BRANDS = ['thinkpad', 'thinkbook', 'thinkcentre', 'thinkstation', 'zhaoyang', 'kaitian', 'qitian', 'yangtian', 'ruitian'];
const CONSUMER_BRANDS = ['xiaoxin', 'yoga', 'legion', 'ideapad', 'lecoo', 'moto', 'tianyi'];

function normalizeSiteType(siteType) {
  if (siteType === 'shop' || siteType === 'b' || siteType === 'biz') return siteType;
  return 'default';
}

function findExplicitBrands(text) {
  const lower = String(text || '').toLowerCase();
  const brands = [];
  for (const [brand, keywords] of Object.entries(BRAND_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) brands.push(brand);
  }
  return brands;
}

function hasBusinessIntent(text) {
  return /企业|公司|采购|商务|办公采购|批量|政企|政教|大企业|中小企业|服务器|工作站|云桌面|解决方案/.test(String(text || ''));
}

function hasSecondHandIntent(text) {
  return /二手|官翻|翻新|95新|成色/.test(String(text || ''));
}

function addBrandFilter(sql, params, brands, mode = 'include') {
  const tokens = [];
  for (const brand of brands) tokens.push(...(BRAND_SQL[brand] || []));
  if (!tokens.length) return sql;
  const clauses = tokens.map(() =>
    `(LOWER(name) ${mode === 'exclude' ? 'NOT LIKE' : 'LIKE'} LOWER(?)
      AND COALESCE(LOWER(json_extract(specs, '$.lvl1')), '') ${mode === 'exclude' ? 'NOT LIKE' : 'LIKE'} LOWER(?)
      AND COALESCE(LOWER(json_extract(specs, '$.lvl2')), '') ${mode === 'exclude' ? 'NOT LIKE' : 'LIKE'} LOWER(?)
      AND COALESCE(LOWER(json_extract(specs, '$.lvl3')), '') ${mode === 'exclude' ? 'NOT LIKE' : 'LIKE'} LOWER(?))`
  );
  if (mode === 'exclude') {
    sql += ` AND ${clauses.join(' AND ')}`;
  } else {
    sql += ` AND (${clauses.map(c => c.replace(/ AND /g, ' OR ')).join(' OR ')})`;
  }
  for (const token of tokens) {
    const like = `%${token}%`;
    params.push(like, like, like, like);
  }
  return sql;
}

function siteOrderClause(siteType) {
  if (siteType === 'shop') {
    return `CASE
      WHEN name LIKE '%小新%' THEN 0
      WHEN LOWER(name) LIKE '%yoga%' THEN 1
      WHEN name LIKE '%拯救者%' OR LOWER(name) LIKE '%legion%' THEN 2
      WHEN LOWER(name) LIKE '%ideapad%' THEN 3
      WHEN name LIKE '%天逸%' OR name LIKE '%来酷%' OR LOWER(name) LIKE '%lecoo%' THEN 4
      WHEN LOWER(name) LIKE '%thinkbook%' OR LOWER(name) LIKE '%thinkpad%' THEN 9
      ELSE 6
    END,`;
  }
  if (siteType === 'b') {
    return `CASE
      WHEN LOWER(name) LIKE '%thinkbook%' THEN 0
      WHEN LOWER(name) LIKE '%thinkpad%' THEN 1
      WHEN LOWER(name) LIKE '%thinkcentre%' THEN 2
      WHEN name LIKE '%扬天%' OR name LIKE '%瑞天%' THEN 3
      ELSE 6
    END,`;
  }
  if (siteType === 'biz') {
    return `CASE
      WHEN LOWER(name) LIKE '%thinkstation%' THEN 0
      WHEN name LIKE '%服务器%' THEN 1
      WHEN name LIKE '%工作站%' THEN 2
      WHEN name LIKE '%昭阳%' OR name LIKE '%开天%' OR name LIKE '%启天%' THEN 3
      ELSE 6
    END,`;
  }
  return '';
}

function inferBrand(product) {
  const name = product.name || '';
  const found = findExplicitBrands(name);
  return found[0] || product.brand || product.series || name;
}

function addDeviceProductGuard(sql, category) {
  const accessoryExcludes = [
    '鼠标', '键盘膜', '钢化膜', '贴膜', '保护膜', '保护壳', '皮套', '内胆包', '电脑包',
    '双肩包', '背包', '支架', '底座', '适配器', '充电器', '电源', '数据线', '扩展坞',
    '转接', '硬盘盒', '上门服务', '意外保护', '延保', '保修', '服务', '软膜',
    '全面保', 'IT管家', '随身WiFi', '无线上网', '墨水', '耗材'
  ];
  const excludeSql = accessoryExcludes.map(k => `name NOT LIKE '%${k}%'`).join(' AND ');
  if (category === '笔记本电脑') {
    return sql + ` AND COALESCE(json_extract(specs, '$.lvl1'), '') LIKE '%笔记本%' AND (${excludeSql}) AND (
      name LIKE '%笔记本%' OR name LIKE '%轻薄本%' OR name LIKE '%全能本%' OR name LIKE '%AI本%'
      OR name LIKE '%游戏本%' OR name LIKE '%设计本%' OR LOWER(name) LIKE '%laptop%'
      OR LOWER(name) LIKE '%thinkpad%' OR LOWER(name) LIKE '%thinkbook%'
      OR name LIKE '%小新%' OR LOWER(name) LIKE '%yoga%' OR name LIKE '%拯救者%'
    )`;
  }
  if (category === '平板电脑') {
    return sql + ` AND (${excludeSql}) AND (name LIKE '%平板%' OR name LIKE '%Pad%' OR name LIKE '%Tab%')`;
  }
  if (category === '台式机') {
    return sql + ` AND (${excludeSql}) AND (name LIKE '%台式%' OR name LIKE '%主机%' OR name LIKE '%一体机%' OR LOWER(name) LIKE '%thinkcentre%')`;
  }
  if (category === '显示器') {
    return sql + ` AND (${excludeSql}) AND (name LIKE '%显示器%' OR LOWER(name) LIKE '%thinkvision%')`;
  }
  return sql;
}

module.exports = {
  name: 'product_recommend',
  description: '根据用户需求（预算、用途、偏好）从产品库中查询在售商品并推荐，返回真实商品名称、价格和链接。',
  parameters: {
    type: 'object',
    properties: {
      use_case: {
        type: 'string',
        description: '用户的使用场景，如：办公、游戏、学生、设计、服务器、平板等'
      },
      budget: {
        type: 'string',
        description: '预算范围，如：3000以内、5000-8000、不限等'
      },
      preference: {
        type: 'string',
        description: '其他偏好，如：轻薄、高性能、长续航、大屏、ThinkPad、小新等'
      },
      site_type: {
        type: 'string',
        enum: ['default', 'shop', 'b', 'biz'],
        description: '当前业务入口：shop=个人及家庭，b=中小企业，biz=政教及大企业。一般由系统传入，不需要用户填写。'
      },
      overview: {
        type: 'boolean',
        description: '当用户想了解某个系列/品牌都有哪些产品（如「介绍下拯救者」「小新都有什么」「YOGA 系列有哪些」）时设为 true：会跨品类展示该系列下笔记本、平板、台式机、显示器、配件等全部品类，而不是只推一台笔记本。普通「推荐一台/带预算选购」不要设。'
      }
    },
    required: ['use_case']
  },
  execute: async ({ use_case, budget, preference, site_type, overview }, context = {}) => {
    const siteType = normalizeSiteType(site_type || context.siteType);
    const originalText = String(context.userMessage || [use_case, budget, preference].filter(Boolean).join(' '));
    const useLower = (use_case || '').toLowerCase();
    const prefLower = (preference || '').toLowerCase();
    const combined = useLower + ' ' + prefLower;

    // 确定搜索的产品类别
    let category = '笔记本电脑';
    if (combined.includes('服务器') || combined.includes('数据中心')) category = '服务器';
    else if (combined.includes('平板')) category = '平板电脑';
    else if (combined.includes('台式') || combined.includes('一体机')) category = '台式机';
    else if (combined.includes('显示') || combined.includes('屏幕')) category = '显示器';
    else if (combined.includes('工作站')) category = '工作站';

    // 确定品牌/系列筛选。显式品牌只认用户原话，避免模型在工具参数里自行加 ThinkBook/ThinkPad。
    const brandFilters = [];
    const explicitBrands = findExplicitBrands(originalText);

    if (explicitBrands.length > 0) {
      brandFilters.push(...explicitBrands);
    } else {
      if (combined.includes('游戏') || combined.includes('game')) brandFilters.push('legion');
      if ((combined.includes('商务') || combined.includes('办公')) && siteType !== 'shop') {
        brandFilters.push(siteType === 'b' ? 'thinkbook' : 'thinkpad');
      }
      if ((combined.includes('商务') || combined.includes('办公')) && siteType === 'shop') {
        brandFilters.push('xiaoxin');
        brandFilters.push('yoga');
      }
      if (siteType === 'shop' && (combined.includes('学生') || combined.includes('学习') || combined.includes('性价比'))) {
        brandFilters.push('xiaoxin');
      }
      if (siteType === 'shop' && (combined.includes('设计') || combined.includes('创意'))) brandFilters.push('yoga');
      if (combined.includes('轻薄')) {
        if (siteType === 'shop') { brandFilters.push('xiaoxin'); brandFilters.push('yoga'); }
        else if (siteType === 'b') { brandFilters.push('thinkbook'); brandFilters.push('thinkpad'); }
      }
    }

    // ── 系列全品类概览分支 ──────────────────────────────────────────────────────
    const SERIES_CN_NAME = {
      legion: '拯救者', xiaoxin: '小新', yoga: 'YOGA', thinkpad: 'ThinkPad',
      thinkbook: 'ThinkBook', ideapad: 'IdeaPad', moto: 'moto',
      tianyi: '天逸', lecoo: '来酷', thinkcentre: 'ThinkCentre',
      thinkstation: 'ThinkStation', zhaoyang: '昭阳', kaitian: '开天',
      qitian: '启天', yangtian: '扬天', ruitian: '瑞天'
    };
    const CATEGORY_ORDER = [
      '笔记本电脑', '平板电脑', '台式机', '一体机', '工作站', '显示器',
      '手机', '耳机', '键鼠', '外设', '电脑外设与配件', '包', '箱包'
    ];
    const NOISE_CATEGORIES = new Set(['服务产品']);

    const overviewIntent = /介绍|了解|有哪些|都有(什么|啥)|全系|整个系列|系列.*(有|都)|有什么(产品|机型|型号)/.test(originalText);
    const enterOverview = (overview === true || overviewIntent) && explicitBrands.length > 0 && !budget;

    if (enterOverview) {
      const seriesKey = explicitBrands[0];
      const seriesCN = SERIES_CN_NAME[seriesKey] || seriesKey;
      const EXCLUDE_TEST_OV = ` AND name NOT LIKE '%测试%' AND name NOT LIKE '%请勿下单%' AND name NOT LIKE '%勿拍%' AND name NOT LIKE '%不发货%'`;
      const excludeSecondHandOV = !hasSecondHandIntent(originalText)
        ? ` AND name NOT LIKE '%二手%' AND name NOT LIKE '%官翻%' AND name NOT LIKE '%翻新%'`
        : '';
      // 跨品类查询，去掉 category=? 限制，但带上 category 字段
      let ovSql = `SELECT name, sku, price, image_url, specs, category FROM products WHERE status = 'active'` + EXCLUDE_TEST_OV;
      const ovParams = [];
      ovSql += excludeSecondHandOV;
      // 按系列过滤（用 explicitBrands）
      ovSql = addBrandFilter(ovSql, ovParams, explicitBrands, 'include');
      ovSql += ` ORDER BY price ASC LIMIT 200`;

      const ovRows = db.prepare(ovSql).all(...ovParams);

      // 按 category 分组，每组 name 去重取前 4 款
      const grouped = {};
      for (const row of ovRows) {
        const cat = row.category || '其它';
        if (NOISE_CATEGORIES.has(cat)) continue;
        if (!grouped[cat]) grouped[cat] = { seenNames: new Set(), items: [] };
        const nameKey = String(row.name || '').replace(/\s+/g, '').toLowerCase();
        if (grouped[cat].seenNames.has(nameKey)) continue;
        grouped[cat].seenNames.add(nameKey);
        if (grouped[cat].items.length < 4) {
          let specs = {};
          try { specs = JSON.parse(row.specs || '{}'); } catch {}
          grouped[cat].items.push({
            name: row.name,
            sku: row.sku,
            price: row.price,
            image_url: row.image_url || '',
            brand: specs.brand || '',
            series: specs.lvl3 || '',
            description: specs.lvl3 || cat,
            url: specs.url || specs.pcDetailUrl || `https://item.lenovo.com.cn/product/${row.sku}.html`,
            category: cat
          });
        }
      }

      // 品类排序：先按 CATEGORY_ORDER 固定顺序，剩余品类末尾追加
      const catKeys = Object.keys(grouped);
      const orderedCats = [
        ...CATEGORY_ORDER.filter(c => catKeys.includes(c)),
        ...catKeys.filter(c => !CATEGORY_ORDER.includes(c))
      ];

      // flat products，每品类最多 4 款，总上限 24
      const ovProducts = [];
      for (const cat of orderedCats) {
        if (ovProducts.length >= 24) break;
        const items = grouped[cat].items.slice(0, Math.min(4, 24 - ovProducts.length));
        ovProducts.push(...items);
      }

      return {
        action: 'frontend_display',
        title: `${seriesCN} · 全系产品`,
        products: ovProducts,
        total_active: ovRows.length,
        grouped: true,
        query: { use_case, budget: null, preference, site_type: siteType, overview: true },
        note: `以上为「${seriesCN}」系列在售商品全品类概览，涵盖笔记本、平板、台式机、显示器等各品类，每类最多展示 4 款代表性产品，点击任意商品可查看详情。`
      };
    }
    // ── 概览分支结束 ─────────────────────────────────────────────────────────────

    const budgetRange = parseBudgetRange(budget);
    const { minPrice, maxPrice } = budgetRange;

    // 构建SQL查询
    // 排除测试商品
    const EXCLUDE_TEST = ` AND name NOT LIKE '%测试%' AND name NOT LIKE '%请勿下单%' AND name NOT LIKE '%勿拍%' AND name NOT LIKE '%不发货%'`;
    const excludeSecondHand = !hasSecondHandIntent(originalText)
      ? ` AND name NOT LIKE '%二手%' AND name NOT LIKE '%官翻%' AND name NOT LIKE '%翻新%'`
      : '';
    let sql = `SELECT name, sku, price, image_url, specs FROM products WHERE status = 'active' AND category = ?` + EXCLUDE_TEST;
    const params = [category];
    sql += excludeSecondHand;
    sql = addDeviceProductGuard(sql, category);

    if (minPrice > 0) { sql += ` AND price >= ?`; params.push(minPrice); }
    if (maxPrice < Infinity) { sql += ` AND price <= ?`; params.push(maxPrice); }

    if (brandFilters.length > 0) {
      sql = addBrandFilter(sql, params, brandFilters, 'include');
    } else if (siteType === 'shop' && !hasBusinessIntent(originalText)) {
      sql = addBrandFilter(sql, params, BUSINESS_BRANDS, 'exclude');
    } else if (siteType === 'b') {
      sql = addBrandFilter(sql, params, ['thinkstation', 'zhaoyang', 'kaitian', 'qitian'], 'exclude');
    } else if (siteType === 'biz') {
      sql = addBrandFilter(sql, params, ['xiaoxin', 'yoga', 'legion', 'ideapad', 'lecoo', 'moto'], 'exclude');
    }

    sql += ` ORDER BY ${siteOrderClause(siteType)} price ASC LIMIT 20`;

    let rows = db.prepare(sql).all(...params);

    // 如果品牌筛选无结果，放宽条件重查
    if (rows.length === 0 && brandFilters.length > 0) {
      let fallbackSql = `SELECT name, sku, price, image_url, specs FROM products WHERE status = 'active' AND category = ?` + EXCLUDE_TEST;
      const fallbackParams = [category];
      fallbackSql += excludeSecondHand;
      fallbackSql = addDeviceProductGuard(fallbackSql, category);
      if (minPrice > 0) { fallbackSql += ` AND price >= ?`; fallbackParams.push(minPrice); }
      if (maxPrice < Infinity) { fallbackSql += ` AND price <= ?`; fallbackParams.push(maxPrice); }
      if (siteType === 'shop' && !hasBusinessIntent(originalText)) {
        fallbackSql = addBrandFilter(fallbackSql, fallbackParams, BUSINESS_BRANDS, 'exclude');
      }
      fallbackSql += ` ORDER BY ${siteOrderClause(siteType)} price ASC LIMIT 20`;
      rows = db.prepare(fallbackSql).all(...fallbackParams);
    }

    // 格式化结果
    const products = rows.map(row => {
      let specs = {};
      try { specs = JSON.parse(row.specs || '{}'); } catch {}
      return {
        name: row.name,
        sku: row.sku,
        price: row.price,
        image_url: row.image_url || '',
        brand: specs.brand || '',
        series: specs.lvl3 || '',
        description: (specs.lvl3 || category),
        url: specs.url || specs.pcDetailUrl || `https://item.lenovo.com.cn/product/${row.sku}.html`
      };
    });

    // 按品牌去重，每品牌最多取3款，总共最多8款
    const byBrand = {};
    const seenNames = new Set();
    const results = [];
    for (const p of products) {
      const nameKey = String(p.name || '').replace(/\s+/g, '').toLowerCase();
      if (seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      const key = inferBrand(p);
      byBrand[key] = (byBrand[key] || 0) + 1;
      if (byBrand[key] <= 3 && results.length < 8) results.push(p);
    }

    const totalActive = db.prepare(
      `SELECT count(*) as cnt FROM products WHERE status = 'active' AND category = ?`
    ).get(category);

    const title = budget ? `${budget}${category}推荐` : `${use_case}${category}推荐`;

    return {
      action: 'frontend_display',
      title,
      products: results,
      total_active: totalActive?.cnt || 0,
      budget_applied: budgetRange.applied,
      query: { use_case, budget, preference, site_type: siteType, category, minPrice, maxPrice: maxPrice < Infinity ? maxPrice : null },
      note: `以上为${category}类目在售商品${budgetRange.applied ? `，已按预算「${budgetRange.label}」筛选` : ''}。当前入口为${siteType === 'shop' ? '个人及家庭，已优先消费线' : siteType === 'b' ? '中小企业' : siteType === 'biz' ? '政教及大企业' : '首页'}；所有链接均为官网真实商品页。如需更多筛选条件请告知。`
    };
  }
};

module.exports._parseBudgetRange = parseBudgetRange;
