/* 编辑个人资料 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/profile-edit"]) {
window.__p0Modules.installed["modals/profile-edit"]=true;

/* Business: (anonymous) */
window.__p0Modules.factories["modals/profile-edit#anonymous:c1cd8d93d4a65a03228e259f"]=function(__p0Scope){"use strict";return (function(t,e){const n=Object.assign({nickname:"联小想",gender:"secret",birthday:"1998-05-18",phone:"182****4919",customAvatar:""},t||{}),a=n.customAvatar||"/assets/icons/shortcut-membership.svg";(0,__p0Scope.j)("编辑个人资料",`<form class="lx-global-profile-form" data-global-profile-form novalidate>\n            <div class="lx-global-profile-grid">\n              <section class="lx-global-profile-avatar">\n                <div class="lx-global-profile-avatar-copy"><strong>会员头像</strong><span>支持 JPG、JPEG、PNG，图片大小不超过 4MB。</span></div>\n                <img data-global-profile-preview src="${(0,__p0Scope.v)(a)}" alt="会员头像预览">\n                <label class="lx-global-profile-upload" for="lxGlobalProfileFile">更换头像</label>\n                <input id="lxGlobalProfileFile" type="file" accept="image/jpeg,image/png" hidden>\n                <p data-global-profile-file-status></p>\n              </section>\n              <section class="lx-global-profile-fields">\n                <label><span>会员昵称</span><input id="lxGlobalProfileNickname" value="${(0,__p0Scope.v)(n.nickname)}" maxlength="20" required></label>\n                <div class="lx-global-profile-row"><label><span>性别</span><select id="lxGlobalProfileGender"><option value="secret"${"secret"===n.gender?" selected":""}>保密</option><option value="male"${"male"===n.gender?" selected":""}>男</option><option value="female"${"female"===n.gender?" selected":""}>女</option></select></label><label><span>生日</span><input id="lxGlobalProfileBirthday" type="date" value="${(0,__p0Scope.v)(n.birthday)}"></label></div>\n                <label><span>绑定手机号</span><input id="lxGlobalProfilePhone" value="${(0,__p0Scope.v)(n.phone)}" maxlength="11" inputmode="tel"></label>\n                <div class="lx-global-profile-note"><strong>账号安全</strong><span>手机号修改后需完成短信验证，当前页面为交互演示。</span></div>\n              </section>\n            </div>\n            <div class="lx-global-profile-actions"><span data-global-profile-status></span><button type="button" data-modal-close>取消</button><button type="submit">保存</button></div>\n          </form>`,{skin:"lead"});const o=(0,__p0Scope.I)();(0,__p0Scope.h)(".lx-p0-modal",o).classList.add("lx-global-profile-shell");let s=n.customAvatar||"";const i=(0,__p0Scope.h)("[data-global-profile-form]",o),r=(0,__p0Scope.h)("#lxGlobalProfileFile",i);r.addEventListener("change",()=>{const t=r.files&&r.files[0],e=(0,__p0Scope.h)("[data-global-profile-file-status]",i);if(!t)return;if(!["image/jpeg","image/png"].includes(t.type)||t.size>4194304)return e.textContent="请选择 4MB 以内的 JPG 或 PNG 图片",void(r.value="");const n=new FileReader;n.onload=()=>{s=String(n.result||""),(0,__p0Scope.h)("[data-global-profile-preview]",i).src=s,e.textContent="头像已载入"},n.readAsDataURL(t)}),i.addEventListener("submit",t=>{if(t.preventDefault(),!(0,__p0Scope.lxValidateModalFields)([["lxGlobalProfileNickname","请输入会员昵称"]]))return;const n={nickname:(0,__p0Scope.h)("#lxGlobalProfileNickname",i).value.trim(),gender:(0,__p0Scope.h)("#lxGlobalProfileGender",i).value,birthday:(0,__p0Scope.h)("#lxGlobalProfileBirthday",i).value,phone:(0,__p0Scope.h)("#lxGlobalProfilePhone",i).value.trim(),customAvatar:s};e&&e.postMessage&&e.postMessage({type:"lexiang:profile-updated",profile:n},window.location.origin),(0,__p0Scope.N)(),(0,__p0Scope.E)("个人资料已保存")}),setTimeout(()=>(0,__p0Scope.h)("#lxGlobalProfileNickname",i)?.focus(),0)}); };

/* Business: clearPhoneCodeCountdown */
window.__p0Modules.factories["modals/profile-edit#clearPhoneCodeCountdown:98854fe4f355ce1c7341d0f5"]=function(__p0Scope){"use strict";return (function clearPhoneCodeCountdown() {
    var form = (0,__p0Scope.el)("#leaiModalForm");
    if (form && form._phoneCodeTimer) {
      window.clearInterval(form._phoneCodeTimer);
      form._phoneCodeTimer = null;
    }
  }); };

