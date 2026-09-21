/* 对话历史记录 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/conversation-history"]) {
window.__p0Modules.installed["modals/conversation-history"]=true;

/* Business: Ze */
window.__p0Modules.factories["modals/conversation-history#Ze:3738795c1e5d1b45e4740fff"]=function(__p0Scope){"use strict";return (function Ze(){__p0Scope.Ge=1,(0,__p0Scope.j)("历史记录",`<div class="lx-history-modal"><label class="lx-history-search-wrap"><input class="lx-history-search-input" type="search" placeholder="搜索历史对话" aria-label="搜索历史对话" autocomplete="off" /></label><div class="lx-history-section">历史记录</div><div class="lx-history-list">${(0,__p0Scope.Ve)("")}</div><div class="lx-history-pagination-wrap">${(0,__p0Scope.Xe)("")}</div></div>`);const t=document.querySelector(".lx-history-modal .lx-history-search-input"),e=t?.closest(".lx-history-search-wrap"),n=t?.closest(".lx-p0-modal"),a=n?.querySelector(".lx-p0-modal-title");n?.querySelectorAll(".lx-p0-modal-head .lx-history-search-wrap").forEach(t=>t.remove()),e&&a&&a.insertAdjacentElement("afterend",e),t?.addEventListener("input",()=>{__p0Scope.Ge=1,(0,__p0Scope.Ke)(t.value)}),document.querySelector(".history-button")?.classList.add("is-active"),document.querySelector(".history-button")?.setAttribute("aria-expanded","true")}); };
}
window.__p0Modules.dispatch(document.currentScript);
