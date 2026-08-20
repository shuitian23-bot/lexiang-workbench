// 门店页：查询-导航-预约-权益商品（P0）。独立文件，不改 app.js 主逻辑结构，只通过
// window.__lxAgentAPI 桥接读写共享状态、复用 ensureModal/openModal/closeModal/addMessage/
// lxOpenInfoTab/renderPageCta/lxRevealContent 等既有能力。app.js 只在 sendChat 里加了一处
// 「优先委托本模块，未命中则回退既有快路径」的接线，以及门店快捷按钮改走本模块入口。
// 预约/导航均由按钮直接触发左侧 Query + Skill 过程模拟，不经过真实后端；默认/行政区划查询
// 优先用真实 /api/stores/geocode+/api/stores/nearby，失败或无结果才落回西单大悦城 8 家模拟门店。
(function () {
  "use strict";

  if (window.__lxStoreLoaded) return;
  window.__lxStoreLoaded = true;

  function api() { return window.__lxAgentAPI || {}; }

  function esc(v) {
    var a = api();
    if (typeof a.esc === "function") return a.esc(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function moneyText(v) {
    var a = api();
    if (typeof a.money === "function") return String(a.money(v)).replace(/^¥\s?/, "");
    var n = Number(v) || 0;
    return n.toLocaleString("zh-CN");
  }
  function imgUrlSafe(u) {
    var a = api();
    return typeof a.imgUrl === "function" ? a.imgUrl(u) : (u || "");
  }
  function scrollBottom() {
    var a = api();
    var chat = typeof a.ensureChat === "function" ? a.ensureChat() : document.querySelector(".lx-p0-messages");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }
  function addMsgUser(text) {
    var a = api();
    if (typeof a.addMessage === "function") a.addMessage("user", text);
  }
  function addMsgAI(text) {
    var a = api();
    return typeof a.addMessage === "function" ? a.addMessage("assistant", text, "") : null;
  }
  function appendAiHtml(node, html) {
    if (!node || !html) return;
    var a = api();
    var body = typeof a.lxEnsureAiBody === "function" ? a.lxEnsureAiBody(node) : (node.querySelector && node.querySelector(".ai-body"));
    if (body) body.insertAdjacentHTML("beforeend", html);
    scrollBottom();
    try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (e) {}
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // ── 左侧 Skill 过程（分析中→获取数据→调用完成+Skill名），独立措辞不依赖 app.js 内部实现 ──
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
      '<span class="lx-skill-trace-fold-text">' + esc(foldText) + '</span><span class="lx-skill-trace-fold-caret"></span>' +
      "</button>" +
      '<div class="lx-skill-trace-list">' + items + "</div>" +
      "</div>";
  }
  function runSkillTrace(skillName, onDone) {
    var a = api();
    var lines = ["正在分析你的问题"];
    var node = typeof a.addMessage === "function" ? a.addMessage("ai loading", "", traceHtml(lines, { collapsed: false, foldable: false })) : null;
    scrollBottom();
    if (!node) { if (typeof onDone === "function") onDone(null); return; }
    var body = node.querySelector(".ai-body");
    var steps = ["正在获取门店数据", "Skill（" + skillName + "）调用完成"];
    var i = 0;
    var timer = setInterval(function () {
      if (i < steps.length) {
        lines.push(steps[i]);
        if (body) body.innerHTML = traceHtml(lines, { collapsed: false, foldable: false });
        scrollBottom();
        i += 1;
      } else {
        clearInterval(timer);
        if (body) body.innerHTML = traceHtml(lines, { collapsed: true, foldable: true, foldText: "已完成 1 个 Skill 调用：" + skillName });
        scrollBottom();
        if (typeof onDone === "function") onDone(node);
      }
    }, 450);
  }

  // ── 数据：门店类型判定 / 距离格式化 / 营业状态 ──────────────────────────────────
  function deriveType(name) { return /服务|客服|维修|安装/.test(String(name || "")) ? "service" : "sales"; }
  function formatDist(m) {
    if (m == null || m === "") return "";
    var n = Number(m);
    if (!isFinite(n)) return "";
    return n >= 1000 ? (n / 1000).toFixed(1) + "km" : Math.round(n) + "m";
  }
  function openState(store) {
    var m = String(store.hours || "").match(/(\d{1,2}):(\d{2})\s*[-–—~至]\s*(\d{1,2}):(\d{2})/);
    if (!m) return { open: true, label: "营业中" };
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    var open = cur >= (+m[1]) * 60 + (+m[2]) && cur < (+m[3]) * 60 + (+m[4]);
    return { open: open, label: open ? "营业中" : "已打烊" };
  }

  var DEFAULT_ADDRESS = "北京市西城区西单北大街131号西单大悦城";
  var DEFAULT_CENTER = { lat: 39.9091, lng: 116.3728 };
  var PIN_SLOTS = [[50, 30], [34, 42], [66, 38], [22, 58], [78, 54], [46, 62], [60, 70], [30, 74]];
  var TIME_SLOTS = ["09:30-10:30", "10:30-11:30", "11:30-12:30", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00"];

  // API 失败 / 无结果时的兜底：默认定位西单大悦城，8 家模拟门店按距离排序
  var FALLBACK_STORES = [
    { name: "联想直营店(西单大悦城店)", address: "北京市西城区西单北大街131号西单大悦城B1", tel: "010-66013299", dist: 180, lat: 39.9098, lng: 116.3735, hours: "10:00–22:00", type: "sales" },
    { name: "联想电脑专卖店(西单商场店)", address: "北京市西城区西单北大街120号西单商场4层", tel: "010-66086655", dist: 320, lat: 39.9082, lng: 116.3721, hours: "10:00–21:30", type: "sales" },
    { name: "联想服务中心(西城区达官营店)", address: "北京市西城区达官营红山世家一号楼底商", tel: "010-83551726", dist: 2400, lat: 39.8991, lng: 116.3408, hours: "09:30–18:30", type: "service" },
    { name: "联想直营店(北京西直门凯德店)", address: "北京市西城区西直门外大街1号凯德MALL F2", tel: "010-53652618", dist: 3900, lat: 39.9478, lng: 116.3594, hours: "10:00–22:00", type: "sales" },
    { name: "联想官方直营客服中心(西城店)", address: "北京市西城区广安门外大街305号西堤红山二区1号楼", tel: "010-83551726", dist: 4450, lat: 39.8990, lng: 116.3396, hours: "09:00–18:00", type: "service" },
    { name: "联想电脑专卖店(复兴路店)", address: "北京市海淀区三环中路27号", tel: "010-68427766", dist: 5700, lat: 39.9153, lng: 116.3180, hours: "10:00–21:00", type: "sales" },
    { name: "联想直营店(北京新东安APM店)", address: "北京市东城区王府井大街138号APM F4", tel: "010-65281234", dist: 6300, lat: 39.9095, lng: 116.4131, hours: "10:00–22:00", type: "sales" },
    { name: "联想服务中心(丰台马家堡店)", address: "北京市丰台区马家堡西路52号", tel: "010-63823456", dist: 8100, lat: 39.8562, lng: 116.3502, hours: "09:30–18:30", type: "service" }
  ];

  function fetchDefaultStores() {
    return fetch("/api/stores/geocode?address=" + encodeURIComponent(DEFAULT_ADDRESS)).then(function (r) { return r.json(); }).then(function (geo) {
      if (!geo || !geo.lat || !geo.lng) throw new Error("geocode failed");
      return fetch("/api/stores/nearby?lat=" + encodeURIComponent(geo.lat) + "&lng=" + encodeURIComponent(geo.lng) + "&limit=8").then(function (r) { return r.json(); }).then(function (data) {
        var raw = Array.isArray(data.stores) ? data.stores : [];
        if (!raw.length) throw new Error("empty");
        var stores = raw.slice(0, 8).map(function (s, i) {
          return { id: "st-" + i, name: s.name || ("联想门店" + (i + 1)), address: s.address || "", tel: s.tel || "", lat: s.lat, lng: s.lng, dist: s.dist != null ? s.dist : (i + 1) * 800, hours: "10:00–20:00", type: deriveType(s.name || "") };
        });
        return { stores: stores, center: { lat: stores[0].lat, lng: stores[0].lng } };
      });
    }).catch(function () {
      return { stores: FALLBACK_STORES.map(function (s, i) { return Object.assign({ id: "st-" + i }, s); }), center: DEFAULT_CENTER };
    });
  }

  // ── 省市区三级 mock（首期范围：北京市/天津市/河北省及部分市区县）──────────────────
  var REGIONS = {
    "北京市": { center: [39.9042, 116.4074], cities: { "北京市": ["西城区", "东城区", "海淀区", "朝阳区", "丰台区", "通州区"] } },
    "天津市": { center: [39.0842, 117.2009], cities: { "天津市": ["和平区", "南开区", "河西区", "滨海新区"] } },
    "河北省": { cities: {
      "石家庄市": { center: [38.0428, 114.5149], districts: ["长安区", "桥西区", "裕华区"] },
      "保定市": { center: [38.8671, 115.4646], districts: ["竞秀区", "莲池区", "徐水区"] },
      "廊坊市": { center: [39.5186, 116.7032], districts: ["广阳区", "安次区", "固安县"] }
    } }
  };
  function provinceList() { return Object.keys(REGIONS); }
  function cityList(province) { var p = REGIONS[province]; return p ? Object.keys(p.cities) : []; }
  function districtList(province, city) {
    var p = REGIONS[province]; if (!p) return [];
    var c = p.cities[city];
    if (Array.isArray(c)) return c;
    return (c && c.districts) || [];
  }
  function regionCenter(province, city) {
    var p = REGIONS[province]; if (!p) return [39.9042, 116.4074];
    var c = p.cities[city];
    if (Array.isArray(c)) return p.center || [39.9042, 116.4074];
    return (c && c.center) || p.center || [39.9042, 116.4074];
  }
  function seedNum(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function generateRegionStores(province, city, district) {
    var label = district || city || province;
    var seed = seedNum(province + "|" + city + "|" + district);
    var center = regionCenter(province, city);
    var count = 5 + (seed % 3);
    var nameTemplates = ["联想授权体验店(" + label + "店)", "联想电脑专卖店(" + label + "中心店)", "联想服务中心(" + label + "店)", "联想直营店(" + label + "广场店)", "联想3C服务中心(" + label + "店)", "联想授权体验店(" + label + "东街店)", "联想服务网点(" + label + "店)"];
    var stores = [];
    for (var i = 0; i < count; i++) {
      var name = nameTemplates[i % nameTemplates.length];
      var d = 600 + ((seed + i * 977) % 9000);
      stores.push({
        id: "rg-" + i, name: name,
        address: province + city + (district || "") + "（模拟地址）建鑫路" + (10 + i) + "号",
        tel: "010-8" + ((10000000 + (seed + i * 131) % 9000000)),
        lat: center[0] + (((seed + i * 53) % 200) - 100) / 10000,
        lng: center[1] + (((seed + i * 97) % 200) - 100) / 10000,
        dist: d, hours: "10:00–20:00", type: deriveType(name)
      });
    }
    stores.sort(function (a, b) { return a.dist - b.dist; });
    return { stores: stores, center: { lat: center[0], lng: center[1] } };
  }

  // ── 权益商品 / 商品列表数据源：真实商品接口，取不到用固定兜底 3 款 ─────────────────
  var STATIC_FALLBACK_PRODUCTS = [
    { sku: "demo-xiaoxin14", name: "联想小新14 2026款轻薄本", price: 4499, image_url: "" },
    { sku: "demo-thinkbook14", name: "ThinkBook 14+ 2026款商用本", price: 5999, image_url: "" },
    { sku: "demo-yoga16", name: "联想YOGA Pro 16 轻薄创作本", price: 8999, image_url: "" }
  ];
  var PRODUCTS_LIST = STATIC_FALLBACK_PRODUCTS;
  var PRODUCTS_PROMISE = null;
  function ensureDemoProducts() {
    if (PRODUCTS_PROMISE) return PRODUCTS_PROMISE;
    PRODUCTS_PROMISE = fetch("/api/products?site=shop&limit=24").then(function (r) { return r.json(); }).then(function (d) {
      var list = Array.isArray(d) ? d : (d.products || d.items || []);
      var filtered = list.filter(function (p) { return p && p.sku && p.name && p.price && p.price > 0 && p.price < 60000; });
      return filtered.length ? filtered : STATIC_FALLBACK_PRODUCTS;
    }).catch(function () { return STATIC_FALLBACK_PRODUCTS; });
    return PRODUCTS_PROMISE;
  }
  function previewProductsForStore(idx) {
    var list = (PRODUCTS_LIST && PRODUCTS_LIST.length) ? PRODUCTS_LIST : STATIC_FALLBACK_PRODUCTS;
    if (!list.length) return [];
    var n = list.length, offset = (idx * 3) % n, out = [];
    for (var i = 0; i < 3; i++) out.push(list[(offset + i) % n]);
    return out;
  }
  function detailProductsForStore(idx) {
    var list = (PRODUCTS_LIST && PRODUCTS_LIST.length) ? PRODUCTS_LIST : STATIC_FALLBACK_PRODUCTS;
    if (!list.length) return [];
    var n = list.length, offset = (idx * 3) % n, count = Math.min(9, n), out = [];
    for (var i = 0; i < count; i++) out.push(list[(offset + i) % n]);
    return out;
  }

  // ── 优惠券 mock（P0 全门店统一券包）────────────────────────────────────────────
  var COUPON_TEMPLATES = [
    { id: "c1", type: "满减券", name: "到店专享满3000减300", validThru: "2026-09-30", usage: "到店购买联想笔记本电脑满3000元自动抵用，不与其他满减券叠加，每单限用1张。" },
    { id: "c2", type: "实物券", name: "屏幕贴膜安装券（到店核销）", validThru: "2026-09-30", usage: "到店出示券码由店员完成贴膜安装，仅限本人当日到店使用，逾期作废。" },
    { id: "c3", type: "服务券", name: "整机深度清灰服务券", validThru: "2026-10-31", usage: "适用于联想笔记本/台式机整机清灰服务，到店出示券码核销，每台设备限用1次。" },
    { id: "c4", type: "抵用券", name: "以旧换新加价100元抵用券", validThru: "2026-10-31", usage: "旧机估值后叠加抵扣新机订单，需到店由工作人员现场评估旧机成色。" }
  ];
  function findCoupon(id) { return COUPON_TEMPLATES.filter(function (c) { return c.id === id; })[0]; }

  // ── 预约用日期/时段 ─────────────────────────────────────────────────────────
  function reserveDates() {
    var days = [], now = new Date();
    var weekLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    for (var i = 0; i < 7; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      days.push({ key: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()), label: (i === 0 ? "今天" : (i === 1 ? "明天" : weekLabels[d.getDay()])), sub: pad(d.getMonth() + 1) + "/" + pad(d.getDate()) });
    }
    return days;
  }
  function findDateLabel(key) {
    var hit = reserveDates().filter(function (d) { return d.key === key; })[0];
    return hit ? (hit.label + " " + hit.sub) : key;
  }

  // ── 模块内可变态 ────────────────────────────────────────────────────────────
  var currentStores = [];
  var currentCenter = DEFAULT_CENTER;
  var activeStoreIdx = -1;
  var regionState = { province: "", city: "", district: "" };
  var reserveDraft = null;
  var reserveResult = null;
  var wizardDraft = null;
  var lastNavUrl = "";

  // ── 渲染：门店查询 Tab（区划选择 + 地图 + 列表）──────────────────────────────────
  function renderStoreTabHtml() {
    var provinces = provinceList();
    var provOptions = provinces.map(function (p) {
      return '<option value="' + esc(p) + '"' + (regionState.province === p ? " selected" : "") + '>' + esc(p) + "</option>";
    }).join("");
    var cities = regionState.province ? cityList(regionState.province) : [];
    var cityOptions = cities.map(function (c) {
      return '<option value="' + esc(c) + '"' + (regionState.city === c ? " selected" : "") + '>' + esc(c) + "</option>";
    }).join("");
    var districts = (regionState.province && regionState.city) ? districtList(regionState.province, regionState.city) : [];
    var distOptions = districts.map(function (d) {
      return '<option value="' + esc(d) + '"' + (regionState.district === d ? " selected" : "") + '>' + esc(d) + "</option>";
    }).join("");
    var mapSrc = "/api/stores/staticmap?lng=" + encodeURIComponent(currentCenter.lng) + "&lat=" + encodeURIComponent(currentCenter.lat);
    var pins = currentStores.slice(0, 8).map(function (store, idx) {
      var slot = PIN_SLOTS[idx] || [50, 50];
      return '<button type="button" class="lxst-pin" data-lxst-pin="' + idx + '" style="left:' + slot[0] + '%;top:' + slot[1] + '%" aria-label="' + esc(store.name) + '">' + (idx + 1) + "</button>";
    }).join("");
    var rows = currentStores.map(function (store, idx) { return renderStoreListRow(store, idx); }).join("");
    return '' +
      '<div class="lxst-store-wrap">' +
        '<div class="lxst-region-bar">' +
          '<select data-lxst-region="province"><option value="">省份</option>' + provOptions + "</select>" +
          '<select data-lxst-region="city"' + (cities.length ? "" : " disabled") + '><option value="">城市</option>' + cityOptions + "</select>" +
          '<select data-lxst-region="district"' + (districts.length ? "" : " disabled") + '><option value="">区县（可选）</option>' + distOptions + "</select>" +
          '<button type="button" class="lx-p0-btn primary" data-lxst-region-query' + (regionState.province && regionState.city ? "" : " disabled") + ">查询门店</button>" +
        "</div>" +
        '<div class="lxst-split">' +
          '<div class="lxst-map">' +
            '<img src="' + mapSrc + '" alt="门店地图" loading="lazy">' +
            '<div class="lxst-pins">' + pins + "</div>" +
            '<div class="lxst-map-tip">点击门店或地图点位查看详情</div>' +
            '<div class="lxst-storecard" data-lxst-storecard hidden></div>' +
          "</div>" +
          '<div class="lxst-col">' +
            '<div class="lxst-listhd">附近联想授权门店 · 距离排序 · ' + currentStores.length + " 家</div>" +
            '<div class="lxst-list">' + rows + "</div>" +
          "</div>" +
        "</div>" +
      "</div>";
  }
  function renderStoreListRow(store, idx) {
    var st = openState(store);
    var typeLabel = store.type === "service" ? "服务门店" : "销售门店";
    return '<div class="lxst-row' + (idx === activeStoreIdx ? " is-active" : "") + '" data-lxst-store-item="' + idx + '">' +
      '<div class="lxst-row-top"><span class="lxst-row-idx">' + (idx + 1) + '</span><span class="lxst-row-name">' + esc(store.name) + '</span><span class="lxst-row-type ' + store.type + '">' + typeLabel + '</span><span class="lxst-row-dist">' + esc(formatDist(store.dist)) + "</span></div>" +
      '<div class="lxst-row-addr">' + esc(store.address) + "</div>" +
      '<div class="lxst-row-meta"><span class="lxst-row-state' + (st.open ? "" : " closed") + '">' + st.label + "</span><span>" + esc(store.hours) + "</span></div>" +
    "</div>";
  }
  function renderStoreCard(store, idx) {
    var st = openState(store);
    var typeLabel = store.type === "service" ? "服务门店" : "销售门店";
    var products = previewProductsForStore(idx);
    var previewHtml = products.length ? products.map(function (p) {
      return '<div class="lxst-preview-item"><img src="' + esc(imgUrlSafe(p.image_url)) + '" alt=""><span>' + esc(p.name) + "</span></div>";
    }).join("") : '<div class="lxst-preview-empty">暂无门店专属商品</div>';
    var actBtns = (store.type === "sales" ? '<button type="button" class="lx-p0-btn primary" data-lxst-reserve="' + idx + '">预约到店</button>' : "") +
      '<button type="button" class="lx-p0-btn" data-lxst-nav="' + idx + '">导航</button>';
    return '' +
      '<div class="lxst-card-top"><span class="lxst-card-name">' + esc(store.name) + '</span><span class="lxst-row-type ' + store.type + '">' + typeLabel + '</span><button type="button" class="lxst-card-close" data-lxst-card-close aria-label="关闭">×</button></div>' +
      '<div class="lxst-card-addr">' + esc(store.address) + "</div>" +
      '<div class="lxst-card-meta"><span class="lxst-row-state' + (st.open ? "" : " closed") + '">' + st.label + "</span><span>" + esc(store.hours) + "</span>" + (store.tel ? "<span>" + esc(store.tel) + "</span>" : "") + "</div>" +
      '<div class="lxst-card-row"><span class="lxst-card-dist">' + esc(formatDist(store.dist)) + '</span><span class="lxst-card-acts">' + actBtns + "</span></div>" +
      '<div class="lxst-card-divider"></div>' +
      '<div class="lxst-card-preview" data-lxst-preview="' + idx + '"><span class="lxst-preview-label">权益商品</span><div class="lxst-preview-list">' + previewHtml + "</div></div>";
  }
  function openStoreCard(idx) {
    var store = currentStores[idx];
    if (!store) return;
    activeStoreIdx = idx;
    document.querySelectorAll(".lxst-row").forEach(function (row) { row.classList.toggle("is-active", Number(row.getAttribute("data-lxst-store-item")) === idx); });
    document.querySelectorAll(".lxst-pin").forEach(function (pin) { pin.classList.toggle("is-active", Number(pin.getAttribute("data-lxst-pin")) === idx); });
    var slot = document.querySelector(".lxst-storecard");
    if (!slot) return;
    slot.innerHTML = renderStoreCard(store, idx);
    slot.hidden = false;
  }
  function closeStoreCard() {
    activeStoreIdx = -1;
    document.querySelectorAll(".lxst-row.is-active").forEach(function (r) { r.classList.remove("is-active"); });
    document.querySelectorAll(".lxst-pin.is-active").forEach(function (r) { r.classList.remove("is-active"); });
    var slot = document.querySelector(".lxst-storecard");
    if (slot) { slot.hidden = true; slot.innerHTML = ""; }
  }

  // ── 渲染：门店详情页（优惠券 + 商品）─────────────────────────────────────────────
  function renderStoreDetailHtml(store, idx) {
    var st = openState(store);
    var typeLabel = store.type === "service" ? "服务门店" : "销售门店";
    var couponRows = COUPON_TEMPLATES.map(function (c) {
      return '<div class="lxst-coupon-row">' +
        '<div class="lxst-coupon-main"><span class="lxst-coupon-type">' + esc(c.type) + '</span><span class="lxst-coupon-name">' + esc(c.name) + '</span><span class="lxst-coupon-valid">有效期至 ' + esc(c.validThru) + "</span></div>" +
        '<div class="lxst-coupon-acts"><button type="button" class="lxst-coupon-detail" data-lxst-coupon-detail="' + esc(c.id) + '">详情</button><button type="button" class="lxst-coupon-use" data-lxst-coupon-use="' + esc(c.id) + '" data-lxst-coupon-store="' + idx + '">去使用</button></div>' +
      "</div>";
    }).join("");
    var prodCards = detailProductsForStore(idx).map(function (p) {
      return '<div class="lxst-prod-card"><img src="' + esc(imgUrlSafe(p.image_url)) + '" alt=""><span class="lxst-prod-name">' + esc(p.name) + '</span><span class="lxst-prod-price">¥' + esc(moneyText(p.price)) + "</span></div>";
    }).join("");
    return '' +
      '<div class="lxst-detail-wrap">' +
        '<div class="lxst-detail-basic">' +
          '<div class="lxst-detail-top"><span class="lxst-detail-name">' + esc(store.name) + '</span><span class="lxst-row-type ' + store.type + '">' + typeLabel + "</span></div>" +
          '<div class="lxst-detail-addr">' + esc(store.address) + "</div>" +
          '<div class="lxst-detail-meta"><span class="lxst-row-state' + (st.open ? "" : " closed") + '">' + st.label + "</span><span>" + esc(store.hours) + "</span>" + (store.tel ? "<span>" + esc(store.tel) + "</span>" : "") + (store.dist != null ? "<span>距您 " + esc(formatDist(store.dist)) + "</span>" : "") + "</div>" +
        "</div>" +
        '<div class="lxst-detail-section"><div class="lxst-detail-h">优惠券</div><div class="lxst-coupon-list">' + couponRows + "</div></div>" +
        '<div class="lxst-detail-section"><div class="lxst-detail-h">商品</div><div class="lxst-prod-grid">' + prodCards + "</div></div>" +
      "</div>";
  }
  function openStoreDetail(idx) {
    var store = currentStores[idx];
    if (!store) return;
    var a = api();
    if (typeof a.lxOpenInfoTab === "function") a.lxOpenInfoTab("store-detail-" + idx, store.name, renderStoreDetailHtml(store, idx));
  }

  // ── 优惠券弹窗（不触发左侧回答）─────────────────────────────────────────────────
  function openCouponDetailModal(id) {
    var c = findCoupon(id); if (!c) return;
    var a = api();
    var html = '<div class="lxst-coupon-detail-modal">' +
      '<div class="lxst-cdm-row"><span>券类型</span><b>' + esc(c.type) + "</b></div>" +
      '<div class="lxst-cdm-row"><span>券名称</span><b>' + esc(c.name) + "</b></div>" +
      '<div class="lxst-cdm-row"><span>有效期</span><b>至 ' + esc(c.validThru) + "</b></div>" +
      '<div class="lxst-cdm-usage"><span>使用说明</span><p>' + esc(c.usage) + "</p></div>" +
    "</div>";
    if (typeof a.openModal === "function") a.openModal(c.name, html);
  }
  function openCouponCodeModal(id, storeIdx) {
    var c = findCoupon(id); if (!c) return;
    var store = currentStores[Number(storeIdx)];
    var code = ("LX" + String(id || "").toUpperCase() + Date.now()).slice(0, 16);
    var a = api();
    var html = '<div class="lxst-coupon-code-modal">' +
      '<div class="lxst-ccm-head"><span class="lxst-ccm-name">' + esc(c.name) + '</span><span class="lxst-ccm-state">待使用</span></div>' +
      '<div class="lxst-ccm-row">到期时间：' + esc(c.validThru) + "</div>" +
      '<div class="lxst-barcode"><div class="lxst-barcode-bars"></div><span class="lxst-barcode-code">' + esc(code) + "</span></div>" +
      '<p class="lxst-ccm-tip">请到店出示此券码由店员核销，每张券限用一次，过期作废。</p>' +
      (store ? '<div class="lxst-ccm-store"><span>适用门店</span><b>' + esc(store.name) + "</b><em>" + esc(formatDist(store.dist)) + "</em></div>" : "") +
    "</div>";
    if (typeof a.openModal === "function") a.openModal("券码", html);
  }

  // ── 预约：确认弹窗 ─────────────────────────────────────────────────────────
  function renderConfirmHtml() {
    var d = reserveDraft;
    return '<div class="lxst-confirm">' +
      '<div class="lxst-confirm-row"><span>预约门店</span><b>' + esc(d.store.name) + "</b></div>" +
      '<div class="lxst-confirm-row"><span>到店时间</span><b>' + esc(findDateLabel(d.date)) + " " + esc(d.timeSlot) + "</b></div>" +
      '<div class="lxst-confirm-row"><span>预约目的</span><b>' + esc(d.purpose || "到店选购/咨询") + "</b></div>" +
      '<p class="lxst-confirm-tip">如需调整门店、时间或目的，请点击下方「修改预约信息」。</p>' +
      '<div class="lxst-confirm-acts">' +
        '<button type="button" class="lx-p0-btn" data-lxst-modify>修改预约信息</button>' +
        '<button type="button" class="lx-p0-btn primary" data-lxst-confirm-reserve>确认预约</button>' +
      "</div>" +
    "</div>";
  }
  function openReserveConfirmModal() {
    if (!reserveDraft) return;
    var a = api();
    if (typeof a.openModal === "function") a.openModal("预约信息确认", renderConfirmHtml());
  }

  // ── 预约：修改三步向导（门店/时间/目的），完成后回到确认页 ────────────────────────
  function openWizardStep1() {
    wizardDraft = Object.assign({}, reserveDraft);
    renderWizardStep1();
  }
  function renderWizardStep1() {
    var rows = currentStores.map(function (store, idx) {
      var checked = wizardDraft.store && wizardDraft.store.name === store.name;
      return '<label class="lxst-wiz-store' + (checked ? " is-sel" : "") + '" data-lxst-wiz-store="' + idx + '">' +
        '<input type="radio" name="lxst-wiz-store"' + (checked ? " checked" : "") + '>' +
        '<span class="nm">' + esc(store.name) + '</span><span class="dist">' + esc(formatDist(store.dist)) + "</span>" +
      "</label>";
    }).join("");
    var html = '<div class="lxst-wizard"><div class="lxst-wiz-h">选择预约门店</div><div class="lxst-wiz-store-list">' + rows + "</div>" +
      '<div class="lxst-wiz-acts"><button type="button" class="lx-p0-btn" data-lxst-wizard-back="confirm">返回</button><button type="button" class="lx-p0-btn primary" data-lxst-wizard-next="2">下一步</button></div></div>';
    api().openModal("修改预约门店", html);
  }
  function renderWizardStep2() {
    var days = reserveDates();
    var dayHtml = days.map(function (d) {
      return '<button type="button" class="lxst-wiz-day' + (wizardDraft.date === d.key ? " is-sel" : "") + '" data-lxst-wiz-date="' + d.key + '"><b>' + esc(d.label) + "</b><span>" + esc(d.sub) + "</span></button>";
    }).join("");
    var slotHtml = TIME_SLOTS.map(function (s) {
      return '<button type="button" class="lxst-wiz-slot' + (wizardDraft.timeSlot === s ? " is-sel" : "") + '" data-lxst-wiz-slot="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
    var html = '<div class="lxst-wizard"><div class="lxst-wiz-h">选择到店时间</div>' +
      '<div class="lxst-wiz-days">' + dayHtml + "</div>" +
      '<div class="lxst-wiz-slots">' + slotHtml + "</div>" +
      '<div class="lxst-wiz-acts"><button type="button" class="lx-p0-btn" data-lxst-wizard-back="1">返回</button><button type="button" class="lx-p0-btn primary" data-lxst-wizard-next="3">下一步</button></div></div>';
    api().openModal("修改到店时间", html);
  }
  function renderWizardStep3() {
    var html = '<div class="lxst-wizard"><div class="lxst-wiz-h">填写预约目的</div>' +
      '<textarea class="lxst-wiz-purpose" data-lxst-wiz-purpose placeholder="例如：到店咨询ThinkPad新款配置">' + esc(wizardDraft.purpose || "") + "</textarea>" +
      '<div class="lxst-wiz-acts"><button type="button" class="lx-p0-btn" data-lxst-wizard-back="2">返回</button><button type="button" class="lx-p0-btn primary" data-lxst-wizard-done>确认</button></div></div>';
    api().openModal("修改预约目的", html);
  }

  // ── 预约：结果 ─────────────────────────────────────────────────────────────
  function renderSuccessHtml() {
    var r = reserveResult;
    return '<div class="lxst-success">' +
      '<div class="lxst-success-route"><span>路线图预览（演示占位）</span></div>' +
      '<div class="lxst-success-store"><b>' + esc(r.store.name) + "</b><span>" + esc(r.store.address) + "</span></div>" +
      '<button type="button" class="lx-p0-btn primary lxst-success-nav" data-lxst-start-nav>开始导航</button>' +
      '<div class="lxst-success-row"><span>预约编号</span><b>' + esc(r.bookingId) + "</b></div>" +
      '<div class="lxst-success-row"><span>到店时间</span><b>' + esc(findDateLabel(r.date)) + " " + esc(r.timeSlot) + "</b></div>" +
      '<div class="lxst-success-row"><span>预约目的</span><b>' + esc(r.purpose || "到店选购/咨询") + "</b></div>" +
    "</div>";
  }
  function openReserveSuccessModal() {
    if (!reserveResult) return;
    api().openModal("预约成功", renderSuccessHtml());
  }

  // ── 流程：发起预约 ─────────────────────────────────────────────────────────
  function startReservation(idx) {
    var store = currentStores[idx];
    if (!store || store.type !== "sales") return;
    addMsgUser("预约" + store.name);
    var days = reserveDates();
    runSkillTrace("门店预约服务", function () {
      var text = "已为你核实「" + store.name + "」的门店信息：营业时间 " + store.hours + "，联系电话 " + (store.tel || "暂未公开") + "。请在预约确认框中核对到店时间与预约目的，确认后即可完成预约。";
      var node = addMsgAI(text);
      var wait = node && node._typingDone ? node._typingDone : Promise.resolve();
      wait.then(function () {
        var a = api();
        var card = typeof a.renderPageCta === "function" ? a.renderPageCta({ title: "预约信息待确认", desc: "点击查看并确认预约信息", attr: 'data-lxst-reopen="reserve-confirm"' }) : "";
        appendAiHtml(node, card);
        reserveDraft = { store: store, date: days[0].key, timeSlot: TIME_SLOTS[0], purpose: "到店选购/咨询" };
        openReserveConfirmModal();
      });
    });
  }
  function confirmReservation() {
    var d = reserveDraft;
    if (!d) return;
    var a = api();
    if (typeof a.closeModal === "function") a.closeModal();
    addMsgUser("确认预约" + d.store.name + "，到店时间" + findDateLabel(d.date) + " " + d.timeSlot);
    runSkillTrace("门店预约服务", function () {
      var bookingId = "YD" + String(Date.now()).slice(-8);
      var text = "预约成功！你已成功预约「" + d.store.name + "」，到店时间为 " + findDateLabel(d.date) + " " + d.timeSlot + "，预约目的：" + (d.purpose || "到店选购/咨询") + "。预约编号 " + bookingId + "，请准时到店，如需变更可重新预约。";
      var node = addMsgAI(text);
      var wait = node && node._typingDone ? node._typingDone : Promise.resolve();
      wait.then(function () {
        var card = typeof a.renderPageCta === "function" ? a.renderPageCta({ title: "预约成功", desc: "预约编号 " + bookingId, attr: 'data-lxst-reopen="reserve-success"' }) : "";
        appendAiHtml(node, card);
        reserveResult = { store: d.store, date: d.date, timeSlot: d.timeSlot, purpose: d.purpose, bookingId: bookingId };
        openReserveSuccessModal();
      });
    });
  }

  // ── 流程：导航 ─────────────────────────────────────────────────────────────
  function buildBaiduUrl(store) {
    return "https://api.map.baidu.com/marker?location=" + encodeURIComponent(store.lat + "," + store.lng) + "&title=" + encodeURIComponent(store.name || "联想门店") + "&content=" + encodeURIComponent(store.address || "") + "&output=html&coord_type=bd09ll&src=lexiang";
  }
  function startNavigate(storeOrIdx) {
    var store = typeof storeOrIdx === "number" ? currentStores[storeOrIdx] : storeOrIdx;
    if (!store) return;
    addMsgUser("导航去" + store.name);
    runSkillTrace("门店导航服务", function () {
      var text = "已为你打开百度地图，并将导航目的地设置为「" + store.name + "」（" + store.address + "）。你可以在新窗口中选择驾车、公交或步行路线。";
      var node = addMsgAI(text);
      var wait = node && node._typingDone ? node._typingDone : Promise.resolve();
      wait.then(function () {
        var a = api();
        var card = typeof a.renderPageCta === "function" ? a.renderPageCta({ title: "百度地图导航已打开", desc: store.name, attr: 'data-lxst-reopen="navigate"' }) : "";
        appendAiHtml(node, card);
        lastNavUrl = buildBaiduUrl(store);
        window.open(lastNavUrl, "_blank", "noopener");
      });
    });
  }

  // ── 流程：查询（默认 / 省市区）────────────────────────────────────────────────
  function openStoreTab() {
    var a = api();
    if (typeof a.lxOpenInfoTab === "function") a.lxOpenInfoTab("stores", "附近门店", renderStoreTabHtml());
  }
  function runDefaultQuery() {
    addMsgUser("附近有什么联想门店？");
    runSkillTrace("门店查询服务", function () {
      Promise.all([fetchDefaultStores(), ensureDemoProducts()]).then(function (results) {
        var ctx = results[0];
        PRODUCTS_LIST = results[1];
        currentStores = ctx.stores; currentCenter = ctx.center; activeStoreIdx = -1;
        regionState = { province: "", city: "", district: "" };
        var first = currentStores[0];
        var text = "已为你查询到附近 " + currentStores.length + " 家联想授权门店，按距离由近到远为你排列。最近的是「" + first.name + "」，距离约 " + formatDist(first.dist) + "，地址：" + first.address + "。";
        var node = addMsgAI(text);
        var wait = node && node._typingDone ? node._typingDone : Promise.resolve();
        wait.then(function () {
          var a = api();
          var card = typeof a.renderPageCta === "function" ? a.renderPageCta({ title: "附近门店查询", desc: "共 " + currentStores.length + " 家门店 · 距离排序", attr: 'data-lx-open-tab="info:stores" aria-label="查看附近门店查询结果"' }) : "";
          appendAiHtml(node, card);
          if (typeof a.lxRevealContent === "function") a.lxRevealContent();
          openStoreTab();
        });
      });
    });
  }
  function queryByRegion(province, city, district) {
    var label = district ? (province + city + district) : (province + city);
    addMsgUser("查询" + label + "的联想门店");
    runSkillTrace("门店查询服务", function () {
      ensureDemoProducts().then(function (products) {
        PRODUCTS_LIST = products;
        var ctx = generateRegionStores(province, city, district);
        currentStores = ctx.stores; currentCenter = ctx.center; activeStoreIdx = -1;
        regionState = { province: province, city: city, district: district };
        var first = currentStores[0];
        var text = "已为你查询「" + label + "」的联想授权门店，共找到 " + currentStores.length + " 家，按距离由近到远排列，最近的是「" + first.name + "」。";
        var node = addMsgAI(text);
        var wait = node && node._typingDone ? node._typingDone : Promise.resolve();
        wait.then(function () {
          var a = api();
          var card = typeof a.renderPageCta === "function" ? a.renderPageCta({ title: "附近门店查询", desc: label + " · 共" + currentStores.length + "家门店", attr: 'data-lx-open-tab="info:stores" aria-label="查看门店查询结果"' }) : "";
          appendAiHtml(node, card);
          if (typeof a.lxRevealContent === "function") a.lxRevealContent();
          openStoreTab();
        });
      });
    });
  }

  // ── sendChat 接线：自然语言默认门店查询（预约/导航均由按钮直接触发，不走此入口）──────
  var RE_SHORT = /^\s*(打开|查看?|看看?|去|进)?(附近)?(门店|实体店|线下店|体验店|专卖店|服务网点|服务中心)(查询|页面|列表)?\s*$/;
  var RE_NATURAL = /(附近|周边|这附近|我附近).{0,6}(门店|体验店|专卖店|服务网点|服务中心|实体店)|门店.{0,4}(在哪|哪里|查询|地址|列表)/;
  function isDefaultStoreQuery(t) {
    if (/预约|导航|库存|钻石|会员/.test(t)) return false;
    return RE_SHORT.test(t) || RE_NATURAL.test(t);
  }
  async function handleQuery(text) {
    var t = String(text || "").trim();
    if (!t || t.length > 60) return false;
    if (isDefaultStoreQuery(t)) { runDefaultQuery(); return true; }
    return false;
  }

  // ── 事件委托 ───────────────────────────────────────────────────────────────
  document.addEventListener("change", function (event) {
    var sel = event.target.closest && event.target.closest("[data-lxst-region]");
    if (!sel) return;
    var wrap = sel.closest(".lxst-region-bar");
    if (!wrap) return;
    var kind = sel.getAttribute("data-lxst-region");
    var provSel = wrap.querySelector('[data-lxst-region="province"]');
    var citySel = wrap.querySelector('[data-lxst-region="city"]');
    var distSel = wrap.querySelector('[data-lxst-region="district"]');
    var btn = wrap.querySelector("[data-lxst-region-query]");
    if (kind === "province") {
      var cities = cityList(provSel.value);
      citySel.innerHTML = '<option value="">城市</option>' + cities.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
      citySel.disabled = !cities.length;
      distSel.innerHTML = '<option value="">区县（可选）</option>';
      distSel.disabled = true;
      btn.disabled = true;
    } else if (kind === "city") {
      var districts = districtList(provSel.value, citySel.value);
      distSel.innerHTML = '<option value="">区县（可选）</option>' + districts.map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + "</option>"; }).join("");
      distSel.disabled = !districts.length;
      btn.disabled = !citySel.value;
    }
  });

  document.addEventListener("click", function (event) {
    var t = event.target, el;
    if ((el = t.closest("[data-lxst-store-item]"))) { openStoreCard(Number(el.getAttribute("data-lxst-store-item"))); return; }
    if ((el = t.closest("[data-lxst-pin]"))) { openStoreCard(Number(el.getAttribute("data-lxst-pin"))); return; }
    if ((el = t.closest("[data-lxst-card-close]"))) { closeStoreCard(); return; }
    if ((el = t.closest("[data-lxst-reserve]"))) { startReservation(Number(el.getAttribute("data-lxst-reserve"))); return; }
    if ((el = t.closest("[data-lxst-nav]"))) { startNavigate(Number(el.getAttribute("data-lxst-nav"))); return; }
    if ((el = t.closest("[data-lxst-preview]"))) { openStoreDetail(Number(el.getAttribute("data-lxst-preview"))); return; }
    if ((el = t.closest("[data-lxst-region-query]"))) {
      if (el.disabled) return;
      var wrap = el.closest(".lxst-region-bar");
      var province = wrap.querySelector('[data-lxst-region="province"]').value;
      var city = wrap.querySelector('[data-lxst-region="city"]').value;
      var district = wrap.querySelector('[data-lxst-region="district"]').value;
      if (!province || !city) return;
      queryByRegion(province, city, district);
      return;
    }
    if ((el = t.closest("[data-lxst-coupon-detail]"))) { openCouponDetailModal(el.getAttribute("data-lxst-coupon-detail")); return; }
    if ((el = t.closest("[data-lxst-coupon-use]"))) { openCouponCodeModal(el.getAttribute("data-lxst-coupon-use"), el.getAttribute("data-lxst-coupon-store")); return; }
    if ((el = t.closest("[data-lxst-modify]"))) { openWizardStep1(); return; }
    if ((el = t.closest("[data-lxst-confirm-reserve]"))) { confirmReservation(); return; }
    if ((el = t.closest("[data-lxst-wiz-store]"))) { wizardDraft.store = currentStores[Number(el.getAttribute("data-lxst-wiz-store"))]; renderWizardStep1(); return; }
    if ((el = t.closest("[data-lxst-wiz-date]"))) { wizardDraft.date = el.getAttribute("data-lxst-wiz-date"); renderWizardStep2(); return; }
    if ((el = t.closest("[data-lxst-wiz-slot]"))) { wizardDraft.timeSlot = el.getAttribute("data-lxst-wiz-slot"); renderWizardStep2(); return; }
    if ((el = t.closest("[data-lxst-wizard-back]"))) {
      var to = el.getAttribute("data-lxst-wizard-back");
      if (to === "confirm") openReserveConfirmModal();
      else if (to === "1") renderWizardStep1();
      else if (to === "2") renderWizardStep2();
      return;
    }
    if ((el = t.closest("[data-lxst-wizard-next]"))) {
      var step = el.getAttribute("data-lxst-wizard-next");
      if (step === "2") renderWizardStep2();
      else if (step === "3") renderWizardStep3();
      return;
    }
    if ((el = t.closest("[data-lxst-wizard-done]"))) {
      var ta = document.querySelector("[data-lxst-wiz-purpose]");
      if (ta) wizardDraft.purpose = ta.value.trim();
      reserveDraft = wizardDraft;
      wizardDraft = null;
      openReserveConfirmModal();
      return;
    }
    if ((el = t.closest("[data-lxst-start-nav]"))) { startNavigate(reserveResult ? reserveResult.store : null); return; }
    if ((el = t.closest("[data-lxst-reopen]"))) {
      var kind = el.getAttribute("data-lxst-reopen");
      if (kind === "reserve-confirm") openReserveConfirmModal();
      else if (kind === "reserve-success") openReserveSuccessModal();
      else if (kind === "navigate" && lastNavUrl) window.open(lastNavUrl, "_blank", "noopener");
      return;
    }
  });

  window.__lxStore = { handleQuery: handleQuery, runDefaultQuery: runDefaultQuery, queryByRegion: queryByRegion };
})();
