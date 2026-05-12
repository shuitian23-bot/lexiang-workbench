// Skill: 以旧换新估价 — AI 多轮收集旧机信息后调此 skill 出抵扣报价
const db = require('../db/schema');

// 简版估价规则（POC 演示）：基础价 × 成色系数 + 配置加成
const MODEL_BASE = {
  // 拯救者系列
  'Y9000P': { 2024: 5800, 2023: 4500, 2022: 3500, 2021: 2600 },
  'Y7000P': { 2024: 4200, 2023: 3300, 2022: 2500, 2021: 1900 },
  'R9000P': { 2024: 5200, 2023: 4000, 2022: 3100 },
  'R7000P': { 2024: 3800, 2023: 3000, 2022: 2300 },
  // 小新
  '小新Pro': { 2024: 3200, 2023: 2400, 2022: 1800 },
  '小新': { 2024: 2200, 2023: 1700, 2022: 1300 },
  // ThinkPad
  'ThinkPad X1': { 2024: 7500, 2023: 5800, 2022: 4500, 2021: 3500 },
  'ThinkPad T14': { 2024: 4800, 2023: 3700, 2022: 2900, 2021: 2200 },
  'ThinkPad T16': { 2024: 5200, 2023: 4000, 2022: 3100 },
  'ThinkPad E14': { 2024: 2800, 2023: 2100, 2022: 1600 },
  'ThinkBook 16+': { 2024: 3800, 2023: 2900, 2022: 2200 },
  'ThinkBook 14+': { 2024: 3200, 2023: 2500, 2022: 1900 },
  // YOGA
  'YOGA Pro': { 2024: 4500, 2023: 3500, 2022: 2700 },
  'YOGA Air': { 2024: 3800, 2023: 2900, 2022: 2200 },
  'YOGA Book': { 2024: 5200, 2023: 4000 },
};

const CONDITION_RATIO = {
  '全新':   1.0, '95新': 0.92, '九五新':0.92,
  '九成新': 0.85, '九新':0.85,
  '八成新': 0.70, '八新':0.70,
  '七成新': 0.50, '七新':0.50,
  '六成新': 0.35, '五成新':0.25,
  '有划痕': 0.65, '良好':0.85, '完美':0.95,
};

function pickModelKey(modelStr) {
  const m = String(modelStr || '');
  const keys = Object.keys(MODEL_BASE);
  for (const k of keys) {
    if (m.toLowerCase().includes(k.toLowerCase())) return k;
  }
  return null;
}

function pickConditionRatio(cond) {
  const c = String(cond || '');
  for (const k of Object.keys(CONDITION_RATIO)) {
    if (c.includes(k)) return { ratio:CONDITION_RATIO[k], label:k };
  }
  return { ratio: 0.7, label: '默认八成新' };
}

function configBonus(config) {
  const c = String(config || '').toLowerCase();
  let bonus = 1.0;
  // RAM
  if (/64g/.test(c)) bonus += 0.15;
  else if (/32g/.test(c)) bonus += 0.08;
  else if (/16g/.test(c)) bonus += 0;
  else if (/8g/.test(c))  bonus -= 0.08;
  // SSD
  if (/2t|2tb/.test(c))   bonus += 0.10;
  else if (/1t|1tb/.test(c)) bonus += 0.05;
  else if (/512/.test(c))    bonus += 0;
  else if (/256/.test(c))    bonus -= 0.05;
  // GPU 独显
  if (/4090|5090/.test(c)) bonus += 0.20;
  else if (/4080|5080/.test(c)) bonus += 0.15;
  else if (/4070|5070/.test(c)) bonus += 0.10;
  else if (/4060|5060|3060/.test(c)) bonus += 0.05;
  return Math.max(0.5, Math.min(1.6, bonus));
}

