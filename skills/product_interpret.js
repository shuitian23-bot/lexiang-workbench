// Skill: 商品解读 — 基于当前 products 表生成单品购买解读
const db = require('../db/schema');

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentence(value, max = 34) {
  const text = clean(value).replace(/[。；;]+$/g, '');
  return text.length > max ? text.slice(0, max) : text;
}

module.exports = {
  name: 'product_interpret',
  description: '读取唯一商品库中的指定 SKU，生成约 80 字、重点有字重层级的单品解读，并返回商详所需完整商品对象。',
  parameters: {
    type: 'object',
    properties: {
      sku: { type: 'string', description: '商品 SKU' },
      site: { type: 'string', enum: ['shop', 'b', 'biz'], description: '当前频道' }
    },
    required: ['sku']
  },
  execute: async ({ sku, site }) => {
    const row = db.prepare('SELECT * FROM products WHERE sku = ? AND status = \'active\'').get(String(sku || ''));
    if (!row) throw new Error('商品不存在或已下架');
    let specs = {};
    try { specs = JSON.parse(row.specs || '{}') || {}; } catch {}
    if (site && specs.site && specs.site !== site) throw new Error('商品不属于当前频道');

    const name = clean(specs.short_name || specs.spu_name || row.name || '这款商品');
    const category = clean(row.category || '联想产品');
    const sellingPoint = sentence(row.description || specs.configuration_name || specs.copywriting || '', 24);
    const price = Number(row.price) > 0 ? `目前参考价 **¥${Number(row.price).toLocaleString('zh-CN')}**` : '当前价格需以页面实时信息为准';
    const useCase = category.includes('服务器') ? '适合稳定运行业务系统与数据服务'
      : category.includes('工作站') ? '适合专业创作、工程设计与高负载计算'
      : category.includes('台式') ? '适合固定工位的稳定办公与集中部署'
      : category.includes('选件') ? '适合补齐日常办公与移动使用体验'
      : '适合结合办公、学习或专业应用需求选择';
    const point = sellingPoint || `定位于${category}的稳定使用体验`;
    const interpretation = `**${name}**：${point}。${useCase}；${price}。建议核对具体配置与可享权益。`;

    return {
      skill: '商品解读',
      interpretation,
      product: { ...row, specs },
      source: 'leai product data'
    };
  }
};
