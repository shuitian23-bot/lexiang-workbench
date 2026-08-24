// 真实浏览器定位：只允许站点首页首次进入时自动请求。
// file:// 下每个 HTML 都可能被浏览器视为独立文件来源；子频道不得在页面切换时重复弹权限框。
// Icon Board 统一渲染入口：一般图标使用 mask 继承当前文字颜色；
// global-next 使用正式 img 资产，避免 file:// 预览阻止本地 SVG mask。
if (!window.__lxApprovedIcon) {
  const approvedIcons = new Set([
    "sidebar-create", "sidebar-history", "sidebar-toggle",
    "shortcut-customization", "shortcut-trial", "shortcut-live", "shortcut-membership",
    "shortcut-rewards", "shortcut-referrals", "shortcut-delivery", "shortcut-support",
    "shortcut-education", "shortcut-tradein", "composer-reasoning", "composer-search",
    "composer-image", "composer-send", "mall-cart", "mall-orders", "mall-account",
    "global-cart", "global-check", "global-next", "global-expand", "global-collapse",
    "global-switch", "global-refresh", "global-sparkle", "smart-cursor"
  ]);
  const style = document.createElement("style");
  style.id = "lx-approved-icon-style";
  style.textContent = ".lx-approved-icon{display:inline-block;width:18px;height:18px;flex:0 0 auto;background:currentColor;-webkit-mask:var(--lx-icon) center/contain no-repeat;mask:var(--lx-icon) center/contain no-repeat;vertical-align:-.12em}.lx-approved-icon-img{display:inline-block;width:18px;height:18px;flex:0 0 auto;object-fit:contain;vertical-align:-.12em}.answer-cta-icon>.lx-approved-icon,.answer-cta-icon>.lx-approved-icon-img{width:12px;height:12px}.message-actions .lx-approved-icon,.message-actions .lx-approved-icon-img{width:18px;height:18px}.lx-wpa-dot .lx-approved-icon{width:12px;height:12px;color:#ffffff}.obtn .lx-approved-icon,.obtn .lx-approved-icon-img{width:18px;height:18px}";
  (document.head || document.documentElement).appendChild(style);
  window.__lxApprovedIcon = function lxApprovedIcon(name, className) {
    if (!approvedIcons.has(name)) return "";
    const safeClass = String(className || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
    if (name === "global-next") {
      return '<img class="lx-approved-icon-img' + (safeClass ? " " + safeClass : "") + '" src="../icons/global-next.svg" alt="" aria-hidden="true">';
    }
    return '<span class="lx-approved-icon' + (safeClass ? " " + safeClass : "") + '" style="--lx-icon:url(\'../icons/' + name + '.svg\')" aria-hidden="true"></span>';
  };
}

const lxAutoGeoOnSiteEntry = window.__LX_TEMPLATE_PAGE === "home";
if (lxAutoGeoOnSiteEntry && !window.__lxGeoRequested && navigator.geolocation) {
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

// AI 回复前端打字机：即使服务端一次性返回整段，也按字符渐进展示。
if (!window.__lxCreateTypewriter) {
  window.__lxCreateTypewriter = function createTypewriter(target, options) {
    var cfg = options || {};
    var source = "";
    var rendered = 0;
    var timer = 0;
    var drains = [];
    var charsPerTick = Number(cfg.charsPerTick || 1);
    var interval = Number(cfg.interval || 24);
    var scroll = typeof cfg.scroll === "function" ? cfg.scroll : function () {};

    function finishDrains() {
      var pending = drains.splice(0);
      pending.forEach(function (resolve) { resolve(source); });
    }

    function tick() {
      if (!target) return;
      if (rendered >= source.length) {
        window.clearInterval(timer);
        timer = 0;
        target.classList.remove("streaming");
        finishDrains();
        return;
      }
      var step = charsPerTick;
      rendered = Math.min(source.length, rendered + step);
      target.textContent = source.slice(0, rendered);
      target.classList.add("streaming");
      scroll();
    }

    function start() {
      if (!timer) timer = window.setInterval(tick, interval);
      tick();
    }

    return {
      append: function (text) {
        source += String(text || "");
        if (source.length > rendered) start();
      },
      set: function (text) {
        source = String(text || "");
        if (rendered > source.length) rendered = 0;
        start();
      },
      raw: function () {
        return source;
      },
      drain: function () {
        if (rendered >= source.length && !timer) return Promise.resolve(source);
        return new Promise(function (resolve) { drains.push(resolve); });
      }
    };
  };
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
        const LX_PAGE_LABELS = { home: "首页", personal: "个人及家庭", business: "中小企业", enterprise: "政教及大企业", brand: "品牌" };
        const LX_SOURCE_PAGE_KEY = "lexiang.conversation.sourcePage.v1";
        function lxLogicalPath() {
          return String(window.__LX_TEMPLATE_PATH || location.pathname || "/");
        }
        function lxPageFromPath(path = lxLogicalPath()) {
          const normalized = String(path || "/").replace(/\/+$/, "") || "/";
          return SITE_BY_PATH[normalized] || SITE_BY_PATH[`${normalized}/`] || "home";
        }
        function lxSetConversationSourcePage(page) {
          const sourcePage = LX_PAGE_LABELS[page] ? page : lxPageFromPath();
          state.conversationSourcePage = sourcePage;
          window.__lxConversationSourcePage = sourcePage;
          try { localStorage.setItem(LX_SOURCE_PAGE_KEY, sourcePage); } catch (_e) {}
          return sourcePage;
        }
        function hardNavigatePage(page) {
          const path = PATH_BY_PAGE[page || "home"] || "/";
          try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (_e) {}
          const currentPath = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
          const targetPath = path.endsWith("/") ? path : `${path}/`;
          if (currentPath === targetPath) {
            location.reload();
            return;
          }
          location.assign(path);
        }
        const LX_AUTH_USER_KEY = "lexiang.auth.user.v1";
        const LX_GUEST_QUERY_COUNT_KEY = "lexiang.guestQueryCount.v1";
        function lxReadStoredAuthUser() {
          try { return JSON.parse(localStorage.getItem(LX_AUTH_USER_KEY) || "null"); } catch (_e) { return null; }
        }
        function lxStoreAuthUser(user) {
          try {
            if (user) localStorage.setItem(LX_AUTH_USER_KEY, JSON.stringify(user));
            else localStorage.removeItem(LX_AUTH_USER_KEY);
          } catch (_e) {}
        }
        const state = {
          page: lxPageFromPath(),
          convId: null,
          sending: false,
          user: lxReadStoredAuthUser(),
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
          conversationSourcePage: lxPageFromPath(),
          refProducts: [],
          localArchiveId: null // 件3：当前对话在共享历史侧栏(lexiang.lxfd.convs.v1)里的稳定条目id，反复覆盖同一条不新增
        };
        window.__lxState = state;
        // 统一生成态门禁：智能体开始生成即刻隐藏“乐享预判/建议你问”悬浮卡，
        // 生成完成后只恢复悬停能力，不自动恢复上一张预判卡。
        let lxSendingState = false;
        Object.defineProperty(state, "sending", {
          configurable: true,
          enumerable: true,
          get: () => lxSendingState,
          set: (value) => {
            lxSendingState = Boolean(value);
            document.body?.classList.toggle("lx-agent-generating", lxSendingState);
            if (!lxSendingState) return;
            if (state.hoverPromptTimer) window.clearTimeout(state.hoverPromptTimer);
            if (state.hoverPromptAutoCloseTimer) window.clearTimeout(state.hoverPromptAutoCloseTimer);
            state.hoverPromptTimer = null;
            state.hoverPromptAutoCloseTimer = null;
            state.hoverPromptVisibleSku = "";
            document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");
            document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active", "assistant-glass-active");
            const hoverList = document.querySelector("[data-hover-prompt-list]");
            if (hoverList) hoverList.innerHTML = "";
          }
        });
        // 多步任务链框架（app-agent.js，独立 IIFE）跨文件调用的操作原子桥接——只暴露必要函数，不暴露整个闭包
        window.__lxAgentAPI = {
          openProduct, addCart, lxBuyWithIntro, lxClaimBenefits, lxUpsertCompareTab, openStudentAuth,
          lxPreparePendingPayment, lxOpenPendingPaymentModal, lxRunUnifiedDiscountOrderAnswer,
          addAiMessage: (html) => addMessage("ai", "", html),
          lxRevealContent, getState: () => state,
          lxResolveRecommendedProduct,
          // 正文视觉稳定信号：最后一条 AI 消息 1.5s 内容不再变化且不在 loading 态（通吃官方流/
          // 火山兜底流/打字动画）。代买链数据到位后等这个再推进，否则「上面还在输出、下面已领券」
          waitAnswerSettled: () => new Promise((resolve) => {
            let last = ""; let still = 0; const t0 = Date.now();
            const timer = setInterval(() => {
              const ais = document.querySelectorAll(".lx-p0-messages .lx-p0-message.ai");
              const el = ais[ais.length - 1];
              const loading = el && (el.classList.contains("loading") || el.querySelector(".loading-line, .typing-text, .typing-cursor"));
              // snap 必须含 textContent 长度：打字机逐字往同一文本节点里加字，_raw 早已拼完、
              // DOM 节点数也不变，只看那两项会在打字刚开始就误判「已展示稳定」（真机反馈：
              // 正文还在输出、链已经跑到下单）
              const snap = el ? `${(el._raw || "").length}:${el.querySelectorAll("*").length}:${(el.textContent || "").length}` : "";
              if (!loading && snap === last) still += 1; else { still = 0; last = snap; }
              if (still >= 3 || Date.now() - t0 > 60000) { clearInterval(timer); resolve(); }
            }, 500);
          }),
        };

        function lxPrepareRootSplitState() {
          const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
          const pageByPath = {
            "/shop-chat": "personal",
            "/b-chat": "business",
            "/biz-chat": "enterprise",
            "/brand": "brand"
          };
          // 从频道分屏展开全屏时，normalizeFullscreenEntryState 会临时把 body
          // 设为 home。收起必须以真实 URL/模板频道恢复，不能硬编码回 personal。
          const splitPage = pageByPath[logicalPath] ||
            (["personal", "business", "enterprise", "brand"].includes(state.page) ? state.page : "personal");
          document.documentElement.classList.remove("lx-root-lxfd-prepaint");
          document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lxfd-entering", "lx-root-home");
          document.body.classList.add("lx-home-split", "lxfd-split-entered");
          document.body.dataset.page = splitPage;
          document.body.dataset.state = "chat";
          state.autoFs = false;
          window.__LXFD_FORCE = false;
          const lxfdLayer = document.querySelector(".lxfd");
          if (lxfdLayer) {
            lxfdLayer.style.display = "";
            lxfdLayer.style.visibility = "";
          }
          state.page = splitPage;
          if (!Array.isArray(state.siteProducts) || !state.siteProducts.length) loadProductsForPage();
        }

        function lxIsRootFullscreenReveal() {
          return String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "/") === "/" &&
            !document.body.classList.contains("lx-home-split") &&
            (state.page === "home" || !state.page || document.body.dataset.page === "home") &&
            (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs"));
        }

        function lxRunWithRevealMotion(fn) {
          if (lxIsRootFullscreenReveal() && typeof window.__lxfdExitWithReveal === "function") {
            window.__lxfdExitWithReveal(() => {
              lxPrepareRootSplitState();
              fn();
            });
            return;
          }
          if (state.page === "home" || !state.page || document.body.dataset.page === "home") {
            lxPrepareRootSplitState();
          }
          fn();
        }

        // ── 双对话桥接接口（lxfd IIFE ↔ 主面板 IIFE 跨作用域通信） ────────────
        window.__lxBridge = {
          // 全屏欢迎态首问=新对话：清掉 boot 时 restore 的旧对话上下文（DOM/convId/持久化键/
          // 提问历史/归档id），否则首问桥接进分屏带着"以上为历史对话"的旧账（真机反馈）。
          // 旧对话已被归档进侧栏历史（convs.v1），随时可找回；归档id一并重置防新对话覆盖旧条目。
          resetConversationContext: function() {
            state.convId = null;
            state.localArchiveId = null;
            state.queryHistory = [];
            state.queryAnchors = [];
            const list = $(".lx-p0-messages");
            if (list) list.innerHTML = "";
            try { localStorage.removeItem(LX_CONV_KEY); } catch (_e) {}
            try { renderQueryHistory(); } catch (_e) {}
          },
          // 全屏首页空白态顶栏历史入口用：与分屏 .history-button 同一个「历史记录」弹窗
          openHistoryModal: function() { lxOpenHistoryModal(); },
          // 把 lxfd 收集的消息写进主面板对话列表
          importConversation: function(messages, convId, meta) {
            const list = ensureChat();
            list.innerHTML = "";
            state.queryHistory = [];
            state.queryAnchors = [];
            messages.forEach(function(m) {
              addMessage(m.role, m.role === "user" ? m.text : "", m.role === "ai" ? m.html : "");
            });
            lxRebuildQueryHistoryFromDom();
            renderQueryHistory();
            if (convId) state.convId = convId;
            // 件3：沿用 lxfd 那边的本地归档id，桥接后主面板 upsert 覆盖的是同一条历史记录，
            // 不会因为两边各自开了不同id而在侧栏里出现同一通对话的两条重复条目
            if (meta && meta.localId) state.localArchiveId = meta.localId;
            if (meta && meta.sourcePage) lxSetConversationSourcePage(meta.sourcePage);
            // 立即持久化（不靠防抖）——桥接后可能马上切站，防抖会被吞
            try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (_e) {}
          },
          // 退全屏 + 右侧显示商品/页面
          revealProducts: function(products, opts) {
            lxRunWithRevealMotion(() => {
              lxRevealContent();
              // 件2 F1：桥接瞬间主面板刚从 display:none 变为可见，此前 addMessage 里的
              // list.scrollTop=list.scrollHeight 发生在隐藏期间是空操作（隐藏元素布局塌陷为0），
              // 面板留在顶部，答后追问 chip（如「对比第1、2、3款」）被压到composer下方点不到；
              // 这里刚显影就补一次，此时布局已强制重算，滚动到底才是真值。
              const _list = ensureChat();
              if (_list) _list.scrollTop = _list.scrollHeight;
              if (products && products.length === 1 && products[0] && products[0].sku) {
                openProduct(products[0].sku);
                return;
              }
              if (products && products.length) {
                // 全屏历史推荐卡回放时沿用原 recoId，保证卡片与 Tab 仍是一一对应；
                // 只有首次生成且没有稳定身份时才创建新 ID。
                const recoId = (opts && opts.recoId) || lxStoreRecoPayload(products);
                if (opts && opts.recoId) {
                  window.__lxRecoPayloads = window.__lxRecoPayloads || {};
                  window.__lxRecoPayloads[recoId] = products;
                }
                const recoTab = {
                  id: lxRecoTabId(recoId),
                  kind: "reco",
                  label: (opts && opts.title) || "AI 推荐",
                  products: products,
                  grouped: !!(opts && opts.grouped),
                  recoId: recoId
                };
                lxUpsertTab(recoTab);
                lxRunTab(recoTab);
              }
            });
          },
          // 只聚焦已有推荐页：用于全屏 CTA 数据兜底，避免点击后停留在全屏首页
          focusReco: function() {
            lxRunWithRevealMotion(() => {
              lxRevealContent();
              const _list = ensureChat();
              if (_list) _list.scrollTop = _list.scrollHeight; // 同 revealProducts，桥接刚显影补一次滚底
              const tab = (state.tabs || []).slice().reverse().find((item) => item.kind === "reco" || item.id === "reco");
              if (tab) {
                state.activeTabId = tab.id;
                lxRenderTabbar();
                lxRunTab(tab);
              }
            });
          },
          // 全屏推荐卡收起后，精确恢复其对应的右侧标签；只切换活动标签，不清理其它标签。
          activateTab: function(id) {
            const tabId = String(id || "");
            if (!tabId || !(state.tabs || []).some((item) => item && item.id === tabId)) return false;
            lxPrepareRootSplitState();
            lxRevealContent();
            lxActivateTab(tabId);
            lxAssertGovernedSplitResultState(tabId);
            return true;
          },
          // 全屏结果卡专用：既激活现存 Tab，也按稳定 ID 从缓存重建已关闭的结果页。
          // 避免通过 DOM 二次 click 重新进入多个全局委托分支，引发首页/分屏状态竞争。
          restoreResultTab: function(id) {
            const tabId = String(id || "");
            if (!tabId) return false;
            lxPrepareRootSplitState();
            lxRevealContent();
            const existing = (state.tabs || []).find((item) => item && item.id === tabId);
            if (existing) {
              lxActivateTab(tabId);
              lxAssertGovernedSplitResultState(tabId);
              return true;
            }
            // 通用注册表优先：五个入口、频道切换、Tab 关闭和全屏收起后，
            // 都使用创建结果时的同一份 payload 与同一渲染器重建。
            const registered = lxReadResultTab(tabId);
            if (registered) {
              lxUpsertTab(registered, false);
              lxActivateTab(tabId);
              lxAssertGovernedSplitResultState(tabId);
              return true;
            }
            if (tabId === "info:solution") {
              openSolutionCenter();
              return true;
            }
            if (tabId === "info:member") {
              openMemberCenter();
              return true;
            }
            if (tabId === "info:devices") {
              openMemberDevicesCenter();
              return true;
            }
            if (tabId.startsWith("info:solution-compare:")) {
              const cached = lxSolutionCompareTabCache.get(tabId) || state.solutionCompareTabs?.[tabId] || null;
              if (!cached) return false;
              const restored = { ...cached };
              lxUpsertTab(restored);
              lxRunTab((state.tabs || []).find((item) => item.id === tabId) || restored);
              lxRemoveUnrequestedSiteTabFromSolutionFlow();
              lxAssertGovernedSplitResultState(tabId);
              return true;
            }
            if (tabId.startsWith("info:solution-detail:")) {
              const cached = state.solutionDetailTabs?.[tabId] || lxSpecificSolutionTabCache.get(tabId) || lxClosedSpecificSolutionTabCache.get(tabId) || null;
              if (!cached) return false;
              lxUpsertTab({ ...cached }, false);
              lxActivateTab(tabId);
              lxAssertGovernedSplitResultState(tabId);
              return true;
            }
            return false;
          },
          // 五个入口的结果卡只走这一个分发器。卡片上若同时存在旧的
          // data-lx-open-tab 和新的 data-lx-result-id，一律以稳定 resultId 为准。
          restoreResultCard: function(card) {
            if (!card) return false;
            const feature = card.getAttribute("data-lxfd-open-feature") || "";
            const solutionTitle = card.getAttribute("data-specific-solution-cta") || "";
            const recoId = card.getAttribute("data-lxfd-reco-id") || "";
            const productSku = card.getAttribute("data-open-product") || "";
            const recommendedModalAction = card.getAttribute("data-lx-recommended-modal") || "";
            const recommendedModalPayload = card.getAttribute("data-lx-recommended-modal-payload") || "";
            const resultId = card.getAttribute("data-lx-result-id") ||
              (solutionTitle ? `info:solution-detail:${solutionTitle}` :
                (card.getAttribute("data-lx-open-tab") ||
                  (feature === "solution" ? "info:solution" :
                    (feature === "documents" ? "documents" : ""))));

            // 企业认证卡可能来自旧会话，必须优先于残留的教育认证属性处理。
            if (card.hasAttribute("data-open-enterprise-auth-modal") || resultId === "modal:enterprise-member-auth") {
              return lxOpenRecommendedModal("enterprise-member-auth");
            }
            if (recommendedModalAction && lxOpenRecommendedModal(recommendedModalAction, recommendedModalPayload)) return true;
            // 兼容升级前已经保存在历史对话里的认证结果卡。
            if (resultId.startsWith("modal:education-auth:")) return lxOpenRecommendedModal("education-auth", resultId.slice("modal:education-auth:".length));
            if (resultId === "modal:workplace-auth") return lxOpenRecommendedModal("workplace-auth");
            if (resultId === "modal:pending-payment") return lxOpenRecommendedModal("pending-payment");
            if (resultId && window.__lxBridge.restoreResultTab(resultId)) return true;
            if (resultId.startsWith("info:solution-compare:") && lxMigrateLegacySolutionCompareCard(card, resultId)) {
              lxAssertGovernedSplitResultState(resultId);
              return true;
            }
            if (resultId.startsWith("info:document-insight:")) {
              if (typeof window.__lxRestoreDocumentInsightTab !== "function") openDocumentCenter();
              if (typeof window.__lxRestoreDocumentInsightTab === "function" && window.__lxRestoreDocumentInsightTab(resultId)) {
                lxAssertGovernedSplitResultState(resultId);
                return true;
              }
            }
            if (feature === "solution") {
              openSolutionCenter();
              lxAssertGovernedSplitResultState("info:solution");
              return true;
            }
            if (feature === "documents") {
              openDocumentCenter();
              lxAssertGovernedSplitResultState("documents");
              return true;
            }
            if (feature === "devices") {
              openMemberDevicesCenter();
              lxAssertGovernedSplitResultState("info:devices");
              return true;
            }
            if (productSku) {
              openProduct(productSku);
              return true;
            }
            if (recoId) {
              const products = lxReadRecoPayload(recoId);
              if (products?.length) {
                window.__lxBridge.revealProducts(products, { title: "AI 推荐", recoId });
                return true;
              }
            }
            return false;
          },
          // 退出全屏（带动画）
          exitFullscreen: function() { lxSetAutoFs(false); },
          // 当前是否有右侧 tab
          hasTabs: function() { return !!(state.tabs && state.tabs.length > 0); },
          // 让 lxfd IIFE 调主面板 lxExecControl（跨 IIFE 桥）
          execControl: function(op, target) { lxExecControl(op, target); },
          // 频道全屏里点“新建对话”：回到当前频道的左右结构新对话态。
          newConversationInCurrentChannel: function() {
            lxPrepareRootSplitState();
            resetConversation();
            try { window.__lxSetConversationQuery?.(""); } catch (_e) {}
            try { window.__lxSyncTopNavTitle?.(); } catch (_e) {}
          },
          // 件2 全屏接入：代买意图桥接到分屏后，把原句交给主面板 sendChat 重新走一遍
          // （官方推荐 promise+超预算 fallback 阶梯+链前置已在这完整实现，全屏不重造）
          sendChat: function(text) { return sendChat(text); },
          // 件2 全屏接入：思考时间线渲染函数只留一份，全屏 IIFE 挂桥调用，不复制实现
          renderSkillTrace: function(lines, opts) { return renderSkillTrace(lines, opts); },
          // 件2 代买链桥接真机踩坑修复：多步任务链的 addAiMessage 走的是裸 addMessage，不经过
          // lxRunWithRevealMotion，不会像 revealProducts 那样自动把根路径首页切进分屏布局——
          // 桥接完退全屏后背景停留在首页欢迎门户，链卡/下单弹窗虽在DOM里但看不见。这里让
          // lxfd 那边退全屏回调里显式补一次（复用已验证的 lxPrepareRootSplitState，不重造）。
          prepareRootSplitState: function() { lxPrepareRootSplitState(); }
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
        function lxStoreRecoPayload(products) {
          if (!Array.isArray(products) || !products.length) return "";
          const id = "reco-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          window.__lxRecoPayloads = window.__lxRecoPayloads || {};
          window.__lxRecoPayloads[id] = products;
          // 同步持久化（裁剪字段+只留最近8组）：恢复历史对话后「查看推荐商品」CTA 还能取回
          // 那一轮的商品——之前只存内存，刷新/恢复后点击静默没反应（真机反馈）
          try {
            const key = "lexiang.recoPayloads.v1";
            const store = JSON.parse(localStorage.getItem(key) || "[]");
            store.push({ id, products: products.slice(0, 8).map((p) => ({ sku: p.sku, name: p.name, price: p.price, image_url: p.image_url || p.image, specs: p.specs, description: (p.description || "").slice(0, 400) })) });
            localStorage.setItem(key, JSON.stringify(store.slice(-8)));
          } catch (_e) {}
          return id;
        }
        function lxReadRecoPayload(id) {
          if (!id) return null;
          const mem = window.__lxRecoPayloads && window.__lxRecoPayloads[id];
          if (mem && mem.length) return mem;
          try {
            const store = JSON.parse(localStorage.getItem("lexiang.recoPayloads.v1") || "[]");
            const hit = store.find((row) => row && row.id === id);
            if (hit && Array.isArray(hit.products) && hit.products.length) return hit.products;
          } catch (_e) {}
          return null;
        }
        function lxRecoTabId(recoId) {
          return recoId ? `reco:${recoId}` : `reco:${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        // 所有“对话结果卡 ↔ 右侧页面”共用一份跨频道注册表。以前方案对比
        // 只存当前页内存，切换频道后只剩卡片 ID，导致右侧空白。新结果类型只要
        // 经过 lxUpsertTab 就自动持久化，不再按卡片类型打补丁。
        const LX_RESULT_TAB_REGISTRY_KEY = "lexiang.resultTabs.v1";
        const lxResultTabRegistry = new Map();
        function lxSerializableResultTab(tab) {
          if (!tab || !tab.id || tab.kind === "site") return null;
          try {
            const copy = JSON.parse(JSON.stringify(tab, (key, value) => key === "__fresh" ? undefined : value));
            return copy && copy.id ? copy : null;
          } catch (_e) { return null; }
        }
        function lxRememberResultTab(tab) {
          const snapshot = lxSerializableResultTab(tab);
          if (!snapshot) return;
          lxResultTabRegistry.set(snapshot.id, snapshot);
          try {
            const stored = JSON.parse(localStorage.getItem(LX_RESULT_TAB_REGISTRY_KEY) || "[]");
            const rows = Array.isArray(stored) ? stored.filter((row) => row?.id !== snapshot.id) : [];
            rows.push(snapshot);
            const compact = rows.slice(-20).map((row) => {
              if (typeof row?.html !== "string" || row.html.length <= 240000) return row;
              return { ...row, html: row.html.slice(0, 240000) };
            });
            localStorage.setItem(LX_RESULT_TAB_REGISTRY_KEY, JSON.stringify(compact));
          } catch (_e) {}
        }
        function lxReadResultTab(id) {
          const tabId = String(id || "");
          if (!tabId) return null;
          const live = lxResultTabRegistry.get(tabId);
          if (live) return { ...live };
          try {
            const stored = JSON.parse(localStorage.getItem(LX_RESULT_TAB_REGISTRY_KEY) || "[]");
            const hit = Array.isArray(stored) ? stored.slice().reverse().find((row) => row?.id === tabId) : null;
            if (hit) {
              lxResultTabRegistry.set(tabId, hit);
              return { ...hit };
            }
          } catch (_e) {}
          return null;
        }
        function lxLatestRecoIdInMessage(message) {
          if (!message || !message.querySelectorAll) return "";
          const cards = message.querySelectorAll("[data-lxfd-reco-id]");
          return cards.length ? (cards[cards.length - 1].getAttribute("data-lxfd-reco-id") || "") : "";
        }
        function lxCreateRecoTab(products, options) {
          const opts = options || {};
          const recoId = opts.recoId || lxStoreRecoPayload(products);
          return {
            id: lxRecoTabId(recoId),
            kind: "reco",
            label: opts.label || "AI 推荐",
            products: products,
            grouped: !!opts.grouped,
            recoId: recoId
          };
        }
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

        const LX_MODAL_OVERLAY_BACKGROUND = "#190e21d1";

        function applyUnifiedModalOverlay(mask) {
          if (!mask) return mask;
          mask.style.setProperty("background", LX_MODAL_OVERLAY_BACKGROUND, "important");
          mask.style.setProperty("background-color", LX_MODAL_OVERLAY_BACKGROUND, "important");
          mask.style.setProperty("backdrop-filter", "none", "important");
          mask.style.setProperty("-webkit-backdrop-filter", "none", "important");
          return mask;
        }

        function ensureModal() {
          let mask = $(".lx-p0-modal-mask");
          if (mask) return applyUnifiedModalOverlay(mask);
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
          return applyUnifiedModalOverlay(mask);
        }

        function openModal(title, html, options = {}) {
          const mask = ensureModal();
          applyUnifiedModalOverlay(mask);
          const isOrderSkin = options.skin === "order";
          const isAddrSkin = options.skin === "address";
          const isLeadSkin = options.skin === "lead";
          const isAuthSkin = options.skin === "auth";
          const modal = $(".lx-p0-modal", mask);
          const head = $(".lx-p0-modal-head", mask);
          mask.classList.toggle("lx-order-modal-mask", isOrderSkin);
          mask.classList.toggle("lx-addr-modal-mask", isAddrSkin);
          mask.classList.toggle("lx-lead-modal-mask", isLeadSkin);
          mask.classList.toggle("lx-auth-modal-mask", isAuthSkin);
          if (modal) {
            modal.className = isOrderSkin ? "lx-p0-modal co lx-order-skin" : isAddrSkin ? "lx-p0-modal ad lx-addr-skin" : isLeadSkin ? "lx-p0-modal lx-lead-shell" : isAuthSkin ? "lx-p0-modal lx-auth-modal" : "lx-p0-modal";
            modal.style.setProperty("box-shadow", "none", "important");
            modal.style.setProperty("filter", "none", "important");
            if (isOrderSkin || isAddrSkin) modal.setAttribute("data-v", "1");
            else modal.removeAttribute("data-v");
          }
          // 行内样式兜底：CSS 文件屡被并发覆盖丢掉 [hidden] 规则，行内 display 优先级最高盖不掉（订单弹窗双×回归根治）
          if (head) { head.hidden = isOrderSkin || isAddrSkin || isAuthSkin; head.style.display = (isOrderSkin || isAddrSkin || isAuthSkin) ? "none" : ""; }
          $(".lx-p0-modal-title", mask).textContent = title;
          $(".lx-p0-modal-body", mask).innerHTML = html;
          mask.classList.add("show");
        }

        function closeModal() {
          $(".lx-p0-modal-mask")?.classList.remove("show");
          try { lxCloseHistoryButtonState(); } catch (_e) {}
        }

        // 推荐弹层卡统一交互契约：生成后自动打开一次；关闭后可由原卡
        // 重复打开；全站复用同一个弹层容器，避免叠加多个实例。
        const lxRecommendedModalOpeners = new Map();
        function lxRegisterRecommendedModal(action, opener) {
          if (!action || typeof opener !== "function") return;
          lxRecommendedModalOpeners.set(String(action), opener);
        }
        function lxOpenRecommendedModal(action, payload = "") {
          const opener = lxRecommendedModalOpeners.get(String(action || ""));
          if (!opener) return false;
          opener(String(payload || ""));
          return true;
        }
        function lxAutoOpenRecommendedModal(action, payload = "") {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => lxOpenRecommendedModal(action, payload));
          });
        }
        lxRegisterRecommendedModal("education-auth", (kind) => openStudentAuth(kind || "college"));
        lxRegisterRecommendedModal("workplace-auth", () => openWorkplaceAuth());
        lxRegisterRecommendedModal("enterprise-member-auth", () => openEnterpriseAuth());
        lxRegisterRecommendedModal("enterprise-lead", () => openLeadPanel(state.page === "enterprise" ? "biz_intent" : "b_purchase"));
        lxRegisterRecommendedModal("store-appointment", (storeId) => lxOpenStoreAppointmentInFrame(storeId));
        lxRegisterRecommendedModal("pending-payment", () => lxOpenPendingPaymentModal());
        window.__lxRecommendedModalRule = Object.freeze({
          register: lxRegisterRecommendedModal,
          open: lxOpenRecommendedModal,
          autoOpen: lxAutoOpenRecommendedModal,
        });

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

        function lxClearRouteLoading() {
          document.documentElement.classList.remove("lx-route-prepaint");
          document.querySelector(".lx-route-loading")?.remove();
        }

        function routeTo(page, replace = false) {
          lxClearRouteLoading();
          const nextPage = page || "home";
          if (state.page !== nextPage) state.activeSiteFloorTab = "推荐";
          state.page = nextPage;
          const path = PATH_BY_PAGE[state.page] || "/";
          // file:// 下页面已经由各目录 index.html 承载逻辑路由。此时把线上绝对路径
          // 写进 History API 会抛 SecurityError，并中断后面的会话恢复初始化。
          if (location.protocol !== "file:" && location.pathname !== path) {
            history[replace ? "replaceState" : "pushState"](null, "", path);
          }
          const nav = $(`.main-nav [data-page="${state.page}"]`);
          nav?.click();
          loadProductsForPage();
        }

        function initRoute() {
          // Standalone templates expose their production route through
          // __LX_TEMPLATE_PATH; their file:// pathname is not an app route.
          const page = lxPageFromPath();
          routeTo(page, true);
          lxClearRouteLoading();
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
            // 任一独立「AI 推荐」标签激活中都不覆盖推荐墙，站点货盘仅存底供楼层使用。
            const activeTab = (state.tabs || []).find((tab) => tab.id === state.activeTabId);
            if (activeTab?.kind !== "reco") {
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
        function lxSubBrand(name, desc) {
          const m = String(name || "").match(LX_SUBBRAND_RE);
          if (m) {
            const s = m[0];
            if (/legion/i.test(s) || s === "拯救者") return "拯救者";
            if (/lecoo|来酷/i.test(s)) return "来酷";
            if (/thinkplus/i.test(s)) return "ThinkPlus";
            if (/geekpro/i.test(s)) return "GeeKPro";
            return s;
          }
          // 无子品牌系列词，但是联想自营品（名/描述含 Lenovo/联想）→ 标 Lenovo 角标；三方品(戴森/微果/礼品卡)仍留空
          if (/\bLenovo\b|联想/i.test(`${name || ""} ${desc || ""}`)) return "Lenovo";
          return "";
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

function compactSpuDisplayName(name) {
  const original = cleanSpuName(name) || "联想商品";
  let value = String(original).replace(/\s+/g, " ").trim();
  const yearMatch = value.match(/20\d{2}/);

  if (yearMatch && Number.isInteger(yearMatch.index)) {
    const end = yearMatch.index + yearMatch[0].length;
    let display = value.slice(0, end).trim();
    const edition = value.slice(end).match(/(?:锐龙版|酷睿版|AI版|高性能版|轻薄版)/);
    if (edition && /^(?:锐龙版|酷睿版)$/.test(edition[0])) display += ` ${edition[0]}`;
    return display;
  }

  value = value
    .split(/[（(【\[]/)[0]
    .split(/\s*[|｜/]\s*/)[0]
    .replace(/\s+(?:英特尔|AMD|酷睿|锐龙|Ultra|Windows|AI\s*\d).*$/i, "")
    .trim();
  return Array.from(value || original).slice(0, 32).join("");
}

function compactProductSpec(description, category) {
  const source = String(description || category || "联想官方正品").replace(/\s+/g, " ").trim();
  const parts = [];
  const add = (value) => {
    const text = String(value || "").replace(/英特尔/gi, "").replace(/Windows\s*11/gi, "Win 11").replace(/\s+/g, " ").trim();
    if (text && !parts.some((item) => item.toLowerCase() === text.toLowerCase())) parts.push(text);
  };
  add(source.match(/(?:酷睿\s*)?Ultra\s*[3579X]\s*[A-Z]?\d{3,4}[A-Z]*|锐龙\s*(?:AI\s*)?[3579]\s*[A-Z]*\s*\d{3,4}[A-Z]*|i[3579]-?\d{4,5}[A-Z]*/i)?.[0]);
  add(source.match(/\b(?:16|24|32|64|128)\s*G(?:B)?\b/i)?.[0]);
  add(source.match(/\b(?:512\s*G(?:B)?|[124]\s*T(?:B)?)\s*(?:SSD)?\b/i)?.[0]);
  add(source.match(/RTX\s*\d{4}(?:\s*Ti)?/i)?.[0]);
  add(source.match(/Windows\s*11/i)?.[0]);
  if (!parts.length) source.split(/\s*[|｜/,，；;]\s*/).filter(Boolean).slice(0, 3).forEach(add);
  return Array.from(parts.slice(0, 4).join("｜") || source).slice(0, 44).join("");
}

        function renderProductCards() {
          const cards = $$(".product-card");
          cards.forEach((card, index) => {
            const product = state.products[index];
            card.hidden = !product;
            if (!product) return;
            card.dataset.sku = product.sku || "";
            // 首屏静态商品卡也在真实数据绑定时立即补齐勾选控件；MutationObserver 仅作动态重绘兜底。
            lxEnsurePickBtn(card);
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
    if (title && state.page === "business") {
      const fullName = cleanSpuName(product.name) || "联想商品";
      title.textContent = compactSpuDisplayName(fullName);
      title.title = fullName;
    } else if (title) title.textContent = cleanSpuName(product.name) || "联想商品";
    if (spec && state.page === "business") {
      const fullSpec = product.description || product.category || "联想官方正品";
      spec.hidden = false;
      spec.textContent = compactProductSpec(fullSpec, product.category);
      spec.title = fullSpec;
    } else if (spec) {
      const fullSpec = product.description || product.category || "官方正品｜联想服务";
      spec.hidden = false;
      spec.textContent = fullSpec;
      spec.title = fullSpec;
    }
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
          return `<span style="font-size:${Number(size) || 16}px">${window.__lxApprovedIcon("global-sparkle")}</span>`;
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

        async function showHoverPrompts(product) {
          const bottom = $(".assistant-bottom");
          const list = $("[data-hover-prompt-list]");
          if (!bottom || !list) return;
          if (state.sending || document.body.classList.contains("lx-agent-generating")) {
            bottom.classList.remove("has-hover-prompts");
            document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active", "assistant-glass-active");
            list.innerHTML = "";
            return;
          }
          const key = String(product?.sku || product?.name || "");
          const alreadyVisible = bottom.classList.contains("has-hover-prompts") && state.hoverPromptVisibleSku === key && !!list.querySelector(".pop");
          if (!alreadyVisible) {
            list.innerHTML = renderHoverPromptPop(product);
            state.hoverPromptVisibleSku = key;
          }
          bottom.classList.add("has-hover-prompts");
          document.querySelector(".assistant-panel")?.classList.add("assistant-hover-active");
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
            document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active");
            state.hoverPromptVisibleSku = "";
            list.innerHTML = "";
            return;
          }
          pop.classList.add("is-closing");
          window.setTimeout(() => {
            bottom.classList.remove("has-hover-prompts");
            document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active");
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
          // Product-card dwell assistance is temporarily disabled site-wide.
          clearHoverPromptTimer();
          hideHoverPrompts();
          return;
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
            if (state.hoverPromptSku !== key || !card.isConnected || !card.matches(":hover") || card.classList.contains("lx-solution-card")) {
              state.hoverPromptSku = "";
              state.hoverPromptTimer = null;
              return;
            }
            showHoverPrompts(product);
            state.hoverPromptTimer = null;
          }, 3000);
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

        // 本地货盘 specs 只有运营字段（brand/lvl1/mtm），硬件参数在 description 配置串里
        // （「英特尔® 酷睿™ Ultra 7 251HX丨Windows 11丨16英寸丨16GB丨1TB SSD丨RTX5060 8G丨碳晶黑」）。
        // 对比页参数行靠 specs 白名单键渲染，本地候选不解析就整块消失（真机反馈）——按段归类补齐。
        function lxSpecsFromDescription(product) {
          const specs = { ...(product.specs || {}) };
          const segs = String(product.description || "").split(/丨|\||\//).map(s => s.trim()).filter(s => s && s.length <= 40);
          for (const seg of segs) {
            if (!specs.cpu && /酷睿|锐龙|Ultra\s*[3579X]|i[3579]-|R[3579]-|骁龙|龙芯/i.test(seg)) { specs.cpu = seg; continue; }
            if (!specs.gpu && /RTX|GTX|显卡|锐炫|Arc|集显|独显/i.test(seg)) { specs.gpu = seg; continue; }
            if (!specs.os && /Windows|Win\s*1[01]|麒麟|UOS/i.test(seg)) { specs.os = seg; continue; }
            if (!specs.screen_size && /英寸/.test(seg)) { specs.screen_size = seg; continue; }
            if (!specs.storage && /SSD|固态|[12468]TB(?!\s*内存)|512G[B]?(?!\s*内存)/i.test(seg)) { specs.storage = seg; continue; }
            if (!specs.ram && /^\d{1,3}\s*GB?$|内存/i.test(seg)) { specs.ram = seg; continue; }
            if (!specs.color && /^[^\d]{1,6}(黑|白|灰|银|紫|蓝|绿|贝|金)$/.test(seg)) { specs.color = seg; continue; }
          }
          return specs;
        }

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
          const detailRoot = $(".product-detail");
          const grid = detailRoot && $("[data-detail-review-grid]", detailRoot);
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
          const detailRoot = $(".product-detail");
          if (!detailRoot) return;
          const name = product.name || "联想商品";
          const category = product.category || "联想官方";
          const description = product.description || "联想官方商品，支持继续向联想乐享 AI 助手咨询选型、优惠和对比。";
          const setText = (sel, text) => { const node = $(sel, detailRoot); if (node) node.textContent = text; };
          setText("[data-detail-hero-title]", name);
          setText("[data-detail-hero-desc]", `${description} 页面信息会结合当前商品展示，购买前建议核对价格、库存和服务政策。`);
          setText("[data-detail-review-one]", `${name} 的核心配置清晰，适合结合预算、用途和服务需求继续比较。`);
          setText("[data-detail-review-two]", `用户关注点集中在${category}、做工质感和日常使用稳定性，可继续让联想乐享做同类对比。`);
          setText("[data-detail-review-three]", "购买前可继续查询教育特惠、以旧换新、门店服务和官方售后政策。");
          renderProductReviews(product);
          const specGrid = $("[data-detail-spec-grid]", detailRoot);
          if (specGrid) {
            const rows = getDisplaySpecRows(product);
            specGrid.innerHTML = rows.map(([label, value]) => `<div class="detail-spec-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
          }
        }

        async function openProduct(productOrSku, opts = {}) {
          let product = typeof productOrSku === "object" ? productOrSku : state.products.find((item) => item.sku === productOrSku);
          // 模版传入的临时商品也必须按 SKU 缓存；再次激活已有详情标签时仍能恢复完整价格、图片和配置。
          if (product && typeof productOrSku === "object" && product.sku) {
            state.officialProducts = state.officialProducts || {};
            state.officialProducts[product.sku] = { ...(state.officialProducts[product.sku] || {}), ...product };
          }
          if (typeof productOrSku === "string") {
            const cachedOfficialProduct = (state.officialProducts || {})[productOrSku] || null;
            if (cachedOfficialProduct) {
              product = cachedOfficialProduct;
            } else {
              try {
                const response = await fetch(`/api/products/${encodeURIComponent(productOrSku)}`, { cache: "no-store" });
                if (response.ok) product = await response.json();
              } catch {}
            }
          }
          if (!product) return toast("未找到该商品，可能已下架或仅官网在售");
          const detailTabId = product.sku ? `detail:${product.sku}` : "";
          const detailIsNewTab = !!detailTabId && !opts.noTab && !(state.tabs || []).some((tab) => tab.id === detailTabId);
          let detailGenToken = null;
          state.currentProduct = product;
          lxRevealContent();
          if (product.sku && opts.noTab) {
            // SPU 内切换配置：复用当前详情标签，不新开
            const active = (state.tabs || []).find((tab) => tab.id === state.activeTabId && tab.kind === "detail");
            if (active) { active.sku = product.sku; active.label = product.name || active.label; lxRenderTabbar(); }
          } else if (product.sku) {
            lxUpsertTab({ id: `detail:${product.sku}`, kind: "detail", label: product.name || "商品详情", sku: product.sku, product: { ...product } });
            if (detailIsNewTab) detailGenToken = lxBeginTabGeneration((state.tabs || []).find((tab) => tab.id === detailTabId));
          }
          document.querySelector(".content")?.setAttribute("data-view", "detail");
          document.querySelector(".content")?.scrollTo({ top: 0, behavior: "smooth" });
          const detailRoot = $(".product-detail");
          if (!detailRoot) return;
          const visual = $("[data-detail-visual]", detailRoot)?.parentElement;
          if (visual) visual.innerHTML = `<img class="detail-product-image" src="${esc(product.official ? (product.image_url || "") : imgUrl(product.image_url))}" alt="${esc(product.name || "商品图片")}" data-detail-visual />`;
          const setText = (sel, text) => { const node = $(sel, detailRoot); if (node) node.textContent = text; };
          setText("[data-detail-title]", product.name || "联想商品");
          setText("[data-detail-summary]", product.description || "联想官方商品，支持继续向联想乐享 AI 助手咨询选型、优惠和对比。");
          const priceNode = $("[data-detail-price]", detailRoot);
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
          detailRoot.querySelector(".lx-detail-official-link")?.remove();
          loadReviewSummary(product);
          loadFitReason(product);
          loadSpuVariants(product);
          lxEndTabGeneration(detailGenToken);
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

        function lxClaimTicketSvg() {
          return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/></svg>';
        }

        function lxClaimCheckSvg() {
          return window.__lxApprovedIcon("global-check");
        }

        function lxClaimChipCheckSvg() {
          return window.__lxApprovedIcon("global-check", "ck");
        }

        function lxClaimAmount(coupon) {
          return Math.abs(Number(coupon?.amount || 0));
        }

        function lxRenderClaimProgressCard(item, claimed, totalSaved) {
          const offers = Array.isArray(claimed) ? claimed : [];
          const chips = offers.map((coupon) => `
            <span class="chip" data-claim-name="${esc(coupon.label || "优惠券")}" data-claim-amount="${lxClaimAmount(coupon)}">
              <span class="od"></span>${esc(coupon.label || "优惠券")} <span class="cv">¥${lxClaimAmount(coupon).toLocaleString()}</span>
            </span>`).join("");
          return `
            <div class="cl lx-claim-skin" data-v="D" data-state="claiming" data-claim-product="${esc(item.name)}" data-claim-total="${Math.abs(Number(totalSaved || 0))}">
              <div class="drow">
                <span class="ic">${lxClaimTicketSvg()}</span>
                <span class="mid">
                  <div class="t1" data-t1>正在为你自动领取优惠</div>
                  <div class="t2">${esc(item.name)}</div>
                </span>
                <span class="cnt"><span class="n" data-cnt>0</span>/${offers.length}</span>
                <span class="done-amt"><span class="ok">${lxClaimCheckSvg()}</span>已省 ¥${Math.abs(Number(totalSaved || 0)).toLocaleString()}</span>
              </div>
              <div class="track"><span class="fill" style="width:0%"></span></div>
              <div class="chips">${chips}</div>
            </div>`;
        }

        function lxRenderClaimedStaticCard(productName, claimed, totalSaved) {
          const offers = Array.isArray(claimed) ? claimed : [];
          const chips = offers.map((coupon) => `
            <span class="chip">
              ${lxClaimChipCheckSvg()}${esc(coupon.label || "优惠券")} <span class="cv">¥${lxClaimAmount(coupon).toLocaleString()}</span>
            </span>`).join("");
          return `
            <div class="gc lx-claimed-skin" data-v="I" aria-disabled="true">
              <div class="irow">
                <span class="ic">${lxClaimTicketSvg()}</span>
                <span class="mid">
                  <div class="t1">已领取 ${offers.length} 项优惠 <span class="doneflag df">${lxClaimCheckSvg()}已领取</span></div>
                  <div class="t2">${esc(productName || "商品")} · 已收进卡包</div>
                </span>
                <span class="sa">已省 ¥${Math.abs(Number(totalSaved || 0)).toLocaleString()}</span>
              </div>
              <div class="chips">${chips}</div>
            </div>`;
        }

        function lxClaimInfoFromCard(card) {
          const productName = card?.dataset?.claimProduct || card?.querySelector(".t2")?.textContent?.trim() || "商品";
          const chips = Array.from(card?.querySelectorAll(".chip") || []);
          const claimed = chips.map((chip) => {
            const amount = Number(chip.dataset.claimAmount || String(chip.querySelector(".cv")?.textContent || "").replace(/[^0-9.]/g, "")) || 0;
            const label = chip.dataset.claimName || String(chip.textContent || "").replace(/¥\s?[\d,]+(?:\.\d+)?/g, "").trim() || "优惠券";
            return { label, amount };
          });
          const domTotal = String(card?.querySelector(".done-amt")?.textContent || "").replace(/[^0-9.]/g, "");
          const totalSaved = Number(card?.dataset?.claimTotal || domTotal) || claimed.reduce((sum, item) => sum + lxClaimAmount(item), 0);
          return { productName, claimed, totalSaved };
        }

        function lxArchiveClaimProgressCards(root = document) {
          root.querySelectorAll('.cl[data-v="D"].lx-claim-skin').forEach((card) => {
            const info = lxClaimInfoFromCard(card);
            card.outerHTML = lxRenderClaimedStaticCard(info.productName, info.claimed, info.totalSaved);
          });
        }

        function lxRunClaimProgressCard(root, claimed, totalSaved, onDone) {
          if (!root) {
            if (typeof onDone === "function") onDone();
            return;
          }
          const offers = Array.isArray(claimed) ? claimed : [];
          const t1 = root.querySelector("[data-t1]");
          const cnt = root.querySelector("[data-cnt]");
          const fill = root.querySelector(".fill");
          const chips = Array.from(root.querySelectorAll(".chip"));
          const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          const finish = () => {
            root.setAttribute("data-state", "done");
            if (t1) t1.textContent = `已为你领取 ${offers.length} 项优惠`;
            if (cnt) cnt.textContent = String(offers.length);
            if (fill) fill.style.width = "100%";
            chips.forEach((chip) => chip.classList.add("on"));
            ensureChat().scrollTop = ensureChat().scrollHeight;
            setTimeout(() => {
              if (typeof onDone === "function") onDone();
            }, reduced ? 0 : 260);
          };
          const reset = () => {
            root.setAttribute("data-state", "claiming");
            if (t1) t1.textContent = "正在为你自动领取优惠";
            if (cnt) cnt.textContent = "0";
            if (fill) fill.style.width = "0%";
            chips.forEach((chip) => chip.classList.remove("on"));
          };
          const run = () => {
            reset();
            if (!offers.length || reduced) {
              finish();
              return;
            }
            offers.forEach((_, i) => {
              setTimeout(() => {
                const pct = Math.round(((i + 1) / offers.length) * 100);
                if (fill) fill.style.width = `${pct}%`;
                if (cnt) cnt.textContent = String(i + 1);
                if (chips[i]) chips[i].classList.add("on");
                ensureChat().scrollTop = ensureChat().scrollHeight;
              }, 480 + i * 640);
            });
            setTimeout(finish, 480 + offers.length * 640 + 150);
          };
          root.__replay = run;
          run();
        }

        function lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr) {
          const fmt = (value) => {
            const n = Number(value) || 0;
            return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
          };
          const couponCount = claimed.length;
          const saved = Math.abs(Number(discount) || 0);
          const payable = Number(finalPrice || item.price || 0);
          const rows = claimed.map((c) => `
              <div class="ofr">
                <span class="ck">${lxClaimCheckSvg()}</span>
                <span class="oc"><span class="on">${esc(c.label)}</span><span class="od">${esc(c.reason || "已自动领取并使用")}</span></span>
                <span class="ov minus">-¥${fmt(Math.abs(c.amount))}</span>
              </div>`).join("");
          const emptyRows = '<p class="lx-order-empty">该商品暂无可叠加优惠，按标价下单。</p>';
          openModal("", `
            <div class="order-head">
              <div class="title">待支付订单${couponCount ? `<span class="gp">${lxClaimCheckSvg()}已领取 ${couponCount} 项优惠</span>` : ""}</div>
              <button class="x lx-p0-close" type="button" aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="prod">
              <span class="pic"><img src="${esc(imgUrl(item.image_url))}" alt="${esc(item.name || "商品图")}" /></span>
              <span class="pc"><span class="pn">${esc(item.name)}</span><span class="pp">标价 <s>¥${fmt(item.price)}</s></span></span>
            </div>
            <div class="offers">${rows || emptyRows}</div>
            <div class="total">
              <span class="tl"><span class="tk">到手价</span>${saved ? `<span class="ts">已为你省 ¥${fmt(saved)}</span>` : ""}</span>
              <span class="tp"><span class="cur">¥</span>${fmt(payable)}</span>
            </div>
            <div class="user">
              <span class="ui">${window.__lxApprovedIcon("mall-account")}</span>
              <span class="ut"><span class="un">${esc(addr.name)} ${esc(addr.phone)}</span><span class="ud">${esc(addr.region || "")}${esc(addr.detail || "")}</span></span>
              <button class="edit" type="button" data-occ-addr>修改</button>
            </div>
            <button class="cta" type="button" data-occ-confirm>确认支付 · <span class="amt">¥${fmt(payable)}</span></button>
            <p class="foot-tip">演示环境：订单仅保存在本机浏览器，不会真实发货。</p>`, { skin: "order" });
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
          const card = lxRenderClaimProgressCard(item, claimed, Math.abs(discount));
          const node = addMessage("assistant", "");
          lxEnsureAiBody(node).innerHTML = `<p>好的！为你自动领取 ${claimed.length} 项专属优惠：</p>${card}`;
          // 标记非空 _raw，让持久化保留这条优惠领取卡（否则刷新后中间卡片全丢）
          node._raw = `好的！为你自动领取 ${claimed.length} 项专属优惠`;
          const claimCard = node.querySelector('.cl[data-v="D"].lx-claim-skin');
          lxRunClaimProgressCard(claimCard, claimed, Math.abs(discount), () => {
            state._buyFlowRunning = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {} // 优惠卡动画跑完(计数器停)再存一次，保住最终态——用真·立即存，不吃400ms防抖
            lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr);
          });
        }

        function lxPreparePendingPayment(product = state.currentProduct) {
          if (!product) return null;
          const item = normalizeProduct(product);
          const { claimed, discount, finalPrice } = lxClaimBenefits(product);
          let addr = lxAddresses()[0];
          if (!addr) {
            addr = { name: "演示用户", phone: "138****0000", region: "演示地址", detail: "可在订单中修改收货信息" };
            save("lexiang.addresses.v1", [addr]);
          }
          state.pendingOrderProduct = { ...item, benefits: claimed, original_price: item.price, price: finalPrice || item.price };
          state.pendingOrderAddr = addr;
          return { item, claimed, discount, finalPrice, addr };
        }

        function lxOpenPendingPaymentModal() {
          const pending = state.pendingOrderProduct;
          if (!pending) return toast("待支付订单已失效，请重新领取优惠");
          const item = normalizeProduct({ ...pending, price: pending.original_price || pending.price });
          const claimed = Array.isArray(pending.benefits) ? pending.benefits : [];
          const finalPrice = Number(pending.price || item.price || 0);
          const discount = finalPrice - Number(pending.original_price || item.price || 0);
          const addr = state.pendingOrderAddr || lxAddresses()[0] || { name: "演示用户", phone: "138****0000", region: "演示地址", detail: "可在订单中修改收货信息" };
          lxOpenOrderConfirm(item, claimed, discount, finalPrice, addr);
        }

        function lxDiscountOrderRecommendationCard() {
          return `<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-payment-confirm-reco" type="button" data-lx-recommended-modal="pending-payment" data-open-payment-confirm data-lx-result-id="modal:pending-payment" aria-label="打开待支付订单弹窗" aria-pressed="false"><span class="answer-cta-title">待支付订单</span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`;
        }

        async function lxRunUnifiedDiscountOrderAnswer(product = state._pendingDiscountOrderProduct || state.currentProduct) {
          if (!product) {
            addMessage("assistant", "请先选择要购买的商品，我再为你领取可用优惠并生成待支付订单。");
            return;
          }
          if (state._buyFlowRunning) return;
          state._buyFlowRunning = true;
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const prepared = lxPreparePendingPayment(product);
          const { item, claimed, discount } = prepared;
          const lines = ["联想乐享正在判断你的优惠下单需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push(`已判断：需要核对${item.name}与当前账户可用优惠`);
            paint();
            await wait(520);
            skills.add("Skill(优惠领取与订单生成)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(优惠领取与订单生成)");
            paint();
            await wait(760);
            lines[lines.length - 1] = `联想乐享官方 SKILL：已自动领取全部 ${claimed.length} 项可用优惠`;
            paint();
            const saved = Math.abs(Number(discount) || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
            const copy = claimed.length
              ? `已为你自动领取**${claimed.length}项可用优惠**，共节省¥${saved}。商品、优惠与收货信息已核对，请在**待支付订单**中确认后继续。`
              : `当前商品暂无可叠加优惠，已按现价生成订单。商品与收货信息已核对，请在**待支付订单**中确认后继续。`;
            ai._raw = copy;
            await lxAnimateAiFinal(ai, `<div class="lx-payment-confirm-copy">${mdLite(copy)}</div>`);
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            lxAppendAiHtml(ai, lxDiscountOrderRecommendationCard());
            const card = ai.querySelector(".lx-payment-confirm-reco");
            card?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              card.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxOpenPendingPaymentModal();
          } finally {
            state._buyFlowRunning = false;
            state._pendingDiscountOrderProduct = null;
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        // 详情页主按钮统一发送 Query，由同一对话路由执行 Skill 并生成待支付订单。
        function lxStartOrderPlaceholder(product = state.currentProduct) {
          if (!product) return toast("请先选择商品");
          const item = normalizeProduct(product);
          state._pendingDiscountOrderProduct = product;
          sendChat(`我要购买${item.name}，请帮我自动领取所有可用优惠并生成待支付订单`);
        }

        // 收货地址（PRD 5.0.2 弹窗层场景：地址新增/编辑；下单前置选择）
        function lxAddresses() {
          const list = load("lexiang.addresses.v1");
          return Array.isArray(list) ? list : [];
        }

        function openAddressPicker(product) {
          state.pendingOrderProduct = product;
          const list = lxAddresses();
          const pinSvg = '<svg class="pin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.9"/></svg>';
          const closeSvg = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
          const checkSvg = window.__lxApprovedIcon("global-check");
          const icon = (path) => `<svg class="fi" viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
          const personIcon = icon('<path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
          const phoneIcon = icon('<rect x="7" y="3" width="10" height="18" rx="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 18h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
          const mapIcon = icon('<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>');
          const homeIcon = icon('<path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
          const primary = list[0];
          const saved = primary ? `
            <section class="saved">
              <div class="tagrow"><span class="deftag">${checkSvg}默认</span></div>
              <div class="nm">${esc(primary.name || "演示用户")}<span class="ph">${esc(primary.phone || "138****0000")}</span></div>
              <button class="use acta" type="button" data-addr-pick="0">用这个地址下单</button>
            </section>` : `<p class="lx-p0-disclaimer">还没有收货地址，填写后即可下单。</p>`;
          openModal("", `
            <button class="x lx-p0-close" type="button" aria-label="关闭">${closeSvg}</button>
            <div class="head">${pinSvg}<h3>确认收货地址</h3></div>
            ${saved}
            <div class="divider">${primary ? "或新增地址" : "新增地址"}</div>
            <div class="form lx-addr-form">
              <div class="frow">
                <label class="field half">${personIcon}<input id="lxAddrName" placeholder="收货人姓名"></label>
                <label class="field half">${phoneIcon}<input id="lxAddrPhone" placeholder="手机号"></label>
              </div>
              <label class="field">${mapIcon}<input id="lxAddrRegion" placeholder="省 / 市 / 区"></label>
              <label class="field">${homeIcon}<input id="lxAddrDetail" placeholder="详细地址（街道、楼栋、门牌号）"></label>
            </div>
            <button class="save acta addr-ghost" type="button" data-addr-save>保存地址并下单</button>
            <p class="foot-tip">演示环境：订单与地址仅保存在本机浏览器，不会真实发货。</p>`, { skin: "address" });
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
          try { window.__lxSaveConversationNow(); } catch (_e) {} // 下单成功是关键节点，显式保存进历史——用真·立即存（原先误调了防抖版save，用户看到消息秒刷新会来不及落盘）
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
          state.cartSelection = state.cartSelection || {};
          const currentSkus = new Set(state.cart.map((item) => item.sku));
          Object.keys(state.cartSelection).forEach((sku) => {
            if (!currentSkus.has(sku)) delete state.cartSelection[sku];
          });
          state.cart.forEach((item) => {
            if (state.cartSelection[item.sku] === undefined) state.cartSelection[item.sku] = true;
          });
          const checkIcon = window.__lxApprovedIcon("global-check");
          const selectedItems = state.cart.filter((item) => state.cartSelection[item.sku] !== false);
          const total = selectedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
          const allSelected = state.cart.length > 0 && selectedItems.length === state.cart.length;
          const priceHtml = (value, cls = "") => {
            const n = Number(value || 0);
            return n ? `<span class="${cls}"><span class="cur">¥</span>${n.toLocaleString("zh-CN")}</span>` : `<span class="${cls}">咨询报价</span>`;
          };
          const rows = state.cart.length ? `
            <div class="lx-cart-wrap">
              <div class="chead"><h2><span class="bar"></span>购物车</h2><span class="cnt">共 ${state.cart.length} 件商品</span></div>
              <div class="cart lx-cart-skin" data-v="1">
                <div class="items">
                  ${state.cart.map((item) => {
                    const selected = state.cartSelection[item.sku] !== false;
                    return `
                      <div class="it${selected ? "" : " off"}" data-cart-item="${esc(item.sku)}">
                        <button class="ck${selected ? " on" : ""}" type="button" data-cart-toggle="${esc(item.sku)}" aria-label="${selected ? "取消选择" : "选择"}${esc(item.name)}">${checkIcon}</button>
                        <div class="shot"><img src="${esc(item.image_url || "/assets/product-placeholder.svg")}" alt="${esc(item.name)}" loading="lazy"></div>
                        <div class="mid">
                          <div class="pn" title="${esc(item.name)}">${esc(item.name)}</div>
                          <div class="sub"><span class="cat">${esc(item.category || "联想商品")}</span>${priceHtml(item.price, "pp price")}</div>
                        </div>
                        <div class="acts">
                          <button class="cbtn buy" type="button" data-buy-sku="${esc(item.sku)}">立即购买</button>
                          <button class="cbtn rm" type="button" data-remove-cart="${esc(item.sku)}">移除</button>
                        </div>
                      </div>`;
                  }).join("")}
                </div>
                <div class="checkout">
                  <button class="selall" type="button" data-cart-select-all="${allSelected ? "0" : "1"}" aria-label="全选">
                    <span class="ck${allSelected ? " on" : ""}">${checkIcon}</span><span>全选</span>
                  </button>
                  <span class="spacer"></span>
                  <span class="sumtxt">已选 <b>${selectedItems.length}</b> 件</span>
                  <span class="total">合计 <span class="tp"><span class="cur">¥</span>${total.toLocaleString("zh-CN")}</span></span>
                  <button class="go" type="button" data-cart-checkout>去结算</button>
                </div>
              </div>
            </div>` : `<div class="lx-cart-wrap"><div class="chead"><h2><span class="bar"></span>购物车</h2><span class="cnt">共 0 件商品</span></div><p class="lx-p0-disclaimer">购物车为空。可以在商品详情页点击“加入购物车”。</p></div>`;
          lxRevealContent();
          lxOpenInfoTab("cart", "购物车", rows);
        }

        function openOrders() {
          const invoice = load("lexiang.invoice.v1");
          const invoiceText = invoice && invoice.title ? `已设置开票抬头：${esc(invoice.title)}` : "未设置开票信息";
          const statusMeta = (item) => {
            const raw = String(item.status || item.orderStatus || item.state || item.payStatus || item.shippingStatus || "").toLowerCase();
            if (/待付|付款|unpaid|pending_pay|pay/.test(raw)) return { cls: "pay", label: "待付款" };
            if (/待收|收货|配送|发货|ship|delivery|delivering|shipping/.test(raw)) return { cls: "ship", label: "待收货" };
            return { cls: "done", label: "已完成" };
          };
          const orderPrice = (value) => {
            const n = Number(value || 0);
            return n ? `<span class="cur">¥</span>${n.toLocaleString("zh-CN")}` : "咨询价";
          };
          const orderImg = (src) => {
            const value = String(src || "").trim();
            if (!value) return "/assets/product-placeholder.svg";
            return value.startsWith("http") || value.startsWith("/") ? value : "/" + value;
          };
          const ticketIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z"/><path d="M15 6v12" stroke-dasharray="2 2"/></svg>`;
          const rows = state.orders.length ? `
            <div class="ol lx-order-skin" data-v="1">
              ${state.orders.map((item) => {
                const st = statusMeta(item);
                const address = item.address
                  ? `${item.address.name || ""} ${item.address.phone || ""} ${item.address.region || ""}${item.address.detail || ""}`.trim()
                  : "演示用户 138****0000 演示地址可在订单中修改收货信息";
                return `
                  <div class="ord">
                    <div class="shot"><img src="${esc(orderImg(item.image_url))}" alt="${esc(item.name)}" loading="lazy"></div>
                    <div class="mid">
                      <div class="pn">
                        <span class="nm" title="${esc(item.name)}">${esc(item.name)}</span>
                        <span class="ost ${st.cls}"><span class="d"></span>${st.label}</span>
                      </div>
                      <div class="meta">
                        <span>订单</span><span class="sn">${esc(item.orderId || "")}</span>
                        <span class="dot"></span><span>${esc(item.createdAt || "")}</span>
                        <span class="dot"></span><span class="amt">${orderPrice(item.price)}</span>
                      </div>
                      <div class="recv">收货：${esc(address)}</div>
                    </div>
                    <div class="acts">
                      <button class="obtn order-ghost" type="button" data-ask-order="${esc(`订单 ${item.orderId || ""}（${item.name}，${st.label}，¥${item.price}，下单时间 ${item.createdAt || "未知"}）`)}">问订单</button>
                      <button class="obtn solid" type="button" data-order-detail="${esc(item.orderId)}">订单详情</button>
                    </div>
                  </div>`;
              }).join("")}
            </div>` : `<p class="lx-p0-disclaimer">暂无订单。点击商品详情页「一键领优惠下单」即可生成演示订单。</p>`;
          const html = `
            <div class="lx-orders-wrap">
              <div class="ohead"><h2><span class="bar"></span>我的订单</h2><span class="cnt">共 ${state.orders.length} 笔订单</span></div>
              ${rows}
              <div class="invoice">
                <span class="ii">${ticketIcon}</span>
                <span class="it"><b>开票信息</b><span>${invoiceText}</span></span>
                <button class="obtn order-ghost iset" type="button" data-open-invoice>去设置</button>
              </div>
            </div>`;
          lxRevealContent();
          lxOpenInfoTab("orders", "我的订单", html);
        }

        async function lxOpenCommerceEntry(kind, options = {}) {
          const clearFullscreenState = () => {
            document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lxfd-entering");
            state.autoFs = false;
          };
          const prepareSplit = () => {
            // 购物车/订单是当前模板内的新页面标签，不是站点路由跳转。
            // 尤其在 file:// 独立模板中，routeTo() 内的 history.replaceState('/shop-chat/')
            // 会抛 SecurityError：此前已先切到 chat 态，异常后便只剩一个空白左栏。
            // 所有环境统一复用无导航副作用的分屏归一化逻辑。
            if (typeof lxPrepareRootSplitState === "function") {
              lxPrepareRootSplitState();
              return;
            }
            document.documentElement.classList.remove("lx-root-lxfd-prepaint");
            window.__LXFD_FORCE = false;
            const lxfdLayer = document.querySelector(".lxfd");
            if (lxfdLayer) {
              lxfdLayer.style.display = "";
              lxfdLayer.style.visibility = "";
            }
            document.body.classList.add("lx-home-split");
            document.body.dataset.page = "personal";
            document.body.dataset.state = "chat";
            state.page = "personal";
          };
          const run = async () => {
            prepareSplit();
            clearFullscreenState();
            const isOrders = kind === "orders";
            const label = isOrders ? "我的订单" : "我的购物车";
            const tabId = `info:${kind}`;
            let answerNode = null;
            if (options.sendQuery) {
              addMessage("user", isOrders ? "我的订单" : "我的购物车");
              const reply = isOrders
                ? "已为你整理近期订单状态、商品信息和后续服务入口，可在右侧新标签中继续查看与管理。"
                : "已为你整理购物车中的商品、优惠与结算信息，可通过右侧新标签继续查看和管理。";
              const card = renderPageCta({
                title: isOrders ? "我的订单" : "我的购物车",
                desc: `已经为您打开${label}页面`,
                attr: `data-lx-open-tab="${tabId}" aria-label="查看${label}页面"`
              });
              // 严格串行：query → AI 正文逐字完成 → 结果卡落地 → 右侧页面打开。
              answerNode = addMessage("assistant", reply, card);
              if (answerNode && answerNode._typingDone) await answerNode._typingDone;
              // 等待结果卡完成布局，确保用户先看到卡片，再看到右侧页面切换。
              await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }
            lxOpenInfoTab(kind, label, '<div class="lx-shop-making" role="status" aria-live="polite"><p class="lx-shop-making-copy">正在制作中...</p></div>');
            const keepCommerceState = () => {
              const hasMessages = !!document.querySelector(".chat-state .lx-p0-messages > *");
              if (hasMessages) document.body.dataset.state = "chat";
              if (state.activeTabId !== tabId) {
                const tab = (state.tabs || []).find((item) => item.id === tabId);
                if (tab) lxRunTab(tab);
              }
              // 此时结果卡已完成渲染，再同步右侧标签与结果卡选中态。
              lxSyncAnswerCtaActiveState(tabId);
            };
            keepCommerceState();
            setTimeout(keepCommerceState, 120);
            setTimeout(keepCommerceState, 420);
            setTimeout(keepCommerceState, 1200);
            setTimeout(keepCommerceState, 2200);
            requestAnimationFrame(clearFullscreenState);
            setTimeout(clearFullscreenState, 780);
            setTimeout(clearFullscreenState, 2100);
          };
          // 不再把业务流程托管给退出动画回调。刷新后偶发存在“视觉已分屏但
          // assistant-fullscreen/lx-auto-fs 类仍残留”的过渡态，旧逻辑会只清空左栏，
          // 却没有执行回调中的消息与标签创建。run() 自身会完整归一化为分屏态。
          return run();
        }

        // 顶栏模板在所有运行时完成初始化前就可能收到点击；入口必须在定义后立即
        // 暴露，不能等到文件末尾，否则后续任一模块异常都会让购物车/订单失效。
        window.lxOpenCommerceEntry = lxOpenCommerceEntry;

        // 顶栏购物车 / 订单使用独立的高优先级入口。主委托监听包含大量商城行为，
        // 任一前置分支异常都不应阻断这两个固定入口；在捕获阶段完成拦截也可避免
        // app-lxfd 与分屏壳层对同一次点击重复响应。
        document.addEventListener("click", (event) => {
          const trigger = event.target.closest?.(
            '.utility-btn[aria-label="购物车"], .utility-btn[aria-label="订单"], .lxfd-ic[data-lxfd-open="cart"], .lxfd-ic[data-lxfd-open="orders"]'
          );
          if (!trigger) return;
          const kind = trigger.dataset.lxfdOpen || (trigger.getAttribute("aria-label") === "订单" ? "orders" : "cart");
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
          const isRootHome = logicalPath === "/";
          const isRootHomeSplit = isRootHome && document.body.classList.contains("lx-home-split");
          // 根首页尚未分屏时：先留在全屏对话完成正文与结果卡生成，再进入左右结构。
          if (isRootHome && !isRootHomeSplit && typeof window.__lxfdRunHomeCommerceEntry === "function") {
            window.__lxfdRunHomeCommerceEntry(kind).catch((error) => {
              console.error("[home-commerce-entry] failed", error);
            });
            return;
          }
          // 根首页已经进入左右结构后：保持当前分屏，在左侧追加用户消息、智能体回复和结果卡，
          // 再复用右侧工作区打开页面；禁止重新进入全屏。
          if (isRootHomeSplit) {
            lxOpenCommerceEntry(kind, { sendQuery: true }).catch((error) => {
              console.error("[home-split-commerce-entry] failed", error);
            });
            return;
          }
          // 子频道继续执行原有入口逻辑，不受首页状态分支影响。
          lxOpenCommerceEntry(kind, { sendQuery: true }).catch((error) => {
            console.error("[commerce-entry] failed", error);
          });
        }, true);

function openOrderDetail(orderId) {
  const item = (state.orders || []).find((o) => o.orderId === orderId);
  if (!item) return toast("找不到该订单");
  const rawStatus = String(item.status || item.orderStatus || item.logisticsStatus || "备货中");
  const statusText = /待付款/.test(rawStatus)
    ? "待付款"
    : /已完成|已签收|签收/.test(rawStatus)
      ? "已完成"
      : /待发货|已发货|运输|配送/.test(rawStatus)
        ? "待发货"
        : "备货中";
  const statusClass = statusText === "待付款" ? "pay" : statusText === "已完成" ? "done" : "ship";
  const stepIndex = statusText === "待付款" ? 0 : statusText === "已完成" ? 3 : statusText === "待发货" ? 2 : 1;
  const address = item.address || {};
  const addressName = address.name || "演示用户";
  const addressPhone = address.phone || "138****0000";
  const addressText = `${address.region || ""}${address.detail || ""}` || "演示地址可在订单中修改收货信息";
  const paidText = money(item.price);
  const paidAmount = paidText.replace(/^¥\s?/, "");
  const benefitLine = item.benefitNote ? `<div class="used usedoffer">已用优惠：${esc(item.benefitNote)}</div>` : "";
  const productImage = item.image_url
    ? `<img src="${esc(item.image_url)}" alt="">`
    : `<span>暂无图片</span>`;
  const stepIcon = {
    check: window.__lxApprovedIcon("global-check"),
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
    cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
    nav: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>`
  };
  const steps = [
    ["已下单", stepIcon.check],
    ["备货中", stepIcon.box],
    ["待发货", stepIcon.cal],
    ["已签收", stepIcon.nav]
  ].map(([label, icon], idx) => {
    const cls = idx < stepIndex ? "done" : idx === stepIndex ? "cur" : "";
    return `<div class="sp ${cls}"><span class="dot">${icon}</span><span class="lb">${label}</span></div>`;
  }).join("");
  const html = `
    <div class="od lx-orderdetail-skin" data-v="1">
      <div class="head">
        <span class="bar"></span>
        <h2>订单详情</h2>
        <span class="st ${statusClass}"><span class="d"></span>${esc(statusText)}</span>
      </div>
      <div class="prod">
        <span class="shot">${productImage}</span>
        <div class="pmain">
          <div class="pn">${esc(item.name)}</div>
          <div class="pmeta"><span class="cat">${esc(item.category || "商品")}</span><span class="unit">单价 ${paidText}</span></div>
        </div>
      </div>
      <div class="info">
        <div class="kv"><span class="k">订单号</span><span class="v sn">${esc(item.orderId)}</span></div>
        <div class="kv"><span class="k">下单时间</span><span class="v">${esc(item.createdAt || "")}</span></div>
        <div class="kv"><span class="k">收货人</span><span class="v">${esc(addressName)} ${esc(addressPhone)}</span></div>
        <div class="kv"><span class="k">地址</span><span class="v">${esc(addressText)}</span></div>
      </div>
      <div class="paybar">
        <div class="pl"><div class="pk">实付金额</div>${benefitLine}</div>
        <div class="pp"><span class="cur">¥</span>${esc(paidAmount)}</div>
      </div>
      <div class="logi">
        <div class="lt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>物流状态</div>
        <div class="steps">${steps}</div>
      </div>
      <div class="acts">
        <button class="obtn solid" data-buy-sku="${esc(item.sku || "")}">${window.__lxApprovedIcon("global-refresh")}再次购买</button>
      </div>
      <p class="foot-tip">物流状态为演示数据，正式上线对接真实物流接口。</p>
    </div>`;
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
          // 方案中心里的引用对比仍属于当前方案任务，不应根据残留的
          // state.page 自动恢复“个人及家庭”等无关站点标签。
          const isSolutionFlow = (state.tabs || []).some((tab) =>
            tab?.id === "info:solution" || String(tab?.id || "").startsWith("info:solution-detail:")
          );
          if (isSolutionFlow) state.tabs = (state.tabs || []).filter((tab) => tab.kind !== "site");
          lxUpsertTab({
            id: "compare",
            kind: "compare",
            label: label || `对比清单(${state.compare.length})`,
            products: isCustom ? products : null,
          }, activate);
          if (activate) lxRunTab((state.tabs || []).find((tab) => tab.id === "compare"));
        }

        function lxSolutionCompareMeta(solutions) {
          const signature = (solutions || [])
            .filter((item) => item?.type === "solution")
            .map((item) => item.sku || item.name || "")
            .filter(Boolean)
            .sort()
            .join("|");
          state.solutionCompareRegistry = state.solutionCompareRegistry || {};
          let index = Number(state.solutionCompareRegistry[signature] || 0);
          if (!index) {
            const used = Object.values(state.solutionCompareRegistry).map(Number).filter(Number.isFinite);
            index = (used.length ? Math.max(...used) : 0) + 1;
            state.solutionCompareRegistry[signature] = index;
          }
          return {
            signature,
            index,
            id: `info:solution-compare:${index}`,
            label: `方案对比${index}`,
            cardTitle: `查看方案对比${index}`,
          };
        }

        function lxOpenSolutionCompareTab(solutions, compareMeta = lxSolutionCompareMeta(solutions)) {
          const productCompareContent = {
            "多擎云桌面解决方案": {
              sector: "教育",
              scenario: "普教",
              summary: "融合VDI、VOI、IDV、TCI四种云桌面架构，统一管理教学终端，兼顾安全、运维与教学资源，适配机房和办公等场景。",
              pain: "机房分布广、终端难统一监管，权限复杂且运维压力大。",
              value: "统一云化管理，强化终端安全与数据恢复，简化运维并提升教学效率。",
              ability: "支持全校终端管理、安全防护、数据恢复、教学资源与智慧决策，并提供全国服务保障。",
              products: "资料暂未提供",
              cases: "资料暂未提供",
              compareImage: "../img/solution/多擎云桌面解决方案4.jpg",
            },
            "智慧教室解决方案": {
              sector: "教育",
              scenario: "高校",
              summary: "以云计算架构打通教室设备与教学数据，覆盖普通型、功能型和研讨型教室，支持互动教学与课堂管理。",
              pain: "设备跨品牌难统一管理，数据分散，教学系统协同效率低。",
              value: "打破信息壁垒，优化教学体验，提升课堂效率与管理效能。",
              ability: "支持课件展示、智能板书、无线投屏、互动教学和课堂管理，实现数据共享与系统融合。",
              products: "智慧黑板M1 Pro Gen2 智慧教育大屏M1 Pro Gen2",
              cases: "资料暂未提供",
              compareImage: "../img/solution/智慧教室解决方案.jpg",
            },
            "职教智慧校园解决方案": {
              sector: "教育",
              scenario: "职教",
              summary: "以1+2+3架构建设一体化数智校园，覆盖教学、学习和实训场景，提升校园治理与数据协同能力。",
              pain: "建设缺乏统筹、应用复杂，重复建设且数据扩展能力不足。",
              value: "统筹校园建设，提升治理、教学和个性化学习能力。",
              ability: "整合智能设备、教室与实训室，实现数据融通、安全管理和全场景协同。",
              products: "智慧专业实训室 智慧教室 联想多擎云桌面",
              cases: "郑州铁路职业技术学院 郑州轻工业学院",
              compareImage: "../img/solution/智慧校园解决方案1.jpg",
            },
          };
          const compact = (value, length = 190) => {
            const clean = String(value || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
            return Array.from(clean).slice(0, length).join("") + (Array.from(clean).length > length ? "…" : "");
          };
          const items = (solutions || [])
            .filter((item) => item?.type === "solution")
            .slice(0, 3)
            .map((item) => {
              const itemName = String(item.name || "").trim();
              const contentKey = Object.keys(productCompareContent).find((name) => itemName === name || itemName.includes(name) || name.includes(itemName));
              return { ...item, ...(productCompareContent[contentKey] || {}) };
            });
          if (items.length < 2) return;
          const compareSectors = [...new Set(items.map((item) => String(item.sector || "").trim()).filter(Boolean))];
          const adviceScope = compareSectors.length === 1 ? `${compareSectors[0]}行业` : "不同应用场景";
          const adviceText = `这几个方案均面向${adviceScope}，但侧重点不同。建议优先根据当前项目的建设对象与核心痛点确定场景，再由专家结合现网环境做进一步评估。`;
          const cell = (value, cls = "") => `<div class="cell bodycell ${cls}">${esc(compact(value) || "资料暂未提供")}</div>`;
          const row = (label, field) => `<div class="cell rowlabel">${esc(label)}</div>${items.map((item) => cell(item[field])).join("")}`;
          const solutionHead = (item) => {
            const context = [item.sector, item.scenario].filter(Boolean).join(" · ") || "行业解决方案";
            const compareImage = item.compareImage || item.img;
            const image = compareImage
              ? `<img src="${esc(compareImage)}" alt="${esc(item.name || "解决方案")}场景图" loading="eager">`
              : "";
            return `<div class="cell bodycell phead"><div class="lx-cmp-solution-visual${image ? "" : " is-empty"}">${image}<span class="lx-cmp-solution-shade" aria-hidden="true"></span><div class="lx-cmp-solution-copy"><span class="lx-cmp-solution-tag">${esc(context)}</span><strong>${esc(item.name || "解决方案")}</strong></div></div></div>`;
          };
          const html = `<section class="lx-solution-compare-page">
            <div class="lx-wp-head"><div><h2>解决方案对比</h2></div></div>
            <div class="lx-cmp-wrap"><div class="lx-cmp-skin" data-v="1" data-cols="${items.length}" style="--lx-cmp-cols:${items.length}"><div class="tbl">
              <div class="cell rowlabel lx-cmp-axis"><strong>对比维度</strong><span>6 个核心指标</span></div>${items.map(solutionHead).join("")}
              <div class="lx-cmp-advice"><strong><img class="lx-cmp-advice-sparkle" src="../icons/global-sparkle.svg" alt="" aria-hidden="true"><span class="lx-cmp-advice-title">联想乐享建议</span></strong><span>${esc(adviceText)}</span></div>
              ${row("方案介绍", "summary")}
              ${row("解决重点", "pain")}
              ${row("方案价值", "value")}
              ${row("核心能力", "ability")}
              ${row("推荐产品", "products")}
              ${row("客户案例", "cases")}
            </div></div></div>
          </section>`;
          const compareTab = { id: compareMeta.id, kind: "info", label: compareMeta.label, html };
          // 对比结果属于历史消息的稳定产物：关闭标签仅关闭当前视图，不能销毁结果。
          // 左侧“查看方案对比”卡片再次点击时，依靠该快照重建同一标签和内容。
          state.solutionCompareTabs = state.solutionCompareTabs || {};
          state.solutionCompareTabs[compareTab.id] = { ...compareTab };
          lxSolutionCompareTabCache.set(compareTab.id, { ...compareTab });
          lxUpsertTab(compareTab);
          lxRunTab(compareTab);
          lxRemoveUnrequestedSiteTabFromSolutionFlow();
        }

        // v0.14.35 之前已存档的方案对比卡只有 data-lx-open-tab，没有持久化页面快照。
        // 从该卡所在的同一条 AI 结果中读取已显示的方案名，用正式对比渲染器迁移一次；
        // 迁移完即进入通用结果注册表，后续换频道/关标签/全屏都不再依赖 DOM。
        function lxMigrateLegacySolutionCompareCard(card, tabId) {
          const host = card?.closest?.(".message, .lx-p0-message, .lxfd-msg, article") || card?.parentElement;
          const text = String(host?.innerText || host?.textContent || "");
          const names = [...text.matchAll(/「([^」]{2,40}解决方案)」/g)].map((match) => match[1]);
          const unique = [...new Set(names)].slice(0, 3);
          if (unique.length < 2) return false;
          const index = Number(String(tabId || "").split(":").pop()) || 1;
          lxOpenSolutionCompareTab(unique.map((name, itemIndex) => ({
            type: "solution",
            sku: `legacy-solution-${index}-${itemIndex + 1}`,
            name,
          })), {
            signature: unique.slice().sort().join("|"),
            index,
            id: `info:solution-compare:${index}`,
            label: `方案对比${index}`,
            cardTitle: `查看方案对比${index}`,
          });
          return true;
        }

        function lxSyncSolutionCompareFloatingCta(show) {
          let button = document.querySelector(".lx-cmp-floating-cta");
          if (!button) {
            button = document.createElement("button");
            button.className = "lx-cmp-floating-cta";
            button.type = "button";
            button.dataset.floorAction = "lead";
            button.textContent = "请专家联系我";
            document.body.appendChild(button);
          }
          button.hidden = !show;
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

        let lxMemberRuntimePromise = null;
        function lxEnsureMemberComponentRuntime() {
          if (window.LXMemberService?.mount) return Promise.resolve(window.LXMemberService);
          if (lxMemberRuntimePromise) return lxMemberRuntimePromise;
          lxMemberRuntimePromise = new Promise((resolve, reject) => {
            const cssId = "lx-member-component-css";
            if (!document.getElementById(cssId)) {
              const link = document.createElement("link");
              link.id = cssId;
              link.rel = "stylesheet";
              link.href = "/member-service-aui/assets/member-service-aui.css?v=20260823-profile-modal-compact-v1";
              document.head.appendChild(link);
            }
            const existing = document.getElementById("lx-member-component-runtime");
            if (existing) {
              existing.addEventListener("load", () => resolve(window.LXMemberService), { once: true });
              existing.addEventListener("error", reject, { once: true });
              return;
            }
            const script = document.createElement("script");
            script.id = "lx-member-component-runtime";
            window.__lxSubmitDeviceActionQuery = function (kind, query, device) {
              if (kind === "bind") window.__lxPendingDeviceBindBridge = { source: window, device: device };
              else window.__lxPendingDeviceWarrantyBridge = { source: window, device: device };
              return sendChat(query);
            };
            script.src = "/member-service-aui/assets/member-service-embed.js?v=20260824-modal-card-copy-v10";
            script.async = true;
            script.onload = () => window.LXMemberService?.mount ? resolve(window.LXMemberService) : reject(new Error("会员组件未注册"));
            script.onerror = () => reject(new Error("会员组件加载失败"));
            document.head.appendChild(script);
          });
          return lxMemberRuntimePromise;
        }

        function lxMemberComponentShell(view) {
          return `<style>
            .content[data-view="info"]:has(.lx-member-component-host){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
            .content[data-view="info"]:has(.lx-member-component-host)>.lx-tabbar{flex:0 0 auto!important}
            .content[data-view="info"] .info-page:has(.lx-member-component-host){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
            .content[data-view="info"] .info-page:has(.lx-member-component-host)::before,.content[data-view="info"] .info-page:has(.lx-member-component-host)::after{display:none!important;content:none!important}
            .lx-member-component-host{width:100%;height:100%;min-height:0;overflow-y:auto;background:#fcfaff}
            .lx-member-component-host>.leai-page{width:100%!important;max-width:none!important;margin-inline:0!important;padding-inline:12px!important;box-sizing:border-box!important}
            .lx-member-component-loading{display:flex;align-items:center;justify-content:center;min-height:260px;color:#746d76;font-size:14px}
          </style><div class="lx-member-component-host" data-member-component-view="${esc(view)}"><div class="lx-member-component-loading" role="status">正在加载会员服务</div></div>`;
        }

        function lxOpenMemberComponentTab(key, label, view, displayMode = "tab") {
          const tab = { id: `info:${key}`, kind: "info", label, html: lxMemberComponentShell(view), memberComponentView: view, memberComponentDisplayMode: displayMode };
          lxUpsertTab(tab);
          lxRunTab(tab);
        }

        async function lxMountMemberComponentTab(tab, pageBox) {
          const host = pageBox?.querySelector(".lx-member-component-host");
          if (!host || !tab?.memberComponentView) return;
          try {
            const runtime = await lxEnsureMemberComponentRuntime();
            if (!host.isConnected || state.activeTabId !== tab.id) return;
            runtime.mount(host, tab.memberComponentView, { displayMode: tab.memberComponentDisplayMode || "tab" });
          } catch (_error) {
            if (host.isConnected) host.innerHTML = '<div class="lx-member-component-loading" role="alert">会员服务暂时无法加载，请稍后重试</div>';
          }
        }

        let lxStoreRuntimePromise = null;
        function lxEnsureStoreComponentRuntime() {
          if (window.LXStoreService?.mount) return Promise.resolve(window.LXStoreService);
          if (lxStoreRuntimePromise) return lxStoreRuntimePromise;
          lxStoreRuntimePromise = new Promise((resolve, reject) => {
            const existing = document.getElementById("lx-store-component-runtime");
            if (existing) {
              existing.addEventListener("load", () => resolve(window.LXStoreService), { once: true });
              existing.addEventListener("error", reject, { once: true });
              return;
            }
            const script = document.createElement("script");
            script.id = "lx-store-component-runtime";
            script.src = "/assets/pages/store-v5-embed.js?v=20260823-store-direct-v1";
            script.async = true;
            script.onload = () => window.LXStoreService?.mount ? resolve(window.LXStoreService) : reject(new Error("门店组件未注册"));
            script.onerror = () => reject(new Error("门店组件加载失败"));
            document.head.appendChild(script);
          });
          return lxStoreRuntimePromise;
        }

        function lxStoreComponentShell() {
          return `<style>
            .content[data-view="info"]:has(.lx-store-component-host){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
            .content[data-view="info"]:has(.lx-store-component-host)>.lx-tabbar{flex:0 0 auto!important}
            .content[data-view="info"] .info-page:has(.lx-store-component-host){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
            .content[data-view="info"] .info-page.lx-store-detail-active>.reco-head{display:none!important}
            .content[data-view="info"] .info-page:has(.lx-store-component-host)::before,.content[data-view="info"] .info-page:has(.lx-store-component-host)::after{display:none!important;content:none!important}
            .lx-store-component-host{display:block;width:100%;height:100%;min-height:0;overflow:hidden;background:#fff}
            .lx-store-component-loading{display:flex;align-items:center;justify-content:center;min-height:260px;color:#746d76;font-size:14px}
          </style><div class="lx-store-component-host"><div class="lx-store-component-loading" role="status">正在加载门店服务</div></div>`;
        }

        function lxOpenStoreComponentTab() {
          const tab = { id: "info:stores", kind: "info", label: "附近门店", html: lxStoreComponentShell(), storeComponentView: "stores" };
          lxUpsertTab(tab);
          lxRunTab(tab);
        }

        async function lxMountStoreComponentTab(tab, pageBox) {
          const host = pageBox?.querySelector(".lx-store-component-host");
          if (!host || !tab?.storeComponentView) return;
          try {
            const runtime = await lxEnsureStoreComponentRuntime();
            if (!host.isConnected || state.activeTabId !== tab.id) return;
            const api = runtime.mount(host, { view: tab.storeComponentView });
            host.addEventListener("lx-store-detail-state", (event) => {
              pageBox.classList.toggle("lx-store-detail-active", event.detail?.active === true);
            });
            host.addEventListener("lx-store-appointment-query", (event) => {
              const store = event.detail?.store;
              if (!store) return;
              window.__lxStoreAppointmentById = window.__lxStoreAppointmentById || {};
              window.__lxStoreAppointmentById[String(store.id || "")] = store;
              window.__lxPendingStoreAppointment = store;
              sendChat(`预约${store.name || "联想门店"}到店`);
            });
            host.__lxStoreApi = api;
          } catch (_error) {
            if (host.isConnected) host.innerHTML = '<div class="lx-store-component-loading" role="alert">门店服务暂时无法加载，请稍后重试</div>';
          }
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
          const fullRaw = await Promise.all(source.slice(0, 8).map(async (item) => {
            if (item.specs && Object.keys(item.specs).length) return item;
            try {
              const response = await fetch(`/api/products/${encodeURIComponent(item.sku)}`, { cache: "no-store" });
              if (response.ok) return await response.json();
            } catch {}
            return item;
          }));
          // 本地货盘 specs 缺硬件参数（只有运营字段）→ 从 description 配置串解析补齐，参数行才有内容
          const full = fullRaw.map((item) => ({ ...item, specs: lxSpecsFromDescription({ ...item, specs: normalizeProductSpecs(item.specs) }) }));
          state._comparePageItems = full;
          const manage = isCustom ? "" : `<div class="lx-cmp-manage">${full.map((item) => `<span class="lx-cmp-chip">${esc(item.name?.slice(0, 22) || item.sku)}<button type="button" data-remove-compare="${esc(item.sku)}" aria-label="移除">×</button></span>`).join("")}</div>`;
          const body = full.length >= 2
            ? renderCompareTable(full, { actions: true })
            : `<p class="lx-p0-disclaimer">再加入 1 件商品即可生成并排对比表。</p>`;
          pageBox.innerHTML = `
            <div class="reco-head"><h2>${esc(title)}</h2><span>差异项已高亮，可直接加购或下单</span></div>
            ${manage}${body}
            <div class="lx-cmp-advice" style="display:none;margin:12px 0;padding:12px 16px;background:#f3f0f7;border-radius:10px;font-size:13px;color:#5b1452;line-height:1.6"></div>`;
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
              adviceEl.innerHTML = `<strong style="display:block;margin-bottom:4px;color:#4d144a">AI 建议</strong>结合你的需求，最推荐 <strong>${esc(d.pick)}</strong>：${esc(d.reason)}`;
              adviceEl.style.display = 'block';
              // 把 AI 最推荐那款整列高亮（区别于单项「优」）。按 pick 商品名匹配列 index
              const pick = String(d.pick || "").trim();
              let pickIdx = full.findIndex((p) => String(p.name || "").trim() === pick);
              if (pickIdx < 0) pickIdx = full.findIndex((p) => pick && (String(p.name || "").includes(pick) || pick.includes(String(p.name || "").trim())));
              if (pickIdx >= 0) {
                state._compareRecommendedSku = full[pickIdx]?.sku || "";
                state._compareRecommendedProduct = full[pickIdx] || null;
                const tbl = pageBox.querySelector(".lx-cmp-skin .tbl");
                if (tbl) {
                  tbl.querySelectorAll(`[data-col="${pickIdx}"]`).forEach((cell) => cell.classList.add("lx-cmp-pick"));
                  // 列头加「最推荐」角标
                  const head = tbl.querySelector(`.phead[data-col="${pickIdx}"]`);
                  if (head && !head.querySelector(".lx-cmp-pick-flag")) {
                    head.insertAdjacentHTML("afterbegin", `<span class="lx-cmp-pick-flag">乐享最推荐</span>`);
                  }
                }
              }
            } catch (_) {}
          })();
        }

        async function checkAuth() {
          try {
            const response = await fetch("/api/auth/me", { cache: "no-store" });
            const data = await response.json();
            state.user = data.user || state.user || lxReadStoredAuthUser();
            if (data.user) lxStoreAuthUser(data.user);
            updateUserArea();
          } catch {}
        }

        function updateUserArea() {
          const account = $(".account-wrap .utility-btn");
          if (!account) return;
          account.title = state.user ? `${state.user.nickname || state.user.phone || "已登录"}` : "登录";
          $$(".account-menu").forEach((menu) => {
            menu.innerHTML = state.user
              ? `<div class="menu-row" data-account-action="member">会员中心</div>
                 <div class="menu-row" data-account-action="logout">退出登录</div>`
              : `<div class="menu-row" data-account-action="login">登录</div>`;
          });
        }

        function openLogin() {
          openModal("登录 / 注册", `
            <button class="lx-auth-close" type="button" data-auth-close aria-label="关闭">×</button>
            <div class="lx-auth-logo-wrap">
              <img class="lx-auth-logo-img" src="../logos/logo-full-red.png" alt="联想乐享" />
            </div>
            <div class="lx-auth-tabs" role="tablist">
              <button class="lx-auth-tab active" type="button" data-auth-tab="login" role="tab" aria-selected="true">登录</button>
              <button class="lx-auth-tab" type="button" data-auth-tab="register" role="tab" aria-selected="false">注册</button>
            </div>
            <form class="lx-auth-form-panel active" data-auth-panel="login" novalidate>
              <label class="lx-auth-field">
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke-width="1.8" stroke-linecap="round"/></svg>
                <input type="text" placeholder="手机号 / 邮箱" autocomplete="username" required />
              </label>
              <label class="lx-auth-field">
                <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="2" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke-width="1.8" stroke-linecap="round"/></svg>
                <input type="password" placeholder="密码" autocomplete="current-password" required />
                <button class="lx-auth-eye" type="button" data-auth-eye aria-label="显示或隐藏密码">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" stroke-width="1.7"/><circle cx="12" cy="12" r="2.3" stroke-width="1.7"/></svg>
                </button>
              </label>
              <label class="lx-auth-agree"><input type="checkbox" required />我已阅读并同意《用户协议》和《隐私政策》</label>
              <button class="lx-auth-primary" type="submit">立即登录</button>
            </form>
            <form class="lx-auth-form-panel" data-auth-panel="register" novalidate>
              <label class="lx-auth-field">
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke-width="1.8" stroke-linecap="round"/></svg>
                <input type="text" placeholder="手机号 / 邮箱" autocomplete="username" required />
              </label>
              <div class="lx-auth-code-row">
                <label class="lx-auth-field">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16v10H4z" stroke-width="1.7"/><path d="m4 8 8 6 8-6" stroke-width="1.7"/></svg>
                  <input type="text" placeholder="验证码" inputmode="numeric" required />
                </label>
                <button class="lx-auth-code-btn" type="button" data-auth-code>获取验证码</button>
              </div>
              <label class="lx-auth-agree"><input type="checkbox" required />我已阅读并同意《用户协议》和《隐私政策》</label>
              <button class="lx-auth-primary" type="submit">立即注册</button>
            </form>`, { skin: "auth" });
        }

        function lxOpenGuestLimitLogin() {
          openLogin();
          const modal = document.querySelector(".lx-auth-modal");
          if (!modal || modal.querySelector(".lx-auth-limit-notice")) return;
          const tabs = modal.querySelector(".lx-auth-tabs");
          const notice = document.createElement("div");
          notice.className = "lx-auth-limit-notice";
          notice.setAttribute("role", "alert");
          notice.innerHTML = "<strong>免费对话次数已用完</strong><span>登录后即可继续与联想乐享对话</span>";
          tabs?.insertAdjacentElement("beforebegin", notice);
        }

        function lxRequireQueryAccess() {
          const authenticated = Boolean(state.user || lxReadStoredAuthUser() || window.__lxMember?.guest === false);
          if (authenticated) return true;
          let used = 0;
          try { used = Math.max(0, Number(localStorage.getItem(LX_GUEST_QUERY_COUNT_KEY) || 0)); } catch (_e) {}
          if (used >= 2) {
            lxOpenGuestLimitLogin();
            return false;
          }
          try { localStorage.setItem(LX_GUEST_QUERY_COUNT_KEY, String(used + 1)); } catch (_e) {}
          return true;
        }
        window.__lxRequireQueryAccess = lxRequireQueryAccess;

        function lxOpenAuthTab(name) {
          const modal = document.querySelector(".lx-auth-modal");
          if (!modal) return;
          modal.querySelectorAll("[data-auth-tab]").forEach((button) => {
            const active = button.dataset.authTab === name;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
          });
          modal.querySelector(".lx-auth-tabs")?.classList.toggle("register-active", name === "register");
          modal.querySelectorAll("[data-auth-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.authPanel === name));
        }

        function lxClearAuthError(input) {
          input.closest(".lx-auth-field, .lx-auth-agree")?.classList.remove("invalid");
          input.closest("form")?.querySelector(".lx-auth-error-message")?.remove();
        }

        function lxAuthErrorText(input) {
          if (input.type === "checkbox") return "请先阅读并同意用户协议和隐私政策";
          if (input.type === "password") return "请输入密码";
          if (input.placeholder?.includes("验证码")) return "请输入验证码";
          return "请输入手机号或邮箱";
        }

        function lxSubmitAuthForm(form) {
          const required = [...form.querySelectorAll("[required]")];
          required.forEach(lxClearAuthError);
          const invalid = required.filter((input) => !input.checkValidity());
          if (invalid.length) {
            invalid.forEach((input) => input.closest(".lx-auth-field, .lx-auth-agree")?.classList.add("invalid"));
            const error = document.createElement("div");
            error.className = "lx-auth-error-message";
            error.textContent = invalid.map(lxAuthErrorText).join("；");
            form.querySelector(".lx-auth-primary")?.insertAdjacentElement("beforebegin", error);
            invalid[0].focus();
            return;
          }
          const submit = form.querySelector(".lx-auth-primary");
          const isRegister = form.dataset.authPanel === "register";
          submit.textContent = "处理中…";
          submit.disabled = true;
          window.setTimeout(() => {
            const identity = form.querySelector('input[autocomplete="username"]')?.value.trim() || "会员";
            state.user = { phone: identity, nickname: identity };
            lxStoreAuthUser(state.user);
            updateUserArea();
            const success = document.createElement("div");
            success.className = "lx-auth-success-message";
            success.setAttribute("role", "status");
            success.innerHTML = `<div class="lx-auth-success-icon"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg></div><div class="lx-auth-success-title">${isRegister ? "注册成功" : "登录成功"}</div><div class="lx-auth-success-subtitle">欢迎使用联想乐享</div>`;
            form.appendChild(success);
            form.classList.add("success");
            form.closest(".lx-auth-modal")?.classList.add("success-view");
            window.setTimeout(() => closeModal(), 2000);
          }, 700);
        }

        function openCategoryPlaceholder() {
          openModal("类目名称", `
            <section class="lx-p0-category-waiting" role="status" aria-live="polite">
              <p class="lx-p0-category-waiting-title">等待制作</p>
            </section>`);
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
          lxStoreAuthUser(state.user);
          closeModal();
          updateUserArea();
          toast("登录成功");
        }

        function logout() {
          state.user = null;
          lxStoreAuthUser(null);
          try { localStorage.removeItem(LX_GUEST_QUERY_COUNT_KEY); } catch (_e) {}
          window.__lxMember = { guest: true };
          updateUserArea();
          document.querySelectorAll(".account-wrap.open, .lxfd-account-wrap.open").forEach((node) => node.classList.remove("open"));
          toast("已退出登录");
          fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => {});
        }

        // ── 对话持久化：切站点/刷新后从 localStorage 恢复（不碰导航软切，靠整页重载后恢复兜底）──
        // 对话持久化已拆到 app-conv.js（工厂注入）：这里只接线。函数声明有提升，传引用安全。
        const LX_CONV_KEY = "lexiang.conversation.v1"; // 仍有少量本文件内直接读 key 的调用点
        const __lxConv = window.__lxConvFactory
          ? window.__lxConvFactory({ getState: () => state, ensureChat, addMessage, lxEnsureAiBody, mdLite })
          : { save: function () {}, saveNow: function () {}, restore: function () {} };
        const lxSaveConversation = __lxConv.save;
        const lxRestoreConversation = __lxConv.restore;
        // 挂 window：lxfd 桥接退全屏后立即 flush，避免防抖被切站/卸载吞掉
        // 件3 刷新找回：每次强制flush当前会话快照，同步把（可能是桥接进来的）分屏对话
        // upsert 进共享历史侧栏（lexiang.lxfd.convs.v1，与全屏 lxfdRenderHist 同一份数据源）。
        // 不改 __lxConv.saveNow 本身（round1已验证的分屏内刷新恢复零改动），只是外面多包一层。
        window.__lxSaveConversationNow = function() {
          try { __lxConv.saveNow(); } catch (_e) {}
          try { lxArchiveCurrentConversation(); } catch (_e) {}
        };
        // 修复：分屏下单流程刷新后整段操作记录丢失——根因是「已下单成功」等关键结果消息只靠
        // 400ms 防抖持久化，用户看到消息就立刻刷新（人之常情，尤其是在验证「会不会丢」时）会
        // 打断防抖 timer，那批消息从未落盘过（不是 restore 阶段丢弃，是根本没存进去）。
        // pagehide 覆盖手动刷新/关标签/前进后退；visibilitychange(hidden) 兜住移动端切后台等
        // 不一定触发 pagehide 的场景。两个都只是同步 flush 已有的 doSave，不改防抖/过滤逻辑本身。
        const _lxFlushConversationOnHide = () => { try { window.__lxSaveConversationNow(); } catch (_e) {} };
        window.addEventListener("pagehide", _lxFlushConversationOnHide);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") _lxFlushConversationOnHide();
        });

        function ensureChat() {
          document.body.dataset.state = "chat";
          const chatState = $(".chat-state");
          if (!chatState || $(".lx-p0-messages", chatState)) return $(".lx-p0-messages", chatState);
          chatState.innerHTML = `
            <div class="lx-p0-messages" aria-live="polite"></div>`;
          return $(".lx-p0-messages", chatState);
        }

        // 操作确认气泡：固定短句秒显，不走 5s 打字动画（动作已经立即执行了，文字不能慢吞吞）
        function lxAddInstantAi(text, extraHtml) {
          const list = ensureChat();
          const node = document.createElement("div");
          node.className = "lx-p0-message msg ai lx-chat-skin";
          node._raw = String(text || "");
          lxEnsureAiBody(node).innerHTML = mdLite(node._raw) + (extraHtml || "");
          list.appendChild(node);
          list.scrollTop = list.scrollHeight;
          lxSaveConversation();
          return node;
        }
        function addMessage(role, text, extraHtml = "") {
          const list = ensureChat();
          const node = document.createElement("div");
          const isAi = /\b(ai|assistant)\b/.test(role);
          const isUser = /\buser\b/.test(role);
          if (isUser) {
            lxArchiveClaimProgressCards(list);
            lxClearFollowups();
          }
          node.className = `lx-p0-message msg ${role}${isAi ? " lx-chat-skin" : ""}`;
          if (isUser) {
            node.innerHTML = `<div class="user-bubble">${esc(text)}${extraHtml}</div>`;
          } else if (isAi) {
            const body = lxEnsureAiBody(node);
            if (text) {
              node._raw = String(text);
              // 打字动画最长拖 5s，落地后再存一次——否则下单成功等消息存的是「生成中…」占位被丢弃，刷新就没了。
              // 这里必须用立即存（不能是400ms防抖版）：内容刚落地即是用户能看到消息的那一刻，
              // 真机上用户看到「已下单成功」就立刻刷新验证是否保存是常见操作，防抖窗口来不及跑完
              // 这条消息就没进过 localStorage——不是 restore 阶段丢弃，是根本没存进去。
              node._typingDone = lxAnimateAiFinal(node, `${mdLite(node._raw)}${extraHtml}`).then(() => { try { window.__lxSaveConversationNow(); } catch (_e) {} });
            } else {
              body.innerHTML = extraHtml;
            }
          } else {
            node.innerHTML = `${esc(text)}${extraHtml}`;
          }
          list.appendChild(node);
          list.scrollTop = list.scrollHeight;
          // 快速检索必须跟随“当前对话里真实存在的 query”生成，不能只依赖
          // sendChat 的普通输入分支。商品详情、购物车、订单等流程也会直接
          // addMessage("user", ...)，统一在用户消息落入 DOM 后重建索引。
          if (isUser) {
            lxRebuildQueryHistoryFromDom();
            renderQueryHistory();
          }
          if (isUser || isAi) lxSaveConversation(); // 用户/AI消息变化即防抖持久化（AI流式终态由lxAnimateAiFinal后的_raw兜住）
          return node;
        }

        function renderGenerating(label = "联想乐享正在处理…") {
          return `
            <div class="loading-line lx-generating" role="status" aria-live="polite">
              <span class="typing-text">${esc(label)}</span><span class="typing-cursor"></span>
            </div>`;
        }

        // ── 思考过程时间线（联想乐享官方 SKILL 调用轨迹可视化）─────────────────────
        // 生成阶段实时追加每条 status 文案；首个 chunk 到达即折叠成一行摘要条，点击可展开/收起。
        // 类名 .lx-skill-trace 系列避开 app-conv.js doSave/restore 的 .lx-op-steps / loading 关键词
        // 跳过正则，确保能正常存档、刷新后按折叠态恢复。
        function renderSkillTrace(lines, opts = {}) {
          const collapsed = !!opts.collapsed;
          const foldable = !!opts.foldable;
          const skillCount = Number(opts.skillCount) || 0;
          const foldText = skillCount > 0 ? `已完成 ${skillCount} 个 Skill 调用` : "已完成意图判断";
          const itemsHtml = (lines || []).map((line, idx) => {
            const isLast = idx === (lines || []).length - 1;
            return `<div class="lx-skill-trace-item${!collapsed && isLast ? " current" : ""}">${esc(line)}</div>`;
          }).join("");
          const cls = "lx-skill-trace" + (foldable ? " is-foldable" : "") + (collapsed ? " is-collapsed" : "");
          return `<div class="${cls}">` +
            `<button type="button" class="lx-skill-trace-fold" data-lx-trace-toggle aria-expanded="${collapsed ? "false" : "true"}">` +
            `<span class="lx-skill-trace-fold-text">${esc(foldText)}</span><span class="lx-skill-trace-fold-caret"><img src="../icons/global-collapse.svg" alt="" aria-hidden="true"></span>` +
            `</button>` +
            `<div class="lx-skill-trace-list">${itemsHtml}</div>` +
            `</div>`;
        }

        // 生成阶段（Phase 1，真实 SSE 进行中）实时刷新时间线 DOM——此时 ai-body 里只有这一个结构，
        // 全量重绘最简单；lxAnimateAiFinal 收尾时会把 ai-body 整体替换掉，届时再把这份时间线的
        // 折叠态 HTML 拼进 finalHtml，不依赖这里的实时 DOM。
        function lxRenderTraceLive(ai) {
          const body = ai && ai.querySelector && ai.querySelector(".ai-body");
          if (!body) return;
          body.innerHTML = renderSkillTrace(ai._traceLines, { collapsed: ai._traceCollapsed, foldable: ai._traceCollapsed, skillCount: ai._traceSkills ? ai._traceSkills.size : 0 });
          const list = ensureChat();
          if (list) list.scrollTop = list.scrollHeight;
        }

        function renderProductsInMessage(products, options = {}) {
          if (!Array.isArray(products) || !products.length) return "";
          const first = products[0] || {};
          const recoId = lxStoreRecoPayload(products);
          // 单品也带 recoId：官方 sku 在自有库 404，恢复历史后 officialProducts 缓存也空，
          // 点击时优先用持久化 payload 里的完整商品对象兜底（真机反馈：历史里点 CTA 没反应）
          const action = products.length === 1 && first.sku
            ? `data-open-product="${esc(first.sku)}" data-lxfd-reco-id="${esc(recoId)}" data-lx-result-id="detail:${esc(first.sku)}"`
            : `data-lx-focus-reco="1" data-lxfd-reco-id="${esc(recoId)}" data-lx-result-id="${esc(lxRecoTabId(recoId))}"`;
          const isServiceProduct = !!options.serviceProduct;
          const desc = isServiceProduct
            ? `已为你推荐 ${products.length} 款服务商品`
            : products.length === 1
            ? `${esc(first.name || "按你的需求筛选出的商品")}${first.price ? ` · ${money(first.price)}` : ""}`
            : `已为你筛选 ${products.length} 款候选商品`;
          return `<button class="answer-cta lx-answer-reco" type="button" ${action}>
            <span class="answer-cta-copy">
              <span class="answer-cta-title">${isServiceProduct ? "查看推荐服务商品" : "查看推荐商品"}</span>
              <span class="answer-cta-desc">${desc}</span>
            </span>
            <span class="answer-cta-icon" aria-hidden="true">
              ${window.__lxApprovedIcon("global-next")}
            </span>
          </button>`;
        }

        function renderPageCta({ title = "查看页面", desc = "已在右侧为你打开相关内容", attr = 'data-lx-focus-active="1"' } = {}) {
          const boundTabId = String(attr).match(/data-lx-open-tab="([^"]+)"/)?.[1] || "";
          const feature = String(attr).match(/data-lxfd-open-feature="([^"]+)"/)?.[1] || "";
          const solutionTitle = String(attr).match(/data-specific-solution-cta="([^"]+)"/)?.[1] || "";
          const featureIds = { solution: "info:solution", member: "info:member", devices: "info:devices", documents: "documents", edu: "info:edu", cart: "info:cart", orders: "info:orders" };
          const resultId = boundTabId || (solutionTitle ? `info:solution-detail:${solutionTitle}` : (featureIds[feature] || ""));
          const resultAttr = resultId && !/data-lx-result-id=/.test(String(attr)) ? ` data-lx-result-id="${esc(resultId)}"` : "";
          const active = boundTabId === state.activeTabId || (feature === "documents" && state.activeTabId === "documents");
          return `<button class="answer-cta lx-answer-page${active ? " is-active is-selected" : ""}" type="button" ${attr}${resultAttr}${active ? ' aria-current="page" aria-pressed="true"' : ' aria-pressed="false"'}>
            <span class="answer-cta-copy">
              <span class="answer-cta-title">${esc(title)}</span>
              <span class="answer-cta-desc">${esc(desc)}</span>
            </span>
            <span class="answer-cta-icon" aria-hidden="true">
              ${window.__lxApprovedIcon("global-next")}
            </span>
          </button>`;
        }

        function renderStoreAppointmentCta(storeId) {
          return `<button class="answer-cta lx-store-appointment-cta lx-edu-auth-reco" type="button" data-lx-recommended-modal="store-appointment" data-lx-recommended-modal-payload="${esc(storeId || "")}" data-lx-store-appointment-confirm="${esc(storeId || "")}" data-lx-result-id="modal:store-appointment:${esc(storeId || "")}" aria-label="打开预约信息确认弹窗">
            <span class="answer-cta-title">预约信息待确认</span>
            <span class="answer-cta-icon" aria-hidden="true">
              ${window.__lxApprovedIcon("global-next")}
            </span>
          </button>`;
        }

        function lxSyncAnswerCtaActiveState(tabId) {
          document.querySelectorAll('.answer-cta[data-lx-result-id], .answer-cta[data-lx-open-tab], .answer-cta[data-lxfd-open-feature], .answer-cta[data-specific-solution-cta]').forEach((card) => {
            const resultId = card.getAttribute("data-lx-result-id") || "";
            const boundTabId = card.getAttribute("data-lx-open-tab") || "";
            const feature = card.getAttribute("data-lxfd-open-feature") || "";
            const solutionTitle = card.getAttribute("data-specific-solution-cta") || "";
            const solutionTabId = solutionTitle ? `info:solution-detail:${solutionTitle}` : "";
            // 解决方案推荐卡与右侧活动标签严格一一对应：
            // 全集页高亮“查看全集解决方案”，详情页只高亮对应的方案详情卡。
            const active = feature === "solution"
              ? tabId === "info:solution"
              : (resultId && resultId === tabId) || boundTabId === tabId ||
                (feature === "documents" && tabId === "documents") ||
                (solutionTabId && solutionTabId === tabId);
            card.classList.toggle("is-active", active);
            card.classList.toggle("is-selected", active);
            const pressed = active ? "true" : "false";
            if (card.getAttribute("aria-pressed") !== pressed) card.setAttribute("aria-pressed", pressed);
            if (active) card.setAttribute("aria-current", "page");
            else card.removeAttribute("aria-current");
          });

          const activeTab = (state.tabs || []).find((item) => item.id === tabId) || null;
          const recoCards = Array.from(document.querySelectorAll('.answer-cta[data-lx-focus-reco], .answer-cta[data-lxfd-reveal-products], .answer-cta[data-open-product]'));
          const activeRecoId = activeTab?.recoId || "";
          const latestRecoCard = activeTab?.kind === "reco" && !activeRecoId ? recoCards[recoCards.length - 1] : null;
          recoCards.forEach((card) => {
            const recoId = card.getAttribute("data-lxfd-reco-id") || "";
            const productSku = card.getAttribute("data-open-product") || "";
            const active = (activeTab?.kind === "reco" && (activeRecoId ? recoId === activeRecoId : card === latestRecoCard)) ||
              (activeTab?.kind === "detail" && productSku && productSku === activeTab.sku);
            card.classList.toggle("is-active", active);
            card.classList.toggle("is-selected", active);
            const pressed = active ? "true" : "false";
            if (card.getAttribute("aria-pressed") !== pressed) card.setAttribute("aria-pressed", pressed);
            if (active) card.setAttribute("aria-current", "page");
            else card.removeAttribute("aria-current");
          });
        }

        // 历史恢复、方案组件和频道脚本可能晚于主应用挂载卡片。无论挂载顺序如何，
        // 卡片选中态都只能从当前真实结果页注册表派生，不能各脚本自行保留旧高亮。
        let lxResultSelectionSyncQueued = false;
        const lxQueueResultSelectionSync = () => {
          if (lxResultSelectionSyncQueued) return;
          lxResultSelectionSyncQueued = true;
          queueMicrotask(() => {
            lxResultSelectionSyncQueued = false;
            const activeId = (state.tabs || []).some((tab) => tab.id === state.activeTabId) ? state.activeTabId : "";
            lxSyncAnswerCtaActiveState(activeId);
          });
        };
        const lxResultSelectionObserver = new MutationObserver(lxQueueResultSelectionSync);
        lxResultSelectionObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["aria-pressed", "data-lx-result-id", "data-lx-open-tab"]
        });
        lxQueueResultSelectionSync();

        function lxClearFollowups(exceptNode) {
          const root = ensureChat();
          if (!root) return;
          root.querySelectorAll(".followups, .lxfd-followups, .lx-p0-suggest[data-followups]").forEach((el) => {
            if (!exceptNode || !exceptNode.contains(el)) el.remove();
          });
        }

        function lxEnsureAiBody(node) {
          let body = $(".ai-body", node);
          if (body) return body;
          node.innerHTML = `<article class="ai-wrap"><div class="ai-body"></div></article>`;
          return $(".ai-body", node);
        }

        function lxNormalizeAnswerHtml(html) {
          const box = document.createElement("div");
          box.innerHTML = String(html || "");
          const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent || parent.closest("script,style,svg,.price")) return NodeFilter.FILTER_REJECT;
              return /¥\s?[\d,]+(?:\.\d+)?/.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
          });
          const priceNodes = [];
          while (walker.nextNode()) priceNodes.push(walker.currentNode);
          priceNodes.forEach((node) => {
            const frag = document.createDocumentFragment();
            String(node.nodeValue || "").split(/(¥\s?[\d,]+(?:\.\d+)?)/g).forEach((part) => {
              if (/^¥\s?[\d,]+(?:\.\d+)?$/.test(part)) {
                const span = document.createElement("span");
                span.className = "price";
                span.textContent = part;
                frag.appendChild(span);
              } else {
                frag.appendChild(document.createTextNode(part));
              }
            });
            node.parentNode.replaceChild(frag, node);
          });
          box.querySelectorAll(".lx-md-h").forEach((el) => {
            el.classList.add("section-title");
            if (/^[-—一二三四五六七八九十]+\s*/.test(el.textContent || "")) el.textContent = (el.textContent || "").replace(/^[-—]\s*/, "");
          });
          box.querySelectorAll(".lx-p0-suggest[data-followups]").forEach((el) => {
            el.classList.remove("lx-p0-suggest");
            el.classList.add("followups");
          });
          box.querySelectorAll(".lx-p0-suggest:not([data-followups])").forEach((el) => {
            if (el.querySelector("[data-quick-ask]")) {
              el.classList.remove("lx-p0-suggest");
              el.classList.add("followups");
            }
          });
          box.querySelectorAll(".followups .lx-p0-suggest-chip").forEach((el) => {
            el.classList.remove("lx-p0-suggest-chip");
          });
          box.querySelectorAll(".lx-p0-actions").forEach((el) => {
            el.classList.add("answer-actions");
          });
          // 当前对话规则暂不展示“重新生成”；同时清理历史消息中的旧按钮。
          box.querySelectorAll('[data-msg-action="regen"]').forEach((el) => el.remove());
          return box.innerHTML;
        }

        function lxActionBarHtml() {
          return `<div class="message-actions" aria-label="回答操作">
            <button type="button" data-msg-action="copy" aria-label="复制"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="3"></rect><rect x="4" y="4" width="12" height="12" rx="3"></rect></svg></button>
            <button type="button" data-msg-action="up" aria-label="有帮助"><svg viewBox="0 0 24 24"><path d="M7 10v10"></path><path d="M11 10l1.2-5.2a2 2 0 0 1 3.7-.5L16 5.5V10h4a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H9a2 2 0 0 1-2-2v-8"></path><path d="M3 10h4v10H3z"></path></svg></button>
            <button type="button" data-msg-action="down" aria-label="无帮助"><svg viewBox="0 0 24 24"><path d="M7 14V4"></path><path d="M11 14l1.2 5.2a2 2 0 0 0 3.7.5l.1-1.2V14h4a2 2 0 0 0 2-2.3l-1-6A2 2 0 0 0 19 4H9a2 2 0 0 0-2 2v8"></path><path d="M3 4h4v10H3z"></path></svg></button>
          </div>`;
        }

        function lxWithAnswerActions(html) {
          const box = document.createElement("div");
          box.innerHTML = lxNormalizeAnswerHtml(html);
          if (!box.querySelector(".message-actions")) {
            const actions = document.createElement("div");
            actions.innerHTML = lxActionBarHtml();
            const followups = box.querySelector(".followups");
            if (followups) box.insertBefore(actions.firstElementChild, followups);
            else box.appendChild(actions.firstElementChild);
          }
          return box.innerHTML;
        }

        function lxAppendAiHtml(node, html) {
          if (!node || !html) return;
          if (node._pendingExtras != null) {
            node._pendingExtras += String(html);
            return;
          }
          lxEnsureAiBody(node).insertAdjacentHTML("beforeend", lxNormalizeAnswerHtml(html));
          const list = ensureChat();
          if (list) list.scrollTop = list.scrollHeight;
        }

        function lxAfterAiAnswer(node, fn) {
          if (!node || typeof fn !== "function") return;
          if (Array.isArray(node._afterAnswer)) {
            node._afterAnswer.push(fn);
            return;
          }
          fn();
        }


        function lxTypeNodes(sourceParent, targetParent, speed, done) {
          const cursor = document.createElement("span");
          cursor.className = "typing-cursor";
          const scroll = () => {
            const list = ensureChat();
            if (list) list.scrollTop = list.scrollHeight;
          };
          const moveCursor = (parent) => { cursor.remove(); parent.appendChild(cursor); scroll(); };
          const typeTextNode = (text, parent, next) => {
            const textNode = document.createTextNode("");
            let index = 0;
            parent.appendChild(textNode);
            moveCursor(parent);
            const tick = () => {
              textNode.nodeValue = text.slice(0, index);
              index += 1;
              if (index <= text.length) window.setTimeout(tick, speed);
              else next();
            };
            tick();
          };
          const typeChildList = (children, parent, next) => {
            let index = 0;
            const step = () => {
              if (index >= children.length) { next(); return; }
              typeNode(children[index], parent, () => { index += 1; step(); });
            };
            step();
          };
          const typeNode = (node, parent, next) => {
            if (node.nodeType === Node.TEXT_NODE) {
              if (!node.nodeValue) { next(); return; }
              typeTextNode(node.nodeValue, parent, next);
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) { next(); return; }
            const clone = node.cloneNode(false);
            parent.appendChild(clone);
            moveCursor(clone);
            typeChildList(Array.from(node.childNodes), clone, next);
          };
          targetParent.innerHTML = "";
          typeChildList(Array.from(sourceParent.childNodes), targetParent, () => {
            cursor.remove();
            if (done) done();
          });
        }

        function lxAnimateAiFinal(node, html) {
          const body = lxEnsureAiBody(node);
          const finalHTML = lxWithAnswerActions(html);
          node.classList.remove("loading");
          node.classList.add("ai", "lx-chat-skin");
          if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            body.innerHTML = finalHTML;
            return Promise.resolve();
          }
          body.innerHTML = '<div class="loading-line"><span class="typing-text">联想乐享正在生成中...</span><span class="typing-cursor"></span></div>';
          const loadingStarted = Date.now();
          return new Promise((resolve) => {
            const startBodyTyping = () => {
              const waitTime = Math.max(0, 5000 - (Date.now() - loadingStarted));
              window.setTimeout(() => {
                const source = document.createElement("div");
                source.innerHTML = finalHTML;
                source.querySelectorAll(".answer-cta, .message-actions, .followups").forEach((el) => el.remove());
                lxTypeNodes(source, body, 18, () => {
                  window.setTimeout(() => {
                    body.innerHTML = finalHTML;
                    const list = ensureChat();
                    if (list) list.scrollTop = list.scrollHeight;
                    resolve();
                  }, 140);
                });
              }, waitTime);
            };
            startBodyTyping();
          });
        }

        const LX_CONV_HISTORY_KEY = "lexiang.lxfd.convs.v1";

        function lxLoadConversationHistoryStore() {
          try {
            const list = JSON.parse(localStorage.getItem(LX_CONV_HISTORY_KEY) || "[]");
            return Array.isArray(list) ? list.filter(Boolean) : [];
          } catch (_e) { return []; }
        }

        function lxSaveConversationHistoryStore(list) {
          try { localStorage.setItem(LX_CONV_HISTORY_KEY, JSON.stringify((list || []).slice(0, 20))); } catch (_e) {}
        }

        function lxMainConversationMessages() {
          const listEl = document.querySelector(".chat-state .lx-p0-messages");
          if (!listEl) return [];
          const messages = [];
          listEl.querySelectorAll(":scope > .lx-p0-message").forEach((el) => {
            const isUser = el.classList.contains("user");
            const isAi = el.classList.contains("ai") || el.classList.contains("assistant");
            if (!isUser && !isAi) return;
            if (el._lxTransient || el.dataset.lxTransient === "1" || (el.querySelector(".lx-op-steps") && !el.querySelector(".lx-agent-chain-head"))) return; // agent多步卡(.lx-agent-chain-head)要存为执行记录,只跳lxBuyWithIntro临时进度卡
            // 跳过未完成的 loading 态 AI 消息——但 _raw 已落地最终文本时例外，理由同 app-conv.js 的
            // doSave()：下单成功等关键节点 addMessage 后是立即同步调 saveNow，lxAnimateAiFinal 的
            // 5s+ 占位动画这时候根本没跑完，只看 DOM loading 标记会把已经确定的最终内容整条误杀。
            const _hasFinalRaw = isAi && typeof el._raw === "string" && el._raw.trim().length > 0;
            if (isAi && !_hasFinalRaw && (el.classList.contains("loading") || el.querySelector(".lx-generating, .loading-line, .typing-text"))) return;
            const text = isUser ? (el.querySelector(".user-bubble")?.textContent || "").trim() : (el._raw || el.textContent || "").trim();
            let html = isAi ? (el.querySelector(".ai-body")?.innerHTML || "") : "";
            if (isAi && /正在生成中|lx-generating|loading-line|typing-text|typing-cursor|lx-op-steps/.test(html) && !/lx-agent-chain-head/.test(html)) html = "";
            if (!text && !html) return;
            messages.push({ role: isUser ? "user" : "ai", text, html });
          });
          while (messages.length && messages[messages.length - 1].role === "user") messages.pop();
          return messages.slice(-50);
        }

        function lxMessagesToLxfdHtml(messages) {
          return (messages || []).map((m) => {
            if (m.role === "user") return `<div class="lxfd-msg-user">${esc(m.text || "")}</div>`;
            return `<div class="lxfd-msg-ai"><div class="lxfd-ai-body">${m.html || mdLite(m.text || "")}</div></div>`;
          }).join("");
        }

        function lxParseLxfdThreadHtml(threadHtml) {
          const box = document.createElement("div");
          box.innerHTML = String(threadHtml || "");
          const messages = [];
          Array.from(box.children || []).forEach((el) => {
            if (el.classList?.contains("lxfd-msg-user")) {
              const text = (el.textContent || "").trim();
              if (text) messages.push({ role: "user", text, html: "" });
            } else if (el.classList?.contains("lxfd-msg-ai")) {
              const body = el.querySelector(".lxfd-ai-body") || el;
              const html = body.innerHTML || "";
              const text = (body.textContent || "").trim();
              if (html || text) messages.push({ role: "ai", text, html });
            }
          });
          while (messages.length && messages[messages.length - 1].role === "user") messages.pop();
          return messages;
        }

        function lxConversationTitle(messages) {
          const firstUser = (messages || []).find((m) => m.role === "user" && String(m.text || "").trim());
          return (firstUser ? String(firstUser.text || "") : "新对话").trim().slice(0, 24) || "新对话";
        }

        // 件3 刷新找回：id 稳定复用（state.localArchiveId）而不是每次新开一条——分屏对话进行中
        // 会被 window.__lxSaveConversationNow 反复调用（答完/链每步/桥接导入时），同一通对话
        // 只覆盖同一条历史记录，不会刷屏式地在侧栏里刷出一堆重复条目。
        function lxArchiveCurrentConversation() {
          const messages = lxMainConversationMessages();
          if (!messages.length) return;
          const title = lxConversationTitle(messages);
          const id = state.localArchiveId || ("lc" + Date.now() + Math.random().toString(36).slice(2, 6));
          state.localArchiveId = id;
          const previous = lxLoadConversationHistoryStore().find((entry) => entry && entry.id === id);
          const item = { id, title, convId: state.convId || null, messages, threadHtml: lxMessagesToLxfdHtml(messages), ts: Date.now(), pinned: !!previous?.pinned };
          const store = lxLoadConversationHistoryStore().filter((entry) => entry && entry.id !== id);
          store.unshift(item);
          lxSaveConversationHistoryStore(store);
        }

        function lxRestoreConversationRecord(id) {
          const record = lxLoadConversationHistoryStore().find((entry) => entry && entry.id === id);
          if (!record) return;
          lxArchiveCurrentConversation();
          state.conversationNonce += 1;
          state.localArchiveId = record.id; // 继续聊这条恢复的对话，仍覆盖同一条记录
          state.convId = record.convId || null;
          state.sending = false;
          state.queryHistory = [];
          state.queryAnchors = [];
          const messages = Array.isArray(record.messages) && record.messages.length ? record.messages : lxParseLxfdThreadHtml(record.threadHtml);
          const list = ensureChat();
          if (!list) return;
          list.innerHTML = "";
          messages.forEach((m) => {
            if (m.role === "user") {
              const node = document.createElement("div");
              node.className = "lx-p0-message msg user";
              node.innerHTML = `<div class="user-bubble">${esc(m.text || "")}</div>`;
              list.appendChild(node);
              state.queryHistory.push(m.text || "");
              state.queryAnchors.push(list.children.length - 1);
            } else {
              const node = document.createElement("div");
              node.className = "lx-p0-message msg ai lx-chat-skin";
              node._raw = m.text || "";
              const body = lxEnsureAiBody(node);
              body.innerHTML = m.html || mdLite(m.text || "");
              list.appendChild(node);
            }
          });
          document.body.dataset.state = "chat";
          list.scrollTop = list.scrollHeight;
          try { localStorage.setItem(LX_CONV_KEY, JSON.stringify({ convId: state.convId || null, messages, ts: Date.now() })); } catch (_e) {}
          renderQueryHistory();
          closeModal();
          lxCloseHistoryButtonState();
        }

        function lxRebuildQueryHistoryFromDom() {
          const history = [];
          const anchors = [];
          const chat = document.querySelector(".lx-p0-messages");
          if (chat) {
            Array.from(chat.children || []).forEach((node, index) => {
              const isUser = node.classList?.contains("user") || !!node.querySelector?.(".user-bubble");
              if (!isUser) return;
              const text = (node.querySelector(".user-bubble")?.innerText || node.innerText || "").trim();
              if (!text) return;
              history.push(text);
              anchors.push(index);
            });
          }
          if (!history.length) {
            try {
              const data = JSON.parse(localStorage.getItem(LX_CONV_KEY) || "null");
              const messages = Array.isArray(data?.messages) ? data.messages : [];
              messages.forEach((msg, index) => {
                if (msg?.role !== "user") return;
                const text = String(msg.text || "").trim();
                if (!text) return;
                history.push(text);
                anchors.push(index);
              });
            } catch (_e) {}
          }
          state.queryHistory = history;
          state.queryAnchors = anchors;
        }

        const LX_HISTORY_MODAL_PAGE_SIZE = 8;
        let lxHistoryModalPage = 1;

        function lxHistoryModalItems(query) {
          const normalizedQuery = String(query || "").trim().toLocaleLowerCase("zh-CN");
          return lxLoadConversationHistoryStore()
            .slice()
            .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Number(b.ts || 0) - Number(a.ts || 0))
            .filter((item) => !normalizedQuery || String(item?.title || "").toLocaleLowerCase("zh-CN").includes(normalizedQuery));
        }

        function lxHistoryModalRows(query) {
          const normalizedQuery = String(query || "").trim();
          const store = lxHistoryModalItems(query);
          if (!store.length) return `<div class="lx-history-empty" role="status">${normalizedQuery ? "没有找到相关对话" : "还没有历史对话"}</div>`;
          const start = (lxHistoryModalPage - 1) * LX_HISTORY_MODAL_PAGE_SIZE;
          return store.slice(start, start + LX_HISTORY_MODAL_PAGE_SIZE).map((item) => {
            const title = item?.title || "新对话";
            const pinLabel = item?.pinned ? "取消置顶" : "置顶";
            const pinIcon = item?.pinned ? "global-unpin.svg" : "global-pin.svg";
            return `<div class="lx-history-row${item?.pinned ? " is-pinned" : ""}" data-conv-id="${esc(item.id || "")}"><button class="lx-history-row-main" type="button" data-conv-id="${esc(item.id || "")}" title="${esc(title)}"><span>${esc(title)}</span></button><div class="lx-history-actions" aria-label="${esc(title)}的操作"><button type="button" data-history-action="pin" aria-label="${pinLabel}" title="${pinLabel}"><img src="../icons/${pinIcon}" alt="" aria-hidden="true" /></button><button type="button" data-history-action="delete" aria-label="删除" title="删除"><img src="../icons/global-delete.svg" alt="" aria-hidden="true" /></button></div></div>`;
          }).join("");
        }

        function lxHistoryPaginationHtml(query) {
          const totalPages = Math.ceil(lxHistoryModalItems(query).length / LX_HISTORY_MODAL_PAGE_SIZE);
          if (totalPages <= 1) return "";
          return `<nav class="lx-history-pagination" aria-label="历史记录分页"><button type="button" data-history-page="prev" aria-label="上一页" title="上一页"${lxHistoryModalPage <= 1 ? " disabled" : ""}><img class="is-prev" src="../icons/global-next.svg" alt="" aria-hidden="true" /></button><span><b>${lxHistoryModalPage}</b> / ${totalPages}</span><button type="button" data-history-page="next" aria-label="下一页" title="下一页"${lxHistoryModalPage >= totalPages ? " disabled" : ""}><img src="../icons/global-next.svg" alt="" aria-hidden="true" /></button></nav>`;
        }

        function lxRenderHistoryModal(query) {
          const totalPages = Math.max(1, Math.ceil(lxHistoryModalItems(query).length / LX_HISTORY_MODAL_PAGE_SIZE));
          lxHistoryModalPage = Math.min(Math.max(1, lxHistoryModalPage), totalPages);
          const list = document.querySelector(".lx-history-modal .lx-history-list");
          if (list) list.innerHTML = lxHistoryModalRows(query);
          const pagination = document.querySelector(".lx-history-modal .lx-history-pagination-wrap");
          if (pagination) pagination.innerHTML = lxHistoryPaginationHtml(query);
        }

        function lxHistoryModalHtml() {
          return `<div class="lx-history-modal"><label class="lx-history-search-wrap"><input class="lx-history-search-input" type="search" placeholder="搜索历史对话" aria-label="搜索历史对话" autocomplete="off" /></label><div class="lx-history-section">历史记录</div><div class="lx-history-list">${lxHistoryModalRows("")}</div><div class="lx-history-pagination-wrap">${lxHistoryPaginationHtml("")}</div></div>`;
        }

        function lxOpenHistoryModal() {
          lxHistoryModalPage = 1;
          openModal("历史记录", lxHistoryModalHtml());
          const search = document.querySelector(".lx-history-modal .lx-history-search-input");
          const searchWrap = search?.closest(".lx-history-search-wrap");
          const modal = search?.closest(".lx-p0-modal");
          const modalTitle = modal?.querySelector(".lx-p0-modal-title");
          modal?.querySelectorAll(".lx-p0-modal-head .lx-history-search-wrap").forEach((node) => node.remove());
          if (searchWrap && modalTitle) modalTitle.insertAdjacentElement("afterend", searchWrap);
          search?.addEventListener("input", () => {
            lxHistoryModalPage = 1;
            lxRenderHistoryModal(search.value);
          });
          document.querySelector(".history-button")?.classList.add("is-active");
          document.querySelector(".history-button")?.setAttribute("aria-expanded", "true");
        }

        function lxCloseHistoryButtonState() {
          document.querySelector(".history-button")?.classList.remove("is-active");
          document.querySelector(".history-button")?.setAttribute("aria-expanded", "false");
        }

        function lxScrollToQueryAnchor(anchor) {
          const chatBox = document.querySelector(".lx-p0-messages");
          const node = Number.isFinite(anchor) ? chatBox?.children[anchor] : null;
          if (node) {
            node.scrollIntoView({ behavior: "smooth", block: "center" });
            node.classList.add("lx-flash-msg");
            setTimeout(() => node.classList.remove("lx-flash-msg"), 1800);
          }
        }

        function renderQueryHistory() {
          const dots = $(".page-dots");
          const menu = $(".prompt-menu", dots);
          if (!dots || !menu) return;
          // DOM 是当前会话的唯一可信来源，避免某些业务入口漏写 queryHistory，
          // 也避免普通发送分支重复 push 后出现多余圆点。
          lxRebuildQueryHistoryFromDom();
          const history = state.queryHistory.filter(Boolean);
          dots.classList.toggle("is-empty", !history.length);
          dots.querySelectorAll("i").forEach((dot) => dot.remove());
          history.forEach((_, index) => {
            const dot = document.createElement("i");
            if (index === history.length - 1) dot.className = "active";
            dot.dataset.qAnchor = (state.queryAnchors || [])[index] ?? "";
            dot.setAttribute("role", "button");
            dot.setAttribute("tabindex", "0");
            dot.setAttribute("aria-label", `定位到第 ${index + 1} 轮提问`);
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
          lxArchiveCurrentConversation();
          try {
            localStorage.setItem("lexiang.newChatEmpty.v1", "1");
            localStorage.removeItem(LX_CONV_KEY);
          } catch (_e) {}
          state.localArchiveId = null; // 新对话另起一条稳定id，不再覆盖刚归档的这条
          state.conversationNonce += 1;
          state.convId = null;
          state.sending = false;
          state.pendingImageUrl = "";
          state.pendingAudioUrl = "";
          state.queryHistory = [];
          try { localStorage.removeItem(LX_CONV_KEY); } catch (_e) {} // 仅主动新建对话才清持久化
          document.body.dataset.state = "default";
          $(".lx-p0-messages")?.remove();
          const chatState = $(".chat-state");
          if (chatState) {
            chatState.innerHTML = "";
          }
          const textarea = $(".composer textarea");
          if (textarea) {
            textarea.value = "";
            textarea.style.height = "";
            textarea.style.overflowY = "hidden";
          }
          updateUploadNote();
          renderQueryHistory();
          // 新建对话：仅「首页」分屏态才回全屏欢迎页；在子站（个人/企业/政教）应留在子站分屏，不弹全屏
          const _logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
          // `lx-home-split` 只表示当前采用左右结构，并不等于首页。
          // 商城模板同样使用该布局类；若据此判定首页，点击“新建对话”会误跳到
          // 全屏欢迎态，无法在商城右侧页面旁恢复左侧默认助手。
          const _onHome = _logicalPath === "/" || state.page === "home" || !state.page;
          if (_onHome && !document.body.classList.contains("assistant-fullscreen") &&
              typeof window.__lxfdNewFullscreen === "function") {
            state.tabs = [];
            state.activeTabId = null;
            lxRenderTabbar();
            document.querySelector(".content")?.setAttribute("data-view", "list");
            window.__lxfdNewFullscreen();
          } else {
            // 子站新建：清空业务结果标签，但保留当前站点首页标签。
            state.tabs = [];
            state.activeTabId = null;
            document.querySelector(".content")?.setAttribute("data-view", "list");
            lxEnsureCurrentSiteTab(true);
            toast("已新建对话");
          }
        }

        async function lxRunUnifiedSolutionAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const solutionCopy = [
            "我已为你汇总**乐享全集解决方案**，覆盖教育、医疗、政府、制造、金融、能源、交通和服务八大行业。",
            "每个行业都按照**独立楼层**组织，并结合核心业务场景、终端部署、基础设施与持续服务，方便你快速浏览和比较。",
            "你可以进入全集后**按行业标签定位**；当前视口会在每个楼层单排自适应展示 4–6 个方案。"
          ].join("\n\n");
          const solutionCard = renderPageCta({
            title: "查看全集解决方案",
            desc: "覆盖教育、医疗、政府、制造、金融、能源、交通、服务",
            attr: 'data-lx-open-tab="info:solution" data-lxfd-open-feature="solution" aria-label="查看全集解决方案页面"'
          });
          try {
            // 所有入口严格共用：首页/频道、全屏/分屏都先完成同一正文，再展示同一结果卡，最后打开右侧页面。
            const answerNode = addMessage("assistant", solutionCopy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, solutionCard);
            const cardNode = answerNode?.querySelector('[data-lx-open-tab="info:solution"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openSolutionCenter();
            lxSyncAnswerCtaActiveState("info:solution");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }


        function lxIsNearbyStoreQuery(text) {
          const value = String(text || "").trim();
          return value.length <= 24 && !/预约|库存|营业|电话|服务权益|导航/.test(value) && /附近门店|联想门店|门店查询|查.{0,4}门店|找.{0,4}门店|推荐.{0,4}门店|^(门店|实体店|体验店|专卖店)$/.test(value);
        }

        async function lxRunUnifiedStoreAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的门店需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：需要查询当前位置附近的联想授权门店");
            paint();
            await wait(520);
            skills.add("Skill(附近门店查询)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(附近门店查询)");
            paint();
            await wait(760);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(附近门店查询) 已完成";
            paint();
            const copy = "我已结合**当前位置**为你整理附近的**联想授权门店**，优先推荐距离较近、营业时间明确且支持产品体验、库存咨询和到店服务的门店。你可以先查看下方推荐，再到右侧比较**地址、营业状态与联系方式**，并按需发起**导航或预约**。";
            const cards = renderPageCta({
              title: "查看附近门店",
              desc: "已为你整理附近授权门店、距离与营业状态",
              attr: 'data-lx-open-tab="info:stores" data-lxfd-open-feature="stores" aria-label="查看附近门店页面"'
            });
            body.innerHTML = renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }) + mdLite(copy) + cards;
            ai.classList.remove("loading");
            ensureChat().scrollTop = ensureChat().scrollHeight;
            await wait(680);
            lxRevealContent();
            await openStoresPanel();
            lxSyncAnswerCtaActiveState("info:stores");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        const LX_SERVICE_INTAKE_REGION_KEY = "lexiang.serviceIntake.region.v1";

        function lxInstallServiceIntakeSplitStyles() {
          if (document.getElementById("lx-service-intake-split-styles")) return;
          const style = document.createElement("style");
          style.id = "lx-service-intake-split-styles";
          style.textContent = `
            html body .lx-service-intake{width:100%!important;max-width:820px!important;margin-top:18px!important;border:1px solid #E2DDEB!important;border-radius:8px!important;background:#FCFAFF!important;overflow:hidden!important}
            html body .lx-service-intake .lx-service-intake-item{display:grid!important;grid-template-columns:28px minmax(0,1fr)!important;align-items:center!important;gap:16px!important;min-height:78px!important;padding:18px 22px!important;border-bottom:1px solid #E2DDEB!important;background:#FFFFFF!important}
            html body .lx-service-intake .lx-service-intake-item:last-child{border-bottom:0!important}
            html body .lx-service-intake .lx-service-intake-index{display:grid!important;place-items:center!important;width:28px!important;height:28px!important;border-radius:8px!important;background:#F3F0F7!important;color:#4D144A!important;font-size:13px!important;line-height:20px!important;font-weight:500!important}
            html body .lx-service-intake .lx-service-intake-copy{display:grid!important;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)!important;align-items:center!important;gap:24px!important;min-width:0!important}
            html body .lx-service-intake .lx-service-intake-copy>strong{display:block!important;color:#252525!important;font-size:15px!important;line-height:22px!important;font-weight:500!important;white-space:normal!important}
            html body .lx-service-intake .lx-service-intake-actions{display:flex!important;align-items:center!important;flex-wrap:wrap!important;width:100%!important;min-width:0!important;gap:10px!important}
            html body .lx-service-intake .lx-service-intake-btn{display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;width:auto!important;max-width:100%!important;min-width:0!important;min-height:40px!important;height:auto!important;margin:0!important;padding:9px 14px!important;border:1px solid #E2DDEB!important;border-radius:8px!important;background:#FFFFFF!important;color:#4D144A!important;font-family:inherit!important;font-size:14px!important;line-height:20px!important;font-weight:500!important;white-space:normal!important;word-break:normal!important;overflow-wrap:anywhere!important;box-shadow:none!important;transition:background-color .16s ease,border-color .16s ease!important}
            html body .lx-service-intake .lx-service-intake-btn.primary{border-color:#D3BFD2!important;background:#F3F0F7!important}
            html body .lx-service-intake .lx-service-intake-btn:hover{border-color:#4D144A!important;background:#F3F0F7!important}
            html body .lx-service-intake .lx-service-intake-btn:focus-visible{border-color:#4D144A!important;outline:2px solid #4D144A!important;outline-offset:2px!important}
            .assistant-panel .lx-service-intake{max-width:none!important}
            .assistant-panel .lx-service-intake .lx-service-intake-item{grid-template-columns:28px minmax(0,1fr)!important;align-items:start!important;gap:14px!important;min-height:0!important;padding:16px!important}
            .assistant-panel .lx-service-intake .lx-service-intake-copy{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
            .assistant-panel .lx-service-intake .lx-service-intake-actions{gap:8px!important}
            .assistant-panel .lx-service-intake [data-lx-service-region-open]{width:100%!important}
            .reco-page.lx-service-reco-page .reco-head h2{margin:0 0 0 10px!important;font-size:22px!important;line-height:32px!important;font-weight:500!important;color:#252525!important;letter-spacing:0!important}
            .reco-page.lx-service-reco-page .reco-row-main>strong{font-weight:500!important}
          `;
          document.head.appendChild(style);
        }
        lxInstallServiceIntakeSplitStyles();

        function lxIsServiceIntakeQuery(text) {
          const value = String(text || "").trim();
          if (!value) return false;
          if (/^我的设备是.+所在地区是.+请推荐可购买、可预约的清灰换硅脂服务商品$/.test(value)) return false;
          return /清灰|除尘|换硅脂|散热保养/.test(value);
        }
        window.__lxIsServiceIntakeQuery = lxIsServiceIntakeQuery;

        function lxServiceIntakeRegion() {
          try { return localStorage.getItem(LX_SERVICE_INTAKE_REGION_KEY) || "北京"; } catch (_e) { return "北京"; }
        }

        function lxServiceIntakeChoicesHtml() {
          return `<style data-lx-service-intake-style>
            .lx-service-intake{width:100%;max-width:760px;margin:16px 0 0;border:1px solid #E2DDEB;border-radius:10px;background:#FFFFFF;overflow:hidden}
            .lx-service-intake .lx-service-intake-item{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:12px;padding:16px;border:0;border-bottom:1px solid #E2DDEB;border-radius:0;background:#FFFFFF}
            .lx-service-intake .lx-service-intake-item:last-child{border-bottom:0}
            .lx-service-intake .lx-service-intake-index{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#F3F0F7;color:#4D144A;font-size:12px;line-height:18px;font-weight:500}
            .lx-service-intake .lx-service-intake-copy{display:grid;grid-template-columns:minmax(168px,.72fr) minmax(0,1.28fr);align-items:center;gap:20px;min-width:0}
            .lx-service-intake .lx-service-intake-copy>strong{font-size:14px;line-height:22px;font-weight:500;color:#252525}
            .lx-service-intake .lx-service-intake-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
            .lxfd-ai-body .lx-service-intake .lx-service-intake-btn,.ai-body .lx-service-intake .lx-service-intake-btn,.lx-service-intake .lx-service-intake-btn{display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;min-height:38px!important;margin:0!important;padding:0 13px!important;border:1px solid #D3BFD2!important;border-radius:7px!important;background:#FFFFFF!important;color:#4D144A!important;font-family:inherit!important;font-size:14px!important;line-height:20px!important;font-weight:500!important;cursor:pointer!important;text-align:left!important;box-shadow:none!important;transform:none!important}
            .lxfd-ai-body .lx-service-intake .lx-service-intake-btn:hover,.ai-body .lx-service-intake .lx-service-intake-btn:hover,.lx-service-intake .lx-service-intake-btn:hover{border-color:#4D144A!important;background:#F3F0F7!important}
            .lxfd-ai-body .lx-service-intake .lx-service-intake-btn:focus-visible,.ai-body .lx-service-intake .lx-service-intake-btn:focus-visible,.lx-service-intake .lx-service-intake-btn:focus-visible{border-color:#4D144A!important;outline:2px solid #4D144A!important;outline-offset:2px!important}
            .lxfd-ai-body .lx-service-intake .lx-service-intake-btn.primary,.ai-body .lx-service-intake .lx-service-intake-btn.primary,.lx-service-intake .lx-service-intake-btn.primary{background:#F3F0F7!important}
            .assistant-panel .lx-service-intake .lx-service-intake-copy{grid-template-columns:1fr;gap:8px}
            .assistant-panel .lx-service-intake .lx-service-intake-btn{max-width:100%;white-space:normal!important;word-break:keep-all}
            .lx-p0-modal.lx-service-region-dialog{display:flex!important;flex-direction:column!important;width:min(960px,calc(100vw - 64px))!important;height:min(620px,calc(100vh - 96px))!important;max-width:none!important;max-height:none!important;border:1px solid #E2DDEB!important;border-radius:8px!important;background:#FFFFFF!important;overflow:hidden!important}
            .lx-p0-modal.lx-service-region-dialog .lx-p0-modal-head{flex:0 0 72px;padding:0 24px;border-bottom:1px solid #E2DDEB}.lx-p0-modal.lx-service-region-dialog .lx-p0-modal-title{font-size:22px;line-height:32px;font-weight:500;color:#252525}
            .lx-p0-modal.lx-service-region-dialog .lx-p0-modal-body{display:flex;flex:1 1 auto;min-height:0;padding:0!important;overflow:hidden!important}
            .lx-service-region-picker{display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:100%;min-height:0;background:#FFFFFF}.lx-service-region-summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 22px;border-bottom:1px solid #E2DDEB;color:#606060;font-size:14px;line-height:22px}.lx-service-region-summary strong{color:#4D144A;font-weight:500}
            .lx-service-region-columns{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:0}.lx-service-provinces{padding:12px;border-right:1px solid #E2DDEB;overflow:auto;background:#FCFAFF}.lx-service-cities{padding:18px 20px;overflow:auto}.lx-service-region-section-title{display:block;margin:0 0 10px;color:#606060;font-size:13px;line-height:20px;font-weight:500}
            .lx-service-province-list{display:grid;gap:4px}.lx-service-province,.lx-service-city{font-family:inherit;font-weight:500;cursor:pointer}.lx-service-province{display:flex;align-items:center;width:100%;min-height:38px;padding:0 12px;border:0;border-radius:6px;background:transparent;color:#252525;font-size:14px;line-height:20px;text-align:left}.lx-service-province:hover,.lx-service-province:focus-visible{background:#F3F0F7;color:#4D144A;outline:none}.lx-service-province.is-current{background:#F3F0F7;color:#4D144A}
            .lx-service-city-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lx-service-city{min-height:42px;padding:0 12px;border:1px solid #E2DDEB;border-radius:7px;background:#FFFFFF;color:#252525;font-size:14px;line-height:20px}.lx-service-city:hover,.lx-service-city:focus-visible{border-color:#4D144A;background:#F3F0F7;outline:none}.lx-service-city.is-current{border-color:#D3BFD2;background:#F3F0F7;color:#4D144A}
            .lx-service-region-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid #E2DDEB}.lx-service-region-action{min-width:76px;height:36px;padding:0 14px;border:1px solid #D3BFD2;border-radius:7px;background:#FFFFFF;color:#4D144A;font-family:inherit;font-size:14px;line-height:20px;font-weight:500;cursor:pointer}.lx-service-region-action:hover,.lx-service-region-action:focus-visible{border-color:#4D144A;background:#F3F0F7;outline:none}.lx-service-region-action.primary{border-color:#4D144A;background:#4D144A;color:#FFFFFF}
            @media(max-width:720px){.lx-service-intake .lx-service-intake-copy{grid-template-columns:1fr;gap:8px}.lx-service-region-columns{grid-template-columns:160px minmax(0,1fr)}.lx-service-city-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
          </style><section class="lx-service-intake" aria-label="清灰换硅脂服务信息确认">
            <div class="lx-service-intake-item"><span class="lx-service-intake-index">1</span><div class="lx-service-intake-copy"><strong>请选择所在地区</strong><div class="lx-service-intake-actions"><button class="lx-service-intake-btn primary" type="button" data-lx-service-region-open>当前地区：<span data-lx-service-region-label>${esc(lxServiceIntakeRegion())}</span> · 修改</button></div></div></div>
            <div class="lx-service-intake-item"><span class="lx-service-intake-index">2</span><div class="lx-service-intake-copy"><strong>请选择需要服务的设备</strong><div class="lx-service-intake-actions"><button class="lx-service-intake-btn primary" type="button" data-lx-service-device-send>拯救者 Y7000P 2025</button><button class="lx-service-intake-btn" type="button" data-lx-service-other-device>其他设备</button></div></div></div>
          </section>`;
        }

        function lxOpenServiceRegionPicker() {
          document.querySelector(".lx-service-region-mask")?.remove();
          const current = lxServiceIntakeRegion();
          const regions = {
            "北京市":["北京市"],"天津市":["天津市"],"河北省":["石家庄市","唐山市","秦皇岛市","邯郸市","邢台市","保定市","张家口市","承德市","沧州市","廊坊市","衡水市"],"山西省":["太原市","大同市","阳泉市","长治市","晋城市","朔州市","晋中市","运城市","忻州市","临汾市","吕梁市"],"内蒙古自治区":["呼和浩特市","包头市","乌海市","赤峰市","通辽市","鄂尔多斯市","呼伦贝尔市","巴彦淖尔市","乌兰察布市","兴安盟","锡林郭勒盟","阿拉善盟"],
            "辽宁省":["沈阳市","大连市","鞍山市","抚顺市","本溪市","丹东市","锦州市","营口市","阜新市","辽阳市","盘锦市","铁岭市","朝阳市","葫芦岛市"],"吉林省":["长春市","吉林市","四平市","辽源市","通化市","白山市","松原市","白城市","延边朝鲜族自治州"],"黑龙江省":["哈尔滨市","齐齐哈尔市","鸡西市","鹤岗市","双鸭山市","大庆市","伊春市","佳木斯市","七台河市","牡丹江市","黑河市","绥化市","大兴安岭地区"],"上海市":["上海市"],
            "江苏省":["南京市","无锡市","徐州市","常州市","苏州市","南通市","连云港市","淮安市","盐城市","扬州市","镇江市","泰州市","宿迁市"],"浙江省":["杭州市","宁波市","温州市","嘉兴市","湖州市","绍兴市","金华市","衢州市","舟山市","台州市","丽水市"],"安徽省":["合肥市","芜湖市","蚌埠市","淮南市","马鞍山市","淮北市","铜陵市","安庆市","黄山市","滁州市","阜阳市","宿州市","六安市","亳州市","池州市","宣城市"],"福建省":["福州市","厦门市","莆田市","三明市","泉州市","漳州市","南平市","龙岩市","宁德市"],"江西省":["南昌市","景德镇市","萍乡市","九江市","新余市","鹰潭市","赣州市","吉安市","宜春市","抚州市","上饶市"],
            "山东省":["济南市","青岛市","淄博市","枣庄市","东营市","烟台市","潍坊市","济宁市","泰安市","威海市","日照市","临沂市","德州市","聊城市","滨州市","菏泽市"],"河南省":["郑州市","开封市","洛阳市","平顶山市","安阳市","鹤壁市","新乡市","焦作市","濮阳市","许昌市","漯河市","三门峡市","南阳市","商丘市","信阳市","周口市","驻马店市","济源市"],"湖北省":["武汉市","黄石市","十堰市","宜昌市","襄阳市","鄂州市","荆门市","孝感市","荆州市","黄冈市","咸宁市","随州市","恩施土家族苗族自治州","仙桃市","潜江市","天门市","神农架林区"],"湖南省":["长沙市","株洲市","湘潭市","衡阳市","邵阳市","岳阳市","常德市","张家界市","益阳市","郴州市","永州市","怀化市","娄底市","湘西土家族苗族自治州"],
            "广东省":["广州市","韶关市","深圳市","珠海市","汕头市","佛山市","江门市","湛江市","茂名市","肇庆市","惠州市","梅州市","汕尾市","河源市","阳江市","清远市","东莞市","中山市","潮州市","揭阳市","云浮市"],"广西壮族自治区":["南宁市","柳州市","桂林市","梧州市","北海市","防城港市","钦州市","贵港市","玉林市","百色市","贺州市","河池市","来宾市","崇左市"],"海南省":["海口市","三亚市","三沙市","儋州市","五指山市","琼海市","文昌市","万宁市","东方市","定安县","屯昌县","澄迈县","临高县","白沙黎族自治县","昌江黎族自治县","乐东黎族自治县","陵水黎族自治县","保亭黎族苗族自治县","琼中黎族苗族自治县"],"重庆市":["重庆市"],
            "四川省":["成都市","自贡市","攀枝花市","泸州市","德阳市","绵阳市","广元市","遂宁市","内江市","乐山市","南充市","眉山市","宜宾市","广安市","达州市","雅安市","巴中市","资阳市","阿坝藏族羌族自治州","甘孜藏族自治州","凉山彝族自治州"],"贵州省":["贵阳市","六盘水市","遵义市","安顺市","毕节市","铜仁市","黔西南布依族苗族自治州","黔东南苗族侗族自治州","黔南布依族苗族自治州"],"云南省":["昆明市","曲靖市","玉溪市","保山市","昭通市","丽江市","普洱市","临沧市","楚雄彝族自治州","红河哈尼族彝族自治州","文山壮族苗族自治州","西双版纳傣族自治州","大理白族自治州","德宏傣族景颇族自治州","怒江傈僳族自治州","迪庆藏族自治州"],"西藏自治区":["拉萨市","日喀则市","昌都市","林芝市","山南市","那曲市","阿里地区"],
            "陕西省":["西安市","铜川市","宝鸡市","咸阳市","渭南市","延安市","汉中市","榆林市","安康市","商洛市"],"甘肃省":["兰州市","嘉峪关市","金昌市","白银市","天水市","武威市","张掖市","平凉市","酒泉市","庆阳市","定西市","陇南市","临夏回族自治州","甘南藏族自治州"],"青海省":["西宁市","海东市","海北藏族自治州","黄南藏族自治州","海南藏族自治州","果洛藏族自治州","玉树藏族自治州","海西蒙古族藏族自治州"],"宁夏回族自治区":["银川市","石嘴山市","吴忠市","固原市","中卫市"],"新疆维吾尔自治区":["乌鲁木齐市","克拉玛依市","吐鲁番市","哈密市","昌吉回族自治州","博尔塔拉蒙古自治州","巴音郭楞蒙古自治州","阿克苏地区","克孜勒苏柯尔克孜自治州","喀什地区","和田地区","伊犁哈萨克自治州","塔城地区","阿勒泰地区","石河子市","阿拉尔市","图木舒克市","五家渠市","北屯市","铁门关市","双河市","可克达拉市","昆玉市","胡杨河市","新星市"],
            "香港特别行政区":["香港特别行政区"],"澳门特别行政区":["澳门特别行政区"],"台湾省":["台北市","新北市","桃园市","台中市","台南市","高雄市","基隆市","新竹市","嘉义市"]
          };
          const provinceNames = Object.keys(regions);
          let selectedProvince = provinceNames.find((province) => current.includes(province) || regions[province].some((city) => current.includes(city))) || "四川省";
          let selectedCity = regions[selectedProvince].find((city) => current.includes(city)) || regions[selectedProvince][0];
          const provinceHtml = () => provinceNames.map((province) => `<button class="lx-service-province${province === selectedProvince ? " is-current" : ""}" type="button" data-lx-service-province="${esc(province)}">${esc(province)}</button>`).join("");
          const cityHtml = () => regions[selectedProvince].map((city) => `<button class="lx-service-city${city === selectedCity ? " is-current" : ""}" type="button" data-lx-service-city="${esc(city)}">${esc(city)}</button>`).join("");
          openModal("选择所在地区", `<section class="lx-service-region-picker"><div class="lx-service-region-summary"><span>地区会影响服务商品的可购买与可预约范围</span><strong data-lx-service-region-summary>${esc(selectedProvince)} / ${esc(selectedCity)}</strong></div><div class="lx-service-region-columns"><aside class="lx-service-provinces"><span class="lx-service-region-section-title">省级地区</span><div class="lx-service-province-list" data-lx-service-province-list>${provinceHtml()}</div></aside><section class="lx-service-cities"><span class="lx-service-region-section-title">城市</span><div class="lx-service-city-grid" data-lx-service-city-list>${cityHtml()}</div></section></div><footer class="lx-service-region-actions"><button class="lx-service-region-action" type="button" data-modal-close>取消</button><button class="lx-service-region-action primary" type="button" data-lx-service-region-confirm>确定</button></footer></section>`);
          const mask = ensureModal();
          const modal = mask.querySelector(".lx-p0-modal");
          modal?.classList.add("lx-service-region-dialog");
          if (mask._lxServiceRegionHandler) mask.removeEventListener("click", mask._lxServiceRegionHandler, true);
          mask._lxServiceRegionHandler = (event) => {
            const provinceButton = event.target.closest("[data-lx-service-province]");
            if (provinceButton) {
              selectedProvince = provinceButton.dataset.lxServiceProvince;
              selectedCity = regions[selectedProvince][0];
              mask.querySelector("[data-lx-service-province-list]").innerHTML = provinceHtml();
              mask.querySelector("[data-lx-service-city-list]").innerHTML = cityHtml();
              mask.querySelector("[data-lx-service-region-summary]").textContent = `${selectedProvince} / ${selectedCity}`;
              return;
            }
            const cityButton = event.target.closest("[data-lx-service-city]");
            if (cityButton) {
              selectedCity = cityButton.dataset.lxServiceCity;
              mask.querySelector("[data-lx-service-city-list]").innerHTML = cityHtml();
              mask.querySelector("[data-lx-service-region-summary]").textContent = `${selectedProvince} / ${selectedCity}`;
              return;
            }
            if (!event.target.closest("[data-lx-service-region-confirm]")) return;
            const region = `${selectedProvince} ${selectedCity}`;
            try { localStorage.setItem(LX_SERVICE_INTAKE_REGION_KEY, region); } catch (_e) {}
            document.querySelectorAll("[data-lx-service-region-label]").forEach((node) => { node.textContent = region; });
            closeModal();
          };
          mask.addEventListener("click", mask._lxServiceRegionHandler, true);
          mask.querySelector(".lx-service-province.is-current")?.scrollIntoView({ block: "nearest" });
          mask.querySelector(".lx-service-city.is-current")?.focus();
        }

        function lxFillServiceOtherDevice() {
          const value = "我想为其他笔记本查询清灰服务，设备是";
          const fullscreen = document.body.classList.contains("assistant-fullscreen");
          const textarea = fullscreen ? document.querySelector("#lxfdTa") : document.querySelector(".composer textarea");
          if (!textarea) return;
          textarea.value = value;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
          textarea.setSelectionRange(value.length, value.length);
        }

        function lxSendSelectedServiceDevice() {
          const query = `我的设备是拯救者 Y7000P 2025，所在地区是${lxServiceIntakeRegion()}，请推荐可购买、可预约的清灰换硅脂服务商品`;
          if (document.body.classList.contains("assistant-fullscreen") && typeof window.lxfdSubmit === "function") window.lxfdSubmit(query);
          else sendChat(query);
        }

        function lxServiceRecommendationProducts() {
          return [
            { sku:"SERVICE-CLEAN-169", name:"笔记本深度清灰", price:169, image_url:"/assets/img/shop-1.jpg", description:"拆机深度清洁，包含风扇、主板、键盘与机身表面等部位。", promotion_tags:["清灰/清洁"], official:true, category:"服务产品" },
            { sku:"SERVICE-PASTE-299", name:"深度清灰 + 更换硅脂", price:299, image_url:"/assets/img/shop-2.jpg", description:"在深度清灰基础上更换散热硅脂，并完成清洁后开机检测。", promotion_tags:["清灰/换硅脂"], official:true, category:"服务产品" },
            { sku:"SERVICE-CARE-129", name:"整机清洁保养服务", price:129, image_url:"/assets/img/shop-8.jpg", description:"完成外观、键盘、接口和散热风道基础清洁，并提供设备健康检查。", promotion_tags:["日常保养"], official:true, category:"服务产品" }
          ];
        }
        window.__lxServiceRecommendationProducts = lxServiceRecommendationProducts;

        async function lxRunServiceProductRecommendation(text) {
          state.sending = true;
          const region = (String(text || "").match(/所在地区是(.+?)，请推荐/) || [])[1] || lxServiceIntakeRegion();
          const products = lxServiceRecommendationProducts();
          const ai = addMessage("ai loading", "", renderGenerating("正在匹配可购买、可预约的服务商品…"));
          try {
            const reply = `已按“拯救者游戏本 + **${region}** + **深度清灰/换硅脂**”匹配服务商品。你可以比较服务内容、适用性与预约方式。`;
            await lxAnimateAiFinal(ai, mdLite(reply));
            const body = lxEnsureAiBody(ai);
            body.insertAdjacentHTML("beforeend", renderProductsInMessage(products, { serviceProduct: true }));
            const recoId = lxLatestRecoIdInMessage(ai);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            lxRevealContent();
            const recoTab = lxCreateRecoTab(products, { label: "推荐服务产品", recoId });
            lxUpsertTab(recoTab);
            lxRunTab(recoTab);
            ensureChat().scrollTop = ensureChat().scrollHeight;
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        window.__lxServiceIntake = { renderChoices: lxServiceIntakeChoicesHtml, openRegion: lxOpenServiceRegionPicker, fillOtherDevice: lxFillServiceOtherDevice, sendSelectedDevice: lxSendSelectedServiceDevice };
        if (!window.__lxServiceIntakeClickInstalled) {
          window.__lxServiceIntakeClickInstalled = true;
          document.addEventListener("click", (event) => {
            if (event.target.closest("[data-lx-service-region-open]")) { event.preventDefault(); lxOpenServiceRegionPicker(); return; }
            if (event.target.closest("[data-lx-service-device-send]")) { event.preventDefault(); lxSendSelectedServiceDevice(); return; }
            if (event.target.closest("[data-lx-service-other-device]")) { event.preventDefault(); lxFillServiceOtherDevice(); }
          });
        }

        async function lxRunServiceIntakeAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的设备服务需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：清灰/换硅脂服务商品匹配");
            paint();
            await wait(520);
            skills.add("Skill(服务产品推荐)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(服务产品推荐)");
            paint();
            await wait(760);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(服务产品推荐) 已完成";
            paint();
            await lxAnimateAiFinal(ai, mdLite("已经明确是**清灰/换硅脂服务**。还需要确认**目标设备和所在地区**，才能匹配可购买、可预约的服务商品。"));
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            const actions = finalBody.querySelector(".message-actions");
            if (actions) actions.insertAdjacentHTML("beforebegin", lxServiceIntakeChoicesHtml());
            else finalBody.insertAdjacentHTML("beforeend", lxServiceIntakeChoicesHtml());
            ensureChat().scrollTop = ensureChat().scrollHeight;
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedStoreAppointmentAnswer(store) {
          const currentStore = store && typeof store === "object" ? store : {};
          const storeName = currentStore.name || "所选联想门店";
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在识别你的到店预约需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(360);
            skills.add("Skill(门店预约服务)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(门店预约服务)");
            paint();
            await wait(620);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(门店预约服务) 已调用";
            paint();
            const copy = `已为你准备前往 **${storeName}** 的到店预约，请在右侧确认或修改门店、到店时间与预约目的。\n\n- **门店：** ${storeName}\n- **营业时间：** ${currentStore.hours || "以门店实际营业时间为准"}\n- **联系电话：** ${currentStore.tel || "以门店公布信息为准"}`;
            body.innerHTML = renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }) + mdLite(copy) + renderStoreAppointmentCta(currentStore.id);
            ai.classList.remove("loading");
            ensureChat().scrollTop = ensureChat().scrollHeight;
            lxAutoOpenRecommendedModal("store-appointment", currentStore.id);
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedDevicesAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的设备资产需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：需要查询当前 Lenovo ID 下的设备资产");
            paint();
            await wait(520);
            skills.add("Skill(设备资产查询)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(设备资产查询)");
            paint();
            await wait(760);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(设备资产查询) 已完成";
            const copy = "当前账号共有**8 台已绑定设备**，另有**1 台待绑定**。最近使用的是 ThinkBook 16p、拯救者 Y7000P、YOGA Air 14s；右侧已打开设备列表。";
            await lxAnimateAiFinal(ai, `<div class="lx-edu-auth-copy">${mdLite(copy)}</div>`);
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            finalBody.insertAdjacentHTML("beforeend", renderPageCta({
              title: "查看我的设备",
              desc: "8 台已绑定 · 1 台待绑定",
              attr: 'data-lx-open-tab="info:devices" data-lxfd-open-feature="devices" aria-label="查看我的设备列表"'
            }));
            ai.classList.remove("loading");
            openMemberDevicesCenter();
            lxSyncAnswerCtaActiveState("info:devices");
            ensureChat().scrollTop = ensureChat().scrollHeight;
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunDeviceActionBridge(kind, device) {
          const current = device || {}, isBind = kind === "bind", bridgeKey = isBind ? "__lxPendingDeviceBindBridge" : "__lxPendingDeviceWarrantyBridge";
          const bridge = window[bridgeKey], name = current.name || (isBind ? "小新 Pro 16" : "拯救者 Y7000P"), skillName = isBind ? "设备资产绑定" : "保修商品推荐";
          state.sending = true;
          const lines = [isBind ? "联想乐享正在校验设备订单与当前 Lenovo ID" : "联想乐享正在核验设备保障状态与可购买节点"], skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines,{collapsed:false,foldable:false,skillCount:0})), body = lxEnsureAiBody(ai);
          const paint=()=>{body.innerHTML=renderSkillTrace(lines,{collapsed:false,foldable:false,skillCount:skills.size});}, wait=(ms)=>new Promise(r=>setTimeout(r,ms));
          try {
            await wait(420); lines.push(isBind?`已识别：${name} · 联想官方订单待绑定`:`已定位：${name} · ${current.warranty||"当前保障信息已读取"}`); paint();
            await wait(520); skills.add(`Skill(${skillName})`); lines.push(`联想乐享官方 SKILL：正在调用 Skill(${skillName})`); paint();
            await wait(760); lines[lines.length-1]=`联想乐享官方 SKILL：Skill(${skillName}) 已完成`;
            const copy=isBind?`绑定成功！**${name}** 已加入当前 Lenovo ID，设备信息与保障服务已同步，可在右侧“我的设备”列表中查看详情。`:`已根据 **${name}** 的型号、购买时间和当前保障节点，匹配到 3 款可购买保修商品，涵盖一年整机延保、两年整机延保及延保上门服务升级。建议结合使用年限、服务地区与预算选择，具体价格及适用范围以实时校验为准。`;
            await lxAnimateAiFinal(ai,mdLite(copy)); const finalBody=lxEnsureAiBody(ai); finalBody.insertAdjacentHTML("afterbegin",renderSkillTrace(lines,{collapsed:true,foldable:true,skillCount:skills.size}));
            if(!isBind) finalBody.insertAdjacentHTML("beforeend",renderPageCta({title:"查看推荐保修商品",desc:`3 款可购买方案 · 已关联${name}`,attr:"data-lx-warranty-result-card"}));
            ai.classList.remove("loading"); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
            if (isBind && typeof window.__lxCompleteDeviceBind === "function") window.__lxCompleteDeviceBind(current.id || "xiaoxinpro16");
            else if (!isBind) {
              window.__lxPendingWarrantyDeviceId = current.id || "legiony7000p";
              lxOpenMemberComponentTab("warranty-products", "保修商品推荐", "service", "tab");
            } else window.postMessage({type:"lexiang:device-bind-success",deviceId:current.id||"xiaoxinpro16"},location.origin);
          } finally { window[bridgeKey]=null; state.sending=false; try{window.__lxSaveConversationNow();}catch(_e){} }
        }

        async function lxRunUnifiedMemberAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const profile = lxMemberQueryProfile();
          const memberCard = renderPageCta({
            title: "查看会员中心",
            desc: profile.cardDesc,
            attr: 'data-lx-open-tab="info:member" data-lxfd-open-feature="member" aria-label="查看会员中心页面"'
          });
          try {
            const answerNode = addMessage("assistant", profile.copy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, memberCard);
            const cardNode = answerNode?.querySelector('[data-lx-result-id="info:member"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openMemberCenter();
            lxSyncAnswerCtaActiveState("info:member");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedCouponAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const couponCopy = "已为你查询当前账户的**优惠券资产**：共有 3 张可用券，其中 1 张将在 7 天后到期。你可以查看每张券的使用门槛、适用范围和有效期。";
          const couponCard = renderPageCta({
            title: "查看优惠券详情",
            desc: "3 张可用 · 1 张即将到期",
            attr: 'data-lx-open-tab="info:coupon" data-lxfd-open-feature="coupon" aria-label="查看优惠券详情页面"'
          });
          try {
            const answerNode = addMessage("assistant", couponCopy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, couponCard);
            const cardNode = answerNode?.querySelector('[data-lx-result-id="info:coupon"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openCouponCenter();
            lxSyncAnswerCtaActiveState("info:coupon");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedPointsAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const pointsCopy = "已为你查询当前账户的**乐豆资产**：现有 2,580 乐豆，近 30 天获得 860、使用 300。你可以继续查看获取与使用记录，以及当前适用规则。";
          const pointsCard = renderPageCta({
            title: "查看乐豆详情",
            desc: "可用 2,580 · 近 30 天 +860 / -300",
            attr: 'data-lx-open-tab="info:points" data-lxfd-open-feature="points" aria-label="查看乐豆详情页面"'
          });
          try {
            const answerNode = addMessage("assistant", pointsCopy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, pointsCard);
            const cardNode = answerNode?.querySelector('[data-lx-result-id="info:points"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openPointsCenter();
            lxSyncAnswerCtaActiveState("info:points");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedVoucherAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const voucherCopy = "已为你查询当前账户的**代金券资产**：共有 2 张可用券，分别适用于教育认证与以旧换新场景。你可以继续查看券面金额、适用范围和使用条件。";
          const voucherCard = renderPageCta({
            title: "查看代金券详情",
            desc: "2 张可用 · 教育认证 / 以旧换新",
            attr: 'data-lx-open-tab="info:vouchers" data-lxfd-open-feature="vouchers" aria-label="查看代金券详情页面"'
          });
          try {
            const answerNode = addMessage("assistant", voucherCopy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, voucherCard);
            const cardNode = answerNode?.querySelector('[data-lx-result-id="info:vouchers"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openVoucherCenter();
            lxSyncAnswerCtaActiveState("info:vouchers");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function lxRunUnifiedRedPacketAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const redPacketCopy = "已为你查询当前账户的**限时红包资产**：现有 2 个红包，合计 ¥84，其中 1 个将在明日到期。你可以继续查看适用活动、有效期与使用范围。";
          const redPacketCard = renderPageCta({
            title: "查看限时红包详情",
            desc: "2 个可用 · 合计 ¥84 · 1 个明日到期",
            attr: 'data-lx-open-tab="info:redpacket" data-lxfd-open-feature="redpacket" aria-label="查看限时红包详情页面"'
          });
          try {
            const answerNode = addMessage("assistant", redPacketCopy);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, redPacketCard);
            const cardNode = answerNode?.querySelector('[data-lx-result-id="info:redpacket"]');
            cardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!cardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              cardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            openRedPacketCenter();
            lxSyncAnswerCtaActiveState("info:redpacket");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        function lxEducationAuthKind(text) {
          const value = String(text || "").trim();
          if (!value || value.length > 36) return "";
          const hasEducationIdentity = /教育|学生|在校生|教师|高考生/.test(value);
          const hasAuthIntent = /认证|认定|核验|教育认$/.test(value);
          if (!hasEducationIdentity || !hasAuthIntent) return "";
          if (/高考生/.test(value)) return "gaokao";
          if (/教师/.test(value)) return "teacher";
          return "college";
        }

        function lxEducationAuthRecommendationCard(kind) {
          const label = kind === "gaokao" ? "高考生教育认证" : (kind === "teacher" ? "教师教育认证" : "教育认证");
          return `<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco" type="button" data-lx-recommended-modal="education-auth" data-lx-recommended-modal-payload="${esc(kind)}" data-open-stuauth="${esc(kind)}" data-lx-result-id="modal:education-auth:${esc(kind)}" aria-label="打开${esc(label)}弹窗" aria-pressed="false"><span class="answer-cta-title">${esc(label)}</span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`;
        }

        async function lxRunUnifiedEducationAuthAnswer(kind = "college") {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的教育认证需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：需要进入教育身份认证流程");
            paint();
            await wait(520);
            skills.add("Skill(教育身份认证)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(教育身份认证)");
            paint();
            await wait(760);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(教育身份认证) 已完成";
            paint();
            const copy = "**教育认证**可用于核验在校生、教师或高考生身份，并解锁教育专享价格与会员权益。请按真实身份选择认证方式并填写资料，提交前核对**适用范围、有效期和材料**，结果以正式核验信息为准。";
            ai._raw = copy;
            await lxAnimateAiFinal(ai, mdLite(copy));
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            lxAppendAiHtml(ai, lxEducationAuthRecommendationCard(kind));
            const card = ai.querySelector(".lx-edu-auth-reco");
            card?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              card.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxAutoOpenRecommendedModal("education-auth", kind);
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        function lxIsWorkplaceAuthQuery(text) {
          const value = String(text || "").trim();
          if (!value || value.length > 36) return false;
          return /职场|职场人|在职|工作|员工|企业职工/.test(value) && /认证|认定|核验|职场认$/.test(value);
        }

        function lxWorkplaceAuthRecommendationCard() {
          return `<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-workplace-auth-reco" type="button" data-lx-recommended-modal="workplace-auth" data-open-wpa data-lx-result-id="modal:workplace-auth" aria-label="打开职场身份认证弹窗" aria-pressed="false"><span class="answer-cta-title">职场认证</span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`;
        }

        async function lxRunUnifiedWorkplaceAuthAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的职场认证需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：需要进入企业在职身份认证流程");
            paint();
            await wait(520);
            skills.add("Skill(职场身份认证)");
            lines.push("联想乐享官方 SKILL：正在调用 Skill(职场身份认证)");
            paint();
            await wait(760);
            lines[lines.length - 1] = "联想乐享官方 SKILL：Skill(职场身份认证) 已完成";
            paint();
            const copy = "**职场认证**可用于核验企业在职身份，并解锁员工购机优惠、会员权益及相关服务。请按真实情况填写个人与企业资料，提交前核对**企业信息与在职材料**，认证结果以正式身份核验信息为准。";
            ai._raw = copy;
            await lxAnimateAiFinal(ai, `<div class="lx-edu-auth-copy lx-workplace-auth-copy">${mdLite(copy)}</div>`);
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            lxAppendAiHtml(ai, lxWorkplaceAuthRecommendationCard());
            const card = ai.querySelector(".lx-workplace-auth-reco");
            card?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              card.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxAutoOpenRecommendedModal("workplace-auth");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        function lxIsEnterpriseMemberAuthQuery(text) {
          const value = String(text || "").trim();
          if (!value || value.length > 48) return false;
          const hasEnterpriseIdentity = /企业会员|企业身份|企业账户|企业采购负责人|企业认证/.test(value);
          const hasAuthIntent = /认证|申请|开通|办理|核验|加入/.test(value);
          return hasEnterpriseIdentity && hasAuthIntent;
        }

        function lxIsEnterpriseDiamondMemberAuthQuery(text) {
          const value = String(text || "").trim();
          if (!value || value.length > 56) return false;
          return /企业钻石会员|钻石企业会员|企业会员.{0,6}钻石/.test(value)
            && /认证|升级|申请|开通|办理|核验|加入/.test(value);
        }

        function lxIsEnterpriseLeadQuery(text) {
          const value = String(text || "").trim();
          if (!value || value.length > 48) return false;
          const directLead = /^(?:我要|我想|帮我|现在)?(?:进行|提交|填写|办理|发起)?(?:企业|采购|项目)?留资(?:申请|信息|表单)?$/.test(value);
          const enterpriseIntent = /企业留资|企业咨询|采购留资|项目留资|提交(?:企业|采购|项目)需求|联系企业顾问|企业合作咨询/.test(value);
          return directLead || enterpriseIntent;
        }

        function lxEnterpriseLeadRecommendationCard() {
          return `<button class="answer-cta lx-answer-page lx-auth-answer-card lx-enterprise-lead-reco" type="button" data-lx-recommended-modal="enterprise-lead" data-open-enterprise-lead data-lx-result-id="modal:enterprise-lead" aria-label="打开企业留资弹窗" aria-pressed="false"><span class="answer-cta-title">提交企业留资</span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`;
        }

        async function lxRunUnifiedEnterpriseLeadAnswer() {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = ["联想乐享正在判断你的企业留资需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push("已判断：需要进入企业采购需求留资流程");
            paint();
            await wait(520);
            const skillName = "Skill(企业采购需求留资)";
            skills.add(skillName);
            lines.push(`联想乐享官方 SKILL：正在调用 ${skillName}`);
            paint();
            await wait(760);
            lines[lines.length - 1] = `联想乐享官方 SKILL：${skillName} 已完成`;
            paint();
            const copy = "提交**企业采购需求**后，联想企业顾问可结合采购规模、预算、应用场景与交付周期提供进一步支持。请准备**联系人、联系方式及需求说明**，提交前核对关键信息，后续沟通以企业顾问联系为准。";
            ai._raw = copy;
            await lxAnimateAiFinal(ai, `<div class="lx-enterprise-lead-copy">${mdLite(copy)}</div>`);
            lxEnsureAiBody(ai).insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            lxAppendAiHtml(ai, lxEnterpriseLeadRecommendationCard());
            const card = ai.querySelector(".lx-enterprise-lead-reco");
            card?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { requestAnimationFrame(() => requestAnimationFrame(resolve)); return; }
              const done = () => resolve();
              card.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxAutoOpenRecommendedModal("enterprise-lead");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        function lxEnterpriseMemberAuthRecommendationCard(isDiamond = false) {
          const label = isDiamond ? "认证企业钻石会员" : "立即认证企业会员";
          return `<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-enterprise-auth-reco" type="button" data-lx-recommended-modal="enterprise-member-auth" data-open-enterprise-auth-modal data-lx-result-id="modal:enterprise-member-auth" aria-label="打开企业会员认证弹窗" aria-pressed="false"><span><span class="answer-cta-title">${label}</span></span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`;
        }

        async function lxRunUnifiedEnterpriseMemberAuthAnswer(isDiamond = false) {
          state.sending = true;
          clearHoverPromptTimer();
          hideHoverPrompts();
          const lines = [isDiamond ? "联想乐享正在判断你的企业钻石会员升级需求" : "联想乐享正在判断你的企业会员认证需求"];
          const skills = new Set();
          const ai = addMessage("ai loading", "", renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: 0 }));
          const body = lxEnsureAiBody(ai);
          const paint = () => { body.innerHTML = renderSkillTrace(lines, { collapsed: false, foldable: false, skillCount: skills.size }); };
          const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
          try {
            await wait(420);
            lines.push(isDiamond ? "已判断：需要进入企业钻石会员升级认证流程" : "已判断：需要进入企业采购负责人认证流程");
            paint();
            await wait(520);
            const skillName = isDiamond ? "Skill(企业钻石会员升级认证)" : "Skill(企业会员身份认证)";
            skills.add(skillName);
            lines.push(`联想乐享官方 SKILL：正在调用 ${skillName}`);
            paint();
            await wait(760);
            lines[lines.length - 1] = `联想乐享官方 SKILL：${skillName} 已完成`;
            paint();
            const copy = isDiamond
              ? "完成**企业钻石会员升级认证**后，可进一步解锁企业专享采购权益、专属服务与会员支持。请准备**企业名称、统一社会信用代码及企业邮箱**，提交后以正式核验结果为准。"
              : "完成**企业会员认证**后，可解锁企业专享价、采购补贴、对公付款及专票账期等权益。请准备企业名称与采购负责人信息，提交后以正式核验结果为准。";
            ai._raw = copy;
            await lxAnimateAiFinal(ai, `<div class="lx-edu-auth-copy lx-enterprise-auth-copy">${mdLite(copy)}</div>`);
            const finalBody = lxEnsureAiBody(ai);
            finalBody.insertAdjacentHTML("afterbegin", renderSkillTrace(lines, { collapsed: true, foldable: true, skillCount: skills.size }));
            lxAppendAiHtml(ai, lxEnterpriseMemberAuthRecommendationCard(isDiamond));
            const card = ai.querySelector(".lx-enterprise-auth-reco");
            card?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              card.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            // 推荐卡完成入场后自动打开；首页与所有频道统一遵循相同首轮弹窗规则。
            lxAutoOpenRecommendedModal("enterprise-member-auth");
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        async function sendChat(message) {
          const text = (message || $(".composer textarea")?.value || "").trim();
          if (!text || state.sending) return;
          if (!lxRequireQueryAccess()) return;
          try { localStorage.removeItem("lexiang.newChatEmpty.v1"); } catch (_e) {}
          // 所有分屏发送入口（输入框、快捷问题、追问按钮、智能体代发）最终都进入 sendChat。
          // 标题必须在这里统一更新，否则只监听 form submit 会漏掉快捷问题。
          if (typeof window.__lxSetConversationQuery === "function") window.__lxSetConversationQuery(text);
          const nonce = state.conversationNonce;
          let _turnProdCount = 0; // 本轮官方返回的商品数（答后动作预判用）
          let _turnProducts = []; // 本轮官方返回的商品对象数组（代买 pending 时 done 回调要用它接管自研执行）
          const textarea = $(".composer textarea");
          if (textarea) textarea.value = "";
          lxHideSuggest();
          state.lastUserText = text;
          lxClearFollowups();
          addMessage("user", text);
          // 设备绑定/维保是单一设备 Skill：在代买意图前截获，彻底停用旧多步任务调用面板。
          if (/^一键绑定(?:小新\s*Pro\s*16)?[。！!]?$/.test(text)) {
            await lxRunDeviceActionBridge("bind", window.__lxPendingDeviceBindBridge?.device);
            return;
          }
          if (/^为.+推荐可购买的(?:保修|延保)商品[。！!]?$/.test(text)) {
            await lxRunDeviceActionBridge("warranty", window.__lxPendingDeviceWarrantyBridge?.device);
            return;
          }
          // 多步任务链代买意图（收口 app-intent.matchAutoBuy，主面板/全屏共用一份 = 一套机制）
          // 推荐环节改走官方推荐流（走下面正常的 /api/leai/stream，商品由 products/display 事件带回），
          // 不再本地拉商品库；这里只标记 pending，SSE done 时自研接管「对比→选款→下单」。
          const _isServiceProductFollowup = /^我的设备是.+所在地区是.+请推荐可购买、可预约的清灰换硅脂服务商品$/.test(text);
          if (_isServiceProductFollowup) {
            await lxRunServiceProductRecommendation(text);
            return;
          }
          const _autoBuy = !_isServiceProductFollowup && window.__lxIntent && window.__lxIntent.matchAutoBuy ? window.__lxIntent.matchAutoBuy(text) : null;
          if (_autoBuy) {
            // 代买链前置（件2）：不再等官方答案气泡"完事"才起链——这里就同步起跑 auto_buy_official
            // （runChain 首段同步 addAiMessage 先插卡，DOM 序 = 用户气泡→链卡→官方回答气泡）。
            // 官方推荐结果走 promise 交给链 step1：done 回调 resolve，出错/50s 超时 reject，
            // 链自己按预算落地或走本地货盘 fallback，绝不会因为这里提前 return 而卡死等不到结果。
            let _resolveOfficial, _rejectOfficial;
            const _officialWait = new Promise((resolve, reject) => { _resolveOfficial = resolve; _rejectOfficial = reject; });
            // 75s：官方 session 失效时是 假done(~10s)+火山兜底流(30-45s) 两段,50s 会在兜底跑一半时误判超时
            const _officialTimeoutId = setTimeout(() => { try { _rejectOfficial(new Error("官方 SKILL 响应超时")); } catch (_e) {} }, 75000);
            state._autoBuyPending = {
              maxPrice: _autoBuy.params.maxPrice || 0,
              promise: _officialWait, resolve: _resolveOfficial, reject: _rejectOfficial, timeoutId: _officialTimeoutId,
            };
            if (window.__lxRunChain) {
              window.__lxRunChain("auto_buy_official", { maxPrice: _autoBuy.params.maxPrice || 0, minPrice: _autoBuy.params.minPrice || 0, officialWait: _officialWait, rawText: text });
            }
          }
          // 引用商品/方案只作为本轮请求上下文传递，不在用户消息旁额外展示“引用：……”文案。
          // 引用 ≥2 个商品 + 对比意图 → 直接用引用的这几款出结构化对比表（不依赖官方返回商品）
          const _cmpRefs = (Array.isArray(state.refProducts) ? state.refProducts : []).slice(0, 8);
          const _hasCompareIntent = /对比|比较|哪个好|哪个更|哪个值|怎么选(?!购)|差别|区别|谁更好|选哪/.test(text);
          const _isSolutionComparison = _cmpRefs.length >= 2 && _cmpRefs.every((item) => item.type === "solution") && _hasCompareIntent;
          if (!_isSolutionComparison && _cmpRefs.length >= 2 && _cmpRefs.every((item) => item.type !== "solution") && _hasCompareIntent) {
            lxRevealContent();
            lxUpsertCompareTab(_cmpRefs, "商品对比");
          }
          // 清引用前先快照：下面的意图路由要 await 后端几百毫秒~4.5s，100ms 定时器会先把
          // 引用清掉，等构造 builtMsg 时引用已空 → 官方收到裸文本反问"这款是指哪款"
          const _refsSnap = Array.isArray(state.refProducts) ? state.refProducts.slice() : [];
          const _refSnap = state.refProduct;
          const _refMsgSnap = state.refMsg;
          setTimeout(() => lxSetRef(null), 100);
          const _educationAuthKind = lxEducationAuthKind(text);
          const _workplaceAuthRequested = lxIsWorkplaceAuthQuery(text);
          const _enterpriseDiamondAuthRequested = lxIsEnterpriseDiamondMemberAuthQuery(text);
          const _enterpriseMemberAuthRequested = lxIsEnterpriseMemberAuthQuery(text);
          const _enterpriseLeadRequested = lxIsEnterpriseLeadQuery(text);
          const _discountOrderRequested = /(?:领取|使用).{0,8}(?:全部|所有|可用)?.{0,8}优惠|(?:全部|所有|可用).{0,8}优惠.{0,8}(?:下单|订单)|待支付订单/.test(text) && /购买|下单|订单|支付/.test(text);
          state.queryHistory.push(text);
          (state.queryAnchors = state.queryAnchors || []).push(($(".lx-p0-messages")?.children.length || 1) - 1);
          renderQueryHistory();
          if (_discountOrderRequested) {
            await lxRunUnifiedDiscountOrderAnswer(state._pendingDiscountOrderProduct || state.currentProduct);
            return;
          }
          if (_educationAuthKind) {
            await lxRunUnifiedEducationAuthAnswer(_educationAuthKind);
            return;
          }
          if (_workplaceAuthRequested) {
            await lxRunUnifiedWorkplaceAuthAnswer();
            return;
          }
          if (_enterpriseLeadRequested) {
            await lxRunUnifiedEnterpriseLeadAnswer();
            return;
          }
          if (_enterpriseDiamondAuthRequested) {
            await lxRunUnifiedEnterpriseMemberAuthAnswer(true);
            return;
          }
          if (_enterpriseMemberAuthRequested) {
            await lxRunUnifiedEnterpriseMemberAuthAnswer();
            return;
          }
          const _storeAppointment = window.__lxPendingStoreAppointment;
          if (_storeAppointment && /预约|到店/.test(text)) {
            window.__lxPendingStoreAppointment = null;
            await lxRunUnifiedStoreAppointmentAnswer(_storeAppointment);
            return;
          }
          if (lxIsNearbyStoreQuery(text)) {
            await lxRunUnifiedStoreAnswer();
            return;
          }
          if (lxIsServiceIntakeQuery(text)) {
            await lxRunServiceIntakeAnswer();
            return;
          }
          if (/^我的设备[。！!]?$/.test(text)) {
            await lxRunUnifiedDevicesAnswer();
            return;
          }
          if (/^一键绑定(?:小新\s*Pro\s*16)?[。！!]?$/.test(text)) { await lxRunDeviceActionBridge("bind",window.__lxPendingDeviceBindBridge?.device); return; }
          if (/^为.+推荐可购买的(?:保修|延保)商品[。！!]?$/.test(text)) { await lxRunDeviceActionBridge("warranty",window.__lxPendingDeviceWarrantyBridge?.device); return; }
          if (/代金券/.test(text)) {
            await lxRunUnifiedVoucherAnswer();
            return;
          }
          if (/限时红包|会员日红包|首发红包/.test(text)) {
            await lxRunUnifiedRedPacketAnswer();
            return;
          }
          if (/优惠券/.test(text)) {
            await lxRunUnifiedCouponAnswer();
            return;
          }
          if (/乐豆|积分余额|乐豆余额/.test(text)) {
            await lxRunUnifiedPointsAnswer();
            return;
          }
          if (/会员/.test(text)) {
            await lxRunUnifiedMemberAnswer();
            return;
          }
          if (_isSolutionComparison) {
            const compareMeta = lxSolutionCompareMeta(_cmpRefs);
            const names = _cmpRefs.map((item) => `「${item.name}」`).join("、");
            const focuses = _cmpRefs.map((item) => `${item.name}侧重${item.scenario || item.sector || "对应行业核心场景"}`).join("；");
            const compareCard = renderPageCta({
              title: compareMeta.cardTitle,
              desc: `已为你横向对比 ${_cmpRefs.length} 个解决方案`,
              attr: `data-lx-open-tab="${compareMeta.id}" aria-label="查看${compareMeta.label}页面"`
            });
            const comparisonAnswer =
              `已为你完成${names}的**多方案横向对比**，对比结论将在正文完成后同步到右侧页面。\n\n` +
              `三项方案的**核心差异与适用对象**分别为：${focuses}。\n\n` +
              `右侧将按所属行业、核心场景、方案能力、落地重点和选择建议进行整理。建议优先依据**业务场景与交付目标**选择，而不是按商品配置或价格判断。`;
            // 左右框架严格串行：正文逐字完成 → 结果卡出现 → 右侧方案对比页出现。
            const answerNode = addMessage("assistant", comparisonAnswer);
            if (answerNode?._typingDone) await answerNode._typingDone;
            lxAppendAiHtml(answerNode, compareCard);
            const compareCardNode = answerNode?.querySelector(`[data-lx-open-tab="${CSS.escape(compareMeta.id)}"]`);
            compareCardNode?.classList.add("lx-document-card-enter");
            await new Promise((resolve) => {
              if (!compareCardNode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
                return;
              }
              const done = () => resolve();
              compareCardNode.addEventListener("animationend", done, { once: true });
              window.setTimeout(done, 700);
            });
            lxRevealContent();
            lxOpenSolutionCompareTab(_cmpRefs, compareMeta);
            return;
          }
          if (lxHandleEntPointsQuery(text)) return;
      if (/^教育特惠$|^教育特惠专区$|^国补教育特惠$/.test(text)) {
        lxAddInstantAi(
          "好的，已为你打开教育特惠专区。",
          renderPageCta({
            title: "教育优惠",
            desc: "已经为您打开教育特惠专区",
            attr: 'data-lx-open-tab="info:edu" aria-label="查看教育特惠专区"',
          })
        );
        window.setTimeout(() => { lxRevealContent(); openEduZone(); }, 260);
        return;
      }
          // 认证：点名了具体身份直接开对应表单，不再让用户二选身份（真机反馈"我打了职场认证就别再问了"）
          if (/^(职场认证|职场人认证)$/.test(text)) { lxAddInstantAi("好的，已为你打开职场身份认证。"); window.setTimeout(() => openWorkplaceAuth(), 260); return; }
          if (/^(学生认证|在校生认证)$/.test(text)) { lxAddInstantAi("好的，已为你打开在校生教育认证。"); window.setTimeout(() => openStudentAuth("college"), 260); return; }
          if (/^(高考生认证)$/.test(text)) { lxAddInstantAi("好的，已为你打开高考生教育认证。"); window.setTimeout(() => openStudentAuth("gaokao"), 260); return; }
          // 泛认证词才弹身份选择卡（官方 SKILL 通道 8s+ 起步，演示/真实体验都等不起）；
          // 三个按钮同样式（曾一红两白被当成"推荐在校生"，真机反馈），职场放最后不夹中间
          if (/^(认证|我要认证|身份认证|办认证|做认证|教育认证)$/.test(text)) {
            lxAddInstantAi("好的，选择你的身份，我直接带你进对应的认证流程（学生 / 高考生认证通过后可享教育专享价，还能叠加国补）：",
              '<div class="lx-p0-actions">' +
              '<button class="lx-p0-btn" type="button" data-open-stuauth="college">🎓 在校生认证</button>' +
              '<button class="lx-p0-btn" type="button" data-open-stuauth="gaokao">📝 高考生认证</button>' +
              '<button class="lx-p0-btn" type="button" data-open-wpa>💼 职场人认证</button>' +
              '</div>');
            return;
          }
          // 认证引导浮层拼出的句子 / 常见问法：直接秒开对应表单，不送官方慢通道
          if (/怎么完成学生教育认证|我是在校学生.{0,10}认证/.test(text)) { lxAddInstantAi("好的，已为你打开在校生教育认证。"); window.setTimeout(() => openStudentAuth("college"), 260); return; }
          if (/怎么完成职场认证|我是职场人.{0,10}认证/.test(text)) { lxAddInstantAi("好的，已为你打开职场身份认证。"); window.setTimeout(() => openWorkplaceAuth(), 260); return; }
          if (/怎么完成高考生教育认证|我是高考生.{0,10}认证/.test(text)) { lxAddInstantAi("好的，已为你打开高考生教育认证。"); window.setTimeout(() => openStudentAuth("gaokao"), 260); return; }
          // 人工：秒进人工客服模式（官方转人工 Skill 实测 12-18s 才回；本地直切人设+专属菜单，lxSetHumanMode 自带接入卡）
          if (/^(人工|转人工|人工客服|找人工|真人客服|转接人工|人工服务)$/.test(text)) {
            lxSetHumanMode(true);
            return;
          }
          if (/^项目合作$|^合作项目$|^提交项目需求$|^我要项目合作$/.test(text)) {
            lxAddInstantAi("好的，已为你生成项目合作解决方案列表。右侧会展示可合作的行业方案，选择合适方案后点击「我要合作」填写信息。");
            window.setTimeout(() => { lxRevealContent(); openProjectCooperationList(); }, 260);
            return;
          }
          const _projectLeadMatch = text.match(/^我要合作(.{2,40})$/);
          if (_projectLeadMatch) {
            const projectName = _projectLeadMatch[1].trim();
            lxAddInstantAi(`好的，已为你锁定「${projectName}」合作意向。正在校验项目类型、生成留资单并准备对接顾问，请在弹窗中补充联系信息。`);
            window.setTimeout(() => openLeadPanel(`project:${projectName}`), 520);
            return;
          }
          // ── 本地快路径：高频明确操作指令 0 延迟秒回，不调后端（正则统一收口 app-intent.js，主面板/全屏共用一份）──
          // 代买 pending 时跳过：避免"选/下单"字样被误判成 buy_current/buy_recommended 抢断，官方推荐流程要走完
          const _localCtrl = !_autoBuy && window.__lxIntent ? window.__lxIntent.matchControl(text) : null;
          if (_localCtrl) {
            if (_localCtrl.op === "open_solution") {
              await lxRunUnifiedSolutionAnswer();
              return;
            }
            if (_localCtrl.op === "open_coupon") {
              await lxRunUnifiedCouponAnswer();
              return;
            }
            lxExecControl(_localCtrl.op, _localCtrl.target || "");
            if (_localCtrl.op !== "buy_current" && _localCtrl.op !== "buy_recommended" && _localCtrl.op !== "buy_nth") lxAddInstantAi(_localCtrl.msg);
            // state.sending 此时仍为 false（还没设置），直接 return 即可
            return;
          }
          // ── 本地快路径结束 ───────────────────────────────────────────────
          // 思考过程时间线（PRD：把"联想乐享正在判断/正在调用 XX SKILL"展示出来）：固定首行 +
          // 本地意图判断结果一行，随后 status 事件逐行追加，首个 chunk 到达时折叠成一行摘要条。
          const _traceLines = ["联想乐享正在判断"]; // 省略号由 .current::after 三点循环动画补，文本不写死
          const ai = addMessage("ai loading", "", renderSkillTrace(_traceLines, { collapsed: false, foldable: false, skillCount: 0 }));
          ai._raw = "";
          ai._pendingExtras = "";
          ai._afterAnswer = [];
          ai._traceLines = _traceLines;
          ai._traceSkills = new Set();
          ai._traceCollapsed = false;
          ai._traceLastRaw = "";
          // "已判断"一行不和首行同帧蹦出：走远程意图路由的等路由落定（天然 0.5~4.5s 节奏），
          // 跳过路由的分支给 500ms 微延迟。幂等，status/chunk 到达时兜底先补，保证顺序。
          const _pushJudgedLine = () => {
            if (ai._judgedPushed) return;
            ai._judgedPushed = true;
            _traceLines.push(_autoBuy ? "已判断：多步代买任务，已拆解执行步骤" : "已判断：商品咨询 → 调用联想乐享官方 SKILL");
            lxRenderTraceLive(ai);
          };
          state.sending = true;
          state._fallbackFired = false;
          try {
            // ── 远程意图路由（非多模态、无媒体附件时先问后端意图，3秒超时降级）──
            // 代买 pending 时跳过：远程意图分类器可能把"选/下单"误判成 control 操作，抢断官方推荐流
            const _ranIntent = !_autoBuy && !state.pendingImageUrl && !state.pendingAudioUrl && !window.__lxWebSearch;
            if (_ranIntent) {
              let _intentResult = null;
              try {
                const _intentAbort = new AbortController();
                const _intentTimer = setTimeout(() => _intentAbort.abort(), 4500);
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
                if (_intentResult.op === "open_solution") {
                  await lxRunUnifiedSolutionAnswer();
                  return;
                }
                if (_intentResult.op === "open_coupon") {
                  await lxRunUnifiedCouponAnswer();
                  return;
                }
                const _opNames = { close_all_tabs: "关闭了所有页面标签", close_other_tabs: "关闭了其他标签，只留当前", go_home: "回到了首页", open_cart: "打开了购物车", open_orders: "打开了订单页面", open_member: "打开了会员中心", open_coupon: "打开了优惠券中心", open_stores: "打开了门店查询", open_edu_zone: "打开了教育专区", open_product: `正在帮你打开「${_intentResult.target || "该商品"}」`, enter_fullscreen: "切换到全屏对话模式", exit_fullscreen: "退出了全屏模式", buy_current: "正在为你下单当前商品", buy_recommended: "正在为你下单乐享推荐商品", buy_nth: "正在为你处理所选商品", compare_nth: `正在为你对比第 ${String(_intentResult.target || "").split(",").join("、")} 个商品` };
                // 下单类操作不加这条提示气泡（lxExecControl 里 lxBuyWithIntro 自带分步进度卡，避免重复）
                if (_intentResult.op !== "buy_current" && _intentResult.op !== "buy_recommended" && _intentResult.op !== "buy_nth") {
                  lxAddInstantAi(`好的，已为你${_opNames[_intentResult.op] || "执行了操作"}。`);
                }
                lxExecControl(_intentResult.op, _intentResult.target || "");
                state.sending = false;
                return;
              }
            }
            // ── 远程意图路由结束 ─────────────────────────────────────────────
            if (_ranIntent) _pushJudgedLine(); else setTimeout(_pushJudgedLine, 500);
            // 多模态路由：有图/语音或开联网搜索时走火山 /api/chat/stream，否则走官方 /api/leai/stream
            const hasMedia = !!(state.pendingImageUrl || state.pendingAudioUrl);
            // 引用了本地演示订单时强制走火山：官方对演示订单一无所知，只会回「需要登录」（真机反馈）；
            // 火山带着引用里的订单号/状态/金额上下文能正面回答物流、发票、退换货
            const useHuoshan = hasMedia || !!window.__lxWebSearch || /^订单\s/.test(_refMsgSnap || "");
            const _onlySolutionRefs = _refsSnap.length > 0 && _refsSnap.every((item) => item.type === "solution");
            const _refProductsPrefix = _refsSnap.length
              ? (_onlySolutionRefs
                ? `[用户正在咨询这些行业解决方案，请只围绕方案能力、适用场景、落地方式、服务范围和方案差异回答，不要推荐商品、比较商品参数或引导购买: ${_refsSnap.map(p => `${p.name}${p.scenario ? `（${p.scenario}）` : ""}`).join("、")}]\n\n`
                : `[用户正在咨询这些商品: ${_refsSnap.map(p => `${p.name}${p.sku ? ` (SKU:${p.sku})` : ""}`).join("、")}]\n\n`)
              : (_refSnap ? `[用户正在咨询商品: ${_refSnap.name}${_refSnap.sku ? ` (SKU:${_refSnap.sku})` : ""}]\n\n` : "");
            // 代买链：发给官方的句子剥掉成交短语（「直接购买/下单吧」会触发官方下单 Skill，只回
            // 「已为您生成订单」不给商品清单，链拿不到候选被迫翻本地货盘）。官方只负责推荐，
            // 下单由链自己执行；界面上用户气泡仍显示原句（addMessage 早已发生）
            const _askText = state._autoBuyPending && window.__lxIntent && window.__lxIntent.stripPurchasePhrase
              ? window.__lxIntent.stripPurchasePhrase(text)
              : text;
            const builtMsg = _refProductsPrefix + (_refMsgSnap ? `[用户引用了此前对话内容作为上下文: ${_refMsgSnap}]\n\n` : "") + (state.humanMode ? `[系统提示: 请以"专属客服小联"身份回复, 像人工客服一样亲切自然简短直接, 不用 markdown/列表/标题, 不暴露 AI 身份, 严禁输出"QA对""知识库""参考资料"等内部字样或📎等标记。]\n\n用户问: ${_askText}` : _askText);
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
              ai.className = "lx-p0-message msg ai lx-chat-skin";
              hasContent = true;
            };
            const ensureAiTextBox = () => {
              revealAi();
              if (!ai._textBox || !ai.contains(ai._textBox)) {
                ai._textBox = lxEnsureAiBody(ai);
                ai._textBox.className = "lx-msg-text";
                ai._raw = "";
              }
              return ai._textBox;
            };
            const deferRightPanel = (fn, cta) => {
              if (cta && !ai._rightPanelCtaAdded) {
                ai._rightPanelCtaAdded = true;
                lxAppendAiHtml(ai, renderPageCta(cta));
              }
              lxAfterAiAnswer(ai, () => lxRunWithRevealMotion(fn));
            };
            const handlers = {
              chunk: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const content = payload.text || data || "";
                if (/^\s*params\s*error\.?\s*$/i.test(content)) return;
                if (!content) return;
                // 首个 chunk 到达：思考过程时间线收起成一行摘要条，把舞台让给正文
                if (!ai._traceCollapsed) { _pushJudgedLine(); ai._traceCollapsed = true; lxRenderTraceLive(ai); }
                revealAi();
                ai._raw += content;
              },
              status: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.conv_id || payload.convId) state.convId = payload.conv_id || payload.convId;
                if (payload.text) {
                  const raw = String(payload.text);
                  if (raw !== ai._traceLastRaw) { // 去重相邻重复（官方 status 流常见连续重复 ping）
                    _pushJudgedLine(); // 兜底：保证"已判断"行始终排在官方状态行之前
                    ai._traceLastRaw = raw;
                    const skillMatch = raw.match(/^(正在获取数据|已获取数据):(Skill\(.+\))$/);
                    let line = raw; // 非 Skill(...) 的通用状态行原样透传，不过度加工
                    if (skillMatch) {
                      ai._traceSkills.add(skillMatch[2]);
                      line = skillMatch[1] === "正在获取数据"
                        ? `联想乐享官方 SKILL：正在调用 ${skillMatch[2]}`
                        : `联想乐享官方 SKILL：${skillMatch[2]} 已完成`;
                    }
                    ai._traceLines.push(line);
                    lxRenderTraceLive(ai);
                  }
                }
              },
              products: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                let products = payload.products || [];
                const _wantNp = window.__lxIntent && window.__lxIntent.parseWantedCount ? window.__lxIntent.parseWantedCount(state.lastUserText || "") : null;
                if (_wantNp && products.length > _wantNp) products = products.slice(0, _wantNp);
                _turnProdCount = Math.max(_turnProdCount, products.length);
                _turnProducts = products;
                revealAi();
                lxAppendAiHtml(ai, renderProductsInMessage(products, { serviceProduct: _isServiceProductFollowup }));
                const recoId = lxLatestRecoIdInMessage(ai);
                if (products.length === 1 && products[0].sku) {
                  deferRightPanel(() => {
                    lxRevealContent();
                    openProduct(products[0]);
                  });
                } else if (products.length) {
                  deferRightPanel(() => {
                    lxRevealContent();
                    const recoTab = lxCreateRecoTab(products, { label: "AI 推荐", recoId });
                    lxUpsertTab(recoTab);
                    lxRunTab(recoTab);
                  });
                }
              },
              clicks: (data) => {
                if (nonce !== state.conversationNonce) return;
                const list = (parseJson(data).clicks) || [];
                if (!list.length) return;
                revealAi();
                lxAppendAiHtml(ai, '<div class="leai-clicks" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' + list.map((c) =>
                  `<button type="button" class="leai-click-btn" data-leai-url="${esc(c.link_url || "")}" data-leai-cb="${esc(c.callback_data || "")}" data-leai-event="${esc(c.event_type || "")}">${esc(c.display_text)}</button>`
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
                  // 这条早退分支也必须记录本轮商品——代买句常带"顺便对比一下"，官方只发 display
                  // 不发 products，漏记则 done 时链拿空数组误报"官方暂未返回"翻本地货盘（真机反馈）
                  _turnProdCount = Math.max(_turnProdCount, products.length);
                  _turnProducts = products;
                  if (payload.title && !ai._raw) {
                    ai._raw = payload.title;
                  }
                  lxAppendAiHtml(ai, renderProductsInMessage(products, { serviceProduct: _isServiceProductFollowup }));
                  deferRightPanel(() => {
                    lxRevealContent();
                    lxUpsertCompareTab(products.slice(0, 8), payload.title || "商品参数对比");
                  });
                  return;
                }
                // 代买链跳过单品收敛：「挑一款最好的直接下单」意图是链自己从候选里选一款，
                // 截成 1 款会让对比页空转、正文却继续列多款（真机反馈）
                if (!state._autoBuyPending && products.length > 1 && /推荐一[台款部个]|最值得|哪[个款台]最|帮我定一/.test(lastAsk)) {
                  products = products.slice(0, 1);
                }
                // 用户点名要N款(2-6)而官方固定回5-6款 → 按要求截断
                const _wantN = window.__lxIntent && window.__lxIntent.parseWantedCount ? window.__lxIntent.parseWantedCount(lastAsk) : null;
                if (_wantN && products.length > _wantN) products = products.slice(0, _wantN);
                _turnProdCount = Math.max(_turnProdCount, products.length);
                _turnProducts = products;
                if (payload.title && !ai._raw) {
                  ai._raw = payload.title;
                }
                lxAppendAiHtml(ai, renderProductsInMessage(products, { serviceProduct: _isServiceProductFollowup }));
                const recoId = lxLatestRecoIdInMessage(ai);
                // 所推即所见 + 最短路径：1 款直接打开商详，多款落「AI 推荐」专属结果页（PRD 5.2/6.5）
                if (products.length === 1 && products[0].sku) {
                  deferRightPanel(() => {
                    lxRevealContent();
                    openProduct(products[0]);
                  });
                } else if (products.length) {
                  deferRightPanel(() => {
                    lxRevealContent();
                    const recoTab = lxCreateRecoTab(products, { label: payload.title || "AI 推荐", grouped: payload.grouped, recoId });
                    lxUpsertTab(recoTab);
                    lxRunTab(recoTab);
                  });
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
                deferRightPanel(() => {
                  lxRevealContent();
                  lxOpenInfoTab("stores", payload.title || "联想体验店", `${perksHtml}${rows}<p class="lx-p0-disclaimer">门店与时段为演示数据，正式预约以门店确认为准。</p>`);
                }, { title: "查看附近门店", desc: "已为你整理门店、权益和可约时段" });
              },
              coupon: () => { if (nonce === state.conversationNonce) deferRightPanel(() => { lxRevealContent(); openCouponCenter(); }, { title: "查看优惠与活动", desc: "已在右侧打开可领取权益" }); },
              member: () => { if (nonce === state.conversationNonce) deferRightPanel(() => { lxRevealContent(); openMemberCenter(); }, { title: "查看会员中心", desc: "已为你打开会员权益与资产" }); },
              action: (data) => {
                if (nonce !== state.conversationNonce) return;
                const { op } = parseJson(data) || {};
                if (op === 'member') deferRightPanel(() => { lxRevealContent(); openMemberCenter(); }, { title: "查看会员中心", desc: "已为你打开会员权益与资产" });
                else if (op === 'coupon') deferRightPanel(() => { lxRevealContent(); openCouponCenter(); }, { title: "查看优惠与活动", desc: "已在右侧打开可领取权益" });
                else if (op === 'solution') {
                  lxAppendAiHtml(ai, '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交项目需求</button></div>');
                  deferRightPanel(() => { lxRevealContent(); openSolutionCenter(); }, { title: "查看方案中心", desc: "已为你打开行业解决方案" });
                }
                else if (op === 'edu') {
                  lxAppendAiHtml(ai, '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-stuauth="college">教育认证</button></div>');
                  deferRightPanel(() => { lxRevealContent(); openEduZone(); }, { title: "查看教育特惠专区", desc: "已为你打开认证权益和专享商品" });
                }
                else if (op === 'stores') deferRightPanel(() => { lxRevealContent(); openStoresPanel(); }, { title: "查看附近门店", desc: "已为你打开门店查询页面" });
                else if (op === 'auth') {
                  // 职场认证与教育认证统一使用标准结果卡，点击后直接打开认证弹窗。
                  lxAppendAiHtml(ai, `<button class="answer-cta lx-answer-page lx-auth-answer-card" type="button" data-open-wpa aria-label="打开职场身份认证弹窗"><span class="answer-cta-copy"><span class="answer-cta-title">职场身份认证</span><span class="answer-cta-desc">认证后享购机优惠、AI 资源与专属权益</span></span><span class="answer-cta-icon" aria-hidden="true">${window.__lxApprovedIcon("global-next")}</span></button>`);
                }
              },
              tradein: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const bodyHtml = payload.content
                  ? mdLite(payload.content)
                  : `<p class="lx-p0-disclaimer">旧机估值、补贴权益和换新推荐已接入联想乐享。可继续发送旧机型号、成色和购买新机目标。</p>`;
                deferRightPanel(() => openModal(payload.title || "以旧换新", `${bodyHtml}<div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="我有旧机想以旧换新，请问怎么估值并叠加补贴">问联想乐享</button></div>`), { title: "查看以旧换新", desc: "已为你打开估值与补贴说明" });
              },
              lead: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                deferRightPanel(() => openLeadPanel(payload.scenario || ""), { title: "查看咨询表单", desc: "已为你打开项目咨询入口" });
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
                _turnProducts = products;
                lxAppendAiHtml(ai, `<div class="lx-p0-suggest">${products.slice(0, 3).map((p) => `<button class="lx-p0-suggest-chip" type="button" data-open-product="${esc(p.sku)}">${esc(p.name)} ¥${Number(p.price || 0).toLocaleString()}</button>`).join("")}</div>`);
                deferRightPanel(() => {
                  lxRevealContent();
                  const recoTab = lxCreateRecoTab(products, { label: payload.title || "官方在售推荐" });
                  lxUpsertTab(recoTab);
                  lxRunTab(recoTab);
                });
              },
              choices: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const options = payload.options || [];
                if (!options.length) return;
                revealAi();
                lxAppendAiHtml(ai, `<div class="lx-choices"><div class="lx-choices-title">${esc(payload.title || "请选择")}</div><div class="lx-p0-suggest">${options.map((opt) => `<button class="lx-p0-suggest-chip" type="button" data-choice="${esc(opt)}" data-choice-template="${esc(payload.ask_template || "{choice}")}">${esc(opt)}</button>`).join("")}</div></div>`);
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
                deferRightPanel(() => lxOpenInfoTab("benefit", "到手价明细", `${payload.title ? `<p class="lx-md-p" style="font-size:13px">${esc(payload.title)}</p>` : ""}<div class="lx-bf-list">${rows}${finalRow}</div><p class="lx-p0-disclaimer">${esc(payload.final_text || "")} 优惠随活动变化，最终以实际结算页为准。</p>`), { title: "查看到手价明细", desc: "已为你展开优惠叠加计算" });
              },
              solutions: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const list = Array.isArray(payload.solutions) ? payload.solutions : [];
                if (!list.length) {
                  deferRightPanel(() => openModal(payload.title || "推荐方案", `<p class="lx-p0-disclaimer">${esc(payload.note || "已生成方案，可继续向联想乐享细化预算、行业和交付要求。")}</p>`), { title: "查看推荐方案", desc: "已为你打开方案详情" });
                  return;
                }
                const cards = list.map((sol) => {
                  const items = (sol.products || []).slice(0, 3).map((p) => `<span class="lx-sol-item">${esc(p.name)} ¥${Number(p.price || 0).toLocaleString()}</span>`).join("");
                  return `<div class="lx-sol-card"><strong>${esc(sol.title || "")}</strong><p>${esc(sol.summary || "")}</p>${items ? `<div class="lx-sol-items">${items}</div>` : ""}${sol.cta_text ? `<div class="lx-p0-actions"><button class="lx-p0-btn" data-quick-ask="${esc(sol.cta_text)}（方案：${esc(sol.title || "")}）">${esc(sol.cta_text)}</button></div>` : ""}</div>`;
                }).join("");
                deferRightPanel(() => openModal(payload.title || "推荐方案", `${cards}${payload.note ? `<p class="lx-p0-disclaimer">${esc(payload.note)}</p>` : ""}`), { title: "查看推荐方案", desc: `已为你整理 ${list.length} 个候选方案` });
              },
              modal: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.error) {
                  deferRightPanel(() => openModal(payload.title || "提示", `<p class="lx-p0-disclaimer">${esc(payload.error)}</p>`), { title: "查看提示", desc: "已在右侧打开详细信息" });
                  return;
                }
                if (payload.type === "compare" && Array.isArray(payload.products) && payload.products.length >= 2) {
                  // AI 触发的对比同样落右侧「对比」标签页（对比体验统一，不弹窗）
                  deferRightPanel(() => {
                    lxRevealContent();
                    lxUpsertCompareTab(payload.products, payload.title || "商品参数对比");
                  }, { title: "查看参数对比", desc: `已为你对比 ${payload.products.length} 款商品` });
                  return;
                }
                const content = payload.content || "";
                // 载体分工：浏览型长内容（直播单/活动详情/价目表等）右侧分屏展示，弹窗只留短提示
                if (content.length > 220 || /\n\s*[-|#]|\|.*\|/.test(content)) {
                  deferRightPanel(() => {
                    lxRevealContent();
                    lxOpenInfoTab("info", payload.title || "详细信息", mdLite(content));
                  }, { title: `查看${payload.title || "详细信息"}`, desc: "已在右侧打开完整内容" });
                } else {
                  deferRightPanel(() => openModal(payload.title || "联想乐享", mdLite(content)), { title: `查看${payload.title || "详情"}`, desc: "已在右侧打开相关内容" });
                }
              },
              customize: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const name = payload.product_name || "心仪机型";
                deferRightPanel(() => openModal(`${esc(name)} · 私人定制`, `<p class="lx-p0-disclaimer">告诉联想乐享你的用途和预算，即可生成专属配置方案。</p><div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="帮我把${esc(name)}配成性价比配置，并给出价格">性价比配置</button><button class="lx-p0-btn" data-quick-ask="帮我把${esc(name)}配成顶配，并给出价格">顶配方案</button><button class="lx-p0-btn" data-quick-ask="帮我推荐${esc(name)}的默认起步配置">起步配置</button></div>`), { title: "查看私人定制", desc: `已为你打开 ${name} 定制入口` });
              },
              nav: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                deferRightPanel(() => navigateToPortalSection(payload.target || "home"), { title: "查看目标页面", desc: "已为你切换到对应专区" });
              },
              thinking: () => {
                if (nonce !== state.conversationNonce) return;
                const head = $(".loading-line .typing-text", ai);
                if (head) head.textContent = "联想乐享正在生成中...";
              },
              think_end: () => {
                if (nonce !== state.conversationNonce) return;
                const head = $(".loading-line .typing-text", ai);
                if (head) head.textContent = "联想乐享正在生成中...";
              },
              suggestions: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                const list = Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 3) : [];
                if (!list.length || !hasContent) return;
                lxClearFollowups(ai);
                lxAppendAiHtml(ai, `<div class="lx-p0-suggest" data-followups="1">${list.map((sug) => `<button class="lx-p0-suggest-chip" type="button" data-quick-ask="${esc(sug)}">${esc(sug)}</button>`).join("")}</div>`);
              },
              done: (data) => {
                if (nonce !== state.conversationNonce) return;
                const payload = parseJson(data);
                if (payload.conv_id || payload.convId) state.convId = payload.conv_id || payload.convId;
                // 追问 chips「猜你想干」：动作预判确定性前置（对比第1、2款/打开第1款走本地意图闭环，
                // 生成器收口 app-intent.actionChips 主/全屏共用），咨询型 LLM 异步补齐；无论 LLM
                // 成败都保证凑满 3 个（静态兜底），不能只孤零零一条（真机反馈）
                const _q = state.lastUserText || "";
                const _a = (ai._raw || "").slice(0, 300);
                const _acts = (window.__lxIntent && window.__lxIntent.actionChips) ? window.__lxIntent.actionChips((_turnProducts || []).slice(0, _turnProdCount || 3)) : [];
                const _fb = (window.__lxIntent && window.__lxIntent.FOLLOWUP_FALLBACKS) || [];
                const _fill3 = (arr) => {
                  const out = [];
                  arr.concat(_fb).forEach((x) => { if (x && out.indexOf(x) < 0 && out.length < 3) out.push(x); });
                  return out;
                };
                // chips 渲染收敛：动画没完只记账（ai._chipsQs），动画收尾统一渲染一次。
                // 之前首渲进 _pendingExtras → finalHtml 快照带旧份，LLM 补齐无论删 DOM 还是改
                // 字符串都够不着快照，最终两排 6 个（真机两轮反馈），根修=chips 永不进 finalHtml。
                const _renderChips = (qs) => {
                  ai._chipsQs = qs;
                  if (!ai._chipsRendered) return; // 等 done 收尾的统一渲染点
                  lxClearFollowups();
                  ai.querySelectorAll(".followups, .lxfd-followups, .lx-p0-suggest[data-followups]").forEach(el => el.remove());
                  lxAppendAiHtml(ai, `<div class="lx-p0-suggest" data-followups="1">${qs.map(sug => `<button class="lx-p0-suggest-chip" type="button" data-quick-ask="${esc(sug)}">${esc(sug)}</button>`).join("")}</div>`);
                };
                ai._renderChipsFn = _renderChips;
                _renderChips(_fill3(_acts)); // 动作 chip + 静态兜底先记账，答案动画完成即显 3 个，不等 LLM
                if (_q && _a) {
                  fetch("/api/leai/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: _q, a: _a }) })
                    .then(r => r.json()).then(d => {
                      if (nonce !== state.conversationNonce) return;
                      const qs = _fill3(_acts.concat(Array.isArray(d && d.questions) ? d.questions.filter(Boolean) : []));
                      if (qs.length) _renderChips(qs);
                    }).catch(() => {});
                }
                // 代买 pending → 链早在 sendChat 一开始就已插卡起跑，step1 正等这个 promise；
                // 官方推荐到位，resolve 交给链自己去接管「对比→选款→下单」（件2：链前置）
                if (state._autoBuyPending) {
                  const _pendingBuy = state._autoBuyPending;
                  // 官方 session 失效走兜底时，后端在 fallback 事件后紧跟一个「假 done」（此刻火山
                  // 兜底流才刚起步，_turnProducts 必空）——跳过这一次，等兜底流的真 done 带着它
                  // 收集到的商品来 resolve；否则链 10s 就拿空结果去翻本地货盘，和正文推荐两张皮（真机反馈）
                  if (state._fallbackFired && !_pendingBuy._skippedFakeDone) {
                    _pendingBuy._skippedFakeDone = true;
                  } else {
                    state._autoBuyPending = null;
                    clearTimeout(_pendingBuy.timeoutId);
                    _pendingBuy.resolve(_turnProducts.slice());
                  }
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
                  ai._raw = '当前服务暂时不可用，请稍后再试。';
                }
              }
            };
            await readSse(response, handlers);
            if (nonce !== state.conversationNonce) return;
            if (!hasContent) revealAi();
            if (!ai._raw && !ai._pendingExtras) {
              ai._raw = "我已经收到请求，可以继续补充预算、用途或偏好的机型。";
            }
            if (!state.humanMode) lxAppendAiHtml(ai, `<div class="lx-p0-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>`);
            // 收尾把时间线折叠态 HTML 拼进最终正文——lxAnimateAiFinal 会整体替换 ai-body，
            // 生成阶段的实时 DOM 保不住，得随 finalHtml 一起进去才能存档/恢复时保持折叠。
            const _traceFinalHtml = renderSkillTrace(ai._traceLines, { collapsed: true, foldable: true, skillCount: ai._traceSkills ? ai._traceSkills.size : 0 });
            const finalHtml = `${_traceFinalHtml}${ai._raw ? mdLite(ai._raw) : ""}${ai._pendingExtras || ""}`;
            ai._pendingExtras = "";
            await lxAnimateAiFinal(ai, finalHtml);
            const delayedExtras = ai._pendingExtras || "";
            ai._pendingExtras = null;
            if (delayedExtras) lxAppendAiHtml(ai, delayedExtras);
            // chips 统一渲染点：动画期间只记账（_chipsQs 可能已被 LLM 补齐更新过），这里一次性上屏
            ai._chipsRendered = true;
            if (ai._chipsQs && typeof ai._renderChipsFn === "function") { try { ai._renderChipsFn(ai._chipsQs); } catch (_e) {} }
            // 本节点 addMessage("ai loading","",...) 创建时 text=""，走 else 分支直接
            // body.innerHTML=extraHtml，不会触发 addMessage 内 lxAnimateAiFinal.then() 的
            // 完成态保存回调（那个回调只在 text 非空分支才注册）；这里显式补一次，同「下单
            // 成功」节点做法一致，不只靠 400ms 防抖——否则技能链/思考时间线回答刷新即丢。
            try { window.__lxSaveConversationNow(); } catch (_e) {} // 真·立即存，不吃400ms防抖（同下单成功节点）
            const afterAnswer = Array.isArray(ai._afterAnswer) ? ai._afterAnswer.splice(0) : [];
            ai._afterAnswer = null;
            afterAnswer.forEach((fn) => {
              try { fn(); } catch (err) { console.error(err); }
            });
            state.pendingImageUrl = "";
            state.pendingAudioUrl = "";
            updateUploadNote();
            if (state.officialCompare) callOfficialAI(text);
          } catch (error) {
            if (nonce !== state.conversationNonce) return;
            // 代买 pending 若卡在这轮官方流出错（网络/解析异常）：reject 掉 promise，让链 step1
            // 走本地货盘 fallback 阶梯，而不是让链永远停在「等待官方推荐结果…」；同时清掉标记，
            // 防止遗留到用户下一句完全无关的话，被误当成代买执行触发
            if (state._autoBuyPending) {
              const _pendingBuy = state._autoBuyPending;
              state._autoBuyPending = null;
              clearTimeout(_pendingBuy.timeoutId);
              try { _pendingBuy.reject(error); } catch (_e) {}
            }
            ai.className = "lx-p0-message msg ai lx-chat-skin";
            ai._raw = "当前 AI 服务暂时不可用，请稍后重试。";
            ai._pendingExtras = null;
            ai._afterAnswer = null;
            await lxAnimateAiFinal(ai, mdLite(ai._raw));
            try { window.__lxSaveConversationNow(); } catch (_e) {} // 同上：错误兜底态也要显式存一次，不靠防抖
          } finally {
            clearTimeout(state._sendTimeout);
            if (nonce === state.conversationNonce) state.sending = false;
          }
        }

        // ── 企业账户认证 mock（PRD 5.8.1/5.13.1：认证是企业专享价/对公能力前置，POC 状态机）──
        const LX_ENT_KEY = "lexiang.enterprise.v1";
        const LX_ENT_REVIEW_MS = 12000;
        const LX_ENT_DEFAULT_POINTS = 260716;
        const LX_ENT_POINTS_SEED = "20260705-260716";
        const LX_ENT_REDEEM_ITEMS = [
          { id: "coupon-100", name: "100元企业采购券", cost: 1200, desc: "企业电脑、配件与服务采购可用", tag: "采购券", image: "/assets/img/shop-1.jpg" },
          { id: "onsite-care", name: "上门服务抵扣券", cost: 1800, desc: "上门部署、调试与保养服务抵扣", tag: "服务", image: "/assets/img/shop-2.jpg" },
          { id: "mouse-pack", name: "办公外设礼包", cost: 2600, desc: "键鼠、扩展坞等常用办公外设", tag: "外设", image: "/assets/img/shop-3.jpg" },
          { id: "warranty-pack", name: "延保服务权益", cost: 4200, desc: "企业设备延保或高级支持咨询", tag: "延保", image: "/assets/img/shop-4.jpg" },
          { id: "thinkpad-bag", name: "ThinkPad 商务双肩包", cost: 1600, desc: "通勤收纳，多隔层办公背包", tag: "配件", image: "/assets/img/shop-5.jpg" },
          { id: "usb-dock", name: "USB-C 多功能扩展坞", cost: 3200, desc: "会议投屏、网口与多屏扩展", tag: "办公", image: "/assets/product-placeholder.svg" },
          { id: "meeting-mouse", name: "无线蓝牙办公鼠标", cost: 900, desc: "轻量便携，适合移动办公", tag: "外设", image: "/assets/img/shop-7.jpg" },
          { id: "clean-care", name: "企业设备清洁保养", cost: 1500, desc: "键盘、屏幕与整机清洁服务", tag: "保养", image: "/assets/img/shop-8.jpg" },
          { id: "setup-service", name: "新机开荒服务包", cost: 2200, desc: "系统初始化、软件安装与数据迁移", tag: "服务", image: "/assets/img/shop-9.jpg" },
          { id: "privacy-film", name: "笔记本防窥贴膜", cost: 1100, desc: "商务差旅与开放工位隐私防护", tag: "配件", image: "/assets/img/shop-10.jpg" },
          { id: "it-check", name: "企业 IT 巡检权益", cost: 3600, desc: "设备健康检查与办公环境建议", tag: "运维", image: "/assets/img/shop-11.jpg" },
          { id: "training-seat", name: "AI 办公培训名额", cost: 5000, desc: "面向团队的 AIPC 办公效率课程", tag: "培训", image: "/assets/img/shop-12.jpg" },
          { id: "asset-check", name: "资产盘点服务", cost: 2800, desc: "办公终端资产清点与台账整理", tag: "运维", image: "/assets/img/shop-1.jpg" },
          { id: "cloud-credit", name: "云资源抵扣券", cost: 3800, desc: "云桌面、备份与协同资源抵扣", tag: "云服务", image: "/assets/img/shop-2.jpg" },
          { id: "keyboard-pack", name: "无线键盘套装", cost: 1300, desc: "企业办公常用无线键盘套装", tag: "外设", image: "/assets/img/shop-3.jpg" },
          { id: "screen-clean", name: "显示器清洁套装", cost: 800, desc: "屏幕与办公桌面清洁用品", tag: "保养", image: "/assets/img/shop-4.jpg" },
          { id: "vip-hotline", name: "专属热线权益", cost: 2400, desc: "企业客户专线咨询与响应权益", tag: "服务", image: "/assets/img/shop-5.jpg" },
          { id: "deployment-hour", name: "部署工程师工时", cost: 4600, desc: "终端部署与迁移工程师服务", tag: "部署", image: "/assets/product-placeholder.svg" },
          { id: "ai-template", name: "AI 办公模板包", cost: 700, desc: "会议纪要、报告与表格模板", tag: "办公", image: "/assets/img/shop-7.jpg" },
          { id: "backup-care", name: "数据备份咨询", cost: 1900, desc: "企业终端数据备份方案咨询", tag: "数据", image: "/assets/img/shop-8.jpg" },
          { id: "meeting-kit", name: "会议协作礼包", cost: 3100, desc: "会议室协作与投屏外设组合", tag: "会议", image: "/assets/img/shop-9.jpg" },
          { id: "security-check", name: "终端安全体检", cost: 3300, desc: "办公终端安全策略检查建议", tag: "安全", image: "/assets/img/shop-10.jpg" },
          { id: "spare-adapter", name: "备用电源适配器", cost: 2100, desc: "ThinkPad 常用备用电源适配器", tag: "配件", image: "/assets/img/shop-11.jpg" },
          { id: "onsite-training", name: "上门培训权益", cost: 5200, desc: "AIPC 与企业办公效率上门培训", tag: "培训", image: "/assets/img/shop-12.jpg" }
        ];

        function lxEntState() {
          try {
            const raw = JSON.parse(localStorage.getItem(LX_ENT_KEY) || "null");
            const ent = raw && typeof raw === "object" ? raw : { status: "none" };
            if (ent.pointsSeed !== LX_ENT_POINTS_SEED) {
              ent.points = LX_ENT_DEFAULT_POINTS;
              ent.pointsSeed = LX_ENT_POINTS_SEED;
            }
            if (!Number.isFinite(Number(ent.points))) ent.points = LX_ENT_DEFAULT_POINTS;
            if (!Array.isArray(ent.redeems)) ent.redeems = [];
            try { localStorage.setItem(LX_ENT_KEY, JSON.stringify(ent)); } catch {}
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
          addMessage("assistant", `好消息：「${ent.company || "贵公司"}」的企业采购负责人认证已通过！已为你解锁企业专享价（商品价签即刻生效）、采购补贴、对公专票与账期通道。`, `<div class="lx-p0-actions" style="margin-top:8px"><button class="lx-p0-btn primary" type="button" data-quick-ask="按企业专享价帮我重新推荐刚才在看的办公电脑">按企业价重看推荐</button><button class="lx-p0-btn" type="button" data-quick-ask="企业会员权益都有哪些，怎么用">看全部企业权益</button></div>`);
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
          if (!Number.isFinite(Number(ent.points))) ent.points = LX_ENT_DEFAULT_POINTS;
          ent.pointsSeed = LX_ENT_POINTS_SEED;
          if (!Array.isArray(ent.redeems)) ent.redeems = [];
          try { localStorage.setItem(LX_ENT_KEY, JSON.stringify(ent)); } catch {}
          lxRenderEnterpriseBanner();
        }

        function lxEntPointsValue() {
          const ent = lxEntState();
          const value = Number(ent.points);
          return Number.isFinite(value) ? value : LX_ENT_DEFAULT_POINTS;
        }

        function lxFormatEntPoints(value) {
          return Number(value || 0).toLocaleString("zh-CN");
        }

        function lxRenderEntPointsMallHtml() {
          const ent = lxEntState();
          const points = lxEntPointsValue();
          const redeemed = new Set((ent.redeems || []).map((item) => item.id));
          const availableItems = LX_ENT_REDEEM_ITEMS.filter((item) => !redeemed.has(item.id));
          const cards = availableItems.map((item) => {
            const afford = points >= item.cost;
            return `<article class="lx-ent-redeem-card lx-ent-product-card"><div class="product-visual"><span class="lx-cat-badge">${esc(item.tag || "权益")}</span><img src="${esc(item.image || "/assets/product-placeholder.svg")}" alt="${esc(item.name)}" loading="lazy" /></div><h3 class="product-title">${esc(item.name)}</h3><div class="product-promos"><span class="product-promo">企业积分兑换</span><span class="product-promo">企业权益</span></div><div class="price">${lxFormatEntPoints(item.cost)}<span class="price-from"> 企业积分</span></div><button class="lx-p0-btn${afford ? " primary" : ""}" type="button" data-ent-redeem="${esc(item.id)}"${!afford ? " disabled" : ""}>${afford ? "立即兑换" : "积分不足"}</button></article>`;
          }).join("");
          const records = (ent.redeems || []).slice().reverse().slice(0, 4).map((entry) => {
            const when = entry.redeemedAt ? new Date(entry.redeemedAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "刚刚";
            return `<div class="lx-ent-redeem-record"><span>兑换成功</span><strong>${esc(entry.name || "企业权益")}</strong><em>${lxFormatEntPoints(entry.cost)} 企业积分 · ${esc(when)}</em></div>`;
          }).join("");
          const recordHtml = records ? `<section class="lx-ent-redeem-records"><div class="lx-ent-redeem-record-head"><h3>兑换成功记录</h3><span>最近 ${Math.min((ent.redeems || []).length, 4)} 条</span></div><div class="lx-ent-redeem-record-list">${records}</div></section>` : "";
          const empty = `<div class="lx-ent-redeem-empty"><strong>暂无可兑换商品</strong><span>当前积分商城商品均已兑换，可稍后查看新权益上架。</span></div>`;
          return `<section class="lx-ent-redeem-page"><div class="lx-ent-redeem-hero"><div><span>当前企业积分</span><strong>${lxFormatEntPoints(points)}</strong><em>积分可用</em></div><button class="lx-p0-btn" type="button" data-quick-ask="企业积分怎么获取和使用？">积分规则</button></div>${recordHtml}<div class="lx-ent-redeem-grid lx-floor-products">${cards || empty}</div><p class="lx-p0-disclaimer">仅展示当前未兑换的商品。兑换后会从当前企业账号积分中扣减，并记录在企业账号状态中。</p></section>`;
        }

        function lxOpenEntPointsMall() {
          lxRevealContent();
          lxOpenInfoTab("ent-points", "企业积分兑换", lxRenderEntPointsMallHtml());
        }

        function lxRenderEntRedeemProgressCard(item, points) {
          const steps = [
            `核验积分余额 ${lxFormatEntPoints(points)}`,
            `锁定兑换权益`,
            `生成兑换订单`
          ];
          const chips = steps.map((label) => `<span class="chip"><span class="od"></span>${esc(label)}</span>`).join("");
          return `<div class="cl lx-claim-skin lx-ent-redeem-steps" data-v="D" data-state="claiming" data-ent-redeem-progress="1"><div class="drow"><span class="ic">${lxClaimTicketSvg()}</span><span class="mid"><div class="t1" data-t1>正在为你执行积分兑换</div><div class="t2">${esc(item.name)} · ${lxFormatEntPoints(item.cost)} 企业积分</div></span><span class="cnt"><span class="n" data-cnt>0</span>/${steps.length}</span><span class="done-amt"><span class="ok">${lxClaimCheckSvg()}</span>待确认订单</span></div><div class="track"><span class="fill" style="width:0%"></span></div><div class="chips">${chips}</div></div>`;
        }

        function lxRunEntRedeemProgressCard(root, item, onDone) {
          if (!root) { if (typeof onDone === "function") onDone(); return; }
          const chips = Array.from(root.querySelectorAll(".chip"));
          const t1 = root.querySelector("[data-t1]");
          const cnt = root.querySelector("[data-cnt]");
          const fill = root.querySelector(".fill");
          const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          const labels = ["正在核验企业积分", "正在锁定兑换权益", "正在生成兑换订单"];
          const finish = () => {
            root.setAttribute("data-state", "done");
            if (t1) t1.textContent = "兑换订单已生成";
            if (cnt) cnt.textContent = String(chips.length);
            if (fill) fill.style.width = "100%";
            chips.forEach((chip) => chip.classList.add("on"));
            ensureChat().scrollTop = ensureChat().scrollHeight;
            setTimeout(() => { if (typeof onDone === "function") onDone(); }, reduced ? 0 : 260);
          };
          if (!chips.length || reduced) { finish(); return; }
          chips.forEach((chip) => chip.classList.remove("on"));
          root.setAttribute("data-state", "claiming");
          if (fill) fill.style.width = "0%";
          chips.forEach((chip, i) => {
            setTimeout(() => {
              const pct = Math.round(((i + 1) / chips.length) * 100);
              if (t1) t1.textContent = labels[i] || "正在为你执行积分兑换";
              if (cnt) cnt.textContent = String(i + 1);
              if (fill) fill.style.width = `${pct}%`;
              chip.classList.add("on");
              ensureChat().scrollTop = ensureChat().scrollHeight;
            }, 420 + i * 580);
          });
          setTimeout(finish, 420 + chips.length * 580 + 160);
        }

        function lxFindEntRedeemItem(text) {
          const ask = String(text || "");
          if (!/兑换|下单|领取/.test(ask)) return null;
          return LX_ENT_REDEEM_ITEMS.find((item) => ask.includes(item.name) || ask.includes(item.id));
        }

        function lxOpenEntRedeemOrder(item) {
          if (!item) return;
          const points = lxEntPointsValue();
          const remain = points - Number(item.cost || 0);
          openModal("确认兑换订单", `<div class="lx-ent-order"><button class="lx-p0-close lx-ent-order-close" type="button" aria-label="关闭">×</button><div class="lx-ent-order-product"><img src="${esc(item.image || "/assets/product-placeholder.svg")}" alt="${esc(item.name)}"><div><strong>${esc(item.name)}</strong><span>${esc(item.desc || "企业积分兑换权益")}</span></div></div><div class="lx-ent-order-rows"><div><span>兑换账号</span><b>当前企业账号</b></div><div><span>兑换数量</span><b>1</b></div><div><span>消耗积分</span><b>${lxFormatEntPoints(item.cost)} 企业积分</b></div><div><span>兑换后余额</span><b>${lxFormatEntPoints(Math.max(0, remain))} 企业积分</b></div></div><button class="lx-p0-btn primary lx-ent-order-confirm" type="button" data-ent-redeem-confirm="${esc(item.id)}">确认兑换</button><p class="lx-p0-disclaimer">确认后将从企业账号积分中扣减，并生成企业积分兑换记录。</p></div>`, { skin: "order" });
        }

        function lxStartEntRedeemFlow(id) {
          const item = LX_ENT_REDEEM_ITEMS.find((entry) => entry.id === id);
          if (!item) return false;
          const ent = lxEntState();
          const points = lxEntPointsValue();
          ent.redeems = Array.isArray(ent.redeems) ? ent.redeems : [];
          if (ent.redeems.some((entry) => entry.id === id)) { lxAddInstantAi(`「${item.name}」已经兑换过了，我已在右侧为你保留兑换记录。`); lxOpenEntPointsMall(); return true; }
          if (points < item.cost) { lxAddInstantAi(`当前企业积分不足，兑换「${item.name}」还差 ${lxFormatEntPoints(item.cost - points)} 企业积分。`); lxOpenEntPointsMall(); return true; }
          const tip = addMessage("ai", "");
          lxEnsureAiBody(tip).innerHTML = `<p>好的！为你处理企业积分兑换：</p>${lxRenderEntRedeemProgressCard(item, points)}`;
          tip._raw = `好的！为你处理企业积分兑换：${item.name}`;
          const progressCard = tip.querySelector('.lx-ent-redeem-steps[data-v="D"]');
          lxRunEntRedeemProgressCard(progressCard, item, () => {
            try { window.__lxSaveConversationNow(); } catch (_e) {} // 真·立即存，不吃400ms防抖（同下单成功节点）
            lxOpenEntRedeemOrder(item);
          });
          return true;
        }

        function lxHandleEntPointsQuery(text) {
          const redeemItem = lxFindEntRedeemItem(text);
          if (redeemItem) return lxStartEntRedeemFlow(redeemItem.id);
          if (!/(积分兑换|积分商城|企业积分)/.test(text || "")) return false;
          lxAddInstantAi("好的，已为你打开企业积分兑换。右侧展示当前可兑换权益，可直接选择兑换。");
          lxOpenEntPointsMall();
          return true;
        }

        function lxRedeemEntPoints(id) {
          const item = LX_ENT_REDEEM_ITEMS.find((entry) => entry.id === id);
          if (!item) return;
          const ent = lxEntState();
          ent.points = lxEntPointsValue();
          ent.redeems = Array.isArray(ent.redeems) ? ent.redeems : [];
          if (ent.redeems.some((entry) => entry.id === id)) { toast("该权益已兑换"); return; }
          if (ent.points < item.cost) { toast("企业积分不足"); return; }
          ent.points -= item.cost;
          ent.redeems.push({ id: item.id, name: item.name, cost: item.cost, redeemedAt: Date.now() });
          lxSaveEntState(ent);
          const freshHtml = lxRenderEntPointsMallHtml();
          const pointsTab = (state.tabs || []).find((tab) => tab.id === "info:ent-points");
          if (pointsTab) pointsTab.html = freshHtml;
          const infoBox = document.querySelector(".content[data-view=info] .info-page");
          if (state.activeTabId === "info:ent-points" && infoBox) infoBox.innerHTML = freshHtml;
          toast(`已兑换：${item.name}`);
          lxOpenEntPointsMall();
          if (state.page === "business") setTimeout(() => { try { lxRunTab(state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0]); } catch {} }, 120);
        }

        function openEnterpriseAuth() {
          const ent = lxEntState();
          if (ent.status === "verified") {
            openModal("企业账户已认证", `<div class="lx-ent-status ok"><strong>${esc(ent.company || "贵公司")}</strong> 已通过企业采购负责人认证</div><ul class="lx-md-list"><li>企业专享价与采购补贴已生效</li><li>支持对公付款、增值税专票与企业账期咨询</li><li>专属客服与企业定制通道已开通</li></ul><div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="以企业身份帮我推荐办公采购方案并说明企业会员权益">看企业专享推荐</button></div><p class="lx-p0-disclaimer">POC 演示环境：认证为模拟流程，正式上线将对接联想企业购实名核验。</p>`);
            return;
          }
          if (ent.status === "pending") {
            openModal("企业认证审核中", `<div class="lx-ent-status pending">「${esc(ent.company || "")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境审核约 10 秒自动完成；正式环境为 1-2 个工作日，结果会在本页面与账号菜单回显。</p>`);
            return;
          }
          openModal("企业会员认证", `
            <div class="lx-lead-modal lx-enterprise-lead">
              <p class="lx-lead-subtitle">请填写企业会员注册信息，企业邮箱将用于接收激活邮件。申请是否通过以企业会员服务回执为准。</p>
              <form class="lx-lead-form" id="lxEnterpriseAuthForm" novalidate>
                <label class="lx-lead-row"><span><i>*</i>企业名称</span><input id="lxEntCompany" autocomplete="organization" placeholder="请输入企业名称" required></label>
                <label class="lx-lead-row"><span><i>*</i>企业税号</span><input id="lxEntCode" placeholder="请输入统一社会信用代码" required></label>
                <label class="lx-lead-row"><span><i>*</i>企业邮箱</span><input id="lxEntEmail" type="email" autocomplete="email" placeholder="用于接收激活邮件，请正确填写" required></label>
                <div class="lx-lead-actions"><button class="lx-lead-cancel" type="button" data-enterprise-auth-cancel>取消</button><button class="lx-lead-submit" type="button" data-ent-submit disabled>提交认证申请</button></div>
              </form>
            </div>`, { skin: "lead" });
          const form = document.querySelector("#lxEnterpriseAuthForm");
          const submit = form?.querySelector("[data-ent-submit]");
          const syncSubmit = () => { if (submit) submit.disabled = !form.checkValidity(); };
          form?.querySelectorAll("input").forEach((control) => {
            control.addEventListener("input", syncSubmit);
            control.addEventListener("change", syncSubmit);
          });
          syncSubmit();
          window.setTimeout(() => document.querySelector("#lxEntCompany")?.focus(), 0);
        }
        window.__lxOpenEnterpriseAuthModal = openEnterpriseAuth;

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
            [/^门店$/, "lx-floor--activity lx-floor--service lx-floor--store"],
            [/服务/, "lx-floor--activity lx-floor--service"],
            [/会员权益/, "lx-floor--activity lx-floor--member"],
            [/私人定制/, "lx-floor--activity lx-floor--custom"],
            [/以旧换新/, "lx-floor--activity lx-floor--tradein"],
            [/^种草$/, "lx-floor--activity lx-floor--discover"],
            [/企业会员|企业定制|行业解决方案|行业资料|信创|大客户/, "lx-floor--activity"],
          ];
          const extraClass = (classMap.find(([pattern]) => pattern.test(title)) || [null, ""])[1];
          return `<section class="lx-floor ${extraClass}" data-floor-cat="${esc(title)}"><div class="lx-floor-head"><i class="lx-floor-badge" aria-hidden="true"></i><div class="lx-floor-title"><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div><div class="lx-floor-actions">${cta || ""}</div></div><div class="lx-floor-body">${body}</div></section>`;
        }

        const LX_QY_BENEFIT_ICONS = {
          cert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
          tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4l12 12 6-6L9 3Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>',
          percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
          medal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-2 7 5.5-3 5.5 3-2-7"/></svg>',
          gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/></svg>',
          wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12h2M3 9h14M21 10v5"/></svg>',
          truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
          remote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m9 9 2 2-2 2M13 13h2"/></svg>',
          clean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3 9 13M14 4l6 6M8 14l-4 7 7-4"/></svg>',
          shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1 4H5L4 7ZM5 11v9h14v-9M3 7l1-3h16l1 3"/></svg>',
          edu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M5 11v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V11"/></svg>',
          recycle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7 4 12l3 2M17 7l3 5-3 2M9 19h6"/><path d="m9 4 3-1 3 1"/></svg>',
          chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/></svg>',
          arrow: window.__lxApprovedIcon("global-next"),
          ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>',
          keep: window.__lxApprovedIcon("global-check")
        };

        function lxRenderQyBenefitSkin() {
          const icon = LX_QY_BENEFIT_ICONS;
          const benefits = [
            { title: "认证后全场企业价", desc: "认证即享，价格优于个人渠道", icon: "tag", hl: true },
            { title: "定制采购最高 25% 补贴", desc: "批量定制更划算", icon: "percent" },
            { title: "企业会员专属折扣", desc: "会员等级叠加优惠", icon: "medal" },
            { title: "首购礼券一键领取", desc: "新企业专享礼包", icon: "gift" }
          ];
          const steps = [
            ["提交资质", "营业执照等"],
            ["授信审批", "官网在线审核"],
            ["获得额度", "账期授信额度"],
            ["账期下单", "先采购后付款"]
          ];
          const tools = [
            { name: "上门部署", desc: "工程师上门安装、系统部署与调试", icon: "truck", ask: "我需要企业上门部署服务" },
            { name: "远程支持", desc: "远程协助排障，快速恢复办公", icon: "remote", ask: "我需要企业远程支持服务" },
            { name: "清洁保养", desc: "定期上门清洁保养，延长设备寿命", icon: "clean", ask: "我需要企业设备清洁保养服务" }
          ];
          const section = (title, extra = "") => `<div class="sect"><span class="st">${esc(title)}</span>${extra}<span class="ln"></span></div>`;
          const benefitCards = benefits.map((item) => `<div class="ben${item.hl ? " hl" : ""}"><span class="ic tile">${icon[item.icon]}</span><div><div class="bt">${esc(item.title)}</div><div class="bd">${esc(item.desc)}</div></div></div>`).join("");
          const stepItems = steps.map(([title, desc], index) => `<div class="step"><span class="sn">${index + 1}</span><div class="sk">${esc(title)}</div><div class="sd">${esc(desc)}</div></div>`).join("");
          const toolCards = tools.map((item) => `<div class="tool" data-quick-ask="${esc(item.ask)}"><span class="ic tile">${icon[item.icon]}</span><div class="tt"><div class="tn">${esc(item.name)}</div><div class="td">${esc(item.desc)}</div><span class="trigger">${icon.chat} 对话中说出需求即可触发</span></div><span class="tool-go">${icon.arrow}</span></div>`).join("");
          return `<section class="qy lx-qybenefit-skin" data-v="2" data-floor-cat="企业会员权益">
            <div class="qy-hero"><div><span class="eyebrow">企业会员权益</span><h3>认证企业身份，采购报价和服务流程更清晰</h3><p>围绕企业价、批量补贴、会员折扣、首购礼包与账期申请，帮助中小企业完成从选型到下单的采购闭环。</p></div><button class="cert" type="button" data-open-ent>${icon.cert} 立即认证</button></div>
            ${section("核心权益")}
            <div class="grid4">${benefitCards}</div>
            <div class="qy-main">
              <div class="qy-account">${section("企业账期")}<div class="acct"><div class="ah"><span class="ic tile">${icon.wallet}</span><div class="at"><div class="atitle">企业账期 · 先采购后付款</div><div class="adesc">接通 b.lenovo 官网账期申请流程，授信后可享账期下单</div></div><button class="abtn" type="button" data-quick-ask="企业账期怎么申请，帮我准备资料">申请企业账期 ${icon.ext}</button></div><div class="steps">${stepItems}</div></div></div>
              <div class="qy-service">${section("服务工具", `<span class="pill chat">${icon.chat} 对话可触发</span>`)}<div class="tool-list">${toolCards}</div></div>
            </div>
            <div class="qfoot"><span>认证即享企业价</span><span class="d"></span><span>服务工具可在对话中触发</span><span class="d"></span><span>账期额度以官网审核结果为准</span></div>
          </section>`;
        }

        const LX_INDUSTRY_ICONS = {
          factory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l6 4V9l6 4V9l6 4v8H3Z"/><path d="M7 21v-3M12 21v-3M17 21v-3"/></svg>',
          energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
          media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
          event: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
          edu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M5 11v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V11"/></svg>',
          health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/><path d="M9 11h2l1-2 1 4 1-2h2"/></svg>',
          finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></svg>',
          transit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="13" rx="2"/><path d="M5 11h14M8 20l1-3M16 20l-1-3"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/></svg>',
          cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>',
          check: window.__lxApprovedIcon("global-check"),
          plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
          send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
          chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/></svg>'
        };

        function lxIndustrySolutions() {
          const sol = typeof LX_SOLUTIONS !== "undefined" ? LX_SOLUTIONS : {};
          const fromSolution = (key, fallback) => {
            const item = sol[key] || {};
            return {
              ...fallback,
              solutionKey: key,
              overview: fallback.overview || item.overview || "",
              func: fallback.func || (item.features || []).slice(0, 3).join("、"),
              adv: fallback.adv || (item.advantages || []).slice(0, 2).join("、"),
              gain: fallback.gain || item.gains || "",
              caseName: fallback.caseName || (item.cases || [])[0] || "待补充"
            };
          };
          return [
            fromSolution("智能制造", { id: "mfg", name: "制造", icon: "factory", pool: ["ThinkSystem 服务器", "异构智算"], caseName: "吉利汽车", caseReal: true, overview: "面向智能制造的端到端算力与终端方案，覆盖研发、产线与数据中台。", func: "产线 AI 质检、研发仿真、数据中台", adv: "异构智算统一调度、稳定可扩展", gain: "提效降本、缩短研发周期", opener: "我们是制造企业，想了解 ThinkSystem 服务器 + 异构智算如何支撑产线 AI 与研发，请帮我推荐方案。" }),
            fromSolution("数字政府", { id: "energy", name: "能源 / 政府", icon: "energy", pool: ["信创全栈", "存储"], caseName: "中石油", caseReal: true, overview: "信创全栈、安全合规的能源与政务数字化方案。", func: "国产化替代、集中存储、安全管控", adv: "自主可控、等保合规", gain: "合规达标、数据安全可靠", opener: "我们单位需要信创全栈 + 存储的合规方案，请结合政府 / 能源场景帮我推荐。" }),
            fromSolution("智能基础设施", { id: "media", name: "媒体 / 服务", icon: "media", pool: ["AIPC", "内容生产"], caseName: "新华社", caseReal: true, overview: "AIPC 驱动的内容生产与服务提效方案。", func: "端侧推理、素材生产、协同剪辑", adv: "创作提效、随身算力", gain: "内容产能成倍提升", opener: "我们是媒体 / 服务机构，想用 AIPC + 内容生产提效，请帮我推荐终端方案。" }),
            fromSolution("数字政府", { id: "event", name: "大型活动 / 政府", icon: "event", pool: ["高算力", "5G+AI"], caseName: "北京冬奥", caseReal: true, overview: "大型活动的高算力与实时智能保障方案。", func: "高并发算力、5G+AI 实时分析", adv: "赛事级稳定、零停机保障", gain: "平稳运行、智慧观赛体验", opener: "我们要保障大型活动，需要高算力 + 5G+AI 方案，请帮我推荐。" }),
            fromSolution("智慧教育", { id: "edu", name: "教育", icon: "edu", pool: ["云桌面", "轻薄 AIPC", "国产化适配"], caseReal: false, opener: "我们是教育单位，想了解云桌面 + 轻薄 AIPC + 国产化适配方案，请帮我推荐。" }),
            fromSolution("智慧医疗", { id: "health", name: "医疗", icon: "health", pool: ["数据保护", "合规存储"], caseReal: false, opener: "我们是医疗机构，关注数据保护与合规存储，请帮我推荐方案。" }),
            fromSolution("智慧金融", { id: "finance", name: "金融", icon: "finance", pool: ["关键业务服务器", "信创"], caseReal: false, opener: "我们是金融机构，需要关键业务服务器 + 信创方案，请帮我推荐。" }),
            fromSolution("智能基础设施", { id: "transit", name: "交通", icon: "transit", pool: ["边缘计算", "通用方案"], caseReal: false, overview: "交通行业的边缘计算与通用终端方案。", func: "边缘计算、终端通用部署", adv: "低时延、广覆盖", gain: "智慧调度、运维高效", opener: "我们是交通行业，想了解边缘计算 + 通用方案，请帮我推荐。" })
          ];
        }

        function lxRenderIndustrySolutionSkin(selected = 0) {
          const icon = LX_INDUSTRY_ICONS;
          const list = lxIndustrySolutions();
          const index = Math.max(0, Math.min(Number(selected) || 0, list.length - 1));
          const item = list[index] || list[0];
          const tags = list.map((entry, idx) => `<button class="tag${idx === index ? " on" : ""}" type="button" data-industry-index="${idx}"><span class="tdot"></span>${esc(entry.name)}</button>`).join("");
          const chips = item.pool.map((name) => `<span class="chip">${icon.cube}${esc(name)}</span>`).join("");
          const caseCls = item.caseReal ? "real" : "tba";
          const caseIcon = item.caseReal ? icon.check : icon.plus;
          const caseText = item.caseReal ? `同行案例 · ${item.caseName}` : "案例 · 待补充";
          return `<section class="ind lx-industry-skin" data-v="3" data-floor-cat="行业解决方案" data-industry-selected="${index}">
            <div class="ihead"><h3>行业解决方案与行业案例</h3><span class="slogan">概述 / 功能 / 优势 / 收益 / 案例联动</span></div>
            <div class="tags">${tags}</div>
            <div class="hero">
              <div class="left"><div class="dtitle"><span class="di">${icon[item.icon]}</span><div><div class="dn">${esc(item.name)}</div><div class="dd">行业整体方案</div></div></div><div class="ov">${esc(item.overview)}</div><div class="poolrow"><span class="lab">推荐产品池</span><div class="chips">${chips}</div></div></div>
              <div class="right"><span class="case ${caseCls}" data-solution="${esc(item.solutionKey || "")}">${caseIcon}${esc(caseText)}</span><div class="opener"><div class="ol">${icon.chat}行业专家联系你</div><div class="composer"><div class="otext" data-industry-opener="${esc(item.opener)}">${esc(item.opener)}</div><button class="send" type="button" data-industry-send="${esc(item.opener)}" title="发送到对话">${icon.send}</button></div></div></div>
            </div>
            <div class="cols3"><div class="acard"><div class="ah">功能</div><div class="at">${esc(item.func)}</div></div><div class="acard"><div class="ah">优势</div><div class="at">${esc(item.adv)}</div></div><div class="acard"><div class="ah">收益</div><div class="at">${esc(item.gain)}</div></div></div>
          </section>`;
        }

        function lxSetIndustryOpener(text) {
          const textarea = document.querySelector(".composer textarea");
          if (!textarea || !text) return;
          textarea.dataset.lxSuppressSuggest = "1";
          textarea.value = text;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          clearTimeout(lxSuggestTimer);
          lxHideSuggest();
          textarea.focus();
          setTimeout(() => { delete textarea.dataset.lxSuppressSuggest; }, 0);
        }

        const LX_MATERIAL_ICONS = {
          video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
          doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v4h4M9 13h6M9 17h6"/></svg>',
          caseic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4zM4 9h16M8 13h5"/></svg>',
          manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M8 8h6M8 12h6"/></svg>',
          avatar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M3 12h1M20 12h1"/></svg>',
          play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7L7 5Z"/></svg>',
          download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>',
          arrow: window.__lxApprovedIcon("global-next")
        };

        function lxRenderIndustryMaterialSkin() {
          const icon = LX_MATERIAL_ICONS;
          const indFilters = ["全部", "制造", "能源/政府", "媒体/服务", "大型活动", "教育", "医疗", "金融", "交通"];
          const prodFilters = ["全部产品线", "ThinkPad", "ThinkBook", "服务器", "工作站", "台式机"];
          const videos = [
            { n: "ThinkPad X9 开箱与商务实测", dur: "03:42", prod: "ThinkPad", wm: "ThinkPad X9", img: "/assets/img/lxfd-gallery-1-1.jpg" },
            { n: "ThinkStation 工作站性能评测", dur: "05:18", prod: "工作站", wm: "ThinkStation", img: "/assets/img/lxfd-gallery-1-2.jpg" },
            { n: "ThinkBook 14+ 使用演示", dur: "02:56", prod: "ThinkBook", wm: "ThinkBook 14+", img: "/assets/img/lxfd-gallery-1-3.jpg" },
            { n: "ThinkSystem 服务器部署演示", dur: "06:30", prod: "服务器", wm: "ThinkSystem", img: "/assets/img/brand-20260626-2.jpg" }
          ];
          const whitepapers = [
            { n: "制造业智能化转型白皮书", sum: "产线 AI、研发仿真与数据中台的落地路径", pages: 42, ind: "制造" },
            { n: "政务信创合规建设指南", sum: "国产化替代、等保国密与政采资质要点", pages: 38, ind: "能源/政府" },
            { n: "教育数字化终端方案白皮书", sum: "云桌面、轻薄 AIPC 与国产化适配", pages: 31, ind: "教育" }
          ];
          const cases = [
            { o: "吉利汽车", t: "智能制造数字化转型", stats: [["90%", "国产化率"], ["3×", "研发提效"]], ind: "制造" },
            { o: "中石油", t: "央企信创与智能运维", stats: [["万台", "统一管理"], ["A 级", "CDP 评级"]], ind: "能源/政府" },
            { o: "新华社", t: "融媒体 AI 内容生产", stats: [["3×", "稿件效率"], ["端侧", "AIPC 推理"]], ind: "媒体/服务" },
            { o: "北京冬奥", t: "智慧观赛与运营保障", stats: [["0", "停机时长"], ["5G+AI", "实时分析"]], ind: "大型活动" }
          ];
          const manuals = [
            { n: "ThinkPad X 系列用户手册", model: "适用 X1 / X9 / X13", pages: 56, prod: "ThinkPad" },
            { n: "ThinkSystem 服务器规格书", model: "SR/ST 全系列", pages: 78, prod: "服务器" },
            { n: "ThinkStation 工作站规格书", model: "P3 / P5 / PX", pages: 64, prod: "工作站" },
            { n: "ThinkBook 系列用户手册", model: "14/16 / 14+/16+", pages: 48, prod: "ThinkBook" }
          ];
          const indTag = (text) => `<span class="tag ind">${esc(text)}</span>`;
          const prodTag = (text) => `<span class="tag prod">${esc(text)}</span>`;
          const filters = (label, items, grp) => `<div class="filters"><span class="flabel">${esc(label)}</span>${items.map((item, index) => `<button class="chip${index === 0 ? " on" : ""}" type="button" data-mat-filter="${esc(grp)}">${esc(item)}</button>`).join("")}</div>`;
          const thumb = (cls, wm, dur, img) => `<div class="thumb ${cls || ""}${img ? " has-img" : ""}">${img ? `<img class="thumb-img" src="${esc(img)}" alt="${esc(wm)}">` : ""}<div class="pbtn"><span>${icon.play}</span></div>${dur ? `<span class="dur">${esc(dur)}</span>` : ""}<span class="wm">${esc(wm)}</span></div>`;
          const section = (ic, title, count, isNew = false) => `<div class="sect"><span class="si">${ic}</span><span class="st">${esc(title)}</span>${isNew ? '<span class="new">新增</span>' : ""}</div>`;
          const videoCard = (item) => `<div class="vcard" data-mat-action="play">${thumb("", item.wm, item.dur, item.img)}<div class="vb"><div class="vn">${esc(item.n)}</div><div class="vmeta">${prodTag(item.prod)}</div></div></div>`;
          const docItem = (item, isManual) => `<div class="doc"><span class="dt">${icon.doc}<span class="ext">PDF</span></span><div class="dm"><div class="dn">${esc(item.n)}</div><div class="dd">${esc(isManual ? item.model : item.sum)}</div><div class="dmeta">${isManual ? prodTag(item.prod) : indTag(item.ind)}<span class="pages">${esc(item.pages)} 页</span></div></div><button class="dl dact" type="button" data-wp-download="${esc(item.n)}">${icon.download}下载</button></div>`;
          const caseCard = (item) => `<div class="ccard"><div class="co">${esc(item.o)}</div><div class="ct">${esc(item.t)}</div><div class="cstats">${item.stats.map((stat) => `<div class="cstat"><div class="cn">${esc(stat[0])}</div><div class="cl">${esc(stat[1])}</div></div>`).join("")}</div><div class="cmeta">${indTag(item.ind)}<button class="clink" type="button" data-quick-ask="详细介绍${esc(item.o)}${esc(item.t)}案例">查看详情 ${icon.arrow}</button></div></div>`;
          return `<section class="mat lx-material-skin" data-v="1" data-floor-cat="行业资料">
            ${filters("行业", indFilters, "ind")}
            ${filters("产品线", prodFilters, "prod")}
            ${section(icon.video, "产品视频", `${videos.length} 条 · 点击内嵌播放`)}
            <div class="vgrid">${videos.map(videoCard).join("")}</div>
            ${section(icon.doc, "行业白皮书", `${whitepapers.length} 份 · 标题+摘要+页数+下载`)}
            <div class="dlist">${whitepapers.map((item) => docItem(item, false)).join("")}</div>
            ${section(icon.manual, "产品手册", `${manuals.length} 份 · 标题+适用型号+下载`)}
            <div class="dgrid">${manuals.map((item) => docItem(item, true)).join("")}</div>
            <div class="mfoot-note"><span>三类资料：产品视频 / 行业白皮书 / 产品手册</span><span class="d"></span><span>视频点击内嵌播放</span><span class="d"></span><span>白皮书 / 手册支持下载</span></div>
          </section>`;
        }

        const LX_ENT_CUSTOM_ICONS = {
          chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/></svg>',
          arrow: window.__lxApprovedIcon("global-next"),
          check: window.__lxApprovedIcon("global-check"),
          cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
          laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.6"/><path d="M2 20h20"/></svg>',
          tower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="1.6"/><path d="M10 6h4M10 9h4"/><circle cx="12" cy="16" r="1.2"/></svg>',
          shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
          sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></svg>'
        };

        const LX_ENT_CUSTOM_FILTERS = [
          ["all", "全部"], ["flagship", "商用旗舰"], ["workstation", "移动工作站"],
          ["light", "轻薄商务"], ["desktop", "台式机"], ["value", "高性价比"]
        ];

        const LX_ENT_CUSTOM_SERIES = [
          { id: "xtes", cat: ["flagship"], icon: "laptop", name: "ThinkPad X/T/E/S 系列", scene: "商业领航 · 职场担当", price: "3999", cpu: "酷睿 Ultra 7 起", ram: "最高 64GB", ssd: "最高 2TB SSD", gpu: "集显", aMian: true, kezi: false, match: /ThinkPad|X1|T14|T16|E14|E16|S2/i },
          { id: "tp", cat: ["workstation", "flagship"], icon: "laptop", name: "ThinkPad P 系列", scene: "数据专家 · 专业工程师", price: "8999", cpu: "酷睿 Ultra 9 起", ram: "最高 96GB", ssd: "最高 4TB SSD", gpu: "RTX 3000 Ada", aMian: true, kezi: false, match: /ThinkPad\s*P|移动工作站|工作站/i },
          { id: "tc", cat: ["desktop"], icon: "tower", name: "ThinkCentre 台式机", scene: "台式机定制 · 影音达人", price: "3599", cpu: "酷睿 i7 起", ram: "最高 64GB", ssd: "最高 2TB SSD", gpu: "RTX 4060 Ti", aMian: false, kezi: false, match: /ThinkCentre|台式机|商用台式/i },
          { id: "tb", cat: ["light", "value"], icon: "laptop", name: "ThinkBook 14/16 系列", scene: "职场担当 · 创业者", price: "3999", cpu: "酷睿 Ultra 7 起", ram: "最高 64GB", ssd: "最高 2TB SSD", gpu: "集显", aMian: true, kezi: true, match: /ThinkBook\s*(14|16)(?!\+)/i },
          { id: "tbp", cat: ["light"], icon: "laptop", name: "ThinkBook 14+/16+ 系列", scene: "影音达人 · 创业者", price: "4999", cpu: "酷睿 Ultra 9 起", ram: "最高 32GB", ssd: "最高 2TB SSD", gpu: "RTX 4060", aMian: true, kezi: true, match: /ThinkBook.*(14\+|16\+|Plus)/i },
          { id: "ytl", cat: ["value", "light"], icon: "laptop", name: "扬天笔记本 系列", scene: "职场担当 · 创业者", price: "2999", cpu: "酷睿 i7 起", ram: "最高 32GB", ssd: "最高 1TB SSD", gpu: "集显", aMian: false, kezi: false, match: /扬天.*(笔记本|本)|YangTian.*Notebook/i },
          { id: "ytd", cat: ["desktop", "value"], icon: "tower", name: "扬天台式机 系列", scene: "职场担当 · 创业者", price: "3299", cpu: "酷睿 i7 起", ram: "最高 32GB", ssd: "最高 2TB SSD", gpu: "集显", aMian: false, kezi: false, match: /扬天.*(台式|主机)|YangTian.*Desktop/i }
        ];

        function lxFindEntCustomSku(series) {
          const pool = [...(state.products || []), ...Object.values(state.officialProducts || {})];
          const hit = pool.find((product) => {
            const text = `${product.name || ""} ${product.category || ""} ${product.description || ""}`;
            return series.match.test(text);
          });
          return hit?.sku || "";
        }

        function lxRenderEnterpriseCustomSkin() {
          const ico = LX_ENT_CUSTOM_ICONS;
          const cb = (yes, label) => `<span class="cb ${yes ? "yes" : "no"}">${yes ? ico.check : ico.cross}${esc(label)}</span>`;
          const cards = LX_ENT_CUSTOM_SERIES.map((series) => {
            const sku = lxFindEntCustomSku(series);
            const actionAttr = sku ? `data-open-product="${esc(sku)}"` : `data-quick-ask="帮我选配${esc(series.name)}企业定制方案"`;
            return `<article class="scard" data-cat="${esc(series.cat.join(" "))}" data-series="${esc(series.id)}">
              <div class="card-top"><span class="ico">${ico[series.icon]}</span><span class="scene">${esc(series.scene)}</span></div>
              <div class="sn">${esc(series.name)}</div>
              <div class="price"><span class="pl">参考价</span><span class="pv"><span class="cur">¥</span>${esc(series.price)}<span class="up">起</span></span></div>
              <div class="specs" aria-label="配置上限">
                <div class="srow"><span class="sk">处理器</span><span class="sv">${esc(series.cpu)}</span></div>
                <div class="srow"><span class="sk">内存</span><span class="sv">${esc(series.ram)}</span></div>
                <div class="srow"><span class="sk">硬盘</span><span class="sv">${esc(series.ssd)}</span></div>
                <div class="srow"><span class="sk">显卡</span><span class="sv">${esc(series.gpu)}</span></div>
              </div>
              <div class="cust">${cb(series.aMian, "A面定制")}${cb(series.kezi, "C面刻字")}</div>
              <button class="pick" type="button" ${actionAttr}>立即选配 ${ico.arrow}</button>
            </article>`;
          }).join("");
          const filterButtons = LX_ENT_CUSTOM_FILTERS.map(([key, label], index) => `<button class="chip${index === 0 ? " on" : ""}" type="button" data-entcustom-filter="${esc(key)}">${esc(label)}</button>`).join("");
          return `<section class="ec lx-entcustom-skin" data-v="2" data-floor-cat="企业定制">
            <div class="ec-hero"><div><span class="eyebrow">企业定制</span><h3>按业务场景选择系列，专业人员协助搭配</h3><p>保留当前 7 大系列、多配置自由定制、A 面定制 / C 面刻字能力，帮助企业从轻薄商务、移动工作站到台式办公快速进入选配。</p></div><div class="merits"><span class="merit">${ico.chat}<b>30分钟内响应</b></span><span class="merit">${ico.sliders}<b>多配置定制</b></span><span class="merit">${ico.shield}<b>原厂质保</b></span></div></div>
            <div class="filters"><span class="flabel">按场景</span>${filterButtons}</div>
            <div class="grid">${cards}</div>
            <div class="efoot"><span>7 大系列 · 多配置自由定制</span><span class="d"></span><span>A面定制 / C面刻字按系列支持</span><span class="d"></span><span>参考价为标品起价，最终以选配页为准</span></div>
          </section>`;
        }

        function lxGetSiteTabLabels(page = state.page) {
          const categoryLabels = ["personal", "business", "enterprise"].includes(page) ? [] : (LX_CATEGORY_MATCHERS[page] || []).map((m) => m.label || m[0]);
          const activityLabels = {
            personal: ["国补", "教育特惠", "会员", "私人定制", "以旧换新", "今日秒杀", "服务", "门店"],
            business: ["企业会员权益", "企业定制", "积分商城", "门店"],
            enterprise: ["行业解决方案", "行业资料"],
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
  const _sub = lxSubBrand(product.name, product.description);
  const _badge = _sub ? `<span class="lx-cat-badge">${esc(_sub)}</span>` : "";
  const _clean = cleanSpuName(product.name) || "联想商品";
  const _displayName = state.page === "business" ? compactSpuDisplayName(_clean) : _clean;
  const _spec = product.description || product.category || "官方正品｜联想服务";
  const _specLine = state.page === "business"
    ? `<p class="spec" title="${esc(_spec)}">${esc(compactProductSpec(_spec, product.category))}</p>`
    : `<p class="spec" title="${esc(_spec)}">${esc(_spec)}</p>`;
          const _fallbackImage = location.protocol === "file:" ? "../img/shop-1.jpg" : "/assets/img/shop-1.jpg";
          const _image = imgUrl(product.image_url);
          const _pick = `<button class="lx-pick-btn${(Array.isArray(state.refProducts) && state.refProducts.some(p => p.sku === product.sku)) ? " picked" : ""}" type="button" data-pick-sku="${esc(product.sku)}" title="引用这个商品提问" aria-label="引用商品" aria-pressed="${(Array.isArray(state.refProducts) && state.refProducts.some(p => p.sku === product.sku)) ? "true" : "false"}"><img src="../icons/global-check.svg" alt="" aria-hidden="true"></button>`;
          if (product.official) {
            return `<div class="lx-floor-product" data-open-product="${esc(product.sku)}">
            ${_pick}
            <div class="product-visual">${_badge}<img src="${esc(_image)}" alt="${esc(product.name || _clean)}" loading="lazy" onerror="this.onerror=null;this.src='${esc(_fallbackImage)}'" /></div>
    <h3 class="product-title" title="${esc(_clean)}">${esc(_displayName)}<span class="lx-official-tag">官方在售</span></h3>
    ${_specLine}
            <div class="price">${money(product.price)}${product.variants > 1 ? `<span class="price-from">${product.variants} 款配置</span>` : ""}</div>
            <button class="lx-p0-btn primary" type="button" data-open-product="${esc(product.sku)}" style="margin-top:8px;width:100%">立即购买</button>
          </div>`;
          }
          const tags = Array.isArray(product.promotion_tags) && product.promotion_tags.length ? product.promotion_tags : ["官方优惠", "限时优惠"];
          const promos = tags.slice(0, 2).map((tag) => `<span class="product-promo">${esc(tag)}</span>`).join("");
          return `<div class="lx-floor-product" data-open-product="${esc(product.sku)}">
            ${_pick}
            <div class="product-visual">${_badge}<img src="${esc(_image)}" alt="${esc(product.name || _clean)}" loading="lazy" onerror="this.onerror=null;this.src='${esc(_fallbackImage)}'" /></div>
    <h3 class="product-title" title="${esc(_clean)}">${esc(_displayName)}</h3>
    ${_specLine}
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

        // 全屋智能关键词：命中→全屋楼层；不命中→智能生活楼层
        // 6 大类（场景方案/照明/球机/安防/投影/存储）跨 category 捞货——这些货 category 五花八门
        //（投影设备/监控安防/灯具/智能生活…），靠关键词归拢；上架(active)后自动进楼层，无需改码。
        const LX_SMARTHOME_RE = /全屋智能|智能家居|智能照明|吸顶灯|智能灯|灯带|球机|云台|摄像机|摄像头|安防|门锁|门铃|网关|传感器|智能开关|智能插座|监控|智能投影|投影仪|个人云存储|家庭存储|私有云|NAS/;
        // 全屋智能楼层排除项：跳绳/洗手机/插排等被误打【联想全屋智能】前缀的非智能家居杂货
        const LX_SMARTHOME_EXCLUDE_RE = /跳绳|洗手机|插排|快充|轨道插|跑步|健身|运动/;

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
            label: "全屋智能",
            // 跨 category 捞 6 大类（场景方案/照明/球机/安防/投影/存储）；这些 category 之前没被任何楼层拉，故货全没展示
            categories: ["智能生活", "监控安防", "摄像监控", "投影设备", "灯具", "居家好物"],
            filter: (p) =>
              ["智能生活", "监控安防", "摄像监控", "投影设备", "灯具", "居家好物"].includes(p.category) &&
              LX_SMARTHOME_RE.test(`${p.name || ""} ${p.description || ""}`) &&
              !LX_SMARTHOME_EXCLUDE_RE.test(`${p.name || ""} ${p.description || ""}`) &&
              lxIsValidProduct(p),
          },
          {
            label: "配件/办公",
            categories: ["键鼠相关", "电脑外设与配件", "充电设备", "包袋", "耳机", "打印机及配件", "存储设备"],
            // 会议平板/大屏属 B 端商用，个人站不展示（无论它被标成哪个 category）
            filter: (p) => ["键鼠相关", "电脑外设与配件", "充电设备", "包袋", "耳机", "打印机及配件", "存储设备"].includes(p.category) && lxIsValidProduct(p) && !/会议平板|会议大屏|传屏器|电子白板|触控会议/.test(`${p.name || ""} ${p.description || ""}`),
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
            return /Thinkplus|ThinkPlus|thinkplus|think\+/i.test(text);
          }],
          ["ThinkCentre", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /ThinkCentre/i.test(text);
          }],
          ["扬天&瑞天", (p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /扬天|瑞天|YangTian/i.test(text) && !/服务|延保|保修|适用/i.test(text);
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

        function lxCatFloorVisibleCount() {
          const width = window.innerWidth || document.documentElement.clientWidth || 0;
          if (width >= 1920) return 12;
          if (width >= 1720) return 10;
          return 8;
        }

        // 渲染个人站品类楼层（标题 + 换一换 + 两排商品网格，无「查看更多」）
        function lxRenderCatFloor(floorDef, items) {
          const label = floorDef.label;
          const catKey = floorDef.categories.join(",");
          const visibleCount = lxCatFloorVisibleCount();
          // 始终最多渲染 12 个，宽度变化时可从 8/10 扩到 12；可见数量由 lxClampCatFloors 控制。
          const n = 12;
          const canShuffle = items.length > visibleCount;
          const shuffleBtn = `<button class="lx-cat-shuffle-btn" type="button" data-cat-shuffle="${esc(catKey)}" data-floor-label="${esc(label)}" ${canShuffle ? "" : "disabled"} title="换一批商品"><img class="lx-cat-shuffle-icon" src="../icons/global-refresh.svg?v=2026062504" alt="" aria-hidden="true" />换一换</button>`;
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
          const poolCount = Math.max(floorCount, 24); // 换一换要翻批，每楼层多备货
          const matching = (match, source = basePool) => uniq(source.filter(match)).slice(0, poolCount);
          const serviceProducts = sectionByKey.service || [];
          const desktopProducts = uniq([...(sectionByKey.smb || []), ...(sectionByKey.tianyi || []), ...basePool]).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return p.category === "台式机" || /ThinkCentre|扬天|瑞天|天逸|商用台式|台式机|主机|一体机/i.test(text);
          });
          const thinkCentreProducts = matching((p) => /ThinkCentre/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`));
          const yangtianProducts = uniq([...(sectionByKey.tianyi || []), ...basePool]).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return /扬天|瑞天|YangTian/i.test(text) && !/服务|延保|保修|适用/i.test(text);
          });
          const accessoryProducts = uniq(basePool).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return ["键鼠相关", "包袋", "打印机及配件", "配件", "显示器"].includes(p.category) || /配件|外设|鼠标|键盘|键鼠|扩展坞|ThinkVision|电源|适配器|背包|包|耳机|打印机|支架|会议屏/i.test(text);
          });
          const serviceStorageProducts = uniq([...serviceProducts, ...basePool]).filter((p) => {
            const text = `${p.category || ""} ${p.name || ""} ${p.description || ""}`;
            return p.category === "服务产品" || p.category === "存储" || /存储|Storage|DE\d+|DM\d+|ThinkSystem.*DM|数据恢复|保修|延保|上门|Lenovo Care|Care|服务产品|云智|流量|部署/i.test(text);
          });
          // The B-site API currently has no explicit Thinkplus assortment. Keep
          // this floor brand-pure instead of filling it with generic accessories.
          const thinkplusProducts = [
            { sku: "1012369", category: "电脑外设与配件", name: "thinkplus USB 五合一扩展坞", description: "USB 多功能扩展｜轻巧便携｜办公连接", price: 299, image_url: "https://p3.lefile.cn/product/adminweb/2020/12/17/ldjSd0oBKiwWCK7G83Dsefdib-6841.w520.jpg", url: "https://item.lenovo.com.cn/product/1012369.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1044410", category: "充电设备", name: "thinkplus 光影系列 140W 氮化镓多口充电器", description: "2C+A 三口输出｜PD 3.1｜140W 高功率", price: 499, image_url: "https://p2.lefile.cn/product/adminweb/2025/03/28/4wuaeYU6mZEYNjB3WLJ7kBKkU-5419.w520.JPEG", url: "https://item.lenovo.com.cn/product/1044410.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1051753", category: "充电设备", name: "thinkplus 65W 氮化镓三口充电器套装", description: "2C1A 三口输出｜含 1.5 米 100W 线", price: 199, image_url: "https://p3.lefile.cn/product/adminweb/2025/12/16/OEJYZZLkmjro93JhwA4XmwNJa-1106.w520.jpg", url: "https://item.lenovo.com.cn/product/1051753.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1046577", category: "键鼠相关", name: "thinkplus KM210 Pro 无线键鼠套装", description: "104 键全尺寸键盘｜无线鼠标｜黑色", price: 129, image_url: "https://p4.lefile.cn/product/adminweb/2025/06/09/X89QvGWr1Q0rMTFRk3QqSvIlM-5155.w520.png", url: "https://item.lenovo.com.cn/product/1046577.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1044432", category: "充电设备", name: "thinkplus GaN 二合一随身充 Pro 30W 黑色", description: "5000mAh 移动电源｜30W 快充｜充电器二合一", price: 299, image_url: "https://p3.lefile.cn/product/adminweb/2025/03/28/FtVtnhIXOGM6PDFa6FjBkRmUc-7655.w520.JPEG", url: "https://item.lenovo.com.cn/product/1044432.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1038217", category: "充电设备", name: "thinkplus USB-C 30W 氮化镓迷你充电器套装", description: "迷你便携｜USB-C 快充｜白色", price: 109, image_url: "https://p2.lefile.cn/product/adminweb/2024/06/28/AM5gjKTVwi9KAsvEtiovvF7Q4-5100.w520.jpg", url: "https://item.lenovo.com.cn/product/1038217.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1044370", category: "充电设备", name: "thinkplus 100W GaN USB-C 迷你适配器", description: "100W 高功率｜氮化镓技术｜笔记本快充", price: 349, image_url: "https://p3.lefile.cn/product/adminweb/2025/03/27/eQzXyIeuzYWQHxp54V975nX4B-6315.w520.jpg", url: "https://item.lenovo.com.cn/product/1044370.html", promotion_tags: ["联想官方", "Thinkplus"] },
            { sku: "1044430", category: "充电设备", name: "thinkplus GaN 二合一随身充 Pro 30W 紫色", description: "5000mAh 移动电源｜30W 快充｜充电器二合一", price: 299, image_url: "https://p1.lefile.cn/product/adminweb/2025/03/28/1piBTS51GUVs8cadzfAmNwmNW-9223.w520.JPEG", url: "https://item.lenovo.com.cn/product/1044430.html", promotion_tags: ["联想官方", "Thinkplus"] },
          ];
          const floorItems = {
            "ThinkPad": lxFillFloorProducts([...(sectionByKey.thinkpad || []), ...matching((p) => /ThinkPad/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`))], basePool, poolCount),
            "ThinkBook": lxFillFloorProducts([...(sectionByKey.thinkbook || []), ...matching((p) => /ThinkBook/i.test(`${p.category || ""} ${p.name || ""} ${p.description || ""}`))], basePool, poolCount),
            "Thinkplus": lxFillFloorProducts(thinkplusProducts, [], poolCount),
            "ThinkCentre": lxFillFloorProducts(thinkCentreProducts, [], poolCount),
            "扬天&瑞天": lxFillFloorProducts(yangtianProducts, [], poolCount),
            "配件&外设": lxFillFloorProducts(accessoryProducts, basePool, poolCount),
            "服务存储": lxFillFloorProducts(serviceStorageProducts, basePool, poolCount),
            "企业服务": lxFillFloorProducts([...serviceProducts, ...serviceStorageProducts], basePool, poolCount),
          };

          if (!state.floorAllItems) state.floorAllItems = {};
          return LX_BUSINESS_RECOMMEND_FLOORS.map(([label]) => {
            const items = floorItems[label] || [];
            if (!items.length) return "";  // 该类没货就不显示空楼层，不跨品类凑
            return lxRenderSiteCatFloor(label, "biz", items, "帮我推荐" + label + "里适合中小企业的产品");
          }).join("");
        }

        // business/enterprise 品类楼层：与个人站一致（标题 + 换一换 + 两排网格），换一换分页取全集下一批
        function lxRenderSiteCatFloor(label, sitePrefix, items, askText) {
          if (!state.floorAllItems) state.floorAllItems = {};
          const key = `${sitePrefix}:${label}`;
          state.floorAllItems[key] = items;                       // 存全集供换一换分页
          const visibleCount = lxCatFloorVisibleCount();
          const canShuffle = items.length > visibleCount;
          const shuffleBtn = `<button class="lx-cat-shuffle-btn" type="button" data-cat-shuffle="${esc(key)}" data-floor-label="${esc(label)}" data-floor-all="${esc(key)}" ${canShuffle ? "" : "disabled"} title="换一批商品"><img class="lx-cat-shuffle-icon" src="../icons/global-refresh.svg?v=2026062504" alt="" aria-hidden="true" />换一换</button>`;
          const cards = items.slice(0, 12).map(lxProductMiniCard).join("");
          return `<section class="lx-floor lx-cat-floor" data-floor-cat="${esc(label)}" data-cat-floor-key="${esc(key)}"><div class="lx-floor-head"><h3>${esc(label)}</h3>${shuffleBtn}</div><div class="lx-floor-products" data-cat-floor-grid="${esc(key)}">${cards}</div></section>`;
        }

        async function lxRenderEnterpriseRecommendFloors() {
          const site = API_SITE.enterprise || "biz";
          const pool = await lxEnsureFloorProducts(site, 120);
          // 融合 feed 货盘：/api/products?site=biz 只有服务器/服务，笔记本/台式机在 feed 里，
          // 不融进来这两个楼层永远空、显示不出来（政企也要有笔记本/台式机楼层）
          let feedProducts = [];
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`/api/site/feed?site=${encodeURIComponent(site)}`, { cache: "no-store", signal: controller.signal });
            clearTimeout(timer);
            const feed = await response.json();
            feedProducts = (Array.isArray(feed.sections) ? feed.sections : []).flatMap((s) => Array.isArray(s.products) ? s.products : []);
          } catch {}
          const merged = [...feedProducts, ...pool, ...(Array.isArray(state.siteProducts) ? state.siteProducts : []), ...(Array.isArray(state.products) ? state.products : [])];
          const seen = new Set();
          const source = merged.filter((p) => { const k = lxProductKey(p); if (!p || seen.has(k)) return false; seen.add(k); return true; });
          if (!source.length) return "";
          const used = new Set();
          const floorCount = lxFloorProductCount();
          return (LX_CATEGORY_MATCHERS.enterprise || []).map(([label, match]) => {
            // 换一换要能翻批，多取一些（不止两排），全集存起来分页
            const items = lxPickFloorProducts(source, match, used, Math.max(floorCount, 24));
            if (!items.length) return "";  // 该类没货就不显示空楼层
            return lxRenderSiteCatFloor(label, "gov", items, "帮我推荐" + label + "里适合政教及大企业的产品");
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
  const page = state.page;
  if (page === "personal" && document.body?.dataset.personalProductsEnabled !== "true") {
    grid.hidden = true;
    const existingBox = document.querySelector("[data-site-floors]");
    if (existingBox) {
      existingBox.hidden = true;
      existingBox.innerHTML = "";
    }
    return;
  }
  let box = document.querySelector("[data-site-floors]");
          if (!box) {
            box = document.createElement("div");
            box.className = "lx-site-floors";
            box.setAttribute("data-site-floors", "");
            grid.after(box);
          }
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
	              const personalRecommendHtml = await lxRenderPersonalRecommendFloors();
	              if (state.page !== page || state.activeSiteFloorTab !== activeFloorTab) return;
	              box.innerHTML = personalRecommendHtml;
	              lxRetryEmptyRecommendFloors(page, box);
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
	              const businessRecommendHtml = await lxRenderBusinessRecommendFloors();
	              if (state.page !== page || state.activeSiteFloorTab !== activeFloorTab) return;
	              box.innerHTML = businessRecommendHtml;
	              lxRetryEmptyRecommendFloors(page, box);
              lxSyncCategoryTabs();
              requestAnimationFrame(() => { lxClampCatFloors(box); lxSyncCategoryTabsStuck(); });
              lxObserveFloors(box); // 换一换/分屏列数变化时重夹两排
              return;
            }
            if (page === "enterprise") {
              grid.hidden = true;
              box.hidden = false;
	              box.classList.remove("lx-personal-rec-floors", "lx-business-rec-floors");
	              box.classList.add("lx-enterprise-rec-floors");
	              const enterpriseRecommendHtml = await lxRenderEnterpriseRecommendFloors();
	              if (state.page !== page || state.activeSiteFloorTab !== activeFloorTab) return;
	              box.innerHTML = enterpriseRecommendHtml;
	              lxRetryEmptyRecommendFloors(page, box);
              lxSyncCategoryTabs();
              requestAnimationFrame(() => { lxClampCatFloors(box); lxSyncCategoryTabsStuck(); });
              lxObserveFloors(box); // 换一换/分屏列数变化时重夹两排
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
          const categoryLabels = (LX_CATEGORY_MATCHERS[page] || []).map(([label]) => label);
          const categoryFloors = page === "personal" || !categoryLabels.includes(activeFloorTab) ? "" : await lxRenderCategoryFloors(box, activeFloorTab);
          if (state.page !== page || state.activeSiteFloorTab !== activeFloorTab) return;
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
            const storeCards = lxRenderStoreZone([], { loading: true });
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

            const serviceCards = `<h4 class="lx-gb-sub-title">服务项目</h4><div class="lx-pale-grid">${serviceGrid}</div><h4 class="lx-gb-sub-title">服务流程</h4><div class="lx-ia-cards-row">${serviceSteps}</div><h4 class="lx-gb-sub-title">保修查询</h4>${serviceSnRow}<h4 class="lx-gb-sub-title">服务承诺</h4>${servicePromise}`;
            const memberCards = [
              ["1000", "≈ ¥10", "乐豆抵现", "1000 乐豆抵 ¥10，购物即赚", "我的乐豆余额和会员权益有哪些？"],
              ["button", "一键领取", "领券中心", "新人券、品类券一键领取", "现在有哪些优惠券可以领？"]
            ].map(([num, unit, title, desc, ask]) => `<article class="lx-member-card" data-quick-ask="${esc(ask)}" tabindex="0"><div><h4>${esc(title)}</h4><p>${esc(desc)}</p></div><strong>${esc(num)}<small>${esc(unit)}</small></strong></article>`).join("");
            const seckillEnd = lxSeckillCountdown();
            // 国补楼层：城市定位/切换 + 国补领取 + 国补商品两排展示
            const gbProductPool = (state.products || []).filter((p) => /小新|YOGA|ThinkPad|ThinkBook|拯救者|LEGION|GeekPro|轻薄|昭阳|台式|天逸|扬天|开天|启天|平板|Tab|moto|ThinkVision|显示器/.test(p.name || ""));
            const gbSt = lxGbState();
            const gbVerified = gbSt.realVerified && gbSt.claimed;
            const gbCityBlock = `<section class="lx-gb-block lx-gb-location" aria-label="城市定位与切换">
              <div class="lx-gb-block-copy"><span class="lx-gb-kicker">01 城市定位</span><h4>按你所在城市匹配国补资格</h4><p>当前城市会影响可领取资格、补贴目录和可核销商品。</p></div>
              <div class="lx-gb-city-card"><span>当前城市</span><strong data-gb-city>${esc(gbSt.city || "正在定位你所在城市…")}</strong><button class="lx-p0-btn" type="button" data-city-picker>切换城市</button></div>
            </section>`;
            const gbClaimBlock = gbVerified
              ? `<section class="lx-gb-block lx-gb-claim is-verified" aria-label="国补领取状态">
                <div class="lx-gb-block-copy"><span class="lx-gb-kicker">02 国补领取</span><h4>资格已绑定，可直接选购核销</h4><p><strong>${esc(gbSt.city || "当前城市")}</strong> · ${esc(gbSt.boundCat || "笔记本")} 类目 · 结算时按活动规则自动抵扣。</p></div>
                <div class="lx-gb-claim-actions"><span class="lx-auth-badge ok">已领取</span><button type="button" class="lx-auth-reset" data-gb-reset>重置认证（演示）</button></div>
              </section>`
              : `<section class="lx-gb-block lx-gb-claim" aria-label="国补领取">
                <div class="lx-gb-block-copy"><span class="lx-gb-kicker">02 国补领取</span><h4>完成实名后领取国补资格</h4><p>领取后会按城市与类目匹配可核销商品，最高补贴 20%。</p></div>
                <div class="lx-gb-claim-actions"><span class="lx-auth-badge">未领取</span><button class="lx-p0-btn primary" type="button" data-gb-auth>立即实名认证领资格</button></div>
              </section>`;
            const gbSortedPool = lxSortByCartCat(gbProductPool, gbVerified ? (gbSt.boundCat || "") : "");
            const gbProductGrid = `<section class="lx-gb-block lx-gb-products-block" aria-label="国补对应商品列表">
              <div class="lx-gb-products-head"><div><span class="lx-gb-kicker">03 商品列表</span><h4>${gbVerified ? "支持该资格的商品" : "参与国补商品"}</h4></div><p>按推荐商品卡片的 4 / 5 / 6 列规则展示两排。</p></div>
              <div class="lx-floor-products lx-guobu-products">${gbSortedPool.slice(0, 12).map(lxProductMiniCard).join("") || `<div class="lx-p0-disclaimer" style="grid-column:1/-1;padding:16px 0;text-align:center">货盘加载中（POC 演示）</div>`}</div>
            </section>`;
            const gbBody = `<div class="lx-guobu-redesign">${gbCityBlock}${gbClaimBlock}${gbProductGrid}</div>`;
            const guobuSection = lxFloorSection("国补",
              gbVerified ? "国补资格已绑定 · 最高补贴 20%" : "国家补贴 · 最高补贴 20%",
              gbBody,
              ""
            );

            // 教育特惠楼层：3 态（未认证/已认证/已失效）
            const stuState = lxStuState();
            const _eduNow = Date.now();
            const _eduExpiry = stuState.submittedAt ? stuState.submittedAt + 365 * 86400000 : 0;
            // 态判断：none/pending→未认证；verified且未过期→已认证；verified且已过期→已失效
            const eduAuthMode = stuState.status === "verified"
              ? (_eduExpiry > _eduNow ? "verified" : "expired")
              : (stuState.status === "pending" ? "pending" : "none");
            const isEduVerified = eduAuthMode === "verified";
            const isEduExpired = eduAuthMode === "expired";
            const eduVerifiedDate = _eduExpiry > 0
              ? new Date(_eduExpiry).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
              : "2027年6月21日";
            const _eduRemainDays = _eduExpiry > _eduNow ? Math.ceil((_eduExpiry - _eduNow) / 86400000) : 0;
            // 教育特惠楼层：教育认证 + 符合教育认证商品两排展示
            const eduStatusLabel = isEduVerified ? "已认证" : (isEduExpired ? "已失效" : (eduAuthMode === "pending" ? "审核中" : "未认证"));
            const eduStatusClass = isEduVerified ? "ok" : (isEduExpired ? "expired" : (eduAuthMode === "pending" ? "pending" : ""));
            const eduAuthTitle = isEduVerified ? "教育认证已生效" : (isEduExpired ? "教育认证已失效" : (eduAuthMode === "pending" ? "认证资料审核中" : "完成教育认证后享专属价"));
            const eduAuthDesc = isEduVerified
              ? `认证有效期至 ${esc(eduVerifiedDate)}，剩余 <strong>${_eduRemainDays}</strong> 天，教育专享价已生效。`
              : (isEduExpired
                ? `认证已于 ${esc(eduVerifiedDate)} 到期，重新认证后恢复教育专享商品权益。`
                : (eduAuthMode === "pending"
                  ? "资料已提交，审核通过后自动解锁教育专享价与学生/教师专属商品。"
                  : "学生/教师完成认证后，可查看并购买符合教育认证的专享商品。"));
            const eduAuthAction = isEduVerified
              ? `<button type="button" class="lx-auth-reset" data-stu-reset>重置认证（演示）</button>`
              : `<button class="lx-p0-btn primary" type="button" data-stu-auth>${isEduExpired ? "重新认证" : (eduAuthMode === "pending" ? "查看进度" : "立即认证")}</button>`;
            const eduAuthBlock = `<section class="lx-edu-block lx-edu-auth-block" aria-label="教育认证模块">
              <div class="lx-edu-block-copy"><span class="lx-edu-kicker">01 教育认证</span><h4>${eduAuthTitle}</h4><p>${eduAuthDesc}</p></div>
              <div class="lx-edu-auth-actions"><span class="lx-edu-status ${eduStatusClass}">${eduStatusLabel}</span>${eduAuthAction}</div>
            </section>`;
            const eduProductSource = [...(state.products || []), ...(state.siteProducts || []), ...(state.floorProducts || []), ...Object.values(state.officialProducts || {})];
            const eduSeenSku = new Set();
            const eduProductPool = eduProductSource.filter((p) => {
              const sku = p && (p.sku || p.id || p.name);
              if (!p || !sku || eduSeenSku.has(sku)) return false;
              eduSeenSku.add(sku);
              const text = `${p.name || ""} ${p.description || ""} ${(p.promotion_tags || []).join(" ")} ${p.category || ""}`;
              return /教育|学生|小新|YOGA|Yoga|平板|Pad|轻薄|ThinkPad|ThinkBook|拯救者|LEGION|昭阳|笔记本|AI PC|AIPC|Air|Pro/i.test(text);
            });
            const eduSortedPool = lxSortByCartCat(eduProductPool);
            const eduProductGrid = `<section class="lx-edu-block lx-edu-products-block" aria-label="符合教育认证的商品列表">
              <div class="lx-edu-products-head"><div><span class="lx-edu-kicker">02 商品列表</span><h4>符合教育认证的商品</h4></div><p>按推荐商品卡片的 4 / 5 / 6 列规则展示两排。</p></div>
              <div class="lx-floor-products lx-edu-products">${eduSortedPool.slice(0, 12).map(lxProductMiniCard).join("") || `<div class="lx-p0-disclaimer" style="grid-column:1/-1;padding:16px 0;text-align:center">货盘加载中（POC 演示）</div>`}</div>
            </section>`;
            const eduBody = `<div class="lx-edu-redesign">${eduAuthBlock}${eduProductGrid}</div>`;
            const eduSection = lxFloorSection("教育特惠",
              isEduVerified ? "教育专享价已生效" : (isEduExpired ? "认证已失效 · 重新认证恢复权益" : "学生教师专属价 · 认证即享"),
              eduBody,
              ""
            );

            const memberFloorSection = lxRenderVipSkin();

            // 私人定制楼层
            const customTypes = [
              ["外观喷绘", "个性图案/品牌logo/艺术设计，定制机身", "我想做联想笔记本外观喷绘，能定制什么样的图案？"],
              ["激光刻字", "机身背面刻字，永久留存纪念", "联想激光刻字定制怎么做，价格多少？"],
              ["配色定制", "机身颜色自选，专属配色方案", "联想笔记本配色定制有哪些颜色可以选？"],
              ["CTO高配", "升级CPU/内存/存储，真正的高配机", "帮我做CTO高配定制，能升级哪些配置？"],
              ["键盘定制", "按键布局、背光颜色、键帽自定义", "联想键盘定制有哪些选项？"],
              ["限定联名", "与艺术家/品牌联名限定款", "联想现在有哪些限定联名款可以购买？"]
            ].map(([t, d, a]) => quickCard(t, d, a)).join("");

            const customProductSource = [...(state.products || []), ...(state.siteProducts || []), ...(state.floorProducts || []), ...Object.values(state.officialProducts || {})];
            const customSeenSku = new Set();
            const customProductPool = customProductSource.filter((p) => {
              const sku = p && (p.sku || p.id || p.name);
              if (!p || !sku || customSeenSku.has(sku)) return false;
              customSeenSku.add(sku);
              const text = `${p.name || ""} ${p.description || ""} ${(p.promotion_tags || []).join(" ")} ${p.category || ""}`;
              return /定制|CTO|高配|拯救者|LEGION|ThinkPad|ThinkBook|YOGA|小新|昭阳|笔记本|AI PC|AIPC|Ultra|Pro|Air/i.test(text);
            });
            const customSortedPool = lxSortByCartCat(customProductPool);
            const customProductGrid = `<section class="lx-custom-products-block" aria-label="热门定制商品">
              <div class="lx-custom-products-head"><div><span class="lx-custom-kicker">热门定制商品</span><h4>适合外观与配置定制的机型</h4></div><p>按推荐商品卡片的 4 / 5 / 6 列规则展示两排。</p></div>
              <div class="lx-floor-products lx-custom-products">${customSortedPool.slice(0, 12).map(lxProductMiniCard).join("") || `<div class="lx-p0-disclaimer" style="grid-column:1/-1;padding:16px 0;text-align:center">货盘加载中（POC 演示）</div>`}</div>
            </section>`;

            const customSection = lxFloorSection("私人定制",
              "外观喷绘 · 刻字 · 配色 · 高配升级",
              `<h4 class="lx-gb-sub-title">定制类型</h4><div class="lx-pale-grid">${customTypes}</div>${customProductGrid}`,
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
              "服务": lxFloorSection("服务", "官方售后 · 原厂配件 · 全国联保", serviceCards, `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我预约联想售后服务">预约服务</button><button class="lx-p0-btn" type="button" data-floor-action="service">服务中心</button>`),
              "门店": lxFloorSection("门店", "附近门店 · 到店体验 · 专属权益", storeCards, `<button class="lx-p0-btn primary" type="button" data-quick-ask="帮我查询并推荐最近的联想门店">找附近门店</button>`),
            };
            box.innerHTML = activitySections[activeFloorTab] || "";
            // 国补城市异步填充（进 tab 后 geo 定位，回填城市名）
            if (activeFloorTab === "国补") {
              lxResolveCoord().then((coord) => {
                if (state.page !== "personal" || state.activeSiteFloorTab !== "国补") return;
                const cityEl = box.querySelector("[data-gb-city]");
                if (!cityEl) return;
                if (coord?.city) { cityEl.textContent = coord.city; return; }
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
              lxResolveCoord().then((coord) => {
                if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                const lat = coord?.lat ?? 39.9042;
                const lng = coord?.lng ?? 116.4074;
                fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&limit=5`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                    const stores = data.stores || data || [];
                    if (!stores.length) {
                      box.innerHTML = lxRenderStoreZone(lxFallbackStores(), { lat, lng });
                      return;
                    }
                    box.innerHTML = lxRenderStoreZone(stores.slice(0, 3), { lat, lng });
                  })
                  .catch(() => {
                    if (state.page !== "personal" || state.activeSiteFloorTab !== "门店") return;
                    box.innerHTML = lxRenderStoreZone(lxFallbackStores(), { lat, lng });
                  });
              }).catch(() => {});
            }
          } else if (page === "business") {
            const activitySections = {
	              "企业会员权益": lxRenderQyBenefitSkin(),
	              "企业定制": lxRenderEnterpriseCustomSkin(),
	              "积分商城": lxRenderEntPointsMallHtml(),
	              "门店": lxRenderStoreZone(lxFallbackStores(), {}),
	            };
            box.innerHTML = activitySections[activeFloorTab] || "";
          } else {
            const activitySections = {
              "行业解决方案": lxRenderIndustrySolutionSkin(state.industrySolutionIndex || 0),
              "行业资料": lxRenderIndustryMaterialSkin(),
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

        // ── 国补状态（POC mock）──────────────────────────────────────────
        const LX_GB_KEY = "lexiang.guobu.v1";
        function lxGbState() {
          try {
            const raw = JSON.parse(localStorage.getItem(LX_GB_KEY) || "null");
            return (raw && typeof raw === "object") ? raw : { realVerified: false, claimed: false };
          } catch { return { realVerified: false, claimed: false }; }
        }
        function lxSaveGbState(gb) {
          try { localStorage.setItem(LX_GB_KEY, JSON.stringify(gb)); } catch {}
        }

        // ── 商品行为排序（POC：仅用 cart 品类作信号）─────────────────────
        // ponytail: POC 只有 cart 作行为信号，收藏/浏览品类无埋点，接埋点另说
        function lxSortByCartCat(products, priorityCat) {
          const cartCats = new Set((state.cart || []).map((p) => p.category).filter(Boolean));
          if (priorityCat) cartCats.add(priorityCat); // 国补态B额外优先 boundCat
          if (!cartCats.size) return products;
          const inCart = products.filter((p) => cartCats.has(p.category));
          const rest = products.filter((p) => !cartCats.has(p.category));
          return [...inCart, ...rest];
        }

        function lxSaveStuState(stu) {
          try { localStorage.setItem(LX_STU_KEY, JSON.stringify(stu)); } catch {}
          if (state.activeTabId === "info:edu") openEduZone();
        }

        function openStudentAuth(kind) {
          if (!kind) kind = 'college';
          const stu = lxStuState();
          if (stu.status === "verified") {
            openModal("教育认证已通过", `
              <div class="lx-lead-modal lx-edu-success-lead">
                <p class="lx-lead-subtitle">认证信息已同步，以下教育权益现已生效。</p>
                <div class="lx-edu-success-summary" aria-label="教育认证结果">
                  <div class="lx-edu-success-user">
                    <span class="lx-edu-success-mark" aria-hidden="true">✓</span>
                    <div><small>认证用户</small><strong>${esc(stu.name || "用户")}</strong><p>教育身份权益已绑定至当前会员账号</p></div>
                    <span class="lx-edu-success-status"><i></i>认证已通过</span>
                  </div>
                  <div class="lx-edu-success-benefits">
                    <div><span>教育专享价</span><strong>已生效</strong></div>
                    <div><span>身份权益</span><strong>已绑定</strong></div>
                  </div>
                </div>
                <p class="lx-edu-success-disclaimer">认证结果以正式身份核验信息为准。</p>
                <div class="lx-lead-actions">
                  <button class="lx-lead-cancel" type="button" data-modal-close>关闭</button>
                  <button class="lx-lead-submit" type="button" data-edu-zone>进入教育特惠专区</button>
                </div>
              </div>`, { skin: "lead" });
            return;
          }
          if (stu.status === "pending") {
            openModal("教育认证审核中", `<div class="lx-ent-status pending">「${esc(stu.name || "")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境约 12 秒自动通过；正式环境 1-5 天，结果在教育专区与本弹窗回显。</p>`);
            return;
          }

          let authRole = kind === 'gaokao' ? 'gaokao' : (kind === 'teacher' ? 'teacher' : 'college');
          function defaultTabForRole(role) {
            if (role === 'teacher') return 'teacherEmail';
            if (role === 'gaokao') return 'real';
            return 'email';
          }
          let stuTab = defaultTabForRole(authRole);
          const stuData = { name: '', idcard: '', phone: '18910864473', email: '', school: '', gradYear: '', degree: '', cardNo: '', stage: '', examNo: '', teacherNo: '', subject: '', agree: false };

          function stuTabsHtml() {
            const roles = [
              { id: 'college', label: '在校生认证', desc: '学生身份核验，解锁学生专享价' },
              { id: 'teacher', label: '教师认证', desc: '教师身份核验，享教师专属权益' },
              { id: 'gaokao', label: '高考生认证', desc: '高考生身份核验，享升学购机优惠' },
            ];
            const roleMeta = roles.find(r => r.id === authRole) || roles[0];
            const roleSwitch = '<div class="lx-stuauth-roles" role="tablist" aria-label="教育认证身份类型">' + roles.map(r =>
              `<button class="lx-stuauth-role${authRole === r.id ? ' active' : ''}" type="button" role="tab" aria-selected="${authRole === r.id ? 'true' : 'false'}" data-stuauth-role="${r.id}"><strong>${r.label}</strong><span>${r.desc}</span></button>`
            ).join('') + '</div>';

            const tabMap = {
              college: [
                { id: 'email', label: 'edu邮箱认证', desc: '使用学校 edu 邮箱收取验证邮件' },
                { id: 'card', label: '学生证认证', desc: '上传学生证信息完成校验' },
                { id: 'wechat', label: '微信学籍', desc: '通过微信授权核验学籍状态' },
              ],
              teacher: [
                { id: 'teacherEmail', label: '单位邮箱认证', desc: '使用学校或教育机构邮箱收取验证邮件' },
                { id: 'teacherCard', label: '教师证认证', desc: '上传教师资格证或工牌信息' },
                { id: 'teacherWechat', label: '微信认证', desc: '通过微信授权核验教师身份' },
              ],
              gaokao: [
                { id: 'real', label: '实名认证', desc: '填写实名信息与考生号' },
                { id: 'skip', label: '考生号认证', desc: '跳过实名，仅凭考生号完成认证' },
              ],
            };
            const tabs = tabMap[authRole] || tabMap.college;
            if (!tabs.some(t => t.id === stuTab)) stuTab = defaultTabForRole(authRole);
            const activeTab = tabs.find(t => t.id === stuTab) || tabs[0];
            const tabBar = '<div class="lx-stuauth-tabs" role="tablist" aria-label="认证方式">' + tabs.map(t =>
              `<button class="lx-stuauth-tab${stuTab === t.id ? ' active' : ''}" type="button" role="tab" aria-selected="${stuTab === t.id ? 'true' : 'false'}" data-stuauth-tab="${t.id}"><strong>${t.label}</strong><span>${t.desc}</span></button>`
            ).join('') + '</div>';

            let body = '';
            if (authRole === 'college' && stuTab === 'email') {
              body = '<div class="lx-stuauth-form">' +
                '<label class="lx-stuauth-field"><span>学校名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入学校名称" value="' + esc(stuData.school) + '"></label>' +
                '<label class="lx-stuauth-field"><span>毕业时间</span><input class="lx-p0-field" id="saGradYear" placeholder="如 2026-07" value="' + esc(stuData.gradYear) + '"></label>' +
                '<label class="lx-stuauth-field"><span>学历</span><select class="lx-p0-field lx-wpa-select" id="saDegree"><option value="">请选择学历</option>' +
                ['专科','本科','硕士','博士'].map(d => `<option value="${d}"${stuData.degree===d?' selected':''}>${d}</option>`).join('') +
                '</select></label>' +
                '<label class="lx-stuauth-field"><span>edu 邮箱</span><input class="lx-p0-field" id="saEmail" placeholder="name@school.edu.cn" value="' + esc(stuData.email) + '"></label>' +
                '<div class="lx-stuauth-note"><strong>验证提醒</strong><span>验证邮件将发送至上述 edu 邮箱，请注意查收。</span></div>' +
                '</div>';
            } else if (authRole === 'college' && stuTab === 'card') {
              body = '<div class="lx-stuauth-form two-col">' +
                '<label class="lx-stuauth-field"><span>真实姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入真实姓名" value="' + esc(stuData.name) + '"></label>' +
                '<label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="' + esc(stuData.idcard) + '"></label>' +
                '<label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label>' +
                '<label class="lx-stuauth-field"><span>学生证号</span><input class="lx-p0-field" id="saCardNo" placeholder="请输入学生证号" value="' + esc(stuData.cardNo) + '"></label>' +
                '<label class="lx-stuauth-field"><span>教育阶段</span><select class="lx-p0-field lx-wpa-select" id="saStage"><option value="">请选择教育阶段</option>' +
                ['小学','初中','高中','专科','本科','硕士','博士'].map(d => `<option value="${d}"${stuData.stage===d?' selected':''}>${d}</option>`).join('') +
                '</select></label>' +
                '<label class="lx-stuauth-field"><span>毕业时间</span><input class="lx-p0-field" id="saGradYear2" placeholder="如 2026-07" value="' + esc(stuData.gradYear) + '"></label>' +
                '<div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传学生证照片</strong><em>支持 JPG/PNG，仅用于演示</em></div>' +
                '</div>';
            } else if (authRole === 'college' && stuTab === 'wechat') {
              body = '<div class="lx-stuauth-wechat"><p>授权微信获取学籍状态，系统反馈验证结果。扫描下方小程序或 App 二维码完成授权。</p><div class="lx-stuauth-qr-row"><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>乐享小程序</strong><span>扫码进入认证</span></div><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>联想 App</strong><span>授权学籍信息</span></div></div><button class="lx-p0-btn lx-stuauth-status-btn" type="button" data-stuauth-wechat-done>我已认证，查看认证状态</button></div>';
            } else if (authRole === 'teacher' && stuTab === 'teacherEmail') {
              body = '<div class="lx-stuauth-form">' +
                '<label class="lx-stuauth-field"><span>学校 / 机构名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入任教学校或机构" value="' + esc(stuData.school) + '"></label>' +
                '<label class="lx-stuauth-field"><span>任教学科</span><input class="lx-p0-field" id="saSubject" placeholder="如 计算机 / 数学" value="' + esc(stuData.subject) + '"></label>' +
                '<label class="lx-stuauth-field"><span>教师姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入教师姓名" value="' + esc(stuData.name) + '"></label>' +
                '<label class="lx-stuauth-field"><span>单位邮箱</span><input class="lx-p0-field" id="saEmail" placeholder="name@school.edu.cn" value="' + esc(stuData.email) + '"></label>' +
                '<div class="lx-stuauth-note"><strong>教师权益</strong><span>认证后可享教师专属教育价、采购咨询和服务权益。</span></div>' +
                '</div>';
            } else if (authRole === 'teacher' && stuTab === 'teacherCard') {
              body = '<div class="lx-stuauth-form two-col">' +
                '<label class="lx-stuauth-field"><span>教师姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入教师姓名" value="' + esc(stuData.name) + '"></label>' +
                '<label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="' + esc(stuData.idcard) + '"></label>' +
                '<label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label>' +
                '<label class="lx-stuauth-field"><span>教师资格证号</span><input class="lx-p0-field" id="saTeacherNo" placeholder="请输入教师资格证号" value="' + esc(stuData.teacherNo) + '"></label>' +
                '<label class="lx-stuauth-field"><span>学校 / 机构名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入任教学校或机构" value="' + esc(stuData.school) + '"></label>' +
                '<label class="lx-stuauth-field"><span>任教学科</span><input class="lx-p0-field" id="saSubject" placeholder="如 计算机 / 数学" value="' + esc(stuData.subject) + '"></label>' +
                '<div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传教师资格证或工牌</strong><em>支持 JPG/PNG，仅用于演示</em></div>' +
                '</div>';
            } else if (authRole === 'teacher' && stuTab === 'teacherWechat') {
              body = '<div class="lx-stuauth-wechat"><p>授权微信获取教师身份状态，系统反馈验证结果。扫描下方小程序或 App 二维码完成授权。</p><div class="lx-stuauth-qr-row"><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>乐享小程序</strong><span>扫码进入教师认证</span></div><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>联想 App</strong><span>授权教师信息</span></div></div><button class="lx-p0-btn lx-stuauth-status-btn" type="button" data-stuauth-wechat-done>我已认证，查看认证状态</button></div>';
            } else if (authRole === 'gaokao' && stuTab === 'real') {
              body = '<div class="lx-stuauth-form two-col">' +
                '<div class="lx-stuauth-validity">高考生认证有效期至 10 月 31 日</div>' +
                '<label class="lx-stuauth-field"><span>真实姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入真实姓名" value="' + esc(stuData.name) + '"></label>' +
                '<label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="' + esc(stuData.idcard) + '"></label>' +
                '<label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label>' +
                '<label class="lx-stuauth-field"><span>考生号 / 准考证号</span><input class="lx-p0-field" id="saExamNo" placeholder="请输入考生号或准考证号" value="' + esc(stuData.examNo) + '"></label>' +
                '<div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传准考证照片</strong><em>支持 JPG/PNG，仅用于演示</em></div>' +
                '</div>';
            } else {
              body = '<div class="lx-stuauth-form"><div class="lx-stuauth-note"><strong>轻量认证</strong><span>可跳过实名验证，直接凭考生号认证高考生身份，享教育专享价。</span></div><label class="lx-stuauth-field"><span>考生号 / 准考证号</span><input class="lx-p0-field" id="saExamNo" placeholder="请输入考生号或准考证号" value="' + esc(stuData.examNo) + '"></label></div>';
            }

            const agree = '<label class="lx-stuauth-agree"><input type="checkbox" id="saAgree"' + (stuData.agree ? ' checked' : '') + '> <span>已阅读并同意联想<a href="#" onclick="return false">《服务须知》</a>和<a href="#" onclick="return false">《活动规则》</a></span></label>';
            const btns = '<div class="lx-stuauth-actions"><button class="lx-p0-btn" type="button" data-modal-close>取消</button><button class="lx-p0-btn primary" type="button" data-stuauth-submit>立即认证</button></div>';
            const disclaimer = '<p class="lx-stuauth-disclaimer">POC 演示流程，不真实提交，演示约 12 秒自动通过。</p>';
            return '<div class="lx-stuauth-modal">' +
              roleSwitch + tabBar +
              '<div class="lx-stuauth-panel"><div class="lx-stuauth-panel-head"><strong>' + roleMeta.label + ' · ' + activeTab.label + '</strong><span>' + activeTab.desc + '</span></div>' + body + '</div>' +
              agree + btns + disclaimer +
              '</div>';
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
            stuData.teacherNo = (document.getElementById('saTeacherNo')?.value || '').trim();
            stuData.subject = (document.getElementById('saSubject')?.value || '').trim();
          }

          function stuRender() {
            openModal('教育认证', stuTabsHtml(), { skin: 'lead' });
            const mask = document.querySelector('.lx-p0-modal-mask');
            if (mask) mask.addEventListener('click', stuHandleClick, true);
          }

          function stuHandleClick(e) {
            const roleBtn = e.target.closest('[data-stuauth-role]');
            if (roleBtn) {
              stuCollect();
              authRole = roleBtn.getAttribute('data-stuauth-role') || 'college';
              stuTab = defaultTabForRole(authRole);
              stuRender();
              return;
            }
            const tabBtn = e.target.closest('[data-stuauth-tab]');
            if (tabBtn) {
              stuCollect();
              stuTab = tabBtn.getAttribute('data-stuauth-tab');
              stuRender();
              return;
            }
            if (e.target.closest('[data-modal-close]')) {
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              closeModal();
              return;
            }
            if (e.target.closest('[data-stuauth-wechat-done]')) {
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              closeModal();
              toast('认证状态确认中，演示约 12 秒自动通过');
              lxSaveStuState({ status: 'pending', name: '演示用户', kind: authRole, submittedAt: Date.now() });
              setTimeout(() => {
                if (lxStuState().status === 'verified') {
                  toast('教育认证已通过，教育专享价已生效');
                  if (state.activeTabId === 'info:edu') openEduZone();
                }
              }, LX_STU_REVIEW_MS + 500);
              return;
            }
            if (e.target.closest('[data-stuauth-submit]')) {
              stuCollect();
              if (!stuData.agree) { toast('请勾选服务须知'); return; }
              const nameVal = stuData.name || (stuData.email ? stuData.email.split('@')[0] : '用户');
              if (authRole === 'gaokao' && !stuData.examNo) { toast('请填写考生号'); return; }
              if (authRole === 'college' && stuTab === 'email' && !stuData.email) { toast('请填写 edu 邮箱'); return; }
              if (authRole === 'college' && stuTab === 'card' && !stuData.name) { toast('请填写真实姓名'); return; }
              if (authRole === 'teacher' && stuTab === 'teacherEmail' && (!stuData.school || !stuData.email)) { toast('请填写学校/机构和单位邮箱'); return; }
              if (authRole === 'teacher' && stuTab === 'teacherCard' && (!stuData.name || !stuData.teacherNo)) { toast('请填写教师姓名和教师资格证号'); return; }
              const mask = document.querySelector('.lx-p0-modal-mask');
              if (mask) mask.removeEventListener('click', stuHandleClick, true);
              lxSaveStuState({ status: 'pending', name: nameVal, kind: authRole, submittedAt: Date.now() });
              closeModal();
              toast('认证资料已提交，审核中（演示约 12 秒自动通过）');
              setTimeout(() => {
                if (lxStuState().status === 'verified') {
                  toast('教育认证已通过，教育专享价已生效');
                  if (state.activeTabId === 'info:edu') openEduZone();
                }
              }, LX_STU_REVIEW_MS + 500);
            }
          }

          stuRender();
        }

        function openGlobalProfileEditor(profile, targetWindow) {
          const data = Object.assign({ nickname: "联小想", gender: "secret", birthday: "1998-05-18", phone: "182****4919", customAvatar: "" }, profile || {});
          const avatar = data.customAvatar || "/assets/icons/shortcut-membership.svg";
          openModal("编辑个人资料", `<form class="lx-global-profile-form" data-global-profile-form>
            <div class="lx-global-profile-grid">
              <section class="lx-global-profile-avatar">
                <div class="lx-global-profile-avatar-copy"><strong>会员头像</strong><span>支持 JPG、JPEG、PNG，图片大小不超过 4MB。</span></div>
                <img data-global-profile-preview src="${esc(avatar)}" alt="会员头像预览">
                <label class="lx-global-profile-upload" for="lxGlobalProfileFile">更换头像</label>
                <input id="lxGlobalProfileFile" type="file" accept="image/jpeg,image/png" hidden>
                <p data-global-profile-file-status></p>
              </section>
              <section class="lx-global-profile-fields">
                <label><span>会员昵称</span><input id="lxGlobalProfileNickname" value="${esc(data.nickname)}" maxlength="20" required></label>
                <div class="lx-global-profile-row"><label><span>性别</span><select id="lxGlobalProfileGender"><option value="secret"${data.gender === "secret" ? " selected" : ""}>保密</option><option value="male"${data.gender === "male" ? " selected" : ""}>男</option><option value="female"${data.gender === "female" ? " selected" : ""}>女</option></select></label><label><span>生日</span><input id="lxGlobalProfileBirthday" type="date" value="${esc(data.birthday)}"></label></div>
                <label><span>绑定手机号</span><input id="lxGlobalProfilePhone" value="${esc(data.phone)}" maxlength="11" inputmode="tel"></label>
                <div class="lx-global-profile-note"><strong>账号安全</strong><span>手机号修改后需完成短信验证，当前页面为交互演示。</span></div>
              </section>
            </div>
            <div class="lx-global-profile-actions"><span data-global-profile-status></span><button type="button" data-modal-close>取消</button><button type="submit">保存</button></div>
          </form>`, { skin: "lead" });
          const mask = ensureModal();
          const modal = $(".lx-p0-modal", mask);
          modal.classList.add("lx-global-profile-shell");
          let customAvatar = data.customAvatar || "";
          const form = $("[data-global-profile-form]", mask);
          const file = $("#lxGlobalProfileFile", form);
          file.addEventListener("change", () => {
            const selected = file.files && file.files[0];
            const status = $("[data-global-profile-file-status]", form);
            if (!selected) return;
            if (!["image/jpeg", "image/png"].includes(selected.type) || selected.size > 4 * 1024 * 1024) { status.textContent = "请选择 4MB 以内的 JPG 或 PNG 图片"; file.value = ""; return; }
            const reader = new FileReader();
            reader.onload = () => { customAvatar = String(reader.result || ""); $("[data-global-profile-preview]", form).src = customAvatar; status.textContent = "头像已载入"; };
            reader.readAsDataURL(selected);
          });
          form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const updated = { nickname: $("#lxGlobalProfileNickname", form).value.trim(), gender: $("#lxGlobalProfileGender", form).value, birthday: $("#lxGlobalProfileBirthday", form).value, phone: $("#lxGlobalProfilePhone", form).value.trim(), customAvatar };
            if (targetWindow && targetWindow.postMessage) targetWindow.postMessage({ type: "lexiang:profile-updated", profile: updated }, window.location.origin);
            closeModal();
            toast("个人资料已保存");
          });
          setTimeout(() => $("#lxGlobalProfileNickname", form)?.focus(), 0);
        }

        // ── 职场认证 demo 向导（4步 modal）────────────────────────────────────────
        window.addEventListener("message", (event) => {
          if (event.origin !== window.location.origin) return;
          const payload = event.data;
          if (!payload) return;
          if (payload.type === "lexiang:open-student-auth") { openStudentAuth(payload.kind || "college"); return; }
          if (payload.type === "lexiang:open-profile-editor") { openGlobalProfileEditor(payload.profile, event.source); }
        });

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
                '<div class="lx-wpa-dot">' + (n < wpaStep ? window.__lxApprovedIcon("global-check") : n) + '</div>' +
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
            return '<div class="lx-wpa-modal" data-wpa-step="' + wpaStep + '">' + progressHtml + body + '</div>';
          }

          function wpaRender() {
            openModal('职场身份认证', wpaStepHtml(), { skin: "lead" });
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

// 教育特惠专区：未完成页面统一使用与购物车一致的占位态。
async function openEduZone() {
  lxOpenInfoTab(
    "edu",
    "教育特惠专区",
    '<div class="lx-shop-making" role="status" aria-live="polite"><p class="lx-shop-making-copy">正在制作中...</p></div>'
  );
  return;

  const stu = lxStuState();
          let pool = [];
          try {
            const response = await fetch("/api/products?site=shop&limit=24", { cache: "no-store" });
            pool = (await response.json()).filter((p) => p.category === "笔记本电脑").slice(0, 12);
          } catch {}
          const icn = {
            cap: `<svg class="cap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 9l9-5 9 5-9 5-9-5Z"/><path d="M7 11.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5"/><path d="M21 9v5"/></svg>`,
            cert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4 4 8l8 4 8-4-8-4Z"/><path d="M6.5 10.5V15c0 2 2.4 3.5 5.5 3.5S17.5 17 17.5 15v-4.5"/></svg>`,
            laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6.5" width="12" height="8" rx="1.1"/><path d="M4.5 17.5h15"/></svg>`,
            spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9L12 2Z"/></svg>`,
            layers: `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>`,
          };
          const statusLabel = stu.status === "verified" ? "已认证" : stu.status === "pending" ? "审核中" : "未认证";
          const statusDesc = stu.status === "verified"
            ? `${stu.name ? esc(stu.name) + "，" : ""}认证后教育专享价已生效，并可与国家补贴叠加使用`
            : stu.status === "pending"
              ? "学生/教师认证审核中，通过后可享教育专享价，并可与国家补贴叠加使用"
              : "认证后享教育专享价，并可与国家补贴叠加使用";
          const markName = (name) => {
            const text = String(name || "").toUpperCase();
            if (/LEGION|拯救者|创世/.test(text)) return "LEGION 创世";
            if (/Y9000P/.test(text)) return "Y9000P 联名";
            if (/Y9000X/.test(text)) return "Y9000X";
            if (/R9000P/.test(text)) return "R9000P";
            if (/Y7000P/.test(text)) return "Y7000P";
            if (/YOGA\s*PRO\s*16|PRO 16/.test(text)) return "YOGA Pro 16";
            if (/YOGA\s*AIR\s*14|AIR 14/.test(text)) return "YOGA Air 14";
            if (/YOGA\s*PRO\s*15|PRO 15/.test(text)) return "YOGA Pro 15";
            return "LENOVO";
          };
          const _eduOk = stu.status === "verified"; // 已认证：按钮/标签改成「已享教育价·立即购买」
          const cards = pool.map((p) => {
            const rawPrice = Number(p.price || 0);
            const eduPrice = Math.round(rawPrice * 0.95);
            const cardAction = _eduOk ? `data-open-product="${esc(p.sku)}"` : `data-open-stuauth="college"`;
            const buttonAction = _eduOk ? `data-edu-buy="${esc(p.sku)}"` : `data-open-stuauth="college"`;
            return `<div class="card lx-edu-card" data-sku="${esc(p.sku)}" ${cardAction}>
              <div class="shot"><div class="ph">${icn.laptop}</div><img src="${esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'" /><div class="wm">${esc(markName(p.name))}</div></div>
              <div class="nm">${esc(p.name)}</div>
              <div class="etag">${icn.spark}<span>${_eduOk ? "教育价已生效" : "认证后享教育价"}</span></div>
              <div class="eduprice"><span class="now"><span class="cur">¥</span>${eduPrice.toLocaleString()}</span><span class="was">¥${rawPrice.toLocaleString()}</span></div>
              <button class="lcta" type="button" ${buttonAction}>${_eduOk ? "立即购买" : "立即认证购买"}</button>
            </div>`;
          }).join("");
          const html = `<div class="edu lx-edu-skin" data-v="4">
            <div class="e-head"><h2>${icn.cap}<span>教育特惠专区</span></h2><div class="tip">在校学生与在职教师 · 认证后享教育专享价</div></div>
            <div class="lcert">
              <div class="ci">${icn.cert}</div>
              <div class="ct"><div class="t"><span>学生 / 教师专属教育优惠</span><span class="badge">${statusLabel}</span></div><div class="d">${statusDesc}</div></div>
              <button class="lcta solid" type="button" data-stu-auth>立即认证</button>
            </div>
            <div class="grid">${cards || '<p class="foot-note">教育货盘加载中，可稍后重试。</p>'}</div>
            <div class="lrules">
              <h3>${icn.layers}<span>国补叠加规则</span></h3>
              <div class="ltiers">
                <div class="ltier"><div class="num">1</div><div><div class="tt">教育专享价</div><div class="td">认证学生 / 教师享专属教育价</div></div></div>
                <div class="ltier"><div class="num">2</div><div><div class="tt">国家补贴 15%</div><div class="td">目录内机型可叠加国补</div></div></div>
                <div class="ltier"><div class="num">3</div><div><div class="tt">券券叠加</div><div class="td">教育认证券 + 会员券叠加</div></div></div>
              </div>
            </div>
            <div class="foot-note">演示口径：教育价按 <b>95 折</b> 模拟，实际优惠以商品页与结算页为准。</div>
          </div>`;
          lxOpenInfoTab("edu", "教育特惠专区", html);
        }

        // ── 迭代二：biz 内容页体系（PRD 5.13.2/3/6/8）──
        const LX_SOLUTIONS = {
          "智慧教育": { icon: "🎓", overview: "覆盖智慧教室、电子教学、校园信创替代的一体化方案，从终端到云端统一交付。", features: ["智慧教室终端（教学一体机/师生 PC）统一部署", "教学资源云平台与本地缓存加速", "校园信创替代：开天系列+国产 OS 适配", "设备资产统一管理与远程运维"], advantages: ["教育行业 Top 客户覆盖率领先", "信创目录全适配，政采流程成熟", "全国 2400+ 服务网点护航开学季"], gains: "某省属高校 8000 终端信创替代项目：交付周期缩短 40%，三年运维成本下降 30%。", cases: ["某省属重点高校 8000 台信创替代", "某市教育局智慧教室全覆盖工程"] },
          "数字政府": { icon: "🏛️", overview: "面向政务办公与政务服务的安全可信终端与基础设施方案，满足等保与国产化要求。", features: ["政务办公信创 PC/打印外设整体配套", "等保 2.0 三级安全基线预置", "政务云资源池与超融合基础设施", "全生命周期资产管理（DaaS）"], advantages: ["政采框架入围+央采中标资质齐全", "开天系列通过主流国产 OS/CPU 兼容认证", "专属客户经理 1 对 1 长期服务"], gains: "某省级机关 1.2 万台政务终端国产化替代：单台综合成本下降 18%。", cases: ["某省级机关万台信创替代", "某市政务服务中心智能窗口改造"] },
          "智慧医疗": { icon: "🏥", overview: "医院信息化终端、影像工作站与边缘算力方案，保障 7×24 不间断业务。", features: ["医护工作站/移动查房终端", "影像后处理高性能工作站", "院内边缘计算与数据安全网关", "7×24 快速响应运维服务包"], advantages: ["医疗行业定制机型（抗菌外壳/静音）", "与主流 HIS/PACS 厂商完成适配", "闪修与备机服务降低停机风险"], gains: "某三甲医院全院终端升级：门诊系统响应速度提升 35%，故障率下降一半。", cases: ["某三甲医院全院 3000 终端升级", "某区域影像中心 GPU 工作站集群"] },
          "智能制造": { icon: "🏭", overview: "工厂产线工控终端、边缘 AI 质检与数字孪生算力底座，助力制造数字化。", features: ["产线工控机与工业平板", "边缘 AI 质检一体机（GPU 推理）", "数字孪生/仿真高性能工作站", "车间级设备统一管理平台"], advantages: ["联想自有工厂最佳实践复制", "宽温抗尘工业级硬件", "ThinkStation 专业认证覆盖主流工业软件"], gains: "某汽配厂边缘质检方案：漏检率下降 60%，单线人力成本省 25%。", cases: ["某汽配集团 12 条产线 AI 质检", "某家电企业数字孪生仿真平台"] },
          "智慧金融": { icon: "🏦", overview: "网点智能化与金融信创双轨方案，兼顾体验升级与合规替代。", features: ["智能网点终端（柜面/自助/营销大屏）", "金融信创 PC 与外设整体替代", "国密合规加密终端", "双机房高可用基础设施"], advantages: ["国密 TCM/SM 系列算法机型齐备", "金融行业等保与密评经验丰富", "总分支多级交付与驻场服务"], gains: "某股份制银行 300 网点终端信创替代：业务切换零中断。", cases: ["某股份制银行 300 网点替代", "某券商核心机房超融合改造"] },
          "智能基础设施": { icon: "🖥️", overview: "服务器、存储与超融合算力底座，支撑 AI 训练推理与企业核心业务。", features: ["问天/ThinkSystem 服务器全栈", "DE/DM 系列企业级存储", "超融合与私有云一体化交付", "AI 算力集群（训练/推理）规划部署"], advantages: ["x86 服务器全球前三供应链", "液冷技术降 PUE 至 1.1 以下", "从规划到运维全栈交付能力"], gains: "某互联网企业 AI 推理集群：算力成本下降 22%，交付周期 5 周。", cases: ["某互联网企业千卡推理集群", "某能源集团两地三中心存储"] },
          "智慧能源": { overview: "连接场站巡检、能源调度、野外作业与数据安全，提升能源生产运营韧性。", features: ["智慧场站巡检", "能源调度中心", "野外作业终端", "新能源设备运维"], advantages: ["复杂环境可靠运行", "边缘计算与中心调度协同", "全国服务网络支持"], gains: "帮助能源企业缩短异常响应时间，并降低跨区域终端运维成本。", cases: ["某新能源集团智慧场站", "某能源调度中心终端升级"] },
          "智慧交通": { overview: "面向交通指挥、轨道运维、航空地服与智慧物流提供稳定终端和边缘计算能力。", features: ["智慧交通指挥", "轨道交通运维", "航空地服终端", "智慧物流园区"], advantages: ["多场景终端统一纳管", "低时延边缘计算", "业务连续性保障"], gains: "帮助交通组织提升调度效率、现场协同能力和关键业务稳定性。", cases: ["某城市交通指挥中心", "某轨道集团站点运维升级"] },
        };

        const LX_WHITEPAPERS = [
          ["信创 PC 选型指南（2026 版）", "覆盖开天/昭阳全系，含国产 OS/CPU 兼容矩阵"],
          ["智慧教育解决方案白皮书", "智慧教室+信创替代完整方案与案例"],
          ["政务信创替代实施手册", "等保 2.0 基线、政采流程与迁移路线图"],
          ["金融行业国密合规指南", "TCM/SM 算法机型与密评要点"],
          ["智能制造边缘 AI 白皮书", "产线质检与数字孪生算力规划"],
          ["企业级服务器选型手册", "问天/ThinkSystem 全栈配置指南"],
        ];

        // 独立于 state.tabs 的方案详情标签缓存。页面切换可重建 state，但未点“×”的标签不能丢失。
        const lxSpecificSolutionTabCache = new Map();
        // 方案对比页缓存独立于当前标签数组，用户关闭标签后仍允许由历史推荐卡重新打开。
        const lxSolutionCompareTabCache = new Map();
        // 已被用户关闭的详情页只从标签栏移除，不销毁页面快照。
        // 历史对话里的推荐卡再次点击时，用该快照重新新建同名标签并恢复原内容；
        // 此缓存不参与 lxRenderTabbar 的自动补回，避免用户刚关闭标签就立即重现。
        const lxClosedSpecificSolutionTabCache = new Map();

        function lxOpenSpecificSolutionDetail({ title, industry, sector, scenario, intro, image }) {
          const s = LX_SOLUTIONS[industry] || {};
          const featureCards = (s.features || [
            `围绕${scenario || sector || "核心业务"}场景完成需求梳理与方案规划`,
            "提供软硬件、平台与服务的一体化部署能力",
            "支持分阶段建设、统一管理与持续运维",
            "结合实际业务目标持续优化交付效果"
          ]).map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><p>${esc(item)}</p></li>`).join("");
          const advantages = (s.advantages || ["端到端方案规划", "统一部署与运维", "全国服务网络支持"])
            .map((item) => `<span>${esc(item)}</span>`).join("");
          const cases = (s.cases || []).map((item) => `<button class="lx-solution-case-card" type="button" data-quick-ask="详细介绍这个案例：${esc(item)}"><strong>${esc(item)}</strong><em>让乐享详细介绍</em></button>`).join("");
          const html = `<section class="lx-solution-detail lx-specific-solution-detail">
            <div class="lx-solution-hero">
              <div>
                <div class="lx-solution-card-tags"><small>${esc(sector)}</small><small>${esc(scenario)}</small></div>
                <h2>${esc(title)}</h2>
                <p>${esc(intro)}</p>
              </div>
              <img class="lx-specific-solution-image" src="../img/solution/${esc(image)}" alt="${esc(title)}方案场景图" />
            </div>
            <div class="lx-solution-section">
              <div class="lx-solution-section-head"><h3>方案能力</h3><p>围绕业务场景、平台部署与持续服务形成一体化交付。</p></div>
              <ul class="lx-solution-feature-list">${featureCards}</ul>
            </div>
            <div class="lx-solution-band">
              <div><h3>方案优势</h3><div class="lx-solution-tags">${advantages}</div></div>
              <div class="lx-solution-gain"><span>方案价值</span><strong>${esc(s.gains || intro)}</strong></div>
            </div>
            ${cases ? `<div class="lx-solution-section"><div class="lx-solution-section-head"><h3>相关案例</h3><p>可继续让联想乐享展开项目背景、交付范围和业务收益。</p></div><div class="lx-solution-case-grid">${cases}</div></div>` : ""}
            <div class="lx-solution-actions">
              <button class="lx-project-primary" type="button" data-floor-action="lead">提交合作意向</button>
              <button class="lx-project-secondary" type="button" data-whitepaper>下载相关白皮书</button>
              <button class="lx-project-secondary" type="button" data-quick-ask="按${esc(title)}给我推荐具体产品配置">推荐配置</button>
            </div>
            <p class="lx-p0-disclaimer">以上内容由联想乐享生成，仅供参考，实际交付范围以业务顾问确认结果为准。</p>
          </section>`;
          lxOpenInfoTab(`solution-detail:${title}`, title, html);
          state.solutionDetailTabs = state.solutionDetailTabs || {};
          const detailTabId = `info:solution-detail:${title}`;
          const detailTab = (state.tabs || []).find((tab) => tab.id === detailTabId);
          if (detailTab) {
            state.solutionDetailTabs[detailTabId] = { ...detailTab };
            lxSpecificSolutionTabCache.set(detailTabId, { ...detailTab });
            lxClosedSpecificSolutionTabCache.delete(detailTabId);
          }
          lxRemoveUnrequestedSiteTabFromSolutionFlow();
        }

        function lxRemoveUnrequestedSiteTabFromSolutionFlow() {
          // 频道页的首页是结果页返回入口，方案流不得再移除它。
          lxEnsureCurrentSiteTab(false);
          lxRenderTabbar();
        }

        async function lxRunSpecificSolutionFlow(card) {
          if (!card || state.sending) return;
          const payload = {
            title: card.dataset.solutionTitle || "解决方案",
            industry: card.dataset.solutionIndustry || card.dataset.solution || "",
            sector: card.dataset.solutionSector || "行业方案",
            scenario: card.dataset.solutionScenario || "核心场景",
            intro: card.dataset.solutionIntro || "",
            image: card.dataset.solutionImage || ""
          };
          if (!lxRequireQueryAccess()) return;
          state.sending = true;
          const query = `${payload.title}的方案详情`;
          if (typeof window.__lxSetConversationQuery === "function") window.__lxSetConversationQuery(query);
          state.lastUserText = query;
          lxClearFollowups();
          addMessage("user", query);
          const scenarioFocus = `${payload.sector}${payload.scenario ? `的${payload.scenario}` : ""}场景`;
          const answer = `${payload.title}面向**${scenarioFocus}**，${payload.intro || "通过统一规划、平台部署与持续服务形成一体化解决方案。"} 我已为你整理方案能力、核心优势与相关案例，可在右侧继续查看**完整详情**。`;
          const cta = renderPageCta({
            title: `查看${payload.title}`,
            desc: `${payload.sector} · ${payload.scenario}`,
            // 把重建右侧原页面所需的原始业务数据保存在结果卡自身。历史恢复、跨频道
            // 或关闭 Tab 后内存缓存为空时，仍调用同一个 lxOpenSpecificSolutionDetail，
            // 不仿写页面、不退回无关商城首页。
            attr: `data-specific-solution-cta="${esc(payload.title)}" data-solution-industry="${esc(payload.industry)}" data-solution-sector="${esc(payload.sector)}" data-solution-scenario="${esc(payload.scenario)}" data-solution-intro="${esc(payload.intro)}" data-solution-image="${esc(payload.image)}"`
          });
          const ai = addMessage("ai", answer, cta);
          try {
            await (ai._typingDone || Promise.resolve());
            await new Promise((resolve) => window.setTimeout(resolve, 180));
            lxRunWithRevealMotion(() => lxOpenSpecificSolutionDetail(payload));
          } finally {
            state.sending = false;
            try { window.__lxSaveConversationNow(); } catch (_e) {}
          }
        }

        function openSolutionCenter(industry) {
          clearHoverPromptTimer();
          hideHoverPrompts();
          // 从详情返回全集时只切换页面；除站点身份标签外，用户未点“×”关闭的方案标签必须保留。
          const solutionTabsBeforeOpen = (state.tabs || []).slice();
          if (industry && LX_SOLUTIONS[industry]) {
            const s = LX_SOLUTIONS[industry];
            const featureCards = (s.features || []).map((f, idx) => `<li><span>${String(idx + 1).padStart(2, "0")}</span><p>${esc(f)}</p></li>`).join("");
            const advantageCards = (s.advantages || []).map((a) => `<span>${esc(a)}</span>`).join("");
            const caseCards = (s.cases || []).map((c) => `<button class="lx-solution-case-card" type="button" data-quick-ask="详细介绍这个案例：${esc(c)}"><strong>${esc(c)}</strong><em>让乐享详细介绍</em></button>`).join("");
            const html = `
              <section class="lx-solution-detail">
                <div class="lx-solution-hero">
                  <div>
                    <span class="lx-solution-kicker">行业解决方案</span>
                    <h2>${esc(industry)}解决方案</h2>
                    <p>${esc(s.overview)}</p>
                  </div>
                  <button class="lx-solution-cta" type="button" data-floor-action="lead">提交合作意向</button>
                </div>
                <div class="lx-solution-section">
                  <div class="lx-solution-section-head"><h3>方案功能</h3><p>围绕部署、资源、信创与运维形成一体化交付。</p></div>
                  <ul class="lx-solution-feature-list">${featureCards}</ul>
                </div>
                <div class="lx-solution-band">
                  <div><h3>方案优势</h3><div class="lx-solution-tags">${advantageCards}</div></div>
                  <div class="lx-solution-gain"><span>客户收益</span><strong>${esc(s.gains)}</strong></div>
                </div>
                <div class="lx-solution-section">
                  <div class="lx-solution-section-head"><h3>成功案例</h3><p>选择案例后可继续让联想乐享展开项目背景、交付范围和收益。</p></div>
                  <div class="lx-solution-case-grid">${caseCards}</div>
                </div>
                <div class="lx-solution-actions">
                  <button class="lx-project-primary" type="button" data-floor-action="lead">提交合作意向</button>
                  <button class="lx-project-secondary" type="button" data-whitepaper>下载相关白皮书</button>
                  <button class="lx-project-secondary" type="button" data-quick-ask="按${esc(industry)}方案给我推荐具体产品配置">推荐配置</button>
                </div>
              </section>`;
            lxOpenInfoTab("solution", `${industry}解决方案`, html);
            return;
          }
          const solutionMeta = [
            ["教育", "智慧教育", "EDU"], ["医疗", "智慧医疗", "MED"], ["政府", "数字政府", "GOV"],
            ["制造", "智能制造", "MFG"], ["金融", "智慧金融", "FIN"], ["能源", "智慧能源", "ENE"],
            ["交通", "智慧交通", "TRA"], ["服务", "智能基础设施", "SER"]
          ];
          const solutionCatalog = {
            "教育": [
              ["多擎云桌面解决方案", "普教", "多擎云桌面解决方案：融合四大架构，统一云化管理，提升教学效率。", "多擎云桌面解决方案4.jpg"],
              ["智慧教室解决方案", "高校", "智慧教室解决方案：打破信息壁垒，助力教育数字化转型。", "智慧教室解决方案.jpg"],
              ["职教智慧校园解决方案", "职教", "职教智慧校园解决方案：以1+2+3架构打造一体化数智校园，覆盖全场景。", "智慧校园解决方案1.jpg"],
              ["智慧校园解决方案", "高校", "智慧校园解决方案：构建数字底座，赋能教育治理现代化，实现提质减负。", "智慧校园解决方案2.jpg"],
              ["高性能计算解决方案", "高校", "高性能计算解决方案：低门槛HPC+AI平台，降低30%-50%成本。", "高性能计算解决方案.jpg"],
              ["教育存储解决方案", "高校", "教育存储解决方案：面向教学、科研与校园数据，提供稳定可靠的统一存储能力。", "教育存储解决方案.jpg"]
            ],
            "医疗": [
              ["医共体/医联体解决方案", "区卫-智慧区卫", "医共体/医联体解决方案：统一管理协同，推动资源共享与医疗数字化转型。", "医共体/医联体解决方案.jpg"],
              ["慢病与健康管理解决方案", "医院-服务", "慢病与健康管理解决方案：覆盖多种慢病及肿瘤患者，助力医院高质量发展。", "智慧医院整体解决方案.jpg"],
              ["多院区/区域医疗中心基础设施解决方案", "医院-智慧管理", "多院区/区域医疗中心基础设施解决方案：统一管理多数据中心，提升运维服务质量。", "多院区/区域医疗中心基础设施解决方案.jpg"],
              ["医疗数据灾备与管理解决方案", "医院-智慧管理", "医疗数据灾备与管理解决方案：覆盖存储、备份、容灾全流程，提升数据安全与运营效率。", "医疗数据灾备与管理解决方案.jpg"],
              ["医疗云桌面解决方案", "医院-智慧管理", "医疗云桌面解决方案：集中管理分布式架构，支持多院区扩展。", "医疗云桌面解决方案.jpg"],
              ["医院云盘解决方案", "医院-智慧服务", "医院云盘解决方案：统一汇聚院内文件与协作数据，兼顾便捷共享和安全管控。", "医院云盘解决方案.jpg"]
            ],
            "政府": [
              ["联想LECP存算一体化平台", "政府官网", "联想LECP存算一体化平台：存算管一体，开放兼容异构设备，节省30%投资，性能提升2倍。", "联想LECP存算一体化平台.jpg"],
              ["数字政府统一运维方案", "政府官网", "数字政府统一运维方案：四个统一提升工单解决率与满意度，降本增效。", "数字政府统一运维方案.jpg"],
              ["政务大数据解决方案", "政府官网", "政务大数据解决方案：构建三大中台，打破信息壁垒，实现高效协同。", "政务大数据解决方案.jpg"],
              ["政务云平台解决方案", "政府官网", "政务云平台解决方案：统一底座与能力平台，打造一站式政务服务平台。", "政务云平台解决方案.jpg"],
              ["智慧园区综合解决方案", "政府官网", "智慧园区综合解决方案：聚焦四大痛点，提供一站式服务，助力园区可持续发展。", "智慧园区综合解决方案.jpg"],
              ["政府移动电子政务解决方案", "移动政务", "政府移动电子政务解决方案：连接移动办公与政务应用，提升协同效率和终端安全。", "政府移动电子政务解决方案.jpg"]
            ],
            "制造": [
              ["AI研发平台", "智慧研发", "AI研发平台：一站式MLOps平台，助力制造企业降本增效。", "AI研发平台.jpg"],
              ["数字化研发平台", "智慧研发", "数字化研发平台：融合仿真与设计，结合多体系，多节点产品，帮助企业提升资源利用率。", "数字化研发平台.jpg"],
              ["AR数字孪生", "智慧研发", "AR数字孪生：构建工业元宇宙产品体系，助力企业降本增效与智能化转型。", "AR数字孪生.jpg"],
              ["产线数字化", "智慧生产", "产线数字化：覆盖MES配套、自动化控制、缺陷检测，助力高效数字化转型。", "产线数字化.jpg"],
              ["Lenovo Edge AI 工业质检解决方案", "智慧生产", "Lenovo Edge AI 工业质检解决方案：小样本终身学习驱动边缘AI质检，提升效率与精度。", "Lenovo Edge AI工业质检解决方案.jpg"],
              ["制造执行系统", "智慧生产", "制造执行系统：贯通计划、生产、质量与设备数据，提升工厂透明化运营能力。", "制造执行系统.jpg"]
            ],
            "金融": [
              ["金融行业DCM数据中心管理平台", "数字基础设施", "金融行业DCM数据中心管理平台：带内外管理赋能全流程运维，提效降本增安绿色运营。", "金融行业DCM数据中心管理平台.jpg"],
              ["联想IT设备再生服务", "数字基础设施", "可持续发展解决方案（ESG）IT设备再生服务：覆盖资产回收处置全环节，保障安全合规。", "联想IT设备再生服务.jpg"],
              ["智能运维解决方案", "智能运维", "智能运维解决方案：全渠道全天候全生命周期数字化运维，助力金融机构高效创新发展 。", "智能运维解决方案.jpg"],
              ["联想超融合解决方案", "智能运维", "联想超融合解决方案：整合资源一体化管理，提升利用率，支撑金融IT高效灵活升级。", "联想超融合解决方案.jpg"],
              ["联想魔方客服智能体解决方案", "智能客服", "联想魔方客服智能体解决方案：无缝嵌入客服系统，私有化部署，助力企业客服升级。", "联想魔方客服智能体解决方案.jpg"],
              ["智能混合云解决方案", "数字基础设施", "智能混合云解决方案：统一纳管多云资源，为金融业务提供弹性、安全的基础设施底座。", "智能混合云解决方案.jpg"]
            ],
            "能源": [
              ["变电站智能巡检解决方案", "电力", "变电站智能巡检解决方案：融合机器人、AI，支持多场景智能巡检，提效降本。", "变电站智能巡检解决方案.jpg"],
              ["智慧电厂解决方案", "电力", "智慧电厂解决方案：构建统一数据环境，推动电厂智能化运营。", "智慧电厂解决方案.jpg"],
              ["智慧矿山数字孪生解决方案", "矿产", "智慧矿山数字孪生解决方案：提供建模、XR展示、仿真预测，提升矿山运营效率与安全。", "智慧矿山数字孪生解决方案.jpg"],
              ["带式输送机工业质检解决方案", "矿产", "带式输送机工业质检解决方案：覆盖异物、跑偏及违规识别，降低模型成本，提升安全性。", "带式输送机工业质检解决方案.jpg"],
              ["私有云建设及扩容解决方案", "油气", "私有云建设及扩容解决方案：依托Nutanix实现多地多中心统一管理与灵活容灾。", "私有云建设及扩容解决方案.jpg"],
              ["虚拟电厂解决方案", "电力", "虚拟电厂解决方案：聚合分布式能源与负荷资源，提升调度协同和能源运营效率。", "虚拟电厂解决方案.jpg"]
            ],
            "交通": [
              ["高速ETC HCI解决方案", "高速", "高速ETC HCI解决方案：云边端架构，提升资源利用率与运维效率。", "高速ETC HCI解决方案.jpg"],
              ["高速云解决方案", "高速", "高速云解决方案：构建“端-边-云-网-智”架构，提升高速运营效率、安全与服务质量。", "高速云解决方案.jpg"],
              ["轨交云解决方案", "轨交", "轨交云解决方案：提供城轨云与大数据平台，提升运维效率，推动智能化发展。", "轨交云解决方案.jpg"],
              ["智能运维平台解决方案", "轨交", "智能运维平台解决方案：以边缘感知+智慧认知+人机协同架构，提升城轨智能运维能力。", "智能运维平台解决方案.jpg"],
              ["机场云平台解决方案", "航空", "机场云平台解决方案：统一管理异构资源，助力智慧民航数字化升级。", "机场云平台解决方案.jpg"],
              ["轨交智能运营解决方案", "轨交", "轨交智能运营解决方案：融合运营数据和智能分析能力，提升线网协同与服务水平。", "轨交智能运营解决方案.jpg"]
            ],
            "服务": [
              ["非线编解决方案", "媒体", "非线编解决方案：解决超高清制作读写、并发与算力痛点，保障稳定扩展与数据安全。", "非线编解决方案.jpg"],
              ["联想智能媒资解决方案", "媒体", "联想智能媒资解决方案：解决扩展适配存储风险，支撑媒资全生命周期管理。", "联想智能媒资解决方案.jpg"],
              ["物流智能分拨中心解决方案", "物流", "物流智能分拨中心解决方案：打造四大智能场景，提升分拣效率与准确率，降低运营成本。", "物流智能分拨中心解决方案.jpg"],
              ["物流中心云解决方案", "物流", "物流中心云解决方案：整合云计算等技术打通数据壁垒，支撑物流降本增效与数字化升级。", "物流中心云解决方案.jpg"],
              ["智慧零售连锁门店解决方案", "数字门店", "智慧零售连锁门店解决方案：全链路数字化，助力快速开店与精细化管理。", "智慧零售连锁门店解决方案.jpg"],
              ["企业出海数字化解决方案", "企业服务", "企业出海数字化解决方案：覆盖全球办公、设备交付与持续服务，支撑业务快速拓展。", "企业出海数字化解决方案.jpg"]
            ]
          };
          const tabs = `<nav class="lx-solution-tabs" aria-label="行业筛选"><button class="active" type="button" data-solution-filter="all" aria-pressed="true">全部行业</button>${solutionMeta.map(([label]) => `<button type="button" data-solution-filter="${esc(label)}" aria-pressed="false">${esc(label)}</button>`).join("")}</nav>`;
          const floors = solutionMeta.map(([label, key, code]) => {
            const items = solutionCatalog[label] || [];
            const cards = items.map(([name, scenario, intro, image]) => `<article class="lx-floor-card lx-solution-card" data-solution="${esc(key)}" data-solution-title="${esc(name)}" data-solution-industry="${esc(key)}" data-solution-sector="${esc(label)}" data-solution-scenario="${esc(scenario)}" data-solution-intro="${esc(intro)}" data-solution-image="${esc(image)}" role="button" tabindex="0" aria-label="查看${esc(name)}详情">
              <img class="lx-solution-card-image" src="../img/solution/${esc(image)}" alt="${esc(name)}方案场景图" />
              <div class="lx-solution-card-head"><div><strong>${esc(name)}</strong><div class="lx-solution-card-tags"><small>${esc(label)}</small><small>${esc(scenario)}</small></div></div></div>
              <span>${esc(intro)}</span><em>查看方案</em>
            </article>`).join("");
            const shuffleBtn = `<button class="lx-cat-shuffle-btn" type="button" data-solution-shuffle title="换一批方案" aria-label="换一批${esc(label)}行业解决方案"><img class="lx-cat-shuffle-icon" src="../icons/global-refresh.svg?v=2026062504" alt="" aria-hidden="true" />换一换</button>`;
            return `<section class="lx-solution-floor" data-solution-industry="${esc(label)}"><div class="lx-floor-head"><div><h2>${esc(label)}行业解决方案</h2><p>覆盖核心场景、终端部署与持续服务</p></div>${shuffleBtn}</div><div class="lx-floor-body">${cards}</div></section>`;
          }).join("");
          lxOpenInfoTab("solution", "全部解决方案", `<section class="lx-solution-center-page">${tabs}${floors}<p class="lx-p0-disclaimer">以上方案由联想乐享汇总，AI 生成内容仅供参考，实际交付范围以业务顾问确认结果为准。</p></section>`);
          lxEnsureCurrentSiteTab(false);
          const currentTabs = state.tabs || [];
          const currentById = new Map(currentTabs.map((tab) => [tab.id, tab]));
          const preservedTabs = solutionTabsBeforeOpen.map((tab) => ({ ...tab, ...(currentById.get(tab.id) || {}) }));
          Object.values(state.solutionDetailTabs || {}).forEach((tab) => {
            if (tab && !preservedTabs.some((item) => item.id === tab.id)) preservedTabs.push({ ...tab });
          });
          lxSpecificSolutionTabCache.forEach((tab) => {
            if (tab && !preservedTabs.some((item) => item.id === tab.id)) preservedTabs.push({ ...tab });
          });
          currentTabs.forEach((tab) => {
            if (!preservedTabs.some((item) => item.id === tab.id)) preservedTabs.push(tab);
          });
          state.tabs = preservedTabs;
          state.activeTabId = "info:solution";
          lxRenderTabbar();
          lxSyncAnswerCtaActiveState(state.activeTabId);
        }

        function openProjectCooperationList() {
          const solutionMeta = {
            "智慧教育": ["EDU", "智慧校园与教学终端", "面向学校、教培和教育主管单位，提供教学终端、智慧教室与教育信创方案。"],
            "数字政府": ["GOV", "安全可信政务办公", "面向政务办公、基层窗口和公共服务场景，提供国产化替代与统一运维方案。"],
            "智慧医疗": ["MED", "院内终端与边缘算力", "面向医院门诊、病区、影像和移动查房，提供稳定终端与边缘智能方案。"],
            "智能制造": ["MFG", "产线工控与 AI 质检", "面向工厂、园区和研发制造组织，提供工业终端、工作站与边缘 AI 方案。"],
            "智慧金融": ["FIN", "金融信创与网点智能化", "面向银行、证券、保险及网点数字化，提供可信终端和智能服务方案。"],
            "智能基础设施": ["INF", "算力、存储与统一交付", "面向数据中心、AI 训练推理和混合云底座，提供服务器与基础设施方案。"]
          };
          const cards = Object.entries(LX_SOLUTIONS).map(([name, s]) => {
            const [code, scope, desc] = solutionMeta[name] || ["SOL", "行业解决方案", s.overview || ""];
            const points = (s.features || []).slice(0, 3).map((item) => `<li>${esc(item)}</li>`).join("");
            return `<article class="lx-project-card">
              <div class="lx-project-card-head"><span>${esc(code)}</span><div><h3>${esc(name)}</h3><p>${esc(scope)}</p></div></div>
              <p class="lx-project-desc">${esc(desc)}</p>
              <ul>${points}</ul>
              <div class="lx-project-actions">
                <button class="lx-project-primary" type="button" data-project-lead="${esc(name)}">我要合作</button>
                <button class="lx-project-secondary" type="button" data-solution="${esc(name)}">查看方案</button>
              </div>
            </article>`;
          }).join("");
          lxOpenInfoTab("project", "项目合作", `<section class="lx-project-coop-page"><div class="lx-project-grid">${cards}</div><p class="lx-p0-disclaimer">AI 生成的合作方案仅供演示参考，正式项目以联想商务团队沟通结果为准。</p></section>`);
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
          const rows = LX_WHITEPAPERS.map(([name, desc], index) => {
            const tag = /教育/.test(name) ? "教育" : /政务|信创/.test(name) ? "信创" : /金融/.test(name) ? "金融" : /制造/.test(name) ? "制造" : /服务器/.test(name) ? "基础设施" : "指南";
            return `<article class="lx-wp-card">
              <div class="lx-wp-code">${String(index + 1).padStart(2, "0")}</div>
              <div class="lx-wp-main"><div class="lx-wp-meta"><span>${esc(tag)}</span><em>PDF 资料</em></div><h3>${esc(name)}</h3><p>${esc(desc)}</p></div>
              <button class="lx-wp-download" type="button" data-wp-download="${esc(name)}">下载</button>
            </article>`;
          }).join("");
          lxOpenInfoTab("whitepaper", "白皮书资料库", `<section class="lx-wp-page"><div class="lx-wp-head"><h2>白皮书资料库</h2><p>精选政企、教育、信创与行业解决方案资料，下载后将发送至您的邮箱或手机。</p></div><div class="lx-wp-grid">${rows}</div><p class="lx-p0-disclaimer">资料内容为演示环境示例，正式资料以联想官方交付版本为准。</p></section>`);
        }

        // ── 右侧内容页多标签（PRD 5.0/6.5：多标签并存、可切换、可关闭）──
        const LX_SITE_TAB_LABELS = { personal: "个人及家庭", business: "中小企业", enterprise: "政教及大企业", brand: "品牌" };

        function lxEnsureCurrentSiteTab(activate = true) {
          const page = lxPageFromPath();
          if (!["personal", "business", "enterprise", "brand"].includes(page)) return null;
          const siteTab = { id: `site:${page}`, kind: "site", label: LX_SITE_TAB_LABELS[page], page };
          state.tabs = (state.tabs || []).filter((item) =>
            item?.kind !== "site" && !String(item?.id || "").startsWith("site:")
          );
          state.tabs.unshift(siteTab);
          if (activate) state.activeTabId = siteTab.id;
          lxRenderTabbar();
          return siteTab;
        }

        function lxEnsureTabbar() {
          let bar = document.querySelector(".lx-tabbar");
          if (!bar) {
            bar = document.createElement("div");
            bar.className = "lx-tabbar";
            bar.hidden = true;
            document.querySelector(".content")?.prepend(bar);
          }
          // 商城内由 query 打开的推荐页与商品页统一使用模板规定的页签外观。
          if ((document.body.dataset.page || state.page) === "personal") bar.dataset.shopDetailTabs = "";
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
          state.tabs = state.tabs || [];
          // 根首页永远不是“个人及家庭”频道。首页分屏会复用 personal 商城内容，
          // 但历史会话、旧缓存、商品选择和异步恢复都不得把频道页登记为真实右侧页面。
          // 每次渲染前按真实模板路由净化注册表，彻底移除全部合成频道标签。
          if (lxPageFromPath() === "home") {
            const removedActiveSiteTab = (state.tabs || []).some((tab) =>
              tab?.id === state.activeTabId && (tab?.kind === "site" || String(tab?.id || "").startsWith("site:"))
            );
            state.tabs = state.tabs.filter((tab) =>
              tab?.kind !== "site" && !String(tab?.id || "").startsWith("site:")
            );
            if (removedActiveSiteTab) state.activeTabId = state.tabs[0]?.id || "";
          }
          // 方案多标签采用“显式关闭才移除”：每次渲染先登记当前详情标签；
          // 返回全集时即使某条入口重建过 tabs，也要在隐藏判断前恢复未关闭的详情标签。
          state.solutionDetailTabs = state.solutionDetailTabs || {};
          state.tabs.forEach((tab) => {
            if (String(tab?.id || "").startsWith("info:solution-detail:")) {
              state.solutionDetailTabs[tab.id] = { ...tab };
              lxSpecificSolutionTabCache.set(tab.id, { ...tab });
            }
          });
          if (state.activeTabId === "info:solution") {
            Object.values(state.solutionDetailTabs).forEach((tab) => {
              if (tab && !state.tabs.some((item) => item.id === tab.id)) state.tabs.push({ ...tab });
            });
            lxSpecificSolutionTabCache.forEach((tab) => {
              if (tab && !state.tabs.some((item) => item.id === tab.id)) state.tabs.push({ ...tab });
            });
          }
          // PC 5.0 v0.14.30：右侧真实页面与标签必须一一对应。恢复会话、重复点击
          // 或异步重建都先按稳定页面 ID 去重，禁止重复/占位标签污染显示数量。
          const seenTabIds = new Set();
          state.tabs = state.tabs.filter((tab) => {
            const id = String(tab?.id || "").trim();
            if (!id || seenTabIds.has(id)) return false;
            seenTabIds.add(id);
            return true;
          });
          const tabs = state.tabs;
          bar.innerHTML = tabs.map((tab) => `<span class="lx-tab${tab.id === state.activeTabId ? " is-active" : ""}" data-tab-id="${esc(tab.id)}" role="tab" aria-selected="${tab.id === state.activeTabId}"><span class="lx-tab-label">${esc(tab.label || "")}</span><button class="lx-tab-close" type="button" data-tab-close="${esc(tab.id)}" aria-label="关闭标签">×</button></span>`).join("") + `<span class="lx-tab-ink" aria-hidden="true"></span>`;
          // 频道首页和结果页都是真实页面；只有首页一页时隐藏标签栏，
          // 打开结果后同时显示“频道首页 + 结果页”，并保持一页一标签。
          bar.hidden = tabs.length <= 1;
          bar.setAttribute("aria-hidden", bar.hidden ? "true" : "false");
          bar.dataset.pageCount = String(tabs.length);
          // 页面注册表是选中态唯一真相；零页面时必须清除历史恢复留下的虚假卡片高亮。
          lxSyncAnswerCtaActiveState(tabs.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : "");
          requestAnimationFrame(lxMoveTabInk);
        }

        function lxUpsertTab(tab, activate = true) {
          state.tabs = state.tabs || [];
          // 根首页不注册频道标签；四个频道页必须保留各自的真实首页标签。
          if (lxPageFromPath() === "home") {
            state.tabs = state.tabs.filter((item) => item?.kind !== "site" && !String(item?.id || "").startsWith("site:"));
          }
          const idx = state.tabs.findIndex((item) => item.id === tab.id);
          if (idx >= 0) state.tabs[idx] = { ...state.tabs[idx], ...tab };
          else {
            tab.__fresh = true;
            state.tabs.push(tab);
            if (state.tabs.length > 8) {
              const evict = state.tabs.findIndex((item) => item.kind !== "site" && item.id !== state.activeTabId && item.id !== tab.id);
              if (evict >= 0) state.tabs.splice(evict, 1);
            }
          }
          if (activate) state.activeTabId = tab.id;
          // 结果页的唯一通用创建入口同时是持久化入口。
          lxRememberResultTab((state.tabs || []).find((item) => item.id === tab.id) || tab);
          if (activate) {
            lxSyncAnswerCtaActiveState(tab.id);
            requestAnimationFrame(() => lxSyncAnswerCtaActiveState(state.activeTabId));
          }
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

        function lxTabGeneratingText(tab) {
          const label = String(tab?.label || "页面");
          if (tab?.kind === "detail") return { title: "正在生成商品页", desc: "联想乐享正在整理商品信息、优惠和推荐理由" };
          if (tab?.kind === "reco") return { title: "正在生成推荐结果", desc: "正在筛选适合你的商品与关键参数" };
          if (tab?.kind === "compare") return { title: "正在生成对比页", desc: "正在汇总配置差异与选购建议" };
          if (tab?.kind === "info" && tab?.id === "info:edu") return { title: "正在生成教育特惠专区", desc: "正在加载认证权益和教育专享商品" };
          if (tab?.kind === "info" && String(tab?.id || "").startsWith("info:solution-detail:")) return { title: `正在生成${label}`, desc: "正在理解方案内容，并组织概览、核心能力与应用场景" };
          if (tab?.kind === "info") return { title: `正在生成${label}`, desc: "正在组织页面结构与关键信息" };
          return { title: `正在打开${label}`, desc: "正在准备页面内容" };
        }

        function lxHasVisibleResultCard(tab) {
          const tabId = String(tab?.id || "");
          if (!tabId) return false;
          const featureIds = { solution: "info:solution", member: "info:member", devices: "info:devices", documents: "documents", edu: "info:edu", cart: "info:cart", orders: "info:orders", coupon: "info:coupon", points: "info:points", vouchers: "info:vouchers", redpacket: "info:redpacket" };
          return Array.from(document.querySelectorAll(".lx-p0-messages .answer-cta")).some((card) => {
            const resultId = card.getAttribute("data-lx-result-id") || card.getAttribute("data-lx-open-tab") || "";
            if (resultId === tabId) return true;
            const feature = card.getAttribute("data-lxfd-open-feature") || "";
            return featureIds[feature] === tabId;
          });
        }

        function lxWaitForTabReady(tab) {
          return new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const content = document.querySelector(".content");
              const frame = content?.querySelector(".info-page iframe");
              if (!frame || tab?.kind !== "info") { resolve(); return; }
              try {
                const expectedUrl = new URL(frame.src, window.location.href).href;
                const currentUrl = frame.contentWindow?.location?.href || "";
                if (currentUrl === expectedUrl && frame.contentDocument?.readyState === "complete" && frame.contentDocument?.body?.children?.length) { resolve(); return; }
              } catch (_e) {}
              const done = () => resolve();
              frame.addEventListener("load", done, { once: true });
              frame.addEventListener("error", done, { once: true });
            }));
          });
        }

        function lxBeginTabGeneration(tab) {
          if (!tab || !tab.__fresh) return null;
          // 生成动画只属于“左侧结果卡 → 右侧结果页”链路；普通标签切换不播放。
          if (!lxHasVisibleResultCard(tab)) return null;
          delete tab.__fresh;
          const stateTab = (state.tabs || []).find((item) => item.id === tab.id);
          if (stateTab) delete stateTab.__fresh;
          const content = document.querySelector(".content");
          if (!content) return null;
          content.querySelectorAll(".lx-page-generating").forEach((node) => node.remove());
          const copy = lxTabGeneratingText(tab);
          const overlay = document.createElement("div");
          overlay.className = "lx-page-generating";
          overlay.setAttribute("role", "status");
          overlay.setAttribute("aria-live", "polite");
          overlay.innerHTML = `<div class="lx-page-gen-card lx-page-gen-card--aurora"><div class="lx-page-gen-aurora-field" aria-hidden="true"><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--a"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--b"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--c"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--d"></i><span class="lx-page-gen-aurora-lens"></span></div><div class="lx-page-gen-head"><div class="lx-page-gen-copy"><strong>${esc(copy.title)}</strong><em>${esc(copy.desc)}</em></div></div></div>`;
          content.appendChild(overlay);
          content.classList.add("is-generating-tab");
          const minVisibleMs = 2000 + Math.floor(Math.random() * 2001);
          const token = { overlay, startedAt: Date.now(), minVisibleMs, tab, done: false };
          requestAnimationFrame(() => overlay.classList.add("is-show"));
          return token;
        }

        function lxEndTabGeneration(token) {
          if (!token || token.done) return;
          token.done = true;
          const elapsed = Date.now() - token.startedAt;
          const wait = Math.max((token.minVisibleMs ?? 2000) - elapsed, 0);
          Promise.all([
            new Promise((resolve) => setTimeout(resolve, wait)),
            lxWaitForTabReady(token.tab)
          ]).then(() => {
            token.overlay.classList.add("is-done");
            token.overlay.classList.remove("is-show");
            document.querySelector(".content")?.classList.remove("is-generating-tab");
            setTimeout(() => token.overlay.remove(), 260);
          });
        }

        function lxStepDocumentReader(readerButton) {
          const article = readerButton?.closest(".lx-document-article");
          if (!article || readerButton.disabled) return false;
          const pages = Array.from(article.querySelectorAll("[data-reader-page]"));
          const activeIndex = Math.max(0, pages.findIndex((page) => page.classList.contains("is-active")));
          const nextIndex = readerButton.dataset.readerAction === "next"
            ? Math.min(pages.length - 1, activeIndex + 1)
            : Math.max(0, activeIndex - 1);
          pages.forEach((page, index) => page.classList.toggle("is-active", index === nextIndex));
          const current = article.querySelector("[data-reader-current]");
          if (current) current.textContent = String(nextIndex + 1);
          const prev = article.querySelector('[data-reader-action="prev"]');
          const next = article.querySelector('[data-reader-action="next"]');
          if (prev) prev.disabled = nextIndex === 0;
          if (next) next.disabled = nextIndex === pages.length - 1;
          article.scrollTo({ top: 0, behavior: "smooth" });
          return true;
        }

        function lxRunTab(tab) {
          if (!tab) return;
          lxSyncSolutionCompareFloatingCta(tab.kind === "info" && tab.id.startsWith("info:solution-compare:"));
          const genToken = lxBeginTabGeneration(tab);
          if (tab.kind === "site") {
            const content = document.querySelector(".content");
            content?.setAttribute("data-view", "list");
            routeTo(tab.page);
            lxRenderSiteFloors();
            content?.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab.kind === "detail") {
            const restoredByTemplate = typeof window.__lxRestoreTemplateProductDetail === "function" &&
              window.__lxRestoreTemplateProductDetail(tab);
            if (!restoredByTemplate) openProduct(tab.product || tab.sku);
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
            const isEduInfo = tab.id === "info:edu";
            const isCartInfo = tab.id === "info:cart";
            const isOrdersInfo = tab.id === "info:orders";
            const isEntPointsInfo = tab.id === "info:ent-points";
            const isMemberInfo = tab.id === "info:member";
            const isMemberComponent = Boolean(tab.memberComponentView);
            const isStoreComponent = Boolean(tab.storeComponentView);
            const isDocumentInsight = tab.id.startsWith("info:document-insight:");
            const isSolutionCompare = tab.id.startsWith("info:solution-compare:");
            pageBox.classList.toggle("is-wide", isEduInfo || isCartInfo || isOrdersInfo || isEntPointsInfo || isMemberInfo || isMemberComponent || isStoreComponent || isDocumentInsight);
            pageBox.classList.toggle("is-document-insight", isDocumentInsight);
            pageBox.innerHTML = `${isEduInfo || isCartInfo || isOrdersInfo || isEntPointsInfo || isMemberInfo || isMemberComponent || isStoreComponent || isDocumentInsight || isSolutionCompare ? "" : `<div class="reco-head"><h2>${esc(tab.label || "")}</h2></div>`}${tab.html || ""}`;
            if (isMemberComponent) lxMountMemberComponentTab(tab, pageBox);
            if (isStoreComponent) lxMountStoreComponentTab(tab, pageBox);
            pageBox.querySelectorAll("[data-reader-action]").forEach((button) => {
              button.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                lxStepDocumentReader(button);
              };
            });
            const content = document.querySelector(".content");
            if (isDocumentInsight) content?.querySelector(".product-grid.lx-document-reco")?.classList.remove("lx-document-reco");
            content?.setAttribute("data-view", "info");
            content?.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab.kind === "documents") {
            openDocumentCenter();
          }
          lxSyncAnswerCtaActiveState(tab.id);
          lxEndTabGeneration(genToken);
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
              ["办公/学习/网课", "", "用来办公、学习和上网课，"],
              ["设计/剪辑/AI创作", "", "用来做设计、剪辑和AI创作，"],
              ["编程/开发", "", "用来编程开发，"],
              ["学生用", "", "学生日常用，"],
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
          // 预算按品类分档（真机反馈：手机/平板/显示器不该套用笔记本的万元档）
          // 手机、平板：中低价位（含 moto razr 折叠屏顶配约 6000）
          budget_mobile: {
            test: (t) => /手机|平板/.test(t) && !/\d+\s*(元|块|千|万|k|K|W)|预算|价格不限|不限/.test(t),
            title: "预算大概多少？",
            options: [
              ["2000 元以下", "", "预算2000元以下，"],
              ["2000 ~ 4000 元", "", "预算2000到4000元，"],
              ["4000 ~ 6000 元", "", "预算4000到6000元，"],
              ["价格不限", "", "价格不限，"],
            ],
          },
          // 显示器：低中价位
          budget_monitor: {
            test: (t) => /显示器/.test(t) && !/\d+\s*(元|块|千|万|k|K|W)|预算|价格不限|不限/.test(t),
            title: "预算大概多少？",
            options: [
              ["1000 元以下", "", "预算1000元以下，"],
              ["1000 ~ 2000 元", "", "预算1000到2000元，"],
              ["2000 ~ 4000 元", "", "预算2000到4000元，"],
              ["价格不限", "", "价格不限，"],
            ],
          },
          // 预算（电脑类；兜底——说了买什么没提预算就问）。收窄：不含手机/平板/显示器，
          // 让它们各走上面专属档；"平板电脑"含"电脑"，靠 !/平板/ 排除 + budget_mobile 排在前双保险
          budget: {
            test: (t) => /笔记本|游戏本|轻薄本|电脑|台式|主机/.test(t) && !/手机|平板|显示器|耳机|键盘|鼠标/.test(t) && !/\d+\s*(元|块|千|万|k|K|W)|预算|价格不限|不限/.test(t),
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

        // 服务意图引导（基于 61049 条真实提问：售后5.4%/认证4.5%/门店3.2%/会员2.4%，原推荐漏斗未覆盖）
        // 短词即触发（不受购物漏斗 length<3 限制），选完直接发出对应能力的口语句
        const LX_SERVICE_SUGGEST = {
          repair: {
            // 「电脑卡」也是故障（曾落到"买电脑"用途套问"主要用来做什么"，真机反馈），卡/很卡/卡顿都算
            test: (t) => /^(维修|修电脑|修一下|售后|保修|清灰|换电池|进水|开不了?机|蓝屏|卡顿|死机|系统重装|重装系统|数据迁移|坏了|出问题)$/.test(t) || /^(电脑|笔记本|台式|主机)?(坏了|进水|开不了?机|蓝屏|卡顿?|很卡|变卡|死机)$/.test(t),
            title: "你的设备遇到什么问题？",
            options: [
              ["清灰除尘 / 散热差", "", "我的电脑要清灰除尘，散热不太好，怎么处理？"],
              ["换电池 / 续航变差", "", "我的电脑要换电池，续航变差了，怎么处理？"],
              ["进水 / 开不了机 / 蓝屏", "", "我的电脑进水或开不了机了，怎么报修？"],
              ["卡顿 / 重装系统 / 数据迁移", "", "我的电脑很卡想重装系统并迁移数据，怎么弄？"],
              ["查保修 / 不确定，问问售后", "", "我想查一下保修，并咨询售后服务怎么办理？"],
            ],
            replace: true,
          },
          auth: {
            // 已点名具体身份（学生/职场/高考生认证）不再弹泛身份选择——回车直开对应表单（真机反馈）
            test: (t) => /^(认证|教育认证|怎么认证|如何认证|认证状态|重新认证|认证失败)$/.test(t),
            title: "你要做哪种认证？",
            options: [
              ["🎓 在校生认证（学生）", "", "我是在校学生，怎么完成学生教育认证？"],
              ["📝 高考生认证", "", "我是高考生，怎么完成高考生教育认证？"],
              ["💼 职场人认证", "", "我是职场人，怎么完成职场认证？"],
              ["🔍 查认证状态 / 重新认证", "", "帮我查认证状态，认证失败了怎么重新认证？"],
            ],
            replace: true,
          },
          store: {
            test: (t) => /^(门店|附近门店|实体店|体验店|线下店)$/.test(t),
            title: "去门店想做什么？",
            options: [
              ["看样机 / 现场体验", "", "我想去附近门店看样机、现场体验，帮我找门店。"],
              ["送修 / 售后维修", "", "我想去附近门店送修做售后，帮我找能维修的门店。"],
              ["学生 / 教育认证", "", "我想去门店做学生教育认证，帮我找门店。"],
              ["参加门店活动", "", "我想了解附近门店有什么活动，帮我找门店。"],
            ],
            replace: true,
          },
          member: {
            test: (t) => /^(会员|智享金|乐豆|积分|会员权益|会员活动)$/.test(t),
            title: "想看会员的哪部分？",
            options: [
              ["会员权益 / 等级", "", "帮我看看我的会员权益和等级。"],
              ["智享金 / 乐豆余额", "", "帮我看看我的智享金和乐豆余额怎么用。"],
              ["会员活动 / 0元试用", "联想新款IoT设备免费试用", "最近有什么会员活动和0元试用？"],
              ["积分兑换 / 商城", "一球千金活动进行中", "帮我打开积分兑换商城。"],
            ],
            replace: true,
          },
          tradein: {
            test: (t) => /^(以旧换新|旧机回收|换新|回收|旧电脑回收|旧机抵扣)$/.test(t),
            title: "以旧换新想了解什么？",
            options: [
              ["旧机能抵多少钱", "", "我想以旧换新，旧机能抵多少钱？怎么估价？"],
              ["换新流程怎么走", "", "以旧换新的流程怎么走？在哪里操作？"],
              ["能和国补/教育叠加吗", "", "以旧换新能和国家补贴、教育优惠叠加吗？"],
              ["哪些旧机可以回收", "", "哪些品牌和型号的旧机可以回收换新？"],
            ],
            replace: true,
          },
          guobu: {
            test: (t) => /^(国补|国家补贴|政府补贴|消费补贴)$/.test(t),
            title: "国补想了解什么？",
            options: [
              ["怎么领取国补资格", "", "国家补贴怎么领取？需要实名认证吗？"],
              ["哪些商品参与国补", "", "哪些商品参与国家补贴？帮我看看。"],
              ["能叠加什么优惠", "", "国补能和教育优惠、以旧换新叠加吗？"],
              ["我的城市能用吗", "", "我所在的城市能用国家补贴吗？"],
            ],
            replace: true,
          },
        };

        // 情境预判：结合右侧当前打开的页面，把模糊短词补全成可执行指令（点选即发，本地意图闭环）
        function lxContextSuggest(t) {
          if (/^(结算|买单|付款|结账)$/.test(t)) {
            if (!(state.cart || []).length) return null;
            return { key: "ctx_pay", isService: true, replace: true, title: `购物车里有 ${state.cart.length} 件，去结算？`, options: [["打开购物车去结算", "", "打开购物车"]] };
          }
          if (!/^(买|购买|下单|入手|要了)$/.test(t)) return null;
          const tab = (state.tabs || []).find((x) => x.id === state.activeTabId);
          if (tab && tab.id === "compare" && (state.compare || []).length >= 2) {
            return { key: "ctx_buy_cmp", isService: true, replace: true, title: "对比表里买哪个？", options: state.compare.slice(0, 4).map((p, i) => [`第${i + 1}个：${(p.name || "").slice(0, 14)}`, "", `买第${i + 1}个`]) };
          }
          if (tab && tab.kind === "detail") {
            return { key: "ctx_buy_cur", isService: true, replace: true, title: "买当前打开的这款？", options: [["就买这个", "", "买这个"], ["先看看有什么券", "", "优惠券"]] };
          }
          return null;
        }

        function lxDetectSuggest(text) {
          const t = (text || "").trim();
          if (t.length > 80) return null;
          // 情境预判最优先（比服务引导更具体：知道用户此刻开着什么页）
          const ctx = lxContextSuggest(t);
          if (ctx) return ctx;
          // 服务引导优先（短词精确匹配，覆盖售后/认证/门店/会员）
          for (const key of ["repair", "auth", "store", "member", "tradein", "guobu"]) {
            if (LX_SERVICE_SUGGEST[key].test(t)) return { key, isService: true, ...LX_SERVICE_SUGGEST[key] };
          }
          // 明确的 2 字购物意图词（推荐/想买/选购/入手/换个）直接放行，否则要打第 3 个字才弹引导——体验差
          const _short = /^(推荐|想买|选购|入手|换个|想要)$/.test(t);
          if (t.length < 3 && !_short) return null; // 其余仍要 ≥3 字，避免误触
          if (t.length > 40) return null; // 用户已在完整表达（长句），逐级引导反而碍事。阈值必须容得下引导链自己拼出的句子——24 时「…设计、剪辑和AI创作，」25字被误杀，预算级弹不出来（彩排 blocker）
          for (const key of ["category", "usage", "usage_desktop", "usage_phone", "usage_pad", "usage_monitor", "earphone_form", "budget_mobile", "budget_monitor", "budget", "budget_acc", "portable", "desktop_form", "phone_form", "pad_acc", "monitor_size"]) {
            if (LX_SUGGEST_TREE[key].test(t)) return { key, ...LX_SUGGEST_TREE[key] };
          }
          return null;
        }

        function lxHideSuggest() {
          document.querySelector(".lx-suggest-panel")?.remove();
        }
        // 全屏 lxfd 发送后程序性清空输入框不触发 input，浮层会残留——暴露给 app-lxfd.js 发送时收掉
        window.__lxHideSuggest = lxHideSuggest;

        let lxSuggestTimer = null;
        function lxComposerSuggest(ta) {
          clearTimeout(lxSuggestTimer);
          lxSuggestTimer = setTimeout(() => {
            lxHideSuggest();
            if (document.querySelector(".lx-ref-picker")) return; // @引用优先
            const hit = lxDetectSuggest(ta.value);
            if (!hit) return;
            const composer = ta.closest(".composer, .hero-composer, .lxfd-composer");
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
          // 服务引导是末级，选完直接发出（购物漏斗才递归下一级）
          if (hit.isService) {
            const v = ta.value.trim();
            ta.value = "";
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            if (typeof window.lxfdSubmit === "function" && ta.closest(".hero-composer, .lxfd-composer")) {
              lxSetConversationSourcePage(lxPageFromPath());
              window.lxfdSubmit(v);
            }
            else sendChat(v);
            return;
          }
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
        const LX_PICK_CARD_SEL = ".product-card, .lx-floor-product-card, [data-floor-product], .lx-sim-card, .lx-floor-product, .lx-p0-product-mini, .reco-row, .lx-edu-card, .lx-solution-card";

        function lxCardSku(card) {
          // 首屏/频道商品楼层使用 data-floor-product（值为稳定商品名），并不一定提供 data-sku。
          // 之前选择器能找到这些卡片，但身份读取为空，lxEnsurePickBtn 因而直接跳过，导致整层无勾选。
          return card?.dataset.sku ||
            card?.dataset.openProduct ||
            card?.dataset.floorProduct ||
            card?.dataset.detailTitle ||
            card?.querySelector("[data-open-product]")?.dataset.openProduct ||
            (card?.dataset.solutionTitle ? `solution:${card.dataset.solutionTitle}` : "");
        }

        function lxProductRefPayload(product, card) {
          if (card?.classList.contains("lx-solution-card")) {
            return {
              sku: lxCardSku(card),
              type: "solution",
              name: card.dataset.solutionTitle || card.querySelector("strong")?.textContent?.trim() || "联想解决方案",
              price: "",
              sector: card.dataset.solutionSector || "行业方案",
              scenario: card.dataset.solutionScenario || "核心业务场景",
              spec: [card.dataset.solutionSector, card.dataset.solutionScenario].filter(Boolean).join(" · "),
              img: card.querySelector(".lx-solution-card-image")?.getAttribute("src") || "",
              description: (card.dataset.solutionIntro || card.querySelector(":scope > span")?.textContent || "").trim().slice(0, 120),
            };
          }
          const title = product?.name || card?.querySelector(".product-title, .name, .nm, h3, strong")?.textContent?.trim() || "联想商品";
          const rawPrice = product?.price ? `¥${Number(product.price || 0).toLocaleString()}` : (card?.querySelector(".price, .pc-price, .eduprice .now")?.textContent || "").trim();
          const spec = (product?.description || card?.querySelector(".spec, .pc-spec, .etag")?.textContent || "").trim().replace(/\s+/g, " ");
          const img = product?.image_url ? imgUrl(product.image_url) : (card?.querySelector(".product-visual img, .shot img, img")?.getAttribute("src") || card?.querySelector(".product-visual img, .shot img, img")?.src || "/assets/product-placeholder.svg");
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
          document.querySelectorAll(".lx-pick-btn.picked").forEach((b) => {
            b.classList.remove("picked");
            b.setAttribute("aria-pressed", "false");
          });
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
          const isSolution = data.type === "solution";
          const solutionCount = state.refProducts.filter(p => p.type === "solution").length;
          if ((isSolution && solutionCount >= 3) || (!isSolution && state.refProducts.length >= 5)) {
            toast(isSolution ? "最多引用 3 个方案哦" : "最多引用 5 个商品哦");
            return;
          }
          const item = {
            sku: data.sku,
            type: data.type || "product",
            name: data.name,
            price: data.price || "",
            sector: data.sector || "",
            scenario: data.scenario || "",
            image_url: data.img || data.image_url || "",
            description: (data.description || data.spec || "").slice(0, 120),
          };
          state.refProducts.push(item);
          state.refMsg = null;
          lxRenderRefChips(composer, attach, ta, send);
          if (data.sku) document.querySelectorAll(`.lx-pick-btn[data-pick-sku="${CSS.escape(data.sku)}"]`).forEach((button) => {
            button.classList.add("picked");
            button.setAttribute("aria-pressed", "true");
          });
          if (opts.toast !== false) toast(isSolution ? "已引用方案，直接提问即可" : "已引用商品，直接提问即可");
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
            const rm = `<button type="button" data-ref-remove-idx="${i}" aria-label="移除" style="width:16px;height:16px;border:none;background:none;cursor:pointer;color:#979797;font-size:15px;line-height:1;padding:0;flex-shrink:0;">×</button>`;
            if (n === 1) {
              // 1 个：带图 + 名称 + 价格/规格 的完整卡
              const sub = [p.price ? `¥${p.price}` : "", String(p.description || "").slice(0, 30)].filter(Boolean).join(" · ");
              return `<span class="lx-ref-chip-rich" data-ref-chip-idx="${i}" style="flex:0 1 auto;max-width:360px;display:inline-flex;align-items:center;gap:9px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:10px;padding:7px 11px;">
                <img src="${esc(img)}" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:6px;flex-shrink:0;">
                <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
                  <span style="font-size:13px;font-weight:600;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${esc(String(p.name || ""))}</span>
                  ${sub ? `<span style="font-size:11px;color:#979797;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${esc(sub)}</span>` : ""}
                </span>
                ${rm}
              </span>`;
            }
            // 2-5 个：等分宽度，精简（图 + 名）
            return `<span class="lx-ref-chip-mini" data-ref-chip-idx="${i}" style="flex:1 1 0;min-width:0;display:inline-flex;align-items:center;gap:6px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:8px;padding:5px 7px;">
              <img src="${esc(img)}" alt="" style="width:30px;height:30px;object-fit:contain;border-radius:5px;flex-shrink:0;">
              <span style="min-width:0;flex:1;font-size:12px;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(String(p.name || ""))}</span>
              ${rm}
            </span>`;
          }).join("");
          attach.innerHTML = `<div class="lx-ref-chips" style="display:flex;gap:9px;align-items:stretch;padding:6px 2px 3px;">${chipsHtml}</div>`;
          composer?.classList.add("has");
          send?.classList.add("pulse");
          const onlySolutions = state.refProducts.every(p => p.type === "solution");
          if (ta) ta.placeholder = onlySolutions
            ? (n === 1 ? "想了解这个方案的什么？比如能力、场景、如何落地…" : "想了解这几个方案的什么？比如能力、对比、如何落地…")
            : (n === 1 ? "想了解这款商品的什么？比如优惠、对比、是否适合我…" : "想了解这几款商品的什么？比如优惠、对比、是否适合我…");
          if (ta) {
            const comparePrompt = "帮我对比下这几款方案";
            const previousAutoPrompt = ta.dataset.solutionAutoPrompt || "";
            if (onlySolutions && n >= 2 && (!ta.value.trim() || ta.value === previousAutoPrompt)) {
              ta.value = comparePrompt;
              ta.dataset.solutionAutoPrompt = comparePrompt;
              ta.dispatchEvent(new Event("input", { bubbles: true }));
            } else if ((!onlySolutions || n < 2) && previousAutoPrompt && ta.value === previousAutoPrompt) {
              ta.value = "";
              delete ta.dataset.solutionAutoPrompt;
              ta.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
          // × 按钮事件
          attach.querySelectorAll("[data-ref-remove-idx]").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const idx = Number(btn.dataset.refRemoveIdx);
              if (isNaN(idx)) return;
              const removed = state.refProducts[idx];
              state.refProducts.splice(idx, 1);
              if (removed?.sku) document.querySelectorAll(`.lx-pick-btn[data-pick-sku="${CSS.escape(removed.sku)}"]`).forEach((button) => {
                button.classList.remove("picked");
                button.setAttribute("aria-pressed", "false");
              });
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
          if (card?.classList.contains("lx-solution-card")) {
            const solutionPayload = lxProductRefPayload(null, card);
            if (!solutionPayload?.name) return toast("方案信息获取失败");
            lxDockProductRef(solutionPayload);
            return;
          }
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
          const isSolution = card.classList.contains("lx-solution-card");
          const picked = Array.isArray(state.refProducts) && state.refProducts.some(p => p.sku === sku);
          card.insertAdjacentHTML("beforeend", `<button class="lx-pick-btn${picked ? " picked" : ""}" type="button" data-pick-sku="${esc(sku)}" title="${isSolution ? "引用这个方案提问" : "引用这个商品提问"}" aria-label="${isSolution ? "引用方案" : "引用商品"}" aria-pressed="${picked ? "true" : "false"}"><img src="../icons/global-check.svg" alt="" aria-hidden="true"></button>`);
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

        // 序号解析已收口到 app-intent.js（window.__lxParseOrdinal / __lxParseOrdinals），此处不再重复定义
        // 当前浏览上下文：用户正在看什么 → 决定下单/选N个操作谁
        function lxCurrentContext() {
          const activeTab = (state.tabs || []).find((t) => t.id === state.activeTabId);
          if ((activeTab && (activeTab.id === "compare" || activeTab.kind === "compare")) || state.activeTabId === "compare") {
            return { type: "compare", product: null, products: (state.compare || []).slice() };
          }
          if (activeTab && activeTab.kind === "detail") {
            const pool = [...(state.products || []), ...(state.siteProducts || []), ...(state.floorProducts || []), ...(state.compare || [])];
            const prod = (state.currentProduct && state.currentProduct.sku === activeTab.sku)
              ? state.currentProduct
              : (pool.find((p) => p && p.sku === activeTab.sku) || state.currentProduct);
            return { type: "detail", product: prod || null, products: [] };
          }
          if (activeTab && Array.isArray(activeTab.products) && activeTab.products.length) {
            return { type: "list", product: null, products: activeTab.products.slice() };
          }
          // 注意：currentProduct 残留兜底挪到可见卡枚举之后——用户开过商详再逛楼层页时，
          // 残留的 currentProduct 曾把上下文短路成 detail（products 空），「打开第三个/对比123」
          // 对着满屏楼层卡还是提示没商品（真机反馈）。可见卡优先 = 视觉顺序原则。
          // 「第N个」候选列表：完全按用户屏幕上看到的卡片顺序（DOM 顺序）枚举，序号 = 视觉顺序。
          // 之前用 reco tab 拼接导致「第一个」点到另一个列表的第一项、楼层卡又选不到（只有3个）——弃用。
          const merged = [];
          const seen = new Set();
          // 商品解析池：覆盖所有来源 + 官方商品（楼层卡多来自这里）
          const pool = [
            ...(state.products || []), ...(state.siteProducts || []),
            ...(state.floorProducts || []), ...(state.compare || []),
            ...Object.values(state.officialProducts || {}),
          ];
          (state.tabs || []).forEach((t) => { if (Array.isArray(t.products)) pool.push(...t.products); });
          const bySku = {};
          pool.forEach((p) => { if (p && p.sku) bySku[String(p.sku)] = p; });
          const pushBySku = (sku, fallbackEl) => {
            if (!sku || seen.has(sku)) return;
            const p = bySku[sku] || (fallbackEl ? lxCardToProduct(fallbackEl, sku) : null);
            if (p) { seen.add(sku); merged.push(p); }
          };
          // 按屏幕从上到下、从左到右枚举可见商品卡（楼层网格 + 推荐墙 + reco 卡片）
          const cardSel = "[data-cat-floor-grid] [data-open-product], [data-site-floors] [data-open-product], .lx-floor-products [data-open-product], .lx-p0-reco [data-open-product], .content [data-open-product]";
          const cards = Array.from(document.querySelectorAll(cardSel))
            .filter((el) => el.offsetParent !== null); // 只数可见的
          cards.forEach((el) => pushBySku(String(el.getAttribute("data-open-product") || ""), el));
          if (merged.length) return { type: "list", product: null, products: merged };
          if (state.currentProduct) return { type: "detail", product: state.currentProduct, products: [] };
          const visible = [...(state.products || []), ...(state.siteProducts || [])];
          if (visible.length) return { type: "list", product: null, products: visible.slice() };
          return { type: "other", product: null, products: [] };
        }
        // 池里查不到时，从卡片 DOM 抠出最小商品对象（名/价/图），保证「第N个」永远拿得到能下单的商品
        function lxCardToProduct(el, sku) {
          const card = el.closest(".lx-floor-product, .lx-product-mini-card, .card, .lx-sim-card") || el;
          const name = (card.querySelector(".product-title, .lx-sim-name, .lx-mini-name, h3")?.textContent || "").trim()
            || (card.getAttribute("aria-label") || "").trim() || "联想商品";
          const priceTxt = (card.querySelector(".price, .lx-sim-price, .lx-mini-price")?.textContent || "").replace(/[^\d.]/g, "");
          const img = card.querySelector("img");
          return { sku: String(sku), name, price: Number(priceTxt) || 0, image_url: img ? img.getAttribute("src") : "" };
        }
        function lxPickNth(products, n) {
          if (!Array.isArray(products) || !products.length) return { error: "当前没有可选的商品列表，先打开商品或推荐看看吧" };
          if (n < 1 || n > products.length) return { error: `当前列表只有 ${products.length} 个商品，请选 1-${products.length}` };
          return { product: products[n - 1] };
        }
        // 操作目标卡片「按下去」反馈：找到 sku 对应卡片 → 滚动可见 → 按压动画(缩小弹回+闪光) → 动画结束后执行 cb
        // 通用「按下去」动效：对任意元素施加按压动画，动效进行中(约300ms)就执行 cb，500ms 内有反应不拖沓
        function lxPressEl(el, cb) {
          if (!el) { if (cb) cb(); return; }
          try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_e) {}
          el.classList.add("lx-op-press");
          setTimeout(() => el.classList.remove("lx-op-press"), 420);
          // 动效起手后 300ms 就执行动作（打开/下单），用户「看到按下→很快就开」
          setTimeout(() => { if (cb) cb(); }, 300);
        }
        function lxFlashCard(sku, cb) {
          let card = null;
          if (sku) {
            const el = document.querySelector(`[data-open-product="${(window.CSS && CSS.escape) ? CSS.escape(sku) : sku}"]`);
            card = el ? (el.closest(".lx-floor-product, .lx-product-mini-card, .lx-sim-card, .phead, .bodycell") || el) : null;
          }
          if (!card) { cb(); return; } // 找不到卡（如当前商详页）直接执行
          lxPressEl(card, cb);
        }
        function lxResolveRecommendedProduct() {
          const pool = [
            ...(state._comparePageItems || []),
            ...(state.compare || []),
            ...(state.products || []),
            ...(state.siteProducts || []),
            ...(state.floorProducts || []),
          ];
          (state.tabs || []).forEach((tab) => { if (Array.isArray(tab.products)) pool.push(...tab.products); });
          const bySku = (sku) => sku ? pool.find((item) => item && item.sku === sku) || null : null;
          const colFromDom = () => {
            const marked = document.querySelector('.lx-cmp-skin[data-v="1"] .phead.lx-cmp-pick[data-col], .lx-cmp-skin[data-v="1"] .lx-cmp-pick-flag')?.closest?.('[data-col]');
            const idx = marked ? Number(marked.getAttribute('data-col')) : -1;
            if (Number.isInteger(idx) && idx >= 0) return (state._comparePageItems || [])[idx] || null;
            return null;
          };
          return state._compareRecommendedProduct || bySku(state._compareRecommendedSku) || colFromDom() || (() => {
            const activeTab = (state.tabs || []).find((tab) => tab.id === state.activeTabId);
            if (activeTab && Array.isArray(activeTab.products) && activeTab.products.length) return activeTab.products[0];
            if (state.currentProduct) return state.currentProduct;
            const ctx = lxCurrentContext();
            return ctx.product || (ctx.products && ctx.products.length ? ctx.products[0] : null);
          })();
        }

        // 对话下单：分步「看得见」——打开商品详情(先稳住) → 核对优惠 → 进下单领券，节奏放慢，弹窗在商详页之后
        function lxBuyWithIntro(prod) {
          if (!prod) return;
          const name = prod.name || "该商品";
          const short = name.slice(0, 18);
          const stepHtml = (steps) => `<div class="lx-op-steps">${steps.map((s) =>
            `<div class="lx-op-step ${s.state}"><span class="lx-op-step-ic">${s.state === "done" ? "✓" : s.state === "doing" ? '<span class="lx-op-spin"></span>' : ""}</span><span>${esc(s.label)}</span></div>`
          ).join("")}</div>`;
          const mk = (a, b, c) => stepHtml([
            { label: `打开「${short}」详情`, state: a },
            { label: "核对可用优惠", state: b },
            { label: "生成下单清单并领券", state: c },
          ]);
          let tip = null;
          try {
            tip = addMessage("ai", "", mk("doing", "wait", "wait"));
            if (tip) { tip._lxTransient = true; tip.dataset.lxTransient = "1"; }
          } catch (_e) {}
          const setBody = (h) => { const body = tip && tip.querySelector(".ai-body"); if (body) body.innerHTML = h; };
          // 步骤1：打开商品详情（立即，让右侧先稳定展示）
          if (prod.sku) openProduct(prod.sku);
          // 步骤2：商详页稳定后，核对优惠
          setTimeout(() => setBody(mk("done", "doing", "wait")), 700);
          // 步骤3：进领券下单 —— 先给「一键领优惠下单」按钮一个按下去动效，再真正下单
          setTimeout(() => setBody(mk("done", "done", "doing")), 1400);
          setTimeout(() => {
            setBody(mk("done", "done", "done"));
            const buyBtn = document.querySelector(".detail-primary");
            if (buyBtn) lxPressEl(buyBtn, () => oneClickBuy(prod));
            else oneClickBuy(prod);
          }, 1900);
        }

        // AI 页面操作执行器：对话即操作（用户要求关页面/切站/开功能时真实执行）
        function lxKeepHomeFullscreenAfterTabClose() {
          const isRootHome = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "/") === "/";
          const isFsContext = document.body.classList.contains("assistant-fullscreen") ||
            document.body.classList.contains("lx-auto-fs") ||
            document.body.classList.contains("lx-root-home") ||
            document.documentElement.classList.contains("lx-root-lxfd-prepaint");
          if (!isRootHome || !isFsContext) return;
          document.documentElement.classList.add("lx-root-lxfd-prepaint");
          document.body.classList.remove("lx-home-split", "lxfd-split-returning", "lxfd-exiting");
          document.body.classList.add("lx-root-home");
          document.body.dataset.page = "home";
          document.body.dataset.state = "chat";
          lxSetAutoFs(true);
        }
        function lxExecControl(op, target) {
          const siteMap = { shop: "personal", b: "business", biz: "enterprise" };
          const ops = {
            close_all_tabs: () => { lxRestoreChannelSplitHome(); toast("已关闭所有页面"); },
            close_other_tabs: () => {
              // 关其他/留当前一个（「留一排」「只留这个」「关多余」都走这里）
              const keep = state.activeTabId || (state.tabs && state.tabs[state.tabs.length - 1]?.id);
              if (!keep) { toast("当前没有其他标签"); return; }
              state.tabs = (state.tabs || []).filter((t) => t.id === keep);
              state.activeTabId = keep;
              lxRenderTabbar();
              lxActivateTab(keep);
              lxKeepHomeFullscreenAfterTabClose();
              toast("已关闭其他标签，只留当前页面");
            },
            close_tab: () => {
              // 指定标签名匹配；匹配不到（如「右侧标签」这类泛指）则退化为关其他、留当前
              const tab = (state.tabs || []).find((t) => target && (t.label || "").includes(target));
              if (tab) { lxCloseTab(tab.id); lxKeepHomeFullscreenAfterTabClose(); toast(`已关闭「${tab.label}」`); }
              else { ops.close_other_tabs(); }
            },
            go_home: () => {
              // 原地分屏(URL=/)里说「回首页」= 回到真首页：全屏单屏形态，带着对话回去
              // （不是右侧换货架——那是「个人及家庭」站不是首页）。不能点顶部"首页"导航：
              // state.page 切 home 会让楼层数据源早退，曾致右侧白屏
              if (document.body.classList.contains("lx-home-split")) {
                state.tabs = []; state.activeTabId = null; state.pageTrail = [];
                lxRenderTabbar();
                document.querySelector(".content")?.setAttribute("data-view", "list");
                if (typeof window.__lxfdEnterFromSplit === "function") {
                  window.__lxfdEnterFromSplit();
                  return;
                }
                // 兜底（lxfd 未就绪）：右侧回货架初始态
                if (state.page === "home" || !state.page) state.page = "personal";
                if (document.body.dataset.page === "home" || !document.body.dataset.page) document.body.dataset.page = "personal";
                loadProductsForPage();
                document.querySelector(".content")?.scrollTo({ top: 0, behavior: "smooth" });
                return;
              }
              document.querySelector('.main-nav [data-page="home"]')?.click();
            },
            switch_site: () => {
              // target 兼容两种来源：后端小模型给 shop/b/biz，本地意图给 personal/business/enterprise/brand
              const page = siteMap[target] || (["personal", "business", "enterprise", "brand"].includes(target) ? target : "personal");
              const lab = { personal: "个人及家庭", business: "中小企业", enterprise: "政教及大企业", brand: "品牌" }[page] || "该板块";
              routeTo(page);
              // 已在该站时 routeTo 的 URL 不变、可能无视觉变化——补一个可见提示，别让用户觉得"没执行"
              toast("已为你打开" + lab);
            },
            open_member: () => openMemberCenter(),
            open_coupon: () => openCouponCenter(),
            open_orders: () => lxOpenCommerceEntry("orders"),
            open_cart: () => lxOpenCommerceEntry("cart"),
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
              if (hit && hit.sku) { lxRevealContent(); openProduct(hit.sku); return; }
              if (!t) { toast("没说要打开哪款商品"); return; }
              // 当前列表没有（如刚回首页）→ 先查本地商品库秒开，查不到才退回官方检索
              lxRevealContent();
              lxAddInstantAi(`好的，正在为你打开「${t}」。`);
              fetch("/api/products?q=" + encodeURIComponent(t) + "&limit=1")
                .then((r) => r.json())
                .then((arr) => {
                  if (Array.isArray(arr) && arr[0] && arr[0].sku) openProduct(arr[0].sku);
                  else sendChat("帮我找" + t);
                })
                .catch(() => sendChat("帮我找" + t));
            },
            enter_fullscreen: () => {
              // 说「全屏」= 进 lxfd 门户全屏（带着对话导入，同「回首页」路径）。不限根路径分屏——
              // /shop-chat/ 等子站没有 lx-home-split 类，但 lxfd 层存在且导入正常（彩排实证），
              // 走遮罩式 lxSetAutoFs 会把对话留在原地、观众看到陌生欢迎页（彩排 blocker）
              if (typeof window.__lxfdEnterFromSplit === "function") {
                window.__lxfdEnterFromSplit();
                return;
              }
              lxSetAutoFs(true);
            },
            exit_fullscreen: () => { if (state.autoFs) lxSetAutoFs(false); else document.body.classList.remove("assistant-fullscreen"); },
            // 下单乐享推荐商品：优先取对比页「乐享最推荐」列，其次取当前推荐结果第一款
            buy_recommended: () => {
              const prod = lxResolveRecommendedProduct();
              if (!prod) { toast("还没有明确的推荐商品，请先查看推荐结果或点选一款商品"); return; }
              lxRevealContent();
              lxFlashCard(prod.sku, () => lxBuyWithIntro(prod));
            },
            // 下单当前正在看的商品（多商详页时是当前激活的那个）
            buy_current: () => {
              const ctx = lxCurrentContext();
              const prod = ctx.product || (ctx.products && ctx.products.length === 1 ? ctx.products[0] : null);
              if (!prod) { toast("请先打开一个商品，再说「下单」"); return; }
              lxRevealContent();
              lxFlashCard(prod.sku, () => lxBuyWithIntro(prod));
            },
            // 按序号操作列表第 N 个：target = "序号|动作"（buy/open/cart）
            buy_nth: () => {
              const [nStr, action = "buy"] = String(target || "").split("|");
              const n = Number(nStr);
              const ctx = lxCurrentContext();
              const picked = lxPickNth(ctx.products, n);
              if (picked.error) { toast(picked.error); return; }
              const prod = picked.product;
              lxRevealContent();
              lxFlashCard(prod.sku, () => {
                if (action === "open") { openProduct(prod.sku); }
                else if (action === "cart") { addCart(prod); }
                else { lxBuyWithIntro(prod); }
              });
            },
            // 按序号对比：target = "1,2,3"，从当前列表取对应商品加入对比（不丢给 AI 检索）
            compare_nth: () => {
              const nums = String(target || "").split(",").map(Number).filter((n) => n >= 1);
              const ctx = lxCurrentContext();
              const list = ctx.products || [];
              if (!list.length) { toast("当前没有可对比的商品列表，先让我推荐几款吧"); return; }
              const picks = [];
              const bad = [];
              nums.forEach((n) => { if (n <= list.length && list[n - 1]) picks.push(list[n - 1]); else bad.push(n); });
              if (picks.length < 2) { toast(`当前列表只有 ${list.length} 个商品，无法对比第 ${nums.join("、")} 个`); return; }
              state.compare = picks.slice(0, 8);
              save("lexiang.compare.v1", state.compare);
              lxRevealContent();
              lxUpsertCompareTab(null, null, true);
              if (bad.length) toast(`第 ${bad.join("、")} 个超出列表范围，已对比其余 ${picks.length} 款`);
            },
            // 裸对比（「对比一下吧」）：取当前可见/最近推荐列表前 4 款直接开对比
            compare_recent: () => {
              const ctx = lxCurrentContext();
              const list = (ctx.products && ctx.products.length ? ctx.products : (ctx.product ? [ctx.product] : [])).slice(0, 4);
              if (list.length < 2) { toast("当前没有可对比的商品列表，先让我推荐几款吧"); return; }
              state.compare = list;
              save("lexiang.compare.v1", state.compare);
              lxRevealContent();
              lxUpsertCompareTab(null, null, true);
            },
          };
          (ops[op] || (() => toast("暂不支持该页面操作")))();
        }

        // AI 产出可看内容时退出全屏（含手动全屏）、按需展开右侧；若仍在首页语境则此时才切到个人及家庭
        function lxRevealContent() {
          const wasFullscreen = document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs");
          if (wasFullscreen) {
            if (state.autoFs || document.body.classList.contains("lx-auto-fs")) lxSetAutoFs(false);
            else document.body.classList.remove("assistant-fullscreen", "lx-auto-fs");
          }
          // 若已进入首页原地分屏模式，布局已就位，跳过 routeTo 避免 URL 变化
          if (document.body.classList.contains("lx-home-split")) {
            document.documentElement.classList.remove("lx-root-lxfd-prepaint");
            document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lxfd-entering");
            document.body.classList.add("lxfd-split-entered");
            document.body.dataset.state = "chat";
            state.autoFs = false;
            window.__LXFD_FORCE = false;
            const lxfdLayer = document.querySelector(".lxfd");
            if (lxfdLayer) {
              lxfdLayer.style.display = "";
              lxfdLayer.style.visibility = "";
            }
            return;
          }
          if (state.page === "home" || !state.page) routeTo("personal");
        }

        function lxActivateTab(id) {
          const tab = (state.tabs || []).find((item) => item.id === id);
          if (!tab) return;
          // 切换既有标签只改变当前页，不得让页面渲染过程清空或覆盖其他已打开标签。
          const tabsBeforeSwitch = (state.tabs || []).slice();
          const restoreTabsAfterSwitch = () => {
            const tabsAfterSwitch = state.tabs || [];
            const currentById = new Map(tabsAfterSwitch.map((item) => [item.id, item]));
            state.tabs = tabsBeforeSwitch.map((item) => ({ ...item, ...(currentById.get(item.id) || {}) }));
            tabsAfterSwitch.forEach((item) => {
              if (!state.tabs.some((current) => current.id === item.id)) state.tabs.push(item);
            });
            state.activeTabId = id;
            lxRenderTabbar();
          };
          state.activeTabId = id;
          lxRenderTabbar();
          lxRunTab(tab);
          restoreTabsAfterSwitch();
          // 部分页面切换会在当前点击结束后补一次异步渲染；再次校准，避免它把标签栏判成单标签后隐藏。
          requestAnimationFrame(() => requestAnimationFrame(restoreTabsAfterSwitch));
          window.setTimeout(restoreTabsAfterSwitch, 120);
        }

        // 结果页切换后的唯一结构断言。它只校准状态，不重放点击或业务渲染：
        // 左右框架、真实页面注册表、活动 Tab 与左侧卡片在同一次提交中保持一致。
        function lxAssertGovernedSplitResultState(activeId) {
          const tabId = String(activeId || state.activeTabId || "");
          document.documentElement.classList.remove("lx-root-lxfd-prepaint", "lx-route-prepaint");
          document.body.classList.remove(
            "assistant-fullscreen", "lx-auto-fs", "lx-root-home", "lxfd-entering",
            "lxfd-exiting", "lxfd-split-returning", "assistant-collapsed"
          );
          document.body.classList.add("lx-home-split", "lxfd-split-entered");
          document.body.dataset.state = "chat";
          window.__LXFD_FORCE = false;
          state.autoFs = false;
          const fullscreenLayer = document.querySelector(".lxfd");
          if (fullscreenLayer) {
            fullscreenLayer.style.display = "";
            fullscreenLayer.style.visibility = "";
          }
          state.tabs = (state.tabs || []).filter((item, index, rows) => {
            const itemId = String(item?.id || "");
            return itemId && item?.kind !== "site" && !itemId.startsWith("site:") &&
              rows.findIndex((row) => String(row?.id || "") === itemId) === index;
          });
          if (tabId && state.tabs.some((item) => item.id === tabId)) state.activeTabId = tabId;
          lxRenderTabbar();
          lxSyncAnswerCtaActiveState(state.activeTabId || "");
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
          const isServiceReco = products.length > 0 && products.every((p) => String(p?.sku || "").startsWith("SERVICE-"));
          pageBox.classList.toggle("lx-service-reco-page", isServiceReco);
          const disclaimer = `<p class="lx-p0-disclaimer">${isServiceReco ? "推荐由联想乐享基于当前设备与地区条件生成；价格、适用性、库存与履约范围以服务商品详情页和结算页为准。" : "推荐由联想乐享基于你的需求生成，价格与配置以详情页为准。"}</p>`;
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

          const intro = `<div class="reco-head"><h2${isServiceReco ? ' style="font-weight:500!important"' : ""}>${esc(tab.label || "AI 推荐")}</h2><span>${isServiceReco ? `已按设备与地区匹配 ${products.length} 款服务商品` : `根据你的需求挑出 ${products.length} 款，可继续追问缩小范围`}</span></div>`;
          if (products.length <= 6) {
            const cmpN = Math.min(products.length, 8);
            const compareAll = !isServiceReco && products.length >= 2
              ? `<div class="lx-p0-actions" style="margin-top:12px"><button class="lx-p0-btn" type="button" data-cmp-local="${esc(products.slice(0, cmpN).map((p) => p.sku).join(","))}">对比这 ${cmpN} 款</button></div>`
              : "";
            pageBox.innerHTML = intro + products.map((p) => `
              <div class="reco-row">
                <img src="${p.official ? esc(p.image_url) : esc(imgUrl(p.image_url))}" alt="${esc(p.name)}" loading="lazy" data-open-product="${esc(p.sku)}" />
                <div class="reco-row-main" data-open-product="${esc(p.sku)}">
                  <strong${isServiceReco ? ' style="font-weight:500!important"' : ""}>${esc(p.name)}</strong>
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
                    ${isServiceReco
                      ? `<button class="lx-p0-btn" type="button" data-open-product="${esc(p.sku)}">查看详情</button><button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">立即购买</button>`
                      : p.official
                      ? `<button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">看详情</button><button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">立即购买</button>`
                      : `<button class="lx-p0-btn primary" type="button" data-open-product="${esc(p.sku)}">看详情</button><button class="lx-p0-btn" type="button" data-reco-compare="${esc(p.sku)}">加对比</button>`}
                  </div>
                </div>
              </div>`).join("") + compareAll + disclaimer;
          } else {
            pageBox.innerHTML = intro + `<div class="reco-grid">${products.map(lxProductMiniCard).join("")}</div>` + disclaimer;
          }
        }

        function lxRestoreChannelSplitHome() {
          const channelPage = lxPageFromPath();
          const targetPage = ["personal", "business", "enterprise", "brand"].includes(channelPage)
            ? channelPage
            : "personal";
          state.tabs = [];
          state.activeTabId = null;
          state.pageTrail = [];
          state.page = targetPage;
          state.activeSiteFloorTab = "推荐";
          document.documentElement.classList.remove("lx-root-lxfd-prepaint");
          document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lxfd-entering", "lxfd-exiting", "lxfd-split-returning");
          document.body.classList.add("lx-home-split", "lxfd-split-entered");
          document.body.dataset.page = targetPage;
          document.body.dataset.state = "default";
          window.__LXFD_FORCE = false;
          const content = document.querySelector(".content");
          content?.setAttribute("data-view", "list");
          lxEnsureCurrentSiteTab(true);
          renderProductCards();
          lxRenderSiteFloors();
          content?.scrollTo({ top: 0, behavior: "smooth" });
        }

        function lxCloseTab(id) {
          if (String(id || "").startsWith("site:")) {
            lxActivateTab(id);
            return;
          }
          if (String(id || "").startsWith("info:solution-detail:")) {
            const closingTab = (state.tabs || []).find((item) => item.id === id) ||
              state.solutionDetailTabs?.[id] || lxSpecificSolutionTabCache.get(id) || null;
            if (closingTab) lxClosedSpecificSolutionTabCache.set(id, { ...closingTab });
            if (state.solutionDetailTabs) delete state.solutionDetailTabs[id];
            lxSpecificSolutionTabCache.delete(id);
          }
          if (String(id || "").startsWith("info:solution-compare:")) {
            const closingTab = (state.tabs || []).find((item) => item.id === id) ||
              state.solutionCompareTabs?.[id] || lxSolutionCompareTabCache.get(id) || null;
            if (closingTab) {
              state.solutionCompareTabs = state.solutionCompareTabs || {};
              state.solutionCompareTabs[id] = { ...closingTab };
              lxSolutionCompareTabCache.set(id, { ...closingTab });
            }
          }
          state.tabs = (state.tabs || []).filter((item) => item.id !== id);
          if (state.activeTabId === id) {
            const next = state.tabs[state.tabs.length - 1] || null;
            state.activeTabId = next ? next.id : null;
            if (next) lxRunTab(next);
          }
          lxRenderTabbar();
          // 删除最后一个结果标签后，统一回到当前 URL 对应的频道首页。
          if ((state.tabs || []).length === 0) lxRestoreChannelSplitHome();
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
                lxRestoreChannelSplitHome();
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
          // 官方文本常自带 HTML 实体（「我的」&gt;「设置」），不先解码会被 esc 二次转义显示成字面 &gt;（真机反馈）
          const src = String(text || "").replace(/\r/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]*_\._[ \t]*/g, " ")
            .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
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
          const seenLabel = new Set(); // ram/memory、storage/disk 中文标签相同，只留先见的一个，防「内存」行出现两次
          products.forEach((product) => Object.keys(product.specs || {}).forEach((key) => {
            // 白名单：只展示有中文映射的参数；内部字段（materialNumber/screen_res 等）与分类行不外露
            if (DETAIL_SPEC_SKIP_KEYS.has(key) || seen.has(key)) return;
            if (!DETAIL_SPEC_LABELS[key] || /^lvl\d/.test(key)) return;
            if (seenLabel.has(DETAIL_SPEC_LABELS[key])) return;
            seen.add(key);
            seenLabel.add(DETAIL_SPEC_LABELS[key]);
            keys.push(key);
          }));
          const cmpPriceNum = (value) => Number(String(value ?? "").replace(/[^\d.]/g, "")) || 0;
          const prices = products.map(p => cmpPriceNum(p.price));
          const validPrices = prices.filter(p => p > 0);
          const minPrice = validPrices.length >= 2 ? Math.min(...validPrices) : -1;
          const bestPriceIdx = minPrice > 0 ? prices.indexOf(minPrice) : -1;
          const bestTag = '<span class="best-tag">优</span>';
          const spark = window.__lxApprovedIcon("global-sparkle");
          const cartIcon = window.__lxApprovedIcon("global-cart");
          const priceText = (value) => {
            const n = cmpPriceNum(value);
            return n > 0 ? n.toLocaleString() : "—";
          };
          const cmpAiText = (product) => {
            const specs = product.specs || {};
            const text = `${product.name || ""} ${Object.values(specs).join(" ")}`.toLowerCase();
            const highlights = [];
            if (/rtx|独显|显卡/.test(text)) highlights.push("图形性能更强");
            if (/oled|2\.8k|高刷|120hz|144hz|240hz/.test(text)) highlights.push("屏幕观感细腻");
            if (/14英寸|轻薄|air|1\.\d+kg/.test(text)) highlights.push("轻薄便携");
            if (/32gb|64gb|96gb|128gb|192gb|32g|64g|96g|128g|192g/.test(text)) highlights.push("多任务更从容");
            if (/1tb|2tb|4tb|512gb/.test(text)) highlights.push("存储空间充足");
            if (!highlights.length) highlights.push("配置均衡", "日常使用稳定");
            const scene = /游戏|rtx|独显/.test(text) ? "游戏创作" : /商务|thinkpad|thinkbook/.test(text) ? "办公差旅" : "学习办公";
            return `${highlights.slice(0, 3).join("，")}，适合${scene}。`;
          };
          const headCells = products.map((product, i) => {
            const custom = /定制|定制款/.test(product.name || "") || product.custom;
            const cleanName = String(product.name || "").replace(/^【?定制款】?\s*/, "");
            return `<div class="cell phead bodycell" data-col="${i}"><div class="pname lx-cmp-name" data-open-product="${esc(product.sku)}">${custom ? '<span class="cz">定制款</span>' : ""}${esc(cleanName)}</div><div class="price pr"><span class="cur">¥</span>${priceText(product.price)}${i === bestPriceIdx ? bestTag : ""}</div></div>`;
          }).join("");
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
            return `<div class="cell rowlabel">${esc(DETAIL_SPEC_LABELS[key] || key)}</div>${values.map((value, i) => `<div class="cell val bodycell${i === bestIndex ? ' best' : ""}" data-col="${i}">${i === bestIndex ? `<span class="v">${esc(value)} ${bestTag}</span>` : esc(value)}</div>`).join("")}`;
          }).join("");
          const actionsRow = opts.actions
            ? `<div class="cell rowlabel">操作</div>${products.map((product, i) => `<div class="cell op bodycell" data-col="${i}"><button class="buy" type="button" data-cmp-buy="${esc(product.sku)}">立即购买</button><button class="cart" type="button" data-cmp-cart="${esc(product.sku)}">${cartIcon}加购</button></div>`).join("")}`
            : "";
          const aiRow = `<div class="cell rowlabel ai-label">${spark}<span>乐享AI解读</span></div>${products.map((product, i) => `<div class="cell ai-cell bodycell" data-col="${i}"><span class="ai-text">${esc(cmpAiText(product))}</span></div>`).join("")}`;
          return `<div class="lx-cmp-wrap"><div class="lx-cmp-skin" data-v="1" style="--lx-cmp-cols:${products.length}"><div class="tbl"><div class="cell rowlabel" style="border-bottom:1px solid var(--border)">商品</div>${headCells}${aiRow}${bodyRows}${actionsRow}</div></div><p class="foot-note">浅紫底纹为差异项，<b>「优」</b>标记为该项最优。参数信息以商品详情页为准。</p></div>`;
        }

        if (!window.__lxCmpSkinHoverBound) {
          window.__lxCmpSkinHoverBound = true;
          document.addEventListener("pointerover", (event) => {
            const cell = event.target.closest?.('.lx-cmp-skin[data-v="1"] .bodycell[data-col]');
            const root = cell?.closest('.lx-cmp-skin[data-v="1"]');
            if (root) root.dataset.hoverCol = cell.dataset.col || "";
          }, true);
          document.addEventListener("pointerout", (event) => {
            const root = event.target.closest?.('.lx-cmp-skin[data-v="1"]');
            if (root && !root.contains(event.relatedTarget)) delete root.dataset.hoverCol;
          }, true);
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

        function lxVipIcon(name) {
          const icons = {
            crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16l1-11-5.2 4.2L12 4l-3.8 7.2L3 7l1 11Zm1 2h14v2H5v-2Z"/></svg>',
            tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13 11 22 2 13V4h9l9 9Z"/><path d="M7.5 8.5h.01"/></svg>',
            coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v8c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
            ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z"/><path d="M15 6v12" stroke-dasharray="2 2"/></svg>',
            flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 8a3 3 0 0 0 2.5 4.5h9a3 3 0 0 0 2.5-4.5l-5-8V3"/><path d="M8 16h8"/></svg>',
            cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
            headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-7h4M4 17v-4h4v7H6a2 2 0 0 1-2-2v-1Z"/><path d="M13 20h3"/></svg>',
            check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></svg>',
            stairs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h5v-4h5v-4h6"/><path d="M4 22h16"/></svg>',
            arr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
            star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
            gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/></svg>',
            shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1 4H5L4 7ZM5 11v9h14v-9M3 7l1-3h16l1 3"/></svg>',
            pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
          };
          return icons[name] || "";
        }

        function lxVipModel() {
          const offMember = window.__lxMember;
          const offLogged = offMember && offMember.guest === false;
          const logged = offLogged || !!state.user;
          const maskPhone = (value) => {
            const raw = String(value || "").trim();
            const digits = raw.replace(/\D/g, "");
            if (digits.length >= 7) return digits.slice(0, 3) + "****" + digits.slice(-4);
            return raw || "游客";
          };
          const beanValue = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? n.toLocaleString("zh-CN") : String(value || "—");
          };
          let name;
          if (offLogged && offMember.loginName) name = maskPhone(offMember.loginName);
          else if (state.user) name = state.user.phone ? maskPhone(state.user.phone) : (state.user.nickname || "会员");
          else name = "游客";
          const rawBeans = offMember?.points ?? offMember?.beanBalance ?? offMember?.beans ?? offMember?.score;
          return {
            name: "联小想",
            tierName: "铂金会员",
            beanBalance: rawBeans != null ? beanValue(rawBeans) : (offLogged ? "—" : (logged ? "1,280" : "8,860")),
            subtitle: "你已加入联想会员2679天",
          };
        }

        function lxMemberQueryProfile() {
          const enterprise = state.page === "business" || state.page === "enterprise";
          if (enterprise) {
            const points = Number(lxEntState().points || 0).toLocaleString("zh-CN");
            return {
              enterprise: true,
              copy: `当前企业会员账户可用**${points}积分**，可兑换采购券、办公外设和企业服务；**企业价、采购补贴与账期权益**已为你集中整理。`,
              cardDesc: `${points}积分 · 企业价 · 采购补贴 · 账期权益`
            };
          }
          const model = lxVipModel();
          return {
            enterprise: false,
            copy: `联小想当前为**${model.tierName}**，已加入会员2679天，乐豆余额**${model.beanBalance}豆**，可用于抵现、兑换好礼；等级权益、任务和活动已为你整理。`,
            cardDesc: `${model.tierName} · ${model.beanBalance}乐豆 · 等级权益与任务`
          };
        }
        window.__lxMemberQueryProfile = lxMemberQueryProfile;

        // ponytail: 行为驱动排序 — 无真埋点，用 localStorage + 对话关键词近似；
        // 要真行为排序需接入埋点系统，现在是 POC 轻量实现。
        function lxMemberModuleOrder() {
          const DEFAULT_ORDER = ["等级成长", "乐豆", "权益", "任务", "活动", "兑换", "测评"];
          const KEYWORD_MAP = [
            { keys: ["乐豆", "兑换", "积分", "抵现"], mod: "乐豆" },
            { keys: ["兑换", "商城", "好物", "兑换记录"], mod: "兑换" },
            { keys: ["签到", "任务", "打卡", "赚豆"], mod: "任务" },
            { keys: ["活动", "会员日", "试用", "限时"], mod: "活动" },
            { keys: ["等级", "升级", "成长值", "铂金", "钻石", "黄金", "认证"], mod: "等级成长" },
            { keys: ["权益", "黑卡", "专属", "优惠券", "特权"], mod: "权益" },
            { keys: ["评测", "测评", "写评测", "晒单"], mod: "测评" },
          ];
          // 读取最近点击的模块（localStorage）
          let lastMod = null;
          try { lastMod = localStorage.getItem("lexiang.member.lastModule"); } catch (e) {}
          // 从对话文本中匹配模块关键词
          let textMod = null;
          const lastText = (typeof state !== "undefined" && state.lastUserText) ? state.lastUserText : "";
          if (lastText) {
            for (const { keys, mod } of KEYWORD_MAP) {
              if (keys.some((k) => lastText.includes(k))) { textMod = mod; break; }
            }
          }
          // 优先级：对话关键词 > localStorage，都没有则默认顺序
          const hitMod = textMod || lastMod;
          if (hitMod && DEFAULT_ORDER.includes(hitMod)) {
            return [hitMod, ...DEFAULT_ORDER.filter((m) => m !== hitMod)];
          }
          return DEFAULT_ORDER.slice();
        }

        function lxRenderVipSkin() {
          const model = lxVipModel();

          // ---- 顶部会员卡（保留观的精致卡，不动 .lx-vip-skin 结构）----
          const vcardHtml = `
            <section class="vp lx-vip-skin" data-v="6">
              <div class="vcard">
                <div class="vc-top">
                  <span class="ava">${lxVipIcon("crown")}</span>
                  <span class="vc-main">
                    <span class="ph">${esc(model.name)} <span class="tier">${lxVipIcon("crown")}${esc(model.tierName)}</span></span>
                    <span class="vc-sub">${esc(model.subtitle)}</span>
                  </span>
                  <button class="vbtn ghost vc-cta" type="button" data-quick-ask="打开会员中心，查看我的会员权益">会员中心 ${lxVipIcon("arr")}</button>
                </div>
                <div class="beanbar">
                  <span class="bk">乐豆余额</span>
                  <span class="bv">${esc(model.beanBalance)}<span class="u">豆</span></span>
                  <span class="bd">1000 豆抵 ¥10</span>
                  <span class="sp"></span>
                  <button class="vbtn solid" type="button" data-quick-ask="乐豆商城能兑换什么，帮我推荐">去兑换</button>
                  <button class="vbtn ghost" type="button" data-quick-ask="会员乐豆规则是什么">规则</button>
                </div>
              </div>
            </section>`;

          // ---- 7 大模块定义 ----
          const qc = (title, desc, ask, extra) =>
            `<div class="lx-floor-card${extra ? " " + extra : ""}" data-quick-ask="${esc(ask)}" data-mem-mod="${esc(ask)}" role="button" tabindex="0"><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`;

          const MODULES = {
            "等级成长": () => {
              const body =
                qc("等级权益对比", "黄金/铂金/钻石/黑卡各级差异一览", "帮我对比联想会员各等级权益有什么差别") +
                qc("我的成长值", "查看当前积累的成长值进度", "我的会员成长值是多少，距离升级还差多少") +
                qc("怎么升级", "了解升级所需成长值和途径", "联想会员怎么快速升级，升级需要多少成长值") +
                qc("会员 FAQ", "常见问题解答，入会/等级/权益", "联想会员常见问题解答，帮我列一下") +
                qc("职场认证", "职场身份认证解锁专属权益", "怎么做职场认证，认证后有什么额外权益") +
                qc("学生认证", "学生身份认证享教育特价", "学生认证怎么做，认证后有什么优惠");
              return { title: "等级和成长体系", sub: "等级 · 成长值 · 认证", body, modKey: "等级成长" };
            },
            "乐豆": () => {
              const body =
                qc("乐豆兑换秒杀", "限时乐豆专属秒杀好物", "现在乐豆兑换秒杀有什么商品，帮我推荐") +
                qc("乐豆 IP 形象", "认识联想乐豆 IP 形象故事", "联想乐豆 IP 形象是什么，有什么故事") +
                qc("乐豆规则说明", "怎么赚乐豆，1000豆抵¥10", "联想乐豆的获取规则和使用规则详细说明") +
                qc("积分规则", "积分与乐豆的关系和折算", "联想积分和乐豆是什么关系，怎么换算");
              return { title: "乐豆", sub: `余额 ${model.beanBalance} 豆 · 兑换 · 规则`, body, modKey: "乐豆" };
            },
            "权益": () => {
              const body =
                qc("黄金会员权益", "黄金专属折扣、月度券包详情", "黄金会员有哪些专属权益") +
                qc("铂金会员权益", "铂金专属特权与升级好处", "铂金会员有哪些专属权益") +
                qc("钻石会员权益", "钻石顶级权益与专属服务", "钻石会员有哪些专属权益") +
                qc("黑卡专区", "黑卡会员超高端特权，专属通道", "黑卡会员有什么专属特权，怎么申请黑卡", "lx-mem-blackcard") +
                qc("会员专属优惠", "分级专属折扣与限时特惠", "我能享受哪些会员专属优惠");
              return { title: "权益", sub: "分级权益 · 黑卡专区 · 专属优惠", body, modKey: "权益" };
            },
            "任务": () => {
              const body =
                qc("每日签到", "签到 +10 豆，连续签到有额外奖励", "怎么每日签到赚乐豆，有连续签到奖励吗") +
                qc("今日任务", "查看今天能做哪些任务赚乐豆", "今天有哪些任务可以做，帮我列出来") +
                qc("专属任务", "我的专属任务，完成赚更多豆", "我有哪些专属任务，完成后能赚多少乐豆") +
                qc("任务中心", "进入任务中心查看全部任务", "打开任务中心，帮我列出所有可做的任务");
              return { title: "任务", sub: "签到 · 日常任务 · 专属任务", body, modKey: "任务" };
            },
            "活动": () => {
              const body =
                qc("会员日", "每月 18 日乐豆双倍，专属折扣", "会员日是哪天，有什么活动和优惠") +
                qc("限时活动", "当前正在进行的限时会员活动", "现在有哪些限时会员活动，帮我整理") +
                qc("0 元试用", "申请新品 0 元免费体验资格", "怎么申请联想新品 0 元试用，有哪些产品可以试") +
                qc("新品试用", "会员专属新品抢先体验通道", "联想新品试用有哪些，我能参加吗");
              return { title: "活动", sub: "会员日 · 限时活动 · 新品试用", body, modKey: "活动" };
            },
            "兑换": () => {
              const body =
                qc("进入积分商城", "用乐豆兑换优惠券、好物、配件", "帮我打开积分商城，我想用乐豆兑换东西") +
                qc("热门兑换好物", "近期热门乐豆兑换商品推荐", "现在积分商城里最热门的兑换商品是什么") +
                qc("我的兑换记录", "查看历史兑换订单和进度", "帮我查一下我的乐豆兑换记录");
              return { title: "兑换", sub: "积分商城 · 乐豆换好物", body, modKey: "兑换" };
            },
            "测评": () => {
              const body =
                qc("会员评测专区", "查看会员专属产品评测内容", "联想会员评测专区有什么，帮我推荐值得看的评测") +
                qc("写评测赚乐豆", "写真实使用评测可获乐豆奖励", "怎么写产品评测赚乐豆，有什么要求") +
                qc("看他人评测", "真实用户评测，买前参考", "帮我找一下联想笔记本的真实用户评测");
              return { title: "测评", sub: "会员评测 · 写评测赚豆", body, modKey: "测评" };
            },
          };

          // ---- 按行为排序渲染楼层 ----
          const order = lxMemberModuleOrder();
          const floorsHtml = order.map((key) => {
            if (!MODULES[key]) return "";
            const { title, sub, body, modKey } = MODULES[key]();
            return `<div class="lx-mem-floor" data-mem-floor="${esc(modKey)}">
              <div class="lx-mem-floor-hd">
                <span class="lx-mem-floor-title">${esc(title)}</span>
                <span class="lx-mem-floor-sub">${esc(sub)}</span>
              </div>
              <div class="lx-mem-floor-grid">${body}</div>
            </div>`;
          }).join("");

          return `
            <div class="lx-vip-wrap lx-vip-floors-wrap">
              ${vcardHtml}
              <div class="lx-mem-floors" id="lxMemFloors">${floorsHtml}</div>
            </div>`;
        }

        function openMemberCenter() {
          const enterprise = state.page === "business" || state.page === "enterprise";
          if (enterprise) {
            lxOpenInfoTab("member", "会员中心", `<div class="lx-enterprise-member-center">${lxRenderQyBenefitSkin()}${lxRenderEntPointsMallHtml()}</div>`);
            return;
          }
          lxOpenMemberComponentTab("member", "会员中心", "member", "secondary");
          return;
          const html = `<style>
                .content[data-view="info"]:has(.lx-member-service-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
                .content[data-view="info"]:has(.lx-member-service-frame)>.lx-tabbar{flex:0 0 auto!important}
                .content[data-view="info"] .info-page:has(.lx-member-service-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
                .content[data-view="info"] .info-page:has(.lx-member-service-frame)::before,
                .content[data-view="info"] .info-page:has(.lx-member-service-frame)::after{display:none!important;content:none!important}
                .lx-member-center-loading{position:absolute;inset:0;z-index:1;padding:28px;background:#fff;overflow:hidden}
                .lx-member-center-loading-line,.lx-member-center-loading-pill,.lx-member-center-loading-card{background:linear-gradient(90deg,#f6f1f8 25%,#fcfaff 50%,#f6f1f8 75%);background-size:200% 100%;animation:lxMemberLoading 1.15s ease-in-out infinite}
                .lx-member-center-loading-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.lx-member-center-loading-line{display:block;width:220px;height:18px;border-radius:6px}.lx-member-center-loading-pill{width:150px;height:34px;border-radius:17px}
                .lx-member-center-loading-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:16px;margin-bottom:16px}.lx-member-center-loading-card{height:150px;border-radius:14px}.lx-member-center-loading-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.lx-member-center-loading-grid .lx-member-center-loading-card{height:124px}
                @keyframes lxMemberLoading{0%{background-position:100% 0}100%{background-position:-100% 0}}
                @media(prefers-reduced-motion:reduce){.lx-member-center-loading-line,.lx-member-center-loading-pill,.lx-member-center-loading-card{animation:none}}
              </style>
              <div class="lx-member-service-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
                <div class="lx-member-center-loading" aria-label="正在加载会员中心"><div class="lx-member-center-loading-head"><span class="lx-member-center-loading-line"></span><span class="lx-member-center-loading-pill"></span></div><div class="lx-member-center-loading-hero"><div class="lx-member-center-loading-card"></div><div class="lx-member-center-loading-card"></div></div><div class="lx-member-center-loading-grid"><div class="lx-member-center-loading-card"></div><div class="lx-member-center-loading-card"></div><div class="lx-member-center-loading-card"></div></div></div>
                <iframe src="/member-service-aui/index.html?embed=member&amp;v=20260823-member-fast-first-paint" title="会员中心完整内容" loading="eager" fetchpriority="high" onload="this.style.opacity='1';var n=this.previousElementSibling;if(n)n.remove()" style="position:absolute;inset:0;z-index:2;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF;opacity:0;transition:opacity .12s ease" allow="clipboard-read; clipboard-write"></iframe>
              </div>`;
          const tab = { id: "info:member", kind: "info", label: "会员中心", html };
          let active = (state.tabs || []).find((item) => item?.id === "info:member");
          if (!active) {
            lxUpsertTab(tab);
            active = (state.tabs || []).find((item) => item?.id === "info:member") || tab;
            lxRememberResultTab(active);
          }
          const commit = (forceRender) => {
            active = (state.tabs || []).find((item) => item?.id === "info:member") || active || tab;
            state.activeTabId = "info:member";
            const frameExists = !!document.querySelector('.lx-member-service-frame iframe');
            if (forceRender || !frameExists) lxRunTab(active);
            lxRenderTabbar();
          };
          commit(!document.querySelector('.lx-member-service-frame iframe'));
          requestAnimationFrame(() => requestAnimationFrame(() => commit(false)));
          window.setTimeout(() => commit(false), 220);
        }

        function openMemberDevicesCenter() {
          lxOpenMemberComponentTab("devices", "我的设备", "devices", "tab");
          return;
          const html = `<style>
              .content[data-view="info"]:has(.lx-member-devices-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
              .content[data-view="info"]:has(.lx-member-devices-frame)>.lx-tabbar{flex:0 0 auto!important}
              .content[data-view="info"] .info-page:has(.lx-member-devices-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
              .content[data-view="info"] .info-page:has(.lx-member-devices-frame)::before,
              .content[data-view="info"] .info-page:has(.lx-member-devices-frame)::after{display:none!important;content:none!important}
              .lx-member-devices-loading{position:absolute;inset:0;z-index:1;padding:28px;background:#fff;overflow:hidden}
              .lx-member-devices-loading-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
              .lx-member-devices-loading-line,.lx-member-devices-loading-pill,.lx-member-devices-loading-row{background:linear-gradient(90deg,#f6f1f8 25%,#fcfaff 50%,#f6f1f8 75%);background-size:200% 100%;animation:lxDeviceLoading 1.15s ease-in-out infinite}
              .lx-member-devices-loading-line{width:240px;height:18px;border-radius:6px}.lx-member-devices-loading-pill{width:180px;height:34px;border-radius:17px}
              .lx-member-devices-loading-panel{padding:22px;border:1px solid #e6dfea;border-radius:14px}.lx-member-devices-loading-row{height:92px;margin-top:12px;border-radius:12px}
              @keyframes lxDeviceLoading{0%{background-position:100% 0}100%{background-position:-100% 0}}
              @media(prefers-reduced-motion:reduce){.lx-member-devices-loading-line,.lx-member-devices-loading-pill,.lx-member-devices-loading-row{animation:none}}
            </style>
            <div class="lx-member-devices-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
              <div class="lx-member-devices-loading" aria-label="正在加载设备列表"><div class="lx-member-devices-loading-head"><span class="lx-member-devices-loading-line"></span><span class="lx-member-devices-loading-pill"></span></div><div class="lx-member-devices-loading-panel"><span class="lx-member-devices-loading-line" style="display:block;width:160px"></span><div class="lx-member-devices-loading-row"></div><div class="lx-member-devices-loading-row"></div><div class="lx-member-devices-loading-row"></div></div></div>
              <iframe src="/member-service-aui/index.html?embed=devices&amp;origin=query&amp;v=20260823-devices-fast-first-paint" title="我的设备列表" loading="eager" fetchpriority="high" onload="this.style.opacity='1';var n=this.previousElementSibling;if(n)n.remove()" style="position:absolute;inset:0;z-index:2;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF;opacity:0;transition:opacity .12s ease"></iframe>
            </div>`;
          const tab = { id: "info:devices", kind: "info", label: "我的设备", html };
          let active = (state.tabs || []).find((item) => item?.id === "info:devices");
          if (!active) {
            lxUpsertTab(tab);
            active = (state.tabs || []).find((item) => item?.id === "info:devices") || tab;
            lxRememberResultTab(active);
          }
          const commit = (forceRender) => {
            active = (state.tabs || []).find((item) => item?.id === "info:devices") || active || tab;
            state.activeTabId = "info:devices";
            const frameExists = !!document.querySelector('.lx-member-devices-frame iframe');
            if (forceRender || !frameExists) lxRunTab(active);
            lxRenderTabbar();
          };
          commit(!document.querySelector('.lx-member-devices-frame iframe'));
          // 仅在外部状态竞争真正移除了设备页时补渲染，禁止重复重载 iframe。
          requestAnimationFrame(() => requestAnimationFrame(() => commit(false)));
          window.setTimeout(() => commit(false), 220);
        }
        window.__lxOpenDevicesResult = openMemberDevicesCenter;

        function openCouponCenter() {
          lxOpenMemberComponentTab("coupon", "优惠券", "asset:coupons", "tab");
          return;
          const html = `<style>
              .content[data-view="info"]:has(.lx-coupon-detail-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
              .content[data-view="info"]:has(.lx-coupon-detail-frame)>.lx-tabbar{flex:0 0 auto!important}
              .content[data-view="info"] .info-page:has(.lx-coupon-detail-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
              .content[data-view="info"] .info-page:has(.lx-coupon-detail-frame)::before,
              .content[data-view="info"] .info-page:has(.lx-coupon-detail-frame)::after{display:none!important;content:none!important}
            </style>
            <div class="lx-coupon-detail-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
              <iframe src="/member-service-aui/index.html?embed=coupons&amp;v=20260823-asset-content-only" title="优惠券详情" loading="eager" style="position:absolute;inset:0;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF"></iframe>
            </div>`;
          lxOpenInfoTab("coupon", "优惠券", html);
        }

        function openPointsCenter() {
          lxOpenMemberComponentTab("points", "乐豆", "asset:points", "tab");
          return;
          const html = `<style>
              .content[data-view="info"]:has(.lx-points-detail-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
              .content[data-view="info"]:has(.lx-points-detail-frame)>.lx-tabbar{flex:0 0 auto!important}
              .content[data-view="info"] .info-page:has(.lx-points-detail-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
              .content[data-view="info"] .info-page:has(.lx-points-detail-frame)::before,
              .content[data-view="info"] .info-page:has(.lx-points-detail-frame)::after{display:none!important;content:none!important}
            </style>
            <div class="lx-points-detail-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
              <iframe src="/member-service-aui/index.html?embed=points&amp;v=20260823-asset-content-only" title="乐豆详情" loading="eager" style="position:absolute;inset:0;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF"></iframe>
            </div>`;
          lxOpenInfoTab("points", "乐豆", html);
        }

        function openVoucherCenter() {
          lxOpenMemberComponentTab("vouchers", "代金券", "asset:vouchers", "tab");
          return;
          const html = `<style>
              .content[data-view="info"]:has(.lx-voucher-detail-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
              .content[data-view="info"]:has(.lx-voucher-detail-frame)>.lx-tabbar{flex:0 0 auto!important}
              .content[data-view="info"] .info-page:has(.lx-voucher-detail-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
              .content[data-view="info"] .info-page:has(.lx-voucher-detail-frame)::before,
              .content[data-view="info"] .info-page:has(.lx-voucher-detail-frame)::after{display:none!important;content:none!important}
            </style>
            <div class="lx-voucher-detail-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
              <iframe src="/member-service-aui/index.html?embed=vouchers&amp;v=20260823-asset-content-only" title="代金券详情" loading="eager" style="position:absolute;inset:0;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF"></iframe>
            </div>`;
          lxOpenInfoTab("vouchers", "代金券", html);
        }

        function openRedPacketCenter() {
          lxOpenMemberComponentTab("redpacket", "限时红包", "asset:redpacket", "tab");
          return;
          const html = `<style>
              .content[data-view="info"]:has(.lx-redpacket-detail-frame){display:flex!important;flex-direction:column!important;overflow:hidden!important;padding-bottom:0!important}
              .content[data-view="info"]:has(.lx-redpacket-detail-frame)>.lx-tabbar{flex:0 0 auto!important}
              .content[data-view="info"] .info-page:has(.lx-redpacket-detail-frame){display:block!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important}
              .content[data-view="info"] .info-page:has(.lx-redpacket-detail-frame)::before,
              .content[data-view="info"] .info-page:has(.lx-redpacket-detail-frame)::after{display:none!important;content:none!important}
            </style>
            <div class="lx-redpacket-detail-frame" style="position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#FFFFFF">
              <iframe src="/member-service-aui/index.html?embed=redpacket&amp;v=20260823-asset-content-only" title="限时红包详情" loading="eager" style="position:absolute;inset:0;display:block;width:100%;height:100%;border:0;outline:0;background:#FFFFFF"></iframe>
            </div>`;
          lxOpenInfoTab("redpacket", "限时红包", html);
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

        // 城市切换：热门城市坐标表（bd09ll，与门店 API/静态图同坐标系）。选中存 __lxCityOverride，优先于 geo
        const LX_CITY_COORDS = [
          ["北京", 39.9042, 116.4074], ["上海", 31.2304, 121.4737], ["广州", 23.1291, 113.2644],
          ["深圳", 22.5431, 114.0579], ["杭州", 30.2741, 120.1551], ["成都", 30.5728, 104.0668],
          ["武汉", 30.5928, 114.3055], ["南京", 32.0603, 118.7969], ["西安", 34.3416, 108.9398],
          ["重庆", 29.5630, 106.5516], ["苏州", 31.2989, 120.5853], ["天津", 39.0842, 117.2009]
        ];
        function lxResolveCoord() {
          if (window.__lxCityOverride && window.__lxCityOverride.lat) return Promise.resolve(window.__lxCityOverride);
          return lxRequestGeo();
        }
        function lxOpenCityPicker() {
          const cur = window.__lxCityOverride?.city || "";
          const grid = LX_CITY_COORDS.map(([name, lat, lng]) =>
            `<button class="lx-p0-btn lx-city-pick${name === cur ? " primary" : ""}" type="button" data-city-pick="${esc(name)}" data-city-lat="${lat}" data-city-lng="${lng}">${esc(name)}</button>`
          ).join("");
          openModal("选择城市", `<p class="lx-p0-disclaimer" style="margin-bottom:12px">选择城市后，门店列表和国补查询会按该城市刷新（演示坐标）。</p><div class="lx-city-grid">${grid}</div>`);
        }

        function lxStoreIcon(name) {
          const icons = {
            nav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2Z"/></svg>',
            box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-4 9 4v8l-9 4-9-4V8Z"/><path d="M3 8l9 4 9-4M12 12v8"/></svg>',
            cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
            gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4 8 8 12 8Zm0 0s2-5 4.5-4-.5 4-4.5 4Z"/></svg>',
            arr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
          };
          return icons[name] || "";
        }

        function lxFallbackStores() {
          return [
            { name: "联想体验店(北京市房山区良乡苏庄店)", address: "北京市房山区苏庄大街建鑫园三里", distance: 8700, hours: "10:00–20:00", tel: "15313378937", tags: ["优先体验", "贴膜安装", "以旧换新"], lat: 39.724, lng: 116.139 },
            { name: "联想3C服务中心(良乡店)", address: "北京市房山区苏庄北路苏庄东街小区", distance: 9300, hours: "10:00–20:00", tel: "(010)89374140", tags: ["优先体验", "贴膜安装", "以旧换新"], lat: 39.727, lng: 116.135 },
            { name: "联想体验店(房山熙悦天街店)", address: "北京市房山区良乡东路与长于大街交汇处北侧首开龙湖北京熙悦天街A馆B1", distance: 12800, hours: "10:00–20:00", tel: "18519195202", tags: ["优先体验", "贴膜安装", "以旧换新"], lat: 39.743, lng: 116.175 },
          ];
        }

        function lxStoreName(store) { return store.name || store.nm || store.title || "联想授权门店"; }
        function lxStoreAddr(store) { return store.address || store.addr || ""; }
        function lxStoreTel(store) { return store.tel || store.phone || store.telephone || ""; }
        function lxStoreHours(store) { return store.hours || store.openingHours || "10:00–20:00"; }
        // 营业状态按当前时间算，深夜不再挂着"营业中"（真机反馈：23 点半官方都说已打烊了）
        function lxStoreOpenState(store) {
          const m = String(lxStoreHours(store)).match(/(\d{1,2}):(\d{2})\s*[-–—~至]\s*(\d{1,2}):(\d{2})/);
          if (!m) return { open: true, label: "营业中" };
          const now = new Date();
          const cur = now.getHours() * 60 + now.getMinutes();
          const open = cur >= (+m[1]) * 60 + (+m[2]) && cur < (+m[3]) * 60 + (+m[4]);
          return { open, label: open ? "营业中" : "已打烊" };
        }
        function lxStoreDistance(store) {
          const raw = store.distance ?? store.dist;
          if (raw == null || raw === "") return "";
          if (typeof raw === "string") return raw;
          const n = Number(raw);
          if (!Number.isFinite(n)) return "";
          return n >= 1000 ? `${(n / 1000).toFixed(1)}km` : `${Math.round(n)}m`;
        }
        function lxStoreLat(store, fallback) { return store.lat ?? store.latitude ?? fallback ?? 39.9042; }
        function lxStoreLng(store, fallback) { return store.lng ?? store.longitude ?? fallback ?? 116.4074; }

        function lxStoreCard(store, index, ctx = {}) {
          const name = lxStoreName(store);
          const addr = lxStoreAddr(store);
          const tel = lxStoreTel(store);
          const lat = lxStoreLat(store, ctx.lat);
          const lng = lxStoreLng(store, ctx.lng);
          const dist = lxStoreDistance(store) || (index === 0 ? "8.7km" : index === 1 ? "9.3km" : "12.8km");
          return `<div class="store" data-store-card>
            <div class="head"><span class="nm">${esc(name)}</span>${dist ? `<span class="dist">${esc(dist)}</span>` : ""}</div>
            <div class="meta">
              <div class="addr">${esc(addr)}</div>
              <div class="hours">${(() => { const st = lxStoreOpenState(store); return `<span class="od${st.open ? "" : " closed"}">${st.label}</span>`; })()}<span>${esc(lxStoreHours(store))}</span>${tel ? `<span class="tel">${esc(tel)}</span>` : ""}</div>
            </div>
            <div class="acts">
              <button class="btn ghost store-ghost" type="button" data-store-nav="${esc(lat + "," + lng)}" data-store-name="${esc(name)}" data-store-addr="${esc(addr)}" data-store-tel="${esc(tel)}">${lxStoreIcon("nav")}导航</button>
              <button class="btn ghost store-ghost" type="button" data-quick-ask="查询${esc(name)}的库存情况">${lxStoreIcon("box")}查库存</button>
              <button class="btn solid store-solid" type="button" data-quick-ask="我要预约到${esc(name)}的到店服务">${lxStoreIcon("cal")}约到店</button>
            </div>
          </div>`;
        }

        function lxRenderStoreZone(stores = [], opts = {}) {
          const list = Array.isArray(stores) ? stores : [];
          const loading = Boolean(opts.loading);
          const shown = loading ? [] : (list.length ? list : lxFallbackStores());
          const pinPositions = [[50, 34], [30, 60], [72, 52]];
          const pins = shown.length
            ? shown.slice(0, 3).map((store, index) => {
                const [left, top] = pinPositions[index] || [58, 46];
                return `<span class="pin${index ? " sm" : ""}" style="left:${left}%;top:${top}%"><span class="pd"></span><span class="pc"></span></span>`;
              }).join("")
            : `<span class="pin" style="left:50%;top:34%"><span class="pd"></span><span class="pc"></span></span>`;
          const captionName = shown[0] ? lxStoreName(shown[0]) : "附近联想授权门店";
          const listHtml = loading
            ? `<div class="lx-store-loading">正在查询附近联想门店...</div>`
            : shown.map((store, index) => lxStoreCard(store, index, opts)).join("");
          const countText = loading ? "查询中" : `${shown.length} 家`;
          return `<div class="lx-store-skin st" data-v="2">
            <div class="split">
              <div class="map" data-store-map>
                <div class="streets"></div><div class="park"></div><div class="rail"></div>${pins}
                <div class="ctrl"><button type="button" data-store-zoom="in">+</button><button type="button" data-store-zoom="out">−</button></div>
                <div class="cap"><b>${esc(captionName)}</b> · 点击门店卡「导航」开地图</div>
              </div>
              <div class="col">
                <div class="listhd">附近联想授权门店 · ${esc(countText)}</div>
                <div class="store-list">${listHtml}</div>
              </div>
            </div>
            <div class="bands">
              <button class="band" type="button" data-quick-ask="门店服务权益有哪些，包含贴膜安装和现场演示吗"><span class="bi">${lxStoreIcon("gift")}</span><span><span class="bt">门店服务权益</span><span class="bd">到店享专属权益：优先服务、现场演示、贴膜安装</span></span><span class="more">${lxStoreIcon("arr")}</span></button>
              <button class="band" type="button" data-quick-ask="帮我预约附近联想门店到店服务"><span class="bi">${lxStoreIcon("cal")}</span><span><span class="bt">到店预约</span><span class="bd">预约上门或到店服务，节省等待</span></span><span class="more">${lxStoreIcon("arr")}</span></button>
            </div>
          </div>`;
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

        const LX_STORE_V5_DATA = [
          {id:1,name:"联想官方体验店（西单大悦城直营店）",distance:"0.5km",hours:"10:00–22:00",tel:"010 5971 6888",address:"北京市西城区西单北大街131号西单大悦城5层",type:"联想直营店",kind:"销售门店",lat:39.9106,lng:116.3721,business:["个人&家庭产品","商用产品及方案","Think产品"]},
          {id:2,name:"联想来酷智生活（西单商场店）",distance:"0.7km",hours:"09:30–21:30",tel:"010 6605 1888",address:"北京市西城区西单北大街120号西单商场4层",type:"联想授权店",kind:"销售门店",lat:39.9125,lng:116.3748,business:["个人&家庭产品","智能生态","配件"]},
          {id:3,name:"联想体验店（金融街购物中心店）",distance:"1.0km",hours:"10:00–21:30",tel:"010 6622 0668",address:"北京市西城区金城坊街2号金融街购物中心B1层",type:"联想Think体验店",kind:"销售门店",lat:39.9167,lng:116.3633,business:["Think产品","商用产品及方案"]},
          {id:4,name:"联想服务中心（宣武门店）",distance:"1.6km",hours:"09:00–18:00",tel:"010 6315 6088",address:"北京市西城区宣武门外大街20号",type:"联想官方直营客服",kind:"服务门店",lat:39.8998,lng:116.3746,business:["检测维修","清灰保养","数据迁移"]},
          {id:5,name:"联想服务中心（广安门店）",distance:"3.3km",hours:"09:00–18:00",tel:"010 6345 7788",address:"北京市西城区广安门内大街315号",type:"联想官方直营客服",kind:"服务门店",lat:39.8893,lng:116.3545,business:["检测维修","延保服务","数据恢复"]},
          {id:6,name:"联想智选店（王府井店）",distance:"3.6km",hours:"10:00–22:00",tel:"010 6528 1188",address:"北京市东城区王府井大街255号",type:"联想Think专卖店",kind:"销售门店",lat:39.9152,lng:116.4116,business:["Think产品","新品体验","企业采购"]},
          {id:7,name:"联想体验店（崇文门新世界店）",distance:"4.2km",hours:"10:00–21:30",tel:"010 6708 6688",address:"北京市东城区崇文门外大街3号",type:"联想授权店",kind:"销售门店",lat:39.9001,lng:116.4183,business:["个人&家庭产品","智能生态"]},
          {id:8,name:"联想服务中心（朝阳门店）",distance:"4.8km",hours:"09:00–18:00",tel:"010 6552 9988",address:"北京市朝阳区朝阳门外大街乙12号",type:"联想官方服务站",kind:"服务门店",lat:39.9241,lng:116.4336,business:["检测维修","上门服务","延保服务"]}
        ];
        const lxStoreV5State = {selected:1,business:"",kind:"",keyword:""};
        function lxStoreV5Filtered(){
          const q=lxStoreV5State.keyword.trim().toLowerCase();
          return LX_STORE_V5_DATA.filter(s=>(!lxStoreV5State.business||s.business.includes(lxStoreV5State.business))&&(!lxStoreV5State.kind||s.kind===lxStoreV5State.kind)&&(!q||`${s.name} ${s.address} ${s.type}`.toLowerCase().includes(q)));
        }
        function lxStoreV5Card(s,index){
          const active=s.id===lxStoreV5State.selected;
          const st=lxStoreOpenState(s);
          return `<button class="lxsv5-card${active?' is-active':''}" type="button" data-lxsv5-select="${s.id}"><span class="lxsv5-index">${index+1}</span><span class="lxsv5-card-main"><strong>${esc(s.name)}</strong><span class="lxsv5-card-meta"><b class="${st.open?'':'closed'}">${st.label}</b>${esc(s.hours)}</span><span class="lxsv5-tags"><i>${esc(s.type)}</i><i>${esc(s.kind)}</i></span></span><span class="lxsv5-distance">${esc(s.distance)}</span></button>`;
        }
        function lxRenderStoreV5(){
          const stores=lxStoreV5Filtered();
          if(!stores.some(s=>s.id===lxStoreV5State.selected)) lxStoreV5State.selected=stores[0]?.id||0;
          const selected=stores.find(s=>s.id===lxStoreV5State.selected)||stores[0];
          const mapUrl=selected?`/api/stores/staticmap?lng=${encodeURIComponent(selected.lng)}&lat=${encodeURIComponent(selected.lat)}`:"";
          const pins=stores.map((s,i)=>`<button type="button" class="lxsv5-pin${s.id===lxStoreV5State.selected?' is-active':''}" style="left:${16+(i%4)*23}%;top:${22+Math.floor(i/4)*35}%" data-lxsv5-select="${s.id}">${i+1}</button>`).join("");
          const detail=selected?`<div class="lxsv5-float"><button class="lxsv5-float-close" type="button" data-lxsv5-float-close>×</button><div class="lxsv5-float-head"><strong>${esc(selected.name)}</strong><span>${esc(selected.type)}</span><span>${esc(selected.kind)}</span><button type="button" data-lxsv5-detail="${selected.id}">进入门店</button></div><p>${esc(selected.address)}</p><div class="lxsv5-float-meta"><b>${lxStoreOpenState(selected).label}</b><span>${esc(selected.hours)}</span><span>电话 ${esc(selected.tel)}</span></div><div class="lxsv5-business"><b>业务</b>${selected.business.map(x=>`<span>${esc(x)}</span>`).join("")}</div><div class="lxsv5-float-actions"><strong>距离 ${esc(selected.distance)}</strong><button type="button" data-lxsv5-appointment="${selected.id}">预约到店</button><button class="primary" type="button" data-lxsv5-nav="${selected.id}">导航</button></div><div class="lxsv5-stock"><span><b>券</b> 价值39元手机背膜免费贴</span><span><b>商品</b> 在售 ThinkPad X1 Carbon / 小新 Pro 14</span></div></div>`:"";
          return `<div class="lxsv5" data-store-v5-root><div class="lxsv5-toolbar"><button type="button" data-lxsv5-city>北京⌄</button><select data-lxsv5-business><option value="">选择业务</option><option>个人&家庭产品</option><option>商用产品及方案</option><option>Think产品</option><option>检测维修</option></select><select data-lxsv5-kind><option value="">选择门店类型</option><option>销售门店</option><option>服务门店</option></select><input data-lxsv5-keyword value="${esc(lxStoreV5State.keyword)}" placeholder="请输入门店名称"><button class="primary" type="button" data-lxsv5-search>查询</button></div><div class="lxsv5-location">当前位置：北京市西城区复兴门内大街49号</div><div class="lxsv5-workspace"><div class="lxsv5-map" style="${mapUrl?`background-image:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,.08)),url('${mapUrl}')`:''}"><span class="lxsv5-me">●<em>我的位置</em></span>${pins}${detail}</div><aside class="lxsv5-list"><div class="lxsv5-list-head"><strong>门店列表</strong><span>共 ${stores.length} 家</span></div>${stores.length?stores.map(lxStoreV5Card).join(""):`<div class="lxsv5-empty">没有找到符合条件的门店，请调整筛选条件。</div>`}</aside></div></div>`;
        }
        function lxStoreV5ById(id){return LX_STORE_V5_DATA.find(s=>s.id===Number(id));}
        function lxOpenStoreV5(){lxOpenInfoTab("stores","附近门店",lxRenderStoreV5());requestAnimationFrame(lxBindStoreV5);}
        function lxBindStoreV5(){
          const root=document.querySelector("[data-store-v5-root]"); if(!root)return;
          const rerender=()=>lxOpenStoreV5();
          root.querySelectorAll("[data-lxsv5-select]").forEach(el=>el.addEventListener("click",()=>{lxStoreV5State.selected=Number(el.dataset.lxsv5Select);rerender();}));
          root.querySelector("[data-lxsv5-business]")?.addEventListener("change",e=>{lxStoreV5State.business=e.target.value;rerender();});
          root.querySelector("[data-lxsv5-kind]")?.addEventListener("change",e=>{lxStoreV5State.kind=e.target.value;rerender();});
          root.querySelector("[data-lxsv5-search]")?.addEventListener("click",()=>{lxStoreV5State.keyword=root.querySelector("[data-lxsv5-keyword]")?.value||"";rerender();});
          root.querySelector("[data-lxsv5-keyword]")?.addEventListener("keydown",e=>{if(e.key==='Enter'){lxStoreV5State.keyword=e.target.value;rerender();}});
          root.querySelector("[data-lxsv5-city]")?.addEventListener("click",lxOpenCityPicker);
          root.querySelector("[data-lxsv5-float-close]")?.addEventListener("click",()=>{lxStoreV5State.selected=0;root.querySelector('.lxsv5-float')?.remove();});
          root.querySelectorAll("[data-lxsv5-detail]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();lxOpenStoreDetailV5(lxStoreV5ById(el.dataset.lxsv5Detail));}));
          root.querySelectorAll("[data-lxsv5-appointment]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();lxOpenStoreAppointmentV5(lxStoreV5ById(el.dataset.lxsv5Appointment));}));
          root.querySelectorAll("[data-lxsv5-nav]").forEach(el=>el.addEventListener("click",e=>{e.stopPropagation();const s=lxStoreV5ById(el.dataset.lxsv5Nav);openStoreMap(`${s.lat},${s.lng}`,s.name,s.address,s.tel);}));
        }
        function lxOpenStoreDetailV5(s){
          if(!s)return;
          lxOpenInfoTab("store-detail",s.name,`<div class="lxsv5-detail" data-store-v5-detail><button class="lxsv5-back" type="button" data-lxsv5-back>‹ 返回门店列表</button><div class="lxsv5-detail-hero"><div><span>${esc(s.type)} · ${esc(s.kind)}</span><h2>${esc(s.name)}</h2><p>${esc(s.address)}</p><div>${s.business.map(x=>`<i>${esc(x)}</i>`).join("")}</div></div><img src="/api/stores/staticmap?lng=${encodeURIComponent(s.lng)}&lat=${encodeURIComponent(s.lat)}" alt="${esc(s.name)}地图"></div><div class="lxsv5-detail-grid"><section><h3>门店详情</h3><p><b>营业时间</b>${esc(s.hours)}</p><p><b>联系电话</b>${esc(s.tel)}</p><p><b>服务说明</b>支持产品体验、门店咨询、到店服务与库存查询，实际服务以门店确认为准。</p></section><section><h3>到店权益</h3><p>手机背膜免费贴 · 新机体验 · 专属顾问接待</p><div class="lxsv5-detail-actions"><button type="button" data-lxsv5-detail-appointment>预约到店</button><button class="primary" type="button" data-lxsv5-detail-nav>导航</button></div></section></div></div>`);
          requestAnimationFrame(()=>{const root=document.querySelector('[data-store-v5-detail]');root?.querySelector('[data-lxsv5-back]')?.addEventListener('click',lxOpenStoreV5);root?.querySelector('[data-lxsv5-detail-appointment]')?.addEventListener('click',()=>lxOpenStoreAppointmentV5(s));root?.querySelector('[data-lxsv5-detail-nav]')?.addEventListener('click',()=>openStoreMap(`${s.lat},${s.lng}`,s.name,s.address,s.tel));});
        }
        function lxOpenStoreAppointmentV5(s){
          if(!s)return;
          openModal("预约到店",`<form class="lxsv5-appointment" data-lxsv5-appointment-form><div class="lxsv5-appoint-store"><strong>${esc(s.name)}</strong><span>${esc(s.address)}</span></div><label>到店日期<input name="date" type="date" required></label><label>到店时段<select name="time" required><option value="">请选择</option><option>10:00–12:00</option><option>14:00–16:00</option><option>16:00–18:00</option></select></label><label>到店目的<select name="purpose" required><option>产品体验</option><option>购买咨询</option><option>售后服务</option><option>企业采购</option></select></label><label>手机号码<input name="phone" type="tel" placeholder="请输入预约手机号" required></label><p>提交后由门店确认预约时间，实际服务以门店回访为准。</p><div class="lxsv5-appoint-actions"><button type="button" data-modal-close>取消</button><button class="primary" type="submit">提交预约</button></div></form>`);
          requestAnimationFrame(()=>document.querySelector('[data-lxsv5-appointment-form]')?.addEventListener('submit',e=>{e.preventDefault();const mask=e.currentTarget.closest('.lx-p0-modal-mask');mask?.remove();openModal('预约已提交',`<div class="lxsv5-success"><strong>预约申请已提交</strong><p>${esc(s.name)}将在营业时间内与你确认到店安排。</p><button class="lx-p0-btn primary" type="button" data-modal-close>完成</button></div>`);}));
        }

        async function openStoresPanel(address = "北京海淀") {
          lxOpenStoreComponentTab();
        }

        function lxStoreExactFrame() {
          return document.querySelector(".lx-store-component-host");
        }

        function lxOpenStoreAppointmentInFrame(storeId) {
          const store = window.__lxStoreAppointmentById?.[String(storeId || "")] || window.__lxPendingStoreAppointment;
          if (!store) return;
          const phone = store.phone || store.tel || "以门店公布信息为准";
          openModal("预约到店", `<div class="lx-lead-modal">
            <p class="lx-lead-subtitle">请确认预约信息，门店将在营业时间内与你联系。</p>
            <div class="lx-lead-form">
              <label class="lx-lead-row"><span>预约门店</span><select aria-label="预约门店"><option selected>${esc(store.name || "联想门店")}</option></select></label>
              <label class="lx-lead-row"><span>到店日期</span><input type="date" value="2026-08-12" aria-label="到店日期"></label>
              <label class="lx-lead-row"><span>到店时段</span><select aria-label="到店时段"><option>10:00–12:00</option><option>14:00–16:00</option><option selected>16:00–18:00</option></select></label>
              <label class="lx-lead-row"><span>预约目的</span><select aria-label="预约目的"><option selected>产品体验</option><option>购买咨询</option><option>售后服务</option><option>企业采购</option></select></label>
              <label class="lx-lead-row"><span>联系电话</span><input value="${esc(phone)}" aria-label="联系电话"></label>
            </div>
            <div class="lx-lead-actions">
              <button class="lx-lead-cancel" type="button" data-modal-close>取消</button>
              <button class="lx-lead-submit" type="button" data-lx-store-confirm-submit>确认预约</button>
            </div>
          </div>`, { skin: "lead" });
          requestAnimationFrame(() => {
            document.querySelector("[data-lx-store-confirm-submit]")?.addEventListener("click", () => {
              closeModal();
              toast("预约信息已提交，门店将在营业时间内与你确认");
            }, { once: true });
          });
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
          // 五个入口是同一个联想乐享智能体；左侧客服回答与能力不随频道变体。
          return LX_CS_BY_SITE.default;
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

        // 人工客服态的快捷菜单项（与正常 actionbar 同样走测宽溢出收「更多」，小屏不再挤两排）
        const LX_CS_SHORTCUTS = [
          { label: "退出人工", attr: 'data-human-off', cls: " lx-cs-exit" },
          { label: "我的订单", attr: 'data-quick-ask="小联，帮我查最近的订单状态和物流"' },
          { label: "发图片", attr: 'data-cs-upload' },
          { label: "评价服务", attr: 'data-quick-ask="给小联的服务打个 5 星好评，服务专业体验好"' },
          { label: "需求清单", attr: 'data-quick-ask="小联，我整理一份采购需求清单发给你确认"' },
        ];
        function lxRenderShortcutRow() {
          const row = document.querySelector(".shortcut-row");
          if (!row) return;
          if (!state.humanMode) { lxRenderActionbar(); return; }
          const btnHtml = (it) => `<button class="shortcut${it.cls || ""}" type="button" ${it.attr}>${esc(it.label)}</button>`;
          // 先全量平铺测真实宽度，放不下的收进「更多 ▾」（对齐 lxRenderActionbar 方案）
          row.innerHTML = LX_CS_SHORTCUTS.map(btnHtml).join("");
          if (!row.clientWidth) return; // 面板隐藏时跳过，可见后 ResizeObserver 重排
          row.style.flexWrap = "nowrap";
          const gap = parseFloat(getComputedStyle(row).columnGap) || 8;
          const widths = [...row.children].map((n) => n.offsetWidth);
          const total = widths.reduce((s, w, i) => s + w + (i ? gap : 0), 0);
          let fit = LX_CS_SHORTCUTS.length;
          if (total > row.clientWidth) {
            const avail = row.clientWidth - 96; // 「更多」按钮预留
            let used = 0; fit = 0;
            for (let i = 0; i < widths.length; i++) {
              used += widths[i] + (i ? gap : 0);
              if (used > avail) break;
              fit = i + 1;
            }
            fit = Math.max(1, fit);
          }
          const visible = LX_CS_SHORTCUTS.slice(0, fit), overflow = LX_CS_SHORTCUTS.slice(fit);
          row.innerHTML = visible.map(btnHtml).join("") + (overflow.length
            ? `<span class="more-wrap"><button class="shortcut" type="button">更多<img class="icon" src="../icons/global-expand.svg" alt="" /></button><div class="more-menu" role="menu">${overflow.map((it) => `<div class="menu-row" ${it.attr}>${esc(it.label)}</div>`).join("")}</div></span>`
            : "");
        }

        // 响应式 actionbar：按面板宽度能放多少放多少，放不下的收进「更多」（对齐旧版测宽溢出方案）
        // actionbar 按站点差异化：首页=跨客群通用技能；子站=各自客群的高频功能
        const LX_ACTIONBAR_BY_PAGE = {
          home: [
            ["客服", "../icons/shortcut-support.svg"],
            ["我的订单", "../icons/mall-orders.svg"],
            ["附近门店", "../icons/shortcut-delivery.svg"],
            ["会员中心", "../icons/shortcut-membership.svg"],
            ["以旧换新", "../icons/shortcut-tradein.svg"],
            ["企业采购", "../icons/shortcut-customization.svg"],
          ],
          personal: [
            ["客服", "../icons/shortcut-support.svg"],
            ["门店", "../icons/shortcut-delivery.svg"],
            ["会员", "../icons/shortcut-membership.svg"],
          ],
          business: [
            ["客服", "../icons/shortcut-support.svg"],
            ["咨询热线", "../icons/shortcut-live.svg"],
            ["批量采购", "../icons/shortcut-customization.svg"],
            ["企业认证", "../icons/shortcut-trial.svg"],
            ["会员权益", "../icons/shortcut-membership.svg"],
          ],
          enterprise: [
            ["客服", "../icons/shortcut-support.svg"],
            ["企业留资", "../icons/shortcut-customization.svg"],
            ["咨询热线", "../icons/shortcut-live.svg"],
            ["企业认证", "../icons/shortcut-trial.svg"],
          ],
          brand: [
            ["客服", "../icons/shortcut-support.svg"],
            ["附近门店", "../icons/shortcut-delivery.svg"],
            ["会员中心", "../icons/shortcut-membership.svg"],
            ["我的订单", "../icons/mall-orders.svg"],
          ],
        };
        // 个人、中小企业、政教及大企业频道展示各自的高频入口；其余频道继续使用共享能力入口。
        // 渲染器仍会按真实可用宽度把溢出项自动收进「更多」。
        const lxActionbarItems = () => state.page === "personal"
          ? LX_ACTIONBAR_BY_PAGE.personal
          : state.page === "business"
            ? LX_ACTIONBAR_BY_PAGE.business
          : state.page === "enterprise"
            ? LX_ACTIONBAR_BY_PAGE.enterprise
            : LX_ACTIONBAR_BY_PAGE.home;

        function lxRenderActionbar() {
          const row = document.querySelector(".shortcut-row");
          if (!row || state.humanMode) return;
          if (!row.clientWidth) return; // 面板隐藏时跳过，可见后由 ResizeObserver 触发重排
  const isWaitingFeature = (label) =>
    label === "教育特惠" ||
    label === "以旧换新" ||
    label === "乐豆商城" ||
    label === "私人订制";
          const btnHtml = ([label, icon]) => `<button class="shortcut" type="button"${isWaitingFeature(label) ? ' data-waiting-feature aria-disabled="true" tabindex="-1"' : ""}><img class="icon" src="${icon}" alt="" />${label}</button>`;
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
            ? `<span class="more-wrap"><button class="shortcut" type="button">更多<img class="icon" src="../icons/global-expand.svg" alt="" /></button><div class="more-menu" role="menu">${overflow.map(([label, icon]) => `<div class="menu-row"${isWaitingFeature(label) ? ' data-waiting-feature aria-disabled="true"' : ""}><img class="icon" src="${icon}" alt="" />${label}</div>`).join("")}</div></span>`
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
            quick: ["推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "国补和教育优惠能叠加吗"],
            welcome: ["推荐一款适合办公的笔记本", "预算8000的游戏本怎么选？", "学生认证后有哪些专属优惠？", "附近有联想门店吗？", "电脑清灰、换电池怎么预约？"],
            placeholder: "推荐一款适合我的笔记本电脑",
            actionbar: ["商品导购", "解决方案", "门店查询", "职场认证", "服务预约"],
            hello: ["找商品", "找门店", "找优惠", "以旧换新", "教育优惠", "找方案"],
          },
          personal: {
            quick: ["推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "小新和拯救者怎么选"],
            welcome: ["推荐一款适合学生的轻薄本", "预算8000玩游戏的本怎么选？", "学生认证后有哪些专属优惠？", "拯救者和小新怎么选？", "电脑清灰、换电池怎么预约？"],
            placeholder: "推荐一款适合我的笔记本电脑",
            actionbar: ["商品导购", "解决方案", "门店查询", "职场认证", "服务预约"],
            hello: ["找商品", "找门店", "找优惠", "以旧换新", "教育优惠", "找方案"],
          },
          business: {
            quick: ["推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制", "推荐问题待定制"],
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
          // 首页、个人及家庭、中小企业、政教及大企业、品牌共用同一智能体提示、
          // 欢迎问题与输入语义；不得依据频道切换回答人格或能力范围。
          const cfg = LX_SITE_PROMPTS.home;
          const list = document.querySelector(".quick-list");
          if (list) {
            list.innerHTML = cfg.quick.slice(0, 5).map((text, index) => {
              const placeholder = text === "推荐问题待定制";
              const attrs = placeholder
                ? ' data-quick-placeholder aria-disabled="true" tabindex="-1"'
                : (index === 0 ? " data-start-chat" : "");
              return `<button class="quick-item" type="button"${attrs}><span>${esc(text)}</span><img class="arrow" src="../icons/global-next.svg" alt="" /></button>`;
            }).join("");
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
          const projectName = String(state.leadScenario || "").startsWith("project:") ? String(state.leadScenario).replace(/^project:/, "") : "";
          const messagePlaceholder = projectName ? `请填写您期望的合作内容或想了解到相关方案，如：${projectName}落地范围、终端数量、交付周期` : "请填写您期望的合作内容或想了解到相关方案";
          openModal("项目合作", `
            <div class="lx-lead-modal">
              <p class="lx-lead-subtitle">请填写表单，我们会尽快与您联系${projectName ? `，当前意向：${esc(projectName)}` : ""}</p>
              <div class="lx-lead-form">
                <label class="lx-lead-row"><span><i>*</i>姓名</span><input id="lxLeadName" autocomplete="name" placeholder="请输入姓名"></label>
                <label class="lx-lead-row"><span><i>*</i>邮箱</span><input id="lxLeadEmail" type="email" autocomplete="email" placeholder="请输入邮箱"></label>
                <label class="lx-lead-row"><span><i>*</i>手机</span><input id="lxLeadPhone" inputmode="tel" autocomplete="tel" placeholder="请输入手机号"></label>
                <label class="lx-lead-row lx-lead-code"><span><i>*</i>验证码</span><input id="lxLeadCode" inputmode="numeric" placeholder="请输入短信验证码"><button type="button" data-lead-code>获取验证码</button></label>
                <label class="lx-lead-row"><span><i>*</i>公司</span><input id="lxLeadCompany" autocomplete="organization" placeholder="请输入公司名称"></label>
                <label class="lx-lead-row"><span><i>*</i>城市</span><input id="lxLeadCity" placeholder="请输入所在城市"></label>
                <label class="lx-lead-row"><span><i>*</i>职务</span><select id="lxLeadJob"><option value="">请选择职务</option><option>企业负责人</option><option>IT/信息化负责人</option><option>采购负责人</option><option>项目负责人</option><option>其他</option></select></label>
                <label class="lx-lead-row"><span><i>*</i>行业</span><select id="lxLeadIndustry"><option value="">请选择行业</option><option>政府/公共事业</option><option>教育</option><option>医疗</option><option>制造</option><option>金融</option><option>能源</option><option>服务业</option><option>其他</option></select></label>
                <label class="lx-lead-row"><span>预算</span><select id="lxLeadBudget"><option value="">请选择预算</option><option>10万以内</option><option>10万-50万</option><option>50万-100万</option><option>100万以上</option><option>暂不确定</option></select></label>
                <label class="lx-lead-row lx-lead-message"><span><i>*</i>留言</span><textarea id="lxLeadNeed" rows="3" placeholder="${esc(messagePlaceholder)}"></textarea></label>
              </div>
              <div class="lx-lead-actions">
                <button class="lx-lead-cancel" type="button" data-modal-close>取消</button>
                <button class="lx-lead-submit" type="button" data-submit-lead>提交</button>
              </div>
            </div>`, { skin: "lead" });
        }

        function lxAppendLeadSuccessCard(data = {}) {
          const chat = ensureChat();
          if (!chat) return;
          const scenario = String(state.leadScenario || "").replace(/^project:/, "") || "项目合作";
          const rows = [
            ["留资信息", `${data.company || "已提交"}${data.name ? " · " + data.name : ""}`],
            ["合作意向", scenario],
            ["项目画像", [data.industry, data.budget, data.city].filter(Boolean).join(" / ") || "已记录"],
            ["下一步", "顾问将在 1 个工作日内联系确认方案范围"]
          ];
          const steps = ["校验联系信息", "生成项目合作线索", "同步顾问跟进队列"];
          const html = `<div class="lx-lead-success-card"><div class="lx-lead-success-head"><span>✓</span><div><strong>留资成功</strong><p>项目合作信息已收到，联想乐享已为您生成跟进记录。</p></div></div><div class="lx-lead-success-steps">${steps.map((step) => `<div class="lx-op-step done"><span class="lx-op-step-ic">✓</span><span>${esc(step)}</span></div>`).join("")}</div><div class="lx-lead-success-rows">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div></div>`;
          chat.insertAdjacentHTML("beforeend", `<div class="lx-p0-message ai">${html}</div>`);
          chat.scrollTop = chat.scrollHeight;
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
              if (typeof window.__lxSetConversationQuery === "function") window.__lxSetConversationQuery(value);
              if (typeof window.lxfdSubmit === "function") {
                lxSetConversationSourcePage(lxPageFromPath());
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
              if (typeof window.__lxSetConversationQuery === "function") window.__lxSetConversationQuery(value);
              sendChat(value);
            }
          };

          // 商品/方案卡右上角统一常驻勾选。动态楼层渲染后立即注入，不再等首次 hover。
          const lxEnsureCardPickBtns = (root) => {
            if (root?.matches?.(LX_PICK_CARD_SEL)) lxEnsurePickBtn(root);
            root?.querySelectorAll?.(LX_PICK_CARD_SEL).forEach(lxEnsurePickBtn);
          };
          lxEnsureCardPickBtns(document);
          new MutationObserver((records) => {
            records.forEach((record) => record.addedNodes.forEach((node) => {
              if (node.nodeType === 1) lxEnsureCardPickBtns(node);
            }));
          }).observe(document.body, { childList: true, subtree: true });
          document.addEventListener("mouseover", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (card) lxEnsurePickBtn(card);
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
            const ta = event.target.closest?.(".composer textarea, .hero-composer textarea, .lxfd-composer textarea");
            if (!ta) return;
            const isHero = !!ta.closest(".hero-composer");
            if (ta.dataset.lxSuppressSuggest === "1") {
              lxHideSuggest();
              if (!isHero) lxHideRefPicker();
              return;
            }
            if (!isHero && /@$/.test(ta.value)) { lxShowRefPicker(); lxHideSuggest(); }
            else { if (!isHero) lxHideRefPicker(); lxComposerSuggest(ta); }
          });

          document.addEventListener("keydown", (event) => {
            if (["Enter", " "].includes(event.key)) {
              const solutionCard = event.target.closest?.(".lx-solution-card[data-solution-title]");
              if (solutionCard) {
                event.preventDefault();
                solutionCard.click();
                return;
              }
              const brandFocus = event.target.closest?.("[data-brand-focus]");
              if (brandFocus) {
                event.preventDefault();
                brandFocus.click();
                return;
              }
              const brandAskButton = event.target.closest?.("[data-brand-ask]");
              if (brandAskButton && !["BUTTON", "A"].includes(event.target.tagName)) {
                event.preventDefault();
                brandAskButton.click();
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
            if (!card || card.classList.contains("lx-solution-card") || card.contains(event.relatedTarget)) return;
            startHoverPromptTimer(card);
          });

          document.addEventListener("mouseout", (event) => {
            const card = event.target.closest?.(LX_PICK_CARD_SEL);
            if (!card || card.classList.contains("lx-solution-card") || card.contains(event.relatedTarget)) return;
            if (state.hoverPromptTimer) window.clearTimeout(state.hoverPromptTimer);
            state.hoverPromptTimer = null;
            if (state.hoverPromptVisibleSku) scheduleHoverPromptAutoClose(4000);
            else state.hoverPromptSku = "";
          });

          document.addEventListener("click", (event) => {
            // 全屏结果卡由后注册的 app-lxfd 捕获监听器统一执行“收起 → 分屏 → 恢复目标”。
            // 本监听器注册更早；若不在入口让行，会先按普通分屏卡执行 lxRevealContent，
            // 把页面带入既非全屏也非分屏的中间态，并错误激活默认个人频道内容。
            const fullscreenResultCard = event.target.closest?.(
              ".lxfd .answer-cta, .lxfd [data-lx-result-id], .lxfd [data-lxfd-reveal-products], .lxfd [data-lx-focus-reco], .lxfd [data-lxfd-open-feature], .lxfd [data-lx-open-tab], .lxfd [data-specific-solution-cta]"
            );
            if (fullscreenResultCard && (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs"))) return;
            const readerButton = event.target.closest?.("[data-reader-action]");
            if (readerButton && !readerButton.disabled) {
              if (readerButton.closest(".lx-document-article")) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                lxStepDocumentReader(readerButton);
                return;
              }
            }
            const entRedeemButton = event.target.closest?.("[data-ent-redeem], [data-ent-redeem-confirm]");
            if (entRedeemButton) {
              event.preventDefault();
              event.stopPropagation();
            }
            const storeMotionTarget = event.target.closest?.(".lx-store-skin .btn, .lx-store-skin .band, .lx-store-skin .map .ctrl button");
            if (storeMotionTarget?.animate) {
              storeMotionTarget.animate([
                { transform: "scale(.96)" },
                { transform: "scale(1)" },
              ], { duration: 180, easing: "cubic-bezier(.34,1.4,.4,1)" });
            }
            const historyButton = event.target.closest(".history-button");
            if (historyButton && !document.body.classList.contains("assistant-fullscreen")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              lxOpenHistoryModal();
              return;
            }
            const historyPageButton = event.target.closest(".lx-history-modal [data-history-page]");
            if (historyPageButton && !historyPageButton.disabled) {
              event.preventDefault();
              event.stopPropagation();
              lxHistoryModalPage += historyPageButton.dataset.historyPage === "next" ? 1 : -1;
              lxRenderHistoryModal(document.querySelector(".lx-history-search-input")?.value || "");
              return;
            }
            const historyAction = event.target.closest(".lx-history-modal [data-history-action]");
            if (historyAction) {
              event.preventDefault();
              event.stopPropagation();
              const row = historyAction.closest(".lx-history-row[data-conv-id]");
              const id = row?.dataset.convId || "";
              const action = historyAction.dataset.historyAction || "";
              const store = lxLoadConversationHistoryStore();
              const index = store.findIndex((item) => item && item.id === id);
              if (index < 0) return;
              if (action === "pin") store[index].pinned = !store[index].pinned;
              if (action === "delete") {
                if (!window.confirm("确定删除这条历史对话吗？")) return;
                store.splice(index, 1);
              }
              lxSaveConversationHistoryStore(store);
              lxRenderHistoryModal(document.querySelector(".lx-history-search-input")?.value || "");
              return;
            }
            const convHistoryRow = event.target.closest(".lx-history-modal .lx-history-row-main[data-conv-id]");
            if (convHistoryRow) {
              event.preventDefault();
              lxRestoreConversationRecord(convHistoryRow.dataset.convId || "");
              // 全屏欢迎态从弹窗点开历史：对话恢复进的是被全屏层盖住的主面板，必须切分屏
              // 布局才看得见（否则视觉上点了没反应，真机反馈）
              if (document.documentElement.classList.contains("lx-root-lxfd-prepaint")) lxPrepareRootSplitState();
              return;
            }
            if (event.target.closest(".new-chat-button")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              resetConversation();
              // 根路径分屏：新建 = 回全屏首页开新会话（lxfd 版 reset 已做完整初始态还原：
              // prepaint 类/分屏类/欢迎页）；子站没有 lxfd 全屏形态，保持分屏内新建不变（真机反馈）
              const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
              if (logicalPath === "/" && typeof window.lxfdReset === "function") window.lxfdReset(true);
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
              if (location.protocol !== "file:" && PATH_BY_PAGE[page]) history.pushState(null, "", PATH_BY_PAGE[page]);
              if (state.page !== page) state.activeSiteFloorTab = "推荐";
              state.page = page;
              // 频道切换只改变默认右侧内容；禁止把频道身份注册成结果标签。
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
              event.preventDefault();
              event.stopPropagation();
              const closeId = event.target.closest("[data-tab-close]")?.dataset.tabClose;
              if (closeId) lxCloseTab(closeId);
              else lxActivateTab(tabHit.dataset.tabId);
              return;
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
                btn.setAttribute("aria-selected", (btn.dataset.catLabel || btn.textContent.trim()) === label ? "true" : "false");
              });
              const contentBox = document.querySelector(".content");
              contentBox?.scrollTo({ top: 0, behavior: "smooth" });
              if (window.__LX_TEMPLATE_PAGE === "personal" && state.page === "personal") {
                if (label === "推荐") {
                  contentBox?.classList.remove("lx-shop-making-state");
                  lxRenderSiteFloors();
                  return;
                }
                let making = contentBox?.querySelector(":scope > .lx-shop-making");
                if (contentBox && !making) {
                  making = document.createElement("div");
                  making.className = "lx-shop-making";
                  making.setAttribute("role", "status");
                  making.setAttribute("aria-live", "polite");
                  making.innerHTML = '<p class="lx-shop-making-copy">正在制作中...</p>';
                  document.querySelector(".category-tabs")?.insertAdjacentElement("afterend", making);
                }
                contentBox?.classList.add("lx-shop-making-state");
                return;
              }
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
              // 先发一条用户 query 气泡，让用户清楚自己问的是什么（之前直接 AI 播报，显得像凭空生成）
              const bannerQuery = `我想了解一下「${(title || kicker || "当前活动").trim()}」这个活动，有什么优惠？`;
              if (!lxRequireQueryAccess()) return;
              addMessage("user", bannerQuery);
              // 首页点 banner：先切到个人站再定位活动楼层（首页本身没有活动楼层可跳）
              if (state.page === "home" && typeof routeTo === "function") {
                routeTo("personal");
              }
              if (["personal", "business", "enterprise"].includes(state.page) || state.page === "home") {
                state.activeSiteFloorTab = targetTab;
                // routeTo 是异步渲染，稍等再切 tab + 渲染楼层
                setTimeout(() => {
                  document.querySelectorAll(".category-tabs button:not([data-cat-more])").forEach((btn) => {
                    btn.classList.toggle("active", (btn.dataset.catLabel || btn.textContent.trim()) === targetTab);
                  });
                  const contentBox = document.querySelector(".content");
                  contentBox?.scrollTo({ top: 0, behavior: "smooth" });
                  lxRenderSiteFloors();
                }, state.page === "home" ? 260 : 0);
              }
              const bulletHtml = highlights.map((h) => `<div class="lx-discover-review-item" data-quick-ask="${esc(h)}" tabindex="0" style="cursor:pointer"><span>${esc(h)}</span></div>`).join("");
              const quickLinks = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="lx-p0-btn primary" type="button" data-quick-ask="帮我了解当前活动详情和最优惠方案">咨询详情</button><button class="lx-p0-btn" type="button" data-quick-ask="当前活动有哪些优惠可以叠加使用">叠加优惠</button></div>`;
              const disclaimer = `<p class="lx-p0-disclaimer" style="margin-top:8px">以上内容由 AI 生成，仅供参考，实际以联想官网为准。</p>`;
              addMessage("assistant", `好的，已为你打开「${targetTab}」活动专区，这个活动的亮点：`, bulletHtml + quickLinks + disclaimer);
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
                pickBtn.setAttribute("aria-pressed", "false");
                const comp = document.querySelector(".composer");
                const a = comp?.querySelector(":scope > .attach");
                const t = comp?.querySelector("textarea");
                const s = comp?.querySelector(".send-btn");
                lxRenderRefChips(comp, a, t, s);
              } else {
                pickBtn.setAttribute("aria-pressed", "true");
                lxSetProductRef(pickSku, pickBtn.closest(LX_PICK_CARD_SEL));
              }
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
              event.preventDefault();
              event.stopPropagation();
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
              lxScrollToQueryAnchor(Number(qRow.dataset.qAnchor));
            }

            const qDot = event.target.closest(".page-dots > i[data-q-anchor]");
            if (qDot) {
              event.preventDefault();
              document.querySelectorAll(".page-dots > i").forEach((dot) => dot.classList.toggle("active", dot === qDot));
              lxScrollToQueryAnchor(Number(qDot.dataset.qAnchor));
              return;
            }

            const quick = event.target.closest(".quick-item, .hero-suggestion, .shortcut, .more-menu .menu-row");
            if (quick && !event.target.closest(".more-wrap > button")) {
              if (state.page === "business" && quick.closest(".shortcut-row")) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              if (quick.hasAttribute("data-waiting-feature")) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              if (quick.hasAttribute("data-quick-placeholder")) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return;
              }
              const text = (quick.querySelector("span")?.textContent || quick.textContent).trim();
              if (quick.classList.contains("hero-suggestion") || quick.classList.contains("fullscreen-prompt") || quick.classList.contains("lxfd-chip-q")) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (text && typeof window.lxfdSubmit === "function") {
                  lxSetConversationSourcePage(lxPageFromPath());
                  window.lxfdSubmit(text);
                }
                return;
              }
              if (text.includes("教育特惠")) sendChat("教育特惠");
              else if (text.includes("积分兑换") || text.includes("积分商城")) sendChat(text.includes("积分兑换") ? text : "积分兑换");
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
              else if (text.includes("项目合作")) sendChat("项目合作");
              else if (text.includes("信创专区")) openXinchuangZone();
              else if (text.includes("企业采购")) sendChat("我要企业批量采购，介绍下企业购的价格和流程");
              else if (text.includes("上门售后")) sendChat("企业设备的上门售后服务怎么约？");
              else if (text.includes("客服")) lxShowServiceCard();
              else if (text.includes("门店")) sendChat("门店");
              else if (text.includes("会员")) sendChat("会员中心");
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
              const cardProduct = cardOfficialObj || getProductFromCard(card) || lxCardToProduct(card, cardSku);
              const productRef = lxProductRefPayload(cardProduct, card);
              state.refProduct = productRef;
              state.refProducts = [productRef];
              sendChat(`请详细介绍一下${cardProduct?.name || "这款联想商品"}`);
              return;
            }

            const detailPrimary = event.target.closest(".detail-primary");
            if (detailPrimary) {
              if (detailPrimary.dataset.bizQuote) openLeadPanel("biz_quote");
              else lxStartOrderPlaceholder();
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

            const lxfdCommerce = event.target.closest(".lxfd-actions .lxfd-ic");
            const lxfdCommerceKind = (() => {
              if (!lxfdCommerce) return "";
              if (lxfdCommerce.dataset.lxfdOpen) return lxfdCommerce.dataset.lxfdOpen;
              const label = lxfdCommerce.getAttribute("aria-label") || "";
              if (label.includes("历史")) return ""; // 首页空白态胶囊里的历史入口，归 app-lxfd 处理
              if (label.includes("购物车")) return "cart";
              if (label.includes("订单")) return "orders";
              // 按位置兜底(index 1/2=购物车/订单)因新增历史按钮会错位误伤——购物车/订单
              // 都带 data-lxfd-open，dataset 分支已可靠覆盖，这里不再按位置猜
              return "";
            })();
            if (lxfdCommerceKind === "cart") {
              event.preventDefault();
              lxOpenCommerceEntry("cart", { sendQuery: true });
              return;
            }
            if (lxfdCommerceKind === "orders") {
              event.preventDefault();
              lxOpenCommerceEntry("orders", { sendQuery: true });
              return;
            }

            const utility = event.target.closest(".utility-btn");
            if (utility?.getAttribute("aria-label") === "购物车") {
              event.preventDefault();
              lxOpenCommerceEntry("cart", { sendQuery: true });
              return;
            }
            if (utility?.getAttribute("aria-label") === "订单") {
              event.preventDefault();
              lxOpenCommerceEntry("orders", { sendQuery: true });
              return;
            }
            const accountBtn = event.target.closest(".account-wrap > .utility-btn");
            if (accountBtn && !state.user) {
              event.preventDefault();
              accountBtn.parentElement.classList.remove("open");
              openLogin();
            }
            else if (accountBtn) accountBtn.parentElement.classList.toggle("open");
            else if (!event.target.closest(".account-menu")) document.querySelector(".account-wrap.open")?.classList.remove("open");

            const authTab = event.target.closest("[data-auth-tab]");
            if (authTab) lxOpenAuthTab(authTab.dataset.authTab);
            const authEye = event.target.closest("[data-auth-eye]");
            if (authEye) {
              const input = authEye.closest(".lx-auth-field")?.querySelector("input");
              if (input) {
                input.type = input.type === "password" ? "text" : "password";
                authEye.style.opacity = input.type === "text" ? ".55" : "1";
              }
            }
            const authCode = event.target.closest("[data-auth-code]");
            if (authCode && !authCode.dataset.running) {
              authCode.dataset.running = "1";
              authCode.disabled = true;
              authCode.style.opacity = ".65";
              let left = 60;
              authCode.textContent = `${left}s 后重试`;
              const timer = window.setInterval(() => {
                left -= 1;
                authCode.textContent = `${left}s 后重试`;
                if (left <= 0) {
                  window.clearInterval(timer);
                  authCode.disabled = false;
                  authCode.style.opacity = "1";
                  authCode.textContent = "获取验证码";
                  delete authCode.dataset.running;
                }
              }, 1000);
            }
            if (event.target.closest("[data-auth-close]")) closeModal();

            const menuRow = event.target.closest(".account-menu .menu-row");
            if (menuRow) {
              const text = menuRow.textContent.trim();
              const action = menuRow.dataset.accountAction || "";
              menuRow.closest(".account-wrap")?.classList.remove("open");
              if (action === "logout" || text.includes("退出")) logout();
              else if (action === "login" || text === "登录") openLogin();
              else if (action === "member" || text === "会员中心") sendChat("会员中心");
              else openCategoryPlaceholder();
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

            const eduBuySku = event.target.closest("[data-edu-buy]")?.dataset.eduBuy;
            if (eduBuySku) {
              event.preventDefault();
              event.stopPropagation();
              const product = (state.officialProducts || {})[eduBuySku] || [...(state.products || []), ...(state.siteProducts || []), ...(state.floorProducts || [])].find((p) => p && p.sku === eduBuySku) || lxCardToProduct(event.target, eduBuySku);
              lxRevealContent();
              lxBuyWithIntro(product);
              return;
            }

            const openEl = event.target.closest("[data-open-product]");
            const openSku = openEl?.dataset.openProduct;
            if (openSku) {
              event.preventDefault();
              event.stopPropagation();
              closeModal();
              // 官方商品对象优先（避免 fetch 官方 sku 404）；恢复的历史消息里 officialProducts
              // 缓存已空，再兜持久化 recoPayload 里的完整对象（真机反馈：历史里点 CTA 没反应）
              const officialObj = (state.officialProducts || {})[openSku];
              const payloadObj = officialObj ? null : (lxReadRecoPayload(openEl.getAttribute("data-lxfd-reco-id")) || []).find((p) => p && p.sku === openSku);
              openProduct(officialObj || payloadObj || openSku);
              return;
            }

            const buySku = event.target.closest("[data-buy-sku]")?.dataset.buySku;
            if (buySku) buyNow(state.cart.find((item) => item.sku === buySku));

            const cartToggleSku = event.target.closest("[data-cart-toggle]")?.dataset.cartToggle;
            if (cartToggleSku) {
              state.cartSelection = state.cartSelection || {};
              state.cartSelection[cartToggleSku] = state.cartSelection[cartToggleSku] === false;
              openCart();
              return;
            }

            const cartSelectAll = event.target.closest("[data-cart-select-all]")?.dataset.cartSelectAll;
            if (cartSelectAll !== undefined) {
              state.cartSelection = state.cartSelection || {};
              const next = cartSelectAll === "1";
              state.cart.forEach((item) => { state.cartSelection[item.sku] = next; });
              openCart();
              return;
            }

            if (event.target.closest("[data-cart-checkout]")) {
              const selected = state.cart.filter((item) => !state.cartSelection || state.cartSelection[item.sku] !== false);
              if (!selected.length) return toast("请先选择要结算的商品");
              buyNow(selected[0]);
              return;
            }

            const removeCart = event.target.closest("[data-remove-cart]")?.dataset.removeCart;
            if (removeCart) {
              state.cart = state.cart.filter((item) => item.sku !== removeCart);
              if (state.cartSelection) delete state.cartSelection[removeCart];
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
              // 引用模式：订单摘要挂到输入框上方（同商品引用），用户自己问发票/物流/退换——
              // 之前是替用户发一句泛泛的"帮我查询订单"，没法针对性咨询（真机反馈：客服常见场景）
              lxSetRef(askOrder);
              const _askTa = $(".composer textarea");
              if (_askTa) { _askTa.focus(); _askTa.placeholder = "针对这笔订单想问什么？物流、发票、退换货都可以…"; }
              toast("已引用该订单，直接输入你的问题");
            }
            if (event.target.closest("[data-city-picker]")) { lxOpenCityPicker(); return; }
            const cityPick = event.target.closest("[data-city-pick]");
            if (cityPick) {
              window.__lxCityOverride = { city: cityPick.dataset.cityPick, lat: parseFloat(cityPick.dataset.cityLat), lng: parseFloat(cityPick.dataset.cityLng) };
              closeModal();
              toast(`已切换到${cityPick.dataset.cityPick}`);
              lxRenderSiteFloors();
              return;
            }
            const entRedeemConfirm = event.target.closest("[data-ent-redeem-confirm]")?.dataset.entRedeemConfirm;
            if (entRedeemConfirm) { closeModal(); lxRedeemEntPoints(entRedeemConfirm); addMessage("ai", "", "兑换成功，已为你更新企业积分余额和兑换记录。右侧兑换列表也同步刷新了。"); return; }
            const entRedeemId = event.target.closest("[data-ent-redeem]")?.dataset.entRedeem;
            if (entRedeemId) {
              const item = LX_ENT_REDEEM_ITEMS.find((entry) => entry.id === entRedeemId);
              sendChat(item ? `兑换${item.name}` : "兑换企业积分权益");
              return;
            }
            if (event.target.closest("[data-ent-points-mall]")) { sendChat("积分兑换"); return; }
            const quickAsk = event.target.closest("[data-quick-ask]")?.dataset.quickAsk;
            if (quickAsk) {
              // ponytail: 会员楼层点击写 localStorage，用于行为驱动模块排序（POC 轻量实现）
              try {
                const memFloor = event.target.closest("[data-mem-floor]");
                if (memFloor && memFloor.dataset.memFloor) {
                  localStorage.setItem("lexiang.member.lastModule", memFloor.dataset.memFloor);
                }
              } catch (e) {}
              closeModal();
              sendChat(quickAsk);
            }
            const msgAction = event.target.closest("[data-msg-action]")?.dataset.msgAction;
            if (msgAction) {
              const msg = event.target.closest(".lx-p0-message.ai, .lx-p0-message.assistant");
              if (msgAction === "copy") {
                const text = msg?.querySelector(".ai-body")?.innerText || msg?.innerText || "";
                navigator.clipboard?.writeText(text.trim()).then(() => toast("已复制回答")).catch(() => toast("复制失败"));
              } else if (msgAction === "regen") {
                if (state.lastUserText) sendChat(state.lastUserText);
              } else {
                toast(msgAction === "up" ? "已记录：有帮助" : "已记录：无帮助");
              }
              return;
            }
            const traceToggle = event.target.closest("[data-lx-trace-toggle]");
            if (traceToggle) {
              event.preventDefault();
              const box = traceToggle.closest(".lx-skill-trace");
              if (box) {
                const collapsed = box.classList.toggle("is-collapsed");
                traceToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
              }
              return;
            }
            // 所有推荐弹窗小卡统一走这一入口：关闭后点击原卡可再次打开。
            // 新功能只需注册 opener，并在卡片上声明 action / payload。
            const _recommendedModalCta = event.target.closest("[data-lx-recommended-modal]");
            if (_recommendedModalCta) {
              event.preventDefault();
              event.stopPropagation();
              lxOpenRecommendedModal(
                _recommendedModalCta.getAttribute("data-lx-recommended-modal"),
                _recommendedModalCta.getAttribute("data-lx-recommended-modal-payload") || ""
              );
              return;
            }
            const _storeAppointmentCta = event.target.closest("[data-lx-store-appointment-confirm]");
            if (_storeAppointmentCta) {
              event.preventDefault();
              event.stopPropagation();
              lxOpenStoreAppointmentInFrame(_storeAppointmentCta.getAttribute("data-lx-store-appointment-confirm"));
              return;
            }
            // 推荐CTA：兼容主面板生成(data-lx-focus-reco)与全屏桥接来的(data-lxfd-reveal-products)两种；
            // 每轮推荐卡片绑定独立 recoId：首次点击新建对应标签，之后再点同一卡片回到原标签。
            const _recoCta = event.target.closest("[data-lx-focus-reco], [data-lxfd-reveal-products]");
            if (_recoCta) {
              if (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs")) return;
              lxRevealContent();
              const _recoId = _recoCta.getAttribute("data-lxfd-reco-id") || "";
              const _recoPayload = lxReadRecoPayload(_recoId); // 内存→localStorage 两级（恢复历史后内存已空）
              if (_recoPayload && _recoPayload.length) {
                const recoTab = lxCreateRecoTab(_recoPayload, { label: "AI 推荐", recoId: _recoId });
                lxUpsertTab(recoTab);
                lxRunTab(recoTab);
                return;
              }
              // payload 彻底丢失 → 退回打开当前reco tab；连 tab 都没有则明确提示，不再静默没反应
              const tab = (state.tabs || []).slice().reverse().find((item) => item.kind === "reco" || item.id === "reco");
              if (tab) {
                state.activeTabId = tab.id;
                lxRenderTabbar();
                lxRunTab(tab);
              } else {
                toast("这轮推荐的清单已过期，跟我说「再推荐一次」马上补上");
              }
              return;
            }
            // 具体解决方案推荐卡：在左右分栏中必须与右侧同名详情标签一一联动。
            // 详情标签可能仍在当前 tabs 中，也可能因页面重绘暂存在详情缓存中；
            // 两种情况都恢复并精确激活目标标签，不能退回全集页或只更新卡片高亮。
            const _specificSolutionCta = event.target.closest("[data-specific-solution-cta]");
            if (_specificSolutionCta) {
              if (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs")) return;
              event.preventDefault();
              event.stopPropagation();
              const solutionTitle = (_specificSolutionCta.getAttribute("data-specific-solution-cta") || "").trim();
              const targetTabId = solutionTitle ? `info:solution-detail:${solutionTitle}` : "";
              if (!targetTabId) return;
              lxRevealContent();
              let targetTab = (state.tabs || []).find((item) => item.id === targetTabId) || null;
              if (!targetTab) {
                targetTab = state.solutionDetailTabs?.[targetTabId] ||
                  lxSpecificSolutionTabCache.get(targetTabId) ||
                  lxClosedSpecificSolutionTabCache.get(targetTabId) || null;
                if (targetTab) {
                  lxUpsertTab({ ...targetTab }, false);
                  state.solutionDetailTabs = state.solutionDetailTabs || {};
                  state.solutionDetailTabs[targetTabId] = { ...targetTab };
                  lxSpecificSolutionTabCache.set(targetTabId, { ...targetTab });
                  lxClosedSpecificSolutionTabCache.delete(targetTabId);
                }
              }
              if (targetTab) {
                lxActivateTab(targetTabId);
              } else {
                // 历史记录或跨页面恢复后，Tab/内存缓存会为空；结果卡携带原始 payload，
                // 直接复用原详情生成器，保证右侧样式、组件和交互与首次打开完全一致。
                let restoredPayload = {
                  title: solutionTitle,
                  industry: _specificSolutionCta.getAttribute("data-solution-industry") || "",
                  sector: _specificSolutionCta.getAttribute("data-solution-sector") || "行业方案",
                  scenario: _specificSolutionCta.getAttribute("data-solution-scenario") || "核心场景",
                  intro: _specificSolutionCta.getAttribute("data-solution-intro") || "",
                  image: _specificSolutionCta.getAttribute("data-solution-image") || ""
                };
                // 兼容修复前已经保存的历史卡：旧卡只有标题。先调用原方案全集生成器，
                // 再从它生成的原始方案卡读取完整 dataset，仍然不复制数据或仿写详情。
                if (!restoredPayload.intro || !restoredPayload.image) {
                  openSolutionCenter();
                  const catalogCard = Array.from(document.querySelectorAll(".lx-solution-card[data-solution-title]")).find((card) =>
                    (card.getAttribute("data-solution-title") || "").trim() === solutionTitle
                  );
                  if (catalogCard) {
                    restoredPayload = {
                      title: catalogCard.dataset.solutionTitle || solutionTitle,
                      industry: catalogCard.dataset.solutionIndustry || catalogCard.dataset.solution || "",
                      sector: catalogCard.dataset.solutionSector || "行业方案",
                      scenario: catalogCard.dataset.solutionScenario || "核心场景",
                      intro: catalogCard.dataset.solutionIntro || "",
                      image: catalogCard.dataset.solutionImage || ""
                    };
                  }
                }
                lxOpenSpecificSolutionDetail(restoredPayload);
              }
              return;
            }
            const _featureCta = event.target.closest("[data-lxfd-open-feature]");
            if (_featureCta) {
              const feature = _featureCta.getAttribute("data-lxfd-open-feature") || "";
              if (feature === "solution") {
                lxRevealContent();
                const solutionTab = (state.tabs || []).find((item) => item.id === "info:solution");
                if (solutionTab) {
                  state.activeTabId = solutionTab.id;
                  lxRenderTabbar();
                  lxRunTab(solutionTab);
                } else {
                  openSolutionCenter();
                }
                return;
              }
              if (feature === "documents") {
                lxRevealContent();
                const documentsTab = (state.tabs || []).find((item) => item.id === "documents");
                if (documentsTab) {
                  state.activeTabId = documentsTab.id;
                  lxRenderTabbar();
                  lxRunTab(documentsTab);
                } else {
                  openDocumentCenter();
                }
                return;
              }
            }
            const _resultCta = event.target.closest("[data-lx-result-id]");
            if (_resultCta) {
              event.preventDefault();
              event.stopPropagation();
              lxRevealContent();
              // 稳定 resultId 卡片必须在这里终止，不得再落入旧的
              // data-lx-open-tab / feature 分支打开无关页或弹错误提示。
              window.__lxBridge.restoreResultCard(_resultCta);
              return;
            }
            const _boundTabCta = event.target.closest("[data-lx-open-tab]");
            if (_boundTabCta) {
              lxRevealContent();
              const targetTabId = _boundTabCta.getAttribute("data-lx-open-tab") || "";
              const targetTab = (state.tabs || []).find((item) => item.id === targetTabId);
        if (targetTab) {
          state.activeTabId = targetTab.id;
          lxRenderTabbar();
          lxRunTab(targetTab);
        } else if (targetTabId === "info:edu") {
          openEduZone();
        } else if (targetTabId.startsWith("info:solution-compare:")) {
          const cachedCompareTab = lxSolutionCompareTabCache.get(targetTabId) ||
            state.solutionCompareTabs?.[targetTabId] || null;
          if (cachedCompareTab) {
            const restoredTab = { ...cachedCompareTab };
            lxUpsertTab(restoredTab);
            lxRunTab((state.tabs || []).find((item) => item.id === targetTabId) || restoredTab);
            lxRemoveUnrequestedSiteTabFromSolutionFlow();
          } else if (lxMigrateLegacySolutionCompareCard(_boundTabCta, targetTabId)) {
            // 旧会话卡片已使用通用渲染器重建并登记。
          } else {
            toast("对应的方案对比已关闭，请重新选择方案生成");
          }
        } else if (targetTabId.startsWith("info:document-insight:") && typeof window.__lxRestoreDocumentInsightTab === "function") {
          window.__lxRestoreDocumentInsightTab(targetTabId);
              } else {
                toast("对应的文章解读已关闭，请从资料中心重新生成");
              }
              return;
            }
            if (event.target.closest("[data-lx-focus-active]")) {
              lxRevealContent();
              const tab = (state.tabs || []).find((item) => item.id === state.activeTabId) || (state.tabs || [])[0];
              if (tab) {
                state.activeTabId = tab.id;
                lxRenderTabbar();
                lxRunTab(tab);
              }
              return;
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
            if (event.target.closest("[data-lead-code]")) {
              event.preventDefault();
              toast("验证码已发送（演示）");
              return;
            }
            if (event.target.closest("[data-modal-close]")) {
              event.preventDefault();
              closeModal();
              return;
            }
            if (event.target.closest("[data-submit-lead]")) {
              const name = $("#lxLeadName")?.value.trim() || "";
              const email = $("#lxLeadEmail")?.value.trim() || "";
              const phone = $("#lxLeadPhone")?.value.trim() || "";
              const code = $("#lxLeadCode")?.value.trim() || "";
              const company = $("#lxLeadCompany")?.value.trim() || "";
              const city = $("#lxLeadCity")?.value.trim() || "";
              const job = $("#lxLeadJob")?.value || "";
              const industry = $("#lxLeadIndustry")?.value || "";
              const budget = $("#lxLeadBudget")?.value || "";
              const need = $("#lxLeadNeed")?.value.trim() || "";
              const contact = [name, phone, email].filter(Boolean).join(" / ");
              const missing = [];
              if (!name) missing.push("姓名");
              if (!email) missing.push("邮箱");
              if (!phone) missing.push("手机");
              if (!code) missing.push("验证码");
              if (!company) missing.push("公司");
              if (!city) missing.push("城市");
              if (!job) missing.push("职务");
              if (!industry) missing.push("行业");
              if (!need) missing.push("留言");
              if (missing.length) { toast(`请填写：${missing.join("、")}`); return; }
              closeModal();
              fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scenario: state.leadScenario || "",
                  site_type: API_SITE[state.page] || "default",
                  company, contact, need,
                  name, email, phone, city, job, industry, budget,
                  conv_id: state.convId || null
                })
              }).then(() => toast("信息已提交，顾问会尽快与您联系")).catch(() => {});
              lxAppendLeadSuccessCard({ name, company, city, job, industry, budget, need });
            }
            const recoCompare = event.target.closest("[data-reco-compare]");
            if (recoCompare) {
              const recoTab = (state.tabs || []).find((tab) => tab.id === state.activeTabId && tab.kind === "reco") ||
                (state.tabs || []).slice().reverse().find((tab) => tab.kind === "reco");
              const product = (recoTab?.products || []).find((p) => p.sku === recoCompare.dataset.recoCompare);
              if (product) addCompare(product);
            }

            const industryTag = event.target.closest("[data-industry-index]");
            if (industryTag) {
              event.preventDefault();
              const idx = Number(industryTag.dataset.industryIndex) || 0;
              state.industrySolutionIndex = idx;
              const root = industryTag.closest(".ind[data-v='3']");
              const nextHtml = lxRenderIndustrySolutionSkin(idx);
              const opener = lxIndustrySolutions()[idx]?.opener || "";
              if (root) root.outerHTML = nextHtml;
              lxSetIndustryOpener(opener);
              return;
            }
            const industrySend = event.target.closest("[data-industry-send]");
            if (industrySend) {
              event.preventDefault();
              const text = industrySend.dataset.industrySend || industrySend.closest(".opener")?.querySelector("[data-industry-opener]")?.textContent || "";
              industrySend.animate?.([{ transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 200, easing: "cubic-bezier(.34,1.4,.4,1)" });
              if (text.trim()) sendChat(text.trim());
              return;
            }
            const matChip = event.target.closest(".mat[data-v='1'] [data-mat-filter]");
            if (matChip) {
              event.preventDefault();
              const grp = matChip.dataset.matFilter;
              matChip.closest(".mat")?.querySelectorAll(`[data-mat-filter="${CSS.escape(grp)}"]`).forEach((item) => item.classList.toggle("on", item === matChip));
              return;
            }
            const matMode = event.target.closest(".mat[data-v='1'] [data-mat-mode]");
            if (matMode) {
              event.preventDefault();
              matMode.closest(".dcard")?.querySelectorAll("[data-mat-mode]").forEach((item) => item.classList.toggle("on", item === matMode));
              return;
            }
            const matAction = event.target.closest(".mat[data-v='1'] .play, .mat[data-v='1'] .dl, .mat[data-v='1'] .clink, .mat[data-v='1'] .dact");
            if (matAction) {
              matAction.animate?.([{ transform: "scale(.96)" }, { transform: "scale(1)" }], { duration: 180, easing: "cubic-bezier(.34,1.4,.4,1)" });
            }

            const projectLead = event.target.closest("[data-project-lead]");
            if (projectLead) {
              const name = projectLead.dataset.projectLead || "项目合作";
              sendChat(`我要合作${name}`);
              return;
            }
            const solBtn = event.target.closest("[data-solution]");
            if (solBtn?.classList.contains("lx-solution-card") && solBtn.dataset.solutionTitle) {
              event.preventDefault();
              lxRunSpecificSolutionFlow(solBtn);
            } else if (solBtn) openSolutionCenter(solBtn.dataset.solution);
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
            // business/enterprise 楼层：从存好的全集 state.floorAllItems[key] 翻下一批（与个人站分页同逻辑）
            if (shuffleBtn && !shuffleBtn.disabled && shuffleBtn.dataset.floorAll) {
              shuffleBtn.classList.remove("is-spinning");
              void shuffleBtn.offsetWidth;
              shuffleBtn.classList.add("is-spinning");
              window.setTimeout(() => shuffleBtn.classList.remove("is-spinning"), 520);
              const key = shuffleBtn.dataset.floorAll;
              const items = (state.floorAllItems && state.floorAllItems[key]) || [];
              if (items.length > 1) {
                if (!state.catFloorOffset) state.catFloorOffset = {};
                const visibleCount = lxCatFloorVisibleCount();
                const cur = state.catFloorOffset[key] || 0;
                const next = (cur + visibleCount) % items.length;
                state.catFloorOffset[key] = next;
                const batch = [];
                for (let i = 0; i < 12 && i < items.length; i++) batch.push(items[(next + i) % items.length]);
                const grid = shuffleBtn.closest("[data-cat-floor-key]")?.querySelector("[data-cat-floor-grid]");
                if (grid) {
                  grid.innerHTML = batch.map(lxProductMiniCard).join("");
                  requestAnimationFrame(() => lxClampCatFloors(grid.closest(".lx-cat-floor")));
                }
              }
              return;
            }
            if (shuffleBtn && !shuffleBtn.disabled) {
              shuffleBtn.classList.remove("is-spinning");
              void shuffleBtn.offsetWidth;
              shuffleBtn.classList.add("is-spinning");
              window.setTimeout(() => shuffleBtn.classList.remove("is-spinning"), 520);
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
                  const visibleCount = lxCatFloorVisibleCount();
                  const n = 12; // 渲染 12 个，渲染后按真实列数夹两排（与初次渲染一致）
                  const cur = state.catFloorOffset[catKey] || 0;
                  const next = (cur + visibleCount) % items.length;
                  state.catFloorOffset[catKey] = next;
                  const batch = [];
                  for (let i = 0; i < n && i < items.length; i++) {
                    batch.push(items[(next + i) % items.length]);
                  }
                  const grid = shuffleBtn.closest("[data-cat-floor-key]")?.querySelector("[data-cat-floor-grid]");
                  if (grid) {
                    grid.innerHTML = batch.map(lxProductMiniCard).join("");
                    shuffleBtn.disabled = items.length <= visibleCount;
                    requestAnimationFrame(() => lxClampCatFloors(grid.closest(".lx-cat-floor")));
                  }
                }
              }
            }
            const floorAction = event.target.closest("[data-floor-action]")?.dataset.floorAction;
            const entCustomFilter = event.target.closest("[data-entcustom-filter]");
            if (entCustomFilter) {
              const root = entCustomFilter.closest(".ec");
              const key = entCustomFilter.dataset.entcustomFilter || "all";
              root?.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("on", chip === entCustomFilter));
              root?.querySelectorAll(".scard").forEach((card) => {
                const show = key === "all" || (` ${card.dataset.cat || ""} `).includes(` ${key} `);
                card.hidden = !show;
              });
              return;
            }
            if (floorAction === "stores") openStoresPanel();
            else if (floorAction === "service") openServicePanel();
            else if (floorAction === "member") openMemberCenter();
            else if (floorAction === "coupon") openCouponCenter();
            else if (floorAction === "orders") lxOpenCommerceEntry("orders");
            else if (floorAction === "lead") { sendChat("企业留资"); return; }
            if (event.target.closest("[data-human-on]")) lxSetHumanMode(true);
            if (event.target.closest("[data-human-off]")) lxSetHumanMode(false);
            if (event.target.closest("[data-cs-upload]")) { openUploadControls(); $("#lxP1ImageInput")?.click(); }
            if (event.target.closest("[data-stu-auth]")) openStudentAuth();
            if (event.target.closest("[data-gb-auth]")) {
              // POC mock：写入已认证已领取状态，城市从 DOM 读
              const gbCityEl = document.querySelector("[data-gb-city]");
              const gbCity = (gbCityEl && gbCityEl.textContent && !gbCityEl.textContent.includes("定位")) ? gbCityEl.textContent.trim() : "北京";
              lxSaveGbState({ realVerified: true, claimed: true, city: gbCity, boundCat: "笔记本" });
              toast("实名认证成功，国补资格已绑定");
              const _gbTabBtn = document.querySelector('[data-floor-tab="国补"]');
              if (_gbTabBtn) _gbTabBtn.click();
            }
            // POC 演示：重置国补/教育认证态，方便对照各态
            if (event.target.closest("[data-gb-reset]")) {
              try { localStorage.removeItem("lexiang.guobu.v1"); } catch (_) {}
              toast("已重置国补认证（演示）");
              document.querySelector('[data-floor-tab="国补"]')?.click();
            }
            if (event.target.closest("[data-stu-reset]")) {
              try { localStorage.removeItem(LX_STU_KEY); } catch (_) {}
              toast("已重置教育认证（演示）");
              document.querySelector('[data-floor-tab="教育特惠"]')?.click();
            }
            const _enterpriseAuthEl = event.target.closest("[data-open-enterprise-auth-modal], [data-lx-result-id='modal:enterprise-member-auth']");
            if (_enterpriseAuthEl) {
              event.preventDefault();
              event.stopImmediatePropagation();
              openEnterpriseAuth();
              return;
            }
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
            if (event.target.closest("[data-open-ent]")) { sendChat("认证企业会员"); return; }
            if (event.target.closest("[data-enterprise-auth-cancel]")) { closeModal(); return; }
            if (event.target.closest("[data-ent-submit]")) {
              const form = document.querySelector("#lxEnterpriseAuthForm");
              const company = $("#lxEntCompany")?.value.trim();
              const code = $("#lxEntCode")?.value.trim();
              const email = $("#lxEntEmail")?.value.trim();
              if (form && !form.checkValidity()) { form.reportValidity(); return; }
              if (!company) { toast("请填写企业名称"); }
              else {
                lxSaveEntState({ status: "pending", company, code, contact: email, email, submittedAt: Date.now() });
                lxWatchEntPending();
                closeModal();
                toast("企业会员认证申请已提交，当前状态：审核中");
                fetch("/api/leads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scenario: "enterprise_auth", site_type: API_SITE[state.page] || "default", company, contact: email, need: `企业会员认证申请，信用代码：${code}，企业邮箱：${email}`, conv_id: state.convId || null })
                }).catch(() => {});
                setTimeout(() => {
                  const ent = lxEntState();
                  if (ent.status === "verified") {
                    lxRenderEnterpriseBanner();
                    toast("企业认证已通过，企业会员权益已生效");
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

          document.addEventListener("submit", (event) => {
            const form = event.target.closest(".lx-auth-form-panel");
            if (!form) return;
            event.preventDefault();
            lxSubmitAuthForm(form);
          }, true);

          document.addEventListener("input", (event) => {
            if (event.target.matches(".lx-auth-form-panel input[required]")) lxClearAuthError(event.target);
          }, true);
          document.addEventListener("change", (event) => {
            if (event.target.matches('.lx-auth-form-panel input[type="checkbox"][required]')) lxClearAuthError(event.target);
          }, true);
        }

        window.openCart = openCart;
        window.openOrders = openOrders;
        window.lxOpenCommerceEntry = lxOpenCommerceEntry;
        window.openCompare = openCompare;
        window.openMemberCenter = openMemberCenter;
        window.openCouponCenter = openCouponCenter;
        window.openStoresPanel = openStoresPanel;
        window.openServicePanel = openServicePanel;
        window.openLeadPanel = openLeadPanel;
        window.openWorkplaceAuth = openWorkplaceAuth;
        window.__lxSetHuman = lxSetHumanMode;
        function openDocumentCenter() {
          const content = document.querySelector(".content");
          if (!content) return;
          const hero = content.querySelector(":scope > .hero");
          const tabs = content.querySelector(":scope > .category-tabs");
          const grid = content.querySelector(":scope > .product-grid");
          if (!hero || !tabs || !grid) return;

          content.querySelectorAll(":scope > *").forEach((node) => { node.hidden = node !== grid; });
          // 文档解读结果直接展示推荐列表，不显示资料中心横幅、搜索框及分类导航。
          hero.hidden = true;
          tabs.hidden = true;
          hero.style.setProperty("display", "none", "important");
          tabs.style.setProperty("display", "none", "important");
          grid.hidden = false;

          const slides = hero.querySelector(".hero-slides");
          const collapse = hero.querySelector(".hero-panel-collapse");
          if (slides) slides.hidden = true;
          if (collapse) collapse.hidden = true;
          const kicker = hero.querySelector("[data-page-kicker]");
          const title = hero.querySelector("[data-page-title]");
          const action = hero.querySelector(".hero-btn");
          if (kicker) kicker.textContent = "可按资料类别筛选，支持多选";
          if (title) title.textContent = "资料中心";
          if (action) action.hidden = true;

          let searchForm = hero.querySelector("[data-document-search]");
          if (!searchForm) {
            searchForm = document.createElement("form");
            searchForm.className = "composer";
            searchForm.setAttribute("data-document-search", "1");
            searchForm.innerHTML = '<textarea rows="1" placeholder="搜索文档名称或标签" aria-label="搜索文档名称或标签"></textarea><div class="composer-actions"><div class="chip-row"><span class="chip primary"><img class="icon" src="../icons/composer-search.svg" alt="">资料搜索</span></div><div class="send-group"><button class="send-btn" type="submit" aria-label="搜索"><img class="icon" src="../icons/composer-send.svg" alt=""></button></div></div>';
            hero.querySelector(".hero-copy")?.appendChild(searchForm);
          }

          const documents = [
            { type: "产品视频", title: "联想问天品牌视频", format: "视频", size: "150.0 MB", date: "2026-06-18", image: "../img/enterprise-banner-1.jpg" },
            { type: "产品手册", title: "xCloud联想智能云", format: "PDF", size: "1.0 MB", date: "2026-06-12", tag: "智能云产品", image: "../img/fangan2.jpg" },
            { type: "产品视频", title: "联想智算中心解决方案", format: "视频", size: "369.85 MB", date: "2026-06-12", image: "../img/anli1.jpg" },
            { type: "白皮书", title: "混合式 AI 驱动企业智能化白皮书", format: "PDF", size: "8.6 MB", date: "2026-06-10", tag: "企业智能化", image: "../img/gfbj.jpg" },
            { type: "行业案例", title: "制造业智能质检解决方案案例", format: "PDF", size: "5.2 MB", date: "2026-06-08", tag: "制造行业", image: "../img/shop-10.jpg" },
            { type: "产品手册", title: "联想问天服务器产品手册", format: "PDF", size: "12.4 MB", date: "2026-06-05", tag: "服务器", image: "../img/new1.jpg" }
          ];
          const documentInsightHtml = (doc) => `
            <section class="lx-document-insight-page" aria-label="${esc(doc.title)} AI 解读">
              <header class="lx-document-insight-title">
                <div><h2>${esc(doc.title)}</h2><div class="lx-document-insight-meta"><span>${esc(doc.type)}</span><p>${esc(doc.format)} · ${esc(doc.size)} · 更新于 ${esc(doc.date)}</p></div></div>
              </header>
              <div class="lx-document-insight-columns">
                <span class="lx-document-ai-left-arrow" aria-hidden="true"></span>
                <article class="lx-document-article">
                  <div class="lx-document-article-cover"><img src="${esc(doc.image)}" alt="${esc(doc.title)}"><div><b>${esc(doc.title)}</b><span>${esc(doc.type)} · ${esc(doc.format)}</span></div></div>
                  <div class="lx-document-reader-pages">
                    <section class="is-active" data-reader-page="1">
                      <h3>文章详情</h3>
                      <p>本文围绕${esc(doc.title)}展开，系统介绍相关产品能力、技术架构、应用场景与实施路径，为业务规划和方案评估提供参考。</p>
                      <h4>内容概览</h4>
                      <p>文档从业务需求出发，梳理核心能力、部署方式及典型实践，并结合可量化指标说明方案价值。</p>
                      <h4>主要章节</h4>
                      <ol><li>行业背景与业务挑战</li><li>核心产品及技术能力</li><li>典型场景与实施方案</li><li>交付路径与服务保障</li></ol>
                      <h4>适用对象</h4>
                      <p>适合企业决策者、技术负责人、解决方案架构师及项目实施团队阅读。</p>
                    </section>
                    <section data-reader-page="2">
                      <h3>核心能力与技术架构</h3>
                      <p>${esc(doc.title)}采用模块化能力架构，将基础资源、平台服务、业务应用和统一运维进行分层组织，支持按需部署与持续扩展。</p>
                      <h4>能力组成</h4>
                      <ol><li>统一资源管理与弹性调度能力</li><li>标准化服务接口与应用集成能力</li><li>数据治理、安全控制与运行监测能力</li><li>面向场景的解决方案快速编排能力</li></ol>
                      <h4>架构特点</h4>
                      <p>通过松耦合、可观测和分级权限设计，降低系统间协作复杂度，并为后续能力升级预留空间。</p>
                      <h4>部署建议</h4>
                      <p>建议先完成现状评估和接口梳理，再以高价值场景为试点逐步扩展，避免一次性建设带来的交付风险。</p>
                    </section>
                    <section data-reader-page="3">
                      <h3>应用场景与实施路径</h3>
                      <p>方案可应用于智能运营、协同办公、数据分析和业务创新等场景，并根据组织成熟度进行分阶段落地。</p>
                      <h4>实施阶段</h4>
                      <ol><li>准备：确认目标、范围、责任人与验收指标</li><li>试点：选择典型场景完成最小闭环验证</li><li>推广：沉淀标准能力并复制到更多业务单元</li><li>运营：持续监测效果并开展迭代优化</li></ol>
                      <h4>交付保障</h4>
                      <p>项目需要同步建立数据质量检查、权限审计、运行监控和问题响应机制，确保上线后的稳定性与可追溯性。</p>
                      <h4>预期价值</h4>
                      <p>在控制建设成本的同时提升协同效率、资源利用率和业务响应速度，为后续规模化应用形成基础。</p>
                    </section>
                  </div>
                  <nav class="lx-document-reader-pagination" aria-label="文档详情分页">
                    <button type="button" data-reader-action="prev" disabled aria-label="上一页">←</button>
                    <span>第 <b data-reader-current>1</b> / 3 页</span>
                    <button type="button" data-reader-action="next" aria-label="下一页">→</button>
                  </nav>
                </article>
                <aside class="lx-document-ai-panel">
                  <section class="lx-document-ai-summary">
                    <h3><i aria-hidden="true">✦</i><span>AI解读文档摘要</span></h3>
                    <p>本文面向企业数字化建设需求，围绕<strong>业务目标、核心能力、技术架构、实施路径和服务保障</strong>梳理完整方案。文档以<strong>模块化部署、统一数据治理、分阶段验证与持续运营</strong>为主线，适合快速了解${esc(doc.title)}的建设边界与落地重点。</p>
                  </section>
                  <section class="lx-document-ai-core">
                    <h3>AI解读核心内容</h3>
                    <div class="lx-document-ai-accordions">
                      <details open><summary>业务目标与建设边界</summary><p>围绕真实业务目标规划能力建设，优先选择价值明确、数据基础较好的场景进行验证，并明确系统范围、责任主体和验收口径。</p></details>
                      <details><summary>模块化架构支持持续扩展</summary><p>通过松耦合的能力模块和标准服务接口，支持按阶段部署、灵活组合与持续升级，降低一次性建设和后续维护成本。</p></details>
                      <details><summary>数据治理与统一运营指标</summary><p>建立数据质量、权限边界、运行监控和业务成效指标，确保建设过程可观测、结果可衡量、问题可追溯。</p></details>
                      <details><summary>实施路径建议先试点再推广</summary><p>建议按照准备、试点、推广、运营四个阶段推进；先形成最小业务闭环，再沉淀标准能力并复制到更多业务单元。</p></details>
                      <details><summary>交付风险与服务保障</summary><p>正式实施前需核验现有接口、数据质量和安全要求，同时确认项目负责人、关键时间节点、应急响应和验收标准。</p></details>
                    </div>
                  </section>
                </aside>
              </div>
            </section>`;
          window.__lxRestoreDocumentInsightTab = (targetTabId) => {
            const prefix = "info:document-insight:";
            const title = String(targetTabId || "").startsWith(prefix) ? String(targetTabId).slice(prefix.length) : "";
            const doc = documents.find((item) => item.title === title);
            if (!doc) {
              toast("未找到对应资料，请从资料中心重新生成");
              return false;
            }
            const tab = {
              id: `${prefix}${doc.title}`,
              kind: "info",
              label: doc.title,
              html: documentInsightHtml(doc),
            };
            lxUpsertTab(tab, true);
            lxRunTab(tab);
            return true;
          };
          const labels = ["全部", "白皮书", "产品视频", "行业案例", "产品手册"];
          const selectedDocumentTypes = new Set(["全部"]);
          const documentTotalPages = 18;
          let documentCurrentPage = 1;
          tabs.setAttribute("aria-label", "资料分类");
          tabs.innerHTML = labels.map((label, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-document-filter="${esc(label)}">${esc(label)}</button>`).join("");

          const renderDocuments = (filter = "全部", keyword = "") => {
            const key = String(keyword || "").trim().toLowerCase();
            const showAll = selectedDocumentTypes.has("全部");
            const matched = documents.filter((doc) => (showAll || selectedDocumentTypes.has(doc.type)) && (!key || `${doc.title}${doc.format}${doc.type}${doc.tag || ""}`.toLowerCase().includes(key)));
            const list = matched.length ? matched.map((_, index) => matched[(index + documentCurrentPage - 1) % matched.length]) : [];
            grid.className = "product-grid lx-document-reco";
            grid.innerHTML = `<div class="lx-document-reco-head"><h2>资料中心</h2><fieldset class="lx-document-filters" aria-label="资料类型筛选"><legend>资料类型筛选</legend>${labels.map((label) => `<label><input type="checkbox" value="${esc(label)}" data-document-type ${selectedDocumentTypes.has(label) ? "checked" : ""}><span class="lx-document-check" aria-hidden="true"></span><b>${esc(label)}</b></label>`).join("")}</fieldset></div>` + (list.length ? list.map((doc, index) => `
              <article class="lx-document-row" data-document-title="${esc(doc.title)}">
                <span class="lx-document-rank">${(documentCurrentPage - 1) * Math.max(list.length, 1) + index + 1}</span>
                <img class="lx-document-thumb" loading="lazy" src="${esc(doc.image)}" alt="${esc(doc.title)}">
                <div class="lx-document-main">
                  <h3>${esc(doc.title)}</h3>
                  <p>${esc(doc.format)}　${esc(doc.size)}　${esc(doc.date)}</p>
                  <div class="lx-document-tags"><span>${esc(doc.type)}</span>${doc.tag ? `<span>${esc(doc.tag)}</span>` : ""}</div>
                </div>
                <div class="lx-document-actions">
                  <button type="button" class="lx-document-btn secondary" data-view-document>查看文档</button>
                  <button type="button" class="lx-document-btn primary" data-insight-document>AI 解读</button>
                </div>
              </article>`).join("") : `<div class="lx-document-empty">未找到匹配资料</div>`);
            content.querySelector("[data-document-note]")?.remove();
            let pages = content.querySelector("[data-document-pages]");
            if (!pages) {
              pages = document.createElement("nav");
              pages.className = "category-tabs";
              pages.setAttribute("data-document-pages", "1");
              pages.setAttribute("aria-label", "资料分页");
              grid.after(pages);
            }
            pages.hidden = false;
            const pageNumbers = documentCurrentPage <= 3
              ? [1, 2, 3, "…", documentTotalPages]
              : documentCurrentPage >= documentTotalPages - 2
                ? [1, "…", documentTotalPages - 2, documentTotalPages - 1, documentTotalPages]
                : [1, "…", documentCurrentPage - 1, documentCurrentPage, documentCurrentPage + 1, "…", documentTotalPages];
            pages.innerHTML = `<button type="button" data-document-page="prev" aria-label="上一页" ${documentCurrentPage === 1 ? "disabled" : ""}>‹</button>${pageNumbers.map((page) => page === "…" ? "<span>…</span>" : `<button type="button" data-document-page="${page}" class="${page === documentCurrentPage ? "active" : ""}" ${page === documentCurrentPage ? 'aria-current="page"' : ""}>${page}</button>`).join("")}<button type="button" data-document-page="next" aria-label="下一页" ${documentCurrentPage === documentTotalPages ? "disabled" : ""}>›</button>`;
            pages.onclick = (event) => {
              const button = event.target.closest("[data-document-page]");
              if (!button || button.disabled) return;
              const target = button.dataset.documentPage;
              if (target === "prev") documentCurrentPage = Math.max(1, documentCurrentPage - 1);
              else if (target === "next") documentCurrentPage = Math.min(documentTotalPages, documentCurrentPage + 1);
              else documentCurrentPage = Math.min(documentTotalPages, Math.max(1, Number(target) || 1));
              renderDocuments("全部", searchForm.querySelector("textarea")?.value || "");
              grid.scrollTo({ top: 0, behavior: "smooth" });
            };
          };

          tabs.onclick = (event) => {
            const button = event.target.closest("[data-document-filter]");
            if (!button) return;
            tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
            renderDocuments(button.dataset.documentFilter || "全部", searchForm.querySelector("textarea")?.value || "");
          };
          searchForm.onsubmit = (event) => {
            event.preventDefault();
            const active = tabs.querySelector("button.active")?.dataset.documentFilter || "全部";
            renderDocuments(active, searchForm.querySelector("textarea")?.value || "");
          };
          grid.onclick = async (event) => {
            const row = event.target.closest("[data-document-title]");
            if (!row) return;
            if (event.target.closest("[data-insight-document]")) {
              const doc = documents.find((item) => item.title === row.dataset.documentTitle);
              if (!doc) return;
              if (!lxRequireQueryAccess()) return;
              const trigger = event.target.closest("[data-insight-document]");
              if (trigger.disabled) return;
              trigger.disabled = true;
              const insightTabId = `info:document-insight:${doc.title}`;
              const query = `${doc.title}AI解读`;
              const reply = "我已完成这份资料的AI解读，重点梳理了核心内容、关键价值、实施路径和潜在风险，详细结果已在右侧生成。";
              const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
              const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? Math.min(ms, 40) : ms));
              try {
                const userNode = addMessage("user", query);
                userNode.classList.add("lx-document-query-sending");
                lxRebuildQueryHistoryFromDom();
                renderQueryHistory();
                await wait(720);

                const aiNode = lxAddInstantAi("");
                aiNode.classList.add("lx-document-reply-typing");
                aiNode._raw = reply;
                const aiBody = lxEnsureAiBody(aiNode);
                aiBody.innerHTML = '<p class="lx-document-typed-reply"><span data-document-typed-text></span><span class="typing-cursor" aria-hidden="true"></span></p>';
                const typedText = aiBody.querySelector("[data-document-typed-text]");
                for (const character of Array.from(reply)) {
                  typedText.textContent += character;
                  ensureChat().scrollTop = ensureChat().scrollHeight;
                  await wait(34);
                }
                aiBody.innerHTML = mdLite(reply);
                aiNode.classList.remove("lx-document-reply-typing");
                await wait(320);

                const cardHtml = renderPageCta({
                  title: `${doc.title}的文章解读`,
                  desc: "已为你生成右侧文档解读内容",
                  attr: `data-lx-open-tab="${esc(insightTabId)}" aria-label="${esc(doc.title)}的文章解读"`,
                });
                aiBody.insertAdjacentHTML("beforeend", cardHtml);
                aiBody.querySelector(".answer-cta:last-child")?.classList.add("lx-document-card-enter");
                lxSyncAnswerCtaActiveState(state.activeTabId);
                ensureChat().scrollTop = ensureChat().scrollHeight;
                lxSaveConversation();
                try { window.__lxSaveConversationNow?.(); } catch (_e) {}
                await wait(680);

                const tab = {
                  id: insightTabId,
                  kind: "info",
                  label: doc.title,
                  html: documentInsightHtml(doc),
                };
                lxUpsertTab(tab, true);
                lxRunTab(tab);
              } finally {
                trigger.disabled = false;
              }
              return;
            }
            toast(`正在打开「${row.dataset.documentTitle}」`);
          };
          grid.onchange = (event) => {
            const checkbox = event.target.closest("[data-document-type]");
            if (!checkbox) return;
            const value = checkbox.value;
            if (value === "全部") {
              selectedDocumentTypes.clear();
              selectedDocumentTypes.add("全部");
            } else {
              selectedDocumentTypes.delete("全部");
              if (checkbox.checked) selectedDocumentTypes.add(value);
              else selectedDocumentTypes.delete(value);
              if (!selectedDocumentTypes.size) selectedDocumentTypes.add("全部");
            }
            documentCurrentPage = 1;
            renderDocuments("全部", searchForm.querySelector("textarea")?.value || "");
          };

          renderDocuments();
          content.setAttribute("data-view", "documents");
          lxUpsertTab({ id: "documents", kind: "documents", label: "资料中心" }, true);
          document.body.dataset.page = "personal";
          document.body.dataset.state = "chat";
          state.page = "personal";
          lxRevealContent();
        }
        window.openDocumentCenter = openDocumentCenter;
        // 商城模板中的推荐卡片统一走公共标签管理，避免模板私有标签数组覆盖已有页面。
        window.__lxOpenProductTab = function(product) { return openProduct(product); };
        window.__lxOpenFeature = function(op) {
          if (op === 'member') openMemberCenter();
          else if (op === 'devices') openMemberDevicesCenter();
          else if (op === 'coupon') openCouponCenter();
          else if (op === 'points') openPointsCenter();
          else if (op === 'vouchers') openVoucherCenter();
          else if (op === 'redpacket') openRedPacketCenter();
          else if (op === 'solution') openSolutionCenter();
          else if (op === 'edu') openEduZone();
          else if (op === 'stores') openStoresPanel();
          else if (op === 'documents') openDocumentCenter();
          else if (op === 'cart' || op === 'open_cart') lxOpenCommerceEntry("cart");
          else if (op === 'orders' || op === 'open_orders') lxOpenCommerceEntry("orders");
        };
        // 页面操作桥接（全屏 lxfd 收到 control 事件后桥接到主面板执行，如关标签/回首页）
        window.__lxExecControl = function(op, target) { lxExecControl(op, target); };

        openUploadControls();
        // 已下线划词“问乐享 / 带入对话”：不创建浮层，也不注册选区监听。
        bindEvents();
        updateBadges();
        updateUserArea();
        checkAuth();
        initRoute();
        // 当前商城站点是右侧标签体系的首页，首屏就必须显示，后续结果页从其右侧追加。
        lxEnsureCurrentSiteTab(true);
        window.addEventListener("popstate", () => {
          initRoute();
          lxEnsureCurrentSiteTab(true);
        });
        // 切站点(整页重载)/刷新后恢复对话：仅当有持久化对话时还原并切到 chat 态；无则保持首页/欢迎态不变
        try {
          const _convRaw = localStorage.getItem(LX_CONV_KEY);
          if (_convRaw) {
            const _convData = JSON.parse(_convRaw);
            if (_convData && Array.isArray(_convData.messages) && _convData.messages.length) {
              lxRestoreConversation();
              lxRebuildQueryHistoryFromDom();
              renderQueryHistory();
            }
          }
        } catch (_e) {}
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
      + '<stop offset="0" stop-color="#ff2f2f"><animate attributeName="stop-color" values="#ff2f2f;#ff3c3c;#a262d7;#bcb4c1;#e3eafd;#ff2f2f" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.24" stop-color="#ff3c3c"><animate attributeName="stop-color" values="#ff3c3c;#a262d7;#bcb4c1;#e3eafd;#ff2f2f;#ff3c3c" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.5" stop-color="#a262d7"><animate attributeName="stop-color" values="#a262d7;#bcb4c1;#e3eafd;#ff2f2f;#ff3c3c;#a262d7" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="0.76" stop-color="#bcb4c1"><animate attributeName="stop-color" values="#bcb4c1;#e3eafd;#ff2f2f;#ff3c3c;#a262d7;#bcb4c1" dur="2.2s" repeatCount="indefinite"/></stop>'
      + '<stop offset="1" stop-color="#e3eafd"><animate attributeName="stop-color" values="#e3eafd;#ff2f2f;#ff3c3c;#a262d7;#bcb4c1;#e3eafd" dur="2.2s" repeatCount="indefinite"/></stop></linearGradient>'
      + '<linearGradient id="arrowBrand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d144a"/><stop offset="1" stop-color="#b8252e"/></linearGradient>'
      + '<linearGradient id="irisFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2f2f"/><stop offset="0.25" stop-color="#ff3c3c"/><stop offset="0.5" stop-color="#a262d7"/><stop offset="0.72" stop-color="#bcb4c1"/><stop offset="0.88" stop-color="#e2ddeb"/><stop offset="1" stop-color="#e3eafd"/></linearGradient>'
      + '</defs></svg>';
  }
  function arrowSVG(){ return '<svg class="arrow" width="22" height="26" viewBox="-1 -1 17 24" aria-hidden="true"><path class="ar-body" d="' + ARROW + '"/></svg>'; }
  function fxHTML(label){ return '<div class="fx"><div class="label"><span class="lx-icon"><img src="../img/lx-icon-0016.png" alt=""/></span><span class="ltxt">' + label + '</span></div></div>'; }
  function init(opts){
    opts = opts || {};
    var v = opts.variant || "A";
    var delay = opts.delay != null ? opts.delay : 3000;
    var label = opts.label || "乐享正在帮你";
    var targetSelector = opts.target || ".content .product-card, .content .lx-floor-product-card, .content [data-floor-product], .content .lx-floor-product, .content .lx-sim-card, .content .lx-p0-product-mini, .content .reco-row, .content .lx-edu-card";
    if (document.querySelector(".ai-arrow")) return;
    document.body.setAttribute("data-arr", v);
    var root = document.createElement("div");
    root.className = "ai-arrow";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = defsSVG() + arrowSVG() + fxHTML(label);
    document.body.appendChild(root);
    var x = -200, y = -200, px = -200, py = -200, raf = 0, timer = null, awake = false, inTarget = false, activeTarget = null;
    function place(){
      raf = 0;
      var dx = x - px;
      var dy = y - py;
      px += dx * 0.42;
      py += dy * 0.42;
      if (Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) {
        px = x;
        py = y;
      }
      root.style.transform = "translate3d(" + px.toFixed(2) + "px," + py.toFixed(2) + "px,0)";
      if (px !== x || py !== y) raf = window.requestAnimationFrame(place);
    }
    function schedulePlace(){ if (!raf) raf = window.requestAnimationFrame(place); }
    function sleep(){ if (!awake && !document.body.classList.contains("cursor-awake")) return; awake = false; root.classList.remove("awake"); document.body.classList.remove("cursor-awake"); }
    function wake(){ timer = null; if (!inTarget) return; awake = true; var old = root.querySelector(".fx"); if (old) old.remove(); root.insertAdjacentHTML("beforeend", fxHTML(label)); void root.offsetWidth; root.classList.add("awake"); document.body.classList.add("cursor-awake"); }
    function showArrow(){ document.body.classList.add("cursor-awake"); }
    function clearArm(){ if (timer) window.clearTimeout(timer); timer = null; }
    function arm(){ clearArm(); timer = window.setTimeout(wake, delay); }
    function getTarget(t){ return t && t.closest ? t.closest(targetSelector) : null; }
    function onMove(e){
      x = e.clientX;
      y = e.clientY;
      schedulePlace();
      var nextTarget = getTarget(e.target);
      if (nextTarget !== activeTarget){
        clearArm();
        sleep();
        activeTarget = nextTarget;
      }
      inTarget = !!activeTarget;
      if (!inTarget){ clearArm(); sleep(); return; }
      showArrow();
      if (!awake && !timer) arm();
    }
    function onLeave(){ clearArm(); inTarget = false; activeTarget = null; sleep(); if (raf) window.cancelAnimationFrame(raf); raf = 0; x = y = px = py = -200; root.style.transform = "translate3d(-200px,-200px,0)"; }
    document.addEventListener("mousemove", onMove, { passive:true });
    document.addEventListener("mouseleave", onLeave, { passive:true });
    document.addEventListener("mousedown", function(){ clearArm(); sleep(); if (inTarget) arm(); }, { passive:true });
    window.addEventListener("blur", onLeave);
    return { wake:wake, sleep:sleep, setVariant:function(nv){ v = nv; document.body.setAttribute("data-arr", nv); sleep(); } };
  }
  global.ARROWCURSOR = global.ARROWCURSOR || {};
  global.ARROWCURSOR.init = init;
  global.ARROWCURSOR.__lxProductDwell = true;
  function boot(){
    document.querySelectorAll(".ai-arrow,.lx-template-smart-cursor").forEach(function(node){ node.remove(); });
    document.body.classList.remove("cursor-awake");
    document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");
    document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active", "assistant-glass-active");
    var list = document.querySelector("[data-hover-prompt-list]");
    if (list) list.innerHTML = "";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window);

// LXFD home nav intro: show on refresh for 2s, then ease closed.
(function(){
  function init(){
    if (location.pathname.replace(/\/+$/, "") !== "") return;
    var nav = document.getElementById("lxfdNavCluster");
    var pill = document.getElementById("lxfdConvoPill");
    if (!nav || nav.dataset.lxfdNavIntroReady === "1") return;
    nav.dataset.lxfdNavIntroReady = "1";
    var hoverTimer = null;
    var introTimer = null;
    var pointerInside = false;
    function clearIntro(){
      if (!introTimer) return;
      window.clearTimeout(introTimer);
      introTimer = null;
    }
    function setNav(open, intro){
      if (!intro) clearIntro();
      nav.classList.toggle("open", !!open);
      if (pill) pill.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (pill) pill.addEventListener("click", function(){ setNav(!nav.classList.contains("open")); });
    nav.addEventListener("mouseenter", function(){ pointerInside = true; if (hoverTimer) window.clearTimeout(hoverTimer); setNav(true); });
    nav.addEventListener("mouseleave", function(){ pointerInside = false; hoverTimer = window.setTimeout(function(){ setNav(false); }, 320); });
    document.addEventListener("click", function(e){ if (!nav.contains(e.target)) setNav(false); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") setNav(false); });
    window.requestAnimationFrame(function(){
      setNav(true, true);
      introTimer = window.setTimeout(function(){
        introTimer = null;
        if (!pointerInside) setNav(false, true);
      }, 2000);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

// Business channel banner assets: keep SME page aligned with approved 2026 visuals.
(function(){
  var B1 = "/assets/img/business-banner-1.jpg";
  var B2 = "/assets/img/business-banner-2.jpg";
  function isBusinessPage(){
    return /\/b-chat\/?$/.test(location.pathname || "") ||
      (window.__lxState && window.__lxState.page === "business") ||
      document.body.dataset.page === "business";
  }
  function applyBusinessBanner(){
    if (!isBusinessPage()) return;
    var slides = document.querySelectorAll(".content > .hero .hero-slide, .hero .hero-slide");
    if (slides[0] && slides[0].getAttribute("src") !== B1) slides[0].setAttribute("src", B1);
    if (slides[1] && slides[1].getAttribute("src") !== B2) slides[1].setAttribute("src", B2);
    if (slides[0]) slides[0].classList.add("is-active");
    var kicker = document.querySelector("[data-page-kicker]");
    var title = document.querySelector("[data-page-title]");
    if (kicker) kicker.textContent = "联想中小企业智能办公方案";
    if (title) title.textContent = "高效办公 灵活成长";
  }
  function boot(){
    applyBusinessBanner();
    var runs = 0;
    var timer = window.setInterval(function(){
      applyBusinessBanner();
      runs += 1;
      if (runs > 12) window.clearInterval(timer);
    }, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.addEventListener("popstate", function(){ window.setTimeout(boot, 0); });
  document.addEventListener("click", function(event){
    if (event.target.closest && event.target.closest(".main-nav [data-page=\"business\"]")) window.setTimeout(boot, 0);
  }, true);
})();

// Enterprise channel banner assets: keep government/education/large-enterprise page aligned with approved 2026 visuals.
(function(){
  var B1 = "/assets/img/enterprise-banner-1.jpg";
  var B2 = "/assets/img/enterprise-banner-2.jpg";
  function isEnterprisePage(){
    return /\/biz-chat\/?$/.test(location.pathname || "") ||
      (window.__lxState && window.__lxState.page === "enterprise") ||
      document.body.dataset.page === "enterprise";
  }
  function applyEnterpriseBanner(){
    if (!isEnterprisePage()) return;
    var slides = document.querySelectorAll(".content > .hero .hero-slide, .hero .hero-slide");
    if (slides[0] && slides[0].getAttribute("src") !== B1) slides[0].setAttribute("src", B1);
    if (slides[1] && slides[1].getAttribute("src") !== B2) slides[1].setAttribute("src", B2);
    if (slides[0]) slides[0].classList.add("is-active");
    var kicker = document.querySelector("[data-page-kicker]");
    var title = document.querySelector("[data-page-title]");
    if (kicker) kicker.textContent = "政教及大企业数字化终端方案";
    if (title) title.textContent = "安全可信 规模交付";
  }
  function boot(){
    applyEnterpriseBanner();
    var runs = 0;
    var timer = window.setInterval(function(){
      applyEnterpriseBanner();
      runs += 1;
      if (runs > 12) window.clearInterval(timer);
    }, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.addEventListener("popstate", function(){ window.setTimeout(boot, 0); });
  document.addEventListener("click", function(event){
    if (event.target.closest && event.target.closest(".main-nav [data-page=\"enterprise\"]")) window.setTimeout(boot, 0);
  }, true);
})();

// Demo reset: make education certification unverified once so the flow can be replayed.
(function(){
  try {
    var resetKey = "lexiang.student.reset.20260706.unverified.v1";
    if (!localStorage.getItem(resetKey)) {
      localStorage.removeItem("lexiang.student.v1");
      localStorage.setItem(resetKey, "1");
    }
  } catch (_) {}
})();


// Remove deprecated static portal homepage from production root rendering.
(function(){
  function isRootPath(){
    return String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "/") === "/";
  }
  function removePortalHome(){
    var portal = document.querySelector(".portal-home");
    if (portal && portal.parentNode) portal.parentNode.removeChild(portal);
  }
  function forceRootFullscreen(){
    removePortalHome();
    var splitActive = document.body.classList.contains("lx-home-split") ||
      document.body.classList.contains("lxfd-split-entered") ||
      // 退全屏→分屏的过渡动画期间(约760ms)分屏类还没就位，此时强制回全屏会造成
      // 全屏类+分屏类共存的混合态(load后的50/200/600ms定时器正撞用户手快输指令的窗口)
      document.body.classList.contains("lxfd-exiting") ||
      document.body.classList.contains("lxfd-split-returning") ||
      (document.body.dataset && document.body.dataset.page && document.body.dataset.page !== "home") ||
      (window.__lxState && window.__lxState.page && window.__lxState.page !== "home");
    if (!isRootPath() || splitActive) return;
    document.documentElement.classList.add("lx-root-lxfd-prepaint");
    document.body.classList.add("assistant-fullscreen", "lx-auto-fs", "lx-root-home");
    document.body.dataset.page = "home";
    document.body.dataset.state = "chat";
    var lxfd = document.querySelector(".lxfd");
    if (lxfd) {
      lxfd.style.display = "block";
      lxfd.style.visibility = "visible";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", forceRootFullscreen);
  } else {
    forceRootFullscreen();
  }
  window.addEventListener("pageshow", forceRootFullscreen);
  window.addEventListener("popstate", function(){ setTimeout(forceRootFullscreen, 0); });
  document.addEventListener("click", function(event){
    var target = event.target && event.target.closest ? event.target.closest("[data-page=\"home\"]") : null;
    if (target) setTimeout(forceRootFullscreen, 0);
  }, true);
  [50, 200, 600, 1200].forEach(function(delay){ setTimeout(forceRootFullscreen, delay); });
})();

// Channel top navigation title state.
(function(){
  var CONV_KEY = "lexiang.conversation.v1";
  var SOURCE_PAGE_KEY = "lexiang.conversation.sourcePage.v1";
  var PAGE_LABELS = { home: "首页", personal: "个人及家庭", business: "中小企业", enterprise: "政教及大企业", brand: "品牌" };
  var syncTimer = 0;
  var submittedQuery = "";
  function pageFromLocation(){
    var path = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
    if (path === "/") return "home";
    if (path === "/shop-chat") return "personal";
    if (path === "/b-chat") return "business";
    if (path === "/biz-chat") return "enterprise";
    if (path === "/brand") return "brand";
    // 没有模板逻辑路径时才回退到运行时 body 状态。首页打开推荐卡后内部
    // 商城容器会暂时使用 personal，但它仍是首页分屏，不能据此改成“个人及家庭”。
    var bodyPage = document.body && document.body.dataset && document.body.dataset.page;
    if (PAGE_LABELS[bodyPage]) return bodyPage;
    return "home";
  }
  function sourcePage(){
    var page = (window.__lxState && window.__lxState.conversationSourcePage) || window.__lxConversationSourcePage || "";
    if (!PAGE_LABELS[page]) {
      try { page = localStorage.getItem(SOURCE_PAGE_KEY) || ""; } catch (_e) {}
    }
    return PAGE_LABELS[page] ? page : pageFromLocation();
  }
  function isTopNavTitlePage(){
    var page = (window.__lxState && window.__lxState.page) ||
      (document.body && document.body.dataset && document.body.dataset.page) ||
      pageFromLocation();
    return page === "personal" || page === "business" || page === "enterprise" || page === "brand" ||
      /^\/(shop-chat|b-chat|biz-chat|brand)\/?$/.test(location.pathname || "");
  }
  function cap7(text){
    return Array.from(String(text || "").trim()).slice(0, 7).join("") || "新对话";
  }
  function cleanText(text){
    return String(text || "")
      .replace(/\s+/g, "")
      .replace(/[，。！？、,.!?;；:："'“”‘’（）()【】\[\]<>《》]/g, "")
      .trim();
  }
  function summarize(text){
    var s = cleanText(text);
    if (!s) return "新对话";
    if (Array.from(s).length <= 6) return s;
    var rules = [
      [/关闭.*标签|标签.*关闭|关.*页面标签/, "关闭页面标签"],
      [/文档|文件|资料|PDF|白皮书|手册|文章|解读|摘要|提炼/i, "文档核心解读"],
      [/教育|学生|教师|认证/, "教育认证优惠"],
      [/国补|国家补贴|补贴/, "国家补贴商品"],
      [/以旧换新|旧机|回收|估算/, "旧机换新服务"],
      [/门店|附近|到店/, "附近门店查询"],
      [/客服|售后|维修|保修/, "售后维修服务"],
      [/订单|物流|发货/, "订单物流查询"],
      [/会员|积分|权益/, "会员积分权益"],
      [/私人|定制|订制|刻字|喷绘|配色/, "私人定制服务"],
      [/对比|比较/, "商品对比分析"],
      [/下单|购买|买|领券|优惠券/, "购买商品下单"],
      [/活动|优惠|秒杀|促销/, "优惠活动查询"],
      [/笔记本|电脑|轻薄本|游戏本|工作站|YOGA|ThinkPad|拯救者|小新/i, "笔记本电脑推荐"]
    ];
    for (var i = 0; i < rules.length; i += 1) {
      if (rules[i][0].test(s)) return cap7(rules[i][1]);
    }
    return "问题内容咨询";
  }
  function currentUserTexts(){
    var texts = [];
    document.querySelectorAll(".lx-p0-messages .lx-p0-message.user, .lx-p0-messages .msg.user, .lxfd-thread .lxfd-msg.user, .lxfd-thread .lxfd-msg-user").forEach(function(node){
      var bubble = node.querySelector && node.querySelector(".user-bubble");
      var text = ((bubble || node).textContent || "").trim();
      if (text) texts.push(text);
    });
    if (!texts.length && submittedQuery) texts.push(submittedQuery);
    if (!texts.length) {
      try {
        var data = JSON.parse(localStorage.getItem(CONV_KEY) || "null");
        if (data && Array.isArray(data.messages)) {
          data.messages.forEach(function(msg){
            if (msg && msg.role === "user" && String(msg.text || "").trim()) texts.push(String(msg.text).trim());
          });
        }
      } catch (_e) {}
    }
    return texts;
  }
  function conversationLabel(){
    var texts = currentUserTexts();
    if (!texts.length) return "新对话";
    return summarize(texts[0] || texts[texts.length - 1]);
  }
  function sync(){
    var hasFullscreenNav = !!document.getElementById("lxfdConvoName");
    if (!isTopNavTitlePage() && !hasFullscreenNav) return;
    var nav = document.querySelector(".main-nav");
    // 前缀取"当前所在页"而非"对话起源页"：URL=/ 的首页(含原地分屏)显「首页」，真navigate到
    // 子站(/shop-chat 等)就显子站名。原用 sourcePage() 会把首页起的对话在子站里仍标「首页」，
    // 造成"人在 shop 子站却标首页"的矛盾(真机反馈)。原始需求「有对话保持首页:xxx」只针对 URL=/。
    var source = pageFromLocation();
    var isHomeFullscreenNav = pageFromLocation() === "home" && hasFullscreenNav;
    var isHomeFullscreenMode = isHomeFullscreenNav &&
      (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs"));
    var hasFullscreenUserMessage = !!document.querySelector(".lxfd-thread .lxfd-msg-user");
    var hasSplitUserMessage = !!document.querySelector(".lx-p0-messages .lx-p0-message.user, .lx-p0-messages .msg.user") || !!submittedQuery;
    var hasCurrentUserMessage = isHomeFullscreenMode ? hasFullscreenUserMessage : (hasSplitUserMessage || hasFullscreenUserMessage);
    // leaibot.cn(URL=/)：没聊过 =「开启新对话」（不带"首页："前缀）；有对话保持「首页：xxx」（真机反馈）
    var label = isHomeFullscreenNav && !hasCurrentUserMessage
      ? "开启新对话"
      : (isHomeFullscreenNav ? PAGE_LABELS.home : (PAGE_LABELS[source] || PAGE_LABELS.home)) + "：" + conversationLabel();
    // 当前就在首页时，导航列表里的「首页」项是重复入口，藏掉（子站仍显示，用于回首页）
    var onHomePage = pageFromLocation() === "home";
    if (nav) {
      nav.setAttribute("data-current-label", label);
      nav.setAttribute("data-shop-current-label", label);
      nav.style.setProperty("--lx-personal-nav-label-half", Math.ceil(label.length * 7.5 + 14) + "px");
      var chip = nav.querySelector(".lx-current-topic-chip");
      if (nav.classList.contains("lx-shop-nav")) {
        if (chip) chip.remove();
      } else if (!chip) {
        chip = document.createElement("span");
        chip.className = "lx-current-topic-chip";
        chip.setAttribute("aria-hidden", "true");
        nav.insertBefore(chip, nav.firstElementChild || null);
      }
      if (chip && !nav.classList.contains("lx-shop-nav")) chip.textContent = label;
      Object.keys(PAGE_LABELS).forEach(function(page){
        var btn = nav.querySelector('[data-page="' + page + '"]');
        if (btn) btn.textContent = PAGE_LABELS[page];
      });
      var navHomeBtn = nav.querySelector('[data-page="home"]');
      if (navHomeBtn) { if (onHomePage) navHomeBtn.style.setProperty("display", "none", "important"); else navHomeBtn.style.removeProperty("display"); }
    }
    var lxfdName = document.getElementById("lxfdConvoName");
    if (lxfdName) {
      lxfdName.textContent = label;
      lxfdName.title = label;
      var lxfdCluster = document.getElementById("lxfdNavCluster");
      if (lxfdCluster) lxfdCluster.style.setProperty("--lxfd-nav-label-half", Math.ceil(label.length * 7.5 + 14) + "px");
    }
    var lxfdNav = document.getElementById("lxfdNavSheet");
    if (lxfdNav) {
      Array.prototype.forEach.call(lxfdNav.querySelectorAll("[data-page]"), function(item){
        item.classList.toggle("active", item.getAttribute("data-page") === pageFromLocation());
      });
      var lxfdHomeItem = lxfdNav.querySelector('[data-page="home"]');
      // 加 important：.lxfd-nav-sheet 的 display 规则带 !important，普通 inline 压不过
      if (lxfdHomeItem) { if (onHomePage) lxfdHomeItem.style.setProperty("display", "none", "important"); else lxfdHomeItem.style.removeProperty("display"); }
    }
  }
  function scheduleSync(){
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(sync, 40);
  }
  window.__lxSyncPersonalNavTitle = scheduleSync;
  window.__lxSyncTopNavTitle = scheduleSync;
  window.__lxSetConversationQuery = function(text){
    submittedQuery = String(text || "").trim();
    scheduleSync();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync); else sync();
  if (window.MutationObserver) {
    var observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-state"] });
  }
  document.addEventListener("click", function(event){
    if (!event.target || !event.target.closest) return;
    if (event.target.closest(".new-chat-button, .lxfd-new-chat, .assistant-history-new")) submittedQuery = "";
    if (event.target.closest(".category-tabs button, .main-nav [data-page], [data-site-floor-tab], [data-floor-tab], .new-chat-button, .send-btn, .hero-send-btn")) {
      window.setTimeout(scheduleSync, 0);
      window.setTimeout(scheduleSync, 120);
    }
  });
  window.addEventListener("popstate", sync);
  window.addEventListener("storage", function(event){
    if (!event || event.key === CONV_KEY) scheduleSync();
  });
  [80, 300, 900].forEach(function(delay){ window.setTimeout(sync, delay); });
})();
