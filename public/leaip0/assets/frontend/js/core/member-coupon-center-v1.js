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
    var cards = couponData(tab).map(function(coupon) {
      var typeLabel = tab === 'service' ? '服务券' : tab === 'store' ? '门店券' : (/配件/.test(coupon.name + coupon.desc) ? '配件券' : '购物券');
      var dates = coupon.time.match(/\d{4}\.\d{2}\.\d{2}/g) || [];
      var dateRange = dates.length > 1 ? dates[0]+'–'+dates[1] : coupon.time;
      return '<article class="leai-coupon-card"><div class="leai-coupon-value"><strong>'+typeLabel+'</strong></div><div class="leai-coupon-copy"><h3>'+coupon.desc+'</h3><p>'+dateRange+'</p></div></article>';
    }).join('');
    var tabs = [['product','商品权益'],['service','服务权益'],['store','门店权益']].map(function(item){
      return '<button type="button" role="tab" data-lx-coupon-tab="'+item[0]+'" aria-selected="'+(item[0]===tab)+'" class="'+(item[0]===tab?'is-active':'')+'">'+item[1]+'</button>';
    }).join('');
    return '<div class="lx-member-component-host"><section class="leai-page leai-member-asset-page leai-coupon-page lx-coupon-center" data-lx-coupon-center><header class="leai-page-header"><h1 class="leai-page-title">会员领券中心</h1><p class="leai-page-desc">会员专享优惠，领取后可在结算页自动使用</p></header><div class="leai-asset-filterbar"><div class="leai-asset-filter-tabs" role="tablist" aria-label="会员优惠券分类">'+tabs+'</div></div><section class="leai-coupon-grid-section"><div class="leai-coupon-list">'+cards+'</div></section></section></div>';
  }

  function matches(query) {
    return /^(会员优惠券|我的优惠券|门店优惠券)$/.test(String(query || '').replace(/[\s，。！？、,.!?]/g, ''));
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

  window.__lxCouponCenter = { pageHtml: pageHtml, matches: matches, describe: describe, run: run };
  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-lx-coupon-tab]');
    if (tab && typeof window.__lxOpenCouponCenter === 'function') {
      window.__lxOpenCouponCenter(tab.dataset.lxCouponTab);
    }
  });
}());
