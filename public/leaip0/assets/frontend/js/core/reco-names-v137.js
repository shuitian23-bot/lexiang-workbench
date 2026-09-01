(function(){
'use strict';
if(window.__lxRecoNamesV139)return;window.__lxRecoNamesV139=true;
const cache=new Map(),seen=new WeakMap();
function syncMatchLabel(row){
 const label=row.querySelector('.lx-reco-poc-label');
 if(!label)return;
 let group=label.closest('.lx-reco-poc-label-group');
 if(!group){
  group=document.createElement('div');
  group.className='lx-reco-poc-label-group';
  label.parentNode.insertBefore(group,label);
  group.appendChild(label);
 }
 let match=group.querySelector('.lx-reco-match-label');
 if(!match){
  match=document.createElement('span');
  match.className='lx-reco-match-label';
  group.appendChild(match);
 }
 const value='推荐度：已有 2 项满足';
 if(match.dataset.recommendationSummary!==value){
  match.dataset.recommendationSummary=value;
  match.innerHTML='<svg class="lx-reco-match-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-8a3 3 0 0 1 2 4v4h5a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7"/></svg><span>'+value+'</span><i aria-hidden="true">›</i>';
 }
 match.setAttribute('aria-label',value);
}
function detail(sku){
 if(!cache.has(sku))cache.set(sku,fetch('/api/products/'+encodeURIComponent(sku)).then(r=>{if(!r.ok)throw Error('product unavailable');return r.json();}).catch(()=>null));
 return cache.get(sku);
}
async function update(row){
 syncMatchLabel(row);
 const sku=row.getAttribute('data-open-product');
 if(!sku||seen.get(row)===sku)return;
 seen.set(row,sku);
 const product=await detail(sku);
 if(!product||!row.isConnected||row.getAttribute('data-open-product')!==sku)return;
 let specs=product.specs||{};if(typeof specs==='string'){try{specs=JSON.parse(specs);}catch(_){specs={};}}
 const name=String(product.sku_name||product.skuName||product.name||'').trim();
 const spu=String(product.spu_name||product.spuName||specs.spu_name||specs.spuName||'').trim();
 const title=row.querySelector('.lx-reco-poc-copy > strong, .reco-row-main > strong');
 const label=row.querySelector('.lx-reco-poc-label');
 if(title&&name){title.textContent=name;title.title=name;}
 if(label){label.textContent=spu;label.title=spu;label.hidden=!spu;}
 const img=row.querySelector('.lx-reco-poc-thumb img');if(img&&name)img.alt=name;
}
let queued=false;
function scan(){queued=false;document.querySelectorAll('.reco-page .lx-reco-poc-row[data-open-product]').forEach(update);}
new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-open-product']});
scan();
})();
