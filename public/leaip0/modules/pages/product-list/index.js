/* 推荐商品列表 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/product-list"]) {
window.__p0Modules.installed["pages/product-list"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/product-floor-compare-v127.js */
window.__p0Modules.sources["u64813aef9b5d08c7"]=function(){
(() => {
  if (window.__lxFloorCompareFixed) return;
  window.__lxFloorCompareFixed = true;
  const CARD_SELECTORS = ['.rank-item', '.floor-product', '.lx-floor-product', '.product-card', '.lx-floor-product-card', '[data-floor-product]'];
  const CARD_SELECTOR = CARD_SELECTORS.join(', ');
  const PICK_SELECTOR = CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn`).join(', ');
  const HOVER_SELECTOR = CARD_SELECTORS.map(selector => `${selector}:hover > .lx-pick-btn`).join(', ');
  const FOCUS_SELECTOR = CARD_SELECTORS.map(selector => `${selector}:focus-within > .lx-pick-btn`).join(', ');
  const CHECKED_SELECTOR = CARD_SELECTORS.map(selector => `${selector}.is-checked > .lx-pick-btn`).join(', ');
  const PICKED_SELECTOR = CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn.picked`).join(', ');
  const AUTO_PROMPTS = new Set(['帮我对比下这几款商品', '请帮我对比这几款商品', '对比这几款商品']);

  const style = document.createElement('style');
  style.dataset.productFloorCompare = 'v127';
  style.textContent = `
    ${CARD_SELECTOR}{position:relative}
    ${PICK_SELECTOR}{
      position:absolute;top:16px;right:16px;z-index:12;width:24px;height:24px;
      display:grid;place-items:center;padding:0;border:2px solid #b9a8ca;border-radius:6px;
      background:#fff;opacity:0;transform:scale(.9);cursor:pointer;
      transition:opacity .2s ease,transform .2s ease,background .2s ease,border-color .2s ease;
    }
    ${HOVER_SELECTOR},
    ${FOCUS_SELECTOR},
    ${CHECKED_SELECTOR},
    ${PICKED_SELECTOR}{opacity:1;transform:scale(1)}
    ${CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn:hover`).join(', ')}{border-color:#4d144a;background:#f7f1f8}
    ${PICKED_SELECTOR}{border-color:#4d144a;background:#4d144a}
    ${CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn img`).join(', ')}{display:none!important}
    ${CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn::after`).join(', ')}{
      content:'';width:6px;height:11px;border-right:2px solid transparent;border-bottom:2px solid transparent;
      transform:rotate(45deg) translate(-1px,-1px);transition:border-color .2s ease;
    }
    ${CARD_SELECTORS.map(selector => `${selector} > .lx-pick-btn.picked::after`).join(', ')}{border-color:#fff}
  `;
  style.textContent += window.__p0Modules.styleText("/@script-style/15f3412fa14d1b9db69b15a1.css");
  document.head.appendChild(style);
  const roots = new Set([document]);
  window.__lxFloorFindCard = sku => {
    for (const root of roots) {
      const found = Array.from(root.querySelectorAll(CARD_SELECTOR)).find(card => cardSku(card) === String(sku));
      if (found) return found;
    }
  };
  const all = (selector)=>window.__p0Modules.invoke("pages/product-compare#all:2ce6b50b66e19d3cee7b9a05",{get ["roots"](){return roots}},undefined,[selector]);

  const cardSku = (card)=>window.__p0Modules.invoke("pages/product-compare#cardSku:25b648da95bd4dbe68a5830f",{},undefined,[card]);

  function enhanceCard(card){return window.__p0Modules.invoke("pages/product-compare#enhanceCard:ba719778f8f04bc6740d9268",{get ["cardSku"](){return cardSku}},this,arguments);}

  function enhance(root = document) {
    if (root.matches?.(CARD_SELECTOR)) enhanceCard(root);
    root.querySelectorAll?.(CARD_SELECTOR).forEach(enhanceCard);
    const hosts = [root, ...root.querySelectorAll?.('*') || []];
    hosts.forEach(host => {
      const shadow = host.shadowRoot;
      if (!shadow || roots.has(shadow)) return;
      roots.add(shadow);
      shadow.appendChild(style.cloneNode(true));
      observe(shadow);
      enhance(shadow);
    });
  }

  let previousSelected = 0;
  function normalizePrompt(){return window.__p0Modules.invoke("pages/product-compare#normalizePrompt:c7ad47fcdea697bb0cec6e03",{get ["all"](){return all},get ["PICK_SELECTOR"](){return PICK_SELECTOR},get ["previousSelected"](){return previousSelected},set ["previousSelected"](__p0Value){previousSelected=__p0Value},get ["AUTO_PROMPTS"](){return AUTO_PROMPTS}},this,arguments);}

  const observer = new MutationObserver(records => {
    for (const root of roots) if (root.host && !root.querySelector("style[data-product-floor-compare]")) root.appendChild(style.cloneNode(true));
    for (const record of records) {
      if (record.type === "attributes") enhanceCard(record.target);
      record.addedNodes.forEach(node => node.nodeType === 1 && enhance(node));
    }
    queueMicrotask(normalizePrompt);
  });
  function observe(root){return window.__p0Modules.invoke("pages/product-compare#observe:50c109a5f4e3981a7afbf072",{get ["observer"](){return observer}},this,arguments);}
  observe(document);
  enhance();
  window.__lxSyncFloorPicks = normalizePrompt;
  // All native card selectors must include shadow-floor cards without adding layout classes.
  // Poll only known hosts to catch shadow roots attached after insertion.
  const hostTimer = setInterval(() => {
    document.querySelectorAll('.p-shop-floor-embed').forEach(host => enhance(host));
    for (const root of roots) if (root.host && !root.host.isConnected) roots.delete(root);
  }, 1200);
  window.addEventListener('pagehide', () => { clearInterval(hostTimer); observer.disconnect(); }, {once:true});
  let pointerStart = null, suppressUntil = 0;
  window.addEventListener('pointerdown', event => {
    const card = event.composedPath().find(node => node?.matches?.(CARD_SELECTOR));
    pointerStart = card && event.button === 0 ? {x:event.clientX,y:event.clientY,moved:false} : null;
  }, true);
  window.addEventListener('pointermove', event => {
    if (pointerStart && Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6) pointerStart.moved=true;
  }, true);
  window.addEventListener('pointerup', () => {
    if (pointerStart?.moved) suppressUntil=Date.now()+400;
    pointerStart=null;
  }, true);
  window.addEventListener('click', event => {
    if (Date.now()<suppressUntil && event.composedPath().some(node=>node?.matches?.(CARD_SELECTOR))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('click', event => {
    if (!event.composedPath().some(node=>node?.matches?.('.lx-pick-btn'))) return;
    window.setTimeout(normalizePrompt, 620);
  });
})();

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/reco-names-v137.js */
window.__p0Modules.sources["ua4f3c95b34cb4458"]=function(){
(function(){
'use strict';
if(window.__lxRecoNamesV139)return;window.__lxRecoNamesV139=true;
const cache=new Map(),seen=new WeakMap();
function syncMatchLabel(row){
 const label=row.querySelector('.lx-reco-poc-label');
 if(!label)return;
 let group=label.closest('.lx-reco-poc-label-group');
 if(!group){
  group=document.createElement('div');
  group.className='lx-reco-poc-label-group';
  label.parentNode.insertBefore(group,label);
  group.appendChild(label);
 }
 let match=group.querySelector('.lx-reco-match-label');
 if(!match){
  match=document.createElement('span');
  match.className='lx-reco-match-label';
  group.appendChild(match);
 }
 const value='推荐度：已有 2 项满足';
 if(match.dataset.recommendationSummary!==value){
  match.dataset.recommendationSummary=value;
  match.innerHTML='<svg class="lx-reco-match-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-8a3 3 0 0 1 2 4v4h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7"/></svg><span>'+value+'</span>';
 }
 match.setAttribute('aria-label',value);
}
function detail(sku){
 if(!cache.has(sku))cache.set(sku,fetch('/api/products/'+encodeURIComponent(sku)).then(r=>{if(!r.ok)throw Error('product unavailable');return r.json();}).catch(()=>null));
 return cache.get(sku);
}
async function update(row){
 syncMatchLabel(row);
 const sku=row.getAttribute('data-open-product');
 if(!sku||seen.get(row)===sku)return;
 seen.set(row,sku);
 const product=await detail(sku);
 if(!product||!row.isConnected||row.getAttribute('data-open-product')!==sku)return;
 let specs=product.specs||{};if(typeof specs==='string'){try{specs=JSON.parse(specs);}catch(_){specs={};}}
 const name=String(product.sku_name||product.skuName||product.name||'').trim();
 const spu=String(product.spu_name||product.spuName||specs.spu_name||specs.spuName||'').trim();
 const title=row.querySelector('.lx-reco-poc-copy > strong, .reco-row-main > strong');
 const label=row.querySelector('.lx-reco-poc-label');
 if(title&&name){title.textContent=name;title.title=name;title.classList.toggle("lx-leading-cjk-bracket", /^\s*【/.test(name));}
 if(label){label.textContent=spu;label.title=spu;label.hidden=!spu;}
 const img=row.querySelector('.lx-reco-poc-thumb img');if(img&&name)img.alt=name;
}
let queued=false;
function scan(){queued=false;document.querySelectorAll('.reco-page .lx-reco-poc-row[data-open-product]').forEach(update);}
new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-open-product']});
scan();
})();

(() => {
  const MAX_COMPARE_ITEMS = 5;

  window.addEventListener('click', event => {
    const button = event.composedPath().find(node => node?.matches?.('[data-reco-select]'));
    if (!button || button.dataset.lxProductFlightPending === 'true') return;

    const page = button.closest('.lx-reco-poc-page');
    if (!page) return;

    const selected = button.classList.contains('active');
    const selectedCount = page.querySelectorAll('[data-reco-select].active').length;
    if (!selected && selectedCount >= MAX_COMPARE_ITEMS) return;

    const nextSelected = !selected;
    button.classList.toggle('active', nextSelected);
    button.setAttribute('aria-pressed', nextSelected ? 'true' : 'false');
    button.setAttribute('aria-label', nextSelected ? '取消选择' : '选择商品进行对比');
    button.closest('.lx-reco-poc-row')?.classList.toggle('selected', nextSelected);

    button.animate(
      [
        { transform: 'scale(.96)' },
        { transform: 'scale(1.015)' },
        { transform: 'scale(1)' }
      ],
      { duration: 180, easing: 'cubic-bezier(.22,.61,.36,1)' }
    );
  }, true);
})();

};

/* public/leaip0/assets/frontend/js/core/product-card-detail-loading-v139.js */
window.__p0Modules.sources["ua8d7c44567b25eb5"]=function(){
(() => {
  if (window.__lxProductCardDetailLoadingV139) return;
  window.__lxProductCardDetailLoadingV139 = true;

  const CARD_SELECTOR = [
    '.rank-item',
    '.floor-product',
    '.lx-floor-product',
    '.product-card',
    '.lx-floor-product-card',
    '[data-floor-product]',
    '.lx-sim-card',
    '.lx-p0-product-mini',
    '.reco-row'
  ].join(',');

  const productKey = card => String(
    card?.dataset?.productId ||
    card?.dataset?.sku ||
    card?.dataset?.openProduct ||
    card?.getAttribute?.('data-product-id') ||
    ''
  ).trim();

  const findProduct = (key, card) => {
    const state = window.__lxState || {};
    const pools = [
      state.officialProducts ? Object.values(state.officialProducts) : [],
      state.products,
      state.siteProducts,
      state.refProducts
    ];
    for (const pool of pools) {
      const hit = Array.isArray(pool) && pool.find(item => {
        const sku = String(item?.sku || item?.productId || item?.id || '').trim();
        return sku && sku === key;
      });
      if (hit) return hit;
    }
    const name = card?.querySelector?.('.product-name, .rank-name, .floor-product-name, h3, strong')?.textContent?.trim();
    const image = card?.querySelector?.('img')?.currentSrc || card?.querySelector?.('img')?.src || '';
    const priceText = card?.querySelector?.('.price, .product-price, .rank-price')?.textContent || '';
    const price = Number(String(priceText).replace(/[^\d.]/g, '')) || 0;
    return name ? { sku: key, name, image_url: image, price } : key;
  };

  let openSequence = 0;
  const showGeneration = (ready, sequence) => {
    let settled = false;
    Promise.resolve(ready).then(() => { settled = true; }, () => { settled = true; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const content = document.querySelector('.content');
      if (!content || settled || sequence !== openSequence) return;
      content.querySelectorAll('.lx-page-generating').forEach(node => node.remove());
      const overlay = document.createElement('div');
      overlay.className = 'lx-page-generating';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = '<div class="lx-page-gen-card lx-page-gen-card--aurora"><div class="lx-page-gen-aurora-field" aria-hidden="true"><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--a"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--b"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--c"></i><i class="lx-page-gen-aurora-wave lx-page-gen-aurora-wave--d"></i><span class="lx-page-gen-aurora-lens"></span></div><div class="lx-page-gen-head"><div class="lx-page-gen-copy"><strong>正在生成商品页</strong><em>联想乐享正在整理商品信息、优惠和推荐理由</em></div></div></div>';
      content.appendChild(overlay);
      content.scrollTop = 0;
      content.classList.add('is-generating-tab');
      requestAnimationFrame(() => overlay.classList.add('is-show'));
      Promise.resolve(ready).catch(() => {}).then(() => {
        if (sequence !== openSequence || !overlay.isConnected) { overlay.remove(); return; }
        overlay.classList.add('is-done');
        overlay.classList.remove('is-show');
        content.classList.remove('is-generating-tab');
        window.setTimeout(() => overlay.remove(), 260);
      });
    }));
  };

  const openCard = card => {
    const key = productKey(card);
    if (!key) return false;
    const api = window.__lxAgentAPI;
    if (typeof api?.openProduct !== 'function') return false;
    const sequence = ++openSequence;
    const preserveState = document.body.dataset.state;
    const ready = api.openProduct(findProduct(key, card));
    if (preserveState) document.body.dataset.state = preserveState;
    showGeneration(ready, sequence);
    return true;
  };

  document.addEventListener('click', event => {
    if (event.composedPath().some(node => node?.matches?.('[data-pick-sku], .lx-pick-btn, [data-reco-select], .lx-reco-poc-selector, [data-reco-buy], .lx-reco-poc-buy'))) return;
    const card = event.composedPath().find(node => node?.matches?.(CARD_SELECTOR));
    if (!card || card.closest?.('.product-detail, .lx-product-detail-page')) return;
    if (!openCard(card)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target?.closest?.('[data-pick-sku], .lx-pick-btn, [data-reco-select], .lx-reco-poc-selector, [data-reco-buy], .lx-reco-poc-buy')) return;
    const card = event.target?.closest?.(CARD_SELECTOR);
    if (!card || !openCard(card)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();

};

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/product-intent-turn-guard-v2.js */
window.__p0Modules.sources["u6d7e20c85f4c0e59"]=function(){
(function () {
  "use strict";

  if (window.__lxProductIntentTurnGuardV2) return;
  window.__lxProductIntentTurnGuardV2 = true;

  var PRODUCT_INTENT = /(?:商品|产品|电脑|笔记本|轻薄本|游戏本|台式机|一体机|平板|主机|工作站|服务器|显示器|打印机|手机|耳机|鼠标|键盘|YOGA|ThinkPad|ThinkBook|拯救者|小新|昭阳|开天|问天|机型|型号|配置|显卡|处理器|内存|硬盘|购机|选购|购买|下单|买一|买台|买个|价格|价位|以旧换新|国补|对比.*(?:商品|产品|电脑|笔记本|机型|型号)|比较.*(?:商品|产品|电脑|笔记本|机型|型号)|推荐.*(?:商品|产品|电脑|笔记本|机型|型号)|(?:商品|产品|电脑|笔记本|机型|型号).*推荐|哪[个款台部].*(?:好|值得|适合)|(?:电脑|笔记本|商品|产品).*(?:怎么选|如何选))/i;
  var SERVICE_INTENT = /清灰|清洁|换硅脂|散热保养|整机保养|维修|保修|延保|服务商品|服务产品/;
  var PRODUCT_CARD = ".lx-answer-reco,[data-lxfd-reveal-products],[data-lx-focus-reco],[data-lxfd-reco-id]";
  var lastQuery = "";

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isProductIntent(value) {
    var query = normalize(value);
    // Verified education queries intentionally produce products after the skill completes.
    var education = window.__lxEducationOffers;
    return !!window.__lxComparisonDisplay?.matches(query) ||
      !!window.__lxServiceProducts?.matches(query) ||
      !!(education && education.verified() && education.matches(query)) ||
      !!window.__lxCouponCenter?.matchCouponQuery(query) ||
      PRODUCT_INTENT.test(query) || SERVICE_INTENT.test(query);
  }

  function latestUserQuery(scope) {
    // A restored result belongs to its own turn, not the most recent question.
    var turn = scope && scope.closest && scope.closest(".lx-p0-message,.lxfd-msg,.lxfd-msg-ai");
    if (turn) {
      var previous = turn.previousElementSibling;
      while (previous) {
        if (previous.matches(".lx-p0-message.user,.lxfd-msg.user,.lxfd-msg-user")) return normalize(previous.textContent);
        previous = previous.previousElementSibling;
      }
    }
    var root = scope && scope.closest ? scope.closest(".lx-p0-messages,.lxfd-thread") : null;
    var nodes = (root || document).querySelectorAll(
      ".lx-p0-message.user .user-bubble,.lx-p0-message.msg.user .user-bubble,.lxfd-msg.user,.lxfd-msg-user"
    );
    return nodes.length ? normalize(nodes[nodes.length - 1].textContent) : lastQuery;
  }

  function clearProductTurnState() {
    var states = [window.__lxState, window.__lxfdState, window.__lxChatState];
    states.forEach(function (state) {
      if (!state) return;
      state.lastProducts = null;
      state.lastProductsMeta = null;
      state.officialProducts = null;
    });
  }

  function recordQuery(value) {
    var query = normalize(value);
    if (!query) return;
    lastQuery = query;
    window.__lxCurrentQueryProductIntent = isProductIntent(query);
    if (!window.__lxCurrentQueryProductIntent) clearProductTurnState();
  }

  function readComposer(target) {
    var form = target && target.closest ? target.closest("form,.composer,.lxfd-composer") : null;
    var input = form && form.querySelector("textarea,input:not([type=hidden])");
    return input ? input.value : "";
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".send-btn,.hero-send-btn,.lxfd-send,[data-send],[data-chat-send]")) return;
    recordQuery(readComposer(event.target));
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || !event.target.matches("textarea,input")) return;
    if (!event.target.closest(".composer,.lxfd-composer,.assistant-bottom,.hero-composer")) return;
    recordQuery(event.target.value);
  }, true);

  function removeInvalidProductCards(root) {
    var cards = [];
    if (root && root.matches && root.matches(PRODUCT_CARD)) cards.push(root);
    if (root && root.querySelectorAll) cards = cards.concat(Array.from(root.querySelectorAll(PRODUCT_CARD)));
    cards.forEach(function (card) {
      var query = latestUserQuery(card);
      if (query && !isProductIntent(query)) card.remove();
    });
  }

  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches(".lx-p0-message.user,.lxfd-msg.user,.lxfd-msg-user")) recordQuery(node.textContent);
        removeInvalidProductCards(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  function wrapBridge() {
    var bridge = window.__lxBridge;
    if (!bridge || bridge.__productIntentTurnGuardV2) return;
    bridge.__productIntentTurnGuardV2 = true;
    ["revealProducts", "focusReco"].forEach(function (name) {
      var original = bridge[name];
      if (typeof original !== "function") return;
      bridge[name] = function () {
        var clickedCard = document.activeElement && document.activeElement.closest(PRODUCT_CARD);
        var query = latestUserQuery(clickedCard || document.querySelector(".lx-p0-messages,.lxfd-thread"));
        if (query && !isProductIntent(query)) {
          clearProductTurnState();
          return false;
        }
        return original.apply(this, arguments);
      };
    });
  }

  wrapBridge();
  window.setTimeout(wrapBridge, 0);
  window.setTimeout(wrapBridge, 500);
  removeInvalidProductCards(document);

  window.__lxIsProductIntent = isProductIntent;
})();

};

/* public/leaip0/assets/frontend/js/core/gaming-query-v1.js */
window.__p0Modules.sources["u9b9dcc5b93b2fdcd"]=function(){
(function () {
  'use strict';
  const query = '我想购买一台游戏笔记本电脑';
  // Positions are intentional: the user approved reusing Y9000P twice.
  const slots = ['1054054', '1055587', '1053096', '1055589', '1054054', '1054054', '1052919', '1056246'];
  const marker = 'gaming-notebook-20260911';
  const copy = "根据您的需求，我拆解了以下几个核心条件。\n\n- 产品类型：**游戏笔记本电脑**\n- 使用场景：**游戏娱乐**\n\n根据您的需求（**游戏、笔记本电脑**），以下是几款可供选择的联想笔记本，您可以结合配置、价格和日常使用需求进行挑选：\n\n**拯救者 Y7000X 2026**：搭载酷睿 7 245HX 处理器与 RTX 5060 8GB 独显，配备 32GB 内存和 15.3 英寸屏幕。本次推荐包含碳晶黑与冰魄白两种配置，存储分别为 512GB+1TB SSD 和 512GB SSD，适合关注游戏配置的用户。\n\n**拯救者 Y9000P**：搭载酷睿 Ultra 9 处理器与 RTX 5060 8GB 独显，配备 16 英寸屏幕、64GB 内存和 1TB SSD。大容量内存可兼顾游戏与多任务使用，冰魄白配色也提供了不同的外观选择。\n\n**YOGA Pro 15 Aura 与 YOGA Pro 16 Aura**：均搭载酷睿 Ultra 7 356H 处理器、RTX 5060 显卡、32GB 内存和 1TB SSD，可作为兼顾游戏与内容创作的备选。其中 Pro 16 Aura 配备触控 OLED 屏和灵感妙笔，适合有触控与创作需求的用户。\n\n**YOGA Pro 15 锐龙**：搭载锐龙 AI Max+ 388 处理器，配备 64GB 内存、1TB SSD 和触控 OLED 屏，采用集成显卡，可供同时关注日常办公与创作的用户参考。\n\nAI 生成内容仅供参考，具体价格与配置以商品详情为准。";
  function matches(text) { return String(text || '').replace(/\s/g, '').replace(/[。！!？?]+$/, '') === query; }
  async function load(token) {
    const generation = window.__lxGeneration;
    const rows = await Promise.all([...new Set(slots)].map(async sku => {
      const response = await generation.fetch(token, '/api/products/' + sku, {cache:'no-store'});
      if (!response.ok) throw new Error('商品加载失败');
      const product = await generation.wait(token, response.json());
      if (String(product.sku) !== sku || product.status !== 'active' || (['1054054', '1055587', '1055589'].includes(sku) && !/拯救者/.test(product.name)) || !/笔记本/.test(product.category) || !(Number(product.price)>0) || !product.image_url) throw new Error('商品暂不可用');
      const specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
      return {...product, specs};
    }));
    const bySku = new Map(rows.map(p => [String(p.sku), p]));
    return slots.map((sku, index) => ({...bySku.get(sku), specs:{...bySku.get(sku).specs, lx_gaming_query:marker, lx_gaming_position:index+1}}));
  }

  // Historical cards keep their original result IDs while their full list follows the current order.
  function normalize(items) {
    if (!Array.isArray(items) || items.length !== slots.length) return items;
    const specsOf = p => {
      try { return typeof p?.specs === 'string' ? JSON.parse(p.specs) : p?.specs; } catch (_) { return null; }
    };
    if (!items.every(p => specsOf(p)?.lx_gaming_query === marker)) return items;
    const oldOrder = ['1054054', '1055587', '1054054', '1055589', '1054054', '1053096', '1052919', '1056246'];
    const order = items.map(p => String(p.sku));
    if (!order.every((sku, index) => sku === oldOrder[index] || sku === slots[index])) return items;
    if (order.every((sku, index) => sku === slots[index]) &&
        items.every((p, index) => Number(specsOf(p)?.lx_gaming_position) === index + 1)) return items;
    const pool = items.slice(), updated = [];
    for (let index = 0; index < slots.length; index += 1) {
      const source = pool.findIndex(p => String(p.sku) === slots[index]);
      if (source < 0) return items;
      const product = pool.splice(source, 1)[0], specs = {...specsOf(product), lx_gaming_position:index + 1};
      updated.push({...product, specs:typeof product.specs === 'string' ? JSON.stringify(specs) : specs});
    }
    return updated;
  }
  function migrate() {
    for (const key of ['lexiang.recoPayloads.v1', 'lexiang.resultTabs.v1']) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const records = JSON.parse(raw);
        if (!Array.isArray(records)) continue;
        let changed = false;
        for (const record of records) {
          if (!record || (record.kind && record.kind !== 'reco')) continue;
          const products = normalize(record.products);
          if (products !== record.products) { record.products = products; changed = true; }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(records));
      } catch (_) {}
    }
  }
  function pick(items) {
    if (!Array.isArray(items) || items.length !== 3) return null;
    const positions = items.map(p => p?.specs?.lx_gaming_query === marker ? Number(p.specs.lx_gaming_position) : 0).sort((a,b)=>a-b).join(',');
    return positions === '1,3,4' ? items.find(p=>Number(p.specs.lx_gaming_position)===4) : null;
  }
  function advice(product) { return '结合游戏笔记本的需求，推荐原列表第 4 款「拯救者Y7000X」。所选配置搭载酷睿 7 245HX、RTX 5060 8GB 独显和 32GB 内存；相比本次对比的 Y9000P，价格更低。具体价格与配置请以商品详情为准。'; }
  async function run(adapter) {
    const generation=window.__lxGeneration,token=adapter.token;
    adapter.busy(true);
    try {
      const products=await generation.wait(token,load(token));
      await generation.wait(token,adapter.answer(copy));
      const result=adapter.card(products);
      await generation.wait(token,new Promise(resolve=>generation.timeout(token,resolve,720)));
      if(generation.current(token))adapter.open(products,result);
    } catch(error) {
      console.warn("Gaming recommendation failed", error);
      if(generation.current(token))await generation.wait(token,adapter.answer('推荐商品暂时加载失败，请稍后重新发送这条需求。'));
    } finally { if(generation.current(token)){adapter.busy(false);adapter.save();} }
  }
  window.__lxGamingQuery={matches,load,pick,advice,run,copy,slots,normalize,migrate};
  migrate();
})();

};

/* public/leaip0/assets/frontend/js/core/recruitment-v1.js */
window.__p0Modules.sources["u177ee9fe5b2d4e25"]=function(){
(function () {
  'use strict';
  const runtime = window.__lxQueryResults;
  if (!runtime || window.__lxRecruitment) return;
  const escape = runtime.escape, listId = 'info:recruitment:latest';
  const dataUrl = '/assets/data/recruitment-20260911.json?p0v=deac4c17367b3d33';
  const icon = '<img src="/assets/icons/global-next.svg" alt="" aria-hidden="true">';
  let cached;
  const disclaimer = '由联想乐享 AI 根据官网信息整理，仅供参考；职位状态、完整要求与申请结果以联想招聘官网为准。';
  const meta = job => [job.city,job.direction,'全职',job.experience].map(escape).join(' · ');
  function row(job,index) {
    return `<button type="button" class="lx-job-row" data-job-open="${escape(job.id)}" aria-label="查看${escape(job.title)}招聘详情"><span class="lx-job-row-copy"><span class="lx-job-row-heading"><strong>${escape(job.title)}</strong>${index < 3 ? '<small class="lx-job-recommend">优先推荐</small>' : ''}</span><span class="lx-job-meta">${meta(job)}</span><span class="lx-job-summary">${escape(job.summary)}</span><span class="lx-job-source">联想 · 职位编号 ${escape(job.reqId)}</span></span><span class="lx-job-row-end"><span>${escape(job.posted)} 发布</span><span class="lx-job-detail-link">查看详情 ${icon}</span></span></button>`;
  }
  function list(data) {
    return `<section class="lx-recruitment-page" data-job-list data-job-layout="3"><header class="lx-wp-head lx-job-page-head"><h2>招聘推荐</h2></header><div class="lx-job-list" data-job-rows>${data.jobs.map(row).join('')}</div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
  }
  function bullets(items) { return '<ul>'+items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>'; }
  function detail(payload) {
    const {job,checkedAt} = payload;
    return `<section class="lx-recruitment-page lx-job-detail" data-job-layout="4" data-job-detail="${escape(job.id)}"><div class="lx-job-overview"><header class="lx-job-detail-head"><div class="lx-job-heading-copy"><div class="lx-job-title-row"><button type="button" class="lx-job-back" data-job-back aria-label="返回招聘列表" title="返回招聘列表">${icon}</button><h2>${escape(job.title)}</h2></div><div class="lx-job-heading-body"><div class="lx-job-tags"><span>联想招聘</span><span>${escape(job.direction)}</span><span>全职</span></div>${job.officialTitle !== job.title ? '<p class="lx-job-official-title">官网职位名称：'+escape(job.officialTitle)+'</p>' : ''}<p class="lx-job-lead">${escape(job.summary)}</p><p class="lx-job-source">职位编号 ${escape(job.reqId)} · ${escape(job.posted)} 发布 · ${escape(checkedAt)} 核对</p></div></div><div class="lx-job-apply-area"><button type="button" class="lx-job-primary" data-job-apply="${escape(job.reqId)}" aria-describedby="job-apply-note-${escape(job.reqId)}">一键应聘</button><span id="job-apply-note-${escape(job.reqId)}" data-job-apply-note>应聘流程演示 · 不实际投递</span></div></header><dl class="lx-job-facts"><div><dt>工作地点</dt><dd>${escape(job.city)}</dd></div><div><dt>经验要求</dt><dd>${escape(job.experience)}</dd></div><div><dt>学历要求</dt><dd>${escape(job.education)}</dd></div><div><dt>薪资信息</dt><dd>官网未公开</dd></div></dl></div><section class="lx-job-fit"><div class="lx-job-fit-heading"><h3><img src="/assets/icons/global-sparkle.svg" alt="" aria-hidden="true">乐享推荐</h3><small>AI 整理 · 供方向参考</small></div><p>${escape(job.reason)}</p></section><div class="lx-job-detail-body"><div class="lx-job-requirement-grid"><section class="lx-job-section"><h3>岗位职责</h3>${bullets(job.duties)}</section><section class="lx-job-section"><h3>任职要求</h3>${bullets(job.requirements)}</section></div><section class="lx-job-section lx-job-application"><h3>申请方式</h3><p>点击“一键应聘”向乐享发送当前岗位的应聘请求，体验简历匹配、投递反馈与成功提示。本流程为演示，不读取或发送真实简历；正式应聘请通过下方联想招聘官网入口完成。</p><a href="${escape(job.url)}" target="_blank" rel="noopener noreferrer">查看官方完整职位描述</a></section></div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
  }
  function matches(query) { return /^(?:请|帮我|我想)?(?:查看|看看|查询|了解)?联想(?:最新的?|现在的?|目前的?)?(?:招聘信息|招聘职位|招聘岗位|招聘)(?:有哪些|推荐)?[。！？!?]?$/.test(String(query||'').replace(/\s+/g,'')); }
  async function load() {
    const response = await fetch(dataUrl,{cache:'no-cache'});
    if (!response.ok) throw new Error('招聘列表暂时不可用');
    const data = await response.json();
    if (!data.jobs?.length || data.jobs.some(job=>!job.id || !job.reqId || !job.applyUrl?.startsWith('https://jobs.lenovo.com/'))) throw new Error('职位信息不完整');
    cached = data;
    return data;
  }
  function currentData() {
    const tab = window.__lxState?.tabs?.find(item=>item.id===listId);
    if (tab?.payload?.jobs?.length) return tab.payload;
    if (cached) return cached;
    try { return JSON.parse(localStorage.getItem('lexiang.resultTabs.v1')||'[]').find(item=>item.id===listId)?.payload; } catch { return null; }
  }
  const applyQuery = job => `我要应聘联想的「${job.title}」（${job.reqId}）`;
  function parseApplyQuery(query) {
    return /^我要应聘联想的「([^「」\n]+)」[（(](WD\d+)[）)][。！？!?]?$/.exec(String(query||'').trim());
  }
  async function loadApplication(query) {
    const parsed = parseApplyQuery(query);
    let data = currentData(), job = data?.jobs.find(item=>item.reqId===parsed?.[2]);
    if (!job) { data = await load(); job = data.jobs.find(item=>item.reqId===parsed?.[2]); }
    if (!job) throw new Error('未找到当前应聘岗位');
    // P0 demonstration only: no resume read, match score, email or application API.
    return {job,mode:'demo'};
  }
  function applicationAnswer({job}) {
    return [
      `发现你的简历，**经检测最符合联想「${job.title}」岗位**，无需修改，可直接用于本次应聘。`,
      '模拟投递反馈：我已帮你发送到联想该职位的招聘邮箱，**2 个工作日内会与您联系**，请耐心等待。',
      '**简历投递成功**'
    ].join('\n\n');
  }
  runtime.register('recruitment-application',{
    matches:query=>!!parseApplyQuery(query),load:loadApplication,responseOnly:true,
    skill:'联想招聘应聘（演示）',complete:()=> '已完成 Skill(联想招聘应聘)：演示简历匹配与投递反馈，未实际投递',
    answer:applicationAnswer,
    errorAnswer:'本次**应聘演示未完成**，暂时无法确认对应岗位。请重新打开招聘列表，进入岗位详情后再试。未读取或发送简历。',
    errorStatus:'本次未完成，未找到对应岗位'
  });
  let applying = false;
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-job-apply]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(applying || window.__lxState?.sending)return;
    const page=button.closest('[data-job-detail]'),id=page?.dataset.jobDetail;
    const data=currentData(),tabs=window.__lxState?.tabs||[];
    const job=data?.jobs.find(item=>item.id===id)||tabs.find(tab=>tab.payload?.job?.id===id)?.payload?.job;
    const note=button.parentElement.querySelector('[data-job-apply-note]');
    if(!job || typeof window.__lxBridge?.sendChat!=='function'){
      if(note){note.textContent='暂时无法发起应聘，请重新打开岗位后再试';note.setAttribute('role','status');}
      return;
    }
    applying=true;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='正在处理…';
    try { await window.__lxBridge.sendChat(applyQuery(job)); }
    catch(error) {
      if(note && error?.name!=='AbortError'){note.textContent='本次演示未完成，请重试';note.setAttribute('role','status');}
    } finally {
      applying=false;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='一键应聘';
    }
  },true);
  runtime.register('recruitment-list',{
    matches,load,skill:'联想招聘推荐',complete:data=>'已完成 Skill(联想招聘推荐)：整理 '+data.jobs.length+' 个官方公开职位',
    answer:data=>[
      `已从联想招聘官网整理 **${data.jobs.length} 个近期公开职位**，包含 AI 智能运维、算力产品营销、产品安全与项目管理等方向，信息核对日期为 ${data.checkedAt}。`,
      '目前你还没有提供工作城市和职业背景，我先按**岗位方向与发布时间**整理，方便你在右侧逐项查看相关机会。',
      '点击职位可查看职责和任职要求，详情中的**一键应聘**可体验简历匹配与投递反馈演示，正式应聘请使用详情中的官网入口。AI 整理内容仅供参考，招聘状态与完整要求以官网为准。'
    ].join('\n\n'),cardTitle:'查看招聘推荐',cardDescription:data=>'已整理 '+data.jobs.length+' 个职位 · 查看详情与应聘',
    result:data=>runtime.page('recruitment-list',listId,'招聘推荐',data),render:list
  });
  runtime.register('recruitment-detail',{matches:()=>false,render:detail});
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-job-open],[data-job-back]'); if(!button)return;
    event.preventDefault();
    if(button.hasAttribute('data-job-back')){if(!window.__lxBridge.restoreResultTab(listId)){const data=currentData();if(data)runtime.open(runtime.page('recruitment-list',listId,'招聘推荐',data));}return;}
    const data=currentData(),job=data?.jobs.find(item=>item.id===button.dataset.jobOpen);
    if(job)runtime.open(runtime.page('recruitment-detail','info:recruitment-job:'+job.reqId,job.title+'详情',{job,checkedAt:data.checkedAt}));
  });
  function refreshLegacyPages() {
    const pages=document.querySelectorAll('[data-job-list]:not([data-job-layout="3"]),[data-job-detail]:not([data-job-layout="4"])');
    if(!pages.length)return;
    let stored=[];try{stored=JSON.parse(localStorage.getItem('lexiang.resultTabs.v1')||'[]');}catch{}
    const tabs=window.__lxState?.tabs||[],data=currentData();
    pages.forEach(old=>{
      if(old.hasAttribute('data-job-list')&&data){
        const html=list(data);old.outerHTML=html;
        const tab=tabs.find(item=>item.id===listId)||stored.find(item=>item.id===listId);
        if(tab){tab.html=html;runtime.remember(tab);window.__lxSaveConversationNow?.();}
      }else if(old.dataset.jobDetail){
        const id=old.dataset.jobDetail,tab=tabs.find(item=>item.payload?.job?.id===id),saved=tab||stored.find(item=>item.payload?.job?.id===id);
        const payload=saved?.payload||(data?.jobs.find(job=>job.id===id)?{job:data.jobs.find(job=>job.id===id),checkedAt:data.checkedAt}:null);
        if(!payload)return;
        const html=detail(payload);old.outerHTML=html;
        if(saved){saved.html=html;runtime.remember(saved);window.__lxSaveConversationNow?.();}
      }
    });
  }
  let refreshQueued=false;
  new MutationObserver(()=>{if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;refreshLegacyPages();});}).observe(document.body,{childList:true,subtree:true});
  refreshLegacyPages();
  window.__lxRecruitment={matches,list,detail,load};
})();

};

/* Business: tt */
window.__p0Modules.factories["pages/product-list#tt:2438237bfd05c7c2162378a0"]=function(__p0Scope){"use strict";return (function tt(){(0,__p0Scope.f)(".product-card").forEach((t,e)=>{const n=__p0Scope.d.products[e];if(t.hidden=!n,!n)return;t.dataset.sku=n.sku||"",(0,__p0Scope.mo)(t);const a=(0,__p0Scope.h)(".brand-mini",t),o=(0,__p0Scope.h)(".product-title",t),s=(0,__p0Scope.h)(".spec",t),i=(0,__p0Scope.h)(".price",t),r=(0,__p0Scope.h)(".product-visual",t);let l=(0,__p0Scope.h)(".product-promos",t);if(l||(l=document.createElement("div"),l.className="product-promos",l.setAttribute("aria-label","促销标签"),i?.before(l)),a&&(a.textContent=n.category||"联想"),o&&"business"===__p0Scope.d.page){const t=(0,__p0Scope.Y)(n.name)||"联想商品";o.textContent=(0,__p0Scope.J)(t),o.title=t}else o&&(o.textContent=(0,__p0Scope.Y)(n.name)||"联想商品");if(s&&"business"===__p0Scope.d.page){const t=n.description||n.category||"联想官方正品";s.hidden=!1,s.textContent=(0,__p0Scope.Q)(t,n.category),s.title=t}else if(s){const t=n.description||n.category||"官方正品｜联想服务";s.hidden=!1,s.textContent=t,s.title=t}if(l){const t=Array.isArray(n.promotion_tags)&&n.promotion_tags.length?n.promotion_tags:["官方优惠","限时优惠"];l.innerHTML=t.slice(0,2).map(t=>`<span class="product-promo">${(0,__p0Scope.v)(t)}</span>`).join("")}if(i){const t="business"===__p0Scope.d.page&&"verified"===(0,__p0Scope.Sn)().status&&Number(n.price)>0;i.innerHTML=t?`${(0,__p0Scope.x)(Math.round(.95*n.price))}<span class="price-from">企业价</span><s class="lx-edu-orig">${(0,__p0Scope.x)(n.price)}</s>`:`${(0,__p0Scope.x)(n.price)}<span class="price-from">起</span>`}if(r){r.innerHTML=`<img src="${(0,__p0Scope.v)((0,__p0Scope.L)(n.image_url))}" alt="${(0,__p0Scope.v)(n.name||"商品图片")}" />`;const t=(String(n.name||"").match(/小新|拯救者|YOGA|ThinkPad|ThinkBook|ThinkStation|ThinkVision|thinkplus|moto|来酷|Lecoo|天逸|扬天|开天|昭阳|启天|问天|GeekPro|LEGION/i)||[])[0];t&&"business"!==__p0Scope.d.page&&r.insertAdjacentHTML("afterbegin",`<span class="lx-cat-badge">${(0,__p0Scope.v)(/legion/i.test(t)?"拯救者":/lecoo/i.test(t)?"来酷":t)}</span>`);const e=String(n.sku||"").split("").reduce((t,e)=>(31*t+e.charCodeAt(0))%9973,7),a=[`本周 ${120+e%880} 人看过`,`仅剩 ${3+e%9} 台`,`今日 ${5+e%40} 人加购`][e%3];r.insertAdjacentHTML("beforeend",`<span class="lx-social-badge">${a}</span>`)}})}); };

/* Business: co */
window.__p0Modules.factories["pages/product-list#co:2a7061a7df2a7746e4172b71"]=function(__p0Scope){"use strict";return (function co(t,e,n,a){const lxSelectedSkus=new Set((__p0Scope.d.refProducts||[]).filter(item=>item&&item.type!=="solution").map(item=>String(item.sku||"")).filter(Boolean));__p0Scope.d.recoCompareSelection=Array.from(lxSelectedSkus);document.querySelectorAll("[data-reco-select]").forEach(button=>{const selected=lxSelectedSkus.has(String(button.dataset.recoSelect||""));button.classList.toggle("active",selected);button.setAttribute("aria-pressed",selected?"true":"false");button.setAttribute("aria-label",selected?"取消选择":"选择商品");button.closest(".lx-reco-poc-row")?.classList.toggle("selected",selected)});document.querySelectorAll(".lx-reco-poc-compare[data-cmp-local]").forEach(button=>{const all=String(button.dataset.cmpAll||"").split(",").filter(Boolean);const selected=all.filter(sku=>lxSelectedSkus.has(sku));button.dataset.cmpLocal=selected.join(",");const bar=button.closest("#lx-reco-poc-bottom");const count=bar?.querySelector("[data-reco-selected-count]"),label=bar?.querySelector("[data-reco-compare-label]"),text=bar?.querySelector("[data-reco-selected-text]");if(count)count.textContent=String(selected.length||all.length);if(label)label.textContent=selected.length?`对比这 ${selected.length} 款`:`对比全部 ${all.length} 款`;if(text)text.textContent=selected.length?`已选择 ${selected.length} 款，点击进行对比`:`未选择时默认对比全部 ${all.length} 款`});queueMicrotask(()=>window.__lxSyncFloorPicks?.());if(!e)return;if(!Array.isArray(__p0Scope.d.refProducts)||!__p0Scope.d.refProducts.length)return e.replaceChildren(),t?.classList.remove("has"),a?.classList.remove("pulse"),void(n?.dataset.originPlaceholder&&(n.placeholder=n.dataset.originPlaceholder));n&&!n.dataset.originPlaceholder&&(n.dataset.originPlaceholder=n.placeholder||"最近有什么优惠活动？");const o=__p0Scope.d.refProducts.length,s=__p0Scope.d.refProducts.map((t,e)=>{const n=t.image_url||"/assets/product-placeholder.svg",a=`<button type="button" data-ref-remove-idx="${e}" aria-label="移除" style="width:16px;height:16px;border:none;background:none;cursor:pointer;color:#979797;font-size:15px;line-height:1;padding:0;flex-shrink:0;">×</button>`;if(1===o){const o=[t.price?`¥${t.price}`:"",String(t.description||"").slice(0,30)].filter(Boolean).join(" · ");return`<span class="lx-ref-chip-rich" data-ref-chip-idx="${e}" style="flex:0 1 auto;max-width:360px;display:inline-flex;align-items:center;gap:9px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:10px;padding:7px 11px;">\n                <img src="${(0,__p0Scope.v)(n)}" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:6px;flex-shrink:0;">\n                <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">\n                  <span style="font-size:13px;font-weight:600;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${(0,__p0Scope.v)(String(t.name||""))}</span>\n                  ${o?`<span style="font-size:11px;color:#979797;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${(0,__p0Scope.v)(o)}</span>`:""}\n                </span>\n                ${a}\n              </span>`}return`<span class="lx-ref-chip-mini" data-ref-chip-idx="${e}" style="flex:1 1 0;min-width:0;display:inline-flex;align-items:center;gap:6px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:8px;padding:5px 7px;">\n              <img src="${(0,__p0Scope.v)(n)}" alt="" style="width:30px;height:30px;object-fit:contain;border-radius:5px;flex-shrink:0;">\n              <span style="min-width:0;flex:1;font-size:12px;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(0,__p0Scope.v)(String(t.name||""))}</span>\n              ${a}\n            </span>`}).join("");e.innerHTML=`<div class="lx-ref-chips" style="display:flex;gap:9px;align-items:stretch;padding:6px 2px 3px;">${s}</div>`,t?.classList.add("has"),a?.classList.add("pulse");const i=__p0Scope.d.refProducts.every(t=>"solution"===t.type),r=__p0Scope.d.refProducts.every(t=>"solution"!==t.type);if(n&&(n.placeholder=i?1===o?"想了解这个方案的什么？比如能力、场景、如何落地…":"想了解这几个方案的什么？比如能力、对比、如何落地…":1===o?"帮我解读该商品":"想了解这几款商品的什么？比如优惠、对比、是否适合我…"),n){const t=i?"帮我对比下这几款方案":r?(o===1?"帮我解读该商品":"帮我对比下这几款商品"):"",e=n.dataset.refAutoPrompt||n.dataset.solutionAutoPrompt||"";t&&(o>=2||r&&o===1)&&(!n.value.trim()||n.value===e)?(n.value=t,n.dataset.refAutoPrompt=t,delete n.dataset.solutionAutoPrompt,n.dispatchEvent(new Event("input",{bubbles:!0}))):(!t||o<2)&&e&&n.value===e&&(n.value="",delete n.dataset.refAutoPrompt,delete n.dataset.solutionAutoPrompt,n.dispatchEvent(new Event("input",{bubbles:!0})))}e.querySelectorAll("[data-ref-remove-idx]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const n=Number(t.dataset.refRemoveIdx);if(isNaN(n))return;const a=__p0Scope.d.refProducts[n];__p0Scope.d.refProducts.splice(n,1),a?.sku&&document.querySelectorAll(`.lx-pick-btn[data-pick-sku="${CSS.escape(a.sku)}"]`).forEach(t=>{t.classList.remove("picked"),t.setAttribute("aria-pressed","false")});const o=document.querySelector(".composer"),s=o?.querySelector("textarea"),i=o?.querySelector(".send-btn"),r=o?.querySelector(":scope > .attach");(0,__p0Scope.co)(o,r,s,i)},{once:!0})})}); };

/* Business: co */
window.__p0Modules.factories["pages/product-list#co:266bb85b2fbe14e0debdd868"]=function(__p0Scope){"use strict";return (function co(t,e,n,a){const lxSelectedSkus=new Set((__p0Scope.d.refProducts||[]).filter(item=>item&&item.type!=="solution").map(item=>String(item.sku||"")).filter(Boolean));__p0Scope.d.recoCompareSelection=Array.from(lxSelectedSkus);document.querySelectorAll("[data-reco-select]").forEach(button=>{const selected=lxSelectedSkus.has(String(button.dataset.recoSelect||""));button.classList.toggle("active",selected);button.setAttribute("aria-pressed",selected?"true":"false");button.setAttribute("aria-label",selected?"取消选择":"选择商品");button.closest(".lx-reco-poc-row")?.classList.toggle("selected",selected)});document.querySelectorAll(".lx-reco-poc-compare[data-cmp-local]").forEach(button=>{const all=String(button.dataset.cmpAll||"").split(",").filter(Boolean);const selected=all.filter(sku=>lxSelectedSkus.has(sku));button.dataset.cmpLocal=selected.join(",");const bar=button.closest("#lx-reco-poc-bottom");const count=bar?.querySelector("[data-reco-selected-count]"),label=bar?.querySelector("[data-reco-compare-label]"),text=bar?.querySelector("[data-reco-selected-text]");if(count)count.textContent=String(selected.length||all.length);if(label)label.textContent=selected.length?`对比这 ${selected.length} 款`:`对比全部 ${all.length} 款`;if(text)text.textContent=selected.length?`已选择 ${selected.length} 款，点击进行对比`:`未选择时默认对比全部 ${all.length} 款`});if(!e)return;if(!Array.isArray(__p0Scope.d.refProducts)||!__p0Scope.d.refProducts.length)return e.replaceChildren(),t?.classList.remove("has"),a?.classList.remove("pulse"),void(n?.dataset.originPlaceholder&&(n.placeholder=n.dataset.originPlaceholder));n&&!n.dataset.originPlaceholder&&(n.dataset.originPlaceholder=n.placeholder||"最近有什么优惠活动？");const o=__p0Scope.d.refProducts.length,s=__p0Scope.d.refProducts.map((t,e)=>{const n=t.image_url||"/assets/product-placeholder.svg",a=`<button type="button" data-ref-remove-idx="${e}" aria-label="移除" style="width:16px;height:16px;border:none;background:none;cursor:pointer;color:#979797;font-size:15px;line-height:1;padding:0;flex-shrink:0;">×</button>`;if(1===o){const o=[t.price?`¥${t.price}`:"",String(t.description||"").slice(0,30)].filter(Boolean).join(" · ");return`<span class="lx-ref-chip-rich" data-ref-chip-idx="${e}" style="flex:0 1 auto;max-width:360px;display:inline-flex;align-items:center;gap:9px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:10px;padding:7px 11px;">\n                <img src="${(0,__p0Scope.v)(n)}" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:6px;flex-shrink:0;">\n                <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">\n                  <span style="font-size:13px;font-weight:600;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${(0,__p0Scope.v)(String(t.name||""))}</span>\n                  ${o?`<span style="font-size:11px;color:#979797;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${(0,__p0Scope.v)(o)}</span>`:""}\n                </span>\n                ${a}\n              </span>`}return`<span class="lx-ref-chip-mini" data-ref-chip-idx="${e}" style="flex:1 1 0;min-width:0;display:inline-flex;align-items:center;gap:6px;background:#f3f0f7;border:1px solid #e2ddeb;border-radius:8px;padding:5px 7px;">\n              <img src="${(0,__p0Scope.v)(n)}" alt="" style="width:30px;height:30px;object-fit:contain;border-radius:5px;flex-shrink:0;">\n              <span style="min-width:0;flex:1;font-size:12px;color:#252525;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(0,__p0Scope.v)(String(t.name||""))}</span>\n              ${a}\n            </span>`}).join("");e.innerHTML=`<div class="lx-ref-chips" style="display:flex;gap:9px;align-items:stretch;padding:6px 2px 3px;">${s}</div>`,t?.classList.add("has"),a?.classList.add("pulse");const i=__p0Scope.d.refProducts.every(t=>"solution"===t.type),r=__p0Scope.d.refProducts.every(t=>"solution"!==t.type);if(n&&(n.placeholder=i?1===o?"想了解这个方案的什么？比如能力、场景、如何落地…":"想了解这几个方案的什么？比如能力、对比、如何落地…":1===o?"帮我解读该商品":"想了解这几款商品的什么？比如优惠、对比、是否适合我…"),n){const t=i?"帮我对比下这几款方案":r?(o===1?"帮我解读该商品":"帮我对比下这几款商品"):"",e=n.dataset.refAutoPrompt||n.dataset.solutionAutoPrompt||"";t&&(o>=2||r&&o===1)&&(!n.value.trim()||n.value===e)?(n.value=t,n.dataset.refAutoPrompt=t,delete n.dataset.solutionAutoPrompt,n.dispatchEvent(new Event("input",{bubbles:!0}))):(!t||o<2)&&e&&n.value===e&&(n.value="",delete n.dataset.refAutoPrompt,delete n.dataset.solutionAutoPrompt,n.dispatchEvent(new Event("input",{bubbles:!0})))}e.querySelectorAll("[data-ref-remove-idx]").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const n=Number(t.dataset.refRemoveIdx);if(isNaN(n))return;const a=__p0Scope.d.refProducts[n];__p0Scope.d.refProducts.splice(n,1),a?.sku&&document.querySelectorAll(`.lx-pick-btn[data-pick-sku="${CSS.escape(a.sku)}"]`).forEach(t=>{t.classList.remove("picked"),t.setAttribute("aria-pressed","false")});const o=document.querySelector(".composer"),s=o?.querySelector("textarea"),i=o?.querySelector(".send-btn"),r=o?.querySelector(":scope > .attach");(0,__p0Scope.co)(o,r,s,i)},{once:!0})})}); };
}
window.__p0Modules.dispatch(document.currentScript);
