// 真实浏览器定位：非阻塞，只请求一次，结果写到 window.__lxGeo 供两个 IIFE 共用
if (!window.__lxGeoRequested && navigator.geolocation) {
  window.__lxGeoRequested = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => { window.__lxGeo = { lng: pos.coords.longitude, lat: pos.coords.latitude }; },
    () => { /* 拒绝/失败：不设 __lxGeo，后端默认北京 */ },
    { timeout: 8000, maximumAge: 300000 }
  );
}

// 官方登录态会员信息：非阻塞，结果写到 window.__lxMember，供 openMemberCenter 等消费
// guest:false + memberLevel:"金钻会员" 时面板优先展示官方登录态；失败/超时兜底 guest:true
if (!window.__lxMemberFetched) {
  window.__lxMemberFetched = true;
  fetch('/api/leai/member').then(function(r) { return r.json(); }).then(function(m) {
    window.__lxMember = m;
  }).catch(function() {
    window.__lxMember = { guest: true };
  });
}

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
        function hardNavigatePage(page) {
          const path = PATH_BY_PAGE[page || "home"] || "/";
          const currentPath = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
          const targetPath = path.endsWith("/") ? path : `${path}/`;
          if (currentPath === targetPath) {
            location.reload();
            return;
          }
          location.assign(path);
        }
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
          hoverPromptAutoCloseTimer: null,
          hoverPromptSku: "",
          activeSiteFloorTab: "推荐",
          refProducts: []
        };
        window.__lxState = state;

        // ── 双对话桥接接口（lxfd IIFE ↔ 主面板 IIFE 跨作用域通信） ────────────
        window.__lxBridge = {
          // 把 lxfd 收集的消息写进主面板对话列表
          importConversation: function(messages, convId) {
            const list = ensureChat();
            list.innerHTML = "";
            messages.forEach(function(m) {
              addMessage(m.role, m.role === "user" ? m.text : "", m.role === "ai" ? m.html : "");
            });
            if (convId) state.convId = convId;
          },
          // 退全屏 + 右侧显示商品/页面
          revealProducts: function(products, opts) {
            // 若当前在首页（URL=/），原地展开分屏而不跳 /shop-chat/。
            // 复用 /shop-chat/ 那套已在所有人缓存里的成熟分屏布局：把 data-page 切到 personal（仅改 CSS 布局，
            // 不 pushState、不改 URL、不点导航——顶部仍高亮"首页"、网址仍是 /）。免疫 main.css 新规则的缓存问题。
            if (state.page === "home" || !state.page || document.body.dataset.page === "home") {
              // 移除首页预绘制类：它用 !important 把整个 .shell 藏死（仅为开屏直接显示全屏对话），不移除分屏永远撑不开
              document.documentElement.classList.remove("lx-root-lxfd-prepaint");
              document.body.classList.add("lx-home-split");
              document.body.dataset.page = "personal";
              document.body.dataset.state = "chat";
            }
            lxRevealContent();
            if (products && products.length === 1 && products[0] && products[0].sku) {
              openProduct(products[0].sku);
              return;
            }
            if (products && products.length) {
              const recoTab = {
                id: "reco",
                kind: "reco",
                label: (opts && opts.title) || "AI 推荐",
                products: products,
                grouped: !!(opts && opts.grouped)
              };
              lxUpsertTab(recoTab);
              lxRunTab(recoTab);
            }
          },
          // 退出全屏（带动画）
          exitFullscreen: function() { lxSetAutoFs(false); },
          // 当前是否有右侧 tab
          hasTabs: function() { return !!(state.tabs && state.tabs.length > 0); },
          // 让 lxfd IIFE 调主面板 lxExecControl（跨 IIFE 桥）
          execControl: function(op, target) { lxExecControl(op, target); }
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
          if (!url) return "/assets/product-placeholder.svg";
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
          const nextPage = page || "home";
          if (state.page !== nextPage) state.activeSiteFloorTab = "推荐";
          state.page = nextPage;
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
          document.documentElement.classList.remove("lx-route-prepaint");
        }

        async function loadProductsForPage() {
          if (state.page === "home" || state.page === "brand") return;
          const site = API_SITE[state.page] || "shop";
          try {
            const response = await fetch(`/api/products?site=${encodeURIComponent(site)}&limit=20`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const products = await response.json();
            // 推荐墙货盘过滤：二手与零散维修服务不进首屏推荐（专区/服务楼层另有入口）
            state.siteProducts = (Array.isArray(products) ? products : []).filter((p) => !/二手|数据恢复|拷贝|加急.*恢复/.test(p.name || "")).slice(0, 14);
            // 「AI 推荐」标签激活中时不覆盖推荐墙，站点货盘仅存底供楼层使用
            if (state.activeTabId !== "reco") {
              state.products = state.siteProducts;
              renderProductCards();
            }
            if (["personal", "business", "enterprise"].includes(state.page)) lxRenderSiteFloors();
          } catch (error) {
            toast("商品数据暂时不可用，已保留当前页面展示");
          }
        }

        // 子品牌（系列）识别——做角标用；15 个子品牌全集
        // 拯救者含 Legion/LEGION；Lecoo→来酷；GeeKPro/GeekPro 均收；ThinkPlus/thinkplus 均收
        const LX_SUBBRAND_RE = /拯救者|Legion|LEGION|YOGA|小新|GeeKPro|GeekPro|IdeaPad|天骄|天逸|Lecoo|来酷|AIO|ThinkPad|ThinkBook|ThinkPlus|thinkplus|BOX|异能者|moto/i;
        function lxSubBrand(name) {
          const m = String(name || "").match(LX_SUBBRAND_RE);
          if (!m) return "";
          const s = m[0];
          if (/legion/i.test(s) || s === "拯救者") return "拯救者";
          if (/lecoo|来酷/i.test(s)) return "来酷";
          if (/thinkplus/i.test(s)) return "ThinkPlus";
          if (/geekpro/i.test(s)) return "GeeKPro";
          return s;
        }
        // 清洗成干净 SPU 名：去营销词(【xx同款】【定制款】企业购)、品牌(联想/Lenovo)、子品牌(已用角标展示)
        function cleanSpuName(name) {
          const orig = String(name || "").trim();
          let s = orig;
          s = s.replace(/【[^】]*】/g, "");                              // 【定制款】【张凌赫同款】
          s = s.replace(/联想\s*[（(]\s*Lenovo\s*[)）]/gi, "");           // 联想(Lenovo)
          s = s.replace(/[（(]\s*Lenovo\s*[)）]/gi, "");                  // (Lenovo)
          s = s.replace(/\bLenovo\b/gi, "").replace(/联想/g, "");        // Lenovo / 联想
          s = s.replace(LX_SUBBRAND_RE, "");                             // 子品牌(角标已展示)
          s = s.replace(/企业购|官方旗舰店?|官方直营|官方授权/g, "");      // 无用词
          s = s.replace(/\s{2,}/g, " ").replace(/^[·、,，\-—\s]+/, "").trim();
          return s || orig;  // 清空兜底回原名
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
            if (title) title.textContent = cleanSpuName(product.name) || "联想商品";
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
            if (visual) {
              visual.innerHTML = `<img src="${esc(imgUrl(product.image_url))}" alt="${esc(product.name || "商品图片")}" />`;
              // 角标显示子品牌（小新/拯救者/YOGA…），大品类一眼能看出没必要标
              const sub = (String(product.name || "").match(/小新|拯救者|YOGA|ThinkPad|ThinkBook|ThinkStation|ThinkVision|thinkplus|moto|来酷|Lecoo|天逸|扬天|开天|昭阳|启天|问天|GeekPro|LEGION/i) || [])[0];
              if (sub && state.page !== "business") visual.insertAdjacentHTML("afterbegin", `<span class="lx-cat-badge">${esc(/legion/i.test(sub) ? "拯救者" : /lecoo/i.test(sub) ? "来酷" : sub)}</span>`);
              // 社会证明（sku 稳定伪随机，不闪烁）
              const seed = String(product.sku || "").split("").reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 9973, 7);
              const social = [`本周 ${120 + (seed % 880)} 人看过`, `仅剩 ${3 + (seed % 9)} 台`, `今日 ${5 + (seed % 40)} 人加购`][seed % 3];
              visual.insertAdjacentHTML("beforeend", `<span class="lx-social-badge">${social}</span>`);
            }
          });
        }

        function getProductFromCard(card) {
          if (!card) return null;
          const sku = card.dataset.sku || card.dataset.openProduct || card.querySelector("[data-open-product]")?.dataset.openProduct || "";
          const product = sku ? state.products.find((item) => String(item.sku || "") === String(sku)) : null;
          if (product) return product;
          return {
            sku,
            name: $(".product-title", card)?.textContent?.trim() || "这款联想商品",
            description: $(".spec", card)?.textContent?.trim() || "联想官方商品",
            category: $(".brand-mini", card)?.textContent?.trim() || "联想商品",
            image_url: $(".product-visual img", card)?.getAttribute("src") || ""
          };
        }

        function getHoverPromptQuestions(product) {
          const name = (product?.name || "这款联想商品").replace(/\s+/g, " ").trim();
          const category = product?.category || "联想商品";
          let series = category;
          if (/小新/.test(name)) series = "小新";
          else if (/拯救者|LEGION/i.test(name)) series = "拯救者";
          else if (/ThinkPad/i.test(name)) series = "ThinkPad";
          else if (/ThinkBook/i.test(name)) series = "ThinkBook";
          else if (/YOGA/i.test(name)) series = "YOGA";
          else if (/moto/i.test(name)) series = "moto";
          if (/R9000P/i.test(name) || /拯救者|LEGION/i.test(name)) {
            return ["拯救者该如何选择？", "R9000P 2025 值得买吗？", "R9000P 2025 详细解读"];
          }
          const compactName = name.replace(/^联想\s*/i, "").slice(0, 12);
          return [
            `${series}该如何选择？`,
            `${compactName}值得买吗？`,
            `${compactName}详细解读`
          ];
        }

        function hoverSparkSvg(size) {
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/></svg>`;
        }

        function renderHoverPromptPop(product, reason = "") {
          const name = (product?.name || "联想拯救者 R9000P 2025 AI元启版").replace(/\s+/g, " ").trim();
          const priceValue = Number(product?.price || product?.sale_price || 14999);
          const price = Number.isFinite(priceValue) && priceValue > 0 ? `¥${priceValue.toLocaleString("zh-CN")}` : "¥14,999";
          const summary = reason
            ? esc(reason).replace(/配置拉满/g, "<b>配置拉满</b>")
            : "这款拯救者<b>配置拉满</b>，打游戏、剪视频、跑 AI 都流畅，硬核玩家用着超爽。";
          const questions = getHoverPromptQuestions(product);
          const image = product?.image_url ? imgUrl(product.image_url) : "";
          const thumb = image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" />` : "<i></i>";
          return `
            <div class="pop"><div class="box">
              <button class="pop-close hover-prompt-close" type="button" aria-label="关闭商品推荐问题">✕</button>
              <div class="ctx">
                <div class="thumb">${thumb}</div>
                <div class="ci"><div class="nm">${esc(name)}</div><div class="pr">${esc(price)} 起</div></div>
                <span class="badge">${hoverSparkSvg(11)}你在看</span>
              </div>
              <div class="body">
                <div class="sum">${summary}</div>
                <div class="divider"><span>乐享建议你问问</span></div>
                <div class="acts">
                  ${questions.map((text) => `<button class="act" type="button" data-hover-prompt="${esc(text)}"><span class="ic">${hoverSparkSvg(13)}</span><span>${esc(text)}</span><span class="ar">›</span></button>`).join("")}
                </div>
              </div>
            </div></div>`;
        }

        function setAssistantGlass(active) {
          const panel = document.querySelector(".assistant-panel");
          if (!panel) return;
          let veil = panel.querySelector(":scope > .assistant-glass-veil");
          if (active) {
            if (!veil) {
              veil = document.createElement("div");
              veil.className = "assistant-glass-veil";
              veil.setAttribute("aria-hidden", "true");
              panel.appendChild(veil);
              requestAnimationFrame(() => veil.classList.add("is-on"));
            } else {
              veil.classList.remove("is-off");
              veil.classList.add("is-on");
            }
            panel.classList.add("assistant-glass-active");
            return;
          }
          panel.classList.remove("assistant-glass-active");
          if (veil) {
            veil.classList.remove("is-on");
            veil.classList.add("is-off");
            window.setTimeout(() => {
              if (veil.parentNode && !panel.classList.contains("assistant-glass-active")) veil.remove();
            }, 260);
          }
        }

        async function showHoverPrompts(product) {
          const bottom = $(".assistant-bottom");
          const list = $("[data-hover-prompt-list]");
          if (!bottom || !list) return;
          const key = String(product?.sku || product?.name || "");
          const alreadyVisible = bottom.classList.contains("has-hover-prompts") && state.hoverPromptVisibleSku === key && !!list.querySelector(".pop");
          if (!alreadyVisible) {
            list.innerHTML = renderHoverPromptPop(product);
            state.hoverPromptVisibleSku = key;
          }
          bottom.classList.add("has-hover-prompts");
          setAssistantGlass(true);
          clearHoverPromptAutoCloseTimer();
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
            const sum = list.querySelector(".pop .sum");
            const summary = esc(reason).replace(/配置拉满/g, "<b>配置拉满</b>");
            if (sum && state.hoverPromptVisibleSku === key) sum.innerHTML = summary;
            else {
              list.innerHTML = renderHoverPromptPop(product, reason);
              state.hoverPromptVisibleSku = key;
            }
          }
        }

        function hideHoverPrompts() {
          clearHoverPromptAutoCloseTimer();
          const bottom = $(".assistant-bottom");
          const list = $("[data-hover-prompt-list]");
          const pop = list?.querySelector(".pop");
          if (!bottom || !list) return;
          if (!pop || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            bottom.classList.remove("has-hover-prompts");
            setAssistantGlass(false);
            state.hoverPromptVisibleSku = "";
            list.innerHTML = "";
            return;
          }
          pop.classList.add("is-closing");
          window.setTimeout(() => {
            bottom.classList.remove("has-hover-prompts");
            setAssistantGlass(false);
            state.hoverPromptVisibleSku = "";
            list.innerHTML = "";
          }, 240);
        }

        function clearHoverPromptAutoCloseTimer() {
          if (state.hoverPromptAutoCloseTimer) window.clearTimeout(state.hoverPromptAutoCloseTimer);
          state.hoverPromptAutoCloseTimer = null;
        }

        function scheduleHoverPromptAutoClose(delay = 4000) {
          clearHoverPromptAutoCloseTimer();
          state.hoverPromptAutoCloseTimer = window.setTimeout(() => {
            hideHoverPrompts();
            state.hoverPromptSku = "";
          }, delay);
        }

        function clearHoverPromptTimer() {
          if (state.hoverPromptTimer) window.clearTimeout(state.hoverPromptTimer);
          state.hoverPromptTimer = null;
          clearHoverPromptAutoCloseTimer();
          state.hoverPromptSku = "";
        }

        function startHoverPromptTimer(card) {
          const product = getProductFromCard(card);
          const key = String(product?.sku || product?.name || "");
          clearHoverPromptTimer();
          if (!key) return;
          state.hoverPromptSku = key;
          if (state.hoverPromptVisibleSku === key && $(".assistant-bottom")?.classList.contains("has-hover-prompts")) {
            clearHoverPromptAutoCloseTimer();
            return;
          }
          state.hoverPromptTimer = window.setTimeout(() => {
            if (state.hoverPromptSku !== key) return;
            showHoverPrompts(product);
            state.hoverPromptTimer = null;
          }, 6000);
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
            // 官方商品 sku 在自有库 404：兜底查 officialProducts 缓存
            if (!product) product = (state.officialProducts || {})[productOrSku] || null;
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
          if (visual) visual.innerHTML = `<img class="detail-product-image" src="${esc(product.official ? (product.image_url || "") : imgUrl(product.image_url))}" alt="${esc(product.name || "商品图片")}" data-detail-visual />`;
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
          lxEnsureBuybar(product);
          lxRenderItemCode(product);
          document.querySelector(".lx-detail-official-link")?.remove();
          loadReviewSummary(product);
          loadFitReason(product);
          loadSpuVariants(product);
          lxHintOnDetail(product);
        }

        // 详情页官方商品编号（取 specs.materialNumber，如 83UE000HCD；无则不展示）
        function lxRenderItemCode(product) {
          const services = document.querySelector(".detail-service");
          if (!services) return;
          document.querySelector(".detail-itemcode")?.remove();
          const specs = lxParseSpecs(product && product.specs);
          const code = specs.materialNumber || specs.materialnumber || "";
          if (!code) return;
          const el = document.createElement("div");
          el.className = "detail-itemcode";
          el.innerHTML = `商品编号：<span>${esc(code)}</span>`;
          services.after(el);
        }

        // SPU 体系：详情页展示同系列全部配置（SKU 选择器 + 价格区间 + 系列内对比）
        let spuToken = 0;
        function lxParseSpecs(raw) {
          if (!raw) return {};
          if (typeof raw === "object") return raw;
          try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        }
        function lxCleanConfigPart(value) {
          return String(value || "")
            .replace(/¥\s*[\d,]+/g, "")
            .replace(/版本|款|商品|笔记本电脑|笔记本|手机|平板|联想|Lenovo/gi, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 34);
        }
        function lxExtractConfigFromText(text) {
          const source = String(text || "").replace(/\u00a0/g, " ");
          const parts = {};
          const phoneCombo = source.match(/(\d{1,3})\s*(?:GB|G)?\s*[+＋]\s*(\d{2,4})\s*(?:GB|G)?/i);
          if (phoneCombo) {
            parts.memory = `${phoneCombo[1]}GB`;
            parts.storage = `${phoneCombo[2]}GB`;
          }
          const cpu = source.match(/(Ultra\s*\d(?:\s+\d{3,4}[A-Z]*)?(?:\s*Plus)?|i[3579][- ]?\d{4,5}[A-Z]{0,3}|(?:AMD\s*)?锐龙\s*\d\s*[A-Z0-9 ]*|Ryzen\s*[3579]\s*\d{4}[A-Z]{0,4}|骁龙\s*\d+\s*(?:Gen\s*\d|Elite)?|天玑\s*\d+)/i);
          if (cpu) parts.cpu = cpu[1];
          if (!parts.memory) {
            const memory = source.match(/(\d{1,3}\s*(?:GB|G)(?:\s*[（(][^)）]+[)）])?\s*(?:DDR[45]|LPDDR5X?)?)/i);
            if (memory) parts.memory = memory[1];
          }
          if (!parts.storage) {
            const storageSource = parts.memory ? source.replace(parts.memory, " ") : source;
            const storage = storageSource.match(/(\d+(?:\.\d+)?\s*(?:TB|T|GB|G)\s*(?:SSD|固态硬盘)?)/i);
            if (storage) parts.storage = storage[1];
          }
          const gpu = source.match(/((?:RTX|GTX)\s*\d{3,4}(?:\s*\d{1,2}G(?:B)?)?|集成显卡|独显)/i);
          if (gpu) parts.gpu = gpu[1];
          const colorTokens = source.split(/[\s｜|/，,（）()]+/).filter(Boolean);
          const color = [...colorTokens].reverse().find((token) =>
            /(?:黑|白|灰|蓝|青|绿|银|金|紫|红|粉|橙)$/.test(token) &&
            !/联想|moto|YOGA|ThinkPad|拯救者|小新|版本|英寸|电脑|手机|平板|游戏本|轻薄/.test(token)
          );
          if (color) parts.color = color;
          return parts;
        }
        function lxVariantLabel(variant, baseName, index = 0) {
          const specs = lxParseSpecs(variant.specs);
          const textConfig = lxExtractConfigFromText(`${variant.name || ""} / ${variant.description || ""}`);
          const pick = (...keys) => keys.map((k) => specs[k]).find(Boolean);
          const config = {
            cpu: pick("cpu", "processor", "处理器") || textConfig.cpu,
            memory: pick("ram", "memory", "内存") || textConfig.memory,
            storage: pick("storage", "disk", "硬盘", "存储") || textConfig.storage,
            gpu: pick("gpu", "graphics", "显卡") || textConfig.gpu,
            color: pick("color", "colour", "颜色") || textConfig.color
          };
          const parts = [config.cpu, config.memory, config.storage, config.gpu, config.color]
            .map(lxCleanConfigPart)
            .filter(Boolean);
          return parts.length ? parts.join(" / ") : `配置 ${String(index + 1).padStart(2, "0")}`;
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
            // 标签只能展示标准规格：处理器 + 内存 + 硬盘 + 显卡 + 颜色；禁止落回商品名/价格版本。
            let labels = variants.map((variant, i) => lxVariantLabel(variant, product.name, i));
            if (new Set(labels).size < labels.length) {
              const seen = {};
              labels = labels.map((label, i) => {
                seen[label] = (seen[label] || 0) + 1;
                return seen[label] > 1 ? `${label} / 配置 ${String(i + 1).padStart(2, "0")}` : label;
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

        // 详情页底部跟随购买条：主按钮区滚出视野后吸底显示，购买永远够得着
        let lxBuybarObserver = null;
        function lxEnsureBuybar(product) {
          const host = document.querySelector(".product-detail");
          const actions = document.querySelector(".detail-actions");
          if (!host || !actions) return;
          document.querySelector(".lx-buybar")?.remove();
          const biz = lxIsBizProduct(product);
          host.insertAdjacentHTML("beforeend", `
            <div class="lx-buybar" hidden>
              <img src="${esc(imgUrl(product.image_url))}" alt="" />
              <div class="lx-buybar-info"><strong>${esc((product.name || "").slice(0, 30))}</strong><b>¥${Number(product.price || 0).toLocaleString()}</b></div>
              <button class="detail-primary" type="button"${biz ? ' data-biz-quote="1"' : ""}>${biz ? "获取报价方案" : "一键领优惠下单"}</button>
              ${biz ? "" : `<button class="detail-secondary" type="button">加入购物车</button>`}
            </div>`);
          const bar = host.querySelector(".lx-buybar");
          if (bar && biz) bar.querySelector(".detail-primary").dataset.bizQuote = "1";
          lxBuybarObserver?.disconnect();
          lxBuybarObserver = new IntersectionObserver(([entry]) => {
            if (bar) bar.hidden = entry.isIntersecting;
          }, { root: document.querySelector(".content"), threshold: 0 });
          lxBuybarObserver.observe(actions);
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
            const similar = $(".lx-p0-detail-similar", actions);
            if (similar) similar.hidden = true;
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
            ensureDetailSimilarButton();
            const similar = $(".lx-p0-detail-similar", actions);
            if (similar) similar.hidden = false;
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

        function lxFindSimilarViaChat() {
          const p = state.currentProduct;
          if (!p || !p.sku) return toast("请先选择商品");
          const name = p.name || "这款商品";
          const price = Number(p.price || 0);
          const cat = p.category || "";
          lxRevealContent();
          const ask = `帮我推荐几款和「${name}」同类、价位相近（${price ? "¥" + price.toLocaleString() + " 上下" : "相近价位"}）但可能更适合我的${cat || "商品"}，说下各自的差异和适合谁。`;
          sendChat(ask);
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
          const node = addMessage("assistant", `好的！为你自动领取 ${claimed.length} 项专属优惠：`, card);
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
          addMessage("assistant", `已下单成功（演示）：${order.name}，实付 ¥${Number(order.price || 0).toLocaleString()}，订单号 ${order.orderId}。${order.benefitNote ? `已用优惠：${order.benefitNote}。` : ""}`, `<div class="lx-p0-actions" style="margin-top:8px"><button class="lx-p0-btn primary" type="button" data-floor-action="orders">查看订单</button><button class="lx-p0-btn" type="button" data-quick-ask="刚买了${esc(order.name)}，帮我配个合适的鼠标或包">顺手配个配件</button></div>`);
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
          lxRevealContent();
          lxOpenInfoTab("cart", "购物车", rows);
        }

        function openOrders() {
          const invoice = load("lexiang.invoice.v1");
          const invoiceText = invoice && invoice.title ? `已设置开票抬头：${esc(invoice.title)}` : "未设置开票信息";
          const rows = state.orders.length ? state.orders.map((item) => `
            <div class="lx-p0-row">
              <img src="${esc(item.image_url)}" alt="">
              <div class="lx-p0-row-main"><strong>${esc(item.name)}</strong><span>订单 ${esc(item.orderId)} · ${esc(item.createdAt)} · ${money(item.price)}</span>${item.address ? `<span>收货：${esc(item.address.name || "")} ${esc(item.address.phone || "")} ${esc(item.address.region || "")}${esc(item.address.detail || "")}</span>` : ""}</div>
              <button class="lx-p0-btn" data-ask-order="${esc(item.name)}">问订单</button>
              <button class="lx-p0-btn" data-order-detail="${esc(item.orderId)}">订单详情</button>
            </div>`).join("") : `<p class="lx-p0-disclaimer">暂无订单。点击商品详情页「一键领优惠下单」即可生成演示订单。</p>`;
          lxRevealContent();
          lxOpenInfoTab("orders", "我的订单", `${rows}<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-invoice>开票信息</button><span class="lx-invoice-note">${invoiceText}</span></div>`);
        }

        function openOrderDetail(orderId) {
          const item = (state.orders || []).find((o) => o.orderId === orderId);
          if (!item) return toast("找不到该订单");
          const benefitLine = item.benefitNote ? `<div class="lx-p0-row-main" style="padding:6px 0"><span style="color:var(--lx-accent,#c41230)">已用优惠：${esc(item.benefitNote)}</span></div>` : "";
          const html = `
            <div class="lx-p0-row">
              <img src="${esc(item.image_url)}" alt="">
              <div class="lx-p0-row-main">
                <strong>${esc(item.name)}</strong>
                <span>${esc(item.category || "")}</span>
                <span>单价 ${money(item.price)}</span>
              </div>
            </div>
            <div class="lx-p0-row-main" style="padding:8px 0">
              <span>订单号：${esc(item.orderId)}</span>
              <span>下单时间：${esc(item.createdAt)}</span>
            </div>
            ${item.address ? `<div class="lx-p0-row-main" style="padding:4px 0">
              <span>收货人：${esc(item.address.name || "")} ${esc(item.address.phone || "")}</span>
              <span>地址：${esc(item.address.region || "")}${esc(item.address.detail || "")}</span>
            </div>` : ""}
            <div class="lx-p0-row-main" style="padding:4px 0">
              <span>实付金额：<strong>${money(item.price)}</strong></span>
            </div>
            ${benefitLine}
            <div class="lx-p0-row-main" style="padding:8px 0">
              <span>物流状态：<strong>已下单 → 备货中 → 待发货</strong></span>
            </div>
            <div class="lx-p0-actions">
              <button class="lx-p0-btn" data-ask-order="${esc(item.name)}">问订单</button>
              <button class="lx-p0-btn" data-buy-sku="${esc(item.sku || "")}">再次购买</button>
            </div>
            <p class="lx-p0-disclaimer">物流状态为演示数据，正式上线对接真实物流接口。</p>`;
          lxOpenInfoTab("order-detail", "订单详情", html);
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
          if (state.compare.length >= 8) return toast("最多对比 8 件商品");
          state.compare.push(item);
          save("lexiang.compare.v1", state.compare);
          // 收口到右侧「对比」标签：不打断当前浏览，仅更新标签与数量
          lxUpsertCompareTab(null, null, state.compare.length === 2);
          toast(state.compare.length === 1 ? "已加入对比（1/4），再选 1 件即可生成对比表" : `已加入对比（${state.compare.length}），对比表已生成`);
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
          const full = await Promise.all(source.slice(0, 8).map(async (item) => {
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
            <div class="lx-cmp-advice" style="display:none;margin:12px 0;padding:12px 16px;background:#f5f0ff;border-radius:10px;font-size:13px;color:#3d1fa3;line-height:1.6"></div>
            <div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn" type="button" data-quick-ask="帮我解读这几款的差异，按我的需求给出选购建议：${esc(full.map((item) => item.name).join("、"))}">让乐享解读差异</button></div>`;
          // AI建议：异步 fetch，不阻塞渲染
          (async () => {
            try {
              const adviceEl = pageBox.querySelector(".lx-cmp-advice");
              if (!adviceEl) return;
              const advProducts = full.map(p => ({ name: p.name, price: p.price, cpu: (p.specs || {}).cpu || '', gpu: (p.specs || {}).gpu || '', ram: (p.specs || {}).ram || (p.specs || {}).memory || '' }));
              const advQ = state.lastUserText || '';
              const r = await fetch('/api/leai/compare-advice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: advProducts, q: advQ }) });
              if (!r.ok) return;
              const d = await r.json();
              if (!d.pick || !d.reason) return;
              adviceEl.innerHTML = `<strong style="display:block;margin-bottom:4px;color:#2d1580">AI 建议</strong>结合你的需求，最推荐 <strong>${esc(d.pick)}</strong>：${esc(d.reason)}`;
              adviceEl.style.display = 'block';
            } catch (_) {}
          })();
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
            <div class="lx-p0-messages" aria-live="polite"></div>`;
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
          // 若分屏态新建对话，回全屏欢迎页
          if (!document.body.classList.contains("assistant-fullscreen") &&
              typeof window.__lxfdNewFullscreen === "function") {
            state.tabs = [];
            state.activeTabId = null;
            lxRenderTabbar();
            document.querySelector(".content")?.setAttribute("data-view", "list");
            window.__lxfdNewFullscreen();
          } else {
            toast("已新建对话");
          }
        }

        async function sendChat(message) {
          const text = (message || $(".composer textarea")?.value || "").trim();
          if (!text || state.sending) return;
          const nonce = state.conversationNonce;
          const textarea = $(".composer textarea");
          if (textarea) textarea.value = "";
          lxHideSuggest();
          state.lastUserText = text;
          addMessage("user", text);
          if (Array.isArray(state.refProducts) && state.refProducts.length) {
            ensureChat()?.lastElementChild?.insertAdjacentHTML("beforeend", `<div class="lx-ref-chip">引用：${esc(state.refProducts.map(p => p.name.slice(0, 10)).join("、"))}</div>`);
          } else if (state.refProduct) {
            ensureChat()?.lastElementChild?.insertAdjacentHTML("beforeend", `<div class="lx-ref-chip">引用：${esc(state.refProduct.name.slice(0, 22))}</div>`);
          }
          // 引用 ≥2 个商品 + 对比意图 → 直接用引用的这几款出结构化对比表（不依赖官方返回商品）
          const _cmpRefs = (Array.isArray(state.refProducts) ? state.refProducts : []).slice(0, 8);
          if (_cmpRefs.length >= 2 && /对比|比较|哪个好|哪个更|哪个值|怎么选(?!购)|差别|区别|谁更好|选哪/.test(text)) {
            lxRevealContent();
            lxUpsertCompareTab(_cmpRefs, "商品对比");
          }
          setTimeout(() => lxSetRef(null), 100);
          if (/学生认证|教育认证/.test(text) && text.length <= 14) setTimeout(openStudentAuth, 400);
          state.queryHistory.push(text);
          (state.queryAnchors = state.queryAnchors || []).push(($(".lx-p0-messages")?.children.length || 1) - 1);
          renderQueryHistory();
          // ── 本地快路径：高频明确操作指令 0 延迟秒回，不调后端 ──────────────
          const _localCtrl = (function(_t) {
            // 关其他/留当前/留一排——必须在 close_all 之前判（更具体）
            if (/(关闭?|关掉)(其他|其它|多余|别的|除当前外?的?)(标签|页面|页签)?|只留(当前|这个|一个|一排)|留(当前|这个|一个|一排)(标签|页面)?|关成(剩余|只剩)?一(排|个)|剩(余|下)一(排|个)/.test(_t)) return { op: "close_other_tabs", msg: "好的，已关闭其他标签，只留当前页面。" };
            if (/^\s*(关闭?|清空)(所有|全部|这些|当前)?(标签|页面|分页|tab|页签)\s*$/i.test(_t) || /(把|将)?(所有|全部)(标签|页面).{0,4}关(掉|闭)/.test(_t)) return { op: "close_all_tabs", msg: "好的，已为你关闭所有页面标签。" };
            if (/^\s*(进入|开启|切换?到?|变成?|开)?全屏(模式|对话|查看)?\s*$|^\s*(放大|沉浸|专注)(模式|对话|查看)?\s*$/.test(_t)) return { op: "enter_fullscreen", msg: "好的，已切换到全屏对话模式。" };
            if (/^\s*(退出|关闭|取消|结束)(全屏|沉浸|专注)|^\s*(分屏|窗口|恢复|缩小)(模式)?\s*$|^\s*(打开|展开)(右侧|浏览区|浏览|分屏)(面板)?\s*$|^\s*(右侧|浏览区)(展开|打开)\s*$/.test(_t)) return { op: "exit_fullscreen", msg: "好的，已展开右侧浏览区。" };
            if (/^\s*(回|返回|去|到)(首页|主页)\s*$/.test(_t)) return { op: "go_home", msg: "好的，已为你回到首页。" };
            if (/^\s*(打开|查看|看看?)(我的)?购物车\s*$/.test(_t)) return { op: "open_cart", msg: "好的，已为你打开购物车。" };
            if (/^\s*(打开|查看|看看?)(我的)?订单(列表|页面|中心)?\s*$/.test(_t)) return { op: "open_orders", msg: "好的，已为你打开订单页面。" };
            return null;
          })(text);
          if (_localCtrl) {
            lxExecControl(_localCtrl.op, "");
            addMessage("ai", _localCtrl.msg);
            // state.sending 此时仍为 false（还没设置），直接 return 即可
            return;
          }
          // ── 本地快路径结束 ───────────────────────────────────────────────
          const ai = addMessage("ai loading", "", renderGenerating("正在检索权益、商品和服务信息..."));
          state.sending = true;
          state._fallbackFired = false;
          try {
            // ── 远程意图路由（非多模态、无媒体附件时先问后端意图，3秒超时降级）──
            if (!state.pendingImageUrl && !state.pendingAudioUrl && !window.__lxWebSearch) {
              let _intentResult = null;
              try {
                const _intentAbort = new AbortController();
                const _intentTimer = setTimeout(() => _intentAbort.abort(), 3000);
                const _intentRes = await fetch("/api/leai/intent", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ message: text }),
                  signal: _intentAbort.signal
                });
                clearTimeout(_intentTimer);
                if (_intentRes.ok) _intentResult = await _intentRes.json();
              } catch (_intentErr) { /* 超时/失败 → 降级 chat */ }
              if (_intentResult && _intentResult.type === "control" && _intentResult.op) {
                ai.remove(); // 移除 loading 气泡
                const _opNames = { close_all_tabs: "关闭了所有页面标签", close_other_tabs: "关闭了其他标签，只留当前", go_home: "回到了首页", open_cart: "打开了购物车", open_orders: "打开了订单页面", open_member: "打开了会员中心", open_coupon: "打开了优惠券中心", open_stores: "打开了门店查询", open_edu_zone: "打开了教育专区", open_product: `正在帮你打开「${_intentResult.target || "该商品"}」`, enter_fullscreen: "切换到全屏对话模式", exit_fullscreen: "退出了全屏模式" };
                addMessage("ai", `好的，已为你${_opNames[_intentResult.op] || "执行了操作"}。`);
                lxExecControl(_intentResult.op, _intentResult.target || "");
                state.sending = false;
                return;
              }
            }
            // ── 远程意图路由结束 ─────────────────────────────────────────────
            // 多模态路由：有图/语音或开联网搜索时走火山 /api/chat/stream，否则走官方 /api/leai/stream
            const hasMedia = !!(state.pendingImageUrl || state.pendingAudioUrl);
            const useHuoshan = hasMedia || !!window.__lxWebSearch;
            const _refProductsPrefix = (Array.isArray(state.refProducts) && state.refProducts.length)
              ? `[用户正在咨询这些商品: ${state.refProducts.map(p => `${p.name}${p.sku ? ` (SKU:${p.sku})` : ""}`).join("、")}]\n\n`
              : (state.refProduct ? `[用户正在咨询商品: ${state.refProduct.name}${state.refProduct.sku ? ` (SKU:${state.refProduct.sku})` : ""}]\n\n` : "");
            const builtMsg = _refProductsPrefix + (state.refMsg ? `[用户引用了此前对话内容作为上下文: ${state.refMsg}]\n\n` : "") + (state.humanMode ? `[系统提示: 请以"专属客服小联"身份回复, 像人工客服一样亲切自然简短直接, 不用 markdown/列表/标题, 不暴露 AI 身份, 严禁输出"QA对""知识库""参考资料"等内部字样或📎等标记。]\n\n用户问: ${text}` : text);
            const response = useHuoshan
              ? await fetch("/api/chat/stream", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: builtMsg,
                    image_url: state.pendingImageUrl || undefined,
                    audio_url: state.pendingAudioUrl || undefined,
                    web_search: !!window.__lxWebSearch,
                    thinking_mode: !!window.__lxThinking,
                    conv_id: state.convId || undefined
                  })
                })
              : await fetch("/api/leai/stream", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    // 人工模式：消息注入专属客服人设（界面仍显示用户原文，对齐旧版逻辑）
                    message: builtMsg,
                    sessionId: state.convId || undefined,
                    enableThinking: !!window.__lxThinking,
                    ...(window.__lxGeo || {})
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
            const handlers = {
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
                  openProduct(products[0]);
                } else if (products.length) {
                  lxRevealContent();
                  const recoTab = { id: "reco", kind: "reco", label: "AI 推荐", products };
                  lxUpsertTab(recoTab);
                  lxRunTab(recoTab);
                }
              },
              clicks: (data) => {
                if (nonce !== state.conversationNonce) return;
                const list = (parseJson(data).clicks) || [];
                if (!list.length) return;
                revealAi();
                ai.insertAdjacentHTML("beforeend", '<div class="leai-clicks" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' + list.map((c) =>
                  `<button type="button" class="leai-click-btn" data-leai-url="${esc(c.link_url || "")}" data-leai-cb="${esc(c.callback_data || "")}" data-leai-event="${esc(c.event_type || "")}" style="padding:8px 16px;border-radius:999px;border:1px solid #c8161e;background:#c8161e;color:#fff;font-size:13px;font-weight:600;cursor:pointer">${esc(c.display_text)}</button>`
                ).join("") + "</div>");
              },
              display: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                let products = payload.products || payload.items || [];
                revealAi();
                // 意图忠实于形态：单品意图（推荐一台/哪个最值）收敛到 1 款直开；对比意图直开对比表
                const lastAsk = state.lastUserText || "";
                if (products.length >= 2 && /对比|比较|哪个好|怎么选(?!购)/.test(lastAsk)) {
                  if (payload.title && !ai.textContent.trim()) ai.textContent = payload.title;
                  ai.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
                  lxRevealContent();
                  lxUpsertCompareTab(products.slice(0, 8), payload.title || "商品参数对比");
                  return;
                }
                if (products.length > 1 && /推荐一[台款部个]|最值得|哪[个款台]最|帮我定一/.test(lastAsk)) {
                  products = products.slice(0, 1);
                }
                if (payload.title && !ai.textContent.trim()) ai.textContent = payload.title;
                ai.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
                // 所推即所见 + 最短路径：1 款直接打开商详，多款落「AI 推荐」专属结果页（PRD 5.2/6.5）
                if (products.length === 1 && products[0].sku) {
                  lxRevealContent();
                  openProduct(products[0]);
                } else if (products.length) {
                  lxRevealContent();
                  const recoTab = { id: "reco", kind: "reco", label: payload.title || "AI 推荐", products, grouped: payload.grouped };
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
              action: (data) => {
                if (nonce !== state.conversationNonce) return;
                const { op } = parseJson(data) || {};
                lxRevealContent();
                if (op === 'member') openMemberCenter();
                else if (op === 'coupon') openCouponCenter();
                else if (op === 'solution') openSolutionCenter();
                else if (op === 'edu') {
                  openEduZone();
                  ai.insertAdjacentHTML('beforeend', '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-stuauth="college">在校生认证</button><button class="lx-p0-btn" type="button" data-open-stuauth="gaokao">高考生认证</button></div>');
                }
                else if (op === 'stores') openStoresPanel();
                else if (op === 'auth') {
                  // 职场认证：往当前 AI 气泡末尾插入触发按钮
                  ai.insertAdjacentHTML('beforeend', '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-wpa>立即认证职场身份</button></div>');
                }
              },
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
                // 官方商品缓存到 state，供点击时按 sku 取对象传给 openProduct
                state.officialProducts = state.officialProducts || {};
                products.forEach((p) => { if (p.sku) state.officialProducts[p.sku] = p; });
                ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-suggest">${products.slice(0, 3).map((p) => `<button class="lx-p0-suggest-chip" type="button" data-open-product="${esc(p.sku)}">${esc(p.name)} ¥${Number(p.price || 0).toLocaleString()}</button>`).join("")}</div>`);
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
                const content = payload.content || "";
                // 载体分工：浏览型长内容（直播单/活动详情/价目表等）右侧分屏展示，弹窗只留短提示
                if (content.length > 220 || /\n\s*[-|#]|\|.*\|/.test(content)) {
                  lxRevealContent();
                  lxOpenInfoTab("info", payload.title || "详细信息", mdLite(content));
                } else {
                  openModal(payload.title || "联想乐享", mdLite(content));
                }
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
                // 追问 chips：异步生成，不阻塞主流程
                const _q = state.lastUserText || "";
                const _a = (ai._raw || "").slice(0, 300);
                if (_q && _a) {
                  fetch("/api/leai/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: _q, a: _a }) })
                    .then(r => r.json()).then(d => {
                      if (nonce !== state.conversationNonce) return;
                      const qs = Array.isArray(d && d.questions) ? d.questions.filter(Boolean).slice(0, 3) : [];
                      if (qs.length) {
                        // 移除已有追问块（避免重复/叠加）
                        ai.querySelectorAll(".lx-p0-suggest[data-followups]").forEach(el => el.remove());
                        ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-suggest" data-followups="1">${qs.map(sug => `<button class="lx-p0-suggest-chip" type="button" data-quick-ask="${esc(sug)}">${esc(sug)}</button>`).join("")}</div>`);
                      }
                    }).catch(() => {});
                }
              },
              fallback: async () => {
                if (nonce !== state.conversationNonce) return;
                if (state._fallbackFired) return;
                state._fallbackFired = true;
                try {
                  const huoRes = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: builtMsg, conv_id: state.convId || undefined })
                  });
                  if (!huoRes.ok || !huoRes.body) throw new Error('fallback upstream ' + huoRes.status);
                  await readSse(huoRes, handlers);
                } catch (_e) {
                  revealAi();
                  if (ai._textBox) ai._textBox.textContent = '当前服务暂时不可用，请稍后再试。';
                }
              }
            };
            await readSse(response, handlers);
            if (nonce !== state.conversationNonce) return;
            if (!hasContent) revealAi();
            if (!ai.textContent.trim() && !$(".lx-p0-products", ai)) ai.textContent = "我已经收到请求，可以继续补充预算、用途或偏好的机型。";
            if (!state.humanMode) ai.insertAdjacentHTML("beforeend", `<div class="lx-p0-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>`);
            state.pendingImageUrl = "";
            state.pendingAudioUrl = "";
            updateUploadNote();
            if (state.officialCompare) callOfficialAI(text);
          } catch (error) {
            if (nonce !== state.conversationNonce) return;
            ai.className = "lx-p0-message ai";
            ai.textContent = "当前 AI 服务暂时不可用，请稍后重试。";
          } finally {
            clearTimeout(state._sendTimeout);
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
              setTimeout(() => lxOnEntVerified(ent), 80);
            }
            return ent;
          } catch { return { status: "none" }; }
        }

        // 认证通过的黄金时刻：对话主动播报 + 企业价立即可见（说到做到）
        function lxOnEntVerified(ent) {
          if (state._entCongrats) return;
          state._entCongrats = true;
          toast("企业认证已通过");
          addMessage("assistant", `好消息：「${ent.company || "贵公司"}」的企业采购负责人认证已通过！已为你解锁企业专享价（商品价签即刻生效）、采购补贴、对公专票与账期通道。`, `<div class="lx-p0-actions" style="margin-top:8px"><button class="lx-p0-btn primary" type="button" data-quick-ask="按企业专享价帮我重新推荐刚才在看的办公电脑">按企业价重看推荐</button><button class="lx-p0-btn" type="button" data-quick-ask="企业专享权益都有哪些，怎么用">看全部企业权益</button></div>`);
          if (state.page === "business") setTimeout(() => { try { lxRunTab(state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0]); } catch {} }, 200);
        }

        // pending 状态主动盯审核结果：到点即播报，不等用户下次操作
        let lxEntWatcher = null;
        function lxWatchEntPending() {
          clearInterval(lxEntWatcher);
          lxEntWatcher = setInterval(() => {
            const ent = lxEntState(); // 惰性检测内含 verified 转变与播报
            if (ent.status !== "pending") clearInterval(lxEntWatcher);
          }, 2500);
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
            [/教育特惠/, "lx-floor--activity lx-floor--education"],
            [/^国补$/, "lx-floor--activity lx-floor--guobu"],
            [/^会员$/, "lx-floor--activity lx-floor--member-floor"],
            [/门店|服务/, "lx-floor--activity lx-floor--service"],
            [/会员权益/, "lx-floor--activity lx-floor--member"],
            [/私人定制/, "lx-floor--activity lx-floor--custom"],
            [/以旧换新/, "lx-floor--activity lx-floor--tradein"],
            [/^种草$/, "lx-floor--activity lx-floor--discover"],
            [/企业专享|对公|轻量定制|行业解决方案|信创|大客户/, "lx-floor--activity"],
          ];
          const extraClass = (classMap.find(([pattern]) => pattern.test(title)) || [null, ""])[1];
          return `<section class="lx-floor ${extraClass}" data-floor-cat="${esc(title)}"><div class="lx-floor-head"><i class="lx-floor-badge" aria-hidden="true"></i><div class="lx-floor-title"><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div><div class="lx-floor-actions">${cta || ""}</div></div><div class="lx-floor-body">${body}</div></section>`;
        }

        function lxGetSiteTabLabels(page = state.page) {
          const categoryLabels = ["personal", "business", "enterprise"].includes(page) ? [] : (LX_CATEGORY_MATCHERS[page] || []).map((m) => m.label || m[0]);
          const activityLabels = {
            personal: ["国补", "教育特惠", "会员", "私人定制", "以旧换新", "今日秒杀", "种草", "服务", "门店"],
            business: ["企业专享权益", "对公与售后保障", "轻量定制方案", "门店", "服务"],
            enterprise: ["行业解决方案", "信创合规", "大客户专属服务"],
          }[page] || [];
          return ["推荐", ...categoryLabels, ...activityLabels];
        }

        // 分类页签切换当前内容，不再用锚点平铺整页
        // PC 端不横滑：测宽放不下的页签收进「更多 ▾」悬停菜单（与 actionbar 同方案）
        function lxSyncCategoryTabs() {
          const tabsBox = document.querySelector(".category-tabs");
          if (!tabsBox || !["personal", "business", "enterprise"].includes(state.page)) return;
          if (!tabsBox.clientWidth) return;
          const labels = lxGetSiteTabLabels(state.page);
          if (!labels.includes(state.activeSiteFloorTab)) state.activeSiteFloorTab = "推荐";
          const activeLabel = state.activeSiteFloorTab || "推荐";
          const btnHtml = (label) => `<button type="button" class="${label === activeLabel ? "active" : ""}" data-cat-label="${esc(label)}">${esc(label)}</button>`;
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
            ? `<span class="cat-more-wrap"><button type="button" data-cat-more>更多 ▾</button><div class="cat-more-menu">${overflow.map(btnHtml).join("")}</div></span>`
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

        // 站内商品分类楼层：tab 点击后只渲染当前内容，不再平铺整页锚点跳转
        const LX_CATEGORY_MATCHERS = {
          // personal 子站只列 shop 货盘真有量的子品牌/品类（ThinkPad/ThinkBook/IdeaPad 被归到企业购站，
          // shop 货盘几乎没货，列了就是空标签 → 不列）。手机=moto+拯救者手机；平板含拯救者Y700/Y900
          personal: [
            ["小新", (p) => /小新/.test(p.name)],
            ["拯救者", (p) => /拯救者|Legion/i.test(p.name)],
            ["YOGA", (p) => /YOGA/i.test(p.name)],
            ["平板", (p) => p.category === "平板电脑"],
            ["手机", (p) => p.category === "手机" || /moto/i.test(p.name)],
            ["配件", (p) => ["耳机", "包袋", "键鼠相关", "显示器"].includes(p.category)],
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
            ["笔记本", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category !== "服务产品" && (p.category === "笔记本电脑" || /笔记本|昭阳|开天|ThinkPad|ThinkBook|AI\s*PC/i.test(text)) && !/服务|保修|存储|服务器|工作站|移动工作站|台式|主机|ThinkCentre|智能设备|外设|配件/i.test(text);
            }],
            ["台式机", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category !== "服务产品" && (p.category === "台式机" || /台式机|商用台式|启天|开天.*台式|ThinkCentre|一体机/i.test(text)) && !/服务器|存储|工作站|移动工作站|ThinkStation|ThinkSystem|问天|Wentian|机架|塔式服务器|ST\d+|SR\d+|WR\d+|DE\d+/i.test(text);
            }],
            ["工作站", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category !== "服务产品" && (p.category === "工作站" || /工作站|移动工作站|ThinkStation/i.test(text));
            }],
            ["智能设备", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category !== "服务产品" && (/智能设备|智慧屏|会议平板|ThinkSmart|AI一体机|边缘智能|工控|工业平板|智能终端|ThinkVision|显示器|打印机/i.test(text) || ["显示器", "打印机及配件"].includes(p.category));
            }],
            ["存储", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category === "存储" || /存储|Storage|DE\d+|ThinkSystem.*DM|磁盘阵列|全闪|混闪|SAN|NAS/i.test(text);
            }],
            ["数据网络", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return /数据网络|网络|交换机|路由|网关|ThinkSystem.*NE|Fabric|以太网|光纤/i.test(text);
            }],
            ["软件超融合", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return !/数据恢复|硬件恢复|开盘|拷贝/i.test(text) && /软件|超融合|虚拟化|云平台|HCI|Lenovo xCloud|xCloud|云智|超融合一体机|Open Claw|远程部署|Skill配置|聊天应用配置/i.test(text);
            }],
            ["异构智算", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return /异构|智算|服务器|塔式服务器|机架|ThinkSystem|问天|Wentian|AI服务器|AI\s*服务器|GPU|算力|训推|推理|深度学习|ST\d+|SR\d+|WR\d+/i.test(text);
            }],
            ["外设系列", (p) => {
              const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
              return p.category !== "服务产品" && !/上门安装服务|扩容方案|新机开荒|数据恢复|任性造|部署服务/i.test(text) && (["键鼠相关", "包袋", "配件", "耳机"].includes(p.category) || /外设|配件|鼠标|键盘|键鼠|扩展坞|电源|适配器|背包|包|耳机|支架|线缆|摄像头|RAID阵列卡|专用电源/i.test(text));
            }],
          ],
        };

        function lxProductMiniCard(product) {
          const _sub = lxSubBrand(product.name);
          const _badge = _sub ? `<span class="lx-cat-badge">${esc(_sub)}</span>` : "";
          const _clean = cleanSpuName(product.name) || "联想商品";
          if (product.official) {
            return `<div class="lx-floor-product" data-open-product="${esc(product.sku)}">
            <div class="product-visual">${_badge}<img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy" /></div>
            <h3 class="product-title">${esc(_clean)}<span class="lx-official-tag">官方在售</span></h3>
            <p class="spec">${esc(product.description || "")}</p>
            <div class="price">${money(product.price)}${product.variants > 1 ? `<span class="price-from">${product.variants} 款配置</span>` : ""}</div>
            <button class="lx-p0-btn primary" type="button" data-open-product="${esc(product.sku)}" style="margin-top:8px;width:100%">立即购买</button>
          </div>`;
          }
          const tags = Array.isArray(product.promotion_tags) && product.promotion_tags.length ? product.promotion_tags : ["官方优惠", "限时优惠"];
          const promos = tags.slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("");
          return `<div class="lx-floor-product" data-open-product="${esc(product.sku)}">
            <div class="product-visual">${_badge}<img src="${esc(imgUrl(product.image_url))}" alt="${esc(product.name)}" loading="lazy" /></div>
            <h3 class="product-title">${esc(_clean)}</h3>
            <p class="spec">${esc(product.description || product.category || "官方正品｜联想服务")}</p>
            <div class="product-promos" aria-label="促销标签">${promos}</div>
            <div class="price">${money(product.price)}<span class="price-from">起</span></div>
          </div>`;
        }


        // 整机过滤：子品牌电脑楼层只放笔记本/台式整机，剔除配件周边（货盘里部分配件 category 错标成"笔记本电脑"，按名字兜底排除）
        const LX_PERIPHERAL_RE = /固态硬盘|SSD|移动硬盘|适配器|电源线|电源适配|双肩包|背包|斜挎|行李箱|鼠标|键盘膜|键盘|耳机|散热器|散热|支架|增高|水杯|T-?Shirt|T恤|卫衣|羽绒|马甲|自行车|手柄|底座|随身WIFI|电竞WiFi|WiFi|移动电源|充电|剃须刀|眼镜|拆机|兑换卡|电竞椅|椅|彩膜|保护壳|保护夹|钢化膜|延保|只换不修|保值|换新|服务包/i;
        // 整机楼层精准黑名单（只排明确非整机/B端办公品，宁漏勿误，不用「充电/会议/音箱」等宽词误伤正常机型）。
        // 查 name+description（moto buds 名里没「耳机」，desc 才有）。会议平板/大屏属 B 端，个人站不展示。
        const LX_NON_MACHINE_RE = /耳机|buds|延保|服务包|权益包|出行权益|套餐|手柄|会议平板|会议大屏|传屏器|移动支架|电子白板|触控会议|自行车|滑板车|双肩包|背包|斜挎|行李箱|鼠标|键盘膜|贴膜|钢化膜|彩膜|保护套|保护壳|保护夹|水杯|T-?Shirt|T恤|卫衣|羽绒|马甲|剃须刀|拆机|兑换卡/i;
        const lxIsWholeMachine = (p) => !LX_NON_MACHINE_RE.test(`${p.name || ""} ${p.description || ""}`);

        // 全屋智能关键词：命中→全屋楼层；不命中→智能生活楼层（两者共享 category='智能生活'，靠此正则拆分）
        const LX_SMARTHOME_RE = /全屋|智能家居|门锁|网关|摄像头|摄像机|传感器|智能灯|智能开关|智能插座|路由器|门铃|监控/;

        // 测试/无效品过滤
        const LX_TEST_PRODUCT_RE = /UI自动化专用|测试|请勿修改|下单不发货/;
        const lxIsValidProduct = (p) => !LX_TEST_PRODUCT_RE.test(`${p.name || ""}`);

        // 8 品类楼层定义：[标题, 取货所需 categories 列表, 前端过滤函数]
        // categories 列表用于 lxEnsureCategoryPool 并发拉货；filter 在客户端二次过滤（处理多 cat 合并和智能生活拆分）
        const LX_PERSONAL_CATEGORY_FLOORS = [
          {
            label: "笔记本",
            categories: ["笔记本电脑"],
            // 整机品类排周边（lxIsWholeMachine 去自行车/鼠标/配件等错标进笔记本的脏数据）
            filter: (p) => p.category === "笔记本电脑" && lxIsValidProduct(p) && lxIsWholeMachine(p),
          },
          {
            label: "台式机/显示器",
            categories: ["台式机", "显示器"],
            filter: (p) => (p.category === "台式机" || p.category === "显示器") && lxIsValidProduct(p) && lxIsWholeMachine(p),
          },
          {
            label: "平板",
            categories: ["平板电脑"],
            filter: (p) => p.category === "平板电脑" && lxIsValidProduct(p) && lxIsWholeMachine(p),
          },
          {
            label: "手机",
            categories: ["手机"],
            filter: (p) => p.category === "手机" && lxIsValidProduct(p) && lxIsWholeMachine(p),
          },
          {
            label: "智能生活",
            categories: ["智能生活"],
            filter: (p) => p.category === "智能生活" && !LX_SMARTHOME_RE.test(`${p.name || ""} ${p.description || ""}`) && lxIsValidProduct(p),
          },
          {
            label: "配件/办公",
            categories: ["键鼠相关", "电脑外设与配件", "充电设备", "包袋", "耳机", "打印机及配件", "存储设备"],
            // 会议平板/大屏属 B 端商用，个人站不展示（无论它被标成哪个 category）
            filter: (p) => ["键鼠相关", "电脑外设与配件", "充电设备", "包袋", "耳机", "打印机及配件", "存储设备"].includes(p.category) && lxIsValidProduct(p) && !/会议平板|会议大屏|传屏器|电子白板|触控会议/.test(`${p.name || ""} ${p.description || ""}`),
          },
          {
            label: "全屋智能",
            categories: ["智能生活"],
            filter: (p) => p.category === "智能生活" && LX_SMARTHOME_RE.test(`${p.name || ""} ${p.description || ""}`) && lxIsValidProduct(p),
          },
          {
            label: "服务",
            categories: ["服务产品"],
            filter: (p) => p.category === "服务产品" && lxIsValidProduct(p),
          },
        ];

        // 兼容旧的子品牌楼层格式（business/enterprise 仍在用）
        const LX_PERSONAL_RECOMMEND_FLOORS = [];

        const LX_BUSINESS_RECOMMEND_FLOORS = [
          ["ThinkPad", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /ThinkPad/i.test(text);
          }],
          ["ThinkBook", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /ThinkBook/i.test(text);
          }],
          ["Thinkplus", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /Thinkplus|ThinkPlus|thinkplus|think\+|会议|耳机|口红电源|扩展坞|随身充|蓝牙/i.test(text);
          }],
          ["ThinkCentre", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /ThinkCentre/i.test(text);
          }],
          ["扬天&瑞天", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return !/ThinkCentre/i.test(text) && (p.category === "台式机" || /扬天|瑞天|YangTian|启天|商用台式|台式机|主机|一体机/i.test(text));
          }],
          ["配件&外设", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return ["键鼠相关", "包袋", "打印机及配件", "配件", "显示器"].includes(p.category) || /配件|外设|鼠标|键盘|键鼠|扩展坞|显示器|ThinkVision|电源|适配器|背包|包|耳机|打印机|支架/i.test(text);
          }],
          ["服务存储", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return p.category === "服务产品" || p.category === "存储" || /存储|Storage|DE\d+|DM\d+|ThinkSystem.*DM|硬盘|SSD|数据恢复|保修|延保|上门|Lenovo Care|Care|服务产品/i.test(text);
          }],
          ["企业服务", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /企业服务|企业IT|部署|运维|对公|专票|账期|企业认证|批量|采购|定制|方案|DaaS|白皮书|服务包|售后保障|上门服务/i.test(text);
          }],
        ];

        async function lxEnsureFloorProducts(site, limit = 96) {
          if (!state.floorProducts || state.floorProductsSite !== site || state.floorProductsLimit !== limit) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 15000);
              const response = await fetch(`/api/products?site=${encodeURIComponent(site)}&limit=${limit}`, { cache: "no-store", signal: controller.signal });
              clearTimeout(timer);
              state.floorProducts = await response.json();
              state.floorProductsSite = site;
              state.floorProductsLimit = limit;
            } catch {
              state.floorProducts = Array.isArray(state.siteProducts) && state.siteProducts.length ? state.siteProducts : (Array.isArray(state.products) ? state.products : []);
              state.floorProductsSite = site;
              state.floorProductsLimit = limit;
            }
          }
          return Array.isArray(state.floorProducts) ? state.floorProducts : [];
        }

        // 按 category 取货并缓存，供个人站 8 品类楼层使用。
        // categories: 去重后并发请求，结果按 category 分桶存入 state.catPool。
        async function lxEnsureCategoryPool(categories, limitPerCat = 40) {
          if (!state.catPool) state.catPool = {};
          const needed = [...new Set(categories)].filter((c) => !state.catPool[c]);
          if (needed.length) {
            const results = await Promise.allSettled(
              needed.map(async (cat) => {
                try {
                  const controller = new AbortController();
                  const timer = setTimeout(() => controller.abort(), 15000);
                  const resp = await fetch(`/api/products?category=${encodeURIComponent(cat)}&limit=${limitPerCat}`, { cache: "no-store", signal: controller.signal });
                  clearTimeout(timer);
                  const data = await resp.json();
                  return { cat, items: Array.isArray(data) ? data : [] };
                } catch {
                  return { cat, items: [] };
                }
              })
            );
            results.forEach((r) => {
              if (r.status === "fulfilled") {
                state.catPool[r.value.cat] = r.value.items;
              }
            });
          }
          // 返回所有请求 category 的商品合集（按传入顺序合并，去重由调用方负责）
          return categories.flatMap((c) => state.catPool[c] || []);
        }

        function lxProductKey(product) {
          return product?.sku || product?.url || product?.name || Math.random().toString(36);
        }

        function lxPickFloorProducts(pool, match, used, count = 8) {
          const picked = [];
          const add = (product, markUsed = true) => {
            if (!product || picked.includes(product)) return;
            picked.push(product);
            if (markUsed) used.add(lxProductKey(product));
          };
          pool.filter((p) => match(p) && !used.has(lxProductKey(p))).forEach((p) => { if (picked.length < count) add(p); });
          // 只展示真正匹配该系列的商品，不再拿别的品类(moto/think/小新…)凑满网格，宁可少几个
          return picked.slice(0, count);
        }

        function lxFloorColumnCount() {
          const width = window.innerWidth || document.documentElement.clientWidth || 0;
          if (width >= 1920) return 6;
          if (width >= 1720) return 5;
          return 4;
        }

        function lxFloorProductCount() {
          return lxFloorColumnCount() * 2;
        }

        function lxUniqProducts(items) {
          const seen = new Set();
          return (items || []).filter((item) => {
            const key = lxProductKey(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }

        function lxFillFloorProducts(items, fallback, count) {
          // 只用本类商品，不拿 fallback 跨品类凑满网格（fallback 入参保留兼容，已不使用）
          return lxUniqProducts(items || []).slice(0, count);
        }

        function lxRetryEmptyRecommendFloors(page, box) {
          if (!box || box.querySelector(".lx-floor-product")) return;
          const key = `${page}:${lxFloorProductCount()}`;
          state._floorRetry = state._floorRetry || {};
          const tried = state._floorRetry[key] || 0;
          if (tried >= 2) return;
          state._floorRetry[key] = tried + 1;
          setTimeout(() => {
            if (state.page === page && (state.activeSiteFloorTab || "推荐") === "推荐") lxRenderSiteFloors();
          }, tried ? 5000 : 1500);
        }

        // 楼层带「查看更多」：前 visibleCount 直出，余下折叠（默认隐藏），点按钮展开
        // 楼层：全部商品渲进一个网格，渲染后由 lxClampFloors 按「实际列数×2」夹成两排、超出折叠。
        // 不在这里按 JS 猜的列数切——分屏/全屏态下 CSS 列数(3)≠JS按窗宽猜的列数(6)，会多出 3-4 排。
        function lxFloorWithMore(label, items, visibleCount, askLabel = label) {
          return `<section class="lx-floor lx-personal-rec-floor" data-floor-cat="${esc(label)}" data-floor-collapsible><div class="lx-floor-head"><h3>${esc(label)}</h3><span>精选 ${items.length} 款</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我推荐${esc(askLabel)}里适合我的产品">问乐享要推荐</button></div><div class="lx-floor-products">${items.map(lxProductMiniCard).join("")}</div></section>`;
        }

        // 按渲染后的真实列数把楼层夹成两排：第 2*cols 个之后的商品隐藏，补「查看更多 N 款」按钮。
        // 列数从 DOM 计算（getComputedStyle 网格列数），与 CSS 真实渲染一致，不依赖 JS 猜窗宽。
        function lxClampFloors(root) {
          const scope = root || document;
          scope.querySelectorAll("[data-floor-collapsible]").forEach((sec) => {
            if (sec.dataset.expanded === "1") return; // 用户已展开的不再夹
            const grid = sec.querySelector(".lx-floor-products");
            if (!grid) return;
            const cards = [...grid.querySelectorAll(".lx-floor-product")];
            if (!cards.length) return;
            // 真实列数：先全显示触发实际布局，按 offsetTop 数第一行卡片个数（基准真值，
            // 不读 getComputedStyle 的 gridTemplateColumns——auto-fill 下它可能滞后/不准）。
            cards.forEach((c) => { c.hidden = false; });
            void grid.offsetWidth; // 强制 reflow
            const firstTop = Math.min(...cards.map((c) => c.offsetTop));
            const cols = Math.max(1, cards.filter((c) => Math.abs(c.offsetTop - firstTop) <= 2).length);
            const keep = cols * 2; // 默认两排
            sec.querySelector("[data-floor-more]")?.remove();
            const hiddenCount = Math.max(0, cards.length - keep);
            cards.forEach((c, i) => { c.hidden = i >= keep; });
            if (hiddenCount > 0) {
              const btn = document.createElement("button");
              btn.className = "lx-floor-more-btn";
              btn.type = "button";
              btn.setAttribute("data-floor-more", "");
              btn.innerHTML = `查看更多 ${hiddenCount} 款<i aria-hidden="true">▾</i>`;
              grid.after(btn);
            }
          });
        }

        // 用 ResizeObserver 盯楼层网格宽度变化（分屏/全屏切换、路由切换、缩放都会改列数）→ 重新夹两排。
        // RAF 一次性夹有时机问题（全屏 class 还没让 grid 重排到真实列数），ResizeObserver 在每次实际重排后都补夹，彻底解决。
        let lxFloorRO = null;
        let lxFloorROTimer = null;
        function lxObserveFloors(box) {
          if (!box) return;
          if (!lxFloorRO) {
            lxFloorRO = new ResizeObserver(() => {
              clearTimeout(lxFloorROTimer);
              lxFloorROTimer = setTimeout(() => {
                const b = document.querySelector("[data-site-floors]");
                if (b) { lxClampFloors(b); lxClampCatFloors(b); }
              }, 60);
            });
          }
          lxFloorRO.disconnect();
          // 观察每个楼层网格本身（其单元格宽度随列数变化）+ box 整体
          lxFloorRO.observe(box);
          box.querySelectorAll(".lx-floor-products").forEach((g) => lxFloorRO.observe(g));
        }

        // 渲染个人站 8 品类楼层（标题 + 换一换 + 8 个商品网格，无「查看更多」）
        function lxRenderCatFloor(floorDef, items) {
          const label = floorDef.label;
          const catKey = floorDef.categories.join(",");
          // 渲染最多 12 个（够 6 列），渲染后 lxClampCatFloors 按真实列数夹成两排（不依赖 JS 猜列数）
          const n = 12;
          const canShuffle = items.length > n;
          const shuffleBtn = `<button class="lx-cat-shuffle-btn" type="button" data-cat-shuffle="${esc(catKey)}" data-floor-label="${esc(label)}" ${canShuffle ? "" : "disabled"} title="换一批商品">换一换</button>`;
          const cards = items.slice(0, n).map(lxProductMiniCard).join("");
          return `<section class="lx-floor lx-personal-rec-floor lx-cat-floor" data-floor-cat="${esc(label)}" data-cat-floor-key="${esc(catKey)}"><div class="lx-floor-head"><h3>${esc(label)}</h3>${shuffleBtn}</div><div class="lx-floor-products" data-cat-floor-grid="${esc(catKey)}">${cards}</div></section>`;
        }

        // 品类楼层：按真实渲染列数夹成两排（第 2*cols 个之后隐藏；不加「查看更多」，纯夹断）
        function lxClampCatFloors(root) {
          (root || document).querySelectorAll(".lx-cat-floor .lx-floor-products").forEach((grid) => {
            const cards = [...grid.querySelectorAll(".lx-floor-product")];
            if (!cards.length) return;
            cards.forEach((c) => { c.hidden = false; });
            void grid.offsetWidth;
            const firstTop = Math.min(...cards.map((c) => c.offsetTop));
            const cols = Math.max(1, cards.filter((c) => Math.abs(c.offsetTop - firstTop) <= 2).length);
            const keep = cols * 2;
            cards.forEach((c, i) => { c.hidden = i >= keep; });
          });
        }

        async function lxRenderPersonalRecommendFloors() {
          // 收集所有楼层需要的 category 去重并发请求
          const allCats = [...new Set(LX_PERSONAL_CATEGORY_FLOORS.flatMap((f) => f.categories))];
          await lxEnsureCategoryPool(allCats, 40);

          // 初始化 offset state
          if (!state.catFloorOffset) state.catFloorOffset = {};

          return LX_PERSONAL_CATEGORY_FLOORS.map((floorDef) => {
            const pool = floorDef.categories.flatMap((c) => state.catPool?.[c] || []);
            // 去重
            const seen = new Set();
            const uniq = pool.filter((p) => {
              const k = lxProductKey(p);
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
            const items = uniq.filter(floorDef.filter);
            if (!items.length) return "";  // 没货不显示空楼层
            return lxRenderCatFloor(floorDef, items);
          }).join("");
        }

        async function lxRenderBusinessRecommendFloors() {
          const site = API_SITE.business || "b";
          const pool = await lxEnsureFloorProducts(site, 120);
          let feedSections = [];
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`/api/site/feed?site=${encodeURIComponent(site)}`, { cache: "no-store", signal: controller.signal });
            clearTimeout(timer);
            const feed = await response.json();
            feedSections = Array.isArray(feed.sections) ? feed.sections : [];
          } catch {}

          const sectionByKey = Object.fromEntries(feedSections.map((section) => [section.key, Array.isArray(section.products) ? section.products : []]));
          const allFeedProducts = feedSections.flatMap((section) => Array.isArray(section.products) ? section.products : []);
          const basePool = [...allFeedProducts, ...pool, ...(Array.isArray(state.siteProducts) ? state.siteProducts : []), ...(Array.isArray(state.products) ? state.products : [])];
          if (!basePool.length) return "";
          const uniq = (items) => {
            const seen = new Set();
            return items.filter((item) => {
              const key = lxProductKey(item);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          };
          const floorCount = lxFloorProductCount();
          const matching = (match, source = basePool) => uniq(source.filter(match)).slice(0, floorCount);
          const serviceProducts = sectionByKey.service || [];
          const desktopProducts = uniq([...(sectionByKey.smb || []), ...(sectionByKey.tianyi || []), ...basePool]).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return p.category === "台式机" || /ThinkCentre|扬天|瑞天|天逸|商用台式|台式机|主机|一体机/i.test(text);
          });
          const accessoryProducts = uniq(basePool).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return ["键鼠相关", "包袋", "打印机及配件", "配件", "显示器"].includes(p.category) || /配件|外设|鼠标|键盘|键鼠|扩展坞|ThinkVision|电源|适配器|背包|包|耳机|打印机|支架|会议屏/i.test(text);
          });
          const serviceStorageProducts = uniq([...serviceProducts, ...basePool]).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return p.category === "服务产品" || p.category === "存储" || /存储|Storage|DE\d+|DM\d+|ThinkSystem.*DM|数据恢复|保修|延保|上门|Lenovo Care|Care|服务产品|云智|流量|部署/i.test(text);
          });
          const floorItems = {
            "ThinkPad": lxFillFloorProducts([...(sectionByKey.thinkpad || []), ...matching((p) => /ThinkPad/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`))], basePool, floorCount),
            "ThinkBook": lxFillFloorProducts([...(sectionByKey.thinkbook || []), ...matching((p) => /ThinkBook/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`))], basePool, floorCount),
            "Thinkplus": lxFillFloorProducts(accessoryProducts, basePool, floorCount),
            "ThinkCentre": lxFillFloorProducts([...matching((p) => /ThinkCentre/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`)), ...desktopProducts], basePool, floorCount),
            "扬天&瑞天": lxFillFloorProducts([...(sectionByKey.tianyi || []), ...desktopProducts], basePool, floorCount),
            "配件&外设": lxFillFloorProducts(accessoryProducts, basePool, floorCount),
            "服务存储": lxFillFloorProducts(serviceStorageProducts, basePool, floorCount),
            "企业服务": lxFillFloorProducts([...serviceProducts, ...serviceStorageProducts], basePool, floorCount),
          };

          return LX_BUSINESS_RECOMMEND_FLOORS.map(([label]) => {
            const items = floorItems[label] || [];
            if (!items.length) return "";  // 该类没货就不显示空楼层，不跨品类凑
            return `<section class="lx-floor lx-business-rec-floor" data-floor-cat="${esc(label)}"><div class="lx-floor-head"><h3>${esc(label)}</h3><span>两排精选 ${items.length} 款</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我推荐${esc(label)}里适合中小企业的产品">问乐享要推荐</button></div><div class="lx-floor-products">${items.map(lxProductMiniCard).join("")}</div></section>`;
          }).join("");
        }

        async function lxRenderEnterpriseRecommendFloors() {
          const site = API_SITE.enterprise || "biz";
          const pool = await lxEnsureFloorProducts(site, 120);
          const source = pool.length ? pool : (Array.isArray(state.siteProducts) && state.siteProducts.length ? state.siteProducts : (Array.isArray(state.products) ? state.products : []));
          if (!source.length) return "";
          const used = new Set();
          const floorCount = lxFloorProductCount();
          return (LX_CATEGORY_MATCHERS.enterprise || []).map(([label, match]) => {
            const items = lxPickFloorProducts(source, match, used, floorCount);
            if (!items.length) return "";  // 该类没货就不显示空楼层
            return `<section class="lx-floor lx-enterprise-rec-floor" data-floor-cat="${esc(label)}"><div class="lx-floor-head"><h3>${esc(label)}</h3><span>两排精选 ${items.length} 款</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我推荐${esc(label)}里适合政教及大企业的产品">问乐享要推荐</button></div><div class="lx-floor-products">${items.map(lxProductMiniCard).join("")}</div></section>`;
          }).join("");
        }

        async function lxRenderCategoryFloors(box, onlyLabel = "") {
          const page = state.page;
          const matchers = LX_CATEGORY_MATCHERS[page];
          if (!matchers) return "";
          const site = API_SITE[page] || "shop";
          if (!state.floorProducts || state.floorProductsSite !== site) {
            try {
              const response = await fetch(`/api/products?site=${encodeURIComponent(site)}&limit=96`, { cache: "no-store" });
              state.floorProducts = await response.json();
              state.floorProductsSite = site;
            } catch { state.floorProducts = []; }
          }
          const pool = Array.isArray(state.floorProducts) ? state.floorProducts : [];
          const used = new Set();
          const floorCount = lxFloorProductCount();
          // 单点品类标签：该品类全量取（多取折叠进「查看更多」）；推荐页平铺时每类限 floorCount
          const perFloorCap = onlyLabel ? floorCount * 6 : floorCount;
          return matchers.filter(([label]) => !onlyLabel || label === onlyLabel).map(([label, match]) => {
            const items = pool.filter((p) => !used.has(p.sku) && match(p)).slice(0, perFloorCap);
            items.forEach((p) => used.add(p.sku));
            if (!items.length) return "";
            return lxFloorWithMore(label, items, floorCount);
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
          if (!["personal", "business", "enterprise"].includes(page)) { grid.hidden = false; box.hidden = true; return; }
          const labels = lxGetSiteTabLabels(page);
          if (!labels.includes(state.activeSiteFloorTab)) state.activeSiteFloorTab = "推荐";
          const activeFloorTab = state.activeSiteFloorTab || "推荐";
          grid.hidden = activeFloorTab !== "推荐";
          if (activeFloorTab === "推荐") {
            if (page === "personal") {
              grid.hidden = true;
              box.hidden = false;
              box.classList.add("lx-personal-rec-floors");
              box.classList.remove("lx-business-rec-floors", "lx-enterprise-rec-floors");
              box.innerHTML = await lxRenderPersonalRecommendFloors();
              lxRetryEmptyRecommendFloors(page, box);
              if (state.page !== page) return;
              lxSyncCategoryTabs();
              requestAnimationFrame(() => { lxClampFloors(box); lxClampCatFloors(box); lxSyncCategoryTabsStuck(); });
              lxObserveFloors(box); // 盯网格宽度变化,分屏/全屏切到3列时自动重夹
              return;
            }
            if (page === "business") {
              grid.hidden = true;
              box.hidden = false;
              box.classList.remove("lx-personal-rec-floors", "lx-enterprise-rec-floors");
              box.classList.add("lx-business-rec-floors");
              box.innerHTML = await lxRenderBusinessRecommendFloors();
              lxRetryEmptyRecommendFloors(page, box);
              if (state.page !== page) return;
              lxSyncCategoryTabs();
              requestAnimationFrame(lxSyncCategoryTabsStuck);
              return;
            }
            if (page === "enterprise") {
              grid.hidden = true;
              box.hidden = false;
              box.classList.remove("lx-personal-rec-floors", "lx-business-rec-floors");
              box.classList.add("lx-enterprise-rec-floors");
              box.innerHTML = await lxRenderEnterpriseRecommendFloors();
              lxRetryEmptyRecommendFloors(page, box);
              if (state.page !== page) return;
              lxSyncCategoryTabs();
              requestAnimationFrame(lxSyncCategoryTabsStuck);
              return;
            }
            box.classList.remove("lx-personal-rec-floors", "lx-business-rec-floors", "lx-enterprise-rec-floors");
            box.hidden = true;
            box.innerHTML = "";
            lxSyncCategoryTabs();
            return;
          }
          box.classList.remove("lx-personal-rec-floors", "lx-business-rec-floors", "lx-enterprise-rec-floors");
          box.hidden = false;
          const categoryFloors = page === "personal" ? "" : await lxRenderCategoryFloors(box, activeFloorTab);
          if (state.page !== page) return;
          const quickCard = (title, desc, ask) => `<div class="lx-floor-card" data-quick-ask="${esc(ask)}"><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`;
          if (categoryFloors) {
            box.innerHTML = categoryFloors;
            lxSyncCategoryTabs();
            requestAnimationFrame(() => lxClampFloors(box));
            lxObserveFloors(box);
            return;
          }
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
              },
              {
                pattern: /拯救者|LEGION|Y9000/i,
                name: "联想拯救者 Y7000P 2024款 16英寸游戏本",
                spec: "英特尔酷睿 i7-13700H / RTX 4060 / 16英寸 165Hz",
                price: "7,999",
                old: "8,999",
                sold: 45
              },
              {
                pattern: /ThinkBook|商务轻薄/i,
                name: "联想 ThinkBook 14+ 2024款 14英寸商务本",
                spec: "第14代酷睿 i5-13500H / Windows 11 / 14 英寸",
                price: "4,799",
                old: "5,499",
                sold: 63
              },
              {
                pattern: /Tab|平板|P12|小新Pad/i,
                name: "联想小新Pad Pro 12.7英寸平板电脑",
                spec: "天玑9000+ / 144Hz 2K屏 / 12GB+256GB",
                price: "2,199",
                old: "2,699",
                sold: 81
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
            const storeCityBar = `<div class="lx-store-city-bar"><span class="lx-gb-city-label">当前位置：</span><span class="lx-store-city-name" data-store-city>正在定位…</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我切换查询城市">切换城市</button></div>`;
            const storeMapEl = `<div class="lx-store-map" data-store-map><img src="/api/stores/staticmap?lng=116.4074&lat=39.9042" alt="门店地图" loading="lazy" onerror="this.closest('.lx-store-map').classList.add('lx-store-map--empty')" /><span class="lx-store-map-tip" data-store-map-tip>北京（默认）· 定位后显示离你最近的门店</span></div>`;
            const storeListEl = `<div class="lx-store-list" data-store-list><div class="lx-store-skeleton"><div class="lx-store-sk-card"></div><div class="lx-store-sk-card"></div><div class="lx-store-sk-card"></div></div></div>`;
            const storeHint = `<p class="lx-gb-sub-title" style="margin-top:12px">附近联想授权门店</p>`;
            const storeCards = storeCityBar + storeMapEl + storeHint + storeListEl + quickCard("门店服务权益", "到店享专属权益：优先服务、现场演示、贴膜安装", "到联想门店购机有哪些专属到店权益？") + quickCard("到店预约", "预约上门或到店服务节省等待", "如何预约联想门店到店服务？");
            const serviceGrid = [
              ["上门安装", "新机开箱安装调试，上门到家", "我想预约联想上门安装服务"],
              ["寄修服务", "寄回维修，7个工作日内完成", "联想寄修流程是什么，怎么预约？"],
              ["延保服务", "最长延保至5年，全国联保", "联想延保服务有哪些套餐？"],
              ["清灰除尘", "专业清灰，恢复散热性能", "联想清灰服务多少钱，怎么预约？"],
              ["换电池", "官方原厂电池，安全可靠", "联想换电池多少钱，哪里可以换？"],
              ["数据迁移", "旧机数据安全迁移到新机", "联想数据迁移服务怎么预约？"],
              ["系统重装", "官方授权工程师上门重装", "联想系统重装服务价格和流程？"],
              ["保修查询", "输入SN查询保修状态", "帮我查询联想设备的保修期限"],
              ["官方配件", "原厂电源、内存、键盘等配件", "联想官方配件在哪里购买？"]
            ].map(([t, d, a]) => quickCard(t, d, a)).join("");

            const serviceSteps = [
              ["01", "在线报修", "选择服务类型，填写故障描述", "预约", "我要在线预约联想售后服务"],
              ["02", "上门/寄修", "工程师上门或邮寄到服务中心", "跟进", "联想上门服务通常多久能到？"],
              ["03", "完成交付", "修复后验收，享全国联保", "查进度", "我的维修单现在在哪个阶段？"]
            ].map(([num, title, desc, action, ask]) => `<article class="lx-benefit-card" data-quick-ask="${esc(ask)}" tabindex="0"><span class="lx-step-watermark">${num}</span><i class="lx-benefit-icon" aria-hidden="true">${num}</i><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><b>${esc(action)}</b></div></article>`).join("");

            const serviceSnRow = `<div class="lx-tradein-sn-row"><input class="lx-p0-field lx-tradein-sn-input" placeholder="输入设备 SN 序列号查询保修（演示，不提交）" readonly><button class="lx-p0-btn primary" type="button" data-quick-ask="帮我查询设备保修状态，需要提供哪些信息">查保修</button></div>`;

            const servicePromise = `<div class="lx-service-promise-row">${[
              ["原厂配件", "所有维修使用官方原厂零部件"],
              ["全国联保", "3000+ 授权服务中心覆盖全国"],
              ["质保承诺", "维修后同故障90天内免费返修"]
            ].map(([t, d]) => `<div class="lx-floor-card" style="flex:1;min-width:0"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join("")}</div>`;

            const serviceCards = `<h4 class="lx-gb-sub-title">服务项目</h4><div class="lx-mhc-rights-grid">${serviceGrid}</div><h4 class="lx-gb-sub-title">服务流程</h4><div class="lx-ia-cards-row">${serviceSteps}</div><h4 class="lx-gb-sub-title">保修查询</h4>${serviceSnRow}<h4 class="lx-gb-sub-title">服务承诺</h4>${servicePromise}`;
            const memberCards = [
              ["1000", "≈ ¥10", "乐豆抵现", "1000 乐豆抵 ¥10，购物即赚", "我的乐豆余额和会员权益有哪些？"],
              ["button", "一键领取", "领券中心", "新人券、品类券一键领取", "现在有哪些优惠券可以领？"]
            ].map(([num, unit, title, desc, ask]) => `<article class="lx-member-card" data-quick-ask="${esc(ask)}" tabindex="0"><div><h4>${esc(title)}</h4><p>${esc(desc)}</p></div><strong>${esc(num)}<small>${esc(unit)}</small></strong></article>`).join("");
            const seckillEnd = lxSeckillCountdown();
            // 国补楼层：LBS 定位 + 步骤卡 + 叠加入口 + 商品
            const gbCityBar = `<div class="lx-gb-city-bar"><span class="lx-gb-city-label">当前城市：</span><span class="lx-gb-city-name" data-gb-city>正在定位你所在城市…</span><button class="lx-p0-btn" type="button" data-quick-ask="帮我切换国补城市">切换城市</button></div>`;
            const gbSteps = [
              ["01", "确认资格", "北京/上海等参与城市用户，需有有效身份证", "查资格", "我怎么确认是否有国补购机资格？"],
              ["02", "平台领券", "登录联想商城，在国补专区领取补贴券", "去领券", "怎么在联想商城领取国补券？"],
              ["03", "下单核销", "选购参与国补商品，结算时自动核销补贴", "去购买", "国补下单核销的完整流程是什么？"]
            ].map(([num, title, desc, action, ask]) => `<article class="lx-benefit-card" data-quick-ask="${esc(ask)}" tabindex="0"><span class="lx-step-watermark">${num}</span><i class="lx-benefit-icon" aria-hidden="true">${num}</i><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><b>${esc(action)}</b></div></article>`).join("");
            const gbStacking = `<div class="lx-gb-stack-row">${[
              ["教育特惠叠加", "学生/教师可叠加教育价", "国补和教育特惠能叠加吗？"],
              ["以旧换新叠加", "旧机折价抵扣再叠国补", "国补和以旧换新怎么叠加？"],
              ["私人定制叠加", "定制机型参与国补", "定制机可以享受国补吗？"],
              ["保值焕新叠加", "保值焕新入门门槛更低", "保值焕新和国补可以同时享受吗？"]
            ].map(([t, d, a]) => `<div class="lx-floor-card" data-quick-ask="${esc(a)}"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join("")}</div>`;
            const gbProductPool = (state.products || []).filter((p) => /小新|YOGA|ThinkPad|ThinkBook|拯救者|LEGION|GeekPro|轻薄|昭阳|台式|天逸|扬天|开天|启天|平板|Tab|moto|ThinkVision|显示器/.test(p.name || ""));
            const gbProductGrid = `<div class="lx-floor-products">${gbProductPool.slice(0, 6).map(lxProductMiniCard).join("") || `<div class="lx-p0-disclaimer" style="grid-column:1/-1;padding:16px 0;text-align:center">货盘加载中（POC 演示）</div>`}</div>`;
            const guobuSection = lxFloorSection("国补",
              "国家以旧换新 · 最高补贴 20%",
              gbCityBar + `<div class="lx-ia-cards-row">${gbSteps}</div>` + `<h4 class="lx-gb-sub-title">叠加优惠入口</h4>` + gbStacking + `<h4 class="lx-gb-sub-title">参与国补商品</h4>` + gbProductGrid,
              `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我找参与国补的联想笔记本">找国补商品</button>`
            );

            // 教育特惠楼层：读学生认证态
            const stuState = lxStuState();
            const isEduVerified = stuState.status === "verified";
            const eduVerifiedDate = isEduVerified && stuState.submittedAt
              ? new Date(stuState.submittedAt + 365 * 86400000).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
              : "2027年6月21日";
            const eduAuthBanner = isEduVerified
              ? `<div class="lx-edu-verified-banner"><span class="lx-edu-badge ok">已认证</span><span>认证有效期至 ${esc(eduVerifiedDate)}，教育专享价已生效</span></div>`
              : (stuState.status === "pending"
                ? `<div class="lx-edu-verified-banner pending"><span class="lx-edu-badge pending">审核中</span><span>认证资料已提交，审核通过后自动解锁教育专享价（演示约 12 秒）</span><button class="lx-p0-btn" type="button" data-stu-auth>查看进度</button></div>`
                : `<div class="lx-edu-verified-banner unverified"><span class="lx-edu-badge">未认证</span><span>学生/教师认证后享教育专享价，可与国补叠加</span><button class="lx-p0-btn primary" type="button" data-stu-auth>立即认证</button></div>`);
            const eduRightsCards = isEduVerified
              ? [
                  ["可领权益", "当月教育专属券未领取", "帮我领取教育专属优惠券"],
                  ["国补叠加", "认证后可与国补同时享用", "教育价和国补怎么叠加计算？"],
                  ["12期免息", "部分机型支持12期免息", "哪些机型支持教育+12期免息？"]
                ].map(([t, d, a]) => quickCard(t, d, a)).join("")
              : [
                  ["教育专享价", "小新/YOGA/平板均有教育专区", "教育专享价比普通价优惠多少？"],
                  ["国补叠加", "认证后教育价可叠加国家补贴", "国补和教育特惠能叠加吗？"],
                  ["12期免息", "学生用户专属分期政策", "教育用户如何申请12期免息？"]
                ].map(([t, d, a]) => quickCard(t, d, a)).join("");
            const eduProductGrid = `<div class="lx-floor-products">${(state.products || []).filter((p) => /小新|YOGA|平板|轻薄/.test(p.name || "")).slice(0, 4).map(lxProductMiniCard).join("") || `<div class="lx-p0-disclaimer" style="padding:16px 0">货盘加载中（POC 演示）</div>`}</div>`;
            const eduSection = lxFloorSection("教育特惠",
              isEduVerified ? "教育专享价已生效 · 国补可叠加" : "学生教师专属价 · 认证即享",
              eduAuthBanner + `<div class="lx-ia-cards-row">${eduRightsCards}</div>` + `<h4 class="lx-gb-sub-title">教育友好商品</h4>` + eduProductGrid,
              `<button class="lx-p0-btn" type="button" data-edu-zone>进入教育专区</button>`
            );

            // 会员楼层（精简版，会员中心主入口在 openMemberCenter）
            const mbr = window.__lxMember;
            const mbrLogged = mbr && mbr.guest === false;
            const mbrName = mbrLogged ? (mbr.loginName ? String(mbr.loginName).replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "会员") : "游客";
            const mbrLevelName = mbrLogged ? (mbr.memberLevel || "金钻会员") : "游客";
            const mbrHeroCard = `<div class="lx-member-hero-card">${mbrLogged
              ? `<div class="lx-mhc-left"><div class="lx-mhc-name">${esc(mbrName)}</div><div class="lx-mhc-level">${esc(mbrLevelName)}</div><div class="lx-mhc-bar"><i style="width:100%"></i></div><div class="lx-mhc-tip">顶级权益已全部解锁</div></div>`
              : `<div class="lx-mhc-left"><div class="lx-mhc-name">登录享会员价</div><div class="lx-mhc-tip">V1 起步，11 项专属权益</div></div>`
            }<div class="lx-mhc-right"><button class="lx-p0-btn" type="button" data-floor-action="member">会员中心</button></div></div>`;
            const mbrLedou = `<div class="lx-floor-card lx-mhc-bean-card" data-quick-ask="我的乐豆余额和兑换规则"><strong>乐豆余额</strong><span>${mbrLogged ? "— (对话查询)" : "1,000 豆 ≈ ¥10"}</span><div class="lx-mhc-bean-acts"><button class="lx-p0-btn" type="button" data-quick-ask="乐豆商城能兑换什么">去兑换</button><button class="lx-p0-btn" type="button" data-quick-ask="乐豆使用规则">规则</button></div></div>`;
            const mbrRights = [
              ["会员价", "全场专享折扣", "会员专享价怎么用？"],
              ["乐豆抵现", "1000豆抵¥10", "乐豆怎么抵扣现金？"],
              ["月度券包", "每月4张专属券", "会员月度券包包含什么？"],
              ["0元试用", "新品先体验", "0元试用怎么参与？"],
              ["会员日", "每月18日双倍豆", "会员日有什么活动？"],
              ["专属客服", "VIP通道", "会员专属客服怎么联系？"]
            ].map(([t, d, a]) => quickCard(t, d, a)).join("");
            const mbrTasks = `<div class="lx-floor-card" data-quick-ask="我的任务中心有哪些可以完成的任务"><strong>今日任务</strong><span>签到 +10豆 · 浏览商品 +5豆 · 分享 +20豆</span></div>`;
            const memberFloorSection = lxFloorSection("会员",
              "等级成长 · 乐豆 · 权益 · 任务",
              mbrHeroCard + mbrLedou + `<h4 class="lx-gb-sub-title">核心权益</h4><div class="lx-mhc-rights-grid">${mbrRights}</div>` + `<h4 class="lx-gb-sub-title">任务与活动</h4>` + mbrTasks + quickCard("会员测评", "看看适合冲哪个等级", "帮我做会员测评，看看我适合冲哪个等级") + `<p class="lx-p0-disclaimer" style="margin-top:12px">会员数据为演示口径，正式上线对接联想会员系统。</p>`,
              `<button class="lx-p0-btn primary" type="button" data-floor-action="member">会员中心</button><button class="lx-p0-btn" type="button" data-floor-action="coupon">领券中心</button>`
            );

            // 私人定制楼层
            const customTypes = [
              ["外观喷绘", "个性图案/品牌logo/艺术设计，定制机身", "我想做联想笔记本外观喷绘，能定制什么样的图案？"],
              ["激光刻字", "机身背面刻字，永久留存纪念", "联想激光刻字定制怎么做，价格多少？"],
              ["配色定制", "机身颜色自选，专属配色方案", "联想笔记本配色定制有哪些颜色可以选？"],
              ["CTO高配", "升级CPU/内存/存储，真正的高配机", "帮我做CTO高配定制，能升级哪些配置？"],
              ["键盘定制", "按键布局、背光颜色、键帽自定义", "联想键盘定制有哪些选项？"],
              ["限定联名", "与艺术家/品牌联名限定款", "联想现在有哪些限定联名款可以购买？"]
            ].map(([t, d, a]) => quickCard(t, d, a)).join("");

            const customSteps = [
              ["01", "选机型", "从全系机型中选定基础款", "发起定制", "帮我挑一款适合做定制的联想机型"],
              ["02", "选定制项", "外观/硬件/软件按需勾选", "开始配置", "私人定制具体有哪些定制项目？"],
              ["03", "确认预览", "3D预览效果图，满意再下单", "看效果", "定制机下单前能预览效果图吗？"],
              ["04", "下单交付", "专属生产，15个工作日内交付", "查进度", "私人定制从下单到收货要多久？"]
            ].map(([num, title, desc, action, ask]) => `<article class="lx-benefit-card" data-quick-ask="${esc(ask)}" tabindex="0"><span class="lx-step-watermark">${num}</span><i class="lx-benefit-icon" aria-hidden="true">${num}</i><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><b>${esc(action)}</b></div></article>`).join("");

            const customCases = [
              ["毕业纪念款", "刻上母校名称+毕业年份，送给自己的礼物", "我想做毕业纪念款定制，有什么推荐方案？"],
              ["企业Logo定制", "公司logo喷绘，商务礼品首选", "企业批量定制喷绘Logo怎么操作？"],
              ["游戏联名款", "拯救者x热门IP联名，限量发售", "拯救者联名款现在有哪些，怎么购买？"]
            ].map(([t, d, a]) => quickCard(t, d, a)).join("");

            const customSection = lxFloorSection("私人定制",
              "外观喷绘 · 刻字 · 配色 · 高配升级",
              `<h4 class="lx-gb-sub-title">定制类型</h4><div class="lx-mhc-rights-grid">${customTypes}</div><h4 class="lx-gb-sub-title">定制流程</h4><div class="lx-ia-cards-row lx-custom-steps">${customSteps}</div><h4 class="lx-gb-sub-title">热门案例</h4><div class="lx-ia-cards-row">${customCases}</div>`,
              `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我设计一个私人定制方案">发起定制方案</button><button class="lx-p0-btn" type="button" data-quick-ask="私人定制的价格和时间是多少">了解定制价格</button>`
            );

            // 以旧换新楼层
            const tradeInCats = ["笔记本", "台式机", "平板", "手机", "显示器"];
            const tradeInChips = `<div class="lx-tradein-chips">${tradeInCats.map((c) => `<button class="lx-tradein-chip" type="button" data-quick-ask="我想回收${esc(c)}，帮我估个价">${esc(c)}</button>`).join("")}</div>`;
            const tradeInSn = `<div class="lx-tradein-sn-row"><input class="lx-p0-field lx-tradein-sn-input" id="lxTradeInSn" placeholder="输入旧机 SN 序列号（演示，不提交）" readonly><button class="lx-p0-btn primary" type="button" data-quick-ask="我有旧机想以旧换新，怎么估值并叠加补贴">估价</button></div><div class="lx-tradein-sn-hint">如何查 SN：<button class="lx-p0-btn" type="button" style="padding:0 8px;min-height:24px;font-size:12px" data-quick-ask="怎么查联想电脑的SN序列号">问乐享</button></div>`;
            const tradeInSection = lxFloorSection("以旧换新",
              "旧机抵扣 · 叠加国补 · 保值焕新",
              quickCard("活动规则", "以旧换新活动规则与常见问题", "以旧换新的活动规则和常见问题") +
              `<h4 class="lx-gb-sub-title">旧机估价（SN 序列号）</h4>` + tradeInSn +
              `<h4 class="lx-gb-sub-title">选择回收品类</h4>` + tradeInChips +
              `<div class="lx-ia-cards-row">${
              quickCard("国补叠加", "以旧换新可叠加国家补贴", "以旧换新怎么叠加国补？") +
              quickCard("保值焕新", "提前锁定未来回收价", "保值焕新计划是什么，怎么参与？")
              }</div>`,
              `<button class="lx-p0-btn primary" type="button" data-quick-ask="我想以旧换新，帮我评估旧机价值和叠加方案">以旧换新估价</button>`
            );

            // 今日秒杀楼层（保留现有内容，新增场次 chip）
            const nowHour = new Date().getHours();
            const seckillScenes = [
              { label: "10点场", hour: 10, endHour: 14, ask: "帮我看看10点秒杀场有什么商品" },
              { label: "14点场", hour: 14, endHour: 20, ask: "帮我看看14点秒杀场有什么商品" },
              { label: "20点场", hour: 20, endHour: 24, ask: "帮我看看20点秒杀场有什么商品" }
            ];
            const seckillSceneChips = `<div class="lx-seckill-scenes">${seckillScenes.map(({ label, hour, endHour, ask }) => {
              const status = nowHour >= endHour ? "已结束" : (nowHour >= hour ? "抢购中" : "即将开始");
              const statusClass = nowHour >= endHour ? "lx-scene-ended" : (nowHour >= hour ? "lx-scene-active" : "lx-scene-upcoming");
              return `<button class="lx-seckill-scene-chip ${statusClass}" type="button" data-quick-ask="${esc(ask)}">${esc(label)} <span class="lx-scene-status">${esc(status)}</span></button>`;
            }).join("")}</div>`;
            const seckillSection = lxFloorSection("今日秒杀",
              "限时优惠，先到先得",
              seckillSceneChips + `<div class="lx-floor-seckill">${seckill}</div>` + `<div class="lx-floor-card" data-quick-ask="如何设置秒杀到点提醒？" style="margin-top:8px"><strong>秒杀到点提醒</strong><span>开抢前15分钟自动提醒，不错过限量秒杀</span></div>`,
              `<span class="lx-floor-countdown">距本场结束 <b data-lx-countdown="${seckillEnd}">${lxFormatCountdown(seckillEnd)}</b></span><button class="lx-p0-btn primary" type="button" data-quick-ask="今天有哪些秒杀和限时优惠活动？">更多秒杀</button>`
            );

            // 种草楼层
            const discoverReviews = [
              ["小新Pro16 2024 深度评测", "一块2.5K 120Hz屏配AMD 7745HX，生产力利器", "给我看看小新Pro16 2024款的详细评测"],
              ["拯救者Y9000P实战测试", "RTX 4080游戏性能全解析，散热表现如何", "拯救者Y9000P游戏性能实测怎么样？"],
              ["YOGA Air14s对比ThinkBook", "同价位商务轻薄本哪个更值得买", "YOGA Air14s和ThinkBook 14+哪个更值"],
              ["联想最值笔记本TOP5推荐", "2024年各价位最值得购买的联想笔记本", "2024年各价位最推荐的联想笔记本有哪些？"]
            ].map(([t, d, a]) => `<div class="lx-discover-review-item" data-quick-ask="${esc(a)}" tabindex="0"><div class="lx-drv-badge">评测</div><div class="lx-drv-content"><h4>${esc(t)}</h4><p>${esc(d)}</p></div><span class="lx-drv-arrow">→</span></div>`).join("");

            const discoverTopics = [
              ["小新Pro16用久了会变卡吗", "热", "小新Pro16用了一年后性能有没有衰减？"],
              ["拯救者散热贴吧大神经验帖", "热", "拯救者散热优化有什么好的方法？"],
              ["YOGA Air购机后必做的设置", "新", "买了YOGA Air新机后应该做哪些设置？"],
              ["ThinkPad T系列值得买吗2024", "热", "2024年ThinkPad T系列商务本值得入手吗？"]
            ].map(([title, tag, ask]) => `<div class="lx-discover-topic" data-quick-ask="${esc(ask)}" tabindex="0"><span class="lx-topic-tag ${tag === '热' ? 'hot' : 'new'}">${esc(tag)}</span><span>${esc(title)}</span></div>`).join("");

            const discoverActivities = [
              ["晒单有礼", "进行中", "晒出新机获奖励，每月100名", "参加晒单活动有什么要求？"],
              ["积分换好礼", "进行中", "用乐豆兑换品牌周边和优惠券", "积分换好礼怎么参与，能换什么？"],
              ["0元试用", "报名中", "申请试用新品7天，真实体验", "0元试用活动如何申请，要满足什么条件？"]
            ].map(([t, status, d, a]) => `<div class="lx-floor-card" data-quick-ask="${esc(a)}"><strong>${esc(t)}<span class="lx-activity-status">${esc(status)}</span></strong><span>${esc(d)}</span></div>`).join("");

            const discoverTasks = `<div class="lx-floor-card" data-quick-ask="积分任务中心有哪些可以完成的任务"><strong>积分任务</strong><span>每日签到 +10豆 · 浏览商品 +5豆 · 分享评测 +20豆 · 写评价 +50豆</span></div>`;

            const discoverSection = lxFloorSection("种草",
              "评测 · 社区热帖 · 用户活动 · 积分任务",
              `<h4 class="lx-gb-sub-title">新机评测</h4><div class="lx-discover-reviews">${discoverReviews}</div><h4 class="lx-gb-sub-title">社区热话题</h4><div class="lx-discover-topics">${discoverTopics}</div><h4 class="lx-gb-sub-title">用户活动</h4><div class="lx-ia-cards-row">${discoverActivities}</div><h4 class="lx-gb-sub-title">积分任务</h4>${discoverTasks}`,
              `<button class="lx-p0-btn" type="button" data-quick-ask="给我推荐几篇最近热门的联想机型评测">看热门评测</button><button class="lx-p0-btn" type="button" data-quick-ask="现在有哪些用户活动可以参加？">查看活动</button>`
            );

            const activitySections = {
              "国补": guobuSection,
              "教育特惠": eduSection,
              "会员": memberFloorSection,
              "私人定制": customSection,
              "以旧换新": tradeInSection,
              "今日秒杀": seckillSection,
              "种草": discoverSection,
              "服务": lxFloorSection("服务", "官方售后 · 原厂配件 · 全国联保", serviceCards, `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我预约联想售后服务">预约服务</button><button class="lx-p0-btn" type="button" data-floor-action="service">服务中心</button>`),
              "门店": lxFloorSection("门店", "附近门店 · 到店体验 · 专属权益", storeCards, `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我查询并推荐最近的联想门店">找附近门店</button>`),
            };
            box.innerHTML = activitySections[activeFloorTab] || "";
            // 国补城市异步填充（进 tab 后 geo 定位，回填城市名）
            if (activeFloorTab === "国补") {
              lxRequestGeo().then((coord) => {
                if (state.page !== "personal" || state.activeSiteFloorTab !== "国补") return;
                const cityEl = box.querySelector("[data-gb-city]");
                if (!cityEl) return;
                if (!coord) { cityEl.textContent = "北京"; return; }
                fetch(`/api/stores/nearby?lat=${coord.lat}&lng=${coord.lng}&limit=1`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "国补") return;
                    const el = box.querySelector("[data-gb-city]");
                    if (!el) return;
                    const addr = (data.stores?.[0] || data[0])?.address || "";
                    const city = addr.match(/^(.{2,4}[市省区])/)?.[1] || "北京";
                    el.textContent = city;
                  })
                  .catch(() => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "国补") return;
                    const el = box.querySelector("[data-gb-city]");
                    if (el) el.textContent = "北京";
                  });
              }).catch(() => {});
            }
            if (activeFloorTab === "门店") {
              lxRequestGeo().then((coord) => {
                if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                const cityEl = box.querySelector("[data-store-city]");
                const listEl = box.querySelector("[data-store-list]");
                const lat = coord?.lat ?? 39.9042;
                const lng = coord?.lng ?? 116.4074;
                if (cityEl) cityEl.textContent = coord ? "定位成功" : "北京（默认）";
                fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&limit=5`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                    const el = box.querySelector("[data-store-list]");
                    if (!el) return;
                    const stores = data.stores || data || [];
                    if (cityEl) {
                      const addr = stores[0]?.address || "";
                      const city = addr.match(/^(.{2,4}[市省区])/)?.[1] || (coord ? "定位成功" : "北京");
                      cityEl.textContent = city;
                    }
                    if (!stores.length) {
                      el.innerHTML = `<div class="lx-p0-disclaimer" style="padding:16px 0">未找到附近门店，可向乐享询问</div>`;
                      return;
                    }
                    // 用最近门店坐标刷新地图标点
                    const top = stores[0];
                    const mLng = top.lng ?? top.longitude ?? lng, mLat = top.lat ?? top.latitude ?? lat;
                    const mapImg = box.querySelector("[data-store-map] img");
                    if (mapImg && mLng && mLat) mapImg.src = `/api/stores/staticmap?lng=${encodeURIComponent(mLng)}&lat=${encodeURIComponent(mLat)}`;
                    const mapTip = box.querySelector("[data-store-map-tip]");
                    if (mapTip) mapTip.textContent = `${esc(top.name || "最近门店")} · 点击门店卡「导航」开地图`;
                    el.innerHTML = stores.map((s) => {
                      const name = esc(s.name || "联想授权门店");
                      const addr = esc(s.address || "");
                      const dm = s.distance ?? s.dist;
                      const dist = dm ? `<span class="lx-store-dist">${dm < 1000 ? Math.round(dm) + "m" : (dm / 1000).toFixed(1) + "km"}</span>` : "";
                      const hours = esc(s.hours || s.business_hours || "10:00–20:00");
                      const tel = s.tel || s.phone || "";
                      const telHtml = tel ? `<a class="lx-store-tel" href="tel:${esc(tel)}">${esc(tel)}</a>` : "";
                      const rights = ["优先体验", "贴膜安装", "以旧换新"].map((r) => `<span>${esc(r)}</span>`).join("");
                      const navBtn = `<button class="lx-p0-btn" type="button" data-store-nav="${esc(String(s.lng||lng))},${esc(String(s.lat||lat))}" data-store-name="${name}" data-store-addr="${addr}" data-store-tel="${esc(tel)}">导航</button>`;
                      const stockBtn = `<button class="lx-p0-btn" type="button" data-quick-ask="查询${esc(s.name||'该门店')}的库存情况">查库存</button>`;
                      const apptBtn = `<button class="lx-p0-btn primary" type="button" data-quick-ask="我要预约到${esc(s.name||'门店')}的到店服务">约到店</button>`;
                      return `<article class="lx-store-card" tabindex="0"><div class="lx-store-card-head"><h4>${name}${dist}</h4><div class="lx-store-rights-chips">${rights}</div></div><p class="lx-store-addr">${addr}</p><div class="lx-store-meta"><span class="lx-store-hours">${hours}</span>${telHtml}</div><div class="lx-store-btns">${navBtn}${stockBtn}${apptBtn}</div></article>`;
                    }).join("");
                  })
                  .catch(() => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                    const el = box.querySelector("[data-store-list]");
                    if (el) el.innerHTML = `<article class="lx-store-card" tabindex="0"><div class="lx-store-card-head"><h4>联想北京中关村旗舰店<span class="lx-store-dist">示例</span></h4><div class="lx-store-rights-chips"><span>优先体验</span><span>贴膜安装</span><span>以旧换新</span></div></div><p class="lx-store-addr">北京市海淀区中关村大街1号</p><div class="lx-store-meta"><span class="lx-store-hours">10:00–20:00</span></div><div class="lx-store-btns"><button class="lx-p0-btn primary" type="button" data-quick-ask="我要预约到联想中关村旗舰店的到店服务">约到店</button></div></article>`;
                    if (cityEl) cityEl.textContent = "北京（示例）";
                  });
              }).catch(() => {});
            }
          } else if (page === "business") {
            const ent = lxEntState();
            const entCta = ent.status === "verified" ? `<button class="lx-p0-btn" type="button" data-open-ent>已认证 · 查看权益</button>` : `<button class="lx-p0-btn primary" type="button" data-open-ent>立即认证</button>`;
            const activitySections = {
              "企业专享权益": lxFloorSection("企业专享权益", "认证即享，价格优于个人渠道", quickCard("企业专享价", "认证后全场企业价", "企业专享价怎么享受？") + quickCard("采购补贴", "定制采购最高 25% 补贴", "企业采购补贴政策是什么？") + quickCard("会员 8 折", "企业会员专属折扣", "企业会员折扣怎么用？") + quickCard("新客礼券", "首购礼券一键领取", "企业新客有什么礼券？"), entCta),
              "对公与售后保障": lxFloorSection("对公与售后保障", "财务合规，售后省心", quickCard("增值税专票", "下单开专票，资料线上提交", "企业购买怎么开增值税专票？") + quickCard("企业账期", "30/60/90 天账期可申请", "企业账期怎么申请？") + quickCard("3 年保修", "整机 3 年含上门维修", "商用机型的保修政策是什么？") + quickCard("远程支持", "工程师远程 + 上门一体化", "企业售后服务都包含什么？")),
              "轻量定制方案": lxFloorSection("轻量定制方案", "一句话提需求，专业人员搭配", quickCard("一键提交需求", "用途/台量/预算，30 分钟内响应", "帮我配一套办公采购方案"), `<button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交采购需求</button>`),
              "门店": lxFloorSection("门店", "企业客户同享到店服务", quickCard("附近门店", "到店看样机、谈批量采购", "帮我查附近的联想门店"), `<button class="lx-p0-btn" type="button" data-floor-action="stores">查附近门店</button>`),
              "服务": lxFloorSection("服务", "企业售后与工程师支持", quickCard("企业售后", "远程支持、上门维修与批量设备保障", "企业售后服务都包含什么？") + quickCard("上门服务", "安装部署、巡检清洁、数据迁移", "企业上门服务怎么预约？"), `<button class="lx-p0-btn" type="button" data-floor-action="service">查看服务</button>`),
            };
            box.innerHTML = activitySections[activeFloorTab] || "";
          } else {
            const activitySections = {
              "行业解决方案": lxFloorSection("行业解决方案", "六大行业整体方案与同行案例", Object.keys(LX_SOLUTIONS).map((industry) => `<div class="lx-floor-card" data-solution="${esc(industry)}"><strong>${esc(industry)}</strong><span>概述 · 功能 · 优势 · 收益 · 案例</span></div>`).join(""), `<button class="lx-p0-btn primary" type="button" data-solution-center>进入方案中心</button>`),
              "信创合规": lxFloorSection("信创合规", "国产化适配 · 等保国密 · 政采资质", `<div class="lx-floor-card" data-xinchuang><strong>信创合规专区</strong><span>合规货盘 · 资质背书 · 选型指南</span></div>` + quickCard("等保与国密", "等保 2.0 三级、国密 TCM 机型", "满足等保和国密要求的机型有哪些？") + quickCard("招投标支持", "政采入围资质、投标资料", "参与政采招投标需要什么资质支持？"), `<button class="lx-p0-btn primary" type="button" data-xinchuang>进入信创专区</button>`),
              "大客户专属服务": lxFloorSection("大客户专属服务", "专属客户经理 · 全生命周期", quickCard("项目意向单", "提交项目信息，专家一对一", "我有采购项目，想对接专属顾问") + quickCard("DaaS 服务", "设备即服务，运维资产全托管", "DaaS 全生命周期服务包含什么？") + `<div class="lx-floor-card" data-whitepaper><strong>白皮书资料库</strong><span>选型指南 · 行业方案 · 实施手册</span></div>`, `<button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交项目意向</button>`),
            };
            box.innerHTML = activitySections[activeFloorTab] || "";
          }
          lxSyncCategoryTabs();
          requestAnimationFrame(lxSyncCategoryTabsStuck);
        }

        function lxSyncCategoryTabsStuck() {
          const tabsBox = document.querySelector(".category-tabs");
          const content = document.querySelector(".content");
          if (!tabsBox || !content || !["personal", "business", "enterprise"].includes(state.page)) return;
          const hero = document.querySelector(".hero");
          const threshold = Math.max(0, (hero?.offsetHeight || 0) - 2);
          tabsBox.classList.toggle("is-stuck", content.scrollTop >= threshold);
        }

        document.querySelector(".content")?.addEventListener("scroll", lxSyncCategoryTabsStuck, { passive: true });
        window.addEventListener("resize", lxSyncCategoryTabsStuck);
        let lxLastFloorProductCount = lxFloorProductCount();
        let lxFloorResizeTimer = null;
        window.addEventListener("resize", () => {
          clearTimeout(lxFloorResizeTimer);
          // 列数变了就重新夹（夹断按真实列数，分屏/全屏切换也覆盖；不依赖 JS 猜的 lxFloorProductCount）
          lxFloorResizeTimer = setTimeout(() => {
            const box = document.querySelector("[data-site-floors]");
            if (box) lxClampFloors(box);
          }, 120);
        });

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

        function openStudentAuth(kind) {
          if (!kind) kind = 'college';
          const stu = lxStuState();
          if (stu.status === "verified") {
            openModal("学生认证已通过", `<div class="lx-ent-status ok"><strong>${esc(stu.name || "同学")}</strong> 已通过学生身份认证</div><ul class="lx-md-list"><li>教育专享价已生效，可与国家补贴叠加</li><li>部分机型支持 12 期免息与赠原装配件</li></ul><div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-edu-zone>逛教育特惠专区</button></div><p class="lx-p0-disclaimer">POC 演示环境：认证为模拟流程，正式上线对接学信网核验。</p>`);
            return;
          }
          if (stu.status === "pending") {
            openModal("学生认证审核中", `<div class="lx-ent-status pending">「${esc(stu.name || "")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境约 12 秒自动通过；正式环境 1-5 天，结果在教育专区与本弹窗回显。</p>`);
            return;
          }

          // ── 多 tab 向导 ───────────────────────────────────────────────
          let stuTab = kind === 'gaokao' ? 'real' : 'email'; // gaokao: real/skip; college: email/card/wechat
          const stuData = { name: '', idcard: '', phone: '18910864473', email: '', school: '', gradYear: '', degree: '', cardNo: '', stage: '', examNo: '', agree: false };

          function stuTabsHtml() {
            if (kind === 'college') {
              const tabs = [
                { id: 'email', label: 'edu邮箱认证' },
                { id: 'card', label: '学生证' },
                { id: 'wechat', label: '微信学籍' },
              ];
              const tabBar = '<div class="lx-stuauth-tabs">' + tabs.map(t =>
                `<button class="lx-stuauth-tab${stuTab === t.id ? ' active' : ''}" type="button" data-stuauth-tab="${t.id}">${t.label}</button>`
              ).join('') + '</div>';

              let body = '';
              if (stuTab === 'email') {
                body = '<div class="lx-wpa-section">' +
                  '<input class="lx-p0-field" id="saSchool" placeholder="学校名称（必填）" value="' + esc(stuData.school) + '">' +
                  '<input class="lx-p0-field" id="saGradYear" placeholder="毕业时间，如 2026-07" value="' + esc(stuData.gradYear) + '">' +
                  '<select class="lx-p0-field lx-wpa-select" id="saDegree"><option value="">学历（必填）</option>' +
                  ['专科','本科','硕士','博士'].map(d => `<option value="${d}"${stuData.degree===d?' selected':''}>${d}</option>`).join('') +
                  '</select>' +
                  '<input class="lx-p0-field" id="saEmail" placeholder="edu邮箱（必填）" value="' + esc(stuData.email) + '">' +
                  '<p class="lx-p0-disclaimer">验证邮件将发送至上述 edu 邮箱，请注意查收。</p>' +
                  '</div>';
              } else if (stuTab === 'card') {
                body = '<div class="lx-wpa-section">' +
                  '<input class="lx-p0-field" id="saName" placeholder="真实姓名（必填）" value="' + esc(stuData.name) + '">' +
                  '<input class="lx-p0-field" id="saIdcard" placeholder="身份证号（必填）" value="' + esc(stuData.idcard) + '">' +
                  '<input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly style="color:#aaa">' +
                  '<input class="lx-p0-field" id="saCardNo" placeholder="学生证号（必填）" value="' + esc(stuData.cardNo) + '">' +
                  '<select class="lx-p0-field lx-wpa-select" id="saStage"><option value="">教育阶段（必填）</option>' +
                  ['小学','初中','高中','专科','本科','硕士','博士'].map(d => `<option value="${d}"${stuData.stage===d?' selected':''}>${d}</option>`).join('') +
                  '</select>' +
                  '<input class="lx-p0-field" id="saGradYear2" placeholder="毕业时间，如 2026-07" value="' + esc(stuData.gradYear) + '">' +
                  '<div class="lx-stuauth-upload"><span class="lx-stuauth-upload-plus">+</span><span>学生证照片</span><span class="lx-p0-disclaimer" style="margin:0">仅为示例</span></div>' +
                  '</div>';
              } else {
                body = '<div class="lx-wpa-section">' +
                  '<p style="color:#4A4453;font-size:13px;line-height:1.6;margin:0 0 16px">授权微信获取学籍状态，系统反馈验证结果。扫描下方小程序或 App 二维码完成授权。</p>' +
                  '<div class="lx-stuauth-qr-row">' +
                  '<div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><span>乐享小程序</span></div>' +
                  '<div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><span>联想 App</span></div>' +
                  '</div>' +
                  '<div class="lx-p0-actions" style="margin-top:8px"><button class="lx-p0-btn" type="button" data-stuauth-wechat-done>我已认证，查看认证状态</button></div>' +
                  '</div>';
              }

              const agree = '<label class="lx-wpa-agree" style="margin-top:8px"><input type="checkbox" id="saAgree"' + (stuData.agree ? ' checked' : '') + '> 已阅读并同意联想<a href="#" onclick="return false">《服务须知》</a>和<a href="#" onclick="return false">《活动规则》</a></label>';
              const btns = '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-modal-close>取消</button><button class="lx-p0-btn primary" type="button" data-stuauth-submit>立即认证</button></div>';
              const disclaimer = '<p class="lx-p0-disclaimer" style="margin-top:8px">POC 演示流程，不真实提交，演示约 12 秒自动通过。</p>';
              return tabBar + body + agree + btns + disclaimer;

            } else {
              // gaokao: 2 tabs
              const tabs = [
                { id: 'real', label: '实名认证' },
                { id: 'skip', label: '跳过实名' },
              ];
              const tabBar = '<div class="lx-stuauth-tabs">' + tabs.map(t =>
                `<button class="lx-stuauth-tab${stuTab === t.id ? ' active' : ''}" type="button" data-stuauth-tab="${t.id}">${t.label}</button>`
              ).join('') + '</div>';

              let body = '';
              if (stuTab === 'real') {
                body = '<div class="lx-wpa-section" style="position:relative">' +
                  '<div class="lx-stuauth-gaokao-hint">高考生认证有效期至 10 月 31 日</div>' +
                  '<input class="lx-p0-field" id="saName" placeholder="真实姓名（必填）" value="' + esc(stuData.name) + '">' +
                  '<input class="lx-p0-field" id="saIdcard" placeholder="身份证号（必填）" value="' + esc(stuData.idcard) + '">' +
                  '<input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly style="color:#aaa">' +
                  '<input class="lx-p0-field" id="saExamNo" placeholder="考生号 / 准考证号（必填）" value="' + esc(stuData.examNo) + '">' +
                  '<div class="lx-stuauth-upload"><span class="lx-stuauth-upload-plus">+</span><span>准考证照片</span><span class="lx-p0-disclaimer" style="margin:0">仅为示例</span></div>' +
                  '</div>';
              } else {
                body = '<div class="lx-wpa-section">' +
                  '<p style="color:#4A4453;font-size:13px;line-height:1.6;margin:0 0 12px">可跳过实名验证，直接凭考生号认证高考生身份，享教育专享价。</p>' +
                  '<input class="lx-p0-field" id="saExamNo" placeholder="考生号 / 准考证号（必填）" value="' + esc(stuData.examNo) + '">' +
                  '</div>';
              }

              const agree = '<label class="lx-wpa-agree" style="margin-top:8px"><input type="checkbox" id="saAgree"' + (stuData.agree ? ' checked' : '') + '> 已阅读并同意联想<a href="#" onclick="return false">《服务须知》</a>和<a href="#" onclick="return false">《活动规则》</a></label>';
              const btns = '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-modal-close>取消</button><button class="lx-p0-btn primary" type="button" data-stuauth-submit>立即认证</button></div>';
              const disclaimer = '<p class="lx-p0-disclaimer" style="margin-top:8px">POC 演示流程，不真实提交，演示约 12 秒自动通过。</p>';
              return tabBar + body + agree + btns + disclaimer;
            }
          }

          function stuCollect() {
            stuData.agree = document.getElementById('saAgree')?.checked || false;
            stuData.name = (document.getElementById('saName')?.value || '').trim();
            stuData.idcard = (document.getElementById('saIdcard')?.value || '').trim();
            stuData.email = (document.getElementById('saEmail')?.value || '').trim();
            stuData.school = (document.getElementById('saSchool')?.value || '').trim();
            stuData.gradYear = (document.getElementById('saGradYear')?.value || document.getElementById('saGradYear2')?.value || '').trim();
            stuData.degree = (document.getElementById('saDegree')?.value || '').trim();
            stuData.cardNo = (document.getElementById('saCardNo')?.value || '').trim();
            stuData.stage = (document.getElementById('saStage')?.value || '').trim();
            stuData.examNo = (document.getElementById('saExamNo')?.value || '').trim();
          }

          function stuRender() {
            const title = kind === 'gaokao' ? '高考生认证' : '在校生认证';
            openModal(title, stuTabsHtml());
            // 挂 tab 切换委托
            const mask = document.querySelector('.lx-p0-modal-mask');
            if (mask) mask.addEventListener('click', stuHandleClick, true);
          }

          function stuHandleClick(e) {
            // tab 切换
            const tabBtn = e.target.closest('[data-stuauth-tab]');
            if (tabBtn) {
              stuCollect();
              stuTab = tabBtn.getAttribute('data-stuauth-tab');
              stuRender();
              return;
            }
            // 取消
            if (e.target.closest('[data-modal-close]')) {
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              closeModal();
              return;
            }
            // 微信学籍：查看认证状态（demo：直接关弹窗给 toast）
            if (e.target.closest('[data-stuauth-wechat-done]')) {
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              closeModal();
              toast('认证状态确认中，演示约 12 秒自动通过');
              lxSaveStuState({ status: 'pending', name: '演示同学', submittedAt: Date.now() });
              setTimeout(() => {
                if (lxStuState().status === 'verified') {
                  toast('学生认证已通过，教育专享价已生效');
                  if (state.activeTabId === 'info:edu') openEduZone();
                }
              }, LX_STU_REVIEW_MS + 500);
              return;
            }
            // 提交
            if (e.target.closest('[data-stuauth-submit]')) {
              stuCollect();
              if (!stuData.agree) { toast('请勾选服务须知'); return; }
              const nameVal = stuData.name || (kind === 'gaokao' ? '' : stuData.email ? stuData.email.split('@')[0] : '');
              if (kind === 'gaokao' && !stuData.examNo) { toast('请填写考生号'); return; }
              if (kind === 'college' && stuTab === 'email' && !stuData.email) { toast('请填写 edu 邮箱'); return; }
              if (kind === 'college' && stuTab === 'card' && !stuData.name) { toast('请填写真实姓名'); return; }
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              lxSaveStuState({ status: 'pending', name: nameVal || '同学', kind, submittedAt: Date.now() });
              closeModal();
              toast('认证资料已提交，审核中（演示约 12 秒自动通过）');
              setTimeout(() => {
                if (lxStuState().status === 'verified') {
                  toast('学生认证已通过，教育专享价已生效');
                  if (state.activeTabId === 'info:edu') openEduZone();
                }
              }, LX_STU_REVIEW_MS + 500);
            }
          }

          stuRender();
        }

        // ── 职场认证 demo 向导（4步 modal）────────────────────────────────────────
        function openWorkplaceAuth() {
          let wpaStep = 1; // 当前步
          const wpaData = { type: '企业职工认证', name: '', idcard: '', phone: '13800138000', code: '', agree: false, company: '联想（北京）有限公司', industry: '', position: '', proofMethod: 'email', corpEmail: '' };
          let wpaCountdown = 0;
          let wpaTimer = null;

          function wpaStepHtml() {
            const steps = ['认证类型', '实名认证', '在职认证', '材料提交'];
            const progressHtml = '<div class="lx-wpa-steps">' + steps.map((label, i) => {
              const n = i + 1;
              const cls = n < wpaStep ? 'done' : (n === wpaStep ? 'active' : '');
              return '<div class="lx-wpa-step ' + cls + '">' +
                '<div class="lx-wpa-dot">' + (n < wpaStep ? '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' : n) + '</div>' +
                '<span>' + label + '</span>' +
                (n < steps.length ? '<div class="lx-wpa-line' + (n < wpaStep ? ' done' : '') + '"></div>' : '') +
                '</div>';
            }).join('') + '</div>';

            let body = '';
            if (wpaStep === 1) {
              body = '<div class="lx-wpa-section"><h4>选择认证类型</h4>' +
                '<label class="lx-wpa-radio selected"><input type="radio" name="wpa_type" value="企业职工认证" checked> ' +
                '<div class="lx-wpa-radio-body"><strong>企业职工认证</strong><span>可获得专属购机优惠及额外权益奖励 · 适用于企业在职员工</span></div></label>' +
                '</div>' +
                '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-wpa-next>下一步</button></div>';
            } else if (wpaStep === 2) {
              body = '<div class="lx-wpa-section"><h4>实名认证</h4>' +
                '<input class="lx-p0-field" id="wpaName" placeholder="姓名（必填）" value="' + esc(wpaData.name) + '">' +
                '<input class="lx-p0-field" id="wpaIdcard" placeholder="身份证号（必填）" value="' + esc(wpaData.idcard) + '">' +
                '<input class="lx-p0-field" id="wpaPhone" placeholder="手机号（必填）" value="' + esc(wpaData.phone) + '">' +
                '<div class="lx-wpa-code-row"><input class="lx-p0-field lx-wpa-code-input" id="wpaCode" placeholder="验证码（必填）" value="' + esc(wpaData.code) + '">' +
                '<button class="lx-p0-btn lx-wpa-send-code" type="button" id="wpaSendCode">' + (wpaCountdown > 0 ? wpaCountdown + 's 后重发' : '获取验证码') + '</button></div>' +
                '<label class="lx-wpa-agree"><input type="checkbox" id="wpaAgree"' + (wpaData.agree ? ' checked' : '') + '> 我同意<a href="#" onclick="return false">《实名认证协议》</a></label>' +
                '</div>' +
                '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-wpa-back>返回</button><button class="lx-p0-btn primary" type="button" data-wpa-next>下一步</button></div>';
            } else if (wpaStep === 3) {
              const industries = ['互联网/科技', '金融/银行', '制造业', '医疗/卫生', '教育/科研', '政府/事业', '零售/贸易', '其他'];
              body = '<div class="lx-wpa-section"><h4>企业在职认证</h4>' +
                '<input class="lx-p0-field" id="wpaCompany" placeholder="企业名称（必填）" value="' + esc(wpaData.company) + '">' +
                '<select class="lx-p0-field lx-wpa-select" id="wpaIndustry"><option value="">请选择行业（必填）</option>' +
                industries.map(ind => '<option value="' + esc(ind) + '"' + (wpaData.industry === ind ? ' selected' : '') + '>' + esc(ind) + '</option>').join('') +
                '</select>' +
                '<input class="lx-p0-field" id="wpaPosition" placeholder="职务（必填）" value="' + esc(wpaData.position) + '">' +
                '</div>' +
                '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-wpa-back>返回</button><button class="lx-p0-btn primary" type="button" data-wpa-next>下一步</button></div>';
            } else if (wpaStep === 4) {
              body = '<div class="lx-wpa-section"><h4>在职证明方式</h4>' +
                '<label class="lx-wpa-radio' + (wpaData.proofMethod === 'email' ? ' selected' : '') + '"><input type="radio" name="wpa_proof" value="email"' + (wpaData.proofMethod === 'email' ? ' checked' : '') + '> <div class="lx-wpa-radio-body"><strong>企业邮箱认证（推荐）</strong></div></label>' +
                '<label class="lx-wpa-radio' + (wpaData.proofMethod === 'contract' ? ' selected' : '') + '"><input type="radio" name="wpa_proof" value="contract"' + (wpaData.proofMethod === 'contract' ? ' checked' : '') + '> <div class="lx-wpa-radio-body"><strong>劳动合同或在职证明</strong></div></label>' +
                '<label class="lx-wpa-radio' + (wpaData.proofMethod === 'other' ? ' selected' : '') + '"><input type="radio" name="wpa_proof" value="other"' + (wpaData.proofMethod === 'other' ? ' checked' : '') + '> <div class="lx-wpa-radio-body"><strong>其他材料认证</strong></div></label>' +
                (wpaData.proofMethod === 'email' ? '<div class="lx-wpa-email-row"><span class="lx-wpa-email-label">企业邮箱</span><div class="lx-wpa-email-input-wrap"><input class="lx-p0-field lx-wpa-email-prefix" id="wpaEmailPrefix" placeholder="邮箱前缀" value="' + esc(wpaData.corpEmail) + '"><span class="lx-wpa-email-suffix">@lenovo.com</span></div></div>' : '') +
                '<div class="lx-wpa-legal"><p>1. 提交信息仅用于身份验证</p><p>2. 材料审核后自动删除</p><p>3. 提交虚假信息将承担相应法律责任</p></div>' +
                '</div>' +
                '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-wpa-back>返回</button><button class="lx-p0-btn primary lx-wpa-submit-btn" type="button" data-wpa-submit>提交认证</button></div>';
            }
            return progressHtml + body;
          }

          function wpaRender() {
            openModal('职场身份认证 · 获取更多权益', wpaStepHtml());
            // 绑定倒计时按钮（如果在第2步且有倒计时需要恢复）
            if (wpaStep === 2 && wpaCountdown > 0) {
              const btn = document.getElementById('wpaSendCode');
              if (btn) { btn.disabled = true; btn.textContent = wpaCountdown + 's 后重发'; }
            }
          }

          // 全局代理：wpa-* 按钮委托挂到 modal mask（捕获阶段，在 bindEvents 之前拦截）
          function wpaHandleClick(e) {
            // 发送验证码
            if (e.target.closest('#wpaSendCode') && wpaCountdown === 0) {
              wpaCountdown = 60;
              const btn = e.target.closest('#wpaSendCode');
              btn.disabled = true;
              btn.textContent = wpaCountdown + 's 后重发';
              wpaTimer = setInterval(() => {
                wpaCountdown--;
                const b = document.getElementById('wpaSendCode');
                if (b) { b.textContent = wpaCountdown > 0 ? wpaCountdown + 's 后重发' : '获取验证码'; b.disabled = wpaCountdown > 0; }
                if (wpaCountdown <= 0) { clearInterval(wpaTimer); wpaTimer = null; }
              }, 1000);
              return;
            }
            // 单选高亮
            const radio = e.target.closest('.lx-wpa-radio input[type="radio"]');
            if (radio) {
              const radios = document.querySelectorAll('.lx-wpa-radio');
              radios.forEach(r => r.classList.remove('selected'));
              radio.closest('.lx-wpa-radio').classList.add('selected');
              if (radio.name === 'wpa_proof') {
                wpaData.proofMethod = radio.value;
                wpaRender();
              }
              return;
            }
            // 上一步
            if (e.target.closest('[data-wpa-back]')) {
              wpaCollect();
              wpaStep--;
              wpaRender();
              return;
            }
            // 下一步
            if (e.target.closest('[data-wpa-next]')) {
              wpaCollect();
              if (!wpaValidate()) return;
              wpaStep++;
              wpaRender();
              return;
            }
            // 提交
            if (e.target.closest('[data-wpa-submit]')) {
              wpaCollect();
              clearInterval(wpaTimer);
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', wpaHandleClick, true);
              closeModal();
              toast('认证材料已提交，审核通过后专属权益自动到账（演示）');
            }
          }

          function wpaCollect() {
            if (wpaStep === 2) {
              wpaData.name = (document.getElementById('wpaName')?.value || '').trim();
              wpaData.idcard = (document.getElementById('wpaIdcard')?.value || '').trim();
              wpaData.phone = (document.getElementById('wpaPhone')?.value || '').trim();
              wpaData.code = (document.getElementById('wpaCode')?.value || '').trim();
              wpaData.agree = document.getElementById('wpaAgree')?.checked || false;
            } else if (wpaStep === 3) {
              wpaData.company = (document.getElementById('wpaCompany')?.value || '').trim();
              wpaData.industry = (document.getElementById('wpaIndustry')?.value || '').trim();
              wpaData.position = (document.getElementById('wpaPosition')?.value || '').trim();
            } else if (wpaStep === 4) {
              wpaData.corpEmail = (document.getElementById('wpaEmailPrefix')?.value || '').trim();
            }
          }

          function wpaValidate() {
            if (wpaStep === 2) {
              if (!wpaData.name) { toast('请填写姓名'); return false; }
              if (!wpaData.idcard) { toast('请填写身份证号'); return false; }
              if (!wpaData.phone) { toast('请填写手机号'); return false; }
              if (!wpaData.agree) { toast('请勾选实名认证协议'); return false; }
            } else if (wpaStep === 3) {
              if (!wpaData.company) { toast('请填写企业名称'); return false; }
              if (!wpaData.industry) { toast('请选择行业'); return false; }
              if (!wpaData.position) { toast('请填写职务'); return false; }
            }
            return true;
          }

          wpaRender();
          // 把 wpaHandleClick 挂到 modal mask（捕获）
          const mask = document.querySelector('.lx-p0-modal-mask');
          if (mask) mask.addEventListener('click', wpaHandleClick, true);
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

        function lxMoveTabInk() {
          const bar = document.querySelector(".lx-tabbar");
          if (!bar || bar.hidden) return;
          let ink = bar.querySelector(".lx-tab-ink");
          if (!ink) {
            ink = document.createElement("span");
            ink.className = "lx-tab-ink";
            ink.setAttribute("aria-hidden", "true");
            bar.appendChild(ink);
          }
          const active = bar.querySelector(".lx-tab.is-active") || bar.querySelector(".lx-tab");
          const lab = active ? (active.querySelector(".lx-tab-label") || active) : null;
          if (!active || !lab) { ink.style.width = "0px"; return; }
          const inkWidth = Math.min(50, lab.offsetWidth || active.offsetWidth || 0);
          ink.style.left = (active.offsetLeft + lab.offsetLeft + ((lab.offsetWidth || active.offsetWidth) - inkWidth) / 2) + "px";
          ink.style.width = inkWidth + "px";
        }
        window.addEventListener("resize", () => requestAnimationFrame(lxMoveTabInk));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(lxMoveTabInk));

        function lxRenderTabbar() {
          const bar = lxEnsureTabbar();
          const tabs = state.tabs || [];
          bar.innerHTML = tabs.map((tab) => `<span class="lx-tab${tab.id === state.activeTabId ? " is-active" : ""}" data-tab-id="${esc(tab.id)}" role="tab" aria-selected="${tab.id === state.activeTabId}"><span class="lx-tab-label">${esc(tab.label || "")}</span><button class="lx-tab-close" type="button" data-tab-close="${esc(tab.id)}" aria-label="关闭标签">×</button></span>`).join("") + `<span class="lx-tab-ink" aria-hidden="true"></span>`;
          bar.hidden = tabs.length <= 1; // 单标签无切换意义，隐藏（用户反馈）
          requestAnimationFrame(lxMoveTabInk);
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

        function lxProductRefPayload(product, card) {
          const title = product?.name || card?.querySelector(".product-title, .name, h3, strong")?.textContent?.trim() || "联想商品";
          const rawPrice = product?.price ? `¥${Number(product.price || 0).toLocaleString()}` : (card?.querySelector(".price, .pc-price")?.textContent || "").trim();
          const spec = (product?.description || card?.querySelector(".spec, .pc-spec")?.textContent || "").trim().replace(/\s+/g, " ");
          const img = product?.image_url ? imgUrl(product.image_url) : (card?.querySelector(".product-visual img, img")?.getAttribute("src") || card?.querySelector(".product-visual img, img")?.src || "/assets/product-placeholder.svg");
          return {
            sku: product?.sku || lxCardSku(card),
            name: title,
            price: rawPrice,
            spec,
            img: imgUrl(img),
            description: spec.slice(0, 120),
          };
        }

        function lxEnsureAttach(composer) {
          if (!composer) return null;
          let attach = composer.querySelector(":scope > .attach");
          if (!attach) {
            attach = document.createElement("div");
            attach.className = "attach";
            composer.insertBefore(attach, composer.firstChild);
          }
          return attach;
        }

        function lxClearProductRef() {
          const composer = document.querySelector(".composer");
          const ta = composer?.querySelector("textarea");
          const send = composer?.querySelector(".send-btn");
          composer?.querySelector(":scope > .attach")?.replaceChildren();
          composer?.classList.remove("has");
          send?.classList.remove("pulse");
          if (ta?.dataset.originPlaceholder) ta.placeholder = ta.dataset.originPlaceholder;
          state.refProduct = null;
          state.refProducts = [];
          state.refMsg = null;
          document.querySelectorAll(".lx-pick-btn.picked").forEach((b) => b.classList.remove("picked"));
          document.querySelector(".lx-ref-bar")?.remove();
        }

        function lxDockProductRef(data, opts = {}) {
          const composer = document.querySelector(".composer");
          const ta = composer?.querySelector("textarea");
          const send = composer?.querySelector(".send-btn");
          const attach = lxEnsureAttach(composer);
          if (!composer || !attach || !data?.name) return;
          // 去重+限4
          if (!Array.isArray(state.refProducts)) state.refProducts = [];
          if (state.refProducts.some(p => p.sku && p.sku === data.sku)) {
            toast("已在引用列表中");
            return;
          }
          if (state.refProducts.length >= 5) {
            toast("最多引用 5 个商品哦");
            return;
          }
          const item = {
            sku: data.sku,
            name: data.name,
            price: data.price || "",
            image_url: data.img || data.image_url || "",
            description: (data.description || data.spec || "").slice(0, 120),
          };
          state.refProducts.push(item);
          state.refMsg = null;
          lxRenderRefChips(composer, attach, ta, send);
          if (data.sku) document.querySelector(`.lx-pick-btn[data-pick-sku="${CSS.escape(data.sku)}"]`)?.classList.add("picked");
          if (opts.toast !== false) toast("已引用商品，直接提问即可");
        }

        function lxRenderRefChips(composer, attach, ta, send) {
          if (!attach) return;
          if (!Array.isArray(state.refProducts) || !state.refProducts.length) {
            attach.replaceChildren();
            composer?.classList.remove("has");
            send?.classList.remove("pulse");
            if (ta?.dataset.originPlaceholder) ta.placeholder = ta.dataset.originPlaceholder;
            return;
          }
          if (ta && !ta.dataset.originPlaceholder) ta.dataset.originPlaceholder = ta.placeholder || "最近有什么优惠活动？";
          const n = state.refProducts.length;
          const chipsHtml = state.refProducts.map((p, i) => {
            const img = p.image_url || "/assets/product-placeholder.svg";
            const rm = `<button type="button" data-ref-remove-idx="${i}" aria-label="移除" style="width:16px;height:16px;border:none;background:none;cursor:pointer;color:#999;font-size:15px;line-height:1;padding:0;flex-shrink:0;">×</button>`;
            if (n === 1) {
              // 1 个：带图 + 名称 + 价格/规格 的完整卡
              const sub = [p.price ? `¥${p.price}` : "", String(p.description || "").slice(0, 30)].filter(Boolean).join(" · ");
              return `<span class="lx-ref-chip-rich" data-ref-chip-idx="${i}" style="flex:0 1 auto;max-width:360px;display:inline-flex;align-items:center;gap:9px;background:#f5f0ff;border:1px solid #d6c8ff;border-radius:10px;padding:7px 11px;">
                <img src="${esc(img)}" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:6px;flex-shrink:0;">
                <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
                  <span style="font-size:13px;font-weight:600;color:#3a3142;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${esc(String(p.name || ""))}</span>
                  ${sub ? `<span style="font-size:11px;color:#9a8aa8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${esc(sub)}</span>` : ""}
                </span>
                ${rm}
              </span>`;
            }
            // 2-5 个：等分宽度，精简（图 + 名）
            return `<span class="lx-ref-chip-mini" data-ref-chip-idx="${i}" style="flex:1 1 0;min-width:0;display:inline-flex;align-items:center;gap:6px;background:#f5f0ff;border:1px solid #d6c8ff;border-radius:8px;padding:5px 7px;">
              <img src="${esc(img)}" alt="" style="width:30px;height:30px;object-fit:contain;border-radius:5px;flex-shrink:0;">
              <span style="min-width:0;flex:1;font-size:12px;color:#3a3142;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(String(p.name || ""))}</span>
              ${rm}
            </span>`;
          }).join("");
          attach.innerHTML = `<div class="lx-ref-chips" style="display:flex;gap:9px;align-items:stretch;padding:6px 2px 3px;">${chipsHtml}</div>`;
          composer?.classList.add("has");
          send?.classList.add("pulse");
          if (ta) ta.placeholder = n === 1 ? "想了解这款商品的什么？比如优惠、对比、是否适合我…" : "想了解这几款商品的什么？比如优惠、对比、是否适合我…";
          // × 按钮事件
          attach.querySelectorAll("[data-ref-remove-idx]").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.refRemoveIdx);
              if (isNaN(idx)) return;
              const removed = state.refProducts[idx];
              state.refProducts.splice(idx, 1);
              if (removed?.sku) document.querySelector(`.lx-pick-btn[data-pick-sku="${CSS.escape(removed.sku)}"]`)?.classList.remove("picked");
              const comp = document.querySelector(".composer");
              const t = comp?.querySelector("textarea");
              const s = comp?.querySelector(".send-btn");
              const a = comp?.querySelector(":scope > .attach");
              lxRenderRefChips(comp, a, t, s);
            }, { once: true });
          });
        }

        async function lxSetProductRef(sku, card) {
          if (!sku) return;
          let product = (state.products || []).find((p) => p.sku === sku) || (state.floorProducts || []).find((p) => p.sku === sku);
          if (!product) {
            try { product = await (await fetch(`/api/products/${encodeURIComponent(sku)}`, { cache: "no-store" })).json(); } catch {}
          }
          const payload = lxProductRefPayload(product, card || document.querySelector(`[data-sku="${CSS.escape(sku)}"], [data-open-product="${CSS.escape(sku)}"]`));
          if (!payload?.name) return toast("商品信息获取失败");
          lxDockProductRef(payload);
        }

        function lxEnsurePickBtn(card) {
          if (!card || card.querySelector(":scope > .lx-pick-btn")) return;
          const sku = lxCardSku(card);
          if (!sku) return;
          if (getComputedStyle(card).position === "static") card.style.position = "relative";
          card.insertAdjacentHTML("beforeend", `<button class="lx-pick-btn${(Array.isArray(state.refProducts) && state.refProducts.some(p => p.sku === sku)) ? " picked" : ""}" type="button" data-pick-sku="${esc(sku)}" title="引用这个商品提问" aria-label="引用商品">✓</button>`);
          card.draggable = true;
        }

        function lxSetRef(text) {
          if (!text) { lxClearProductRef(); return; }
          state.refMsg = text;
          state.refProduct = null;
          document.querySelectorAll(".lx-pick-btn.picked").forEach((b) => b.classList.remove("picked"));
          document.querySelector(".composer")?.classList.remove("has");
          document.querySelector(".composer .attach")?.replaceChildren();
          document.querySelector(".send-btn")?.classList.remove("pulse");
          document.querySelector(".lx-ref-bar")?.remove();
          const bottom = document.querySelector(".assistant-bottom");
          bottom?.insertAdjacentHTML("afterbegin", `<div class="lx-ref-bar"><span>引用</span><span class="lx-ref-text">${esc(text.slice(0, 60))}</span><button type="button" data-ref-clear aria-label="取消引用">×</button></div>`);
        }


        let lxProductDrag = null;
        let lxProductDragPending = null;
        let lxSuppressProductClick = false;
        const LX_PRODUCT_DRAG_THRESHOLD = 6;
        const lxPointInside = (el, x, y) => {
          const r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        };
        function lxCardDragData(card) {
          const sku = lxCardSku(card);
          const product = (state.products || []).find((p) => p.sku === sku) || (state.floorProducts || []).find((p) => p.sku === sku);
          return lxProductRefPayload(product, card);
        }
        function lxGhostHtml(d) {
          return `<div class="pc-img"><img src="${esc(d.img || "/assets/product-placeholder.svg")}" alt="" /></div>
      <div class="pc-b"><div class="pc-name">${esc(d.name || "联想商品")}</div>
      <div class="pc-spec">${esc(d.spec || "")}</div><div class="pc-price">${esc(d.price || "")}</div></div>`;
        }
        function lxEnsureGlowLayer(panel) {
          if (!panel || panel.querySelector(":scope > .glowlayer")) return;
          panel.insertAdjacentHTML("beforeend", '<div class="glowlayer" aria-hidden="true"></div>');
        }
        function lxCancelProductPointerPending() {
          if (!lxProductDragPending) return;
          document.removeEventListener("pointermove", lxOnProductPointerPendingMove, true);
          document.removeEventListener("pointerup", lxCancelProductPointerPending, true);
          document.removeEventListener("pointercancel", lxCancelProductPointerPending, true);
          lxProductDragPending = null;
        }
        function lxCancelProductPointerDrag() {
          if (!lxProductDrag) return;
          lxProductDrag.ghost?.remove();
          lxProductDrag.card?.classList.remove("grabbing");
          lxProductDrag.panel?.classList.remove("dragging", "armed");
          document.removeEventListener("pointermove", lxOnProductPointerMove, true);
          document.removeEventListener("pointerup", lxOnProductPointerUp, true);
          document.removeEventListener("pointercancel", lxCancelProductPointerDrag, true);
          lxProductDrag = null;
        }
        function lxOnProductPointerPendingMove(event) {
          if (!lxProductDragPending) return;
          const pending = lxProductDragPending;
          const dx = event.clientX - pending.clientX;
          const dy = event.clientY - pending.clientY;
          if (Math.hypot(dx, dy) < LX_PRODUCT_DRAG_THRESHOLD) return;
          event.preventDefault();
          event.stopPropagation();
          lxCancelProductPointerPending();
          lxStartProductPointerDrag(pending.card, event, pending);
          lxOnProductPointerMove(event);
        }
        function lxOnProductPointerMove(event) {
          if (!lxProductDrag) return;
          lxProductDrag.ghost.style.left = (event.clientX - lxProductDrag.offX) + "px";
          lxProductDrag.ghost.style.top = (event.clientY - lxProductDrag.offY) + "px";
          lxProductDrag.panel.classList.toggle("armed", lxPointInside(lxProductDrag.panel, event.clientX, event.clientY));
        }
        function lxOnProductPointerUp(event) {
          if (!lxProductDrag) return;
          const over = lxPointInside(lxProductDrag.panel, event.clientX, event.clientY);
          const data = lxProductDrag.d;
          const panel = lxProductDrag.panel;
          lxSuppressProductClick = true;
          setTimeout(() => { lxSuppressProductClick = false; }, 0);
          lxCancelProductPointerDrag();
          panel?.classList.remove("armed");
          if (over) {
            lxDockProductRef(data);
          }
        }
        function lxStartProductPointerDrag(card, event, origin = event) {
          const panel = document.querySelector(".assistant-panel");
          const composer = document.querySelector(".composer");
          if (!panel || !composer || !card || (event.button !== 0 && event.buttons !== 1)) return;
          const d = lxCardDragData(card);
          if (!d?.name) return;
          event.preventDefault();
          event.stopPropagation();
          const rect = card.getBoundingClientRect();
          const ghost = document.createElement("div");
          ghost.className = "ghost";
          ghost.innerHTML = lxGhostHtml(d);
          ghost.style.left = rect.left + "px";
          ghost.style.top = rect.top + "px";
          document.body.appendChild(ghost);
          lxEnsureGlowLayer(panel);
          card.classList.add("grabbing");
          panel.classList.add("dragging");
          lxProductDrag = { ghost, offX: origin.clientX - rect.left, offY: origin.clientY - rect.top, card, d, panel };
          document.addEventListener("pointermove", lxOnProductPointerMove, true);
          document.addEventListener("pointerup", lxOnProductPointerUp, true);
          document.addEventListener("pointercancel", lxCancelProductPointerDrag, true);
        }

        // 自动全屏对话态：进入/退出统一管理（lx-auto-fs 用于隐藏无意义的展开缩放按钮）
        function lxSetAutoFs(on) {
          state.autoFs = !!on;
          // 兜底：全屏对话必须处于 chat 态，否则首页下面板被隐藏会白屏
          if (on) document.body.dataset.state = "chat";
          document.body.classList.toggle("assistant-fullscreen", !!on);
          document.body.classList.toggle("lx-auto-fs", !!on);
          // 分屏/全屏切换会改变楼层网格列数 → 重新按真实列数夹两排
          const floorBox = document.querySelector("[data-site-floors]");
          if (floorBox) requestAnimationFrame(() => lxClampFloors(floorBox));
        }

        // AI 页面操作执行器：对话即操作（用户要求关页面/切站/开功能时真实执行）
        function lxExecControl(op, target) {
          const siteMap = { shop: "personal", b: "business", biz: "enterprise" };
          const ops = {
            close_all_tabs: () => { state.tabs = []; state.activeTabId = null; state.pageTrail = []; lxRenderTabbar(); document.querySelector(".content")?.setAttribute("data-view", "list"); toast("已关闭所有页面"); },
            close_other_tabs: () => {
              // 关其他/留当前一个（「留一排」「只留这个」「关多余」都走这里）
              const keep = state.activeTabId || (state.tabs && state.tabs[state.tabs.length - 1]?.id);
              if (!keep) { toast("当前没有其他标签"); return; }
              state.tabs = (state.tabs || []).filter((t) => t.id === keep);
              state.activeTabId = keep;
              lxRenderTabbar();
              lxActivateTab(keep);
              toast("已关闭其他标签，只留当前页面");
            },
            close_tab: () => {
              // 指定标签名匹配；匹配不到（如「右侧标签」这类泛指）则退化为关其他、留当前
              const tab = (state.tabs || []).find((t) => target && (t.label || "").includes(target));
              if (tab) { lxCloseTab(tab.id); toast(`已关闭「${tab.label}」`); }
              else { ops.close_other_tabs(); }
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
            open_product: () => {
              const t = String(target || "").trim();
              const pool = [...(state.products || []), ...(state.siteProducts || []), ...(state.floorProducts || [])];
              const hit = t && pool.find((p) => p && (p.sku === t || (p.name || "").includes(t) || t.includes(p.name || "__none__")));
              if (hit && hit.sku) { lxRevealContent(); openProduct(hit.sku); }
              else if (t) { lxRevealContent(); sendChat("帮我找" + t); }
              else toast("没说要打开哪款商品");
            },
            enter_fullscreen: () => lxSetAutoFs(true),
            exit_fullscreen: () => { if (state.autoFs) lxSetAutoFs(false); else document.body.classList.remove("assistant-fullscreen"); },
          };
          (ops[op] || (() => toast("暂不支持该页面操作")))();
        }

        // AI 产出可看内容时退出全屏（含手动全屏）、按需展开右侧；若仍在首页语境则此时才切到个人及家庭
        function lxRevealContent() {
          if (document.body.classList.contains("assistant-fullscreen")) {
            if (state.autoFs) lxSetAutoFs(false);
            else document.body.classList.remove("assistant-fullscreen");
          }
          // 若已进入首页原地分屏模式，布局已就位，跳过 routeTo 避免 URL 变化
          if (document.body.classList.contains("lx-home-split")) return;
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
          const disclaimer = `<p class="lx-p0-disclaimer">推荐由联想乐享基于你的需求生成，价格与配置以详情页为准。</p>`;
          // 官方商品存入缓存，供 data-open-product 点击时取对象（避免 sku fetch 404）
          state.officialProducts = state.officialProducts || {};
          products.forEach((p) => { if (p && p.official && p.sku) state.officialProducts[p.sku] = p; });

          // 系列全品类概览模式：按 category 分组渲染货架
          const isGrouped = !!tab.grouped && products.some(p => p && p.category);
          if (isGrouped) {
            const intro = `<div class="reco-head"><h2>${esc(tab.label || "全系产品")}</h2><span>这个系列覆盖这些品类，按品类帮你理好了，点任意一款看详情</span></div>`;
            // 按先见顺序分组（保持后端排好的品类顺序）
            const catOrder = [];
            const catMap = {};
            for (const p of products) {
              const cat = (p && p.category) || "其它";
              if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat); }
              catMap[cat].push(p);
            }
            const floors = catOrder.map(cat => {
              const items = catMap[cat];
              return `<section class="lx-floor" data-floor-cat="${esc(cat)}">` +
                `<div class="lx-floor-head"><h3>${esc(cat)}</h3><span>${items.length} 款</span></div>` +
                `<div class="lx-floor-products">${items.map(lxProductMiniCard).join("")}</div>` +
                `</section>`;
            }).join("");
            pageBox.innerHTML = intro + floors + disclaimer;
            return;
          }

          const intro = `<div class="reco-head"><h2>${esc(tab.label || "AI 推荐")}</h2><span>根据你的需求挑出 ${products.length} 款，可继续追问缩小范围</span></div>`;
          if (products.length <= 6) {
            const cmpN = Math.min(products.length, 8);
            const compareAll = products.length >= 2
              ? `<div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn" type="button" data-cmp-local="${esc(products.slice(0, cmpN).map((p) => p.sku).join(","))}">对比这 ${cmpN} 款</button></div>`
              : "";
            pageBox.innerHTML = intro + products.map((p) => `
              <div class="reco-row">
                <img src="${p.official ? esc(p.image_url) : esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" data-open-product="${esc(p.sku)}" />
                <div class="reco-row-main" data-open-product="${esc(p.sku)}">
                  <strong>${esc(p.name)}</strong>
                  <span class="reco-row-desc">${esc(p.description || p.category || "")}</span>
                  <div class="reco-row-tags">${(p.promotion_tags || []).slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("")}</div>
                  ${(() => {
                    const s = p.specs || {};
                    const chips = [s.cpu || s["处理器"], s.ram || s.memory, s.screen_size, s.weight].filter(Boolean).slice(0, 3).map((v) => `<span class="lx-reco-spec">${esc(String(v).slice(0, 14))}</span>`).join("");
                    const why = p.reason || p.recommend_reason || (p.description ? String(p.description).slice(0, 42) : "");
                    return `${chips ? `<div class="lx-reco-specs">${chips}</div>` : ""}${why ? `<div class="lx-reco-why">${esc(why)}</div>` : ""}`;
                  })()}
                </div>
                <div class="reco-row-side">
                  <span class="reco-row-price">¥${Number(p.price || 0).toLocaleString()}</span>
                  <div class="reco-row-actions">
                    ${p.official
                      ? `<button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">看详情</button><button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">立即购买</button>`
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
          // 关掉最后一个 tab 且当前在分屏 → 回全屏并带入对话
          if ((state.tabs || []).length === 0 &&
              !document.body.classList.contains("assistant-fullscreen") &&
              typeof window.__lxfdEnterFromSplit === "function") {
            window.__lxfdEnterFromSplit();
          }
        }

        // ── 标签栏右键菜单 ──
        let _lxTabMenu = null;
        function lxShowTabMenu(x, y, tabId) {
          lxHideTabMenu();
          const tabs = state.tabs || [];
          const menu = document.createElement("div");
          menu.className = "lx-tab-menu";
          menu.style.left = x + "px";
          menu.style.top = y + "px";
          const items = [
            { label: "关闭此标签", action: () => lxCloseTab(tabId) },
            { label: "关闭其他标签", action: () => {
                state.tabs = (state.tabs || []).filter((t) => t.id === tabId);
                state.activeTabId = tabId;
                lxRenderTabbar();
                lxActivateTab(tabId);
              }, disabled: tabs.length < 2 },
            { label: "关闭全部标签", action: () => {
                state.tabs = []; state.activeTabId = null; state.pageTrail = [];
                lxRenderTabbar();
                document.querySelector(".content")?.setAttribute("data-view", "list");
                if (!document.body.classList.contains("assistant-fullscreen") &&
                    typeof window.__lxfdEnterFromSplit === "function") {
                  window.__lxfdEnterFromSplit();
                }
              } },
          ];
          items.forEach(({ label, action, disabled }) => {
            const item = document.createElement("div");
            item.className = "lx-tab-menu-item" + (disabled ? " is-disabled" : "");
            item.textContent = label;
            if (!disabled) item.addEventListener("click", () => { lxHideTabMenu(); action(); });
            menu.appendChild(item);
          });
          document.body.appendChild(menu);
          _lxTabMenu = menu;
        }
        function lxHideTabMenu() {
          if (_lxTabMenu) { _lxTabMenu.remove(); _lxTabMenu = null; }
        }
        document.addEventListener("contextmenu", (e) => {
          const tab = e.target.closest(".lx-tab");
          if (!tab) { lxHideTabMenu(); return; }
          e.preventDefault();
          lxShowTabMenu(e.clientX, e.clientY, tab.dataset.tabId);
        });
        document.addEventListener("click", () => lxHideTabMenu(), true);
        document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") lxHideTabMenu(); });
        document.addEventListener("scroll", () => lxHideTabMenu(), true);

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
          const src = String(text || "").replace(/\r/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]*_\._[ \t]*/g, " ");
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

        // 数值型参数的优劣方向（lower=越小越好）：解析数值并做单位归一，找出每行最优列
        const LX_CMP_BETTER = {
          weight: "lower", thickness: "lower",
          ram: "higher", memory: "higher", storage: "higher", disk: "higher",
          battery: "higher", screen_size: "higher", refresh_rate: "higher", camera: "higher",
        };
        function lxCmpNum(raw) {
          const s = String(raw).toLowerCase().replace(/,/g, "");
          const m = s.match(/(\d+(?:\.\d+)?)\s*(tb|gb|kg|g|mah|wh|hz|英寸|寸|mm|cm)?/);
          if (!m) return null;
          let n = parseFloat(m[1]);
          if (m[2] === "tb") n *= 1024;
          if (m[2] === "kg") n *= 1000;
          if (m[2] === "cm") n *= 10;
          return n;
        }

        function scoreCpu(str) {
          if (!str || str === '—') return 0;
          const s = str.toLowerCase();
          let base = 0;
          if (/ultra\s*9/.test(s)) base = 90;
          else if (/锐龙\s*9|ryzen\s*9|\br9\b/.test(s)) base = 86;
          else if (/ultra\s*7/.test(s)) base = 70;
          else if (/锐龙\s*7|ryzen\s*7|\br7\b/.test(s)) base = 66;
          else if (/ultra\s*5/.test(s)) base = 50;
          else if (/锐龙\s*5|ryzen\s*5|\br5\b/.test(s)) base = 46;
          else if (/i9/.test(s)) base = 88;
          else if (/i7/.test(s)) base = 72;
          else if (/i5/.test(s)) base = 52;
          if (!base) return 0;
          // Plus 加分
          if (/plus/i.test(str)) base += 2;
          // 型号数字 tiebreak（取最后4位数字）
          const numM = str.match(/(\d{3,4})/g);
          if (numM) base += parseInt(numM[numM.length - 1]) / 10000;
          return base;
        }

        function renderCompareTable(products, opts = {}) {
          const keys = [];
          const seen = new Set();
          products.forEach((product) => Object.keys(product.specs || {}).forEach((key) => {
            // 白名单：只展示有中文映射的参数；内部字段（materialNumber/screen_res 等）与分类行不外露
            if (DETAIL_SPEC_SKIP_KEYS.has(key) || seen.has(key)) return;
            if (!DETAIL_SPEC_LABELS[key] || /^lvl\d/.test(key)) return;
            seen.add(key);
            keys.push(key);
          }));
          const prices = products.map(p => Number(p.price || 0));
          const validPrices = prices.filter(p => p > 0);
          const minPrice = validPrices.length >= 2 ? Math.min(...validPrices) : -1;
          const bestPriceIdx = minPrice > 0 ? prices.indexOf(minPrice) : -1;
          const headCells = products.map((product, i) => `<th><div class="lx-cmp-name" data-open-product="${esc(product.sku)}">${esc(product.name)}</div><div class="lx-cmp-price${i === bestPriceIdx ? ' best' : ''}">¥${Number(product.price || 0).toLocaleString()}${i === bestPriceIdx ? '<span class="lx-cmp-best-tag">优</span>' : ''}</div></th>`).join("");
          const bodyRows = keys.slice(0, 18).map((key) => {
            const values = products.map((product) => String((product.specs || {})[key] ?? "—").trim());
            const differs = new Set(values).size > 1;
            // 优势格：数值可比的行，按方向找最优列高亮（如内存大/重量轻）
            let bestIndex = -1;
            const dir = LX_CMP_BETTER[key];
            if (dir && differs) {
              const nums = values.map((v) => (v === "—" ? null : lxCmpNum(v)));
              const valid = nums.filter((n) => n !== null);
              if (valid.length >= 2 && new Set(valid).size > 1) {
                const best = dir === "lower" ? Math.min(...valid) : Math.max(...valid);
                bestIndex = nums.indexOf(best);
              }
            } else if (key === 'cpu' && differs) {
              const scores = values.map(v => scoreCpu(v));
              const maxScore = Math.max(...scores);
              if (maxScore > 0) bestIndex = scores.indexOf(maxScore);
            }
            return `<tr class="${differs ? "diff" : ""}"><td class="lx-cmp-label">${esc(DETAIL_SPEC_LABELS[key] || key)}</td>${values.map((value, i) => `<td${i === bestIndex ? ' class="best"' : ""}>${esc(value)}${i === bestIndex ? '<span class="lx-cmp-best-tag">优</span>' : ""}</td>`).join("")}</tr>`;
          }).join("");
          const actionsRow = opts.actions
            ? `<tr class="cmp-actions"><td class="lx-cmp-label">操作</td>${products.map((product) => `<td><div class="lx-cmp-btns"><button class="lx-p0-btn primary" type="button" data-cmp-buy="${esc(product.sku)}">立即购买</button><button class="lx-p0-btn" type="button" data-cmp-cart="${esc(product.sku)}">加购物车</button></div></td>`).join("")}</tr>`
            : "";
          return `<div class="lx-cmp-wrap"><table class="lx-cmp-table"><thead><tr><th class="lx-cmp-label">参数</th>${headCells}</tr></thead><tbody>${bodyRows}${actionsRow}</tbody></table><p class="lx-p0-disclaimer">浅紫底纹为差异项，「优」标记为该项最优。参数信息以商品详情页为准。</p></div>`;
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
          // 官方登录态优先（window.__lxMember）；OUR state.user 兜底；都没有则游客
          const offMember = window.__lxMember; // 可能 undefined（fetch 尚未完成）
          const offLogged = offMember && offMember.guest === false; // 官方已登录
          const logged = offLogged || !!state.user;

          // 显示名称：官方登录态用脱敏手机号（159****4903）；OUR 登录态用 nickname/phone；游客显示"游客"
          let name;
          if (offLogged && offMember.loginName) {
            const ln = String(offMember.loginName);
            name = ln.length >= 7 ? ln.slice(0, 3) + "****" + ln.slice(-4) : ln;
          } else if (state.user) {
            name = state.user.nickname || state.user.phone || "会员";
          } else {
            name = "游客";
          }

          // 等级：官方登录态用官方等级名（"金钻会员"）；OUR 登录 = V3；游客 = 0
          // 金钻是最顶级，等级表 lv 用 5（对齐 V5 黑卡槽，全解锁）
          const offLevelName = offLogged ? (offMember.memberLevel || "金钻会员") : "";
          const lv = offLogged ? 5 : (logged ? 3 : 0);

          // 成长值：官方登录态 = 顶级已满（拉满显示）；OUR 登录 = 演示值；游客 = 0
          const growth = offLogged ? 5000 : (logged ? 2480 : 0), nextLv = 5000;

          // Hero 区：官方登录态不显示"登录/注册"按钮，显示等级徽章；成长值拉满或隐藏"距下一级"
          const heroSubtitle = offLogged
            ? `<span style="display:inline-block;background:rgba(255,255,255,.22);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600">${esc(offLevelName)}</span>`
            : (logged ? "V3 金卡 · 注册 365 天" : "注册即得新人 ¥200 礼包");
          const heroBtns = offLogged
            ? `<button class="lx-p0-btn" type="button" data-stu-auth style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">学生认证</button><button class="lx-p0-btn" type="button" data-open-ent style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">企业认证</button>`
            : (logged
              ? `<button class="lx-p0-btn" type="button" data-stu-auth style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">学生认证</button><button class="lx-p0-btn" type="button" data-open-ent style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.4)">企业认证</button>`
              : `<button class="lx-p0-btn" type="button" data-open-login style="background:#fff;color:#4D144A;font-weight:700">立即登录 / 注册</button>`);
          const heroGrowth = offLogged
            ? `<div style="font-size:12px;opacity:.9">金钻会员 · 顶级权益已全部解锁</div><div class="bar"><i style="width:100%"></i></div>`
            : (logged
              ? `<div style="font-size:12px;opacity:.9">距 V4 钻石卡还需 <b style="color:#ffd700">${nextLv - growth}</b> 成长值</div><div class="bar"><i style="width:${Math.round(growth / nextLv * 100)}%"></i></div>`
              : `<div style="font-size:12px;opacity:.9">登录后立享 V1 普卡 · 11 项专属权益</div>`);
          const hero = `<div class="lx-member-hero">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
              <div style="flex:1"><div style="font-size:18px;font-weight:700">${esc(name)}</div><div style="font-size:13px;opacity:.92">${heroSubtitle}</div></div>
              ${heroBtns}
            </div>
            ${heroGrowth}
          </div>`;

          // 4 个数字卡：官方登录态没有实时余额，显示"—"而不是编造数字
          // OUR state.user 登录的旧分支保持演示值；游客全 0
          const assetVal = (offLogged, ourVal, label) => offLogged ? "—" : ourVal;
          const assetsData = [
            ["乐豆", assetVal(offLogged, logged ? 1280 : 0), offLogged ? "" : "1000豆=¥10", "乐豆余额和使用规则"],
            ["优惠券", assetVal(offLogged, logged ? 5 : 0), offLogged ? "" : "张可用", "我的优惠券"],
            ["积分",   assetVal(offLogged, logged ? 860 : 0), offLogged ? "" : "分",   "消费积分规则"],
            ["成长值", assetVal(offLogged, growth),           offLogged ? "" : "/" + nextLv, "成长值如何获得"],
          ];
          const assets = `<div class="lx-member-assets">${assetsData.map((a) => `<div class="cell" data-quick-ask="${esc(a[3])}"><span>${a[0]}</span><b>${a[1]}</b><span>${a[2]}</span></div>`).join("")}</div>`
            + (offLogged ? `<p style="margin:6px 16px 0;font-size:11px;color:var(--lx-text-secondary,#888)">实时乐豆/积分余额以对话中查询为准</p>` : "");

          const sign = logged ? `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>签到与任务</h3><span>连续签到 5 天 · 明日加倍</span><button class="lx-p0-btn" type="button" data-quick-ask="我的任务中心有哪些任务">全部任务</button></div><div class="lx-sign-row">${[1,2,3,4,5,6,7].map((d) => `<div class="lx-sign-day${d <= 5 ? " done" : ""}">第${d}天<br>${d <= 5 ? "✓" : "+" + d * 10 + "豆"}</div>`).join("")}</div></div>` : "";

          // 等级表：官方登录态（金钻=顶级）高亮 V5 行
          const tiers = [["V1 普卡", "登录即得", "基础券包 / 新人礼"], ["V2 银卡", "成长值 1000", "5% 会员价 / 生日礼"], ["V3 金卡", "成长值 2500", "延保 88 折 / 月度券包 / VIP 客服"], ["V4 钻石卡", "成长值 5000", "拯救者/YOGA 专享价 / 优先发货"], ["V5 黑卡", "邀请制", "私人定制 / 酒店权益 / 生活特权"]];
          const tierTable = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>会员等级与权益</h3><button class="lx-p0-btn" type="button" data-quick-ask="会员等级体系和升级规则">规则 FAQ</button></div><table class="lx-tier-table"><thead><tr><th>等级</th><th>升级条件</th><th>核心权益</th></tr></thead><tbody>${tiers.map((t, i) => `<tr${i + 1 === lv ? ' style="background:var(--lx-surface-hover)"' : ""}><td><strong>${t[0]}</strong>${i + 1 === lv ? " ←当前" : ""}</td><td>${t[1]}</td><td>${t[2]}</td></tr>`).join("")}</tbody></table></div>`;

          // 权益宫格：官方金钻=顶级，全部解锁（lv=5 覆盖所有 r[2]<=5），标题显示"金钻会员·全部权益已解锁"
          const rights = [["新人礼包", "¥200 大礼包", 1], ["生日特权", "双倍乐豆+礼包", 1], ["会员价", "专享折扣", 1], ["月度券包", "每月 4 张", 2], ["优先发货", "VIP 优先排单", 2], ["专属客服", "VIP 通道", 3], ["延保 88 折", "会员专享", 3], ["拯救者 9 折", "游戏装备专享", 4], ["YOGA 专享", "设计师礼盒", 4], ["酒店权益", "合作酒店折扣", 5], ["生活特权", "美团/星巴克券", 5]];
          const rightsTitle = offLogged
            ? "金钻会员 · 全部权益已解锁"
            : `会员权益（${rights.filter((r) => r[2] <= lv).length}/11 已解锁）`;
          const rightsGrid = `<div class="lx-floor" style="margin-bottom:16px"><div class="lx-floor-head"><h3>${rightsTitle}</h3></div><div class="lx-rights-grid">${rights.map((r) => `<div class="cell${r[2] > lv ? " locked" : ""}" data-quick-ask="会员权益详情：${esc(r[0])}"><strong>${r[0]}</strong><span>${r[1]} · V${r[2]}+</span></div>`).join("")}</div></div>`;

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

        // 取浏览器真实定位（没有就现场请求一次，弹授权框）；失败返回 null
        function lxRequestGeo(timeoutMs = 8000) {
          if (window.__lxGeo && window.__lxGeo.lat) return Promise.resolve(window.__lxGeo);
          if (!navigator.geolocation) return Promise.resolve(null);
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { window.__lxGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude }; resolve(window.__lxGeo); },
              () => resolve(null),
              { timeout: timeoutMs, maximumAge: 600000 }
            );
          });
        }

        // 门店导航：右侧开地图标签页（百度静态图走服务器代理）+ 「在百度地图打开」做真实导航
        function openStoreMap(latlng, name, addr, tel) {
          const [lat, lng] = String(latlng || "").split(",");
          if (!lat || !lng) return;
          lxRevealContent();
          const baiduUrl = `https://api.map.baidu.com/marker?location=${encodeURIComponent(lat + "," + lng)}&title=${encodeURIComponent(name || "联想门店")}&content=${encodeURIComponent(addr || "")}&output=html&coord_type=bd09ll&src=lexiang`;
          const meta = [addr, tel].filter(Boolean).map(esc).join(" · ");
          lxOpenInfoTab("storemap", "门店导航", `
            <img src="/api/stores/staticmap?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}" alt="门店地图" style="width:100%;border-radius:12px;display:block" loading="lazy" />
            <div class="lx-p0-row" style="margin-top:14px"><div class="lx-p0-row-main"><strong>${esc(name || "门店位置")}</strong><span>${meta}</span></div>${tel ? `<a class="lx-p0-btn" href="tel:${esc(String(tel).replace(/[^0-9,]/g, ""))}">致电</a>` : ""}<button class="lx-p0-btn" type="button" data-quick-ask="预约${esc(name || "该门店")}到店服务">预约</button><a class="lx-p0-btn primary" href="${esc(baiduUrl)}" target="_blank" rel="noopener">导航</a></div>`);
        }

        async function openStoresPanel(address = "北京海淀") {
          lxOpenInfoTab("stores", "附近门店", `<p class="lx-p0-disclaimer">正在获取你的位置、查询附近联想门店...</p>`);
          try {
            // 优先浏览器真实定位（弹授权）；拒绝/不支持再按默认地址 geocode
            const me = await lxRequestGeo();
            let lat, lng, label;
            if (me && me.lat && me.lng) {
              lat = me.lat; lng = me.lng; label = "你当前位置附近";
            } else {
              const geo = await fetch(`/api/stores/geocode?address=${encodeURIComponent(address)}`).then((r) => r.json());
              if (!geo.lat || !geo.lng) throw new Error(geo.error || "无法定位");
              lat = geo.lat; lng = geo.lng; label = geo.name || address;
            }
            const data = await fetch(`/api/stores/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`).then((r) => r.json());
            const stores = data.stores || [];
            // 接口报错或无结果 → 抛到 catch 走备用门店，别给死「暂未查到」（如百度 key IP 校验失败）
            if (!stores.length) throw new Error(data.error || "附近暂无门店");
            lxOpenInfoTab("stores", "附近门店", stores.length ? `
              <div class="lx-p1-strip"><strong>${esc(label)}</strong><div class="lx-p0-disclaimer">可继续预约到店、咨询库存、门店闪送和工程师服务。</div></div>
              ${stores.slice(0, 6).map((store) => {
                const nav = (store.lat && store.lng) ? `<button class="lx-p0-btn" data-store-nav="${esc(store.lat + "," + store.lng)}" data-store-name="${esc(store.name)}" data-store-addr="${esc(store.address || "")}" data-store-tel="${esc(store.tel || "")}">导航</button>` : "";
                return `<div class="lx-p0-row"><div class="lx-p0-row-main"><strong>${esc(store.name)}</strong><span>${esc(store.address || "")} · ${store.dist ? Math.round(store.dist / 100) / 10 + "km" : ""} · ${esc(store.tel || "暂无电话")}</span></div>${nav}<button class="lx-p0-btn" data-quick-ask="预约${esc(store.name)}到店服务">预约</button></div>`;
              }).join("")}
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
        setTimeout(() => { if (lxEntState().status === "pending") lxWatchEntPending(); }, 1500);
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
          // 整条即转化入口：去掉独立「问一下」按钮，点提示文案本身就发起提问（data-quick-ask 走 3589 行委托发送）
          bottom.insertAdjacentHTML("afterbegin", `<div class="lx-hint-bar"><button class="lx-hint-text" type="button" data-quick-ask="${esc(ask)}">${esc(text)}<span class="lx-hint-go" aria-hidden="true">›</span></button><button class="lx-hint-close" type="button" aria-label="关闭">×</button></div>`);
          const bar = bottom.querySelector(".lx-hint-bar");
          bar.querySelector(".lx-hint-close").addEventListener("click", (e) => { e.stopPropagation(); bar.remove(); });
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
            welcome: ["想买游戏本，预算8000怎么选？", "日常办公用，5000内电脑怎么选？", "我都有哪些会员权益？", "公司采购电脑有什么补贴？", "哪里有卖ThinkPad笔记本电脑门店"],
            placeholder: "最近有什么优惠活动？",
            actionbar: ["商品导购", "解决方案", "门店查询", "职场认证", "服务预约"],
            hello: ["找商品", "找门店", "找优惠", "以旧换新", "教育优惠", "找方案"],
          },
          personal: {
            quick: ["我要找商品", "我要找优惠和活动", "我要问国补和教育优惠", "我要以旧换新", "我要查保修和售后", "我要找附近门店"],
            welcome: ["想买游戏本，预算8000怎么选？", "学生买轻薄本，国补和教育优惠能省多少？", "小新和YOGA系列怎么选？", "旧电脑换新能抵多少钱？", "哪里有卖ThinkPad笔记本电脑门店"],
            placeholder: "最近有什么优惠活动？",
            actionbar: ["商品导购", "解决方案", "门店查询", "职场认证", "服务预约"],
            hello: ["找商品", "找门店", "找优惠", "以旧换新", "教育优惠", "找方案"],
          },
          business: {
            quick: ["我要企业批量采购", "我要企业认证享专享价", "我要对公开票和账期", "我要找商用电脑", "我要查售后和上门服务"],
            welcome: ["公司采购50台办公本，怎么拿企业价？", "ThinkBook和ThinkPad办公怎么选？", "企业购能开专票、走账期吗？", "中小企业有什么采购补贴？"],
            placeholder: "公司要配办公电脑，帮我推荐",
            actionbar: ["企业认证", "对公开票", "账期申请", "批量采购", "上门服务", "专属客服"],
            hello: ["企业采购", "专享价", "对公开票", "商用电脑", "上门服务"],
          },
          enterprise: {
            quick: ["我要看行业解决方案", "我要信创合规产品", "我要批量采购报价", "我要对接专属客户经理", "我要查售后服务"],
            welcome: ["信创服务器怎么选型？", "智慧教育解决方案有哪些案例？", "参与政采招投标需要什么资质？", "工作站和服务器怎么搭配？"],
            placeholder: "我们单位要采购信创设备，帮我推荐",
            actionbar: ["信创合规", "解决方案", "招投标支持", "批量报价", "客户经理", "售后服务"],
            hello: ["信创选型", "行业方案", "招投标", "批量报价", "专属经理"],
          },
          brand: {
            quick: ["介绍联想品牌故事", "联想有哪些产品线品牌", "联想的全球实力和地位", "联想在 AI PC 上的布局", "联想的服务保障体系", "联想的 ESG 和社会责任"],
            welcome: ["ThinkPad、小新、拯救者是什么关系？", "联想和其他品牌比优势在哪？", "联想的售后服务靠谱吗？", "联想为什么能做到全球 PC 第一？"],
            placeholder: "想了解联想品牌的什么？",
            actionbar: ["品牌故事", "产品矩阵", "全球实力", "AI PC布局", "服务保障", "ESG责任"],
            hello: ["品牌故事", "产品矩阵", "全球第一", "AI PC", "服务保障"],
          },
        };
        window.__lxSitePrompts = LX_SITE_PROMPTS;

        function lxRenderQuickList() {
          const cfg = LX_SITE_PROMPTS[state.page] || LX_SITE_PROMPTS.home;
          const list = document.querySelector(".quick-list");
          if (list) {
            list.innerHTML = cfg.quick.slice(0, 5).map((text, index) => `<button class="quick-item" type="button"${index === 0 ? " data-start-chat" : ""}><span>${esc(text)}</span><img class="arrow" src="/assets/icons/chevron-right.svg" alt="" /></button>`).join("");
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
              if (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs")) {
                pop.classList.remove("show");
                return;
              }
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
              if (typeof window.lxfdSubmit === "function") {
                window.lxfdSubmit(value);
                textarea.value = "";
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
              } else {
                sendChat(value);
                lxSetAutoFs(true);
              }
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
            const aiMsg = event.target.closest?.(".lx-p0-message.ai, .lx-p0-message.assistant");
            if (aiMsg && !aiMsg.querySelector(":scope > .lx-msg-copy") && (aiMsg.textContent || "").length > 20) {
              if (getComputedStyle(aiMsg).position === "static") aiMsg.style.position = "relative";
              aiMsg.insertAdjacentHTML("beforeend", `<button class="lx-msg-copy" type="button" title="复制回答" aria-label="复制回答">⧉</button>`);
            }
          });
          document.addEventListener("pointerdown", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (!card || event.target.closest("button, a, input, textarea, select, .lx-pick-btn") || event.button !== 0) return;
            lxCancelProductPointerPending();
            lxProductDragPending = { card, clientX: event.clientX, clientY: event.clientY, button: event.button };
            document.addEventListener("pointermove", lxOnProductPointerPendingMove, true);
            document.addEventListener("pointerup", lxCancelProductPointerPending, true);
            document.addEventListener("pointercancel", lxCancelProductPointerPending, true);
          }, true);
          document.addEventListener("dragstart", (event) => {
            if (lxProductDrag) { event.preventDefault(); return; }
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
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (!card || card.contains(event.relatedTarget)) return;
            startHoverPromptTimer(card);
          });

          document.addEventListener("mouseout", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (!card || card.contains(event.relatedTarget)) return;
            if (state.hoverPromptTimer) window.clearTimeout(state.hoverPromptTimer);
            state.hoverPromptTimer = null;
            if (state.hoverPromptVisibleSku) scheduleHoverPromptAutoClose(4000);
            else state.hoverPromptSku = "";
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
              if (event.isTrusted) {
                event.preventDefault();
                event.stopImmediatePropagation();
                hardNavigatePage(page);
                return;
              }
              if (PATH_BY_PAGE[page]) history.pushState(null, "", PATH_BY_PAGE[page]);
              if (state.page !== page) state.activeSiteFloorTab = "推荐";
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

            const catMoreBtn = event.target.closest("[data-cat-more]");
            if (catMoreBtn) {
              catMoreBtn.parentElement.classList.toggle("open");
              return;
            }
            else document.querySelectorAll(".cat-more-wrap.open").forEach((node) => node.classList.remove("open"));

            const catTab = event.target.closest(".category-tabs button:not([data-cat-more])");
            if (catTab) {
              event.preventDefault();
              const label = catTab.dataset.catLabel || catTab.textContent.trim();
              state.activeSiteFloorTab = label;
              document.querySelectorAll(".category-tabs button:not([data-cat-more])").forEach((btn) => {
                btn.classList.toggle("active", (btn.dataset.catLabel || btn.textContent.trim()) === label);
              });
              const contentBox = document.querySelector(".content");
              contentBox?.scrollTo({ top: 0, behavior: "smooth" });
              lxRenderSiteFloors();
              return;
            }

            const heroBtn = event.target.closest(".hero-btn");
            if (heroBtn) {
              event.preventDefault();
              const kicker = document.querySelector("[data-page-kicker]")?.textContent || "";
              const title = document.querySelector("[data-page-title]")?.textContent || "";
              const bannerText = kicker + " " + title;
              const bannerMap = [
                {
                  patterns: [/拯救者|LEGION|游戏|GPU|RTX/i],
                  tab: "今日秒杀",
                  highlights: [
                    "本期秒杀有拯救者游戏本，限时折扣力度超大",
                    "RTX 40系显卡配置，游戏和创作两不误",
                    "搭配国补政策最高再省20%，到手价更低",
                    "库存有限，想要赶快和我说，马上帮你锁单"
                  ]
                },
                {
                  patterns: [/国补|补贴|以旧换新/i],
                  tab: "国补",
                  highlights: [
                    "国家以旧换新补贴最高20%，北京/上海等多城市参与",
                    "联想全系参与国补的机型均可叠加教育特惠",
                    "旧机回收估价+国补双重减免，换新成本大幅降低",
                    "名额有限，点我告诉你符合条件的最优惠机型"
                  ]
                },
                {
                  patterns: [/小新|轻薄|YOGA|AIR/i],
                  tab: "今日秒杀",
                  highlights: [
                    "小新/YOGA系列轻薄本今日秒杀专区已上线",
                    "最轻至1.1kg机型，出行和办公都不压手",
                    "2.5K高刷屏标配，护眼又清晰",
                    "秒杀数量有限，想了解哪款直接告诉我"
                  ]
                }
              ];
              const matched = bannerMap.find(({ patterns }) => patterns.some((p) => p.test(bannerText)));
              const targetTab = matched?.tab || "今日秒杀";
              const highlights = matched?.highlights || [
                "当前活动优惠力度超大，多款机型参与",
                "可与国补、教育特惠叠加享受",
                "限时限量，先到先得",
                "直接告诉我你的需求，我帮你找最合适的方案"
              ];
              if (["personal", "business", "enterprise"].includes(state.page)) {
                state.activeSiteFloorTab = targetTab;
                document.querySelectorAll(".category-tabs button:not([data-cat-more])").forEach((btn) => {
                  btn.classList.toggle("active", (btn.dataset.catLabel || btn.textContent.trim()) === targetTab);
                });
                const contentBox = document.querySelector(".content");
                contentBox?.scrollTo({ top: 0, behavior: "smooth" });
                lxRenderSiteFloors();
              }
              const bulletHtml = highlights.map((h) => `<div class="lx-discover-review-item" data-quick-ask="${esc(h)}" tabindex="0" style="cursor:pointer"><span>${esc(h)}</span></div>`).join("");
              const quickLinks = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="lx-p0-btn primary" type="button" data-quick-ask="帮我了解当前活动详情和最优惠方案">咨询详情</button><button class="lx-p0-btn" type="button" data-quick-ask="当前活动有哪些优惠可以叠加使用">叠加优惠</button></div>`;
              const disclaimer = `<p class="lx-p0-disclaimer" style="margin-top:8px">以上内容由 AI 生成，仅供参考，实际以联想官网为准。</p>`;
              addMessage("assistant", `「${targetTab}」活动亮点：`, bulletHtml + quickLinks + disclaimer);
              return;
            }

            const suggestItem = event.target.closest("[data-suggest-pick]");
            if (suggestItem) { lxApplySuggest(Number(suggestItem.dataset.suggestPick)); return; }
            if (!event.target.closest(".lx-suggest-panel") && !event.target.closest(".composer textarea") && !event.target.closest(".hero-composer textarea")) lxHideSuggest();

            const navBtn = event.target.closest("[data-store-nav]");
            if (navBtn) { event.stopPropagation(); openStoreMap(navBtn.dataset.storeNav, navBtn.dataset.storeName, navBtn.dataset.storeAddr, navBtn.dataset.storeTel); return; }

            const pickBtn = event.target.closest("[data-pick-sku]");
            if (pickBtn) {
              event.stopPropagation();
              const pickSku = pickBtn.dataset.pickSku;
              const alreadyPicked = Array.isArray(state.refProducts) && state.refProducts.some(p => p.sku === pickSku);
              if (alreadyPicked) {
                // toggle off：从 refProducts 移除
                state.refProducts = state.refProducts.filter(p => p.sku !== pickSku);
                pickBtn.classList.remove("picked");
                const comp = document.querySelector(".composer");
                const a = comp?.querySelector(":scope > .attach");
                const t = comp?.querySelector("textarea");
                const s = comp?.querySelector(".send-btn");
                lxRenderRefChips(comp, a, t, s);
              } else {
                lxSetProductRef(pickSku, pickBtn.closest(LX_PICK_CARD_SEL));
              }
              return;
            }

            const copyBtn = event.target.closest(".lx-msg-copy");
            if (copyBtn) {
              const msg = copyBtn.closest(".lx-p0-message");
              const text = (msg?.textContent || "").replace(/⧉/g, "").trim();
              navigator.clipboard?.writeText(text).then(() => { copyBtn.textContent = "✓"; setTimeout(() => { copyBtn.textContent = "⧉"; }, 1200); });
              return;
            }

            const cmpLocal = event.target.closest("[data-cmp-local]");
            if (cmpLocal) {
              const skus = cmpLocal.dataset.cmpLocal.split(",").filter(Boolean);
              if (skus.length >= 2) lxUpsertCompareTab(skus.map((sku) => ({ sku })), "推荐商品对比");
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
              const text = (quick.querySelector("span")?.textContent || quick.textContent).trim();
              if (quick.classList.contains("hero-suggestion") || quick.classList.contains("fullscreen-prompt") || quick.classList.contains("lxfd-chip-q")) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (text && typeof window.lxfdSubmit === "function") window.lxfdSubmit(text);
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

            const card = event.target.closest(".product-card, .lx-floor-product");
            const cardSku = card?.dataset.sku || card?.dataset.openProduct;
            if (cardSku) {
              event.preventDefault();
              event.stopImmediatePropagation();
              if (lxSuppressProductClick) return;
              clearHoverPromptTimer();
              hideHoverPrompts();
              const cardOfficialObj = (state.officialProducts || {})[cardSku];
              openProduct(cardOfficialObj || cardSku);
              return;
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
            if (event.target.closest(".lx-p0-detail-similar")) lxFindSimilarViaChat();
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
            if (openSku) {
              event.preventDefault();
              event.stopPropagation();
              closeModal();
              // 官方商品对象优先（避免 fetch 官方 sku 404），其次走普通路径
              const officialObj = (state.officialProducts || {})[openSku];
              openProduct(officialObj || openSku);
              return;
            }

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
              if (product) oneClickBuy(product);
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
            const orderDetailBtn = event.target.closest("[data-order-detail]");
            if (orderDetailBtn) { openOrderDetail(orderDetailBtn.dataset.orderDetail); return; }
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
            if (officialUrl) {
              const u = officialUrl + (officialUrl.includes("?") ? "&" : "?") + `utm_source=leaibot&utm_medium=lexiang_poc&utm_campaign=${encodeURIComponent(API_SITE[state.page] || "default")}`;
              window.open(u, "_blank", "noopener");
            }

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
            const moreBtn = event.target.closest("[data-floor-more]");
            if (moreBtn) {
              const sec = moreBtn.closest("[data-floor-collapsible]");
              const grid = sec?.querySelector(".lx-floor-products");
              if (sec && grid) {
                const cards = [...grid.querySelectorAll(".lx-floor-product")];
                const collapsed = cards.some((c) => c.hidden);
                if (collapsed) {
                  cards.forEach((c) => { c.hidden = false; });
                  sec.dataset.expanded = "1";
                  moreBtn.innerHTML = `收起<i aria-hidden="true">▴</i>`;
                } else {
                  sec.dataset.expanded = "";
                  lxClampFloors(sec.parentElement || document); // 重新夹回两排
                }
              }
            }

            // 换一换：品类楼层刷新下一批 8 个商品
            const shuffleBtn = event.target.closest("[data-cat-shuffle]");
            if (shuffleBtn && !shuffleBtn.disabled) {
              const catKey = shuffleBtn.dataset.catShuffle;
              const floorLabel = shuffleBtn.dataset.floorLabel;
              const floorDef = LX_PERSONAL_CATEGORY_FLOORS.find((f) => f.label === floorLabel);
              if (floorDef && catKey) {
                const pool = floorDef.categories.flatMap((c) => state.catPool?.[c] || []);
                const seen = new Set();
                const uniq = pool.filter((p) => { const k = lxProductKey(p); if (seen.has(k)) return false; seen.add(k); return true; });
                const items = uniq.filter(floorDef.filter);
                if (items.length > 0) {
                  if (!state.catFloorOffset) state.catFloorOffset = {};
                  const n = 12; // 渲染 12 个，渲染后按真实列数夹两排（与初次渲染一致）
                  const cur = state.catFloorOffset[catKey] || 0;
                  const next = (cur + n) % items.length;
                  state.catFloorOffset[catKey] = next;
                  const batch = [];
                  for (let i = 0; i < n && i < items.length; i++) {
                    batch.push(items[(next + i) % items.length]);
                  }
                  const grid = shuffleBtn.closest("[data-cat-floor-key]")?.querySelector("[data-cat-floor-grid]");
                  if (grid) {
                    grid.innerHTML = batch.map(lxProductMiniCard).join("");
                    shuffleBtn.disabled = items.length <= n;
                    requestAnimationFrame(() => lxClampCatFloors(grid.closest(".lx-cat-floor")));
                  }
                }
              }
            }
            const floorAction = event.target.closest("[data-floor-action]")?.dataset.floorAction;
            if (floorAction === "stores") openStoresPanel();
            else if (floorAction === "service") openServicePanel();
            else if (floorAction === "member") openMemberCenter();
            else if (floorAction === "coupon") openCouponCenter();
            else if (floorAction === "lead") openLeadPanel(state.page === "enterprise" ? "biz_intent" : "b_purchase");
            if (event.target.closest("[data-human-on]")) lxSetHumanMode(true);
            if (event.target.closest("[data-human-off]")) lxSetHumanMode(false);
            if (event.target.closest("[data-cs-upload]")) { openUploadControls(); $("#lxP1ImageInput")?.click(); }
            if (event.target.closest("[data-stu-auth]")) openStudentAuth();
            const _stuAuthEl = event.target.closest("[data-open-stuauth]");
            if (_stuAuthEl) openStudentAuth(_stuAuthEl.dataset.openStuauth);
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
                lxWatchEntPending();
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
            if (event.target.closest("[data-open-wpa]")) openWorkplaceAuth();
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
        window.openWorkplaceAuth = openWorkplaceAuth;
        window.__lxSetHuman = lxSetHumanMode;
        window.__lxOpenFeature = function(op) {
          if (op === 'member') openMemberCenter();
          else if (op === 'coupon') openCouponCenter();
          else if (op === 'solution') openSolutionCenter();
          else if (op === 'edu') openEduZone();
          else if (op === 'stores') openStoresPanel();
        };
        // 页面操作桥接（全屏 lxfd 收到 control 事件后桥接到主面板执行，如关标签/回首页）
        window.__lxExecControl = function(op, target) { lxExecControl(op, target); };

        openUploadControls();
        setupSelectionAsk();
        bindEvents();
        updateBadges();
        checkAuth();
        initRoute();
        window.addEventListener("popstate", initRoute);
      })();

// Lexiang fullscreen dialog replacement behavior
(function(){
  "use strict";
  if (window.__lxfdInstalled) return;
  window.__lxfdInstalled = true;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = $(".lxfd");
  if (!root) return;

  const navCluster = $("#lxfdNavCluster");
  const convoPill = $("#lxfdConvoPill");
  const convoName = $("#lxfdConvoName");
  const rail = $("#lxfdRail");
  const railFab = $("#lxfdRailFab");
  const railNewFab = $("#lxfdRailNewFab");
  const scrim = $("#lxfdScrim");
  const stage = $("#lxfdStage");
  const welcome = $("#lxfdWelcome");
  const thread = $("#lxfdThread");
  const ta = $("#lxfdTa");
  const send = $("#lxfdSend");
  const chips = $("#lxfdChips");
  const quick = $("#lxfdQuick");
  const turnIndex = $("#lxfdTurnIndex");
  const turnDots = $("#lxfdTurnDots");
  const turnList = $("#lxfdTurnList");
  const helloTitle = $("#lxfdHelloTitle");
  const isWindowsRuntime = (() => {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const ua = navigator.userAgent || "";
    return /Win/i.test(platform) || /Windows/i.test(ua);
  })();
  const forceFullscreenMotion = isWindowsRuntime;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches && !forceFullscreenMotion;
  document.body.classList.toggle("lxfd-force-motion", forceFullscreenMotion);
  let hoverTimer = null;
  let turns = [];
  let helloIndex = 0;
  let helloAnimating = false;
  let helloTimer = null;
  let railManuallyCollapsed = true;
  const chatState = { convId: null, sending: false, conversationNonce: 0, localId: null };
  const navPaths = { home: "/", personal: "/shop-chat/", business: "/b-chat/", enterprise: "/biz-chat/", brand: "/brand/" };
  const LXFD_DEFAULT_HELLO_WORDS = ["找商品", "找门店", "找服务", "职场认证", "教育优惠", "找解决方案"];
  let helloWords = LXFD_DEFAULT_HELLO_WORDS.slice();
  const questions = ["想买游戏本，预算8000怎么选？", "学生买轻薄本，国补和教育优惠能省多少？", "小新和YOGA系列怎么选？", "旧电脑换新能抵多少钱？", "哪里有卖ThinkPad笔记本电脑门店"];
  const quicks = ["教育特惠", "以旧换新", "乐豆商城", "0元试用", "私人订制", "会员中心", "拉新返利"];
  const arrow = '<span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  // actionbar 按钮 label → 有意义的 query 示例（避免直接发 label 体验差）
  const LXFD_ACTION_Q = {
    "商品导购": "帮我推荐一款适合我的笔记本电脑",
    "解决方案": "我想了解适合企业的行业解决方案",
    "门店查询": "帮我查询附近的联想门店",
    "职场认证": "职场人群认证怎么做，能享哪些专属优惠？",
    "服务预约": "我想预约售后维修或上门服务",
    "我的订单": "帮我查最近的订单状态和物流",
    "售后服务": "我的设备保修和售后服务怎么办理？",
    "评价服务": "给本次客服服务打个五星好评",
    "需求清单": "我整理一份采购需求清单发你确认",
  };
  const answer = '<p>我是联想官方AI助手，主要可以帮您完成以下事情：</p>'
    + '<h4>产品选购</h4><ul><li>推荐最适合的联想产品&lt;笔记本、台式机、平板、手机、配件等&gt;</li><li>产品参数对比、性价比分析</li></ul>'
    + '<h4>优惠查询</h4><ul><li>最新优惠政策:国补、教育优惠、企业补贴、学生价等</li><li>计算到手价、叠加各种优惠</li><li>推荐最适合您身份的优惠券</li></ul>'
    + '<h4>服务支持</h4><ul><li>查询保修状态、推荐延保方案</li><li>售后流程:退换货、维修、清洁保养、以旧换新估价</li><li>服务站地址和技术支持联系方式</li></ul>'
    + '<h4>订单辅助</h4><ul><li>处理订单、发货物流、发票等</li><li>会员权益、乐豆积分的使用</li></ul>'
    + '<p>有什么具体需求，随时可以和我说~</p>'
    + '<div class="lxfd-followups"><button type="button">可以推荐适合学生的笔记本吗？</button><button type="button">怎么查询我的产品保修状态？</button><button type="button">现在有哪些可以叠加的优惠政策？</button></div>'
    + '<p class="lxfd-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</p>';

  function escapeHtml(text) { return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function escapeAttr(text) { return escapeHtml(text).replace(/`/g, "&#96;"); }
  function lxfdDetectPage() {
    const path = location.pathname;
    for (const [page, p] of Object.entries(navPaths)) {
      if (path === p || path === p.replace(/\/$/, "") || path.startsWith(p === "/" ? "/_" : p)) {
        if (p !== "/" || path === "/") return page;
      }
    }
    // 精确匹配
    for (const [page, p] of Object.entries(navPaths)) {
      const normalized = p.endsWith("/") ? p : p + "/";
      const pathNorm = path.endsWith("/") ? path : path + "/";
      if (pathNorm === normalized) return page;
    }
    return "home";
  }
  function lxfdApplySite() {
    const prompts = window.__lxSitePrompts;
    if (!prompts) {
      // 兜底：用写死默认值渲染
      if (chips) chips.innerHTML = questions.map((q, i) => `<button class="lxfd-chip-q anim-rise" style="animation-delay:${0.3 + i * 0.07}s" type="button" data-q="${escapeAttr(q)}">${escapeHtml(q)}${arrow}</button>`).join("");
      if (quick) quick.innerHTML = quicks.map((q) => `<button type="button">${escapeHtml(q)}</button>`).join("");
      return;
    }
    const page = (window.__lxState && window.__lxState.page) || lxfdDetectPage();
    const cfg = prompts[page] || prompts.home;
    if (!cfg) return;
    // 欢迎 chips
    const welcomeList = cfg.welcome || questions;
    if (chips) chips.innerHTML = welcomeList.map((q, i) => `<button class="lxfd-chip-q anim-rise" style="animation-delay:${0.3 + i * 0.07}s" type="button" data-q="${escapeAttr(q)}">${escapeHtml(q)}${arrow}</button>`).join("");
    // 底部 actionbar
    const actionbarList = cfg.actionbar || quicks;
    if (quick) quick.innerHTML = actionbarList.map((q) => `<button type="button">${escapeHtml(q)}</button>`).join("");
    // 滚动标题词固定使用默认词组，不随频道话术重新读取。
    helloWords = LXFD_DEFAULT_HELLO_WORDS.slice();
    helloIndex = helloIndex % helloWords.length;
    // 输入框 placeholder
    if (ta && cfg.placeholder) ta.placeholder = cfg.placeholder;
  }
  lxfdApplySite();
  function shortText(text, max) { return text.length > max ? text.slice(0, max) + "…" : text; }

  // ── 能力 B：localStorage 多会话历史 ──────────────────────────────────────
  function lxfdLoadStore() { try { return JSON.parse(localStorage.getItem("lexiang.lxfd.convs.v1") || "[]"); } catch (_) { return []; } }
  function lxfdSaveStore(a) { try { localStorage.setItem("lexiang.lxfd.convs.v1", JSON.stringify(a.slice(0, 20))); } catch (_) {} }
  function lxfdNewLocalConv() { chatState.localId = "lc" + Date.now() + Math.random().toString(36).slice(2, 6); }
  function lxfdPersistCurrent() {
    if (!thread || !thread.children.length) return;
    if (!chatState.localId) lxfdNewLocalConv();
    const firstUser = thread.querySelector(".lxfd-msg-user");
    const title = (firstUser ? firstUser.textContent : "新对话").trim().slice(0, 24) || "新对话";
    const store = lxfdLoadStore().filter(c => c.id !== chatState.localId);
    store.unshift({ id: chatState.localId, title, convId: chatState.convId || null, threadHtml: thread.innerHTML, ts: Date.now() });
    lxfdSaveStore(store);
  }
  function lxfdRenderHist() {
    const store = lxfdLoadStore();
    const hist = $("#lxfdHist");
    if (!hist) return;
    if (!store.length) { hist.innerHTML = '<div class="lxfd-hist-empty" style="padding:12px;color:#9a93a6;font-size:12px;">还没有历史对话</div>'; return; }
    hist.innerHTML = store.map(c => '<a href="#" data-conv="' + escapeAttr(c.id) + '" class="' + (c.id === chatState.localId ? "active" : "") + '" title="' + escapeAttr(c.title) + '">' + escapeHtml(c.title) + '</a>').join("");
  }
  function lxfdLoadConv(id) {
    const c = lxfdLoadStore().find(x => x.id === id);
    if (!c) return;
    lxfdPersistCurrent();
    chatState.localId = c.id;
    chatState.convId = c.convId || null;
    chatState.conversationNonce += 1;
    if (thread) { thread.innerHTML = c.threadHtml; thread.classList.add("show"); }
    if (welcome) welcome.style.display = "none";
    lxfdSetGalleryChatting(true);
    if (convoName) { convoName.textContent = shortText(c.title, 15); convoName.title = c.title; }
    turns = [];
    renderTurnIndex("");
    lxfdRenderHist();
  }

  // ── 能力 A：从主面板导入已有对话 ─────────────────────────────────────────
  function lxfdMainGenerating() {
    // 主面板是否仍在流式生成（state.sending 或最后一条 AI 消息里还挂着生成骨架）
    return !!((window.__lxState && window.__lxState.sending) ||
      document.querySelector(".lx-p0-messages > .lx-p0-message.ai .lx-generating"));
  }
  function lxfdDoImport() {
    const msgs = document.querySelectorAll(".lx-p0-messages > .lx-p0-message");
    if (!msgs.length) return false;
    thread.innerHTML = "";
    turns = [];
    msgs.forEach(function(el) {
      const isUser = el.classList.contains("user");
      if (isUser) {
        const text = el.textContent.trim();
        const turnId = "turn-" + Date.now() + "-" + turns.length;
        thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-user" id="' + turnId + '">' + escapeHtml(text) + '</div>');
        turns.push({ id: turnId, text: text });
      } else {
        thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body">' + el.innerHTML + '</div></div>');
      }
    });
    renderTurnIndex("");
    chatState.convId = (window.__lxState && window.__lxState.convId) || null;
    if (welcome) welcome.style.display = "none";
    thread.classList.add("show");
    chatState.started = true;
    lxfdSetGalleryChatting(true);
    if (quick) quick.style.display = "none";
    const lastUser = thread.querySelector(".lxfd-msg-user:last-of-type");
    const titleText = lastUser ? lastUser.textContent.trim() : "导入的对话";
    if (convoName) { convoName.textContent = shortText(titleText, 15); convoName.title = titleText; }
    lxfdNewLocalConv();
    lxfdPersistCurrent();
    lxfdRenderHist();
    return true;
  }
  function lxfdImportFromMain() {
    const msgs = document.querySelectorAll(".lx-p0-messages > .lx-p0-message");
    if (!msgs.length) return false;
    const generating = lxfdMainGenerating();
    // 先把当前所有消息（含那条还在生成、内容只有一半的 AI）原样克隆过来——带一半过来
    lxfdDoImport();
    if (generating) {
      // 主面板仍在流式输出：实时把最后一条 AI 消息镜像到全屏，主面板每蹦一段、全屏跟着更新，
      // 直到生成结束——边进边继续往外输出，不再干等（流式 SSE 只发给主面板 DOM，这里做镜像）。
      const aiNodes = Array.prototype.slice.call(document.querySelectorAll(".lx-p0-messages > .lx-p0-message.ai"));
      const mainAi = aiNodes[aiNodes.length - 1];
      const fsBodies = thread.querySelectorAll(".lxfd-msg-ai .lxfd-ai-body");
      const fsAiBody = fsBodies[fsBodies.length - 1];
      if (mainAi && fsAiBody) {
        let tries = 0;
        const iv = setInterval(function() {
          tries++;
          fsAiBody.innerHTML = mainAi.innerHTML;          // 镜像最新流式内容
          thread.scrollTop = thread.scrollHeight;
          if (!lxfdMainGenerating() || tries > 400) {     // 60s 上限兜底
            clearInterval(iv);
            fsAiBody.innerHTML = mainAi.innerHTML;          // 收尾再同步最终一帧
            lxfdPersistCurrent();
            lxfdRenderHist();
          }
        }, 150);
      }
    }
    return true;
  }
  // ── 能力 C：把 lxfd 当前对话导出到主面板 ──────────────────────────────────
  function lxfdExportToMain() {
    if (!thread || !window.__lxBridge) return;
    const messages = [];
    thread.querySelectorAll(".lxfd-msg-user, .lxfd-msg-ai").forEach(function(el) {
      if (el.classList.contains("lxfd-msg-user")) {
        messages.push({ role: "user", text: el.textContent.trim(), html: "" });
      } else {
        const body = el.querySelector(".lxfd-ai-body");
        let html;
        if (body) {
          // 剥掉 lxfd 专属的商品卡/追问/免责（它们样式限定在 .assistant-fullscreen，搬出全屏后图片会失去约束变巨图）；
          // 商品已在右侧 reco 页正常展示，左侧对话只保留文字答案
          const clone = body.cloneNode(true);
          clone.querySelectorAll(".lxfd-products, .lxfd-followups, .lxfd-disclaimer").forEach(function(n) { n.remove(); });
          html = clone.innerHTML;
        } else {
          html = el.innerHTML;
        }
        messages.push({ role: "ai", text: "", html: html });
      }
    });
    if (!messages.length) return;
    window.__lxBridge.importConversation(messages, chatState.convId);
  }
  function parseJson(data) {
    try { return JSON.parse(data); } catch (_) { return {}; }
  }
  function money(value) {
    const n = Number(value || 0);
    return n ? "¥" + n.toLocaleString("zh-CN") : "咨询价";
  }
  function imgUrl(src) {
    const value = String(src || "").trim();
    if (!value) return "/assets/product-placeholder.svg";
    return value.startsWith("http") || value.startsWith("/") ? value : "/" + value;
  }
  function mdLite(text) {
    const src = String(text || "").replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]*_\._[ \t]*/g, " ");
    let html = escapeHtml(src);
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?:^|\n)####?\s*(.+)/g, "\n<h4>$1</h4>");
    html = html.replace(/(?:^|\n)-\s+(.+)/g, "\n<ul><li>$1</li></ul>");
    html = html.replace(/<\/ul>\s*<ul>/g, "");
    return html.split(/\n{2,}/).map((block) => {
      const clean = block.trim();
      if (!clean) return "";
      if (/^<(h4|ul)/.test(clean)) return clean;
      return `<p>${clean.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }
  async function readSse(response, handlers) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\n\n/);
      buffer = blocks.pop() || "";
      blocks.forEach((block) => {
        let event = "message";
        const data = [];
        block.split(/\n/).forEach((line) => {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        });
        const payload = data.join("\n");
        if (payload && handlers[event]) handlers[event](payload);
      });
    }
    if (buffer.trim()) {
      let event = "message";
      const data = [];
      buffer.split(/\n/).forEach((line) => {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      });
      const payload = data.join("\n");
      if (payload && handlers[event]) handlers[event](payload);
    }
  }
  function wide() { return window.innerWidth >= 1280; }
  function finishMotionClass(name, delay = 520) {
    window.setTimeout(() => document.body.classList.remove(name), reduceMotion ? 0 : delay);
  }
  function runMotionPanel(layer) {
    if (!layer) return;
    const runCssMotion = () => {
      if (forceFullscreenMotion) {
        layer.getBoundingClientRect();
        requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("run")));
      } else {
        requestAnimationFrame(() => layer.classList.add("run"));
      }
    };
    // Windows 11 + Chromium 149 may skip the left/top/size transition when the
    // fullscreen layer is inserted and the body class changes in the same frame.
    // Drive that environment with WAAPI, while leaving the existing CSS path
    // untouched for systems where the original animation already works.
    if (!forceFullscreenMotion || typeof layer.animate !== "function") {
      runCssMotion();
      return;
    }
    const isExit = layer.classList.contains("lxfd-motion-panel-exit");
    const ease = "cubic-bezier(.22,.61,.36,1)";
    const start = layer.getBoundingClientRect();
    const toPx = (value, fallback) => {
      const n = parseFloat(String(value || ""));
      return Number.isFinite(n) ? n : fallback;
    };
    const target = isExit
      ? {
          left: toPx(layer.style.getPropertyValue("--lxfd-target-left"), start.left),
          top: toPx(layer.style.getPropertyValue("--lxfd-target-top"), start.top),
          width: toPx(layer.style.getPropertyValue("--lxfd-target-width"), start.width),
          height: toPx(layer.style.getPropertyValue("--lxfd-target-height"), start.height),
          radius: 8,
          opacity: 0,
      }
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, radius: 0, opacity: 0 };
    if (isExit) {
      const scaleX = target.width > 0 && start.width > 0 ? target.width / start.width : 1;
      const scaleY = target.height > 0 && start.height > 0 ? target.height / start.height : 1;
      const moveX = target.left - start.left;
      const moveY = target.top - start.top;
      layer.style.transformOrigin = "top left";
      layer.style.backfaceVisibility = "hidden";
      layer.style.transform = "translate3d(0,0,0) scale(1,1)";
      const first = {
        transform: "translate3d(0,0,0) scale(1,1)",
        borderRadius: "0px",
        opacity: "1",
      };
      const last = {
        transform: `translate3d(${moveX}px,${moveY}px,0) scale(${scaleX},${scaleY})`,
        borderRadius: `${target.radius}px`,
        opacity: `${target.opacity}`,
      };
      const anim = layer.animate([
        first,
        { ...first, offset: 0.08 },
        { ...last, opacity: "1", offset: 0.72 },
        last
      ], { duration: 720, easing: ease, fill: "forwards" });
      anim.addEventListener("finish", () => {
        layer.style.left = `${target.left}px`;
        layer.style.top = `${target.top}px`;
        layer.style.width = `${target.width}px`;
        layer.style.height = `${target.height}px`;
        layer.style.borderRadius = `${target.radius}px`;
        layer.style.opacity = `${target.opacity}`;
        layer.style.transform = "translate3d(0,0,0) scale(1,1)";
        layer.classList.add("run");
      }, { once: true });
      return;
    }
    const first = {
      left: `${start.left}px`,
      top: `${start.top}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      borderRadius: isExit ? "0px" : "8px",
      opacity: "1",
    };
    const hold = { ...first, offset: isExit ? 0.72 : 0.67 };
    const last = {
      left: `${target.left}px`,
      top: `${target.top}px`,
      width: `${target.width}px`,
      height: `${target.height}px`,
      borderRadius: `${target.radius}px`,
      opacity: `${target.opacity}`,
    };
    const anim = layer.animate([first, hold, last], { duration: 720, easing: ease, fill: "forwards" });
    anim.addEventListener("finish", () => {
      Object.assign(layer.style, last);
      layer.classList.add("run");
    }, { once: true });
  }
  function createPanelStretchLayer() {
    const source = document.querySelector(".assistant-panel");
    if (!source || reduceMotion) return null;
    const rect = source.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel";
    layer.setAttribute("aria-hidden", "true");
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    runMotionPanel(layer);
    return layer;
  }
  function getSplitPanelRect() {
    const wasFullscreen = document.body.classList.contains("assistant-fullscreen");
    if (wasFullscreen) setFullscreen(false);
    const source = document.querySelector(".assistant-panel");
    const rect = source?.getBoundingClientRect();
    if (wasFullscreen) setFullscreen(true);
    if (!rect || !rect.width || !rect.height) return null;
    return rect;
  }
  function createFullscreenShrinkLayer(targetRect) {
    const source = document.querySelector(".lxfd");
    if (!source || !targetRect || reduceMotion) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel lxfd-motion-panel-exit";
    layer.setAttribute("aria-hidden", "true");
    layer.style.setProperty("--lxfd-target-left", `${targetRect.left}px`);
    layer.style.setProperty("--lxfd-target-top", `${targetRect.top}px`);
    layer.style.setProperty("--lxfd-target-width", `${targetRect.width}px`);
    layer.style.setProperty("--lxfd-target-height", `${targetRect.height}px`);
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    runMotionPanel(layer);
    return layer;
  }
  function createFullscreenExitLayer() {
    const source = document.querySelector(".lxfd");
    if (!source || reduceMotion) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel lxfd-motion-panel-exit";
    layer.setAttribute("aria-hidden", "true");
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    return layer;
  }
  function setFullscreenExitLayerTarget(layer, targetRect) {
    if (!layer || !targetRect || !targetRect.width || !targetRect.height) return false;
    layer.style.setProperty("--lxfd-target-left", `${targetRect.left}px`);
    layer.style.setProperty("--lxfd-target-top", `${targetRect.top}px`);
    layer.style.setProperty("--lxfd-target-width", `${targetRect.width}px`);
    layer.style.setProperty("--lxfd-target-height", `${targetRect.height}px`);
    runMotionPanel(layer);
    return true;
  }
  function enterFullscreen() {
    lxfdApplySite();
    if (thread && !thread.children.length) lxfdImportFromMain();
    const motionLayer = createPanelStretchLayer();
    document.body.classList.remove("lxfd-exiting");
    document.body.classList.remove("lxfd-split-returning");
    document.body.classList.add("lxfd-entering");
    document.body.classList.add("lxfd-split-entered");
    setFullscreen(true);
    window.setTimeout(() => motionLayer?.remove(), reduceMotion ? 0 : 760);
    finishMotionClass("lxfd-entering", 760);
  }
  function exitFullscreen(afterExit) {
    const onAfterExit = typeof afterExit === "function" ? afterExit : null;
    if (!document.body.classList.contains("assistant-fullscreen") && !document.body.classList.contains("lx-auto-fs")) {
      onAfterExit?.();
      return;
    }
    const targetRect = getSplitPanelRect();
    const motionLayer = createFullscreenShrinkLayer(targetRect);
    document.body.classList.remove("lxfd-entering");
    document.body.classList.add("lxfd-exiting");
    setFullscreen(false);
    try { window.__lxBridge?.exitFullscreen?.(); } catch {}
    document.body.dataset.state = thread?.classList.contains("show") ? "chat" : "default";
    if (onAfterExit) requestAnimationFrame(onAfterExit);
    window.setTimeout(() => document.body.classList.add("lxfd-split-returning"), reduceMotion ? 0 : 320);
    window.setTimeout(() => {
      document.body.classList.remove("lxfd-exiting");
      document.body.classList.remove("lxfd-split-returning");
      motionLayer?.remove();
    }, reduceMotion ? 0 : 760);
  }
  function exitFullscreenWithReveal(afterReveal) {
    const onAfterReveal = typeof afterReveal === "function" ? afterReveal : null;
    if (!document.body.classList.contains("assistant-fullscreen") && !document.body.classList.contains("lx-auto-fs")) {
      onAfterReveal?.();
      return;
    }
    const motionLayer = createFullscreenExitLayer();
    document.body.classList.remove("lxfd-entering");
    document.body.classList.add("lxfd-exiting");
    setFullscreen(false);
    try { window.__lxBridge?.exitFullscreen?.(); } catch {}
    document.body.dataset.state = thread?.classList.contains("show") ? "chat" : "default";
    onAfterReveal?.();
    requestAnimationFrame(() => {
      const rect = document.querySelector(".assistant-panel")?.getBoundingClientRect();
      if (!setFullscreenExitLayerTarget(motionLayer, rect)) motionLayer?.remove();
    });
    window.setTimeout(() => document.body.classList.add("lxfd-split-returning"), reduceMotion ? 0 : 320);
    window.setTimeout(() => {
      document.body.classList.remove("lxfd-exiting");
      document.body.classList.remove("lxfd-split-returning");
      motionLayer?.remove();
    }, reduceMotion ? 0 : 760);
  }
  window.__lxfdExitWithReveal = exitFullscreenWithReveal;
  function setFullscreen(on) {
    document.body.classList.toggle("assistant-fullscreen", !!on);
    document.body.classList.toggle("lx-auto-fs", !!on);
    if (!on) document.body.classList.remove("lxfd-split-entered");
    if (on) document.body.dataset.state = "chat";
    if (on) {
      const hasThread = !!(thread && (thread.classList.contains("show") || thread.children.length));
      if (hasThread || chatState.started) {
        if (welcome) welcome.style.display = "none";
        if (thread) thread.classList.add("show");
        if (quick) quick.style.display = "none";
        lxfdSetGalleryChatting(true);
      }
      requestAnimationFrame(() => { syncRailForViewport(); fit(); syncSend(); ta?.focus(); });
    }
  }
  function setNav(open) {
    navCluster?.classList.toggle("open", open);
    convoPill?.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function openRail(open) {
    rail?.classList.toggle("open", open);
    railFab?.classList.toggle("hide", open);
    railNewFab?.classList.toggle("hide", open);
    stage?.classList.toggle("shift", open && wide());
    scrim?.classList.remove("show");
  }
  function setRailManual(open) {
    railManuallyCollapsed = !open;
    document.body.classList.toggle("lxfd-rail-user-open", !!open);
    openRail(open);
  }
  function syncRailForViewport() {
    openRail(wide() && !railManuallyCollapsed);
  }
  function fit() {
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 148) + "px";
  }
  function syncSend() { send?.classList.toggle("idle", !ta?.value.trim()); }
  function setRotatingTitle(word) { if (helloTitle) helloTitle.innerHTML = `<span>联想乐享帮你</span><span class="rotating-word">${escapeHtml(word)}</span>`; }
  async function rotateTitleWordForWindows(word) {
    if (helloAnimating || !word || typeof word.animate !== "function") return;
    helloAnimating = true;
    const ease = "cubic-bezier(.22,.61,.36,1)";
    try {
      word.style.willChange = "opacity, transform, filter";
      await word.animate([
        { opacity: 1, transform: "translate3d(0,0,0)", filter: "blur(0px)" },
        { opacity: 0, transform: "translate3d(0,-18px,0)", filter: "blur(5px)" }
      ], { duration: 340, easing: ease, fill: "forwards" }).finished;
      helloIndex = (helloIndex + 1) % helloWords.length;
      word.textContent = helloWords[helloIndex];
      await word.animate([
        { opacity: 0, transform: "translate3d(0,18px,0)", filter: "blur(5px)" },
        { opacity: 1, transform: "translate3d(0,0,0)", filter: "blur(0px)" }
      ], { duration: 340, easing: ease, fill: "forwards" }).finished;
      word.style.opacity = "";
      word.style.transform = "";
      word.style.filter = "";
      word.style.willChange = "";
    } catch (_) {
      word.style.opacity = "";
      word.style.transform = "";
      word.style.filter = "";
      word.style.willChange = "";
    } finally {
      helloAnimating = false;
    }
  }
  function rotateTitleWord() {
    if (!helloTitle || welcome.style.display === "none") return;
    const word = helloTitle.querySelector(".rotating-word");
    if (!word) { setRotatingTitle(helloWords[helloIndex]); return; }
    if (forceFullscreenMotion && typeof word.animate === "function") {
      rotateTitleWordForWindows(word);
      return;
    }
    word.classList.add("out");
    window.setTimeout(() => {
      helloIndex = (helloIndex + 1) % helloWords.length;
      word.textContent = helloWords[helloIndex];
      word.classList.remove("out");
      word.classList.add("in");
      requestAnimationFrame(() => word.classList.remove("in"));
    }, reduceMotion ? 0 : 340);
  }
  function startRotatingTitle() {
    setRotatingTitle(helloWords[helloIndex]);
    if (reduceMotion) return;
    if (helloTimer) window.clearTimeout(helloTimer);
    if (!forceFullscreenMotion) {
      helloTimer = window.setInterval(rotateTitleWord, 2000);
      return;
    }
    const tick = () => {
      rotateTitleWord();
      helloTimer = window.setTimeout(tick, 2000);
    };
    helloTimer = window.setTimeout(tick, 2000);
  }
  function renderTurnIndex(activeId) {
    turnIndex?.classList.toggle("show", turns.length > 0);
    if (turnDots) turnDots.innerHTML = turns.map(t => `<i class="${t.id === activeId ? "active" : ""}"></i>`).join("");
    if (turnList) turnList.innerHTML = turns.map(t => `<button type="button" class="${t.id === activeId ? "active" : ""}" data-target="${escapeAttr(t.id)}" title="${escapeAttr(t.text)}">${escapeHtml(shortText(t.text, 18))}</button>`).join("");
  }
  function lxfdEnterHuman() {
    chatState.human = true;
    if (thread) {
      thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body"><b>专属客服小联</b> 已为您接入人工服务，下方已切换为客服快捷入口。订单、售后、发票问题可直接发我。（演示：由乐享 AI 以专属客服身份接待）</div></div>');
      thread.scrollTop = thread.scrollHeight;
    }
    if (quick) { quick.innerHTML = ["退出人工", "我的订单", "售后服务", "评价服务", "需求清单"].map(t => '<button type="button">' + escapeHtml(t) + '</button>').join(""); quick.style.display = ""; }
    if (ta) { if (!ta.dataset.origPh) ta.dataset.origPh = ta.placeholder; ta.placeholder = "向专属客服小联提问..."; }
  }

  function lxfdExitHuman() {
    chatState.human = false;
    if (thread) {
      thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body">已退出人工服务，继续由联想乐享 AI 为您服务。</div></div>');
      thread.scrollTop = thread.scrollHeight;
    }
    lxfdApplySite();
    // 退出客服后若仍在聊天态则继续隐藏 actionbar
    if (chatState.started && quick) quick.style.display = "none";
    if (ta && ta.dataset.origPh) ta.placeholder = ta.dataset.origPh;
  }

  function lxfdSetGalleryChatting(on) {
    stage?.classList.toggle("is-chatting", !!on);
  }

  function resetConversation(collapseRail) {
    lxfdPersistCurrent();
    chatState.conversationNonce += 1;
    chatState.convId = null;
    chatState.localId = null;
    chatState.sending = false;
    chatState.human = false;
    chatState.started = false; // 新建对话回到欢迎态，恢复 actionbar
    if (thread) { thread.innerHTML = ""; thread.classList.remove("show"); }
    turns = [];
    renderTurnIndex("");
    if (welcome) welcome.style.display = "flex";
    lxfdSetGalleryChatting(false);
    if (convoName) { convoName.textContent = "新对话"; convoName.title = "新对话"; }
    if (ta) { if (ta.dataset.origPh) ta.placeholder = ta.dataset.origPh; ta.value = ""; fit(); syncSend(); }
    if (collapseRail && !wide()) openRail(false);
    // 恢复 actionbar（lxfdApplySite 会重渲内容）
    if (quick) { quick.style.display = ""; lxfdApplySite(); }
    ta?.focus();
    lxfdRenderHist();
  }
  function renderLxfdProducts(products) {
    if (!Array.isArray(products) || !products.length) return "";
    return `<div class="lxfd-products">${products.slice(0, 4).map((product) => `
      <button class="lxfd-product-mini" type="button" data-open-product="${escapeAttr(product.sku || "")}">
        <img src="${escapeAttr(imgUrl(product.image_url))}" alt="">
        <span><strong>${escapeHtml(product.name || "联想商品")}</strong><em>${escapeHtml(money(product.price))}</em></span>
      </button>`).join("")}</div>`;
  }

  function appendLxfdSuggestions(ai, suggestions) {
    const list = Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    if (!list.length) return;
    ai.insertAdjacentHTML("beforeend", `<div class="lxfd-followups">${list.map((sug) => `<button type="button">${escapeHtml(sug)}</button>`).join("")}</div>`);
    $$(".lxfd-followups button", ai).forEach(btn => btn.addEventListener("click", () => submit(btn.textContent)));
  }

  async function submit(text) {
    const value = String(text || "").trim();
    if (!value || chatState.sending) return;
    // 本轮桥接状态（全屏→分屏）
    let turnProducts = null;
    let turnTitle = "";
    let turnGrouped = false;
    let turnAction = null; // 本轮意图操作（action 事件带来的 op）
    // 开始聊天后隐藏 actionbar（对齐官方；客服模式下 enterHuman 会恢复）
    if (!chatState.started && !chatState.human) {
      chatState.started = true;
      if (quick) quick.style.display = "none";
    }
    setFullscreen(true);
    lxfdSetGalleryChatting(true);
    if (welcome) welcome.style.display = "none";
    thread?.classList.add("show");
    if (convoName) { convoName.textContent = shortText(value, 15); convoName.title = value; }
    const turnId = "turn-" + Date.now() + "-" + turns.length;
    const user = document.createElement("div");
    user.className = "lxfd-msg-user";
    user.id = turnId;
    user.textContent = value;
    thread?.appendChild(user);
    turns.push({ id: turnId, text: value });
    renderTurnIndex(turnId);
    if (ta) { ta.value = ""; fit(); syncSend(); }

    // ── lxfd 意图路由分流 ──────────────────────────────────────────────
    // 1. 本地快路径
    const _lxfdLocalCtrl = (function() {
      const _t = value;
      if (/关闭?(所有|全部|这些|当前)?(标签|页面|分页|tab|页签)|清空(标签|页面|分页|页签)|(把|将)?(所有|全部)(标签|页面).{0,4}关(掉|闭)?/.test(_t)) return { op: "close_all_tabs", target: "", msg: "好的，已为你关闭所有页面标签。" };
      if (/^(进入|开启|切换?到?|变成?|开)?全屏(模式|对话|查看)?$|^(放大|沉浸|专注)(模式|对话|查看)?$/.test(_t)) return { op: "enter_fullscreen", target: "", msg: "好的，已切换到全屏对话模式。" };
      if (/^(退出|关闭|取消|结束)(全屏|沉浸|专注)(模式|对话|查看)?$|^(分屏|窗口|恢复|缩小)(模式|对话|查看)?$/.test(_t)) return { op: "exit_fullscreen", target: "", msg: "好的，已退出全屏模式。" };
      if (/^(回|返回|去|到)(首页|主页)$/.test(_t)) return { op: "go_home", target: "", msg: "好的，已为你回到首页。" };
      if (/^(打开|查看|看看?)(我的)?购物车$/.test(_t)) return { op: "open_cart", target: "", msg: "好的，已为你打开购物车。" };
      if (/^(打开|查看|看看?)(我的)?订单(列表|页面|中心)?$/.test(_t)) return { op: "open_orders", target: "", msg: "好的，已为你打开订单页面。" };
      return null;
    })();
    if (_lxfdLocalCtrl) {
      const _lxfdCtrlAi = document.createElement("div");
      _lxfdCtrlAi.className = "lxfd-msg-ai";
      const _lxfdCtrlBody = document.createElement("div");
      _lxfdCtrlBody.className = "lxfd-ai-body";
      const _lxfdCtrlText = document.createElement("div");
      _lxfdCtrlText.className = "lxfd-ai-text";
      _lxfdCtrlText.textContent = _lxfdLocalCtrl.msg;
      _lxfdCtrlBody.appendChild(_lxfdCtrlText);
      _lxfdCtrlAi.appendChild(_lxfdCtrlBody);
      thread?.appendChild(_lxfdCtrlAi);
      _lxfdCtrlAi.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
      // 执行操作：通过 __lxExecControl 桥（全屏态 lxExecControl 不在此作用域）
      const _execOp = _lxfdLocalCtrl.op;
      const _execTarget = _lxfdLocalCtrl.target;
      if (_execOp === "enter_fullscreen") { /* 全屏态已全屏，无需操作 */ }
      else if (_execOp === "exit_fullscreen") {
        if (typeof window.__lxBridge?.exitFullscreen === "function") window.__lxBridge.exitFullscreen();
      } else if (typeof window.__lxBridge?.execControl === "function") {
        window.__lxBridge.execControl(_execOp, _execTarget);
      }
      return;
    }

    // 2. 远程意图路由器
    let _lxfdIntentResult = null;
    try {
      const _lxfdIntentAbort = new AbortController();
      const _lxfdIntentTimer = setTimeout(() => _lxfdIntentAbort.abort(), 3000);
      const _lxfdIntentRes = await fetch("/api/leai/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
        signal: _lxfdIntentAbort.signal
      });
      clearTimeout(_lxfdIntentTimer);
      if (_lxfdIntentRes.ok) _lxfdIntentResult = await _lxfdIntentRes.json();
    } catch (_lxfdIntentErr) { /* 超时/失败 → 降级 chat */ }
    if (_lxfdIntentResult && _lxfdIntentResult.type === "control" && _lxfdIntentResult.op) {
      const _lxfdCtrlAi = document.createElement("div");
      _lxfdCtrlAi.className = "lxfd-msg-ai";
      const _lxfdCtrlBody = document.createElement("div");
      _lxfdCtrlBody.className = "lxfd-ai-body";
      const _lxfdCtrlText = document.createElement("div");
      _lxfdCtrlText.className = "lxfd-ai-text";
      const _lxfdOpNames = { close_all_tabs: "关闭了所有页面标签", close_other_tabs: "关闭了其他标签，只留当前", go_home: "回到了首页", open_cart: "打开了购物车", open_orders: "打开了订单页面", open_member: "打开了会员中心", open_coupon: "打开了优惠券中心", open_stores: "打开了门店查询", open_edu_zone: "打开了教育专区", open_product: `正在帮你打开「${_lxfdIntentResult.target || "该商品"}」`, enter_fullscreen: "切换到全屏对话模式（当前已在全屏）", exit_fullscreen: "退出了全屏模式" };
      _lxfdCtrlText.textContent = `好的，已为你${_lxfdOpNames[_lxfdIntentResult.op] || "执行了操作"}。`;
      _lxfdCtrlBody.appendChild(_lxfdCtrlText);
      _lxfdCtrlAi.appendChild(_lxfdCtrlBody);
      thread?.appendChild(_lxfdCtrlAi);
      _lxfdCtrlAi.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
      const _lxfdExecOp = _lxfdIntentResult.op;
      const _lxfdExecTarget = _lxfdIntentResult.target || "";
      if (_lxfdExecOp === "enter_fullscreen") { /* 全屏态已全屏，无需操作 */ }
      else if (_lxfdExecOp === "exit_fullscreen") {
        if (typeof window.__lxBridge?.exitFullscreen === "function") window.__lxBridge.exitFullscreen();
      } else if (typeof window.__lxBridge?.execControl === "function") {
        window.__lxBridge.execControl(_lxfdExecOp, _lxfdExecTarget);
      }
      return;
    }
    // ── lxfd 意图路由分流结束 ─────────────────────────────────────────

    const ai = document.createElement("div");
    ai.className = "lxfd-msg-ai";
    ai.innerHTML = '<div class="lxfd-ai-body"><span class="lxfd-typing"><i></i><i></i><i></i>&nbsp;检索知识库…</span></div>';
    thread?.appendChild(ai);
    ai.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    const body = ai.querySelector(".lxfd-ai-body");
    const nonce = chatState.conversationNonce;
    chatState.sending = true;
    let hasContent = false;
    const revealAi = () => {
      if (hasContent) return;
      hasContent = true;
      body?.querySelector(".lxfd-typing")?.remove();
      ai._textBox = document.createElement("div");
      ai._textBox.className = "lxfd-ai-text";
      if (body) body.insertBefore(ai._textBox, body.firstChild);
      ai._raw = "";
    };
    // lxfd 前端兜底超时：50秒后强制解锁
    const _lxfdSendTimeout = setTimeout(() => {
      if (chatState.sending && chatState.conversationNonce === nonce) {
        chatState.sending = false;
        revealAi();
        if (ai._textBox) ai._textBox.textContent = "响应超时，请重试。";
      }
    }, 50000);
    try {
      chatState._fallbackFired = false;
      const sendMsg = chatState.human
        ? ('[系统提示: 请以"专属客服小联"身份回复, 像人工客服一样亲切自然简短直接, 不用 markdown/列表/标题, 不暴露 AI 身份, 严禁输出"QA对""知识库""参考资料"等内部字样或📎等标记。]\n\n用户问: ' + value)
        : value;
      const lxfdImgUrl = window.__lxfdPendingImage || undefined;
      window.__lxfdPendingImage = null;
      const imgTipEl = document.querySelector('.lxfd-img-tip');
      if (imgTipEl) imgTipEl.remove();
      const lxfdUseHuoshan = !!lxfdImgUrl || !!window.__lxWebSearch;
      const response = lxfdUseHuoshan
        ? await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: sendMsg,
              image_url: lxfdImgUrl,
              web_search: !!window.__lxWebSearch,
              thinking_mode: !!window.__lxThinking,
              conv_id: chatState.convId || undefined
            })
          })
        : await fetch("/api/leai/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: sendMsg,
              sessionId: chatState.convId || undefined,
              enableThinking: !!window.__lxThinking,
              ...(window.__lxGeo || {})
            })
          });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const lxfdHandlers = {
        chunk: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          const content = payload.text || data || "";
          if (!content) return;
          revealAi();
          ai._raw += content;
          if (ai._textBox) ai._textBox.textContent = ai._raw;
          thread.scrollTop = thread.scrollHeight;
        },
        status: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          if (payload.conv_id || payload.convId) chatState.convId = payload.conv_id || payload.convId;
          if (payload.text && !hasContent && body) {
            let typing = body.querySelector(".lxfd-typing");
            if (!typing) { body.insertAdjacentHTML("afterbegin", '<span class="lxfd-typing"><i></i><i></i><i></i>&nbsp;</span>'); typing = body.querySelector(".lxfd-typing"); }
            if (typing) typing.innerHTML = `<i></i><i></i><i></i>&nbsp;${escapeHtml(payload.text)}`;
          }
        },
        products: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          const products = payload.products || [];
          if (!products.length) return;
          revealAi();
          body?.insertAdjacentHTML("beforeend", renderLxfdProducts(products));
          // 记录本轮商品以便 done 时桥接到主面板
          turnProducts = products;
        },
        display: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          const products = payload.products || payload.items || [];
          revealAi();
          if (payload.title && ai._textBox && !ai._textBox.textContent.trim()) ai._textBox.textContent = payload.title;
          body?.insertAdjacentHTML("beforeend", renderLxfdProducts(products));
          // 记录本轮商品及展示元信息以便 done 时桥接到主面板
          if (products.length) {
            turnProducts = products;
            turnTitle = payload.title || "";
            turnGrouped = !!payload.grouped;
          }
        },
        clicks: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const list = (parseJson(data).clicks) || [];
          if (!list.length || !body) return;
          revealAi();
          body.insertAdjacentHTML("beforeend", '<div class="leai-clicks" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' + list.map((c) =>
            `<button type="button" class="leai-click-btn" data-leai-url="${escapeAttr(c.link_url || "")}" data-leai-cb="${escapeAttr(c.callback_data || "")}" data-leai-event="${escapeAttr(c.event_type || "")}" style="padding:8px 16px;border-radius:999px;border:1px solid #c8161e;background:#c8161e;color:#fff;font-size:13px;font-weight:600;cursor:pointer">${escapeHtml(c.display_text)}</button>`
          ).join("") + "</div>");
        },
        suggestions: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          appendLxfdSuggestions(ai, payload.suggestions || []);
        },
        action: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const { op } = parseJson(data) || {};
          if (op === 'edu') {
            const body = ai.querySelector('.lxfd-ai-body');
            if (body) body.insertAdjacentHTML('beforeend', '<div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn primary" type="button" data-open-stuauth="college">在校生认证</button><button class="lx-p0-btn" type="button" data-open-stuauth="gaokao">高考生认证</button></div>');
          } else if (op === 'auth') {
            // 职场认证：直接往 lxfd AI 气泡末尾插入触发按钮（不走全屏→分屏桥接）
            const body = ai.querySelector('.lxfd-ai-body');
            if (body) body.insertAdjacentHTML('beforeend', '<div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn primary" type="button" data-open-wpa>立即认证职场身份</button></div>');
          } else if (op) {
            turnAction = op; // 记录意图，done 时桥接后再执行（全屏下直接开标签会被遮盖）
          }
        },
        control: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data) || {};
          // 页面操作（关标签/回首页/开订单等）：桥接到主面板执行
          if (payload.op && typeof window.__lxExecControl === 'function') window.__lxExecControl(payload.op, payload.target);
        },
        done: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          if (payload.conv_id || payload.convId) chatState.convId = payload.conv_id || payload.convId;
          if (ai._raw && ai._textBox) ai._textBox.innerHTML = mdLite(ai._raw);
          lxfdPersistCurrent();
          lxfdRenderHist();
          // 追问 chips：异步生成，不阻塞桥接逻辑
          const _lxfdQ = value;
          const _lxfdA = (ai._raw || "").slice(0, 300);
          if (_lxfdQ && _lxfdA) {
            fetch("/api/leai/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: _lxfdQ, a: _lxfdA }) })
              .then(r => r.json()).then(d => {
                if (nonce !== chatState.conversationNonce) return;
                const qs = Array.isArray(d && d.questions) ? d.questions.filter(Boolean).slice(0, 3) : [];
                if (qs.length && !ai.querySelector(".lxfd-followups")) appendLxfdSuggestions(ai, qs);
              }).catch(() => {});
          }
          const isFullscreen = document.body.classList.contains("assistant-fullscreen");
          // 全屏→分屏桥接：本轮有商品且当前仍处于全屏态 → 搬对话到主面板+退全屏+右侧展示
          if (turnProducts && turnProducts.length && isFullscreen && window.__lxBridge) {
            lxfdExportToMain();
            exitFullscreenWithReveal(() => {
              window.__lxBridge.revealProducts(turnProducts, { title: turnTitle, grouped: turnGrouped });
              if (turnAction && typeof window.__lxOpenFeature === 'function') window.__lxOpenFeature(turnAction);
              // 清空 lxfd thread，下次回全屏会从主面板重新 import
              if (thread) thread.innerHTML = "";
            });
          } else if (turnAction && isFullscreen && window.__lxBridge) {
            // 本轮只有意图无商品：同样桥接退全屏，再开功能标签
            lxfdExportToMain();
            exitFullscreenWithReveal(() => {
              // 首页布局设置（和商品桥接一致）：不做这步 .shell 仍 display:none → 功能标签渲染了但主面板隐藏=空白
              if (document.body.dataset.page === "home" || !document.body.dataset.page) {
                document.documentElement.classList.remove("lx-root-lxfd-prepaint");
                document.body.classList.add("lx-home-split");
                document.body.dataset.page = "personal";
                document.body.dataset.state = "chat";
              }
              if (typeof window.__lxOpenFeature === 'function') window.__lxOpenFeature(turnAction);
              if (thread) thread.innerHTML = "";
            });
          }
        },
        fallback: async () => {
          if (nonce !== chatState.conversationNonce) return;
          if (chatState._fallbackFired) return;
          chatState._fallbackFired = true;
          try {
            const huoRes = await fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: sendMsg, conv_id: chatState.convId || undefined })
            });
            if (!huoRes.ok || !huoRes.body) throw new Error('fallback upstream ' + huoRes.status);
            await readSse(huoRes, lxfdHandlers);
          } catch (_e) {
            revealAi();
            if (ai._textBox) ai._textBox.textContent = '当前服务暂时不可用，请稍后再试。';
          }
        }
      };
      await readSse(response, lxfdHandlers);
      if (nonce !== chatState.conversationNonce) return;
      if (!hasContent) {
        revealAi();
        if (ai._textBox) ai._textBox.textContent = "我已经收到请求，可以继续补充预算、用途或偏好的机型。";
      }
      body?.insertAdjacentHTML("beforeend", `<p class="lxfd-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</p>`);
      // 追问 chips 由 done handler 异步填充；若后端超时未返回则保留默认
      if (!ai.querySelector(".lxfd-followups")) appendLxfdSuggestions(ai, ["可以推荐适合学生的笔记本吗？", "怎么查询我的产品保修状态？", "现在有哪些可以叠加的优惠政策？"]);
    } catch (error) {
      if (nonce !== chatState.conversationNonce) return;
      revealAi();
      if (ai._textBox) ai._textBox.textContent = "当前 AI 服务暂时不可用，请稍后重试。";
    } finally {
      clearTimeout(_lxfdSendTimeout);
      if (nonce === chatState.conversationNonce) chatState.sending = false;
      ai.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    }
  }

  window.lxfdSubmit = submit;
  window.lxfdReset = resetConversation;
  // 分屏→全屏回退：关空右侧 tab 时带入主面板对话回全屏
  window.__lxfdEnterFromSplit = function() {
    if (thread) thread.innerHTML = "";
    // 若是首页原地分屏，回全屏时移除 lx-home-split 并还原 content data-view
    // 还原首页：从 personal 布局切回 home + 复原首页内容视图（与 revealProducts 的 data-page=personal 对应）
    if (document.body.classList.contains("lx-home-split")) {
      document.body.dataset.page = "home";
      const _c = document.querySelector(".content");
      if (_c) _c.setAttribute("data-view", "home");
    }
    document.body.classList.remove("lx-home-split");
    enterFullscreen();  // enterFullscreen 内检测到 thread 空会自动 lxfdImportFromMain
  };
  // 新建对话回全屏欢迎态
  window.__lxfdNewFullscreen = function() {
    // 若是首页原地分屏，回全屏时移除 lx-home-split 并还原 content data-view
    // 还原首页：从 personal 布局切回 home + 复原首页内容视图（与 revealProducts 的 data-page=personal 对应）
    if (document.body.classList.contains("lx-home-split")) {
      document.body.dataset.page = "home";
      const _c = document.querySelector(".content");
      if (_c) _c.setAttribute("data-view", "home");
    }
    document.body.classList.remove("lx-home-split");
    resetConversation(true);
    enterFullscreen();
  };

  convoPill?.addEventListener("click", () => setNav(!navCluster.classList.contains("open")));
  navCluster?.addEventListener("mouseenter", () => { clearTimeout(hoverTimer); setNav(true); });
  navCluster?.addEventListener("mouseleave", () => { hoverTimer = setTimeout(() => setNav(false), 260); });
  $$("#lxfdNavSheet a").forEach(a => a.addEventListener("click", (e) => {
    e.preventDefault();
    $$("#lxfdNavSheet a").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
    setNav(false);
    const path = navPaths[a.dataset.page] || "/";
    const currentPath = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
    const targetPath = path.endsWith("/") ? path : `${path}/`;
    if (currentPath === targetPath) location.reload();
    else location.assign(path);
  }));
  document.addEventListener("click", (e) => { if (navCluster && !navCluster.contains(e.target)) setNav(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setNav(false); if (!wide()) setRailManual(false); } });
  railFab?.addEventListener("click", () => setRailManual(true));
  $("#lxfdRailClose")?.addEventListener("click", () => setRailManual(false));
  $(".lxfd-actions .lxfd-ic")?.addEventListener("click", (e) => { e.preventDefault(); exitFullscreen(); });
  scrim?.addEventListener("click", () => setRailManual(false));
  $("#lxfdNewChat")?.addEventListener("click", () => resetConversation(true));
  railNewFab?.addEventListener("click", () => resetConversation(false));
  $("#lxfdHist")?.addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); const id = a.dataset.conv; if (id) lxfdLoadConv(id); });
  $$(".lxfd-comp-left .lxfd-toggle").forEach(btn => btn.addEventListener("click", () => { const on = btn.classList.toggle("on"); btn.setAttribute("aria-pressed", on ? "true" : "false"); if (btn.textContent.includes("深度思考")) window.__lxThinking = on; if (btn.textContent.includes("联网")) window.__lxWebSearch = on; }));
  // lxfd 图片上传
  const lxfdImgBtn = document.querySelector('.lxfd-img-btn');
  if (lxfdImgBtn) {
    const lxfdFileInput = document.createElement('input');
    lxfdFileInput.type = 'file';
    lxfdFileInput.accept = 'image/*';
    lxfdFileInput.style.display = 'none';
    lxfdFileInput.id = 'lxfdFileInput';
    document.body.appendChild(lxfdFileInput);
    lxfdImgBtn.addEventListener('click', () => lxfdFileInput.click());
    lxfdFileInput.addEventListener('change', async () => {
      const file = lxfdFileInput.files && lxfdFileInput.files[0];
      if (!file) return;
      lxfdFileInput.value = '';
      try {
        lxfdImgBtn.disabled = true;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/chat/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data && data.url) {
          window.__lxfdPendingImage = data.url;
          const dock = document.querySelector('.lxfd-dock');
          let imgTip = dock && dock.querySelector('.lxfd-img-tip');
          if (!imgTip && dock) {
            imgTip = document.createElement('div');
            imgTip.className = 'lxfd-img-tip';
            imgTip.style.cssText = 'font-size:12px;color:#888;padding:4px 12px;display:flex;align-items:center;gap:6px';
            dock.insertBefore(imgTip, dock.querySelector('.lxfd-composer'));
          }
          if (imgTip) {
            imgTip.innerHTML = '<span>已添加图片</span><button type="button" style="border:none;background:none;cursor:pointer;color:#c8161e;font-size:12px" id="lxfdImgClear">×</button>';
            const clearBtn = imgTip.querySelector('#lxfdImgClear');
            if (clearBtn) clearBtn.addEventListener('click', () => { window.__lxfdPendingImage = null; imgTip.remove(); });
          }
        }
      } catch (_e) {
        // 上传失败静默处理
      } finally {
        lxfdImgBtn.disabled = false;
      }
    });
  }

  (function initLxfdHomeGallery() {
    const data = {
      new: [
        { nm: "拯救者 Y9000P 2026", ds: "i9-14900HX ｜ RTX 5060 ｜ 2.5K 240Hz 电竞屏", price: "15,098", badge: "新品首发", wm: "LEGION Y9000P", img: "/assets/img/lxfd-gallery-1-1.jpg", g: "linear-gradient(135deg,#1d1630,#3a2156 58%,#6b2f4e)" },
        { nm: "YOGA Air 14c 2026", ds: "酷睿 Ultra9 ｜ 32G/2T ｜ 2.8K OLED 触控", price: "8,999", badge: "轻薄旗舰", wm: "YOGA Air 14c", img: "/assets/img/lxfd-gallery-1-2.jpg", g: "linear-gradient(135deg,#2a1646,#5b2a8a 58%,#a06ad0)" },
        { nm: "小新Pad Pro 13英寸", ds: "酷睿 Ultra5 225H ｜ 32G/1T ｜ 全能轻薄", price: "7,299", badge: "全能之选", wm: "Xiaoxin Pro16", img: "/assets/img/lxfd-gallery-1-3.jpg", g: "linear-gradient(135deg,#16324f,#1f6f8b 58%,#4fb3a3)" }
      ],
      act: [
        { nm: "618 年中钜惠", ds: "全场至高省 2000，下单再享 12 期免息", price: "省 2000", isText: true, badge: "限时", wm: "618 SALE", g: "linear-gradient(135deg,#3a1020,#8a1f2e 56%,#e1432e)" },
        { nm: "教育优惠季", ds: "学生 / 教师认证，专属机型至高 9 折", price: "享 9 折", isText: true, badge: "进行中", wm: "EDU SEASON", g: "linear-gradient(135deg,#15233f,#2f5aa0 58%,#6a9fe0)" },
        { nm: "以旧换新", ds: "旧机抵扣 + 平台补贴，至高补 800 元", price: "补 800", isText: true, badge: "可叠加", wm: "TRADE-IN", g: "linear-gradient(135deg,#143028,#1f6e54 58%,#56b78c)" }
      ],
      news: [
        { nm: "联想 2026 拯救者全系发布", ds: "搭载新一代 AI 引擎与超频引擎，性能再进阶", price: "查看全文", isText: true, badge: "官方", wm: "PRESS", g: "linear-gradient(135deg,#241b3a,#4a2d6e 58%,#8a3f5e)" },
        { nm: "联想 AI PC 出货领跑行业", ds: "IDC 最新报告：中国 AI PC 市场份额持续第一", price: "查看全文", isText: true, badge: "行业", wm: "INSIGHT", g: "linear-gradient(135deg,#1b2a3f,#36608f 58%,#74a8d0)" },
        { nm: "联想乐享门店破 5000 家", ds: "线下服务网络全面升级，到店体验更进一步", price: "查看全文", isText: true, badge: "动态", wm: "RETAIL", g: "linear-gradient(135deg,#2a2410,#7a6320 58%,#d0a84a)" }
      ],
      case: [
        { nm: "某重点高校机房方案", ds: "1200 台统一部署与运维，开机即用，集中管理", price: "教育行业", isText: true, badge: "已交付", wm: "CAMPUS", g: "linear-gradient(135deg,#1a2740,#2f5e8f 58%,#6f9fd0)" },
        { nm: "设计工作室创作方案", ds: "ThinkStation + 校色屏整体方案，效率提升 40%", price: "创意设计", isText: true, badge: "标杆", wm: "STUDIO", g: "linear-gradient(135deg,#2a1640,#5b2f8a 58%,#9a6ad0)" },
        { nm: "连锁零售 POS 升级", ds: "300+ 门店终端统一焕新，稳定支撑高峰交易", price: "零售行业", isText: true, badge: "规模化", wm: "RETAIL POS", g: "linear-gradient(135deg,#301622,#7a2740 58%,#d04a5a)" }
      ]
    };
    const root = document.querySelector(".lxfd-home-gallery");
    const grid = document.getElementById("lxfdGalleryGrid");
    const tabs = Array.from(document.querySelectorAll("[data-gallery-tab]"));
    const ink = document.getElementById("lxfdGalleryInk");
    if (!root || !grid || !tabs.length) return;
    const price = (item) => item.isText ? escapeHtml(item.price) : "¥" + escapeHtml(item.price);
    const card = (item) => {
      const shotClass = item.img ? "gallery-shot has-image" : "gallery-shot";
      const inner = item.img
        ? '<img class="gallery-img" src="' + escapeAttr(item.img) + '" alt="" loading="eager" />'
        : '<span class="gallery-lid"></span><span class="gallery-wm">' + escapeHtml(item.wm) + '</span>';
      return '<article class="gallery-card"><div class="' + shotClass + '" style="background:' + escapeAttr(item.g) + '">' + inner + '</div>'
        + '<div class="gallery-meta"><span class="gallery-badge">' + escapeHtml(item.badge) + '</span><strong class="gallery-name">' + escapeHtml(item.nm) + '</strong><span class="gallery-desc">' + escapeHtml(item.ds) + '</span>'
        + '<div class="gallery-foot"><span class="gallery-price">' + price(item) + '</span><button class="gallery-go" type="button">了解 →</button></div></div></article>';
    };
    const moveInk = () => {
      const active = root.querySelector(".gallery-tab.is-active");
      if (active && ink) {
        ink.style.left = active.offsetLeft + "px";
        ink.style.width = active.offsetWidth + "px";
      }
    };
    const render = (key, animate) => {
      if (!data[key]) key = "new";
      if (!animate) {
        grid.innerHTML = data[key].map(card).join("");
        grid.classList.remove("is-loading");
        grid.classList.remove("is-switching");
        return;
      }
      grid.classList.add("is-switching");
      window.setTimeout(() => {
        grid.innerHTML = data[key].map(card).join("");
        grid.classList.remove("is-loading");
        grid.classList.remove("is-switching");
      }, 120);
    };
    tabs.forEach((tab) => tab.addEventListener("click", () => {
      if (tab.classList.contains("is-active")) return;
      tabs.forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
      moveInk();
      render(tab.dataset.galleryTab, true);
    }));
    render("new", false);
    requestAnimationFrame(moveInk);
    window.addEventListener("resize", moveInk);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInk);
  })();

  (function initLxfdScopeActions() {
    const scope = document.getElementById("lxfdScopeActions");
    const more = document.getElementById("lxfdScopeMore");
    const moreBtn = more?.querySelector(".lxfd-scope-more-btn");
    const close = () => {
      more?.classList.remove("open");
      moreBtn?.setAttribute("aria-expanded", "false");
    };
    if (scope) {
      scope.addEventListener("click", (event) => {
        const chip = event.target.closest(".lxfd-scope-chip");
        if (!chip) return;
        event.preventDefault();
        event.stopPropagation();
        close();
        const label = chip.textContent.trim();
        if (!label) return;
        submit(LXFD_ACTION_Q[label] || label);
      });
    }
    if (more && moreBtn) {
      moreBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = !more.classList.contains("open");
        more.classList.toggle("open", open);
        moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", (event) => { if (!more.contains(event.target)) close(); });
      document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    }
  })();

  ta?.addEventListener("input", () => { fit(); syncSend(); });
  ta?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(ta.value); } });
  $("#lxfdComposer")?.addEventListener("submit", (e) => { e.preventDefault(); submit(ta.value); });
  chips?.addEventListener("click", (e) => {
    const b = e.target.closest(".lxfd-chip-q");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    submit(b.dataset.q || b.textContent);
  });
  quick?.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (b.textContent.trim() === "退出人工") { lxfdExitHuman(); return; }
    submit(LXFD_ACTION_Q[b.textContent.trim()] || b.textContent);
  });
  turnList?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const target = document.getElementById(b.dataset.target); if (!target) return; renderTurnIndex(target.id); target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); });
  window.addEventListener("resize", () => { if (document.body.classList.contains("assistant-fullscreen")) syncRailForViewport(); });

  // 职场认证按钮（lxfd 内的 data-open-wpa 委托）
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-wpa]")) {
      if (typeof window.openWorkplaceAuth === "function") window.openWorkplaceAuth();
    }
  });

  // 官方动作按钮（转人工/在线客服等）点击：human_access→进客服模式，有链接开新窗口，否则把 callback_data 当问题继续问
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-leai-url], [data-leai-cb]");
    if (!btn) return;
    e.preventDefault();
    const ev = btn.getAttribute("data-leai-event");
    if (ev === "human_access") {
      if (document.body.classList.contains("assistant-fullscreen")) {
        lxfdEnterHuman();
      } else if (typeof window.__lxSetHuman === "function") {
        window.__lxSetHuman(true);
      }
      return;
    }
    const url = btn.getAttribute("data-leai-url");
    const cb = btn.getAttribute("data-leai-cb");
    if (url) { window.open(url, "_blank", "noopener"); return; }
    if (cb && typeof window.lxfdSubmit === "function" && document.body.classList.contains("assistant-fullscreen")) window.lxfdSubmit(cb);
  });

  setTimeout(startRotatingTitle, reduceMotion ? 0 : 2000);
  syncSend();
  lxfdRenderHist();

  document.addEventListener("click", (e) => {
    const fsToggle = e.target.closest(".assistant-toggle");
    if (fsToggle) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      enterFullscreen();
      return;
    }
    const heroChip = e.target.closest(".hero-suggestion");
    const fullPrompt = e.target.closest(".fullscreen-prompt");
    if (heroChip || fullPrompt) {
      const target = heroChip || fullPrompt;
      const text = (target.querySelector("span")?.textContent || target.textContent).trim();
      if (text) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); submit(text); }
    }
  }, true);
  document.addEventListener("submit", (e) => {
    const form = e.target.closest?.(".hero-composer");
    if (!form) return;
    const txt = form.querySelector("textarea")?.value.trim() || form.querySelector("textarea")?.placeholder || "最近有什么优惠活动？";
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); submit(txt);
  }, true);

  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("assistant-fullscreen")) requestAnimationFrame(() => { syncRailForViewport(); fit(); syncSend(); });
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();

