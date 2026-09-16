/* ==========================================================================
   leaibot.cn 移动端第一期：底部半浮层（sheet）控制器
   --------------------------------------------------------------------------
   · 独立 IIFE，不进 app.js 的作用域；对外只暴露 window.__lxSheet。
   · app.js 里只埋了 3 个一行钩子：lxRunTab → open()、lxCloseTab → sync()、
     forceRootFullscreen → 手机直接 return（首页不进 lxfd 全屏）。
   · PC（≥768px）上所有入口都先过 isMobile() 判空转，不创建任何 DOM、
     不改任何 class，行为与改动前完全一致。
   · 加载顺序：app-intent → app-conv → app.js → app-lxfd → app-voice
     → app-agent → 本文件（必须最后，才能包住 app-lxfd 的全屏桥接函数）。
   ========================================================================== */
(function () {
  "use strict";

  var MQ = window.matchMedia ? window.matchMedia("(max-width: 767px)") : null;
  function isMobile() { return MQ ? MQ.matches : false; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function contentEl() { return $(".content"); }

  var VIEW_LABEL = {
    detail: "商品详情",
    reco: "推荐结果",
    compare: "商品对比",
    info: "详情",
    list: "商品货架",
    home: "首页",
    brand: "品牌"
  };
  var PAGE_LABEL = {
    personal: "个人及家庭",
    business: "中小企业",
    enterprise: "政教及大企业",
    brand: "品牌",
    home: "首页"
  };

  var dom = null;          // { backdrop, head, title, peek, peekText }
  var syncPending = false;

  // ── 标题 / 内容判定 ────────────────────────────────────────────────────
  function activeTab() {
    var st = window.__lxState;
    var tabs = (st && st.tabs) || [];
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i] && tabs[i].id === st.activeTabId) return tabs[i];
    }
    return tabs[tabs.length - 1] || null;
  }

  function currentTitle(tab) {
    var t = tab || activeTab();
    if (t && t.label) return String(t.label);
    var domLabel = $(".lx-tab.is-active .lx-tab-label");
    if (domLabel && domLabel.textContent.trim()) return domLabel.textContent.trim();
    var box = contentEl();
    var view = box ? (box.getAttribute("data-view") || "") : "";
    var page = document.body.dataset.page || "";
    if (!view || view === "list" || view === "home") return PAGE_LABEL[page] || "内容";
    return VIEW_LABEL[view] || "内容";
  }

  // 有没有「可回看的东西」：有标签，或当前就在有货架的频道页
  function hasContent() {
    var st = window.__lxState;
    if (st && st.tabs && st.tabs.length) return true;
    var page = document.body.dataset.page || "";
    return ["personal", "business", "enterprise", "brand"].indexOf(page) >= 0;
  }

  // ── DOM 组装（幂等） ───────────────────────────────────────────────────
  function ensureDom() {
    if (!isMobile()) return null;
    var box = contentEl();
    if (!box) return null;
    if (!dom) dom = {};

    if (!dom.backdrop || !dom.backdrop.isConnected) {
      var backdrop = $(".lx-sheet-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "lx-sheet-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        document.body.appendChild(backdrop);
      }
      if (!backdrop.__lxBound) {
        backdrop.__lxBound = true;
        backdrop.addEventListener("click", function () { api.close(); });
      }
      dom.backdrop = backdrop;
    }

    if (!dom.head || !dom.head.isConnected) {
      var head = $(".lx-sheet-head");
      if (!head) {
        head = document.createElement("div");
        head.className = "lx-sheet-head";
        head.innerHTML =
          '<span class="lx-sheet-title"></span>' +
          '<button class="lx-sheet-btn" type="button" data-sheet-expand aria-label="展开或还原浮层">⤢</button>' +
          '<button class="lx-sheet-btn" type="button" data-sheet-close aria-label="收起浮层">×</button>';
      }
      box.prepend(head);
      dom.head = head;
      dom.title = head.querySelector(".lx-sheet-title");
      if (!head.__lxBound) { head.__lxBound = true; bindDrag(head); }
    }
    // lxEnsureTabbar 会把 .lx-tabbar prepend 进 .content，把手会被顶到第二位，
    // sticky 的 top 就对不上了，这里把它按回第一位（已在第一位则不动，不会自激）
    if (box.firstElementChild !== dom.head) box.prepend(dom.head);

    if (!dom.peek || !dom.peek.isConnected) {
      var bottom = $(".assistant-bottom");
      if (bottom) {
        var peek = $(".lx-sheet-peek");
        if (!peek) {
          peek = document.createElement("button");
          peek.className = "lx-sheet-peek";
          peek.type = "button";
          peek.innerHTML = '<span></span><span class="lx-sheet-peek-go" aria-hidden="true">›</span>';
        }
        // 放在输入框正上方：lxShowHint 用 afterbegin 插 .lx-hint-bar，别跟它抢头位
        var composer = bottom.querySelector("form.composer");
        if (composer) bottom.insertBefore(peek, composer);
        else bottom.appendChild(peek);
        dom.peek = peek;
        dom.peekText = peek.firstElementChild;
      }
    }
    return dom;
  }

  // ── 对外 API ───────────────────────────────────────────────────────────
  var api = {
    open: function (tab) {
      if (!isMobile()) return;
      if (!ensureDom()) return;
      clearDrag();
      document.body.classList.add("lx-sheet-open");
      api.sync(tab);
    },
    close: function () {
      document.body.classList.remove("lx-sheet-open", "lx-sheet-full");
      clearDrag();
      api.sync();
    },
    toggleFull: function () {
      if (!isMobile()) return;
      if (!document.body.classList.contains("lx-sheet-open")) { api.open(); return; }
      document.body.classList.toggle("lx-sheet-full");
    },
    // 标题 / peek 文案 / peek 显隐对齐当前状态；关掉最后一个标签时自动收浮层
    sync: function (tab) {
      if (!isMobile() || !dom) return;
      var title = currentTitle(tab);
      if (dom.title) dom.title.textContent = title;
      if (dom.peekText) dom.peekText.textContent = "查看：" + title;
      var keep = hasContent();
      document.body.classList.toggle("lx-peek-on", keep);
      if (!keep && document.body.classList.contains("lx-sheet-open")) {
        document.body.classList.remove("lx-sheet-open", "lx-sheet-full");
        clearDrag();
      }
    }
  };
  window.__lxSheet = api;

  function syncSoon() {
    if (syncPending) return;
    syncPending = true;
    requestAnimationFrame(function () {
      syncPending = false;
      if (!isMobile()) return;
      ensureDom();
      api.sync();
    });
  }

  // ── 把手手势：下滑收起 / 上滑全屏 ──────────────────────────────────────
  var dragging = false, startY = 0, dragY = 0;

  function clearDrag() {
    dragging = false;
    dragY = 0;
    document.body.classList.remove("lx-sheet-dragging");
    document.body.style.removeProperty("--lx-sheet-dy");
  }

  function bindDrag(head) {
    head.addEventListener("touchstart", function (event) {
      if (!isMobile() || !document.body.classList.contains("lx-sheet-open")) return;
      if (event.target.closest && event.target.closest("[data-sheet-close],[data-sheet-expand]")) return;
      startY = event.touches[0].clientY;
      dragY = 0;
      dragging = true;
      document.body.classList.add("lx-sheet-dragging");
    }, { passive: true });

    head.addEventListener("touchmove", function (event) {
      if (!dragging) return;
      dragY = event.touches[0].clientY - startY;
      var isFull = document.body.classList.contains("lx-sheet-full");
      // 往上超过全屏位就只给阻尼回馈，不让浮层飞出顶部
      var offset = dragY > 0 ? dragY : (isFull ? 0 : Math.max(dragY, -90) * 0.35);
      document.body.style.setProperty("--lx-sheet-dy", offset + "px");
      if (event.cancelable) event.preventDefault();
    }, { passive: false });

    head.addEventListener("touchend", function () {
      if (!dragging) return;
      var moved = dragY;
      clearDrag();
      if (document.body.classList.contains("lx-sheet-full")) {
        if (moved > 110) document.body.classList.remove("lx-sheet-full");   // 全屏 → 半屏
      } else if (moved > 110) {
        api.close();                                                        // 半屏 → 收起
      } else if (moved < -60) {
        document.body.classList.add("lx-sheet-full");                       // 半屏 → 全屏
      }
    });
    head.addEventListener("touchcancel", clearDrag);
  }

  // ── 软键盘：只在视口被顶起很多时改写 --lx-vvh，地址栏伸缩交给 dvh，避免滚动抖 ──
  function applyViewportHeight() {
    var root = document.documentElement;
    var vv = window.visualViewport;
    if (!isMobile() || !vv) { root.style.removeProperty("--lx-vvh"); return; }
    if (window.innerHeight - vv.height > 120) root.style.setProperty("--lx-vvh", Math.round(vv.height) + "px");
    else root.style.removeProperty("--lx-vvh");
  }

  // ── 手机上没有 hover：把 PC 的悬浮皮肤类摘掉，否则整块面板会被虚化 ────────
  // 必须先判存在再 remove：classList.remove 即使 token 不存在也会回写 class 属性，
  // 而回写会再次触发下面监听 class 的 MutationObserver —— 无条件 remove ＝ 微任务死循环，
  // 点商品卡时整个主线程会卡死（实测过）。
  function stripHoverSkin() {
    var bottom = $(".assistant-bottom");
    if (bottom && bottom.classList.contains("has-hover-prompts")) bottom.classList.remove("has-hover-prompts");
    var panel = $(".assistant-panel");
    if (panel && (panel.classList.contains("assistant-hover-active") || panel.classList.contains("assistant-glass-active"))) {
      panel.classList.remove("assistant-hover-active", "assistant-glass-active");
    }
  }

  // ── 手机上不回 lxfd 全屏：app-lxfd.js 的两个桥接函数按断点空转 ──────────
  function neuterFullscreenBridges() {
    var orig = window.__lxfdEnterFromSplit;
    if (typeof orig === "function" && !orig.__lxMobileGuarded) {
      var wrapped = function () {
        if (!isMobile()) return orig.apply(this, arguments);
        // PC 关掉最后一个标签是「回全屏并带入对话」；手机没有全屏态，
        // 改成退回频道货架 + 收起浮层，免得 peek 还挂着已关掉的旧标题
        var box = contentEl();
        if (box) box.setAttribute("data-view", "list");
        api.close();
      };
      wrapped.__lxMobileGuarded = true;
      window.__lxfdEnterFromSplit = wrapped;
    }
    var origNew = window.__lxfdNewFullscreen;
    if (typeof origNew === "function" && !origNew.__lxMobileGuarded) {
      var wrappedNew = function () {
        if (isMobile()) { document.body.dataset.state = "default"; return; }
        return origNew.apply(this, arguments);
      };
      wrappedNew.__lxMobileGuarded = true;
      window.__lxfdNewFullscreen = wrappedNew;
    }
  }

  // ── 手机上 lxfd 全屏态是死路（.lxfd 被藏），三道拦截 ─────────────────────
  // 1) 首页快捷问题/hero 输入走 window.lxfdSubmit → app-lxfd 的 setFullscreen(true)；
  //    手机改成直接走面板对话 __lxBridge.sendChat，对话留在 .assistant-panel 里
  function neuterLxfdSubmit() {
    var orig = window.lxfdSubmit;
    if (typeof orig !== "function" || orig.__lxMobileGuarded) return;
    var wrapped = function (text) {
      if (isMobile() && window.__lxBridge && typeof window.__lxBridge.sendChat === "function") {
        document.body.dataset.state = "chat";
        return window.__lxBridge.sendChat(text);
      }
      return orig.apply(this, arguments);
    };
    wrapped.__lxMobileGuarded = true;
    window.lxfdSubmit = wrapped;
  }
  // 2) 兜底：任何路径给 body 挂上全屏类，手机上立刻摘掉（app.js lxSetAutoFs 已有守卫，这里管 app-lxfd/内联脚本）
  var fsGuard = null;
  function guardFullscreenClass() {
    if (fsGuard) return;
    var strip = function () {
      if (!isMobile()) return;
      var b = document.body.classList;
      if (b.contains("assistant-fullscreen") || b.contains("lx-auto-fs")) {
        b.remove("assistant-fullscreen", "lx-auto-fs");
        document.documentElement.classList.remove("lx-root-lxfd-prepaint");
        if ($(".lx-p0-messages .lx-p0-message")) document.body.dataset.state = "chat";
        api.sync();
      }
    };
    fsGuard = new MutationObserver(strip);
    fsGuard.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    strip();
  }

  // ── 观察：视图切换 / 标签增删改 → 重算标题与 peek ───────────────────────
  var tabbarObserver = null;
  function observeTabbar() {
    var bar = $(".lx-tabbar");
    if (!bar || bar.__lxObserved) return;
    bar.__lxObserved = true;
    if (!tabbarObserver) tabbarObserver = new MutationObserver(syncSoon);
    tabbarObserver.observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  }

  function startObservers() {
    var box = contentEl();
    if (box) {
      new MutationObserver(function () { observeTabbar(); syncSoon(); })
        .observe(box, { childList: true, attributes: true, attributeFilter: ["data-view"] });
      observeTabbar();
    }
    // 只盯这两个真正会被加悬浮皮肤类的节点，不铺 subtree（面板内 class 变动极频繁）
    var hoverObserver = new MutationObserver(stripHoverSkin);
    var panel = $(".assistant-panel");
    if (panel) hoverObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
    var bottom = $(".assistant-bottom");
    if (bottom) hoverObserver.observe(bottom, { attributes: true, attributeFilter: ["class"] });
  }

  // ── 委托：关闭 / 展开 / peek 拉回 ──────────────────────────────────────
  document.addEventListener("click", function (event) {
    if (!isMobile() || !event.target.closest) return;
    if (event.target.closest("[data-sheet-close]")) { api.close(); return; }
    if (event.target.closest("[data-sheet-expand]")) { api.toggleFull(); return; }
    if (event.target.closest(".lx-sheet-peek")) { event.preventDefault(); api.open(); }
  });

  function boot() {
    document.documentElement.classList.toggle("lx-mobile", isMobile());
    neuterFullscreenBridges();
    neuterLxfdSubmit();
    applyViewportHeight();
    if (!isMobile()) return;
    guardFullscreenClass();
    stripHoverSkin();
    ensureDom();
    startObservers();
    api.sync();
  }

  if (MQ) {
    var onChange = function () {
      document.documentElement.classList.toggle("lx-mobile", isMobile());
      applyViewportHeight();
      if (!isMobile()) {
        document.body.classList.remove("lx-sheet-open", "lx-sheet-full", "lx-peek-on");
        clearDrag();
      } else {
        boot();
      }
    };
    if (MQ.addEventListener) MQ.addEventListener("change", onChange);
    else if (MQ.addListener) MQ.addListener(onChange);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportHeight);
    window.visualViewport.addEventListener("scroll", applyViewportHeight);
  }
  window.addEventListener("orientationchange", function () { setTimeout(applyViewportHeight, 200); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
