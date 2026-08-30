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
      ".lx-orders-wrap .lx-order-live-sync{margin-top:9px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:13px;line-height:1.55;color:#6f6874}" +
      ".lx-orders-wrap .lx-order-config-line,.lx-orders-wrap .lx-order-payment-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}" +
      ".lx-orders-wrap .lx-order-live-sync b{font-weight:500;color:#38323b}" +
      ".lx-orders-wrap .lx-order-payment-line{width:100%}" +
      ".lx-orders-wrap .lx-paid-badge{display:inline-flex;align-items:center;height:24px;padding:0 10px;border:1px solid #d9c3dd;border-radius:12px;background:#f7f0f8;color:#5f0b55;font-weight:500}" +
      ".lx-orders-wrap .ord{min-height:168px}";
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
    if (!pending) return;
    capturedPending = clone(pending);
    capturedAt = Date.now();
    capturedPending._capturedAddress = clone(state.pendingOrderAddr || state._pendingOrderAddr || pending.address || null);
    capturedPending._capturedPaymentMethod = state.pendingOrderPayMethod || state._pendingOrderPayMethod || pending.payMethod || "alipay";
  }

  function selectedFallback() {
    var store = window.__lxOrderConfigSelections || {};
    return clone(store["item-0"] || store[0] || null);
  }

  function reconcileLatestOrder() {
    var orders = readOrders();
    if (!orders.length) return;
    var pending = capturedPending;
    var selection = selectedFallback();
    var wantedId = pending && String(pending._pendingOrderNo || pending.orderId || "");
    var index = wantedId ? orders.findIndex(function (item) { return String(item.orderId || "") === wantedId; }) : 0;
    if (index < 0) index = 0;
    var old = orders[index] || {};
    var items = pending && Array.isArray(pending.items) ? clone(pending.items) : (Array.isArray(old.items) ? clone(old.items) : []);
    var first = items[0] || {};
    var config = first.configurationLabel || (selection && selection.configurationLabel) || old.configurationLabel || "";
    var color = first.colorLabel || (selection && selection.colorLabel) || old.colorLabel || "";
    var payable = number((pending && (pending.payable != null ? pending.payable : pending.price)) != null ? (pending.payable != null ? pending.payable : pending.price) : (old.paidAmount != null ? old.paidAmount : old.price));
    var original = number((pending && (pending.originalPrice != null ? pending.originalPrice : pending.original_price)) != null ? (pending.originalPrice != null ? pending.originalPrice : pending.original_price) : (first.original_price != null ? first.original_price : old.originalPrice));
    var method = (pending && (pending.payMethod || pending.paymentMethod || pending._capturedPaymentMethod)) || old.payMethod || old.paymentMethod || "alipay";
    var paidAt = old.paidAt || new Date().toLocaleString("zh-CN", { hour12: false });
    var merged = Object.assign({}, old, {
      sku: first.sku || (selection && selection.sku) || old.sku,
      name: first.name || old.name,
      image_url: first.image_url || first.image || old.image_url,
      category: first.category || old.category,
      configurationLabel: config,
      colorLabel: color,
      specs: clone(first.specs || old.specs || {}),
      items: items.length ? items : old.items,
      price: payable || number(old.price),
      payable: payable || number(old.price),
      paidAmount: payable || number(old.price),
      originalPrice: original || number(old.originalPrice),
      discountAmount: Math.max(0, (original || payable) - payable),
      address: (pending && (pending._capturedAddress || pending.address)) || old.address,
      payMethod: method,
      paymentMethod: method,
      paymentMethodLabel: payLabel(method),
      paymentStatus: "paid",
      payStatus: "paid",
      status: "paid",
      paidAt: paidAt,
      transactionNo: old.transactionNo || ("PAY" + String(Date.now()).slice(-12))
    });
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
    var raw = String(order.paymentStatus || order.payStatus || order.status || "").toLowerCase();
    return /paid|success|完成|已支付/.test(raw) ? "已支付" : "待付款";
  }

  function syncOrdersDom() {
    var root = document.querySelector(".lx-orders-wrap");
    if (!root) return;
    var orders = readOrders();
    var count = root.querySelector(".ohead .cnt");
    if (count) count.textContent = "共 " + orders.length + " 笔订单";
    root.querySelectorAll(".ord").forEach(function (card, cardIndex) {
      var detail = card.querySelector("[data-order-detail]");
      var orderId = detail && detail.getAttribute("data-order-detail");
      var order = orders.find(function (item) { return String(item.orderId || "") === String(orderId || ""); }) || orders[cardIndex];
      if (!order) return;
      var name = card.querySelector(".nm");
      if (name) { name.textContent = order.name || "订单商品"; name.title = order.name || "订单商品"; }
      var img = card.querySelector(".shot img");
      if (img) { img.src = imageUrl(order.image_url); img.alt = order.name || "订单商品"; }
      var amount = card.querySelector(".amt");
      if (amount) amount.innerHTML = '<span class="cur">¥</span>' + money(order.paidAmount != null ? order.paidAmount : order.price);
      var status = card.querySelector(".ost");
      if (status) { status.className = "ost done"; status.innerHTML = '<span class="d"></span>' + statusText(order); }
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
        '<div class="lx-order-payment-line"><span class="lx-paid-badge">已支付</span><span><b>支付方式：</b>' + esc(method) + '</span><span><b>实付：</b>¥' + esc(paid) + '</span>' + transaction + '</div>';
      if (block.innerHTML !== nextHtml) block.innerHTML = nextHtml;
    });
  }

  function scheduleSync() {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncOrdersDom, 24);
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.target.closest && event.target.closest("[data-occ-pay-confirm], [data-confirm-payment], .lx-scanpay-confirm")) capturePendingOrder();
  }, true);

  document.addEventListener("click", function (event) {
    var target = event.target.closest && event.target.closest("[data-occ-pay-confirm], [data-confirm-payment], .lx-scanpay-confirm");
    if (target) {
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
  new MutationObserver(function () { scheduleSync(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(function () { reconcileLatestOrder(); scheduleSync(); }, 600);
})();
