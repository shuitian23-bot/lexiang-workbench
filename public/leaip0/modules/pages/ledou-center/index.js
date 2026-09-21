/* 我的乐豆 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/ledou-center"]) {
window.__p0Modules.installed["pages/ledou-center"]=true;

/* Business: is */
window.__p0Modules.factories["pages/ledou-center#is:7793044067a0ff5fcc4fcbaf"]=function(__p0Scope){"use strict";return (function is(){(0,__p0Scope.Qt)("points","乐豆","asset:points","tab")}); };

/* Business: renderLedouRecords */
window.__p0Modules.factories["pages/ledou-center#renderLedouRecords:1dfed6f16d2b758ed58eb833"]=function(__p0Scope){"use strict";return (function renderLedouRecords(records) {
    return '<div class="leai-ledou-table" role="table" aria-label="乐豆明细"><div class="leai-ledou-table-head" role="row"><span>详情名称</span><span>乐豆数</span><span>状态</span><span>平台</span><span>获取时间</span><span>到期时间</span></div>' + records.map(function (record) {
      return '<article class="leai-ledou-record" role="row" data-ledou-record data-asset-record-status="' + (0,__p0Scope.escapeHtml)(record.status) + '"><span class="leai-ledou-record-name"><strong>' + (0,__p0Scope.escapeHtml)(record.title) + '</strong><small>' + (0,__p0Scope.escapeHtml)(record.sourceDescription) + '</small></span><em>' + (0,__p0Scope.escapeHtml)(record.amount) + '</em><span>' + (record.status === "used" ? "使用" : "获得") + '</span><span>' + (0,__p0Scope.escapeHtml)(record.sourceChannel) + '</span><time>' + (0,__p0Scope.escapeHtml)(record.acquiredAt) + '</time><time>' + (0,__p0Scope.escapeHtml)(record.expiresAt) + '</time></article>';
    }).join("") + '</div>';
  }); };

/* Business: memberLedouShowcase */
window.__p0Modules.factories["pages/ledou-center#memberLedouShowcase:5efbcd1c2a01303de0d1f8c3"]=function(__p0Scope){"use strict";return (function memberLedouShowcase() {
    return '<section class="leai-panel leai-ledou-showcase" data-member-section="ledou-products"><div class="leai-panel-head"><div><h2 class="leai-panel-title">乐豆好物</h2><p>用乐豆加价换购精选好物，以下为 Mock 示例。</p></div><button class="leai-ledou-more" type="button" data-ledou-more>查看更多 <img src="' + __p0Scope.icons.next + '" alt=""></button></div><div class="leai-ledou-products">' + __p0Scope.ledouCatalog.map(__p0Scope.ledouProductCard).join("") + '</div><p class="leai-member-disclaimer">商品、兑换额度、库存和成交价格以乐豆商城实时页面为准。</p></section>';
  }); };

/* Business: ledouProductCard */
window.__p0Modules.factories["pages/ledou-center#ledouProductCard:b3327362141d7b7cecf2b51f"]=function(__p0Scope){"use strict";return (function ledouProductCard(product) {
    return '<button class="leai-ledou-product" type="button" data-ledou-product="' + product.id + '"><span><img src="' + product.icon + '" alt=""></span><span><small>会员兑购</small><strong>' + product.name + '</strong><em>' + product.price + '</em></span><img src="' + __p0Scope.icons.next + '" alt=""></button>';
  }); };

/* Business: ledouPage */
window.__p0Modules.factories["pages/ledou-center#ledouPage:93ae8b8fc2ed36b1041ac398"]=function(__p0Scope){"use strict";return (function ledouPage() {
    return '<section class="leai-page" data-ledou-page aria-labelledby="leaiLedouTitle"><header class="leai-page-header"><div><h1 class="leai-page-title" id="leaiLedouTitle">乐豆好物</h1><p class="leai-page-desc">使用乐豆加价换购精选好物，选择商品可查看完整兑购说明。</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.rewards + '" alt="">2,580 乐豆</span></header><section class="leai-panel"><div class="leai-ledou-products">' + __p0Scope.ledouCatalog.map(__p0Scope.ledouProductCard).join("") + '</div><p class="leai-member-disclaimer">当前商品、价格和库存均为 Mock 演示；实际可兑商品、乐豆额度和成交价格以乐豆商城实时页面为准。</p></section></section>';
  }); };

/* Business: ledouProductPage */
window.__p0Modules.factories["pages/ledou-center#ledouProductPage:7159c945c3c3b597b0df49a3"]=function(__p0Scope){"use strict";return (function ledouProductPage(id) {
    var product = (0,__p0Scope.findLedouProduct)(id);
    return '<section class="leai-page" data-ledou-product-page aria-labelledby="leaiLedouProductTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">乐豆好物</p><h1 class="leai-page-title" id="leaiLedouProductTitle">' + product.name + '</h1><p class="leai-page-desc">' + product.description + '</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.rewards + '" alt="">会员兑购</span></header><section class="leai-panel leai-ledou-detail"><div class="leai-ledou-detail-visual"><img src="' + product.icon + '" alt=""></div><div><span>参考兑购价</span><strong>' + product.price + '</strong><p>当前账户展示 2,580 乐豆，是否可兑、库存与运费需以实时商城结算页为准。</p><button class="leai-primary" type="button" data-member-asset="points">查看我的乐豆</button></div></section><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">兑购说明</h2><p>浏览信息使用完整页面承接。</p></div></div><p class="leai-detail-copy">商品详情、乐豆抵扣比例、现金补差、库存、运费和售后规则以乐豆商城实时页面为准。当前页面不发起真实交易。</p></section></section>';
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
