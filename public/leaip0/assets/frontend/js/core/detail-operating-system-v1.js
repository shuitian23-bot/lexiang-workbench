/* The fixed operating-system option shares the product configuration styling. */
(() => {
  'use strict';
  function isComputer(product) {
    if (!product) return false;
    let specs=product.specs||{};
    if (typeof specs==='string') {try {specs=JSON.parse(specs);} catch (_) {specs={};}}
    const categories=[product.category,product.product_type,specs?.source_category,specs?.category].filter(Boolean).join(' ');
    if (/手机|平板|服务器|服务|配件|选件|外设|办公|显示器|打印|耗材|phone|tablet|server|service|accessor|monitor/i.test(categories)) return false;
    if (/笔记本|台式|一体机|工作站|ThinkPad|ThinkBook|扬天|电脑|laptop|notebook|desktop|workstation/i.test(categories)) return true;
    const name=String(product.name||'');
    if (/手机|平板|服务器|服务|清灰|保养|延保|配件|显示器|键盘|鼠标|耳机|支架|适配器|扩展坞|打印机|保护套|电脑包|笔记本包/i.test(name)) return false;
    return /笔记本|台式(?:机|电脑)|一体(?:机|电脑)|工作站|ThinkPad|ThinkBook|ThinkStation|昭阳|启天|扬天|天逸|GeekPro|YOGA\s+(?:Air|Pro)|拯救者\s*[YＲR]\d/i.test(name);
  }
  function render(product,anchor) {
    if (!anchor?.parentElement) return;
    const previous=anchor.parentElement.querySelector('[data-detail-os]');
    if (!isComputer(product)) {previous?.remove();return;}
    if (previous) return;
    const group=document.createElement('div');
    group.className='detail-variants lx-detail-os';
    group.setAttribute('data-detail-os','');
    group.innerHTML='<div class="lx-spu-head"><span>操作系统</span></div><div class="lx-spu-chips"><button class="lx-spu-chip is-active" type="button" aria-pressed="true" disabled><span class="lx-spu-chip-label">Windows 11 家庭中文版</span></button></div>';
    anchor.before(group);
  }
  window.__lxDetailOperatingSystem={isComputer,render};
})();
