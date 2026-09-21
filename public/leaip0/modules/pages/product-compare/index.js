/* 商品对比 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/product-compare"]) {
window.__p0Modules.installed["pages/product-compare"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/compare-column-detail-v141.js */
window.__p0Modules.sources["u59832b42649cf67f"]=function(){
(()=>{
 if(window.__lxCompareColumnDetailV141)return;window.__lxCompareColumnDetailV141=true;
 const selector='.lx-product-compare .lx-pc-grid > .lx-pc-cell[data-col]';
 function target(event){return event.target?.closest?.(selector);}
 function open(event,cell){
  if(!cell||event.target.closest('button,a,input,select,textarea'))return;
  const head=Array.from(cell.parentElement.querySelectorAll('.lx-pc-product-head[data-col]')).find(h=>h.dataset.col===cell.dataset.col);
  const sku=head?.getAttribute('data-cmp-recommend');
  if(!sku||typeof window.__lxAgentAPI?.openProduct!=='function')return;
  event.preventDefault();event.stopImmediatePropagation();
  window.__lxAgentAPI.openProduct(sku);
 }
 window.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;if(window.getSelection()?.toString())return;open(event,target(event));},true);
 window.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const cell=target(event);if(cell&&event.target===cell)open(event,cell);},true);
 const style=document.createElement('style');style.textContent=window.__p0Modules.styleText("/@script-style/a52125fe48f3347b54369553.css");document.head.appendChild(style);
 function sync(){document.querySelectorAll('.lx-product-compare .lx-pc-product-head[data-col]').forEach(head=>{const name=head.querySelector('.lx-pc-title')?.getAttribute('title')||'商品';if(head.getAttribute('role')!=='link'){head.setAttribute('role','link');head.setAttribute('aria-label','查看'+name+'详情');head.removeAttribute('aria-pressed');}});}
 new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});sync();
})();

};

/* public/leaip0/assets/frontend/js/core/comparison-display-actions-v1.js */
window.__p0Modules.sources["u0eef0e297ad3b765"]=function(){
/* Comparison display commands share the existing chat and generation lifecycle. */
(() => {
  'use strict';
  const commands = {
    '隐藏同类项': {field:'hideSame', value:true, copy:'已隐藏各商品相同的参数项，保留差异信息，方便你快速比较配置。'},
    '不隐藏同类项': {field:'hideSame', value:false, copy:'已恢复全部参数项，相同内容与差异信息均已展示，方便你完整对比。'},
    '合并相同机型': {field:'mergeSameModel', value:true, copy:'已合并同一机型的重复配置列，保留各机型信息，方便你横向对比。'},
    '不隐藏相同机型': {field:'mergeSameModel', value:false, copy:'已展开相同机型的全部配置，恢复逐款商品对比，方便你查看差异。'}
  };
  function command(query) {
    const text=String(query||'').trim().replace(/[。！!？?]+$/,'');
    return commands[text==='不合并相同机型'?'不隐藏相同机型':text] || null;
  }
  function labels(snapshot=window.__lxCompareDisplayView?.snapshot()) {
    if (!snapshot) return [];
    const result=[];
    if (snapshot.hideSame) result.push('不隐藏同类项');
    else if (snapshot.canHide) result.push('隐藏同类项');
    if (snapshot.mergeSameModel) result.push('不隐藏相同机型');
    else if (snapshot.canMerge) result.push('合并相同机型');
    return result;
  }
  async function run(query,host) {
    const action=command(query), gen=window.__lxGeneration, token=host.token;
    if (!action) return false;
    const target=window.__lxCompareDisplayView?.snapshot();
    host.busy(true);
    try {
      let response=action.copy, apply=true;
      if (!target) {response='请先打开商品对比页面，待参数加载完成后，再调整对比显示方式。';apply=false;}
      else if (target[action.field]===action.value) {response=action.field==='hideSame'?'当前参数项已按此方式展示，你可以继续查看商品差异或切换显示方式。':'当前机型已按此方式展示，你可以继续对比配置或切换其他显示方式。';apply=false;}
      else if (action.value && !(action.field==='hideSame'?target.canHide:target.canMerge)) {
        response=action.field==='hideSame'?'当前没有可隐藏的相同参数项，已保留完整信息，方便你查看商品差异。':'当前没有同一机型的多款配置，已保留现有商品，方便你继续对比。';apply=false;
      }
      await gen.wait(token,host.answer(response));
      if (apply && gen.current(token) && !window.__lxCompareDisplayView.apply(target,action.field,action.value)) {
        await gen.wait(token,host.answer('对比页面已切换，本次未调整显示。请回到对应商品对比后重试。'));
      }
    } finally {
      if (gen.current(token)) {host.busy(false);host.save();}
    }
    return true;
  }
  window.__lxComparisonDisplay={matches:query=>!!command(query),labels,run};
})();

};

