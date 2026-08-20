(function () {
  "use strict";

  var routes = {
    home: "index.html",
    personal: "shop-chat/index.html",
    business: "b-chat/index.html",
    enterprise: "biz-chat/index.html",
    brand: "brand/index.html"
  };
  var rootBase = new URL("../../", document.baseURI).href;
  var currentByPath = {
    "": "home",
    "index.html": "home",
    "shop-chat": "personal",
    "shop-chat/index.html": "personal",
    "b-chat": "business",
    "b-chat/index.html": "business",
    "biz-chat": "enterprise",
    "biz-chat/index.html": "enterprise",
    "brand": "brand",
    "brand/index.html": "brand"
  };
  var bridgePrefix = "leaip0-conversation:";
  var sharedKeys = [
    "lexiang.conversation.v1",
    "lexiang.lxfd.convs.v1",
    "lexiang.conversation.sourcePage.v1",
    "lexiang.recoPayloads.v1",
    "lexiang.cart.v1",
    "lexiang.orders.v1",
    "lexiang.compare.v1",
    "lexiang.coupons.v1"
  ];

  function restoreNavigationBridge() {
    if (typeof window.name !== "string" || window.name.indexOf(bridgePrefix) !== 0) return;
    try {
      var payload = JSON.parse(decodeURIComponent(window.name.slice(bridgePrefix.length)));
      sharedKeys.forEach(function (key) {
        if (typeof payload[key] === "string") localStorage.setItem(key, payload[key]);
      });
      window.name = "";
    } catch (_e) {}
  }

  function saveNavigationBridge() {
    try {
      var payload = {};
      sharedKeys.forEach(function (key) {
        var value = localStorage.getItem(key);
        if (value !== null) payload[key] = value;
      });
      window.name = bridgePrefix + encodeURIComponent(JSON.stringify(payload));
    } catch (_e) {}
  }

  function snapshotVisibleConversation() {
    try {
      var fullscreenNodes = Array.from(document.querySelectorAll(".lxfd-thread > .lxfd-msg-user, .lxfd-thread > .lxfd-msg-ai"));
      var splitNodes = Array.from(document.querySelectorAll(".chat-state .lx-p0-messages > .lx-p0-message"));
      var fullscreenActive = currentPage() === "home" &&
        (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs"));
      var splitHasConversation = splitNodes.some(function (node) {
        return node.classList.contains("user");
      });
      var fullscreenHasConversation = fullscreenNodes.some(function (node) {
        return node.classList.contains("lxfd-msg-user");
      });
      // 五个频道共用同一个智能体会话。子站/分屏页面中仍会保留一份隐藏的全屏 DOM，
      // 它可能只同步了首轮。不能因为这份旧 DOM 里“存在用户消息”就覆盖当前分屏的完整多轮。
      // 只有首页真正处于全屏对话态时才以全屏为准；其余情况分屏会话优先。
      var nodes = fullscreenActive && fullscreenHasConversation
        ? fullscreenNodes
        : (splitHasConversation ? splitNodes : fullscreenNodes);
      var messages = [];

      nodes.forEach(function (node) {
        var isFullscreenUser = node.classList.contains("lxfd-msg-user");
        var isSplitUser = node.classList.contains("user");
        var isUser = isFullscreenUser || isSplitUser;
        var isAi = node.classList.contains("lxfd-msg-ai") || node.classList.contains("ai") || node.classList.contains("assistant");
        if (!isUser && !isAi) return;

        if (isUser) {
          var userBubble = node.querySelector(".user-bubble");
          var userText = ((userBubble || node).textContent || "").trim();
          if (userText) messages.push({ role: "user", text: userText, html: "" });
          return;
        }

        var aiBody = node.querySelector(".lxfd-ai-body, .ai-body") || node;
        var aiText = (aiBody.textContent || "").trim();
        var aiHtml = aiBody.innerHTML || "";
        var hasVisiblePending = Array.from(aiBody.querySelectorAll(".lx-generating, .loading-line, .typing-text, .typing-cursor")).some(function (pending) {
          return !pending.hidden && pending.getAttribute("aria-hidden") !== "true";
        });
        var hasPlaceholderOnly = /联想乐享正在生成中|正在生成中/.test(aiText) && aiText.length < 40;
        if ((hasVisiblePending || hasPlaceholderOnly) && !aiText.replace(/联想乐享正在生成中|正在生成中/g, "").trim()) return;
        if (hasVisiblePending || hasPlaceholderOnly) aiHtml = "";
        if (aiText || aiHtml) messages.push({ role: "ai", text: aiText, html: aiHtml });
      });

      if (!messages.length) return;
      localStorage.setItem("lexiang.conversation.v1", JSON.stringify({
        convId: (window.__lxState && window.__lxState.convId) || null,
        messages: messages.slice(-50),
        ts: Date.now()
      }));
    } catch (_e) {}
  }

  restoreNavigationBridge();

  function currentPage() {
    if (window.__LX_TEMPLATE_PAGE && routes[window.__LX_TEMPLATE_PAGE]) return window.__LX_TEMPLATE_PAGE;
    try {
      var relativePath = decodeURIComponent(location.pathname).replace(decodeURIComponent(new URL(rootBase).pathname), "").replace(/^\/+|\/+$/g, "");
      return currentByPath[relativePath] || "home";
    } catch (_e) {
      return "home";
    }
  }

  function syncActiveState() {
    var page = currentPage();
    document.querySelectorAll(".main-nav [data-page], .lxfd-nav-sheet [data-page]").forEach(function (item) {
      var active = item.dataset.page === page;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function isFullscreenConversationActive() {
    return currentPage() === "home" &&
      (document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs"));
  }

  document.addEventListener("click", function (event) {
    if (!event.isTrusted) return;
    var item = event.target.closest && event.target.closest(".main-nav [data-page], .lxfd-nav-sheet [data-page], .brand, .lxfd-logo-pill");
    if (!item) return;
    var page = item.dataset.page || "home";
    if (!routes[page]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // 隐藏的 lxfd 线程不是当前会话源；让它持久化会把分屏的多轮快照回退成首轮。
    if (isFullscreenConversationActive()) {
      try { window.__lxfdPersistCurrentNow && window.__lxfdPersistCurrentNow(); } catch (_e) {}
    }
    try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (_e) {}
    snapshotVisibleConversation();
    saveNavigationBridge();
    location.assign(new URL(routes[page], rootBase).href);
  }, true);

  document.addEventListener("DOMContentLoaded", syncActiveState);
  window.setTimeout(syncActiveState, 0);
  new MutationObserver(function (_records, observer) {
    if (!document.querySelector(".main-nav [data-page], .lxfd-nav-sheet [data-page]")) return;
    syncActiveState();
    observer.disconnect();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

// ── P0 六件套自愈加载器 ────────────────────────────────────────────────
// index.html 多次被并行会话的旧 buffer 整写，静态 <script> 引用反复丢失
// （事故：fdfbd41e / 6d777ebc）。p0-root-nav.js 的引用在对方 buffer 里也
// 存在、始终存活，因此由它在运行时兜底注入六件套：静态标签在则跳过（幂等），
// 不在则动态补挂。根治静态引用被覆盖抹除这一整类问题。
(function () {
  var V = "0.14.66-p0-merge";
  var MODS = ["p0-product-detail", "p0-order-flow", "p0-member-svc", "p0-store", "p0-solution", "p0-shell"];
  function base() {
    var nav = document.querySelector('script[src*="p0-root-nav.js"]');
    var src = nav ? nav.getAttribute("src") : "../frontend/js/core/p0-root-nav.js";
    return src.replace(/js\/core\/p0-root-nav\.js.*$/, "");
  }
  function inject() {
    var b = base();
    MODS.forEach(function (m) {
      if (!document.querySelector('link[href*="' + m + '.css"]')) {
        var l = document.createElement("link");
        l.rel = "stylesheet"; l.href = b + "css/core/" + m + ".css?v=" + V;
        document.head.appendChild(l);
      }
      if (!document.querySelector('script[src*="' + m + '.js"]')) {
        var s = document.createElement("script");
        s.src = b + "js/core/" + m + ".js?v=" + V; s.async = false;
        document.head.appendChild(s);
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();
