// Skill: 在前端弹出模态框（商品对比、订单确认等）
const db = require('../db/schema');

module.exports = {
  name: 'frontend_modal',
  description: '弹出模态框展示结构化内容。支持两种类型：1) compare（商品对比）：传入多个SKU，前端展示参数对比表格；2) info（信息卡片）：展示自定义标题+内容。当用户要求"比较"、"对比"多款产品时使用compare类型。',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['compare', 'info'], description: '弹层类型：compare=商品对比，info=信息展示' },
      title: { type: 'string', description: '弹层标题' },
      skus: { type: 'array', items: { type: 'string' }, description: 'compare模式下要对比的SKU列表（2-4个）' },
      content: { type: 'string', description: 'info模式下的展示内容（支持markdown）' }
    },
    required: ['type', 'title']
  },
  execute: async ({ type, title, skus, content }) => {
    if (type === 'compare') {
      if (!skus?.length || skus.length < 2) {
        return { action: 'frontend_modal', type, title, error: '对比至少需要2款商品SKU' };
      }
      const placeholders = skus.map(() => '?').join(',');
      const rows = db.prepare(`SELECT * FROM products WHERE sku IN (${placeholders}) AND status = 'active'`).all(...skus);
      const products = rows.map(row => {
        let specs = {};
        try { specs = JSON.parse(row.specs || '{}'); } catch {}
        return {
          name: row.name, sku: row.sku, price: row.price,
          original_price: row.original_price,
          category: row.category,
          image_url: row.image_url || '',
          description: row.description || '',
          specs,
          url: specs.url || `https://item.lenovo.com.cn/product/${row.sku}.html`
        };
      });
      if (products.length < 2) {
        return { action: 'frontend_modal', type, title, error: '未找到足够的商品进行对比，找到' + products.length + '款' };
      }
      return { action: 'frontend_modal', type, title, products, count: products.length };
    }

    // info 类型
    return { action: 'frontend_modal', type, title, content: content || '' };
  }
};
