/* 教育认证 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/education-auth"]) {
window.__p0Modules.installed["modals/education-auth"]=true;

/* public/leaip0/assets/frontend/js/core/education-auth-accessibility-v1.js */
window.__p0Modules.sources["u214a3172388c51d8"]=function(){
/* Common keyboard contract. Close through each component's own handler. */
(() => {
  if (window.__lxEducationAccessibilityV1) return;
  window.__lxEducationAccessibilityV1 = true;
  const selector = '.lx-p0-modal:has(.lx-stuauth-modal),.lx-p0-modal:has(.lx-edu-success-lead)';
  const closeSelector = '.lx-p0-close,[data-modal-close]';
  const visible = el => el.isConnected && !el.closest('[aria-hidden="true"],[hidden]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const focusables = el => [...el.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(visible);
  const openers = new WeakMap();
  let current = null, previousFocus = null, scheduled = false;
  document.addEventListener('pointerdown', e => { if (!e.target.closest(selector)) previousFocus = e.target.closest('button,a,[tabindex]') || document.activeElement; }, true);
  const top = () => [...document.querySelectorAll(selector)].filter(visible).sort((a,b) => {
    const z = el => Number(getComputedStyle(el.closest('.lx-p0-modal-mask,.leai-modal-mask,[data-buy-modal-direct]') || el).zIndex)||0;
    return z(a)-z(b);
  }).pop();
  function sync() {
    scheduled = false;
    const next = top();
    if (next) {
      const labelledBy = next.getAttribute('aria-labelledby');
      if (labelledBy && !document.getElementById(labelledBy)) next.removeAttribute('aria-labelledby');
      if (!next.hasAttribute('aria-labelledby')) {
        const title = next.querySelector('h2,.lx-p0-modal-title')?.textContent?.trim();
        if (title && next.getAttribute('aria-label') !== title) next.setAttribute('aria-label',title);
      }
    }
    if (next === current) return;
    const old = current; current = next;
    if (old && !visible(old)) {
      const opener = openers.get(old);
      if (opener && visible(opener) && (!next || next.contains(opener))) opener.focus({preventScroll:true});
    }
    if (!next) return;
    openers.set(next, previousFocus || document.activeElement);
    next.setAttribute('role','dialog'); next.setAttribute('aria-modal','true');
    if (!next.hasAttribute('aria-label') && !next.hasAttribute('aria-labelledby')) next.setAttribute('aria-label',next.querySelector('h2,.lx-p0-modal-title')?.textContent?.trim() || (next.classList.contains('lx-auth-modal')?'账号登录':'详情'));
    const close = next.querySelector(closeSelector);
    if (close && !close.getAttribute('aria-label')) close.setAttribute('aria-label','关闭弹窗');
    next.querySelectorAll('input[placeholder]').forEach(input => {
      if (!input.labels?.length && !input.hasAttribute('aria-label')) input.setAttribute('aria-label',input.getAttribute('placeholder'));
    });
    if (!next.contains(document.activeElement)) (focusables(next)[0] || next).focus({preventScroll:true});
  }
  new MutationObserver(() => {if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
  document.addEventListener('keydown', e => {
    const dialog = top(); if (!dialog) return;
    if (e.key === 'Escape') {
      const close = dialog.querySelector(closeSelector);
      if (close) {e.preventDefault();e.stopImmediatePropagation();close.click();}
    } else if (e.key === 'Tab') {
      const items=focusables(dialog),first=items[0],last=items[items.length-1];
      if(!first){e.preventDefault();return;}
      if(!dialog.contains(document.activeElement) || (!e.shiftKey && document.activeElement===last) || (e.shiftKey && document.activeElement===first)) {e.preventDefault();(e.shiftKey?last:first).focus();}
    }
  },true);
})();

};

/* Business: Ca */
window.__p0Modules.factories["modals/education-auth#Ca:d716eaadb2ab4751fb8d68e4"]=function(__p0Scope){"use strict";return (function Ca(t){t||(t="college");const e=(0,__p0Scope._a)();if("verified"===e.status)return void (0,__p0Scope.j)("教育认证已通过",`\n              <div class="lx-lead-modal lx-edu-success-lead">\n                <p class="lx-lead-subtitle">认证信息已同步，以下教育权益现已生效。</p>\n                <div class="lx-edu-success-summary" aria-label="教育认证结果">\n                  <div class="lx-edu-success-user">\n                    <span class="lx-edu-success-mark" aria-hidden="true">✓</span>\n                    <div><small>认证用户</small><strong>${(0,__p0Scope.v)(e.name||"用户")}</strong><p>教育身份权益已绑定至当前会员账号</p></div>\n                    <span class="lx-edu-success-status"><i></i>认证已通过</span>\n                  </div>\n                  <div class="lx-edu-success-benefits">\n                    <div><span>教育专享价</span><strong>已生效</strong></div>\n                    <div><span>身份权益</span><strong>已绑定</strong></div>\n                  </div>\n                </div>\n                <p class="lx-edu-success-disclaimer">认证结果以正式身份核验信息为准。</p>\n                <div class="lx-lead-actions">\n                  <button class="lx-lead-cancel" type="button" data-modal-close>关闭</button>\n                  <button class="lx-lead-submit" type="button" data-edu-zone>进入教育特惠专区</button>\n                </div>\n              </div>`,{skin:"lead"});if("pending"===e.status)return void (0,__p0Scope.j)("教育认证审核中",`<div class="lx-ent-status pending">「${(0,__p0Scope.v)(e.name||"")}」的认证资料已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境约 12 秒自动通过；正式环境 1-5 天，结果在教育专区与本弹窗回显。</p>`);let n="gaokao"===t?"gaokao":"teacher"===t?"teacher":"college";function a(t){return"teacher"===t?"teacherEmail":"gaokao"===t?"real":"email"}let o=a(n);const s={name:"",idcard:"",phone:"18910864473",email:"",school:"",gradYear:"",degree:"",cardNo:"",stage:"",examNo:"",teacherNo:"",subject:"",agree:!1};function i(){s.agree=document.getElementById("saAgree")?.checked||!1,s.name=(document.getElementById("saName")?.value||"").trim(),s.idcard=(document.getElementById("saIdcard")?.value||"").trim(),s.email=(document.getElementById("saEmail")?.value||"").trim(),s.school=(document.getElementById("saSchool")?.value||"").trim(),s.gradYear=(document.getElementById("saGradYear")?.value||document.getElementById("saGradYear2")?.value||"").trim(),s.degree=(document.getElementById("saDegree")?.value||"").trim(),s.cardNo=(document.getElementById("saCardNo")?.value||"").trim(),s.stage=(document.getElementById("saStage")?.value||"").trim(),s.examNo=(document.getElementById("saExamNo")?.value||"").trim(),s.teacherNo=(document.getElementById("saTeacherNo")?.value||"").trim(),s.subject=(document.getElementById("saSubject")?.value||"").trim()}function r(){(0,__p0Scope.j)("教育认证",function(){const t=[{id:"college",label:"在校生认证",desc:"学生身份核验，解锁学生专享价"},{id:"teacher",label:"教师认证",desc:"教师身份核验，享教师专属权益"},{id:"gaokao",label:"高考生认证",desc:"高考生身份核验，享升学购机优惠"}],e=t.find(t=>t.id===n)||t[0],i='<div class="lx-stuauth-roles" role="tablist" aria-label="教育认证身份类型">'+t.map(t=>`<button class="lx-stuauth-role${n===t.id?" active":""}" type="button" role="tab" aria-selected="${n===t.id?"true":"false"}" data-stuauth-role="${t.id}"><strong>${t.label}</strong><span>${t.desc}</span></button>`).join("")+"</div>",r={college:[{id:"email",label:"edu邮箱认证",desc:"使用学校 edu 邮箱收取验证邮件"},{id:"card",label:"学生证认证",desc:"上传学生证信息完成校验"},{id:"wechat",label:"微信学籍",desc:"通过微信授权核验学籍状态"}],teacher:[{id:"teacherEmail",label:"单位邮箱认证",desc:"使用学校或教育机构邮箱收取验证邮件"},{id:"teacherCard",label:"教师证认证",desc:"上传教师资格证或工牌信息"},{id:"teacherWechat",label:"微信认证",desc:"通过微信授权核验教师身份"}],gaokao:[{id:"real",label:"实名认证",desc:"填写实名信息与考生号"},{id:"skip",label:"考生号认证",desc:"跳过实名，仅凭考生号完成认证"}]},l=r[n]||r.college;l.some(t=>t.id===o)||(o=a(n));const c=l.find(t=>t.id===o)||l[0],d='<div class="lx-stuauth-tabs" role="tablist" aria-label="认证方式">'+l.map(t=>`<button class="lx-stuauth-tab${o===t.id?" active":""}" type="button" role="tab" aria-selected="${o===t.id?"true":"false"}" data-stuauth-tab="${t.id}"><strong>${t.label}</strong><span>${t.desc}</span></button>`).join("")+"</div>";let p="";p="college"===n&&"email"===o?'<div class="lx-stuauth-form"><label class="lx-stuauth-field"><span>学校名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入学校名称" value="'+(0,__p0Scope.v)(s.school)+'"></label><label class="lx-stuauth-field"><span>毕业时间</span><input class="lx-p0-field" id="saGradYear" placeholder="如 2026-07" value="'+(0,__p0Scope.v)(s.gradYear)+'"></label><label class="lx-stuauth-field"><span>学历</span><select class="lx-p0-field lx-wpa-select" id="saDegree"><option value="">请选择学历</option>'+["专科","本科","硕士","博士"].map(t=>`<option value="${t}"${s.degree===t?" selected":""}>${t}</option>`).join("")+'</select></label><label class="lx-stuauth-field"><span>edu 邮箱</span><input class="lx-p0-field" id="saEmail" placeholder="name@school.edu.cn" value="'+(0,__p0Scope.v)(s.email)+'"></label><div class="lx-stuauth-note"><strong>验证提醒</strong><span>验证邮件将发送至上述 edu 邮箱，请注意查收。</span></div></div>':"college"===n&&"card"===o?'<div class="lx-stuauth-form two-col"><label class="lx-stuauth-field"><span>真实姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入真实姓名" value="'+(0,__p0Scope.v)(s.name)+'"></label><label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="'+(0,__p0Scope.v)(s.idcard)+'"></label><label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label><label class="lx-stuauth-field"><span>学生证号</span><input class="lx-p0-field" id="saCardNo" placeholder="请输入学生证号" value="'+(0,__p0Scope.v)(s.cardNo)+'"></label><label class="lx-stuauth-field"><span>教育阶段</span><select class="lx-p0-field lx-wpa-select" id="saStage"><option value="">请选择教育阶段</option>'+["小学","初中","高中","专科","本科","硕士","博士"].map(t=>`<option value="${t}"${s.stage===t?" selected":""}>${t}</option>`).join("")+'</select></label><label class="lx-stuauth-field"><span>毕业时间</span><input class="lx-p0-field" id="saGradYear2" placeholder="如 2026-07" value="'+(0,__p0Scope.v)(s.gradYear)+'"></label><div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传学生证照片</strong><em>支持 JPG/PNG，仅用于演示</em></div></div>':"college"===n&&"wechat"===o?'<div class="lx-stuauth-wechat"><p>授权微信获取学籍状态，系统反馈验证结果。扫描下方小程序或 App 二维码完成授权。</p><div class="lx-stuauth-qr-row"><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>乐享小程序</strong><span>扫码进入认证</span></div><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>联想 App</strong><span>授权学籍信息</span></div></div><button class="lx-p0-btn lx-stuauth-status-btn" type="button" data-stuauth-wechat-done>我已认证，查看认证状态</button></div>':"teacher"===n&&"teacherEmail"===o?'<div class="lx-stuauth-form"><label class="lx-stuauth-field"><span>学校 / 机构名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入任教学校或机构" value="'+(0,__p0Scope.v)(s.school)+'"></label><label class="lx-stuauth-field"><span>任教学科</span><input class="lx-p0-field" id="saSubject" placeholder="如 计算机 / 数学" value="'+(0,__p0Scope.v)(s.subject)+'"></label><label class="lx-stuauth-field"><span>教师姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入教师姓名" value="'+(0,__p0Scope.v)(s.name)+'"></label><label class="lx-stuauth-field"><span>单位邮箱</span><input class="lx-p0-field" id="saEmail" placeholder="name@school.edu.cn" value="'+(0,__p0Scope.v)(s.email)+'"></label><div class="lx-stuauth-note"><strong>教师权益</strong><span>认证后可享教师专属教育价、采购咨询和服务权益。</span></div></div>':"teacher"===n&&"teacherCard"===o?'<div class="lx-stuauth-form two-col"><label class="lx-stuauth-field"><span>教师姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入教师姓名" value="'+(0,__p0Scope.v)(s.name)+'"></label><label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="'+(0,__p0Scope.v)(s.idcard)+'"></label><label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label><label class="lx-stuauth-field"><span>教师资格证号</span><input class="lx-p0-field" id="saTeacherNo" placeholder="请输入教师资格证号" value="'+(0,__p0Scope.v)(s.teacherNo)+'"></label><label class="lx-stuauth-field"><span>学校 / 机构名称</span><input class="lx-p0-field" id="saSchool" placeholder="请输入任教学校或机构" value="'+(0,__p0Scope.v)(s.school)+'"></label><label class="lx-stuauth-field"><span>任教学科</span><input class="lx-p0-field" id="saSubject" placeholder="如 计算机 / 数学" value="'+(0,__p0Scope.v)(s.subject)+'"></label><div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传教师资格证或工牌</strong><em>支持 JPG/PNG，仅用于演示</em></div></div>':"teacher"===n&&"teacherWechat"===o?'<div class="lx-stuauth-wechat"><p>授权微信获取教师身份状态，系统反馈验证结果。扫描下方小程序或 App 二维码完成授权。</p><div class="lx-stuauth-qr-row"><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>乐享小程序</strong><span>扫码进入教师认证</span></div><div class="lx-stuauth-qr"><div class="lx-stuauth-qr-box"></div><strong>联想 App</strong><span>授权教师信息</span></div></div><button class="lx-p0-btn lx-stuauth-status-btn" type="button" data-stuauth-wechat-done>我已认证，查看认证状态</button></div>':"gaokao"===n&&"real"===o?'<div class="lx-stuauth-form two-col"><div class="lx-stuauth-validity">高考生认证有效期至 10 月 31 日</div><label class="lx-stuauth-field"><span>真实姓名</span><input class="lx-p0-field" id="saName" placeholder="请输入真实姓名" value="'+(0,__p0Scope.v)(s.name)+'"></label><label class="lx-stuauth-field"><span>身份证号</span><input class="lx-p0-field" id="saIdcard" placeholder="请输入身份证号" value="'+(0,__p0Scope.v)(s.idcard)+'"></label><label class="lx-stuauth-field"><span>手机号</span><input class="lx-p0-field" id="saPhone" placeholder="手机号" value="18910864473" readonly></label><label class="lx-stuauth-field"><span>考生号 / 准考证号</span><input class="lx-p0-field" id="saExamNo" placeholder="请输入考生号或准考证号" value="'+(0,__p0Scope.v)(s.examNo)+'"></label><div class="lx-stuauth-upload"><span class="lx-stuauth-upload-icon">+</span><strong>上传准考证照片</strong><em>支持 JPG/PNG，仅用于演示</em></div></div>':'<div class="lx-stuauth-form"><div class="lx-stuauth-note"><strong>轻量认证</strong><span>可跳过实名验证，直接凭考生号认证高考生身份，享教育专享价。</span></div><label class="lx-stuauth-field"><span>考生号 / 准考证号</span><input class="lx-p0-field" id="saExamNo" placeholder="请输入考生号或准考证号" value="'+(0,__p0Scope.v)(s.examNo)+'"></label></div>';const u='<label class="lx-stuauth-agree"><input type="checkbox" id="saAgree"'+(s.agree?" checked":"")+'> <span>已阅读并同意联想<a href="#" onclick="return false">《服务须知》</a>和<a href="#" onclick="return false">《活动规则》</a></span></label>';return'<div class="lx-stuauth-modal">'+i+d+'<div class="lx-stuauth-panel"><div class="lx-stuauth-panel-head"><strong>'+e.label+" · "+c.label+"</strong><span>"+c.desc+"</span></div>"+p+"</div>"+u+'<div class="lx-stuauth-actions"><button class="lx-p0-btn" type="button" data-modal-close>取消</button><button class="lx-p0-btn primary" type="button" data-stuauth-submit>立即认证</button></div><p class="lx-stuauth-disclaimer">POC 演示流程，不真实提交，演示约 12 秒自动通过。</p></div>'}(),{skin:"lead"});const t=document.querySelector(".lx-p0-modal-mask");t&&t.addEventListener("click",l,!0)}function l(t){const e=t.target.closest("[data-stuauth-role]");if(e)return i(),n=e.getAttribute("data-stuauth-role")||"college",o=a(n),void r();const c=t.target.closest("[data-stuauth-tab]");if(c)return i(),o=c.getAttribute("data-stuauth-tab"),void r();if(t.target.closest("[data-modal-close]")){const t=document.querySelector(".lx-p0-modal-mask");return t&&t.removeEventListener("click",l,!0),void (0,__p0Scope.N)()}if(t.target.closest("[data-stuauth-wechat-done]")){const t=document.querySelector(".lx-p0-modal-mask");return t&&t.removeEventListener("click",l,!0),(0,__p0Scope.N)(),(0,__p0Scope.E)("认证状态确认中，演示约 12 秒自动通过"),(0,__p0Scope.Ta)({status:"pending",name:"演示用户",kind:n,submittedAt:Date.now()}),void setTimeout(()=>{"verified"===(0,__p0Scope._a)().status&&((0,__p0Scope.E)("教育认证已通过，教育专享价已生效"),"info:edu"===__p0Scope.d.activeTabId&&(0,__p0Scope.Ea)())},__p0Scope.Sa+500)}if(t.target.closest("[data-stuauth-submit]")){i();const rules=[["saAgree","请阅读并同意服务须知和活动规则"]];if("gaokao"===n)rules.push(["saExamNo","请输入考生号"]);if("college"===n&&"email"===o)rules.push(["saEmail","请输入正确的 edu 邮箱","email"]);if("college"===n&&"card"===o)rules.push(["saName","请输入真实姓名"]);if("teacher"===n&&"teacherEmail"===o)rules.push(["saSchool","请输入学校或机构"],["saEmail","请输入正确的单位邮箱","email"]);if("teacher"===n&&"teacherCard"===o)rules.push(["saName","请输入教师姓名"],["saTeacherNo","请输入教师资格证号"]);if(!(0,__p0Scope.lxValidateModalFields)(rules))return;const t=s.name||(s.email?s.email.split("@")[0]:"用户");const e=document.querySelector(".lx-p0-modal-mask");e&&e.removeEventListener("click",l,!0),(0,__p0Scope.Ta)({status:"pending",name:t,kind:n,submittedAt:Date.now()}),(0,__p0Scope.N)(),(0,__p0Scope.E)("认证资料已提交，审核中（演示约 12 秒自动通过）"),setTimeout(()=>{"verified"===(0,__p0Scope._a)().status&&((0,__p0Scope.E)("教育认证已通过，教育专享价已生效"),"info:edu"===__p0Scope.d.activeTabId&&(0,__p0Scope.Ea)())},__p0Scope.Sa+500)}}r()}); };

/* Business: openStudentModal */
window.__p0Modules.factories["modals/education-auth#openStudentModal:d5d85ee982b28bf4ffad0787"]=function(__p0Scope){"use strict";return (function openStudentModal(trigger) {
    if (__p0Scope.embeddedHost) {
      window.postMessage({
        type: "lexiang:open-student-auth",
        kind: "college",
        source: "member-service-component"
      }, window.location.origin);
      return;
    }
    // 会员中心运行在右侧 iframe 中；全局认证弹窗由外层应用承载，
    // 否则 position: fixed 也只能覆盖 iframe 自身。
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "lexiang:open-student-auth",
        kind: "college",
        source: "member-service-aui"
      }, window.location.origin);
      return;
    }
    __p0Scope.state.modalType = "student";
    __p0Scope.state.educationAudience = "college";
    __p0Scope.state.educationMethod = "edu";
    var mask = (0,__p0Scope.el)("#leaiModal");
    mask.querySelector(".leai-modal").classList.remove("is-wechat", "is-service-order");
    mask.querySelector(".leai-modal").classList.add("is-student");
    trigger.dataset.modalTrigger = "active";
    (0,__p0Scope.renderStudentModal)();
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    window.setTimeout(function () { (0,__p0Scope.el)("[data-student-audience]").focus(); }, 0);
  }); };

