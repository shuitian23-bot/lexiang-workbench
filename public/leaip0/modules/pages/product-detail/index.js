/* 商品详情 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/product-detail"]) {
window.__p0Modules.installed["pages/product-detail"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/product-detail-benefits-v182.js */
window.__p0Modules.sources["u55a37e2dc06d5ada"]=function(){
(function () {
  "use strict";

  if (window.__lxProductDetailBenefitsV182) return;
  window.__lxProductDetailBenefitsV182 = true;

  function numberFrom(value) {
    var matches = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
    if (!matches || !matches.length) return 0;
    return Math.round(Number(matches[matches.length - 1]) || 0);
  }

  function format(value) {
    return Math.max(0, Math.round(value)).toLocaleString("zh-CN");
  }

  function currentPrice(detail) {
    var active = detail.querySelector('.lx-spu-chip.is-active [class*="price"], .lx-spu-chip.is-active[data-detail-price-value]');
    var activeValue = active && (active.getAttribute("data-detail-price-value") || active.textContent);
    var source = activeValue || (detail.querySelector("[data-detail-price] .detail-price-main, [data-detail-price], .detail-price-main, .detail-price") || {}).textContent;
    return numberFrom(source);
  }

  function couponFor(price) {
    if (price >= 8000) return { threshold: 8000, reduction: 500 };
    if (price >= 5000) return { threshold: 5000, reduction: 300 };
    if (price >= 3000) return { threshold: 3000, reduction: 200 };
    return { threshold: 1000, reduction: 100 };
  }

  function ensureNode(detail) {
    var info = detail.querySelector(".detail-info");
    if (!info) return null;
    var node = info.querySelector(".lx-detail-benefits-v182");
    if (!node) {
      node = document.createElement("section");
      node.className = "lx-detail-benefits-v182";
      node.setAttribute("aria-label", "商品价格与优惠");
    }
    var priceNode = info.querySelector("[data-detail-price], .detail-price");
    var reason = info.querySelector(".detail-fit-reason");
    var summary = info.querySelector(".detail-summary");
    if (priceNode) priceNode.hidden = true;
    if (summary && summary.nextElementSibling !== node) summary.insertAdjacentElement("afterend", node);
    else if (!summary && reason && reason.previousElementSibling !== node) info.insertBefore(node, reason);
    else if (!summary && !reason && !node.isConnected) info.appendChild(node);
    return node;
  }

  function renderBuybar(detail, finalPrice, sourcePrice) {
    var bar = detail.querySelector(".lx-buybar") || document.querySelector(".lx-buybar");
    var priceNode = bar && bar.querySelector(".lx-buybar-info b");
    if (!priceNode) return;
    if (priceNode.dataset.sourcePrice === String(sourcePrice)) return;
    priceNode.dataset.sourcePrice = String(sourcePrice);
    priceNode.innerHTML = '<small>国补后</small><span>¥' + format(finalPrice) + "</span>";
  }

  function placeServiceAboveActions(detail) {
    var service = detail.querySelector(".detail-service");
    var actions = detail.querySelector(".detail-actions");
    if (!service || !actions || service.parentNode !== actions.parentNode) return;
    if (service.nextElementSibling !== actions) actions.parentNode.insertBefore(service, actions);
  }

  function productSku(detail) {
    var stateProduct = window.__lxState && window.__lxState.currentProduct;
    var node = detail.querySelector("[data-product-sku], [data-sku], [data-product-id]");
    return String(
      (stateProduct && (stateProduct.sku || stateProduct.id || stateProduct.product_id)) ||
      (node && (node.dataset.productSku || node.dataset.sku || node.dataset.productId)) ||
      ""
    ).replace(/[^0-9A-Za-z_-]/g, "");
  }

  function renderProductCode(detail) {
    var actions = detail.querySelector(".detail-actions");
    if (!actions || !actions.parentNode) return;
    var sku = productSku(detail);
    if (!sku) return;
    var displaySku = /^\d+$/.test(sku) ? sku.padStart(8, "0") : sku;
    var code = detail.querySelector(".lx-detail-product-code-v188");
    if (!code) {
      code = document.createElement("p");
      code.className = "lx-detail-product-code-v188";
    }
    if (code.dataset.sku !== sku) {
      code.dataset.sku = sku;
      code.innerHTML = '<span>商品编号：</span><strong>LX-' + displaySku + "</strong>";
    }
    if (actions.nextElementSibling !== code) actions.insertAdjacentElement("afterend", code);
  }

  function render(detail) {
    if (!detail || !detail.isConnected) return;
    placeServiceAboveActions(detail);
    renderProductCode(detail);
    var price = currentPrice(detail);
    if (!price) return;
    var node = ensureNode(detail);
    if (!node) return;
    var subsidy = Math.min(2000, Math.round(price * 0.15));
    var finalPrice = Math.max(0, price - subsidy);
    renderBuybar(detail, finalPrice, price);
    if (node.dataset.sourcePrice === String(price) && node.childElementCount) return;
    var points = Math.max(1, Math.round(price * 0.10));
    var coupon = couponFor(price);
    node.dataset.sourcePrice = String(price);
    node.innerHTML =
      '<div class="lx-detail-benefits-price"><span class="lx-detail-benefits-label">国补后</span>' +
      '<strong><span>¥</span>' + format(finalPrice) + '<small>元</small></strong></div>' +
      '<div class="lx-detail-benefits-meta"><span>预计返 <b>' + format(points) + ' 乐豆</b></span>' +
      '<i aria-hidden="true"></i><span>优惠券 <b>满' + format(coupon.threshold) + '减' + format(coupon.reduction) + '</b></span></div>';
  }

  var pending = false;
  function sync() {
    pending = false;
    document.querySelectorAll(".product-detail").forEach(render);
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener("lx:product-detail-rendered", schedule);
  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest(".lx-spu-chip, [data-detail-price-value]")) {
      setTimeout(schedule, 0);
      setTimeout(schedule, 120);
    }
  }, true);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  else schedule();
})();

};

