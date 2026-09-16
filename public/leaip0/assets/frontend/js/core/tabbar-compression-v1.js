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

  let stickyScheduled = false;

  function updateSticky(bar) {
    const content = bar.parentElement;
    if (!bar.isConnected || !content) return;
    const style = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    const viewport = content.getBoundingClientRect();
    const stuck = !bar.hidden && bar.clientWidth > 0 && style.position === 'sticky'
      && content.scrollTop > 1
      && rect.top <= viewport.top + content.clientTop + (Number.parseFloat(style.top) || 0) + 1;
    if (stuck) {
      const start = viewport.left + content.clientLeft;
      const insets = {
        '--lx-tabbar-bleed-left': Math.max(0, rect.left - start),
        '--lx-tabbar-bleed-right': Math.max(0, start + content.clientWidth - rect.right)
      };
      for (const [property, value] of Object.entries(insets)) {
        const pixels = value + 'px';
        if (bar.style.getPropertyValue(property) !== pixels) bar.style.setProperty(property, pixels);
      }
    }
    bar.classList.toggle('lx-tabbar-stuck', stuck);
  }

  function scheduleSticky() {
    if (stickyScheduled) return;
    stickyScheduled = true;
    requestAnimationFrame(() => {
      stickyScheduled = false;
      bars.forEach((observers, bar) => updateSticky(bar));
    });
  }

  function layout(bar) {
    updateSticky(bar);
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
        mutation.observe(bar.parentElement, { attributes: true, attributeFilter: ['data-view', 'class'] });
        const resize = new ResizeObserver(scheduleLayout);
        resize.observe(bar);
        resize.observe(bar.parentElement);
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
  document.addEventListener('scroll', event => {
    if (event.target?.matches?.('.content')) scheduleSticky();
  }, true);
})();
