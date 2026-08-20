// P0 订单预览 / 修改商品 / 确认订单 / 发票 / 支付宝扫码支付 / 订单详情两页签。
// 独立文件，不改 app.js 主逻辑结构，只通过 window.__lxAgentAPI 桥接读写共享状态、
// 复用 openModal/closeModal/addMessage/lxOpenInfoTab 等既有能力；app.js 只在
// lxOpenOrderConfirm / openOrderDetail / .detail-primary / 购物车去结算 / 立即购买
// 几个既有入口做了「优先委托本模块，模块未加载则回退旧逻辑」的最小侵入式改动。
(function () {
  "use strict";

  if (window.__lxOrderFlowLoaded) return;
  window.__lxOrderFlowLoaded = true;

  function api() { return window.__lxAgentAPI || {}; }
  function st() { const a = api(); return a.getState ? a.getState() : (window.__lxState || {}); }
  function esc(value) { const a = api(); return typeof a.esc === "function" ? a.esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function fmt(value) { const n = Number(value) || 0; return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 }); }
  function toast(text) { const a = api(); if (typeof a.toast === "function") a.toast(text); }
  function imgUrl(url) { const a = api(); return typeof a.imgUrl === "function" ? a.imgUrl(url) : (url || "/assets/product-placeholder.svg"); }

  // ── 规格闭集（PRD：颜色/尺寸/配置/数量） ──────────────────────────────────────
  var COLORS = [
    { id: "misty-gray", label: "凝雾灰" },
    { id: "deep-gray", label: "深空灰" },
    { id: "star-silver", label: "星空银" }
  ];
  var SIZES = [
    { id: "11in", label: "11寸", delta: -200 },
    { id: "13in", label: "13寸", delta: 0 },
    { id: "14in", label: "14寸", delta: 300, disabled: true }
  ];
  var CONFIGS = [
    { id: "8-128", label: "8GB+128GB WIFI", delta: -300 },
    { id: "8-256", label: "8GB+256GB WIFI", delta: 0 },
    { id: "16-512", label: "16GB+512GB WIFI", delta: 800, disabled: true }
  ];
  var PAY_CHANNELS = {
    online: [["alipay", "支付宝"], ["huabei", "花呗"], ["wechat", "微信支付"], ["jd", "京东支付"]],
    installment: [["huabei_inst", "花呗分期"], ["credit_inst", "信用卡分期"], ["jd_baitiao", "京东白条"]]
  };
  var INSTALLMENT_PERIODS = [3, 6, 12, 24];

  function findById(list, id) { return list.filter(function (x) { return x.id === id; })[0] || list[0]; }

  // ── 草稿订单（模块内可变态，openPreview 前必须已构建） ─────────────────────────
  var draft = null;
  var invoiceReturnTo = "preview"; // "preview" | "order"
  var askedOrderIds = {};
  var lastPaidOrder = null;

  function seriesOf(item) { return item.category || "联想笔记本电脑"; }
  function modelOf(item) { return item.name || "联想商品"; }

  function pickDefaultAddress() {
    var a = api();
    var list = typeof a.lxAddresses === "function" ? a.lxAddresses() : [];
    return (list && list[0]) || { name: "演示用户", phone: "138****0000", region: "演示地址", detail: "可在订单中修改收货信息" };
  }

  function buildItem(product, qty) {
    var a = api();
    var base = typeof a.normalizeProduct === "function" ? a.normalizeProduct(product) : {
      sku: product.sku || product.name, name: product.name, price: Number(product.price) || 0,
      image_url: product.image_url, category: product.category || ""
    };
    var claim = typeof a.lxClaimBenefits === "function" ? a.lxClaimBenefits(base) : { claimed: [], discount: 0 };
    return {
      sku: base.sku, name: base.name, image_url: base.image_url, category: base.category,
      basePrice: Number(base.price) || 0, qty: Math.min(5, Math.max(1, Number(qty) || 1)),
      colorId: COLORS[0].id, sizeId: "13in", configId: "8-256",
      benefits: claim.claimed || [], discount: Math.abs(Number(claim.discount) || 0)
    };
  }

  function buildDraftSingle(product, qty) {
    var item = buildItem(product, qty || 1);
    draft = {
      items: [item],
      address: pickDefaultAddress(),
      payment: { mode: "online", channel: "alipay", period: null },
      note: "", customerCode: "", invoice: null
    };
    recompute();
    return draft;
  }

  function buildDraftFromCart(items) {
    draft = {
      items: (items || []).map(function (p) { return buildItem(p, 1); }),
      address: pickDefaultAddress(),
      payment: { mode: "online", channel: "alipay", period: null },
      note: "", customerCode: "", invoice: null
    };
    recompute();
    return draft;
  }

  function unitPrice(item) {
    var size = findById(SIZES, item.sizeId), cfg = findById(CONFIGS, item.configId);
    return Math.max(0, item.basePrice + (size.delta || 0) + (cfg.delta || 0));
  }

  function recompute() {
    if (!draft) return;
    var subtotal = 0, discount = 0;
    draft.items.forEach(function (item) {
      item._unit = unitPrice(item);
      item._line = item._unit * item.qty;
      subtotal += item._line;
      discount += Math.abs(Number(item.discount) || 0);
    });
    draft.subtotal = subtotal;
    draft.discountTotal = discount;
    draft.payable = Math.max(0, subtotal - discount);
  }

  // ── 左侧 Skill 阶段文案（可折叠，独立渲染避免依赖 app.js 内部 renderSkillTrace 措辞） ──
  function traceHtml(lines, opts) {
    opts = opts || {};
    var collapsed = !!opts.collapsed, foldable = !!opts.foldable;
    var foldText = opts.foldText || "已完成意图判断";
    var items = (lines || []).map(function (line, idx) {
      var isLast = idx === lines.length - 1;
      return '<div class="lx-skill-trace-item' + (!collapsed && isLast ? " current" : "") + '">' + esc(line) + "</div>";
    }).join("");
    var cls = "lx-skill-trace" + (foldable ? " is-foldable" : "") + (collapsed ? " is-collapsed" : "");
    return '<div class="' + cls + '">' +
      '<button type="button" class="lx-skill-trace-fold" data-lx-trace-toggle aria-expanded="' + (collapsed ? "false" : "true") + '">' +
      '<span class="lx-skill-trace-fold-text">' + esc(foldText) + '</span><span class="lx-skill-trace-fold-caret"><img src="../icons/global-collapse.svg" alt="" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="lx-skill-trace-list">' + items + "</div>" +
      "</div>";
  }

  function scrollChatBottom() {
    var a = api();
    var chat = typeof a.ensureChat === "function" ? a.ensureChat() : document.querySelector(".lx-p0-messages");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function disclaimerHtml() {
    return '<p class="lx-p0-disclaimer">订单、支付与发票信息均为演示数据，提交或支付前请核对商品、金额与收货信息。</p>';
  }

  // taskType/skillLabel：对应 PRD 「已判断任务类型」「正在调用对应官方Skill」两行的具体任务名
  function runSkillTrace(taskType, skillLabel, onDone) {
    var a = api();
    var lines = ["正在分析用户意图"];
    var node = typeof a.addMessage === "function" ? a.addMessage("ai loading", "", traceHtml(lines, { collapsed: false, foldable: false })) : null;
    if (!node) { if (typeof onDone === "function") onDone(null); return; }
    var body = node.querySelector(".ai-body");
    scrollChatBottom();
    var steps = ["已判断任务类型：" + taskType, "正在调用对应官方Skill：" + skillLabel, "正在校验信息并生成结果"];
    var i = 0;
    var timer = setInterval(function () {
      if (i < steps.length) {
        lines.push(steps[i]);
        if (body) body.innerHTML = traceHtml(lines, { collapsed: false, foldable: false });
        scrollChatBottom();
        i += 1;
      } else {
        clearInterval(timer);
        if (body) body.innerHTML = traceHtml(lines, { collapsed: true, foldable: true, foldText: "已完成1个Skill工具调用" });
        scrollChatBottom();
        if (typeof onDone === "function") onDone(node);
      }
    }, 420);
  }

  function appendToNode(node, html) {
    if (!node) return;
    var body = node.querySelector(".ai-body");
    if (body) body.innerHTML += html;
    scrollChatBottom();
    try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (e) {}
  }

  // ── 弹层：订单预览 ───────────────────────────────────────────────────────────
  function invoiceSummaryText() {
    if (!draft.invoice) return "未设置发票";
    if (draft.invoice.type === "vat_special") return "增值税专票 · " + (draft.invoice.unit || "未填写抬头");
    var title = draft.invoice.titleType === "unit" ? (draft.invoice.unit || "未填写抬头") : (draft.invoice.name || "未填写抬头");
    return "普通发票 · " + title;
  }

  function paymentSummaryText() {
    var p = draft.payment;
    if (p.mode === "corporate") return "对公支付";
    if (p.mode === "installment") {
      var ch = PAY_CHANNELS.installment.filter(function (c) { return c[0] === p.channel; })[0];
      return "分期付款 · " + (ch ? ch[1] : "花呗分期") + (p.period ? "（" + p.period + "期）" : "");
    }
    var oc = PAY_CHANNELS.online.filter(function (c) { return c[0] === p.channel; })[0];
    return "在线支付 · " + (oc ? oc[1] : "支付宝");
  }

  function renderPreviewHtml() {
    recompute();
    var multi = draft.items.length > 1;
    var prodRows = draft.items.map(function (item, idx) {
      return '<div class="lxof-prod-row">' +
        '<span class="shot"><img src="' + esc(imgUrl(item.image_url)) + '" alt=""></span>' +
        '<span class="mid"><span class="nm">' + esc(item.name) + '</span><span class="qty">数量 x' + item.qty + "</span></span>" +
        '<button type="button" class="edit" data-lxof-open-mp="' + idx + '">修改</button>' +
        "</div>";
    }).join("");
    var specRows = draft.items.map(function (item) {
      var color = findById(COLORS, item.colorId), size = findById(SIZES, item.sizeId), cfg = findById(CONFIGS, item.configId);
      return '<div class="lxof-spec-row">' +
        '<span class="lxof-spec-chip">系列<b>' + esc(seriesOf(item)) + "</b></span>" +
        '<span class="lxof-spec-chip">型号<b>' + esc(modelOf(item)) + "</b></span>" +
        '<span class="lxof-spec-chip">颜色<b>' + esc(color.label) + "</b></span>" +
        '<span class="lxof-spec-chip">尺寸<b>' + esc(size.label) + "</b></span>" +
        '<span class="lxof-spec-chip">配置<b>' + esc(cfg.label) + "</b></span>" +
        "</div>";
    }).join('<div style="height:8px"></div>');
    var addr = draft.address;
    var invoiceRow = '<div class="lxof-invoice-entry"><span class="sm">发票：<b>' + esc(invoiceSummaryText()) + "</b></span>" +
      '<button type="button" class="lxof-edit-link" data-lxof-open-invoice="preview">' + (draft.invoice ? "修改发票" : "去设置") + "</button></div>";
    var corpWarn = (draft.payment.mode === "corporate" && (!draft.invoice || draft.invoice.type !== "vat_special"))
      ? '<div class="lxof-invoice-warn">对公支付需先设置增值税专用发票，否则无法提交支付</div>' : "";
    return (
      '<div class="lxof-head"><h3>订单预览' + (multi ? '<span class="lxof-tag">' + draft.items.length + " 件商品</span>" : "") + '</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-groups">' +
        '<div class="lxof-group"><div class="lxof-group-title">商品</div><div class="lxof-prod-list">' + prodRows + "</div></div>" +
        '<div class="lxof-group"><div class="lxof-group-title">系列 · 型号 · 尺寸 · 配置</div>' + specRows + "</div>" +
        '<div class="lxof-group"><div class="lxof-group-title">收货信息</div><div class="lxof-kv">' +
          '<div class="lxof-kv-row"><span class="k">收货人</span><span class="v">' + esc(addr.name) + " " + esc(addr.phone) + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">地址</span><span class="v">' + esc(addr.region || "") + esc(addr.detail || "") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">备注</span><span class="v">' + (draft.note ? esc(draft.note) : "未填写") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">客户编码</span><span class="v">' + (draft.customerCode ? esc(draft.customerCode) : "未填写") + "</span></div>" +
        '</div><div class="lxof-group-foot"><button type="button" class="lxof-edit-link" data-lxof-open-mo="1">修改订单</button></div></div>' +
        '<div class="lxof-group"><div class="lxof-group-title">支付方式 · 发票</div><div class="lxof-kv">' +
          '<div class="lxof-kv-row"><span class="k">支付方式</span><span class="v">' + esc(paymentSummaryText()) + "</span></div>" +
        "</div>" + invoiceRow + corpWarn + "</div>" +
        '<div class="lxof-group"><div class="lxof-group-title">应付金额</div>' +
          '<div class="lxof-total-row"><span class="k">商品合计</span><span class="v">¥' + fmt(draft.subtotal) + "</span></div>" +
          '<div class="lxof-total-row minus"><span class="k">优惠</span><span class="v">-¥' + fmt(draft.discountTotal) + "</span></div>" +
          '<div class="lxof-total-row grand"><span class="k">应付金额</span><span class="v"><span class="cur">¥</span>' + fmt(draft.payable) + "</span></div>" +
        "</div>" +
      "</div>" +
      '<div class="lxof-actions3">' +
        '<button type="button" class="lx-p0-btn" data-lxof-open-mp="0"' + (draft.items.length > 1 ? ' style="display:none"' : "") + ">修改商品</button>" +
        '<button type="button" class="lx-p0-btn" data-lxof-open-mo="1">修改订单</button>' +
        '<button type="button" class="lx-p0-btn primary" data-lxof-pay="1">立即支付 · ¥' + fmt(draft.payable) + "</button>" +
      "</div>"
    );
  }

  function openPreview() {
    var a = api();
    if (!draft) return;
    var mask = a.openModal("", renderPreviewHtml(), { skin: "orderflow" });
    var maskEl = document.querySelector(".lx-p0-modal-mask");
    if (maskEl) maskEl._lxOnClose = null; // 预览层关闭=直接退出下单流程
  }

  // ── 弹层：修改商品 ───────────────────────────────────────────────────────────
  function renderModifyProductHtml(idx) {
    var item = draft.items[idx];
    var chipGroup = function (list, groupName, selectedId) {
      return '<div class="lxof-chipgroup" data-lxof-chipgroup="' + groupName + '">' + list.map(function (opt) {
        var sel = opt.id === selectedId ? " is-sel" : "";
        var dis = opt.disabled ? " is-disabled" : "";
        return '<button type="button" class="lxof-chip' + sel + dis + '" data-lxof-chip="' + groupName + '" data-lxof-value="' + opt.id + '"' + (opt.disabled ? " disabled" : "") + ">" + esc(opt.label) + (opt.disabled ? "（不可售）" : "") + "</button>";
      }).join("") + "</div>";
    };
    return (
      '<div class="lxof-head"><h3>修改商品</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-prod-row" style="margin-bottom:6px"><span class="shot"><img src="' + esc(imgUrl(item.image_url)) + '" alt=""></span><span class="mid"><span class="nm">' + esc(item.name) + "</span></span></div>" +
      '<div class="lxof-field-label">颜色</div>' + chipGroup(COLORS, "color", item.colorId) +
      '<div class="lxof-field-label">尺寸</div>' + chipGroup(SIZES, "size", item.sizeId) +
      '<div class="lxof-field-label">配置</div>' + chipGroup(CONFIGS, "config", item.configId) +
      '<div class="lxof-field-label">数量</div>' +
      '<div class="lxof-qty"><button type="button" class="lxof-qty-btn" data-lxof-qty-dec="1"' + (item.qty <= 1 ? " disabled" : "") + '>−</button><span class="lxof-qty-val" data-lxof-qty-val="1">' + item.qty + '</span><button type="button" class="lxof-qty-btn" data-lxof-qty-inc="1"' + (item.qty >= 5 ? " disabled" : "") + ">+</button></div>" +
      '<div class="lxof-price-preview"><span class="k">预计单价 x 数量</span><span class="v" data-lxof-mp-price>¥' + fmt(unitPrice(item) * item.qty) + "</span></div>" +
      '<div class="lxof-actions3"><button type="button" class="lx-p0-btn lx-p0-close">取消</button><button type="button" class="lx-p0-btn primary" data-lxof-confirm-mp="' + idx + '">确认</button></div>'
    );
  }

  function openModifyProduct(idx) {
    var a = api();
    a.openModal("", renderModifyProductHtml(idx), { skin: "orderflow", flowVariant: "narrow" });
    var maskEl = document.querySelector(".lx-p0-modal-mask");
    if (maskEl) maskEl._lxOnClose = openPreview; // 取消/关闭/遮罩=不保存返回预览
  }

  function refreshModifyProductPricePreview(container) {
    var modal = container.closest(".lxof-skin") || container;
    var priceEl = modal.querySelector("[data-lxof-mp-price]");
    if (!priceEl) return;
    var sizeId = (modal.querySelector('[data-lxof-chip="size"].is-sel') || {}).dataset ? modal.querySelector('[data-lxof-chip="size"].is-sel').dataset.lxofValue : "13in";
    var configId = (modal.querySelector('[data-lxof-chip="config"].is-sel') || {}).dataset ? modal.querySelector('[data-lxof-chip="config"].is-sel').dataset.lxofValue : "8-256";
    var qty = Number((modal.querySelector("[data-lxof-qty-val]") || {}).textContent) || 1;
    var size = findById(SIZES, sizeId), cfg = findById(CONFIGS, configId);
    var idxAttr = modal.querySelector("[data-lxof-confirm-mp]");
    var idx = idxAttr ? Number(idxAttr.getAttribute("data-lxof-confirm-mp")) : 0;
    var base = (draft.items[idx] || {}).basePrice || 0;
    var unit = Math.max(0, base + (size.delta || 0) + (cfg.delta || 0));
    priceEl.textContent = "¥" + fmt(unit * qty);
  }

  // ── 弹层：确认订单（修改订单，不含商品规格数量） ─────────────────────────────────
  function renderModifyOrderHtml() {
    var addr = draft.address, pay = draft.payment;
    var onlineSel = pay.mode === "online", instSel = pay.mode === "installment", corpSel = pay.mode === "corporate";
    var onlineChips = PAY_CHANNELS.online.map(function (c) {
      return '<button type="button" class="lxof-chip' + (pay.channel === c[0] && onlineSel ? " is-sel" : "") + '" data-lxof-chip="paych-online" data-lxof-value="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
    var instChips = PAY_CHANNELS.installment.map(function (c) {
      return '<button type="button" class="lxof-chip' + (pay.channel === c[0] && instSel ? " is-sel" : "") + '" data-lxof-chip="paych-inst" data-lxof-value="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
    var periodOpts = INSTALLMENT_PERIODS.map(function (p) {
      return '<option value="' + p + '"' + (pay.period === p ? " selected" : "") + ">" + p + "期</option>";
    }).join("");
    return (
      '<div class="lxof-head"><h3>确认订单</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-field-label">收货信息</div>' +
      '<div class="lxof-form-row"><input class="lx-p0-field" id="lxofAddrName" placeholder="收货人姓名" value="' + esc(addr.name || "") + '"><input class="lx-p0-field" id="lxofAddrPhone" placeholder="手机号" value="' + esc(addr.phone || "") + '"></div>' +
      '<input class="lx-p0-field" id="lxofAddrRegion" placeholder="省 / 市 / 区" value="' + esc(addr.region || "") + '">' +
      '<input class="lx-p0-field" id="lxofAddrDetail" placeholder="详细地址（街道、楼栋、门牌号）" value="' + esc(addr.detail || "") + '">' +
      '<div class="lxof-field-label">支付方式</div>' +
      '<div class="lxof-radiogroup">' +
        '<label class="lxof-radio-card' + (onlineSel ? " is-sel" : "") + '" data-lxof-radio="paymode" data-lxof-value="online"><span class="t"><span class="dot"></span>在线支付</span></label>' +
        '<label class="lxof-radio-card' + (instSel ? " is-sel" : "") + '" data-lxof-radio="paymode" data-lxof-value="installment"><span class="t"><span class="dot"></span>分期付款</span></label>' +
        '<label class="lxof-radio-card' + (corpSel ? " is-sel" : "") + '" data-lxof-radio="paymode" data-lxof-value="corporate"><span class="t"><span class="dot"></span>对公支付</span></label>' +
      "</div>" +
      '<div class="lxof-pay-sub' + (onlineSel ? " is-active" : "") + '" data-lxof-pay-sub="online"><div class="lxof-chipgroup">' + onlineChips + "</div></div>" +
      '<div class="lxof-pay-sub' + (instSel ? " is-active" : "") + '" data-lxof-pay-sub="installment"><div class="lxof-chipgroup">' + instChips + '</div><div class="lxof-pay-period">分期期数 <select id="lxofPeriod">' + periodOpts + "</select></div></div>" +
      '<div class="lxof-field-label">备注</div>' +
      '<input class="lx-p0-field" id="lxofNote" placeholder="给商家留言（选填）" value="' + esc(draft.note || "") + '">' +
      '<div class="lxof-field-label">客户编码</div>' +
      '<input class="lx-p0-field" id="lxofCustomerCode" placeholder="企业客户编码（选填）" value="' + esc(draft.customerCode || "") + '">' +
      '<div class="lxof-invoice-entry"><span class="sm">发票：<b>' + esc(invoiceSummaryText()) + "</b></span>" +
      '<button type="button" class="lxof-edit-link" data-lxof-open-invoice="order">' + (draft.invoice ? "修改发票" : "去设置") + "</button></div>" +
      '<div class="lxof-actions3"><button type="button" class="lx-p0-btn lx-p0-close">取消</button><button type="button" class="lx-p0-btn primary" data-lxof-confirm-mo="1">确认</button></div>'
    );
  }

  function openModifyOrder() {
    var a = api();
    a.openModal("", renderModifyOrderHtml(), { skin: "orderflow" });
    var maskEl = document.querySelector(".lx-p0-modal-mask");
    if (maskEl) maskEl._lxOnClose = openPreview; // 关闭同样返回预览，不中断订单上下文
  }

  // ── 弹层：发票 ──────────────────────────────────────────────────────────────
  function renderInvoiceHtml() {
    var inv = draft.invoice || { type: "normal", titleType: "personal" };
    var isNormal = inv.type !== "vat_special";
    var isUnit = inv.titleType === "unit";
    return (
      '<div class="lxof-head"><h3>发票信息</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-inv-type lxof-radiogroup">' +
        '<label class="lxof-radio-card' + (isNormal ? " is-sel" : "") + '" data-lxof-radio="invtype" data-lxof-value="normal"><span class="t"><span class="dot"></span>普通发票</span></label>' +
        '<label class="lxof-radio-card' + (!isNormal ? " is-sel" : "") + '" data-lxof-radio="invtype" data-lxof-value="vat_special"><span class="t"><span class="dot"></span>增值税专票</span></label>' +
      "</div>" +
      '<div class="lxof-pay-sub' + (isNormal ? " is-active" : "") + '" data-lxof-inv-panel="normal">' +
        '<div class="lxof-radiogroup" style="margin-bottom:10px">' +
          '<label class="lxof-radio-card' + (!isUnit ? " is-sel" : "") + '" data-lxof-radio="invtitle" data-lxof-value="personal"><span class="t"><span class="dot"></span>个人抬头</span></label>' +
          '<label class="lxof-radio-card' + (isUnit ? " is-sel" : "") + '" data-lxof-radio="invtitle" data-lxof-value="unit"><span class="t"><span class="dot"></span>单位抬头</span></label>' +
        "</div>" +
        '<input class="lx-p0-field" id="lxofInvName" placeholder="个人姓名" value="' + esc(inv.name || "") + '" style="' + (isUnit ? "display:none" : "") + '">' +
        '<input class="lx-p0-field" id="lxofInvUnit" placeholder="单位名称" value="' + esc(inv.unit || "") + '" style="' + (!isUnit ? "display:none" : "") + '">' +
        '<input class="lx-p0-field" id="lxofInvTax" placeholder="纳税人识别号" value="' + esc(inv.taxNo || "") + '" style="' + (!isUnit ? "display:none" : "") + '">' +
      "</div>" +
      '<div class="lxof-pay-sub' + (!isNormal ? " is-active" : "") + '" data-lxof-inv-panel="vat">' +
        '<input class="lx-p0-field" id="lxofInvUnit2" placeholder="单位名称" value="' + esc(inv.unit || "") + '">' +
        '<input class="lx-p0-field" id="lxofInvTax2" placeholder="纳税人识别号" value="' + esc(inv.taxNo || "") + '">' +
        '<input class="lx-p0-field" id="lxofInvAddr" placeholder="单位地址" value="' + esc(inv.address || "") + '">' +
        '<input class="lx-p0-field" id="lxofInvTel" placeholder="单位电话" value="' + esc(inv.tel || "") + '">' +
        '<div class="lxof-form-row"><input class="lx-p0-field" id="lxofInvBank" placeholder="开户行" value="' + esc(inv.bank || "") + '"><input class="lx-p0-field" id="lxofInvAccount" placeholder="银行账号" value="' + esc(inv.account || "") + '"></div>' +
      "</div>" +
      '<div class="lxof-field-label">联系方式</div>' +
      '<div class="lxof-form-row"><input class="lx-p0-field" id="lxofInvPhone" placeholder="手机号" value="' + esc(inv.phone || "") + '"><input class="lx-p0-field" id="lxofInvEmail" placeholder="邮箱" value="' + esc(inv.email || "") + '"></div>' +
      '<div class="lxof-inv-error" data-lxof-inv-error></div>' +
      '<div class="lxof-actions3"><button type="button" class="lx-p0-btn lx-p0-close">取消</button><button type="button" class="lx-p0-btn primary" data-lxof-confirm-inv="1">保存发票</button></div>'
    );
  }

  function openInvoice(returnTo) {
    var a = api();
    invoiceReturnTo = returnTo || "preview";
    a.openModal("", renderInvoiceHtml(), { skin: "orderflow" });
    var maskEl = document.querySelector(".lx-p0-modal-mask");
    if (maskEl) maskEl._lxOnClose = invoiceReturnTo === "order" ? openModifyOrder : openPreview;
  }

  // ── 弹层：支付宝扫码 / 对公汇款 + 支付成功 ─────────────────────────────────────
  function renderPaymentHtml() {
    recompute();
    var orderNo = "LX" + Date.now();
    draft._pendingOrderNo = orderNo;
    var isCorp = draft.payment.mode === "corporate";
    var body = isCorp
      ? '<div class="lxof-pay-corp"><b>对公汇款信息</b><br>户名：联想（北京）有限公司<br>开户行：中国工商银行北京分行营业部<br>账号：0200 0045 0912 3456 789<br>请备注订单号后完成转账，系统将自动核对到账状态。</div>'
      : '<div class="lxof-pay-qr"></div><div class="lxof-pay-channel">' + esc(paymentSummaryText()) + "</div>";
    return (
      '<div class="lxof-head"><h3>' + (isCorp ? "对公汇款" : "扫码支付") + '</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-pay-box">' + body +
      '<div class="lxof-pay-meta"><div class="row"><span>订单号</span><span class="v">' + esc(orderNo) + '</span></div><div class="row"><span>应付金额</span><span class="v amt">¥' + fmt(draft.payable) + "</span></div></div>" +
      '<button type="button" class="lx-p0-btn primary lxof-pay-confirm" data-lxof-confirm-pay="1">确认支付状态</button>' +
      "</div>"
    );
  }

  function openPayment() {
    var a = api();
    if (draft.payment.mode === "corporate" && (!draft.invoice || draft.invoice.type !== "vat_special")) {
      toast("对公支付需先设置增值税专用发票");
      openInvoice("preview");
      return;
    }
    a.openModal("", renderPaymentHtml(), { skin: "orderflow", flowVariant: "narrow" });
    var maskEl = document.querySelector(".lx-p0-modal-mask");
    if (maskEl) maskEl._lxOnClose = openPreview;
  }

  function finalizeOrder() {
    var a = api();
    var state = st();
    var first = draft.items[0] || {};
    var order = {
      sku: first.sku, name: draft.items.length > 1 ? first.name + "等" + draft.items.length + "件商品" : first.name,
      image_url: first.image_url, category: first.category,
      price: draft.payable, orderId: draft._pendingOrderNo || ("LX" + Date.now()),
      createdAt: new Date().toLocaleString("zh-CN"), paidAt: new Date().toLocaleString("zh-CN"),
      status: "已支付", address: draft.address, note: draft.note, customerCode: draft.customerCode,
      payment: { mode: draft.payment.mode, channel: draft.payment.channel, period: draft.payment.period, summary: paymentSummaryText() },
      invoice: draft.invoice, items: draft.items.map(function (it) {
        var color = findById(COLORS, it.colorId), size = findById(SIZES, it.sizeId), cfg = findById(CONFIGS, it.configId);
        return { sku: it.sku, name: it.name, image_url: it.image_url, qty: it.qty, unitPrice: it._unit, color: color.label, size: size.label, config: cfg.label };
      }), subtotal: draft.subtotal, discountTotal: draft.discountTotal,
      benefitNote: draft.discountTotal ? ("已优惠 ¥" + fmt(draft.discountTotal)) : ""
    };
    state.orders.unshift(order);
    if (typeof a.save === "function") a.save("lexiang.orders.v1", state.orders);
    if (typeof a.updateBadges === "function") a.updateBadges();
    lastPaidOrder = order;
    return order;
  }

  function renderPaymentSuccessHtml(order) {
    return (
      '<div class="lxof-head"><h3>支付成功</h3><button type="button" class="lx-p0-close" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
      '<div class="lxof-pay-success"><div class="lxof-success-badge">' + (window.__lxApprovedIcon ? window.__lxApprovedIcon("global-check") : "") + "</div>" +
      '<div class="lxof-success-title">支付成功</div>' +
      '<div class="lxof-success-meta"><div class="row"><span>订单号</span><span class="v">' + esc(order.orderId) + '</span></div><div class="row"><span>实付款</span><span class="v amt">¥' + fmt(order.price) + "</span></div></div>" +
      '<div class="lxof-success-actions"><button type="button" class="lx-p0-btn lx-p0-close">继续购物</button><button type="button" class="lx-p0-btn primary" data-lxof-view-order="' + esc(order.orderId) + '">查看订单</button></div>' +
      "</div>"
    );
  }

  function confirmPayment() {
    var a = api();
    if (typeof a.addMessage === "function") a.addMessage("user", "确认已完成支付");
    runSkillTrace("确认支付", "支付状态查询", function (node) {
      var order = finalizeOrder();
      appendToNode(node, '<p>已为你查询到支付结果：订单 <b>' + esc(order.orderId) + "</b> 支付成功，实付 ¥" + fmt(order.price) + "。</p>" + disclaimerHtml());
      var maskEl = document.querySelector(".lx-p0-modal-mask");
      if (maskEl) {
        maskEl._lxOnClose = null;
        var modal = maskEl.querySelector(".lx-p0-modal-body");
        if (modal) modal.innerHTML = renderPaymentSuccessHtml(order);
      }
    });
  }

  // ── 订单详情：两页签 + 返回订单列表 ──────────────────────────────────────────
  function statusMetaOf(item) {
    var raw = String(item.status || item.orderStatus || "").toLowerCase();
    if (/待付|付款|unpaid|pending_pay|pay/.test(raw)) return { cls: "pay", label: "待付款" };
    if (/已支付|已完成|已签收|签收|done|paid/.test(raw)) return { cls: "done", label: "已支付" };
    if (/待收|收货|配送|发货|ship/.test(raw)) return { cls: "ship", label: "待收货" };
    return { cls: "done", label: "已支付" };
  }

  function renderOrderDetailHtml(order) {
    var st1 = statusMetaOf(order);
    var addr = order.address || {};
    var items = Array.isArray(order.items) && order.items.length ? order.items : [{
      sku: order.sku, name: order.name, image_url: order.image_url, qty: 1, unitPrice: order.price,
      color: findById(COLORS, "misty-gray").label, size: findById(SIZES, "13in").label, config: findById(CONFIGS, "8-256").label
    }];
    var prodRows = items.map(function (it) {
      return '<div class="lxof-prod-row"><span class="shot"><img src="' + esc(imgUrl(it.image_url)) + '" alt=""></span>' +
        '<span class="mid"><span class="nm">' + esc(it.name) + '</span><span class="qty">' + esc(it.color || "") + " · " + esc(it.size || "") + " · " + esc(it.config || "") + " · x" + (it.qty || 1) + "</span></span></div>";
    }).join("");
    var pay = order.payment || { summary: "在线支付 · 支付宝" };
    var invoiceText = order.invoice ? (order.invoice.type === "vat_special" ? "增值税专票 · " + (order.invoice.unit || "") : "普通发票 · " + (order.invoice.titleType === "unit" ? order.invoice.unit : order.invoice.name)) : "未开具发票";
    return (
      '<div class="lxof-detail">' +
      '<div class="lxof-detail-top"><button type="button" class="lxof-back" data-lxof-back-list="1">← 返回订单列表</button>' +
      '<span class="ost ' + st1.cls + '" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--lxof-red)"><span class="d"></span>' + esc(st1.label) + "</span></div>" +
      '<div class="lxof-detail-tabs"><button type="button" class="lxof-detail-tab is-active" data-lxof-detail-tab="info">订单信息</button><button type="button" class="lxof-detail-tab" data-lxof-detail-tab="pay">支付信息</button></div>' +
      '<div class="lxof-detail-pane is-active" data-lxof-detail-pane="info">' +
        '<div class="lxof-group" style="margin-top:12px"><div class="lxof-group-title">商品</div><div class="lxof-prod-list">' + prodRows + "</div></div>" +
        '<div class="lxof-group" style="margin-top:12px"><div class="lxof-group-title">收货信息</div><div class="lxof-kv">' +
          '<div class="lxof-kv-row"><span class="k">收货人</span><span class="v">' + esc(addr.name || "演示用户") + " " + esc(addr.phone || "138****0000") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">地址</span><span class="v">' + esc((addr.region || "") + (addr.detail || "演示地址")) + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">备注</span><span class="v">' + (order.note ? esc(order.note) : "未填写") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">客户编码</span><span class="v">' + (order.customerCode ? esc(order.customerCode) : "未填写") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">下单时间</span><span class="v">' + esc(order.createdAt || "") + "</span></div>" +
        "</div></div>" +
        '<div class="lxof-group" style="margin-top:12px"><div class="lxof-group-title">价格明细</div>' +
          '<div class="lxof-total-row"><span class="k">商品合计</span><span class="v">¥' + fmt(order.subtotal || order.price) + "</span></div>" +
          '<div class="lxof-total-row minus"><span class="k">优惠</span><span class="v">-¥' + fmt(order.discountTotal || 0) + "</span></div>" +
          '<div class="lxof-total-row grand"><span class="k">实付金额</span><span class="v"><span class="cur">¥</span>' + fmt(order.price) + "</span></div>" +
        "</div>" +
      "</div>" +
      '<div class="lxof-detail-pane" data-lxof-detail-pane="pay">' +
        '<div class="lxof-group" style="margin-top:12px"><div class="lxof-group-title">支付信息</div><div class="lxof-kv">' +
          '<div class="lxof-kv-row"><span class="k">支付方式</span><span class="v">' + esc(pay.summary || paymentSummaryText()) + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">支付时间</span><span class="v">' + esc(order.paidAt || order.createdAt || "") + "</span></div>" +
          '<div class="lxof-kv-row"><span class="k">实付金额</span><span class="v">¥' + fmt(order.price) + "</span></div>" +
        "</div></div>" +
        '<div class="lxof-group" style="margin-top:12px"><div class="lxof-group-title">发票</div><div class="lxof-kv">' +
          '<div class="lxof-kv-row"><span class="k">发票类型</span><span class="v">' + esc(invoiceText) + "</span></div>" +
        "</div></div>" +
      "</div>" +
      '<p class="lx-p0-disclaimer">订单、支付与发票信息为演示数据，正式上线以真实交易结果为准。</p>' +
      "</div>"
    );
  }

  function renderOrderDetail(order) {
    var a = api();
    if (typeof a.lxOpenInfoTab === "function") a.lxOpenInfoTab("order-detail", "订单详情", renderOrderDetailHtml(order));
    if (typeof a.lxRevealContent === "function") a.lxRevealContent();
  }

  function viewOrderWithQuery(order) {
    var a = api();
    if (typeof a.closeModal === "function") a.closeModal();
    if (askedOrderIds[order.orderId]) { renderOrderDetail(order); return; }
    askedOrderIds[order.orderId] = true;
    if (typeof a.addMessage === "function") a.addMessage("user", "查看订单 " + order.orderId);
    runSkillTrace("查看订单", "订单查询", function (node) {
      var cardAttr = 'data-lx-open-tab="info:order-detail" aria-label="查看订单详情"';
      var card = typeof a.renderPageCta === "function"
        ? a.renderPageCta({ title: "查看订单详情", desc: "订单 " + order.orderId + " · 已支付", attr: cardAttr })
        : '<button class="answer-cta lx-answer-page" type="button" ' + cardAttr + ">查看订单详情</button>";
      appendToNode(node, "<p>已为你打开订单 <b>" + esc(order.orderId) + "</b> 的详情，可核对商品、支付与发票信息。</p>" + disclaimerHtml() + card);
      renderOrderDetail(order);
    });
  }

  // ── 入口：立即购买 / 购物车合并结算 / 旧 lxOpenOrderConfirm 委托 ─────────────────
  function buyNow(product) {
    if (!product) { toast("请先选择商品"); return; }
    var a = api();
    var name = product.name || "该商品";
    if (typeof a.addMessage === "function") a.addMessage("user", "购买 " + name);
    runSkillTrace("自主下单", "订单创建", function (node) {
      buildDraftSingle(product, 1);
      appendToNode(node, "<p>已为你生成 <b>" + esc(name) + "</b> 的下单清单并自动核对可用优惠，请在订单预览中确认商品、收货信息与支付方式。</p>" + disclaimerHtml());
      openPreview();
    });
  }

  function buyFromCart(items) {
    if (!items || !items.length) { toast("请先选择要结算的商品"); return; }
    buildDraftFromCart(items);
    openPreview();
  }

  function openPreviewFromClaim(item, claimed, discount, finalPrice, addr) {
    var d = buildDraftSingle(item, 1);
    d.items[0].benefits = claimed || [];
    d.items[0].discount = Math.abs(Number(discount) || 0);
    if (addr) d.address = addr;
    recompute();
    openPreview();
  }

  // ── 事件委托：本模块只认自己生成的 data-lxof-* 属性，不与 app.js 既有委托冲突 ──────
  document.addEventListener("click", function (event) {
    var t = event.target;

    var openMp = t.closest("[data-lxof-open-mp]");
    if (openMp) { event.preventDefault(); openModifyProduct(Number(openMp.getAttribute("data-lxof-open-mp")) || 0); return; }

    var openMo = t.closest("[data-lxof-open-mo]");
    if (openMo) { event.preventDefault(); openModifyOrder(); return; }

    var openInv = t.closest("[data-lxof-open-invoice]");
    if (openInv) { event.preventDefault(); openInvoice(openInv.getAttribute("data-lxof-open-invoice")); return; }

    var payBtn = t.closest("[data-lxof-pay]");
    if (payBtn) { event.preventDefault(); openPayment(); return; }

    var chip = t.closest("[data-lxof-chip]");
    if (chip && !chip.disabled) {
      event.preventDefault();
      var group = chip.getAttribute("data-lxof-chip");
      var wrap = chip.closest('[data-lxof-chipgroup]') || chip.parentElement;
      Array.prototype.forEach.call(wrap.querySelectorAll('[data-lxof-chip="' + group + '"]'), function (el) { el.classList.remove("is-sel"); });
      chip.classList.add("is-sel");
      var modal = t.closest(".lxof-skin");
      if (modal) refreshModifyProductPricePreview(modal);
      return;
    }

    var radio = t.closest("[data-lxof-radio]");
    if (radio) {
      event.preventDefault();
      var rgroup = radio.getAttribute("data-lxof-radio");
      var rvalue = radio.getAttribute("data-lxof-value");
      var rwrap = radio.parentElement;
      Array.prototype.forEach.call(rwrap.querySelectorAll('[data-lxof-radio="' + rgroup + '"]'), function (el) { el.classList.remove("is-sel"); });
      radio.classList.add("is-sel");
      var modalRoot = radio.closest(".lxof-skin");
      if (modalRoot) {
        if (rgroup === "paymode") {
          ["online", "installment"].forEach(function (m) {
            var sub = modalRoot.querySelector('[data-lxof-pay-sub="' + m + '"]');
            if (sub) sub.classList.toggle("is-active", rvalue === m);
          });
        } else if (rgroup === "invtype") {
          var np = modalRoot.querySelector('[data-lxof-inv-panel="normal"]');
          var vp = modalRoot.querySelector('[data-lxof-inv-panel="vat"]');
          if (np) np.classList.toggle("is-active", rvalue === "normal");
          if (vp) vp.classList.toggle("is-active", rvalue !== "normal");
        } else if (rgroup === "invtitle") {
          var nameEl = modalRoot.querySelector("#lxofInvName");
          var unitEl = modalRoot.querySelector("#lxofInvUnit");
          var taxEl = modalRoot.querySelector("#lxofInvTax");
          if (nameEl) nameEl.style.display = rvalue === "unit" ? "none" : "";
          if (unitEl) unitEl.style.display = rvalue === "unit" ? "" : "none";
          if (taxEl) taxEl.style.display = rvalue === "unit" ? "" : "none";
        }
      }
      return;
    }

    var qtyDec = t.closest("[data-lxof-qty-dec]");
    var qtyInc = t.closest("[data-lxof-qty-inc]");
    if (qtyDec || qtyInc) {
      event.preventDefault();
      var modal2 = t.closest(".lxof-skin");
      if (!modal2) return;
      var valEl = modal2.querySelector("[data-lxof-qty-val]");
      var v = Number(valEl.textContent) || 1;
      v = qtyInc ? Math.min(5, v + 1) : Math.max(1, v - 1);
      valEl.textContent = String(v);
      modal2.querySelector("[data-lxof-qty-dec]").disabled = v <= 1;
      modal2.querySelector("[data-lxof-qty-inc]").disabled = v >= 5;
      refreshModifyProductPricePreview(modal2);
      return;
    }

    var confirmMp = t.closest("[data-lxof-confirm-mp]");
    if (confirmMp) {
      event.preventDefault();
      var idx = Number(confirmMp.getAttribute("data-lxof-confirm-mp")) || 0;
      var modal3 = confirmMp.closest(".lxof-skin");
      var colorEl = modal3.querySelector('[data-lxof-chip="color"].is-sel');
      var sizeEl = modal3.querySelector('[data-lxof-chip="size"].is-sel');
      var cfgEl = modal3.querySelector('[data-lxof-chip="config"].is-sel');
      var qtyVal = Number(modal3.querySelector("[data-lxof-qty-val]").textContent) || 1;
      var item = draft.items[idx];
      if (item) {
        if (colorEl) item.colorId = colorEl.getAttribute("data-lxof-value");
        if (sizeEl) item.sizeId = sizeEl.getAttribute("data-lxof-value");
        if (cfgEl) item.configId = cfgEl.getAttribute("data-lxof-value");
        item.qty = Math.min(5, Math.max(1, qtyVal));
      }
      recompute();
      var maskEl3 = document.querySelector(".lx-p0-modal-mask");
      if (maskEl3) maskEl3._lxOnClose = null;
      openPreview();
      return;
    }

    var confirmMo = t.closest("[data-lxof-confirm-mo]");
    if (confirmMo) {
      event.preventDefault();
      var modal4 = confirmMo.closest(".lxof-skin");
      var name4 = (modal4.querySelector("#lxofAddrName") || {}).value || "";
      var phone4 = (modal4.querySelector("#lxofAddrPhone") || {}).value || "";
      if (!String(name4).trim() || !String(phone4).trim()) { toast("请填写收货人姓名和手机号"); return; }
      draft.address = {
        name: name4, phone: phone4,
        region: (modal4.querySelector("#lxofAddrRegion") || {}).value || "",
        detail: (modal4.querySelector("#lxofAddrDetail") || {}).value || ""
      };
      var modeEl = modal4.querySelector('[data-lxof-radio="paymode"].is-sel');
      var mode = modeEl ? modeEl.getAttribute("data-lxof-value") : "online";
      var channel = "alipay";
      if (mode === "online") {
        var oc = modal4.querySelector('[data-lxof-chip="paych-online"].is-sel');
        channel = oc ? oc.getAttribute("data-lxof-value") : "alipay";
      } else if (mode === "installment") {
        var ic = modal4.querySelector('[data-lxof-chip="paych-inst"].is-sel');
        channel = ic ? ic.getAttribute("data-lxof-value") : "huabei_inst";
      }
      var periodSel = modal4.querySelector("#lxofPeriod");
      draft.payment = { mode: mode, channel: channel, period: mode === "installment" ? Number((periodSel || {}).value) || INSTALLMENT_PERIODS[0] : null };
      draft.note = (modal4.querySelector("#lxofNote") || {}).value || "";
      draft.customerCode = (modal4.querySelector("#lxofCustomerCode") || {}).value || "";
      var maskEl4 = document.querySelector(".lx-p0-modal-mask");
      if (maskEl4) maskEl4._lxOnClose = null;
      openPreview();
      return;
    }

    var confirmInv = t.closest("[data-lxof-confirm-inv]");
    if (confirmInv) {
      event.preventDefault();
      var modal5 = confirmInv.closest(".lxof-skin");
      var typeEl = modal5.querySelector('[data-lxof-radio="invtype"].is-sel');
      var type = typeEl ? typeEl.getAttribute("data-lxof-value") : "normal";
      var errEl = modal5.querySelector("[data-lxof-inv-error]");
      var showErr = function (msg) { if (errEl) { errEl.textContent = msg; errEl.classList.add("is-show"); } };
      if (errEl) errEl.classList.remove("is-show");
      var invoice = { type: type };
      if (type === "normal") {
        var titleEl = modal5.querySelector('[data-lxof-radio="invtitle"].is-sel');
        var titleType = titleEl ? titleEl.getAttribute("data-lxof-value") : "personal";
        invoice.titleType = titleType;
        if (titleType === "unit") {
          invoice.unit = (modal5.querySelector("#lxofInvUnit") || {}).value || "";
          invoice.taxNo = (modal5.querySelector("#lxofInvTax") || {}).value || "";
          if (!invoice.unit.trim() || !invoice.taxNo.trim()) { showErr("请填写单位名称和纳税人识别号"); return; }
        } else {
          invoice.name = (modal5.querySelector("#lxofInvName") || {}).value || "";
          if (!invoice.name.trim()) { showErr("请填写个人姓名"); return; }
        }
      } else {
        invoice.unit = (modal5.querySelector("#lxofInvUnit2") || {}).value || "";
        invoice.taxNo = (modal5.querySelector("#lxofInvTax2") || {}).value || "";
        invoice.address = (modal5.querySelector("#lxofInvAddr") || {}).value || "";
        invoice.tel = (modal5.querySelector("#lxofInvTel") || {}).value || "";
        invoice.bank = (modal5.querySelector("#lxofInvBank") || {}).value || "";
        invoice.account = (modal5.querySelector("#lxofInvAccount") || {}).value || "";
        if (!invoice.unit.trim() || !invoice.taxNo.trim() || !invoice.bank.trim() || !invoice.account.trim()) { showErr("请完整填写单位名称、税号、开户行和账号"); return; }
      }
      invoice.phone = (modal5.querySelector("#lxofInvPhone") || {}).value || "";
      invoice.email = (modal5.querySelector("#lxofInvEmail") || {}).value || "";
      // 对公支付强制专票：类型不满足则阻止确认并提示原因，不写回订单
      if (draft.payment.mode === "corporate" && invoice.type !== "vat_special") {
        showErr("对公支付需选择增值税专用发票，请重新选择发票类型");
        return;
      }
      draft.invoice = invoice;
      toast("发票信息已保存");
      var maskEl5 = document.querySelector(".lx-p0-modal-mask");
      if (maskEl5) maskEl5._lxOnClose = null;
      if (invoiceReturnTo === "order") openModifyOrder(); else openPreview();
      return;
    }

    var confirmPay = t.closest("[data-lxof-confirm-pay]");
    if (confirmPay) { event.preventDefault(); confirmPay.disabled = true; confirmPayment(); return; }

    var viewOrder = t.closest("[data-lxof-view-order]");
    if (viewOrder) {
      event.preventDefault();
      var oid = viewOrder.getAttribute("data-lxof-view-order");
      var order = (st().orders || []).filter(function (o) { return o.orderId === oid; })[0] || lastPaidOrder;
      if (order) viewOrderWithQuery(order);
      return;
    }

    var backList = t.closest("[data-lxof-back-list]");
    if (backList) { event.preventDefault(); var a2 = api(); if (typeof a2.openOrders === "function") a2.openOrders(); return; }

    var detailTab = t.closest("[data-lxof-detail-tab]");
    if (detailTab) {
      event.preventDefault();
      var key = detailTab.getAttribute("data-lxof-detail-tab");
      var root = detailTab.closest(".lxof-detail");
      if (root) {
        Array.prototype.forEach.call(root.querySelectorAll("[data-lxof-detail-tab]"), function (el) { el.classList.toggle("is-active", el === detailTab); });
        Array.prototype.forEach.call(root.querySelectorAll("[data-lxof-detail-pane]"), function (el) { el.classList.toggle("is-active", el.getAttribute("data-lxof-detail-pane") === key); });
      }
      return;
    }
  }, false);

  window.__lxOrderFlow = {
    buyNow: buyNow,
    buyFromCart: buyFromCart,
    openPreviewFromClaim: openPreviewFromClaim,
    renderOrderDetail: renderOrderDetail,
    viewOrderWithQuery: viewOrderWithQuery
  };
})();
