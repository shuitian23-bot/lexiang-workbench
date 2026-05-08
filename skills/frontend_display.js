// Skill: 将商品推送到左侧展示画布
// AI 查询/推荐商品后调用此 skill，结果会通过 SSE event:display 渲染到左侧画布

const db = require('../db/schema');

module.exports = {
  name: 'frontend_display',
  description: '将商品展示到左侧浏览区画布。当AI为用户推荐了商品、查询了商品列表后，调用此工具让商品以卡片形式展示在左侧浏览区，方便用户边看边聊。参数：title（展示标题）、keyword（搜索关键词）、category（分类筛选）、max_price/min_price（价格范围）、skus（指定SKU列表）、limit（数量，默认12）。至少提供keyword/category/skus之一。',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '展示区标题，如"5000元以下笔记本推荐"' },
      keyword: { type: 'string', description: '搜索关键词' },
      category: { type: 'string', description: '分类，如 笔记本电脑/台式机/显示器/服务器' },
      min_price: { type: 'number', description: '最低价格' },
      max_price: { type: 'number', description: '最高价格' },
      skus: { type: 'array', items: { type: 'string' }, description: '指定SKU列表' },
      limit: { type: 'number', description: '返回数量，默认12，最多24' }
    },
    required: ['title']
  },
  execute: async ({ title, keyword, category, min_price, max_price, skus, limit }) => {
    limit = Math.min(limit || 12, 24);
    let rows = [];

    if (skus?.length) {
      const placeholders = skus.map(() => '?').join(',');
      rows = db.prepare(`SELECT * FROM products WHERE sku IN (${placeholders}) AND status = 'active'`).all(...skus);
    } else {
      let sql = `SELECT * FROM products WHERE status = 'active' AND name NOT LIKE '%测试%' AND name NOT LIKE '%请勿下单%' AND name NOT LIKE '%勿拍%' AND name NOT LIKE '%不发货%'`;
      const params = [];
      if (keyword) { sql += ` AND name LIKE ?`; params.push(`%${keyword}%`); }
      if (category) { sql += ` AND category = ?`; params.push(category); }
      if (min_price > 0) { sql += ` AND price >= ?`; params.push(min_price); }
      if (max_price > 0) { sql += ` AND price <= ?`; params.push(max_price); }
      sql += ` ORDER BY sort_order DESC, price ASC LIMIT ?`;
      params.push(limit);
      rows = db.prepare(sql).all(...params);
    }

    const products = rows.map(row => {
      let specs = {};
      try { specs = JSON.parse(row.specs || '{}'); } catch {}
      return {
        name: row.name,
        sku: row.sku,
        price: row.price,
        original_price: row.original_price,
        image_url: row.image_url || '',
        description: row.category + (specs.lvl3 ? ' · ' + specs.lvl3 : ''),
        url: specs.url || `https://item.lenovo.com.cn/product/${row.sku}.html`
      };
    });

    return {
      action: 'frontend_display',
      title,
      products,
      count: products.length,
      message: products.length ? `已在左侧展示${products.length}款商品` : '未找到符合条件的商品'
    };
  }
};
