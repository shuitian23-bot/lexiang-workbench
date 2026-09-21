/* 留资 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/lead-form"]) {
window.__p0Modules.installed["modals/lead-form"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/smb-lead-modal-compact-v118.js */
window.__p0Modules.sources["u40fc223dfc9c2a65"]=function(){
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

};

/* Business: Fs */
window.__p0Modules.factories["modals/lead-form#Fs:b53d8f418d9bff48087807bc"]=function(__p0Scope){"use strict";return (function Fs(t){__p0Scope.d.leadScenario=t||("enterprise"===__p0Scope.d.page?"biz_intent":"b_purchase");const e=String(__p0Scope.d.leadScenario||"").startsWith("project:")?String(__p0Scope.d.leadScenario).replace(/^project:/,""):"",n=String(__p0Scope.d.leadScenario||"").startsWith("whitepaper:")?String(__p0Scope.d.leadScenario).replace(/^whitepaper:/,""):"",a=n?`请填写您希望通过${n}重点了解的内容`:e?`请填写您期望的合作内容或想了解到相关方案，如：${e}落地范围、终端数量、交付周期`:"请填写您期望的合作内容或想了解到相关方案";(0,__p0Scope.j)(n?"下载白皮书":"项目合作",`\n            <div class="lx-lead-modal">\n              <p class="lx-lead-subtitle">${n?`请先完善联系信息，提交成功后将自动下载《${(0,__p0Scope.v)(n)}》。`:"请填写表单，我们会尽快与您联系"+(e?`，当前意向：${(0,__p0Scope.v)(e)}`:"")}</p>\n              <div class="lx-lead-form">\n                <label class="lx-lead-row"><span><i>*</i>姓名</span><input id="lxLeadName" autocomplete="name" placeholder="请输入姓名"></label>\n                <label class="lx-lead-row"><span><i>*</i>邮箱</span><input id="lxLeadEmail" type="email" autocomplete="email" placeholder="请输入邮箱"></label>\n                <label class="lx-lead-row"><span><i>*</i>手机</span><input id="lxLeadPhone" inputmode="tel" autocomplete="tel" placeholder="请输入手机号" value="${(0,__p0Scope.v)((0,__p0Scope.lxLeadAccountPhone)())}"></label>\n                <label class="lx-lead-row lx-lead-code"><span><i>*</i>验证码</span><input id="lxLeadCode" inputmode="numeric" placeholder="请输入短信验证码"><button type="button" data-lead-code>获取验证码</button></label>\n                <label class="lx-lead-row"><span><i>*</i>公司</span><input id="lxLeadCompany" autocomplete="organization" placeholder="请输入公司名称"></label>\n                <label class="lx-lead-row"><span><i>*</i>城市</span><input id="lxLeadCity" placeholder="请输入所在城市"></label>\n                <label class="lx-lead-row"><span><i>*</i>职务</span><select id="lxLeadJob"><option value="">请选择职务</option><option>企业负责人</option><option>IT/信息化负责人</option><option>采购负责人</option><option>项目负责人</option><option>其他</option></select></label>\n                <label class="lx-lead-row"><span><i>*</i>行业</span><select id="lxLeadIndustry"><option value="">请选择行业</option><option>政府/公共事业</option><option>教育</option><option>医疗</option><option>制造</option><option>金融</option><option>能源</option><option>服务业</option><option>其他</option></select></label>\n                <label class="lx-lead-row"><span>预算</span><select id="lxLeadBudget"><option value="">请选择预算</option><option>10万以内</option><option>10万-50万</option><option>50万-100万</option><option>100万以上</option><option>暂不确定</option></select></label>\n                <label class="lx-lead-row lx-lead-message"><span><i>*</i>留言</span><textarea id="lxLeadNeed" rows="3" placeholder="${(0,__p0Scope.v)(a)}"></textarea></label>\n              </div>\n              <div class="lx-lead-actions">\n                <button class="lx-lead-cancel" type="button" data-modal-close>取消</button>\n                <button class="lx-lead-submit" type="button" data-submit-lead>提交</button>\n              </div>\n            </div>`,{skin:"lead"})}); };
}
window.__p0Modules.dispatch(document.currentScript);
