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
  style.dataset.productFloorCompare = 'v123';
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
  document.head.appendChild(style);
  const roots = new Set([document]);
  window.__lxFloorFindCard = sku => {
    for (const root of roots) {
      const found = Array.from(root.querySelectorAll(CARD_SELECTOR)).find(card => cardSku(card) === String(sku));
      if (found) return found;
    }
  };
  const all = selector => Array.from(roots).flatMap(root => Array.from(root.querySelectorAll(selector)));

  const cardSku = card => String(card?.dataset?.productId || card?.dataset?.sku || card?.dataset?.openProduct || card?.dataset?.floorProduct || '').trim();

  function enhanceCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const sku = cardSku(card);
    if (!sku) return;
    // 接入主应用既有商品引用状态、飞入动画和对比页，不复制业务状态。

    if (card.dataset.sku !== sku) card.dataset.sku = sku;
    // 勾选按钮由本补丁先注入时，主应用会跳过重复初始化；因此需在这里
    // 同步补齐原生商品/解决方案卡使用的 draggable 标记。
    if (!card.draggable) card.draggable = true;
    let button = Array.from(card.children).find(child => child.classList.contains('lx-pick-btn'));
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'lx-pick-btn';
      button.dataset.pickSku = sku;
      button.title = '选择商品进行对比';
      button.setAttribute('aria-label', '选择商品进行对比');
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<img src="../icons/global-check.svg" alt="" aria-hidden="true">';
      card.appendChild(button);
    }
    if (button.dataset.pickSku !== sku) button.dataset.pickSku = sku;
  }

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
  function normalizePrompt() {
    const textarea = document.querySelector('.assistant-panel .composer textarea, .composer textarea');
    if (!textarea) return;
    const refs = window.__lxState?.refProducts;
    if (!Array.isArray(refs)) return;
    const products = refs.filter(item => item.type !== 'solution');
    const selectedSkus = new Set(products.map(item => String(item.sku)));
    const selected = selectedSkus.size;
    all(PICK_SELECTOR).forEach(button => {
      const picked = selectedSkus.has(button.dataset.pickSku);
      if (button.classList.contains('picked') !== picked) button.classList.toggle('picked', picked);
      if (button.getAttribute('aria-pressed') !== String(picked)) button.setAttribute('aria-pressed', String(picked));
    });
    const current = textarea.value.trim();
    if (selected >= 2 && (selected !== previousSelected || !current || AUTO_PROMPTS.has(current))) {
      if (textarea.value !== '对比这几款商品') {
        textarea.value = '对比这几款商品';
        textarea.dataset.refAutoPrompt = '对比这几款商品';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (selected < 2 && AUTO_PROMPTS.has(current)) {
      textarea.value = '';
      delete textarea.dataset.refAutoPrompt;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    previousSelected = selected;
  }

  const observer = new MutationObserver(records => {
    for (const root of roots) if (root.host && !root.querySelector("style[data-product-floor-compare]")) root.appendChild(style.cloneNode(true));
    for (const record of records) {
      if (record.type === "attributes") enhanceCard(record.target);
      record.addedNodes.forEach(node => node.nodeType === 1 && enhance(node));
    }
    queueMicrotask(normalizePrompt);
  });
  function observe(root) {
    observer.observe(root === document ? document.body : root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-product-id', 'data-sku', 'data-open-product'] });
  }
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
