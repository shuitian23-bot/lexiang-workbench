(() => {
  'use strict';

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-customer-service-url]');
    if (!trigger) return;

    const url = trigger.dataset.customerServiceUrl;
    if (!url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, true);
})();