// Test hook: open fullscreen dialog with ?lxfd=1 without affecting normal entry.
(function(){
  try {
    if (!new URLSearchParams(location.search).has("lxfd")) return;
    const forceFullscreen = () => {
      document.body.classList.add("assistant-fullscreen", "lx-auto-fs");
      document.body.dataset.state = "chat";
      document.getElementById("lxfdStage")?.classList.toggle("shift", window.innerWidth >= 1280);
      document.getElementById("lxfdRail")?.classList.toggle("open", window.innerWidth >= 1280);
    };
    forceFullscreen();
    [50, 300, 1000, 2000].forEach((delay) => window.setTimeout(forceFullscreen, delay));
  } catch {}
})();

// Split assistant panel width drag handle. Kept isolated from existing interactions.
(function(){
  if (window.__lxAssistantPanelResizeBound) return;
  window.__lxAssistantPanelResizeBound = true;
  const MIN_WIDTH = 312;
  const MAX_WIDTH = 720;
  const STORAGE_KEY = 'lxAssistantPanelWidth';
  const clamp = (value) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(value)));
  const applyWidth = (value) => {
    const width = clamp(value);
    document.body.style.setProperty('--assistant-panel-width', width + 'px');
    try { localStorage.setItem(STORAGE_KEY, String(width)); } catch {}
    return width;
  };
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) applyWidth(saved);
  } catch {}
  document.addEventListener('pointerdown', (event) => {
    let handle = event.target.closest?.('.panel-resizer');
    if (document.body.classList.contains('assistant-fullscreen')) return;
    const panel = document.querySelector('.assistant-panel');
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const isRight = document.body.classList.contains('assistant-right');
    const nearEdge = isRight
      ? Math.abs(event.clientX - panelRect.left) <= 14
      : Math.abs(event.clientX - panelRect.right) <= 14;
    if (!handle && !nearEdge) return;
    handle = handle || document.querySelector('.panel-resizer');
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = panelRect.width;
    document.body.classList.add('is-resizing');
    handle?.setPointerCapture?.(event.pointerId);
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      applyWidth(startWidth + (isRight ? -delta : delta));
    };
    const onUp = () => {
      document.body.classList.remove('is-resizing');
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
  }, true);
})();

