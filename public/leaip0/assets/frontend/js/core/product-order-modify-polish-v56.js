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
      .lx-p0-modal:has(.lx-mo-skin) {
        width:min(620px,calc(100vw - 40px))!important;
        max-height:min(860px,calc(100vh - 40px))!important;
        padding:0!important;
        border:0!important;
        border-radius:20px!important;
        background:#FFFFFF!important;
        box-shadow:0 24px 70px rgba(155,142,182,.62),0 4px 14px rgba(50,29,57,.08)!important;
        overflow:hidden!important;
      }
      .lx-p0-modal:has(.lx-mo-skin) .lx-p0-modal-head {
        min-height:72px!important;
        padding:20px 28px!important;
        border-bottom:1px solid #EFE4F1!important;
        border-radius:20px 20px 0 0!important;
        background:linear-gradient(90deg,#FBE9EF 0%,#EFE9F9 100%)!important;
      }
      .lx-p0-modal:has(.lx-mo-skin) .lx-p0-modal-title {
        display:flex!important;
        align-items:center!important;
        gap:10px!important;
        font-size:18px!important;
        line-height:26px!important;
        font-weight:800!important;
        color:#B8252E!important;
      }
      .lx-p0-modal:has(.lx-mo-skin) .lx-p0-modal-title::before {
        content:"✦";
        color:#B8252E!important;
      }
      .lx-p0-modal:has(.lx-mo-skin) .lx-p0-close {
        width:36px!important;
        height:36px!important;
        border:0!important;
        border-radius:50%!important;
        background:rgba(146,86,214,.08)!important;
        color:#625b68!important;
        font-size:24px!important;
      }
      .lx-p0-modal:has(.lx-mo-skin) .lx-p0-modal-body {
        max-height:calc(min(860px,calc(100vh - 40px)) - 72px)!important;
        padding:20px 28px 24px!important;
        overflow-y:auto!important;
      }
      .lx-mo-skin {
        display:flex!important;
        flex-direction:column!important;
        gap:18px!important;
      }
      .lx-mo-skin > div:not(.lx-mo-actions) {
        min-width:0!important;
      }
      .lx-mo-skin .lx-mo-label {
        margin-bottom:8px!important;
        color:#252525!important;
        font-size:13px!important;
        line-height:20px!important;
        font-weight:800!important;
      }
      .lx-mo-skin .lx-mo-chiprow {
        gap:8px!important;
      }
      .lx-mo-skin .lx-mo-chip {
        height:38px!important;
        padding:0 16px!important;
        border:1px solid #e2ddeb!important;
        border-radius:10px!important;
        background:#FFFFFF!important;
        color:#625b68!important;
        font-size:13px!important;
        font-weight:700!important;
        box-shadow:none!important;
      }
      .lx-mo-skin .lx-mo-chip:hover {
        border-color:#5b1452!important;
        color:#5b1452!important;
      }
      .lx-mo-skin .lx-mo-chip.is-sel {
        border-color:#5b1452!important;
        background:#f3edf6!important;
        color:#5b1452!important;
      }
      .lx-mo-skin .lx-mo-row {
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:12px!important;
      }
      .lx-mo-skin input.lx-mo-field,
      .lx-mo-skin textarea.lx-mo-field {
        width:100%!important;
        min-width:0!important;
        height:44px!important;
        padding:0 14px!important;
        border:1px solid #e2ddeb!important;
        border-radius:10px!important;
        background:#FFFFFF!important;
        color:#252525!important;
        font-size:13px!important;
        line-height:20px!important;
        box-shadow:none!important;
        outline:none!important;
      }
      .lx-mo-skin textarea.lx-mo-field {
        height:76px!important;
        padding:12px 14px!important;
        resize:none!important;
      }
      .lx-mo-skin input.lx-mo-field:focus,
      .lx-mo-skin textarea.lx-mo-field:focus {
        border-color:#5b1452!important;
        box-shadow:0 0 0 3px rgba(146,86,214,.16)!important;
      }
      .lx-mo-skin .lx-mo-actions {
        display:grid!important;
        grid-template-columns:120px minmax(0,1fr)!important;
        gap:12px!important;
        margin-top:2px!important;
        padding-top:18px!important;
        border-top:1px solid #EFE4F1!important;
      }
      .lx-mo-skin .lx-mo-actions .lx-p0-btn {
        width:100%!important;
        height:50px!important;
        min-height:50px!important;
        border:1px solid #e2ddeb!important;
        border-radius:13px!important;
        background:#FFFFFF!important;
        color:#5b1452!important;
        font-size:16px!important;
        font-weight:800!important;
      }
      .lx-mo-skin .lx-mo-actions .lx-p0-btn.primary {
        border:0!important;
        background:linear-gradient(90deg,#4d144a 11.9%,#B8252E 100%)!important;
        color:#FFFFFF!important;
        box-shadow:0 12px 26px rgba(146,86,214,.16)!important;
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
        .lx-mo-skin .lx-mo-row,
        .lx-mo-skin .lx-mo-actions { grid-template-columns:1fr!important; }
      }
    `;
    document.head.appendChild(style);
  }

  function refreshPaymentModalSurface() {
    var modal = document.querySelector(".lx-p0-modal.co.lx-order-skin");
    if (!modal) return;
    modal.style.removeProperty("box-shadow");
    modal.style.removeProperty("filter");
  }

  installPaymentModalStyle();
  removeDeprecatedDetailActions(document);
  refreshPaymentModalSurface();
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) removeDeprecatedDetailActions(node);
      });
    });
    refreshPaymentModalSurface();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
