import{G as P,f as F,m as b,h as q,_ as W,q as z,i as j,c as U,o as Y}from"./index-CeFv6hTA.js";import{u as J}from"./ai-CU4MH_bm.js";import{r as u,O as i,a as K,b as N,s as m,g as r,d as l,e as Q}from"./opsData-kyn-tTzR.js";const X=["innerHTML"],at=P({__name:"OpsGmvView",setup(Z){const G=F(),w=J();let d=null;const g=b("30d"),p=b(u(i[0].d)),v=b(u(i[i.length-1].d)),h=b("all"),k=b(M()),f=[],y=[{name:"消费",key:"consumer",color:l.blue,weight:.66},{name:"SMB",key:"smb",color:l.amber,weight:.3},{name:"政企",key:"gov",color:l.purple,weight:.04}];q(async()=>{G.ensureStaticTab("ops.gmv"),G.setActiveStaticTab("ops.gmv"),document.title="GMV 分析 - 乐享 AI 工作台",A(),d=await W(()=>import("./index-BzBQJFYZ.js"),[]),await z(),S()}),j(()=>{V(),delete window.opsAskGmv,delete window.opsCustomTimeChanged,delete window.opsSetGmvTrendScope,delete window.opsTimeChanged});function M(){return`
    <div class="page-header">
      <div><div class="page-title">GMV 分析</div><div class="page-desc">整体趋势 · 分业务 · 官网/非官网 · 业务GMV=登录口径+平台交易回算 · 口径同日报指标定义</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${B()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskGmv('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">GMV 核心指标</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-val" id="ops-g-total">-</div><div class="ops-kpi-label">整体 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-consumer">-</div><div class="ops-kpi-label">消费业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-consumer-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-smb">-</div><div class="ops-kpi-label">SMB 业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-smb-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-gov">-</div><div class="ops-kpi-label">政企业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-gov-buy">-</span>人</div></div>
    </div>

    <div class="ops-section-title">GMV 趋势</div>
    <div class="ops-card">
      <div class="dash-filter-bar" style="justify-content:flex-end;margin-bottom:8px">
        <button class="dash-pill" id="gmv-scope-all" onclick="opsSetGmvTrendScope('all')">整体</button>
        <button class="dash-pill" id="gmv-scope-consumer" onclick="opsSetGmvTrendScope('consumer')">消费</button>
        <button class="dash-pill" id="gmv-scope-smb" onclick="opsSetGmvTrendScope('smb')">SMB</button>
        <button class="dash-pill" id="gmv-scope-gov" onclick="opsSetGmvTrendScope('gov')">政企</button>
      </div>
      <div class="chart-wrap"><div id="ops-g-trend-chart" class="ops-chart"></div></div>
    </div>

    <div class="ops-section-title">分业务 GMV</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务GMV占比</h3><div class="chart-wrap-sm"><div id="ops-g-biz-pie" class="ops-chart"></div></div></div>
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>业务贡献明细</h3>
          <div class="dash-card-note">登录口径 + 平台交易回算 · 口径同日报</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">业务</th><th>GMV</th><th>登录口径</th><th>平台回算</th><th>购买人数</th><th>占比</th></tr></thead>
          <tbody id="ops-g-biz-table"></tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">分平台 GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>官网 vs 非官网</h3><div class="chart-wrap-sm"><div id="ops-g-platform-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>平台趋势</h3><div class="chart-wrap"><div id="ops-g-platform-trend" class="ops-chart"></div></div></div>
    </div>
  `}function B(){const t=g.value==="custom"?`<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${u(i[0].d)}" max="${u(i[i.length-1].d)}" value="${p.value}" onchange="opsCustomTimeChanged('gmv-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${u(i[0].d)}" max="${u(i[i.length-1].d)}" value="${v.value}" onchange="opsCustomTimeChanged('gmv-time','end',this.value)">
    </span>`:"";return`<div class="ops-time-filter" id="gmv-time">
    <div class="dash-filter-bar">
      ${["1d","7d","14d","30d","custom"].map(o=>`<button class="dash-pill ${g.value===o?"active":""}" onclick="opsTimeChanged('gmv-time','${o}')">${K(o)}</button>`).join("")}
    </div>
    ${t}
    <span class="ops-date-range" id="gmv-time-range"></span>
  </div>`}function A(){window.opsTimeChanged=async(t,o)=>{g.value=o,await $()},window.opsCustomTimeChanged=async(t,o,e)=>{g.value="custom",o==="start"&&(p.value=e),o==="end"&&(v.value=e),p.value>v.value&&(o==="start"?v.value=p.value:p.value=v.value),await $()},window.opsSetGmvTrendScope=async t=>{h.value=t,S()},window.opsAskGmv=()=>{w.toggleOpen(!0),w.quickSend("基于当前GMV分析看板，分析GMV趋势、分业务贡献、平台结构、风险和优先动作。","ops.gmv")}}async function $(){k.value=M(),await z(),S()}function S(){V();const t=N(i,g.value,p.value,v.value),o=t.map(s=>s.d),e={gmv:m(t,"gmv"),buy:m(t,"buy"),offGmv:m(t,"offGmv"),nonGmv:m(t,"nonGmv"),offBuy:m(t,"offBuy"),nonBuy:m(t,"nonBuy")},a=O(e.gmv,e.buy);n("ops-g-total",r(e.gmv)),n("ops-g-buy",e.buy.toLocaleString()),n("ops-g-consumer",r(a[0].value)),n("ops-g-smb",r(a[1].value)),n("ops-g-gov",r(a[2].value)),n("ops-g-consumer-buy",a[0].buy.toLocaleString()),n("ops-g-smb-buy",a[1].buy.toLocaleString()),n("ops-g-gov-buy",a[2].buy.toLocaleString()),["all","consumer","smb","gov"].forEach(s=>{var c;(c=document.getElementById(`gmv-scope-${s}`))==null||c.classList.toggle("active",h.value===s)}),x("ops-g-trend-chart",o,I(t)),T("ops-g-biz-pie",a.map(s=>({name:s.name,value:s.value,color:s.color}))),E(a,e.gmv),T("ops-g-platform-chart",[{name:"官网",value:e.offGmv,color:l.blue},{name:"非官网",value:e.nonGmv,color:l.slate}]),x("ops-g-platform-trend",o,[{name:"官网",data:t.map(s=>s.offGmv),color:l.blue},{name:"非官网",data:t.map(s=>s.nonGmv),color:l.slate}])}function O(t,o){return y.map(e=>{const a=Math.round(t*e.weight),s=Math.round(o*e.weight),c=Math.round(a*.72);return{...e,value:a,buy:s,loginGmv:c,platformGmv:a-c}})}function I(t){if(h.value==="all")return[{name:"整体GMV",data:t.map(e=>e.gmv),color:l.blue,fill:!0}];const o=y.find(e=>e.key===h.value)||y[0];return[{name:`${o.name}GMV`,data:t.map(e=>Math.round(e.gmv*o.weight)),color:o.color,fill:!0}]}function E(t,o){const e=document.getElementById("ops-g-biz-table");e&&(e.innerHTML=t.map(a=>`<tr>
    <td style="text-align:left;font-weight:500"><span class="ops-dot" style="background:${a.color}"></span>${a.name}</td>
    <td>${r(a.value)}</td>
    <td>${r(a.loginGmv)}</td>
    <td>${r(a.platformGmv)}</td>
    <td>${a.buy.toLocaleString()}</td>
    <td>${Q(a.value,o)}</td>
  </tr>`).join(""))}function x(t,o,e){const a=C(t);a&&(a.setOption({..._(),color:e.map(s=>s.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:46,right:18,top:36,bottom:28,containLabel:!0},xAxis:{type:"category",data:o,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:e.map(s=>({name:s.name,type:"line",smooth:!0,data:s.data,areaStyle:s.fill?{color:H(s.color)}:void 0,lineStyle:{color:s.color,width:2},itemStyle:{color:s.color,borderColor:"#fff",borderWidth:1.5},symbol:"circle",symbolSize:5,animationDelay:D}))}),requestAnimationFrame(()=>a.resize()))}function T(t,o){const e=C(t);e&&(e.setOption({..._(),color:o.map(a=>a.color),tooltip:{trigger:"item"},legend:{type:"scroll",bottom:0,textStyle:{fontSize:11,color:"#6b7280"}},series:[{type:"pie",radius:["42%","66%"],center:["50%","44%"],avoidLabelOverlap:!0,itemStyle:{borderRadius:4,borderColor:"#fff",borderWidth:2},label:{show:!0,color:"#6b7280",fontSize:10,formatter:"{b}\\n{d}%"},labelLine:{length:14,length2:10,lineStyle:{width:1}},data:o.map(a=>({name:a.name,value:a.value,itemStyle:{color:a.color}})),animationDelay:R}]}),requestAnimationFrame(()=>e.resize()))}function _(){return{animation:!0,animationDuration:720,animationEasing:"cubicOut",animationDurationUpdate:360,animationEasingUpdate:"cubicOut"}}function D(t){return Math.min(t*22,260)}function R(t){return Math.min(t*70,360)}function H(t){return d!=null&&d.graphic?new d.graphic.LinearGradient(0,0,0,1,[{offset:0,color:L(t,.14)},{offset:1,color:L(t,.02)}]):t}function L(t,o){const e=t.replace("#",""),a=parseInt(e.slice(0,2),16),s=parseInt(e.slice(2,4),16),c=parseInt(e.slice(4,6),16);return`rgba(${a},${s},${c},${o})`}function C(t){const o=document.getElementById(t);if(!o||!d)return null;const e=d.init(o);return f.push(e),e}function V(){var t;for(;f.length;)(t=f.pop())==null||t.dispose()}function n(t,o){const e=document.getElementById(t);e&&(e.textContent=o)}return(t,o)=>(Y(),U("div",{class:"ops-gmv-native",innerHTML:k.value},null,8,X))}});export{at as default};
