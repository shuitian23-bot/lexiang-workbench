(()=>{
'use strict';
const legacy=/^已下单成功[（(]演示[）)]\s*[：:]/;
function clean(){
 document.querySelectorAll('.lx-p0-message').forEach(message=>{
  const text=String(message._raw||message.querySelector('.ai-body')?.textContent||message.textContent||'').trim();
  if(legacy.test(text)){message.setAttribute('data-lx-legacy-demo-order','hidden');message.setAttribute('aria-hidden','true');}
 });
}
const style=document.createElement('style');
style.textContent='[data-lx-legacy-demo-order="hidden"]{display:none!important}';
document.head.appendChild(style);
let pending=false;
const observer=new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;clean();});}});
observer.observe(document.body,{childList:true,subtree:true,characterData:true});clean();
})();
