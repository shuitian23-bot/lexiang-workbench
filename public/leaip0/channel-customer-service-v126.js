(function(){
  'use strict';
  if(window.__lxCustomerServiceV126)return;
  window.__lxCustomerServiceV126=true;
  const urls={
    'shop-chat':'https://lecs.lenovo.com.cn/',
    'b-chat':'https://b.lenovo.com.cn/activity/qygzxdhym.html',
    'biz-chat':'https://biz.lenovo.com.cn/activity/zqzxfljhy.html'
  };
  window.addEventListener('click',function(event){
    const trigger=event.composedPath().find(node=>node?.matches?.('[data-customer-service-url], .shortcut-row button, .shortcut-row a, .more-menu .menu-row'));
    if(!trigger||(trigger.textContent||'').trim()!=='客服')return;
    const channel=location.pathname.split('/').find(part=>Object.hasOwn(urls,part))||({personal:'shop-chat',business:'b-chat',enterprise:'biz-chat'})[document.body.dataset.page];
    const url=urls[channel];if(!url)return;
    event.preventDefault();event.stopImmediatePropagation();
    window.open(url,'_blank','noopener,noreferrer');
  },true);
})();
