// Skill: AI 直接对商品库设筛选条件并把结果推到左侧 displayCanvas
// 与 product_recommend 区别：filter 是 LLM 多轮中的二次缩窄（用户说"再贵一点"/"只看 ThinkPad"），
// 直接接受结构化筛选参数（价格/品牌/系列/category）；不做意图解析、不调用其它 skill。
const db = require('../db/schema');

const ALLOWED_CATEGORIES = ['笔记本电脑','台式机','工作站','服务器','平板电脑','手机','显示器','键鼠相关','耳机','存储设备','充电设备','智能会议解决方案','解决方案'];
const SERIES_KEYWORDS = ['拯救者','小新','YOGA','异能者','ThinkPad','ThinkBook','ThinkCentre','ThinkStation','天逸','扬天','昭阳','刃9000K','Legion','Moto','thinkplus'];

const EXCLUDE_KEYWORDS = ['测试','限定款T-Shirt','徽章','T恤','POLO','马年限定','二手优品'];

module.exports = {
  name: 'frontend_filter',
  description: '在用户已经看到一批商品后，按其追加的筛选条件（价格区间 / 系列 / 分类）直接 SQL 查商品并推送到左侧浏览画布。常用场景：用户说"再贵一点"/"只看 ThinkPad"/"5000 以下的"/"换台式机看"。返回最多 24 件商品，前端会展示已 applied 的筛选标签。',
  parameters: {
    type: 'object',
    properties: {
      site_type: { type: 'string', enum: ['shop','b','biz','default'], description: '业务入口，由系统注入' },
      category: { type: 'string', description: '商品大类，如：笔记本电脑、台式机、工作站、服务器、平板电脑、手机、显示器、键鼠相关、耳机、存储设备、充电设备、智能会议解决方案、解决方案' },
      series: { type: 'string', description: '品牌系列关键词，如：拯救者、小新、YOGA、ThinkPad、ThinkBook、天逸、扬天等' },
      price_min: { type: 'number', description: '最低价格（元）' },
      price_max: { type: 'number', description: '最高价格（元）' },
      keyword: { type: 'string', description: '名称关键词，如「2026」「锐龙」「轻薄」' },
      title: { type: 'string', description: '展示给用户的筛选标题（一句话），如「ThinkPad 5000-8000 元」' },
    },
    required: [],
  },
  execute: ({ site_type, category, series, price_min, price_max, keyword, title }, context = {}) => {
    const where = ["status='active'", "image_url IS NOT NULL", "image_url != ''"];
    const params = [];
    EXCLUDE_KEYWORDS.forEach(s => { where.push('name NOT LIKE ?'); params.push(`%${s}%`); });

    if (category && ALLOWED_CATEGORIES.includes(category)) {
      where.push('category = ?'); params.push(category);
    }
    if (series) {
      // 多系列用逗号分隔支持
      const list = String(series).split(/[,，\s]+/).filter(Boolean);
      const ors = list.map(()=>'name LIKE ?').join(' OR ');
      where.push(`(${ors})`);
      list.forEach(s => params.push(`%${s}%`));
    }
    if (keyword) {
      where.push('name LIKE ?'); params.push(`%${keyword}%`);
    }
    if (typeof price_min === 'number' && price_min > 0) { where.push('price >= ?'); params.push(price_min); }
    if (typeof price_max === 'number' && price_max > 0) { where.push('price <= ?'); params.push(price_max); }

    const sql = `
      SELECT id, sku, name, category, price, original_price, image_url, description
      FROM products WHERE ${where.join(' AND ')}
      ORDER BY sort_order DESC, id DESC
      LIMIT 24
    `;
    const rows = db.prepare(sql).all(...params);

    const filterTags = [];
    if (category) filterTags.push(category);
    if (series) filterTags.push(series);
    if (typeof price_min === 'number' && price_min > 0) filterTags.push('≥¥' + price_min);
    if (typeof price_max === 'number' && price_max > 0) filterTags.push('≤¥' + price_max);
    if (keyword) filterTags.push('"' + keyword + '"');

    const finalTitle = title || (filterTags.length ? '筛选：' + filterTags.join(' · ') : '商品列表');

    return {
      action: 'frontend_filter',
      title: finalTitle,
      filter_tags: filterTags,
      products: rows,
      total: rows.length,
      site_type: site_type || context.siteType || 'default',
      note: rows.length === 0 ? '当前条件无匹配商品，请放宽筛选' : `已为您筛选出 ${rows.length} 件商品，展示在左侧画布`,
    };
  },
};
