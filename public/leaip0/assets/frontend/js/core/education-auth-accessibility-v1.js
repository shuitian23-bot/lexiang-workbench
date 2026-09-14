/* Common keyboard contract. Close through each component's own handler. */
(() => {
  if (window.__lxEducationAccessibilityV1) return;
  window.__lxEducationAccessibilityV1 = true;
  const selector = '.lx-p0-modal:has(.lx-stuauth-modal),.lx-p0-modal:has(.lx-edu-success-lead)';
  const closeSelector = '.lx-p0-close,[data-modal-close]';
  const visible = el => el.isConnected && !el.closest('[aria-hidden="true"],[hidden]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const focusables = el => [...el.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(visible);
  const openers = new WeakMap();
  let current = null, previousFocus = null, scheduled = false;
  document.addEventListener('pointerdown', e => { if (!e.target.closest(selector)) previousFocus = e.target.closest('button,a,[tabindex]') || document.activeElement; }, true);
  const top = () => [...document.querySelectorAll(selector)].filter(visible).sort((a,b) => {
    const z = el => Number(getComputedStyle(el.closest('.lx-p0-modal-mask,.leai-modal-mask,[data-buy-modal-direct]') || el).zIndex)||0;
    return z(a)-z(b);
  }).pop();
  function sync() {
    scheduled = false;
    const next = top();
    if (next) {
      const labelledBy = next.getAttribute('aria-labelledby');
      if (labelledBy && !document.getElementById(labelledBy)) next.removeAttribute('aria-labelledby');
      if (!next.hasAttribute('aria-labelledby')) {
        const title = next.querySelector('h2,.lx-p0-modal-title')?.textContent?.trim();
        if (title && next.getAttribute('aria-label') !== title) next.setAttribute('aria-label',title);
      }
    }
    if (next === current) return;
    const old = current; current = next;
    if (old && !visible(old)) {
      const opener = openers.get(old);
      if (opener && visible(opener) && (!next || next.contains(opener))) opener.focus({preventScroll:true});
    }
    if (!next) return;
    openers.set(next, previousFocus || document.activeElement);
    next.setAttribute('role','dialog'); next.setAttribute('aria-modal','true');
    if (!next.hasAttribute('aria-label') && !next.hasAttribute('aria-labelledby')) next.setAttribute('aria-label',next.querySelector('h2,.lx-p0-modal-title')?.textContent?.trim() || (next.classList.contains('lx-auth-modal')?'账号登录':'详情'));
    const close = next.querySelector(closeSelector);
    if (close && !close.getAttribute('aria-label')) close.setAttribute('aria-label','关闭弹窗');
    next.querySelectorAll('input[placeholder]').forEach(input => {
      if (!input.labels?.length && !input.hasAttribute('aria-label')) input.setAttribute('aria-label',input.getAttribute('placeholder'));
    });
    if (!next.contains(document.activeElement)) (focusables(next)[0] || next).focus({preventScroll:true});
  }
  new MutationObserver(() => {if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
  document.addEventListener('keydown', e => {
    const dialog = top(); if (!dialog) return;
    if (e.key === 'Escape') {
      const close = dialog.querySelector(closeSelector);
      if (close) {e.preventDefault();e.stopImmediatePropagation();close.click();}
    } else if (e.key === 'Tab') {
      const items=focusables(dialog),first=items[0],last=items[items.length-1];
      if(!first){e.preventDefault();return;}
      if(!dialog.contains(document.activeElement) || (!e.shiftKey && document.activeElement===last) || (e.shiftKey && document.activeElement===first)) {e.preventDefault();(e.shiftKey?last:first).focus();}
    }
  },true);
})();
