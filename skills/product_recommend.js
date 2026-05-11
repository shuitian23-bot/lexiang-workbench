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
      }
    },
    required: ['use_case']
  },
  execute: async ({ use_case, budget, preference }) => {
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

    // 确定品牌/系列筛选 — 明确品牌优先，不叠加场景推断
    const brandFilters = [];
    const explicitBrands = [];
    if (combined.includes('thinkpad')) explicitBrands.push('thinkpad');
    if (combined.includes('thinkbook')) explicitBrands.push('thinkbook');
    if (combined.includes('小新')) explicitBrands.push('小新');
    if (combined.includes('拯救者')) explicitBrands.push('拯救者');
    if (combined.includes('yoga')) explicitBrands.push('yoga');

    if (explicitBrands.length > 0) {
      brandFilters.push(...explicitBrands);
    } else {
      if (combined.includes('游戏') || combined.includes('game')) brandFilters.push('拯救者');
      if (combined.includes('商务') || combined.includes('办公')) brandFilters.push('thinkpad');
      if (combined.includes('学生') || combined.includes('学习') || combined.includes('性价比')) brandFilters.push('小新');
      if (combined.includes('设计') || combined.includes('创意')) brandFilters.push('yoga');
      if (combined.includes('轻薄')) { brandFilters.push('小新'); brandFilters.push('yoga'); }
    }

    const budgetRange = parseBudgetRange(budget);
    const { minPrice, maxPrice } = budgetRange;

    // 构建SQL查询
    // 排除测试商品
    const EXCLUDE_TEST = ` AND name NOT LIKE '%测试%' AND name NOT LIKE '%请勿下单%' AND name NOT LIKE '%勿拍%' AND name NOT LIKE '%不发货%'`;
    let sql = `SELECT name, sku, price, image_url, specs FROM products WHERE status = 'active' AND category = ?` + EXCLUDE_TEST;
    const params = [category];

    if (minPrice > 0) { sql += ` AND price >= ?`; params.push(minPrice); }
    if (maxPrice < Infinity) { sql += ` AND price <= ?`; params.push(maxPrice); }

    if (brandFilters.length > 0) {
      const brandClauses = brandFilters.map(() =>
        `(json_extract(specs, '$.brand') LIKE ? OR json_extract(specs, '$.lvl3') LIKE ?)`
      );
      sql += ` AND (${brandClauses.join(' OR ')})`;
      for (const b of brandFilters) { params.push(`%${b}%`, `%${b}%`); }
    }

    sql += ` ORDER BY price ASC LIMIT 20`;

    let rows = db.prepare(sql).all(...params);

    // 如果品牌筛选无结果，放宽条件重查
    if (rows.length === 0 && brandFilters.length > 0) {
      let fallbackSql = `SELECT name, sku, price, image_url, specs FROM products WHERE status = 'active' AND category = ?` + EXCLUDE_TEST;
      const fallbackParams = [category];
      if (minPrice > 0) { fallbackSql += ` AND price >= ?`; fallbackParams.push(minPrice); }
      if (maxPrice < Infinity) { fallbackSql += ` AND price <= ?`; fallbackParams.push(maxPrice); }
      fallbackSql += ` ORDER BY price ASC LIMIT 20`;
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
        url: specs.url || `https://item.lenovo.com.cn/product/${row.sku}.html`
      };
    });

    // 按品牌去重，每品牌最多取3款，总共最多8款
    const byBrand = {};
    const results = [];
    for (const p of products) {
      const key = p.brand || p.name;
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
      query: { use_case, budget, preference, category, minPrice, maxPrice: maxPrice < Infinity ? maxPrice : null },
      note: `以上为${category}类目在售商品${budgetRange.applied ? `，已按预算「${budgetRange.label}」筛选` : ''}（共${totalActive?.cnt || 0}款在售），所有链接均为官网真实商品页。如需更多筛选条件请告知。`
    };
  }
};

module.exports._parseBudgetRange = parseBudgetRange;