/* Business: openProfileEditorModal */
window.__p0Modules.factories["modals/profile-edit#openProfileEditorModal:5de6a94ce7e31011e11cc2f6"]=function(__p0Scope){"use strict";return (function openProfileEditorModal(trigger) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "lexiang:open-profile-editor", profile: __p0Scope.state.profile }, window.location.origin);
      return;
    }
    (0,__p0Scope.clearPhoneCodeCountdown)();
    __p0Scope.state.modalType = "profile-editor";
    var mask = (0,__p0Scope.el)("#leaiModal");
    mask.dataset.profileParity = __p0Scope.state.modalType === "profile-editor" ? "profile" : "phone";
    var dialog = mask.querySelector(".leai-modal");
    dialog.classList.remove("is-student", "is-wechat", "is-service-order");
    dialog.classList.add("is-profile-editor");
    (0,__p0Scope.el)("#leaiModalTitle").textContent = "编辑个人资料";
    (0,__p0Scope.el)("#leaiModalDesc").textContent = "完善头像和基础信息，保存后同步更新会员中心。";
    mask.querySelector(".leai-modal-close").textContent = "×";
    mask.querySelector(".leai-modal-close").setAttribute("aria-label", "关闭编辑个人资料");
    var holder = document.createElement("div");
    holder.innerHTML = (0,__p0Scope.memberProfilePage)();
    var source = holder.querySelector("[data-member-profile-form]");
    var form = (0,__p0Scope.el)("#leaiModalForm");
    form.innerHTML = source.innerHTML;
    form.setAttribute("data-member-profile-form", "");
    form.onsubmit = null;
    var actions = form.querySelector(".leai-profile-actions");
    actions.classList.add("leai-order-action-pair");
    actions.insertAdjacentHTML("afterbegin", "<button class=\"leai-secondary\" type=\"button\" data-modal-close>取消</button>");
    var save = actions.querySelector(".leai-primary");
    save.textContent = "保存";
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    trigger.dataset.modalTrigger = "active";
    window.setTimeout(function () { form.querySelector("#leaiProfileNickname").focus(); }, 0);
  }); };

/* Business: openPhoneRebindModal */
window.__p0Modules.factories["modals/profile-edit#openPhoneRebindModal:f3e657c72864bf5910205ec4"]=function(__p0Scope){"use strict";return (function openPhoneRebindModal(trigger) {
    (0,__p0Scope.clearPhoneCodeCountdown)();
    __p0Scope.state.modalType = "phone-rebind";
    var mask = (0,__p0Scope.el)("#leaiModal");
    mask.dataset.profileParity = __p0Scope.state.modalType === "profile-editor" ? "profile" : "phone";
    mask.querySelector(".leai-modal").classList.remove("is-student", "is-wechat", "is-service-order", "is-profile-editor");
    (0,__p0Scope.el)("#leaiModalTitle").textContent = "更换绑定手机号";
    (0,__p0Scope.el)("#leaiModalDesc").textContent = "完成新手机号验证后再更新绑定关系。";
    var form = (0,__p0Scope.el)("#leaiModalForm");
    form.innerHTML = '<div class="leai-phone-current"><span>当前绑定手机号</span><strong>' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profile.phone) + '</strong></div><div class="leai-profile-fields"><div class="leai-field"><label for="leaiPhoneNew">新手机号</label><input id="leaiPhoneNew" inputmode="numeric" autocomplete="tel" maxlength="11" pattern="1[3-9][0-9]{9}" required placeholder="请输入 11 位手机号"></div><div class="leai-field"><label for="leaiPhoneCode">短信验证码</label><div class="leai-phone-code-row"><input id="leaiPhoneCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="请输入 6 位验证码"><button class="leai-phone-code-send" type="button" disabled data-phone-code-send>获取验证码</button></div><p class="leai-phone-code-feedback" data-phone-code-feedback aria-live="polite"></p></div></div><div class="leai-modal-actions leai-order-action-pair"><button class="leai-secondary" type="button" data-modal-close>取消</button><button class="leai-primary" type="submit">确认换绑</button></div>';
    var phoneInput = form.querySelector("#leaiPhoneNew");
    var codeInput = form.querySelector("#leaiPhoneCode");
    var codeButton = form.querySelector("[data-phone-code-send]");
    var codeFeedback = form.querySelector("[data-phone-code-feedback]");
    var codeCountdown = 0;
    var codeTimer = null;
    var syncCodeButton = function () {
      codeButton.disabled = codeCountdown > 0 || !/^1[3-9]\d{9}$/.test(phoneInput.value.trim());
    };
    phoneInput.addEventListener("input", function () {
      phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 11);
      codeFeedback.textContent = "";
      syncCodeButton();
    });
    codeInput.addEventListener("input", function () {
      codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
      codeFeedback.textContent = "";
    });
    codeButton.addEventListener("click", function () {
      if (!/^1[3-9]\d{9}$/.test(phoneInput.value.trim())) {
        codeFeedback.textContent = "请先输入正确的 11 位手机号。";
        phoneInput.focus();
        return;
      }
      codeCountdown = 60;
      codeFeedback.textContent = "验证码已发送；POC 演示验证码为 123456。";
      codeButton.textContent = codeCountdown + "s 后重发";
      syncCodeButton();
      codeTimer = form._phoneCodeTimer = window.setInterval(function () {
        codeCountdown -= 1;
        if (codeCountdown <= 0) {
          window.clearInterval(codeTimer);
          codeButton.textContent = "重新获取";
          syncCodeButton();
          return;
        }
        codeButton.textContent = codeCountdown + "s 后重发";
      }, 1000);
    });
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (codeInput.value !== "123456") {
        codeFeedback.textContent = "验证码不正确，请输入 123456。";
        codeInput.focus();
        return;
      }
      window.clearInterval(codeTimer);
      __p0Scope.state.profile.phone = (0,__p0Scope.maskPhone)(phoneInput.value);
      __p0Scope.state.profilePhoneStatus = "手机号已换绑（Mock）";
      (0,__p0Scope.closeModal)();
      (0,__p0Scope.refreshRightView)();
    };
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    trigger.dataset.modalTrigger = "active";
    syncCodeButton();
    window.setTimeout(function () { form.querySelector("#leaiPhoneNew").focus(); }, 0);
  }); };