/* scripts/p0-source-variants/product-detail-review-tab-v203-1.js */
window.__p0Modules.sources["u3856c842123f47d1"]=function(){
(function () {
  "use strict";
  if (window.__lxMarketReviewTab) return;
  window.__lxMarketReviewTab = true;

  var PAGE_SIZE = 10;
  var VERSION = 'followup-pagination-v3';
  var followupText = '这款产品开机速度快，屏幕清晰，颜色漂亮，自带流量，出差使用特别方便，追剧玩游戏再也不用考虑流量问题了';
  // The existing review area is explicitly labeled as demonstration content.
  var reviews = [
    ["lenovo161508778", "2026-09-03 22:35", "上手体验很好，性能强、屏幕清晰，日常办公和多任务切换都很流畅，整机表现超出预期。", ["/assets/img/shop-1.jpg", "/assets/img/shop-2.jpg", "/assets/img/shop-3.jpg"]],
    ["lenovo161822155", "2026-09-03 21:44", "电脑运行流畅，屏幕观感细腻，机身质感和便携性都不错，整体非常满意。", ["/assets/img/shop-4.jpg", "/assets/img/shop-5.jpg", "/assets/img/shop-6.jpg"], ["/assets/img/shop-4.jpg", "/assets/img/shop-5.jpg", "/assets/img/shop-6.jpg"]],
    ["lenovo80651593", "2026-09-03 18:19", "轻薄机身的性能释放很稳，应用启动快，散热和噪声控制符合预期，适合日常办公使用。", ["/assets/img/shop-7.jpg", "/assets/img/shop-8.jpg"], []],
    ["lenovo161817808", "2026-09-03 18:18", "运行速度快，多窗口处理没有明显卡顿，键盘手感也比较舒适。", ["/assets/img/shop-2.jpg", "/assets/img/shop-5.jpg", "/assets/img/shop-8.jpg"]],
    ["lenovo163026501", "2026-09-03 16:42", "屏幕显示细腻，文档和表格看起来很清楚，日常办公用着顺手。", ["/assets/img/shop-1.jpg"]],
    ["lenovo162307416", "2026-09-03 15:26", "机身轻薄，放进背包很方便，出门开会带着没有负担。", []],
    ["lenovo161902638", "2026-09-03 13:18", "开机和应用启动都很快，同时打开多个办公软件也比较流畅。", ["/assets/img/shop-2.jpg"]],
    ["lenovo163105729", "2026-09-03 11:35", "键盘按起来舒适，触控板响应灵敏，长时间写文档体验不错。", []],
    ["lenovo162806315", "2026-09-02 20:47", "外观简洁，做工和接口布局都比较满意，连接显示器很方便。", ["/assets/img/shop-8.jpg"]],
    ["lenovo163209864", "2026-09-02 18:21", "日常视频会议画面清楚，声音也清晰，办公使用很省心。", []],
    ["lenovo162715093", "2026-09-02 15:09", "收货后检查了外观和屏幕，整体状态很好，常用软件运行稳定。", ["/assets/img/shop-4.jpg"]],
    ["lenovo163018527", "2026-09-02 10:36", "浏览网页、处理表格和观看视频都很顺畅，符合我的使用需求。", []]
  ];
  var filters = [['all', '全部'], ['good', '好评'], ['media', '有图/视频'], ['follow', '追评']];
  function filteredReviews(filter) {
    return reviews.filter(function(review) {
      if (filter === 'media') return review[3].length > 0 || !!(review[4] && review[4].length);
      if (filter === 'follow') return !!review[4];
      return true;
    });
  }
  function mediaMarkup(images, followup) {
    if (!images.length) return '';
    var label = followup ? '追评图片' : '评价图片';
    return '<div class="lx-market-review-media">' + images.map(function(src, index) {
      return '<button type="button" aria-label="查看' + label + ' ' + (index + 1) + '"><img src="' + src + '" alt="' + label + ' ' + (index + 1) + '" loading="lazy"></button>';
    }).join('') + '</div>';
  }
  function itemMarkup(review) {
    return '<article class="lx-market-review-item" data-review-id="' + review[0] + '">' +
      '<aside class="lx-market-review-user"><strong>' + review[0] + '</strong><span class="lx-market-stars" aria-label="5 星评价">★★★★★</span><time>' + review[1] + '</time></aside>' +
      '<div class="lx-market-review-body"><p>' + review[2] + '</p>' + mediaMarkup(review[3], false) +
      (review[4] ? '<section class="lx-market-review-followup" aria-label="购买1天后追评"><h3>购买1天后追评</h3><p>' + followupText + '</p>' + mediaMarkup(review[4], true) + '</section>' : '') +
      '</div></article>';
  }
  function paginationMarkup(page, pages, total) {
    if (pages <= 1) return '';
    function button(number, label, extra) {
      return '<button type="button" data-review-page="' + number + '"' + (extra || '') + '>' + label + '</button>';
    }
    var html = '<span class="lx-market-review-page-total">共 ' + total + ' 条，每页 ' + PAGE_SIZE + ' 条</span>';
    html += button(page - 1, '上一页', page === 1 ? ' disabled' : '');
    for (var number = 1; number <= pages; number++) html += button(number, number, ' aria-label="第' + number + '页"' + (number === page ? ' aria-current="page"' : ''));
    return html + button(page + 1, '下一页', page === pages ? ' disabled' : '');
  }
  function reviewMarkup() {
    return '<section class="lx-market-reviews" data-review-version="' + VERSION + '" data-review-filter="all" data-review-current-page="1" aria-label="商品评价列表">' +
      '<header class="lx-market-review-summary"><div class="lx-market-satisfaction"><span>商品满意度</span><strong>100%</strong></div>' +
      '<div class="lx-market-review-tools"><div class="lx-market-filter-row" role="group" aria-label="评价筛选">' + filters.map(function(filter) {
        return '<button type="button" data-review-market-filter="' + filter[0] + '" aria-pressed="' + (filter[0] === 'all') + '" class="' + (filter[0] === 'all' ? 'is-active' : '') + '">' + filter[1] + '(' + filteredReviews(filter[0]).length + ')</button>';
      }).join('') + '</div><div class="lx-market-impressions"><span>买家印象：</span>' +
      '<button type="button">稳定流畅(43)</button><button type="button">性能强劲(28)</button><button type="button">运行超快(20)</button><button type="button">画质清晰(17)</button><button type="button">外观漂亮(7)</button><button type="button">方便快捷(3)</button>' +
      '</div></div></header><div class="lx-market-review-list">' + reviews.slice(0, PAGE_SIZE).map(itemMarkup).join('') + '</div>' +
      '<nav class="lx-market-review-pagination" aria-label="商品评价分页">' + paginationMarkup(1, Math.ceil(reviews.length / PAGE_SIZE), reviews.length) + '</nav>' +
      '<span class="lx-market-review-page-status" role="status" aria-live="polite">第1页，共' + Math.ceil(reviews.length / PAGE_SIZE) + '页</span></section>';
  }
  function renderPage(root, requestedPage, filter) {
    var filtered = filteredReviews(filter), pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    var page = Math.max(1, Math.min(pages, requestedPage || 1));
    root.dataset.reviewFilter = filter;
    root.dataset.reviewCurrentPage = String(page);
    root.querySelector('.lx-market-review-list').innerHTML = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(itemMarkup).join('');
    root.querySelectorAll('[data-review-market-filter]').forEach(function(button) {
      var active = button.dataset.reviewMarketFilter === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    var pager = root.querySelector('.lx-market-review-pagination');
    pager.innerHTML = paginationMarkup(page, pages, filtered.length);
    pager.hidden = pages <= 1;
    root.querySelector('.lx-market-review-page-status').textContent = '第' + page + '页，共' + pages + '页，当前' + filtered.length + '条评价';
    window.__lxReviewMedia?.refresh();
  }
  function ensureReviewTab() {
    // Repair old homepage detail snapshots without replacing product or conversation state.
    if (/^\/$/.test(location.pathname)) document.querySelectorAll('.product-detail').forEach(function(detail) {
      detail.querySelectorAll('.detail-badges, .detail-service, .detail-reviews-section').forEach(function(node) { node.remove(); });
      var gallery = detail.querySelector('.detail-gallery');
      var visual = gallery && gallery.querySelector('.detail-visual');
      if (visual && !gallery.querySelector('.detail-trustline')) {
        var trust = document.createElement('p');
        trust.className = 'detail-trustline';
        trust.innerHTML = '<strong>「放心购」</strong><span>官方正品 · 14天无忧退换 · 180天只换不修</span>';
        visual.insertAdjacentElement('afterend', trust);
      }
    });
    document.querySelectorAll(".product-detail .detail-rich").forEach(function (rich) {
      var bar = rich.querySelector(".detail-tabbar");
      if (!bar) return;
      if (!bar.querySelector('[data-detail-tab="reviews"]')) {
        var tab = document.createElement("button");
        tab.className = "detail-tab";
        tab.type = "button";
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", "false");
        tab.setAttribute("data-detail-tab", "reviews");
        tab.textContent = "商品评价";
        bar.appendChild(tab);
      }
      if (!rich.querySelector('[data-detail-pane="reviews"]')) {
        var pane = document.createElement("section");
        pane.className = "detail-panel detail-tab-pane lx-review-tab-pane";
        pane.setAttribute("role", "tabpanel");
        pane.setAttribute("data-detail-pane", "reviews");
        pane.innerHTML = reviewMarkup();
        pane.setAttribute("aria-label", "商品评价");
        rich.appendChild(pane);
      } else {
        var existing = rich.querySelector('[data-detail-pane="reviews"]');
        if (!existing.querySelector('[data-review-version="' + VERSION + '"]')) existing.innerHTML = reviewMarkup();
      }
    });
  }

  function activate(tab) {
    var rich = tab.closest(".detail-rich");
    if (!rich) return;
    var target = tab.getAttribute("data-detail-tab");
    rich.querySelectorAll(".detail-tab").forEach(function (item) {
      var active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    rich.querySelectorAll(".detail-tab-pane").forEach(function (pane) {
      pane.classList.toggle("is-active", pane.getAttribute("data-detail-pane") === target);
    });
  }

  document.addEventListener("click", function (event) {
    var filter = event.target.closest && event.target.closest("[data-review-market-filter]");
    if (filter) {
      var root = filter.closest('.lx-market-reviews');
      if (root) renderPage(root, 1, filter.dataset.reviewMarketFilter);
      return;
    }
    var pageButton = event.target.closest && event.target.closest('.lx-market-review-pagination [data-review-page]');
    if (pageButton && !pageButton.disabled) {
      var root = pageButton.closest('.lx-market-reviews');
      renderPage(root, Number(pageButton.dataset.reviewPage), root.dataset.reviewFilter || 'all');
      root.querySelector('[aria-current="page"]')?.focus({preventScroll:true});
      root.scrollIntoView({block:'start', behavior:'auto'});
      return;
    }
    var tab = event.target.closest && event.target.closest(".product-detail .detail-tab");
    if (!tab) return;
    window.requestAnimationFrame(function () { activate(tab); });
  });
  document.addEventListener("lx:product-detail-rendered", ensureReviewTab);
  if (location.pathname === '/') {
    var pending = false;
    new MutationObserver(function() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function() { pending = false; ensureReviewTab(); });
    }).observe(document.documentElement, {childList:true, subtree:true});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureReviewTab, { once: true });
  else ensureReviewTab();
})();

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/product-detail-benefits-v198.js */
window.__p0Modules.sources["u8e0a493b90c9abe6"]=function(){
(function () {
  "use strict";

  if (window.__lxProductDetailBenefitsV182) return;
  window.__lxProductDetailBenefitsV182 = true;

  function numberFrom(value) {
    var matches = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
    if (!matches || !matches.length) return 0;
    return Math.round(Number(matches[matches.length - 1]) || 0);
  }

  function format(value) {
    return Math.max(0, Math.round(value)).toLocaleString("zh-CN");
  }

  function currentPrice(detail) {
    var active = detail.querySelector('.lx-spu-chip.is-active [class*="price"], .lx-spu-chip.is-active[data-detail-price-value]');
    var activeValue = active && (active.getAttribute("data-detail-price-value") || active.textContent);
    var source = activeValue || (detail.querySelector("[data-detail-price] .detail-price-main, [data-detail-price], .detail-price-main, .detail-price") || {}).textContent;
    return numberFrom(source);
  }

  function couponFor(price) {
    if (price >= 8000) return { threshold: 8000, reduction: 500 };
    if (price >= 5000) return { threshold: 5000, reduction: 300 };
    if (price >= 3000) return { threshold: 3000, reduction: 200 };
    return { threshold: 1000, reduction: 100 };
  }

  function ensureNode(detail) {
    var info = detail.querySelector(".detail-info");
    if (!info) return null;
    var node = info.querySelector(".lx-detail-benefits-v182");
    if (!node) {
      node = document.createElement("section");
      node.className = "lx-detail-benefits-v182";
      node.setAttribute("aria-label", "商品价格与优惠");
    }
    var priceNode = info.querySelector("[data-detail-price], .detail-price");
    var reason = info.querySelector(".detail-fit-reason");
    var summary = info.querySelector(".detail-summary");
    if (priceNode) priceNode.hidden = true;
    if (summary && summary.nextElementSibling !== node) summary.insertAdjacentElement("afterend", node);
    else if (!summary && reason && reason.previousElementSibling !== node) info.insertBefore(node, reason);
    else if (!summary && !reason && !node.isConnected) info.appendChild(node);
    return node;
  }

  function priceLabel(detail) {
    var path = window.location.pathname;
    if (/^\/b-chat(?:\/|$)/.test(path)) return "企业价";
    if (/^\/biz-chat(?:\/|$)/.test(path)) return "惠采价";
    if (/^\/shop-chat(?:\/|$)/.test(path) && detail) {
      var title = detail.querySelector("[data-detail-title], .detail-title");
      var name = String(title && title.textContent || "").replace(/\s+/g, "");
      if (/天逸|GeekPro|刃7000|小新27.*一体机/i.test(name)) return "预估到手";
    }
    return "国补后";
  }

  function renderBuybar(detail, finalPrice, sourcePrice) {
    var bar = detail.querySelector(".lx-buybar") || document.querySelector(".lx-buybar");
    var priceNode = bar && bar.querySelector(".lx-buybar-info b");
    if (!priceNode) return;
    var label = priceLabel(detail);
    if (priceNode.dataset.sourcePrice === String(sourcePrice) && priceNode.dataset.priceLabel === label) return;
    priceNode.dataset.priceLabel = label;
    priceNode.dataset.sourcePrice = String(sourcePrice);
    priceNode.innerHTML = '<small>' + label + '</small><span>¥' + format(finalPrice) + '</span><del class="lx-buybar-original-price" aria-label="原价 ' + format(sourcePrice) + ' 元">¥' + format(sourcePrice) + "</del>";
  }

  function placeServiceAboveActions(detail) {
    var service = detail.querySelector(".detail-service");
    var actions = detail.querySelector(".detail-actions");
    if (!service || !actions || service.parentNode !== actions.parentNode) return;
    if (service.nextElementSibling !== actions) actions.parentNode.insertBefore(service, actions);
  }

  function productSku(detail) {
    var stateProduct = window.__lxState && window.__lxState.currentProduct;
    var node = detail.querySelector("[data-product-sku], [data-sku], [data-product-id]");
    return String(
      (stateProduct && (stateProduct.sku || stateProduct.id || stateProduct.product_id)) ||
      (node && (node.dataset.productSku || node.dataset.sku || node.dataset.productId)) ||
      ""
    ).replace(/[^0-9A-Za-z_-]/g, "");
  }

  function renderProductCode(detail) {
    var actions = detail.querySelector(".detail-actions");
    if (!actions || !actions.parentNode) return;
    var sku = productSku(detail);
    if (!sku) return;
    var displaySku = /^\d+$/.test(sku) ? sku.padStart(8, "0") : sku;
    var code = detail.querySelector(".lx-detail-product-code-v188");
    if (!code) {
      code = document.createElement("p");
      code.className = "lx-detail-product-code-v188";
    }
    if (code.dataset.sku !== sku) {
      code.dataset.sku = sku;
      code.innerHTML = '<span>商品编号：</span><strong>LX-' + displaySku + "</strong>";
    }
    if (actions.nextElementSibling !== code) actions.insertAdjacentElement("afterend", code);
  }

  function syncArrivalButtonCopy(detail) {
    if (!/^\/shop-chat(?:\/|$)/.test(window.location.pathname)) return;
    var title = detail.querySelector("[data-detail-title], .detail-title");
    var name = String(title && title.textContent || "").replace(/\s+/g, "");
    var isTarget = /^(?:联想)?天逸510Pro$/i.test(name);
    detail.querySelectorAll(".detail-actions .detail-primary").forEach(function (button) {
      if (isTarget && button.textContent.trim() === "一键领优惠下单") {
        button.dataset.arrivalOriginalCopy = button.textContent;
        button.textContent = "到货通知";
        if (button.hasAttribute("aria-label")) {
          button.dataset.arrivalOriginalAria = button.getAttribute("aria-label");
          button.setAttribute("aria-label", "到货通知");
        }
      } else if (!isTarget && button.dataset.arrivalOriginalCopy) {
        if (button.textContent.trim() === "到货通知") button.textContent = button.dataset.arrivalOriginalCopy;
        if (button.dataset.arrivalOriginalAria) button.setAttribute("aria-label", button.dataset.arrivalOriginalAria);
        delete button.dataset.arrivalOriginalCopy;
        delete button.dataset.arrivalOriginalAria;
      }
    });
  }

  function syncT14SupportCopy(detail) {
    var path = String(window.__LX_TEMPLATE_PATH || location.pathname || "").replace(/\/+$/, "");
    var title = detail.querySelector("[data-detail-title], .detail-title");
    var name = String(title && title.textContent || "").replace(/\s+/g, "");
    var isTarget = path === "/b-chat" && /^(?:联想)?ThinkPadT14$/i.test(name);
    detail.querySelectorAll(".detail-actions .detail-primary").forEach(function(button) {
      if (isTarget && button.textContent.trim() === "一键领优惠下单") {
        button.dataset.t14OriginalCopy = button.textContent;
        button.textContent = "咨询客服";
        if (button.hasAttribute("aria-label")) {
          button.dataset.t14OriginalAria = button.getAttribute("aria-label");
          button.setAttribute("aria-label", "咨询客服");
        }
      } else if (!isTarget && button.dataset.t14OriginalCopy) {
        if (button.textContent.trim() === "咨询客服") button.textContent = button.dataset.t14OriginalCopy;
        if (button.dataset.t14OriginalAria) button.setAttribute("aria-label", button.dataset.t14OriginalAria);
        delete button.dataset.t14OriginalCopy;
        delete button.dataset.t14OriginalAria;
      }
    });
  }

  function render(detail) {
    if (!detail || !detail.isConnected) return;
    syncArrivalButtonCopy(detail);
    syncT14SupportCopy(detail);
    placeServiceAboveActions(detail);
    renderProductCode(detail);
    var price = currentPrice(detail);
    if (!price) return;
    var node = ensureNode(detail);
    if (!node) return;
    var subsidy = Math.min(2000, Math.round(price * 0.15));
    var finalPrice = Math.max(0, price - subsidy);
    renderBuybar(detail, finalPrice, price);
    var label = priceLabel(detail);
    if (node.dataset.sourcePrice === String(price) && node.dataset.priceLabel === label && node.childElementCount) return;
    node.dataset.priceLabel = label;
    node.dataset.sourcePrice = String(price);
    node.innerHTML =
      '<div class="lx-detail-benefits-price"><span class="lx-detail-benefits-label">' + label + '</span>' +
      '<strong><span>¥</span>' + format(finalPrice) + '</strong>' +
      '<del class="lx-detail-benefits-original-price" aria-label="原价 ' + format(price) + ' 元">¥' + format(price) + '</del></div>';
  }

  var pending = false;
  function sync() {
    pending = false;
    document.querySelectorAll(".product-detail").forEach(render);
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener("lx:product-detail-rendered", schedule);
  document.addEventListener("click", function (event) {
    if (event.target.closest && event.target.closest(".lx-spu-chip, [data-detail-price-value]")) {
      setTimeout(schedule, 0);
      setTimeout(schedule, 120);
    }
  }, true);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  else schedule();
})();

};

/* public/leaip0/assets/frontend/js/core/product-detail-navigation-v1.js */
window.__p0Modules.sources["u34b3bcacde0c016f"]=function(){
/* Product detail links navigate directly; they never enter the chat or purchase flow. */
(function () {
  'use strict';
  if (window.__lxProductDetailNavigationV1) return;
  window.__lxProductDetailNavigationV1 = true;

  // Temporary product destination requested for the P0 prototype.
  const DETAIL_URL = 'https://item.lenovo.com.cn/product/1054438.html';
  const SUPPORT_URL = 'https://b.lenovo.com.cn/activity/qygzxdhym.html';
  const DETAIL_ACTION = '[data-product-detail-external], [data-occ-view-detail], [data-coupon-product-open], [data-solution-product-detail]';
  const PRODUCT_SCOPE = '.product-detail, .product-card, .lx-floor-product, .lx-reco-poc-row, [data-open-product], [data-product-id], [data-sku]';
  const clean = value => String(value || '').replace(/\s+/g, '');

  function syncDetail(detail) {
    const title = detail.querySelector('[data-detail-title], .detail-title');
    const target = /刃7000K超能版/i.test(clean(title?.textContent));
    detail.querySelectorAll('.detail-primary').forEach(button => {
      if (target) {
        if (!button.hasAttribute('data-product-detail-external')) {
          button.dataset.externalDetailOriginalCopy = button.textContent;
          if (button.hasAttribute('aria-label')) button.dataset.externalDetailOriginalAria = button.getAttribute('aria-label');
          button.setAttribute('data-product-detail-external', '1');
        }
        if (button.textContent !== '查看详情') button.textContent = '查看详情';
        if (button.hasAttribute('aria-label')) button.setAttribute('aria-label', '查看详情');
      } else if (button.hasAttribute('data-product-detail-external')) {
        if (clean(button.textContent) === '查看详情') button.textContent = button.dataset.externalDetailOriginalCopy || '一键领优惠下单';
        if (button.dataset.externalDetailOriginalAria !== undefined) button.setAttribute('aria-label', button.dataset.externalDetailOriginalAria);
        button.removeAttribute('data-product-detail-external');
        delete button.dataset.externalDetailOriginalCopy;
        delete button.dataset.externalDetailOriginalAria;
      }
    });
  }

  // Capture before card, query and order handlers, while the user gesture can open a tab.
  window.addEventListener('click', event => {
    const target = event.composedPath().find(node => node instanceof Element);
    if (!target) return;
    const button = target.closest('button, a, [role="button"]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const detail = button.closest('.product-detail');
    if (detail && button.matches('.detail-primary')) syncDetail(detail);
    const isProductDetail = button.matches(DETAIL_ACTION) ||
      (/^查看详情[→›]?$/.test(clean(button.textContent)) && button.closest(PRODUCT_SCOPE));
    const isDetailSupport = clean(button.textContent) === '咨询客服' &&
      button.closest('.product-detail, .lx-buybar');
    if (!isProductDetail && !isDetailSupport) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(isDetailSupport ? SUPPORT_URL : DETAIL_URL, '_blank', 'noopener,noreferrer');
  }, true);

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      document.querySelectorAll('.product-detail').forEach(syncDetail);
    });
  }
  document.addEventListener('lx:product-detail-rendered', schedule);
  new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return target?.closest('.product-detail') || [...record.addedNodes].some(node =>
        node.nodeType === 1 && (node.matches('.product-detail') || node.querySelector('.product-detail')));
    })) schedule();
  }).observe(document.documentElement, {childList: true, subtree: true, characterData: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();
})();

};

