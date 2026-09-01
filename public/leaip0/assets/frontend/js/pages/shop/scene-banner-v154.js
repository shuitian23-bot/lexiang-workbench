/* Original scene-banner styles and interactions run in their own document.
 * This adapter owns only host sizing, existing mall visibility, and product routing.
 */
(function () {
  'use strict';
  function mount() {
  if (document.body?.dataset.page !== 'personal') return;
  const legacy = document.querySelector('.content > .device-scene-hall');
  if (!legacy || document.getElementById('p0OriginalSceneBanner')) return;
  const content = legacy.parentElement;
  const host = document.createElement('section');
  host.id = 'p0OriginalSceneBanner';
  host.setAttribute('aria-label', '个人及家庭场景推荐');
  const frame = document.createElement('iframe');
  frame.title = '个人及家庭场景 Banner';
  frame.src = '/assets/components/scene-banner-v154/scene-banner.html?v=20260831-transparent-banner';
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('loading', 'eager');
  frame.style.cssText = 'display:block;border:0;position:absolute;left:0;top:0;transform-origin:0 0;width:1280px;height:650px;max-width:none;';
  host.style.cssText = 'position:relative;width:100%;min-width:0;height:auto;aspect-ratio:1280/674;overflow:hidden;margin:0;';
  const style = document.createElement('style');
  style.textContent = `
    #p0OriginalSceneBanner { display:none; }
    body[data-page="personal"]:not(.assistant-fullscreen) .content[data-view="list"] > #p0OriginalSceneBanner { display:block; }
    .content:has(> #p0OriginalSceneBanner) > .device-scene-hall { display:none!important; }
    body[data-page="personal"] .content:has(> .lx-tabbar .lx-tab.is-active:not([data-shop-tab-id="site:personal"]):not([data-tab-id="site:personal"])) > #p0OriginalSceneBanner { display:none!important; }
  `;
  document.head.append(style);
  host.append(frame);
  legacy.before(host);
  let frameDocument;
  let resizePending = false;
  function resize() {
    resizePending = false;
    const width = content.clientWidth - parseFloat(getComputedStyle(content).paddingLeft || 0) - parseFloat(getComputedStyle(content).paddingRight || 0);
    if (!width || !frameDocument) return;
    // Preserve the supplied desktop composition even beside the assistant.
    // Only the entire original document scales; its component CSS stays intact.
    const naturalWidth = window.innerWidth <= 760 ? width : Math.max(1280, width);
    const scale = width / naturalWidth;
    frame.style.width = naturalWidth + 'px';
    const page = frameDocument.querySelector('.page');
    if (!page) return;
    const padding = parseFloat(frame.contentWindow.getComputedStyle(frameDocument.body).paddingBottom) || 0;
    const height = Math.ceil(page.getBoundingClientRect().bottom + padding);
    frame.style.height = height + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    host.style.height = Math.ceil(height * scale) + 'px';
  }
  function scheduleResize() {
    if (!resizePending) { resizePending = true; requestAnimationFrame(resize); }
  }
  function initialize() {
    if (frameDocument === frame.contentDocument && host.dataset.ready) return;
    frameDocument = frame.contentDocument;
    if (!frameDocument || !frameDocument.querySelector('#bannerHero')) return;
    host.dataset.ready = 'true';
    legacy.inert = true;
    resize();
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(content);
    observer.observe(frameDocument.querySelector('.page'));
    window.addEventListener('resize', scheduleResize);
    frameDocument.fonts.ready.then(scheduleResize);
    // Keep the current production product routes, aligned to the source order:
    // gaming notebook -> office tablet -> creation notebook.
    const productSkus = ['1054054', '1038490', '1055124'];
    const cta = frameDocument.querySelector('.cta');
    cta.addEventListener('click', async function () {
      const api = window.__lxAgentAPI;
      if (!api || typeof api.openProduct !== 'function' || cta.disabled) return;
      const index = Number(frameDocument.getElementById('pageNum').textContent) - 1;
      if (!productSkus[index]) return;
      cta.disabled = true;
      cta.setAttribute('aria-busy', 'true');
      try { await api.openProduct(productSkus[index]); }
      catch (error) { console.error('[scene-banner] Product details could not open', error); }
      finally { cta.disabled = false; cta.removeAttribute('aria-busy'); }
    });
    // Add keyboard semantics without changing the source click behavior or style.
    frameDocument.querySelectorAll('.tab, .thumb-card').forEach(function (control) {
      control.tabIndex = 0;
      control.setAttribute('role', 'button');
      control.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
      });
    });
  }
  frame.addEventListener('load', initialize);
  window.addEventListener('message', function(event) {
    if(event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === 'p0-scene-dom-ready-v154') initialize();
  });
  }
  mount();
  // Async head entry: initialize as soon as the actual mall markup is parsed.
  const mountObserver = new MutationObserver(mount);
  mountObserver.observe(document.documentElement, {childList:true,subtree:true});
})();
