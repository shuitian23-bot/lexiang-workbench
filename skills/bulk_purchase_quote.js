// Skill: 中小企业批量采购询价（mock 出阶梯价 + BD 对接）
const db = require('../db/schema');

module.exports = {
  name: 'bulk_purchase_quote',
  description: '中小企业批量采购询价：根据机型 + 数量给出阶梯报价，并附 BD 对接方式与开票要求。当用户问「批量采购 / 团购 / 几十台报价 / 阶梯价 / 集采」时调用。',
  parameters: {
    type: 'object',
    properties: {
      product_name: { type: 'string', description: '机型名，如 ThinkBook 16+ 2026 / 拯救者 R7000P / 天逸 510S' },
      quantity:     { type: 'integer', description: '采购数量' },
      industry:     { type: 'string', description: '行业，如 互联网 / 制造 / 教培' },
    },
    required: ['quantity'],
  },
  execute: ({ product_name, quantity, industry }) => {
    var name = product_name || 'ThinkBook 16+ 2026';
    // 取 products 表查实际单价
    var row = null;
    try {
      row = db.prepare(`SELECT name, price FROM products WHERE status='active' AND name LIKE ? ORDER BY sort_order DESC, id DESC LIMIT 1`).get('%' + name + '%');
    } catch {}
    var unit = row && row.price ? row.price : 9999;
    var realName = row ? row.name : name;
    var qty = parseInt(quantity, 10) || 10;
    // 阶梯折扣
    var tiers = [
      { min:1,  max:9,   disc:0,    label:'零售价' },
      { min:10, max:29,  disc:0.05, label:'10 台起 95 折' },
      { min:30, max:99,  disc:0.08, label:'30 台起 92 折' },
      { min:100,max:299, disc:0.12, label:'100 台起 88 折' },
      { min:300,max:999, disc:0.15, label:'300 台起 85 折' },
      { min:1000,max:99999, disc:0.20, label:'1000 台起 8 折（专项谈）' },
    ];
    var hit = tiers.find(t => qty >= t.min && qty <= t.max) || tiers[0];
    var unitFinal = Math.round(unit * (1 - hit.disc));
    var totalRetail = unit * qty;
    var totalFinal = unitFinal * qty;
    var save = totalRetail - totalFinal;
    var rows = tiers.map(function(t){
      var u = Math.round(unit * (1 - t.disc));
      var hi = (qty >= t.min && qty <= t.max) ? ' **' : '';
      var hiEnd = hi ? '** ←' : '';
      return `| ${hi}${t.min}-${t.max === 99999 ? '∞' : t.max} 台${hiEnd} | ¥${u.toLocaleString()} | ${(t.disc*100).toFixed(0)}% off |`;
    }).join('\n');
    return {
      action:'frontend_modal', type:'info',
      title: '💼 批量采购报价单',
      content:
`## 询价机型：${realName}

**数量**：${qty} 台 ${industry ? '（行业：' + industry + '）' : ''}

| 数量区间 | 单价 | 折扣 |
|---|---|---|
${rows}

---

## 您的方案：${hit.label}

| 项目 | 金额 |
|---|---|
| 零售单价 | ¥${unit.toLocaleString()} |
| **优惠后单价** | **¥${unitFinal.toLocaleString()}** |
| 总价 | ¥${totalFinal.toLocaleString()} |
| **节省** | **¥${save.toLocaleString()}** |

---

## 增值赠送（${qty} 台起）
- ✅ **企业开票**：增值税专票（13%）
- ✅ **统一镜像**：预装公司域账号 + 软件清单 + 资产 logo 贴标
- ✅ **批量上门**：免费上门安装（北上广深 24h，其他城市 48h）
- ✅ **3 年保修**：含上门 + 优先响应
${qty >= 30 ? '- ✅ **专属 BD**：1 位区域顾问 1 对 1 跟进\n- ✅ **培训**：免费现场使用培训 1 次' : ''}
${qty >= 100 ? '- ✅ **资产管家**：免费部署联想 IT Asset Manager 1 年\n- ✅ **远程运维**：含 9×5 工程师电话支持' : ''}

---

## 下一步

1. 确认数量与机型 → 生成正式报价单 PDF（含税）
2. 提交营业执照 + 开户行 → 开通企业账户
3. 区域 BD 30 分钟内电话联络（工作日内）

**联系方式**：400-810-1234 转 5 ｜ 企业购小程序「BD 直联」

*POC 演示报价，正式价以联想企业购合同为准*`,
    };
  },
};
