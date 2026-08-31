(() => {
  'use strict';

  const channels = {
    'shop-chat': 'https://lecs.lenovo.com.cn/',
    'b-chat': 'https://b.lenovo.com.cn/activity/qygzxdhym.html',
    'biz-chat': 'https://biz.lenovo.com.cn/activity/zqzxfljhy.html'
  };

  // Shortcut rows are rebuilt by the app (including on resize). Delegate by
  // their rendered label too; the rebuilt buttons do not retain data attributes.
  // Window capture runs before the app's document-level customer-service guard.
  window.addEventListener('click', (event) => {
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    const trigger = target?.closest?.('[data-customer-service-url], .shortcut-row .shortcut, .more-menu .menu-row');
    if (!trigger) return;
    const explicitUrl = trigger.dataset.customerServiceUrl;
    if (!explicitUrl && trigger.textContent.trim() !== '客服') return;
    const channel = location.pathname.split('/').find(part => Object.hasOwn(channels, part));
    const url = channels[channel] || explicitUrl;
    if (!url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, true);
})();
