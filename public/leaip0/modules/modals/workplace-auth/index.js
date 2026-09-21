/* 职场认证 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/workplace-auth"]) {
window.__p0Modules.installed["modals/workplace-auth"]=true;

/* Business: Pa */
window.__p0Modules.factories["modals/workplace-auth#Pa:5e228a9e4c58e720be1fc98b"]=function(__p0Scope){"use strict";return (function Pa() {
  let step = 1;
  const state = { type: "企业职工认证", name: "", idcard: "", phone: "13800138000", code: "", agree: false, company: "联想（北京）有限公司", industry: "", position: "", proofMethod: "email", corpEmail: "" };
  const proofFiles = {};
  let countdown = 0, timer = null;
  const methods = [
    ["email", "企业邮箱认证", "请用企业邮箱接收系统发送的验证邮件"],
    ["tax", "个人所得税APP 视频认证", "上传个人所得税APP「任职受雇信息」页面录屏视频，系统自动审核"],
    ["contract", "工作证明或劳动合同", "上传劳动合同或企业在职证明文件"],
    ["other", "其他", "上传工卡、名片等照片或者截图，证明在职状态"]
  ];
  const field = (id, label, placeholder, value, attrs = "") => `<label class="lx-wpa-field-group"><span class="lx-wpa-field-label"><i>*</i>${label}：</span><input class="lx-p0-field" id="${id}" placeholder="${placeholder}" value="${(0,__p0Scope.v)(value)}" ${attrs}></label>`;
  function save() {
    const value = id => (document.getElementById(id)?.value || "").trim();
    if (step === 2) { state.name = value("wpaName"); state.idcard = value("wpaIdcard"); state.phone = value("wpaPhone"); state.code = value("wpaCode"); state.agree = !!document.getElementById("wpaAgree")?.checked; }
    if (step === 3) { state.company = value("wpaCompany"); state.industry = value("wpaIndustry"); state.position = value("wpaPosition"); }
    if (step === 4 && state.proofMethod === "email") state.corpEmail = value("wpaEmailPrefix");
  }
  function render() {
    const steps = '<div class="lx-wpa-steps">' + ["认证类型", "实名认证", "在职认证", "材料提交"].map((label, index) => {
      const number = index + 1;
      return `<div class="lx-wpa-step ${number < step ? "done" : number === step ? "active" : ""}" ${number === step ? 'aria-current="step"' : ''}><div class="lx-wpa-dot">${number < step ? window.__lxApprovedIcon("global-check") : number}</div><span>${label}</span>${number < 4 ? `<div class="lx-wpa-line${number < step ? " done" : ""}"></div>` : ""}</div>`;
    }).join("") + '</div>';
    let body = "";
    if (step === 1) body = `<div class="lx-wpa-section lx-wpa-step-one-reference"><h4>第1步：企业职工认证</h4><p class="lx-wpa-step-lead">完成在职身份认证，即可解锁采购专属权益</p><div class="lx-wpa-methods"><p class="lx-wpa-methods-title">认证支持以下方式：</p><div class="lx-wpa-methods-grid"><div class="lx-wpa-method"><strong>1. 企业邮箱验证</strong><span>通过企业邮箱接收激活链接，点击完成认证</span></div><div class="lx-wpa-method"><strong>2. 个人所得税APP视频认证</strong><span>上传「任职受雇信息」录屏视频，<br>系统自动审核</span></div><div class="lx-wpa-method"><strong>3. 工作证明或劳动合同</strong><span>上传劳动合同或企业在职证明文件</span></div><div class="lx-wpa-method"><strong>4. 其他</strong><span>上传工卡、名片等照片或者截图，<br>证明在职状态</span></div></div></div><p class="lx-wpa-step-note">认证长期有效，点击「下一步」开始认证流程</p></div>`;
    if (step === 2) body = `<div class="lx-wpa-section"><h4>实名认证</h4>${field("wpaName", "姓名", "请输入姓名", state.name)}${field("wpaIdcard", "身份证号", "请输入身份证号", state.idcard)}${field("wpaPhone", "手机", "请输入手机号", state.phone, 'inputmode="tel"')}<div class="lx-wpa-field-group"><label class="lx-wpa-field-label" for="wpaCode"><i>*</i>验证码：</label><div class="lx-wpa-code-row"><input class="lx-p0-field lx-wpa-code-input" id="wpaCode" placeholder="请输入验证码" value="${(0,__p0Scope.v)(state.code)}" inputmode="numeric"><button class="lx-p0-btn lx-wpa-send-code" type="button" id="wpaSendCode" ${countdown ? "disabled" : ""}>${countdown ? countdown + "s 后重发" : "获取验证码"}</button></div></div><label class="lx-wpa-agree"><input type="checkbox" id="wpaAgree" ${state.agree ? "checked" : ""}> 我同意<a href="#" onclick="return false">《实名认证协议》</a></label></div>`;
    if (step === 3) body = `<div class="lx-wpa-section lx-wpa-employment-grid"><h4>企业在职认证</h4>${field("wpaCompany", "企业名称", "请输入企业名称", state.company)}<label class="lx-wpa-field-group"><span class="lx-wpa-field-label"><i>*</i>所属行业：</span><select class="lx-p0-field lx-wpa-select" id="wpaIndustry"><option value="">请选择行业</option>${["互联网/科技", "金融/银行", "制造业", "医疗/卫生", "教育/科研", "政府/事业", "零售/贸易", "其他"].map(item => `<option value="${(0,__p0Scope.v)(item)}" ${state.industry === item ? "selected" : ""}>${(0,__p0Scope.v)(item)}</option>`).join("")}</select></label>${field("wpaPosition", "职务", "请输入职务", state.position)}</div>`;
    if (step === 4) {
      const email = state.proofMethod === "email", video = state.proofMethod === "tax", file = proofFiles[state.proofMethod];
      const title = email ? "企业邮箱" : video ? "上传认证视频" : "上传认证材料";
      const hint = email ? "验证邮件将发送至企业邮箱" : video ? "仅支持视频，建议MP4/MOV，单个最大100MB" : "支持 PDF/JPG/PNG，单个最大20MB";
      const description = email ? "请填写本人正在使用的企业邮箱，验证链接有效期为 30 分钟。" : video ? "请上传个人所得税 APP 中由「个人中心」进入「任职受雇信息」页面的录屏视频，需清晰展示姓名、任职受雇公司和当前在职状态。" : "请确保材料内容清晰完整，并能证明本人当前在职状态。";
      const prompt = file ? file.name : video ? "点击上传个人所得税APP任职受雇信息录屏视频" : "点击上传在职证明材料";
      body = `<div class="lx-wpa-section lx-wpa-proof-step"><div class="lx-wpa-proof-heading"><h4>第4步：选择在职证明方式</h4><p>请选择任意一种方式验证你的在职身份</p></div><div class="lx-wpa-proof-list">${methods.map(([value, label, copy]) => `<label class="lx-wpa-radio${state.proofMethod === value ? " selected" : ""}"><input type="radio" name="wpa_proof" value="${value}" ${state.proofMethod === value ? "checked" : ""}><div class="lx-wpa-radio-body"><strong>${label}</strong><span>${copy}</span></div></label>`).join("")}</div><div class="lx-wpa-proof-upload"><div class="lx-wpa-upload-title"><strong><i>*</i>${title}</strong><span>${hint}</span></div>${email ? `<input class="lx-p0-field lx-wpa-proof-email" id="wpaEmailPrefix" type="email" aria-label="企业邮箱" placeholder="请输入企业邮箱" value="${(0,__p0Scope.v)(state.corpEmail)}">` : `<label class="lx-wpa-upload-box"><input id="wpaProofFile" type="file" aria-label="${title}" accept="${video ? '.mp4,.mov,video/mp4,video/quicktime' : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}"><span class="lx-wpa-upload-prompt"><b aria-hidden="true">+</b><span data-wpa-file-name>${(0,__p0Scope.v)(prompt)}</span></span></label>`}<p>${description}</p><p class="lx-wpa-file-error" role="alert" data-wpa-file-error></p></div></div>`;
    }
    const actions = `<div class="lx-p0-actions">${step > 1 ? '<button class="lx-p0-btn" type="button" data-wpa-back>返回</button>' : ""}<button class="lx-p0-btn primary${step === 4 ? ' lx-wpa-submit-btn' : ''}" type="button" ${step === 4 ? 'data-wpa-submit' : 'data-wpa-next'}>${step === 4 ? '提交认证' : '下一步'}</button></div>`;
    (0,__p0Scope.j)("企业职工认证", `<div class="lx-wpa-modal" data-wpa-step="${step}">${steps}${body}${actions}</div>`, {skin:"lead"});
  }
  function validate() {
    if (step === 2) return (0,__p0Scope.lxValidateModalFields)([
      ["wpaName", "请输入姓名"], ["wpaIdcard", "请输入身份证号"],
      ["wpaPhone", "请输入正确的手机号", "phone"], ["wpaCode", "请输入6位短信验证码", "code"],
      ["wpaAgree", "请阅读并同意实名认证协议"]
    ]);
    if (step === 3) return (0,__p0Scope.lxValidateModalFields)([
      ["wpaCompany", "请输入企业名称"], ["wpaIndustry", "请选择行业"], ["wpaPosition", "请输入职务"]
    ]);
    return true;
  }
  render();
  const mask = document.querySelector(".lx-p0-modal-mask");
  if (!mask) return;
  function cleanup() { clearInterval(timer); mask.removeEventListener("click", onClick, true); mask.removeEventListener("change", onFileChange); }
  function onFileChange(event) {
    if (event.target.id !== "wpaProofFile") return;
    const file = event.target.files?.[0];
    if (!file) return;
    const video = state.proofMethod === "tax", limit = (video ? 100 : 20) * 1024 * 1024;
    const validType = video ? /\.(mp4|mov)$/i.test(file.name) : /\.(pdf|jpe?g|png)$/i.test(file.name);
    const error = mask.querySelector('[data-wpa-file-error]');
    if (!validType || file.size > limit) { error.textContent = video ? "请选择 100MB 以内的 MP4 或 MOV 视频" : "请选择 20MB 以内的 PDF、JPG 或 PNG 文件"; event.target.value = ""; delete proofFiles[state.proofMethod]; (0,__p0Scope.lxValidateModalFields)([["wpaProofFile", error.textContent, () => !!proofFiles[state.proofMethod]]], {focus:false}); return; }
    proofFiles[state.proofMethod] = file;
    error.textContent = "";
    if (event.target.getAttribute("aria-invalid") === "true") (0,__p0Scope.lxValidateModalFields)([["wpaProofFile", "请上传有效的认证材料", () => !!proofFiles[state.proofMethod]]], {focus:false});
    mask.querySelector('[data-wpa-file-name]').textContent = file.name;
  }
  function onClick(event) {
    if (event.target === mask || event.target.closest('.lx-p0-close,[data-modal-close]')) { cleanup(); return; }
    if (event.target.closest('#wpaSendCode') && !countdown) {
      if (!(0,__p0Scope.lxValidateModalFields)([["wpaPhone", "请输入正确的手机号", "phone"]])) return;
      countdown = 60;
      const button = event.target.closest('#wpaSendCode'); button.disabled = true; button.textContent = countdown + "s 后重发";
      timer = setInterval(() => { countdown--; const current = document.getElementById('wpaSendCode'); if (current) { current.textContent = countdown ? countdown + "s 后重发" : "获取验证码"; current.disabled = countdown > 0; } if (!countdown) clearInterval(timer); }, 1000);
      return;
    }
    const radio = event.target.closest('input[name="wpa_proof"]');
    if (radio) { save(); state.proofMethod = radio.value; render(); return; }
    if (event.target.closest('[data-wpa-back]')) { save(); step--; render(); return; }
    if (event.target.closest('[data-wpa-next]')) { save(); if (validate()) { step++; render(); } return; }
    if (event.target.closest('[data-wpa-submit]')) {
      save();
      if (state.proofMethod === "email" && !(0,__p0Scope.lxValidateModalFields)([["wpaEmailPrefix", "请输入正确的企业邮箱", "email"]])) return;
      if (state.proofMethod !== "email" && !(0,__p0Scope.lxValidateModalFields)([["wpaProofFile", state.proofMethod === "tax" ? "请上传认证视频" : "请上传在职证明材料", () => !!proofFiles[state.proofMethod]]])) return;
      cleanup(); (0,__p0Scope.N)(); (0,__p0Scope.E)("认证材料已提交，审核通过后专属权益自动到账（演示）");
    }
  }
  mask.addEventListener("click", onClick, true);
  mask.addEventListener("change", onFileChange);
}); };
}
window.__p0Modules.dispatch(document.currentScript);
