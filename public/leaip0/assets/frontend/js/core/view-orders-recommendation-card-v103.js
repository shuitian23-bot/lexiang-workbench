(function () {
  "use strict";

  if (window.__lxViewOrdersRecommendationCardV103) return;
  window.__lxViewOrdersRecommendationCardV103 = true;

  function approvedNextIcon() {
    if (typeof window.__lxApprovedIcon === "function") {
      return window.__lxApprovedIcon("global-next");
    }
    return '<img class="lx-approved-icon-img" src="../icons/global-next.svg" alt="" aria-hidden="true">';
  }

  function upgrade(button) {
    if (!button || button.dataset.lxViewOrdersCardReady === "1") return;

    button.dataset.lxViewOrdersCardReady = "1";
    button.className = "answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-payment-confirm-reco lx-view-orders-reco";
    button.type = "button";
    button.setAttribute("data-lx-result-id", "info:orders");
    button.setAttribute("aria-label", "查看我的订单");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML =
      '<span class="answer-cta-title">查看订单</span>' +
      '<span class="answer-cta-icon" aria-hidden="true">' +
      approvedNextIcon() +
      "</span>";

    var actions = button.closest(".lx-p0-actions");
    if (actions && actions.children.length === 1 && actions.parentNode) {
      actions.parentNode.insertBefore(button, actions);
      actions.remove();
    }
  }

  function sync(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-occ-view-orders]").forEach(upgrade);
  }

  function start() {
    sync(document);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches("[data-occ-view-orders]")) upgrade(node);
          sync(node);
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
