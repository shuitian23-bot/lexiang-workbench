/* Education benefits use the existing authentication and product-result surfaces. */
(() => {
  'use strict';
  const marker = 'education-offer-20260915';
  const specsOf = p => { try { return typeof p?.specs === 'string' ? JSON.parse(p.specs) : p?.specs || {}; } catch { return {}; } };
  function matches(text) {
    const value = String(text || '').trim().replace(/\s+/g, '');
    if (!value || value.length > 160) return false;
    if (/(?:不要|不用|无需|不想|不需要|取消|停止|关闭).{0,10}(?:教育|学生|教师|老师|师生|高考)/.test(value)) return false;
    if (/对比|比较|下单|待支付|生成订单|支付订单|取消订单|订单详情|退款|退货/.test(value)) return false;
    if (/(?:购买|选购).{0,6}第[一二三四五六七八九十\d]+/.test(value)) return false;
    return /(?:教育|学生|在校生|大学生|师生|教师|老师|高考).{0,16}(?:特惠|优惠|折扣|打折|福利|权益|补贴)|(?:教育|学生|教师|师生)(?:专享|专属)?价/.test(value);
  }
  const kind = text => /高考/.test(text) ? 'gaokao' : /教师|老师/.test(text) ? 'teacher' : 'college';
  const verified = () => window.__lxReadEducationState?.()?.status === 'verified';
  const isProducts = products => Array.isArray(products) && products.length > 0 && products.every(p => specsOf(p).lx_education_offer === marker);
  async function load(token, query) {
    const gen = window.__lxGeneration;
    const response = await gen.fetch(token, '/api/products?site=shop&limit=96', { cache:'no-store' });
    if (!response.ok) throw new Error('教育优惠商品加载失败');
    const payload = await gen.wait(token, response.json());
    if (!Array.isArray(payload)) throw new Error('商品数据不可用');
    // Keep the education zone's notebook/tablet selection and original catalog prices.
    // Eligibility and final education prices are confirmed by the activity and product detail.
    const seen = new Set();
    let products = payload.filter(p => {
      const sku = String(p?.sku || '');
      if (!sku || seen.has(sku) || !(Number(p.price) > 0) || !p.image_url || (p.status && p.status !== 'active')) return false;
      if (!/笔记本|平板/.test(p.category || '')) return false;
      seen.add(sku); return true;
    });
    if (/平板|pad/i.test(query)) products = products.filter(p => /平板/.test(p.category));
    else if (/笔记本|电脑|轻薄本|游戏本/.test(query)) products = products.filter(p => /笔记本/.test(p.category));
    const family = String(query).match(/YOGA|小新|拯救者|来酷/i)?.[0];
    if (family) products = products.filter(p => p.name.toLowerCase().includes(family.toLowerCase()));
    return products.slice(0, 12).map(p => ({...p, specs:{...specsOf(p), lx_education_offer:marker}}));
  }
  const copy = count => `发现你已经完成**教育优惠认证**，无需重复认证。已为你整理 **${count} 款教育优惠商品**，可结合学习、办公需求挑选。\n\n点击下方**查看教育优惠商品**，了解配置与价格，也可继续咨询或对比。具体优惠、适用资格及最终价格，以商品详情和活动规则为准。`;
  async function run(host) {
    const gen = window.__lxGeneration, token = host.token;
    if (!verified()) return await gen.wait(token, host.authenticate(kind(host.query)));
    host.busy(true);
    try {
      host.trace(['已识别教育优惠需求，正在读取认证状态', '教育身份已认证，正在调用 Skill(教育优惠商品推荐)'], false);
      const products = await gen.wait(token, load(token, host.query));
      if (!verified()) {
        await gen.wait(token, host.answer('教育认证状态已更新，请先完成**教育身份认证**后查看优惠商品。'));
        return await gen.wait(token, host.authenticate(kind(host.query)));
      }
      host.trace(['教育身份已认证，无需重复认证', 'Skill(教育优惠商品推荐) 已完成'], true);
      if (!products.length) {
        await gen.wait(token, host.answer('发现你已经完成**教育优惠认证**。暂时没有找到符合这次需求的商品，可换一个品牌或品类，或发送“教育特惠”查看当前商品。'));
        return;
      }
      await gen.wait(token, host.answer(copy(products.length)));
      const result = host.card(products);
      await gen.wait(token, new Promise(resolve => gen.timeout(token, resolve, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 720)));
      if (gen.current(token) && verified()) host.open(products, result);
    } catch (error) {
      if (gen.current(token)) await gen.wait(token, host.answer('你已完成**教育优惠认证**，商品暂时加载失败。请稍后重新发送“教育特惠”重试。'));
    } finally { if (gen.current(token)) { host.busy(false); host.save(); } }
  }
  window.__lxEducationOffers = { matches, kind, verified, isProducts, load, run };
})();
