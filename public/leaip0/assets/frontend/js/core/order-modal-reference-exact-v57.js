(function () {
  "use strict";

  function removeDeprecatedDetailActions(root) {
    (root || document).querySelectorAll(".product-detail button, .lx-buybar button, .detail-actions button").forEach(function (button) {
      var label = String(button.textContent || "").replace(/\s+/g, "").trim();
      if (label === "加入购物车" || label === "找相似") button.remove();
    });
  }

  function installPaymentModalStyle() {
    if (document.getElementById("lx-order-reference-style-v57")) return;
    var style = document.createElement("style");
    style.id = "lx-order-reference-style-v57";
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

      /* Exact selector mapping from lenovo_order_payment_modal.html. */
      .lx-p0-modal-mask.lx-order-modal-mask {
        align-items:flex-start!important;
        padding:28px 20px!important;
        overflow:auto!important;
        background:rgba(28,19,33,.78)!important;
        backdrop-filter:blur(2px)!important;
        -webkit-backdrop-filter:blur(2px)!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin {
        width:min(992px,calc(100vw - 40px))!important;
        min-height:1088px!important;
        max-height:none!important;
        zoom:.625!important;
        padding:0!important;
        border-radius:30px!important;
        background:radial-gradient(720px 220px at 20% -2%,rgba(255,232,224,.58),transparent 65%),radial-gradient(620px 260px at 80% 0%,rgba(243,234,255,.7),transparent 70%),#fff!important;
        box-shadow:0 28px 80px rgba(32,19,42,.28)!important;
        overflow:hidden!important;
        animation:modalIn .42s cubic-bezier(.2,.86,.22,1) both!important;
      }
      .co.lx-order-skin .order-head {
        position:relative!important;
        top:auto!important;
        height:122px!important;
        min-height:122px!important;
        margin:0!important;
        padding:0 40px!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
      }
      .co.lx-order-skin .order-head .title {
        gap:14px!important;
        font-size:30px!important;
        line-height:1.2!important;
        font-weight:850!important;
        letter-spacing:-.5px!important;
        background:linear-gradient(90deg,#6a0a58 0%,#a71939 58%,#df1e28 100%)!important;
        -webkit-background-clip:text!important;
        background-clip:text!important;
        color:transparent!important;
      }
      .co.lx-order-skin .order-head .title .hic {
        width:26px!important;
        height:34px!important;
      }
      .co.lx-order-skin .order-head .title .hic .lx-approved-icon {
        width:26px!important;
        height:34px!important;
        background:linear-gradient(135deg,#76105f,#e92835)!important;
      }
      .co.lx-order-skin .order-head .x {
        width:52px!important;
        height:52px!important;
        border:1px solid rgba(89,74,100,.08)!important;
        border-radius:50%!important;
        background:rgba(255,255,255,.72)!important;
        color:#544e5c!important;
        transition:.2s ease!important;
      }
      .co.lx-order-skin .order-head .x:hover {
        transform:rotate(8deg)!important;
        background:#fff!important;
      }
      .co.lx-order-skin .order-head .x svg {
        width:30px!important;
        height:30px!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal-body {
        padding:0 40px 34px!important;
        overflow:visible!important;
      }
      .co.lx-order-skin .prod-list {
        display:flex!important;
        flex-direction:column!important;
        gap:0!important;
        margin:0!important;
        padding:24px 28px 0!important;
        border:1px solid #ece9ef!important;
        border-bottom:0!important;
        border-radius:21px 21px 0 0!important;
        background:rgba(255,255,255,.92)!important;
        box-shadow:0 8px 28px rgba(43,24,51,.045)!important;
      }
      .co.lx-order-skin .prod {
        display:grid!important;
        grid-template-columns:156px 1fr auto!important;
        gap:20px!important;
        min-height:116px!important;
        align-items:center!important;
      }
      .co.lx-order-skin .prod .pic {
        width:150px!important;
        height:116px!important;
        border-radius:12px!important;
        background:#fff!important;
      }
      .co.lx-order-skin .prod .pc {
        padding-right:0!important;
      }
      .co.lx-order-skin .prod .pn {
        font-size:24px!important;
        line-height:1.35!important;
        font-weight:820!important;
        letter-spacing:-.25px!important;
      }
      .co.lx-order-skin .prod .pqty {
        min-width:44px!important;
        height:30px!important;
        margin-top:12px!important;
        padding:0 11px!important;
        border:1px solid #e6d6ea!important;
        border-radius:10px!important;
        background:#f4edf6!important;
        color:#4e2357!important;
      }
      .co.lx-order-skin .prod .pview {
        position:static!important;
        align-self:start!important;
        margin-top:42px!important;
        color:#5a0e56!important;
        font-size:17px!important;
        font-weight:700!important;
        white-space:nowrap!important;
      }
      .co.lx-order-skin .spec-group {
        display:flex!important;
        align-items:center!important;
        gap:22px!important;
        margin:0 0 16px!important;
        padding:16px 20px 14px!important;
        border:1px solid #e9e5ec!important;
        border-top:0!important;
        border-radius:0 0 21px 21px!important;
        background:linear-gradient(180deg,#fff,#fdfcff)!important;
        font-size:18px!important;
      }
      .co.lx-order-skin .spec-group .sp {
        color:#7d7884!important;
        white-space:nowrap!important;
      }
      .co.lx-order-skin .spec-group .sp b {
        color:#17141c!important;
      }
      .co.lx-order-skin .addr-group {
        min-height:110px!important;
        margin:0 0 16px!important;
        padding:20px 26px!important;
        border:1px solid #ece9ef!important;
        border-radius:21px!important;
        background:rgba(255,255,255,.92)!important;
        box-shadow:0 8px 28px rgba(43,24,51,.045)!important;
      }
      .co.lx-order-skin .addr-group .al1 {
        font-size:20px!important;
        font-weight:820!important;
      }
      .co.lx-order-skin .addr-group .al2 {
        margin-top:8px!important;
        color:#77717c!important;
        font-size:18px!important;
      }
      .co.lx-order-skin .pay-row {
        width:100%!important;
        min-height:74px!important;
        margin:0!important;
        padding:0 26px!important;
        border:1px solid #ece9ef!important;
        border-radius:21px!important;
        background:rgba(255,255,255,.92)!important;
        box-shadow:0 8px 28px rgba(43,24,51,.045)!important;
        font-size:20px!important;
      }
      .co.lx-order-skin .pay-row .v {
        font-size:20px!important;
        font-weight:800!important;
      }
      .co.lx-order-skin .pay-picker {
        margin:0 0 16px!important;
        padding:0 26px 18px 78px!important;
        color:#6d6671!important;
      }
      .co.lx-order-skin .subsidy-bar {
        min-height:74px!important;
        margin:16px 0!important;
        padding:0 24px!important;
        border:1px solid #dfeee7!important;
        border-radius:18px!important;
        background:radial-gradient(260px 90px at 4% 50%,rgba(192,245,221,.48),transparent 76%),linear-gradient(90deg,#f6fff9 0%,#fbfffd 100%)!important;
        font-size:20px!important;
      }
      .co.lx-order-skin .subsidy-bar .slink {
        font-size:20px!important;
      }
      .co.lx-order-skin .price-section {
        min-height:188px!important;
        margin:0!important;
        padding:28px 26px!important;
        border:1px solid #efe1ee!important;
        border-radius:20px!important;
        background:radial-gradient(430px 130px at 70% 30%,rgba(255,255,255,.9),transparent 72%),linear-gradient(105deg,#f8edf8 0%,#fff6f8 55%,#f8edf8 100%)!important;
      }
      .co.lx-order-skin .pwait {
        gap:16px!important;
      }
      .co.lx-order-skin .pwait .k {
        font-size:21px!important;
        font-weight:820!important;
      }
      .co.lx-order-skin .pwait .amt {
        color:#f1262f!important;
        font-size:48px!important;
        line-height:1!important;
        font-weight:900!important;
        letter-spacing:-2px!important;
      }
      .co.lx-order-skin .psaved {
        margin-top:10px!important;
        color:#ef2b33!important;
        font-size:20px!important;
        font-weight:800!important;
      }
      .co.lx-order-skin .pdetail-row {
        margin-top:22px!important;
        gap:32px!important;
        font-size:18px!important;
      }
      .co.lx-order-skin .pdetail-hint {
        color:#77717c!important;
        font-size:18px!important;
      }
      .co.lx-order-skin .actions-row {
        display:grid!important;
        grid-template-columns:1fr 1.58fr!important;
        gap:18px!important;
        margin:18px 0 0!important;
        padding:0!important;
        border:0!important;
      }
      .co.lx-order-skin .occ-btn {
        height:80px!important;
        border-radius:18px!important;
        font-size:24px!important;
        font-weight:850!important;
        letter-spacing:.5px!important;
        transition:transform .18s ease,box-shadow .18s ease,filter .18s ease!important;
      }
      .co.lx-order-skin .occ-btn:hover {
        transform:translateY(-2px)!important;
      }
      .co.lx-order-skin .occ-btn-outline {
        border:1.5px solid #76216d!important;
        background:#fff!important;
        color:#5b0d58!important;
      }
      .co.lx-order-skin .occ-btn-primary {
        border:0!important;
        background:linear-gradient(105deg,#5a0b5c 0%,#8e164e 46%,#f51e2b 100%)!important;
        color:#fff!important;
        box-shadow:0 14px 28px rgba(183,21,56,.18)!important;
      }
      .co.lx-order-skin .occ-btn-primary:hover {
        box-shadow:0 18px 34px rgba(183,21,56,.28)!important;
        filter:saturate(1.06)!important;
      }
      .co.lx-order-skin .foot-note {
        margin:16px 0 0!important;
        color:#918b95!important;
        font-size:15px!important;
        line-height:1.5!important;
        text-align:center!important;
      }
      @media (max-width:820px) {
        .lx-p0-modal-mask.lx-order-modal-mask { padding:12px!important; }
        .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin {
          width:100%!important;
          min-height:auto!important;
          border-radius:22px!important;
          zoom:1!important;
        }
        .co.lx-order-skin .order-head { height:92px!important;min-height:92px!important;padding:0 22px!important; }
        .co.lx-order-skin .order-head .title { font-size:22px!important; }
        .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal-body { padding:0 18px 24px!important; }
        .co.lx-order-skin .prod-list { padding:18px!important; }
        .co.lx-order-skin .prod { grid-template-columns:104px 1fr!important; }
        .co.lx-order-skin .prod .pic { width:100px!important;height:78px!important; }
        .co.lx-order-skin .prod .pview { grid-column:2!important;margin:-4px 0 0!important;justify-self:start!important; }
        .co.lx-order-skin .prod .pn { font-size:18px!important; }
        .co.lx-order-skin .addr-group { padding:16px!important; }
        .co.lx-order-skin .addr-group .al1 { font-size:17px!important; }
        .co.lx-order-skin .pay-row { padding:0 16px!important; }
        .co.lx-order-skin .subsidy-bar { align-items:flex-start!important;gap:12px!important;padding:14px 16px!important; }
        .co.lx-order-skin .price-section { padding:20px 16px!important; }
        .co.lx-order-skin .pwait .amt { font-size:40px!important; }
        .co.lx-order-skin .actions-row { grid-template-columns:1fr!important; }
        .co.lx-order-skin .occ-btn { height:62px!important;font-size:20px!important; }
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
