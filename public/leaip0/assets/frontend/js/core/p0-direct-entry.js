/* Open existing read-only feature entrypoints; never submit an appointment or member action. */
(function () {
  if (!/^\/shop-chat\/(?:index\.html)?$/.test(location.pathname)) return;
  var feature = new URLSearchParams(location.search).get('p0entry');
  if (feature !== 'stores' && feature !== 'member') return;
  var opened = false;
  var deadline;
  function open() {
    if (opened) return;
    if (typeof window.__lxOpenFeature === 'function') {
      opened = true;
      window.__lxOpenFeature(feature);
      return;
    }
    if (Date.now() < deadline) window.setTimeout(open, 50);
  }
  function start() {
    deadline = Date.now() + 8000;
    window.requestAnimationFrame(open);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
