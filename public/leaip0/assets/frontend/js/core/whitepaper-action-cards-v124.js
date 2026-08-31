/* Whitepaper reply actions: reuse compact modal-entry cards without changing actions. */
(function(){
  'use strict';
  if(window.__lxWhitepaperActionCardsV124)return;
  window.__lxWhitepaperActionCardsV124=true;
  const selector='.lx-p0-message.ai, .msg.ai';
  function update(message){
    if(!/白皮书/.test(message.textContent||''))return;
    message.querySelectorAll('button').forEach(button=>{
      if(button.classList.contains('lx-whitepaper-action-card'))return;
      const title=(button.textContent||'').trim();
      if(title!=='在线咨询'&&title!=='提交项目需求')return;
      button.classList.remove('lx-p0-btn','primary');
      button.classList.add('answer-cta','lx-answer-page','lx-auth-answer-card','lx-edu-auth-reco','lx-whitepaper-action-card');
      const label=document.createElement('span');
      label.className='answer-cta-title';label.textContent=title;
      const arrow=document.createElement('span');
      arrow.className='answer-cta-icon';arrow.setAttribute('aria-hidden','true');
      const icon=document.createElement('img');icon.src='/icons/global-next.svg';icon.alt='';
      arrow.appendChild(icon);button.replaceChildren(label,arrow);
      if(button.parentElement?.classList.contains('lx-p0-actions'))button.parentElement.classList.add('lx-whitepaper-modal-actions');
    });
  }
  const style=document.createElement('style');
  style.textContent='.lx-whitepaper-modal-actions{display:flex!important;flex-direction:column;align-items:flex-start;gap:8px!important}.lx-whitepaper-modal-actions>.lx-whitepaper-action-card{margin:0!important}';
  document.head.appendChild(style);
  document.querySelectorAll(selector).forEach(update);
  const pending=new Set();let scheduled=false;
  new MutationObserver(records=>{
    records.forEach(record=>{
      const el=record.target.nodeType===1?record.target:record.target.parentElement;
      const message=el?.closest(selector);if(message)pending.add(message);
      record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches(selector))pending.add(node);node.querySelectorAll(selector).forEach(el=>pending.add(el));});
    });
    if(scheduled||!pending.size)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;pending.forEach(update);pending.clear();});
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
