/* Match the visible Personal banner height from scene-banner-v154.js.
 * Observe the content panel so assistant resizing and swapping stay in sync.
 */
(function () {
  'use strict';
  function mount() {
    if (!['business', 'enterprise'].includes(document.body?.dataset.page)) return;
    const hall = document.querySelector('.content > .device-scene-hall');
    if (!hall || hall.dataset.personalHeightReady === 'true') return;
    const content = hall.parentElement;
    hall.dataset.personalHeightReady = 'true';
    let pending = false;

    function resize() {
      pending = false;
      const style = getComputedStyle(content);
      const width = content.clientWidth - (parseFloat(style.paddingLeft) || 0)
        - (parseFloat(style.paddingRight) || 0);
      if (width <= 0) return;

      // Keep these canvas and short-screen rules aligned with Personal's adapter.
      const desktop = window.innerWidth > 760;
      const compactHost = desktop && width < 1100;
      const naturalWidth = !desktop ? width
        : compactHost ? Math.max(980, width) : Math.max(1280, width);
      const scale = width / naturalWidth;
      const baseVisibleHeight = (compactHost ? 500 : 560) * scale;
      const targetVisibleHeight = Math.max(360, Math.min(baseVisibleHeight, window.innerHeight - 360));
      const shortHost = desktop && targetVisibleHeight < baseVisibleHeight - 1;
      const height = shortHost ? targetVisibleHeight : baseVisibleHeight;
      hall.style.setProperty('--lx-channel-hero-height', height + 'px');
    }

    function scheduleResize() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(resize);
      }
    }
    resize();
    new ResizeObserver(scheduleResize).observe(content);
    window.addEventListener('resize', scheduleResize);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
