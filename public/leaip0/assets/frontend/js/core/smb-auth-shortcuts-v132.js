(function(){
 'use strict';
 if(location.pathname.split('/').filter(Boolean)[0]!=='b-chat'||window.__lxSmbAuthShortcutsV132)return;
 window.__lxSmbAuthShortcutsV132=true;
 window.addEventListener('click',function(event){
  const button=event.composedPath().find(node=>node?.matches?.('.shortcut-row .shortcut, .shortcut-row .menu-row'));
  if(!button)return;
  const label=(button.textContent||'').trim();
  const query={'企业认证':'我要进行企业认证','职场认证':'我要进行职场认证'}[label];
  if(!query||typeof window.__lxBridge?.sendChat!=='function')return;
  event.preventDefault();event.stopImmediatePropagation();
  const menu=button.closest('.more-wrap');
  if(menu){menu.classList.remove('open','is-open');menu.querySelector('button')?.setAttribute('aria-expanded','false');}
  window.__lxBridge.sendChat(query);
 },true);
})();
