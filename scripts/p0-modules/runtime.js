/* Compatibility scheduler for the 48 P0 business modules.
 * Preserve classic-script global bindings and the established CSS insertion order.
 * Package libraries register implementations without starting page interactions.
 */
(function () {
  if (window.__p0Modules) return;
  const sources = Object.create(null), factories = Object.create(null);
  const styles = new Map(), mounts = new WeakMap();
  const api = window.__p0Modules = {
    version: 1, sources, factories, installed: Object.create(null), scripts: {}, css: {},
    invoke(id, scope, receiver, args) {
      const factory = factories[id];
      if (!factory) throw new Error('P0 business implementation missing: ' + id);
      return factory(scope).apply(receiver, args);
    },
    collectStyles() {
      for (const sheet of document.styleSheets) {
        if (!sheet.ownerNode?.hasAttribute('data-p0-style-library')) continue;
        for (const rule of sheet.cssRules) {
          const match = rule.conditionText?.match(/^\(-p0-part:\s*([a-zA-Z0-9_-]+)\)$/);
          if (match) styles.set(match[1], Array.from(rule.cssRules, r => r.cssText).join('\n'));
        }
      }
    },
    styleText(key) {
      if (key.startsWith('/modules/')) key = decodeURIComponent(new URL(key, location.href).hash.slice(10));
      if (!styles.size) api.collectStyles();
      const parts = api.css[key];
      if (!parts) throw new Error('P0 style slot missing: ' + key);
      return parts.map(part => {
        if (!styles.has(part.part)) throw new Error('P0 style part missing: ' + part.part);
        return styles.get(part.part);
      }).join('\n');
    },
    mountStyle(link, key) {
      if (!link || mounts.has(link)) return;
      if (key.startsWith('/modules/')) key = decodeURIComponent(new URL(key, location.href).hash.slice(10));
      if (!styles.size) api.collectStyles();
      const node = document.createElement('style');
      node.dataset.p0Style = key;
      if (link.media) node.media = link.media;
      node.textContent = api.styleText(key);
      link.before(node);
      node.disabled = link.disabled;
      mounts.set(link, node);
    },
    run(key, originalNode) {
      const units = api.scripts[key];
      if (!units) throw new Error('P0 script slot missing: ' + key);
      const code = units.map(id => {
        const fn = sources[id];
        if (!fn) throw new Error('P0 script implementation missing: ' + id);
        const body = Function.prototype.toString.call(fn);
        return body.slice(body.indexOf('{') + 1, body.lastIndexOf('}'));
      }).join('\n;\n');
      const node = document.createElement('script');
      node.dataset.p0Execution = key;
      // JavaScript readers retain their historical asset base; no src attribute
      // is set, so the browser executes the registered code without an old URL.
      Object.defineProperty(node, 'src', {value: new URL(key, location.href).href});
      if (originalNode?.nonce) node.nonce = originalNode.nonce;
      node.textContent = code + '\n//# sourceURL=p0-module:' + key;
      if (originalNode?.parentNode) originalNode.after(node);
      else (document.head || document.documentElement).appendChild(node);
    },
    dispatch(node) {
      if (!node || node.hasAttribute('data-p0-library')) return;
      const hash = new URL(node.src, location.href).hash;
      if (hash.startsWith('#p0-script=')) api.run(decodeURIComponent(hash.slice(11)), node);
    }
  };
  document.addEventListener('load', event => {
    const node = event.target;
    if (node?.tagName !== 'LINK' || node.hasAttribute('data-p0-style-library')) return;
    const hash = new URL(node.href, location.href).hash;
    if (hash.startsWith('#p0-style=')) api.mountStyle(node, decodeURIComponent(hash.slice(10)));
  }, true);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const mounted = mounts.get(record.target);
        if (mounted) { mounted.media = record.target.media; mounted.disabled = record.target.disabled; }
      }
      for (const node of record.removedNodes) {
        const mounted = mounts.get(node);
        if (mounted && !node.isConnected) { mounted.remove(); mounts.delete(node); }
      }
    }
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['media','disabled']});
})();