/* public/leaip0/assets/frontend/js/core/product-specs-grouped-v1.js */
window.__p0Modules.sources["ue4edbdcfb53c4d7c"]=function(){
(function () {
  'use strict';
  const groups = ['基本信息', '处理器', '内存', '存储', '显卡', '屏幕', '操作系统', '网络与连接', '接口', '电池与电源', '外观与尺寸', '摄像与音频', '服务与其他'];
  const aliases = {
    brand: ['基本信息', '品牌'], mtm: ['基本信息', 'MTM 编码'], screen_resolution: ['屏幕', '分辨率'],
    cpu: ['处理器', '处理器型号'], processor: ['处理器', '处理器型号'],
    ram: ['内存', '内存配置'], memory: ['内存', '内存配置'], memory_type: ['内存', '内存类型'],
    storage: ['存储', '硬盘配置'], disk: ['存储', '硬盘配置'], ssd: ['存储', '固态硬盘'],
    gpu: ['显卡', '显卡型号'], graphics: ['显卡', '显卡型号'],
    screen: ['屏幕', '屏幕配置'], screen_size: ['屏幕', '屏幕尺寸'], display: ['屏幕', '屏幕配置'], resolution: ['屏幕', '分辨率'], refresh_rate: ['屏幕', '刷新率'],
    os: ['操作系统', '操作系统'], operating_system: ['操作系统', '操作系统'],
    wifi: ['网络与连接', '无线网络'], bluetooth: ['网络与连接', '蓝牙'], network: ['网络与连接', '网络配置'],
    ports: ['接口', '接口配置'], interfaces: ['接口', '接口配置'],
    battery: ['电池与电源', '电池'], power: ['电池与电源', '电源'],
    color: ['外观与尺寸', '颜色'], colour: ['外观与尺寸', '颜色'], weight: ['外观与尺寸', '重量'], dimensions: ['外观与尺寸', '尺寸'],
    camera: ['摄像与音频', '摄像头'], audio: ['摄像与音频', '音频'], warranty: ['服务与其他', '保修服务']
  };
  const metadata = /^(?:catalog_source|site|package|spu_id|spu_name|source_category|configuration_id|configuration_name|configurationName|tags|url|folder|asset_mode|stock_source|.*_url|.*_images|.*_at|id|sku|price|original_price|pcDetailUrl|wapUrl|wapDetailUrl|mobileUrl|bu_ids|target_user|highlights|images|ad_picture|source|lvl[1-5]|bu)$/i;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function object(value) { if (typeof value === 'string') { try { return JSON.parse(value) || {}; } catch (_) { return {}; } } return value && typeof value === 'object' ? value : {}; }
  function category(label) {
    if (/处理器|CPU|芯片组|核心数|线程|主频|缓存/i.test(label)) return '处理器';
    if (/显卡|显存|GPU|图形/i.test(label)) return '显卡';
    if (/内存|RAM|DDR/i.test(label)) return '内存';
    if (/硬盘|存储|SSD|磁盘/i.test(label)) return '存储';
    if (/屏幕|显示|分辨率|刷新率|色域|亮度|触控/i.test(label)) return '屏幕';
    if (/系统|OS$/i.test(label)) return '操作系统';
    if (/网络|蓝牙|Wi.?Fi|蜂窝|通信/i.test(label)) return '网络与连接';
    if (/接口|端口|USB|HDMI|雷电/i.test(label)) return '接口';
    if (/电池|电源|续航|充电|适配器/i.test(label)) return '电池与电源';
    if (/颜色|尺寸|重量|厚度|材质/i.test(label)) return '外观与尺寸';
    if (/摄像|镜头|像素|音频|扬声|麦克风/i.test(label)) return '摄像与音频';
    return '服务与其他';
  }
  function build(product) {
    const specs = object(product.specs), result = new Map(groups.map(g => [g, []]));
    const add = (group, label, value) => {
      if (value == null || typeof value === 'object' || String(value).trim() === '') return;
      value = String(value).trim();
      const rows = result.get(group) || result.get('服务与其他');
      if (!rows.some(row => row[0] === label && row[1] === value)) rows.push([label, value]);
    };
    add('基本信息', '商品名称', product.name);
    add('基本信息', '产品系列', specs.spu_name);
    add('基本信息', '品类', product.category || specs.source_category);
    add('基本信息', '商品编号（SKU）', product.sku);
    function walk(source, parent = '', depth = 0) {
      if (depth > 5) return;
      for (const [key, value] of Object.entries(source)) {
        if (metadata.test(key) || value == null) continue;
        const mapped = aliases[key.toLowerCase()], label = mapped ? mapped[1] : key;
        const group = mapped ? mapped[0] : category(parent + key);
        if (Array.isArray(value)) {
          if (value.every(item => item == null || typeof item !== 'object')) add(group, label, value.filter(item => item != null).join(' / '));
          else value.forEach(item => {
            if (item && typeof item === 'object' && (item.name || item.label) && item.value != null) add(category(parent + (item.name || item.label)), item.name || item.label, item.value);
            else if (item && typeof item === 'object') walk(item, parent + key, depth + 1);
          });
        } else if (typeof value === 'object') walk(value, parent + key, depth + 1);
        else add(group, label, value);
      }
    }
    walk(specs);
    // Read configuration tokens verbatim; never infer missing capacities or hardware.
    const config = String(specs.configuration_name || specs.configurationName || product.description || '').trim();
    const known = new Set([...result].filter(([,rows]) => rows.length).map(([g]) => g));
    const rules = [
      ['操作系统', '操作系统', /Windows|Win\s*\d|Linux|Ubuntu|Android|Chrome\s*OS|Harmony|麒麟|统信/i],
      ['处理器', '处理器型号', /处理器|酷睿|锐龙|Ryzen|Intel|AMD|Ultra\s*\d|\bi[3579][-\s]|骁龙|天玑|Xeon|至强|奔腾|赛扬/i],
      ['显卡', '显卡配置', /显卡|显存|RTX|GTX|Radeon|GeForce|独显|集显/i],
      ['屏幕', '屏幕配置', /英寸|屏幕|显示屏|OLED|WUXGA|\d{3,4}\s*[x×]\s*\d{3,4}|\d+\s*Hz/i],
      ['存储', '硬盘配置', /SSD|HDD|硬盘|固态|\d\s*T(?:B)?\b|^(?:128|256|512|1024)\s*G(?:B)?$/i],
      ['内存', '内存配置', /内存|DDR|^\d{1,3}\s*G(?:B)?$/i],
      ['网络与连接', '网络配置', /Wi.?Fi|蓝牙|Bluetooth|以太网/i],
      ['电池与电源', '电池与电源', /电池|电源|mAh|Wh\b|充电/i],
      ['外观与尺寸', '外观配置', /\d\s*(?:kg|千克|mm)|^(?:\S{0,8})(?:黑|白|灰|银|紫|蓝|绿|金)色?$/i]
    ];
    const tokens = config.split(/\s*[/／|｜丨；;]\s*/).filter(Boolean);
    for (const token of tokens) {
      const combined = token.match(/^(\d{1,2}\s*GB)\s*[+＋]\s*(\d+(?:\.\d+)?\s*[GT]B)$/i);
      if (combined) {
        if (!known.has('内存')) add('内存', '内存配置', combined[1]);
        if (!known.has('存储')) add('存储', '硬盘配置', combined[2]);
        continue;
      }
      const rule = rules.find(([, ,pattern]) => pattern.test(token));
      if (rule && !known.has(rule[0])) add(rule[0], rule[1], token);
      else if (!rule && tokens.length > 1) add('服务与其他', '其他配置', token);
    }
    if (config && !/^(联想官方商品|联想商品)[，,。]?/.test(config)) add('基本信息', '完整配置说明', config);
    return [...result].filter(([,rows]) => rows.length);
  }
  function markup(product, note = '') {
    const sections = build(product);
    return sections.map(([title, rows]) => '<section class="lx-spec-section"><h3>' + escape(title) + '</h3><dl>' + rows.map(([key,value]) => '<div class="lx-spec-item"><dt>' + escape(key) + '</dt><dd>' + escape(value) + '</dd></div>').join('') + '</dl></section>').join('') + '<p class="lx-spec-note" role="status">' + escape(note || '参数对应当前所选配置；未提供的参数不展示，购买前请以商品官方信息为准。') + '</p>';
  }
  const requests = new Map();
  const rendered = new WeakMap();
  function render(grid, product) {
    if (!grid || !product) return;
    const sku = String(product.sku || ''), token = {};
    grid._lxSpecRequest = token;
    rendered.set(grid, sku);
    grid.classList.add('lx-specs-grouped');
    grid.innerHTML = markup(product);
    if (!sku) return;
    if (!requests.has(sku)) {
      const request = fetch('/api/products/' + encodeURIComponent(sku), {cache:'no-store'})
        .then(response => { if (!response.ok) throw Error('参数加载失败'); return response.json(); })
        .then(data => { if (String(data.sku || '') !== sku) throw Error('商品不匹配'); return data; })
        .catch(error => { requests.delete(sku); throw error; });
      requests.set(sku, request);
    }
    requests.get(sku).then(data => {
      if (grid._lxSpecRequest !== token || !grid.isConnected) return;
      grid.innerHTML = markup({...product, ...data, specs:data.specs || product.specs});
    }).catch(() => {
      if (grid._lxSpecRequest === token && grid.isConnected) grid.innerHTML = markup(product, '完整参数暂时无法加载，当前展示已有商品信息，请稍后重新打开详情页。');
    });
  }
  window.__lxRenderProductSpecs = render;
  // Restored tabs can contain saved HTML without rerunning the detail renderer.
  function restoreSpecs() {
    const detail = document.querySelector('.content[data-view="detail"] .product-detail');
    const grid = detail?.querySelector('[data-detail-spec-grid]');
    if (!grid) return;
    const state = window.__lxState || {};
    const tab = (state.tabs || []).find(item => item.id === state.activeTabId && item.kind === 'detail');
    const sku = String(tab?.sku || state.currentProduct?.sku || '');
    if (!sku || rendered.get(grid) === sku) return;
    const product = String(state.currentProduct?.sku || '') === sku ? state.currentProduct : tab?.product || {};
    render(grid, {...product, sku, name:product.name || detail.querySelector('[data-detail-title], .detail-title')?.textContent || '联想商品'});
  }
  if (typeof document !== 'undefined') {
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; restoreSpecs(); });
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['data-view']});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreSpecs, {once:true});
    else restoreSpecs();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {build, markup, render};
})();

};

