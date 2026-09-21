/* 修改配置 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/configuration-edit"]) {
window.__p0Modules.installed["modals/configuration-edit"]=true;

/* Business: closeConfig */
window.__p0Modules.factories["modals/configuration-edit#closeConfig:b6acb760b3ea53f034d24a63"]=function(__p0Scope){"use strict";return (function closeConfig(mask, closeOrder) {
    mask.remove();
    document.documentElement.style.removeProperty("overflow");
    if (closeOrder) document.querySelector(".lx-order-modal-mask .lx-p0-close")?.click();
  }); };

/* Business: renderChoices */
window.__p0Modules.factories["modals/configuration-edit#renderChoices:a7e1bedc7354bb78a799f076"]=function(__p0Scope){"use strict";return (function renderChoices(mask, metas, selectedSku) {
    var grid = mask.querySelector("[data-lx-config-grid]");
    var colorsBox = mask.querySelector("[data-lx-color-grid]");
    if (!metas.length) {
      grid.innerHTML = '<div class="lx-product-config-empty">当前商品暂无可切换配置</div>';
      colorsBox.innerHTML = '<div class="lx-product-config-empty">暂无颜色数据</div>';
      return;
    }
    var selected = metas.find(function (meta) { return String(meta.variant.sku) === String(selectedSku); }) || metas[0];
    mask.dataset.selectedSku = selected.variant.sku || "";
    grid.innerHTML = metas.map(function (meta) {
      var active = meta === selected;
      return '<button type="button" class="lx-product-config-option' + (active ? ' is-selected' : '') + '" data-lx-config-sku="' + (0,__p0Scope.esc)(meta.variant.sku) + '"><span class="name">' + (0,__p0Scope.esc)(meta.label) + (meta.color ? '<br><small>' + (0,__p0Scope.esc)(meta.color) + '</small>' : '') + '</span><span class="price">¥' + (0,__p0Scope.fmt)(meta.price) + '</span></button>';
    }).join("");
    var colors = (0,__p0Scope.unique)(metas.map(function (meta) { return meta.color; }));
    var selectedColor = selected.color || mask.dataset.selectedColor || __p0Scope.DEMO_COLORS[0];
    if (!colors.length) colors = __p0Scope.DEMO_COLORS.slice();
    mask.dataset.selectedColor = selectedColor;
    colorsBox.innerHTML = colors.map(function (color) {
      return '<button type="button" class="lx-product-config-color' + (color === selectedColor ? ' is-selected' : '') + '" data-lx-config-color="' + (0,__p0Scope.esc)(color) + '">' + (0,__p0Scope.esc)(color) + '</button>';
    }).join("");
  }); };

/* Business: openConfig */
window.__p0Modules.factories["modals/configuration-edit#openConfig:a466bbfbbdde941190245e74"]=function(__p0Scope){"use strict";return (async function openConfig(button) {
    (0,__p0Scope.installStyle)();
    document.querySelector("." + __p0Scope.MODAL_CLASS)?.remove();
    var context = (0,__p0Scope.currentPendingItem)(button);
    var item = context.item || {};
    var storedSelection = __p0Scope.selectionStore["item-" + context.index] || {};
    var mask = document.createElement("div");
    mask.className = __p0Scope.MODAL_CLASS;
    mask.innerHTML = '<section class="lx-product-config-modal" role="dialog" aria-modal="true" aria-label="修改配置">' +
      '<header class="lx-product-config-head"><button type="button" class="lx-product-config-back" data-lx-config-back aria-label="返回订单弹窗"></button><h2>修改配置</h2><button type="button" class="lx-product-config-close" data-lx-config-close aria-label="关闭"></button></header>' +
      '<div class="lx-product-config-body"><div class="lx-product-config-scroll">' +
      '<section class="lx-product-config-card lx-product-config-product"><img src="' + (0,__p0Scope.esc)(item.image_url || item.image || "") + '" alt=""><div><h3>' + (0,__p0Scope.esc)(item.name || "当前商品") + '</h3><div class="lx-product-config-current">当前 SKU：' + (0,__p0Scope.esc)(item.sku || "-") + '</div></div></section>' +
      '<section class="lx-product-config-card"><h3 class="lx-product-config-label">选择配置</h3><div class="lx-product-config-grid" data-lx-config-grid><div class="lx-product-config-empty">正在同步商品详情页 SKU 配置…</div></div></section>' +
      '<section class="lx-product-config-card"><h3 class="lx-product-config-label">选择颜色</h3><div class="lx-product-config-colors" data-lx-color-grid><div class="lx-product-config-empty">正在读取颜色…</div></div></section>' +
      '</div><footer class="lx-product-config-actions"><button type="button" class="lx-product-config-cancel" data-lx-config-back>取消</button><button type="button" class="lx-product-config-save" data-lx-config-save>保存配置</button></footer></div></section>';
    document.body.appendChild(mask);
    document.documentElement.style.overflow = "hidden";
    mask.dataset.selectedColor = item.colorLabel || storedSelection.colorLabel || __p0Scope.DEMO_COLORS[0];
    var variants = await (0,__p0Scope.fetchVariants)(item);
    if (!variants.some(function (variant) { return String(variant.sku) === String(item.sku); })) variants.unshift(item);
    var metas = variants.map(__p0Scope.variantMeta);
    mask._lxConfigContext = context;
    mask._lxConfigMetas = metas;
    (0,__p0Scope.renderChoices)(mask, metas, item.sku);
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
