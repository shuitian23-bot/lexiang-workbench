(function () {
  'use strict';
  const selector = '.content .lx-solution-floor[data-solution-industry="制造"]';
  let queued = false;
  const observed = new WeakSet();
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  }
  function sync() {
    document.querySelectorAll(selector).forEach(floor => {
      if (!floor.getClientRects().length) return;
      const grid = floor.querySelector('.lx-floor-body'), content = floor.closest('.content');
      if (!grid || !content) return;
      if (resize && !observed.has(content)) { observed.add(content); resize.observe(content); }
      const originals = Array.from(grid.children).filter(card => card.matches('.lx-solution-card') && !card.hasAttribute('data-lx-manufacturing-repeat'));
      if (!originals.length) return;
      const columns = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length);
      const target = Math.max(originals.length, columns * 3);
      // Reuse the six approved manufacturing entries; keep their original detail/compare identities.
      if (grid.children.length !== target) {
        grid.querySelectorAll('[data-lx-manufacturing-repeat]').forEach(card => card.remove());
        const fragment = document.createDocumentFragment();
        for (let index = originals.length; index < target; index += 1) {
          const card = originals[index % originals.length].cloneNode(true);
          card.setAttribute('data-lx-manufacturing-repeat', '1');
          card.removeAttribute('id');
          card.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
          fragment.appendChild(card);
        }
        grid.appendChild(fragment);
      }
      const selected = floor.closest('.lx-solution-center-page')?.dataset.solutionSelected;
      const top = selected === '制造' ? Math.max(0, grid.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop) : 140;
      const gap = parseFloat(getComputedStyle(grid).rowGap) || 14;
      const row = Math.max(220, Math.min(380, (content.clientHeight - top - 46 - gap * 2) / 2.5));
      const value = row.toFixed(2) + 'px';
      if (grid.style.getPropertyValue('--lx-manufacturing-row-height') !== value) grid.style.setProperty('--lx-manufacturing-row-height', value);
      grid.setAttribute('tabindex', '0');
      grid.setAttribute('role', 'region');
      grid.setAttribute('aria-label', '制造行业解决方案列表，可向下滚动查看更多');
    });
  }
  function start() {
    sync();
    new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['data-solution-selected']});
    window.addEventListener('resize', schedule, {passive:true});
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-solution-shuffle]');
    const floor = button?.closest(selector);
    if (floor) requestAnimationFrame(() => { const grid = floor.querySelector('.lx-floor-body'); if (grid) grid.scrollTop = 0; });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