/* Smart AI arrow cursor: product card dwell overlay, independent of product-card actions. */
(function(global){
  "use strict";
  if (global.ARROWCURSOR && global.ARROWCURSOR.__lxProductDwell) return;
  var ARROW = "M0 0 L0 18.5 L5 13.8 L8.3 21 L11 19.8 L7.8 12.9 L14.2 12.9 Z";
  var STAR = "M15 1C15.7 9.2 20.8 14.3 29 15C20.8 15.7 15.7 20.8 15 29C14.3 20.8 9.2 15.7 1 15C9.2 14.3 14.3 9.2 15 1Z";
  function defsSVG(){
    return '<svg class="defs" aria-hidden="true"><defs>'
      + '<linearGradient id="arrowIris" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="#ff3b00"><animate attributeName="stop-color" values="#ff3b00;#ff006e;#d900ff;#35b8ff;#b7f2ff;#ff3b00" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.24" stop-color="#ff006e"><animate attributeName="stop-color" values="#ff006e;#d900ff;#35b8ff;#b7f2ff;#ff3b00;#ff006e" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.5" stop-color="#d900ff"><animate attributeName="stop-color" values="#d900ff;#35b8ff;#b7f2ff;#ff3b00;#ff006e;#d900ff" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.76" stop-color="#35b8ff"><animate attributeName="stop-color" values="#35b8ff;#b7f2ff;#ff3b00;#ff006e;#d900ff;#35b8ff" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="1" stop-color="#b7f2ff"><animate attributeName="stop-color" values="#b7f2ff;#ff3b00;#ff006e;#d900ff;#35b8ff;#b7f2ff" dur="2.2s" repeatCount="indefinite"/></stop></linearGradient>'
      + '<linearGradient id="arrowBrand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d144a"/><stop offset="1" stop-color="#b8252e"/></linearGradient>'
      + '<linearGradient id="irisFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3b00"/><stop offset="0.25" stop-color="#ff006e"/><stop offset="0.5" stop-color="#d900ff"/><stop offset="0.72" stop-color="#48c6ff"/><stop offset="0.88" stop-color="#5eeaff"/><stop offset="1" stop-color="#b7f2ff"/></linearGradient>'
      + '</defs></svg>';
  }
  function arrowSVG(){ return '<svg class="arrow" width="22" height="26" viewBox="-1 -1 17 24" aria-hidden="true"><path class="ar-body" d="' + ARROW + '"/></svg>'; }
  function starSVG(){ return '<span class="star"><svg class="sx" viewBox="0 0 30 30" aria-hidden="true"><path d="' + STAR + '" fill="url(#irisFill)"/><ellipse class="sheen" cx="11" cy="10" rx="3.4" ry="2.5" fill="#fff"/></svg></span>'; }
  function fxHTML(label){ return '<div class="fx"><div class="label"><span class="lx-icon"><img src="/assets/img/lx-icon-0016.png" alt=""/></span><span class="ltxt">' + label + '</span></div></div>'; }
  function init(opts){
    opts = opts || {};
    var v = opts.variant || "A";
    var delay = opts.delay != null ? opts.delay : 4000;
    var label = opts.label || "乐享正在帮你";
    var targetSelector = opts.target || ".content .product-card, .content .lx-floor-product";
    if (document.querySelector(".ai-arrow")) return;
    document.body.setAttribute("data-arr", v);
    var root = document.createElement("div");
    root.className = "ai-arrow";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = defsSVG() + arrowSVG() + fxHTML(label);
    document.body.appendChild(root);
    var x = -200, y = -200, timer = null, awake = false, inTarget = false;
    function place(){ root.style.transform = "translate(" + x + "px," + y + "px)"; }
    function sleep(){ if (!awake && !document.body.classList.contains("cursor-awake")) return; awake = false; root.classList.remove("awake"); document.body.classList.remove("cursor-awake"); }
    function wake(){ if (!inTarget) return; awake = true; var old = root.querySelector(".fx"); if (old) old.remove(); root.insertAdjacentHTML("beforeend", fxHTML(label)); void root.offsetWidth; root.classList.add("awake"); document.body.classList.add("cursor-awake"); }
    function arm(){ clearTimeout(timer); timer = setTimeout(wake, delay); }
    function insideTarget(t){ return !!(t && t.closest && t.closest(targetSelector)); }
    function onMove(e){ x = e.clientX; y = e.clientY; place(); inTarget = insideTarget(e.target); if (!inTarget){ clearTimeout(timer); sleep(); return; } if (awake) sleep(); arm(); }
    function onLeave(){ clearTimeout(timer); inTarget = false; sleep(); root.style.transform = "translate(-200px,-200px)"; }
    document.addEventListener("mousemove", onMove, { passive:true });
    document.addEventListener("mouseleave", onLeave, { passive:true });
    document.addEventListener("mousedown", function(){ clearTimeout(timer); sleep(); if (inTarget) arm(); }, { passive:true });
    window.addEventListener("blur", onLeave);
    return { wake:wake, sleep:sleep, setVariant:function(nv){ v = nv; document.body.setAttribute("data-arr", nv); sleep(); } };
  }
  global.ARROWCURSOR = global.ARROWCURSOR || {};
  global.ARROWCURSOR.init = init;
  global.ARROWCURSOR.__lxProductDwell = true;
  function boot(){ init({ variant:"A", delay:4000, label:"乐享正在帮你", target:".content .product-card, .content .lx-floor-product" }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window);
