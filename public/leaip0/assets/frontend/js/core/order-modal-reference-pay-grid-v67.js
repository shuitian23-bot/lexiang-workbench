(function () {
  "use strict";

  var STYLE_ID = "lx-order-reference-gradient-fix-style-v66";

  function removeDeprecatedDetailActions(root) {
    (root || document).querySelectorAll(".product-detail button, .lx-buybar button, .detail-actions button").forEach(function (button) {
      var label = String(button.textContent || "").replace(/\s+/g, "").trim();
      if (label === "加入购物车" || label === "找相似") button.remove();
    });
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .lx-p0-modal-mask.lx-order-modal-mask {
        align-items:flex-start!important;
        padding:28px 20px!important;
        overflow:auto!important;
        background:rgba(28,19,33,.78)!important;
        backdrop-filter:blur(2px)!important;
        -webkit-backdrop-filter:blur(2px)!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin {
        position:relative!important;
        width:min(992px,calc(100vw - 40px))!important;
        min-height:1088px!important;
        max-height:none!important;
        zoom:.625!important;
        padding:0!important;
        border:0!important;
        border-radius:30px!important;
        background:radial-gradient(720px 220px at 20% -2%,rgba(255,232,224,.58),transparent 65%),radial-gradient(620px 260px at 80% 0%,rgba(243,234,255,.7),transparent 70%),#fff!important;
        box-shadow:0 28px 80px rgba(32,19,42,.28)!important;
        overflow:hidden!important;
        animation:lxRefModalIn .42s cubic-bezier(.2,.86,.22,1) both!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin:before {
        content:""!important;
        position:absolute!important;
        z-index:0!important;
        top:0!important;
        right:0!important;
        left:0!important;
        width:100%!important;
        height:122px!important;
        border-radius:30px 30px 0 0!important;
        background:#fff!important;
        pointer-events:none!important;
      }
      @keyframes lxRefModalIn { from { opacity:0;transform:translateY(18px) scale(.985) } to { opacity:1;transform:translateY(0) scale(1) } }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal-head { display:none!important; }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal-body { position:relative!important;z-index:1!important;padding:0!important;overflow:visible!important; }
      .co.lx-order-skin .order-head {
        display:flex!important;align-items:center!important;justify-content:space-between!important;
        width:100%!important;height:122px!important;min-height:122px!important;margin:0!important;padding:0 40px!important;
        border:0!important;border-radius:30px 30px 0 0!important;background:transparent!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co[data-v="1"].lx-order-skin .order-head {
        position:relative!important;
        top:auto!important;
        z-index:2!important;
        box-sizing:border-box!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:16px!important;
        width:100%!important;
        height:122px!important;
        min-height:122px!important;
        margin:0!important;
        padding:0 40px!important;
        border:0!important;
        border-radius:30px 30px 0 0!important;
        background:transparent!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co[data-v="1"].lx-order-skin .order-head .title {
        flex:1 1 auto!important;
        min-width:0!important;
        margin:0!important;
      }
      .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co[data-v="1"].lx-order-skin .order-head .x {
        position:static!important;
        top:auto!important;
        right:auto!important;
        margin:0!important;
      }
      .co.lx-order-skin .order-head .title {
        display:flex!important;align-items:center!important;gap:14px!important;margin:0!important;
        font-size:30px!important;line-height:1.2!important;font-weight:500!important;letter-spacing:-.5px!important;
        background:none!important;color:#4d144a!important;
      }
      .co.lx-order-skin .order-head .title .lx-order-title-text {
        display:inline-block!important;
        background:linear-gradient(90deg,#4d144a 11.9%,#b8252e 100%)!important;
        -webkit-background-clip:text!important;background-clip:text!important;
        -webkit-text-fill-color:transparent!important;color:transparent!important;
      }
      .co.lx-order-skin .order-head .hic { position:relative!important;display:block!important;width:26px!important;height:34px!important;flex:0 0 auto!important; }
      .co.lx-order-skin .order-head .hic > * { display:none!important; }
      .co.lx-order-skin .order-head .hic:before,.co.lx-order-skin .order-head .hic:after { content:"";position:absolute;clip-path:polygon(50% 0,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0 50%,38% 36%); }
      .co.lx-order-skin .order-head .hic:before { left:4px;top:8px;width:18px;height:18px;background:linear-gradient(135deg,#76105f,#e92835); }
      .co.lx-order-skin .order-head .hic:after { right:0;top:0;width:10px;height:10px;background:#e7a4a0; }
      .co.lx-order-skin .order-head .x {
        display:grid!important;place-items:center!important;width:52px!important;height:52px!important;flex:0 0 auto!important;
        padding:0!important;border:1px solid rgba(89,74,100,.08)!important;border-radius:50%!important;
        background:rgba(255,255,255,.72)!important;color:#544e5c!important;transition:.2s ease!important;
      }
      .co.lx-order-skin .order-head .x:hover { transform:rotate(8deg)!important;background:#fff!important; }
      .co.lx-order-skin .order-head .x svg { width:30px!important;height:30px!important; }
      .co.lx-order-skin .lx-ref-content { padding:0 40px 34px!important; }
      .co.lx-order-skin .lx-ref-card { background:rgba(255,255,255,.92)!important;border:1px solid #ece9ef!important;border-radius:21px!important;box-shadow:0 8px 28px rgba(43,24,51,.045)!important; }
      .co.lx-order-skin .lx-ref-spacer { height:16px!important; }
      .co.lx-order-skin .prod-list.lx-ref-product-card { display:block!important;margin:0!important;padding:24px 28px 22px!important; }
      .co.lx-order-skin .prod-list .prod { display:grid!important;grid-template-columns:156px 1fr auto!important;gap:20px!important;align-items:center!important;min-height:116px!important;padding:0!important;border:0!important; }
      .co.lx-order-skin .prod .pic { display:flex!important;align-items:center!important;justify-content:center!important;width:150px!important;height:116px!important;border-radius:12px!important;background:#fff!important;overflow:hidden!important; }
      .co.lx-order-skin .prod .pic img { width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important; }
      .co.lx-order-skin .prod .pc { min-width:0!important;padding:0!important; }
      .co.lx-order-skin .prod .pn { display:block!important;color:#17141c!important;font-size:24px!important;line-height:1.35!important;font-weight:500!important;letter-spacing:-.25px!important; }
      .co.lx-order-skin .prod .pqty { display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:44px!important;height:30px!important;margin-top:12px!important;padding:0 11px!important;border:1px solid #e6d6ea!important;border-radius:10px!important;background:#f4edf6!important;color:#4e2357!important;font-size:16px!important;font-weight:700!important; }
      .co.lx-order-skin .prod .pview { position:static!important;align-self:start!important;margin-top:42px!important;padding:0!important;border:0!important;background:none!important;color:#5a0e56!important;font-size:17px!important;font-weight:700!important;text-decoration:none!important;white-space:nowrap!important; }
      .co.lx-order-skin .prod .pview:after { content:"  ›";font-size:25px;vertical-align:-1px; }
      .co.lx-order-skin .spec-group.lx-ref-specs { display:flex!important;align-items:center!important;gap:22px!important;margin-top:18px!important;padding:16px 20px 14px!important;border:1px solid #e9e5ec!important;border-radius:14px!important;background:linear-gradient(180deg,#fff,#fdfcff)!important;flex-wrap:wrap!important; }
      .co.lx-order-skin .spec-group .sp { display:flex!important;align-items:center!important;gap:9px!important;color:#17141c!important;font-size:18px!important;white-space:nowrap!important; }
      .co.lx-order-skin .spec-group .sp + .sp { padding-left:20px!important;border-left:1px solid #e8e4eb!important; }
      .co.lx-order-skin .spec-group .sp b { margin-left:0!important;color:#17141c!important;font-weight:400!important; }
      .co.lx-order-skin .addr-group { display:grid!important;align-items:center!important;min-height:110px!important;margin:0!important;padding:20px 26px!important; }
      .co.lx-order-skin .addr-group .al1 { display:block!important;color:#17141c!important;font-size:20px!important;font-weight:820!important; }
      .co.lx-order-skin .addr-group .ap { margin-left:16px!important; }
      .co.lx-order-skin .addr-group .al2 { margin-top:8px!important;color:#77717c!important;font-size:18px!important;line-height:1.5!important; }
      .co.lx-order-skin .lx-ref-payment-card { overflow:hidden!important; }
      .co.lx-order-skin .pay-row { display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;min-height:74px!important;margin:0!important;padding:0 26px!important;border:0!important;background:transparent!important;font:inherit!important; }
      .co.lx-order-skin .pay-row .k { color:#17141c!important;font-size:20px!important; }
      .co.lx-order-skin .pay-row .v { flex:1!important;margin-right:16px!important;color:#17141c!important;font-size:20px!important;font-weight:500!important;text-align:right!important; }
      .co.lx-order-skin .pay-row .chev { width:12px!important;height:12px!important;color:#36303a!important;transform:rotate(90deg)!important; }
      .co.lx-order-skin .pay-picker { display:none!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;margin:0!important;padding:0 26px 18px!important;border:0!important;color:#6d6671!important; }
      .co.lx-order-skin .pay-picker.is-open { display:grid!important; }
      .co.lx-order-skin .pay-opt { display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:44px!important;padding:0 14px!important;border:1px solid #e6e0ed!important;border-radius:10px!important;background:#fff!important;text-align:center!important; }
      .co.lx-order-skin .subsidy-bar { display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;min-height:74px!important;margin:0!important;padding:0 24px!important;border:1px solid #dfeee7!important;border-radius:18px!important;background:radial-gradient(260px 90px at 4% 50%,rgba(192,245,221,.48),transparent 76%),linear-gradient(90deg,#f6fff9 0%,#fbfffd 100%)!important; }
      .co.lx-order-skin .subsidy-bar .sic { display:none!important; }
      .co.lx-order-skin .subsidy-bar .stxt { flex:1!important;color:#5d5861!important;font-size:20px!important; }
      .co.lx-order-skin .subsidy-bar .stxt b { color:#ff333b!important; }
      .co.lx-order-skin .subsidy-bar .slink { flex:0 0 auto!important;border:0!important;background:none!important;color:#5a0e56!important;font-size:20px!important;font-weight:700!important;text-decoration:none!important; }
      .co.lx-order-skin .subsidy-bar .slink:after { content:" ›"; }
      .co.lx-order-skin .price-section { display:block!important;min-height:188px!important;margin:0!important;padding:28px 26px!important;border:1px solid #efe1ee!important;border-radius:20px!important;background:radial-gradient(430px 130px at 70% 30%,rgba(255,255,255,.9),transparent 72%),linear-gradient(105deg,#f8edf8 0%,#fff6f8 55%,#f8edf8 100%)!important; }
      .co.lx-order-skin .pwait { display:flex!important;align-items:baseline!important;gap:16px!important;flex-wrap:wrap!important; }
      .co.lx-order-skin .pwait .k { color:#17141c!important;font-size:21px!important;font-weight:820!important; }
      .co.lx-order-skin .pwait .amt { color:#f1262f!important;font-size:48px!important;line-height:1!important;font-weight:900!important;letter-spacing:-2px!important; }
      .co.lx-order-skin .pwait .amt .cur { margin-right:1px!important;font-size:1em!important; }
      .co.lx-order-skin .psaved { margin-top:10px!important;color:#ef2b33!important;font-size:20px!important;font-weight:500!important; }
      .co.lx-order-skin .pdetail-row { display:flex!important;align-items:center!important;gap:32px!important;margin-top:22px!important;flex-wrap:wrap!important;font-size:18px!important; }
      .co.lx-order-skin .pdetail-link { padding:0!important;border:0!important;background:none!important;color:#5a0e56!important;font-size:18px!important;font-weight:700!important;text-decoration:none!important; }
      .co.lx-order-skin .pdetail-link:after { content:" ›"; }
      .co.lx-order-skin .pdetail-hint { color:#77717c!important;font-size:18px!important;opacity:1!important; }
      .co.lx-order-skin .price-detail-panel { display:none!important;margin-top:10px!important;padding:12px 14px!important;border-radius:11px!important;background:#f3f0f7!important; }
      .co.lx-order-skin .price-detail-panel.is-open { display:block!important; }
      .co.lx-order-skin .actions-row { display:grid!important;grid-template-columns:1fr 1.58fr!important;gap:18px!important;margin:18px 0 0!important; }
      .co.lx-order-skin .occ-btn { width:100%!important;height:80px!important;border-radius:18px!important;font-size:24px!important;font-weight:500!important;letter-spacing:.5px!important;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease!important; }
      .co.lx-order-skin .occ-btn:hover { transform:translateY(-2px)!important; }
      .co.lx-order-skin .occ-btn-outline { border:1.5px solid #76216d!important;background:#fff!important;color:#5b0d58!important; }
      .co.lx-order-skin .occ-btn-primary { border:0!important;background:linear-gradient(105deg,#5a0b5c 0%,#8e164e 46%,#f51e2b 100%)!important;color:#fff!important;box-shadow:0 14px 28px rgba(183,21,56,.18)!important; }
      .co.lx-order-skin .occ-btn-primary:hover { box-shadow:0 18px 34px rgba(183,21,56,.28)!important;filter:saturate(1.06)!important; }
      .co.lx-order-skin .foot-note { margin:16px 0 0!important;color:#918b95!important;font-size:15px!important;line-height:1.5!important;text-align:center!important; }
      @media (max-width:820px) {
        .lx-p0-modal-mask.lx-order-modal-mask { padding:12px!important; }
        .lx-p0-modal-mask.lx-order-modal-mask .lx-p0-modal.co.lx-order-skin { width:100%!important;min-height:auto!important;border-radius:22px!important;zoom:1!important; }
        .co.lx-order-skin .order-head { height:92px!important;min-height:92px!important;padding:0 22px!important; }
        .co.lx-order-skin .order-head .title { font-size:22px!important; }
        .co.lx-order-skin .lx-ref-content { padding:0 18px 24px!important; }
        .co.lx-order-skin .prod-list.lx-ref-product-card { padding:18px!important; }
        .co.lx-order-skin .prod-list .prod { grid-template-columns:104px 1fr!important; }
        .co.lx-order-skin .prod .pic { width:100px!important;height:78px!important; }
        .co.lx-order-skin .prod .pview { grid-column:2!important;margin:-4px 0 0!important;justify-self:start!important; }
        .co.lx-order-skin .prod .pn { font-size:18px!important; }
        .co.lx-order-skin .spec-group .sp + .sp { padding-left:0!important;border-left:0!important; }
        .co.lx-order-skin .addr-group { padding:16px!important; }
        .co.lx-order-skin .addr-group .al1 { font-size:17px!important; }
        .co.lx-order-skin .payment-row { padding:0 16px!important; }
        .co.lx-order-skin .subsidy-bar { align-items:flex-start!important;padding:14px 16px!important; }
        .co.lx-order-skin .price-section { padding:20px 16px!important; }
        .co.lx-order-skin .pwait .amt { font-size:40px!important; }
        .co.lx-order-skin .actions-row { grid-template-columns:1fr!important; }
        .co.lx-order-skin .occ-btn { height:62px!important;font-size:20px!important; }
      }
    `;
    document.head.appendChild(style);
  }

  function spacer() {
    var node = document.createElement("div");
    node.className = "lx-ref-spacer";
    return node;
  }

  function rebuildPaymentModal() {
    var modal = document.querySelector(".lx-p0-modal.co.lx-order-skin");
    if (!modal) return;
    var body = modal.querySelector(".lx-p0-modal-body");
    if (!body) return;
    if (body.querySelector(":scope > .order-head + .lx-ref-content")) return;
    var head = body.querySelector(":scope > .order-head");
    var products = body.querySelector(":scope > .prod-list");
    var specs = body.querySelector(":scope > .spec-group");
    var address = body.querySelector(":scope > .addr-group");
    var payRow = body.querySelector(":scope > .pay-row");
    var payPicker = body.querySelector(":scope > .pay-picker");
    var subsidy = body.querySelector(":scope > .subsidy-bar");
    var price = body.querySelector(":scope > .price-section");
    var actions = body.querySelector(":scope > .actions-row");
    var note = body.querySelector(":scope > .foot-note");
    if (!head || !products || !address || !payRow || !subsidy || !price || !actions || !note) return;

    var title = head.querySelector(".title");
    if (title && !title.querySelector(".lx-order-title-text")) {
      Array.from(title.childNodes).forEach(function (node) {
        if (node.nodeType !== Node.TEXT_NODE || !String(node.textContent || "").trim()) return;
        var titleText = document.createElement("span");
        titleText.className = "lx-order-title-text";
        titleText.textContent = String(node.textContent || "").trim();
        node.replaceWith(titleText);
      });
    }

    products.classList.add("lx-ref-card", "lx-ref-product-card");
    if (specs) {
      specs.classList.add("lx-ref-specs");
      products.appendChild(specs);
    }
    products.querySelectorAll(".pview").forEach(function (button) {
      button.textContent = "修改配置";
      button.removeAttribute("data-occ-view-detail");
      button.setAttribute("data-occ-modify-order", "1");
    });
    address.classList.add("lx-ref-card");
    if (address.querySelector(".al2")) address.querySelector(".al2").textContent = address.querySelector(".al2").textContent.replace("收货地址:", "收货地址：");

    var paymentCard = document.createElement("section");
    paymentCard.className = "lx-ref-card lx-ref-payment-card";
    paymentCard.appendChild(payRow);
    if (payPicker) paymentCard.appendChild(payPicker);

    var content = document.createElement("div");
    content.className = "lx-ref-content";
    content.appendChild(products);
    content.appendChild(spacer());
    content.appendChild(address);
    content.appendChild(spacer());
    content.appendChild(paymentCard);
    content.appendChild(spacer());
    content.appendChild(subsidy);
    content.appendChild(spacer());
    content.appendChild(price);
    content.appendChild(actions);
    content.appendChild(note);

    body.replaceChildren(head, content);
    modal.dataset.lxReferenceStructure = "v63";
    modal.style.removeProperty("box-shadow");
    modal.style.removeProperty("filter");
  }

  installStyle();
  removeDeprecatedDetailActions(document);
  rebuildPaymentModal();
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) removeDeprecatedDetailActions(node);
      });
    });
    rebuildPaymentModal();
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
