/* Lead modal entry: reuse the established compact modal card, including restored answers. */
(function(){
  "use strict";
  var selector='button[data-lx-recommended-modal="enterprise-lead"][data-lx-result-id^="modal:enterprise-lead:"]';
  function compact(card){
    if(card.classList.contains("lx-lead-modal-compact"))return;
    card.classList.add("lx-auth-answer-card","lx-edu-auth-reco","lx-lead-modal-compact");
    var description=card.querySelector(".answer-cta-desc");
    if(description)description.remove();
    var copy=card.querySelector(".answer-cta-copy");
    if(copy)copy.classList.remove("answer-cta-copy");
  }
  function scan(root){
    if(root.nodeType!==1)return;
    if(root.matches(selector))compact(root);
    root.querySelectorAll(selector).forEach(compact);
  }
  scan(document.body);
  new MutationObserver(function(records){
    records.forEach(function(record){record.addedNodes.forEach(scan);});
  }).observe(document.body,{childList:true,subtree:true});
})();
