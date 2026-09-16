/* Migrated from the 8783 reference's shop-tabbar-chrome-v171.js.
 * Keep its natural-width / equal-compression layout across all five entries.
 * Every tab remains in the row; page identity, activation and closing stay
 * owned by the existing tab manager.
 */
(() => {
  'use strict';
  if (window.__lxTabbarCompression) return;
  window.__lxTabbarCompression = true;
  const selector = '.content > .lx-tabbar';
  const bars = new Map();
  let scheduled = false;

  function layout(bar) {
    if (!bar.isConnected || bar.hidden || !bar.clientWidth) return;
    bar.classList.remove('lx-tabbar-overflowing');
    const tabs = [...bar.querySelectorAll(':scope > .lx-tab')];
    tabs.forEach(tab => {
      const title = tab.querySelector('.lx-tab-label')?.textContent?.trim() || '';
      if (tab.title !== title) tab.title = title;
    });
    if (tabs.length <= 1) return;
    const style = getComputedStyle(bar);
    const gap = Number.parseFloat(style.columnGap) || 6;
    const available = bar.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
    const naturalRequired = tabs.reduce((width, tab) => width + tab.getBoundingClientRect().width, 0) + (tabs.length - 1) * gap;
    if (naturalRequired <= available) return;
    bar.classList.add('lx-tabbar-overflowing');
    bar.scrollLeft = 0;
  }

  function refresh() {
    scheduled = false;
    for (const [bar, observers] of bars) {
      if (!bar.isConnected) {
        observers.forEach(observer => observer.disconnect());
        bars.delete(bar);
      }
    }
    document.querySelectorAll(selector).forEach(bar => {
      if (!bars.has(bar)) {
        bar.setAttribute('data-lx-tab-compression', '');
        const mutation = new MutationObserver(scheduleLayout);
        mutation.observe(bar, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden'] });
        const resize = new ResizeObserver(scheduleLayout);
        resize.observe(bar);
        bars.set(bar, [mutation, resize]);
      }
      layout(bar);
    });
  }

  function scheduleLayout() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  function attach() {
    new MutationObserver(records => {
      const containsBar = node => node.nodeType === 1 && (node.matches('.lx-tabbar') || node.querySelector('.lx-tabbar'));
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(containsBar))) scheduleLayout();
    }).observe(document.body, { childList: true, subtree: true });
    scheduleLayout();
    document.fonts?.ready.then(scheduleLayout);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();
  window.addEventListener('resize', scheduleLayout);
})();
