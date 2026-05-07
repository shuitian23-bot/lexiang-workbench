/* split-layout.js — PC 端分屏布局控制器 v2 */
(function () {
  'use strict';

  var MQ = window.matchMedia('(min-width: 769px)');
  var CHAT_PREFIXES = ['/chat', '/shop-chat', '/b-chat', '/biz-chat'];
  var STORE_KEY = 'lexiang.splitV2';
  var DEFAULT_LEFT_PCT = 50;
  var MIN_LEFT_PCT = 25;
  var MAX_LEFT_PCT = 75;

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
      state.swapped = !!s.swapped;
    } catch (e) {}
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ leftPct: state.leftPct, swapped: state.swapped })); } catch (e) {}
  }

  // ── Tab 管理 ──
  var tabs = [];
  var activeTabId = null;
  var tabCounter = 0;

  // ── 核心状态机 ──

  function getState() {
    var html = document.documentElement;
    if (html.classList.contains('in-chat') && html.classList.contains('content-open')) return 3;
    if (html.classList.contains('in-chat')) return 2;
    return 1;
  }

  // 状态1→2
  function enterChat() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.add('split-mode', 'in-chat', 'is-chat');
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

  // 添加 Tab → 状态2→3 或保持3
  function openContent(type, title, data) {
    if (!isPC()) return null;
    var id = 'tab-' + (++tabCounter);
    var tab = { id: id, type: type, title: title, data: data, el: null, contentEl: null };
    if (tabs.length >= 5) {
      var old = tabs.shift();
      if (old.el && old.el.parentNode) old.el.parentNode.removeChild(old.el);
      if (old.contentEl && old.contentEl.parentNode) old.contentEl.parentNode.removeChild(old.contentEl);
    }
    tabs.push(tab);

    var tabsContainer = document.getElementById('cpTabs');
    var bodyContainer = document.getElementById('cpBody');
    if (!tabsContainer || !bodyContainer) return null;

    // tab 按钮
    var btn = document.createElement('button');
    btn.className = 'cp-tab';
    btn.textContent = title;
    btn.setAttribute('data-tab-id', id);
    btn.addEventListener('click', function () { switchTab(id); });
    tabsContainer.appendChild(btn);
    tab.el = btn;

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

    // 进入状态3
    var html = document.documentElement;
    if (!html.classList.contains('in-chat')) {
      html.classList.add('split-mode', 'in-chat', 'is-chat');
      document.getElementById('chatApp').classList.add('active');
    }
    if (!html.classList.contains('content-open')) {
      html.classList.remove('content-closing');
      html.classList.add('content-open');
      applyWidths();
    }
    return id;
  }

  // 状态3→2
  function closeContent() {
    if (!isPC()) return;
    var html = document.documentElement;
    if (!html.classList.contains('content-open')) return;
    html.classList.add('content-closing');
    html.classList.remove('content-open');
    // 清除 applyWidths() 设置的内联样式，恢复 CSS 控制
    var ca = document.getElementById('chatApp');
    if (ca) {
      ca.style.flex = '';
      ca.style.width = '';
      ca.style.maxWidth = '';
      ca.style.margin = '';
    }
    setTimeout(function () {
      html.classList.remove('content-closing');
    }, 220);
  }

  // 任何→状态1
  function goHomePC() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.remove('in-chat', 'content-open', 'content-closing', 'is-chat', 'is-chat-conv');
    var ca = document.getElementById('chatApp');
    ca.classList.remove('active');
    ca.style.flex = '';
    ca.style.width = '';
    ca.style.maxWidth = '';
    ca.style.margin = '';
    document.getElementById('landingPage').classList.remove('exit');
    history.pushState(null, '', '/');
    try { closeSidebar(); } catch (e) {}
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
  }

  // ── 全局 API ──
  window.__enterChat = enterChat;
  window.__openContent = openContent;
  window.__closeContent = closeContent;
  window.__goHome = goHomePC;
  window.__switchTab = switchTab;
  // 向后兼容旧 API（index.html 中有引用）
  window.__revealChat = enterChat;
  window.__hideChat = function () { /* 新架构中由 goHome 替代 */ };

  // ── Tab 渲染器 ──
  var RENDERERS = {};

  RENDERERS.products = function (container, data) {
    var products = data && data.products || [];
    var grid = document.createElement('div');
    grid.className = 'cp-products';
    products.forEach(function (p) {
      var img = (p.image_url || '').replace(/^http:/, 'https:');
      var name = p.name || '';
      var price = p.price || '';
      var desc = p.description || '';
      var sku = p.sku || '';
      var url = p.pcDetailUrl || (sku ? 'https://item.lenovo.com.cn/product/' + sku + '.html' : '#');

      var card = document.createElement('div');
      card.className = 'cp-product-card';
      card.innerHTML =
        (img ? '<img src="' + escH(img) + '" alt="' + escH(name) + '" loading="lazy">' : '') +
        '<div class="cp-product-name">' + escH(name) + '</div>' +
        (price ? '<div class="cp-product-price">¥' + Number(price).toLocaleString() + '</div>' : '') +
        (desc ? '<div class="cp-product-desc">' + escH(desc) + '</div>' : '') +
        '<div style="padding:0 12px 12px"><button class="cp-product-btn" data-url="' + escH(url) + '">去看看</button></div>';
      card.querySelector('.cp-product-btn').addEventListener('click', function () { window.open(url, '_blank'); });
      grid.appendChild(card);
    });
    container.appendChild(grid);
  };

  RENDERERS.compare = function (container, data) {
    var products = data && data.products || [];
    if (products.length < 2) return;
    var specKeys = {};
    products.forEach(function (p) {
      if (p.specs) Object.keys(p.specs).forEach(function (k) {
        if (k !== 'url' && k !== 'bu_ids') specKeys[k] = true;
      });
    });
    var keys = Object.keys(specKeys);
    var table = document.createElement('table');
    table.className = 'cp-compare';

    // header
    var thead = '<tr><th>参数</th>';
    products.forEach(function (p) { thead += '<th>' + escH(p.name || '') + '</th>'; });
    thead += '</tr>';

    // body
    var tbody = '';
    keys.forEach(function (k) {
      var vals = products.map(function (p) { return p.specs && p.specs[k] != null ? String(p.specs[k]) : '-'; });
      var allSame = vals.every(function (v) { return v === vals[0]; });
      var row = '<td>' + escH(k) + '</td>';
      vals.forEach(function (v) {
        row += '<td' + (allSame ? '' : ' class="diff-cell"') + '>' + escH(v) + '</td>';
      });
      tbody += '<tr>' + row + '</tr>';
    });

    table.innerHTML = '<thead>' + thead + '</thead><tbody>' + tbody + '</tbody>';
    container.appendChild(table);
  };

  RENDERERS.stores = function (container, data) {
    var stores = data && data.stores || [];
    var ul = document.createElement('ul');
    ul.className = 'cp-stores';
    stores.forEach(function (s) {
      var li = document.createElement('li');
      li.innerHTML =
        '<div class="cp-store-name">' + escH(s.name || '') + '</div>' +
        '<div class="cp-store-address">' + escH(s.address || '') + '</div>' +
        (s.phone ? '<div class="cp-store-phone"><a href="tel:' + escH(s.phone) + '">' + escH(s.phone) + '</a></div>' : '') +
        (s.distance ? '<div style="font-size:12px;color:#9CA3AF;margin-top:2px">' + escH(s.distance) + '</div>' : '');
      ul.appendChild(li);
    });
    container.appendChild(ul);
  };

  RENDERERS.preview = function (container, data) {
    var url = data && data.url || '';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;font-size:12px;color:#6B7280';
    bar.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escH(url) + '</span>' +
      '<a href="' + escH(url) + '" target="_blank" rel="noopener" style="color:#6D28D9;white-space:nowrap">↗ 新窗口打开</a>';
    container.appendChild(bar);
    var iframe = document.createElement('iframe');
    iframe.className = 'cp-preview';
    iframe.src = '/api/preview?url=' + encodeURIComponent(url);
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    container.appendChild(iframe);
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

  function escH(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ── 布局尺寸 ──

  function applyWidths() {
    if (!isPC() || getState() !== 3) return;
    var ca = document.getElementById('chatApp');
    if (!ca) return;
    var pct = state.leftPct;
    ca.style.flex = '0 0 auto';
    ca.style.width = 'calc(' + pct + '% - 3px)';
    ca.style.maxWidth = 'none';
    ca.style.margin = '0';
  }

  // ── DOM 结构创建 ──

  function createContentPanel() {
    if (document.getElementById('contentPanel')) return;
    var cp = document.createElement('div');
    cp.id = 'contentPanel';
    cp.innerHTML =
      '<div class="cp-header">' +
        '<div class="cp-tabs" id="cpTabs"></div>' +
        '<button class="cp-close" id="cpClose" title="关闭">×</button>' +
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
    divider.innerHTML = '<div class="grip"></div>';

    var root = document.createElement('div');
    root.id = 'splitRoot';

    ca.parentNode.insertBefore(root, ca);
    root.appendChild(ca);
    root.appendChild(divider);
    root.appendChild(cp);

    // 关闭按钮
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
        state.swapped = !state.swapped;
        saveState();
        applySwap();
      });
      document.getElementById('btnNewConv').addEventListener('click', function () {
        if (typeof openChatFresh === 'function') openChatFresh();
      });
    }

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
      if (!isPC() || getState() !== 3) return;
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
    // showChatApp
    var origShow = window.showChatApp;
    if (typeof origShow === 'function') {
      window.showChatApp = function () {
        if (isPC()) { enterChat(); return; }
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

    // showAIModal → compare 走 openContent
    var origModal = window.showAIModal;
    if (typeof origModal === 'function') {
      window.showAIModal = function (data) {
        if (isPC() && data && data.type === 'compare') {
          openContent('compare', data.title || '对比', data);
          return;
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
      html.classList.remove('split-mode', 'layout-swapped', 'content-open', 'content-closing');
    } else {
      document.documentElement.classList.add('split-mode');
      applySwap();
      applyWidths();
    }
  }
  if (MQ.addEventListener) MQ.addEventListener('change', onResize);
  else if (MQ.addListener) MQ.addListener(onResize);
  window.addEventListener('resize', applyWidths);

  // ── URL 检查 ──

  function checkInitialUrl() {
    if (isPC() && isChatPath()) {
      document.documentElement.classList.add('is-chat');
      enterChat();
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
    document.documentElement.classList.add('split-mode');
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