/* public/leaip0/assets/frontend/js/core/review-media-v1.js */
window.__p0Modules.sources["uaf95f5cdffda1d1e"]=function(){
/* Shared product review media viewer, including restored product detail tabs. */
(()=>{'use strict';if(window.__lxReviewMedia)return;
const VIDEO='/assets/media/review-demo-v1.webm';let dialog=null,trigger=null,items=[],index=0,oldOverflow='',queued=false;
function enhance(){document.querySelectorAll('.product-detail .lx-market-review-list').forEach(list=>{const row=list.querySelector('[data-review-id="lenovo161508778"]')||list.querySelector('.lx-market-review-item:not([data-review-id])'),buttons=row?.querySelectorAll('.lx-market-review-media button');if(buttons?.length>=3){const b=buttons[2];if(!b.dataset.reviewVideo){b.dataset.reviewVideo=VIDEO;b.setAttribute('aria-label','播放评价演示视频');b.title='播放评价演示视频';const badge=document.createElement('span');badge.className='lx-review-play';badge.textContent='▶';badge.setAttribute('aria-hidden','true');b.append(badge);const label=document.createElement('span');label.className='lx-review-video-label';label.textContent='演示视频';b.append(label);}}});}
function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}}
function stopVideo(){const video=dialog?.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}}
function close(){if(!dialog)return;stopVideo();dialog.close();}
function render(){stopVideo();const stage=dialog.querySelector('.lx-review-view-stage');stage.replaceChildren();const item=items[index],status=dialog.querySelector('.lx-review-view-status');status.textContent=(item.video?'评价演示视频':'评价图片')+' · '+(index+1)+' / '+items.length;dialog.querySelector('[data-review-prev]').disabled=index===0;dialog.querySelector('[data-review-next]').disabled=index===items.length-1;
const media=document.createElement(item.video?'video':'img');if(item.video){media.controls=true;media.playsInline=true;media.preload='metadata';media.poster=item.poster;media.setAttribute('aria-label','评价演示视频');}else media.alt='评价图片 '+(index+1);media.addEventListener('error',()=>{const error=document.createElement('p');error.className='lx-review-view-error';error.setAttribute('role','status');error.textContent=item.video?'视频暂时无法播放，请稍后重试。':'图片暂时无法加载，请稍后重试。';stage.replaceChildren(error);},{once:true});media.src=item.src;stage.append(media);if(item.video)media.play().catch(()=>{/* Native controls remain available when autoplay is blocked. */});}
function open(button){if(dialog)close();trigger=button;const buttons=[...button.closest('.lx-market-review-media').querySelectorAll('button')];items=buttons.map(b=>({src:b.dataset.reviewVideo||b.querySelector('img')?.currentSrc||b.querySelector('img')?.src,poster:b.querySelector('img')?.src,video:!!b.dataset.reviewVideo}));index=buttons.indexOf(button);dialog=document.createElement('dialog');dialog.id='lx-review-media-viewer';dialog.setAttribute('aria-label','评价图片和视频全屏查看');dialog.innerHTML='<header class="lx-review-view-header"><span class="lx-review-view-status" aria-live="polite"></span><button type="button" data-review-close aria-label="关闭全屏查看" title="关闭（Esc）">×</button></header><button type="button" data-review-prev aria-label="上一项" title="上一项（←）">‹</button><div class="lx-review-view-stage"></div><button type="button" data-review-next aria-label="下一项" title="下一项（→）">›</button>';
const instance=dialog;oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';instance.addEventListener('close',()=>{stopVideo();instance.remove();document.documentElement.style.overflow=oldOverflow;dialog=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});});instance.addEventListener('click',e=>{if(e.target.closest('[data-review-close]')||e.target===instance||e.target.classList.contains('lx-review-view-stage'))close();else if(e.target.closest('[data-review-prev]')&&index>0){index--;render();}else if(e.target.closest('[data-review-next]')&&index<items.length-1){index++;render();}});instance.addEventListener('keydown',e=>{if(e.target.tagName==='VIDEO')return;if(e.key==='ArrowLeft'&&index>0){e.preventDefault();index--;render();}else if(e.key==='ArrowRight'&&index<items.length-1){e.preventDefault();index++;render();}});document.body.append(instance);instance.showModal();render();instance.querySelector('[data-review-close]').focus();}
document.addEventListener('click',e=>{const b=e.target.closest?.('.product-detail .lx-market-review-media button');if(!b)return;e.preventDefault();e.stopImmediatePropagation();enhance();open(b);},true);window.addEventListener('pagehide',close);
const style=document.createElement('style');style.textContent=window.__p0Modules.styleText("/@script-style/48bcec1c1ef7f570e4b12c50.css");document.head.append(style);new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#lx-review-media-viewer')))schedule();}).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('lx:product-detail-rendered',schedule);window.__lxReviewMedia={refresh:schedule};schedule();})();

};
}
window.__p0Modules.dispatch(document.currentScript);
