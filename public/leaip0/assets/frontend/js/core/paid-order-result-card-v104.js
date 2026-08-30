(function () {
  "use strict";

  if (window.__lxPaidOrderResultCardV104) return;
  window.__lxPaidOrderResultCardV104 = true;

  var ORDER_KEY = "lexiang.orders.v1";

  function isPaid(order) {
    if (!order || typeof order !== "object") return false;
    var value = [order.paymentStatus, order.payStatus, order.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return /(^|\s)(paid|success|completed)(\s|$)/.test(value) || /已支付|支付成功|已完成/.test(value);
  }

  function hasPaidOrder() {
    try {
      var orders = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
      return Array.isArray(orders) && orders.some(isPaid);
    } catch (error) {
      return false;
    }
  }

  function upgrade(card) {
    if (!card || card.dataset.lxPaidOrderCardReady === "1") return;
    card.dataset.lxPaidOrderCardReady = "1";
    card.dataset.lxViewOrdersCardReady = "1";
    card.classList.add("lx-paid-order-reco", "lx-view-orders-reco");
    card.removeAttribute("data-open-payment-confirm");
    card.removeAttribute("data-lx-recommended-modal");
    card.removeAttribute("data-lx-recommended-modal-payload");
    card.setAttribute("data-occ-view-orders", "1");
    card.setAttribute("data-lx-order-status", "paid");
    card.setAttribute("data-lx-result-id", "info:orders");
    card.setAttribute("aria-label", "查看已支付订单");
    card.setAttribute("aria-pressed", "false");

    var title = card.querySelector(".answer-cta-title");
    if (title) title.textContent = "已支付订单";
  }

  function sync(root) {
    if (!hasPaidOrder()) return;
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches('.lx-payment-confirm-reco[data-open-payment-confirm], .lx-payment-confirm-reco[data-lx-recommended-modal="pending-payment"]')) {
      upgrade(scope);
    }
    scope
      .querySelectorAll('.lx-payment-confirm-reco[data-open-payment-confirm], .lx-payment-confirm-reco[data-lx-recommended-modal="pending-payment"]')
      .forEach(upgrade);
  }

  function syncDocument() {
    sync(document);
  }

  function start() {
    syncDocument();
    document.addEventListener("lx:orders-updated", syncDocument);
    window.addEventListener("pageshow", syncDocument);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncDocument();
    });
    window.addEventListener("storage", function (event) {
      if (event.key === ORDER_KEY) syncDocument();
    });

    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) sync(node);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
