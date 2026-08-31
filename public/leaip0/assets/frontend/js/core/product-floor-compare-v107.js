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
  style.dataset.productFloorCompare = 'v107';
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

  const cardSku = card => String(card?.dataset?.sku || card?.dataset?.productId || card?.dataset?.openProduct || card?.dataset?.floorProduct || '').trim();

  function enhanceCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const sku = cardSku(card);
    if (!sku) return;
    // 接入主应用既有商品引用状态、飞入动画和对比页，不复制业务状态。
    if (!card.classList.contains('lx-floor-product')) card.classList.add('lx-floor-product');
    if (card.dataset.sku !== sku) card.dataset.sku = sku;
    // 勾选按钮由本补丁先注入时，主应用会跳过重复初始化；因此需在这里
    // 同步补齐原生商品/解决方案卡使用的 draggable 标记。
    if (!card.draggable) card.draggable = true;
    let button = card.querySelector(':scope > .lx-pick-btn');
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
  }

  function enhance(root = document) {
    if (root.matches?.(CARD_SELECTOR)) enhanceCard(root);
    root.querySelectorAll?.(CARD_SELECTOR).forEach(enhanceCard);
  }

  function normalizePrompt() {
    const textarea = document.querySelector('.assistant-panel .composer textarea, .composer textarea');
    if (!textarea) return;
    const refs = window.__lxState?.refProducts;
    if (!Array.isArray(refs)) return;
    const products = refs.filter(item => item.type !== 'solution');
    const selectedSkus = new Set(products.map(item => String(item.sku)));
    const selected = selectedSkus.size;
    document.querySelectorAll(PICK_SELECTOR).forEach(button => {
      const picked = selectedSkus.has(button.dataset.pickSku);
      if (button.classList.contains('picked') !== picked) button.classList.toggle('picked', picked);
      if (button.getAttribute('aria-pressed') !== String(picked)) button.setAttribute('aria-pressed', String(picked));
    });
    const current = textarea.value.trim();
    if (selected >= 2 && (!current || AUTO_PROMPTS.has(current))) {
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
  }

  enhance();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => node.nodeType === 1 && enhance(node));
    }
    queueMicrotask(normalizePrompt);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
  document.addEventListener('click', event => {
    if (!event.target.closest?.('.lx-pick-btn')) return;
    window.setTimeout(normalizePrompt, 620);
  });
})();
