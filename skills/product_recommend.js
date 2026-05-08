// Skill: 联想产品推荐（基于products表实时数据）
const db = require('../db/schema');

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

    // 确定品牌/系列筛选
    const brandFilters = [];
    if (combined.includes('游戏') || combined.includes('game') || combined.includes('拯救者')) brandFilters.push('拯救者');
    if (combined.includes('商务') || combined.includes('办公') || combined.includes('thinkpad')) brandFilters.push('thinkpad');
    if (combined.includes('学生') || combined.includes('学习') || combined.includes('小新') || combined.includes('性价比')) brandFilters.push('小新');
    if (combined.includes('设计') || combined.includes('创意') || combined.includes('yoga')) brandFilters.push('yoga');
    if (combined.includes('thinkbook')) brandFilters.push('thinkbook');
    if (combined.includes('轻薄')) { brandFilters.push('小新'); brandFilters.push('yoga'); }

    // 解析预算
    let minPrice = 0, maxPrice = Infinity;
    if (budget) {
      const m1 = budget.match(/(\d+)\s*[以-]?\s*内/);
      const m2 = budget.match(/(\d+)\s*[-~到至]\s*(\d+)/);
      const m3 = budget.match(/(\d+)\s*以上/);
      if (m1) maxPrice = parseInt(m1[1]);
      else if (m2) { minPrice = parseInt(m2[1]); maxPrice = parseInt(m2[2]); }
      else if (m3) minPrice = parseInt(m3[1]);
    }

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
      query: { use_case, budget, preference, category },
      note: `以上为${category}类目在售商品（共${totalActive?.cnt || 0}款在售），所有链接均为官网真实商品页。如需更多筛选条件请告知。`
    };
  }
};
