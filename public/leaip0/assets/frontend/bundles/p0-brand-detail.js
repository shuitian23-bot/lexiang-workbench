
;/* public/leaip0/assets/frontend/js/core/product-detail-benefits-v182.js */
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

;

;/* public/leaip0/assets/frontend/js/core/product-detail-review-tab-v203.js */
(function () {
  "use strict";
  if (window.__lxMarketReviewTab) return;
  window.__lxMarketReviewTab = true;

  var PAGE_SIZE = 10;
  var VERSION = 'followup-pagination-v1';
  var followupText = '这款产品开机速度快，屏幕清晰，颜色漂亮，自带流量，出差使用特别方便，追剧玩游戏再也不用考虑流量问题了';
  // The existing review area is explicitly labeled as demonstration content.
  var reviews = [
    ["lenovo161508778", "2026-09-03 22:35", "上手体验很好，性能强、屏幕清晰，日常办公和多任务切换都很流畅，整机表现超出预期。", ["/assets/img/shop-1.jpg", "/assets/img/shop-2.jpg", "/assets/img/shop-3.jpg"]],
    ["lenovo161822155", "2026-09-03 21:44", "电脑运行流畅，屏幕观感细腻，机身质感和便携性都不错，整体非常满意。", ["/assets/img/shop-4.jpg", "/assets/img/shop-5.jpg", "/assets/img/shop-6.jpg"], ["/assets/img/shop-4.jpg", "/assets/img/shop-5.jpg", "/assets/img/shop-6.jpg"]],
    ["lenovo80651593", "2026-09-03 18:19", "轻薄机身的性能释放很稳，应用启动快，散热和噪声控制符合预期，适合日常办公使用。", ["/assets/img/shop-7.jpg", "/assets/img/shop-8.jpg"], ["/assets/img/shop-7.jpg", "/assets/img/shop-8.jpg", "/assets/img/shop-6.jpg"]],
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
      (review[4] ? '<section class="lx-market-review-followup" aria-label="购买1天后追评"><h3>【购买1天后追评】</h3><p>' + followupText + '</p>' + mediaMarkup(review[4], true) + '</section>' : '') +
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

