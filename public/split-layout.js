/* split-layout.js — PC 端分屏布局控制器 v2 */
(function () {
  'use strict';

  var MQ = window.matchMedia('(min-width: 769px)');
  var CHAT_PREFIXES = ['/chat', '/shop-chat', '/b-chat', '/biz-chat'];
  var STORE_KEY = 'lexiang.splitV4'; // v4: 默认 29(chat):71(landing) 即 1:2.5; 旧版失效
  var DEFAULT_LEFT_PCT = 29; // chat 占 ~1/3.5, landing 占 ~2.5/3.5 (1:2.5 分屏比)
  var MIN_LEFT_PCT = 20;
  var MAX_LEFT_PCT = 80;

  function isPC() { return MQ.matches; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function isChatPath(p) { p = p || location.pathname; return CHAT_PREFIXES.some(function (x) { return p.startsWith(x); }); }
  function chatBase() { var p = location.pathname; for (var i = 0; i < CHAT_PREFIXES.length; i++) { if (p.startsWith(CHAT_PREFIXES[i])) return CHAT_PREFIXES[i]; } return window.__chatBase || '/chat'; }

  // ── 状态持久化 ──
  var state = { leftPct: DEFAULT_LEFT_PCT, swapped: false };
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      state.leftPct = clamp(s.leftPct || DEFAULT_LEFT_PCT, MIN_LEFT_PCT, MAX_LEFT_PCT);
      // swapped 只在用户显式点击换位后才 true，不从旧存储恢复
      if (s.v2Layout) state.swapped = !!s.swapped;
    } catch (e) {}
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ leftPct: state.leftPct, swapped: state.swapped, v2Layout: true })); } catch (e) {}
  }

  // ── Tab 管理 ──
  var tabs = [];
  var activeTabId = null;
  var tabCounter = 0;
  var workspaceContext = null;
  var landingMarker = null;
  var ICON_MAXIMIZE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M21 21l-7-7"/></svg>';
  var ICON_RESTORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4v6H4"/><path d="M4 10l6-6"/><path d="M14 20v-6h6"/><path d="M20 14l-6 6"/></svg>';

  function compactProduct(p) {
    if (!p) return null;
    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description
    };
  }

  function compactProducts(products) {
    return (products || []).slice(0, 8).map(compactProduct).filter(Boolean);
  }

  function getActiveTab() {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === activeTabId) return tabs[i];
    }
    return null;
  }

  function setWorkspaceContext(ctx) {
    workspaceContext = ctx || null;
    window.__workspaceContext = workspaceContext;
  }

  function updateWorkspaceContextFromTab(tab) {
    if (!tab) { setWorkspaceContext(null); return; }
    var data = tab.data || {};
    if (data.context) {
      setWorkspaceContext(data.context);
      return;
    }
    if (tab.type === 'products') {
      setWorkspaceContext({
        type: 'products',
        title: tab.title,
        category: data.category || tab.title,
        products: compactProducts(data.products || [])
      });
    } else if (tab.type === 'productDetail' && data.product) {
      setWorkspaceContext({ type: 'product', title: tab.title, product: compactProduct(data.product) });
    } else if (tab.type === 'compare') {
      setWorkspaceContext({ type: 'compare', title: tab.title, products: compactProducts(data.products || []) });
    } else if (tab.type === 'preview') {
      setWorkspaceContext({ type: 'preview', title: tab.title, url: data.url || '' });
    } else {
      setWorkspaceContext({ type: tab.type, title: tab.title });
    }
  }

  function getWorkspaceContext() {
    return workspaceContext;
  }

  function rememberLandingHome() {
    var lp = document.getElementById('landingPage');
    if (!lp || landingMarker) return;
    landingMarker = document.createComment('landingPage-home-anchor');
    lp.parentNode.insertBefore(landingMarker, lp.nextSibling);
  }

  function restoreLandingHome() {
    var lp = document.getElementById('landingPage');
    if (!lp || !landingMarker || !landingMarker.parentNode) return;
    if (lp.parentNode !== landingMarker.parentNode || lp.nextSibling !== landingMarker) {
      landingMarker.parentNode.insertBefore(lp, landingMarker);
    }
  }

  function getHomeTitle() {
    var active = document.querySelector('.nlinks a.nav-active');
    var label = active && active.textContent ? active.textContent.trim() : '';
    if (label) return label;
    var map = { shop: '个人及家庭', b: '中小企业', biz: '政教及大企业', default: '首页' };
    return map[window.__siteType || 'default'] || '首页';
  }

  function ensureHomeTab() {
    if (findReusableTab('home')) return;
    openContent('home', getHomeTitle(), { fixed: true }, true);
  }

  function renameTab(tabId, title) {
    if (!title) return;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id !== tabId) continue;
      tabs[i].title = title;
      if (tabs[i].el) {
        var btn = tabs[i].el.querySelector('.cp-tab');
        if (btn) btn.textContent = title;
      }
      updateWorkspaceContextFromTab(tabs[i]);
      return;
    }
  }

  function clearWorkspaceContext() {
    setWorkspaceContext(null);
    window.__currentProduct = null;
    window.__pendingProductCtx = null;
    window.__currentProductChips = null;
    window.__currentProductQuery = null;
    var ov = document.getElementById('productOverlay');
    if (ov) ov.classList.add('hiding');
    var bar = document.getElementById('productChipsBar');
    if (bar) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
    }
  }

  function normalizeUrl(url) {
    url = String(url || '').trim();
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http://') === 0) return url.replace(/^http:\/\//, 'https://');
    return url;
  }

  function resolvePreviewUrl(url) {
    url = normalizeUrl(url);
    return fetch('/api/resolve-link?url=' + encodeURIComponent(url))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return data && data.url ? normalizeUrl(data.url) : url; })
      .catch(function () { return url; });
  }

  function findReusableTab(type, data, title) {
    data = data || {};
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var td = t.data || {};
      if (t.type !== type) continue;
      if (type === 'home') return t;
      if (type === 'productDetail' && data.sku && td.sku === data.sku) return t;
      if (type === 'products') { if (data.category) { if (td.category === data.category) return t; } else if (title && t.title === title) return t; continue; }
      if (type === 'preview' && data.url && td.url === data.url) return t;
      // info tab: 按 title 严格区分(权益管家·A vs 权益管家·B / 联想服务 / 订单确认 各自独立 tab)
      if (type === 'info') { if (title && t.title === title) return t; else continue; }
      // 服务中心类 tab：同 type 即复用（避免点会员/定制/优惠/换新等出多个同名 tab）
      if (type === 'member' || type === 'customize' || type === 'coupon' || type === 'tradein' || type === 'stores' || type === 'solutions' || type === 'compare') return t;
    }
    return null;
  }

  // ── 核心状态机 ──

  function getState() {
    var html = document.documentElement;
    if (html.classList.contains('in-chat') && html.classList.contains('content-open')) return 3;
    if (html.classList.contains('in-chat')) return 2;
    return 1;
  }

  // nav 提取到 body 顶层（状态2b/3共用，不被 landingPage display:none 影响）
  function extractNav() {
    var lp = document.getElementById('landingPage');
    if (!lp) return;
    var nav = lp.querySelector(':scope > nav');
    if (!nav || nav.parentNode === document.body) return;
    nav.id = 'mainNav';
    document.body.insertBefore(nav, document.body.firstChild);
  }
  function restoreNav() {
    var nav = document.getElementById('mainNav');
    var lp = document.getElementById('landingPage');
    if (!nav || !lp) return;
    lp.insertBefore(nav, lp.firstChild);
    nav.removeAttribute('id');
  }

  // 关闭右侧landing面板 → 纯全宽聊天
  function collapseLanding() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.add('landing-collapsed');
    html.style.removeProperty('--split-left');
  }
  // 恢复分屏
  function expandLanding() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.remove('landing-collapsed');
    html.style.setProperty('--split-left', state.leftPct + '%');
  }
  window.__collapseLanding = collapseLanding;
  window.__expandLanding = expandLanding;

  // 给 landing 面板加关闭按钮
  function ensureLandingCloseBtn() {
    if (document.getElementById('closeLandingBtn')) return;
    var lp = document.getElementById('landingPage');
    if (!lp) return;
    var btn = document.createElement('button');
    btn.id = 'closeLandingBtn';
    btn.className = 'split-panel-float-btn';
    btn.title = '收起右侧面板';
    btn.setAttribute('aria-label', '收起右侧面板');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/></svg>';
    btn.addEventListener('click', collapseLanding);
    document.body.appendChild(btn);
  }

  // 状态1→2a：全屏 chat（不分屏，landing 隐藏，chat 居中 max 900）
  function enterChat() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.add('in-chat', 'is-chat');
    extractNav();
    document.getElementById('chatApp').classList.add('active');
    try {
      var base = chatBase();
      var cid = (typeof convId !== 'undefined' && convId) ? convId : null;
      var url = cid ? base + '/' + cid : base;
      history.replaceState(null, '', url);
    } catch (e) {}
    setTimeout(function () {
      var ta = document.getElementById('mainTa');
      if (ta) try { ta.focus(); } catch (e) {}
    }, 200);
  }

  // 状态2a→2b：升级真分屏（AI 触发 tab 时调用）
  function enterSplit() {
    if (!isPC()) return;
    var html = document.documentElement;
    if (!html.classList.contains('in-chat')) enterChat();
    if (html.classList.contains('split-mode')) return;
    html.classList.add('split-mode');
    html.style.setProperty('--split-left', state.leftPct + '%');
    ensureLandingCloseBtn();
  }

  // 添加 Tab → 升级分屏（必加 split-mode，让左侧 chat / 右侧 tab 同时可见）
  function openContent(type, title, data, skipHome) {
    if (!isPC()) return null;
    var html = document.documentElement;
    if (!html.classList.contains('in-chat')) enterChat();
    if (!html.classList.contains('split-mode')) enterSplit();
    if (!skipHome && type !== 'home') ensureHomeTab();

    var reusable = findReusableTab(type, data, title);
    if (reusable) {
      ensureContentPanelOpen();
      switchTab(reusable.id);
      return reusable.id;
    }

    var id = 'tab-' + (++tabCounter);
    var tab = { id: id, type: type, title: title || '内容', data: data || {}, el: null, contentEl: null };
    if (tabs.length >= 5) {
      var removeAt = 0;
      for (var ri = 0; ri < tabs.length; ri++) {
        if (tabs[ri].type !== 'home') { removeAt = ri; break; }
      }
      var old = tabs.splice(removeAt, 1)[0];
      if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
      if (old.contentEl && old.contentEl.parentNode) old.contentEl.parentNode.removeChild(old.contentEl);
    }
    if (type === 'home') tabs.unshift(tab);
    else tabs.push(tab);

    var tabsContainer = document.getElementById('cpTabs');
    var bodyContainer = document.getElementById('cpBody');
    if (!tabsContainer || !bodyContainer) return null;

    // tab 按钮
    var wrap = document.createElement('div');
    wrap.className = 'cp-tab-wrap';
    if (type === 'home') wrap.classList.add('home');
    wrap.setAttribute('data-tab-id', id);
    var btn = document.createElement('button');
    btn.className = 'cp-tab';
    btn.textContent = tab.title;
    btn.setAttribute('data-tab-id', id);
    btn.addEventListener('click', function () { switchTab(id); });
    var x = document.createElement('button');
    x.className = 'cp-tab-x';
    x.type = 'button';
    x.title = '关闭标签';
    x.setAttribute('aria-label', '关闭标签');
    x.textContent = '×';
    x.addEventListener('click', function (e) {
      e.stopPropagation();
      closeTab(id);
    });
    wrap.appendChild(btn);
    if (type !== 'home') wrap.appendChild(x);
    if (type === 'home' && tabsContainer.firstChild) tabsContainer.insertBefore(wrap, tabsContainer.firstChild);
    else tabsContainer.appendChild(wrap);
    tab.el = wrap;

    // S7 tab 拖拽换序（home tab 不可拖）
    if (type !== 'home') {
      wrap.draggable = true;
      wrap.addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        wrap.classList.add('cp-tab-dragging');
      });
      wrap.addEventListener('dragend', function () { wrap.classList.remove('cp-tab-dragging'); });
      wrap.addEventListener('dragover', function (e) {
        var srcId = (e.dataTransfer && (e.dataTransfer.types || [])).indexOf && (e.dataTransfer.types || []).indexOf('text/plain') >= 0;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        wrap.classList.add('cp-tab-dropover');
      });
      wrap.addEventListener('dragleave', function () { wrap.classList.remove('cp-tab-dropover'); });
      wrap.addEventListener('drop', function (e) {
        e.preventDefault();
        wrap.classList.remove('cp-tab-dropover');
        var srcId = e.dataTransfer.getData('text/plain');
        if (!srcId || srcId === id) return;
        var srcIdx = -1, tgtIdx = -1;
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].id === srcId) srcIdx = i;
          if (tabs[i].id === id) tgtIdx = i;
        }
        if (srcIdx < 0 || tgtIdx < 0) return;
        if (tabs[srcIdx].type === 'home' || tabs[tgtIdx].type === 'home') return;
        var moved = tabs.splice(srcIdx, 1)[0];
        tabs.splice(tgtIdx, 0, moved);
        // 重排 DOM
        var afterEl = (srcIdx < tgtIdx) ? wrap.nextSibling : wrap;
        if (moved.el) tabsContainer.insertBefore(moved.el, afterEl);
      });
    }

    // tab 内容
    var contentDiv = document.createElement('div');
    contentDiv.className = 'cp-tab-content';
    contentDiv.setAttribute('data-tab-id', id);
    contentDiv.style.display = 'none';
    bodyContainer.appendChild(contentDiv);
    tab.contentEl = contentDiv;

    // 渲染
    var renderer = RENDERERS[type];
    if (renderer) renderer(contentDiv, data);

    switchTab(id);
    ensureContentPanelOpen();
    return id;
  }

  function ensureContentPanelOpen() {
    var html = document.documentElement;
    html.classList.remove('landing-collapsed', 'content-closing');
    var wasOpen = html.classList.contains('content-open');
    if (!wasOpen) html.classList.add('content-open');
    var cp = document.getElementById('contentPanel');
    // 仅首次打开才重播滑入动画; 切换已开面板时不重播(避免闪一下)
    if (cp && !wasOpen) {
      cp.style.animation = 'none';
      void cp.offsetWidth;
      cp.style.animation = '';
    }
    applyWidths();
    setTimeout(function () {
      var ta = document.getElementById('mainTa');
      if (ta) try { ta.focus(); } catch (e) {}
    }, 40);
  }

  function updateContentMaxButton() {
    var btn = document.getElementById('cpMax');
    if (!btn) return;
    var maximized = document.documentElement.classList.contains('content-maximized');
    btn.classList.toggle('active', maximized);
    btn.title = maximized ? '还原分屏' : '放大浏览区';
    btn.setAttribute('aria-label', maximized ? '还原分屏' : '放大浏览区');
    btn.innerHTML = maximized ? ICON_RESTORE : ICON_MAXIMIZE;
  }

  function toggleContentMaximized() {
    if (!isPC()) return;
    var html = document.documentElement;
    if (!html.classList.contains('content-open')) return;
    html.classList.toggle('content-maximized');
    updateContentMaxButton();
    applyWidths();
  }

  // 状态3→2
  function closeContent() {
    if (!isPC()) return;
    var html = document.documentElement;
    if (!html.classList.contains('content-open')) return;
    html.classList.add('content-closing');
    html.classList.remove('content-open', 'content-maximized');
    restoreLandingHome();
    // 清除 applyWidths() 设置的内联样式，恢复 CSS 控制
    var ca = document.getElementById('chatApp');
    if (ca) {
      ca.style.flex = '';
      ca.style.width = '';
      ca.style.maxWidth = '';
      ca.style.margin = '';
    }
    var tabsContainer = document.getElementById('cpTabs');
    var bodyContainer = document.getElementById('cpBody');
    if (tabsContainer) tabsContainer.innerHTML = '';
    if (bodyContainer) bodyContainer.innerHTML = '';
    tabs = [];
    activeTabId = null;
    clearWorkspaceContext();
    setTimeout(function () {
      html.classList.remove('content-closing');
    }, 220);
  }

  // 任何→状态1
  function goHomePC() {
    if (!isPC()) return;
    restoreNav();
    var html = document.documentElement;
    html.classList.remove('in-chat', 'content-open', 'content-closing', 'content-maximized', 'landing-collapsed', 'is-chat', 'is-chat-conv');
    restoreLandingHome();
    window.__siteType = 'default';
    window.__chatBase = '/chat';
    html.dataset.site = 'default';
    var ca = document.getElementById('chatApp');
    ca.classList.remove('active');
    ca.style.flex = '';
    ca.style.width = '';
    ca.style.maxWidth = '';
    ca.style.margin = '';
    var tabsContainer = document.getElementById('cpTabs');
    var bodyContainer = document.getElementById('cpBody');
    if (tabsContainer) tabsContainer.innerHTML = '';
    if (bodyContainer) bodyContainer.innerHTML = '';
    tabs = [];
    activeTabId = null;
    clearWorkspaceContext();
    document.getElementById('landingPage').classList.remove('exit');
    history.pushState(null, '', '/');
    try { closeSidebar(); } catch (e) {}
    try { setNavActive(null); } catch (e) {}
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var isActive = t.id === tabId;
      if (t.el) {
        if (isActive) t.el.classList.add('active');
        else t.el.classList.remove('active');
      }
      if (t.contentEl) t.contentEl.style.display = isActive ? '' : 'none';
    }
    updateWorkspaceContextFromTab(getActiveTab());
    fireTabsChanged();
    setTimeout(function () {
      var ta = document.getElementById('mainTa');
      if (ta) try { ta.focus(); } catch (e) {}
    }, 30);
  }

  // 通知前端: 网页标签竖轴(timeline) 用 — 当前打开的 tab 列表 + 激活 id
  function fireTabsChanged() {
    if (typeof window.__lxOnTabsChanged !== 'function') return;
    try {
      var list = tabs.map(function (t) { return { id: t.id, type: t.type, title: t.title, data: t.data }; });
      window.__lxOnTabsChanged(list, activeTabId);
    } catch (e) {}
  }

  function closeTab(tabId) {
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === tabId) { idx = i; break; }
    }
    if (idx < 0) return;
    var tab = tabs[idx];
    if (tab.type === 'home') {
      switchTab(tab.id);
      return;
    }
    var wasActive = tab.id === activeTabId;
    if (tab.el && tab.el.parentNode) tab.el.parentNode.removeChild(tab.el);
    if (tab.contentEl && tab.contentEl.parentNode) tab.contentEl.parentNode.removeChild(tab.contentEl);
    tabs.splice(idx, 1);
    if (!tabs.length) {
      closeContent();
      return;
    }
    if (wasActive) {
      var next = tabs[Math.min(idx, tabs.length - 1)];
      switchTab(next.id);
    }
  }

  // ── 全局 API ──
  window.__enterChat = enterChat;
  window.__enterSplit = enterSplit;
  window.__openContent = openContent;
  window.__switchContentTab = function(id){ for (var i=0;i<tabs.length;i++){ if (tabs[i].id===id){ switchTab(id); ensureContentPanelOpen(); return true; } } return false; };
  window.__closeContent = closeContent;
  window.__closeWorkspaceTab = closeTab;
  window.__getWorkspaceContext = getWorkspaceContext;
  window.__toggleContentMaximized = toggleContentMaximized;
  window.__goHome = goHomePC;
  window.__switchTab = switchTab;
  // 向后兼容旧 API（index.html 中有引用）
  window.__revealChat = enterChat;
  window.__hideChat = function () { /* 新架构中由 goHome 替代 */ };

  // ── Tab 渲染器 ──
  var RENDERERS = {};

  RENDERERS.home = function (container) {
    rememberLandingHome();
    container.classList.add('cp-home-content');
    container.innerHTML = '';
    var lp = document.getElementById('landingPage');
    if (!lp) {
      container.innerHTML = '<div class="cp-empty">首页暂时不可用</div>';
      return;
    }
    try {
      var dc = document.getElementById('displayCanvas');
      if (dc) dc.style.display = 'none';
      lp.classList.remove('exit', 'dc-open');
      lp.style.overflow = '';
      lp.style.height = '';
    } catch (e) {}
    container.appendChild(lp);
  };

  RENDERERS.products = function (container, data) {
    data = data || {};
    if (data.fetchCategory && data.category) {
      container.innerHTML = '<div class="cpd-loading"><div class="cpd-spinner"></div>加载中...</div>';
      fetch('/api/products?category=' + encodeURIComponent(data.category) + '&limit=20')
        .then(function (r) { return r.json(); })
        .then(function (products) {
          data.products = products || [];
          renderProducts(container, data.products);
          updateWorkspaceContextFromTab(getActiveTab());
        })
        .catch(function () {
          container.innerHTML = '<div class="cp-empty">加载失败，请稍后再试</div>';
        });
      return;
    }
    renderProducts(container, data.products || []);
  };

  function renderProducts(container, products) {
    products = products || [];
    container.innerHTML = '';
    if (!products.length) {
      container.innerHTML = '<div class="cp-empty">暂时没有找到相关商品</div>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'cp-products';
    products.forEach(function (p) {
      var img = (p.image_url || '').replace(/^http:/, 'https:');
      var name = p.name || '';
      var price = p.price || '';
      var desc = p.description || '';
      var sku = p.sku || '';
      var prodKey = sku || String(p.id || '');
      var url = normalizeUrl(p.url || p.pcDetailUrl || (sku ? 'https://item.lenovo.com.cn/product/' + sku + '.html' : '#'));
      var inCmp = window._compareList && window._compareList.some(function(x){ return x.key === prodKey; });

      var card = document.createElement('div');
      card.className = 'cp-product-card';
      card.dataset.product = prodKey;
      card.dataset.name = name;
      card.dataset.img = img;
      card.dataset.price = String(price || '');
      // S6 商品卡去掉 PK / 解读 / 定制 hover 按钮
      card.innerHTML =
        (img ? '<img src="' + escH(img) + '" alt="' + escH(name) + '" loading="lazy">' : '') +
        '<div class="cp-product-name">' + escH(name) + '</div>' +
        (price ? '<div class="cp-product-price">¥' + Number(price).toLocaleString() + '</div>' : '');

      // 整卡 click 进详情；PK / hover 按钮 stopPropagation
      card.addEventListener('click', function (e) {
        var pk = e.target.closest('.cp-pk-btn, [data-action="cmp"]');
        if (pk) {
          e.stopPropagation();
          var key = card.dataset.product;
          var list = window._compareList || (window._compareList = []);
          var idx = list.findIndex(function(x){ return x.key === key; });
          var pkBtn = card.querySelector('.cp-pk-btn');
          if (idx >= 0) {
            list.splice(idx, 1);
            if (pkBtn) { pkBtn.classList.remove('active'); pkBtn.textContent = 'PK'; }
          } else {
            if (list.length >= (typeof COMPARE_MAX !== 'undefined' ? COMPARE_MAX : 4)) { if (window.LxStatus) window.LxStatus.toast('最多对比 4 件', {type:'warn'}); return; }
            list.push({ key: key, name: card.dataset.name, price: parseFloat(card.dataset.price) || 0, image_url: card.dataset.img, description: '', category: '' });
            if (pkBtn) { pkBtn.classList.add('active'); pkBtn.textContent = '✓'; }
          }
          try { localStorage.setItem('lexiang.compare.v1', JSON.stringify(list)); } catch(_){}
          if (typeof _renderCmpFab === 'function') _renderCmpFab();
          return;
        }
        var explainBtn = e.target.closest('[data-action="explain"]');
        if (explainBtn) {
          e.stopPropagation();
          if (typeof quickAsk === 'function') quickAsk('详细解读 ' + name + ' 的配置亮点、适用人群和性价比');
          return;
        }
        var ctoBtn = e.target.closest('[data-action="customize"]');
        if (ctoBtn) {
          e.stopPropagation();
          if (typeof openCustomizer === 'function') openCustomizer({ productName: name, productImg: img, category: p.category || '' });
          return;
        }
        // 整卡其他位置 → 进详情
        if (sku) openContent('productDetail', name, { sku: sku });
        else openContent('preview', name, { url: url });
      });

      // hover 0.3s 浮现操作层
      var hoverT;
      card.addEventListener('mouseenter', function(){
        hoverT = setTimeout(function(){
          var act = card.querySelector('.cp-hover-actions');
          if (act) act.classList.add('show');
        }, 300);
      });
      card.addEventListener('mouseleave', function(){
        clearTimeout(hoverT);
        var act = card.querySelector('.cp-hover-actions');
        if (act) act.classList.remove('show');
      });

      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  RENDERERS.compare = function (container, data) {
    var products = data && data.products || [];
    if (products.length < 2) {
      container.innerHTML = '<div class="cp-empty" style="padding:60px 24px;text-align:center;color:#9CA3AF">请至少加入 2 件商品再对比</div>';
      return;
    }
    var specKeys = {};
    products.forEach(function (p) {
      if (p.specs) Object.keys(p.specs).forEach(function (k) {
        if (k !== 'url' && k !== 'bu_ids' && k !== 'pcDetailUrl' && k !== 'wapUrl' && k !== 'wapDetailUrl' && k !== 'mobileUrl' && k !== 'highlights' && k !== 'images' && k !== 'ad_picture') specKeys[k] = true;
      });
    });
    var keys = Object.keys(specKeys);
    var labelMap = {brand:'品牌',color:'颜色',weight:'重量',cpu:'处理器',gpu:'显卡',ram:'内存',storage:'存储',os:'操作系统',screen_size:'屏幕尺寸',battery:'电池',resolution:'分辨率',lvl1:'一级分类',lvl2:'二级分类',lvl3:'系列',lvl4:'子系列',lvl5:'细分',mtm:'MTM',bu:'事业部',is_ai:'AI 商品',source:'数据源',target_user:'适合人群'};

    // header
    var thead = '<tr><th class="cp-cmp-label">参数</th>';
    products.forEach(function (p) { thead += '<th>' + escH(p.name || '') + '</th>'; });
    thead += '</tr>';

    // 固定 row：外观图 + 价格 + 分类 + 简介
    var imgRow = '<tr><td class="cp-cmp-label">外观</td>';
    var priceRow = '<tr><td class="cp-cmp-label">价格</td>';
    var catRow   = '<tr><td class="cp-cmp-label">分类</td>';
    var descRow  = '<tr><td class="cp-cmp-label">简介</td>';
    var actRow   = '<tr><td class="cp-cmp-label">操作</td>';
    products.forEach(function (p) {
      var img = p.image_url || '';
      imgRow += '<td><div class="cp-cmp-img-wrap">' + (img ? '<img src="'+escH(img)+'" alt="">' : '<span style="color:#bbb;font-size:12px">无图</span>') + '</div></td>';
      priceRow += '<td><span class="cp-cmp-price">¥' + Number(p.price || 0).toLocaleString() + '</span></td>';
      catRow += '<td>' + escH(p.category || '-') + '</td>';
      descRow += '<td class="cp-cmp-desc">' + escH((p.description || '').slice(0, 80) || '-') + '</td>';
      var sku = p.sku || p.key || '';
      var url = (p.url || (sku ? 'https://item.lenovo.com.cn/product/' + sku + '.html' : '#'));
      actRow += '<td><a class="cp-cmp-buy" href="' + escH(url) + '" rel="noopener" onclick="event.preventDefault();window.openPreview&&openPreview(this.href)">↗ 官网</a> <button class="cp-cmp-ask" data-name="'+escH(p.name||'')+'">问 AI</button></td>';
    });
    imgRow += '</tr>'; priceRow += '</tr>'; catRow += '</tr>'; descRow += '</tr>'; actRow += '</tr>';

    // specs body
    var tbody = '';
    keys.forEach(function (k) {
      var vals = products.map(function (p) { return p.specs && p.specs[k] != null ? String(p.specs[k]) : '-'; });
      if (vals.every(function(v){ return v === '-'; })) return;
      var allSame = vals.every(function (v) { return v === vals[0]; });
      var label = labelMap[k] || k;
      var row = '<td class="cp-cmp-label">' + escH(label) + '</td>';
      vals.forEach(function (v) {
        row += '<td' + (allSame ? '' : ' class="diff-cell"') + '>' + escH(v) + '</td>';
      });
      tbody += '<tr>' + row + '</tr>';
    });
    if (!tbody) tbody = '<tr><td class="cp-cmp-label" style="color:#999">规格</td>' + products.map(function(){ return '<td style="color:#999">—（暂无详细规格，可点「问 AI」展开）</td>'; }).join('') + '</tr>';

    var table = document.createElement('table');
    table.className = 'cp-compare';
    table.innerHTML = '<thead>' + thead + '</thead><tbody>' + imgRow + priceRow + catRow + descRow + tbody + actRow + '</tbody>';
    container.innerHTML = '';
    container.appendChild(table);
    container.querySelectorAll('.cp-cmp-ask').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (typeof quickAsk === 'function') quickAsk('详细介绍 ' + (btn.dataset.name || '') + ' 的配置和卖点');
      });
    });
  };

  RENDERERS.stores = function (container, data) {
    data = data || {};
    var stores = data.stores || [];
    var perks = data.perks || [];
    var perksHtml = perks.length ? '<div class="cp-perks"><strong>🎁 到店专享</strong>' + perks.map(function(p){ return '<span>' + escH(p) + '</span>'; }).join('') + '</div>' : '';
    var cardsHtml = stores.map(function(s){
      var slotsHtml = (s.slots||[]).map(function(t){
        var ask = '我要预约' + (s.name || '') + ' ' + (t.time || '') + '，请帮我下单';
        var safe = ask.replace(/'/g, "\\'");
        return '<div class="cp-store-slot"><span class="cp-slot-time">'+escH(t.time||'')+'</span><span class="cp-slot-remain">剩 '+(t.remain||0)+' 名额</span><button class="cp-slot-btn" data-ask="'+escH(safe)+'">立即预约</button></div>';
      }).join('');
      var prodLines = (s.product_lines||[]).map(function(pl){ return '<span class="cp-store-tag">'+escH(pl)+'</span>'; }).join('');
      var flag = s.is_flagship ? '<span class="cp-store-flag">旗舰</span>' : '';
      var ratingHtml = s.rating ? '<span class="cp-store-rating">⭐ ' + s.rating + '</span>' : '';
      return '<div class="cp-store-card">' +
        '<div class="cp-store-head">' +
          '<div class="cp-store-name">' + escH(s.name||'') + ratingHtml + flag + '</div>' +
          (s.distance ? '<div class="cp-store-distance">' + escH(s.distance) + '</div>' : '') +
        '</div>' +
        '<div class="cp-store-meta">' +
          (s.address ? '<div>📍 ' + escH(s.address) + '</div>' : '') +
          (s.hours   ? '<div>🕐 ' + escH(s.hours) + '</div>' : '') +
          (s.metro   ? '<div>🚇 ' + escH(s.metro) + '</div>' : '') +
          (s.phone   ? '<div>📞 <a href="tel:'+escH(s.phone)+'">'+escH(s.phone)+'</a></div>' : '') +
        '</div>' +
        (prodLines ? '<div class="cp-store-tags"><strong>在售：</strong>' + prodLines + '</div>' : '') +
        (slotsHtml ? '<div class="cp-store-slots"><h4>📅 可预约时段</h4>' + slotsHtml + '</div>' : '') +
      '</div>';
    }).join('');
    container.innerHTML = '<div class="cp-stores-page">' + perksHtml + cardsHtml + '</div>';
    container.querySelectorAll('.cp-slot-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (typeof quickAsk === 'function') quickAsk(btn.dataset.ask || '我要预约门店');
      });
    });
  };

  RENDERERS.preview = function (container, data) {
    var url = data && data.url || '';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;font-size:12px;color:#6B7280';
    bar.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">正在校验链接...</span>' +
      '<a href="' + escH(normalizeUrl(url)) + '" target="_blank" rel="noopener" style="color:#6D28D9;white-space:nowrap">↗ 新窗口打开</a>';
    container.appendChild(bar);
    var iframe = document.createElement('iframe');
    iframe.className = 'cp-preview';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    container.appendChild(iframe);
    resolvePreviewUrl(url).then(function (resolvedUrl) {
      data.url = resolvedUrl;
      var changed = normalizeUrl(url) !== resolvedUrl;
      bar.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escH(resolvedUrl) + (changed ? '（已校正链接）' : '') + '</span>' +
        '<a href="' + escH(resolvedUrl) + '" target="_blank" rel="noopener" style="color:#6D28D9;white-space:nowrap">↗ 新窗口打开</a>';
      iframe.src = '/api/preview?url=' + encodeURIComponent(resolvedUrl);
      updateWorkspaceContextFromTab(getActiveTab());
    });
  };

  RENDERERS.form = function (container, data) {
    var fields = data && data.fields || [];
    var form = document.createElement('form');
    form.className = 'cp-form';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = {};
      fields.forEach(function (f) {
        var el = form.querySelector('[name="' + f.name + '"]');
        if (el) result[f.name] = el.value;
      });
      if (typeof sendMain === 'function') {
        sendMain(JSON.stringify(result));
      }
    });
    fields.forEach(function (f) {
      var group = document.createElement('div');
      group.className = 'cp-form-group';
      var label = document.createElement('label');
      label.textContent = f.label || f.name;
      group.appendChild(label);
      var input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
      } else if (f.type === 'select' && f.options) {
        input = document.createElement('select');
        f.options.forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
      }
      input.name = f.name;
      if (f.required) input.required = true;
      group.appendChild(input);
      form.appendChild(group);
    });
    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'cp-form-submit';
    submit.textContent = '提交';
    form.appendChild(submit);
    container.appendChild(form);
  };

  RENDERERS.productDetail = function (container, data) {
    var sku = data && data.sku;
    if (!sku) return;
    container.innerHTML = '<div class="cpd-loading"><div class="cpd-spinner"></div>加载中...</div>';
    fetch('/api/products/' + encodeURIComponent(sku)).then(function (r) { return r.json(); }).then(function (p) {
      data.product = p;
      data.context = { type: 'product', title: p.name || '商品详情', product: compactProduct(p) };
      // S6 行为追踪：split-chat 内查商品也算
      if (window.LxBehavior && window.LxBehavior.trackProduct) {
        window.LxBehavior.trackProduct(p.sku, p.name, p.price, p.image_url, p.category);
      }
      var current = getActiveTab();
      if (current) renameTab(current.id, p.name || '商品详情');
      var img = (p.image_url || '').replace(/^http:/, 'https:');
      var specs = p.specs || {};
      var priceInt = String(Math.floor(p.price || 0));
      var skipKeys = ['url','bu_ids','target_user','highlights','images','ad_picture','source','wapUrl','pcDetailUrl','mobileUrl','wapDetailUrl'];
      var labelMap = {brand:'品牌',color:'颜色',weight:'重量',screen_size:'屏幕尺寸',battery:'电池',os:'操作系统',cpu:'处理器',gpu:'显卡',ram:'内存',storage:'存储',resolution:'分辨率',screen:'屏幕',ports:'接口',wireless:'无线',keyboard:'键盘',camera:'摄像头',audio:'音频',security:'安全',material:'材质',lvl1:'一级分类',lvl2:'二级分类',lvl3:'系列',lvl4:'子系列',lvl5:'细分',mtm:'MTM 编码',bu:'事业部',is_ai:'AI 商品'};
      var specRows = '';
      Object.keys(specs).forEach(function (k) {
        if (skipKeys.indexOf(k) >= 0 || !specs[k] || typeof specs[k] === 'object') return;
        var v = String(specs[k]);
        if (/^https?:\/\//.test(v)) return;
        specRows += '<tr><td class="cpd-spec-label">' + escH(labelMap[k] || k) + '</td><td class="cpd-spec-value">' + escH(v) + '</td></tr>';
      });

      // 提取亮点
      var highlights = [];
      if (p.description) {
        var parts = p.description.split('/');
        if (parts.length >= 3) highlights = parts.map(function(s){ return s.trim(); }).filter(Boolean);
      }

      var buyUrl = specs.url || 'https://item.lenovo.com.cn/product/' + sku + '.html';
      var stockHtml = p.stock > 0
        ? '<span class="cpd-stock in">● 有货</span>'
        : '<span class="cpd-stock out">● 暂时缺货</span>';

      // 适合人群
      var targetUsers = [];
      try { if (specs.target_user) targetUsers = JSON.parse(specs.target_user); } catch(e){}
      var tuHtml = targetUsers.length > 0
        ? '<div class="cpd-tu"><h4 class="cpd-section-title">👥 适合人群</h4><div class="cpd-tu-tags">' + targetUsers.map(function(u){ return '<span class="cpd-tu-tag">' + escH(u) + '</span>'; }).join('') + '</div></div>'
        : '';
      var searchUrl = 'https://search.lenovo.com.cn/result.html?keyword=' + encodeURIComponent(p.name || '');

      container.innerHTML =
        '<div class="cpd-page">' +
          '<div class="cpd-main">' +
            '<div class="cpd-hero">' +
              (img ? '<div class="cpd-img-wrap"><img src="' + escH(img) + '" alt="' + escH(p.name || '') + '"></div>' : '') +
            '</div>' +
            '<div class="cpd-side">' +
              '<div class="cpd-info">' +
                '<h2 class="cpd-name">' + escH(p.name || '') + '</h2>' +
                '<div class="cpd-price-row">' +
                  '<span class="cpd-price">¥' + Number(priceInt).toLocaleString() + '</span>' +
                  (p.original_price && p.original_price > p.price ? '<span class="cpd-orig-price">¥' + Number(p.original_price).toLocaleString() + '</span>' : '') +
                  stockHtml +
                '</div>' +
                (highlights.length > 0 ? '<div class="cpd-highlights">' + highlights.map(function(h){ return '<span class="cpd-hl-tag">' + escH(h) + '</span>'; }).join('') + '</div>' : '') +
                (p.description && highlights.length === 0 ? '<p class="cpd-desc">' + escH(p.description) + '</p>' : '') +
                '<div class="cpd-fit-reason" id="cpd-fit-' + encodeURIComponent(sku) + '"><span class="cpd-fit-ico">✨</span><span class="cpd-fit-txt">正在为你分析适配度…</span></div>' +
              '</div>' +
              '<div class="cpd-actions">' +
                '<button class="cpd-buy">🎁 一键领取优惠</button>' +
                '<button class="cpd-cart">🛒 加入购物车</button>' +
              '</div>' +
              '<div class="cpd-actions-sub">' +
                '<button class="cpd-compare">✨ 找相似</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          tuHtml +
          // 用户评价 section: 横排单行 (mock POC, 抓官网精选好评)
          (function(){
            var REVIEWS = [
              { u:'彼岸若雪****', s:5, t:'屏幕清晰、重量还可以，电池续航非常不错，新机已开荒！' },
              { u:'lenovo94****', s:5, t:'颜值真的超级高，办公+轻度游戏都满足，非常满意！' },
              { u:'科技小白****', s:5, t:'性能强，温控好，键盘手感舒服，办公无敌！' },
              { u:'职场达人****', s:5, t:'轻薄便携，续航给力，开会出差神器！' },
              { u:'数码玩家****', s:4, t:'外观漂亮、运行流畅，比同价位竞品强不少。' },
              { u:'学生党****',   s:5, t:'学生认证后非常划算，写作业打游戏都顺。' },
              { u:'lenovo46****', s:5, t:'设计精致、做工扎实，性价比非常高，强烈推荐！' }
            ];
            var cards = REVIEWS.map(function(r){
              return '<div class="cpd-rev-card">' +
                '<div class="cpd-rev-head"><span class="cpd-rev-user">' + escH(r.u) + '</span><span class="cpd-rev-stars">' + '★'.repeat(r.s) + '<span style="color:#ddd">' + '★'.repeat(5 - r.s) + '</span></span></div>' +
                '<div class="cpd-rev-text">' + escH(r.t) + '</div>' +
              '</div>';
            }).join('');
            return '<div class="cpd-reviews-section">' +
              '<h4 class="cpd-section-title">💬 用户评价 <span class="cpd-rev-stat">满意度 <b>99%</b> · 9073 条</span></h4>' +
              '<div class="cpd-rev-list">' + cards + '</div>' +
            '</div>';
          })() +
          (specRows ? '<div class="cpd-specs-section"><h4 class="cpd-section-title">📋 规格参数</h4><table class="cpd-specs">' + specRows + '</table></div>' : '') +
          '<div class="cpd-detail-images-section"><h4 class="cpd-section-title">📸 商品介绍详情图</h4><div class="cpd-detail-images-body" id="cpd-detail-images-' + encodeURIComponent(sku) + '"><div style="text-align:center;padding:24px;color:#999">加载详情图…</div></div></div>' +
        '</div>';

      // 异步拉「✨ 适合你」千人千面理由
      (function(){
        var fit = container.querySelector('#cpd-fit-' + encodeURIComponent(sku));
        if (!fit || !sku) return;
        fetch('/api/products/' + encodeURIComponent(sku) + '/reason')
          .then(function(r){ return r.json(); })
          .then(function(j){
            var txt = fit.querySelector('.cpd-fit-txt');
            if (j && j.reason) { if (txt) txt.textContent = j.reason; }
            else { fit.style.display = 'none'; }
          })
          .catch(function(){ fit.style.display = 'none'; });
      })();

      // 异步拉 lenovo 详情图
      (function(){
        var box = container.querySelector('#cpd-detail-images-' + encodeURIComponent(sku));
        if (!box || !sku) return;
        fetch('/api/product/' + encodeURIComponent(sku) + '/detail-images')
          .then(function(r){ return r.json(); })
          .then(function(json){
            if (json.images && json.images.length) {
              box.innerHTML = json.images.map(function(u){ return '<img src="' + escH(u) + '" alt="详情图" loading="lazy" style="width:100%;display:block;margin-bottom:8px">'; }).join('');
            } else {
              box.innerHTML = '<div style="text-align:center;padding:24px;color:#999">暂无详情图</div>';
            }
          })
          .catch(function(){ box.innerHTML = '<div style="text-align:center;padding:24px;color:#c00">加载失败</div>'; });
      })();

      var buyBtn = container.querySelector('.cpd-buy');
      if (buyBtn) buyBtn.addEventListener('click', function () {
        if (typeof startBuyFlow === 'function') startBuyFlow(p.name, p.price, p.image_url || '');
      });
      var cartBtn = container.querySelector('.cpd-cart');
      if (cartBtn) cartBtn.addEventListener('click', function () {
        if (typeof addToCart === 'function') addToCart(p.sku || '', p.name, p.price || 0, p.image_url || '');
      });
      var cmpBtn = container.querySelector('.cpd-compare');
      if (cmpBtn) cmpBtn.addEventListener('click', function () {
        // 找相似：fetch 同 category + 同价位带商品, 开内容面板新 tab(左侧分栏), 不走 AI 文字
        var srcSku = p.sku || sku;
        if (!srcSku) return;
        cmpBtn.disabled = true; cmpBtn.textContent = '✨ 找相似中…';
        fetch('/api/products?similar=' + encodeURIComponent(srcSku) + '&limit=5')
          .then(function (r) { return r.json(); })
          .then(function (list) {
            cmpBtn.disabled = false; cmpBtn.textContent = '✨ 找相似';
            if (!list || !list.length) {
              if (window.LxStatus) window.LxStatus.toast('暂未找到相似商品', { ms: 2000 });
              return;
            }
            var title = '✨ 找相似·' + String(p.name || '').slice(0, 12);
            if (typeof openContent === 'function') openContent('products', title, { products: list, sourceSku: srcSku });
          })
          .catch(function () {
            cmpBtn.disabled = false; cmpBtn.textContent = '✨ 找相似';
            if (window.LxStatus) window.LxStatus.toast('找相似失败，稍后重试', { ms: 2000 });
          });
      });
      if (typeof notifyAIProductContext === 'function') notifyAIProductContext(p);
      updateWorkspaceContextFromTab(getActiveTab());
    }).catch(function () {
      container.innerHTML = '<div class="cpd-loading">加载失败</div>';
    });
  };

  function escH(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ── 通用 info tab：渲染 markdown 内容（替代 showAIModal info 弹窗） ──
  RENDERERS.info = function (container, data) {
    data = data || {};
    // 支持直传 html（如 AI 权益管家瀑布卡），跳过 markdown
    if (data.html) { container.innerHTML = '<div class="cp-info-page">' + data.html + '</div>'; return; }
    var content = data.content || '';
    var html;
    try {
      if (typeof marked !== 'undefined') {
        var src = (typeof sanitizeAutolink === 'function') ? sanitizeAutolink(content) : content;
        html = marked.parse(src);
      } else {
        html = '<pre>' + escH(content) + '</pre>';
      }
    } catch(e) {
      html = '<pre>' + escH(content) + '</pre>';
    }
    container.innerHTML = '<div class="cp-info-page">' + html + '</div>';
  };

  // ── 服务中心 4 类 tab：customize / coupon / member / tradein ──
  // POC：tab 内显示功能引导 + 触发原 modal 完整 UI；同时左侧 chat 自动 quickAsk
  RENDERERS.customize = function (container, data) {
    data = data || {};
    var opts = data.opts || {};
    // 复用 index.html 内 CTO 完整渲染：init state + 写入 container
    if (typeof window._initCtoState === 'function' && typeof window._renderCustomizer === 'function') {
      if (!window._ctoState) window._initCtoState(opts);
      window.__ctoContainer = container;
      // 顶部加预设切换栏
      var schema = (window.CTO_CONFIG && window.CTO_CONFIG[window._ctoState.schemaKey]) || null;
      var presetBar = '<div class="cp-cto-presetbar">' +
        '<button class="cp-cto-preset' + (window._ctoState.schemaKey==='laptop'?' active':'') + '" data-schema="laptop">💻 笔记本</button>' +
        '<button class="cp-cto-preset' + (window._ctoState.schemaKey==='desktop'?' active':'') + '" data-schema="desktop">🖥 台式机</button>' +
        '<span class="cp-cto-spacer"></span>' +
        '<button class="cp-cto-preset" data-preset="value">💰 性价比</button>' +
        '<button class="cp-cto-preset" data-preset="top">⚡ 顶配</button>' +
        '<button class="cp-cto-preset" data-ask="我想做私人定制，可以刻字和喷绘吗？有哪些位置和图案可选？">🎨 问 AI 定制</button>' +
      '</div>';
      // 包一层 wrapper：预设栏 + CTO 渲染区
      container.innerHTML = presetBar + '<div class="cp-cto-host" id="cpCtoHost"></div>';
      window.__ctoContainer = container.querySelector('#cpCtoHost');
      try { window._renderCustomizer(); } catch(e){ console.warn('[customize tab] _renderCustomizer failed:', e); }
      container.querySelectorAll('.cp-cto-preset').forEach(function(btn){
        btn.addEventListener('click', function(){
          if (btn.dataset.schema && typeof window.openCustomizer === 'function') {
            window.openCustomizer({ schema: btn.dataset.schema });
          } else if (btn.dataset.preset && typeof window.openCustomizer === 'function') {
            window.openCustomizer({ schema: window._ctoState ? window._ctoState.schemaKey : 'laptop', preset: btn.dataset.preset });
          } else if (btn.dataset.ask && typeof quickAsk === 'function') {
            quickAsk(btn.dataset.ask);
          }
        });
      });
    } else {
      // fallback：旧引导按钮
      container.innerHTML = '<div class="cp-svc-page"><div class="cp-svc-hero" style="background:linear-gradient(135deg,#4D144A,#B8252E)"><h2>🛠 商品定制</h2><p>请稍后再试</p></div></div>';
    }
  };

  RENDERERS.coupon = function (container, data) {
    var COUPONS = window.COUPONS || [];
    var received = (function(){ try { return JSON.parse(localStorage.getItem('lexiang.coupons.v1') || '[]'); } catch(e){ return []; } })();
    var highlight = (data && data.highlight) || [];
    var site = (typeof window.__siteType !== 'undefined') ? window.__siteType : 'default';
    var filtered = COUPONS.filter(function(c){ return !c.sites || c.sites.indexOf(site) >= 0 || c.sites.indexOf('*') >= 0; });
    if (!filtered.length) filtered = COUPONS;
    var sorted = filtered.slice().sort(function(a,b){
      var ai = highlight.indexOf(a.tag), bi = highlight.indexOf(b.tag);
      if (ai >= 0 && bi < 0) return -1;
      if (bi >= 0 && ai < 0) return 1;
      if (ai >= 0 && bi >= 0) return ai - bi;
      return 0;
    });
    var listHtml = sorted.map(function(c){
      var done = received.indexOf(c.id) >= 0;
      var hi = highlight.indexOf(c.tag) >= 0 ? ' style="box-shadow:0 0 0 2px #B8252E"' : '';
      return '<div class="coupon-item'+(done?' received':'')+'" data-id="'+c.id+'"'+hi+'>'+
        '<div class="coupon-amount"><div class="num">'+c.amount+'</div><div class="cond">'+escH(c.cond||'')+'</div></div>'+
        '<div class="coupon-info"><h4>'+escH(c.title||'')+'</h4><p>'+escH(c.desc||'')+'</p><span class="scope">'+escH(c.scope||'')+'</span></div>'+
        '<button class="coupon-take'+(done?' done':'')+'" data-cid="'+c.id+'" '+(done?'disabled':'')+'>'+(done?'已领取':'立即领取')+'</button>'+
        '</div>';
    }).join('');
    container.innerHTML =
      '<div class="cp-svc-page">' +
        '<div class="cp-svc-hero" style="background:linear-gradient(135deg,#B8252E,#ef4444)">' +
          '<h2>🎟 优惠券中心</h2>' +
          '<p>已领 ' + received.length + ' / ' + COUPONS.length + ' 张 — 学生 / 教师 / 企业 / 政教 / 新用户 / 换新 / 电竞 / 创作者</p>' +
        '</div>' +
        '<div class="coupon-list" style="padding:18px 24px">' + listHtml + '</div>' +
      '</div>';
    container.querySelectorAll('.coupon-take').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (typeof window._takeCoupon === 'function') window._takeCoupon(btn.dataset.cid, btn);
      });
    });
  };

  RENDERERS.member = function (container, data) {
    var m = window._memberState || { level:'V3 黄金', points:12380, growth:11380, growthMax:20000, signedToday:false, benefits:[], orders:[] };
    var pct = Math.round(m.growth / m.growthMax * 100);
    var benefits = (m.benefits || []).map(function(b){
      var btn;
      if (b.status === 'active') btn = '<button class="member-btn done" disabled>已生效</button>';
      else if (b.status === 'claimed') btn = '<button class="member-btn done" disabled>已领取</button>';
      else btn = '<button class="member-btn" data-claim="'+b.id+'">立即领取</button>';
      return '<div class="member-benefit">'+
        '<div class="member-bicon">'+b.icon+'</div>'+
        '<div class="member-binfo"><h4>'+escH(b.name||'')+'</h4><p>'+escH(b.desc||'')+'</p></div>'+
        btn +
      '</div>';
    }).join('');
    var orders = (m.orders || []).map(function(o){
      return '<div class="member-order">'+
        '<div><strong>'+escH(o.id||'')+'</strong> <span class="tag">'+escH(o.status||'')+'</span></div>'+
        '<div class="oname">'+escH(o.name||'')+' <span class="oprice">¥'+(o.price||0).toLocaleString()+'</span></div>'+
        '<div class="oeta">'+escH(o.eta||'')+'</div>'+
      '</div>';
    }).join('');
    var signBtn = m.signedToday
      ? '<button class="member-btn done" disabled>今日已签到 +20</button>'
      : '<button class="member-btn primary" data-act="sign">每日签到 +20 乐豆</button>';
    container.innerHTML =
      '<div class="cp-svc-page">' +
        '<div class="member-head">'+
          '<div class="member-title"><h3>'+escH(m.level||'')+' 会员</h3><p>距 V4 钻石还差 <strong>'+(m.growthMax - m.growth).toLocaleString()+'</strong> 成长值</p></div>'+
          '<div class="member-points"><div class="num">'+m.points.toLocaleString()+'</div><div class="lbl">乐豆余额</div></div>'+
        '</div>'+
        '<div class="member-progress"><div class="bar"><div class="fill" style="width:'+pct+'%"></div></div><span>'+pct+'%</span></div>'+
        '<div class="member-body">'+
          '<div class="member-section"><h5>每日任务</h5>'+signBtn+'</div>'+
          '<div class="member-section"><h5>会员权益（'+(m.benefits||[]).filter(function(b){return b.status==='unclaimed'}).length+' 项可领）</h5><div class="member-benefits">'+benefits+'</div></div>'+
          '<div class="member-section"><h5>我的订单</h5><div class="member-orders">'+orders+'</div></div>'+
        '</div>'+
      '</div>';
    container.querySelectorAll('[data-claim]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (typeof window._memberClaim === 'function') {
          window._memberClaim(btn.dataset.claim);
          // 重渲染 tab
          RENDERERS.member(container, data);
        }
      });
    });
    var signBtnEl = container.querySelector('[data-act="sign"]');
    if (signBtnEl) signBtnEl.addEventListener('click', function(){
      if (typeof window._memberSign === 'function') {
        window._memberSign();
        RENDERERS.member(container, data);
      }
    });
  };

  RENDERERS.tradein = function (container, data) {
    data = data || {};
    // 若 AI 已估价（含 content/data.valuation）→ 直接渲染估价结果，不再显引导按钮
    if (data.content) {
      var html;
      try { html = (typeof marked !== 'undefined') ? marked.parse(data.content) : '<pre>' + escH(data.content) + '</pre>'; }
      catch(e) { html = '<pre>' + escH(data.content) + '</pre>'; }
      container.innerHTML =
        '<div class="cp-svc-page">' +
          '<div class="cp-svc-hero" style="background:linear-gradient(135deg,#10b981,#22c55e)"><h2>♻️ 估价结果</h2><p>下方为 AI 给您的旧机抵扣报价，可直接对话深入沟通</p></div>' +
          '<div class="cp-info-page" style="padding:16px 24px">' + html + '</div>' +
        '</div>';
      return;
    }
    container.innerHTML =
      '<div class="cp-svc-page">' +
        '<div class="cp-svc-hero" style="background:linear-gradient(135deg,#10b981,#22c55e)">' +
          '<h2>♻️ 以旧换新</h2>' +
          '<p>旧机一键评估 → 抵扣价 + 加码券 → 推荐换购新机型 — 全程 AI 多轮对话引导</p>' +
        '</div>' +
        '<div class="cp-svc-actions">' +
          '<button class="cp-svc-btn primary" data-act="ask-laptop">💻 笔记本换新</button>' +
          '<button class="cp-svc-btn primary" data-act="ask-desktop">🖥 台式机换新</button>' +
          '<button class="cp-svc-btn" data-act="ask-thinkpad">💼 ThinkPad 换新</button>' +
          '<button class="cp-svc-btn" data-act="ask-batch">📦 企业批量换新（10+ 台）</button>' +
          '<button class="cp-svc-btn" data-act="ask-rules">📋 换新规则与流程</button>' +
        '</div>' +
        '<div class="cp-svc-tips"><strong>💡</strong>告诉 AI 您旧机的型号 / 成色 / 配置，秒出抵扣价 + 推荐换购。</div>' +
      '</div>';
    container.querySelectorAll('.cp-svc-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var ask = '';
        switch (btn.dataset.act) {
          case 'ask-laptop': ask = '我有一台旧笔记本想换新，请帮我估价。型号是 ___，成色 ___，配置 ___'; break;
          case 'ask-desktop': ask = '我有一台旧台式机想换新，请帮我估价。型号是 ___，成色 ___'; break;
          case 'ask-thinkpad': ask = '我有一台旧 ThinkPad 想换新，请帮我估价。型号是 ThinkPad ___ 年代 ___'; break;
          case 'ask-batch': ask = '我们公司有 30 台旧 ThinkPad 想集中换新，怎么走流程？能多优惠多少？'; break;
          case 'ask-rules': ask = '以旧换新的规则是什么？哪些机型支持？折旧怎么算？'; break;
        }
        if (ask && typeof quickAsk === 'function') quickAsk(ask);
      });
    });
  };

  // ── 布局尺寸 ──

  function applyWidths() {
    if (!isPC()) return;
    var s = getState();
    var pct = state.leftPct;
    // 统一只设 --split-left，宽度由 css 接管（state2b 与 state3 同变量，切换连续）
    document.documentElement.style.setProperty('--split-left', pct + '%');
    if (s === 3) {
      var ca = document.getElementById('chatApp');
      if (ca) { ca.style.width = ''; ca.style.flex = ''; ca.style.maxWidth = ''; ca.style.margin = ''; }
    }
  }

  // ── DOM 结构创建 ──

  function createContentPanel() {
    if (document.getElementById('contentPanel')) return;
    var cp = document.createElement('div');
    cp.id = 'contentPanel';
    cp.innerHTML =
      '<div class="cp-header">' +
        '<div class="cp-tabs" id="cpTabs"></div>' +
        '<div class="cp-actions">' +
          '<button class="cp-icon-btn" id="cpMax" title="放大浏览区" aria-label="放大浏览区">' + ICON_MAXIMIZE + '</button>' +
          '<button class="cp-icon-btn cp-close" id="cpClose" title="关闭浏览区" aria-label="关闭浏览区">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="cp-body" id="cpBody"></div>';
    return cp;
  }

  function wrapInSplitRoot() {
    if (document.getElementById('splitRoot')) return;
    var ca = document.getElementById('chatApp');
    if (!ca) return;

    var cp = createContentPanel();
    if (!cp) return;

    var divider = document.createElement('div');
    divider.id = 'splitDivider';
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.innerHTML = '<div class="grip"></div>' +
      '<button class="split-collapse-btn" id="collapseLandingBtn" title="收起右侧面板">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>' +
      '</button>';

    // 展开按钮（收起后显示在右侧边缘）
    var expandBtn = document.createElement('button');
    expandBtn.id = 'expandLandingBtn';
    expandBtn.className = 'split-panel-float-btn';
    expandBtn.title = '展开右侧面板';
    expandBtn.setAttribute('aria-label', '展开右侧面板');
    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/></svg>';
    expandBtn.addEventListener('click', expandLanding);
    document.body.appendChild(expandBtn);

    var root = document.createElement('div');
    root.id = 'splitRoot';

    ca.parentNode.insertBefore(root, ca);
    root.appendChild(ca);
    root.appendChild(divider);
    root.appendChild(cp);

    // 关闭按钮
    document.getElementById('cpMax').addEventListener('click', toggleContentMaximized);
    document.getElementById('cpClose').addEventListener('click', closeContent);

    // 控制栏（换位 / 新建）
    var controls = document.getElementById('splitControls');
    if (controls) {
      controls.innerHTML =
        '<button type="button" id="btnNewConv" title="新建对话">新建</button>' +
        '<button type="button" id="btnSwapPanes" title="左右换位">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
          '<span>换位</span>' +
        '</button>';
      document.getElementById('btnSwapPanes').addEventListener('click', function () {
        // 换位时翻转 leftPct 让两侧占比保持不变（如 chat 原占 1/3 在右，换到左仍占 1/3）
        state.swapped = !state.swapped;
        state.leftPct = 100 - state.leftPct;
        saveState();
        applyWidths();
        applySwap();
      });
      document.getElementById('btnNewConv').addEventListener('click', function () {
        if (typeof openChatFresh === 'function') openChatFresh();
      });
    }

    // 折叠按钮
    var collapseBtn = document.getElementById('collapseLandingBtn');
    if (collapseBtn) collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      collapseLanding();
    });

    bindDrag(divider);
  }

  function applySwap() {
    var html = document.documentElement;
    if (state.swapped) html.classList.add('layout-swapped');
    else html.classList.remove('layout-swapped');
  }

  // ── 拖拽分割线 ──

  function bindDrag(divider) {
    var startX = 0, startPct = 0, viewportW = 0;
    function onDown(e) {
      var s = getState();
      if (!isPC() || (s !== 2 && s !== 3)) return;
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
      var s = getState();
      var pct;
      if (s === 3 && state.swapped) {
        pct = startPct - deltaPct;
      } else {
        pct = startPct + deltaPct;
      }
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
      saveState();
    }
    divider.addEventListener('mousedown', onDown);
    divider.addEventListener('touchstart', onDown, { passive: false });
    divider.addEventListener('dblclick', function () {
      state.leftPct = DEFAULT_LEFT_PCT;
      state.swapped = false;
      saveState();
      applySwap();
      applyWidths();
    });
  }

  // ── 劫持现有函数 ──

  function patchFunctions() {
    // showChatApp — PC 下走 enterChat 保留 landing 可见
    var origShow = window.showChatApp;
    if (typeof origShow === 'function') {
      window.showChatApp = function (pushUrl) {
        if (isPC()) {
          enterChat();
          if (window.__pendingProductCtx && typeof notifyAIProductContext === 'function') {
            notifyAIProductContext(window.__pendingProductCtx);
          }
          return;
        }
        return origShow.apply(this, arguments);
      };
    }

    // openChatFresh
    var origOpen = window.openChatFresh;
    if (typeof origOpen === 'function') {
      window.openChatFresh = function () {
        if (isPC()) enterChat();
        return origOpen.apply(this, arguments);
      };
    }

    // goHome
    var origGoHome = window.goHome;
    if (typeof origGoHome === 'function') {
      window.goHome = function () {
        if (isPC()) { goHomePC(); return; }
        return origGoHome.apply(this, arguments);
      };
    }

    // showDisplayCanvas → openContent('products')
    var origDC = window.showDisplayCanvas;
    if (typeof origDC === 'function') {
      window.showDisplayCanvas = function (title, products) {
        if (isPC()) { openContent('products', title, { products: products }); return; }
        return origDC.apply(this, arguments);
      };
    }

    var origCloseDC = window.closeDisplayCanvas;
    if (typeof origCloseDC === 'function') {
      window.closeDisplayCanvas = function () {
        if (isPC() && getState() === 3) { closeContent(); return; }
        return origCloseDC.apply(this, arguments);
      };
    }

    var origCategory = window.showCategoryProducts;
    if (typeof origCategory === 'function') {
      window.showCategoryProducts = function (category) {
        if (isPC()) {
          enterChat();
          openContent('products', category || '商品', { category: category || '商品', fetchCategory: true });
          return;
        }
        return origCategory.apply(this, arguments);
      };
    }

    var origProductDetail = window.showProductDetail;
    if (typeof origProductDetail === 'function') {
      window.showProductDetail = function (sku) {
        if (isPC()) {
          enterChat();
          openContent('productDetail', '商品详情', { sku: sku });
          return;
        }
        return origProductDetail.apply(this, arguments);
      };
    }

    // showAIModal → PC 端 compare/info 都走 openContent tab，不弹 modal
    var origModal = window.showAIModal;
    if (typeof origModal === 'function') {
      window.showAIModal = function (data) {
        if (isPC() && data) {
          if (data.type === 'compare') { openContent('compare', data.title || '对比', data); return; }
          if (data.type === 'info')    { openContent('info',    data.title || '详情', data); return; }
        }
        return origModal.apply(this, arguments);
      };
    }

    // openPreview → openContent('preview')
    var origPreview = window.openPreview;
    if (typeof origPreview === 'function') {
      window.openPreview = function (url) {
        if (isPC()) { openContent('preview', url, { url: url }); return; }
        return origPreview.apply(this, arguments);
      };
    }

    // 触发聊天的函数：进入对话状态
    function wrapTrigger(name) {
      var orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () {
        if (isPC()) enterChat();
        return orig.apply(this, arguments);
      };
    }
    ['startChat', 'quickAsk', 'findNearbyStores', 'triggerHongbao'].forEach(wrapTrigger);

    // heroSend 按钮
    var heroSend = document.getElementById('heroSend');
    if (heroSend) heroSend.addEventListener('click', function () { if (isPC()) enterChat(); }, true);

    // Logo 回首页：拦截主导航 .logo 的 onclick
    var logoEl = document.querySelector('nav .logo');
    if (logoEl) {
      logoEl.addEventListener('click', function (e) {
        if (isPC() && getState() > 1) {
          e.preventDefault();
          e.stopImmediatePropagation();
          goHomePC();
        }
      }, true);
    }

    // 侧边栏 logo 和 返回首页按钮
    var sbLogo = document.querySelector('.sb-logo');
    if (sbLogo) {
      sbLogo.addEventListener('click', function (e) {
        if (isPC()) { e.preventDefault(); e.stopImmediatePropagation(); goHomePC(); }
      }, true);
    }
    var backHome = document.getElementById('backHomeBtn');
    if (backHome) {
      backHome.addEventListener('click', function (e) {
        if (isPC()) { e.preventDefault(); e.stopImmediatePropagation(); goHomePC(); }
      }, true);
    }
  }

  // ── resize 适配 ──

  function onResize() {
    if (!isPC()) {
      var html = document.documentElement;
      html.classList.remove('split-mode', 'layout-swapped', 'content-open', 'content-closing', 'content-maximized');
    } else {
      // S4: 不强制加 split-mode；保留当前状态
      applySwap();
      applyWidths();
      updateContentMaxButton();
    }
  }
  if (MQ.addEventListener) MQ.addEventListener('change', onResize);
  else if (MQ.addListener) MQ.addListener(onResize);
  window.addEventListener('resize', applyWidths);

  // ── URL 检查 ──

  function checkInitialUrl() {
    if (!isPC()) return;
    var p = location.pathname.replace(/\/$/, '');
    var hasConv = false;
    var matchedPrefix = null;
    for (var i = 0; i < CHAT_PREFIXES.length; i++) {
      var pre = CHAT_PREFIXES[i];
      if (p === pre || p.startsWith(pre + '/')) {
        matchedPrefix = pre;
        if (p.length > pre.length && p.startsWith(pre + '/')) hasConv = true;
        break;
      }
    }
    if (hasConv) {
      document.documentElement.classList.add('is-chat');
      enterChat();
    } else if (matchedPrefix && matchedPrefix !== '/chat') {
      // S6: 子站入口（/shop-chat /b-chat /biz-chat）默认左右分屏「边聊边逛」
      document.documentElement.classList.add('is-chat');
      enterSplit();
    }
  }

  // ── 保留 landing 导航功能 ──

  var SECTION_MAP = {
    home: function () { return document.querySelector('#landingPage .hero'); },
    top: function () { return document.querySelector('#landingPage .hero'); },
    hero: function () { return document.querySelector('#landingPage .hero'); },
    featured: function () { return getSec(0); },
    news_dynamic: function () { return getSec(0); },
    bestsellers: function () { return getSec(1); },
    products: function () { return getSec(1); },
    solutions: function () { return getSec(2); },
    news: function () { return getSec(3); },
    cases: function () { return getSec(4); },
    cta: function () { return getSec(5); },
    contact: function () { return getSec(5); }
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
      var keys = Object.keys(SECTION_MAP);
      for (var i = 0; i < keys.length; i++) {
        if (key.indexOf(keys[i]) >= 0) { el = SECTION_MAP[keys[i]](); break; }
      }
    }
    if (!el) return;
    var lp = document.getElementById('landingPage');
    if (isPC() && lp) {
      lp.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    el.classList.remove('nav-flash');
    void el.offsetWidth;
    el.classList.add('nav-flash');
  }
  window.__navigateLandingTo = navigateLeft;

  // ── 初始化 ──

  function init() {
    if (!isPC()) return;
    rememberLandingHome();
    // S4: 默认不加 split-mode；只在 chat URL 时按需加
    loadState();
    wrapInSplitRoot();
    applySwap();
    patchFunctions();
    checkInitialUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
