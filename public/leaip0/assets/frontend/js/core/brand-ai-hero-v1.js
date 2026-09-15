/* Map the supplied full-page hero viewport to the live right content pane. */
(() => {
  'use strict';
  if (document.body.dataset.page !== 'brand') return;
  const content = document.querySelector('.shell > .content');
  if (!content) return;
  const sync = () => {
    const hero = content.querySelector('.lx-brand-home > .lxbrand-ai-hero');
    if (!hero || !content.clientWidth || !content.clientHeight) return;
    const style = getComputedStyle(content);
    const width = content.getBoundingClientRect().width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    const height = content.clientHeight;
    const props = {
      '--lxbrand-hero-height': height + 'px',
      '--lxbrand-hero-left': style.paddingLeft,
      '--lxbrand-hero-right': style.paddingRight
    };
    for (const [name, value] of Object.entries(props)) {
      if (hero.style.getPropertyValue(name) !== value) hero.style.setProperty(name, value);
    }
    const size = width <= 720 ? 'small' : width <= 1100 ? 'medium' : 'large';
    const short = String(height <= 560 && width >= height);
    if (hero.dataset.width !== size) hero.dataset.width = size;
    if (hero.dataset.short !== short) hero.dataset.short = short;
  };
  sync();
  if (typeof ResizeObserver === 'function') new ResizeObserver(sync).observe(content);
  else window.addEventListener('resize', sync, { passive: true });
  // The existing application can restore the home markup after a result view.
  new MutationObserver(sync).observe(content, { childList: true, subtree: true });
})();
