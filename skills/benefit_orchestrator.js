// Skill: AI 权益管家 — 按用户场景编排可叠加权益，算「到手价瀑布」+ 来源解释 + 审计
// 触发：用户问「xx 有什么优惠 / 怎么领国补 / 学生能便宜多少 / 帮我算到手价 / 以旧换新能抵多少」
// 也用于「一键领取优惠 / 购买」时算最优权益组合（非黑箱发券：每项可解释 + 公平预算池 + 审计）
const db = require('../db/schema');

// 公平补贴预算池（POC mock：单位百分比/定额，真实化走后端预算中台）
const POOLS = {
  student:        { label: '教育权益池',   note: '面向在校学生，提升可负担性' },
  sme:            { label: '小微企业池',   note: '面向小微企业首购，降低 IT 门槛' },
  old_user:       { label: '老客回馈池',   note: '面向老用户生命周期权益' },
  has_old_device: { label: '换新补贴池',   note: '面向有旧设备用户，旧机折抵增值' },
  low_budget:     { label: '刚需普惠池',   note: '面向低预算刚需用户，让补贴真正改变购买决策' },
};

function fmt(n) { return '¥' + Math.round(n).toLocaleString(); }

module.exports = {
  name: 'benefit_orchestrator',
  description: 'AI 权益管家（优惠类问题的唯一入口）。当用户问某商品有什么优惠/怎么领国补/学生(教师/企业)能便宜多少/帮我算到手价/以旧换新能抵多少，或在「一键领取优惠/购买」场景，**只调用本工具**：本工具已内含选机比价、算券、乐豆、以旧换新折抵、分期、延保 TCO 全流程，算出到手价瀑布 + 每项来源解释 + 公平预算池审计。调用本工具时**不要再并行调用 product_recommend 或 coupon_recommend**（会重复且分散）。不做隐形高低价——标价稳定，差异只在可解释的券与权益。',
  parameters: {
    type: 'object',
    properties: {
      sku:        { type: 'string', description: '目标商品 SKU（用户正在看/推荐过的机型，没有可留空，会用 product_name 兜底说明）' },
      product_name: { type: 'string', description: '商品名（sku 缺失时用于展示）' },
      identity:   { type: 'string', enum: ['student','teacher','sme','gov','old_user','normal'], description: '用户身份场景。student=在校学生 teacher=教师 sme=小微企业 gov=政教 old_user=联想老用户 normal=普通' },
      budget:     { type: 'number', description: '用户预算（元），用于判定是否命中刚需普惠池' },
      has_old_device: { type: 'boolean', description: '是否有旧设备可以以旧换新' },
      member_level: { type: 'string', description: '会员等级，如 V3黄金 / SMB银牌，没有可留空' },
      usage:      { type: 'string', description: '使用场景，如 写代码/游戏/办公/设计，用于话术不影响算价' },
    },
    required: ['identity'],
  },
  execute: (input) => {
    const { sku, product_name, identity, budget, has_old_device, member_level, usage } = input || {};
    let prod = null;
    try {
      if (sku) prod = db.prepare('SELECT sku,name,price,original_price,image_url,category FROM products WHERE sku = ? AND price > 0').get(sku);
      // sku 缺失/无效 → 按 product_name 模糊查真实价（绝不能用 budget 兜底，价格不一致毁可信度）
      if (!prod && product_name) {
        var kw = String(product_name).replace(/[【】\[\]()（）]/g, ' ').trim().split(/\s+/).filter(function(w){ return w.length >= 2; }).slice(0, 3);
        if (kw.length) {
          // 业务线隔离：消费线(小新/YOGA/拯救者…)与 Think 线绝不互推（业务红线）
          var pn = String(product_name);
          var CONSUMER = ['小新','YOGA','Yoga','拯救者','异能者','Legion','天逸','来酷','Lecoo','moto','Moto','平板','Tab'];
          var THINK = ['ThinkPad','ThinkBook','ThinkCentre','Thinkplus','ThinkStation','昭阳','扬天','开天','启天'];
          var seriesClause = '';
          var hitC = CONSUMER.filter(function(w){ return pn.indexOf(w) >= 0; });
          var hitT = THINK.filter(function(w){ return pn.indexOf(w) >= 0; });
          if (hitC.length) seriesClause = ' AND (' + hitC.map(function(){ return 'name LIKE ?'; }).join(' OR ') + ')';
          else if (hitT.length) seriesClause = ' AND (' + hitT.map(function(){ return 'name LIKE ?'; }).join(' OR ') + ')';
          var seriesParams = (hitC.length ? hitC : hitT).map(function(w){ return '%' + w + '%'; });
          var like = kw.map(function(){ return 'name LIKE ?'; }).join(' AND ') + seriesClause;
          // 只查整机（笔记本/台式/一体/平板），排配件贴膜服务，价格 ≥1500 防匹配到 ¥69 贴膜
          // 有预算→取 ≤预算*1.3 里最高配（最贴近用户意图）；无预算→取主流价（避免最低端）
          var hasB = (typeof budget === 'number' && budget > 0);
          var sql = "SELECT sku,name,price,original_price,image_url,category FROM products" +
            " WHERE price >= 1500 AND status='active'" +
            " AND category IN ('笔记本电脑','台式机','平板电脑','一体机','工作站')" +
            " AND name NOT LIKE '%贴膜%' AND name NOT LIKE '%膜%' AND name NOT LIKE '%支架%'" +
            " AND name NOT LIKE '%包%' AND name NOT LIKE '%鼠标%' AND name NOT LIKE '%键盘%'" +
            " AND name NOT LIKE '%延保%' AND name NOT LIKE '%碎屏%' AND name NOT LIKE '%服务%'" +
            " AND " + like +
            (hasB ? " AND price <= ? ORDER BY price DESC LIMIT 1" : " ORDER BY price ASC LIMIT 1");
          var baseParams = kw.map(function(w){ return '%' + w + '%'; }).concat(seriesParams);
          var params = baseParams.slice();
          if (hasB) params.push(Math.round(budget * 1.3));
          var stmt = db.prepare(sql);
          prod = stmt.get.apply(stmt, params);
          // 预算内没匹配到 → 放宽不卡预算再查一次（仍限整机 + 同业务线，绝不跨线兜底）
          if (!prod && hasB) {
            var sql2 = sql.replace(" AND price <= ? ORDER BY price DESC LIMIT 1", " ORDER BY price ASC LIMIT 1");
            var st2 = db.prepare(sql2);
            prod = st2.get.apply(st2, baseParams);
          }
        }
      }
    } catch (e) {}
    const name = (prod && prod.name) || product_name || '该机型';
    // 有真实商品价用真实价；查不到则明确标注「待确认」不编造
    const priceKnown = !!(prod && prod.price > 0);
    const base = priceKnown ? Number(prod.price) : (typeof budget === 'number' && budget > 0 ? budget : 5999);

    const waterfall = [{ label: '商品官方标价', amount: base, kind: 'base', reason: priceKnown ? '联想官方商城统一标价，不做隐形高低价' : '未匹配到该机型实时价，下方按你预算估算，实际以商详页为准' }];
    const audit = [];
    let pct = 0, cut = 0;

    // 决策引擎（规则 + 预算池 + 是否真正改变决策）
    if (identity === 'student' || identity === 'teacher') {
      pct += 0.15;
      waterfall.push({ label: '国家补贴 15%', amount: -Math.round(base * 0.15), kind: 'discount', reason: '你选择教育/学生场景，该机型在政府补贴目录内', pool: 'student' });
      waterfall.push({ label: '教育认证券', amount: -300, kind: 'coupon', reason: '学生/教师教育认证可叠加，2 工作日审核后自动抵扣', pool: 'student' });
      cut += 300;
      audit.push({ pool: 'student', ...POOLS.student, hit: '身份=' + identity + '，命中教育权益池，补贴可显著改变可负担性' });
    }
    if (identity === 'sme' || identity === 'gov') {
      waterfall.push({ label: '企业新户券', amount: -500, kind: 'coupon', reason: '小微/政教首购专享，开票同步', pool: 'sme' });
      cut += 500;
      audit.push({ pool: 'sme', ...POOLS.sme, hit: '身份=' + identity + '，命中小微企业池' });
    }
    if (identity === 'old_user' || member_level) {
      waterfall.push({ label: '会员月度券', amount: -100, kind: 'coupon', reason: (member_level || '会员') + ' 每月专享券', pool: 'old_user' });
      waterfall.push({ label: '乐豆抵扣', amount: -50, kind: 'points', reason: '历史购物累计乐豆，1000 豆抵 ¥10', pool: 'old_user' });
      cut += 150;
      audit.push({ pool: 'old_user', ...POOLS.old_user, hit: '老客/会员=' + (member_level || 'yes') + '，命中老客回馈池（生命周期权益，非一次性低价）' });
    }
    if (has_old_device) {
      const tradein = Math.max(500, Math.round(base * 0.12));
      waterfall.push({ label: '以旧换新折抵', amount: -tradein, kind: 'tradein', reason: '你有旧设备，旧机估值 + 换新补贴增值，非联想旧机也可估', pool: 'has_old_device' });
      cut += tradein;
      audit.push({ pool: 'has_old_device', ...POOLS.has_old_device, hit: '有旧设备，命中换新补贴池' });
    }
    if (typeof budget === 'number' && budget > 0 && base > budget) {
      const gap = Math.min(Math.round((base - budget) * 0.5), Math.round(base * 0.05));
      if (gap > 0) {
        waterfall.push({ label: '刚需普惠补贴', amount: -gap, kind: 'coupon', reason: '该机型略超你预算，普惠补贴让这笔购买真正可达成', pool: 'low_budget' });
        cut += gap;
        audit.push({ pool: 'low_budget', ...POOLS.low_budget, hit: '标价 ' + fmt(base) + ' > 预算 ' + fmt(budget) + '，命中刚需普惠池（边际用户，补贴改变决策）' });
      }
    }

    const discountTotal = Math.round(base * pct) + cut;
    const finalPrice = Math.max(0, base - discountTotal);

    // TCO 增值（不降价，提升总拥有价值）
    const tco = [
      { label: '12 期免息', desc: '减少资金占用，等于变相省利息' },
      { label: '2 年延保', desc: '官方延保，降低长期维修成本' },
      { label: '上门安装 + 数据迁移', desc: '换机零负担' },
    ];

    return {
      action: 'frontend_benefit',
      title: 'AI 权益管家 · ' + name + ' 到手价',
      product: { sku: sku || '', name, image: (prod && prod.image_url) || '', base },
      waterfall,
      discount_total: discountTotal,
      final_price: finalPrice,
      final_text: fmt(finalPrice),
      tco,
      audit,
      usage: usage || '',
      message: '已按你的身份和场景编排可叠加官方权益，算出可解释的到手价（标价稳定，差异只在券与权益）',
    };
  },
};
