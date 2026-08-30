(function () {
  "use strict";

  function removeDeprecatedDetailActions(root) {
    (root || document).querySelectorAll(".product-detail button, .lx-buybar button, .detail-actions button").forEach(function (button) {
      var label = String(button.textContent || "").replace(/\s+/g, "").trim();
      if (label === "加入购物车" || label === "找相似") button.remove();
    });
  }

  function installPaymentModalStyle() {
    if (document.getElementById("lx-payment-lead-style-v54")) return;
    var style = document.createElement("style");
    style.id = "lx-payment-lead-style-v54";
    style.textContent = `
      .lx-p0-modal-mask.lx-order-modal-mask {
        padding:20px!important;
        background:#190e21d1!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin {
        width:min(620px,calc(100vw - 40px))!important;
        max-height:min(860px,calc(100vh - 40px))!important;
        padding:0!important;
        border:0!important;
        border-radius:20px!important;
        background:#FFFFFF!important;
        box-shadow:0 24px 70px rgba(155,142,182,.62),0 4px 14px rgba(50,29,57,.08)!important;
        overflow:auto!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal-body {
        padding:0!important;
        overflow:visible!important;
      }
      .co.lx-order-skin .order-head {
        position:sticky!important;
        top:0!important;
        z-index:3!important;
        min-height:72px!important;
        margin:0!important;
        padding:20px 28px!important;
        border-bottom:1px solid #EFE4F1!important;
        border-radius:20px 20px 0 0!important;
        background:linear-gradient(90deg,#FBE9EF 0%,#EFE9F9 100%)!important;
      }
      .co.lx-order-skin .order-head .title {
        gap:10px!important;
        font-size:18px!important;
        line-height:26px!important;
        font-weight:800!important;
        color:#B8252E!important;
      }
      .co.lx-order-skin .order-head .x {
        width:36px!important;
        height:36px!important;
        background:rgba(146,86,214,.08)!important;
      }
      .co.lx-order-skin .prod-list {
        margin:22px 28px 0!important;
        padding:0 0 18px!important;
      }
      .co.lx-order-skin .prod {
        gap:14px!important;
        min-height:68px!important;
      }
      .co.lx-order-skin .prod .pic {
        width:64px!important;
        height:64px!important;
        border-radius:12px!important;
        background:#f3edf6!important;
      }
      .co.lx-order-skin .prod .pn {
        font-size:15px!important;
        line-height:22px!important;
      }
      .co.lx-order-skin .spec-group,
      .co.lx-order-skin .addr-group,
      .co.lx-order-skin .pay-row,
      .co.lx-order-skin .pay-picker,
      .co.lx-order-skin .subsidy-bar,
      .co.lx-order-skin .price-section,
      .co.lx-order-skin .actions-row,
      .co.lx-order-skin .foot-note {
        margin-left:28px!important;
        margin-right:28px!important;
      }
      .co.lx-order-skin .spec-group {
        gap:8px 18px!important;
        padding:14px 0!important;
      }
      .co.lx-order-skin .addr-group {
        padding:16px 0!important;
      }
      .co.lx-order-skin .pay-row {
        width:calc(100% - 56px)!important;
        min-height:52px!important;
        padding:0!important;
      }
      .co.lx-order-skin .pay-picker {
        padding:0 0 14px!important;
      }
      .co.lx-order-skin .subsidy-bar {
        min-height:52px!important;
        padding:12px 16px!important;
        border-radius:12px!important;
      }
      .co.lx-order-skin .price-section {
        margin-top:16px!important;
        padding:18px!important;
        border:1px solid #EFE4F1!important;
        border-radius:14px!important;
        background:#f3edf6!important;
      }
      .co.lx-order-skin .pwait {
        align-items:baseline!important;
      }
      .co.lx-order-skin .pwait .amt {
        font-size:34px!important;
        line-height:40px!important;
      }
      .co.lx-order-skin .actions-row {
        display:grid!important;
        grid-template-columns:120px minmax(0,1fr)!important;
        gap:12px!important;
        margin-top:18px!important;
      }
      .co.lx-order-skin .occ-btn {
        height:50px!important;
        min-height:50px!important;
        border-radius:13px!important;
        font-size:16px!important;
        font-weight:800!important;
      }
      .co.lx-order-skin .occ-btn-outline {
        border:1px solid #e2ddeb!important;
        background:#FFFFFF!important;
        color:#5b1452!important;
      }
      .co.lx-order-skin .occ-btn-primary {
        border:0!important;
        background:linear-gradient(90deg,#4d144a 11.9%,#B8252E 100%)!important;
        color:#FFFFFF!important;
        box-shadow:0 12px 26px rgba(146,86,214,.16)!important;
      }
      .co.lx-order-skin .foot-note {
        margin-top:12px!important;
        margin-bottom:22px!important;
        text-align:center!important;
      }
      @media (max-width:640px) {
        .co.lx-order-skin .actions-row { grid-template-columns:1fr!important; }
        .co.lx-order-skin .prod-list,
        .co.lx-order-skin .spec-group,
        .co.lx-order-skin .addr-group,
        .co.lx-order-skin .pay-row,
        .co.lx-order-skin .pay-picker,
        .co.lx-order-skin .subsidy-bar,
        .co.lx-order-skin .price-section,
        .co.lx-order-skin .actions-row,
        .co.lx-order-skin .foot-note { margin-left:18px!important; margin-right:18px!important; }
        .co.lx-order-skin .pay-row { width:calc(100% - 36px)!important; }
      }
    `;
    document.head.appendChild(style);
  }

  installPaymentModalStyle();
  removeDeprecatedDetailActions(document);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) removeDeprecatedDetailActions(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