/* Business: oe */
window.__p0Modules.factories["pages/product-compare#oe:bc2238d02b26d026d55d70de"]=function(__p0Scope){"use strict";return (async function oe(t){const e=function(){let t=document.querySelector(".compare-page");return t||(t=document.createElement("div"),t.className="compare-page",document.querySelector(".content")?.appendChild(t)),t}(),n=Array.isArray(t?.products)&&t.products.length>0,a=n?t.products:__p0Scope.d.compare,o=t?.label&&n?t.label:"商品参数对比";e.__lxCompareRequest={};if(!a.length)return void(e.innerHTML=`<div class="reco-head"><h2>${(0,__p0Scope.v)(o)}</h2><span>对比清单为空</span></div><p class="lx-p0-disclaimer">在商品详情页、推荐结果里点「加对比」，这里就会生成并排参数对比表。</p>`);e.innerHTML=`<div class="reco-head"><h2>${(0,__p0Scope.v)(o)}</h2><span>正在加载参数明细...</span></div>`;const token={};e.__lxCompareRequest=token;
 const loaded=await (0,__p0Scope.lxHydrateCompareV149)(a);
 if(e.__lxCompareRequest!==token)return;
 if(loaded.some(p=>!p)){
  e.innerHTML='<div class="reco-head"><h2>商品参数对比</h2></div><p role="alert" class="lx-p0-disclaimer">部分商品参数暂时无法加载，请重试。不会生成缺少商品信息的对比表。</p><button type="button" class="lx-p0-btn" data-compare-retry>重新加载</button>';
  e.querySelector('[data-compare-retry]').onclick=()=>(0,__p0Scope.oe)(t);return;
 }
 const s=loaded.map(p=>({...p,specs:(0,__p0Scope.lt)({...p,specs:(0,__p0Scope.ct)(p.specs)})}));
 if(t)t.products=s.map(p=>({...p}));
 const gamingPick=window.__lxGamingQuery?.pick(a);if(gamingPick){__p0Scope.d._compareRecommendedSku=gamingPick.sku;__p0Scope.d._compareRecommendedProduct=s.find(p=>p.sku===gamingPick.sku)||gamingPick;__p0Scope.d._compareMergeSameModel=false;}__p0Scope.d._comparePageItems=s;e.__lxCompareTab=t||null;e.__lxCompareItems=s;e.__lxCompareDisplayChanged=false;const compareView=(0,__p0Scope.lxCompareViewState)(t);__p0Scope.d._compareHideSame=!!compareView.hideSame;__p0Scope.d._compareMergeSameModel=!!compareView.mergeSameModel;const i=s.length>=2?(0,__p0Scope.Ko)(s,{actions:!0}):'<p class="lx-p0-disclaimer">再加入 1 件商品即可生成并排对比表。</p>',r=__p0Scope.d._compareRecommendedProduct||s[s.length-1]||s[0],l=r?`当前推荐 <strong>${(0,__p0Scope.v)(r.name||r.sku)}</strong>，综合配置更均衡。建议结合实际用途与商品详情确认。`:"建议结合实际用途与商品详情确认。";e.innerHTML=`\n            <div class="lx-pc-head"><h2>商品参数对比</h2></div>\n            <section class="lx-pc-ai-suggest" aria-label="乐享建议"><span class="lx-pc-ai-avatar">${window.__lxApprovedIcon("global-sparkle")}</span><div><h4>乐享建议</h4><p class="lx-cmp-advice" aria-live="polite">${l}</p></div></section>\n            ${i}`,(async()=>{try{const t=e.querySelector(".lx-cmp-advice");if(!t)return;if(gamingPick){t.textContent=window.__lxGamingQuery.advice(gamingPick);return;}const n=s.map(t=>({name:t.name,price:t.price,cpu:(t.specs||{}).cpu||"",gpu:(t.specs||{}).gpu||"",ram:(t.specs||{}).ram||(t.specs||{}).memory||""})),a=__p0Scope.d.lastUserText||"",o=await fetch("/api/leai/compare-advice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:n,q:a})});if(!o.ok)return;const i=await o.json();if(e.__lxCompareRequest!==token||e.__lxCompareDisplayChanged||!i.pick||!i.reason||!s.some(p=>String(p.name||"").includes(String(i.pick))||String(i.pick).includes(String(p.name||""))))return;t.innerHTML=`结合你的需求，当前推荐 <strong>${(0,__p0Scope.v)(i.pick)}</strong>：${(0,__p0Scope.v)(i.reason)}`;const r=String(i.pick||"").trim();let l=s.findIndex(t=>String(t.name||"").trim()===r);if(l<0&&(l=s.findIndex(t=>r&&(String(t.name||"").includes(r)||r.includes(String(t.name||"").trim())))),l>=0){__p0Scope.d._compareRecommendedSku=s[l]?.sku||"",__p0Scope.d._compareRecommendedProduct=s[l]||null;const t=e.querySelector(".lx-product-compare .lx-pc-grid");if(t){t.querySelectorAll("[data-col]").forEach(t=>t.classList.toggle("recommended",Number(t.dataset.col)===l)),t.querySelectorAll(".lx-pc-product-head").forEach(t=>t.classList.remove("top")),t.querySelectorAll(".lx-pc-action-cell").forEach(t=>t.classList.remove("bottom"));const e=t.querySelector(`.lx-pc-product-head[data-col="${l}"]`),n=t.querySelector(`.lx-pc-action-cell[data-col="${l}"]`);e?.classList.add("top"),n?.classList.add("bottom"),t.querySelectorAll(".lx-pc-rec-badge").forEach(t=>t.remove()),e?.insertAdjacentHTML("afterbegin",'<span class="lx-pc-rec-badge">乐享推荐</span>')}}}catch(t){}})()}); };

/* Business: all */
window.__p0Modules.factories["pages/product-compare#all:2ce6b50b66e19d3cee7b9a05"]=function(__p0Scope){return (selector => Array.from(__p0Scope.roots).flatMap(root => Array.from(root.querySelectorAll(selector)))); };

/* Business: cardSku */
window.__p0Modules.factories["pages/product-compare#cardSku:25b648da95bd4dbe68a5830f"]=function(__p0Scope){return (card => String(card?.dataset?.productId || card?.dataset?.sku || card?.dataset?.openProduct || card?.dataset?.floorProduct || '').trim()); };

/* Business: enhanceCard */
window.__p0Modules.factories["pages/product-compare#enhanceCard:ba719778f8f04bc6740d9268"]=function(__p0Scope){return (function enhanceCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const sku = (0,__p0Scope.cardSku)(card);
    if (!sku) return;
    // 接入主应用既有商品引用状态、飞入动画和对比页，不复制业务状态。

    if (card.dataset.sku !== sku) card.dataset.sku = sku;
    // 勾选按钮由本补丁先注入时，主应用会跳过重复初始化；因此需在这里
    // 同步补齐原生商品/解决方案卡使用的 draggable 标记。
    if (!card.draggable) card.draggable = true;
    // Ranking rows retain their existing navigation/drag behavior, without selection controls.
    if (card.matches('.rank-item')) return;
    let button = Array.from(card.children).find(child => child.classList.contains('lx-pick-btn'));
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'lx-pick-btn';
      button.dataset.pickSku = sku;
      button.title = '选择商品进行对比';
      button.setAttribute('aria-label', '选择商品进行对比');
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<img src="../icons/global-check.svg" alt="" aria-hidden="true">';
      card.appendChild(button);
    }
    if (button.dataset.pickSku !== sku) button.dataset.pickSku = sku;
  }); };

/* Business: normalizePrompt */
window.__p0Modules.factories["pages/product-compare#normalizePrompt:c7ad47fcdea697bb0cec6e03"]=function(__p0Scope){return (function normalizePrompt() {
    const textarea = document.querySelector('.assistant-panel .composer textarea, .composer textarea');
    if (!textarea) return;
    const refs = window.__lxState?.refProducts;
    if (!Array.isArray(refs)) return;
    const products = refs.filter(item => item.type !== 'solution');
    const selectedSkus = new Set(products.map(item => String(item.sku)));
    const selected = selectedSkus.size;
    (0,__p0Scope.all)(__p0Scope.PICK_SELECTOR).forEach(button => {
      const picked = selectedSkus.has(button.dataset.pickSku);
      if (button.classList.contains('picked') !== picked) button.classList.toggle('picked', picked);
      if (button.getAttribute('aria-pressed') !== String(picked)) button.setAttribute('aria-pressed', String(picked));
    });
    const current = textarea.value.trim();
    if (selected >= 2 && (selected !== __p0Scope.previousSelected || !current || __p0Scope.AUTO_PROMPTS.has(current))) {
      if (textarea.value !== '对比这几款商品') {
        textarea.value = '对比这几款商品';
        textarea.dataset.refAutoPrompt = '对比这几款商品';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (selected < 2 && __p0Scope.AUTO_PROMPTS.has(current)) {
      textarea.value = '';
      delete textarea.dataset.refAutoPrompt;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    __p0Scope.previousSelected = selected;
  }); };

/* Business: observe */
window.__p0Modules.factories["pages/product-compare#observe:50c109a5f4e3981a7afbf072"]=function(__p0Scope){return (function observe(root) {
    __p0Scope.observer.observe(root === document ? document.body : root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-product-id', 'data-sku', 'data-open-product'] });
  }); };

/* Business: oe */
window.__p0Modules.factories["pages/product-compare#oe:027607e51171c6b1f344102d"]=function(__p0Scope){"use strict";return (async function oe(t){const e=function(){let t=document.querySelector(".compare-page");return t||(t=document.createElement("div"),t.className="compare-page",document.querySelector(".content")?.appendChild(t)),t}(),n=Array.isArray(t?.products)&&t.products.length>0,a=n?t.products:__p0Scope.d.compare,o=t?.label&&n?t.label:"商品参数对比";if(!a.length)return void(e.innerHTML=`<div class="reco-head"><h2>${(0,__p0Scope.v)(o)}</h2><span>对比清单为空</span></div><p class="lx-p0-disclaimer">在商品详情页、推荐结果里点「加对比」，这里就会生成并排参数对比表。</p>`);e.innerHTML=`<div class="reco-head"><h2>${(0,__p0Scope.v)(o)}</h2><span>正在加载参数明细...</span></div>`;const s=(await Promise.all(a.slice(0,10).map(async t=>{if(t.specs&&Object.keys(t.specs).length)return t;const e="function"==typeof AbortController?new AbortController:null,n=window.setTimeout(()=>e?.abort(),1800);try{const n=await fetch(`/api/products/${encodeURIComponent(t.sku)}`,{cache:"no-store",signal:e?.signal});if(n.ok)return await n.json()}catch{}finally{window.clearTimeout(n)}return t}))).map(t=>({...t,specs:(0,__p0Scope.lt)({...t,specs:(0,__p0Scope.ct)(t.specs)})}));const gamingPick=window.__lxGamingQuery?.pick(a);if(gamingPick){__p0Scope.d._compareRecommendedSku=gamingPick.sku;__p0Scope.d._compareRecommendedProduct=s.find(p=>p.sku===gamingPick.sku)||gamingPick;__p0Scope.d._compareMergeSameModel=false;}__p0Scope.d._comparePageItems=s;e.__lxCompareTab=t||null;e.__lxCompareItems=s;e.__lxCompareDisplayChanged=false;const compareView=(0,__p0Scope.lxCompareViewState)(t);__p0Scope.d._compareHideSame=!!compareView.hideSame;__p0Scope.d._compareMergeSameModel=!!compareView.mergeSameModel;const i=s.length>=2?(0,__p0Scope.Ko)(s,{actions:!0}):'<p class="lx-p0-disclaimer">再加入 1 件商品即可生成并排对比表。</p>',r=__p0Scope.d._compareRecommendedProduct||s[s.length-1]||s[0],l=r?`当前推荐 <strong>${(0,__p0Scope.v)(r.name||r.sku)}</strong>，综合配置更均衡。建议结合实际用途与商品详情确认。`:"建议结合实际用途与商品详情确认。";e.innerHTML=`\n            <div class="lx-pc-head"><h2>商品参数对比</h2></div>\n            <section class="lx-pc-ai-suggest" aria-label="乐享建议"><span class="lx-pc-ai-avatar">${window.__lxApprovedIcon("global-sparkle")}</span><div><h4>乐享建议</h4><p class="lx-cmp-advice" aria-live="polite">${l}</p></div></section>\n            ${i}`,(async()=>{try{const t=e.querySelector(".lx-cmp-advice");if(!t)return;if(gamingPick){t.textContent=window.__lxGamingQuery.advice(gamingPick);return;}const n=s.map(t=>({name:t.name,price:t.price,cpu:(t.specs||{}).cpu||"",gpu:(t.specs||{}).gpu||"",ram:(t.specs||{}).ram||(t.specs||{}).memory||""})),a=__p0Scope.d.lastUserText||"",o=await fetch("/api/leai/compare-advice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({products:n,q:a})});if(!o.ok)return;const i=await o.json();if(e.__lxCompareDisplayChanged||!i.pick||!i.reason)return;t.innerHTML=`结合你的需求，当前推荐 <strong>${(0,__p0Scope.v)(i.pick)}</strong>：${(0,__p0Scope.v)(i.reason)}`;const r=String(i.pick||"").trim();let l=s.findIndex(t=>String(t.name||"").trim()===r);if(l<0&&(l=s.findIndex(t=>r&&(String(t.name||"").includes(r)||r.includes(String(t.name||"").trim())))),l>=0){__p0Scope.d._compareRecommendedSku=s[l]?.sku||"",__p0Scope.d._compareRecommendedProduct=s[l]||null;const t=e.querySelector(".lx-product-compare .lx-pc-grid");if(t){t.querySelectorAll("[data-col]").forEach(t=>t.classList.toggle("recommended",Number(t.dataset.col)===l)),t.querySelectorAll(".lx-pc-product-head").forEach(t=>t.classList.remove("top")),t.querySelectorAll(".lx-pc-action-cell").forEach(t=>t.classList.remove("bottom"));const e=t.querySelector(`.lx-pc-product-head[data-col="${l}"]`),n=t.querySelector(`.lx-pc-action-cell[data-col="${l}"]`);e?.classList.add("top"),n?.classList.add("bottom"),t.querySelectorAll(".lx-pc-rec-badge").forEach(t=>t.remove()),e?.insertAdjacentHTML("afterbegin",'<span class="lx-pc-rec-badge">乐享推荐</span>')}}}catch(t){}})()}); };
}
window.__p0Modules.dispatch(document.currentScript);
