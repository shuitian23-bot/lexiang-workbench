// P0 商品详情页结构对齐：商品标签(AI推荐/热销/国补/教育优惠)、核心配置摘要、卖点标签、
// 用户评价区(综合评分+分布+乐享AI标签+评价卡横向轮播)、服务保障卡片点击查看说明。
//
// 架构：不侵入 app.js 主闭包。app.js 的 openProduct() 在渲染完成后广播
// document.dispatchEvent(new CustomEvent("lx:product-detail-rendered", { detail: { product } }))，
// 本文件监听该事件独立接管这部分 DOM；复用统一弹窗/规格提取走 window.__lxAgentAPI 桥
// （openModal/closeModal/getDisplaySpecRows），与 app-agent.js 同一套跨文件通信约定。
//
// "适合你"卡片(loadFitReason)和"乐享建议"评价摘要(loadReviewSummary)保留 app.js 里原有的真实
// LLM 调用和"仅供参考"标注，本文件不接管、不重复渲染。
(function () {
  "use strict";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  function hashStr(str) {
    let h = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // 与 app.js 内 lxIsBizProduct 同一条判定规则（服务器/工作站/政企类目走询价，不展示 C 端消费标签和评价）
  function isBizCategory(product) {
    return ["服务器", "工作站", "服务产品"].includes(product && product.category) ||
      /开天|昭阳|启天|问天|ThinkStation|ThinkSystem/i.test((product && product.name) || "");
  }

  // ── 商品标签：AI推荐(常驻) + 热销/国补/教育优惠(按 SKU 哈希稳定分配，不可点) ──────────
  const BADGE_CLASS = { "AI 推荐": "detail-badge-ai", "热销": "detail-badge-hot", "国补": "detail-badge-guobu", "教育优惠": "detail-badge-edu" };
  function computeBadges(product) {
    const badges = ["AI 推荐"];
    const h = hashStr((product && (product.sku || product.name)) || "x");
    if (h % 3 !== 0) badges.push("热销");
    if (!isBizCategory(product)) {
      if (h % 5 < 2) badges.push("国补");
      if (h % 7 < 2) badges.push("教育优惠");
    }
    return badges;
  }
  function renderBadges(product) {
    const box = document.querySelector(".product-detail .detail-badges");
    if (!box) return;
    box.innerHTML = computeBadges(product).map((b) => `<span class="${BADGE_CLASS[b]}">${esc(b)}</span>`).join("");
  }

  // ── 核心配置摘要：处理器/系统/尺寸/内存/硬盘/显卡等，缺失字段不展示 ──────────────────
  // 复用 app.js 的 getDisplaySpecRows（参数规格 Tab 同一份数据源），避免两处解析结果不一致。
  const CORE_SPEC_LABELS = ["处理器", "操作系统", "屏幕尺寸", "内存", "存储", "硬盘", "显卡", "重量"];
  function ensureConfigSummaryNode(detailRoot) {
    let node = detailRoot.querySelector("[data-detail-config-summary]");
    if (node) return node;
    node = document.createElement("div");
    node.className = "detail-config-summary";
    node.setAttribute("data-detail-config-summary", "");
    node.hidden = true;
    const anchor = detailRoot.querySelector(".detail-summary");
    if (anchor && anchor.parentElement) anchor.insertAdjacentElement("afterend", node);
    else detailRoot.querySelector(".detail-info")?.prepend(node);
    return node;
  }
  function renderConfigSummary(product) {
    const detailRoot = document.querySelector(".product-detail");
    if (!detailRoot) return;
    const node = ensureConfigSummaryNode(detailRoot);
    const api = window.__lxAgentAPI;
    const rows = (api && typeof api.getDisplaySpecRows === "function") ? api.getDisplaySpecRows(product) : [];
    const picked = (rows || []).filter((row) => CORE_SPEC_LABELS.includes(row[0])).slice(0, 6);
    if (!picked.length) { node.hidden = true; node.innerHTML = ""; return; }
    node.innerHTML = picked.map((row) => `<span class="detail-config-chip">${esc(row[1])}</span>`).join("");
    node.hidden = false;
  }

  // ── 商品卖点标签：按名称/描述关键词归纳，不可点，不足位用通用兜底补齐（不编造具体参数）──
  function computeSaleTags(product) {
    const text = `${(product && product.name) || ""} ${(product && product.description) || ""}`;
    const pool = [];
    if (/AI|智能/i.test(text)) pool.push("AI 智能体验");
    if (/轻薄|1\.\d?\s*kg|轻至/i.test(text)) pool.push("轻薄便携");
    if (/120\s*Hz|144\s*Hz|高刷|2\.5K|2K|4K|OLED/i.test(text)) pool.push("高刷屏幕");
    if (/RTX|GTX|独显/i.test(text)) pool.push("独显性能");
    if (/续航|快充|电池/i.test(text)) pool.push("长续航");
    pool.push("官方服务");
    const fallback = ["品质保障", "值得信赖", "口碑推荐"];
    let i = 0;
    while (pool.length < 3 && i < fallback.length) { if (pool.indexOf(fallback[i]) < 0) pool.push(fallback[i]); i += 1; }
    return pool.slice(0, 4);
  }
  function renderSaleTags(product) {
    const box = document.querySelector(".product-detail .detail-tags");
    if (!box) return;
    box.innerHTML = computeSaleTags(product).map((t) => `<span class="detail-tag">${esc(t)}</span>`).join("");
  }

  // ── 用户评价 mock 数据：6 套评分/分布/情感标签/筛选标签/评价卡模板，按 SKU 哈希稳定分配 ──
  // 结构上留真实接口替换位：接 /api/products/:sku/reviews 时只需替换 lookupReviewProfile 内部
  // 实现为一次 fetch，renderReviewSection 等渲染函数无需改动。
  const REVIEW_PROFILES = [
    {
      rating: 4.9, distribution: [76, 18, 4, 1, 1],
      sentimentTags: ["屏幕素质高", "性能强悍", "做工精致", "适合创作"],
      filterTags: ["性能稳定", "屏幕观感好", "物流及时", "官方服务放心"],
      reviews: [
        { title: "办公体验顺滑", body: "日常办公、网页多开和视频会议都比较稳定，{name}整体响应很快，开关机速度也让人满意。", tags: ["性能强", "响应快"], user: "用户_L***8", date: "2025-11-14", likes: 42 },
        { title: "外观和质感不错", body: "机身做工扎实，屏幕显示细腻，拿到手的质感比预期更稳，A面纹理和接缝处理都比较到位。", tags: ["做工精致", "屏幕好"], user: "用户_S***5", date: "2025-11-10", likes: 28 },
        { title: "服务沟通清楚", body: "下单前通过联想乐享确认了配置和优惠，购买路径比较清晰，物流和开机激活也很顺畅。", tags: ["服务好", "物流快"], user: "用户_W***2", date: "2025-11-08", likes: 19 },
        { title: "续航还有提升空间", body: "重度使用下续航大概3-4小时，外接显示器会更短，日常插电使用没问题，性能表现符合预期。", tags: ["续航一般", "性能强"], user: "用户_Q***7", date: "2025-11-06", likes: 31 },
      ],
    },
    {
      rating: 4.8, distribution: [70, 21, 5, 2, 2],
      sentimentTags: ["性价比高", "运行流畅", "外观精致", "适合学习"],
      filterTags: ["性价比高", "启动快", "上手简单", "客服耐心"],
      reviews: [
        { title: "配置匹配日常需求", body: "{name}的核心配置覆盖学习、办公和娱乐场景，日常使用没有明显卡顿。", tags: ["够用", "流畅"], user: "用户_H***3", date: "2025-11-12", likes: 23 },
        { title: "物流包装完整", body: "发货和物流状态同步及时，包装保护到位，拆箱后商品外观状态正常，无磕碰。", tags: ["物流快", "包装好"], user: "用户_D***6", date: "2025-11-09", likes: 15 },
        { title: "价格说明透明", body: "优惠、补贴和活动信息在下单前都能提前确认，实际到手价和页面显示一致，比较放心。", tags: ["价格透明"], user: "用户_R***1", date: "2025-11-05", likes: 27 },
      ],
    },
    {
      rating: 4.7, distribution: [65, 24, 7, 2, 2],
      sentimentTags: ["运行稳定", "接口丰富", "散热正常", "适合办公"],
      filterTags: ["运行稳定", "接口够用", "散热可以", "售后放心"],
      reviews: [
        { title: "多任务切换顺畅", body: "{name}常用软件启动快，浏览器多开、文档剪辑切换没有明显延迟，办公效率有提升。", tags: ["流畅", "启动快"], user: "用户_M***9", date: "2025-11-13", likes: 34 },
        { title: "接口够日常用", body: "常用外设连接比较方便，办公桌面和移动场景都能兼顾，不用额外配转接头。", tags: ["接口全"], user: "用户_C***2", date: "2025-11-07", likes: 18 },
        { title: "售后政策放心", body: "官方渠道和售后服务说明清楚，后续维修、换新咨询流程比较顺，心里更有底。", tags: ["售后好"], user: "用户_F***4", date: "2025-11-02", likes: 22 },
        { title: "整体满意度高", body: "从选购到下单的流程比较顺，商品实际表现和官方服务都符合预期，会考虑复购。", tags: ["满意"], user: "用户_G***7", date: "2025-10-29", likes: 40 },
      ],
    },
    {
      rating: 4.9, distribution: [80, 15, 3, 1, 1],
      sentimentTags: ["屏幕效果好", "创作顺手", "颜值高", "重量适中"],
      filterTags: ["屏幕好", "创作顺手", "颜值高", "重量合适"],
      reviews: [
        { title: "屏幕效果惊艳", body: "{name}的色彩表现和对比度都不错，浏览图片和视频观感比较舒适，长时间使用眼睛也不容易累。", tags: ["屏幕好"], user: "用户_Y***5", date: "2025-11-15", likes: 56 },
        { title: "适合移动办公", body: "重量和尺寸比较适合通勤携带，会议、出差和临时办公切换比较顺手，包里放着也不占地方。", tags: ["便携"], user: "用户_T***8", date: "2025-11-11", likes: 29 },
        { title: "对比决策方便", body: "联想乐享能继续做同类商品对比，选配置和看优惠比自己一个个查方便很多，省了不少时间。", tags: ["购物顺畅"], user: "用户_K***0", date: "2025-11-04", likes: 20 },
      ],
    },
    {
      rating: 4.6, distribution: [60, 26, 8, 3, 3],
      sentimentTags: ["性价比不错", "做工扎实", "适合家用", "配置均衡"],
      filterTags: ["性价比不错", "做工扎实", "适合家用", "配置均衡"],
      reviews: [
        { title: "家用场景合适", body: "家人日常浏览、视频、网课和资料整理都够用，{name}上手门槛不高，长辈也能很快学会。", tags: ["易上手"], user: "用户_B***6", date: "2025-11-08", likes: 17 },
        { title: "商品信息完整", body: "详情页、规格和服务信息比较集中，购买前能快速确认关键配置和价格，节省决策时间。", tags: ["信息全"], user: "用户_N***3", date: "2025-10-31", likes: 12 },
        { title: "适合学生使用", body: "学习资料、网课、轻办公和娱乐都能覆盖，预算内的配置选择比较均衡，续航也够一天课程用。", tags: ["适合学生"], user: "用户_P***9", date: "2025-10-27", likes: 25 },
      ],
    },
  ];
  function lookupReviewProfile(product) {
    if (!product || isBizCategory(product)) return null; // 服务器/工作站等 B 端类目暂无 C 端评价，整卡隐藏
    const idx = hashStr((product.sku || product.name || "x")) % REVIEW_PROFILES.length;
    return REVIEW_PROFILES[idx];
  }

  function updateReviewNavState(grid, prevBtn, nextBtn) {
    if (!grid) return;
    const max = Math.max(0, grid.scrollWidth - grid.clientWidth - 2);
    if (prevBtn) prevBtn.disabled = grid.scrollLeft <= 2;
    if (nextBtn) nextBtn.disabled = max <= 2 || grid.scrollLeft >= max;
  }
  function bindReviewNav(grid) {
    const prevBtn = document.querySelector("[data-review-prev]");
    const nextBtn = document.querySelector("[data-review-next]");
    updateReviewNavState(grid, prevBtn, nextBtn);
    if (grid.dataset.lxNavBound) return;
    grid.dataset.lxNavBound = "1";
    grid.addEventListener("scroll", () => {
      updateReviewNavState(grid, document.querySelector("[data-review-prev]"), document.querySelector("[data-review-next]"));
    }, { passive: true });
  }
  // 供 app.js 的评价轮播点击 handler 调用（见 app.js 内 [data-review-prev]/[data-review-next] 分支）
  function handleReviewNav(direction) {
    const grid = document.querySelector("[data-detail-review-grid]");
    if (!grid) return;
    const card = grid.querySelector(".detail-review-card");
    const step = card ? Math.round(card.getBoundingClientRect().width) + 16 : 320;
    grid.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
    window.setTimeout(() => {
      updateReviewNavState(grid, document.querySelector("[data-review-prev]"), document.querySelector("[data-review-next]"));
    }, 340);
  }

  function renderReviewSection(product) {
    const root = document.querySelector(".product-detail");
    if (!root) return;
    const ratingWrap = root.querySelector(".detail-review-rating-wrap");
    const cardsWrap = root.querySelector(".detail-review-cards-wrap");
    const grid = root.querySelector("[data-detail-review-grid]");
    const aiTagsBox = root.querySelector(".detail-review-ai-tags");
    const profile = lookupReviewProfile(product);

    if (!profile) {
      if (ratingWrap) ratingWrap.hidden = true;
      if (cardsWrap) cardsWrap.hidden = true;
      if (grid) grid.innerHTML = "";
      if (aiTagsBox) aiTagsBox.innerHTML = "";
      return;
    }
    if (ratingWrap) ratingWrap.hidden = false;
    if (cardsWrap) cardsWrap.hidden = false;

    const ratingCard = root.querySelector(".detail-review-rating-card");
    if (ratingCard) {
      const scoreEl = ratingCard.querySelector(".detail-review-rating-score strong");
      if (scoreEl) scoreEl.textContent = profile.rating.toFixed(1);
      const rows = ratingCard.querySelectorAll(".detail-review-rating-row");
      rows.forEach((row, i) => {
        const pct = profile.distribution[i] || 0;
        const bar = row.querySelector("b");
        const pctText = row.querySelector("em");
        if (bar) bar.style.width = pct + "%";
        if (pctText) pctText.textContent = pct + "%";
      });
    }
    if (aiTagsBox) aiTagsBox.innerHTML = profile.sentimentTags.map((t) => `<span>${esc(t)}</span>`).join("");

    const filterBox = root.querySelector("[data-review-filter-tags]");
    if (filterBox) {
      filterBox.innerHTML = `<span class="detail-review-filter-lead">大家都在说</span>` +
        profile.filterTags.map((tag, i) => `<button class="detail-review-filter${i === 0 ? " active" : ""}" type="button">${esc(tag)}</button>`).join("");
    }

    if (grid) {
      const name = ((product && product.name) || "这款商品").slice(0, 30);
      grid.innerHTML = profile.reviews.map((r) => `
        <article class="detail-review-card">
          <strong class="detail-review-card-title">${esc(r.title)}</strong>
          <p class="detail-review-card-content">${esc(r.body.replace("{name}", name))}</p>
          <div class="detail-review-card-tags">${r.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          <div class="detail-review-card-foot"><span>${esc(r.user)} · ${esc(r.date)}</span><button class="detail-review-like" type="button" aria-label="点赞评价">👍 ${r.likes}</button></div>
        </article>`).join("");
      grid.scrollLeft = 0;
      bindReviewNav(grid);
    }
  }

  // ── 服务保障卡片：可点查看说明（无外链，仅弹窗展示）────────────────────────────────
  const SERVICE_EXPLAIN = [
    { title: "官方正品", body: '<p style="margin:0 0 10px;line-height:1.7">商品由联想官方及授权渠道直供，全流程可追溯，杜绝非官方来源商品混入。</p><p style="margin:0;line-height:1.7">如对商品真伪有疑问，可凭订单号联系联想乐享客服核实渠道来源。</p>' },
    { title: "180天只换不修", body: '<p style="margin:0 0 10px;line-height:1.7">自签收之日起180天内，若出现非人为因素导致的硬件故障，支持直接换新，无需等待返厂维修。</p><p style="margin:0;line-height:1.7">具体适用范围以商品页面标注及官方售后政策为准。</p>' },
    { title: "14天无理由退换", body: '<p style="margin:0 0 10px;line-height:1.7">自签收之日起14天内，商品保持完好、不影响二次销售的，可申请无理由退换。</p><p style="margin:0;line-height:1.7">定制类、软件激活类等特殊商品可能不适用，具体以下单页说明为准。</p>' },
  ];
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".product-detail .detail-service .service-item");
    if (!item || !item.parentElement) return;
    const list = Array.prototype.slice.call(item.parentElement.querySelectorAll(".service-item"));
    const idx = list.indexOf(item);
    const explain = SERVICE_EXPLAIN[idx] || SERVICE_EXPLAIN[0];
    const api = window.__lxAgentAPI;
    if (api && typeof api.openModal === "function") api.openModal(explain.title, explain.body);
  });

  function onProductDetailRendered(event) {
    const product = event && event.detail && event.detail.product;
    if (!product) return;
    renderBadges(product);
    renderConfigSummary(product);
    renderSaleTags(product);
    renderReviewSection(product);
  }
  document.addEventListener("lx:product-detail-rendered", onProductDetailRendered);

  window.__lxProductDetail = { handleReviewNav };
})();
