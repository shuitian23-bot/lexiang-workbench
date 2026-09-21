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
 const style=document.createElement('style');style.textContent=selector+'{cursor:pointer}'+selector+':focus-visible{outline:2px solid #4d144a;outline-offset:-2px}';document.head.appendChild(style);
 function sync(){document.querySelectorAll('.lx-product-compare .lx-pc-product-head[data-col]').forEach(head=>{const name=head.querySelector('.lx-pc-title')?.getAttribute('title')||'商品';if(head.getAttribute('role')!=='link'){head.setAttribute('role','link');head.setAttribute('aria-label','查看'+name+'详情');head.removeAttribute('aria-pressed');}});}
 new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});sync();
})();
