      (() => {
        "use strict";

        const SITE_BY_PATH = {
          "/shop-chat": "personal",
          "/shop-chat/": "personal",
          "/b-chat": "business",
          "/b-chat/": "business",
          "/biz-chat": "enterprise",
          "/biz-chat/": "enterprise",
          "/brand": "brand",
          "/brand/": "brand"
        };
        const API_SITE = { personal: "shop", business: "b", enterprise: "biz", home: "default" };
        const PATH_BY_PAGE = { home: "/", personal: "/shop-chat/", business: "/b-chat/", enterprise: "/biz-chat/", brand: "/brand/" };
        const state = {
          page: SITE_BY_PATH[location.pathname] || "home",
          convId: null,
          sending: false,
          user: null,
          products: [],
          currentProduct: null,
          cart: load("lexiang.cart.v1"),
          orders: load("lexiang.orders.v1"),
          compare: load("lexiang.compare.v1"),
          coupons: load("lexiang.coupons.v1"),
          pendingImageUrl: "",
          pendingAudioUrl: "",
          officialCompare: false,
          leaiSession: null,
          selectedText: "",
          queryHistory: [],
          conversationNonce: 0,
          detailImageToken: "",
          hoverPromptTimer: null,
          hoverPromptSku: ""
        };

        const $ = (sel, root = document) => root.querySelector(sel);
        const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
        const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[ch]));
        const money = (value) => {
          const n = Number(value);
          return Number.isFinite(n) && n > 0 ? `¥ ${n.toLocaleString("zh-CN")}` : "咨询报价";
        };
        const imgUrl = (url) => {
          if (!url) return "/assets/logos/logo-mark.png";
          const value = String(url).trim().replace(/^http:\/\//, "https://");
          if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
          if (value.startsWith("./assets/")) return value.replace("./assets/", "/assets/");
          if (value.startsWith("assets/")) return `/${value}`;
          if (value.startsWith("/")) return value;
          return `/${value.replace(/^\.?\//, "")}`;
        };

        function renderDetailImages(product, images = []) {
          const panel = $("[data-detail-images-panel]");
          if (!panel) return;
          const validImages = Array.isArray(images) ? images.filter(Boolean).slice(1) : [];
          if (validImages.length) {
            panel.innerHTML = validImages.map((url, index) => `<img src="${esc(imgUrl(url))}" alt="${esc(product?.name || "商品")}详情图 ${index + 2}" loading="lazy" />`).join("");
            return;
          }
          const fallback = imgUrl(product?.image_url);
          panel.innerHTML = fallback
            ? `<img src="${esc(fallback)}" alt="${esc(product?.name || "商品")}详情图" loading="lazy" />`
            : `<div class="detail-images-empty">暂无详情图</div>`;
        }

        async function loadProductDetailImages(product) {
          const panel = $("[data-detail-images-panel]");
          if (!panel || !product) return;
          const sku = product.sku || product.id || "";
          if (!sku) {
            renderDetailImages(product);
            return;
          }
          state.detailImageToken = String(sku);
          panel.innerHTML = `<div class="detail-images-loading">加载详情图...</div>`;
          try {
            const response = await fetch(`/api/product/${encodeURIComponent(sku)}/detail-images`, { cache: "no-store" });
            const json = await response.json();
            if (state.detailImageToken !== String(sku)) return;
            renderDetailImages(product, json.images);
          } catch (error) {
            if (state.detailImageToken !== String(sku)) return;
            renderDetailImages(product);
          }
        }

        function load(key) {
          try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
        }

        function save(key, value) {
          try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
        }

        function toast(text) {
          let node = $(".lx-p0-toast");
          if (!node) {
            node = document.createElement("div");
            node.className = "lx-p0-toast";
            document.body.appendChild(node);
          }
          node.textContent = text;
          node.classList.add("show");
          clearTimeout(node._timer);
          node._timer = setTimeout(() => node.classList.remove("show"), 2400);
        }

        function ensureModal() {
          let mask = $(".lx-p0-modal-mask");
          if (mask) return mask;
          mask = document.createElement("div");
          mask.className = "lx-p0-modal-mask";
          mask.innerHTML = `
            <div class="lx-p0-modal" role="dialog" aria-modal="true">
              <div class="lx-p0-modal-head">
                <h2 class="lx-p0-modal-title"></h2>
                <button class="lx-p0-close" type="button" aria-label="关闭">×</button>
              </div>
              <div class="lx-p0-modal-body"></div>
            </div>`;
          mask.addEventListener("click", (event) => {
            if (event.target === mask || event.target.closest(".lx-p0-close")) closeModal();
          });
          document.body.appendChild(mask);
          return mask;
        }

        function openModal(title, html) {
          const mask = ensureModal();
          $(".lx-p0-modal-title", mask).textContent = title;
          $(".lx-p0-modal-body", mask).innerHTML = html;
          mask.classList.add("show");
        }

        function closeModal() {
          $(".lx-p0-modal-mask")?.classList.remove("show");
        }

        function updateBadges() {
          const buttons = $$(".utility-btn");
          const cartBtn = buttons.find((btn) => btn.getAttribute("aria-label") === "购物车");
          const orderBtn = buttons.find((btn) => btn.getAttribute("aria-label") === "订单");
          setBadge(cartBtn, state.cart.length);
          setBadge(orderBtn, state.orders.length);
        }

        function setBadge(button, count) {
          if (!button) return;
          let badge = $(".lx-p0-badge", button);
          if (!count) {
            badge?.remove();
            return;
          }
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "lx-p0-badge";
            button.appendChild(badge);
          }
          badge.textContent = count > 99 ? "99+" : String(count);
        }

        function routeTo(page, replace = false) {
          state.page = page || "home";
          const path = PATH_BY_PAGE[state.page] || "/";
          if (location.pathname !== path) {
            history[replace ? "replaceState" : "pushState"](null, "", path);
          }
          const nav = $(`.main-nav [data-page="${state.page}"]`);
          nav?.click();
          loadProductsForPage();
        }

        function initRoute() {
          const page = SITE_BY_PATH[location.pathname] || "home";
          routeTo(page, true);
        }

        async function loadProductsForPage() {
          if (state.page === "home" || state.page === "brand") return;
          const site = API_SITE[state.page] || "shop";
          try {
            const response = await fetch(`/api/products?site=${encodeURIComponent(site)}&limit=14`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const products = await response.json();
            state.siteProducts = Array.isArray(products) ? products : [];
            // 「AI 推荐」标签激活中时不覆盖推荐墙，站点货盘仅存底供楼层使用
            if (state.activeTabId !== "reco") {
              state.products = state.siteProducts;
              renderProductCards();
            }
            if (state.page === "personal") lxRenderSiteFloors();
          } catch (error) {
            toast("商品数据暂时不可用，已保留当前页面展示");
          }
        }

        function renderProductCards() {
          const cards = $$(".product-card");
          cards.forEach((card, index) => {
            const product = state.products[index];
            card.hidden = !product;
            if (!product) return;
            card.dataset.sku = product.sku || "";
            const brand = $(".brand-mini", card);
            const title = $(".product-title", card);
            const spec = $(".spec", card);
            const price = $(".price", card);
            const visual = $(".product-visual", card);
            let promos = $(".product-promos", card);
            if (!promos) {
              promos = document.createElement("div");
              promos.className = "product-promos";
              promos.setAttribute("aria-label", "促销标签");
              price?.before(promos);
            }
            if (brand) brand.textContent = product.category || "联想";
            if (title) title.textContent = product.name || "联想商品";
            if (spec) spec.textContent = product.description || product.category || "官方正品｜联想服务";
            if (promos) {
              const tags = Array.isArray(product.promotion_tags) && product.promotion_tags.length ? product.promotion_tags : ["官方优惠", "限时优惠"];
              promos.innerHTML = tags.slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("");
            }
            if (price) {
              const entOk = state.page === "business" && lxEntState().status === "verified" && Number(product.price) > 0;
              price.innerHTML = entOk
                ? `${money(Math.round(product.price * 0.95))}<span class="price-from">企业价</span><s class="lx-edu-orig">${money(product.price)}</s>`
                : `${money(product.price)}<span class="price-from">起</span>`;
            }
            if (visual) visual.innerHTML = `<img src="${esc(imgUrl(product.image_url))}" alt="${esc(product.name || "商品图片")}" />`;
          });
        }

        function getProductFromCard(card) {
          if (!card) return null;
          const sku = card.dataset.sku || "";
          const product = sku ? state.products.find((item) => String(item.sku || "") === String(sku)) : null;
          if (product) return product;
          return {
            sku,
            name: $(".product-title", card)?.textContent?.trim() || "这款联想商品",
            description: $(".spec", card)?.textContent?.trim() || "联想官方商品",
            category: $(".brand-mini", card)?.textContent?.trim() || "联想商品"
          };
        }

        function getHoverPromptQuestions(product) {
          const name = (product?.name || "这款联想商品").replace(/\s+/g, " ").trim();
          const category = product?.category || "联想商品";
          const compactName = name.length > 18 ? `${name.slice(0, 18)}...` : name;
          let series = category;
          if (/小新/.test(name)) series = "小新";
          else if (/拯救者|LEGION/i.test(name)) series = "拯救者";
          else if (/ThinkPad/i.test(name)) series = "ThinkPad";
          else if (/ThinkBook/i.test(name)) series = "ThinkBook";
          else if (/YOGA/i.test(name)) series = "YOGA";
          else if (/moto/i.test(name)) series = "moto";
          return [
            `${series}该如何选择？`,
            `${compactName}值得买吗？`,
            `${compactName}详细解读`
          ];
        }

        async function showHoverPrompts(product) {
          const bottom = $(".assistant-bottom");
          const list = $("[data-hover-prompt-list]");
          if (!bottom || !list) return;
          const key = String(product?.sku || "");
          list.innerHTML = getHoverPromptQuestions(product).map((text) => (
            `<button class="hover-prompt-chip" type="button" data-hover-prompt="${esc(text)}">${esc(text)}</button>`
          )).join("");
          bottom.classList.add("has-hover-prompts");
          // 异步补一条 AI 促单钩子（✨含卖点），缓存按 sku
          if (!key) return;
          state.reasonCache = state.reasonCache || {};
          let reason = state.reasonCache[key];
          if (reason === undefined) {
            try {
              const res = await fetch(`/api/products/${encodeURIComponent(key)}/reason`, { cache: "no-store" });
              reason = (await res.json()).reason || "";
            } catch { reason = ""; }
            state.reasonCache[key] = reason;
          }
          if (reason && state.hoverPromptSku === key && bottom.classList.contains("has-hover-prompts")) {
            list.insertAdjacentHTML("afterbegin", `<span class="hover-prompt-hook">✨ ${esc(reason)}</span>`);
          }
        }

        function hideHoverPrompts() {
          $(".assistant-bottom")?.classList.remove("has-hover-prompts");
          const list = $("[data-hover-prompt-list]");
          if (list) list.innerHTML = "";
        }

        function clearHoverPromptTimer() {
          if (state.hoverPromptTimer) window.clearTimeout(state.hoverPromptTimer);
          state.hoverPromptTimer = null;
          state.hoverPromptSku = "";
        }

        function startHoverPromptTimer(card) {
          const product = getProductFromCard(card);
          const key = String(product?.sku || product?.name || "");
          clearHoverPromptTimer();
          if (!key) return;
          state.hoverPromptSku = key;
          state.hoverPromptTimer = window.setTimeout(() => {
            if (state.hoverPromptSku !== key) return;
            showHoverPrompts(product);
            state.hoverPromptTimer = null;
          }, 2500);
        }

        const DETAIL_SPEC_SKIP_KEYS = new Set([
          "url",
          "pcDetailUrl",
          "wapUrl",
          "wapDetailUrl",
          "mobileUrl",
          "bu_ids",
          "target_user",
          "highlights",
          "images",
          "ad_picture",
          "source",
          "detail_images",
          "detail_images_at"
        ]);
        const DETAIL_SPEC_LABELS = {
          brand: "品牌",
          color: "颜色",
          weight: "重量",
          screen_size: "屏幕尺寸",
          screen_resolution: "分辨率",
          resolution: "分辨率",
          battery: "电池",
          os: "操作系统",
          cpu: "处理器",
          gpu: "显卡",
          ram: "内存",
          memory: "内存",
          storage: "存储",
          disk: "硬盘",
          lvl1: "一级分类",
          lvl2: "二级分类",
          lvl3: "系列",
          lvl4: "子系列",
          lvl5: "细分",
          mtm: "MTM 编码",
          bu: "事业部",
          is_ai: "AI 商品"
        };

        function normalizeProductSpecs(rawSpecs) {
          if (!rawSpecs) return {};
          if (typeof rawSpecs === "string") {
            try { return JSON.parse(rawSpecs) || {}; } catch { return {}; }
          }
          return typeof rawSpecs === "object" ? rawSpecs : {};
        }

        function getDisplaySpecRows(product) {
          const specs = normalizeProductSpecs(product?.specs);
          const rows = [
            ["商品名称", product?.name || "联想商品"],
            ["品类", product?.category || "联想官方商品"]
          ];
          if (product?.sku) rows.push(["SKU", product.sku]);
          Object.keys(specs).forEach((key) => {
            if (DETAIL_SPEC_SKIP_KEYS.has(key)) return;
            const value = specs[key];
            if (value === undefined || value === null || value === "") return;
            if (typeof value === "object") return;
            rows.push([DETAIL_SPEC_LABELS[key] || key, String(value).trim()]);
          });
          if (rows.length <= (product?.sku ? 3 : 2)) {
            rows.push(
              ["核心描述", product?.description || "联想官方商品"],
              ["价格", money(product?.price)],
              ["服务支持", "官方保修与售后支持"],
              ["咨询", "支持联想乐享 AI 辅助对比"]
            );
          }
          return rows.filter(([, value]) => value);
        }

        const DETAIL_REVIEW_TEMPLATES = [
          ["办公体验顺滑", "日常办公、网页多开和视频会议都比较稳定，整体响应很快。"],
          ["外观和质感不错", "机身做工扎实，屏幕显示细腻，拿到手的质感比预期更稳。"],
          ["服务沟通清楚", "下单前通过联想乐享确认了配置和优惠，购买路径比较清晰。"],
          ["配置匹配需求", "核心配置覆盖学习、办公和娱乐需求，继续对比同价位商品也方便。"],
          ["屏幕观感舒适", "长时间浏览文档和网页时观感比较舒服，亮度和清晰度能满足日常使用。"],
          ["物流包装完整", "发货和物流状态同步及时，包装保护到位，拆箱后商品状态正常。"],
          ["价格说明透明", "优惠、补贴和活动信息能提前确认，实际下单前心里更有底。"],
          ["适合移动办公", "重量和尺寸比较适合通勤携带，会议、出差和临时办公切换顺手。"],
          ["运行表现稳定", "常用软件启动快，多任务切换没有明显卡顿，日常使用稳定。"],
          ["续航符合预期", "外出使用能覆盖半天以上轻办公，搭配快充后使用压力不大。"],
          ["接口够日常用", "常用外设连接比较方便，办公桌面和移动场景都能兼顾。"],
          ["售后政策放心", "官方渠道和售后服务说明清楚，后续维修、换新咨询更安心。"],
          ["适合学生使用", "学习资料、网课、轻办公和娱乐都能覆盖，预算内选择比较均衡。"],
          ["家用场景合适", "家人日常浏览、视频、网课和资料整理都够用，上手门槛低。"],
          ["对比决策方便", "联想乐享能继续做同类商品对比，选配置和看优惠更省时间。"],
          ["商品信息完整", "详情页、规格和服务信息比较集中，购买前能快速确认关键点。"],
          ["整体满意度高", "从选购到下单的流程比较顺，商品表现和官方服务都符合预期。"]
        ];

        function renderProductReviews(product) {
          const grid = $("[data-detail-review-grid]");
          if (!grid) return;
          const name = product?.name || "联想YOGA Pro 16 Aura AI元启版 16英寸轻薄创作笔记本电脑";
          const description = product?.description || "性能配置覆盖日常办公、创作和学习需求";
          const reviews = [
            { title: "办公体验顺滑", body: `${name} ${description}，日常使用响应稳定，覆盖主要使用需求。`, tags: ["性能强", "屏幕好"], user: "用户_L***8 · 2025-11-14", likes: 42 },
            { title: "外观和质感不错", body: "机身做工扎实，屏幕显示细腻，拿到手的质感比预期更稳。轻薄设计出差携带很方便，A面的纹理手感也很好。", tags: ["做工精致", "便携"], user: "用户_S***5 · 2025-11-10", likes: 28 },
            { title: "服务沟通清楚", body: "下单前通过联想乐享确认配置，客服沟通比较清晰，配送速度很快，开机激活流程顺畅，整体购买体验不错。", tags: ["服务好", "物流快"], user: "用户_W***2 · 2025-11-08", likes: 19 },
            { title: "续航还有提升空间", body: "重度使用下续航在3-4小时，外接显示器下更短，需要常备电源。但性能表现非常出色，适合插电使用场景。", tags: ["性能强", "续航待改进"], user: "用户_Q***7 · 2025-11-06", likes: 31 },
            { title: "屏幕效果惊艳", body: "OLED色彩鲜艳，对比度高，做图剪视频非常爽。触控功能配合妙笔使用体验很好，创作类软件运行流畅。", tags: ["屏幕好", "适合创作"], user: "用户_M***3 · 2025-11-03", likes: 56 }
          ];
          grid.innerHTML = reviews.map((review) => `
            <article class="detail-review-card">
              <strong class="detail-review-card-title">${esc(review.title)}</strong>
              <p class="detail-review-card-content">${esc(review.body)}</p>
              <div class="detail-review-card-tags">${review.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
              <div class="detail-review-card-foot"><span>${esc(review.user)}</span><button class="detail-review-like" type="button" aria-label="点赞评价">👍 ${review.likes}</button></div>
            </article>`).join("");
        }

        function updateProductDetailPanels(product) {
          if (!product) return;
          const name = product.name || "联想商品";
          const category = product.category || "联想官方";
          const description = product.description || "联想官方商品，支持继续向联想乐享 AI 助手咨询选型、优惠和对比。";
          const setText = (sel, text) => { const node = $(sel); if (node) node.textContent = text; };
          setText("[data-detail-hero-title]", name);
          setText("[data-detail-hero-desc]", `${description} 页面信息会结合当前商品展示，购买前建议核对价格、库存和服务政策。`);
          setText("[data-detail-review-one]", `${name} 的核心配置清晰，适合结合预算、用途和服务需求继续比较。`);
          setText("[data-detail-review-two]", `用户关注点集中在${category}、做工质感和日常使用稳定性，可继续让联想乐享做同类对比。`);
          setText("[data-detail-review-three]", "购买前可继续查询教育特惠、以旧换新、门店服务和官方售后政策。");
          renderProductReviews(product);
          const specGrid = $("[data-detail-spec-grid]");
          if (specGrid) {
            const rows = getDisplaySpecRows(product);
            specGrid.innerHTML = rows.map(([label, value]) => `<div class="detail-spec-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
          }
        }

        async function openProduct(productOrSku, opts = {}) {
          let product = typeof productOrSku === "object" ? productOrSku : state.products.find((item) => item.sku === productOrSku);
          if (typeof productOrSku === "string") {
            try {
              const response = await fetch(`/api/products/${encodeURIComponent(productOrSku)}`, { cache: "no-store" });
              if (response.ok) product = await response.json();
            } catch {}
          }
          if (!product) return toast("未找到该商品，可能已下架或仅官网在售");
          state.currentProduct = product;
          lxRevealContent();
          if (product.sku && opts.noTab) {
            // SPU 内切换配置：复用当前详情标签，不新开
            const active = (state.tabs || []).find((tab) => tab.id === state.activeTabId && tab.kind === "detail");
            if (active) { active.sku = product.sku; active.label = product.name || active.label; lxRenderTabbar(); }
          } else if (product.sku) {
            lxUpsertTab({ id: `detail:${product.sku}`, kind: "detail", label: product.name || "商品详情", sku: product.sku });
          }
          document.querySelector(".content")?.setAttribute("data-view", "detail");
          document.querySelector(".content")?.scrollTo({ top: 0, behavior: "smooth" });
          const visual = $("[data-detail-visual]")?.parentElement;
          if (visual) visual.innerHTML = `<img class="detail-product-image" src="${esc(imgUrl(product.image_url))}" alt="${esc(product.name || "商品图片")}" data-detail-visual />`;
          const setText = (sel, text) => { const node = $(sel); if (node) node.textContent = text; };
          setText("[data-detail-title]", product.name || "联想商品");
          setText("[data-detail-summary]", product.description || "联想官方商品，支持继续向联想乐享 AI 助手咨询选型、优惠和对比。");
          const priceNode = $("[data-detail-price]");
          if (priceNode) {
            const currentPrice = money(product.price);
            const rawPrice = Number(product.price || 0);
            const oldPrice = rawPrice ? `¥${Math.round(rawPrice + 400).toLocaleString()}` : "¥7,299";
            priceNode.innerHTML = `<span class="detail-price-main">${esc(currentPrice)}</span><span class="detail-price-side"><s>${esc(oldPrice)}</s><b>省 ¥400</b></span>`;
          }
          updateProductDetailPanels(product);
          loadProductDetailImages(product);
          lxApplyDetailCtaMode(product);
          loadReviewSummary(product);
          loadFitReason(product);
          loadSpuVariants(product);
          lxHintOnDetail(product);
        }

        // SPU 体系：详情页展示同系列全部配置（SKU 选择器 + 价格区间 + 系列内对比）
        let spuToken = 0;
        function lxVariantLabel(variant, baseName) {
          const specs = variant.specs || {};
          const pick = (...keys) => keys.map((k) => specs[k]).find(Boolean);
          const parts = [pick("cpu", "处理器"), pick("ram", "memory", "内存"), pick("storage", "disk", "硬盘", "存储")].filter(Boolean).map((part) => String(part).slice(0, 16));
          if (parts.length) return parts.join(" / ");
          // specs 缺失时用「名称差异词」区分（颜色/代数/配置），比「¥xx 版本」有意义
          const baseTokens = new Set(String(baseName || "").split(/[\s｜|/，,（）()]+/));
          const diff = String(variant.name || "").split(/[\s｜|/，,（）()]+/).filter((t) => t && !baseTokens.has(t)).slice(0, 3).join(" ");
          return diff || `¥${Number(variant.price || 0).toLocaleString()} 版本`;
        }

        async function loadSpuVariants(product) {
          const box = $("[data-detail-variants]");
          if (!box) return;
          const token = ++spuToken;
          box.hidden = true;
          state.spuVariants = [];
          if (!product?.sku) return;
          try {
            const response = await fetch(`/api/products/${encodeURIComponent(product.sku)}/variants`, { cache: "no-store" });
            const payload = await response.json();
            if (token !== spuToken) return;
            const variants = payload.variants || [];
            if (variants.length < 2) return;
            state.spuVariants = variants;
            const range = payload.price_min && payload.price_max && payload.price_min !== payload.price_max
              ? `¥${Number(payload.price_min).toLocaleString()} - ¥${Number(payload.price_max).toLocaleString()}`
              : "";
            // 标签去重：specs 相同的款（差异在颜色等名称细节）退化为「名称差异词」，保证每款可区分
            let labels = variants.map((variant) => lxVariantLabel(variant, product.name));
            if (new Set(labels).size < labels.length) {
              const split = (s) => String(s || "").split(/[\s｜|/，,（）()]+/).filter(Boolean);
              const tokenLists = variants.map((v) => split(v.name));
              const common = tokenLists[0].filter((t) => tokenLists.every((list) => list.includes(t)));
              labels = variants.map((v, i) => {
                const diff = tokenLists[i].filter((t) => !common.includes(t)).slice(0, 3).join(" ");
                return diff || labels[i];
              });
              // 二次去重：差异词仍同名（如同名定制款）→ 追加价格；再同 → 序号
              const seen = {};
              labels = labels.map((label, i) => {
                if (labels.indexOf(label) !== i || labels.lastIndexOf(label) !== i) {
                  const withPrice = `${label} ¥${Number(variants[i].price || 0).toLocaleString()}`;
                  label = withPrice;
                }
                seen[label] = (seen[label] || 0) + 1;
                return seen[label] > 1 ? `${label}（款${seen[label]}）` : label;
              });
            }
            box.innerHTML = `
              <div class="lx-spu-head"><span>本系列共 ${variants.length} 款配置${range ? ` · <b>${range}</b>` : ""}</span><button class="lx-spu-compare" type="button" data-spu-compare>对比本系列 →</button></div>
              <div class="lx-spu-chips">${variants.map((variant, i) => `<button class="lx-spu-chip${variant.sku === product.sku ? " is-active" : ""}" type="button" data-variant-sku="${esc(variant.sku)}" title="${esc(variant.name)}"><span class="lx-spu-chip-label">${esc(labels[i])}</span><span class="lx-spu-chip-price">¥${Number(variant.price || 0).toLocaleString()}</span></button>`).join("")}</div>`;
            box.hidden = false;
          } catch {}
        }

        // biz 政企商品（服务器/工作站/方案型）不可直购：CTA 切换为咨询留资式（对齐 biz.lenovo.com.cn）
        function lxIsBizProduct(product) {
          return ["服务器", "工作站", "服务产品"].includes(product?.category) || /开天|昭阳|启天|问天|ThinkStation|ThinkSystem/i.test(product?.name || "");
        }

        function lxApplyDetailCtaMode(product) {
          const actions = $(".detail-actions");
          if (!actions) return;
          const biz = lxIsBizProduct(product);
          const primary = $(".detail-primary", actions);
          const cart = [...actions.querySelectorAll(".detail-secondary")].find((b) => ![...b.classList].some((c) => c.startsWith("lx-p0-detail")));
          const benefit = $(".lx-p0-detail-benefit", actions);
          let quote = $(".lx-p0-detail-quote", actions);
          let wp = $(".lx-p0-detail-wp", actions);
          if (biz) {
            if (primary) { primary.textContent = "获取报价方案"; primary.dataset.bizQuote = "1"; }
            if (cart) cart.hidden = true;
            if (benefit) benefit.hidden = true;
            if (!quote) {
              quote = document.createElement("button");
              quote.className = "detail-secondary lx-p0-detail-quote"; quote.type = "button"; quote.textContent = "在线咨询顾问";
              actions.appendChild(quote);
              wp = document.createElement("button");
              wp.className = "detail-secondary lx-p0-detail-wp"; wp.type = "button"; wp.textContent = "下载白皮书";
              actions.appendChild(wp);
            } else { quote.hidden = false; if (wp) wp.hidden = false; }
            const price = $("[data-detail-price]");
            if (price && !price.textContent.includes("参考")) price.insertAdjacentHTML("beforeend", `<span class="lx-edu-hint" style="margin-left:8px">参考价 · 以正式报价为准</span>`);
          } else {
            if (primary) { primary.textContent = "一键领优惠下单"; delete primary.dataset.bizQuote; }
            if (cart) cart.hidden = false;
            if (benefit) benefit.hidden = false;
            if (quote) quote.hidden = true;
            if (wp) wp.hidden = true;
          }
        }

        // 评价区「乐享总结」：lite 模型流式生成 60 字评价要点，按 sku 缓存
        let reviewSumToken = 0;
        async function loadReviewSummary(product) {
          const box = document.querySelector("[data-review-sum]");
          if (!box || !product?.name) return;
          const token = ++reviewSumToken;
          state.reviewSumCache = state.reviewSumCache || {};
          const cached = state.reviewSumCache[product.sku];
          const fallback = "大多数用户认为<span class=\"highlight\">屏幕素质高、性能强、做工精致</span>，适合创作办公；少数用户提到机身偏重、续航和风扇噪音仍有提升空间。";
          box.innerHTML = cached || fallback;
          if (cached) return;
          try {
            const res = await fetch("/api/chat/quick", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: `用一段60字以内的话总结「${product.name}」这类产品的用户评价要点，格式：大多数用户认为…，少数用户提到…。直接输出总结内容，不要开场白。` }),
            });
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "", sum = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop();
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                try { const d = JSON.parse(line.slice(5)); if (d.text) sum += d.text; } catch {}
              }
              if (token !== reviewSumToken) { reader.cancel(); return; }
              if (box && sum) box.textContent = sum;
            }
            if (sum) state.reviewSumCache[product.sku] = esc(sum).replace(/(屏幕素质高|性能强|做工精致)/g, '<span class="highlight">$1</span>');
          } catch {}
        }

        let fitReasonToken = 0;
        async function loadFitReason(product) {
          const node = $("[data-detail-reason]");
          if (!node) return;
          const token = ++fitReasonToken;
          node.hidden = true;
          if (!product?.sku) return;
          try {
            const response = await fetch(`/api/products/${encodeURIComponent(product.sku)}/reason`, { cache: "no-store" });
            const payload = await response.json();
            if (token !== fitReasonToken || !payload.reason) return;
            node.innerHTML = `<span class="lx-fit-icon" aria-hidden="true">✨</span><span class="lx-fit-text"><strong>适合你</strong>${esc(payload.reason)}<span class="lx-fit-note">AI 生成 · 仅供参考</span></span>`;
            node.hidden = false;
          } catch {}
        }

        function ensureDetailSimilarButton() {
          const actions = $(".detail-actions");
          if (!actions || $(".lx-p0-detail-similar", actions)) return;
          const btn = document.createElement("button");
          btn.className = "detail-secondary lx-p0-detail-similar";
          btn.type = "button";
          btn.textContent = "找相似";
          actions.appendChild(btn);
        }

        function ensureDetailBenefitButton() {
          const actions = $(".detail-actions");
          if (!actions || $(".lx-p0-detail-benefit", actions)) return;
          const btn = document.createElement("button");
          btn.className = "detail-secondary lx-p0-detail-benefit";
          btn.type = "button";
          btn.textContent = "算到手价";
          actions.appendChild(btn);
        }

        async function openSimilarProducts() {
          const sku = state.currentProduct?.sku;
          if (!sku) return toast("请先选择商品");
          try {
            const response = await fetch(`/api/products?similar=${encodeURIComponent(sku)}&limit=6`, { cache: "no-store" });
            const items = await response.json();
            if (!Array.isArray(items) || !items.length) return toast("暂未找到同类相近价位的商品");
            openModal("相似商品推荐", `<div class="lx-sim-grid">${items.slice(0, 6).map((p) => `<div class="lx-sim-card" data-open-product="${esc(p.sku)}"><img src="${esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" /><div class="lx-sim-name">${esc(p.name)}</div><div class="lx-sim-price">¥${Number(p.price || 0).toLocaleString()}</div></div>`).join("")}</div><p class="lx-p0-disclaimer">基于同类目、相近价位推荐，点击卡片查看详情。</p>`);
          } catch {
            toast("相似商品加载失败，请稍后再试");
          }
        }

        function ensureDetailCompareButton() {
          const actions = $(".detail-actions");
          if (!actions || $(".lx-p0-detail-compare", actions)) return;
          const btn = document.createElement("button");
          btn.className = "detail-secondary lx-p0-detail-compare";
          btn.type = "button";
          btn.textContent = "加入对比";
          actions.appendChild(btn);
        }

        function addCart(product = state.currentProduct) {
          if (!product) return toast("请先选择商品");
          if (!state.cart.some((item) => item.sku === product.sku)) state.cart.push(normalizeProduct(product));
          save("lexiang.cart.v1", state.cart);
          updateBadges();
          toast("已加入购物车");
        }

        function buyNow(product = state.currentProduct) {
          if (!product) return toast("请先选择商品");
          openAddressPicker(normalizeProduct(product));
        }

        // 一键领优惠（转化最短路径）：自动领全部可用优惠 → 订单确认弹层（载体分工允许的「特殊确认」）→ 确认即下单
        function lxClaimBenefits(product) {
          const price = Number(product.price) || 0;
          const claimed = [];
          if (price > 0) {
            const isEdu = (product.promotion_tags || []).includes("教育特惠") || /小新|YOGA|平板|笔记本|台式/.test(product.name || "");
            if (isEdu) claimed.push({ label: "国家补贴 15%", reason: "该机型在政府补贴目录内", amount: -Math.round(price * 0.15) });
            if (lxStuState().status === "verified") claimed.push({ label: "教育认证券", reason: "学生/教师认证已通过，自动抵扣", amount: -300 });
            if (state.page === "business" && lxEntState().status === "verified") claimed.push({ label: "企业专享 95 折", reason: "企业认证已通过", amount: -Math.round(price * 0.05) });
            // 通用双券按价位阶梯（对照旧版 couponRate），任何商品都有得领
            const rate = price >= 10000 ? [500, 300] : price >= 3000 ? [200, 100] : price >= 1000 ? [80, 30] : [15, 10];
            claimed.push({ label: "商品平台满减券", reason: "联想商城专属，已自动领取", amount: -rate[0] });
            claimed.push({ label: "联想会员折扣券", reason: "乐享会员专享，已自动使用", amount: -rate[1] });
          }
          const discount = claimed.reduce((sum, c) => sum + c.amount, 0);
          return { claimed, discount, finalPrice: Math.max(0, price + discount) };
        }

        function lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr) {
          const rows = claimed.map((c) => `<div class="lx-bf-row"><div class="lx-bf-main"><strong><i class="lx-claim-check" style="animation:none;transform:none">✓</i> ${esc(c.label)}</strong><span>${esc(c.reason)}</span></div><b class="minus">-¥${Math.abs(c.amount).toLocaleString()}</b></div>`).join("");
          openModal(claimed.length ? `确认订单 · 已领取 ${claimed.length} 项优惠` : "确认订单", `
            <div class="lx-p0-row" style="align-items:center">
              <img src="${esc(imgUrl(item.image_url))}" alt="" style="width:64px;height:52px;object-fit:contain;background:#fff;border-radius:6px;flex:none" />
              <div class="lx-p0-row-main"><strong>${esc(item.name)}</strong><span>标价 ¥${Number(item.price || 0).toLocaleString()}</span></div>
            </div>
            <div class="lx-bf-list" style="margin:10px 0">${rows || '<p class="lx-p0-disclaimer">该商品暂无可叠加优惠，按标价下单。</p>'}
              <div class="lx-bf-row final" style="animation:none;opacity:1"><div class="lx-bf-main"><strong>到手价</strong>${discount ? `<span>已为你省 ¥${Math.abs(discount).toLocaleString()}</span>` : ""}</div><b>¥${(finalPrice || item.price).toLocaleString()}</b></div>
            </div>
            <div class="lx-p0-row" style="align-items:center">
              <div class="lx-p0-row-main"><strong>${esc(addr.name)} ${esc(addr.phone)}</strong><span>${esc(addr.region || "")}${esc(addr.detail || "")}</span></div>
              <button class="lx-p0-btn" type="button" data-occ-addr>修改</button>
            </div>
            <button class="lx-p0-btn primary" type="button" data-occ-confirm style="width:100%;margin-top:12px">确认下单</button>
            <p class="lx-p0-disclaimer">演示环境：订单仅保存在本机浏览器，不会真实发货。</p>`);
        }

        // 一键领优惠：领券过程在乐享对话流里逐项播报（对照旧版 startBuyFlow），全部领完才弹订单确认
        function oneClickBuy(product = state.currentProduct) {
          if (!product) return toast("请先选择商品");
          if (state._buyFlowRunning) return;
          const item = normalizeProduct(product);
          const { claimed, discount, finalPrice } = lxClaimBenefits(product);
          let addr = lxAddresses()[0];
          if (!addr) {
            addr = { name: "演示用户", phone: "138****0000", region: "演示地址", detail: "可在订单中修改收货信息" };
            save("lexiang.addresses.v1", [addr]);
          }
          state.pendingOrderProduct = { ...item, benefits: claimed, original_price: item.price, price: finalPrice || item.price };
          state.pendingOrderAddr = addr;
          if (!claimed.length) return lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr);
          state._buyFlowRunning = true;
          addMessage("user", `我要购买 ${item.name}，帮我领取所有可用优惠`);
          const card = `
            <div class="lx-buyflow-card">
              <div class="lx-bff-head"><strong>正在为你自动领取优惠</strong><span>${esc(item.name)}</span><div class="lx-bff-progress"><i data-bff-bar style="width:0%"></i></div></div>
              <div class="lx-bff-list" data-bff-list></div>
            </div>`;
          const node = addMessage("assistant", `好的！为你自动领取 ${claimed.length} 项专属优惠 👇`, card);
          const list = node.querySelector("[data-bff-list]");
          const bar = node.querySelector("[data-bff-bar]");
          const STEP = 1000;
          claimed.forEach((c, i) => {
            setTimeout(() => {
              list?.insertAdjacentHTML("beforeend", `<div class="lx-bff-item"><div class="lx-bff-info"><strong>${esc(c.label)}</strong><span>-¥${Math.abs(c.amount).toLocaleString()} · ${esc(c.reason)}</span></div><span class="lx-bff-status" data-bff-st="${i}"><i class="lx-bff-spinner"></i>领取中</span></div>`);
              ensureChat().scrollTop = ensureChat().scrollHeight;
            }, 300 + i * STEP);
            setTimeout(() => {
              const st = node.querySelector(`[data-bff-st="${i}"]`);
              if (st) { st.innerHTML = "✓ 已领取"; st.classList.add("done"); }
              if (bar) bar.style.width = `${Math.round(((i + 1) / claimed.length) * 100)}%`;
            }, 300 + i * STEP + 700);
          });
          setTimeout(() => {
            state._buyFlowRunning = false;
            list?.insertAdjacentHTML("afterend", `<div class="lx-bff-foot">共省 ¥${Math.abs(discount).toLocaleString()}，到手价 <b>¥${(finalPrice || item.price).toLocaleString()}</b></div>`);
            ensureChat().scrollTop = ensureChat().scrollHeight;
            lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr);
          }, 300 + claimed.length * STEP + 600);
        }

        // 收货地址（PRD 5.0.2 弹窗层场景：地址新增/编辑；下单前置选择）
        function lxAddresses() {
          const list = load("lexiang.addresses.v1");
          return Array.isArray(list) ? list : [];
        }

        function openAddressPicker(product) {
          state.pendingOrderProduct = product;
          const list = lxAddresses();
          const rows = list.map((addr, index) => `
            <div class="lx-p0-row lx-addr-row" data-addr-pick="${index}">
              <div class="lx-p0-row-main"><strong>${esc(addr.name)} ${esc(addr.phone)}</strong><span>${esc(addr.region || "")}${esc(addr.detail || "")}</span></div>
              <button class="lx-p0-btn primary" type="button" data-addr-pick="${index}">用这个地址下单</button>
            </div>`).join("");
          openModal("确认收货地址", `
            ${rows || `<p class="lx-p0-disclaimer">还没有收货地址，填写后即可下单。</p>`}
            <div class="lx-addr-form">
              <div class="lx-trail-head" style="border-top:none;padding-left:0">${rows ? "或新增地址" : "新增收货地址"}</div>
              <input class="lx-p0-field" id="lxAddrName" placeholder="收货人姓名">
              <input class="lx-p0-field" id="lxAddrPhone" placeholder="手机号">
              <input class="lx-p0-field" id="lxAddrRegion" placeholder="省 / 市 / 区">
              <input class="lx-p0-field" id="lxAddrDetail" placeholder="详细地址（街道、楼栋、门牌号）">
              <div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-addr-save>保存地址并下单</button></div>
            </div>
            <p class="lx-p0-disclaimer">演示环境：订单与地址仅保存在本机浏览器，不会真实发货。</p>`);
        }

        function lxPlaceOrder(address) {
          const product = state.pendingOrderProduct;
          if (!product) return;
          const order = { ...product, orderId: `LX${Date.now()}`, createdAt: new Date().toLocaleString("zh-CN"), address };
          if (product.benefits?.length) order.benefitNote = product.benefits.map((b) => `${b.label} -¥${Math.abs(b.amount).toLocaleString()}`).join("、");
          state.orders.unshift(order);
          save("lexiang.orders.v1", state.orders);
          state.pendingOrderProduct = null;
          updateBadges();
          toast("下单成功（演示订单）");
          if (state.user) openOrders();
        }

        function normalizeProduct(product) {
          return {
            sku: product.sku || product.name || String(Date.now()),
            name: product.name || "联想商品",
            price: Number(product.price) || 0,
            image_url: imgUrl(product.image_url),
            category: product.category || ""
          };
        }

        function openCart() {
          const rows = state.cart.length ? state.cart.map((item) => `
            <div class="lx-p0-row">
              <img src="${esc(item.image_url)}" alt="">
              <div class="lx-p0-row-main"><strong>${esc(item.name)}</strong><span>${esc(item.category)} · ${money(item.price)}</span></div>
              <button class="lx-p0-btn primary" data-buy-sku="${esc(item.sku)}">立即购买</button>
              <button class="lx-p0-btn" data-remove-cart="${esc(item.sku)}">移除</button>
            </div>`).join("") : `<p class="lx-p0-disclaimer">购物车为空。可以在商品详情页点击“加入购物车”。</p>`;
          openModal("购物车", rows);
        }

        function openOrders() {
          const invoice = load("lexiang.invoice.v1");
          const invoiceText = invoice && invoice.title ? `已设置开票抬头：${esc(invoice.title)}` : "未设置开票信息";
          const rows = state.orders.length ? state.orders.map((item) => `
            <div class="lx-p0-row">
              <img src="${esc(item.image_url)}" alt="">
              <div class="lx-p0-row-main"><strong>${esc(item.name)}</strong><span>订单 ${esc(item.orderId)} · ${esc(item.createdAt)} · ${money(item.price)}</span>${item.address ? `<span>收货：${esc(item.address.name || "")} ${esc(item.address.phone || "")} ${esc(item.address.region || "")}${esc(item.address.detail || "")}</span>` : ""}</div>
              <button class="lx-p0-btn" data-ask-order="${esc(item.name)}">问订单</button>
            </div>`).join("") : `<p class="lx-p0-disclaimer">暂无订单。点击商品详情页“立即购买”可生成演示订单。</p>`;
          openModal("我的订单", `${rows}<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-invoice>开票信息</button><span class="lx-invoice-note">${invoiceText}</span></div>`);
        }

        // 发票抬头（PRD 5.0.2 弹窗层场景：开票信息填写与修改）
        function openInvoiceForm() {
          const invoice = load("lexiang.invoice.v1");
          const current = invoice && typeof invoice === "object" && !Array.isArray(invoice) ? invoice : {};
          openModal("开票信息", `
            <p class="lx-p0-disclaimer">设置后，后续订单默认按此抬头开票；企业专票需先完成企业认证。</p>
            <input class="lx-p0-field" id="lxInvTitle" placeholder="发票抬头（个人姓名或企业名称）" value="${esc(current.title || "")}">
            <input class="lx-p0-field" id="lxInvTax" placeholder="纳税人识别号（企业开票必填）" value="${esc(current.taxNo || "")}">
            <div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-invoice-save>保存开票信息</button></div>`);
        }

        function addCompare(product = state.currentProduct) {
          if (!product) return toast("请先选择商品");
          const item = normalizeProduct(product);
          if (state.compare.some((p) => p.sku === item.sku)) return toast("该商品已在对比清单");
          if (state.compare.length >= 4) return toast("最多对比 4 件商品");
          state.compare.push(item);
          save("lexiang.compare.v1", state.compare);
          // 收口到右侧「对比」标签：不打断当前浏览，仅更新标签与数量
          lxUpsertCompareTab(null, null, false);
          toast(`已加入对比（${state.compare.length}），点右侧「对比」标签查看`);
          if (state.compare.length === 2) lxShowHint("已选 2 件商品，差异点我可以一眼帮你标出来", `帮我对比${state.compare.map((p) => p.name).join("和")}，给出对比表`);
        }

        // 对比统一收口：所有对比（手动清单 / SPU 系列 / AI 触发）都落右侧「对比」标签页，不再弹窗
        function lxUpsertCompareTab(products, label, activate = true) {
          const isCustom = Array.isArray(products) && products.length > 0;
          lxUpsertTab({
            id: "compare",
            kind: "compare",
            label: label || `对比清单(${state.compare.length})`,
            products: isCustom ? products : null,
          }, activate);
          if (activate) lxRunTab((state.tabs || []).find((tab) => tab.id === "compare"));
        }

        function openCompare() {
          lxUpsertCompareTab(null, null, true);
        }

        // 浏览型内容（门店/会员/领券等）统一右侧信息标签页承载，弹窗只留表单与确认（PRD 5.0 载体分工）
        function lxEnsureInfoPage() {
          let pageBox = document.querySelector(".info-page");
          if (!pageBox) {
            pageBox = document.createElement("div");
            pageBox.className = "info-page";
            document.querySelector(".content")?.appendChild(pageBox);
          }
          return pageBox;
        }

        function lxOpenInfoTab(key, label, html) {
          const tab = { id: `info:${key}`, kind: "info", label, html };
          lxUpsertTab(tab);
          lxRunTab(tab);
        }

        function lxEnsureComparePage() {
          let pageBox = document.querySelector(".compare-page");
          if (!pageBox) {
            pageBox = document.createElement("div");
            pageBox.className = "compare-page";
            document.querySelector(".content")?.appendChild(pageBox);
          }
          return pageBox;
        }

        async function lxRenderComparePage(tab) {
          const pageBox = lxEnsureComparePage();
          const isCustom = Array.isArray(tab?.products) && tab.products.length > 0;
          const source = isCustom ? tab.products : state.compare;
          const title = tab?.label && isCustom ? tab.label : "商品参数对比";
          if (!source.length) {
            pageBox.innerHTML = `<div class="reco-head"><h2>${esc(title)}</h2><span>对比清单为空</span></div><p class="lx-p0-disclaimer">在商品详情页、推荐结果里点「加对比」，这里就会生成并排参数对比表。</p>`;
            return;
          }
          pageBox.innerHTML = `<div class="reco-head"><h2>${esc(title)}</h2><span>正在加载参数明细...</span></div>`;
          const full = await Promise.all(source.slice(0, 4).map(async (item) => {
            if (item.specs && Object.keys(item.specs).length) return item;
            try {
              const response = await fetch(`/api/products/${encodeURIComponent(item.sku)}`, { cache: "no-store" });
              if (response.ok) return await response.json();
            } catch {}
            return item;
          }));
          state._comparePageItems = full;
          const manage = isCustom ? "" : `<div class="lx-cmp-manage">${full.map((item) => `<span class="lx-cmp-chip">${esc(item.name?.slice(0, 22) || item.sku)}<button type="button" data-remove-compare="${esc(item.sku)}" aria-label="移除">×</button></span>`).join("")}</div>`;
          const body = full.length >= 2
            ? renderCompareTable(full, { actions: true })
            : `<p class="lx-p0-disclaimer">再加入 1 件商品即可生成并排对比表。</p>`;
          pageBox.innerHTML = `
            <div class="reco-head"><h2>${esc(title)}</h2><span>差异项已高亮，可直接加购或下单</span></div>
            ${manage}${body}
            <div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn" type="button" data-quick-ask="帮我解读这几款的差异，按我的需求给出选购建议：${esc(full.map((item) => item.name).join("、"))}">让乐享解读差异</button></div>`;
        }

        async function checkAuth() {
          try {
            const response = await fetch("/api/auth/me", { cache: "no-store" });
            const data = await response.json();
            state.user = data.user || null;
            updateUserArea();
          } catch {}
        }

        function updateUserArea() {
          const account = $(".account-wrap .utility-btn");
          if (!account) return;
          account.title = state.user ? `${state.user.nickname || state.user.phone || "已登录"}` : "登录 / 注册";
          const rows = $$(".account-menu .menu-row");
          if (rows[0]) rows[0].textContent = state.user ? (state.user.nickname || state.user.phone || "我的账号") : "登录 / 注册";
        }

        function openLogin() {
          openModal("登录 / 注册", `
            <p class="lx-p0-disclaimer">登录后可同步会员、订单和个性化导购信息。</p>
            <input class="lx-p0-field" id="lxLoginPhone" placeholder="手机号" inputmode="tel">
            <div class="lx-p0-actions">
              <input class="lx-p0-field" id="lxLoginCode" placeholder="短信验证码" inputmode="numeric" style="flex:1;margin:0">
              <button class="lx-p0-btn" data-send-code>获取验证码</button>
            </div>
            <div class="lx-p0-actions">
              <button class="lx-p0-btn primary" data-login-submit>登录</button>
              <button class="lx-p0-btn" data-login-guest>暂不登录</button>
            </div>`);
        }

        async function sendCode() {
          const phone = $("#lxLoginPhone")?.value.trim();
          if (!phone) return toast("请输入手机号");
          const response = await fetch("/api/auth/send-code", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone })
          });
          toast(response.ok ? "验证码已发送" : "验证码发送失败");
        }

        async function login() {
          const phone = $("#lxLoginPhone")?.value.trim();
          const code = $("#lxLoginCode")?.value.trim();
          if (!phone || !code) return toast("请输入手机号和验证码");
          const response = await fetch("/api/auth/login", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) return toast(data.error || "登录失败");
          state.user = data.user || { phone };
          closeModal();
          updateUserArea();
          toast("登录成功");
        }

        async function logout() {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          state.user = null;
          updateUserArea();
          toast("已退出登录");
        }

        function ensureChat() {
          document.body.dataset.state = "chat";
          const chatState = $(".chat-state");
          if (!chatState || $(".lx-p0-messages", chatState)) return $(".lx-p0-messages", chatState);
          chatState.innerHTML = `
            <div class="lx-p0-messages" aria-live="polite">
              <div class="lx-p0-message ai">你好，我是联想乐享。可以帮你找商品、查优惠、做对比、看订单和预约服务。</div>
              <div class="lx-p0-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>
            </div>`;
          return $(".lx-p0-messages", chatState);
        }

        function addMessage(role, text, extraHtml = "") {
          const list = ensureChat();
          const node = document.createElement("div");
          node.className = `lx-p0-message ${role}`;
          node.innerHTML = `${esc(text)}${extraHtml}`;
          list.appendChild(node);
          list.scrollTop = list.scrollHeight;
          return node;
        }

        function renderGenerating(label = "正在分析需求并生成回复...") {
          return `
            <div class="lx-generating" role="status" aria-live="polite">
              <div class="lx-generating-head"><span class="lx-generating-orb"></span>${esc(label)}</div>
              <div class="lx-generating-lines" aria-hidden="true">
                <span class="lx-generating-line"></span>
                <span class="lx-generating-line"></span>
                <span class="lx-generating-line"></span>
              </div>
            </div>`;
        }

        function renderProductsInMessage(products) {
          if (!Array.isArray(products) || !products.length) return "";
          return `<div class="lx-p0-products">${products.slice(0, 4).map((product) => `
            <button class="lx-p0-product-mini" type="button" data-open-product="${esc(product.sku || "")}">
              <img src="${esc(imgUrl(product.image_url))}" alt="">
              <span><strong>${esc(product.name || "联想商品")}</strong><span>${money(product.price)}</span></span>
            </button>`).join("")}</div>`;
        }

        function renderQueryHistory() {
          const dots = $(".page-dots");
          const menu = $(".prompt-menu", dots);
          if (!dots || !menu) return;
          const history = state.queryHistory.filter(Boolean);
          dots.classList.toggle("is-empty", !history.length);
          dots.querySelectorAll("i").forEach((dot) => dot.remove());
          history.forEach((_, index) => {
            const dot = document.createElement("i");
            if (index === history.length - 1) dot.className = "active";
            dots.insertBefore(dot, menu);
          });
          menu.innerHTML = history.map((query, index) => `<div class="menu-row${index === history.length - 1 ? " active" : ""}" data-q-anchor="${(state.queryAnchors || [])[index] ?? ""}">${esc(query)}</div>`).join("");
          // 对话脉络：打开过的页面节点，点击重开对应标签并滚回当时对话位置（PRD 6.3）
          const trail = state.pageTrail || [];
          if (trail.length) {
            menu.insertAdjacentHTML("beforeend", `<div class="lx-trail-head">打开过的页面</div>${trail.slice(-8).map((node) => `<div class="trail-row${node.tabId === state.activeTabId ? " active" : ""}" data-trail-tab="${esc(node.tabId)}" data-trail-anchor="${node.anchor ?? ""}">${esc(node.label)}</div>`).join("")}`);
          }
        }

        function resetConversation() {
          state.conversationNonce += 1;
          state.convId = null;
          state.sending = false;
          state.pendingImageUrl = "";
          state.pendingAudioUrl = "";
          state.queryHistory = [];
          document.body.dataset.state = "default";
          $(".lx-p0-messages")?.remove();
          const chatState = $(".chat-state");
          if (chatState) {
            chatState.innerHTML = `
              <div class="user-bubble">帮我推荐一款商品</div>
              <div class="assistant-answer">直接给你 3 款 2026 年最值得买的联想机型，覆盖轻薄办公 / 全能 AI / 游戏创作 你按预算和用途选就行</div>`;
          }
          const textarea = $(".composer textarea");
          if (textarea) {
            textarea.value = "";
            textarea.style.height = "";
            textarea.style.overflowY = "hidden";
          }
          updateUploadNote();
          renderQueryHistory();
          toast("已新建对话");
        }

        async function sendChat(message) {
          const text = (message || $(".composer textarea")?.value || "").trim();
          if (!text || state.sending) return;
          const nonce = state.conversationNonce;
          const textarea = $(".composer textarea");
          if (textarea) textarea.value = "";
          lxHideSuggest();
          addMessage("user", text);
          if (state.refProduct) ensureChat()?.lastElementChild?.insertAdjacentHTML("beforeend", `<div class="lx-ref-chip">引用：${esc(state.refProduct.name.slice(0, 22))}</div>`);
          setTimeout(() => lxSetRef(null), 100);
          if (/学生认证|教育认证/.test(text) && text.length <= 14) setTimeout(openStudentAuth, 400);
          state.queryHistory.push(text);
          (state.queryAnchors = state.queryAnchors || []).push(($(".lx-p0-messages")?.children.length || 1) - 1);
          renderQueryHistory();
          const ai = addMessage("ai loading", "", renderGenerating("正在检索权益、商品和服务信息..."));
          state.sending = true;
          try {
            const response = await fetch("/api/chat/stream", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                // 人工模式：消息注入专属客服人设（界面仍显示用户原文，对齐旧版逻辑）
                message: (state.refMsg ? `[用户引用了此前对话内容作为上下文: ${state.refMsg}]\n\n` : "") + (state.humanMode ? `[系统提示: 请以"专属客服小联"身份回复, 像人工客服一样亲切自然简短直接, 不用 markdown/列表/标题, 不暴露 AI 身份。]\n\n用户问: ${text}` : text),
                conv_id: state.convId,
                web_search: !!document.querySelector('.composer .chip[data-mode-chip="web"].is-active'),
                // 深度思考开关：开启时上游模型不支持工具调用（无商品卡/留资等），默认关闭走自动模式
                thinking_mode: !!document.querySelector('.composer .chip[data-mode-chip="think"].is-active'),
                site_type: API_SITE[state.page] || "default",
                product_context: state.refProduct || undefined,
                image_url: state.pendingImageUrl || undefined,
                audio_url: state.pendingAudioUrl || undefined
              })
            });
            if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
            let hasContent = false;
            const revealAi = () => {
              if (hasContent) return;
              ai.className = "lx-p0-message ai";
              ai.textContent = "";
              hasContent = true;
            };
            await readSse(response, {
              chunk: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const content = payload.text || data || "";
                if (!content) return;
                revealAi();
                if (!ai._textBox || !ai.contains(ai._textBox)) {
                  ai._textBox = document.createElement("div");
                  ai._textBox.className = "lx-msg-text";
                  ai.appendChild(ai._textBox);
                  ai._raw = "";
                }
                ai._raw += content;
                ai._textBox.textContent = ai._raw;
                ensureChat().scrollTop = ensureChat().scrollHeight;
              },
              status: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.conv_id || payload.convId) state.convId = payload.conv_id || payload.convId;
                if (payload.text) {
                  const head = $(".lx-generating-head", ai);
                  if (head) head.innerHTML = `<span class="lx-generating-orb"></span>${esc(payload.text)}`;
                }
              },
              products: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const products = payload.products || [];
                revealAi();
                ai.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
                if (products.length === 1 && products[0].sku) {
                  lxRevealContent();
                  openProduct(products[0].sku);
                } else if (products.length) {
                  lxRevealContent();
                  const recoTab = { id: "reco", kind: "reco", label: "AI 推荐", products };
                  lxUpsertTab(recoTab);
                  lxRunTab(recoTab);
                }
              },
              display: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const products = payload.products || payload.items || [];
                revealAi();
                if (payload.title && !ai.textContent.trim()) ai.textContent = payload.title;
                ai.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
                // 所推即所见 + 最短路径：1 款直接打开商详，多款落「AI 推荐」专属结果页（PRD 5.2/6.5）
                if (products.length === 1 && products[0].sku) {
                  lxRevealContent();
                  openProduct(products[0].sku);
                } else if (products.length) {
                  lxRevealContent();
                  const recoTab = { id: "reco", kind: "reco", label: payload.title || "AI 推荐", products };
                  lxUpsertTab(recoTab);
                  lxRunTab(recoTab);
                }
              },
              stores: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const stores = payload.stores || [];
                if (!stores.length) return;
                const perks = (payload.perks || []).map((perk) => esc(typeof perk === "string" ? perk : perk?.title || "")).filter(Boolean);
                const perksHtml = perks.length ? `<div class="lx-store-perks"><span class="lx-store-perks-label">到店权益</span>${perks.map((perk) => `<span class="lx-sol-item">${perk}</span>`).join("")}</div>` : "";
                const rows = stores.slice(0, 6).map((store) => {
                  const meta = [store.address, store.hours, store.tel || store.phone, store.distance].filter(Boolean).map(esc).join(" · ");
                  const slots = (store.slots || []).slice(0, 3).map((slot) => {
                    const label = typeof slot === "string" ? slot : slot?.time || "";
                    if (!label) return "";
                    const remain = slot && slot.remain != null ? `（余${slot.remain}）` : "";
                    return `<button class="lx-p0-btn lx-slot-btn" type="button" data-quick-ask="帮我预约${esc(store.name)} ${esc(label)} 到店体验">${esc(label)}${remain}</button>`;
                  }).join("");
                  return `<div class="lx-p0-row"><div class="lx-p0-row-main"><strong>${esc(store.name)}</strong><span>${meta}</span>${slots ? `<div class="lx-store-slots"><span class="lx-store-slots-label">可约时段</span>${slots}</div>` : ""}</div></div>`;
                }).join("");
                lxRevealContent();
                lxOpenInfoTab("stores", payload.title || "联想体验店", `${perksHtml}${rows}<p class="lx-p0-disclaimer">门店与时段为演示数据，正式预约以门店确认为准。</p>`);
              },
              coupon: () => { if (nonce === state.conversationNonce) { lxRevealContent(); openCouponCenter(); } },
              member: () => { if (nonce === state.conversationNonce) { lxRevealContent(); openMemberCenter(); } },
              tradein: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const bodyHtml = payload.content
                  ? mdLite(payload.content)
                  : `<p class="lx-p0-disclaimer">旧机估值、补贴权益和换新推荐已接入联想乐享。可继续发送旧机型号、成色和购买新机目标。</p>`;
                openModal(payload.title || "以旧换新", `${bodyHtml}<div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="我有旧机想以旧换新，请问怎么估值并叠加补贴">问联想乐享</button></div>`);
              },
              lead: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                openLeadPanel(payload.scenario || "");
              },
              official_products: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const products = payload.products || [];
                if (!products.length) return;
                revealAi();
                ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-suggest">${products.slice(0, 3).map((p) => `<button class="lx-p0-suggest-chip" type="button" data-official-url="${esc(p.url)}">${esc(p.name)} ¥${Number(p.price || 0).toLocaleString()}</button>`).join("")}</div>`);
                lxRevealContent();
                const recoTab = { id: "reco", kind: "reco", label: payload.title || "官方在售推荐", products };
                lxUpsertTab(recoTab);
                lxRunTab(recoTab);
              },
              choices: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const options = payload.options || [];
                if (!options.length) return;
                revealAi();
                ai.insertAdjacentHTML("beforeend", `<div class="lx-choices"><div class="lx-choices-title">${esc(payload.title || "请选择")}</div><div class="lx-p0-suggest">${options.map((opt) => `<button class="lx-p0-suggest-chip" type="button" data-choice="${esc(opt)}" data-choice-template="${esc(payload.ask_template || "{choice}")}">${esc(opt)}</button>`).join("")}</div></div>`);
                ensureChat().scrollTop = ensureChat().scrollHeight;
              },
              control: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                lxExecControl(payload.op, payload.target);
              },
              benefit: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const steps = Array.isArray(payload.waterfall) ? payload.waterfall : [];
                if (!steps.length) return; // 无明细时对话文本已足够，不再重复弹层
                const rows = steps.map((step) => {
                  const minus = Number(step.amount) < 0;
                  const amountText = `${minus ? "-" : ""}¥${Math.abs(Math.round(Number(step.amount) || 0)).toLocaleString()}`;
                  return `<div class="lx-bf-row${step.kind === "base" ? " base" : ""}"><div class="lx-bf-main"><strong>${esc(step.label || "")}</strong>${step.reason ? `<span>${esc(step.reason)}</span>` : ""}</div><b class="${minus ? "minus" : ""}">${amountText}</b></div>`;
                }).join("");
                const finalRow = payload.final_price ? `<div class="lx-bf-row final"><div class="lx-bf-main"><strong>预计到手价</strong>${payload.discount_total ? `<span>共可省 ¥${Math.abs(Math.round(payload.discount_total)).toLocaleString()}</span>` : ""}</div><b>¥${Math.round(payload.final_price).toLocaleString()}</b></div>` : "";
                lxOpenInfoTab("benefit", "到手价明细", `${payload.title ? `<p class="lx-md-p" style="font-size:13px">${esc(payload.title)}</p>` : ""}<div class="lx-bf-list">${rows}${finalRow}</div><p class="lx-p0-disclaimer">${esc(payload.final_text || "")} 优惠随活动变化，最终以实际结算页为准。</p>`);
              },
              solutions: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const list = Array.isArray(payload.solutions) ? payload.solutions : [];
                if (!list.length) {
                  openModal(payload.title || "推荐方案", `<p class="lx-p0-disclaimer">${esc(payload.note || "已生成方案，可继续向联想乐享细化预算、行业和交付要求。")}</p>`);
                  return;
                }
                const cards = list.map((sol) => {
                  const items = (sol.products || []).slice(0, 3).map((p) => `<span class="lx-sol-item">${esc(p.name)} ¥${Number(p.price || 0).toLocaleString()}</span>`).join("");
                  return `<div class="lx-sol-card"><strong>${esc(sol.title || "")}</strong><p>${esc(sol.summary || "")}</p>${items ? `<div class="lx-sol-items">${items}</div>` : ""}${sol.cta_text ? `<div class="lx-p0-actions"><button class="lx-p0-btn" data-quick-ask="${esc(sol.cta_text)}（方案：${esc(sol.title || "")}）">${esc(sol.cta_text)}</button></div>` : ""}</div>`;
                }).join("");
                openModal(payload.title || "推荐方案", `${cards}${payload.note ? `<p class="lx-p0-disclaimer">${esc(payload.note)}</p>` : ""}`);
              },
              modal: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.error) {
                  openModal(payload.title || "提示", `<p class="lx-p0-disclaimer">${esc(payload.error)}</p>`);
                  return;
                }
                if (payload.type === "compare" && Array.isArray(payload.products) && payload.products.length >= 2) {
                  // AI 触发的对比同样落右侧「对比」标签页（对比体验统一，不弹窗）
                  lxRevealContent();
                  lxUpsertCompareTab(payload.products, payload.title || "商品参数对比");
                  return;
                }
                openModal(payload.title || "联想乐享", mdLite(payload.content || ""));
              },
              customize: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const name = payload.product_name || "心仪机型";
                openModal(`${esc(name)} · 私人定制`, `<p class="lx-p0-disclaimer">告诉联想乐享你的用途和预算，即可生成专属配置方案。</p><div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="帮我把${esc(name)}配成性价比配置，并给出价格">性价比配置</button><button class="lx-p0-btn" data-quick-ask="帮我把${esc(name)}配成顶配，并给出价格">顶配方案</button><button class="lx-p0-btn" data-quick-ask="帮我推荐${esc(name)}的默认起步配置">起步配置</button></div>`);
              },
              nav: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                navigateToPortalSection(payload.target || "home");
              },
              thinking: () => {
                if (nonce !== state.conversationNonce) return;
                const head = $(".lx-generating-head", ai);
                if (head) head.innerHTML = `<span class="lx-generating-orb"></span>深度思考中，正在权衡更稳妥的建议...`;
              },
              think_end: () => {
                if (nonce !== state.conversationNonce) return;
                const head = $(".lx-generating-head", ai);
                if (head) head.innerHTML = `<span class="lx-generating-orb"></span>思考完成，正在组织回答...`;
              },
              suggestions: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const list = Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 3) : [];
                if (!list.length || !hasContent) return;
                ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-suggest">${list.map((sug) => `<button class="lx-p0-suggest-chip" type="button" data-quick-ask="${esc(sug)}">${esc(sug)}</button>`).join("")}</div>`);
              },
              done: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.conv_id || payload.convId) state.convId = payload.conv_id || payload.convId;
                // 流式结束后把整段回复升级为 markdown 渲染（加粗/列表/表格）
                if (ai._raw && ai._textBox && ai.contains(ai._textBox)) ai._textBox.innerHTML = mdLite(ai._raw);
              }
            });
            if (nonce !== state.conversationNonce) return;
            if (!hasContent) revealAi();
            if (!ai.textContent.trim() && !$(".lx-p0-products", ai)) ai.textContent = "我已经收到请求，可以继续补充预算、用途或偏好的机型。";
            ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>`);
            state.pendingImageUrl = "";
            state.pendingAudioUrl = "";
            updateUploadNote();
            if (state.officialCompare) callOfficialAI(text);
          } catch (error) {
            if (nonce !== state.conversationNonce) return;
            ai.className = "lx-p0-message ai";
            ai.textContent = "当前 AI 服务暂时不可用，请稍后重试。";
          } finally {
            if (nonce === state.conversationNonce) state.sending = false;
          }
        }

        // ── 企业账户认证 mock（PRD 5.8.1/5.13.1：认证是企业专享价/对公能力前置，POC 状态机）──
        const LX_ENT_KEY = "lexiang.enterprise.v1";
        const LX_ENT_REVIEW_MS = 12000;

        function lxEntState() {
          try {
            const raw = JSON.parse(localStorage.getItem(LX_ENT_KEY) || "null");
            const ent = raw && typeof raw === "object" ? raw : { status: "none" };
            if (ent.status === "pending" && ent.submittedAt && Date.now() - ent.submittedAt > LX_ENT_REVIEW_MS) {
              ent.status = "verified";
              localStorage.setItem(LX_ENT_KEY, JSON.stringify(ent));
            }
            return ent;
          } catch { return { status: "none" }; }
        }

        function lxSaveEntState(ent) {
          try { localStorage.setItem(LX_ENT_KEY, JSON.stringify(ent)); } catch {}
          lxRenderEnterpriseBanner();
        }

        function openEnterpriseAuth() {
          const ent = lxEntState();
          if (ent.status === "verified") {
            openModal("企业账户已认证", `<div class="lx-ent-status ok"><strong>${esc(ent.company || "贵公司")}</strong> 已通过企业采购负责人认证</div><ul class="lx-md-list"><li>企业专享价与采购补贴已生效</li><li>支持对公付款、增值税专票与企业账期咨询</li><li>专属客服与轻量定制方案通道已开通</li></ul><div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="以企业身份帮我推荐办公采购方案并说明专享权益">看企业专享推荐</button></div><p class="lx-p0-disclaimer">POC 演示环境：认证为模拟流程，正式上线将对接联想企业购实名核验。</p>`);
            return;
          }
          if (ent.status === "pending") {
            openModal("企业认证审核中", `<div class="lx-ent-status pending">「${esc(ent.company || "")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境审核约 10 秒自动完成；正式环境为 1-2 个工作日，结果会在本页面与账号菜单回显。</p>`);
            return;
          }
          openModal("企业采购负责人认证", `
            <p class="lx-p0-disclaimer">认证后解锁企业专享价、采购补贴、对公付款与专票账期等权益。</p>
            <input class="lx-p0-field" id="lxEntCompany" placeholder="企业/机构名称（必填）">
            <input class="lx-p0-field" id="lxEntCode" placeholder="统一社会信用代码（选填）">
            <input class="lx-p0-field" id="lxEntContact" placeholder="采购负责人姓名和电话">
            <div class="lx-p0-actions"><button class="lx-p0-btn primary" data-ent-submit>提交认证</button></div>`);
        }

        function lxRenderEnterpriseBanner() {
          // 页面横幅已废弃：认证邀请改在乐享对话内完成（右侧只是对话的辅助呈现）
          const banner = document.querySelector(".lx-ent-banner");
          if (banner) banner.hidden = true;
        }

        // 进入 b/biz 站时，乐享在对话内主动提示企业认证（预判用户诉求；每站每天最多一次）
        function lxEntInviteInChat(page) {
          if (page !== "business" && page !== "enterprise") return;
          const ent = lxEntState();
          if (ent.status === "verified") return;
          const key = `lexiang.entInvite.${page}.${new Date().toDateString()}`;
          try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
          const chat = ensureChat();
          if (!chat) return;
          const siteName = page === "business" ? "中小企业" : "政教及大企业";
          const tip = ent.status === "pending"
            ? `您的企业认证正在审核中，通过后我会第一时间为您切换企业专享价。<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-ent>查看进度</button></div>`
            : `我注意到您在浏览${siteName}专区。完成企业采购负责人认证后，我可以直接帮您按企业专享价、采购补贴和对公专票口径来推荐和报价。<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-ent>立即认证</button><button class="lx-p0-btn" type="button" data-quick-ask="先不认证，给我介绍一下企业采购有哪些权益">先了解权益</button></div>`;
          chat.insertAdjacentHTML("beforeend", `<div class="lx-p0-message ai">${tip}</div>`);
          chat.scrollTop = chat.scrollHeight;
        }

        // ── 子站竖向楼层（PRD 5.5/v2.3 楼层化：商品之外的服务/门店/会员/方案内容，对齐 lenovo.com.cn）──
        function lxFloorSection(title, sub, body, cta) {
          const classMap = [
            [/今日秒杀/, "lx-floor--activity lx-floor--seckill"],
            [/教育特惠|国补/, "lx-floor--activity lx-floor--education"],
            [/门店与服务/, "lx-floor--activity lx-floor--service"],
            [/会员权益/, "lx-floor--activity lx-floor--member"],
            [/企业专享|对公|轻量定制|行业解决方案|信创|大客户/, "lx-floor--activity"],
          ];
          const extraClass = (classMap.find(([pattern]) => pattern.test(title)) || [null, ""])[1];
          return `<section class="lx-floor ${extraClass}" data-floor-cat="${esc(title)}"><div class="lx-floor-head"><i class="lx-floor-badge" aria-hidden="true"></i><div class="lx-floor-title"><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div><div class="lx-floor-actions">${cta || ""}</div></div><div class="lx-floor-body">${body}</div></section>`;
        }

        // 分类页签与实际楼层保持一致：推荐 + 分类楼层 + 服务楼层，全部可锚点直达
        // PC 端不横滑：测宽放不下的页签收进「更多 ▾」悬停菜单（与 actionbar 同方案）
        function lxSyncCategoryTabs() {
          const tabsBox = document.querySelector(".category-tabs");
          if (!tabsBox || !["personal", "business", "enterprise"].includes(state.page)) return;
          if (!tabsBox.clientWidth) return;
          const labels = ["推荐", ...[...document.querySelectorAll("[data-site-floors] [data-floor-cat]")].map((node) => node.dataset.floorCat)];
          const activeLabel = tabsBox.querySelector("button.active:not([data-cat-more])")?.textContent.trim();
          const btnHtml = (label) => `<button type="button" class="${label === (activeLabel || "推荐") ? "active" : ""}">${esc(label)}</button>`;
          tabsBox.innerHTML = labels.map(btnHtml).join("");
          const gap = parseFloat(getComputedStyle(tabsBox).columnGap) || 36;
          const padLeft = parseFloat(getComputedStyle(tabsBox).paddingLeft) || 30;
          const buttons = [...tabsBox.children];
          const widths = buttons.map((node) => node.offsetWidth);
          const total = widths.reduce((sum, w, i) => sum + w + (i ? gap : 0), 0);
          let fit = labels.length;
          if (total > tabsBox.clientWidth - padLeft) {
            const avail = tabsBox.clientWidth - padLeft - 96 - gap;
            let used = 0;
            fit = 0;
            for (let i = 0; i < widths.length; i++) {
              used += widths[i] + (i ? gap : 0);
              if (used > avail) break;
              fit = i + 1;
            }
            fit = Math.max(1, fit);
          }
          const visible = labels.slice(0, fit);
          const overflow = labels.slice(fit);
          tabsBox.innerHTML = visible.map(btnHtml).join("") + (overflow.length
            ? `<span class="cat-more-wrap"><button type="button" data-cat-more>更多 ▾</button><div class="cat-more-menu">${overflow.map((label) => `<button type="button">${esc(label)}</button>`).join("")}</div></span>`
            : "");
        }

        function lxSeckillCountdown() {
          const now = new Date();
          const end = new Date(now);
          end.setHours(now.getHours() + (2 - (now.getHours() % 2)), 0, 0, 0);
          return end.getTime();
        }

        function lxFormatCountdown(target) {
          let remain = Number(target) - Date.now();
          if (remain <= 0) remain = Number(lxSeckillCountdown()) - Date.now();
          const h = String(Math.floor(remain / 3600000)).padStart(2, "0");
          const m = String(Math.floor((remain % 3600000) / 60000)).padStart(2, "0");
          const s = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");
          return `${h}:${m}:${s}`;
        }

        // 站内商品分类竖向楼层：分类 tab 即锚点，每个分类一层（PRD v2.3 楼层化，对齐 lenovo.com.cn）
        const LX_CATEGORY_MATCHERS = {
          personal: [
            ["小新", (p) => /小新/.test(p.name)],
            ["拯救者", (p) => /拯救者|Legion/i.test(p.name)],
            ["YOGA", (p) => /YOGA/i.test(p.name)],
            ["ThinkPad", (p) => /ThinkPad|ThinkBook/i.test(p.name)],
            ["手机", (p) => p.category === "手机" || /moto/i.test(p.name)],
            ["配件", (p) => ["耳机", "包袋", "键鼠相关", "显示器", "平板电脑"].includes(p.category)],
          ],
          business: [
            ["ThinkCentre", (p) => /ThinkCentre/i.test(p.name)],
            ["ThinkBook", (p) => /ThinkBook/i.test(p.name)],
            ["ThinkPad", (p) => /ThinkPad/i.test(p.name)],
            ["商用台式机", (p) => p.category === "台式机" || /扬天|瑞天/.test(p.name)],
            ["显示器", (p) => p.category === "显示器"],
            ["服务", (p) => ["打印机及配件", "键鼠相关", "服务产品"].includes(p.category)],
          ],
          enterprise: [
            ["政教采购", (p) => /信创|开天|启天|昭阳/.test(p.name)],
            ["大企业", (p) => /ThinkStation|ThinkSystem/i.test(p.name)],
            ["工作站", (p) => p.category === "工作站"],
            ["服务器", (p) => p.category === "服务器"],
            ["安全服务", (p) => p.category === "服务产品"],
          ],
        };

        function lxProductMiniCard(product) {
          if (product.official) {
            return `<div class="lx-floor-product" data-official-url="${esc(product.url)}">
            <div class="product-visual"><img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy" /></div>
            <h3 class="product-title">${esc(product.name)}<span class="lx-official-tag">官方在售</span></h3>
            <p class="spec">${esc(product.description || "")}</p>
            <div class="price">${money(product.price)}${product.variants > 1 ? `<span class="price-from">${product.variants} 款配置</span>` : ""}</div>
          </div>`;
          }
          const tags = Array.isArray(product.promotion_tags) && product.promotion_tags.length ? product.promotion_tags : ["官方优惠", "限时优惠"];
          const promos = tags.slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("");
          return `<div class="lx-floor-product" data-open-product="${esc(product.sku)}">
            <div class="product-visual"><img src="${esc(imgUrl(product.image_url))}" alt="${esc(product.name)}" loading="lazy" /></div>
            <h3 class="product-title">${esc(product.name || "联想商品")}</h3>
            <p class="spec">${esc(product.description || product.category || "官方正品｜联想服务")}</p>
            <div class="product-promos" aria-label="促销标签">${promos}</div>
            <div class="price">${money(product.price)}<span class="price-from">起</span></div>
          </div>`;
        }

        async function lxRenderCategoryFloors(box) {
          const page = state.page;
          const matchers = LX_CATEGORY_MATCHERS[page];
          if (!matchers) return "";
          const site = API_SITE[page] || "shop";
          if (!state.floorProducts || state.floorProductsSite !== site) {
            try {
              const response = await fetch(`/api/products?site=${encodeURIComponent(site)}&limit=48`, { cache: "no-store" });
              state.floorProducts = await response.json();
              state.floorProductsSite = site;
            } catch { state.floorProducts = []; }
          }
          const pool = Array.isArray(state.floorProducts) ? state.floorProducts : [];
          const used = new Set();
          return matchers.map(([label, match]) => {
            const items = pool.filter((p) => !used.has(p.sku) && match(p)).slice(0, 5);
            items.forEach((p) => used.add(p.sku));
            if (!items.length) return "";
            return `<section class="lx-floor" data-floor-cat="${esc(label)}"><div class="lx-floor-head"><h3>${esc(label)}</h3><span>精选 ${items.length} 款</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我推荐${esc(label)}里适合我的产品">问乐享要推荐</button></div><div class="lx-floor-products">${items.map(lxProductMiniCard).join("")}</div></section>`;
          }).join("");
        }

        async function lxRenderSiteFloors() {
          const grid = document.querySelector(".product-grid");
          if (!grid) return;
          let box = document.querySelector("[data-site-floors]");
          if (!box) {
            box = document.createElement("div");
            box.className = "lx-site-floors";
            box.setAttribute("data-site-floors", "");
            grid.after(box);
          }
          const page = state.page;
          if (!["personal", "business", "enterprise"].includes(page)) { box.hidden = true; return; }
          box.hidden = false;
          const categoryFloors = await lxRenderCategoryFloors(box);
          if (state.page !== page) return;
          const quickCard = (title, desc, ask) => `<div class="lx-floor-card" data-quick-ask="${esc(ask)}"><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`;
          if (page === "personal") {
            const findProduct = (pattern) => (state.products || []).find((item) => pattern.test(item.name || "")) || {};
            const seckill = [
              {
                pattern: /小新\s*Pro16|Pro\s*16/i,
                name: "联想 小新 Pro16 2022 标压锐龙版 16英寸轻薄笔记本",
                spec: "AMD Ryzen R5 5600H / Windows 11 家庭中文版 / 16 英寸",
                price: "5,279",
                old: "5,999",
                sold: 72
              },
              {
                pattern: /小新\s*16|酷睿标压/i,
                name: "联想小新16 酷睿标压版 16英寸轻薄笔记本电脑",
                spec: "第13代酷睿标压 i5-13500H / Windows 11 / 16 英寸",
                price: "4,047",
                old: "4,599",
                sold: 86
              },
              {
                pattern: /YOGA\s*Air14s|Air\s*14s/i,
                name: "联想YOGA Air14s 2023款 14.5英寸轻薄笔记本",
                spec: "AMD Ryzen 7 7840S / Windows 11 家庭中文版 / 14.5 英寸",
                price: "7,039",
                old: "7,999",
                sold: 58
              }
            ].map((item) => {
              const product = findProduct(item.pattern);
              const image = "";
              const imageHtml = "";
              const openAttr = product.sku ? `data-open-product="${esc(product.sku)}"` : `data-quick-ask="我想了解${esc(item.name)}秒杀活动"`;
              return `<article class="lx-seckill-card" ${openAttr} tabindex="0">
                <div class="lx-seckill-media is-empty">${imageHtml}</div>
                <div class="lx-seckill-info">
                  <h4>${esc(item.name)}</h4>
                  <p>${esc(item.spec)}</p>
                  <div class="lx-seckill-price"><strong>¥${esc(item.price)}</strong><s>¥${esc(item.old)}</s></div>
                  <div class="lx-seckill-progress" aria-label="已抢 ${item.sold}%"><i style="--sold:${item.sold}%"></i></div>
                  <div class="lx-seckill-foot"><span>已抢 ${item.sold}%</span><button type="button" data-quick-ask="帮我抢购${esc(item.name)}秒杀价">立即抢</button></div>
                </div>
              </article>`;
            }).join("");
            const eduCards = [
              ["01", "学生认证享专属价", "小学到博士及应届高考生均可认证", "去认证", "我想做学生认证享专属价"],
              ["02", "算清到手价", "教育价 + 国补 + 优惠券逐层叠加", "算价格", "帮我算下教育优惠+国补叠加后的到手价"],
              ["03", "以旧换新", "旧机折价抵扣，支持寄修/上门/到店", "估旧机", "我有旧机想以旧换新，怎么估值？"]
            ].map(([num, title, desc, action, ask]) => `<article class="lx-benefit-card" data-quick-ask="${esc(ask)}" tabindex="0"><span class="lx-step-watermark">${num}</span><i class="lx-benefit-icon" aria-hidden="true">${num}</i><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><b>${esc(action)}</b></div></article>`).join("");
            const storeCards = [
              ["附近门店", ["查门店", "看库存", "约到店服务"], "帮我查附近的联想门店和到店权益"],
              ["上门服务", ["安装", "清灰", "换电池", "数据迁移"], "联想上门服务都有什么项目？"]
            ].map(([title, chips, ask]) => `<article class="lx-service-card" data-quick-ask="${esc(ask)}" tabindex="0"><i class="lx-service-icon" aria-hidden="true"></i><div><h4>${esc(title)}</h4><div class="lx-service-chips">${chips.map((chip) => `<span>${esc(chip)}</span>`).join("")}</div></div><b aria-hidden="true">→</b></article>`).join("");
            const memberCards = [
              ["1000", "≈ ¥10", "乐豆抵现", "1000 乐豆抵 ¥10，购物即赚", "我的乐豆余额和会员权益有哪些？"],
              ["button", "一键领取", "领券中心", "新人券、品类券一键领取", "现在有哪些优惠券可以领？"]
            ].map(([num, unit, title, desc, ask]) => `<article class="lx-member-card" data-quick-ask="${esc(ask)}" tabindex="0"><div><h4>${esc(title)}</h4><p>${esc(desc)}</p></div><strong>${esc(num)}<small>${esc(unit)}</small></strong></article>`).join("");
            const seckillEnd = lxSeckillCountdown();
            box.innerHTML = categoryFloors + [
              lxFloorSection("今日秒杀", "限时优惠，先到先得", `<div class="lx-floor-seckill">${seckill}</div>`, `<span class="lx-floor-countdown">距本场结束 <b data-lx-countdown="${seckillEnd}">${lxFormatCountdown(seckillEnd)}</b></span><button class="lx-p0-btn primary" type="button" data-quick-ask="今天有哪些秒杀和限时优惠活动？">更多秒杀</button>`),
              lxFloorSection("教育特惠 · 国补叠加", "学生教师专属价，国补可叠加", eduCards, `<button class="lx-p0-btn" type="button" data-edu-zone>进入教育专区</button>`),
              lxFloorSection("门店与服务", "线上下单，到店体验", storeCards, `<button class="lx-p0-btn" type="button" data-floor-action="stores">查附近门店</button>`),
              lxFloorSection("会员权益", "乐豆抵现 · 会员券 · 0元试用", memberCards, `<button class="lx-p0-btn" type="button" data-floor-action="member">会员中心</button><button class="lx-p0-btn" type="button" data-floor-action="coupon">领券中心</button>`),
            ].join("");
          } else if (page === "business") {
            const ent = lxEntState();
            const entCta = ent.status === "verified" ? `<button class="lx-p0-btn" type="button" data-open-ent>已认证 · 查看权益</button>` : `<button class="lx-p0-btn primary" type="button" data-open-ent>立即认证</button>`;
            box.innerHTML = categoryFloors + [
              lxFloorSection("企业专享权益", "认证即享，价格优于个人渠道", quickCard("企业专享价", "认证后全场企业价", "企业专享价怎么享受？") + quickCard("采购补贴", "定制采购最高 25% 补贴", "企业采购补贴政策是什么？") + quickCard("会员 8 折", "企业会员专属折扣", "企业会员折扣怎么用？") + quickCard("新客礼券", "首购礼券一键领取", "企业新客有什么礼券？"), entCta),
              lxFloorSection("对公与售后保障", "财务合规，售后省心", quickCard("增值税专票", "下单开专票，资料线上提交", "企业购买怎么开增值税专票？") + quickCard("企业账期", "30/60/90 天账期可申请", "企业账期怎么申请？") + quickCard("3 年保修", "整机 3 年含上门维修", "商用机型的保修政策是什么？") + quickCard("远程支持", "工程师远程 + 上门一体化", "企业售后服务都包含什么？")),
              lxFloorSection("轻量定制方案", "一句话提需求，专业人员搭配", quickCard("一键提交需求", "用途/台量/预算，30 分钟内响应", "帮我配一套办公采购方案"), `<button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交采购需求</button>`),
              lxFloorSection("门店与服务", "企业客户同享到店服务", quickCard("附近门店", "到店看样机、谈批量采购", "帮我查附近的联想门店"), `<button class="lx-p0-btn" type="button" data-floor-action="stores">查附近门店</button>`),
            ].join("");
          } else {
            box.innerHTML = categoryFloors + [
              lxFloorSection("行业解决方案", "六大行业整体方案与同行案例", Object.keys(LX_SOLUTIONS).map((industry) => `<div class="lx-floor-card" data-solution="${esc(industry)}"><strong>${esc(industry)}</strong><span>概述 · 功能 · 优势 · 收益 · 案例</span></div>`).join(""), `<button class="lx-p0-btn primary" type="button" data-solution-center>进入方案中心</button>`),
              lxFloorSection("信创合规", "国产化适配 · 等保国密 · 政采资质", `<div class="lx-floor-card" data-xinchuang><strong>信创合规专区</strong><span>合规货盘 · 资质背书 · 选型指南</span></div>` + quickCard("等保与国密", "等保 2.0 三级、国密 TCM 机型", "满足等保和国密要求的机型有哪些？") + quickCard("招投标支持", "政采入围资质、投标资料", "参与政采招投标需要什么资质支持？"), `<button class="lx-p0-btn primary" type="button" data-xinchuang>进入信创专区</button>`),
              lxFloorSection("大客户专属服务", "专属客户经理 · 全生命周期", quickCard("项目意向单", "提交项目信息，专家一对一", "我有采购项目，想对接专属顾问") + quickCard("DaaS 服务", "设备即服务，运维资产全托管", "DaaS 全生命周期服务包含什么？") + `<div class="lx-floor-card" data-whitepaper><strong>白皮书资料库</strong><span>选型指南 · 行业方案 · 实施手册</span></div>`, `<button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交项目意向</button>`),
            ].join("");
          }
          lxSyncCategoryTabs();
        }

        setInterval(() => {
          document.querySelectorAll("[data-lx-countdown]").forEach((node) => {
            let remain = Number(node.dataset.lxCountdown) - Date.now();
            if (remain <= 0) { node.dataset.lxCountdown = String(lxSeckillCountdown()); remain = Number(node.dataset.lxCountdown) - Date.now(); }
            const h = String(Math.floor(remain / 3600000)).padStart(2, "0");
            const m = String(Math.floor((remain % 3600000) / 60000)).padStart(2, "0");
            const s = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");
            node.textContent = `${h}:${m}:${s}`;
          });
        }, 1000);

        // ── 学生认证 mock（PRD 5.7.2：教育价前置，复用企业认证状态机模式）──
        const LX_STU_KEY = "lexiang.student.v1";
        const LX_STU_REVIEW_MS = 12000;

        function lxStuState() {
          try {
            const raw = JSON.parse(localStorage.getItem(LX_STU_KEY) || "null");
            const stu = raw && typeof raw === "object" ? raw : { status: "none" };
            if (stu.status === "pending" && stu.submittedAt && Date.now() - stu.submittedAt > LX_STU_REVIEW_MS) {
              stu.status = "verified";
              localStorage.setItem(LX_STU_KEY, JSON.stringify(stu));
            }
            return stu;
          } catch { return { status: "none" }; }
        }

        function lxSaveStuState(stu) {
          try { localStorage.setItem(LX_STU_KEY, JSON.stringify(stu)); } catch {}
          if (state.activeTabId === "info:edu") openEduZone();
        }

        function openStudentAuth() {
          const stu = lxStuState();
          if (stu.status === "verified") {
            openModal("学生认证已通过", `<div class="lx-ent-status ok"><strong>${esc(stu.name || "同学")}</strong> 已通过学生身份认证</div><ul class="lx-md-list"><li>教育专享价已生效，可与国家补贴叠加</li><li>部分机型支持 12 期免息与赠原装配件</li></ul><div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-edu-zone>逛教育特惠专区</button></div><p class="lx-p0-disclaimer">POC 演示环境：认证为模拟流程，正式上线对接学信网核验。</p>`);
            return;
          }
          if (stu.status === "pending") {
            openModal("学生认证审核中", `<div class="lx-ent-status pending">「${esc(stu.name || "")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境约 10 秒自动通过；正式环境 1-5 天，结果在教育专区与本弹窗回显。</p>`);
            return;
          }
          openModal("学生身份认证", `
            <p class="lx-p0-disclaimer">覆盖小学到博士及应届高考生，认证后享教育专享价，可与国补叠加。</p>
            <input class="lx-p0-field" id="lxStuName" placeholder="姓名（必填）">
            <input class="lx-p0-field" id="lxStuSchool" placeholder="学校名称">
            <input class="lx-p0-field" id="lxStuStage" placeholder="学历阶段，如 本科 / 硕士 / 高三应届">
            <div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-stu-submit>提交认证</button></div>`);
        }

        // 教育特惠专区（右侧信息标签页）：认证状态 + 教育货盘 + 国补叠加 + 算到手价
        async function openEduZone() {
          const stu = lxStuState();
          let pool = [];
          try {
            const response = await fetch("/api/products?site=shop&limit=24", { cache: "no-store" });
            pool = (await response.json()).filter((p) => p.category === "笔记本电脑").slice(0, 8);
          } catch {}
          const statusBar = stu.status === "verified"
            ? `<div class="lx-ent-banner"><span class="lx-ent-badge ok">已认证</span><span class="lx-ent-text"><strong>${esc(stu.name || "同学")}</strong> 教育专享价已生效，下方为认证后价格（演示）</span></div>`
            : stu.status === "pending"
              ? `<div class="lx-ent-banner"><span class="lx-ent-badge pending">审核中</span><span class="lx-ent-text">学生认证审核中，通过后自动解锁教育专享价</span><button class="lx-p0-btn" type="button" data-stu-auth>查看进度</button></div>`
              : `<div class="lx-ent-banner"><span class="lx-ent-badge">未认证</span><span class="lx-ent-text">学生/教师认证后享教育专享价，并可与国家补贴叠加</span><button class="lx-p0-btn primary" type="button" data-stu-auth>立即认证</button></div>`;
          const cards = pool.map((p) => {
            const eduPrice = Math.round(Number(p.price || 0) * 0.95);
            const priceHtml = stu.status === "verified"
              ? `<div class="lx-sim-price">教育价 ¥${eduPrice.toLocaleString()} <s class="lx-edu-orig">¥${Number(p.price || 0).toLocaleString()}</s></div>`
              : `<div class="lx-sim-price">¥${Number(p.price || 0).toLocaleString()}</div><span class="lx-edu-hint">认证后享教育价</span>`;
            return `<div class="lx-sim-card" data-open-product="${esc(p.sku)}"><img src="${esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" /><div class="lx-sim-name">${esc(p.name)}</div>${priceHtml}</div>`;
          }).join("");
          const rules = `<div class="lx-floor" style="margin-top:14px"><div class="lx-floor-head"><h3>国补叠加规则</h3><span>教育价与国家补贴可叠加，逐层计算</span><button class="lx-p0-btn primary" type="button" data-quick-ask="帮我算下教育优惠+国补叠加后的到手价，按学生身份">算到手价</button></div><ul class="lx-md-list"><li>第一层：教育专享价（认证学生/教师）</li><li>第二层：国家补贴 15%（目录内机型）</li><li>第三层：教育认证券与会员券叠加</li></ul><p class="lx-p0-disclaimer">演示口径：教育价按 95 折模拟，实际优惠以商品页与结算页为准。</p></div>`;
          lxOpenInfoTab("edu", "教育特惠专区", `${statusBar}<div class="lx-sim-grid" style="margin-top:14px">${cards || '<p class="lx-p0-disclaimer">教育货盘加载中，可稍后重试。</p>'}</div>${rules}`);
        }

        // ── 迭代二：biz 内容页体系（PRD 5.13.2/3/6/8）──
        const LX_SOLUTIONS = {
          "智慧教育": { icon: "🎓", overview: "覆盖智慧教室、电子教学、校园信创替代的一体化方案，从终端到云端统一交付。", features: ["智慧教室终端（教学一体机/师生 PC）统一部署", "教学资源云平台与本地缓存加速", "校园信创替代：开天系列+国产 OS 适配", "设备资产统一管理与远程运维"], advantages: ["教育行业 Top 客户覆盖率领先", "信创目录全适配，政采流程成熟", "全国 2400+ 服务网点护航开学季"], gains: "某省属高校 8000 终端信创替代项目：交付周期缩短 40%，三年运维成本下降 30%。", cases: ["某省属重点高校 8000 台信创替代", "某市教育局智慧教室全覆盖工程"] },
          "数字政府": { icon: "🏛️", overview: "面向政务办公与政务服务的安全可信终端与基础设施方案，满足等保与国产化要求。", features: ["政务办公信创 PC/打印外设整体配套", "等保 2.0 三级安全基线预置", "政务云资源池与超融合基础设施", "全生命周期资产管理（DaaS）"], advantages: ["政采框架入围+央采中标资质齐全", "开天系列通过主流国产 OS/CPU 兼容认证", "专属客户经理 1 对 1 长期服务"], gains: "某省级机关 1.2 万台政务终端国产化替代：单台综合成本下降 18%。", cases: ["某省级机关万台信创替代", "某市政务服务中心智能窗口改造"] },
          "智慧医疗": { icon: "🏥", overview: "医院信息化终端、影像工作站与边缘算力方案，保障 7×24 不间断业务。", features: ["医护工作站/移动查房终端", "影像后处理高性能工作站", "院内边缘计算与数据安全网关", "7×24 快速响应运维服务包"], advantages: ["医疗行业定制机型（抗菌外壳/静音）", "与主流 HIS/PACS 厂商完成适配", "闪修与备机服务降低停机风险"], gains: "某三甲医院全院终端升级：门诊系统响应速度提升 35%，故障率下降一半。", cases: ["某三甲医院全院 3000 终端升级", "某区域影像中心 GPU 工作站集群"] },
          "智能制造": { icon: "🏭", overview: "工厂产线工控终端、边缘 AI 质检与数字孪生算力底座，助力制造数字化。", features: ["产线工控机与工业平板", "边缘 AI 质检一体机（GPU 推理）", "数字孪生/仿真高性能工作站", "车间级设备统一管理平台"], advantages: ["联想自有工厂最佳实践复制", "宽温抗尘工业级硬件", "ThinkStation 专业认证覆盖主流工业软件"], gains: "某汽配厂边缘质检方案：漏检率下降 60%，单线人力成本省 25%。", cases: ["某汽配集团 12 条产线 AI 质检", "某家电企业数字孪生仿真平台"] },
          "智慧金融": { icon: "🏦", overview: "网点智能化与金融信创双轨方案，兼顾体验升级与合规替代。", features: ["智能网点终端（柜面/自助/营销大屏）", "金融信创 PC 与外设整体替代", "国密合规加密终端", "双机房高可用基础设施"], advantages: ["国密 TCM/SM 系列算法机型齐备", "金融行业等保与密评经验丰富", "总分支多级交付与驻场服务"], gains: "某股份制银行 300 网点终端信创替代：业务切换零中断。", cases: ["某股份制银行 300 网点替代", "某券商核心机房超融合改造"] },
          "智能基础设施": { icon: "🖥️", overview: "服务器、存储与超融合算力底座，支撑 AI 训练推理与企业核心业务。", features: ["问天/ThinkSystem 服务器全栈", "DE/DM 系列企业级存储", "超融合与私有云一体化交付", "AI 算力集群（训练/推理）规划部署"], advantages: ["x86 服务器全球前三供应链", "液冷技术降 PUE 至 1.1 以下", "从规划到运维全栈交付能力"], gains: "某互联网企业 AI 推理集群：算力成本下降 22%，交付周期 5 周。", cases: ["某互联网企业千卡推理集群", "某能源集团两地三中心存储"] },
        };

        const LX_WHITEPAPERS = [
          ["信创 PC 选型指南（2026 版）", "覆盖开天/昭阳全系，含国产 OS/CPU 兼容矩阵"],
          ["智慧教育解决方案白皮书", "智慧教室+信创替代完整方案与案例"],
          ["政务信创替代实施手册", "等保 2.0 基线、政采流程与迁移路线图"],
          ["金融行业国密合规指南", "TCM/SM 算法机型与密评要点"],
          ["智能制造边缘 AI 白皮书", "产线质检与数字孪生算力规划"],
          ["企业级服务器选型手册", "问天/ThinkSystem 全栈配置指南"],
        ];

        function openSolutionCenter(industry) {
          if (industry && LX_SOLUTIONS[industry]) {
            const s = LX_SOLUTIONS[industry];
            const section = (title, body) => `<div class="lx-floor" style="margin-top:12px"><div class="lx-floor-head"><h3>${title}</h3></div>${body}</div>`;
            const html = `
              <button class="lx-p0-btn" type="button" data-solution-center style="margin-bottom:12px">← 返回方案中心</button>
              <p class="lx-md-p" style="font-size:14px">${esc(s.overview)}</p>
              ${section("方案功能", `<ul class="lx-md-list">${s.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`)}
              ${section("方案优势", `<ul class="lx-md-list">${s.advantages.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`)}
              ${section("客户收益", `<p class="lx-md-p">${esc(s.gains)}</p>`)}
              ${section("成功案例", s.cases.map((c) => `<div class="lx-floor-card" data-quick-ask="详细介绍这个案例：${esc(c)}"><strong>${esc(c)}</strong><span>点击让乐享详细介绍</span></div>`).join(""))}
              <div class="lx-p0-actions" style="margin-top:14px">
                <button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交合作意向</button>
                <button class="lx-p0-btn" type="button" data-whitepaper>下载相关白皮书</button>
                <button class="lx-p0-btn" type="button" data-quick-ask="按${esc(industry)}方案给我推荐具体产品配置">让乐享推荐配置</button>
              </div>`;
            lxOpenInfoTab("solution", `${industry}解决方案`, html);
            return;
          }
          const cards = Object.entries(LX_SOLUTIONS).map(([name, s]) => `<div class="lx-floor-card" data-solution="${esc(name)}"><strong>${s.icon} ${esc(name)}</strong><span>${esc(s.overview.slice(0, 38))}…</span></div>`).join("");
          lxOpenInfoTab("solution", "行业解决方案中心", `<div class="lx-floor-body">${cards}</div><p class="lx-p0-disclaimer">六大行业整体方案，点击查看「概述/功能/优势/收益」与同行案例。</p>`);
        }

        async function openXinchuangZone() {
          let pool = [];
          try {
            const res = await fetch("/api/products?site=biz&limit=30", { cache: "no-store" });
            pool = (await res.json()).filter((p) => /开天|昭阳|启天|问天|ThinkStation/i.test(p.name) || ["服务器", "工作站"].includes(p.category)).slice(0, 8);
          } catch {}
          const badges = ["政采框架入围", "央采中标", "等保 2.0 适配", "国密 TCM/SM", "麒麟/统信认证", "海光/鲲鹏/飞腾适配"].map((b) => `<span class="lx-sol-item">${b}</span>`).join("");
          const cards = pool.map(lxProductMiniCard).join("");
          lxOpenInfoTab("xinchuang", "信创合规专区", `
            <div class="lx-cmp-manage" style="margin-bottom:14px">${badges}</div>
            <div class="lx-sim-grid">${cards || '<p class="lx-p0-disclaimer">货盘加载中</p>'}</div>
            <div class="lx-floor" style="margin-top:14px"><div class="lx-floor-head"><h3>选型支持</h3></div><div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-whitepaper>下载信创选型指南</button><button class="lx-p0-btn" type="button" data-quick-ask="满足等保和国密要求的机型怎么选？">问等保国密选型</button><button class="lx-p0-btn" type="button" data-quick-ask="参与政采招投标需要什么资质支持？">问招投标支持</button></div></div>`);
        }

        function openWhitepaperLib() {
          const rows = LX_WHITEPAPERS.map(([name, desc]) => `<div class="lx-p0-row"><div class="lx-p0-row-main"><strong>${esc(name)}</strong><span>${esc(desc)}</span></div><button class="lx-p0-btn primary" type="button" data-wp-download="${esc(name)}">下载</button></div>`).join("");
          lxOpenInfoTab("whitepaper", "白皮书资料库", `${rows}<p class="lx-p0-disclaimer">下载需留下联系方式，资料将发送至您的邮箱/手机（演示环境）。</p>`);
        }

        // ── 右侧内容页多标签（PRD 5.0/6.5：多标签并存、可切换、可关闭）──
        const LX_SITE_TAB_LABELS = { personal: "个人及家庭", business: "中小企业", enterprise: "政教及大企业", brand: "品牌" };

        function lxEnsureTabbar() {
          let bar = document.querySelector(".lx-tabbar");
          if (!bar) {
            bar = document.createElement("div");
            bar.className = "lx-tabbar";
            bar.hidden = true;
            document.querySelector(".content")?.prepend(bar);
          }
          return bar;
        }

        function lxRenderTabbar() {
          const bar = lxEnsureTabbar();
          const tabs = state.tabs || [];
          bar.innerHTML = tabs.map((tab) => `<span class="lx-tab${tab.id === state.activeTabId ? " is-active" : ""}" data-tab-id="${esc(tab.id)}" role="tab" aria-selected="${tab.id === state.activeTabId}"><span class="lx-tab-label">${esc(tab.label || "")}</span><button class="lx-tab-close" type="button" data-tab-close="${esc(tab.id)}" aria-label="关闭标签">×</button></span>`).join("");
          bar.hidden = tabs.length <= 1; // 单标签无切换意义，隐藏（用户反馈）
        }

        function lxUpsertTab(tab, activate = true) {
          state.tabs = state.tabs || [];
          const idx = state.tabs.findIndex((item) => item.id === tab.id);
          if (idx >= 0) state.tabs[idx] = { ...state.tabs[idx], ...tab };
          else {
            state.tabs.push(tab);
            if (state.tabs.length > 8) {
              const evict = state.tabs.findIndex((item) => item.id !== state.activeTabId && item.id !== tab.id);
              if (evict >= 0) state.tabs.splice(evict, 1);
            }
          }
          if (activate) state.activeTabId = tab.id;
          // 对话脉络节点：记录打开的页面与当时对话锚点（连续重复不重复记）
          state.pageTrail = state.pageTrail || [];
          const lastNode = state.pageTrail[state.pageTrail.length - 1];
          if (!lastNode || lastNode.tabId !== tab.id) {
            const chatBox = document.querySelector(".lx-p0-messages");
            state.pageTrail.push({ tabId: tab.id, label: tab.label || "", anchor: chatBox ? chatBox.children.length - 1 : null });
            if (state.pageTrail.length > 20) state.pageTrail.shift();
            renderQueryHistory();
          }
          lxRenderTabbar();
        }

        function lxRunTab(tab) {
          if (!tab) return;
          if (tab.kind === "site") {
            routeTo(tab.page);
          } else if (tab.kind === "detail") {
            openProduct(tab.sku);
          } else if (tab.kind === "reco") {
            // 推荐结果专属视图：只展示推荐款，不混入站点货架（最短路径）
            lxRenderRecoPage(tab);
            const content = document.querySelector(".content");
            content?.setAttribute("data-view", "reco");
            content?.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab.kind === "compare") {
            lxRenderComparePage(tab);
            const content = document.querySelector(".content");
            content?.setAttribute("data-view", "compare");
            content?.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab.kind === "info") {
            const pageBox = lxEnsureInfoPage();
            pageBox.innerHTML = `<div class="reco-head"><h2>${esc(tab.label || "")}</h2></div>${tab.html || ""}`;
            const content = document.querySelector(".content");
            content?.setAttribute("data-view", "info");
            content?.scrollTo({ top: 0, behavior: "smooth" });
          }
        }

        // ── 输入实时联想（设计稿：根据输入预测后续，逐级点选补全需求；槽位齐则不出）──
        const LX_SUGGEST_TREE = {
          // 槽位1：品类（有购买意图但没说买什么）
          category: {
            test: (t) => /买|想要|来一台|推荐|选购|换个|入手/.test(t) && !/笔记本|游戏本|轻薄本|电脑|台式|主机|手机|平板|显示器|耳机|打印|服务器|键盘|鼠标/.test(t),
            title: "想买点什么？",
            options: [
              ["笔记本电脑", "拯救者 · 小新 · YOGA · ThinkPad", "我想买一台笔记本电脑，"],
              ["台式机", "拯救者 · 天逸 · ThinkCentre", "我想买一台台式机，"],
              ["手机", "moto 折叠屏 · 直板机", "我想买一部手机，"],
              ["平板电脑", "小新Pad · YOGA Pad · 拯救者", "我想买一台平板电脑，"],
              ["显示器", "拯救者 · ThinkVision · 来酷", "我想买一台显示器，"],
              ["耳机/外设", "来酷 · 拯救者 · ThinkPlus", "我想买耳机，"],
            ],
            replace: true,
          },
          // 槽位2：用途（按品类分支；「电脑」泛词归笔记本）
          usage: {
            test: (t) => /笔记本|游戏本|轻薄本|电脑/.test(t) && !/台式|主机|手机|平板|显示器|耳机/.test(t) && !/游戏|办公|学习|设计|创作|剪辑|编程|送人|网课|建模|学生/.test(t),
            title: "主要用来做什么？",
            options: [
              ["用来玩游戏", "", "用来玩游戏，"],
              ["用来办公/学习", "", "用来办公和学习，"],
              ["用来做设计/AI创作", "", "用来做设计和AI创作，"],
              ["用来送人", "", "用来送人，"],
            ],
          },
          usage_desktop: {
            test: (t) => /台式|主机/.test(t) && !/游戏|电竞|办公|家用|设计|渲染|剪辑|企业|采购|学习/.test(t),
            title: "主要用来做什么？",
            options: [
              ["电竞游戏", "", "用来玩电竞游戏，"],
              ["家用/日常办公", "", "家用和日常办公，"],
              ["设计渲染/剪辑", "", "用来做设计渲染和剪辑，"],
              ["公司办公采购", "", "公司办公采购用，"],
            ],
          },
          usage_phone: {
            test: (t) => /手机/.test(t) && !/拍照|拍视频|游戏|商务|办公|长辈|送人|备用/.test(t),
            title: "主要用来做什么？",
            options: [
              ["拍照拍视频要好", "", "拍照拍视频要好，"],
              ["玩游戏要流畅", "", "玩游戏要流畅，"],
              ["商务办公用", "", "商务办公用，"],
              ["给长辈用，简单耐用", "", "给长辈用，要简单耐用，"],
            ],
          },
          usage_pad: {
            test: (t) => /平板/.test(t) && !/追剧|网课|绘画|创作|办公|学习|孩子|游戏/.test(t),
            title: "主要用来做什么？",
            options: [
              ["追剧和上网课", "", "用来追剧和上网课，"],
              ["绘画和创作", "", "用来绘画和创作，"],
              ["轻办公", "", "用来轻办公，"],
              ["给孩子学习用", "", "给孩子学习用，"],
            ],
          },
          usage_monitor: {
            test: (t) => /显示器/.test(t) && !/电竞|高刷|设计|修图|办公|护眼|编程/.test(t),
            title: "主要用来做什么？",
            options: [
              ["电竞游戏，要高刷新率", "", "电竞游戏用，要高刷新率，"],
              ["设计修图，色彩要准", "", "设计修图用，色彩要准，"],
              ["日常办公，护眼舒适", "", "日常办公用，要护眼舒适，"],
            ],
          },
          // 耳机先问形态（价位差异由独立预算槽接）
          earphone_form: {
            test: (t) => /耳机/.test(t) && !/头戴|入耳|颈挂|降噪|真无线|运动/.test(t),
            title: "喜欢什么形态？",
            options: [
              ["头戴式，降噪好", "", "要头戴式降噪的，"],
              ["真无线入耳式", "", "要真无线入耳式的，"],
              ["运动颈挂式", "", "要运动颈挂式的，"],
            ],
          },
          // 预算（主品类；兜底——说了买什么没提预算就问）
          budget: {
            test: (t) => /笔记本|游戏本|轻薄本|电脑|台式|主机|手机|平板|显示器/.test(t) && !/耳机|键盘|鼠标/.test(t) && !/\d+\s*(元|块|千|万|k|K|W)|预算|价格不限|不限/.test(t),
            title: "预算大概多少？",
            options: [
              ["5000 元以下", "", "预算5000元以下，"],
              ["5000 ~ 10000 元", "", "预算5000到10000元，"],
              ["10000 ~ 20000 元", "", "预算10000到20000元，"],
              ["价格不限", "", "价格不限，"],
            ],
          },
          budget_acc: {
            test: (t) => /耳机|键盘|鼠标|打印/.test(t) && !/\d+\s*(元|块|千|万|k|K|W)|预算|价格不限|不限/.test(t),
            title: "预算大概多少？",
            options: [
              ["200 元以下", "", "预算200元以下。"],
              ["200 ~ 500 元", "", "预算200到500元。"],
              ["500 ~ 1000 元", "", "预算500到1000元。"],
              ["价格不限", "", "价格不限。"],
            ],
          },
          // 末级：各品类专属收尾
          portable: {
            test: (t) => /笔记本|游戏本|轻薄本|电脑/.test(t) && !/台式|主机|显示器|手机|平板|耳机/.test(t) && /\d+\s*(元|块|千|万|k|K)|预算|不限/.test(t) && !/轻便|便携|携带|轻薄|外出|配置更重要|性能优先/.test(t),
            title: "经常带出门吗？",
            options: [
              ["平时经常带着外出，最好轻便一些", "", "平时经常带着外出，最好轻便一些。"],
              ["不常携带，配置更重要", "", "不常携带，配置更重要。"],
            ],
          },
          desktop_form: {
            test: (t) => /台式|主机/.test(t) && /\d+\s*(元|块|千|万|k|K)|预算|不限/.test(t) && !/整套|含显示器|带显示器|只要主机|自己配/.test(t),
            title: "要整套还是只要主机？",
            options: [
              ["要整套（含显示器键鼠）", "", "要整套含显示器键鼠的。"],
              ["只要主机，外设自己配", "", "只要主机，外设自己配。"],
            ],
          },
          phone_form: {
            test: (t) => /手机/.test(t) && /\d+\s*(元|块|千|万|k|K)|预算|不限/.test(t) && !/折叠|直板/.test(t),
            title: "对形态有偏好吗？",
            options: [
              ["想试试折叠屏", "", "想试试折叠屏。"],
              ["普通直板就行", "", "普通直板就行。"],
            ],
          },
          pad_acc: {
            test: (t) => /平板/.test(t) && /\d+\s*(元|块|千|万|k|K)|预算|不限/.test(t) && !/键盘|触控笔|手写笔|裸机/.test(t),
            title: "需要配件吗？",
            options: [
              ["要配键盘和触控笔", "", "要配键盘和触控笔。"],
              ["裸机就行", "", "裸机就行。"],
            ],
          },
          monitor_size: {
            test: (t) => /显示器/.test(t) && /\d+\s*(元|块|千|万|k|K)|预算|不限/.test(t) && !/寸|英寸|带鱼|曲面|尺寸/.test(t),
            title: "想要多大的？",
            options: [
              ["24 ~ 27 英寸主流尺寸", "", "要24到27英寸的。"],
              ["30 英寸以上大屏/带鱼屏", "", "要30英寸以上的大屏或带鱼屏。"],
              ["不确定，听乐享推荐", "", "尺寸听你推荐。"],
            ],
          },
        };

        function lxDetectSuggest(text) {
          const t = (text || "").trim();
          if (t.length < 3 || t.length > 80) return null;
          for (const key of ["category", "usage", "usage_desktop", "usage_phone", "usage_pad", "usage_monitor", "earphone_form", "budget", "budget_acc", "portable", "desktop_form", "phone_form", "pad_acc", "monitor_size"]) {
            if (LX_SUGGEST_TREE[key].test(t)) return { key, ...LX_SUGGEST_TREE[key] };
          }
          return null;
        }

        function lxHideSuggest() {
          document.querySelector(".lx-suggest-panel")?.remove();
        }

        let lxSuggestTimer = null;
        function lxComposerSuggest(ta) {
          clearTimeout(lxSuggestTimer);
          lxSuggestTimer = setTimeout(() => {
            lxHideSuggest();
            if (document.querySelector(".lx-ref-picker")) return; // @引用优先
            const hit = lxDetectSuggest(ta.value);
            if (!hit) return;
            const composer = ta.closest(".composer, .hero-composer");
            if (!composer) return;
            state._suggestTa = ta;
            composer.style.position = "relative";
            composer.insertAdjacentHTML("beforeend", `<div class="lx-suggest-panel"><div class="lx-suggest-title">${esc(hit.title)}</div>${hit.options.map((o, i) => `<div class="lx-suggest-item" data-suggest-pick="${i}" data-suggest-key="${hit.key}"><span class="num">${i + 1}.</span><span class="txt">${esc(o[0])}</span>${o[1] ? `<span class="sub">${esc(o[1])}</span>` : ""}</div>`).join("")}</div>`);
            state._suggestHit = hit;
          }, 180);
        }

        function lxApplySuggest(index) {
          const hit = state._suggestHit;
          const ta = state._suggestTa || document.querySelector(".composer textarea");
          if (!hit || !ta) return;
          const opt = hit.options[index];
          if (!opt) return;
          ta.value = hit.replace ? opt[2] : ta.value.replace(/[，,。\s]*$/, "") + "，" + opt[2].replace(/^，/, "");
          ta.focus();
          lxHideSuggest();
          lxComposerSuggest(ta); // 递归检测下一级，没有则不出
        }

        // ── @引用历史对话（PRD 5.1）：输入 @ 弹历史选择器，引用内容随消息注入上下文 ──
        function lxRecentMessages(limit = 8) {
          const nodes = [...document.querySelectorAll(".lx-p0-messages > .lx-p0-message")];
          return nodes.slice(-16).map((node) => ({
            who: node.classList.contains("user") ? "我" : "乐享",
            text: (node.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
          })).filter((m) => m.text.length > 1).slice(-limit);
        }

        function lxShowRefPicker() {
          lxHideRefPicker();
          const composer = document.querySelector(".composer");
          if (!composer) return;
          const items = lxRecentMessages();
          if (!items.length) return;
          composer.style.position = "relative";
          composer.insertAdjacentHTML("beforeend", `<div class="lx-ref-picker"><div class="lx-ref-picker-title">选择要引用的对话内容</div>${items.map((m, i) => `<div class="lx-ref-item" data-ref-pick="${i}"><span class="who">${m.who}</span>${esc(m.text)}</div>`).join("")}</div>`);
          state._refItems = items;
        }

        function lxHideRefPicker() {
          document.querySelector(".lx-ref-picker")?.remove();
        }

        // ── 商品引用（设计稿：hover 勾选 / 拖拽到对话框 → 引用商品，针对性提问）──
        const LX_PICK_CARD_SEL = ".product-card, .lx-sim-card, .lx-floor-product, .lx-p0-product-mini, .reco-row";

        function lxCardSku(card) {
          return card?.dataset.sku || card?.dataset.openProduct || card?.querySelector("[data-open-product]")?.dataset.openProduct || "";
        }

        async function lxSetProductRef(sku) {
          if (!sku) return;
          let product = (state.products || []).find((p) => p.sku === sku) || (state.floorProducts || []).find((p) => p.sku === sku);
          if (!product) {
            try { product = await (await fetch(`/api/products/${encodeURIComponent(sku)}`, { cache: "no-store" })).json(); } catch {}
          }
          if (!product?.name) return toast("商品信息获取失败");
          state.refProduct = { sku: product.sku, name: product.name, price: product.price, image_url: product.image_url, description: (product.description || "").slice(0, 120) };
          state.refMsg = null;
          document.querySelector(".lx-ref-bar")?.remove();
          document.querySelectorAll(".lx-pick-btn.picked").forEach((b) => b.classList.remove("picked"));
          document.querySelector(`.lx-pick-btn[data-pick-sku="${CSS.escape(sku)}"]`)?.classList.add("picked");
          const bottom = document.querySelector(".assistant-bottom");
          bottom?.insertAdjacentHTML("afterbegin", `<div class="lx-ref-bar lx-ref-product"><img src="${esc(imgUrl(product.image_url))}" alt="" /><span class="lx-ref-text"><strong>${esc(product.name.slice(0, 26))}</strong> ¥${Number(product.price || 0).toLocaleString()}</span><button type="button" data-ref-clear aria-label="取消引用">×</button></div>`);
          document.querySelector(".composer textarea")?.focus();
          toast("已引用商品，直接提问即可");
        }

        function lxEnsurePickBtn(card) {
          if (!card || card.querySelector(":scope > .lx-pick-btn")) return;
          const sku = lxCardSku(card);
          if (!sku) return;
          if (getComputedStyle(card).position === "static") card.style.position = "relative";
          card.insertAdjacentHTML("beforeend", `<button class="lx-pick-btn${state.refProduct?.sku === sku ? " picked" : ""}" type="button" data-pick-sku="${esc(sku)}" title="引用这个商品提问" aria-label="引用商品">✓</button>`);
          card.draggable = true;
        }

        function lxSetRef(text) {
          state.refMsg = text;
          state.refProduct = null;
          document.querySelectorAll(".lx-pick-btn.picked").forEach((b) => b.classList.remove("picked"));
          document.querySelector(".lx-ref-bar")?.remove();
          if (!text) return;
          const bottom = document.querySelector(".assistant-bottom");
          bottom?.insertAdjacentHTML("afterbegin", `<div class="lx-ref-bar"><span>引用</span><span class="lx-ref-text">${esc(text.slice(0, 60))}</span><button type="button" data-ref-clear aria-label="取消引用">×</button></div>`);
        }

        // 自动全屏对话态：进入/退出统一管理（lx-auto-fs 用于隐藏无意义的展开缩放按钮）
        function lxSetAutoFs(on) {
          state.autoFs = !!on;
          // 兜底：全屏对话必须处于 chat 态，否则首页下面板被隐藏会白屏
          if (on) document.body.dataset.state = "chat";
          document.body.classList.toggle("assistant-fullscreen", !!on);
          document.body.classList.toggle("lx-auto-fs", !!on);
        }

        // AI 页面操作执行器：对话即操作（用户要求关页面/切站/开功能时真实执行）
        function lxExecControl(op, target) {
          const siteMap = { shop: "personal", b: "business", biz: "enterprise" };
          const ops = {
            close_all_tabs: () => { state.tabs = []; state.activeTabId = null; state.pageTrail = []; lxRenderTabbar(); document.querySelector(".content")?.setAttribute("data-view", "list"); toast("已关闭所有页面"); },
            close_tab: () => {
              const tab = (state.tabs || []).find((t) => target && (t.label || "").includes(target));
              if (tab) { lxCloseTab(tab.id); toast(`已关闭「${tab.label}」`); } else toast("没有找到对应的页面标签");
            },
            go_home: () => document.querySelector('.main-nav [data-page="home"]')?.click(),
            switch_site: () => routeTo(siteMap[target] || "personal"),
            open_member: () => openMemberCenter(),
            open_coupon: () => openCouponCenter(),
            open_orders: () => openOrders(),
            open_cart: () => openCart(),
            open_stores: () => openStoresPanel(),
            open_edu_zone: () => openEduZone(),
            open_compare: () => openCompare(),
            start_student_auth: () => openStudentAuth(),
            start_enterprise_auth: () => openEnterpriseAuth(),
            clear_compare: () => { state.compare = []; save("lexiang.compare.v1", []); lxUpsertCompareTab(null, null, state.activeTabId === "compare"); toast("对比清单已清空"); },
          };
          (ops[op] || (() => toast("暂不支持该页面操作")))();
        }

        // AI 产出可看内容时退出全屏（含手动全屏）、按需展开右侧；若仍在首页语境则此时才切到个人及家庭
        function lxRevealContent() {
          if (document.body.classList.contains("assistant-fullscreen")) {
            if (state.autoFs) lxSetAutoFs(false);
            else document.body.classList.remove("assistant-fullscreen");
          }
          if (state.page === "home" || !state.page) routeTo("personal");
        }

        function lxActivateTab(id) {
          const tab = (state.tabs || []).find((item) => item.id === id);
          if (!tab) return;
          state.activeTabId = id;
          lxRenderTabbar();
          lxRunTab(tab);
        }

        // 推荐结果页：按数量分形态——2-6 款决策型大卡列表（信息足、可对比可加购），7+ 款紧凑网格快速浏览
        function lxEnsureRecoPage() {
          let pageBox = document.querySelector(".reco-page");
          if (!pageBox) {
            pageBox = document.createElement("div");
            pageBox.className = "reco-page";
            document.querySelector(".content")?.appendChild(pageBox);
          }
          return pageBox;
        }

        function lxRenderRecoPage(tab) {
          const pageBox = lxEnsureRecoPage();
          const products = Array.isArray(tab.products) ? tab.products : [];
          const intro = `<div class="reco-head"><h2>${esc(tab.label || "AI 推荐")}</h2><span>根据你的需求挑出 ${products.length} 款，可继续追问缩小范围</span></div>`;
          const disclaimer = `<p class="lx-p0-disclaimer">推荐由联想乐享基于你的需求生成，价格与配置以详情页为准。</p>`;
          if (products.length <= 6) {
            const compareAll = products.length >= 2
              ? `<div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn" type="button" data-quick-ask="帮我对比${esc(products.map((p) => p.name).slice(0, 4).join("、"))}，给出参数对比表">对比这 ${Math.min(products.length, 4)} 款</button></div>`
              : "";
            pageBox.innerHTML = intro + products.map((p) => `
              <div class="reco-row">
                <img src="${p.official ? esc(p.image_url) : esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" ${p.official ? `data-official-url="${esc(p.url)}"` : `data-open-product="${esc(p.sku)}"`} />
                <div class="reco-row-main" ${p.official ? `data-official-url="${esc(p.url)}"` : `data-open-product="${esc(p.sku)}"`}>
                  <strong>${esc(p.name)}</strong>
                  <span class="reco-row-desc">${esc(p.description || p.category || "")}</span>
                  <div class="reco-row-tags">${(p.promotion_tags || []).slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("")}</div>
                </div>
                <div class="reco-row-side">
                  <span class="reco-row-price">¥${Number(p.price || 0).toLocaleString()}</span>
                  <div class="reco-row-actions">
                    ${p.official
                      ? `<button class="lx-p0-btn primary" type="button" data-official-url="${esc(p.url)}">官方购买</button><button class="lx-p0-btn" type="button" data-quick-ask="帮我在本站找和${esc(p.name)}类似的商品">找同款</button>`
                      : `<button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">看详情</button><button class="lx-p0-btn" type="button" data-reco-compare="${esc(p.sku)}">加对比</button>`}
                  </div>
                </div>
              </div>`).join("") + compareAll + disclaimer;
          } else {
            pageBox.innerHTML = intro + `<div class="reco-grid">${products.map(lxProductMiniCard).join("")}</div>` + disclaimer;
          }
        }

        function lxCloseTab(id) {
          state.tabs = (state.tabs || []).filter((item) => item.id !== id);
          if (state.activeTabId === id) {
            const next = state.tabs[state.tabs.length - 1] || null;
            state.activeTabId = next ? next.id : null;
            if (next) lxRunTab(next);
          }
          lxRenderTabbar();
        }

        // AI 文本中的链接转可点卡片：联想商品链接→右侧打开商详，其他链接→新窗口
        function lxLinkHtml(url, label) {
          const cleanLabel = label && !/^https?:/.test(label) ? label : "";
          if (/lenovo\.com\.cn\/(page\/)?(xs|jyth|edu)/i.test(String(url)) || /教育|学生/.test(String(label || ""))) {
            return `<button type="button" class="lx-md-prod" data-stu-auth>去学生认证<span class="lx-md-prod-arrow">→</span></button>`;
          }
          const m = String(url).match(/item\.lenovo\.com\.cn\/product\/(\d+)\.html/);
          if (m) return `<button type="button" class="lx-md-prod" data-open-product="${m[1]}">${cleanLabel || "查看商品详情"}<span class="lx-md-prod-arrow">→</span></button>`;
          return `<a class="lx-md-link" href="${url}" target="_blank" rel="noopener">${cleanLabel || "打开链接"}</a>`;
        }

        function mdLite(text) {
          const src = String(text || "").replace(/\r/g, "");
          const lines = src.split("\n");
          const out = [];
          let listOpen = false;
          let tableRows = null;
          const inline = (value) => {
            let s = esc(value);
            s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (full, label, url) => lxLinkHtml(url, label));
            s = s.replace(/(^|[^"'>=\w])(https?:\/\/[^\s<）)\]」"']+)/g, (full, pre, url) => pre + lxLinkHtml(url, null));
            return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
          };
          const flushList = () => { if (listOpen) { out.push("</ul>"); listOpen = false; } };
          const flushTable = () => {
            if (!tableRows || !tableRows.length) { tableRows = null; return; }
            const head = tableRows[0];
            const body = tableRows.slice(1);
            out.push(`<table class="lx-md-table"><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
            tableRows = null;
          };
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (/^\|.*\|$/.test(trimmed)) {
              const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
              if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return;
              (tableRows = tableRows || []).push(cells);
              return;
            }
            flushTable();
            if (!trimmed) { flushList(); return; }
            if (/^#{1,4}\s+/.test(trimmed)) { flushList(); out.push(`<h4 class="lx-md-h">${inline(trimmed.replace(/^#{1,4}\s+/, ""))}</h4>`); return; }
            if (/^[-•]\s+/.test(trimmed) || /^\d+[.、]\s+/.test(trimmed)) {
              if (!listOpen) { out.push('<ul class="lx-md-list">'); listOpen = true; }
              out.push(`<li>${inline(trimmed.replace(/^[-•]\s+/, "").replace(/^\d+[.、]\s+/, ""))}</li>`);
              return;
            }
            flushList();
            out.push(`<p class="lx-md-p">${inline(trimmed)}</p>`);
          });
          flushList();
          flushTable();
          return `<div class="lx-md">${out.join("")}</div>`;
        }

        function renderCompareTable(products, opts = {}) {
          const keys = [];
          const seen = new Set();
          products.forEach((product) => Object.keys(product.specs || {}).forEach((key) => {
            if (DETAIL_SPEC_SKIP_KEYS.has(key) || seen.has(key)) return;
            seen.add(key);
            keys.push(key);
          }));
          const headCells = products.map((product) => `<th><div class="lx-cmp-name" data-open-product="${esc(product.sku)}">${esc(product.name)}</div><div class="lx-cmp-price">¥${Number(product.price || 0).toLocaleString()}</div></th>`).join("");
          const bodyRows = keys.slice(0, 18).map((key) => {
            const values = products.map((product) => String((product.specs || {})[key] ?? "—").trim());
            const differs = new Set(values).size > 1;
            return `<tr class="${differs ? "diff" : ""}"><td class="lx-cmp-label">${esc(DETAIL_SPEC_LABELS[key] || key)}</td>${values.map((value) => `<td>${esc(value)}</td>`).join("")}</tr>`;
          }).join("");
          const actionsRow = opts.actions
            ? `<tr class="cmp-actions"><td class="lx-cmp-label">操作</td>${products.map((product) => `<td><div class="lx-cmp-btns"><button class="lx-p0-btn primary" type="button" data-cmp-buy="${esc(product.sku)}">立即购买</button><button class="lx-p0-btn" type="button" data-cmp-cart="${esc(product.sku)}">加购物车</button></div></td>`).join("")}</tr>`
            : "";
          return `<div class="lx-cmp-wrap"><table class="lx-cmp-table"><thead><tr><th class="lx-cmp-label">参数</th>${headCells}</tr></thead><tbody>${bodyRows}${actionsRow}</tbody></table><p class="lx-p0-disclaimer">浅紫底纹为差异项。参数信息以商品详情页为准。</p></div>`;
        }

        function navigateToPortalSection(target) {
          const sectionMap = { featured: "商品推荐", bestsellers: "热门推荐", solutions: "解决方案", news: "新闻中心", cases: "客户案例", cta: "底部导航" };
          const goHome = document.querySelector('.main-nav [data-page="home"]');
          if (goHome) goHome.click();
          setTimeout(() => {
            const section = sectionMap[target] ? document.querySelector(`.portal-section[aria-label="${sectionMap[target]}"]`) : null;
            if (section) {
              section.scrollIntoView({ behavior: "smooth", block: "start" });
              section.classList.add("lx-nav-flash");
              setTimeout(() => section.classList.remove("lx-nav-flash"), 2400);
            } else {
              document.querySelector(".content, body")?.scrollTo?.({ top: 0, behavior: "smooth" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }, 350);
        }

        async function readSse(response, handlers) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let splitIndex;
            while ((splitIndex = buffer.indexOf("\n\n")) >= 0) {
              const raw = buffer.slice(0, splitIndex);
              buffer = buffer.slice(splitIndex + 2);
              const event = parseSseBlock(raw);
              if (event) (handlers[event.type] || handlers.message || (() => {}))(event.data);
            }
          }
        }

        function parseSseBlock(raw) {
          let type = "message";
          const data = [];
          raw.split(/\r?\n/).forEach((line) => {
            if (line.startsWith("event:")) type = line.slice(6).trim();
            if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
          });
          return data.length ? { type, data: data.join("\n") } : null;
        }

        function parseJson(text) {
          try { return JSON.parse(text); } catch { return {}; }
        }

        function openMemberCenter() {
          // 会员页 9 模块（移植旧版 c4dcfa2 结构：等级/资产/签到任务/等级表/权益宫格/活动/乐豆商城/测评/快捷入口）
          const logged = !!state.user;
          const name = logged ? (state.user.nickname || state.user.phone || "会员") : "游客";
          const lv = logged ? 3 : 0;
          const growth = logged ? 2480 : 0, nextLv = 3000;
          const hero = `<div class="lx-member-hero">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
              <div style="flex:1"><div style="font-size:18px;font-weight:700">${esc(name)}</div><div style="font-size:13px;opacity:.92">${logged ? "V3 金卡 · 注册 365 天" : "注册即得新人 ¥200 礼包"}</div></div>
              ${logged ? `<button class="lx-p0-btn" type="button" data-stu-auth style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">学生认证</button><button class="lx-p0-btn" type="button" data-open-ent style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">企业认证</button>` : `<button class="lx-p0-btn" type="button" data-open-login style="background:#fff;color:#4D144A;font-weight:700">立即登录 / 注册</button>`}
            </div>
            ${logged ? `<div style="font-size:12px;opacity:.9">距 V4 钻石卡还需 <b style="color:#ffd700">${nextLv - growth}</b> 成长值</div><div class="bar"><i style="width:${Math.round(growth / nextLv * 100)}%"></i></div>` : `<div style="font-size:12px;opacity:.9">登录后立享 V1 普卡 · 11 项专属权益</div>`}
          </div>`;
          const assets = `<div class="lx-member-assets">${[["乐豆", logged ? 1280 : 0, "1000豆=¥10", "乐豆余额和使用规则"], ["优惠券", logged ? 5 : 0, "张可用", "我的优惠券"], ["积分", logged ? 860 : 0, "分", "消费积分规则"], ["成长值", growth, "/" + nextLv, "成长值如何获得"]].map((a) => `<div class="cell" data-quick-ask="${esc(a[3])}"><span>${a[0]}</span><b>${a[1]}</b><span>${a[2]}</span></div>`).join("")}</div>`;
          const sign = logged ? `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>签到与任务</h3><span>连续签到 5 天 · 明日加倍</span><button class="lx-p0-btn" type="button" data-quick-ask="我的任务中心有哪些任务">全部任务</button></div><div class="lx-sign-row">${[1,2,3,4,5,6,7].map((d) => `<div class="lx-sign-day${d <= 5 ? " done" : ""}">第${d}天<br>${d <= 5 ? "✓" : "+" + d * 10 + "豆"}</div>`).join("")}</div></div>` : "";
          const tiers = [["V1 普卡", "登录即得", "基础券包 / 新人礼"], ["V2 银卡", "成长值 1000", "5% 会员价 / 生日礼"], ["V3 金卡", "成长值 2500", "延保 88 折 / 月度券包 / VIP 客服"], ["V4 钻石卡", "成长值 5000", "拯救者/YOGA 专享价 / 优先发货"], ["V5 黑卡", "邀请制", "私人定制 / 酒店权益 / 生活特权"]];
          const tierTable = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>会员等级与权益</h3><button class="lx-p0-btn" type="button" data-quick-ask="会员等级体系和升级规则">规则 FAQ</button></div><table class="lx-tier-table"><thead><tr><th>等级</th><th>升级条件</th><th>核心权益</th></tr></thead><tbody>${tiers.map((t, i) => `<tr${i + 1 === lv ? ' style="background:var(--lx-surface-hover)"' : ""}><td><strong>${t[0]}</strong>${i + 1 === lv ? " ←当前" : ""}</td><td>${t[1]}</td><td>${t[2]}</td></tr>`).join("")}</tbody></table></div>`;
          const rights = [["新人礼包", "¥200 大礼包", 1], ["生日特权", "双倍乐豆+礼包", 1], ["会员价", "专享折扣", 1], ["月度券包", "每月 4 张", 2], ["优先发货", "VIP 优先排单", 2], ["专属客服", "VIP 通道", 3], ["延保 88 折", "会员专享", 3], ["拯救者 9 折", "游戏装备专享", 4], ["YOGA 专享", "设计师礼盒", 4], ["酒店权益", "合作酒店折扣", 5], ["生活特权", "美团/星巴克券", 5]];
          const rightsGrid = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>会员权益（${rights.filter((r) => r[2] <= lv).length}/11 已解锁）</h3></div><div class="lx-rights-grid">${rights.map((r) => `<div class="cell${r[2] > lv ? " locked" : ""}" data-quick-ask="会员权益详情：${esc(r[0])}"><strong>${r[0]}</strong><span>${r[1]} · V${r[2]}+</span></div>`).join("")}</div></div>`;
          const acts = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>会员活动</h3></div><div class="lx-floor-body">${[["会员日", "每月 18 日双倍乐豆"], ["0 元试用", "新品先体验后购买"], ["会员秒杀", "专属低价场次"], ["新品首发", "优先购买资格"]].map((a) => `<div class="lx-floor-card" data-quick-ask="会员活动：${esc(a[0])}详情"><strong>${a[0]}</strong><span>${a[1]}</span></div>`).join("")}</div></div>`;
          const mall = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>乐豆兑换商城</h3><span>乐豆当钱花</span><button class="lx-p0-btn primary" type="button" data-quick-ask="乐豆商城能兑换什么，帮我推荐">去兑换</button></div><div class="lx-floor-body">${[["鼠标垫", "500 豆"], ["无线鼠标", "2900 豆"], ["延保 1 年", "5000 豆"], ["蓝牙耳机", "9900 豆"]].map((g) => `<div class="lx-floor-card" data-quick-ask="用乐豆兑换${esc(g[0])}"><strong>${g[0]}</strong><span>${g[1]}</span></div>`).join("")}</div></div>`;
          const quick = `<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-quick-ask="查我的会员等级、乐豆余额、优惠券和可领取权益">让乐享整理我的权益</button><button class="lx-p0-btn" type="button" data-quick-ask="帮我做会员测评，看看我适合冲哪个等级">会员测评</button><button class="lx-p0-btn" type="button" data-floor-action="coupon">领券中心</button></div>`;
          lxOpenInfoTab("member", "会员中心", hero + assets + sign + tierTable + rightsGrid + acts + mall + quick + `<p class="lx-p0-disclaimer" style="margin-top:10px">会员数据为演示口径，正式上线对接联想会员系统。</p>`);
        }

        function openCouponCenter() {
          const defaults = [
            { name: "国补教育特惠", desc: "按学生/教师/地区判断可叠加优惠", value: "最高 15%" },
            { name: "以旧换新补贴", desc: "旧机估值后抵扣新机订单", value: "估值抵扣" },
            { name: "会员新人券", desc: "注册登录后自动进入券包", value: "¥200" },
            { name: "12 期免息", desc: "以结算页显示为准", value: "免息" }
          ];
          lxOpenInfoTab("coupon", "优惠与活动", `
            <div class="lx-p1-grid">
              ${defaults.map((item) => `<div class="lx-p1-card"><strong>${item.name}</strong><span>${item.value} · ${item.desc}</span><button class="lx-p0-btn" style="margin-top:10px" data-claim-coupon="${esc(item.name)}">领取/咨询</button></div>`).join("")}
            </div>
            <div class="lx-p0-actions">
              <button class="lx-p0-btn primary" data-quick-ask="帮我按当前商品、身份和地区计算可叠加优惠">AI 计算叠加优惠</button>
            </div>`);
        }

        async function openStoresPanel(address = "北京海淀") {
          lxOpenInfoTab("stores", "附近门店", `<p class="lx-p0-disclaimer">正在查询 ${esc(address)} 附近联想门店...</p>`);
          try {
            const geo = await fetch(`/api/stores/geocode?address=${encodeURIComponent(address)}`).then((r) => r.json());
            if (!geo.lat || !geo.lng) throw new Error(geo.error || "无法定位");
            const data = await fetch(`/api/stores/nearby?lat=${encodeURIComponent(geo.lat)}&lng=${encodeURIComponent(geo.lng)}`).then((r) => r.json());
            const stores = data.stores || [];
            lxOpenInfoTab("stores", "附近门店", stores.length ? `
              <div class="lx-p1-strip"><strong>${esc(geo.name || address)}</strong><div class="lx-p0-disclaimer">可继续预约到店、咨询库存、门店闪送和工程师服务。</div></div>
              ${stores.slice(0, 6).map((store) => `<div class="lx-p0-row"><div class="lx-p0-row-main"><strong>${esc(store.name)}</strong><span>${esc(store.address || "")} · ${store.dist ? Math.round(store.dist / 100) / 10 + "km" : ""} · ${esc(store.tel || "暂无电话")}</span></div><button class="lx-p0-btn" data-quick-ask="预约${esc(store.name)}到店服务">预约</button></div>`).join("")}
            ` : `<p class="lx-p0-disclaimer">暂未查到附近门店，可以换一个地址再试。</p>`);
          } catch (error) {
            const fallback = [
              ["联想北京中关村体验店", "海淀区中关村商圈", "到店体验 / 选配咨询"],
              ["联想北京望京服务网点", "朝阳区望京商圈", "维修预约 / 延保服务"],
              ["联想官方在线服务", "线上客服", "库存咨询 / 订单售后"]
            ];
            lxOpenInfoTab("stores", "附近门店", `
              <p class="lx-p0-disclaimer">门店接口暂时不可用，先展示常用服务入口。可继续让联想乐享按城市/区县查询。</p>
              ${fallback.map((store) => `<div class="lx-p0-row"><div class="lx-p0-row-main"><strong>${store[0]}</strong><span>${store[1]} · ${store[2]}</span></div><button class="lx-p0-btn" data-quick-ask="帮我预约${store[0]}，并确认营业时间和可用服务">预约</button></div>`).join("")}
              <div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="帮我找附近联想体验店和服务网点">问联想乐享</button></div>`);
          }
        }

        function openServicePanel() {
          const services = [
            ["保修查询", "输入主机编号 SN 查询保修和权益"],
            ["维修进度", "追踪服务工单与预约记录"],
            ["驱动下载", "查找官方原厂驱动和系统工具"],
            ["上门服务", "安装、清灰、换电池、数据迁移"]
          ];
          openModal("联想服务", `
            <input class="lx-p0-field" id="lxServiceSn" placeholder="输入主机编号 SN，可选">
            <div class="lx-p1-grid">${services.map((item) => `<div class="lx-p1-card"><strong>${item[0]}</strong><span>${item[1]}</span><button class="lx-p0-btn" style="margin-top:10px" data-service-ask="${esc(item[0])}">咨询</button></div>`).join("")}</div>
            <div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-human-on>转人工客服</button><span class="lx-invoice-note">消费热线 400-990-8888 · 企业专线 400-990-8866</span></div>
          `);
        }

        // 客服与转人工（对齐旧版：客服信息卡按客群差异化通道；人工模式下快捷菜单整体切换为客服操作，PRD 5.6）
        const LX_CS_BY_SITE = {
          default: { tel: "400-990-8888", label: "联想官方客服", queue: "综合" },
          shop: { tel: "400-990-8888 转 1", label: "个人/家庭购客服", queue: "消费" },
          b: { tel: "400-990-8888 转 2", label: "中小企业购客服", queue: "SMB" },
          biz: { tel: "400-990-8888 转 3", label: "政教/大企业客服", queue: "大客户" },
        };

        function lxCsConfig() {
          return LX_CS_BY_SITE[API_SITE[state.page] || "default"] || LX_CS_BY_SITE.default;
        }

        function lxShowServiceCard() {
          const chat = ensureChat();
          if (!chat) return;
          const cs = lxCsConfig();
          chat.insertAdjacentHTML("beforeend", `
            <div class="lx-p0-message ai lx-cs-card">
              <div class="lx-cs-row"><span>客服热线</span><b>${esc(cs.tel)}</b></div>
              <div class="lx-cs-row"><span>服务时间</span><b>每天 9:00 - 21:00</b></div>
              <div class="lx-cs-row"><span>服务通道</span><b>${esc(cs.label)}</b></div>
              <div class="lx-p0-actions">
                <button class="lx-p0-btn primary" type="button" data-human-on>进入人工应答</button>
                <button class="lx-p0-btn" type="button" data-quick-ask="帮我查保修、维修进度和驱动下载">保修与维修</button>
              </div>
            </div>`);
          chat.scrollTop = chat.scrollHeight;
        }

        function lxRenderShortcutRow() {
          const row = document.querySelector(".shortcut-row");
          if (!row) return;
          if (state.humanMode) {
            row.innerHTML = `
              <button class="shortcut lx-cs-exit" type="button" data-human-off>退出人工</button>
              <button class="shortcut" type="button" data-quick-ask="小联，帮我查最近的订单状态和物流">我的订单</button>
              <button class="shortcut" type="button" data-cs-upload>发图片</button>
              <button class="shortcut" type="button" data-quick-ask="给小联的服务打个 5 星好评，服务专业体验好">评价服务</button>
              <button class="shortcut" type="button" data-quick-ask="小联，我整理一份采购需求清单发给你确认">需求清单</button>`;
          } else {
            lxRenderActionbar();
          }
        }

        // 响应式 actionbar：按面板宽度能放多少放多少，放不下的收进「更多」（对齐旧版测宽溢出方案）
        // actionbar 按站点差异化：首页=跨客群通用技能；子站=各自客群的高频功能
        const LX_ACTIONBAR_BY_PAGE = {
          home: [
            ["客服", "/assets/icons/shortcut-customer-service.svg"],
            ["我的订单", "/assets/icons/sidebar-points-mall.svg"],
            ["附近门店", "/assets/icons/sidebar-store-delivery.svg"],
            ["会员中心", "/assets/icons/sidebar-member-center.svg"],
            ["以旧换新", "/assets/icons/shortcut-trade-in.svg"],
            ["企业采购", "/assets/icons/sidebar-custom-service.svg"],
          ],
          personal: [
            ["客服", "/assets/icons/shortcut-customer-service.svg"],
            ["教育特惠", "/assets/icons/shortcut-education-subsidy.svg"],
            ["以旧换新", "/assets/icons/shortcut-trade-in.svg"],
            ["乐豆商城", "/assets/icons/sidebar-points-mall.svg"],
            ["0元试用", "/assets/icons/sidebar-free-trial.svg"],
            ["私人订制", "/assets/icons/sidebar-custom-service.svg"],
            ["会员中心", "/assets/icons/sidebar-member-center.svg"],
            ["拉新返利", "/assets/icons/sidebar-referral-rewards.svg"],
            ["门店闪送", "/assets/icons/sidebar-store-delivery.svg"],
          ],
          business: [
            ["客服", "/assets/icons/shortcut-customer-service.svg"],
            ["企业认证", "/assets/icons/sidebar-custom-service.svg"],
            ["批量询价", "/assets/icons/sidebar-points-mall.svg"],
            ["对公开票", "/assets/icons/sidebar-free-trial.svg"],
            ["上门售后", "/assets/icons/shortcut-trade-in.svg"],
            ["会员中心", "/assets/icons/sidebar-member-center.svg"],
          ],
          enterprise: [
            ["客服", "/assets/icons/shortcut-customer-service.svg"],
            ["方案中心", "/assets/icons/sidebar-custom-service.svg"],
            ["信创专区", "/assets/icons/sidebar-free-trial.svg"],
            ["白皮书", "/assets/icons/sidebar-points-mall.svg"],
            ["批量报价", "/assets/icons/shortcut-education-subsidy.svg"],
            ["客户经理", "/assets/icons/sidebar-member-center.svg"],
          ],
          brand: [
            ["客服", "/assets/icons/shortcut-customer-service.svg"],
            ["附近门店", "/assets/icons/sidebar-store-delivery.svg"],
            ["会员中心", "/assets/icons/sidebar-member-center.svg"],
            ["我的订单", "/assets/icons/sidebar-points-mall.svg"],
          ],
        };
        const lxActionbarItems = () => LX_ACTIONBAR_BY_PAGE[state.page] || LX_ACTIONBAR_BY_PAGE.home;

        function lxRenderActionbar() {
          const row = document.querySelector(".shortcut-row");
          if (!row || state.humanMode) return;
          if (!row.clientWidth) return; // 面板隐藏时跳过，可见后由 ResizeObserver 触发重排
          const btnHtml = ([label, icon]) => `<button class="shortcut" type="button"><img class="icon" src="${icon}" alt="" />${label}</button>`;
          row.innerHTML = lxActionbarItems().map(btnHtml).join("");
          row.style.flexWrap = "nowrap";
          const gap = parseFloat(getComputedStyle(row).columnGap) || 8;
          const buttons = [...row.children];
          const widths = buttons.map((node) => node.offsetWidth);
          const total = widths.reduce((sum, w, i) => sum + w + (i ? gap : 0), 0);
          let fit = lxActionbarItems().length;
          if (total > row.clientWidth) {
            const avail = row.clientWidth - 96; // 「更多」按钮预留
            let used = 0;
            fit = 0;
            for (let i = 0; i < widths.length; i++) {
              used += widths[i] + (i ? gap : 0);
              if (used > avail) break;
              fit = i + 1;
            }
            fit = Math.max(1, fit);
          }
          const visible = lxActionbarItems().slice(0, fit);
          const overflow = lxActionbarItems().slice(fit);
          row.innerHTML = visible.map(btnHtml).join("") + (overflow.length
            ? `<span class="more-wrap"><button class="shortcut" type="button">更多<img class="icon" src="/assets/icons/arrow-down.svg" alt="" /></button><div class="more-menu" role="menu">${overflow.map(([label, icon]) => `<div class="menu-row"><img class="icon" src="${icon}" alt="" />${label}</div>`).join("")}</div></span>`
            : "");
        }

        let lxAbTimer = null;
        function lxAbReflow() { clearTimeout(lxAbTimer); lxAbTimer = setTimeout(() => { lxRenderActionbar(); lxSyncCategoryTabs(); }, 120); }
        window.addEventListener("resize", lxAbReflow);
        if (window.ResizeObserver) {
          const abTarget = document.querySelector(".assistant-bottom") || document.querySelector(".assistant-panel");
          if (abTarget) new ResizeObserver(lxAbReflow).observe(abTarget);
        }
        setTimeout(lxRenderActionbar, 50);
        setTimeout(lxRenderQuickList, 0);
        // ── lxHint 情境转化条（移植旧版 chip 形态，config/lxhint.json 开关，PRD 5.7.5 情境化转化提示）──
        state.lxHintMode = "chip";
        fetch("/api/config/lxhint", { cache: "no-store" }).then((r) => r.json()).then((d) => {
          if (["legacy", "chip", "off"].includes(d.mode)) state.lxHintMode = d.mode;
        }).catch(() => {});

        function lxShowHint(text, ask) {
          if (state.lxHintMode === "off") return;
          state.lxHintCount = state.lxHintCount || 0;
          if (state.lxHintCount >= 2) return; // 每次会话最多 2 条，克制不打扰
          let dayCount = 0;
          const dayKey = `lexiang.lxhint.${new Date().toDateString()}`;
          try { dayCount = Number(localStorage.getItem(dayKey) || 0); } catch {}
          if (dayCount >= 4) return;
          const bottom = document.querySelector(".assistant-bottom");
          if (!bottom) return;
          bottom.querySelector(".lx-hint-bar")?.remove();
          state.lxHintCount += 1;
          try { localStorage.setItem(dayKey, String(dayCount + 1)); } catch {}
          bottom.insertAdjacentHTML("afterbegin", `<div class="lx-hint-bar"><span class="lx-hint-text">${esc(text)}</span><button class="lx-p0-btn primary" type="button" data-quick-ask="${esc(ask)}">问一下</button><button class="lx-hint-close" type="button" aria-label="关闭">×</button></div>`);
          const bar = bottom.querySelector(".lx-hint-bar");
          bar.querySelector(".lx-hint-close").addEventListener("click", () => bar.remove());
          bar.querySelector("[data-quick-ask]").addEventListener("click", () => setTimeout(() => bar.remove(), 100));
          setTimeout(() => bar.remove(), 30000);
        }

        // 触发时机①：详情停留 8s → 到手价钩子；22s 仍在看 → 找相似钩子（替代常驻按钮，预判式）
        let lxHintDetailTimer = null;
        let lxHintSimilarTimer = null;
        function lxHintOnDetail(product) {
          clearTimeout(lxHintDetailTimer);
          clearTimeout(lxHintSimilarTimer);
          if (!product?.name) return;
          lxHintDetailTimer = setTimeout(() => {
            if (document.querySelector(".content")?.dataset.view !== "detail") return;
            const tags = product.promotion_tags || [];
            const hook = tags.includes("教育特惠") ? "这款在教育特惠目录里，叠加国补还能再省" : "这款今天有官方优惠";
            lxShowHint(`${hook}，要不要算个到手价？`, `帮我算${product.name}叠加优惠后的到手价`);
          }, 8000);
          lxHintSimilarTimer = setTimeout(() => {
            if (document.querySelector(".content")?.dataset.view !== "detail") return;
            lxShowHint("看了一会儿了，要不要看看同价位的相似款对比下？", `帮我找几款和${product.name}相似的商品，列出差异`);
          }, 22000);
        }

        // 站点话术体系：快捷入口/全屏欢迎问题/输入框底纹 全部按客群特色差异化（个人/企业诉求不可混用）
        const LX_SITE_PROMPTS = {
          home: {
            quick: ["我要找商品", "我要找优惠和活动", "我要查保修和售后", "我要找附近门店", "我要企业批量采购", "我要问国补和教育优惠"],
            welcome: ["想买游戏本，预算8000怎么选？", "日常办公用，5000内电脑怎么选？", "我都有哪些会员权益？", "公司采购电脑有什么补贴？"],
            placeholder: "最近有什么优惠活动？",
          },
          personal: {
            quick: ["我要找商品", "我要找优惠和活动", "我要问国补和教育优惠", "我要以旧换新", "我要查保修和售后", "我要找附近门店"],
            welcome: ["想买游戏本，预算8000怎么选？", "学生买轻薄本，国补和教育优惠能省多少？", "小新和YOGA系列怎么选？", "旧电脑换新能抵多少钱？"],
            placeholder: "最近有什么优惠活动？",
          },
          business: {
            quick: ["我要企业批量采购", "我要企业认证享专享价", "我要对公开票和账期", "我要找商用电脑", "我要查售后和上门服务"],
            welcome: ["公司采购50台办公本，怎么拿企业价？", "ThinkBook和ThinkPad办公怎么选？", "企业购能开专票、走账期吗？", "中小企业有什么采购补贴？"],
            placeholder: "公司要配办公电脑，帮我推荐",
          },
          enterprise: {
            quick: ["我要看行业解决方案", "我要信创合规产品", "我要批量采购报价", "我要对接专属客户经理", "我要查售后服务"],
            welcome: ["信创服务器怎么选型？", "智慧教育解决方案有哪些案例？", "参与政采招投标需要什么资质？", "工作站和服务器怎么搭配？"],
            placeholder: "我们单位要采购信创设备，帮我推荐",
          },
          brand: {
            quick: ["介绍联想品牌故事", "联想有哪些产品线品牌", "联想的全球实力和地位", "联想在 AI PC 上的布局", "联想的服务保障体系", "联想的 ESG 和社会责任"],
            welcome: ["ThinkPad、小新、拯救者是什么关系？", "联想和其他品牌比优势在哪？", "联想的售后服务靠谱吗？", "联想为什么能做到全球 PC 第一？"],
            placeholder: "想了解联想品牌的什么？",
          },
        };

        function lxRenderQuickList() {
          const cfg = LX_SITE_PROMPTS[state.page] || LX_SITE_PROMPTS.home;
          const list = document.querySelector(".quick-list");
          if (list) {
            list.innerHTML = cfg.quick.map((text, index) => `<button class="quick-item" type="button"${index === 0 ? " data-start-chat" : ""}><span>${esc(text)}</span><img class="arrow" src="/assets/icons/chevron-right.svg" alt="" /></button>`).join("");
          }
          // 全屏欢迎四问
          const prompts = document.querySelectorAll(".fullscreen-prompt span");
          prompts.forEach((node, index) => { if (cfg.welcome[index]) node.textContent = cfg.welcome[index]; });
          // 输入框底纹（人工客服模式下不动）
          const ta = document.querySelector(".composer textarea");
          if (ta && !state.humanMode) { ta.placeholder = cfg.placeholder; ta.dataset.origPh = cfg.placeholder; }
        }

        // 首屏建议 chips 用官方 FAQ 运营位（每日更新的真实活动/问题）
        (async () => {
          try {
            const res = await fetch("/api/leai2/faq", { cache: "no-store" });
            const { questions } = await res.json();
            if (Array.isArray(questions) && questions.length) {
              document.querySelectorAll(".hero-suggestion").forEach((chip, index) => { if (questions[index]) chip.textContent = questions[index]; });
            }
          } catch {}
        })();

        function lxSetHumanMode(on) {
          state.humanMode = !!on;
          closeModal();
          const chat = ensureChat();
          const cs = lxCsConfig();
          const composerTa = $(".composer textarea");
          if (on) {
            chat?.insertAdjacentHTML("beforeend", `<div class="lx-p0-message ai lx-cs-human-card"><span class="lx-cs-avatar">联</span><span><b>专属客服小联</b> 已为您接入 <b>${esc(cs.queue)}</b> 队列，下方快捷菜单已切换为人工服务。订单、售后、发票问题可直接发我。（演示：由乐享 AI 以专属客服身份接待）</span></div>`);
            if (composerTa) {
              if (!composerTa.dataset.origPh) composerTa.dataset.origPh = composerTa.placeholder;
              composerTa.placeholder = "向专属客服小联提问...";
            }
          } else {
            chat?.insertAdjacentHTML("beforeend", `<div class="lx-p0-disclaimer">已退出人工服务，继续由联想乐享 AI 为您服务。</div>`);
            if (composerTa?.dataset.origPh) composerTa.placeholder = composerTa.dataset.origPh;
          }
          lxRenderShortcutRow();
          if (chat) chat.scrollTop = chat.scrollHeight;
        }

        function openLeadPanel(scenario) {
          state.leadScenario = scenario || (state.page === "enterprise" ? "biz_intent" : "b_purchase");
          const isBiz = state.page === "enterprise";
          openModal(isBiz ? "政企项目意向" : "企业采购咨询", `
            <p class="lx-p0-disclaimer">${isBiz ? "提交行业、规模和交付要求，联想乐享会整理成 BD 对接信息。" : "提交采购品类、台量和到货时间，联想乐享会整理批量报价需求。"}</p>
            <input class="lx-p0-field" id="lxLeadCompany" placeholder="企业/机构名称">
            <input class="lx-p0-field" id="lxLeadNeed" placeholder="采购需求，例如 50 台 ThinkPad / 政教信创项目">
            <input class="lx-p0-field" id="lxLeadContact" placeholder="联系人和电话">
            <div class="lx-p0-actions">
              <button class="lx-p0-btn primary" data-submit-lead>${isBiz ? "生成政企意向单" : "生成采购需求单"}</button>
            </div>`);
        }

        function openUploadControls() {
          if ($("#lxP1ImageInput")) return;
          const img = document.createElement("input");
          img.type = "file"; img.accept = "image/*"; img.id = "lxP1ImageInput"; img.hidden = true;
          const audio = document.createElement("input");
          audio.type = "file"; audio.accept = "audio/*"; audio.id = "lxP1AudioInput"; audio.hidden = true;
          document.body.append(img, audio);
          img.addEventListener("change", () => uploadFile(img.files?.[0], "image"));
          audio.addEventListener("change", () => uploadFile(audio.files?.[0], "audio"));
          const bottom = $(".assistant-bottom");
          if (bottom && !$(".lx-p1-upload-note", bottom)) {
            const note = document.createElement("div");
            note.className = "lx-p1-upload-note";
            bottom.insertBefore(note, $(".composer", bottom));
          }
        }

        async function uploadFile(file, type) {
          if (!file) return;
          const isImage = type === "image";
          const form = new FormData();
          form.append(isImage ? "image" : "audio", file);
          toast(isImage ? "正在上传图片..." : "正在上传音频...");
          try {
            const res = await fetch(isImage ? "/api/chat/upload-image" : "/api/chat/upload-audio", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "上传失败");
            if (isImage) state.pendingImageUrl = data.url;
            else state.pendingAudioUrl = data.url;
            updateUploadNote();
            toast("上传成功，可直接发送给联想乐享分析");
          } catch (error) {
            toast(error.message || "上传失败");
          }
        }

        function updateUploadNote() {
          const note = $(".lx-p1-upload-note");
          if (!note) return;
          const parts = [];
          if (state.pendingImageUrl) parts.push("已添加图片");
          if (state.pendingAudioUrl) parts.push("已添加音频");
          note.textContent = parts.length ? `${parts.join("、")}，发送后会带入本轮对话。` : "";
          note.classList.toggle("show", !!parts.length);
        }

        function toggleOfficialCompare() {
          state.officialCompare = !state.officialCompare;
          $(".lx-p1-compare-toggle")?.classList.toggle("is-active", state.officialCompare);
          toast(state.officialCompare ? "已开启官方 AI 对比" : "已关闭官方 AI 对比");
        }

        async function callOfficialAI(text) {
          const bubble = addMessage("ai loading", "", renderGenerating("正在获取联想官方 AI 对比结果..."));
          try {
            if (!state.leaiSession) {
              const auth = await fetch("/api/leai/auth").then((r) => r.json());
              state.leaiSession = {
                token: auth.token || auth.data?.token || auth.access_token,
                sessionId: auth.sessionId || auth.data?.sessionId || auth.session_id || auth.data?.session_id
              };
            }
            if (!state.leaiSession.token || !state.leaiSession.sessionId) throw new Error("官方 AI 鉴权失败");
            const res = await fetch("/api/leai/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: state.leaiSession.token, sessionId: state.leaiSession.sessionId, input: text })
            });
            if (!res.ok || !res.body) throw new Error("官方 AI 暂时不可用");
            let hasOfficialContent = false;
            const revealOfficial = () => {
              if (hasOfficialContent) return;
              bubble.className = "lx-p0-message ai";
              bubble.textContent = "联想官方 AI：";
              hasOfficialContent = true;
            };
            await readSse(res, {
              message: (data) => {
                const obj = parseJson(data);
                const content = obj.answer || obj.content || obj.text || "";
                if (!content) return;
                revealOfficial();
                bubble.textContent += content;
                ensureChat().scrollTop = ensureChat().scrollHeight;
              }
            });
            if (!hasOfficialContent) {
              revealOfficial();
              bubble.textContent += "暂未返回更多内容。";
            }
          } catch (error) {
            bubble.className = "lx-p0-message ai";
            bubble.textContent = "联想官方 AI 对比暂时不可用，已保留自研联想乐享结果。";
          }
        }

        function setupSelectionAsk() {
          let pop = $(".lx-p1-select-pop");
          if (!pop) {
            pop = document.createElement("div");
            pop.className = "lx-p1-select-pop";
            pop.innerHTML = `<div class="lx-hl-btns"><button type="button" data-hl-ask>问乐享</button><button type="button" data-hl-bring>带入对话</button></div><div class="lx-hl-answer" hidden></div>`;
            document.body.appendChild(pop);
          }
          document.addEventListener("mouseup", () => {
            setTimeout(() => {
              const text = String(getSelection()?.toString() || "").trim();
              if (text.length < 2) return pop.classList.remove("show");
              state.selectedText = text.slice(0, 500);
              const rect = getSelection().getRangeAt(0).getBoundingClientRect();
              pop.style.left = `${Math.min(rect.left, innerWidth - 170)}px`;
              pop.style.top = `${Math.max(12, rect.top - 44)}px`;
              pop.classList.add("show");
            }, 0);
          });
        }

        function openInfo(kind) {
          if (kind === "member") return openMemberCenter();
          if (kind === "service") return openServicePanel();
          if (kind === "stores") return openStoresPanel();
          const titleMap = { brand: "品牌", service: "联想服务", stores: "附近门店", member: "会员中心", partner: "合作伙伴" };
          const promptMap = {
            brand: "介绍联想品牌、企业故事和核心优势",
            service: "联想官方服务有哪些？帮我查保修、维修、驱动和上门服务",
            stores: "帮我找附近联想门店，并说明可预约的服务",
            member: "联想会员有哪些权益？帮我整理乐豆、优惠券和等级",
            partner: "介绍联想合作伙伴体系和申请流程"
          };
          openModal(titleMap[kind] || "联想乐享", `
            <p class="lx-p0-disclaimer">该入口已接入联想乐享 AI，可继续生成详细内容和下一步操作。</p>
            <div class="lx-p0-actions">
              <button class="lx-p0-btn primary" data-quick-ask="${esc(promptMap[kind] || "介绍联想乐享")}">问联想乐享</button>
            </div>`);
        }

        function bindEvents() {
          // 空输入直接发送时，采用底纹里的示例问题（「例如：」后的内容）
          const placeholderQuery = (placeholder) => {
            const raw = String(placeholder || "").trim();
            const m = raw.match(/例如[：:]\s*(.+)$/);
            return (m ? m[1] : raw).trim();
          };

          const submitComposer = (textarea) => {
            if (!textarea) return;
            let value = textarea.value.trim();
            if (textarea.closest(".hero-composer")) {
              // 首页直接提问：留在首页语境进入全屏对话，AI 产出内容时才切站展开右侧
              if (!value) value = placeholderQuery(textarea.placeholder);
              if (!value || state.sending) { textarea.focus(); return; }
              sendChat(value);
              lxSetAutoFs(true);
            } else {
              // 人工模式的占位符是提示语不是问题，空输入不代发
              if (!value && !state.humanMode) value = placeholderQuery(textarea.placeholder);
              if (!value) { textarea.focus(); return; }
              sendChat(value);
            }
          };

          // 卡片 hover 注入勾选按钮 + 开启拖拽
          document.addEventListener("mouseover", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (card) lxEnsurePickBtn(card);
          });
          document.addEventListener("dragstart", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            const sku = lxCardSku(card);
            if (sku) { event.dataTransfer.setData("text/plain", "lxsku:" + sku); event.dataTransfer.effectAllowed = "copy"; }
          });
          const panel = document.querySelector(".assistant-panel");
          panel?.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; panel.classList.add("lx-drop-hint"); });
          panel?.addEventListener("dragleave", () => panel.classList.remove("lx-drop-hint"));
          panel?.addEventListener("drop", (event) => {
            event.preventDefault();
            panel.classList.remove("lx-drop-hint");
            const data = event.dataTransfer.getData("text/plain") || "";
            if (data.startsWith("lxsku:")) lxSetProductRef(data.slice(6));
          });

          document.addEventListener("input", (event) => {
            const ta = event.target.closest?.(".composer textarea, .hero-composer textarea");
            if (!ta) return;
            const isHero = !!ta.closest(".hero-composer");
            if (!isHero && /@$/.test(ta.value)) { lxShowRefPicker(); lxHideSuggest(); }
            else { if (!isHero) lxHideRefPicker(); lxComposerSuggest(ta); }
          });

          document.addEventListener("keydown", (event) => {
            if (["Enter", " "].includes(event.key)) {
              const brandFocus = event.target.closest?.("[data-brand-focus]");
              if (brandFocus) {
                event.preventDefault();
                brandFocus.click();
                return;
              }
            }
            if (event.isComposing || event.key !== "Enter" || event.shiftKey) return;
            const textarea = event.target.closest?.(".composer textarea, .hero-composer textarea");
            if (!textarea) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            submitComposer(textarea);
          }, true);

          document.addEventListener("submit", (event) => {
            if (event.target.matches(".composer")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              submitComposer($("textarea", event.target));
            }
            if (event.target.matches(".hero-composer")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              submitComposer($("textarea", event.target));
            }
          }, true);

          document.addEventListener("mouseover", (event) => {
            const card = event.target.closest?.(".product-card");
            if (!card || card.contains(event.relatedTarget)) return;
            startHoverPromptTimer(card);
          });

          document.addEventListener("mouseout", (event) => {
            const card = event.target.closest?.(".product-card");
            if (!card || card.contains(event.relatedTarget)) return;
            clearHoverPromptTimer();
          });

          document.addEventListener("click", (event) => {
            if (event.target.closest(".new-chat-button")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              resetConversation();
              return;
            }
            const sendButton = event.target.closest(".send-btn, .hero-send-btn");
            if (sendButton) {
              event.preventDefault();
              event.stopImmediatePropagation();
              submitComposer($("textarea", sendButton.closest("form")));
              return;
            }
            if (event.target.closest(".image-btn")) {
              event.preventDefault();
              $("#lxP1ImageInput")?.click();
            }
            if (event.target.closest(".section-link") && event.target.textContent.includes("顾问")) {
              event.preventDefault();
              openLeadPanel();
            }
            if (event.target.closest("[data-hl-ask]")) {
              // 划词就地秒回（PRD 6.2）：浮窗内轻量快答，不打断浏览；可再深入聊
              const pop = $(".lx-p1-select-pop");
              const box = $(".lx-hl-answer", pop);
              const selected = state.selectedText;
              if (box) {
                box.hidden = false;
                box.innerHTML = `<span class="lx-hl-loading">乐享秒答中...</span>`;
                (async () => {
                  try {
                    const res = await fetch("/api/chat/quick", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message: `用一两句话解释这段内容（结合联想产品场景）：${selected}` }),
                    });
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buf = "", answer = "";
                    box.innerHTML = `<p class="lx-hl-text"></p>`;
                    const textNode = box.querySelector(".lx-hl-text");
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buf += decoder.decode(value, { stream: true });
                      const lines = buf.split("\n");
                      buf = lines.pop();
                      for (const line of lines) {
                        if (!line.startsWith("data:")) continue;
                        try {
                          const d = JSON.parse(line.slice(5));
                          if (d.text) { answer += d.text; textNode.textContent = answer; }
                        } catch {}
                      }
                      if (!pop.classList.contains("show")) { reader.cancel(); return; }
                    }
                    box.insertAdjacentHTML("beforeend", `<button class="lx-p0-btn" type="button" data-hl-deep>${answer ? "深入聊聊" : "问乐享详细说"}</button>`);
                  } catch {
                    box.innerHTML = `<button class="lx-p0-btn" type="button" data-hl-deep>问乐享详细说</button>`;
                  }
                })();
              }
            }
            if (event.target.closest("[data-hl-deep]")) {
              $(".lx-p1-select-pop")?.classList.remove("show");
              sendChat(`请解释这段内容，并结合联想产品/服务给我建议：${state.selectedText}`);
            }
            if (event.target.closest("[data-hl-bring]")) {
              $(".lx-p1-select-pop")?.classList.remove("show");
              const ta = $(".composer textarea");
              if (ta) {
                ta.value = `${ta.value ? ta.value + "\n" : ""}${state.selectedText}`;
                ta.focus();
              }
            }

            const nav = event.target.closest(".main-nav [data-page]");
            if (nav) {
              const page = nav.dataset.page || "home";
              if (PATH_BY_PAGE[page]) history.pushState(null, "", PATH_BY_PAGE[page]);
              state.page = page;
              if (LX_SITE_TAB_LABELS[page]) lxUpsertTab({ id: `site:${page}`, kind: "site", label: LX_SITE_TAB_LABELS[page], page });
              // 用户主动切导航：退出自动全屏对话态；回首页时还原 portal 展示态
              if (state.autoFs) lxSetAutoFs(false);
              if (page === "home") document.body.dataset.state = "default";
              setTimeout(loadProductsForPage, 0);
              setTimeout(() => lxEntInviteInChat(page), 400);
              lxRenderQuickList();
              lxRenderActionbar();
              setTimeout(lxRenderSiteFloors, 0);
            }

            const tabHit = event.target.closest("[data-tab-close], [data-tab-id]");
            if (tabHit) {
              const closeId = event.target.closest("[data-tab-close]")?.dataset.tabClose;
              if (closeId) lxCloseTab(closeId);
              else lxActivateTab(tabHit.dataset.tabId);
            }

            // 分类 tab = 楼层锚点：推荐回到顶部商品墙，其余滚动到对应分类楼层
            const catMoreBtn = event.target.closest("[data-cat-more]");
            if (catMoreBtn) catMoreBtn.parentElement.classList.toggle("open");
            else document.querySelectorAll(".cat-more-wrap.open").forEach((node) => node.classList.remove("open"));

            const catTab = event.target.closest(".category-tabs button:not([data-cat-more])");
            if (catTab) {
              catTab.parentElement?.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", btn === catTab));
              const label = catTab.textContent.trim();
              const contentBox = document.querySelector(".content");
              const floor = document.querySelector(`[data-floor-cat="${label}"]`);
              if (floor) floor.scrollIntoView({ behavior: "smooth", block: "start" });
              else contentBox?.scrollTo({ top: 0, behavior: "smooth" });
            }

            const suggestItem = event.target.closest("[data-suggest-pick]");
            if (suggestItem) { lxApplySuggest(Number(suggestItem.dataset.suggestPick)); return; }
            if (!event.target.closest(".lx-suggest-panel") && !event.target.closest(".composer textarea") && !event.target.closest(".hero-composer textarea")) lxHideSuggest();

            const pickBtn = event.target.closest("[data-pick-sku]");
            if (pickBtn) {
              event.stopPropagation();
              lxSetProductRef(pickBtn.dataset.pickSku);
              return;
            }

            const refPick = event.target.closest("[data-ref-pick]");
            if (refPick) {
              const item = (state._refItems || [])[Number(refPick.dataset.refPick)];
              if (item) {
                lxSetRef(`${item.who}: ${item.text}`);
                const ta = document.querySelector(".composer textarea");
                if (ta) { ta.value = ta.value.replace(/@$/, ""); ta.focus(); }
              }
              lxHideRefPicker();
            } else if (!event.target.closest(".lx-ref-picker")) lxHideRefPicker();
            if (event.target.closest("[data-ref-clear]")) lxSetRef(null);

            const trailHit = event.target.closest("[data-trail-tab]");
            if (trailHit) {
              lxActivateTab(trailHit.dataset.trailTab);
              const anchor = Number(trailHit.dataset.trailAnchor);
              if (Number.isFinite(anchor) && anchor >= 0) {
                const chatBox = document.querySelector(".lx-p0-messages");
                chatBox?.children[anchor]?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }

            const brandFocus = event.target.closest("[data-brand-focus]");
            if (brandFocus) {
              const title = $("[data-brand-focus-title]");
              const copy = $("[data-brand-focus-copy]");
              const kicker = $("[data-brand-focus-kicker]");
              $$(".brand-value").forEach((item) => item.classList.toggle("is-active", item === brandFocus));
              if (title) title.textContent = brandFocus.dataset.brandFocus || title.textContent;
              if (copy) copy.textContent = brandFocus.dataset.brandFocusCopy || copy.textContent;
              if (kicker) kicker.textContent = `BRAND VALUE ${brandFocus.dataset.index || ""}`.trim();
              return;
            }

            const brandAward = event.target.closest("[data-brand-award]");
            if (brandAward) {
              $$(".brand-award").forEach((item) => item.classList.toggle("is-active", item === brandAward));
              const note = $("[data-brand-award-note]");
              if (note) note.textContent = brandAward.dataset.brandAward || note.textContent;
              return;
            }

            const brandAsk = event.target.closest("[data-brand-ask]")?.dataset.brandAsk;
            if (brandAsk) {
              routeTo("personal");
              setTimeout(() => sendChat(brandAsk), 0);
              return;
            }

            if (event.target.closest(".hover-prompt-close")) {
              event.preventDefault();
              clearHoverPromptTimer();
              hideHoverPrompts();
              return;
            }

            const hoverPrompt = event.target.closest("[data-hover-prompt]");
            if (hoverPrompt) {
              event.preventDefault();
              const text = hoverPrompt.dataset.hoverPrompt || hoverPrompt.textContent.trim();
              hideHoverPrompts();
              sendChat(text);
              return;
            }

            // 脉络菜单的历史提问行：锚点滚回当时的对话位置（不重发消息）
            const qRow = event.target.closest(".prompt-menu .menu-row");
            if (qRow) {
              const anchor = Number(qRow.dataset.qAnchor);
              const chatBox = document.querySelector(".lx-p0-messages");
              const node = Number.isFinite(anchor) ? chatBox?.children[anchor] : null;
              if (node) {
                node.scrollIntoView({ behavior: "smooth", block: "center" });
                node.classList.add("lx-flash-msg");
                setTimeout(() => node.classList.remove("lx-flash-msg"), 1800);
              }
            }

            const quick = event.target.closest(".quick-item, .hero-suggestion, .shortcut, .more-menu .menu-row");
            if (quick && !event.target.closest(".more-wrap > button")) {
              const text = quick.textContent.trim();
              if (quick.classList.contains("hero-suggestion")) {
                event.preventDefault();
                event.stopImmediatePropagation();
                // 首页推荐 chip：同样进入全屏对话，AI 出内容才展开右侧
                sendChat(text);
                lxSetAutoFs(true);
                return;
              }
              if (text.includes("教育特惠")) openEduZone();
              else if (text.includes("国补")) sendChat(text);
              else if (text.includes("以旧换新")) sendChat("帮我估算以旧换新补贴，并说明流程");
              else if (text.includes("对公") || text.includes("批量采购") || text.includes("信创") || text.includes("解决方案") || text.includes("客户经理")) sendChat(text);
              else if (text.includes("企业认证")) openEnterpriseAuth();
              else if (text.includes("优惠") || text.includes("0元试用") || text.includes("乐豆")) openCouponCenter();
              else if (text.includes("以旧换新")) sendChat("帮我估算以旧换新补贴，并说明流程");
              else if (state.humanMode && (text.includes("退出人工") || text.includes("我的订单") || text.includes("发图片") || text.includes("评价服务") || text.includes("需求清单"))) { /* 人工模式按钮走 data-* 委托 */ }
              else if (text.includes("我的订单")) openOrders();
              else if (text.includes("白皮书")) openWhitepaperLib();
              else if (text.includes("方案中心")) openSolutionCenter();
              else if (text.includes("信创专区")) openXinchuangZone();
              else if (text.includes("企业采购")) sendChat("我要企业批量采购，介绍下企业购的价格和流程");
              else if (text.includes("上门售后")) sendChat("企业设备的上门售后服务怎么约？");
              else if (text.includes("客服")) lxShowServiceCard();
              else if (text.includes("门店")) openStoresPanel();
              else if (text.includes("会员")) openMemberCenter();
              else if (text.includes("私人订制") || text.includes("定制")) sendChat("我想私人订制一台联想电脑，先按用途给我配置方案");
              else if (text) sendChat(text);
            }

            const card = event.target.closest(".product-card");
            if (card?.dataset.sku) {
              event.preventDefault();
              event.stopImmediatePropagation();
              clearHoverPromptTimer();
              hideHoverPrompts();
              openProduct(card.dataset.sku);
            }

            const detailPrimary = event.target.closest(".detail-primary");
            if (detailPrimary) {
              if (detailPrimary.dataset.bizQuote) openLeadPanel("biz_quote");
              else oneClickBuy();
            }
            if (event.target.closest("[data-occ-confirm]")) {
              closeModal();
              const claimedCount = state.pendingOrderProduct?.benefits?.length || 0;
              const saved = (state.pendingOrderProduct?.original_price || 0) - (state.pendingOrderProduct?.price || 0);
              lxPlaceOrder(state.pendingOrderAddr || lxAddresses()[0]);
              if (claimedCount) toast(`已领 ${claimedCount} 项优惠省 ¥${saved.toLocaleString()}，下单成功`);
            }
            if (event.target.closest("[data-occ-addr]")) {
              const pending = state.pendingOrderProduct;
              closeModal();
              if (pending) openAddressPicker(pending);
            }
            if (event.target.closest(".lx-p0-detail-quote")) sendChat(`我想咨询${state.currentProduct?.name || "这款产品"}的采购方案和报价，请帮我对接专属顾问`);
            if (event.target.closest(".lx-p0-detail-wp")) openWhitepaperLib();
            if (event.target.closest(".detail-secondary:not(.lx-p0-detail-compare):not(.lx-p0-detail-similar):not(.lx-p0-detail-benefit):not(.lx-p0-detail-quote):not(.lx-p0-detail-wp)")) addCart();
            if (event.target.closest(".lx-p0-detail-compare")) addCompare();
            if (event.target.closest(".lx-p0-detail-similar")) openSimilarProducts();
            if (event.target.closest(".lx-p0-detail-benefit")) sendChat(`帮我算${state.currentProduct?.name || "这款商品"}叠加教育优惠和国家补贴后的到手价`);

            const detailTab = event.target.closest("[data-detail-tab]");
            if (detailTab) {
              const key = detailTab.dataset.detailTab;
              $$(".detail-tab").forEach((tab) => {
                const active = tab === detailTab;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-selected", active ? "true" : "false");
              });
              $$(".detail-tab-pane").forEach((pane) => {
                pane.classList.toggle("is-active", pane.dataset.detailPane === key);
              });
            }

            const reviewFilter = event.target.closest(".detail-review-filter");
            if (reviewFilter) {
              const wrap = reviewFilter.closest("[data-review-filter-tags]");
              wrap?.querySelectorAll(".detail-review-filter").forEach((item) => item.classList.toggle("active", item === reviewFilter));
            }

            const reviewLike = event.target.closest(".detail-review-like");
            if (reviewLike) {
              const count = Number((reviewLike.textContent || "").replace(/[^0-9]/g, "")) || 0;
              reviewLike.textContent = `👍 ${count + 1}`;
              reviewLike.classList.add("liked");
            }

            const reviewTrack = $("[data-detail-review-grid]");
            if (event.target.closest("[data-review-prev]") && reviewTrack) {
              reviewTrack.scrollBy({ left: -320, behavior: "smooth" });
            }
            if (event.target.closest("[data-review-next]") && reviewTrack) {
              reviewTrack.scrollBy({ left: 320, behavior: "smooth" });
            }

            const utility = event.target.closest(".utility-btn");
            if (utility?.getAttribute("aria-label") === "购物车") openCart();
            if (utility?.getAttribute("aria-label") === "订单") openOrders();
            if (utility?.getAttribute("aria-label") === "账号" && !state.user) openLogin();

            const accountBtn = event.target.closest(".account-wrap > .utility-btn");
            if (accountBtn) accountBtn.parentElement.classList.toggle("open");
            else if (!event.target.closest(".account-menu")) document.querySelector(".account-wrap.open")?.classList.remove("open");

            const menuRow = event.target.closest(".account-menu .menu-row");
            if (menuRow) {
              const text = menuRow.textContent.trim();
              menuRow.closest(".account-wrap")?.classList.remove("open");
              if (text.includes("退出")) logout();
              else if (text.includes("企业认证")) openEnterpriseAuth();
              else if (text.includes("优化日志")) window.open("/changelog.html", "_blank");
              else if (!state.user || text.includes("账号")) openLogin();
              else if (text.includes("会员")) openInfo("member");
              else if (text.includes("服务")) openInfo("service");
            }

            const plainNav = event.target.closest(".main-nav button:not([data-page])");
            if (plainNav) {
              const text = plainNav.textContent.trim();
              if (text === "品牌") openInfo("brand");
              if (text === "合作伙伴") openInfo("partner");
              if (text === "服务") openInfo("service");
              if (text === "门店") openInfo("stores");
              if (text === "会员") openInfo("member");
            }

            const openSku = event.target.closest("[data-open-product]")?.dataset.openProduct;
            if (openSku) { closeModal(); openProduct(openSku); }

            const buySku = event.target.closest("[data-buy-sku]")?.dataset.buySku;
            if (buySku) buyNow(state.cart.find((item) => item.sku === buySku));

            const removeCart = event.target.closest("[data-remove-cart]")?.dataset.removeCart;
            if (removeCart) {
              state.cart = state.cart.filter((item) => item.sku !== removeCart);
              save("lexiang.cart.v1", state.cart);
              updateBadges();
              openCart();
            }

            const removeCompare = event.target.closest("[data-remove-compare]")?.dataset.removeCompare;
            if (removeCompare) {
              state.compare = state.compare.filter((item) => item.sku !== removeCompare);
              save("lexiang.compare.v1", state.compare);
              lxUpsertCompareTab(null, null, state.activeTabId === "compare");
            }
            const cmpBuy = event.target.closest("[data-cmp-buy]")?.dataset.cmpBuy;
            if (cmpBuy) {
              const product = (state._comparePageItems || []).find((item) => item.sku === cmpBuy);
              if (product) buyNow(product);
            }
            const cmpCart = event.target.closest("[data-cmp-cart]")?.dataset.cmpCart;
            if (cmpCart) {
              const product = (state._comparePageItems || []).find((item) => item.sku === cmpCart);
              if (product) addCart(product);
            }

            if (event.target.closest("[data-ask-compare]")) {
              closeModal();
              sendChat(`请帮我对比这几款商品：${state.compare.map((item) => item.name).join("、")}`);
            }
            const askOrder = event.target.closest("[data-ask-order]")?.dataset.askOrder;
            if (askOrder) {
              closeModal();
              sendChat(`帮我查询订单和售后服务：${askOrder}`);
            }
            const quickAsk = event.target.closest("[data-quick-ask]")?.dataset.quickAsk;
            if (quickAsk) {
              closeModal();
              sendChat(quickAsk);
            }
            const claimCoupon = event.target.closest("[data-claim-coupon]")?.dataset.claimCoupon;
            if (claimCoupon) {
              if (!state.coupons.includes(claimCoupon)) state.coupons.push(claimCoupon);
              save("lexiang.coupons.v1", state.coupons);
              toast("已加入优惠券包，可让联想乐享计算叠加优惠");
            }
            const serviceAsk = event.target.closest("[data-service-ask]")?.dataset.serviceAsk;
            if (serviceAsk) {
              const sn = $("#lxServiceSn")?.value.trim();
              closeModal();
              sendChat(`${serviceAsk}${sn ? "，主机编号：" + sn : ""}`);
            }
            if (event.target.closest("[data-submit-lead]")) {
              const company = $("#lxLeadCompany")?.value.trim();
              const need = $("#lxLeadNeed")?.value.trim();
              const contact = $("#lxLeadContact")?.value.trim();
              closeModal();
              // 线索落库（不阻塞对话回显，失败静默——对话流仍是兜底记录）
              if (company || need || contact) {
                fetch("/api/leads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    scenario: state.leadScenario || "",
                    site_type: API_SITE[state.page] || "default",
                    company, contact, need,
                    conv_id: state.convId || null
                  })
                }).then(() => toast("需求已提交，顾问会尽快与您联系")).catch(() => {});
              }
              sendChat(`请整理企业/政企线索并给下一步对接建议。企业：${company || "未填写"}；需求：${need || "未填写"}；联系人：${contact || "未填写"}`);
            }
            const recoCompare = event.target.closest("[data-reco-compare]");
            if (recoCompare) {
              const recoTab = (state.tabs || []).find((tab) => tab.id === "reco");
              const product = (recoTab?.products || []).find((p) => p.sku === recoCompare.dataset.recoCompare);
              if (product) addCompare(product);
            }

            const solBtn = event.target.closest("[data-solution]");
            if (solBtn) openSolutionCenter(solBtn.dataset.solution);
            else if (event.target.closest("[data-solution-center]")) openSolutionCenter();
            if (event.target.closest("[data-xinchuang]")) openXinchuangZone();
            if (event.target.closest("[data-whitepaper]")) openWhitepaperLib();
            const wpDownload = event.target.closest("[data-wp-download]")?.dataset.wpDownload;
            if (wpDownload) { state.leadScenario = "whitepaper:" + wpDownload; openLeadPanel("whitepaper:" + wpDownload); }

            const officialUrl = event.target.closest("[data-official-url]")?.dataset.officialUrl;
            if (officialUrl) window.open(officialUrl, "_blank", "noopener");

            const choiceBtn = event.target.closest("[data-choice]");
            if (choiceBtn) {
              const ask = (choiceBtn.dataset.choiceTemplate || "{choice}").replace("{choice}", choiceBtn.dataset.choice);
              choiceBtn.closest(".lx-choices")?.querySelectorAll("button").forEach((b) => { b.disabled = true; b.classList.toggle("is-active", b === choiceBtn); });
              sendChat(ask);
            }

            const variantBtn = event.target.closest("[data-variant-sku]");
            if (variantBtn) openProduct(variantBtn.dataset.variantSku, { noTab: true });
            if (event.target.closest("[data-spu-compare]")) {
              const variants = (state.spuVariants || []).slice(0, 4);
              if (variants.length >= 2) lxUpsertCompareTab(variants, "本系列配置对比");
              else toast("本系列暂无可对比的其他配置");
            }

            const addrPick = event.target.closest("[data-addr-pick]");
            if (addrPick) {
              const addr = lxAddresses()[Number(addrPick.dataset.addrPick)];
              if (addr) { closeModal(); lxPlaceOrder(addr); }
            }
            if (event.target.closest("[data-addr-save]")) {
              const name = $("#lxAddrName")?.value.trim();
              const phone = $("#lxAddrPhone")?.value.trim();
              const region = $("#lxAddrRegion")?.value.trim();
              const detail = $("#lxAddrDetail")?.value.trim();
              if (!name || !phone || !detail) toast("请填写收货人、手机号和详细地址");
              else {
                const list = lxAddresses();
                const addr = { name, phone, region, detail };
                list.push(addr);
                save("lexiang.addresses.v1", list);
                closeModal();
                lxPlaceOrder(addr);
              }
            }
            if (event.target.closest("[data-open-invoice]")) openInvoiceForm();
            if (event.target.closest("[data-invoice-save]")) {
              const title = $("#lxInvTitle")?.value.trim();
              const taxNo = $("#lxInvTax")?.value.trim();
              if (!title) toast("请填写发票抬头");
              else {
                save("lexiang.invoice.v1", { title, taxNo });
                closeModal();
                toast("开票信息已保存");
              }
            }
            const floorAction = event.target.closest("[data-floor-action]")?.dataset.floorAction;
            if (floorAction === "stores") openStoresPanel();
            else if (floorAction === "member") openMemberCenter();
            else if (floorAction === "coupon") openCouponCenter();
            else if (floorAction === "lead") openLeadPanel(state.page === "enterprise" ? "biz_intent" : "b_purchase");
            if (event.target.closest("[data-human-on]")) lxSetHumanMode(true);
            if (event.target.closest("[data-human-off]")) lxSetHumanMode(false);
            if (event.target.closest("[data-cs-upload]")) { openUploadControls(); $("#lxP1ImageInput")?.click(); }
            if (event.target.closest("[data-stu-auth]")) openStudentAuth();
            if (event.target.closest("[data-edu-zone]")) { closeModal(); openEduZone(); }
            if (event.target.closest("[data-stu-submit]")) {
              const name = $("#lxStuName")?.value.trim();
              const school = $("#lxStuSchool")?.value.trim();
              const stage = $("#lxStuStage")?.value.trim();
              if (!name) toast("请填写姓名");
              else {
                lxSaveStuState({ status: "pending", name, school, stage, submittedAt: Date.now() });
                closeModal();
                toast("认证资料已提交，审核中");
                fetch("/api/leads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scenario: "student_auth", site_type: "shop", contact: name, need: `学生认证：${school || ""} ${stage || ""}`.trim(), conv_id: state.convId || null })
                }).catch(() => {});
                setTimeout(() => {
                  if (lxStuState().status === "verified") {
                    toast("学生认证已通过，教育专享价已生效");
                    if (state.activeTabId === "info:edu") openEduZone();
                  }
                }, LX_STU_REVIEW_MS + 500);
              }
            }
            if (event.target.closest("[data-open-ent]")) openEnterpriseAuth();
            if (event.target.closest("[data-ent-submit]")) {
              const company = $("#lxEntCompany")?.value.trim();
              const code = $("#lxEntCode")?.value.trim();
              const contact = $("#lxEntContact")?.value.trim();
              if (!company) { toast("请填写企业/机构名称"); }
              else {
                lxSaveEntState({ status: "pending", company, code, contact, submittedAt: Date.now() });
                closeModal();
                toast("认证资料已提交，审核中");
                fetch("/api/leads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scenario: "enterprise_auth", site_type: API_SITE[state.page] || "default", company, contact, need: `企业认证申请${code ? "，信用代码：" + code : ""}`, conv_id: state.convId || null })
                }).catch(() => {});
                setTimeout(() => {
                  const ent = lxEntState();
                  if (ent.status === "verified") {
                    lxRenderEnterpriseBanner();
                    toast("企业认证已通过，企业专享权益已生效");
                  }
                }, LX_ENT_REVIEW_MS + 500);
              }
            }
            if (event.target.closest("[data-open-login]")) openLogin();
            if (event.target.closest("[data-send-code]")) sendCode();
            if (event.target.closest("[data-login-submit]")) login();
            if (event.target.closest("[data-login-guest]")) closeModal();
          }, true);
        }

        window.openCart = openCart;
        window.openOrders = openOrders;
        window.openCompare = openCompare;
        window.openMemberCenter = openMemberCenter;
        window.openCouponCenter = openCouponCenter;
        window.openStoresPanel = openStoresPanel;
        window.openServicePanel = openServicePanel;
        window.openLeadPanel = openLeadPanel;

        openUploadControls();
        setupSelectionAsk();
        bindEvents();
        updateBadges();
        checkAuth();
        initRoute();
        window.addEventListener("popstate", initRoute);
      })();
