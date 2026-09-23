/* 支付订单确认 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/order-payment-confirm"]) {
window.__p0Modules.installed["modals/order-payment-confirm"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/order-modal-reference-exact-no-body-max-v58.js */
window.__p0Modules.sources["u437d17a3e5194a98"]=function(){
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
    style.textContent = window.__p0Modules.styleText("/@script-style/8e9c2fb15aa227b2fcac7e06.css");
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

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/order-modal-reference-config-sku-v100.js */
window.__p0Modules.sources["u73a4a641432fdfe4"]=function(){
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
    style.textContent = window.__p0Modules.styleText("/@script-style/80d6cc6e273850a09d77f504.css");
    document.head.appendChild(style);
  }

  function spacer() {
    var node = document.createElement("div");
    node.className = "lx-ref-spacer";
    return node;
  }

  function syncSavedConfigSummary(products) {
    if (!products) return;
    var state = window.__lxState || {};
    var pending = state.pendingOrderProduct || {};
    var items = Array.isArray(pending.items) && pending.items.length ? pending.items : [pending];
    var item = items[0] || {};
    var stored = (window.__lxOrderConfigSelections || {})["item-0"] || {};
    var configLabel = String(item.configurationLabel || item.configLabel || stored.configurationLabel || "").trim();
    var colorLabel = String(item.colorLabel || stored.colorLabel || "").trim();
    var summary = products.querySelector(":scope > .lx-saved-config-summary");
    if (!configLabel && !colorLabel) {
      if (summary) summary.remove();
      return;
    }
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "lx-saved-config-summary";
      var specGroup = products.querySelector(":scope > .spec-group");
      products.insertBefore(summary, specGroup || null);
    }
    summary.innerHTML = (configLabel ? '<div class="lx-saved-config-item"><span class="k">已选配置：</span><span class="v">' + configLabel.replace(/[&<>"']/g, function (char) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]; }) + '</span></div>' : '') +
      (colorLabel ? '<div class="lx-saved-config-item"><span class="k">颜色：</span><span class="v">' + colorLabel.replace(/[&<>"']/g, function (char) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]; }) + '</span></div>' : '');
  }

  window.__lxSyncOrderConfigSummary = function () {
    document.querySelectorAll(".lx-order-modal-mask .prod-list").forEach(syncSavedConfigSummary);
  };

  function rebuildPaymentModal() {
    var modal = document.querySelector(".lx-p0-modal.co.lx-order-skin");
    if (!modal) return;
    var body = modal.querySelector(".lx-p0-modal-body");
    if (!body) return;
    if (body.querySelector(":scope > .order-head + .lx-ref-content")) {
      syncSavedConfigSummary(body.querySelector(".prod-list"));
      return;
    }
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

    var paymentChevron = payRow.querySelector(".chev img");
    if (paymentChevron) {
      paymentChevron.src = String(paymentChevron.getAttribute("src") || "").replace("global-next.svg", "global-expand.svg");
      paymentChevron.classList.add("lx-payment-chevron-icon");
    }
    if (payPicker) {
      payRow.setAttribute("aria-expanded", payPicker.classList.contains("is-open") ? "true" : "false");
      if (!payRow.dataset.lxPaymentStateBound) {
        payRow.dataset.lxPaymentStateBound = "1";
        payRow.addEventListener("click", function () {
          window.setTimeout(function () {
            payRow.setAttribute("aria-expanded", payPicker.classList.contains("is-open") ? "true" : "false");
          }, 0);
        });
      }
    }

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
    syncSavedConfigSummary(products);
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

  function syncModifyOrderModal() {
    document.querySelectorAll(".lx-p0-modal-mask").forEach(function (mask) {
      var modifyForm = mask.querySelector(".lx-mo-skin");
      var modal = mask.querySelector(".lx-p0-modal");
      var head = mask.querySelector(".lx-p0-modal-head");
      mask.classList.toggle("lx-modify-order-modal-mask", Boolean(modifyForm));
      if (modal) modal.classList.toggle("lx-modify-order-skin", Boolean(modifyForm));
      if (modifyForm && head && !head.querySelector(".lx-modify-order-back")) {
        var back = document.createElement("button");
        back.className = "lx-modify-order-back";
        back.type = "button";
        back.dataset.moCancel = "1";
        back.setAttribute("aria-label", "返回订单弹窗");
  back.innerHTML = '<img src="../icons/global-expand.svg" alt="" aria-hidden="true">';
        head.insertBefore(back, head.firstChild);
      }
      if (!modifyForm && head) head.querySelectorAll(".lx-modify-order-back").forEach(function (back) { back.remove(); });
    });
  }

  installStyle();
  removeDeprecatedDetailActions(document);
  rebuildPaymentModal();
  syncModifyOrderModal();
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) removeDeprecatedDetailActions(node);
      });
    });
    rebuildPaymentModal();
    syncModifyOrderModal();
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
(function () {
  "use strict";

  var STYLE_ID = "lx-product-config-modal-v94-style";
  var MODAL_CLASS = "lx-product-config-modal-mask";
  var DEMO_COLORS = ["日光映潮", "凝雾灰", "深空灰"];
  var selectionStore = window.__lxOrderConfigSelections = window.__lxOrderConfigSelections || {};

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function specs(raw) {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw) || {}; } catch (_error) { return {}; }
  }
  function pick(object, keys) {
    for (var i = 0; i < keys.length; i += 1) if (object[keys[i]]) return object[keys[i]];
    return "";
  }
  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function variantMeta(variant, index) {
    var data = specs(variant.specs);
    var source = [data.configuration_name, data.configurationName, variant.name, variant.description].filter(Boolean).join(" / ");
    var color = pick(data, ["color", "colour", "颜色", "机身颜色", "外观颜色"]);
    if (!color) {
      var tokens = source.split(/[\s｜|/，,（）()]+/).filter(Boolean);
      color = tokens.reverse().find(function (token) { return /(?:黑|白|灰|蓝|青|绿|银|金|紫|红|粉|橙|棕)$/.test(token); }) || "";
    }
    var values = [
      pick(data, ["cpu", "processor", "处理器"]),
      pick(data, ["ram", "memory", "内存"]),
      pick(data, ["storage", "disk", "硬盘", "存储"]),
      pick(data, ["gpu", "graphics", "显卡"]),
      pick(data, ["screen_size", "screenSize", "屏幕尺寸"])
    ].map(clean).filter(Boolean);
    if (!values.length) {
      var fallback = clean(data.configuration_name || data.configurationName || variant.name || "");
      if (fallback) values.push(fallback);
    }
    return {
      variant: variant,
      color: clean(color),
      label: values.join(" / ") || ("配置 " + String(index + 1).padStart(2, "0")),
      price: Number(variant.price || variant.sale_price || 0)
    };
  }
  function unique(values) {
    return values.filter(function (value, index) { return value && values.indexOf(value) === index; });
  }
  function fmt(value) { return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 }); }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = window.__p0Modules.styleText("/@script-style/0b77ab3eb520cd86ac138e4f.css");
    document.head.appendChild(style);
  }

  function currentPendingItem(button) {
    var state = window.__lxState || {};
    var pending = state.pendingOrderProduct || {};
    var items = Array.isArray(pending.items) && pending.items.length ? pending.items : [pending];
    var index = Number(button.dataset.lxItemIndex || 0);
    return { state: state, pending: pending, items: items, index: Math.max(0, Math.min(index, items.length - 1)), item: items[index] || pending };
  }

  async function fetchVariants(item) {
    if (!item || !item.sku) return [];
    try {
      var response = await fetch("/api/products/" + encodeURIComponent(item.sku) + "/variants", { cache: "no-store" });
      if (!response.ok) throw new Error("variants " + response.status);
      var payload = await response.json();
      return Array.isArray(payload.variants) ? payload.variants : [];
    } catch (_error) {
      var cached = window.__lxState && window.__lxState.spuVariants;
      return Array.isArray(cached) ? cached : [];
    }
  }

  function closeConfig(mask,closeOrder){return window.__p0Modules.invoke("modals/configuration-edit#closeConfig:b6acb760b3ea53f034d24a63",{},this,arguments);}

  function renderChoices(mask,metas,selectedSku){return window.__p0Modules.invoke("modals/configuration-edit#renderChoices:a7e1bedc7354bb78a799f076",{get ["unique"](){return unique},get ["DEMO_COLORS"](){return DEMO_COLORS},get ["esc"](){return esc},get ["fmt"](){return fmt}},this,arguments);}

  async function openConfig(button){return window.__p0Modules.invoke("modals/configuration-edit#openConfig:a466bbfbbdde941190245e74",{get ["installStyle"](){return installStyle},get ["MODAL_CLASS"](){return MODAL_CLASS},get ["currentPendingItem"](){return currentPendingItem},get ["selectionStore"](){return selectionStore},get ["esc"](){return esc},get ["DEMO_COLORS"](){return DEMO_COLORS},get ["fetchVariants"](){return fetchVariants},get ["variantMeta"](){return variantMeta},get ["renderChoices"](){return renderChoices}},this,arguments);}

  function syncButtons() {
    document.querySelectorAll(".lx-order-modal-mask .prod-list .prod").forEach(function (row, index) {
      var button = row.querySelector(".pview");
      if (!button) return;
      if (button.textContent !== "修改配置") button.textContent = "修改配置";
      if (button.hasAttribute("data-occ-view-detail")) button.removeAttribute("data-occ-view-detail");
      if (button.hasAttribute("data-occ-modify-order")) button.removeAttribute("data-occ-modify-order");
      if (button.dataset.lxModifyConfig !== "1") button.dataset.lxModifyConfig = "1";
      if (button.dataset.lxItemIndex !== String(index)) button.dataset.lxItemIndex = String(index);
    });
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-lx-modify-config]");
    if (trigger) { event.preventDefault(); event.stopImmediatePropagation(); openConfig(trigger); return; }
    var mask = event.target.closest("." + MODAL_CLASS);
    if (!mask) return;
    if (event.target.closest("[data-lx-config-back]")) { closeConfig(mask, false); return; }
    if (event.target.closest("[data-lx-config-close]")) { closeConfig(mask, true); return; }
    var skuButton = event.target.closest("[data-lx-config-sku]");
    if (skuButton) {
      renderChoices(mask, mask._lxConfigMetas || [], skuButton.dataset.lxConfigSku);
      return;
    }
    var colorButton = event.target.closest("[data-lx-config-color]");
    if (colorButton) {
      var metas = mask._lxConfigMetas || [];
      var current = metas.find(function (meta) { return String(meta.variant.sku) === String(mask.dataset.selectedSku); });
      var target = metas.find(function (meta) { return meta.color === colorButton.dataset.lxConfigColor && (!current || meta.label === current.label); }) || metas.find(function (meta) { return meta.color === colorButton.dataset.lxConfigColor; });
      mask.dataset.selectedColor = colorButton.dataset.lxConfigColor || "";
      if (target) {
        renderChoices(mask, metas, target.variant.sku);
      } else {
        mask.querySelectorAll("[data-lx-config-color]").forEach(function (button) {
          button.classList.toggle("is-selected", button === colorButton);
        });
      }
      return;
    }
    if (event.target.closest("[data-lx-config-save]")) {
      var context = mask._lxConfigContext;
      var selected = (mask._lxConfigMetas || []).find(function (meta) { return String(meta.variant.sku) === String(mask.dataset.selectedSku); });
      if (!context || !selected) return;
      var oldItem = context.items[context.index] || {};
      var variant = selected.variant;
      var oldDiscount = Math.max(0, Number(oldItem.original_price || oldItem.price || 0) - Number(oldItem.price || 0));
      var newOriginal = Number(variant.price || variant.sale_price || oldItem.original_price || oldItem.price || 0);
      var updated = Object.assign({}, oldItem, variant, {
        sku: variant.sku || oldItem.sku,
        name: variant.name || oldItem.name,
        image_url: variant.image_url || variant.image || oldItem.image_url,
        original_price: newOriginal,
        price: Math.max(0, newOriginal - oldDiscount),
        colorLabel: mask.dataset.selectedColor || selected.color || oldItem.colorLabel || "",
        configurationLabel: selected.label || oldItem.configurationLabel || oldItem.configLabel || "",
        specs: variant.specs || oldItem.specs
      });
      selectionStore["item-" + context.index] = {
        sku: updated.sku,
        configurationLabel: updated.configurationLabel,
        colorLabel: updated.colorLabel
      };
      var previousOrderDiscount = Math.max(0, Number(context.pending.original_price || 0) - Number(context.pending.price || 0));
      context.items[context.index] = updated;
      context.pending.items = context.items;
      context.pending.sku = context.items[0].sku;
      context.pending.name = context.items.length > 1 ? context.items[0].name + "等" + context.items.length + "件商品" : updated.name;
      context.pending.image_url = context.items[0].image_url;
      context.pending.original_price = context.items.reduce(function (sum, product) { return sum + Number(product.original_price || product.price || 0); }, 0);
      context.pending.price = Math.max(0, context.pending.original_price - previousOrderDiscount);
      context.pending.payable = Math.max(0, context.pending.price - (context.pending.subsidyClaimed ? Number(context.pending.subsidyAmount || 0) : 0));
      closeConfig(mask, false);
      if (window.__lxAgentAPI && typeof window.__lxAgentAPI.lxOpenPendingPaymentModal === "function") window.__lxAgentAPI.lxOpenPendingPaymentModal();
      [0, 40, 120, 260].forEach(function (delay) {
        window.setTimeout(function () {
          if (typeof window.__lxSyncOrderConfigSummary === "function") window.__lxSyncOrderConfigSummary();
        }, delay);
      });
    }
  }, true);

  installStyle();
  syncButtons();
  var syncQueued = false;
  new MutationObserver(function () {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(function () {
      syncQueued = false;
      syncButtons();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/buy-modal-direct-v1.js */
window.__p0Modules.sources["u40fb7a01ecc3a735"]=function(){
/* p0-purchase-context:start */
/* Product-to-order boundary. No title scraping, demo fallback, or payment writes. */
(() => {
  'use strict';
  const clean = value => String(value ?? '').trim();
  const esc = value => clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(product) {
    if (!product || typeof product !== 'object') throw new Error('请选择具体商品后再下单');
    const sku=clean(product.sku), name=clean(product.name), price=Number(product.price);
    if (!sku || !name || !Number.isFinite(price) || price <= 0) throw new Error('商品数据不完整，请重新打开商品详情');
    let specs=product.specs || {};
    if(typeof specs==='string'){try{specs=JSON.parse(specs);}catch{specs={};}}
    if(!specs || typeof specs!=='object' || Array.isArray(specs))specs={};
    const description=clean(specs.configuration_name || product.description);
    const image=clean(product.image_url || product.image || specs.white_image_url);
    const parts=description.split(/\s*\/\s*/);
    const memory=parts.find(p=>/\d+\s*G(?:B)?\s*(?:LP|DDR|内存)/i.test(p))?.match(/\d+\s*G(?:B)?/i)?.[0];
    const storage=parts.find(p=>/固态|硬盘|SSD|PCIe/i.test(p))?.match(/^\s*\d+(?:\.\d+)?\s*(?:TB|GB)?/i)?.[0]?.trim();
    const configurationLabel=[memory,storage].filter(Boolean).join('+') || description;
    if(image && !/^(?:https?:\/\/|\/|\.\.?\/)/i.test(image)) throw new Error('商品图片地址无效');
    return Object.freeze({
      sku,name,price,originalPrice:price,discount:0,image_url:image,configurationLabel,
      category:clean(product.category),series:clean(specs.spu_name || product.category || '联想'),
      configuration:description || '以所选商品详情为准',
      size:clean(specs.screen_size || specs.display_size || description.match(/\d+(?:\.\d+)?\s*英寸/)?.[0] || '以商品详情为准'),
      color:clean(specs.color || product.color),specs:Object.freeze({...specs})
    });
  }
  function targetSku(button, state) {
    const card=button?.closest?.('[data-buy-sku],[data-open-product],[data-product-id],[data-sku]');
    const explicit=clean(card?.dataset.buySku || card?.dataset.openProduct || card?.dataset.productId || card?.dataset.sku);
    if(explicit)return explicit;
    if(button?.closest?.('.product-detail,.detail-main,.detail-page,.lx-product-detail,.lx-buybar')) {
      const active=state?.tabs?.find(t=>t.id===state.activeTabId && t.kind==='detail');
      return clean(active?.sku || state?.currentProduct?.sku);
    }
    return '';
  }
  async function read(sku) {
    if(!sku)throw new Error('未能确定所选商品，请从商品详情重新下单');
    if(!window.__lxProductData?.product)throw new Error('商品数据服务未准备好，请稍后重试');
    const product=normalize(await window.__lxProductData.product(sku));
    if(product.sku!==String(sku))throw new Error('商品配置已变化，请重新选择');
    return product;
  }
  function fromButton(button){return read(targetSku(button,window.__lxState));}
  async function options(sku){
    if(!window.__lxProductData?.variants)throw new Error('配置数据服务未准备好');
    const result=await window.__lxProductData.variants(sku);
    if(!Array.isArray(result?.variants)||!result.variants.length)throw new Error('暂时无法读取商品配置，请重试');
    return result.variants;
  }
  function renderConfig({dialog,product,quantity,onSelect,onError}) {
    dialog.className='lx-buy-direct-dialog lx-order-edit-dialog lx-config-dialog';
    dialog.innerHTML='<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><div data-purchase-options role="status">正在读取本系列配置…</div><div class="lx-config-quantity"><div class="lx-config-quantity-copy"><h3>商品数量</h3><small>最多购买5件</small></div><div class="lx-config-stepper"><button type="button" data-config-minus aria-label="减少数量" '+(quantity<=1?'disabled':'')+'>−</button><output data-config-count>'+quantity+'</output><button type="button" data-config-plus aria-label="增加数量" '+(quantity>=5?'disabled':'')+'>＋</button></div></div></div><footer class="lx-order-edit-footer"><button type="button" data-config-save>保存修改</button></footer>';
    const host=dialog.querySelector('[data-purchase-options]');
    const current=()=>host.isConnected && dialog.contains(host);
    function fail(error){if(!current())return;host.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='重试';retry.onclick=()=>renderConfig({dialog,product,quantity,onSelect,onError});host.append(' ',retry);onError?.(error);}
    options(product.sku).then(rows=>{
      if(!current())return;
      const variants=rows.map(normalize);
      host.removeAttribute('role');
      host.innerHTML=[['color','颜色'],['size','尺寸'],['configuration','配置']].map(([key,label])=>{
        const values=[...new Set(variants.map(row=>row[key]).filter(Boolean))];
        if(!values.length)values.push(product[key] || '以商品详情为准');
        return '<section class="lx-config-section"><h3>'+label+'</h3><div class="lx-config-options">'+values.map(value=>{
          const selected=(product[key] || '以商品详情为准')===value;
          const matches=variants.filter(row=>row[key]===value);
          const same=matches.find(row=>['color','size','configuration'].every(k=>k===key || row[k]===product[k]));
          const next=same || matches[0];
          return '<button class="lx-config-option'+(selected && next?' is-active':'')+'" type="button" data-purchase-sku="'+esc(next?.sku || product.sku)+'" aria-pressed="'+selected+'" title="'+esc(value)+'"'+(!next?' disabled':'')+'>' + esc(key==='configuration' && next ? next.configurationLabel : value) + '</button>';
        }).join('')+'</div></section>';
      }).join('');
      host.querySelectorAll('[data-purchase-sku]').forEach(button=>button.addEventListener('click',async()=>{
        const sku=button.dataset.purchaseSku;
        host.querySelectorAll('button').forEach(b=>b.disabled=true);host.setAttribute('aria-busy','true');
        try{const selected=await read(sku);if(current())onSelect(selected);}catch(error){fail(error);}
      }));
    }).catch(fail);
  }
  window.__lxPurchaseContext=Object.freeze({normalize,targetSku,read,fromButton,options,renderConfig});
})();

/* p0-purchase-context:end */
/* v59-checkout-payment-standard-answer-card-20260904 */
/* checkout-address-invoice-store-position-v61-20260905 */
/* checkout-layout-v62-20260905 */
/* checkout-flash-card-inner-layout-v63-20260905 */
/* fulfillment-checkout-height-v64-20260905 */
/* checkout-benefit-info-v65-20260905 */
(() => {
  const AIR_13_IMAGE = '/leai%20product%20data/shop-chat%20product%20data/%E7%AC%94%E8%AE%B0%E6%9C%AC/08_SPU_%E8%81%94%E6%83%B3%E5%B0%8F%E6%96%B0_Air_13/%E7%99%BD%E5%BA%95%E5%9B%BE.jpg';
  const FALLBACK_IMAGE = '/assets/product-placeholder.svg';
  const SPARKLE_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23000" d="M12 1l1.8 5.2L19 8l-5.2 1.8L12 15l-1.8-5.2L5 8l5.2-1.8L12 1zm7 12l1 2.9 3 1.1-3 1-1 3-1-3-3-1 3-1.1L19 13zM5 14l1.2 3.5L10 19l-3.8 1.3L5 24l-1.2-3.7L0 19l3.8-1.5L5 14z"/%3E%3C/svg%3E';
  const ADDRESS_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="none" stroke="%23681057" stroke-width="1.8" d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12z"/%3E%3Ccircle cx="12" cy="9" r="2.4" fill="%23681057"/%3E%3C/svg%3E';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const imageForProduct = (name, current) => /小新\s*Air\s*13/i.test(name) ? AIR_13_IMAGE : (current && !/^https?:\/\//i.test(current) ? current : FALLBACK_IMAGE);

  if (!document.querySelector('[data-buy-modal-direct-style]')) {
    const style = document.createElement('style');
    style.dataset.buyModalDirectStyle = 'true';
    style.textContent = '';
    style.textContent += window.__p0Modules.styleText("/@script-style/afa02ca5b71c2ea384130a6a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/d8e015cf967f795d342f57cf.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/71127f896ad1058afb3416e8.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/9c81010d08d6b4723521eb7a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3001561f396ce35a0ecb01b8.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/8c23758e65c9a254b3cfb0ad.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/09b0f98ed869eca9c7ccec19.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7742932f39b2594ea542aad6.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5eab199889e33e1c7bd2080c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/0d931860717e4e58ad2d5314.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fd01bbc30befcc1619d21b8e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/156e3d2657d77015a8ab44c0.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6a306911c98842326779deb7.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7f760958ebcbcf7a4adcbb74.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/012a6b2dbdd58b38db523741.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/41cc5e357ec5a055d9c85ef3.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7c78b09ff13169f4cef345cc.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5cdabca2f5ba95cf6d7af105.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3ec85ad103da7d1fb4a8b30f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c31e4ef11eb0c7e521a3712d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ffbe2f48e2cab09318126629.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/0e2a0b412f5257415d42cd9d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/061465e452d4a8aaa9479e85.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/9aa442dbc5cc93ec42f27101.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/20bb671d34ef1de1bed728c3.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a7a7af065c5d3af0877442c5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/17ce92b58432eb8135a40038.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7255576d38d2d859ce96df6d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5f2307a1e3f51d08429eb47f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/025506a3bb8ddbc79b0ee95c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7d90e7e0db646f6c59e297bf.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/419f5d55bcceb3bd7d8f7fef.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/58d6ec0d3e016a46228d6479.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6059e6afb1be00d26838cfd5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fe152295dfde3bd6a438ffcf.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/e8f67f1625136eaaf23fc924.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/739c3b267846c4298d70faba.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5b89db8016c92a99246accaa.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c1afda81d2411d1ca14623ef.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/16dd96c0a6f587c7e4b5ee7f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ab755601b3abed1078e9adb7.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b6df2307291df3b4cbc4ae17.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/15774b4ae2eec07c2288fc7e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/725b3e1a75d7e23b95ec4946.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c7169d596e00f299b971429a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/685c0dd1bdbf4bb28b9d64bf.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/94a69d2fd397ef35eb5fa309.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/2ad6dc66d390677061f26194.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6a4e429b1649183b40cc9e49.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fb73d90bc5bd966b628e2533.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/087f3f85089896ae4f8333a5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/98a9da121bcb1fa121ce0b07.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a4253da7da4958cbd9d84f24.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f7caad1be1feb58766b865f6.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/17de49d66714fc2781d9be26.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/1f678ed1490de7a2eb68c323.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c13452f6b462f919753dba2e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6a26b2a0cf99f8d20c52ee8d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a69d4ff0fcf18ab1f43008a4.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/92669f197f5a1f6b8a8525e7.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/1f66fce7c5b6366b1add7751.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6977494f0b0fecbc3ee89224.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/11350e01589075d773110a47.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/2eb672ae8f13f409749f71ad.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fdcdd745ad452456cddfe145.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b3963f98f9822c8d45d89af9.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ddc4038015428a41109f38a5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f9c947886b11d23aebf73431.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/06127cab96934bd36aa99e0b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4960510781be0070d11bac57.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/59e953e1a163bafa87fecd88.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f3e9581c683554bafa8465a6.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a7d7259d921cda6ac349fb99.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/511b62247c7c426b268d91d3.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3dd16cf10f973be483577b6f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4c5d702d0db22482d1804809.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c6f49b6c7116aa5fc1d15f4b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4d9d4e2fda719fa2d0a4b336.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/06aababcb965edc1b28e6838.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f152c51b79b5d7d715233223.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3a0ed7f6c9cf221c2b9f6e3c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/94ad4ac4e5aa0f2f1e4d9b4e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a728197bdba742c0b1704570.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f7de2989dcae46e5dbcafe1c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4d945b2943c76907cde0e361.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/49fe044e4e5ccd1a71742fb4.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/05dc592fe784470a5cf9e394.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b7d9ba724aefde42e176f4d0.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f816d4ff4359d8b04d840c23.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/975e5d8151ca1ff70b9e1fdc.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/e30b9df65506fa19157d3939.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7a552c8d987425aa04ca00bb.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/d3571eb1d316541a67ee9b0b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/37da2b31398df96578849a24.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/2f840399765f496b986ff07b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/648bd99a6a348d901282b806.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/59b588c9bb4ccdf904dc0114.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ba10470287bd93634e59820a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/0c3ab070fb69cbdfaefcb5d1.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fa4507372ff154c13635376d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/be4e41839ea7f53b6b1b1b37.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/df570e4566d4ec4f1f9c3ad6.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4a24200a3a2089f0626d24a2.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/16eb6364932d3cdce52c60c2.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c2143a3ad34e592fe414d04a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3222ef851c0805fd27af82a2.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/41a1d61a4d05ea6fb45697b8.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/72d0ecf558e2ead36d36c4ac.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/7a095e819201078083bd1221.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/af0e31accb3c4b2f5f24a2cf.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/4d238d617eee9238738bac90.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/df680ee3a2f7113171bf64e0.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/1293ad11bc360864927becaa.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/9b2fb43a52aa2298763afb27.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/8338bdb599dfcb0150b99468.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/855731fc62b69b6593ded9ff.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/d32d1ee37f104cc4688388a2.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fbf3268ba403ae1c0b25d0f5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/19a848429ee7910675e780ea.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/cb9348dcd8726bc66b66ada8.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/8eebfe04270ba2af6cd98282.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/e0f6e681aef45ffedb78aa5b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c72286284209f42dccadd144.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5023bd756c7f1e6ec2e0bb26.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/6acdf0f35d44bacfb4274484.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/130aad2a232d43995a441e18.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/0d5aefcac9ea1b4ab07c0e59.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b060aaa3dc0cdd26067b0eb9.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/38c4bf2b0d6ef9f2e88cbf24.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/8a7ba67693d4a339852f0474.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3279527e0065fcb667d3660e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/d12e479d1055ee45d932ca41.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5df1a4901f3b1314ba3501ac.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5cc21e1b2dad4f817fd72704.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fda6413de6852d67ac045fc2.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f186de5f04d19d324dacc42f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5d62955b013571f9dc73fefb.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/43e42ac7eafcda85d8a2dbd6.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f9a727b66639f1ea65a8c27e.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/2995592f6c849cc574c0e3f5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/727c439b9a87cd9e4323b7e4.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/218a2fe0cb44ebcda396d39f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/044cec88bc5c00449731ce09.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/164c1b4abc31e49dce015070.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/57dffeff7c64e3d409ed6a7c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/fb569c5069aca5a2db4c9e39.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/83e397f4dffbd70f00dc8280.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/8f2f44273fde8bf5743db014.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5a2bc66b104c1d5bd25607d9.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a4860353af2d6a05a264c26d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/27360e4fbb61103d9fa41f9f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3a6a91271ce2cefdc89034cd.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ad13cb8b49a49bdb80e248cd.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f5ce9f229e0b10ec2e70fcce.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a68b2ad5cb1776c921fc9d88.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3743aaf77b43f021c6860096.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/aa3f20fdbb56b9df3a93d85c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a98b28489463b209dcf562ce.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ec443d081fbe0c6d91e1be73.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/3d1209661986366a54de5aeb.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f61959dd5966b5e78e9a204f.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/df3ba6a72562a3ae923ad36a.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/2554187d7901f9a84976d03d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b6279a792f0ee195092546e4.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/a09bbcc8c246a0def84089f5.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c7260a88c962264039a9fa1d.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/636960b461e4542511ed98d0.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b6d2439b2538b853b7fc3ccd.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f92423914a76f206d3e52e49.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/ea33e1aa172f5d0e94562c03.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/72bfff19d48d225d5c86f81b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/cbada9f6d23615b37f7aabe8.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/5b58409bb78234455ce9b7c3.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/bc68dc6102447f2a7c9d5d3c.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/9318f530a4a0118dfb8d34da.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/0c3ff5ea509c44373c0c62db.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/b2bfced12cdca33f4af0a689.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c26aa7b98b36ef2c4a639348.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/70022385b8e749bbf7c048ae.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/64654aca9c221d8314321578.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/f3bfc1161456a3fb0b1a0d9b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/081b85b70410c7de4964e2fe.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/c0c08d10670d958be2822a6b.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/598401a0c450f354368ef343.css");
    style.textContent += window.__p0Modules.styleText("/@script-style/270b376a919b136b31e8b810.css");
    document.head.appendChild(style);
  }

  // checkout-payment-state-v67-20260909
  const checkoutSessions = new Map();
  const checkoutStorageKey = 'lexiang.checkout-sessions.v67';
  let checkoutRecords = {};
  try { checkoutRecords = JSON.parse(localStorage.getItem(checkoutStorageKey) || '{}'); } catch (_) {}
  const checkoutKey = product => String(product?._pendingOrderNo || product?._checkoutId || '');
  const readonlyActions = '[data-edit-order],[data-pay-now],[data-edit-config],[data-open-benefit],[data-open-coupon-code],[data-select-fulfillment-store],[data-claim-national-subsidy]';
  const rememberCheckout = (id, value) => {
    checkoutRecords[id] = value;
    try {
      const keys = Object.keys(checkoutRecords);
      for (const key of keys.slice(0, Math.max(0, keys.length - 60))) delete checkoutRecords[key];
      localStorage.setItem(checkoutStorageKey, JSON.stringify(checkoutRecords));
    } catch (_) {}
  };
  const restoreCheckout = (id, view) => {
    let session = checkoutSessions.get(String(id));
    if (!session) {
      const record = checkoutRecords[id];
      if (!record?.product) return false;
      window.__lxOpenUnifiedDiscountOrder(record.product, {mode: record.mode, storeId: record.storeId, skipSuggestion: true});
      session = checkoutSessions.get(String(id));
    }
    if (!session) return false;
    if (view === 'payment') session.openPayment(); else session.openOrder();
    return true;
  };
  const restoreCheckoutDetail = id => {
    const tab = checkoutRecords[id]?.detailTab;
    const state = window.__lxState;
    if (!tab || !state) return false;
    if (!window.__lxBridge?.activateTab) {
      if (!window.__lxCheckoutRestoreDetailTab) return false;
      window.__lxCheckoutRestoreDetailTab(tab); return true;
    }
    state.tabs ||= [];
    if (!state.tabs.some(item => item.id === tab.id)) state.tabs.push({...tab, __fresh:true});
    window.__lxBridge.prepareRootSplitState?.();
    window.__lxBridge.exitFullscreen?.();
    return window.__lxBridge.activateTab(tab.id);
  };
  window.__lxCheckoutStateV67 = { sessions: checkoutSessions, records: checkoutRecords, restore: restoreCheckout };
  const readonlyStyle = document.createElement('style');
  readonlyStyle.dataset.checkoutPaymentStateV67 = '';
  readonlyStyle.textContent = window.__p0Modules.styleText("/@script-style/75ff095e565a86d3becb8d66.css");
  document.head.appendChild(readonlyStyle);
  readonlyStyle.textContent += window.__p0Modules.styleText("/@script-style/b2cf3126f8a55320b9ba587b.css");
  window.addEventListener('click', event => {
    const detail = event.target.closest?.('.lx-checkout-detail-surface');
    const detailTab = detail && event.target.closest('[data-detail-tab]');
    if (detailTab) {
      detail.querySelectorAll('[data-detail-tab]').forEach(tab=>{const active=tab===detailTab;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});
      detail.querySelectorAll('[data-detail-pane]').forEach(pane=>pane.classList.toggle('is-active',pane.dataset.detailPane===detailTab.dataset.detailTab));
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    const target = event.target.closest?.('[data-checkout-order-id],[data-payment-chat-card],[data-checkout-view-order],[data-checkout-detail-back]');
    if (target) {
      const id = target.dataset.checkoutOrderId || target.dataset.paymentChatCard || target.dataset.checkoutViewOrder;
      let restored = false;
      if (target.hasAttribute('data-checkout-detail-back')) {
        window.__lxOpenOrdersCenter?.({question:''}); restored = true;
      } else if (target.hasAttribute('data-checkout-view-order')) restored = restoreCheckoutDetail(id);
      else restored = restoreCheckout(id, target.hasAttribute('data-payment-chat-card') ? 'payment' : 'order');
      if (restored) {event.preventDefault();event.stopImmediatePropagation();return;}
    }
    const modal = event.target.closest?.('[data-buy-modal-direct][data-checkout-locked="true"]');
    if (modal && event.target.closest?.(readonlyActions)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);

  const normalizeHistoricPaymentCards = (root = document) => {
    const cards = [...(root.matches?.('.lx-payment-chat-card') ? [root] : []), ...(root.querySelectorAll?.('.lx-payment-chat-card') || [])];
    cards.forEach((card) => {
      if (!card.hasAttribute('data-payment-chat-card')) return;
      card.classList.add('answer-cta', 'lx-answer-page', 'lx-auth-answer-card', 'lx-edu-auth-reco');
      const paid = checkoutRecords[card.dataset.paymentChatCard]?.payment?.paid || card.dataset.paymentStatus === 'paid';
      card.classList.toggle('is-paid', !!paid);
      card.querySelectorAll('.lx-payment-chat-card-state,.lx-payment-chat-card-desc').forEach((node) => node.remove());
      let title = card.querySelector('.lx-payment-chat-card-title');
      if (!title) {
        title = document.createElement('span');
        title.className = 'lx-payment-chat-card-title';
        card.prepend(title);
      }
      title.classList.add('answer-cta-title');
      const paymentTitle = paid ? '支付成功' : '支付信息待确认';
      if (title.textContent.trim() !== paymentTitle) title.textContent = paymentTitle;
      if (!title.closest('.answer-cta-copy')) {
        const copy = document.createElement('span');
        copy.className = 'answer-cta-copy';
        title.before(copy);
        copy.appendChild(title);
      }
      let icon = card.querySelector('.lx-payment-chat-card-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'lx-payment-chat-card-icon';
        icon.setAttribute('aria-hidden', 'true');
        card.appendChild(icon);
      }
      icon.classList.add('answer-cta-icon');
      if (!icon.querySelector('img,svg')) icon.innerHTML = window.__lxApprovedIcon('global-next');
    });
  };
  normalizeHistoricPaymentCards();
  const historicPaymentCardObserver = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) normalizeHistoricPaymentCards(node);
  })));
  if (document.documentElement) historicPaymentCardObserver.observe(document.documentElement, { childList: true, subtree: true });

  const visibleDetailProduct = button => window.__lxPurchaseContext.fromButton(button);

  const repairedImages = new WeakSet();
  const repairProductImages = (root = document) => {
    const images = [...(root.matches?.('img') ? [root] : []), ...(root.querySelectorAll?.('img') || [])];
    images.forEach((image) => {
      if (repairedImages.has(image)) return;
      repairedImages.add(image);
      const label = `${image.alt || ''} ${image.closest('.detail-main, .product-detail')?.textContent || ''}`;
      if (/小新\s*Air\s*13/i.test(label)) image.src = AIR_13_IMAGE;
      image.addEventListener('error', () => {
        if (image.src.endsWith(FALLBACK_IMAGE)) return;
        image.src = /小新\s*Air\s*13/i.test(label) ? AIR_13_IMAGE : FALLBACK_IMAGE;
      }, { once: true });
    });
  };

  const showToast = (message, duration = 2400) => {
    if (window.__lxToast) return window.__lxToast.show(message, { duration });
    let toast = document.querySelector('.lx-p0-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'lx-p0-toast';
      document.body.appendChild(toast);
    }
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  };

  const openOrderModal = (product) => {
    if (!product || !product.name || !(Number(product.price) > 0)) { showToast("商品数据不完整，请重新选择商品"); return; }
    const id = checkoutKey(product) || ('LX' + Date.now() + Math.random().toString(36).slice(2,6));
    product = {...product, _pendingOrderNo:id};
    const existing = checkoutSessions.get(id);
    if (existing) { existing.openOrder(); return existing.modal; }
    const saved = checkoutRecords[id];
    const previousModal = document.querySelector('[data-buy-modal-direct]');
    previousModal?._lxCleanup?.();
    previousModal?.remove();
    document.querySelectorAll('.lx-p0-toast').forEach((toast) => toast.classList.remove('show'));
    const modal = document.createElement('div');
    modal.dataset.buyModalDirect = 'true';
    const orderState = { payment: '支付宝', expanded: '', note: '请工作日送达，送货前电话联系', customerCode: 'CUS-BJ-20260803', addressId: 'address-1', recipientName: '联小想', recipientPhone: '13028280000', recipientRegion: '北京市海淀区中关村软件园2期', recipientDetail: '北京联想总部东区E1', invoice: '普通发票-个人', invoiceDraft: '增值税专票', invoiceTitle: '个人', invoiceTaxNo: '123123123123123', invoicePhone: '13504289879', invoiceEmail: 'ziyu@lenovo.com', invoiceAddress: '北京市海淀区上地西路6号', invoiceRegisteredPhone: '01058868888', invoiceBank: '招商银行北京双榆树支行', invoiceBankAccount: '861580122210002', invoiceRemark: '', invoiceDelayDate: '', invoiceConsent: true };
    const addressBook = [
      { id: 'address-1', name: '联小想', phone: '13028280000', region: '北京市海淀区中关村软件园2期', detail: '北京联想总部东区E1', isDefault: true },
      { id: 'address-2', name: '李晓宁', phone: '13810001234', region: '北京市海淀区西北旺镇', detail: '中关村软件园一期8号楼' },
      { id: 'address-3', name: '王晨', phone: '13610005678', region: '北京市朝阳区望京街道', detail: '阜通东大街6号院' },
      { id: 'address-4', name: '陈思远', phone: '13910008765', region: '上海市浦东新区张江镇', detail: '祖冲之路2290号' },
      { id: 'address-5', name: '赵敏', phone: '13710004321', region: '广东省深圳市南山区粤海街道', detail: '科技园南区高新南一道' }
    ];
    const selectedAddress = () => addressBook.find((address) => address.id === orderState.addressId) || addressBook[0];
    const applyAddress = (address) => {
      orderState.addressId = address.id;
      orderState.recipientName = address.name;
      orderState.recipientPhone = address.phone;
      orderState.recipientRegion = address.region;
      orderState.recipientDetail = address.detail;
    };
    const recipientAddress = () => `${orderState.recipientRegion}${orderState.recipientDetail}`;
    const configState = product.sku ? { color: product.color || '', size: product.size || '以商品详情为准', spec: product.configuration || '以所选商品详情为准', quantity: 1 } : { color: '凝雾灰', size: '13英寸', spec: '8GB+256GB WIFI', quantity: 1 };
    if (saved?.orderState) Object.assign(orderState, saved.orderState);
    if (saved?.configState) Object.assign(configState, saved.configState);
    const initialCouponAmount = Number(product.discount) || 0;
    const benefitState = { couponId: initialCouponAmount ? 'coupon-best' : 'coupon-none', couponAmount: initialCouponAmount, beanPoints: 0, beanAmount: 0, redPacketAmount: 0 };
    if (saved?.benefitState) Object.assign(benefitState, saved.benefitState);
    const payableAmount = () => Math.max(0, (Number(product.originalPrice) || 0) * configState.quantity - benefitState.couponAmount - benefitState.beanAmount - benefitState.redPacketAmount);
    const totalDiscount = () => benefitState.couponAmount + benefitState.beanAmount + benefitState.redPacketAmount;
    const invoicePreview = () => orderState.invoice === '普通发票-个人' ? '电子普通发票（个人）' : orderState.invoice === '普通发票-单位' ? '电子普通发票（单位）' : '增值税专用发票';
    const orderHtml = () => `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">联想乐享为你生成订单</h2><div class="lx-buy-direct-card"><div class="lx-order-product-card"><div class="lx-buy-direct-product"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><div class="lx-buy-direct-product-copy"><strong>${escapeHtml(product.name)}</strong><span>X${configState.quantity}</span></div><button class="lx-buy-direct-config" type="button" data-edit-config>修改配置<i aria-hidden="true"></i></button></div><div class="lx-buy-direct-section lx-buy-direct-product-spec"><div class="lx-buy-direct-row"><strong>系列：</strong><span>Lenovo</span></div><div class="lx-buy-direct-row"><strong>型号：</strong><span title="${escapeHtml(product.name)}">${escapeHtml(product.series || product.name)}</span></div><div class="lx-buy-direct-row"><strong>尺寸：</strong><span>${escapeHtml(configState.size)}</span></div><div class="lx-buy-direct-row"><strong>配置：</strong><span title="${escapeHtml(configState.spec)}">${escapeHtml(product.configurationLabel || configState.spec)}${configState.color ? " · " + escapeHtml(configState.color) : ""}</span></div></div></div><div class="lx-buy-direct-section lx-order-shipping"><div class="lx-buy-direct-row"><strong>收货信息：</strong><span>${escapeHtml(orderState.recipientName)}　${escapeHtml(orderState.recipientPhone)}</span></div><div class="lx-buy-direct-row"><strong>收货地址：</strong><span>${escapeHtml(recipientAddress())}</span></div></div><div class="lx-buy-direct-section lx-order-payment"><div class="lx-buy-direct-row"><strong>支付方式：</strong><span data-order-preview-payment>${escapeHtml(orderState.payment.includes('支付') || orderState.payment.includes('分期') ? orderState.payment : `${orderState.payment}支付`)}</span></div><div class="lx-buy-direct-row"><strong>发票信息：</strong><span data-order-preview-invoice>${escapeHtml(invoicePreview())}</span></div></div><div class="lx-order-summary"><div class="lx-buy-direct-price"><strong>等待支付：</strong><b>¥${payableAmount().toLocaleString('zh-CN')}</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}</em></span></div><div class="lx-buy-direct-detail"><button class="lx-buy-direct-detail-button" type="button" data-price-detail>查看价格明细</button><span>可修改优惠券/乐豆等优惠</span><button type="button" class="lx-benefit-info" data-benefit-info aria-label="优惠使用说明"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg></button></div></div><div class="lx-buy-direct-actions"><button type="button" data-edit-order>修改订单</button><button type="button" class="primary" data-pay-now>立即支付</button></div><p class="lx-buy-direct-footnote">*修改配置包括商品配置及数量；修改订单包括收货地址、支付方式、发票等</p></div>`;
    modal.innerHTML = `<div class="lx-buy-direct-mask"></div><section class="lx-buy-direct-dialog" role="dialog" aria-modal="true" aria-labelledby="lxBuyDirectTitle">${orderHtml()}</section>`;
    document.body.appendChild(modal);
    modal.querySelector('img')?.addEventListener('error', (event) => { event.currentTarget.src = FALLBACK_IMAGE; }, { once: true });
    const dialog = modal.querySelector('.lx-buy-direct-dialog');
    const mountNationalSubsidy = () => {
      const payment = dialog.querySelector('.lx-order-payment');
      if (!payment || dialog.querySelector('.lx-buy-national-subsidy')) return;
      const shipping = dialog.querySelector('.lx-order-shipping');
      if (shipping && !dialog.querySelector('.lx-order-bottom-card')) {
        const bottomCard = document.createElement('div');
        bottomCard.className = 'lx-order-bottom-card';
        shipping.before(bottomCard);
        bottomCard.append(shipping, payment);
      }
      payment.insertAdjacentHTML('afterend', '<button class="lx-buy-national-subsidy" type="button" data-claim-national-subsidy><span><strong>国家补贴资格可领取</strong><small>领取后将在结算时自动核验，价格以实际支付为准</small></span><b>立即领取</b></button>');
      const summary = dialog.querySelector('.lx-order-summary');
      const bottomCard = dialog.querySelector('.lx-order-bottom-card');
      if (summary && bottomCard) bottomCard.after(summary);
    };
    mountNationalSubsidy();

    const paymentState = { orderId: id, started:false, remaining: 23 * 60 * 60 + 59 * 60 + 51, timer: 0, width: 0, height: 0, paidOrder: null, paid: false, chatCard: null };
    if (saved?.payment) Object.assign(paymentState, saved.payment, {timer:0,chatCard:null});
    modal.dataset.checkoutOrder = id;
    const applyReadonly = () => {
      modal.dataset.checkoutLocked = String(!!paymentState.started);
      if (!paymentState.started) return;
      dialog.querySelectorAll(readonlyActions).forEach(control => {
        control.dataset.checkoutDisabled = 'true';
        control.style.setProperty('color','#a8a2ab','important');
        control.style.setProperty('border-color','#e4dfe7','important');
        if (control.tagName === 'BUTTON') control.style.setProperty('background','#f1eef3','important');
        control.setAttribute('aria-disabled','true');
        if ('disabled' in control) control.disabled = true;
        else control.setAttribute('tabindex','-1');
      });
      const hint = dialog.querySelector('.lx-buy-direct-detail > span');
      if (hint && hint.textContent !== '优惠信息仅可查看') hint.textContent = '优惠信息仅可查看';
    };
    const snapshot = () => {
      const fulfillment = modal._lxFulfillmentSession;
      const payment = {...paymentState, timer:0, chatCard:null};
      rememberCheckout(id, { ...checkoutRecords[id], product:{...product,_pendingOrderNo:id}, orderState:{...orderState},
        configState:{...configState}, benefitState:{...benefitState}, payment,
        mode:fulfillment?.mode || saved?.mode || 'delivery', storeId:fulfillment?.store?.id || saved?.storeId });
    };
    const ensureMounted = () => {
      const previous = document.querySelector('[data-buy-modal-direct]');
      if (previous && previous !== modal) {previous._lxCleanup?.();previous.remove();}
      if (!modal.isConnected) document.body.appendChild(modal);
      modal.hidden = false;
    };
    const readonlyObserver = new MutationObserver(applyReadonly);
    readonlyObserver.observe(dialog,{childList:true,subtree:true});
    applyReadonly();
    const stopPaymentTimer = () => { if (paymentState.timer) window.clearInterval(paymentState.timer); paymentState.timer = 0; };
    modal._lxCleanup = stopPaymentTimer;
    const formatRemaining = () => {
      const hours = Math.floor(paymentState.remaining / 3600);
      const minutes = Math.floor((paymentState.remaining % 3600) / 60);
      const seconds = paymentState.remaining % 60;
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
    };
    const lockPaymentDialogSize = () => {
      if (!paymentState.width || !paymentState.height) {
        const rect = dialog.getBoundingClientRect();
        paymentState.width = Math.round(rect.width);
        paymentState.height = Math.round(rect.height);
      }
      dialog.style.width = `${paymentState.width}px`;
      dialog.style.height = `${paymentState.height}px`;
    };
    const persistPaidOrder = () => {
      if (paymentState.paidOrder) return paymentState.paidOrder;
      const benefits = [];
      if (benefitState.couponAmount) benefits.push(`优惠券 -¥${benefitState.couponAmount.toLocaleString('zh-CN')}`);
      if (benefitState.beanAmount) benefits.push(`乐豆 -¥${benefitState.beanAmount.toLocaleString('zh-CN')}`);
      if (benefitState.redPacketAmount) benefits.push(`限时红包 -¥${benefitState.redPacketAmount.toLocaleString('zh-CN')}`);
      const paidOrder = {
        sku: product.sku || product.name,
        name: product.name,
        image_url: product.image_url,
        category: product.category || '联想商品',
        type: modal.dataset.fulfillmentMode === 'pickup' || modal.dataset.fulfillmentMode === 'flash' ? modal.dataset.fulfillmentMode : 'normal',
        typeLabel: modal.dataset.fulfillmentMode === 'pickup' ? '到店自提' : modal.dataset.fulfillmentMode === 'flash' ? '门店闪送' : '普通订单',
        fulfillmentMode:modal.dataset.fulfillmentMode || 'delivery',
        fulfillmentStore:modal._lxFulfillmentSession?.store,
        price: payableAmount(),
        paidAmount: payableAmount(),
        payable: payableAmount(),
        originalPrice: (Number(product.originalPrice) || 0) * configState.quantity,
        discountAmount: totalDiscount(),
        quantity: configState.quantity,
        configurationLabel: `${configState.size}｜${configState.spec}｜${configState.color}`,
        orderId: paymentState.orderId,
        createdAt: new Date().toLocaleString('zh-CN'),
        paidAt: new Date().toLocaleString('zh-CN'),
        status: modal.dataset.fulfillmentMode === 'pickup' ? '待取货' : '待发货',
        address: { name: orderState.recipientName, phone: orderState.recipientPhone, region: orderState.recipientRegion, detail: orderState.recipientDetail },
        recipient: { name: orderState.recipientName, phone: orderState.recipientPhone, address: recipientAddress() },
        shippingAddress: recipientAddress(),
        note: orderState.note,
        customerCode: orderState.customerCode,
        payMethod: orderState.payment,
        paymentMethod: orderState.payment,
        invoice: { text: invoicePreview(), type: orderState.invoice, title: orderState.invoiceTitle, remark: orderState.invoiceRemark, delayDate: orderState.invoice === '增值税专票' ? orderState.invoiceDelayDate : '' },
        invoiceText: invoicePreview(),
        benefitNote: benefits.join('、')
      };
      let orders = Array.isArray(window.__lxState?.orders) ? window.__lxState.orders : [];
      orders = orders.filter((item) => item?.orderId !== paidOrder.orderId);
      orders.unshift(paidOrder);
      if (window.__lxState) window.__lxState.orders = orders;
      try { localStorage.setItem('lexiang.orders.v1', JSON.stringify(orders)); } catch (error) {}
      window.dispatchEvent(new Event('lx:orders-updated'));
      paymentState.paidOrder = paidOrder;
      return paidOrder;
    };
    const showPaymentProcessing = ()=>window.__p0Modules.invoke("modals/payment-processing#showPaymentProcessing:b2ebe21b5c9104e17580fcd5",{get ["ensureMounted"](){return ensureMounted},get ["lockPaymentDialogSize"](){return lockPaymentDialogSize},get ["stopPaymentTimer"](){return stopPaymentTimer},get ["dialog"](){return dialog},get ["formatRemaining"](){return formatRemaining},get ["escapeHtml"](){return escapeHtml},get ["product"](){return product},get ["paymentState"](){return paymentState}},undefined,[]);
    const showPaymentSuccess = ()=>window.__p0Modules.invoke("modals/payment-success#showPaymentSuccess:b365b1bec5ea152180733470",{get ["stopPaymentTimer"](){return stopPaymentTimer},get ["persistPaidOrder"](){return persistPaidOrder},get ["paymentState"](){return paymentState},get ["snapshot"](){return snapshot},get ["updatePaymentChatCard"](){return updatePaymentChatCard},get ["ensureMounted"](){return ensureMounted},get ["lockPaymentDialogSize"](){return lockPaymentDialogSize},get ["dialog"](){return dialog},get ["escapeHtml"](){return escapeHtml},get ["payableAmount"](){return payableAmount}},undefined,[]);
    const updatePaymentChatCard = () => {
      document.querySelectorAll('[data-payment-chat-card]').forEach(card => {
        if (card.dataset.paymentChatCard !== id) return;
        card.dataset.paymentStatus = paymentState.paid ? 'paid' : 'pending';
        const title = card.querySelector('.lx-payment-chat-card-title');
        if (title) title.textContent = paymentState.paid ? '支付成功' : '支付信息待确认';
        card.setAttribute('aria-label', `查看${product.name}的支付信息`);
      });
      try {window.__lxSaveConversationNow?.();} catch (_) {}
    };
    const openPaymentFromChatCard = () => {
      ensureMounted();
      if (paymentState.paid) showPaymentSuccess();
      else showPaymentProcessing();
      dialog.querySelector('.lx-buy-direct-close')?.focus();
    };
    const appendPaymentChatCard = () => {
      if (paymentState.chatCard?.isConnected) return;
      const query = `立即支付【${product.name}】`;
      const splitHost = document.querySelector('.lx-p0-messages');
      const host = splitHost || document.querySelector('.lxfd-thread');
      if (!host) { showPaymentProcessing(); return; }
      const fullscreen = host.classList.contains('lxfd-thread');
      if (fullscreen) {
        const shell = host.closest('.lxfd');
        const stage = host.closest('.lxfd-stage');
        const welcome = stage?.querySelector('.lxfd-welcome');
        shell?.style.setProperty('display', 'block', 'important');
        shell?.style.setProperty('visibility', 'visible', 'important');
        welcome?.style.setProperty('display', 'none', 'important');
        host.classList.add('show');
        stage?.classList.add('is-chatting');
        document.body.classList.remove('lxfd-exiting', 'lxfd-split-returning');
        document.body.classList.add('assistant-fullscreen', 'lx-auto-fs');
        document.body.dataset.state = 'chat';
      }
      const userMessage = document.createElement('div');
      userMessage.className = fullscreen ? 'lxfd-msg-user' : 'lx-p0-message msg user';
      userMessage.dataset.lxPaymentQuery = paymentState.orderId;
      if (fullscreen) userMessage.textContent = query;
      else userMessage.innerHTML = `<div class="user-bubble">${escapeHtml(query)}</div>`;
      host.appendChild(userMessage);
      const answerMarkup = `<p>已为你打开【${escapeHtml(product.name)}】的支付页面，请完成支付。</p><button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-payment-chat-card" type="button" data-payment-chat-card="${escapeHtml(paymentState.orderId)}"><span class="answer-cta-copy"><span class="answer-cta-title lx-payment-chat-card-title">支付信息待确认</span></span><span class="answer-cta-icon lx-payment-chat-card-icon" aria-hidden="true"></span></button>`;
      let assistantMessage = splitHost ? window.__lxAgentAPI?.addAiMessage?.(answerMarkup) : null;
      if (!assistantMessage) {
        assistantMessage = document.createElement('div');
        assistantMessage.className = fullscreen ? 'lxfd-msg-ai lx-chat-skin' : 'lx-p0-message msg ai lx-chat-skin';
        assistantMessage.innerHTML = fullscreen ? `<div class="lxfd-ai-body">${answerMarkup}</div>` : `<div class="ai-body">${answerMarkup}</div>`;
        host.appendChild(assistantMessage);
      }
      paymentState.chatCard = assistantMessage.querySelector('[data-payment-chat-card]');
      paymentState.chatCard?.addEventListener('click', openPaymentFromChatCard);
      updatePaymentChatCard();
      if (window.__lxState) {
        window.__lxState.queryHistory = Array.isArray(window.__lxState.queryHistory) ? window.__lxState.queryHistory : [];
        window.__lxState.queryHistory.push(query);
      }
      window.__lxSetConversationQuery?.(query);
      host.scrollTop = host.scrollHeight;
      try { window.__lxSaveConversationNow?.(); } catch (_) {}
    };
    const openPaymentPage = () => {
      const paymentUrl = /支付宝|花呗/.test(orderState.payment) ? 'https://www.alipay.com/' : /微信/.test(orderState.payment) ? 'https://pay.weixin.qq.com/' : /京东/.test(orderState.payment) ? 'https://www.jdpay.com/' : 'https://www.alipay.com/';
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    };
    const openPaidOrderDetail = ()=>window.__p0Modules.invoke("pages/order-detail#openPaidOrderDetail:7b9b7452901e72aae87534b4",{get ["persistPaidOrder"](){return persistPaidOrder},get ["stopPaymentTimer"](){return stopPaymentTimer},get ["modal"](){return modal},get ["id"](){return id},get ["escapeHtml"](){return escapeHtml},get ["rememberCheckout"](){return rememberCheckout},get ["checkoutRecords"](){return checkoutRecords},get ["restoreCheckoutDetail"](){return restoreCheckoutDetail},get ["showToast"](){return showToast},get ["product"](){return product}},undefined,[]);
    const showOrder = () => { ensureMounted(); stopPaymentTimer(); dialog.className = 'lx-buy-direct-dialog'; delete dialog.dataset.pickupSuccess; dialog.innerHTML = orderHtml(); mountNationalSubsidy(); applyReadonly(); };
    const showConfigEdit = () => {
      if (product.sku) return window.__lxPurchaseContext.renderConfig({dialog, product, quantity: configState.quantity, onSelect: selected => {
        product = selected; configState.color = selected.color; configState.size = selected.size; configState.spec = selected.configuration;
        benefitState.couponId = "coupon-none"; benefitState.couponAmount = 0; benefitState.beanPoints = 0; benefitState.beanAmount = 0; benefitState.redPacketAmount = 0;
        showConfigEdit();
      }});
      const options = (name, values, disabled = []) => values.map((value) => `<button class="lx-config-option${configState[name] === value ? ' is-active' : ''}" type="button" data-config-key="${name}" data-config-value="${value}" ${disabled.includes(value) ? 'disabled' : ''}>${value}</button>`).join('');
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-config-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-config-section"><h3>颜色</h3><div class="lx-config-options">${options('color',['凝雾灰','深空灰','星空银'])}</div></section><section class="lx-config-section"><h3>尺寸</h3><div class="lx-config-options">${options('size',['11英寸','13英寸','14英寸'],['11英寸'])}</div></section><section class="lx-config-section"><h3>配置</h3><div class="lx-config-options">${options('spec',['8GB+128GB WIFI','8GB+256GB WIFI','16GB+512GB WIFI'],['8GB+128GB WIFI'])}</div></section><div class="lx-config-quantity"><div class="lx-config-quantity-copy"><h3>商品数量</h3><small>最多购买5件</small></div><div class="lx-config-stepper"><button type="button" data-config-minus ${configState.quantity <= 1 ? 'disabled' : ''}>−</button><output data-config-count>${configState.quantity}</output><button type="button" data-config-plus ${configState.quantity >= 5 ? 'disabled' : ''}>＋</button></div></div></div><footer class="lx-order-edit-footer"><button type="button" data-config-save>保存修改</button></footer>`;
      dialog.querySelector('[data-config-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showPriceDetail = () => {
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-price-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>价格明细</h2></header><div class="lx-buy-price-list"><div class="lx-buy-price-line"><strong>商品金额</strong><span class="amount">¥${((Number(product.originalPrice) || 0) * configState.quantity).toLocaleString('zh-CN')}.00</span><span></span></div><div class="lx-buy-price-line"><strong>运费</strong><span class="amount">＋¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="coupon"><strong>优惠券</strong><span class="discount">−¥${benefitState.couponAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="beans"><strong>乐豆</strong><span class="discount">−¥${benefitState.beanAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="redpacket"><strong>限时红包</strong><span class="discount">−¥${benefitState.redPacketAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line"><strong>其他优惠</strong><span class="discount">−¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-coupon-code><strong>优惠码</strong><span class="muted">请输入优惠码</span><span class="arrow">›</span></div></div><div class="lx-buy-sub-footer"><div class="lx-buy-sub-total"><b>¥${payableAmount().toLocaleString('zh-CN')}.00</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}.00</em></span></div><button class="primary" type="button" data-price-confirm>确定</button></div>`;
      dialog.querySelector('[data-price-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showCouponCode = () => {
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2>使用优惠码</h2><div class="lx-buy-coupon-field"><label for="lxCouponCode">优惠码</label><input id="lxCouponCode" type="text" placeholder="请输入优惠码" autocomplete="off"><small>输入优惠码后确认领取，系统会自动更新优惠和待支付金额。</small></div><div class="lx-buy-coupon-actions"><button type="button" data-coupon-back>返回</button><button type="button" class="primary" data-coupon-confirm>确认使用</button></div>`;
      dialog.querySelector('[data-coupon-back]').addEventListener('click', (event) => { event.stopPropagation(); showPriceDetail(); });
      dialog.querySelector('input')?.focus();
    };
    const showCouponSelect = () => {
      const coupons = [
        { id: 'coupon-best', value: initialCouponAmount || 500, label: `¥${initialCouponAmount || 500}`, rule: '当前商品专享券', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-300', value: 300, label: '¥300', rule: '满6000元可用', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-100', value: 100, label: '¥100', rule: '满3000元可用', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-none', value: 0, label: '不使用', rule: '暂不使用优惠券', date: '可随时重新选择' }
      ];
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog lx-buy-benefit-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>优惠券</h2></header><div class="lx-buy-benefit-list">${coupons.map((coupon) => `<button class="lx-buy-coupon-card${benefitState.couponId === coupon.id ? ' is-selected' : ''}" type="button" data-coupon-choice="${coupon.id}" data-coupon-value="${coupon.value}"><span class="lx-buy-coupon-value">${coupon.label.startsWith('¥') ? `¥<b>${coupon.label.slice(1)}</b>` : `<small>${coupon.label}</small>`}</span><span class="lx-buy-coupon-copy"><strong>${coupon.rule}</strong><span>${coupon.date}</span><span>详细说明</span></span><i class="lx-buy-benefit-radio" aria-hidden="true"></i></button>`).join('')}</div><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-benefit-confirm>确认</button></div>`;
    };
    const showWalletBenefit = (type) => {
      const isBeans = type === 'beans';
      const title = isBeans ? '乐豆' : '限时红包';
      const value = isBeans ? benefitState.beanPoints : benefitState.redPacketAmount;
      const discount = isBeans ? benefitState.beanAmount : benefitState.redPacketAmount;
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog lx-buy-benefit-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>${title}</h2></header><div class="lx-buy-wallet-box"><input type="text" inputmode="${isBeans ? 'numeric' : 'decimal'}" value="${value}" data-wallet-input="${type}" aria-label="${title}使用数量"><span data-wallet-discount>已抵 ${discount} 元</span></div><p class="lx-buy-wallet-hint">共 <em>${isBeans ? '5600' : '50'}</em> ${isBeans ? '乐豆' : '元限时红包'}，此单最高可用 <em>${isBeans ? '5600 乐豆，抵 56' : '50'}</em> 元</p><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-wallet-confirm="${type}">确定</button></div>`;
      dialog.querySelector('[data-wallet-input]')?.focus();
    };
    const quickPaymentNames = ['支付宝', '花呗', '微信支付', '京东支付'];
    let lastOnlinePayment = orderState.payment === '对公支付' ? '支付宝' : orderState.payment;
    const updatePaymentFooter = () => {
      const selected = dialog.querySelector('[data-order-selected-payment]');
      if (!selected) return;
      const corporate = orderState.payment === '对公支付';
      selected.classList.toggle('is-corporate', corporate);
      selected.setAttribute('aria-live', 'polite');
      const paymentName = String(orderState.payment).split(' · ')[0];
      selected.innerHTML = corporate
        ? ''
        : [...quickPaymentNames, '花呗分期', '信用卡分期'].includes(paymentName) ? `<span>支付方式：</span><strong>${escapeHtml(paymentName)}</strong>` : '';
    };
    const showOrderEdit = ()=>window.__p0Modules.invoke("modals/order-edit#showOrderEdit:4d904b97979dfc3cf8f6b662",{get ["dialog"](){return dialog},get ["orderState"](){return orderState},get ["escapeHtml"](){return escapeHtml},get ["recipientAddress"](){return recipientAddress},get ["invoicePreview"](){return invoicePreview},get ["payableAmount"](){return payableAmount},get ["updatePaymentFooter"](){return updatePaymentFooter},get ["showOrder"](){return showOrder}},undefined,[]);
    const showAddressManager = (tab = 'select', editId = '') => {
      const isCreate = tab === 'create';
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-address-dialog';
      const tabs = `<div class="lx-address-tabs" role="tablist" aria-label="地址管理"><button class="${isCreate ? '' : 'is-active'}" type="button" role="tab" aria-selected="${!isCreate}" data-address-tab="select">选择地址</button><button class="${isCreate ? 'is-active' : ''}" type="button" role="tab" aria-selected="${isCreate}" data-address-tab="create">新建地址</button></div>`;
      if (isCreate) {
        const editing = addressBook.find((address) => address.id === editId);
        dialog.innerHTML = `<header class="lx-order-edit-head lx-address-head"><button class="lx-order-edit-back" type="button" data-address-back aria-label="返回修改订单"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button>${tabs}<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-address-create-body"><form class="lx-address-form" data-address-form data-address-editing="${escapeHtml(editing?.id || '')}"><label for="lxAddressName">姓名：</label><input id="lxAddressName" name="name" value="${escapeHtml(editing?.name || '')}" placeholder="请输入姓名" autocomplete="name"><label for="lxAddressPhone">手机：</label><input id="lxAddressPhone" name="phone" value="${escapeHtml(editing?.phone || '')}" placeholder="请输入手机号" inputmode="tel" autocomplete="tel"><label for="lxAddressRegion">省市：</label><select id="lxAddressRegion" name="region"><option value="">请选择省/市/区/街道</option><option value="北京市海淀区中关村街道"${editing?.region === '北京市海淀区中关村街道' ? ' selected' : ''}>北京市 / 海淀区 / 中关村街道</option><option value="北京市海淀区中关村软件园2期"${editing?.region === '北京市海淀区中关村软件园2期' ? ' selected' : ''}>北京市 / 海淀区 / 中关村软件园2期</option><option value="上海市浦东新区张江镇"${editing?.region === '上海市浦东新区张江镇' ? ' selected' : ''}>上海市 / 浦东新区 / 张江镇</option><option value="广东省深圳市南山区粤海街道"${editing?.region === '广东省深圳市南山区粤海街道' ? ' selected' : ''}>广东省 / 深圳市 / 南山区 / 粤海街道</option></select><label for="lxAddressDetail">地址：</label><textarea id="lxAddressDetail" name="detail" placeholder="请输入详细地址">${escapeHtml(editing?.detail || '')}</textarea><label class="lx-address-default"><input type="checkbox" name="isDefault" ${editing?.isDefault ? 'checked' : ''}><span>设为默认地址</span></label></form></div><footer class="lx-order-edit-footer lx-address-footer"><button type="button" data-address-save>保存</button></footer>`;
        dialog.querySelector('#lxAddressName')?.focus();
        return;
      }
      const cards = addressBook.map((address) => `<article class="lx-address-card${orderState.addressId === address.id ? ' is-selected' : ''}" data-address-card="${address.id}"><button class="lx-address-card-main" type="button" data-address-select="${address.id}"><strong>${address.isDefault ? '<em>默认</em>' : ''}<span>${escapeHtml(address.name)}</span><span>${escapeHtml(address.phone)}</span></strong><small>${escapeHtml(address.region + address.detail)}</small></button><button class="lx-address-card-edit" type="button" data-address-card-edit="${address.id}" aria-label="编辑${escapeHtml(address.name)}的地址">✎</button></article>`).join('');
      dialog.innerHTML = `<header class="lx-order-edit-head lx-address-head"><button class="lx-order-edit-back" type="button" data-address-back aria-label="返回修改订单"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button>${tabs}<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-address-select-body"><div class="lx-address-grid">${cards}</div></div><footer class="lx-order-edit-footer lx-address-footer"><button type="button" data-address-confirm>确定</button></footer>`;
    };
    const invoiceDateValue = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const invoiceDelayLimits = () => {
      const minimum = new Date();
      minimum.setHours(12, 0, 0, 0);
      minimum.setDate(minimum.getDate() + 1);
      const maximum = new Date(minimum);
      maximum.setFullYear(maximum.getFullYear() + 1);
      return { minimum: invoiceDateValue(minimum), maximum: invoiceDateValue(maximum) };
    };
    const formatInvoiceDelayDate = (value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
      return match ? `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日` : '请选择开票日期';
    };
    const syncInvoiceDraft = ()=>window.__p0Modules.invoke("modals/invoice-edit#syncInvoiceDraft:7f5cd6fcf0614644cddfef81",{get ["dialog"](){return dialog},get ["orderState"](){return orderState}},undefined,[]);
    const closeInvoiceDelayPicker = () => modal.querySelector('[data-invoice-delay-layer]')?.remove();
    const showInvoiceDelayPicker = ()=>window.__p0Modules.invoke("modals/invoice-edit#showInvoiceDelayPicker:21d3cb57b4bbd6f9219c1e5b",{get ["syncInvoiceDraft"](){return syncInvoiceDraft},get ["closeInvoiceDelayPicker"](){return closeInvoiceDelayPicker},get ["invoiceDelayLimits"](){return invoiceDelayLimits},get ["orderState"](){return orderState},get ["modal"](){return modal}},undefined,[]);
    const showInvoiceNotice = ()=>window.__p0Modules.invoke("modals/invoice-edit#showInvoiceNotice:2880dd7e6c4227931323ebdf",{get ["syncInvoiceDraft"](){return syncInvoiceDraft},get ["dialog"](){return dialog}},undefined,[]);
    const showInvoiceEdit = ()=>window.__p0Modules.invoke("modals/invoice-edit#showInvoiceEdit:b60254d8536d8fcebb300598",{get ["orderState"](){return orderState},get ["escapeHtml"](){return escapeHtml},get ["formatInvoiceDelayDate"](){return formatInvoiceDelayDate},get ["dialog"](){return dialog},get ["showOrderEdit"](){return showOrderEdit}},undefined,[]);
    modal.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target.closest('[data-address-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrderEdit();
      } else if (target.closest('[data-order-back],[data-config-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrder();
      } else if (target.closest('[data-price-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrder();
      } else if (target.closest('[data-invoice-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrderEdit();
      } else if (target.closest('[data-coupon-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showPriceDetail();
      } else if (target.closest('[data-benefit-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showPriceDetail();
      }
    }, true);
    modal.addEventListener('click', (event) => {
      const target = event.target;
      const openCodeMenu = dialog.querySelector('[data-order-code-menu]:not([hidden])');
      if (openCodeMenu && !target.closest('.lx-order-combobox')) { openCodeMenu.hidden = true; dialog.querySelector('[data-order-customer]')?.setAttribute('aria-expanded','false'); }
      if (target.closest('[data-invoice-notice-close],[data-invoice-notice-back]')) return showInvoiceEdit();
      if (target.closest('.lx-buy-direct-close')) { stopPaymentTimer(); if (paymentState.chatCard) { modal.hidden = true; return; } return modal.remove(); }
      if (target.closest('.lx-buy-direct-mask')) return;
      if (target.closest('[data-pay-now]')) { if (paymentState.started) return; paymentState.started=true; snapshot(); applyReadonly(); openPaymentPage(); appendPaymentChatCard(); showPaymentProcessing(); return; }
      if (target.closest('[data-go-pay]')) return openPaymentPage();
      if (target.closest('[data-confirm-payment]')) return showPaymentSuccess();
      if (target.closest('[data-view-paid-order]')) return openPaidOrderDetail();
      if (target.closest('[data-price-detail]')) return showPriceDetail();
      if (target.closest('[data-benefit-info]')) return showToast('预订单支付前，优惠仍可用于其他商品;支付发票成功将锁定至本单，取消订单后自动释放', 6000);
      if (target.closest('[data-open-coupon-code]')) return showCouponCode();
      const benefitButton = target.closest('[data-open-benefit]');
      if (benefitButton) return benefitButton.dataset.openBenefit === 'coupon' ? showCouponSelect() : showWalletBenefit(benefitButton.dataset.openBenefit);
      if (target.closest('[data-coupon-back]')) return showPriceDetail();
      if (target.closest('[data-benefit-back]')) return showPriceDetail();
      if (target.closest('[data-price-confirm]')) return showOrder();
      if (target.closest('[data-edit-config]')) return showConfigEdit();
      if (target.closest('[data-config-back]')) return showOrder();
      const configOption = target.closest('[data-config-key]');
      if (configOption) { configState[configOption.dataset.configKey] = configOption.dataset.configValue; return showConfigEdit(); }
      if (target.closest('[data-config-minus]')) { configState.quantity = Math.max(1, configState.quantity - 1); return showConfigEdit(); }
      if (target.closest('[data-config-plus]')) { configState.quantity = Math.min(5, configState.quantity + 1); return showConfigEdit(); }
      if (target.closest('[data-config-save]')) return showOrder();
      if (target.closest('[data-edit-order]')) { orderState.expanded = ''; return showOrderEdit(); }
      if (target.closest('[data-order-back]')) return showOrder();
      if (target.closest('[data-order-invoice]')) return showInvoiceEdit();
      if (target.closest('[data-invoice-notice-open]')) return showInvoiceNotice();
      if (target.closest('[data-invoice-back]')) return showOrderEdit();
      const invoiceOption = target.closest('[data-invoice-option]');
      if (invoiceOption) { syncInvoiceDraft(); orderState.invoiceDraft = invoiceOption.dataset.invoiceOption; return showInvoiceEdit(); }
      if (target.closest('[data-invoice-delay-open]')) return showInvoiceDelayPicker();
      const delayLayer = target.closest('[data-invoice-delay-layer]');
      if (delayLayer && target === delayLayer) { closeInvoiceDelayPicker(); return; }
      if (target.closest('[data-invoice-delay-cancel]')) { closeInvoiceDelayPicker(); return; }
      if (target.closest('[data-invoice-delay-clear]')) { orderState.invoiceDelayDate = ''; closeInvoiceDelayPicker(); showInvoiceEdit(); return; }
      if (target.closest('[data-invoice-delay-confirm]')) {
        const delayInput = modal.querySelector('[data-invoice-delay-input]');
        if (!delayInput?.value) { delayInput?.focus(); return; }
        orderState.invoiceDelayDate = delayInput.value;
        closeInvoiceDelayPicker();
        showInvoiceEdit();
        showToast('延时开票日期已选择');
        return;
      }
      if (target.closest('[data-invoice-save]')) {
        syncInvoiceDraft(); orderState.invoice = orderState.invoiceDraft;
        return showOrderEdit();
      }
      const couponChoice = target.closest('[data-coupon-choice]');
      if (couponChoice) {
        benefitState.couponId = couponChoice.dataset.couponChoice;
        benefitState.couponAmount = Number(couponChoice.dataset.couponValue) || 0;
        dialog.querySelectorAll('[data-coupon-choice]').forEach((button) => button.classList.toggle('is-selected', button === couponChoice));
        return;
      }
      if (target.closest('[data-benefit-confirm]')) return showPriceDetail();
      const walletConfirm = target.closest('[data-wallet-confirm]');
      if (walletConfirm) {
        const type = walletConfirm.dataset.walletConfirm;
        const raw = Math.max(0, Number(dialog.querySelector('[data-wallet-input]')?.value) || 0);
        if (type === 'beans') {
          benefitState.beanPoints = Math.min(5600, Math.round(raw));
          benefitState.beanAmount = Math.min(56, Math.floor(benefitState.beanPoints / 100));
        } else {
          benefitState.redPacketAmount = Math.min(50, Math.round(raw * 100) / 100);
        }
        return showPriceDetail();
      }
      const provider = target.closest('[data-order-provider]');
      if (provider) {
        const shouldExpand = orderState.expanded !== provider.dataset.orderProvider;
        dialog.querySelectorAll('[data-order-provider]').forEach((button) => {
          button.classList.remove('is-expanded');
          button.nextElementSibling.hidden = true;
        });
        orderState.expanded = shouldExpand ? provider.dataset.orderProvider : '';
        if (shouldExpand) {
          provider.classList.add('is-expanded');
          provider.nextElementSibling.hidden = false;
          const providerName = provider.dataset.orderProvider === 'huabei' ? '花呗分期' : '信用卡分期';
          if (!String(orderState.payment).startsWith(providerName)) orderState.payment = providerName;
          lastOnlinePayment = orderState.payment;
          dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button.dataset.orderPayment === orderState.payment));
          updatePaymentFooter();
        }
        return;
      }
      const payment = target.closest('[data-order-payment]');
      if (payment) {
        orderState.payment = payment.dataset.orderPayment;
        lastOnlinePayment = orderState.payment;
        dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button === payment));
        const selectedPayment = dialog.querySelector('[data-order-selected-payment]');
        updatePaymentFooter();
        return;
      }
      const channel = target.closest('[data-order-channel]');
      if (channel) {
        dialog.querySelectorAll('[data-order-channel]').forEach((button) => button.classList.toggle('is-active', button === channel));
        const online = dialog.querySelector('[data-online-payment]');
        const corporate = dialog.querySelector('[data-corporate-payment]');
        online.hidden = channel.dataset.orderChannel === 'corporate';
        corporate.hidden = !online.hidden;
        dialog.querySelectorAll('[data-order-channel]').forEach((button) => button.setAttribute('aria-selected', String(button === channel)));
        if (online.hidden) {
          if (orderState.payment !== '对公支付') lastOnlinePayment = orderState.payment;
          orderState.payment = '对公支付';
        } else {
          orderState.payment = lastOnlinePayment;
          dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button.dataset.orderPayment === orderState.payment));
        }
        const selectedPayment = dialog.querySelector('[data-order-selected-payment]');
        updatePaymentFooter();
        return;
      }
      const customerInput = target.closest('[data-order-customer]');
      if (customerInput) { const menu = dialog.querySelector('[data-order-code-menu]'); menu.hidden = !menu.hidden; customerInput.setAttribute('aria-expanded', String(!menu.hidden)); return; }
      if (target.closest('[data-claim-national-subsidy]')) { showToast('国补资格将在结算时核验，价格以实际支付为准'); return; }
      if (target.closest('[data-address-back]')) return showOrderEdit();
      if (target.closest('[data-address-edit]')) return showAddressManager('select');
      const addressTab = target.closest('[data-address-tab]');
      if (addressTab) return showAddressManager(addressTab.dataset.addressTab);
      const addressCardEdit = target.closest('[data-address-card-edit]');
      if (addressCardEdit) return showAddressManager('create', addressCardEdit.dataset.addressCardEdit);
      const addressChoice = target.closest('[data-address-select]');
      if (addressChoice) {
        orderState.addressId = addressChoice.dataset.addressSelect;
        dialog.querySelectorAll('[data-address-card]').forEach((card) => card.classList.toggle('is-selected', card.dataset.addressCard === orderState.addressId));
        return;
      }
      if (target.closest('[data-address-confirm]')) {
        applyAddress(selectedAddress());
        showOrderEdit();
        showToast('收货地址已更新');
        return;
      }
      if (target.closest('[data-address-save]')) {
        const form = dialog.querySelector('[data-address-form]');
        const name = form?.elements.name?.value.trim() || '';
        const phone = form?.elements.phone?.value.trim() || '';
        const region = form?.elements.region?.value.trim() || '';
        const detail = form?.elements.detail?.value.trim() || '';
        if (!name) return form?.elements.name?.focus();
        if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号'); return form?.elements.phone?.focus(); }
        if (!region) return form?.elements.region?.focus();
        if (!detail) return form?.elements.detail?.focus();
        const editingId = form.dataset.addressEditing;
        let saved = addressBook.find((address) => address.id === editingId);
        if (!saved) { saved = { id: `address-${Date.now()}` }; addressBook.push(saved); }
        if (form.elements.isDefault.checked) addressBook.forEach((address) => { address.isDefault = false; });
        Object.assign(saved, { name, phone, region, detail, isDefault: form.elements.isDefault.checked });
        orderState.addressId = saved.id;
        applyAddress(saved);
        showAddressManager('select');
        showToast(editingId ? '地址已保存' : '新地址已保存');
        return;
      }
      const code = target.closest('[data-order-code]');
      if (code) { orderState.customerCode = code.dataset.orderCode; const input = dialog.querySelector('[data-order-customer]'); input.value = orderState.customerCode; input.setAttribute('aria-expanded','false'); dialog.querySelector('[data-order-code-menu]').hidden = true; return; }
      if (target.closest('[data-order-save]')) {
        orderState.note = dialog.querySelector('[data-order-note]')?.value.trim() || '';
        orderState.customerCode = dialog.querySelector('[data-order-customer]')?.value.trim() || '';
        showOrder();
        dialog.querySelector('[data-order-preview-payment]').textContent = orderState.payment.includes('支付') || orderState.payment.includes('分期') ? orderState.payment : `${orderState.payment}支付`;
        return;
      }
      if (target.closest('[data-coupon-confirm]')) {
        const code = dialog.querySelector('#lxCouponCode')?.value.trim();
        if (!code) return dialog.querySelector('#lxCouponCode')?.focus();
        showPriceDetail();
      }
    });
    checkoutSessions.set(id, {modal, openOrder:showOrder, openPayment:openPaymentFromChatCard});
    const pending = window.__lxState?.pendingOrderProduct;
    const pendingCards = Array.from(document.querySelectorAll('[data-lx-result-id="modal:pending-payment"]'));
    const pendingCard = pendingCards.filter(card => !card.dataset.checkoutOrderId).pop();
    if (pendingCard && String(pending?._pendingOrderNo || '') === id) pendingCard.dataset.checkoutOrderId=id;
    snapshot();
    modal.querySelector('.primary')?.focus();
    return modal;
  };

  window.__lxOpenUnifiedDiscountOrder = product => {
    try { return openOrderModal({...window.__lxPurchaseContext.normalize(product), _pendingOrderNo:product._pendingOrderNo || product._checkoutId, originalPrice: Number(product.originalPrice || product.original_price || product.price), discount: Math.max(0, Number(product.discount) || 0)}); } catch (error) { showToast(error.message); }
  };

  const removeRepeatedOfflineErrors = () => {
    document.querySelectorAll('.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai').forEach((message) => {
      if (/当前 AI 服务暂时不可用/.test(message.textContent || '')) message.remove();
    });
  };

  let purchaseRequest = 0; const purchaseButtons = new WeakMap();
  window.addEventListener('click', async (event) => {
    const button = event.target.closest?.('button, a[role="button"]');
    const label = String(button?.textContent || '').replace(/\s+/g, '').trim();
    const isUnifiedBuy = button && !button.closest('[data-buy-modal-direct]') && !button.dataset.bizQuote && (/^(?:一键领取?优惠下单|一键领优惠下单|立即购买|立即下单|去购买|去下单|去结算|结算|提交订单)$/.test(label) || button.matches('[data-buy-now],[data-action="buy"],[data-order-action="buy"]'));
    if (!isUnifiedBuy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const request = ++purchaseRequest; purchaseButtons.set(button, request);
    button.setAttribute("aria-busy", "true");
    try { const product = await visibleDetailProduct(button); if (request === purchaseRequest && button.isConnected && window.__lxPurchaseContext.targetSku(button, window.__lxState) === product.sku) {
      const state=window.__lxState;
      if (!state || !window.__lxBridge?.sendChat) throw new Error('下单服务尚未就绪，请重试');
      if (state.sending || state._buyFlowRunning) return;
      state._pendingDiscountOrderProduct=product;
      state._unifiedOrderSourceProduct=product;
      await window.__lxBridge.sendChat(`我要购买${product.name}，请帮我自动领取所有可用优惠并生成待支付订单`);
    } }
    catch (error) { if (request === purchaseRequest) showToast(error.message || "商品读取失败，请重试"); }
    finally { if (purchaseButtons.get(button) === request) { button.removeAttribute("aria-busy"); purchaseButtons.delete(button); } }
  }, true);

  repairProductImages();
  removeRepeatedOfflineErrors();
  // Batch added subtrees once per frame. Never rescan the entire chat per node.
  const pendingRoots = new Set(); let repairFrame = 0;
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) pendingRoots.add(node);
    if (!pendingRoots.size || repairFrame) return;
    repairFrame = requestAnimationFrame(() => {
      repairFrame = 0; const roots = [...pendingRoots]; pendingRoots.clear();
      for (const node of roots) {
        if (!node.isConnected || roots.some(parent => parent !== node && parent.contains(node))) continue;
        repairProductImages(node);
        const selector = '.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai';
        const messages = [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)];
        for (const message of messages) if (/当前 AI 服务暂时不可用/.test(message.textContent || '')) message.remove();
      }
    });
  }).observe(document.body, { childList: true, subtree: true });

  const previewMode = new URLSearchParams(location.search).get('showOrder');
  if (previewMode) {
    const showPreview = () => {
      openOrderModal({ name: '联想小新 Air 13', originalPrice: 7299, discount: 400, price: 6899, image_url: AIR_13_IMAGE });
      if (previewMode === 'price' || previewMode === 'coupon') document.querySelector('[data-price-detail]')?.click();
      if (previewMode === 'coupon') document.querySelector('[data-open-benefit="coupon"]')?.click();
      if (previewMode === 'beans') { document.querySelector('[data-price-detail]')?.click(); document.querySelector('[data-open-benefit="beans"]')?.click(); }
      if (previewMode === 'redpacket') { document.querySelector('[data-price-detail]')?.click(); document.querySelector('[data-open-benefit="redpacket"]')?.click(); }
      if (previewMode === 'edit' || previewMode === 'address' || previewMode === 'address-new') document.querySelector('[data-edit-order]')?.click();
      if (previewMode === 'address' || previewMode === 'address-new') document.querySelector('[data-address-edit]')?.click();
      if (previewMode === 'address-new') document.querySelector('[data-address-tab="create"]')?.click();
      if (previewMode === 'invoice') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); }
      if (previewMode === 'invoice-unit') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="普通发票-单位"]')?.click(); }
      if (previewMode === 'invoice-vat') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="增值税专票"]')?.click(); }
      if (previewMode === 'invoice-notice') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-notice-open]')?.click(); }
      if (previewMode === 'config') document.querySelector('[data-edit-config]')?.click();
      if (previewMode === 'payment') document.querySelector('[data-pay-now]')?.click();
      if (previewMode === 'success') { document.querySelector('[data-pay-now]')?.click(); document.querySelector('[data-confirm-payment]')?.click(); }
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', showPreview, { once: true }) : showPreview();
  }
})();

