// P0 商品详情页结构对齐：商品标签 / 核心配置摘要 / 卖点标签 / 服务保障说明弹层 / 用户评价区
// （综合评分、评分分布、评价标签、评价卡横向轮播）。独立文件，不改 app.js 主逻辑，只监听
// openProduct 渲染完成后广播的 lx:product-detail-rendered 事件，按 window.__lxAgentAPI 暴露的
// openModal/closeModal/getDisplaySpecRows 复用统一弹窗与规格提取，不重造第二套解析。
// 评价数据当前是按 SKU 确定性生成的 mock（结构对齐真实接口字段：score/bars/tags/cards），
// 后续接真实评价接口时只需替换 generateReviewData() 内部实现，渲染层不用动。
(function () {
  "use strict";

  if (window.__lxProductDetailLoaded) return;
  window.__lxProductDetailLoaded = true;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function detailRoot() {
    return document.querySelector(".product-detail");
  }

  // ── 确定性 mock 随机源：同一 SKU 每次渲染结果一致，切换配置来回切也不闪烁 ──────────
  function lxPdHash(str) {
    var h = 0, s = String(str || "");
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h >>> 0;
  }
  function lxPdSeededRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function normalizeSpecs(raw) {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try { var parsed = JSON.parse(raw); return parsed && typeof parsed === "object" ? parsed : {}; } catch (e) { return {}; }
  }

  // biz 政企商品（服务器/工作站/服务产品/ThinkStation 等）不展示消费端星级评分，
  // 与 app.js 的 lxIsBizProduct 判定口径保持一致（该函数未导出，这里按同规则本地判断）
  function isBizCategory(product) {
    var category = (product && product.category) || "";
    var name = (product && product.name) || "";
    return ["服务器", "工作站", "服务产品"].indexOf(category) !== -1 || /开天|昭阳|启天|问天|ThinkStation|ThinkSystem/i.test(name);
  }

  // ── 商品标签（AI推荐/热销/国补/教育优惠，不可点）──────────────────────────────────
  function isHotSku(sku) {
    // 暂无真实销量字段，按 sku 哈希固定出约 1/5 商品标"热销"，同一商品刷新不跳变；
    // 接真实销量接口后此处直接换成 sales_rank/sold_count 阈值判断即可
    return (lxPdHash(sku || "") % 5) === 0;
  }
  function deriveBadges(product) {
    var specs = normalizeSpecs(product && product.specs);
    var text = [product && product.name, product && product.description, (product && product.promotion_tags || []).join(" ")].join(" ");
    var badges = [];
    var isAi = specs.is_ai === "Y" || specs.is_ai === true || /\bAI\b|AI元启|AI\s*PC/i.test(text);
    if (isAi) badges.push({ cls: "detail-badge-ai", text: "AI 推荐" });
    if (isHotSku(product && product.sku)) badges.push({ cls: "detail-badge-hot", text: "热销" });
    if (/国补|国家补贴|政府补贴/.test(text)) badges.push({ cls: "detail-badge-guobu", text: "国补" });
    if (/教育特惠|教育优惠|学生认证|校园/.test(text)) badges.push({ cls: "detail-badge-edu", text: "教育优惠" });
    return badges;
  }
  function renderBadges(product) {
    var box = document.querySelector(".detail-badges");
    if (!box) return;
    var badges = deriveBadges(product);
    box.hidden = badges.length === 0;
    box.innerHTML = badges.map(function (b) {
      return '<span class="' + b.cls + '">' + escapeHtml(b.text) + "</span>";
    }).join("");
  }

  // ── 核心配置摘要（处理器/系统/尺寸/内存/硬盘/显卡，缺失字段不展示）────────────────
  // 本地货盘 specs 常只有运营字段（brand/lvl1/mtm 等），硬件参数在 description 配置串里
  // （如「英特尔® 酷睿™ Ultra 7 251HX丨Windows 11丨16英寸丨16GB丨1TB SSD丨RTX5060 8G丨碳晶黑」），
  // 与 app.js 的 lxSpecsFromDescription 解法一致，这里独立实现一份，不跨文件伸手拿私有函数
  function parseCoreConfig(product) {
    var specs = normalizeSpecs(product && product.specs);
    var out = {};
    var pick = function () {
      for (var i = 0; i < arguments.length; i++) {
        var v = specs[arguments[i]];
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return "";
    };
    out.cpu = pick("cpu", "processor", "处理器");
    out.os = pick("os", "system", "系统");
    out.screen = pick("screen_size", "screen", "尺寸");
    out.ram = pick("ram", "memory", "内存");
    out.storage = pick("storage", "disk", "硬盘");
    out.gpu = pick("gpu", "graphics", "显卡");
    var segs = String((product && product.description) || "").split(/丨|\||\//).map(function (s) { return s.trim(); }).filter(function (s) { return s && s.length <= 40; });
    segs.forEach(function (seg) {
      if (!out.cpu && /酷睿|锐龙|Ultra\s*[3579X]|i[3579][- ]?\d{3,5}[A-Z]*|R[3579][- ]?\d{3,4}[A-Z]*|骁龙|天玑|龙芯/i.test(seg)) out.cpu = seg;
      else if (!out.gpu && /RTX|GTX|锐炫|Arc\s*\d|独显|集显|显卡/i.test(seg)) out.gpu = seg;
      else if (!out.os && /Windows|Win\s*1[01]|麒麟|UOS|统信/i.test(seg)) out.os = seg;
      else if (!out.screen && /英寸/.test(seg)) out.screen = seg;
      else if (!out.storage && /SSD|固态|\d(\.\d)?\s*TB|512\s*G[B]?(?!\s*内存)/i.test(seg)) out.storage = seg;
      else if (!out.ram && /^\d{1,3}\s*GB?$|内存/i.test(seg)) out.ram = seg;
    });
    return out;
  }
  var CONFIG_CHIP_ORDER = [["cpu", "处理器"], ["os", "系统"], ["screen", "尺寸"], ["ram", "内存"], ["storage", "硬盘"], ["gpu", "显卡"]];
  function ensureConfigSummaryNode() {
    var info = document.querySelector(".product-detail .detail-info");
    if (!info) return null;
    var node = info.querySelector(".detail-config-summary");
    if (node) return node;
    node = document.createElement("div");
    node.className = "detail-config-summary";
    node.setAttribute("aria-label", "核心配置摘要");
    var reason = info.querySelector(".detail-fit-reason");
    var summary = info.querySelector(".detail-summary");
    if (reason) info.insertBefore(node, reason);
    else if (summary) summary.parentNode.insertBefore(node, summary.nextSibling);
    else info.insertBefore(node, info.firstChild);
    return node;
  }
  function renderConfigSummary(product) {
    var node = ensureConfigSummaryNode();
    if (!node) return;
    var config = parseCoreConfig(product);
    var chips = CONFIG_CHIP_ORDER
      .map(function (pair) { return [pair[1], config[pair[0]]]; })
      .filter(function (pair) { return pair[1]; })
      .map(function (pair) { return '<span class="detail-config-chip">' + escapeHtml(pair[0]) + "：" + escapeHtml(pair[1].slice(0, 28)) + "</span>"; });
    node.hidden = chips.length === 0;
    node.innerHTML = chips.join("");
  }

  // ── 商品卖点标签（不可点，按品类/规格关键词生成）─────────────────────────────────
  function deriveSellPoints(product) {
    var specs = normalizeSpecs(product && product.specs);
    var text = [product && product.name, product && product.description].join(" ");
    var isAi = specs.is_ai === "Y" || specs.is_ai === true || /\bAI\b|AI元启|AI\s*PC/i.test(text);
    var points = [];
    if (isAi) points.push("AI 智能体验");
    if (/轻薄|1\.\d\s*kg|轻至/i.test(text)) points.push("轻薄便携");
    if (/1[0-9]{2}\s*Hz|高刷/i.test(text)) points.push("高刷屏幕");
    if (/OLED|2\.5K|2\.8K|4K|超清/i.test(text)) points.push("超清视效");
    if (/RTX|独显|电竞/i.test(text)) points.push("电竞性能");
    if (isBizCategory(product)) points.push("企业级稳定");
    if (/续航|快充/i.test(text)) points.push("长效续航");
    if (points.length < 4) points.push("官方服务");
    return points.slice(0, 4);
  }
  function renderSellPoints(product) {
    var box = document.querySelector(".product-detail .detail-tags");
    if (!box) return;
    var points = deriveSellPoints(product);
    box.innerHTML = points.map(function (p) { return '<span class="detail-tag">' + escapeHtml(p) + "</span>"; }).join("");
  }

  // ── 服务保障卡片：点击查看说明弹层（复用 window.__lxAgentAPI.openModal 统一弹窗组件）──
  var SERVICE_INFO = [
    { title: "官方正品", body: "所有商品均由联想官方仓库直发，全新正品，支持官网订单联查，假一赔十。" },
    { title: "180天只换不修", body: "收货起 180 天内出现非人为性能故障，可直接换新、无需反复寄修，具体政策以商品页面标注为准。" },
    { title: "14天无理由退换", body: "收货起 14 天内，商品不影响二次销售即可申请无理由退换，运费规则以官方售后政策为准。" }
  ];
  document.addEventListener("click", function (event) {
    var item = event.target.closest && event.target.closest(".product-detail .detail-service .service-item");
    if (!item || !item.parentElement) return;
    var idx = Array.prototype.indexOf.call(item.parentElement.children, item);
    var info = SERVICE_INFO[idx];
    if (!info || !window.__lxAgentAPI || typeof window.__lxAgentAPI.openModal !== "function") return;
    window.__lxAgentAPI.openModal(info.title, '<div class="lx-pd-service-modal"><p>' + escapeHtml(info.body) + "</p></div>");
  });

  // ── 用户评价区 mock 数据：按 SKU 生成评分/星级分布/标签/评价卡，含点赞数 ─────────
  var REVIEW_TEMPLATE_POOL = [
    { title: "办公体验顺滑", body: "日常办公、网页多开和视频会议都比较稳定，开机和应用启动速度也让人满意，整体响应很快。", tags: ["性能强", "办公流畅"] },
    { title: "外观和质感不错", body: "机身做工扎实，边框缝隙控制得很好，屏幕显示细腻，拿到手的质感比预期更稳。", tags: ["做工精致", "屏幕好"] },
    { title: "服务沟通清楚", body: "下单前通过联想乐享确认了配置和优惠，客服回复很及时，购买路径比较清晰，不用来回问。", tags: ["服务好", "沟通顺畅"] },
    { title: "配置匹配需求", body: "核心配置覆盖学习、办公和娱乐需求，继续对比同价位商品也方便，选配置没走弯路。", tags: ["性价比高", "配置均衡"] },
    { title: "屏幕观感舒适", body: "长时间浏览文档和网页时观感比较舒服，亮度和清晰度能满足日常使用，晚上用也不刺眼。", tags: ["屏幕好", "护眼"] },
    { title: "物流包装完整", body: "发货和物流状态同步及时，包装保护到位，拆箱后商品状态正常，没有磕碰问题。", tags: ["物流快", "包装好"] },
    { title: "价格说明透明", body: "优惠、补贴和活动信息能提前确认，实际下单前心里更有底，没有额外隐藏费用。", tags: ["价格透明", "服务好"] },
    { title: "适合移动办公", body: "重量和尺寸比较适合通勤携带，会议、出差和临时办公切换顺手，单手拿也不吃力。", tags: ["便携", "轻薄便携"] },
    { title: "运行表现稳定", body: "常用软件启动快，多任务切换没有明显卡顿，长时间使用也没有发热降频的问题。", tags: ["性能强", "稳定"] },
    { title: "续航符合预期", body: "外出使用能覆盖半天以上轻办公，搭配快充后使用压力不大，出差一天基本够用。", tags: ["续航好", "快充"] },
    { title: "接口够日常用", body: "常用外设连接比较方便，办公桌面和移动场景都能兼顾，不用额外配转接头。", tags: ["接口全", "便携"] },
    { title: "售后政策放心", body: "官方渠道和售后服务说明清楚，后续维修、换新咨询更安心，客服响应也很快。", tags: ["服务好", "售后放心"] },
    { title: "适合学生使用", body: "学习资料、网课、轻办公和娱乐都能覆盖，预算内选择比较均衡，性价比不错。", tags: ["性价比高", "适合学生"] },
    { title: "家用场景合适", body: "家人日常浏览、视频、网课和资料整理都够用，上手门槛低，长辈使用也没问题。", tags: ["易上手", "家用合适"] },
    { title: "对比决策方便", body: "联想乐享能继续做同类商品对比，选配置和看优惠更省时间，决策效率高很多。", tags: ["对比方便", "服务好"] },
    { title: "整体满意度高", body: "从选购到下单的流程比较顺，商品表现和官方服务都符合预期，会继续推荐给朋友。", tags: ["整体满意", "服务好"] }
  ];
  var SURNAMES = "李王张刘陈杨黄赵周吴徐孙马朱胡林何高";
  var reviewDataCache = new Map();
  function generateReviewData(product) {
    var sku = (product && product.sku) || (product && product.name) || "lx-product";
    if (reviewDataCache.has(sku)) return reviewDataCache.get(sku);
    var rng = lxPdSeededRandom(lxPdHash(sku));
    var rating = null;
    if (!isBizCategory(product)) {
      var score = Math.round((4.5 + rng() * 0.45) * 10) / 10;
      var frac = (score - 4.5) / 0.45;
      var s5 = Math.round(58 + frac * 26 + rng() * 4);
      var s4 = Math.round(8 + (1 - frac) * 14 + rng() * 4);
      var s3 = Math.round(2 + rng() * 3);
      var s2 = Math.round(rng() * 2);
      var s1 = Math.round(rng() * 1);
      var sum = s5 + s4 + s3 + s2 + s1 || 1;
      var scale = 100 / sum;
      s5 = Math.round(s5 * scale); s4 = Math.round(s4 * scale); s3 = Math.round(s3 * scale); s2 = Math.round(s2 * scale);
      s1 = Math.max(0, 100 - s5 - s4 - s3 - s2);
      rating = { score: score, bars: [["5", s5], ["4", s4], ["3", s3], ["2", s2], ["1", s1]] };
    }
    var count = 3 + Math.floor(rng() * 4); // 3-6 条
    var used = {};
    var cards = [];
    var today = new Date(2026, 7, 20); // 与会话当前日期口径一致（2026-08-20），避免评价日期出现"未来"
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(rng() * REVIEW_TEMPLATE_POOL.length);
      var guard = 0;
      while (used[idx] && guard < REVIEW_TEMPLATE_POOL.length) { idx = (idx + 1) % REVIEW_TEMPLATE_POOL.length; guard++; }
      used[idx] = true;
      var tpl = REVIEW_TEMPLATE_POOL[idx];
      var daysAgo = Math.floor(rng() * 60) + i * 3;
      var d = new Date(today.getTime() - daysAgo * 86400000);
      var dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
      var num = Math.floor(rng() * 9) + 1;
      cards.push({
        title: tpl.title,
        body: tpl.body,
        tags: tpl.tags,
        user: "用户_" + surname + "***" + num,
        date: dateStr,
        likes: Math.floor(rng() * 80) + 6
      });
    }
    cards.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var freq = {};
    cards.forEach(function (c) { c.tags.forEach(function (t) { freq[t] = (freq[t] || 0) + 1; }); });
    var topTags = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 4);
    var data = { rating: rating, cards: cards, tags: topTags.length ? topTags : REVIEW_TEMPLATE_POOL[0].tags };
    reviewDataCache.set(sku, data);
    return data;
  }

  function renderRating(data) {
    var card = document.querySelector(".product-detail .detail-review-rating-card");
    if (!card) return;
    if (!data.rating) { card.hidden = true; return; }
    card.hidden = false;
    card.setAttribute("aria-label", "综合评分 " + data.rating.score + " 分");
    var scoreEl = card.querySelector(".detail-review-rating-score strong");
    if (scoreEl) scoreEl.textContent = String(data.rating.score);
    var rows = card.querySelectorAll(".detail-review-rating-row");
    data.rating.bars.forEach(function (bar, i) {
      var row = rows[i];
      if (!row) return;
      var star = bar[0], pct = bar[1];
      var span = row.querySelector("span"), b = row.querySelector("b"), em = row.querySelector("em");
      if (span) span.textContent = star + "★";
      if (b) b.style.width = pct + "%";
      if (em) em.textContent = pct + "%";
    });
  }

  function renderFilterTags(data) {
    var wrap = document.querySelector(".product-detail [data-review-filter-tags]");
    if (!wrap) return;
    var old = wrap.querySelectorAll(".detail-review-filter");
    for (var i = 0; i < old.length; i++) old[i].remove();
    (data.tags || []).forEach(function (tag, i) {
      var btn = document.createElement("button");
      // 评价标签不可点：CSS 已加 pointer-events:none 兜底，这里同步去掉可聚焦性，键盘 Tab 也跳过
      btn.className = "detail-review-filter" + (i === 0 ? " active" : "");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.textContent = tag;
      wrap.appendChild(btn);
    });
  }

  function renderAiTags(data) {
    var wrap = document.querySelector(".product-detail .detail-review-ai-tags");
    if (!wrap) return;
    var tags = data.tags && data.tags.length ? data.tags : [];
    wrap.innerHTML = tags.map(function (t) { return "<span>" + escapeHtml(t) + "</span>"; }).join("");
  }

  function renderCards(data) {
    var grid = document.querySelector(".product-detail [data-detail-review-grid]");
    if (!grid) return;
    grid.innerHTML = (data.cards || []).map(function (c) {
      return '<article class="detail-review-card">' +
        '<strong class="detail-review-card-title">' + escapeHtml(c.title) + "</strong>" +
        '<p class="detail-review-card-content">' + escapeHtml(c.body) + "</p>" +
        '<div class="detail-review-card-tags">' + c.tags.map(function (t) { return "<span>" + escapeHtml(t) + "</span>"; }).join("") + "</div>" +
        '<div class="detail-review-card-foot"><span>' + escapeHtml(c.user) + " · " + escapeHtml(c.date) + '</span><button class="detail-review-like" type="button" aria-label="点赞评价">👍 ' + c.likes + "</button></div>" +
        "</article>";
    }).join("");
    grid.scrollLeft = 0;
    updateReviewNavState();
  }

  function renderReviewSection(product) {
    var data = generateReviewData(product);
    renderRating(data);
    renderFilterTags(data);
    renderAiTags(data);
    renderCards(data);
  }

  // ── 评价卡横向轮播：右下角上一条/下一条，到头置灰 ──────────────────────────────
  function updateReviewNavState() {
    var track = document.querySelector(".product-detail [data-detail-review-grid]");
    var prevBtn = document.querySelector(".product-detail [data-review-prev]");
    var nextBtn = document.querySelector(".product-detail [data-review-next]");
    if (!track) return;
    var atStart = track.scrollLeft <= 2;
    var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    [prevBtn && [prevBtn, atStart], nextBtn && [nextBtn, atEnd]].forEach(function (pair) {
      if (!pair) return;
      var btn = pair[0], disabled = pair[1];
      btn.disabled = disabled;
      btn.classList.toggle("is-disabled", disabled);
    });
  }
  function handleReviewNav(direction) {
    var track = document.querySelector(".product-detail [data-detail-review-grid]");
    if (!track) return;
    var card = track.querySelector(".detail-review-card");
    var step = card ? card.getBoundingClientRect().width + 14 : 304;
    track.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
    setTimeout(updateReviewNavState, 320);
  }
  (function bindReviewScrollSync() {
    document.addEventListener("scroll", function (event) {
      if (event.target && event.target.matches && event.target.matches(".product-detail [data-detail-review-grid]")) updateReviewNavState();
    }, true);
  })();

  document.addEventListener("lx:product-detail-rendered", function (event) {
    var product = event && event.detail && event.detail.product;
    if (!product || !detailRoot()) return;
    renderBadges(product);
    renderConfigSummary(product);
    renderSellPoints(product);
    renderReviewSection(product);
  });

  window.__lxProductDetail = window.__lxProductDetail || {};
  window.__lxProductDetail.handleReviewNav = handleReviewNav;
})();
