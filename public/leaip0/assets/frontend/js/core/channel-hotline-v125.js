(function(){
 'use strict';
 if(window.__lxChannelHotlineV125)return;window.__lxChannelHotlineV125=true;
 window.addEventListener('click',function(event){
  const button=event.composedPath().find(node=>node?.matches?.('.shortcut-row button, .shortcut-row a'));
  if(!button||(button.textContent||'').trim()!=='咨询热线')return;
  const channel=location.pathname.split('/').filter(Boolean)[0];
  const name=channel==='b-chat'?'中小企业':channel==='biz-chat'?'政教及大企业':'';
  if(!name||typeof window.__lxBridge?.sendChat!=='function')return;
  event.preventDefault();event.stopImmediatePropagation();
  window.__lxBridge.sendChat(name+'的咨询热线是多少？');
 },true);
})();
