(function(){
  'use strict';
  if(window.__lxCustomerServiceV126)return;
  window.__lxCustomerServiceV126=true;
  const urls={
    'shop-chat':'https://lecs.lenovo.com.cn/',
    'b-chat':'https://b.lenovo.com.cn/activity/qygzxdhym.html',
    'biz-chat':'https://biz.lenovo.com.cn/activity/zqzxfljhy.html'
  };
  const labels={'shop-chat':'联想官方客服','b-chat':'中小企业客服','biz-chat':'政教及大企业客服'};
  function channel(){
    return location.pathname.split('/').find(part=>Object.hasOwn(urls,part))||
      ({personal:'shop-chat',business:'b-chat',enterprise:'biz-chat'})[document.body?.dataset.page]||'shop-chat';
  }
  function matches(query){
    const text=String(query||'').trim().replace(/[\s，,。.!！?？：:“”"'‘’]/g,'');
    return /^(?:(?:请|麻烦)?(?:帮我|给我)?(?:我要|我想|我需要)?(?:找|联系|咨询|接入|转接|转|打开|进入|选择|呼叫|找一下|联系一下)?)?(?:联想|官方|在线|人工|真人|专属)?客服(?:页面|入口|中心)?(?:一下|吧|呢|吗)?$/.test(text)||/^(人工|转人工|找人工|转接人工|人工服务)$/.test(text);
  }
  const escape=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function cardHtml(url,label){
    return '<button class="answer-cta lx-answer-page" type="button" data-customer-service-url="'+escape(url)+'" aria-label="选择客服，在新窗口打开官方客服页面">'+
      '<span class="answer-cta-copy"><span class="answer-cta-title">选择客服</span><span class="answer-cta-desc">'+escape(label)+' · 官方客服页面</span></span>'+
      '<span class="answer-cta-icon" aria-hidden="true">'+window.__lxApprovedIcon('global-next')+'</span></button>';
  }
  async function run(api){
    const gen=window.__lxGeneration,token=api.token,key=channel(),url=urls[key],label=labels[key];
    const copy='如需咨询产品、订单或服务问题，请点击下方 **「选择客服」**，进入'+label+'页面，再根据你的咨询内容选择对应服务。';
    api.busy(true);
    try{
      const reply=await gen.wait(token,api.answer(copy));
      if(!gen.current(token)||!reply?.isConnected)return false;
      api.card(reply,cardHtml(url,label));
      api.save();
      return true;
    }finally{
      if(gen.current(token))api.busy(false);
    }
  }
  window.__lxCustomerServiceQuery={matches,run};
  window.addEventListener('click',function(event){
    const trigger=event.composedPath().find(node=>node?.matches?.('[data-customer-service-url], .shortcut-row button, .shortcut-row a, .more-menu .menu-row'));
    if(!trigger)return;
    const requested=trigger.getAttribute('data-customer-service-url');
    const shortcut=(trigger.textContent||'').trim()==='客服';
    if(!requested&&!shortcut)return;
    const url=requested||urls[channel()];
    if(!Object.values(urls).includes(url))return;
    event.preventDefault();event.stopImmediatePropagation();
    window.open(url,'_blank','noopener,noreferrer');
  },true);
})();
