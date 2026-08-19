(function () {
  "use strict";

  if (window.__lxProductCatalogRuntime) return;
  window.__lxProductCatalogRuntime = true;

  var api = window.__lxProductData;
  if (!api) return;

  var page = document.body && document.body.dataset.page || window.__LX_TEMPLATE_PAGE || "personal";
  var siteMap = { personal: "shop", business: "b", enterprise: "biz", brand: "" };
  var site = siteMap[page] !== undefined ? siteMap[page] : "shop";
  var catalogByFloor = new WeakMap();
  var detailRequest = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function categoryFor(title) {
    var text = String(title || "");
    if (/笔记本|轻薄本|游戏本/.test(text)) return "笔记本电脑";
    if (/台式|主机/.test(text)) return "台式机";
    if (/显示器/.test(text)) return "显示器";
    if (/服务器/.test(text)) return "服务器";
    if (/工作站/.test(text)) return "工作站";
    if (/平板/.test(text)) return "平板电脑";
    return "";
  }

  function stateNode(host, kind, message) {
    host.innerHTML = '<div class="lx-product-data-state" role="status" aria-live="polite" data-product-state="' + kind + '"><span>' + escapeHtml(message) + '</span>' +
      (kind === "error" ? '<button class="detail-secondary" type="button" data-product-retry>重新加载</button>' : "") + "</div>";
  }

  function promotionHtml(product) {
    return product.promotionTags.map(function (tag) { return '<span class="product-promo">' + escapeHtml(tag) + "</span>"; }).join("");
  }

  function hydrateCard(card, product) {
    card.classList.remove("product-card");
    card.classList.add("lx-floor-product-card");
    card.innerHTML = '<div class="brand-mini"></div><div class="product-visual"><img loading="lazy" src="" alt=""></div>' +
      '<h3 class="product-title"></h3><p class="spec"></p><div class="product-promos" aria-label="促销标签"></div><p class="price"></p>';
    card.querySelector(".brand-mini").textContent = product.brand;
    card.querySelector(".product-title").textContent = product.name;
    card.querySelector(".spec").textContent = product.summary;
    var image = card.querySelector(".product-visual img");
    image.src = product.image;
    image.alt = product.name;
    card.querySelector(".product-promos").innerHTML = promotionHtml(product);
    card.querySelector(".price").innerHTML = escapeHtml(product.priceText) + '<span class="price-from">起</span>';
    card.dataset.floorProduct = product.name;
    card.dataset.detailSku = product.sku;
    card.dataset.detailBrand = product.brand;
    card.dataset.detailTitle = product.name;
    card.dataset.detailSummary = product.summary;
    card.dataset.detailPrice = product.priceText;
    card.dataset.detailImage = product.image;
    card.dataset.productSource = "api";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "查看" + product.name + "商品详情");
  }

  function renderFloor(floor, products, offset) {
    var host = floor.querySelector(".lx-floor-products");
    if (!host) return;
    var items = products.slice(offset || 0).concat(products.slice(0, offset || 0)).slice(0, 10);
    if (!items.length) {
      stateNode(host, "empty", "当前分类暂无可展示的在售商品");
      return;
    }
    var template = document.createElement("article");
    host.innerHTML = "";
    items.forEach(function (product) {
      var card = template.cloneNode(true);
      hydrateCard(card, product);
      host.appendChild(card);
    });
    floor.dataset.productStatus = "success";
    floor.removeAttribute("aria-busy");
  }

  function loadFloor(floor, force) {
    var host = floor.querySelector(".lx-floor-products");
    if (!host) return Promise.resolve();
    var title = floor.querySelector(".lx-floor-head h3")?.textContent.trim() || "";
    var category = categoryFor(title);
    floor.dataset.productStatus = "loading";
    floor.setAttribute("aria-busy", "true");
    stateNode(host, "loading", "正在获取联想官方在售商品…");
    if (force) api.clearCache();
    return api.list({ site: site, category: category, limit: 96 }).then(function (products) {
      catalogByFloor.set(floor, { products: products, offset: 0 });
      renderFloor(floor, products, 0);
    }).catch(function (error) {
      floor.dataset.productStatus = "error";
      floor.removeAttribute("aria-busy");
      stateNode(host, "error", error && error.message ? error.message : "商品数据暂时无法加载");
    });
  }

  function loadAllFloors() {
    window.__lxProductCatalogActive = true;
    document.querySelectorAll(".lx-site-floors .lx-floor").forEach(function (floor) { loadFloor(floor, false); });
  }

  function updateDetailSurface(detail, product, variants, images) {
    if (!detail || !detail.isConnected) return;
    var setText = function (selector, value) { var node = detail.querySelector(selector); if (node) node.textContent = value; };
    setText("[data-detail-title]", product.name);
    setText("[data-detail-summary]", product.summary);
    var visual = detail.querySelector(".detail-visual");
    if (visual) visual.innerHTML = '<img class="detail-product-image" src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" data-detail-visual>';
    var price = detail.querySelector("[data-detail-price]");
    if (price) price.innerHTML = '<span class="detail-price-main">' + escapeHtml(product.priceText) + "</span>" +
      (product.originalPrice ? '<span class="detail-price-side"><s>¥ ' + product.originalPrice.toLocaleString("zh-CN") + "</s></span>" : "");
    detail.querySelectorAll(".lx-buybar-info b").forEach(function (node) { node.textContent = product.priceText; });
    var tags = detail.querySelector(".detail-tags");
    if (tags) tags.innerHTML = '<span class="detail-tag">' + escapeHtml(product.brand) + "</span>" + promotionHtml(product);
    var code = detail.querySelector(".detail-itemcode span");
    if (code) code.textContent = product.sku;
    var host = detail.querySelector("[data-detail-variants]");
    if (host) {
      if (variants.length) {
        host.hidden = false;
        var prices = variants.map(function (item) { return item.price; });
        host.innerHTML = '<div class="lx-spu-head"><span>本系列共 ' + variants.length + " 款配置 · <b>¥" + Math.min.apply(Math, prices).toLocaleString("zh-CN") + " - ¥" + Math.max.apply(Math, prices).toLocaleString("zh-CN") +
          '</b></span><button class="lx-spu-compare" type="button">对比本系列 →</button></div><div class="lx-spu-chips">' + variants.map(function (item) {
            return '<button class="lx-spu-chip' + (item.sku === product.sku ? " is-active" : "") + '" type="button" data-detail-price-value="' + escapeHtml(item.priceText) + '" data-detail-variant-sku="' + escapeHtml(item.sku) + '"><span class="lx-spu-chip-label">' + escapeHtml(api.formatVariant(item)) + '</span><span class="lx-spu-chip-price">' + escapeHtml(item.priceText) + "</span></button>";
          }).join("") + "</div>";
      } else {
        host.hidden = true;
        host.innerHTML = "";
      }
    }
    var panel = detail.querySelector("[data-detail-images-panel]");
    if (panel) {
      var usable = images.length ? images : [product.image];
      panel.innerHTML = usable.slice(0, 12).map(function (url, index) { return '<img loading="lazy" src="' + escapeHtml(url) + '" alt="' + escapeHtml(product.name) + " 商品详情图 " + (index + 1) + '">'; }).join("");
    }
    detail.dataset.detailState = "ready";
    detail.removeAttribute("aria-busy");
  }

  function waitForDetailVisible(detail, run) {
    var content = detail && detail.closest(".content");
    if (content && content.dataset.view === "detail") {
      return new Promise(function (resolve) {
        window.requestAnimationFrame(function () { window.requestAnimationFrame(resolve); });
      });
    }
    return new Promise(function (resolve, reject) {
      var finished = false;
      var observer = new MutationObserver(function () {
        if (!finished && run === detailRequest && content && content.dataset.view === "detail") finish(resolve);
      });
      var timer = window.setTimeout(function () { finish(function () { reject(new Error("商品详情打开超时")); }); }, 12000);
      function finish(callback) {
        if (finished) return;
        finished = true;
        observer.disconnect();
        window.clearTimeout(timer);
        window.requestAnimationFrame(function () { window.requestAnimationFrame(callback); });
      }
      if (content) observer.observe(content, { attributes: true, attributeFilter: ["data-view"] });
    });
  }

  function hydrateDetail(card) {
    var sku = card && card.dataset.detailSku;
    var detail = document.querySelector(".shell > .content .product-detail");
    if (!sku || !detail) return;
    var run = ++detailRequest;
    detail.dataset.detailState = "loading";
    detail.setAttribute("aria-busy", "true");
    Promise.all([api.detail(sku), api.variants(sku), api.detailImages(sku)]).then(function (values) {
      if (run !== detailRequest) return;
      return waitForDetailVisible(detail, run).then(function () {
        if (run !== detailRequest) return;
        updateDetailSurface(detail, values[0], values[1].items, values[2]);
      });
    }).catch(function (error) {
      if (run !== detailRequest) return;
      detail.dataset.detailState = "error";
      detail.removeAttribute("aria-busy");
      var reason = detail.querySelector("[data-detail-reason]");
      if (reason) {
        reason.hidden = false;
        reason.textContent = (error && error.message ? error.message : "商品详情暂时无法加载") + "，请稍后重试。";
      }
    });
  }

  document.addEventListener("click", function (event) {
    var retry = event.target.closest("[data-product-retry]");
    if (retry) {
      var floor = retry.closest(".lx-floor");
      if (floor) loadFloor(floor, true);
      return;
    }
    var shuffle = event.target.closest(".lx-cat-shuffle-btn");
    if (shuffle) {
      var floor = shuffle.closest(".lx-floor");
      var state = floor && catalogByFloor.get(floor);
      if (state && state.products.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.offset = (state.offset + 5) % state.products.length;
        renderFloor(floor, state.products, state.offset);
      }
      return;
    }
    var card = event.target.closest(".lx-floor-product-card[data-detail-sku]");
    if (card) hydrateDetail(card);
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var card = event.target.closest(".lx-floor-product-card[data-detail-sku]");
    if (card) hydrateDetail(card);
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadAllFloors, { once: true });
  else loadAllFloors();
})();