/* Business: memberProfilePage */
window.__p0Modules.factories["modals/profile-edit#memberProfilePage:5cb2617defcd53fe504c9649"]=function(__p0Scope){"use strict";return (function memberProfilePage() {
    var avatarSource = (0,__p0Scope.profileAvatarIcon)();
    return '<section class="leai-page leai-member-profile-page" data-member-profile-page aria-labelledby="leaiProfileTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">会员账户</p><h1 class="leai-page-title" id="leaiProfileTitle">个人信息</h1><p class="leai-page-desc">维护会员头像和基础资料；账号与绑定手机号需通过独立安全流程修改。</p></div><span class="leai-status-pill"><img src="' + __p0Scope.icons.check + '" alt="">Mock 资料</span></header><div class="leai-profile-layout"><form class="leai-panel leai-profile-form" data-member-profile-form><div class="leai-panel-head"><div><h2 class="leai-panel-title">基础资料</h2><p>保存后同步更新会员中心的头像与昵称。</p></div></div>' +
      '<section class="leai-profile-upload" data-profile-upload data-query-focus="' + (__p0Scope.state.profileTarget === "avatar") + '"><div class="leai-profile-avatar-current"><img data-profile-avatar-preview src="' + avatarSource + '" alt="当前头像"><div><strong>头像</strong><p>支持 JPG、PNG，图片不超过 4MB。</p><label class="leai-secondary" for="leaiProfileAvatarFile">更换头像</label></div></div><input class="leai-visually-hidden" id="leaiProfileAvatarFile" type="file" accept="image/jpeg,image/png"><input id="leaiProfileCustomAvatarValue" type="hidden" value="' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profile.customAvatar) + '"><p class="leai-profile-upload-status" data-profile-avatar-error aria-live="polite"></p></section><div class="leai-profile-fields"><div class="leai-field"><label for="leaiProfileNickname">会员昵称</label><input id="leaiProfileNickname" value="' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profile.nickname) + '" maxlength="20" required></div><div class="leai-field"><label for="leaiProfileGender">性别</label><select id="leaiProfileGender"><option value="secret"' + (__p0Scope.state.profile.gender === "secret" ? " selected" : "") + '>保密</option><option value="male"' + (__p0Scope.state.profile.gender === "male" ? " selected" : "") + '>男</option><option value="female"' + (__p0Scope.state.profile.gender === "female" ? " selected" : "") + '>女</option></select></div><div class="leai-field"><label for="leaiProfileBirthday">生日</label><input id="leaiProfileBirthday" type="date" value="' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profile.birthday) + '"></div><div class="leai-field leai-profile-phone" data-profile-phone-section data-query-focus="' + (__p0Scope.state.profileTarget === "phone") + '"><label>绑定手机号</label><div class="leai-profile-phone-row"><output>' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profile.phone) + '</output><button class="leai-secondary" type="button" data-profile-phone-rebind>更换手机号</button></div><small data-profile-phone-status aria-live="polite">' + (0,__p0Scope.escapeHtml)(__p0Scope.state.profilePhoneStatus) + '</small></div></div><div class="leai-profile-actions"><button class="leai-primary" type="submit">保存</button><span data-profile-save-status aria-live="polite"></span></div></form></div></section>';
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
