(function () {
  'use strict';
  if (window.__lxMemberCouponCenterV1) return;
  window.__lxMemberCouponCenterV1 = true;

  function couponData(tab) {
    if (tab === 'service') return [
      { value: '¥30', name: '会员专享清洁保养券', desc: '指定清洁保养服务满 299 减 30', time: '2026.08.01 00:00–2026.09.01 23:59', detail: '适用于联想指定清洁保养服务，具体可用范围以结算页为准。' },
      { value: '¥100', name: '延保服务抵扣券', desc: '指定延保服务满 899 减 100', time: '2026.08.01 00:00–2026.09.30 23:59', detail: '适用于指定设备延保服务，不与其他同类优惠叠加。' }
    ];
    if (tab === 'store') return [
      { value: '¥80', name: '门店到店专享券', desc: '到店购买指定笔记本满 5000 减 80', time: '2026.08.01 00:00–2026.09.15 23:59', detail: '限参与活动的联想门店使用，实际适用商品及门店以现场规则为准。' },
      { value: '9折', name: '门店配件优惠券', desc: '指定联想配件到店享 9 折', time: '2026.08.10 00:00–2026.09.30 23:59', detail: '适用于活动门店指定电脑配件，单笔订单限使用一张。' }
    ];
    return [
      { value: '¥100', name: '会员专享券', desc: '全品类满 5000 减 100', time: '2026.08.01 00:00–2026.09.30 23:59', detail: '适用于联想商城指定商品，订单金额满 5000 元可减 100 元。' },
      { value: '8折', name: '配件优惠券', desc: '指定电脑配件 8 折券', time: '2026.08.10 00:00–2026.09.10 23:59', detail: '适用于指定电脑配件，优惠商品范围以活动及结算页为准。' }
    ];
  }

  function pageHtml(tab) {
    tab = ["product", "service", "store"].includes(tab) ? tab : "product";
    var cards = couponData(tab).map(function(coupon, index) {
      var typeLabel = tab === 'service' ? '服务券' : tab === 'store' ? '门店券' : (/配件/.test(coupon.name + coupon.desc) ? '配件券' : '购物券');
      var dates = coupon.time.match(/\d{4}\.\d{2}\.\d{2}/g) || [];
      var dateRange = dates.length > 1 ? dates[0]+'–'+dates[1] : coupon.time;
      return '<article class="leai-coupon-card" role="button" tabindex="0" data-lx-coupon-id="'+tab+'-'+index+'" data-lx-coupon-hint="点击可查看可用商品和优惠详情" aria-label="'+coupon.desc+'，点击可查看可用商品和优惠详情"><div class="leai-coupon-value"><strong>'+typeLabel+'</strong></div><div class="leai-coupon-copy"><h3>'+coupon.desc+'</h3><p>'+dateRange+'</p></div></article>';
    }).join('');
    var tabs = [['product','商品权益'],['service','服务权益'],['store','门店权益']].map(function(item){
      return '<button type="button" role="tab" data-lx-coupon-tab="'+item[0]+'" aria-selected="'+(item[0]===tab)+'" class="'+(item[0]===tab?'is-active':'')+'">'+item[1]+'</button>';
    }).join('');
    return '<div class="lx-member-component-host"><section class="leai-page leai-member-asset-page leai-coupon-page lx-coupon-center" data-lx-coupon-center><header class="leai-page-header"><h1 class="leai-page-title">会员领券中心</h1><p class="leai-page-desc">会员专享优惠，领取后可在结算页自动使用</p></header><div class="leai-asset-filterbar"><div class="leai-asset-filter-tabs" role="tablist" aria-label="会员优惠券分类">'+tabs+'</div></div><section class="leai-coupon-grid-section"><div class="leai-coupon-list">'+cards+'</div></section></section></div>';
  }

  function matches(query) {
    const value = String(query || '').trim().replace(/[\s，。！？、,.!?“”"'‘’]/g, '');
    // Explicit coupon-center requests precede product, store and legacy coupon intents.
    // Keep coupon use, purchase and explanation questions on their existing routes.
    return /^(?:(?:请|麻烦|帮我|帮忙|为我|给我|我想|我要|想要|想|要|打开|查看|看看|看下|看一下|查询|查一下|进入|去|看)){0,6}(?:会员优惠券|我的优惠券|门店优惠券)(?:中心|页面)?(?:吧|一下|有哪些)?$/.test(value);
  }

  function describe(query) {
    var category = String(query).indexOf('门店') > -1 ? 'store' : 'product';
    var copy = category === 'store'
      ? '已为你整理**门店优惠券**，涵盖到店购机与配件优惠。可在右侧**会员领券中心**查看适用内容和有效期。'
      : '已为你整理**会员优惠券**，涵盖商品、服务与门店权益。可在右侧**会员领券中心**查看优惠内容和有效期。';
    return {category: category, copy: copy, desc: category === 'store' ? '门店权益 · 到店购机与配件优惠' : '商品权益 · 服务权益 · 门店权益'};
  }

  async function run(api) {
    var generation = window.__lxGeneration;
    var token = api.token;
    var data = describe(api.query);
    var category = data.category;
    var copy = data.copy;
    api.state.sending = true;
    api.refresh();
    try {
      var reply = api.message('assistant', copy);
      if (reply && reply._typingDone) await generation.wait(token, reply._typingDone);
      if (!generation.current(token)) return false;
      api.appendCard(reply, api.card({
        title: '查看会员领券中心',
        desc: data.desc,
        attr: 'data-lx-open-tab="info:member-coupon-center" aria-label="查看会员领券中心页面"'
      }));
      var card = reply && reply.querySelector('[data-lx-result-id="info:member-coupon-center"]');
      if (card) card.classList.add('lx-document-card-enter');
      await generation.wait(token, new Promise(function (resolve) {
        if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          generation.frame(token, function () { generation.frame(token, resolve); });
          return;
        }
        card.addEventListener('animationend', resolve, {once:true});
        generation.timeout(token, resolve, 700);
      }));
      if (!generation.current(token)) return false;
      api.enterSplit();
      api.open(category);
      api.state.queryHistory.push(api.query);
      api.history();
      return true;
    } finally {
      if (generation.current(token)) {
        api.state.sending = false;
        api.refresh();
        if (typeof window.__lxSaveConversationNow === 'function') window.__lxSaveConversationNow();
      }
    }
  }

  const couponRules = {
    'product-0': { scope: 'shopping', minimum: 5000, platform: '联想商城，具体适用渠道以券面规则为准' },
    'product-1': { scope: 'accessory', minimum: 0, platform: '联想商城，具体适用渠道以券面规则为准' },
    'service-0': { scope: 'cleaning', minimum: 299, platform: '联想指定清洁保养服务渠道，以服务商品详情为准' },
    'service-1': { scope: 'warranty', minimum: 899, platform: '联想指定延保服务渠道，以服务商品详情为准' },
    'store-0': { scope: 'notebook', minimum: 5000, platform: '参与活动的联想门店，需到店使用' },
    'store-1': { scope: 'accessory', minimum: 0, platform: '参与活动的联想门店，需到店使用' }
  };
  const allCoupons = () => ['product', 'service', 'store'].flatMap(category => couponData(category).map((coupon, index) => ({...coupon, id: category + '-' + index, category, ...couponRules[category + '-' + index]})));
  const couponById = id => allCoupons().find(coupon => coupon.id === id) || null;
  const couponQuery = coupon => '查看“' + coupon.desc + '”优惠券的可用商品和优惠详情';
  const normalizedQuery = text => String(text || '').replace(/[\s，。！？、,.!?“”"'‘’]/g, '');
  function matchCouponQuery(text) {
    const value = normalizedQuery(text);
    if (!value || value.length > 180 || /不要|不用|取消|停止|关闭|下单|支付|退款/.test(value)) return null;
    if (!/详情|解读|使用说明|适用商品|可用商品/.test(value)) return null;
    return allCoupons().find(coupon => value.includes(normalizedQuery(coupon.desc)) || value.includes(normalizedQuery(coupon.name))) || null;
  }
  const productSpecs = product => { try { return typeof product?.specs === 'string' ? JSON.parse(product.specs) : product?.specs || {}; } catch (_) { return {}; } };
  function productsCoupon(products) {
    if (!Array.isArray(products) || !products.length) return null;
    const id = productSpecs(products[0]).lx_coupon_id;
    return id && products.every(product => productSpecs(product).lx_coupon_id === id) ? couponById(id) : null;
  }
  async function loadCouponProducts(coupon, token) {
    const gen = window.__lxGeneration;
    let catalog;
    if (coupon.scope === 'cleaning') {
      catalog = window.__lxServiceRecommendationProducts?.() || [];
    } else {
      const response = await gen.fetch(token, '/api/products?limit=200', {cache: 'no-store'});
      if (!response.ok) throw new Error('优惠券商品加载失败');
      catalog = await gen.wait(token, response.json());
      if (!Array.isArray(catalog)) throw new Error('商品数据不可用');
    }
    const seen = new Set();
    return catalog.filter(product => {
      const sku = String(product?.sku || ''), price = Number(product?.price), specs = productSpecs(product);
      if (!sku || seen.has(sku) || !(price > 0) || !product.image_url || (product.status && product.status !== 'active')) return false;
      if (price < coupon.minimum) return false;
      const category = String(product.category || ''), name = String(product.name || '');
      let eligible = false;
      if (coupon.scope === 'shopping') eligible = specs.site === 'shop' && /笔记本|台式机|手机|平板/.test(category);
      if (coupon.scope === 'notebook') eligible = specs.site === 'shop' && category === '笔记本';
      if (coupon.scope === 'accessory') eligible = /配件|外设|选件/.test(category) || (category === '办公' && /ThinkVision|显示器|鼠标|键盘|扩展坞|耳机/i.test(name));
      if (coupon.scope === 'cleaning') eligible = /清灰|清洁|保养/.test(name);
      if (coupon.scope === 'warranty') eligible = /服务/.test(category) && /延保|延长.{0,8}(?:保修|送修)/.test(name + String(specs.configuration_name || ''));
      if (eligible) seen.add(sku);
      return eligible;
    }).slice(0, 12).map(product => ({...product, specs: {...productSpecs(product), lx_coupon_id: coupon.id}}));
  }
  function couponValidity(coupon) {
    const dates = coupon.time.match(/\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}/g) || [];
    const timestamp = date => Date.parse(date.replace(/\./g, '-').replace(' ', 'T') + ':00+08:00');
    if (dates.length === 2 && Date.now() > timestamp(dates[1])) return '该券已过期，当前不可抵扣；下方仅供查看适用范围商品。';
    if (dates.length === 2 && Date.now() < timestamp(dates[0])) return '该券尚未到使用期，请在生效后核对使用资格。';
    return '请在有效期内使用，过期作废；最终优惠以结算页确认为准。';
  }
  function couponExplanation(coupon) {
    return '**优惠券详细说明｜' + coupon.name + '**\n**优惠内容：**' + coupon.desc + '。\n**有效期：**' + coupon.time + '。\n**适用平台：**' + coupon.platform + '。\n**使用说明：**' + coupon.detail + couponValidity(coupon);
  }
  const couponProductCopy = count => '已按券面范围整理 **' + count + ' 款对应商品**，点击下方卡片可查看配置与价格，并继续挑选或对比。实际适用资格及优惠，以活动规则和结算页为准。';
  async function runCouponProducts(host) {
    const coupon = matchCouponQuery(host.query), gen = window.__lxGeneration, token = host.token;
    if (!coupon) return false;
    host.busy(true);
    try {
      host.trace(['已识别优惠券：' + coupon.desc, '正在调用 Skill(优惠券解读与可用商品)'], false);
      const products = await gen.wait(token, loadCouponProducts(coupon, token));
      host.trace(['已读取优惠内容、有效期与使用说明', 'Skill(优惠券解读与可用商品) 已完成'], true);
      const next = products.length ? couponProductCopy(products.length) : '暂时没有找到这张券对应的商品，请稍后重试，或选择其他优惠券查看。';
      await gen.wait(token, host.answer(couponExplanation(coupon) + '\n\n' + next));
      if (!products.length || !gen.current(token)) return true;
      const result = host.card(products, coupon);
      await gen.wait(token, new Promise(resolve => gen.timeout(token, resolve, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 720)));
      if (gen.current(token)) host.open(products, result, coupon);
      return true;
    } catch (error) {
      if (gen.current(token)) {
        host.trace(['已读取优惠券规则', '优惠券商品暂时加载失败，可稍后重试'], true);
        await gen.wait(token, host.answer(couponExplanation(coupon) + '\n\n商品暂时加载失败，请稍后再次点击这张优惠券重试。'));
      }
      return true;
    } finally { if (gen.current(token)) { host.busy(false); host.save(); } }
  }
  function submitCouponQuery(id) {
    const coupon = couponById(id);
    if (!coupon || window.__lxState?.sending) return;
    const query = couponQuery(coupon);
    if (document.body.classList.contains('assistant-fullscreen') && typeof window.lxfdSubmit === 'function') {
      window.lxfdSubmit(query);
      return;
    }
    const composer = document.querySelector('.assistant-panel .composer'), input = composer?.querySelector('textarea');
    if (!input) return;
    input.value = query;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    composer.requestSubmit();
  }

  window.__lxCouponCenter = { pageHtml, matches, describe, run, matchCouponQuery, productsCoupon, runProducts: runCouponProducts };
  document.addEventListener('keydown', function (event) {
    const card = event.target.closest('[data-lx-coupon-id]');
    if (!card || !['Enter', ' '].includes(event.key) || event.repeat) return;
    event.preventDefault();submitCouponQuery(card.dataset.lxCouponId);
  });
  document.addEventListener('click', function (event) {
    const card = event.target.closest('[data-lx-coupon-id]');
    if (card) { event.preventDefault();submitCouponQuery(card.dataset.lxCouponId);return; }
    var tab = event.target.closest('[data-lx-coupon-tab]');
    if (tab && typeof window.__lxOpenCouponCenter === 'function') {
      window.__lxOpenCouponCenter(tab.dataset.lxCouponTab);
    }
  });
}());
