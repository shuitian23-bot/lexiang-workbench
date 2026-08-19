(function () {
  "use strict";

  if (window.__lxProductData) return;

  var cache = new Map();
  var DEFAULT_TIMEOUT = 10000;
  var PLACEHOLDER_PRICES = new Set([99999, 999999, 9999999]);

  function requestJson(url, options) {
    var opts = options || {};
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, opts.timeout || DEFAULT_TIMEOUT) : 0;
    return fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error("商品服务返回 " + response.status);
      return response.json();
    }).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function cached(key, loader, ttl) {
    var hit = cache.get(key);
    var now = Date.now();
    if (hit && hit.value && now - hit.time < ttl) return Promise.resolve(hit.value);
    if (hit && hit.promise) return hit.promise;
    var promise = loader().then(function (value) {
      cache.set(key, { value: value, time: Date.now() });
      return value;
    }).catch(function (error) {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { promise: promise, time: now });
    return promise;
  }

  function safeSpecs(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch (_) { return {}; }
  }

  function validPrice(value) {
    var price = Number(value || 0);
    return Number.isFinite(price) && price > 500 && !PLACEHOLDER_PRICES.has(price);
  }

  function brandFromName(name) {
    var text = String(name || "");
    var match = text.match(/ThinkPad|ThinkBook|YOGA|Yoga|小新|拯救者|Legion|昭阳|开天|启天|扬天|ThinkCentre|Lenovo|联想/i);
    return match ? match[0].replace(/^联想$/i, "Lenovo") : "Lenovo";
  }

  function specSummary(specs, description) {
    if (description) return String(description).replace(/\s+/g, " ").trim().slice(0, 110);
    var values = [specs.cpu, specs.memory || specs.ram, specs.disk, specs.gpu, specs.screen_size || specs.screen_res]
      .filter(Boolean)
      .map(String);
    return values.length ? values.slice(0, 4).join("｜") : "联想官方在售商品，具体配置以商品详情为准";
  }

  function normalize(raw) {
    var row = raw || {};
    var specs = safeSpecs(row.specs);
    var price = Number(row.price || 0);
    var originalPrice = Number(row.original_price || 0);
    var status = row.status || "active";
    var marketable = specs.marketable;
    var quality = status === "active" && marketable !== 0 && validPrice(price) && Boolean(row.image_url);
    return {
      sku: String(row.sku || ""),
      spuKey: String(row.spu_key || ""),
      name: String(row.name || "联想商品"),
      brand: brandFromName(row.name),
      price: price,
      originalPrice: originalPrice > price && validPrice(originalPrice) ? originalPrice : null,
      priceText: validPrice(price) ? "¥ " + price.toLocaleString("zh-CN") : "价格待核实",
      image: String(row.image_url || "").replace(/^http:\/\//, "https://"),
      description: String(row.description || ""),
      summary: specSummary(specs, row.description),
      category: String(row.category || ""),
      specs: specs,
      status: status,
      stockStatus: "unknown",
      quality: quality,
      promotionTags: originalPrice > price && validPrice(originalPrice) ? ["官方优惠"] : []
    };
  }

  function productQuery(params) {
    var search = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== "") search.set(key, value);
    });
    return "/api/products?" + search.toString();
  }

  function channelAllowed(item, site) {
    var name = item.name || "";
    var category = item.category || "";
    if (site === "shop") {
      if (category === "笔记本电脑") return /小新|YOGA|Yoga|拯救者|Legion|Lecoo|Lenovo来酷/i.test(name);
      if (category === "台式机") return /拯救者|Legion|GeekPro|Lecoo|来酷/i.test(name);
      return /手机|平板|耳机|包袋/.test(category);
    }
    if (site === "b") {
      if (/打印机|显示器|键鼠/.test(category)) return true;
      return /ThinkPad|ThinkBook|ThinkCentre|扬天|瑞天|企业购/i.test(name);
    }
    if (site === "biz") return /服务器|工作站|服务产品/.test(category) || /昭阳|开天|启天/.test(name);
    return true;
  }

  function list(params) {
    var url = productQuery(params || {});
    return cached("list:" + url, function () {
      return requestJson(url).then(function (rows) {
        return (Array.isArray(rows) ? rows : []).map(normalize).filter(function (item) {
          return item.quality && channelAllowed(item, params && params.site);
        });
      });
    }, 5 * 60 * 1000);
  }

  function detail(sku) {
    var id = encodeURIComponent(String(sku || ""));
    return cached("detail:" + id, function () {
      return requestJson("/api/products/" + id).then(function (row) {
        var item = normalize(row);
        if (!item.quality) throw new Error("该商品已下架或数据需要核实");
        return item;
      });
    }, 5 * 60 * 1000);
  }

  function variants(sku) {
    var id = encodeURIComponent(String(sku || ""));
    return cached("variants:" + id, function () {
      return requestJson("/api/products/" + id + "/variants").then(function (payload) {
        var items = (payload && Array.isArray(payload.variants) ? payload.variants : []).map(normalize).filter(function (item) { return item.quality; });
        return { count: items.length, items: items };
      });
    }, 5 * 60 * 1000);
  }

  function detailImages(sku) {
    var id = encodeURIComponent(String(sku || ""));
    return cached("images:" + id, function () {
      return requestJson("/api/product/" + id + "/detail-images").then(function (payload) {
        var rows = Array.isArray(payload) ? payload : (payload && (payload.images || payload.items)) || [];
        return rows.map(function (item) {
          return String(typeof item === "string" ? item : item.url || item.image_url || "").replace(/^http:\/\//, "https://");
        }).filter(Boolean);
      }).catch(function () { return []; });
    }, 7 * 24 * 60 * 60 * 1000);
  }

  function formatVariant(item) {
    var specs = item.specs || {};
    return [specs.cpu, specs.memory || specs.ram, specs.disk, specs.gpu].filter(Boolean).slice(0, 3).join("｜") || item.name;
  }

  window.__lxProductData = {
    normalize: normalize,
    validPrice: validPrice,
    channelAllowed: channelAllowed,
    list: list,
    detail: detail,
    variants: variants,
    detailImages: detailImages,
    formatVariant: formatVariant,
    clearCache: function () { cache.clear(); }
  };
})();