/* Business: renderStudentModal */
window.__p0Modules.factories["modals/education-auth#renderStudentModal:c66252804aeb3f326f79b527"]=function(__p0Scope){"use strict";return (function renderStudentModal() {
    var audienceType = __p0Scope.state.educationAudience;
    var isExam = audienceType === "exam";
    var isTeacher = audienceType === "teacher";
    var method = __p0Scope.state.educationMethod;
    var methodLabels = isExam ? [["verified", "实名认证"], ["skip", "跳过实名"]] : isTeacher ? [["certificate", "教师资格证"], ["employment", "教职证明"]] : [["edu", "edu 邮箱"], ["card", "学生证"], ["wechat", "微信学籍"]];
    (0,__p0Scope.el)("#leaiModalTitle").textContent = "教育认证";
    (0,__p0Scope.el)("#leaiModalDesc").textContent = isExam ? "高考生认证有效期与审核时效以当期活动规则和认证服务回执为准。" : isTeacher ? "教师身份支持资格证或教职证明认证，资料仅用于本次资格审核。" : "选择一种在校身份认证方式，资料仅用于本次资格审核。";
    var audience = '<div class="leai-auth-audience" role="tablist" aria-label="认证身份">' +
      (0,__p0Scope.studentChoice)("college", "在校生", __p0Scope.state.educationAudience === "college", "audience") +
      (0,__p0Scope.studentChoice)("exam", "高考生", __p0Scope.state.educationAudience === "exam", "audience") +
      (0,__p0Scope.studentChoice)("teacher", "教师", __p0Scope.state.educationAudience === "teacher", "audience") + '</div>';
    var methods = '<div class="leai-auth-methods" role="tablist" aria-label="认证方式">' + methodLabels.map(function (item) {
      return (0,__p0Scope.studentChoice)(item[0], item[1], method === item[0], "method");
    }).join("") + '</div>';
    var audienceLabel = isExam ? "高考生认证" : isTeacher ? "教师认证" : "在校生认证";
    var notice = '<div class="leai-auth-notice"><strong>' + audienceLabel + '</strong><span>' + (0,__p0Scope.studentNotice)(audienceType, method) + '</span></div>';
    var form = (0,__p0Scope.el)("#leaiModalForm");
    form.innerHTML = audience + methods + notice + '<div class="leai-auth-fields">' + (0,__p0Scope.studentFields)(audienceType, method) + '</div>' +
      '<label class="leai-auth-agreement"><input id="leaiStudentAgreement" type="checkbox" required><span>我已阅读并同意服务须知和活动规则</span></label>' +
      '<p class="leai-form-note">当前为交互 POC。提交只表示材料已送审；“认证成功”必须等待权威认证服务返回通过结果。</p>' +
      '<div class="leai-modal-actions"><button class="leai-secondary" type="button" data-modal-close>取消</button><button class="leai-primary" id="leaiStudentSubmit" type="submit" disabled>立即认证</button></div>';
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      (0,__p0Scope.submitModal)("student", (0,__p0Scope.el)('[data-modal-trigger="active"]'));
    };
    form.querySelectorAll("input, select").forEach(function (control) {
      control.addEventListener("input", __p0Scope.updateStudentSubmit);
      control.addEventListener("change", __p0Scope.updateStudentSubmit);
    });
    (0,__p0Scope.updateStudentSubmit)();
  }); };
}
window.__p0Modules.dispatch(document.currentScript);