/* v60-fulfillment-subsidy-checkout-20260904 */
(function () {
  'use strict';
  var originalOpen = window.__lxOpenUnifiedDiscountOrder;
  if (typeof originalOpen !== 'function' || window.__lxFulfillmentCheckoutV60) return;

  var stores = [
    { id: 'xibeiwang', name: '联想官方体验店（西北旺万象汇店）', address: '北京市海淀区马连洼街道德政路16号院万象汇A区 F4 405', hours: '9:30-21:00', phone: '13426251637', distance: '200m' },
    { id: 'zhongguancun', name: '联想来酷智生活（中关村店）', address: '北京市海淀区中关村大街19号新中关购物中心 B1', hours: '10:00-21:30', phone: '010 6602 6688', distance: '2.6km' },
    { id: 'wukesong', name: '联想官方体验店（五棵松华熙店）', address: '北京市海淀区复兴路69号华熙LIVE南区 1F', hours: '10:00-22:00', phone: '010 5971 6888', distance: '4.1km' }
  ];
  var orderAddress = '北京市海淀区中关村软件园2期北京联想总部东区E1';
  var sessions = new WeakMap();

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function shopIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.2-5H5.2L4 9Zm1 0v10h14V9M8 19v-6h8v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3.5 9c0 1.4 1.1 2.5 2.5 2.5S8.5 10.4 8.5 9c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  }
  function locationIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9" r="2.4" fill="currentColor"/></svg>';
  }
  function qrMarkup() {
    return '<div class="lx-demo-qr" aria-label="模拟二维码"><svg viewBox="0 0 84 84" role="img"><rect width="84" height="84" fill="#fff"/><g fill="#000"><path d="M3 3h24v24H3zm4 4v16h16V7zm4 4h8v8h-8zM57 3h24v24H57zm4 4v16h16V7zm4 4h8v8h-8zM3 57h24v24H3zm4 4v16h16V61zm4 4h8v8h-8z" fill-rule="evenodd"/><path d="M33 4h6v6h-6zm9 0h5v12h-5zm-9 15h6v6h-6zm11 2h7v7h-7zm-13 10h7v6h-7zm11 0h6v6h-6zm10 0h8v6h-8zm12 0h6v8h-6zm10 0h7v6h-7zM30 41h7v7h-7zm11-2h6v13h-6zm10 2h6v6h-6zm10 0h13v6H61zm-28 15h7v6h-7zm10 0h6v13h-6zm10-5h7v7h-7zm11 0h6v13h-6zm10-1h7v7h-7zM31 67h7v7h-7zm11 5h8v8h-8zm11-10h6v18h-6zm10 5h7v6h-7zm11-6h7v19h-7z"/></g></svg></div>';
  }

  if (!document.querySelector('[data-fulfillment-checkout-v60-style]')) {
    var style = document.createElement('style');
    style.dataset.fulfillmentCheckoutV60Style = 'true';
    style.textContent = window.__p0Modules.styleText("/@script-style/0346549ba993d1d4e1b2929e.css");
    document.head.appendChild(style);
  }

  if (!document.querySelector('[data-checkout-answer-v69-style]')) {
    var answerStyle = document.createElement('style');
    answerStyle.dataset.checkoutAnswerV69Style = 'true';
    answerStyle.textContent = window.__p0Modules.styleText("/@script-style/ed31b2d72ede3961056a03b9.css");
    document.head.appendChild(answerStyle);
  }

  function normalizeProduct(product) {
    var copy = Object.assign({}, product);
    copy.image_url = copy.image_url || copy.image || '';
    copy.originalPrice = Number(copy.originalPrice || copy.original_price || copy.price);
    copy.discount = Math.max(0, Number(copy.discount) || 0);
    return copy;
  }
  function latestAssistantBody() {
    var messages = Array.prototype.slice.call(document.querySelectorAll('.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai, .lxfd-thread .lxfd-msg-ai'));
    var message = messages[messages.length - 1];
    return message && (message.querySelector('.ai-body,.lxfd-ai-body') || message);
  }
  function benefitItems(product) {
    var fallback = [
      { label: '国补焕新专享券', amount: 2550 },
      { label: '商品平台满减券', amount: 500 },
      { label: '联想会员折扣券', amount: 300 }
    ];
    var source = Array.isArray(product && product.benefits) ? product.benefits.slice(0, 3) : [];
    return fallback.map(function (item, index) {
      var current = source[index] || item;
      var label = index === 0 || /国家补贴|国补/.test(String(current.label || '')) ? '国补焕新专享券' : String(current.label || item.label);
      return { label: label, amount: Math.abs(Number(current.amount) || item.amount) };
    });
  }
  function benefitMarkup(product) {
    var check = window.__lxApprovedIcon ? window.__lxApprovedIcon('global-check') : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.2 8.1 2.7 2.7 6.5-6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<div class="lx-checkout-benefit-list" aria-label="已使用优惠">' + benefitItems(product).map(function (item) {
      return '<div class="lx-checkout-benefit-row"><span class="lx-checkout-benefit-check" aria-hidden="true">' + check + '</span><span class="lx-checkout-benefit-name">' + esc(item.label) + '</span><span class="lx-checkout-benefit-amount">-¥' + item.amount.toLocaleString('zh-CN') + '</span></div>';
    }).join('') + '</div>';
  }
  function purchaseCopyMarkup() {
    return '<p>已为你自动领取<strong>3项可用优惠</strong>，共节省<strong>¥3,350</strong>。商品、优惠与收货信息已核对，请在<strong>待支付订单</strong>中确认后继续。查询到您附近门店存在此商品的库存，您是否想要今日就可取到商品呢，您可 <button class="lx-fulfillment-link" type="button" data-open-fulfillment="pickup">到店自提</button> <button class="lx-fulfillment-link" type="button" data-open-fulfillment="flash">门店闪送</button> 进行下单哦~</p>';
  }
  function normalizePurchaseAnswer(body, product) {
    if (!body) return;
    var copy = body.querySelector('.lx-payment-confirm-copy');
    if (!copy) return;
    copy.dataset.fulfillmentSuggestion = String(product.sku || product.name || 'product');
    copy.classList.add('lx-fulfillment-suggestion');
    copy.innerHTML = purchaseCopyMarkup();
    copy._lxProduct = product;
    body.querySelectorAll('.lx-fulfillment-suggestion').forEach(function (node) {
      if (node !== copy) node.remove();
    });
    var oldBenefits = body.querySelector('.lx-discount-detail-list');
    if (oldBenefits) oldBenefits.remove();
    var existingBenefits = body.querySelector('.lx-checkout-benefit-list');
    if (existingBenefits) existingBenefits.remove();
    copy.insertAdjacentHTML('afterend', benefitMarkup(product));
    var card = body.querySelector('.answer-cta,[data-answer-card],.lx-answer-card');
    var benefits = body.querySelector('.lx-checkout-benefit-list');
    if (card && benefits) benefits.insertAdjacentElement('afterend', card);
  }
  function appendSuggestion(product, attempt) {
    attempt = attempt || 0;
    var body = latestAssistantBody();
    if (!body) {
      if (attempt < 10) window.setTimeout(function () { appendSuggestion(product, attempt + 1); }, 160);
      return;
    }
    normalizePurchaseAnswer(body, product);
    var thread = body.closest('.lx-p0-messages,.lxfd-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }
  function appendFulfillmentChat(product, mode) {
    var modeLabel = mode === 'pickup' ? '到店自提' : '门店闪送';
    var orderId = 'LX' + Date.now() + Math.random().toString(36).slice(2, 6);
    var originalPrice = Number(product.originalPrice || product.original_price || product.price) || 0;
    var discount = Number(product.discount) || Math.max(0, originalPrice - Number(product.price || originalPrice));
    var pending = Object.assign({}, product, {
      _pendingOrderNo: orderId,
      originalPrice: originalPrice,
      original_price: originalPrice,
      discount: discount,
      price: Math.max(0, originalPrice - discount),
      benefits: Array.isArray(product.benefits) ? product.benefits : []
    });
    var currentBody = latestAssistantBody();
    var host = currentBody && currentBody.closest('.lx-p0-messages,.lxfd-thread');
    host = host || document.querySelector('.lx-p0-messages') || document.querySelector('.lxfd-thread');
    if (!host) return;
    var fullscreen = host.classList.contains('lxfd-thread');
    var query = '购买' + String(product.name || '这件商品') + '，' + modeLabel;
    var user = document.createElement('div');
    user.className = fullscreen ? 'lxfd-msg-user' : 'lx-p0-message msg user';
    if (fullscreen) user.textContent = query;
    else user.innerHTML = '<div class="user-bubble">' + esc(query) + '</div>';
    host.appendChild(user);
    var card = '<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-payment-confirm-reco" type="button" data-lx-recommended-modal="pending-payment" data-open-payment-confirm data-lx-order-id="' + esc(orderId) + '" data-lx-result-id="modal:pending-payment" aria-label="打开待支付订单弹窗" aria-pressed="false"><span class="answer-cta-title">待支付订单</span><span class="answer-cta-icon" aria-hidden="true">' + (window.__lxApprovedIcon ? window.__lxApprovedIcon('global-next') : '') + '</span></button>';
    var answerText = '已为你按' + modeLabel + '方式重新生成【' + String(product.name || '该商品') + '】的待支付订单，请确认门店、收货信息和优惠后继续。';
    var answerShell = '<div class="lx-payment-confirm-copy"><p class="lx-fulfillment-stream is-streaming"></p></div>';
    var assistantMessage = !fullscreen && window.__lxAgentAPI && window.__lxAgentAPI.addAiMessage ? window.__lxAgentAPI.addAiMessage(answerShell) : null;
    if (!assistantMessage) {
      assistantMessage = document.createElement('div');
      assistantMessage.className = fullscreen ? 'lxfd-msg-ai lx-chat-skin' : 'lx-p0-message msg ai lx-chat-skin';
      assistantMessage.innerHTML = fullscreen ? '<div class="lxfd-ai-body">' + answerShell + '</div>' : '<div class="ai-body">' + answerShell + '</div>';
      host.appendChild(assistantMessage);
    }
    if (window.__lxState) {
      window.__lxState.pendingOrderProduct = pending;
      window.__lxState.queryHistory = Array.isArray(window.__lxState.queryHistory) ? window.__lxState.queryHistory : [];
      window.__lxState.queryHistory.push(query);
    }
    window.__lxSetConversationQuery && window.__lxSetConversationQuery(query);
    host.scrollTop = host.scrollHeight;
    var answerBody = assistantMessage.querySelector('.ai-body,.lxfd-ai-body') || assistantMessage;
    var stream = answerBody.querySelector('.lx-fulfillment-stream');
    var index = 0;
    var finish = function () {
      stream.classList.remove('is-streaming');
      stream.innerHTML = '已为你按<strong>' + modeLabel + '</strong>方式重新生成【' + esc(product.name || '该商品') + '】的待支付订单，请确认门店、收货信息和优惠后继续。';
      answerBody.insertAdjacentHTML('beforeend', benefitMarkup(pending) + card);
      if (window.__lxState) window.__lxState.pendingOrderProduct = pending;
      host.scrollTop = host.scrollHeight;
      try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (ignore) {}
      window.requestAnimationFrame(function () {
        openWithMode(pending, { mode: mode, skipSuggestion: true });
      });
    };
    var write = function () {
      if (!stream || !stream.isConnected) return;
      index += 1;
      stream.textContent = answerText.slice(0, index);
      host.scrollTop = host.scrollHeight;
      if (index >= answerText.length) return finish();
      window.setTimeout(write, 16);
    };
    window.setTimeout(write, 220);
  }
  function shippingMarkup(session) {
    var store = session.store;
    if (session.mode === 'pickup') {
      return '<div class="lx-fulfillment-address"><div class="lx-fulfillment-address-row">' + shopIcon() + '<span class="lx-fulfillment-address-copy"><strong>' + esc(store.name) + '</strong></span><button type="button" data-select-fulfillment-store>选择门店</button></div><div class="lx-fulfillment-pickup-address">' + esc(store.address) + '</div><div class="lx-fulfillment-contact"><b>联小想</b><span>13028280000</span></div></div>';
    }
    if (session.mode === 'flash') {
      return '<div class="lx-fulfillment-address"><div class="lx-fulfillment-address-row">' + shopIcon() + '<span class="lx-fulfillment-address-copy"><strong>' + esc(store.name) + '</strong></span><button type="button" data-select-fulfillment-store>选择门店</button></div><div class="lx-fulfillment-address-row">' + locationIcon() + '<span class="lx-fulfillment-address-copy"><strong>联小想　13028280000</strong><span>' + orderAddress + '</span></span></div></div>';
    }
    return '';
  }
  function decorateOrder(session) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var shipping = dialog && dialog.querySelector('.lx-order-shipping');
    if (!shipping || session.mode === 'delivery') return;
    if (shipping.dataset.fulfillmentMode !== session.mode) {
      shipping.innerHTML = shippingMarkup(session);
      shipping.dataset.fulfillmentMode = session.mode;
    }
    if (session.mode === 'flash') {
      var card = dialog.querySelector('.lx-order-product-card');
      if (card && !card.querySelector('.lx-order-store-kicker')) {
        card.classList.add('has-store-kicker');
        card.insertAdjacentHTML('afterbegin', '<span class="lx-order-store-kicker">' + shopIcon() + esc(session.store.name) + '</span>');
      }
    }
  }
  function rememberSize(session) {
    if (session.size) return;
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var rect = dialog && dialog.getBoundingClientRect();
    if (rect && rect.width && rect.height) session.size = { width: Math.round(rect.width), height: Math.round(rect.height) };
  }
  function applySize(dialog, session) {
    rememberSize(session);
    if (!session.size) return;
    dialog.style.width = session.size.width + 'px';
    dialog.style.height = session.size.height + 'px';
  }
  function renderCustom(session, className, html) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    applySize(dialog, session);
    dialog.className = 'lx-buy-direct-dialog lx-fulfillment-dialog ' + className;
    dialog.innerHTML = html;
  }
  function rerenderOrder(session) {
    return window.__lxOpenUnifiedDiscountOrder(session.product, { mode: session.mode, storeId: session.store.id, skipSuggestion: true, size: session.size });
  }
  function storeCards(session) {
    return stores.map(function (store) {
      return '<button class="lx-fulfillment-store' + (session.draftStoreId === store.id ? ' is-active' : '') + '" type="button" data-fulfillment-store="' + store.id + '"><strong>' + esc(store.name) + '</strong><span>' + esc(store.address) + '</span><small>营业时间　' + store.hours + '　　电话　' + store.phone + '</small><em>距离 ' + store.distance + '</em></button>';
    }).join('');
  }
  function showStoreSelector(session) {
    session.draftStoreId = session.store.id;
    var contact = session.mode === 'pickup' ? '<div class="lx-fulfillment-form"><label for="lxPickupName">收货人</label><input id="lxPickupName" value="联小想"><label for="lxPickupPhone">电话</label><input id="lxPickupPhone" value="13028280000"></div><h3 class="lx-fulfillment-section-title">选择地址</h3>' : '';
    renderCustom(session, 'lx-store-selector-dialog', '<header class="lx-fulfillment-head"><h2>选择门店</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-fulfillment-body">' + contact + '<div class="lx-fulfillment-location">' + locationIcon() + '<span>位置：' + orderAddress + '</span><b>›</b></div><div class="lx-fulfillment-store-list">' + storeCards(session) + '</div></div><footer class="lx-fulfillment-footer"><button type="button" data-fulfillment-store-confirm>确定</button></footer>');
  }
  function subsidyGuide(session) {
    var authText = session.authenticated ? '实名认证已完成，可继续领取国家补贴。' : '检测您还未实名认证，请先完成实名可使用国家补贴优惠';
    var authButton = session.authenticated ? '已完成认证' : '实名认证';
    var html = '<header class="lx-fulfillment-head"><h2>领取国家补贴</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-fulfillment-body">';
    html += '<section class="lx-subsidy-step"><h3>第一步：实名认证</h3><p>' + authText + '</p><button class="lx-subsidy-outline" type="button" data-national-realname>' + authButton + '</button></section>';
    html += '<section class="lx-subsidy-step"><h3>第二步：去“京通微信小程序”领取/复制国补资格码</h3><div class="lx-subsidy-qr-row">' + qrMarkup() + '<div class="lx-subsidy-qr-copy">进入“京通小程序”<br>搜索“北京政府补贴”或点击“首页京通码”<br>点击“以旧换新资格码”<br>完成认证并领取</div></div></section>';
    html += '<section class="lx-subsidy-step"><h3>第三步：粘贴国补资格码享补贴</h3><div class="lx-subsidy-code"><input type="text" data-subsidy-code placeholder="请输入资格码"><button type="button" data-subsidy-bind>绑定资格码</button></div></section>';
    html += '<section class="lx-subsidy-step"><h3>第四步：回联想下单，下单时选择符合条件的发票自动抵扣</h3></section></div><footer class="lx-fulfillment-footer"><button type="button" data-subsidy-back>返回订单</button></footer>';
    renderCustom(session, 'lx-subsidy-dialog', html);
  }
  function showRealName(session) {
    var html = '<header class="lx-fulfillment-head"><h2>实名认证</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header>';
    html += '<div class="lx-fulfillment-body" style="display:flex;flex-direction:column"><p class="lx-realname-notice">实名认证需获取您的姓名、银行卡、手机号、证件信息（支持中国身份证）</p>';
    html += '<div class="lx-realname-grid"><label for="lxRealName">姓名</label><input id="lxRealName" placeholder="请输入姓名"><label for="lxRealId">证件</label><input id="lxRealId" placeholder="请输入证件号"><label for="lxRealPhone">手机</label><input id="lxRealPhone" placeholder="请输入手机号"><label for="lxRealCode">验证码</label><span class="lx-realname-code"><input id="lxRealCode" placeholder="请输入验证码"><button type="button" data-auth-code>获取验证码</button></span></div>';
    html += '<label class="lx-realname-consent"><input type="checkbox" data-realname-consent>我同意《实名认证协议》《联想网站隐私政策》</label><small style="margin-top:6px;color:#a39da6">请填写您的真实个人信息，一经填写不支持修改。禁止通过内部额度/福利，将产品进行二次销售从中牟利。</small></div>';
    html += '<footer class="lx-fulfillment-footer lx-realname-actions"><button class="secondary" type="button" data-realname-back>返回</button><button type="button" data-realname-next>下一步</button></footer>';
    renderCustom(session, 'lx-realname-dialog', html);
  }
  function pickupSuccess(session) {
    return '<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><div class="lx-pickup-success"><h3 class="lx-pickup-success-title"><i>✓</i>支付成功</h3><p class="lx-pickup-success-copy">已成功购买' + esc(session.product.name) + '，您可前往<b>' + esc(session.store.name) + '</b>凭自提码进行核销取货。</p><div class="lx-pickup-code"><div class="lx-pickup-code-head">自提码 <span>到店出示</span></div>' + qrMarkup() + '<strong>ABCDEFJ</strong></div><div class="lx-payment-actions"><button type="button" class="primary" data-view-paid-order>查看订单</button></div></div>';
  }
  function customizeSuccess(session, dialog) {
    var title = dialog.querySelector('#lxBuyDirectTitle');
    if (!title || title.textContent.trim() !== '支付成功') return;
    var newest = window.__lxState && window.__lxState.orders && window.__lxState.orders.find(function(order){return String(order.orderId) === String(session.modal.dataset.checkoutOrder);});
    if (newest && session.mode !== 'delivery') {
      newest.type = session.mode;
      newest.typeLabel = session.mode === 'pickup' ? '到店自提' : '门店闪送';
      newest.status = session.mode === 'pickup' ? '待取货' : '待发货';
      newest.fulfillmentMode = session.mode;
      newest.fulfillmentStore = session.store;
      if (session.mode === 'pickup') newest.pickupStore = session.store;
      try { localStorage.setItem('lexiang.orders.v1', JSON.stringify(window.__lxState.orders)); } catch (ignore) {}
    }
    if (session.mode !== 'pickup' || dialog.dataset.pickupSuccess === 'true') return;
    dialog.dataset.pickupSuccess = 'true';
    dialog.innerHTML = pickupSuccess(session);
  }
  function observe(session) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var observer = new MutationObserver(function () {
      decorateOrder(session);
      customizeSuccess(session, dialog);
    });
    observer.observe(dialog, { childList: true, subtree: true });
    session.observer = observer;
  }
  function openWithMode(product, options) {
    options = options || {};
    var normalized = normalizeProduct(product);
    var reopened = originalOpen(normalized);
    var modal = document.querySelector('[data-buy-modal-direct]');
    if (!modal) return;
    var priorSession = sessions.get(modal);
    if (priorSession) {
      if (options.mode && modal.dataset.checkoutLocked !== 'true') {
        priorSession.mode = options.mode;
        priorSession.store = stores.filter(function(store){return store.id === options.storeId;})[0] || priorSession.store;
        modal.dataset.fulfillmentMode = priorSession.mode;
        priorSession.size = null;
        var priorDialog = modal.querySelector('.lx-buy-direct-dialog');
        var modeHeight = Math.min(priorSession.mode === 'delivery' ? 560 : 600, window.innerHeight - 32);
        priorDialog.style.setProperty('height', modeHeight + 'px', 'important');
        priorDialog.style.setProperty('min-height', modeHeight + 'px', 'important');
      }
      decorateOrder(priorSession);
      return modal;
    }
    var mode = options.mode === 'pickup' || options.mode === 'flash' ? options.mode : 'delivery';
    var selectedStore = stores.filter(function (store) { return store.id === options.storeId; })[0] || stores[0];
    var session = { modal: modal, product: normalized, mode: mode, store: selectedStore, size: options.size || null, authenticated: false, draftStoreId: '' };
    sessions.set(modal, session);
    modal._lxFulfillmentSession = session;
    modal.dataset.fulfillmentMode = mode;
    if (mode === 'pickup' || mode === 'flash') {
      var fulfillmentDialog = modal.querySelector('.lx-buy-direct-dialog');
      if (fulfillmentDialog) {
        var fulfillmentHeight = Math.min(600, Math.max(0, window.innerHeight - 32));
        fulfillmentDialog.style.setProperty('height', fulfillmentHeight + 'px', 'important');
        fulfillmentDialog.style.setProperty('min-height', fulfillmentHeight + 'px', 'important');
      }
    }
    window.requestAnimationFrame(function () { rememberSize(session); decorateOrder(session); });
    observe(session);
    if (!options.skipSuggestion && mode === 'delivery') appendSuggestion(normalized);
    return modal;
  }

  window.__lxOpenUnifiedDiscountOrder = openWithMode;
  window.__lxFulfillmentCheckoutV60 = Object.freeze({ stores: stores, open: openWithMode });

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-open-fulfillment]');
    if (link) {
      var suggestion = link.closest('[data-fulfillment-suggestion]');
      if (!suggestion || !suggestion._lxProduct) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      appendFulfillmentChat(suggestion._lxProduct, link.dataset.openFulfillment);
      return;
    }
    var modal = event.target.closest && event.target.closest('[data-buy-modal-direct]');
    var session = modal && sessions.get(modal);
    if (!session) return;
    var action = event.target.closest('[data-select-fulfillment-store],[data-fulfillment-store],[data-fulfillment-store-confirm],[data-claim-national-subsidy],[data-national-realname],[data-subsidy-back],[data-realname-back],[data-realname-next],[data-auth-code],[data-subsidy-bind]');
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action.matches('[data-select-fulfillment-store]')) return showStoreSelector(session);
    if (action.matches('[data-fulfillment-store]')) {
      session.draftStoreId = action.dataset.fulfillmentStore;
      Array.prototype.forEach.call(modal.querySelectorAll('[data-fulfillment-store]'), function (card) { card.classList.toggle('is-active', card === action); });
      return;
    }
    if (action.matches('[data-fulfillment-store-confirm]')) {
      session.store = stores.filter(function (store) { return store.id === session.draftStoreId; })[0] || session.store;
      return rerenderOrder(session);
    }
    if (action.matches('[data-claim-national-subsidy]')) return subsidyGuide(session);
    if (action.matches('[data-national-realname]')) return showRealName(session);
    if (action.matches('[data-subsidy-back]')) return rerenderOrder(session);
    if (action.matches('[data-realname-back]')) return subsidyGuide(session);
    if (action.matches('[data-auth-code]')) {
      action.textContent = '60s后重试';
      action.disabled = true;
      window.setTimeout(function () {
        if (action.isConnected) { action.textContent = '获取验证码'; action.disabled = false; }
      }, 3000);
      return;
    }
    if (action.matches('[data-realname-next]')) {
      if (!modal.querySelector('[data-realname-consent]').checked) {
        window.alert('请先阅读并同意实名认证协议及隐私政策');
        return;
      }
      session.authenticated = true;
      return subsidyGuide(session);
    }
    if (action.matches('[data-subsidy-bind]')) {
      var input = modal.querySelector('[data-subsidy-code]');
      if (!input.value.trim()) { input.focus(); return; }
      action.textContent = '已绑定';
      action.disabled = true;
    }
  }, true);

  var previewMode = new URLSearchParams(location.search).get('showOrder');
  if (['pickup', 'flash', 'pickup-store', 'flash-store', 'subsidy', 'realname', 'pickup-success'].indexOf(previewMode) >= 0) {
    window.setTimeout(function () {
      var mode = previewMode.indexOf('flash') === 0 ? 'flash' : previewMode === 'subsidy' || previewMode === 'realname' ? 'delivery' : 'pickup';
      var modal = openWithMode({ sku: 'preview-y7000p', name: '联想拯救者Y7000P 2025 16英寸电竞游戏笔记本', price: 9799, originalPrice: 9999, discount: 200, image_url: '/assets/product-placeholder.svg', series: '拯救者', size: '16英寸', configuration: '16G/1T SSD', configurationLabel: '16G/1T SSD' }, { mode: mode, skipSuggestion: true });
      var session = modal && sessions.get(modal);
      if (!session) return;
      if (previewMode.indexOf('-store') > 0) showStoreSelector(session);
      if (previewMode === 'subsidy') subsidyGuide(session);
      if (previewMode === 'realname') showRealName(session);
      if (previewMode === 'pickup-success') {
        var dialog = modal.querySelector('.lx-buy-direct-dialog');
        applySize(dialog, session);
        dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
        dialog.innerHTML = pickupSuccess(session);
      }
    }, 50);
  }
})();

};
}
window.__p0Modules.dispatch(document.currentScript);
