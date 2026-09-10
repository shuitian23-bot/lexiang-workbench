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

  function openEnterpriseMemberAuth() {
    document.querySelector(".lx-enterprise-member-auth-mask")?.remove();
    const mask = document.createElement("div");
    mask.id = "lxEnterpriseAuthOriginal";
    mask.className = "lx-p0-modal-mask lx-lead-modal-mask lx-enterprise-member-auth-mask show";
    mask.innerHTML = `<section class="lx-p0-modal lx-lead-shell" role="dialog" aria-modal="true" aria-labelledby="lxEnterpriseAuthTitle"><header class="lx-p0-modal-head"><h2 class="lx-p0-modal-title" id="lxEnterpriseAuthTitle">企业认证直升钻石会员</h2><button class="lx-p0-close" type="button" aria-label="关闭" data-modal-close>×</button></header><div class="lx-p0-modal-body"><div class="lx-lead-modal lx-enterprise-lead lx-diamond-upgrade"><form class="lx-diamond-upgrade-form" id="lxEnterpriseAuthForm" novalidate><label class="lx-diamond-field lx-diamond-phone-field"><span>手机号：</span><span class="lx-diamond-field-control"><input name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="请输入手机号" required><small>该手机号绑定企业需与上传附件中的企业名称一致</small></span></label><div class="lx-diamond-field lx-diamond-material-field"><span>请上传<br>认证材料：</span><div class="lx-diamond-field-control"><label class="lx-diamond-upload" for="lxDiamondMaterial"><img class="lx-diamond-upload-preview" data-upload-preview alt="已上传的认证材料预览"><span class="lx-diamond-upload-plus" aria-hidden="true">+</span><strong data-file-label>工牌、名片、<br>在职证明或系统职位信息</strong><input id="lxDiamondMaterial" name="material" type="file" accept="image/jpeg,image/png" required></label><small>您上传的文件需与填写手机号绑定的企业名称一致。图片大小在 3MB 以内，支持 JPG / PNG。</small></div></div><label class="lx-diamond-agree"><input type="checkbox" required><span>本人承诺所属企业非联想经销商，所购产品不用于二次销售；如有不实，平台有权取消钻石会员权益。</span></label><p class="lx-diamond-error" role="alert"></p><div class="lx-lead-actions"><button class="lx-lead-cancel" type="button" data-modal-close>取消</button><button class="lx-lead-submit" type="submit" disabled>提交</button></div></form></div></div></section>`;
    document.body.appendChild(mask);
    document.documentElement.classList.add("lx-modal-open");

    const modal = mask.querySelector(".lx-p0-modal");
    const phoneInput = mask.querySelector(".lx-diamond-phone-field input");
    const actions = mask.querySelector(".lx-lead-actions");
    modal.style.setProperty("width", "min(640px, calc(100vw - 32px))", "important");
    phoneInput.style.setProperty("height", "40px", "important");
    phoneInput.style.setProperty("min-height", "40px", "important");
    phoneInput.style.setProperty("box-shadow", "none", "important");
    actions.style.setProperty("width", "280px", "important");
    actions.style.setProperty("margin", "10px 0 0 auto", "important");

    const form = mask.querySelector("#lxEnterpriseAuthForm");
    const submit = form.querySelector(".lx-lead-submit");
    const file = form.elements.material;
    const upload = form.querySelector(".lx-diamond-upload");
    const preview = form.querySelector("[data-upload-preview]");
    const error = form.querySelector(".lx-diamond-error");
    const validPhone = () => form.elements.phone.value.trim().length > 0;
    const validFile = () => file.files[0] && ["image/jpeg", "image/png"].includes(file.files[0].type) && file.files[0].size > 0 && file.files[0].size <= 3 * 1024 * 1024;
    const sync = () => { submit.disabled = !(validPhone() && validFile() && form.querySelector('[type="checkbox"]').checked); };
    form.addEventListener("input", sync);
    form.addEventListener("change", () => {
      error.textContent = "";
      if (file.files[0] && !validFile()) {
        file.value = "";
        preview.removeAttribute("src");
        upload.classList.remove("has-preview");
        error.textContent = "请选择不超过 3MB 的 JPG 或 PNG 图片。";
      }
      if (validFile()) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          preview.src = String(reader.result || "");
          upload.classList.add("has-preview");
        }, { once: true });
        reader.readAsDataURL(file.files[0]);
      }
      sync();
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (submit.disabled) return;
      try { localStorage.setItem(applicationKey, JSON.stringify({status: "pending", submittedAt: Date.now()})); } catch {}
      close(mask);
      appendSubmittedMessage();
      window.__lxToast?.("钻石会员认证申请已提交，请留意审核结果");
    });
    mask.addEventListener("click", event => { if (event.target === mask || event.target.closest("[data-modal-close]")) close(mask); });
    mask.querySelector("input")?.focus();
  }

  const install = () => {
    window.__lxOpenEnterpriseDiamondUpgradeModal = openEnterpriseMemberAuth;
    window.__lxOpenEnterpriseAuthModal = openEnterpriseMemberAuth;
    window.__lxRecommendedModalRule?.register?.("enterprise-member-auth", openEnterpriseMemberAuth);
  };
  install();
  [0, 120, 600, 1600].forEach(delay => window.setTimeout(install, delay));
  window.addEventListener("click", event => { if (!event.target.closest?.(selector)) return; event.preventDefault(); event.stopImmediatePropagation(); openEnterpriseMemberAuth(); }, true);
})();

(function(){
'use strict';
const copy='已为你打开**企业会员认证**，请填写手机号并上传**认证材料**。提交申请后，请耐心等待审核结果。';
const matches=query=>/^(我要认证企业会员|如何认证企业会员)$/.test(String(query||'').trim().replace(/[。！!？?]+$/,''));
async function run(api){
 const gen=window.__lxGeneration, token=api.token;
 api.state.sending=true;api.refresh();
 try{
  const reply=api.message('assistant',copy);
  if(reply?._typingDone)await gen.wait(token,reply._typingDone);
  if(!gen.current(token))return false;
  api.appendCard(reply,api.card({title:'认证企业会员',desc:'填写手机号 · 上传认证材料',attr:'data-open-enterprise-auth-modal data-lx-result-id="modal:enterprise-member-auth" aria-label="打开企业会员认证弹窗"'}));
  const card=reply?.querySelector('[data-open-enterprise-auth-modal]');
  card?.classList.add('lx-document-card-enter');
  await gen.wait(token,new Promise(resolve=>gen.timeout(token,resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:700)));
  if(!gen.current(token))return false;
  api.enterSplit();window.__lxOpenEnterpriseDiamondUpgradeModal();
  api.state.queryHistory.push(api.query);api.history();return true;
 }finally{if(gen.current(token)){api.state.sending=false;api.refresh();window.__lxSaveConversationNow?.();}}
}
window.__lxEnterpriseAuthQuery={matches,copy,run};
})();
