/* ══════════════════════════════════════════════════════════════
   Split Layout — PC 端左右分屏 controller
   职责：
   1. 启动时把 #landingPage / #splitDivider / #chatApp 包进 #splitRoot
   2. 拖拽 splitter 改大小，localStorage 持久化
   3. "⇄ 换位" 按钮切换左右顺序
   4. 拦截 startChat() / openChatFresh() / goHome()：PC 分屏下不再全屏切换
   5. 监听 chat SSE event:nav，滚动 / 高亮左侧对应 section
   6. 移动端 (max-width:768px) 完全不启用，保持原 is-chat 切换
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MQ = window.matchMedia('(min-width: 769px)');
  var STORE_KEY = 'lexiang.splitLayout.v1';
  var DEFAULT_LEFT_PCT = 55;
  var MIN_LEFT_PCT = 28;
  var MAX_LEFT_PCT = 78;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return {
        leftPct: clamp(s.leftPct || DEFAULT_LEFT_PCT, MIN_LEFT_PCT, MAX_LEFT_PCT),
        swapped: !!s.swapped
      };
    } catch (e) { return null; }
  }
  function saveState(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  var state = loadState() || { leftPct: DEFAULT_LEFT_PCT, swapped: false };

  function isPC() { return MQ.matches; }

  function applySplitMode() {
    if (isPC()) {
      document.documentElement.classList.add('split-mode');
      if (state.swapped) document.documentElement.classList.add('layout-swapped');
      else document.documentElement.classList.remove('layout-swapped');
      applyWidths();
      // 不主动 add chat-revealed —— 由 revealChat() 触发
    } else {
      document.documentElement.classList.remove('split-mode', 'layout-swapped', 'chat-revealed');
      var lp = document.getElementById('landingPage');
      var ca = document.getElementById('chatApp');
      if (lp) lp.style.width = '';
      if (ca) ca.style.width = '';
    }
  }

  function revealChat() {
    if (!isPC()) return;
    var html = document.documentElement;
    if (html.classList.contains('chat-revealed')) return;
    html.classList.add('chat-revealed');
    document.getElementById('chatApp').classList.add('active');
    applyWidths();
    // 输入框聚焦（让用户感知右侧已就绪）
    setTimeout(function () {
      var ta = document.getElementById('mainTa');
      if (ta) try { ta.focus(); } catch (e) {}
    }, 200);
  }
  function hideChat() {
    if (!isPC()) return;
    document.documentElement.classList.remove('chat-revealed');
  }
  window.__revealChat = revealChat;
  window.__hideChat = hideChat;

  function applyWidths() {
    if (!isPC()) return;
    var lp = document.getElementById('landingPage');
    var ca = document.getElementById('chatApp');
    if (!lp || !ca) return;
    // landing 用 calc 锁定，chat 用 flex 占剩余空间，避免百分比加起来溢出
    lp.style.flex = '0 0 auto';
    lp.style.width = 'calc(' + state.leftPct + '% - 3px)';
    ca.style.flex = '1 1 0';
    ca.style.width = '0';
    ca.style.minWidth = '0';
    var lpW = lp.getBoundingClientRect().width;
    if (lpW < 520) lp.dataset.narrow = '2';
    else if (lpW < 760) lp.dataset.narrow = '1';
    else lp.removeAttribute('data-narrow');
    // 同步 --split-left-w，供 #mallDetail 在 split 模式下只覆盖左侧
    document.documentElement.style.setProperty('--split-left-w', 'calc(' + state.leftPct + '% - 3px)');
  }

  // ── 1. 包装 DOM：landing + splitter + chat → splitRoot ──
  function wrapDom() {
    if (document.getElementById('splitRoot')) return;
    var lp = document.getElementById('landingPage');
    var ca = document.getElementById('chatApp');
    if (!lp || !ca) return;

    var root = document.createElement('div');
    root.id = 'splitRoot';

    var divider = document.createElement('div');
    divider.id = 'splitDivider';
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.innerHTML = '<div class="grip"></div>';

    // 把 lp 和 ca 移进 root
    lp.parentNode.insertBefore(root, lp);
    root.appendChild(lp);
    root.appendChild(divider);
    root.appendChild(ca);

    // 控制条（换位按钮）——已预置在 chat-topbar 内，直接注入内容
    var controls = document.getElementById('splitControls');
    if (controls) {
      controls.innerHTML =
        '<button type="button" id="btnSwapPanes" title="左右换位">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
          '<span>换位</span>' +
        '</button>' +
        '<button type="button" id="btnNewConv" title="新建对话">新建</button>';
    }

    // 拖拽
    bindDrag(divider);
    document.getElementById('btnSwapPanes').addEventListener('click', toggleSwap);
    document.getElementById('btnNewConv').addEventListener('click', function () {
      if (typeof openChatFresh === 'function') openChatFresh();
    });
  }

  function bindDrag(divider) {
    var startX = 0, startPct = 0, viewportW = 0;
    function onDown(e) {
      if (!isPC()) return;
      e.preventDefault();
      var pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX;
      startPct = state.leftPct;
      viewportW = window.innerWidth;
      divider.classList.add('dragging');
      document.documentElement.classList.add('split-dragging');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    }
    function onMove(e) {
      var pt = e.touches ? e.touches[0] : e;
      var dx = pt.clientX - startX;
      var deltaPct = (dx / viewportW) * 100;
      // swapped 时，landing 在右侧，向右拖应该缩小 landing；翻转 delta
      var pct = state.swapped ? startPct - deltaPct : startPct + deltaPct;
      state.leftPct = clamp(pct, MIN_LEFT_PCT, MAX_LEFT_PCT);
      applyWidths();
      e.preventDefault();
    }
    function onUp() {
      divider.classList.remove('dragging');
      document.documentElement.classList.remove('split-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      saveState(state);
    }
    divider.addEventListener('mousedown', onDown);
    divider.addEventListener('touchstart', onDown, { passive: false });
    // 双击重置
    divider.addEventListener('dblclick', resetSplit);
  }

  function toggleSwap() {
    state.swapped = !state.swapped;
    saveState(state);
    applySplitMode();
    applyWidths();
  }
  function resetSplit() {
    state.leftPct = DEFAULT_LEFT_PCT;
    state.swapped = false;
    saveState(state);
    applySplitMode();
    applyWidths();
  }

  // ── 2. 拦截 fullscreen 切换（PC 分屏下不再隐藏 landing） ──
  function patchNavigationFns() {
    // showChatApp/openChatFresh/goHome 在 PC 分屏下退化为：仅准备聊天态，不改 landing 可见性
    var origShow = window.showChatApp;
    var origGo = window.goHome;
    var origOpen = window.openChatFresh;

    if (typeof origShow === 'function') {
      window.showChatApp = function (pushUrl) {
        if (isPC()) {
          document.documentElement.classList.add('is-chat');
          revealChat();
          if (pushUrl !== false && typeof convId !== 'undefined') {
            try {
              var base = location.pathname.startsWith('/shop-chat') ? '/shop-chat' : '/chat';
              var url = (typeof convId !== 'undefined' && convId) ? base + '/' + convId : base;
              history.replaceState(null, '', url);
            } catch (e) {}
          }
          return;
        }
        return origShow.apply(this, arguments);
      };
    }
    if (typeof origGo === 'function') {
      window.goHome = function () {
        if (isPC()) {
          // 分屏下"返回首页" = 滚动 landing 到顶 + 隐藏右侧 chat
          var lp = document.getElementById('landingPage');
          if (lp) lp.scrollTo({ top: 0, behavior: 'smooth' });
          hideChat();
          return;
        }
        return origGo.apply(this, arguments);
      };
    }
  }

  // ── 3. 监听 chat SSE event:nav，滚动 landing ──
  // 通过 patch fetch 拦截 /api/chat/stream 响应，重新解析 SSE 文本流
  // 简单做法：暴露 window.__handleNavTarget，由 index.html SSE 解析处调用
  var SECTION_MAP = {
    home:        function () { return document.querySelector('#landingPage .hero'); },
    top:         function () { return document.querySelector('#landingPage .hero'); },
    hero:        function () { return document.querySelector('#landingPage .hero'); },
    featured:    function () { return getSec(0); },
    news_dynamic:function () { return getSec(0); },
    bestsellers: function () { return getSec(1); },
    products:    function () { return getSec(1); },
    solutions:   function () { return getSec(2); },
    news:        function () { return getSec(3); },
    cases:       function () { return getSec(4); },
    cta:         function () { return getSec(5); },
    contact:     function () { return getSec(5); }
  };
  function getSec(idx) {
    var list = document.querySelectorAll('#landingPage .sec');
    return list[idx] || null;
  }
  function navigateLeft(target) {
    if (!target) return;
    var key = String(target).toLowerCase().trim();
    var fn = SECTION_MAP[key];
    var el = fn ? fn() : null;
    if (!el) {
      // 容错：尝试模糊匹配
      var keys = Object.keys(SECTION_MAP);
      for (var i = 0; i < keys.length; i++) {
        if (key.indexOf(keys[i]) >= 0) { el = SECTION_MAP[keys[i]](); break; }
      }
    }
    if (!el) return;
    var lp = document.getElementById('landingPage');
    if (isPC() && lp) {
      var top = el.offsetTop - 24;
      lp.scrollTo({ top: top, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    el.classList.remove('nav-flash');
    void el.offsetWidth; // reflow
    el.classList.add('nav-flash');
  }
  window.__navigateLandingTo = navigateLeft;

  // ── 3b. 左侧 preview overlay：分屏模式下点 chat 链接，URL 加载到左侧 ──
  function ensureLeftPreviewPanel() {
    var lp = document.getElementById('landingPage');
    if (!lp) return null;
    var panel = document.getElementById('leftPreviewPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'leftPreviewPanel';
    panel.innerHTML =
      '<div class="lpp-bar">' +
        '<button type="button" class="lpp-back" id="lppBack">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
          '<span>返回首页</span>' +
        '</button>' +
        '<span class="lpp-url" id="lppUrl"></span>' +
        '<a class="lpp-ext" id="lppExt" target="_blank" rel="noopener">↗ 新标签</a>' +
      '</div>' +
      '<iframe id="lppIframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>' +
      '<div class="lpp-fallback" id="lppFallback" style="display:none">' +
        '<div style="font-size:48px;opacity:.4">🔗</div>' +
        '<div>此链接无法在内嵌窗口预览（跨域限制）</div>' +
        '<a id="lppFallbackLink" target="_blank" rel="noopener" style="color:var(--accent,#2077FF);font-size:13px">在新标签页打开 ↗</a>' +
      '</div>';
    lp.appendChild(panel);
    panel.querySelector('#lppBack').addEventListener('click', closeLeftPreview);
    return panel;
  }
  function openLeftPreview(url) {
    if (!isPC()) return false;
    var panel = ensureLeftPreviewPanel();
    if (!panel) return false;
    var iframe = panel.querySelector('#lppIframe');
    var fb = panel.querySelector('#lppFallback');
    var ext = panel.querySelector('#lppExt');
    var urlSpan = panel.querySelector('#lppUrl');
    var fbLink = panel.querySelector('#lppFallbackLink');
    fb.style.display = 'none';
    iframe.style.display = 'block';
    urlSpan.textContent = url;
    ext.href = url;
    fbLink.href = url;
    var proxyUrl = '/api/preview?url=' + encodeURIComponent(url);
    iframe.src = proxyUrl;
    panel.classList.add('open');
    iframe.onerror = function () {
      iframe.style.display = 'none';
      fb.style.display = 'flex';
    };
    return true;
  }
  function closeLeftPreview() {
    var panel = document.getElementById('leftPreviewPanel');
    if (!panel) return;
    panel.classList.remove('open');
    var iframe = panel.querySelector('#lppIframe');
    if (iframe) setTimeout(function () { iframe.src = 'about:blank'; }, 300);
  }
  window.__openLeftPreview = openLeftPreview;
  window.__closeLeftPreview = closeLeftPreview;

  // 拦截原 openPreview：分屏下走左侧，否则保留原行为
  function patchPreviewFn() {
    var orig = window.openPreview;
    window.openPreview = function (url) {
      if (isPC() && openLeftPreview(url)) return;
      if (typeof orig === 'function') return orig.apply(this, arguments);
      window.open(url, '_blank');
    };
  }

  // ── 4. resize 适配 ──
  function onResize() {
    applySplitMode();
    applyWidths();
  }
  if (MQ.addEventListener) MQ.addEventListener('change', onResize);
  else if (MQ.addListener) MQ.addListener(onResize);
  window.addEventListener('resize', applyWidths);

  // ── 5. 初始化 ──
  function init() {
    wrapDom();
    applySplitMode();
    patchNavigationFns();
    patchPreviewFn();
    patchChatTriggers();
    // 直接 /chat URL 进入：自动 reveal
    if (isPC() && (location.pathname.startsWith('/chat') || location.pathname.startsWith('/shop-chat'))) {
      document.documentElement.classList.add('is-chat');
      revealChat();
    }
  }

  // 拦 hero / quickAsk / startChat / findNearbyStores / openChatFresh 触发 reveal
  function patchChatTriggers() {
    function wrap(name) {
      var orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () {
        if (isPC()) revealChat();
        return orig.apply(this, arguments);
      };
    }
    ['startChat','quickAsk','openChatFresh','findNearbyStores','sendFromHero','triggerHongbao'].forEach(wrap);
    // hero 主搜索框 send 按钮（#heroSend）也走 revealChat
    var heroSend = document.getElementById('heroSend');
    if (heroSend) heroSend.addEventListener('click', function () { if (isPC()) revealChat(); }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
