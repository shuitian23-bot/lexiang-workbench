/* Product detail links navigate directly; they never enter the chat or purchase flow. */
(function () {
  'use strict';
  if (window.__lxProductDetailNavigationV1) return;
  window.__lxProductDetailNavigationV1 = true;

  // Temporary product destination requested for the P0 prototype.
  const DETAIL_URL = 'https://item.lenovo.com.cn/product/1054438.html';
  const DETAIL_ACTION = '[data-product-detail-external], [data-occ-view-detail], [data-coupon-product-open], [data-solution-product-detail]';
  const PRODUCT_SCOPE = '.product-detail, .product-card, .lx-floor-product, .lx-reco-poc-row, [data-open-product], [data-product-id], [data-sku]';
  const clean = value => String(value || '').replace(/\s+/g, '');

  function syncDetail(detail) {
    const title = detail.querySelector('[data-detail-title], .detail-title');
    const target = /刃7000K超能版/i.test(clean(title?.textContent));
    detail.querySelectorAll('.detail-primary').forEach(button => {
      if (target) {
        if (!button.hasAttribute('data-product-detail-external')) {
          button.dataset.externalDetailOriginalCopy = button.textContent;
          if (button.hasAttribute('aria-label')) button.dataset.externalDetailOriginalAria = button.getAttribute('aria-label');
          button.setAttribute('data-product-detail-external', '1');
        }
        if (button.textContent !== '查看详情') button.textContent = '查看详情';
        if (button.hasAttribute('aria-label')) button.setAttribute('aria-label', '查看详情');
      } else if (button.hasAttribute('data-product-detail-external')) {
        if (clean(button.textContent) === '查看详情') button.textContent = button.dataset.externalDetailOriginalCopy || '一键领优惠下单';
        if (button.dataset.externalDetailOriginalAria !== undefined) button.setAttribute('aria-label', button.dataset.externalDetailOriginalAria);
        button.removeAttribute('data-product-detail-external');
        delete button.dataset.externalDetailOriginalCopy;
        delete button.dataset.externalDetailOriginalAria;
      }
    });
  }

  // Capture before card, query and order handlers, while the user gesture can open a tab.
  window.addEventListener('click', event => {
    const target = event.composedPath().find(node => node instanceof Element);
    if (!target) return;
    const button = target.closest('button, a, [role="button"]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const detail = button.closest('.product-detail');
    if (detail && button.matches('.detail-primary')) syncDetail(detail);
    const isProductDetail = button.matches(DETAIL_ACTION) ||
      (/^查看详情[→›]?$/.test(clean(button.textContent)) && button.closest(PRODUCT_SCOPE));
    if (!isProductDetail) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(DETAIL_URL, '_blank', 'noopener,noreferrer');
  }, true);

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      document.querySelectorAll('.product-detail').forEach(syncDetail);
    });
  }
  document.addEventListener('lx:product-detail-rendered', schedule);
  new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      return target?.closest('.product-detail') || [...record.addedNodes].some(node =>
        node.nodeType === 1 && (node.matches('.product-detail') || node.querySelector('.product-detail')));
    })) schedule();
  }).observe(document.documentElement, {childList: true, subtree: true, characterData: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();
})();
