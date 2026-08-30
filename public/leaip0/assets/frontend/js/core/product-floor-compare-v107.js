(() => {
  const CARD_SELECTOR = '.rank-item, .floor-product, .lx-floor-product, .product-card, .lx-floor-product-card, [data-floor-product]';
  const AUTO_PROMPTS = new Set(['帮我对比下这几款商品', '请帮我对比这几款商品', '对比这几款商品']);

  const style = document.createElement('style');
  style.dataset.productFloorCompare = 'v107';
  style.textContent = `
    ${CARD_SELECTOR}{position:relative}
    ${CARD_SELECTOR} > .lx-pick-btn{
      position:absolute;top:16px;right:16px;z-index:12;width:24px;height:24px;
      display:grid;place-items:center;padding:0;border:2px solid #b9a8ca;border-radius:6px;
      background:#fff;opacity:0;transform:scale(.9);cursor:pointer;
      transition:opacity .2s ease,transform .2s ease,background .2s ease,border-color .2s ease;
    }
    ${CARD_SELECTOR}:hover > .lx-pick-btn,
    ${CARD_SELECTOR}:focus-within > .lx-pick-btn,
    ${CARD_SELECTOR}.is-checked > .lx-pick-btn,
    ${CARD_SELECTOR} > .lx-pick-btn.picked{opacity:1;transform:scale(1)}
    ${CARD_SELECTOR} > .lx-pick-btn:hover{border-color:#4d144a;background:#f7f1f8}
    ${CARD_SELECTOR} > .lx-pick-btn.picked{border-color:#4d144a;background:#4d144a}
    ${CARD_SELECTOR} > .lx-pick-btn img{display:none!important}
    ${CARD_SELECTOR} > .lx-pick-btn::after{
      content:'';width:6px;height:11px;border-right:2px solid transparent;border-bottom:2px solid transparent;
      transform:rotate(45deg) translate(-1px,-1px);transition:border-color .2s ease;
    }
    ${CARD_SELECTOR} > .lx-pick-btn.picked::after{border-color:#fff}
  `;
  document.head.appendChild(style);

  const cardSku = card => String(card?.dataset?.sku || card?.dataset?.productId || card?.dataset?.openProduct || card?.dataset?.floorProduct || '').trim();

  function enhanceCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const sku = cardSku(card);
    if (!sku) return;
    // 接入主应用既有商品引用状态、飞入动画和对比页，不复制业务状态。
    card.classList.add('lx-floor-product');
    card.dataset.sku = sku;
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
    const selected = document.querySelectorAll('.lx-pick-btn.picked').length;
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
