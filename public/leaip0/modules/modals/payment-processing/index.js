/* 正在支付 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/payment-processing"]) {
window.__p0Modules.installed["modals/payment-processing"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/scanpay-button-standard-v101.js */
window.__p0Modules.sources["ub3d8e5924a68b3bd"]=function(){
(function () {
  "use strict";

  var styleId = "lx-scanpay-button-standard-v101-style";
  if (document.getElementById(styleId)) return;

  var style = document.createElement("style");
  style.id = styleId;
  style.textContent = window.__p0Modules.styleText("/@script-style/fc527e3797f80c6d61b20d86.css");

  (document.head || document.documentElement).appendChild(style);
})();

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/order-payment-orders-sync-v102.js */
window.__p0Modules.sources["u2f17c5238459aa66"]=function(){
(function () {
  "use strict";

  if (window.__lxOrderPaymentOrdersSyncV102) return;
  window.__lxOrderPaymentOrdersSyncV102 = true;

  var ORDER_KEY = "lexiang.orders.v1";
  var capturedPending = null;
  var capturedAt = 0;
  var syncTimer = 0;

  function installStyle() {
    if (document.getElementById("lx-order-payment-sync-style-v102")) return;
    var style = document.createElement("style");
    style.id = "lx-order-payment-sync-style-v102";
    style.textContent =
      window.__p0Modules.styleText("/@script-style/2419c0245975cfd45f5134f8.css");
    (document.head || document.documentElement).appendChild(style);
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_error) { return value || null; }
  }

  function readOrders() {
    try {
      var value = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_error) { return []; }
  }

  function writeOrders(orders) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(orders)); } catch (_error) {}
    if (window.__lxState) window.__lxState.orders = orders;
    try { window.dispatchEvent(new CustomEvent("lx:orders-updated", { detail: { orders: clone(orders) } })); } catch (_error) {}
  }

  function number(value) {
    var parsed = Number(String(value == null ? "" : value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function money(value) {
    return number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }

  function payLabel(value) {
    var key = String(value || "alipay").toLowerCase();
    if (/wechat|weixin|wx/.test(key)) return "微信支付";
    if (/union|cloud|yunshan|云闪/.test(key)) return "云闪付";
    return "支付宝";
  }

  function capturePendingOrder() {
    var state = window.__lxState || {};
    var pending = state.pendingOrderProduct || state._pendingOrderProduct || null;
    if (!pending) { capturedPending = null; capturedAt = 0; return; }
    capturedPending = clone(pending);
    capturedAt = Date.now();
    capturedPending._capturedAddress = clone(state.pendingOrderAddr || state._pendingOrderAddr || pending.address || null);
    capturedPending._capturedPaymentMethod = state.pendingOrderPayMethod || state._pendingOrderPayMethod || pending.payMethod || "alipay";
  }

  // Explicit status takes precedence over legacy paidAt. No substring matching (unpaid != paid).
  function isPaid(order) {
    var value = String(order.paymentStatus || order.payStatus || order.status || "").trim().toLowerCase();
    if (value) return ["paid", "success", "completed", "已支付", "支付成功", "已完成", "待发货", "待收货", "交易完成"].indexOf(value) !== -1;
    return Boolean(order.paidAt);
  }

  function reconcileLatestOrder() {
    if (!capturedPending || Date.now() - capturedAt > 10000) return;
    var orders = readOrders();
    if (!orders.length) return;
    var pending = capturedPending;
    var selection = null; // Never use another product's global selection as an order fallback.
    var wantedId = pending && String(pending._pendingOrderNo || pending.orderId || "");
    if (!wantedId) return;
    var index = orders.findIndex(function (item) { return String(item.orderId || "") === wantedId; });
    if (index < 0 || !isPaid(orders[index])) return; // Enrich only the matching completed demo payment.
    var old = orders[index] || {};
    var items = pending && Array.isArray(pending.items) ? clone(pending.items) : (Array.isArray(old.items) ? clone(old.items) : []);
    var first = items[0] || {};
    var config = first.configurationLabel || (selection && selection.configurationLabel) || old.configurationLabel || "";
    var color = first.colorLabel || (selection && selection.colorLabel) || old.colorLabel || "";
    var payable = number((pending && (pending.payable != null ? pending.payable : pending.price)) != null ? (pending.payable != null ? pending.payable : pending.price) : (old.paidAmount != null ? old.paidAmount : old.price));
    var original = number((pending && (pending.originalPrice != null ? pending.originalPrice : pending.original_price)) != null ? (pending.originalPrice != null ? pending.originalPrice : pending.original_price) : (first.original_price != null ? first.original_price : old.originalPrice));
    var method = (pending && (pending.payMethod || pending.paymentMethod || pending._capturedPaymentMethod)) || old.payMethod || old.paymentMethod || "alipay";
    var paidAt = old.paidAt;
    var merged = Object.assign({}, old, {
      sku: first.sku || (selection && selection.sku) || old.sku,
      name: first.name || old.name,
      image_url: first.image_url || first.image || old.image_url,
      category: first.category || old.category,
      configurationLabel: config,
      colorLabel: color,
      specs: clone(first.specs || old.specs || {}),
      items: items.length ? items : old.items,
      price: payable,
      payable: payable,
      paidAmount: payable,
      originalPrice: original,
      discountAmount: Math.max(0, original - payable),
      address: (pending && (pending._capturedAddress || pending.address)) || old.address,
      payMethod: method,
      paymentMethod: method,
      paymentMethodLabel: payLabel(method),
      paymentStatus: "paid",
      payStatus: "paid",
      status: "paid",
      paidAt: paidAt,
      transactionNo: old.transactionNo
    });
    if (JSON.stringify(old) === JSON.stringify(merged)) return;
    orders[index] = merged;
    writeOrders(orders);
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function imageUrl(value) {
    var src = String(value || "").trim();
    if (!src) return "/assets/product-placeholder.svg";
    return /^(https?:|data:|blob:|\/)/i.test(src) ? src : "/" + src.replace(/^\.\//, "");
  }

  function statusText(order) {
    if (isPaid(order)) return "已支付";
    var raw = String(order.paymentStatus || order.payStatus || order.status || "").toLowerCase();
    if (["cancelled", "canceled", "已取消"].indexOf(raw) !== -1) return "已取消";
    if (["refunded", "已退款"].indexOf(raw) !== -1) return "已退款";
    return "待付款";
  }

  function syncOrdersDom() {
    var root = document.querySelector(".lx-orders-wrap");
    if (!root) return;
    var orders = readOrders();
    var count = root.querySelector(".ohead .cnt");
    // The order center owns the count, including its demo orders and filtering.
    root.querySelectorAll(".ord").forEach(function (card, cardIndex) {
      var detail = card.querySelector("[data-order-detail]");
      var orderId = detail && detail.getAttribute("data-order-detail");
      var order = orders.find(function (item) { return String(item.orderId || "") === String(orderId || ""); });
      if (!order) return;
      var name = card.querySelector(".nm");
      if (name) { var nextName = order.name || "订单商品"; if (name.textContent !== nextName) name.textContent = nextName; if (name.title !== nextName) name.title = nextName; }
      var img = card.querySelector(".shot img");
      if (img) { var nextSrc = imageUrl(order.image_url); if (img.getAttribute("src") !== nextSrc) img.src = nextSrc; var nextAlt = order.name || "订单商品"; if (img.alt !== nextAlt) img.alt = nextAlt; }
      var amount = card.querySelector(".amt");
      var amountHtml = '<span class="cur">¥</span>' + money(order.paidAmount != null ? order.paidAmount : order.price);
      if (amount && amount.innerHTML !== amountHtml) amount.innerHTML = amountHtml;
      var status = card.querySelector(".ost");
      if (status) { var statusHtml = '<span class="d"></span>' + statusText(order); var statusClass = isPaid(order) ? "ost done" : "ost"; if (status.className !== statusClass) status.className = statusClass; if (status.innerHTML !== statusHtml) status.innerHTML = statusHtml; }
      var mid = card.querySelector(".mid");
      if (!mid) return;
      var block = mid.querySelector(".lx-order-live-sync");
      if (!block) { block = document.createElement("div"); block.className = "lx-order-live-sync"; mid.appendChild(block); }
      var config = order.configurationLabel || "";
      var color = order.colorLabel || "";
      var method = order.paymentMethodLabel || payLabel(order.paymentMethod || order.payMethod);
      var paid = money(order.paidAmount != null ? order.paidAmount : order.price);
      var transaction = order.transactionNo ? '<span>支付流水：' + esc(order.transactionNo) + '</span>' : "";
      var nextHtml =
        '<div class="lx-order-config-line">' +
          (config ? '<span><b>配置：</b>' + esc(config) + '</span>' : "") +
          (color ? '<span><b>颜色：</b>' + esc(color) + '</span>' : "") +
        '</div>' +
        '<div class="lx-order-payment-line"><span class="lx-paid-badge">' + esc(statusText(order)) + '</span><span><b>支付方式：</b>' + esc(method) + '</span><span><b>' + (isPaid(order) ? '实付' : '应付') + '：</b>¥' + esc(paid) + '</span>' + transaction + '</div>';
      if (block.innerHTML !== nextHtml) block.innerHTML = nextHtml;
    });
  }

  function scheduleSync() {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncOrdersDom, 24);
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.target.closest?.("[data-buy-modal-direct]")) return;
    if (event.target.closest && event.target.closest("[data-occ-pay-confirm], [data-confirm-payment], .lx-scanpay-confirm")) capturePendingOrder();
  }, true);

  document.addEventListener("click", function (event) {
    var target = event.target.closest && event.target.closest("[data-occ-pay-confirm], [data-confirm-payment], .lx-scanpay-confirm");
    if (target) {
      if (target.closest("[data-buy-modal-direct]")) return;
      capturePendingOrder();
      [50, 350, 900, 1600].forEach(function (delay) { window.setTimeout(function () { reconcileLatestOrder(); syncOrdersDom(); }, delay); });
      return;
    }
    var text = String((event.target.closest && event.target.closest("button,a,[role=button]"))?.textContent || "").trim();
    if (/我的订单|查看订单|订单详情/.test(text) || event.target.closest?.("[data-occ-view-orders],[data-order-detail]")) {
      if (Date.now() - capturedAt < 10000) reconcileLatestOrder();
      scheduleSync();
    }
  }, true);

  window.addEventListener("lx:orders-updated", scheduleSync);
  window.addEventListener("storage", function (event) { if (!event || event.key === ORDER_KEY) scheduleSync(); });
  installStyle();
  // Keep a lightweight mount detector, but ignore changes outside the order center.
  new MutationObserver(function (records) {
    var relevant = records.some(function (record) {
      if (record.target.nodeType === 1 && record.target.closest(".lx-orders-wrap")) return true;
      return Array.prototype.some.call(record.addedNodes, function (node) {
        return node.nodeType === 1 && node.isConnected &&
          (node.matches(".lx-orders-wrap") || node.querySelector(".lx-orders-wrap"));
      });
    });
    if (relevant) scheduleSync();
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(scheduleSync, 600); // Startup is read-only; never infer payment success.
})();

;

};

/* Business: showPaymentProcessing */
window.__p0Modules.factories["modals/payment-processing#showPaymentProcessing:b2ebe21b5c9104e17580fcd5"]=function(__p0Scope){return (() => {
      (0,__p0Scope.ensureMounted)();
      (0,__p0Scope.lockPaymentDialogSize)();
      (0,__p0Scope.stopPaymentTimer)();
      __p0Scope.dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
      __p0Scope.dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">正在支付</h2><div class="lx-payment-stage"><div class="lx-payment-wait"><strong>待付款</strong><span>剩余：<b class="lx-payment-countdown" data-payment-countdown>${(0,__p0Scope.formatRemaining)()}</b></span></div><p class="lx-payment-product">【${(0,__p0Scope.escapeHtml)(__p0Scope.product.name)}】正在支付中，请稍等...</p></div><div class="lx-payment-actions"><button type="button" data-go-pay>去支付</button><button type="button" class="primary" data-confirm-payment>确认支付状态</button></div>`;
      __p0Scope.paymentState.timer = window.setInterval(() => {
        __p0Scope.paymentState.remaining = Math.max(0, __p0Scope.paymentState.remaining - 1);
        const countdown = __p0Scope.dialog.querySelector('[data-payment-countdown]');
        if (countdown) countdown.textContent = (0,__p0Scope.formatRemaining)();
        if (!__p0Scope.paymentState.remaining) (0,__p0Scope.stopPaymentTimer)();
      }, 1000);
    }); };
}
window.__p0Modules.dispatch(document.currentScript);
