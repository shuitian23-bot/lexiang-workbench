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

  function findReusableTab(type, data) {
    data = data || {};
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var td = t.data || {};
      if (t.type !== type) continue;
      if (type === 'productDetail' && data.sku && td.sku === data.sku) return t;
      if (type === 'products' && data.category && td.category === data.category) return t;
      if (type === 'preview' && data.url && td.url === data.url) return t;
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
    btn.title = '收起此面板';
    btn.innerHTML = '×';
    btn.style.cssText = 'position:fixed;top:62px;right:8px;z-index:60;background:var(--bg,#fff);border:1px solid var(--border,#e5e7eb);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:var(--text2,#666);box-shadow:0 1px 4px rgba(0,0,0,.1);line-height:1';
    btn.addEventListener('click', collapseLanding);
    document.body.appendChild(btn);
  }

  // 状态1→2
  function enterChat() {
    if (!isPC()) return;
    var html = document.documentElement;
    html.classList.add('split-mode', 'in-chat', 'is-chat');
    html.style.setProperty('--split-left', state.leftPct + '%');
    extractNav();
    ensureLandingCloseBtn();
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
    var html = document.documentElement;
    if (!html.classList.contains('in-chat')) enterChat();

    var reusable = findReusableTab(type, data);
    if (reusable) {
      ensureContentPanelOpen();
      switchTab(reusable.id);
      return reusable.id;
    }

    var id = 'tab-' + (++tabCounter);
    var tab = { id: id, type: type, title: title || '内容', data: data || {}, el: null, contentEl: null };
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
    var wrap = document.createElement('div');
    wrap.className = 'cp-tab-wrap';
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
    wrap.appendChild(x);
    tabsContainer.appendChild(wrap);
    tab.el = wrap;

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
    if (!html.classList.contains('content-open')) html.classList.add('content-open');
    var cp = document.getElementById('contentPanel');
    if (cp) {
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
    html.classList.remove('in-chat', 'content-open', 'content-closing', 'is-chat', 'is-chat-conv');
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
    setTimeout(function () {
      var ta = document.getElementById('mainTa');
      if (ta) try { ta.focus(); } catch (e) {}
    }, 30);
  }

  function closeTab(tabId) {
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === tabId) { idx = i; break; }
    }
    if (idx < 0) return;
    var tab = tabs[idx];
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
  window.__openContent = openContent;
  window.__closeContent = closeContent;
  window.__closeWorkspaceTab = closeTab;
  window.__getWorkspaceContext = getWorkspaceContext;
  window.__goHome = goHomePC;
  window.__switchTab = switchTab;
  // 向后兼容旧 API（index.html 中有引用）
  window.__revealChat = enterChat;
  window.__hideChat = function () { /* 新架构中由 goHome 替代 */ };

  // ── Tab 渲染器 ──
  var RENDERERS = {};

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
      var url = p.pcDetailUrl || (sku ? 'https://item.lenovo.com.cn/product/' + sku + '.html' : '#');

      var card = document.createElement('div');
      card.className = 'cp-product-card';
      card.innerHTML =
        (img ? '<img src="' + escH(img) + '" alt="' + escH(name) + '" loading="lazy">' : '') +
        '<div class="cp-product-name">' + escH(name) + '</div>' +
        (price ? '<div class="cp-product-price">¥' + Number(price).toLocaleString() + '</div>' : '') +
        (desc ? '<div class="cp-product-desc">' + escH(desc) + '</div>' : '') +
        '<div style="padding:0 12px 12px"><button class="cp-product-btn" data-url="' + escH(url) + '">去看看</button></div>';
      card.querySelector('.cp-product-btn').addEventListener('click', function () {
        if (isPC() && sku) {
          openContent('productDetail', name, { sku: sku });
        } else if (isPC()) {
          openContent('preview', name, { url: url });
        } else {
          window.open(url, '_blank');
        }
      });
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

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

  RENDERERS.productDetail = function (container, data) {
    var sku = data && data.sku;
    if (!sku) return;
    container.innerHTML = '<div class="cpd-loading"><div class="cpd-spinner"></div>加载中...</div>';
    fetch('/api/products/' + encodeURIComponent(sku)).then(function (r) { return r.json(); }).then(function (p) {
      data.product = p;
      data.context = { type: 'product', title: p.name || '商品详情', product: compactProduct(p) };
      var current = getActiveTab();
      if (current) renameTab(current.id, p.name || '商品详情');
      var img = (p.image_url || '').replace(/^http:/, 'https:');
      var specs = p.specs || {};
      var priceInt = String(Math.floor(p.price || 0));
      var skipKeys = ['url','bu_ids','lvl1','lvl2','lvl3','lvl4','lvl5','target_user','highlights','images','ad_picture','is_ai','bu','mtm','wapUrl','pcDetailUrl','mobileUrl'];
      var labelMap = {brand:'品牌',color:'颜色',weight:'重量',screen_size:'屏幕尺寸',battery:'电池',os:'操作系统',cpu:'处理器',gpu:'显卡',ram:'内存',storage:'存储',resolution:'分辨率',screen:'屏幕',ports:'接口',wireless:'无线',keyboard:'键盘',camera:'摄像头',audio:'音频',security:'安全',material:'材质'};
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

      container.innerHTML =
        '<div class="cpd-page">' +
          '<div class="cpd-hero">' +
            (img ? '<div class="cpd-img-wrap"><img src="' + escH(img) + '" alt="' + escH(p.name || '') + '"></div>' : '') +
          '</div>' +
          '<div class="cpd-info">' +
            '<h2 class="cpd-name">' + escH(p.name || '') + '</h2>' +
            '<div class="cpd-price-row">' +
              '<span class="cpd-price">¥' + Number(priceInt).toLocaleString() + '</span>' +
              (p.original_price && p.original_price > p.price ? '<span class="cpd-orig-price">¥' + Number(p.original_price).toLocaleString() + '</span>' : '') +
              stockHtml +
            '</div>' +
            (highlights.length > 0 ? '<div class="cpd-highlights">' + highlights.map(function(h){ return '<span class="cpd-hl-tag">' + escH(h) + '</span>'; }).join('') + '</div>' : '') +
            (p.description && highlights.length === 0 ? '<p class="cpd-desc">' + escH(p.description) + '</p>' : '') +
          '</div>' +
          '<div class="cpd-actions">' +
            '<button class="cpd-buy">立即购买</button>' +
            '<button class="cpd-ask">问AI助手</button>' +
          '</div>' +
          '<div class="cpd-actions-sub">' +
            '<a href="' + escH(buyUrl) + '" target="_blank" rel="noopener" class="cpd-link">↗ 官网查看</a>' +
            '<button class="cpd-compare">和竞品对比</button>' +
          '</div>' +
          (specRows ? '<div class="cpd-specs-section"><h4 class="cpd-specs-title">规格参数</h4><table class="cpd-specs">' + specRows + '</table></div>' : '') +
        '</div>';

      var buyBtn = container.querySelector('.cpd-buy');
      if (buyBtn) buyBtn.addEventListener('click', function () {
        if (typeof startBuyFlow === 'function') startBuyFlow(p.name, p.price);
      });
      var askBtn = container.querySelector('.cpd-ask');
      if (askBtn) askBtn.addEventListener('click', function () {
        if (typeof quickAsk === 'function') quickAsk(p.name + ' 怎么样？值得买吗？');
      });
      var cmpBtn = container.querySelector('.cpd-compare');
      if (cmpBtn) cmpBtn.addEventListener('click', function () {
        if (typeof quickAsk === 'function') quickAsk('帮我对比 ' + p.name + ' 和同价位竞品');
      });
      if (typeof notifyAIProductContext === 'function') notifyAIProductContext(p);
      updateWorkspaceContextFromTab(getActiveTab());
    }).catch(function () {
      container.innerHTML = '<div class="cpd-loading">加载失败</div>';
    });
  };

  function escH(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ── 布局尺寸 ──

  function applyWidths() {
    if (!isPC()) return;
    var s = getState();
    var pct = state.leftPct;
    if (s === 2) {
      document.documentElement.style.setProperty('--split-left', pct + '%');
    } else if (s === 3) {
      var ca = document.getElementById('chatApp');
      if (!ca) return;
      ca.style.flex = '0 0 auto';
      ca.style.width = 'calc(' + pct + '% - 3px)';
      ca.style.maxWidth = 'none';
      ca.style.margin = '0';
    }
  }

  // ── DOM 结构创建 ──

  function createContentPanel() {
    if (document.getElementById('contentPanel')) return;
    var cp = document.createElement('div');
    cp.id = 'contentPanel';
    cp.innerHTML =
      '<div class="cp-header">' +
        '<div class="cp-title">浏览工作区</div>' +
        '<div class="cp-tabs" id="cpTabs"></div>' +
        '<button class="cp-close" id="cpClose" title="关闭工作区">×</button>' +
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
    expandBtn.title = '展开右侧面板';
    expandBtn.style.cssText = 'display:none;position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:60;background:var(--bg,#fff);border:1px solid var(--border,#e5e7eb);border-right:none;border-radius:8px 0 0 8px;padding:8px 4px;cursor:pointer;color:var(--text2,#666);box-shadow:-2px 0 8px rgba(0,0,0,.08)';
    expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 7 6 12 11 17"/><polyline points="18 7 13 12 18 17"/></svg>';
    expandBtn.addEventListener('click', expandLanding);
    document.body.appendChild(expandBtn);

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
