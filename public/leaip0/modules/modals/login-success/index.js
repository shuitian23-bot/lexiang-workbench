/* 登录成功 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/login-success"]) {
window.__p0Modules.installed["modals/login-success"]=true;

/* Business: (anonymous) */
window.__p0Modules.factories["modals/login-success#anonymous:73801c85d08be7fff7591430"]=function(__p0Scope){"use strict";return (()=>{const e=(__p0Scope.t.querySelector('input[autocomplete="username"]')||__p0Scope.t.querySelector("[data-auth-phone]"))?.value.trim()||"会员";__p0Scope.d.user={phone:e,nickname:e},(0,__p0Scope.c)(__p0Scope.d.user),(0,__p0Scope.se)();const n=document.createElement("div");n.className="lx-auth-success-message",n.setAttribute("role","status"),n.innerHTML=`<div class="lx-auth-success-icon"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg></div><div class="lx-auth-success-title">${__p0Scope.o?"注册成功":"登录成功"}</div><div class="lx-auth-success-subtitle">欢迎使用联想乐享</div>`,__p0Scope.t.appendChild(n),__p0Scope.t.classList.add("success"),__p0Scope.t.closest(".lx-auth-modal")?.classList.add("success-view"),window.setTimeout(()=>(0,__p0Scope.N)(),2e3)}); };
}
window.__p0Modules.dispatch(document.currentScript);
