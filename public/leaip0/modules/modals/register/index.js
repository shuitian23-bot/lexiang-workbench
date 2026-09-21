/* 注册 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/register"]) {
window.__p0Modules.installed["modals/register"]=true;

/* Business: (anonymous) */
window.__p0Modules.factories["modals/register#anonymous:b1ad43bedf7d263368e6c68d"]=function(__p0Scope){"use strict";return (function(t){const e=document.querySelector(".lx-auth-modal");if(!e)return;const n="register"===t,a=e.querySelector("[data-auth-tabs]"),o=e.querySelector("[data-auth-register-title]");a&&(a.hidden=n),o&&(o.hidden=!n),e.querySelector('[data-auth-switch="register"]').hidden=n,e.querySelector('[data-auth-switch="login"]').hidden=!n,n?e.querySelectorAll("[data-auth-panel]").forEach(t=>t.classList.toggle("active","register"===t.dataset.authPanel)):(0,__p0Scope.le)(e.querySelector("[data-auth-tab].active")?.dataset.authTab||"quick"),e.querySelectorAll(".lx-auth-error-message").forEach(t=>t.remove()),e.querySelectorAll(".invalid").forEach(t=>t.classList.remove("invalid"))}); };
}
window.__p0Modules.dispatch(document.currentScript);
