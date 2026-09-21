/* 企业认证 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/enterprise-auth"]) {
window.__p0Modules.installed["modals/enterprise-auth"]=true;

/* public/leaip0/assets/frontend/js/core/enterprise-auth-original-v1.js */
window.__p0Modules.sources["u6fa7a08121402d64"]=function(){
(() => {
  if (window.__lxEnterpriseDiamondAuthV7) return;
  window.__lxEnterpriseDiamondAuthV7 = true;
  const selector = "[data-open-enterprise-auth-modal], [data-lx-result-id='modal:enterprise-member-auth']";
  const applicationKey = "lexiang.enterprise.diamond.application.v1";
  const close = mask => {
    mask?.remove();
    document.documentElement.classList.remove("lx-modal-open");
  };

  const appendSubmittedMessage = () => {
    const copy = "您已成功提交企业钻石会员申请，请耐心等待审核结果。";
    if (window.__lxAgentAPI?.addAiMessage) {
      window.__lxAgentAPI.addAiMessage(`<p>${copy}</p>`);
    } else {
      const list = document.querySelector(".shell > .assistant-panel .lx-p0-messages, .chat-state .lx-p0-messages");
      if (list) {
        const node = document.createElement("div");
        node.className = "lx-p0-message msg ai lx-chat-skin";
        node._raw = copy;
        node.innerHTML = `<article class="ai-wrap"><div class="ai-body"><p>${copy}</p></div></article>`;
        list.appendChild(node);
        list.scrollTop = list.scrollHeight;
      }
    }
    window.__lxSaveConversationNow?.();
  };

  function openEnterpriseMemberAuth(){return window.__p0Modules.invoke("modals/diamond-upgrade#openEnterpriseMemberAuth:2eccabe7ce57be50bc218bc6",{get ["close"](){return close},get ["appendSubmittedMessage"](){return appendSubmittedMessage},get ["applicationKey"](){return applicationKey}},this,arguments);}

  // Enterprise membership uses the three-field registration form. The diamond
  // upgrade has its own explicit entry and must not replace this shared route.
  const openEnterpriseRegistration = () => window.__lxExecControl?.("start_enterprise_auth");
  const install = () => {
    window.__lxOpenEnterpriseDiamondUpgradeModal = openEnterpriseMemberAuth;
    window.__lxOpenEnterpriseAuthModal = openEnterpriseRegistration;
    window.__lxRecommendedModalRule?.register?.("enterprise-member-auth", openEnterpriseRegistration);
  };
  install();
  [0, 120, 600, 1600].forEach(delay => window.setTimeout(install, delay));
  window.addEventListener("click", event => {
    const entry = event.target.closest?.(selector);
    if (!entry) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (entry.dataset.enterpriseAuthKind === "diamond") openEnterpriseMemberAuth();
    else openEnterpriseRegistration();
  }, true);
})();

(function(){
'use strict';
const copy='已为你打开**企业会员认证**，请填写**企业名称、企业税号和企业邮箱**。提交申请后，请耐心等待审核结果。';
const matches=query=>/^(我要认证企业会员|如何认证企业会员)$/.test(String(query||'').trim().replace(/[。！!？?]+$/,''));
async function run(api){
 const gen=window.__lxGeneration, token=api.token;
 api.state.sending=true;api.refresh();
 try{
  const reply=api.message('assistant',copy);
  if(reply?._typingDone)await gen.wait(token,reply._typingDone);
  if(!gen.current(token))return false;
  api.appendCard(reply,api.card({title:'认证企业会员',desc:'填写企业名称 · 企业税号 · 企业邮箱',attr:'data-open-enterprise-auth-modal data-lx-result-id="modal:enterprise-member-auth" aria-label="打开企业会员认证弹窗"'}));
  const card=reply?.querySelector('[data-open-enterprise-auth-modal]');
  card?.classList.add('lx-document-card-enter');
  await gen.wait(token,new Promise(resolve=>gen.timeout(token,resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:700)));
  if(!gen.current(token))return false;
  api.enterSplit();window.__lxOpenEnterpriseAuthModal();
  api.state.queryHistory.push(api.query);api.history();return true;
 }finally{if(gen.current(token)){api.state.sending=false;api.refresh();window.__lxSaveConversationNow?.();}}
}
window.__lxEnterpriseAuthQuery={matches,copy,run};
})();

};

/* Business: qn */
window.__p0Modules.factories["modals/enterprise-auth#qn:93fb330937ec050d2cfc9c03"]=function(__p0Scope){"use strict";return (function qn(){const t=(0,__p0Scope.Sn)();if("verified"===t.status)return void (0,__p0Scope.j)("企业账户已认证",`<div class="lx-ent-status ok"><strong>${(0,__p0Scope.v)(t.company||"贵公司")}</strong> 已通过企业采购负责人认证</div><ul class="lx-md-list"><li>企业专享价与采购补贴已生效</li><li>支持对公付款、增值税专票与企业账期咨询</li><li>专属客服与企业定制通道已开通</li></ul><div class="lx-p0-actions"><button class="lx-p0-btn primary" data-quick-ask="以企业身份帮我推荐办公采购方案并说明企业会员权益">看企业专享推荐</button></div><p class="lx-p0-disclaimer">POC 演示环境：认证为模拟流程，正式上线将对接联想企业购实名核验。</p>`);if("pending"===t.status)return void (0,__p0Scope.j)("企业认证审核中",`<div class="lx-ent-status pending">「${(0,__p0Scope.v)(t.company||"")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境审核约 10 秒自动完成；正式环境为 1-2 个工作日，结果会在本页面与账号菜单回显。</p>`);(0,__p0Scope.j)("企业会员认证",'\n            <div class="lx-lead-modal lx-enterprise-lead">\n              <p class="lx-lead-subtitle">请填写企业会员注册信息，企业邮箱将用于接收激活邮件。申请是否通过以企业会员服务回执为准。</p>\n              <form class="lx-lead-form" id="lxEnterpriseAuthForm" novalidate>\n                <label class="lx-lead-row"><span><i>*</i>企业名称</span><input id="lxEntCompany" autocomplete="organization" placeholder="请输入企业名称" required></label>\n                <label class="lx-lead-row"><span><i>*</i>企业税号</span><input id="lxEntCode" placeholder="请输入统一社会信用代码" required></label>\n                <label class="lx-lead-row"><span><i>*</i>企业邮箱</span><input id="lxEntEmail" type="email" autocomplete="email" placeholder="用于接收激活邮件，请正确填写" required></label>\n                <div class="lx-lead-actions"><button class="lx-lead-cancel" type="button" data-enterprise-auth-cancel>取消</button><button class="lx-lead-submit" type="button" data-ent-submit>提交认证申请</button></div>\n              </form>\n            </div>',{skin:"lead"});const e=document.querySelector("#lxEnterpriseAuthForm");e?.addEventListener("submit",event=>{event.preventDefault();e.querySelector("[data-ent-submit]")?.click()});window.setTimeout(()=>document.querySelector("#lxEntCompany")?.focus(),0)}); };
}
window.__p0Modules.dispatch(document.currentScript);