function recommendUpgrade(oldKey, valuation) {
  // 推荐相似系列新一代机型（用 products 表）
  const filters = {
    'Y9000P': { kw:'Y9000P 2025', cat:'笔记本电脑' },
    'Y7000P': { kw:'Y7000P 2025', cat:'笔记本电脑' },
    'R9000P': { kw:'R9000P 2025', cat:'笔记本电脑' },
    'R7000P': { kw:'R7000P 2025', cat:'笔记本电脑' },
    '小新Pro': { kw:'小新 Pro', cat:'笔记本电脑' },
    '小新': { kw:'小新', cat:'笔记本电脑' },
    'ThinkPad X1': { kw:'ThinkPad X1', cat:'笔记本电脑' },
    'ThinkPad T14': { kw:'ThinkPad T14', cat:'笔记本电脑' },
    'ThinkPad T16': { kw:'ThinkPad T16', cat:'笔记本电脑' },
    'ThinkPad E14': { kw:'ThinkPad E14', cat:'笔记本电脑' },
    'ThinkBook 16+': { kw:'ThinkBook 16+', cat:'笔记本电脑' },
    'ThinkBook 14+': { kw:'ThinkBook 14+', cat:'笔记本电脑' },
    'YOGA Pro': { kw:'YOGA Pro', cat:'笔记本电脑' },
    'YOGA Air': { kw:'YOGA Air', cat:'笔记本电脑' },
    'YOGA Book': { kw:'YOGA Book', cat:'笔记本电脑' },
  };
  const f = filters[oldKey];
  if (!f) return [];
  try {
    return db.prepare(`
      SELECT name, sku, price, image_url FROM products
      WHERE status='active' AND category=? AND name LIKE ? AND image_url IS NOT NULL AND image_url != ''
        AND name NOT LIKE '%二手%' AND name NOT LIKE '%测试%'
      ORDER BY sort_order DESC, id DESC LIMIT 3
    `).all(f.cat, `%${f.kw}%`);
  } catch { return []; }
}

module.exports = {
  name: 'tradein_estimate',
  description: '以旧换新估价：根据用户描述的旧机型号、成色、关键配置计算抵扣价，并推荐 2-3 件新机型。当用户表达「以旧换新 / 旧机抵扣 / 用旧机换新机 / 旧的换新的」并提供至少型号 + 成色信息时调用。如果信息不全，应在自然语言中先追问，不要急于调用本工具。',
  parameters: {
    type: 'object',
    properties: {
      old_model:    { type: 'string', description: '旧机型号，如 ThinkPad T14 2021 / 拯救者 Y9000P 2023 / 小新 Pro 14' },
      condition:    { type: 'string', description: '外观成色，如 九成新 / 八成新 / 全新 / 七成新 / 有划痕' },
      config:       { type: 'string', description: '配置概要，如 i7 16G 512G RTX3060 / 酷睿U7 32G 1T' },
      use_year:     { type: 'integer', description: '购机年份，如 2023' },
    },
    required: ['old_model','condition'],
  },
  execute: ({ old_model, condition, config, use_year }) => {
    const key = pickModelKey(old_model);
    if (!key) {
      return {
        action: 'frontend_modal',
        type: 'info',
        title: '♻️ 以旧换新',
        content: `未识别您的型号「${old_model || '未知'}」。请补充描述（如「拯救者 Y9000P 2023 款」「ThinkPad T14 2022」）。\n\n常见可估价系列：拯救者 Y/R 系列、小新 Pro/小新、ThinkPad X1/T14/T16/E14、ThinkBook 16+/14+、YOGA Pro/Air/Book。`,
      };
    }
    const yearMap = MODEL_BASE[key];
    const year = use_year && yearMap[use_year] ? use_year : Math.max(...Object.keys(yearMap).map(Number));
    const base = yearMap[year];
    const cond = pickConditionRatio(condition);
    const bonus = configBonus(config);
    const valuation = Math.round(base * cond.ratio * bonus / 50) * 50;
    const couponBoost = 300;  // 「换新加码券」叠加
    const total = valuation + couponBoost;
    const upgrades = recommendUpgrade(key, total);
    const upgradeRows = upgrades.length
      ? upgrades.map(u => `| ${u.name.slice(0,32)} | ¥${u.price.toLocaleString()} | ¥${(u.price - total).toLocaleString()} |`).join('\n')
      : '（暂无对应新机型推荐，请告诉我换购意向）';
    const content =
`## 您的旧机抵扣价

| 项目 | 详情 |
|---|---|
| 型号 | ${key}（${year} 款） |
| 成色 | ${cond.label}（系数 ${cond.ratio.toFixed(2)}） |
| 配置加成 | × ${bonus.toFixed(2)} |
| **基础抵扣** | **¥${valuation.toLocaleString()}** |
| 换新加码券 | + ¥${couponBoost} |
| **合计可抵** | **¥${total.toLocaleString()}** |

---

## 推荐换购新机

| 新机型 | 价格 | 抵扣后实付 |
|---|---|---|
${upgradeRows}

---

**下一步**：选择换购机型 → 自动生成抵扣订单 + 旧机上门取件 + 7 天无忧退换。

*POC 演示估价，正式回收价以联想 IT 服务事业部到货检测为准。*`;
    return {
      action: 'frontend_modal',
      type: 'info',
      title: '♻️ 以旧换新估价结果',
      content,
      data: { key, year, base, condition: cond.label, ratio: cond.ratio, bonus, valuation, total, upgrades },
    };
  },
};
