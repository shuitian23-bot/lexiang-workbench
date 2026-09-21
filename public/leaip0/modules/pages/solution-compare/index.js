/* 方案对比 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/solution-compare"]) {
window.__p0Modules.installed["pages/solution-compare"]=true;

/* Business: Ut */
window.__p0Modules.factories["pages/solution-compare#Ut:e74ff259cedc3a842606a04f"]=function(__p0Scope){"use strict";return (function Ut(t){const e=(t||[]).filter(t=>"solution"===t?.type).map(t=>t.sku||t.name||"").filter(Boolean).sort().join("|");__p0Scope.d.solutionCompareRegistry=__p0Scope.d.solutionCompareRegistry||{};let n=Number(__p0Scope.d.solutionCompareRegistry[e]||0);if(!n){const t=Object.values(__p0Scope.d.solutionCompareRegistry).map(Number).filter(Number.isFinite);n=(t.length?Math.max(...t):0)+1,__p0Scope.d.solutionCompareRegistry[e]=n}return{signature:e,index:n,id:`info:solution-compare:${n}`,label:`方案对比${n}`,cardTitle:`查看方案对比${n}`}}); };

/* Business: Xt */
window.__p0Modules.factories["pages/solution-compare#Xt:4acb32da435d58d56ab66759"]=function(__p0Scope){"use strict";return (function Xt(t,e){const n=t?.closest?.(".message, .lx-p0-message, .lxfd-msg, article")||t?.parentElement,a=[...String(n?.innerText||n?.textContent||"").matchAll(/「([^」]{2,40}解决方案)」/g)].map(t=>t[1]),o=[...new Set(a)].slice(0,3);if(o.length<2)return!1;const s=Number(String(e||"").split(":").pop())||1;return (0,__p0Scope.Vt)(o.map((t,e)=>({type:"solution",sku:`legacy-solution-${s}-${e+1}`,name:t})),{signature:o.slice().sort().join("|"),index:s,id:`info:solution-compare:${s}`,label:`方案对比${s}`,cardTitle:`查看方案对比${s}`}),!0}); };
}
window.__p0Modules.dispatch(document.currentScript);
