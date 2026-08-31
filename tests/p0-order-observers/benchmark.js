(async()=>{
const output=document.querySelector('#results'),all=[];
const wait=()=>new Promise(r=>setTimeout(r,0));
const assert=(ok,message)=>{if(!ok)throw Error(message)};
async function environment(variant){
 const src=await Promise.all(['order-payment-orders-sync-v102.js','paid-order-result-card-v104.js'].map(n=>fetch((variant==='before'?'before-core/':'../../public/leaip0/assets/frontend/js/core/')+n).then(r=>r.text())));
 const frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);const w=frame.contentWindow,d=w.document;let reads=0,writes=0;const timers=[];
 const orders=[{orderId:'TEST-A',name:'测试商品',status:'paid',price:10},{orderId:'TEST-B',name:'未付商品',status:'pending',price:20}];
 Object.defineProperty(w,'localStorage',{value:{getItem(){reads++;return JSON.stringify(orders)},setItem(){writes++}}});
 w.__lxState={};w.setTimeout=(fn,delay)=>{timers.push({fn,delay,done:false});return timers.length};w.clearTimeout=id=>{if(timers[id-1])timers[id-1].done=true};
 const orderHtml='<div class="lx-orders-wrap"><div class="ord"><button data-order-detail="TEST-A"></button><span class="nm"></span><div class="amt"></div><span class="ost"></span><div class="mid"></div></div></div>';
 d.body.innerHTML='<main id="other"></main><section id="host">'+orderHtml+'</section>';src.forEach(s=>w.eval(s));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 async function settle(){for(let i=0;i<12;i++){await wait();const active=timers.filter(t=>!t.done);if(!active.length)return;active.forEach(t=>{t.done=true;t.fn()})}throw Error('timers did not settle')}
 await settle();return {w,d,orders,orderHtml,settle,get reads(){return reads},get writes(){return writes},get scheduled(){return timers.filter(t=>t.delay===24).length},close(){frame.remove()}};
}
for(const variant of ['before','after']){
 const e=await environment(variant),tests=[];
 const before={reads:e.reads,scheduled:e.scheduled};
 for(let i=0;i<100;i++){const span=e.d.createElement('span');span.textContent='非订单内容 '+i;e.d.querySelector('#other').append(span);await e.settle()}
 const unrelated={mutations:100,storageReads:e.reads-before.reads,scheduledSyncs:e.scheduled-before.scheduled};
 async function test(name,fn){try{await fn();tests.push({name,pass:true})}catch(error){tests.push({name,pass:false,error:error.message})}}
 await test('订单容器动态重建仍同步',async()=>{e.d.querySelector('#host').innerHTML='<div>'+e.orderHtml+'</div>';await e.settle();assert(e.d.querySelector('.nm').textContent==='测试商品','name missing')});
 await test('订单内部局部替换仍同步',async()=>{e.d.querySelector('.nm').textContent='替换占位';await e.settle();assert(e.d.querySelector('.nm').textContent==='测试商品','name not restored')});
 await test('新挂载嵌套结果卡按 ID 更新',async()=>{const block=e.d.createElement('div');block.innerHTML='<button class="lx-payment-confirm-reco" data-open-payment-confirm data-lx-order-id="TEST-A"><span class="answer-cta-title">待支付</span></button><button class="lx-payment-confirm-reco" data-open-payment-confirm data-lx-order-id="TEST-B"><span class="answer-cta-title">待支付</span></button>';e.d.querySelector('#other').append(block);await e.settle();assert(block.children[0].dataset.lxOrderStatus==='paid','paid card not upgraded');assert(!block.children[1].dataset.lxOrderStatus,'unpaid card upgraded')});
 await test('移除后重建订单容器仍同步',async()=>{e.d.querySelector('#host').replaceChildren();await e.settle();e.d.querySelector('#host').innerHTML=e.orderHtml;await e.settle();assert(e.d.querySelector('.ost').textContent.includes('已支付'),'reinsert failed')});
 const batchStart=e.reads;
 for(let i=0;i<50;i++){const card=e.d.createElement('button');card.className='lx-payment-confirm-reco';card.setAttribute('data-open-payment-confirm','');card.setAttribute('data-lx-order-id','TEST-A');card.innerHTML='<span class="answer-cta-title">待支付</span>';e.d.querySelector('#other').append(card)}
 await e.settle();const batchCards={cards:50,storageReads:e.reads-batchStart};
 await test('批量新增卡片全部正确更新',async()=>{assert(e.d.querySelectorAll('[data-lx-order-status="paid"]').length===51,'batch card upgrade missing');if(variant==='after')assert(batchCards.storageReads===1,'batch did not use one storage snapshot')});
 await test('订单事件触发刷新',async()=>{e.orders[0].name='更新后的测试商品';e.w.dispatchEvent(new e.w.CustomEvent('lx:orders-updated'));await e.settle();assert(e.d.querySelector('.nm').textContent==='更新后的测试商品','event refresh failed')});
 await test('storage 事件触发刷新',async()=>{e.orders[0].name='跨页测试商品';e.w.dispatchEvent(new e.w.StorageEvent('storage',{key:'lexiang.orders.v1'}));await e.settle();assert(e.d.querySelector('.nm').textContent==='跨页测试商品','storage refresh failed')});
 await test('仅展示和刷新不写订单',async()=>{assert(e.writes===0,'unexpected writes')});
 all.push({variant,unrelated,batchCards,tests});e.close();output.textContent=JSON.stringify(all,null,2);
}
const after=all.find(x=>x.variant==='after');assert(after.unrelated.storageReads===0,'unrelated storage reads remain');assert(after.unrelated.scheduledSyncs===0,'unrelated sync timers remain');
output.textContent=JSON.stringify({scope:'Synthetic DOM workload; storage read and timer counts, not page load time or CPU benchmark',results:all,pass:all.every(x=>x.tests.every(t=>t.pass))},null,2);
})().catch(e=>{document.querySelector('#results').textContent+='\nFAIL '+e.stack});
