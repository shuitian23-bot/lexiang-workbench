/* Homepage-only demand loader. Canonical feature scripts keep their original order. */
(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('p0-home-feature-config').textContent);
  let commerceTask, ready = false, replaying = false;
  const tasks = new Map();
  function load(tag, url, anchor, id) {
    const key = tag + url;
    if (tasks.has(key)) return tasks.get(key);
    const task = new Promise((resolve, reject) => {
      const node = document.createElement(tag);
      if (id) node.id = id;
      if (tag === 'link') { node.rel = 'stylesheet'; node.href = url; }
      else { node.src = url; node.async = false; }
      let timer;
      const finish = error => {
        clearTimeout(timer); node.onload = node.onerror = null;
        if (error) { node.remove(); reject(error); } else resolve(node);
      };
      node.onload = () => finish();
      node.onerror = () => finish(new Error('功能资源未能加载，请重试'));
      timer = setTimeout(() => finish(new Error('连接较慢，请重试')), 60000);
      if (anchor) anchor.before(node); else document.head.appendChild(node);
    });
    tasks.set(key, task);
    task.catch(() => tasks.delete(key));
    return task;
  }
  function status(message, retry) {
    document.getElementById('p0-feature-status')?.remove();
    const box = document.createElement('div');
    box.id = 'p0-feature-status'; box.className = 'lx-p0-toast show';
    box.setAttribute('role', retry ? 'alert' : 'status'); box.textContent = message;
    if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = '重试'; button.onclick = retry; box.append(' ', button); }
    document.body.appendChild(box);
  }
  function commerce() {
    if (commerceTask) return commerceTask;
    commerceTask = Promise.all(config.commerceStyles.map(item => load('link', item.url, document.getElementById(item.anchor))))
      .then(() => load('script', config.commerceScript))
      .then(() => {
        if (document.readyState === 'loading') return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
      }).then(() => {
        if (!window.__lxAddressDialogV142 || typeof window.__lxOpenUnifiedDiscountOrder !== 'function') throw new Error('商品组件未准备好，请重试');
        ready = true;
      }).catch(error => { commerceTask = null; throw error; });
    return commerceTask;
  }
  window.__lxHomeFeatures = { commerce, get ready() { return ready; } };
  window.__lxLoadMemberStyles = () => load('link', config.memberStyle, document.getElementById('p0-member-style-anchor'), 'lx-member-component-css');
  function run(action) {
    status('正在加载订单与商品功能…');
    commerce().then(() => { document.getElementById('p0-feature-status')?.remove(); action(); })
      .catch(() => status('连接较慢，功能暂未加载完成', () => run(action)));
  }
  for (const name of ['__lxOpenOrdersCenter', 'lxHandleCommerceQuery', 'lxHandleCommerceEntry']) {
    const stub = function (...args) { run(() => { const fn = window[name]; if (fn !== stub && typeof fn === 'function') fn(...args); }); };
    window[name] = stub;
  }
  const orderSelector = '.utility-btn[aria-label="订单"],[data-commerce-entry="orders"],[data-lxfd-open="orders"],[data-open-orders],[data-lx-result-id="info:orders"],[data-tab-id="info:orders"]';
  const sendSelector = '.assistant-panel .send-btn,.assistant-panel [data-send],.assistant-panel button[type="submit"],.lxfd-send';
  const inputSelector = '.assistant-panel .composer textarea,.lxfd-composer textarea';
  const isOrderQuery = input => /^(?:我要|我想|帮我)?(?:查看|查询|打开)?(?:我的)?订单(?:中心|列表|记录)?$/.test(String(input?.value || '').replace(/[\s，。！？、,.!?]/g, ''));
  function intercept(event, action) {
    event.preventDefault(); event.stopImmediatePropagation();
    run(() => { replaying = true; try { action(); } finally { replaying = false; } });
  }
  window.addEventListener('click', event => {
    if (ready || replaying || !(event.target instanceof Element)) return;
    const button = event.target.closest('button,a,[role="button"]');
    if (!button || button.closest('.lx-tab-close')) return;
    const send = button.matches(sendSelector);
    const input = button.closest('form')?.querySelector('textarea') || document.querySelector(inputSelector);
    const buy = button.matches('[data-buy-sku],[data-buy-now],[data-action="buy"],[data-order-action="buy"],[data-cart-checkout]') || /^(?:一键领取?优惠下单|一键领优惠下单|立即购买|立即下单|去购买|去下单|去结算|结算|提交订单)$/.test(button.textContent.replace(/\s+/g, ''));
    if (button.matches(orderSelector) || buy || (send && isOrderQuery(input))) intercept(event, () => { if (button.isConnected) button.click(); });
  }, true);
  window.addEventListener('keydown', event => {
    if (ready || replaying || event.key !== 'Enter' || event.shiftKey || event.isComposing || !event.target.matches?.(inputSelector) || !isOrderQuery(event.target)) return;
    const input = event.target;
    intercept(event, () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })));
  }, true);
  window.addEventListener('submit', event => {
    if (ready || replaying || !event.target.matches?.('.assistant-panel .composer,.lxfd-composer') || !isOrderQuery(event.target.querySelector('textarea'))) return;
    const form = event.target;
    intercept(event, () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  }, true);
})();
