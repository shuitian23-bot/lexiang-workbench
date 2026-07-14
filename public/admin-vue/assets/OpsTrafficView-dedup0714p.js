import{G as et,f as at,m as S,h as it,_ as ot,q as F,i as st,c as nt,o as lt}from"./index-CeFv6hTA.js";import{u as rt}from"./ai-CU4MH_bm.js";import{r as g,O as d,a as dt,b as ct,c as A,s as $,f as c,d as r,e as pt}from"./opsData-kyn-tTzR.js";const ut=["innerHTML"],gt=et({__name:"OpsTrafficView",setup(vt){const I=at(),P=rt();let p=null;const M={pv:{label:"PV",field:"pv"},uv:{label:"UV",field:"uv"},login:{label:"登录",field:"login"},inter:{label:"互动",field:"inter"}},D=[{name:"百度搜索",weight:22},{name:"微信生态",weight:18},{name:"抖音",weight:14},{name:"小红书",weight:11},{name:"今日头条",weight:9},{name:"B站",weight:8},{name:"知乎",weight:6},{name:"微博",weight:5},{name:"腾讯广告",weight:4},{name:"自然外链",weight:3}],q=["APP端","PC端","WAP端","微信小程序","联想小程序","服务号","活动页","其他"],j=[r.slate,r.blue,r.purple,r.greenSoft,r.amber,r.green,r.blueSoft,r.neutral],v=S("30d"),l=S("uv"),m=S(g(d[0].d)),f=S(g(d[d.length-1].d)),U=S(R()),L=[];it(async()=>{I.ensureStaticTab("ops.traffic"),I.setActiveStaticTab("ops.traffic"),document.title="流量分析 - 乐享 AI 工作台",J(),p=await ot(()=>import("./index-BzBQJFYZ.js"),[]),await F(),B()}),st(()=>{E(),delete window.opsAskTraffic,delete window.opsCustomTimeChanged,delete window.opsSetTrafficMetric,delete window.opsTimeChanged});function R(){return`
    <div class="page-header">
      <div><div class="page-title">流量分析</div><div class="page-desc">核心活跃趋势 · 监测入口 · 分端口 · 分业务 · 默认近30天 · 口径同日报</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${G()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskTraffic('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-dau">-</div><div class="ops-kpi-label">DAU（日活）</div><div class="ops-kpi-sub">日均登录 <span id="ops-t-dau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-mau">-</div><div class="ops-kpi-label">MAU（月活）</div><div class="ops-kpi-sub">月登录均值 <span id="ops-t-mau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-login">-</div><div class="ops-kpi-label">登录用户</div><div class="ops-kpi-sub" id="ops-t-login-sub">选期排重</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-inter">-</div><div class="ops-kpi-label">互动用户</div><div class="ops-kpi-sub" id="ops-t-inter-sub">选期排重</div></div>
    </div>

    <div class="ops-section-title">DAU / MAU 趋势</div>
    <div class="ops-card"><div class="chart-wrap"><div id="ops-t-user-trend" class="ops-chart"></div></div></div>

    <div class="ops-section-title">监测媒体流量</div>
    <div class="grid-2 ops-media-flow-grid">
      <div class="ops-card ops-media-table-card">
        <div class="ops-card-head">
          <h3>TOP10 媒体排行</h3>
          <div class="dash-filter-bar">${N()}</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">媒体</th><th>PV</th><th>UV</th><th>登录</th><th>互动</th><th>占比</th></tr></thead>
          <tbody id="ops-t-media-table"></tbody>
        </table>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">按选中指标在统计周期内降序排行 · PV 按 UV 比例估算 · 媒体来源待接入日报「流量来源监测」字段，当前按固定权重估算</div>
      </div>
      <div class="ops-card ops-media-chart-card">
        <h3>媒体流量占比分布</h3>
        <div class="chart-wrap ops-media-chart-wrap"><div id="ops-t-media-chart" class="ops-chart"></div></div>
      </div>
    </div>

    <div class="ops-section-title">分端口流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><div id="ops-t-port-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><div id="ops-t-port-trend" class="ops-chart"></div></div></div>
    </div>

    <div class="ops-section-title">分业务流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务占比</h3><div class="chart-wrap-sm"><div id="ops-t-biz-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><div id="ops-t-biz-trend" class="ops-chart"></div></div></div>
    </div>
  `}function G(){const t=v.value==="custom"?`<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${g(d[0].d)}" max="${g(d[d.length-1].d)}" value="${m.value}" onchange="opsCustomTimeChanged('traffic-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${g(d[0].d)}" max="${g(d[d.length-1].d)}" value="${f.value}" onchange="opsCustomTimeChanged('traffic-time','end',this.value)">
    </span>`:"";return`<div class="ops-time-filter" id="traffic-time">
    <div class="dash-filter-bar">
      ${["1d","7d","14d","30d","custom"].map(a=>`<button class="dash-pill ${v.value===a?"active":""}" onclick="opsTimeChanged('traffic-time','${a}')">${dt(a)}</button>`).join("")}
    </div>
    ${t}
    <span class="ops-date-range" id="traffic-time-range"></span>
  </div>`}function N(){return Object.keys(M).map(t=>`<button class="dash-pill ${l.value===t?"active":""}" onclick="opsSetTrafficMetric('${t}')">${M[t].label}</button>`).join("")}function J(){window.opsTimeChanged=async(t,a)=>{v.value=a,a==="custom"&&(m.value||(m.value=g(d[0].d)),f.value||(f.value=g(d[d.length-1].d))),await k()},window.opsCustomTimeChanged=async(t,a,e)=>{v.value="custom",a==="start"&&(m.value=e),a==="end"&&(f.value=e),m.value>f.value&&(a==="start"?f.value=m.value:m.value=f.value),await k()},window.opsSetTrafficMetric=async t=>{l.value=t,await k()},window.opsAskTraffic=()=>{P.toggleOpen(!0),P.quickSend("基于当前流量分析看板，分析流量趋势、入口结构、媒体贡献、异常波动和下一步动作。","ops.traffic")}}async function k(){U.value=R(),await F(),B()}function lxDedup(rows,total,key,fb){const d=rows.length;if(d<=1)return total;const m=Number((rows[d-1]||{})[key])||0;const avg=total/d;if(d>=30&&m>0)return Math.round(m);if(m>avg&&avg>0)return Math.round(avg*Math.pow(d,Math.log(m/avg)/Math.log(30)));return Math.round(total*fb)}function lxDedupLabel(rows){const d=rows.length;return d<=1?"选期排重":d>=30?"滚动30天排重":"选期排重·估算"}function B(){E();const t=ct(d,v.value,m.value,f.value),a=t.map(i=>i.d),e={dau:A(t,"dau"),mau:A(t,"mau"),login:$(t,"login"),inter:$(t,"inter"),loginAvg:A(t,"login"),loginM:A(t,"loginM")},s=lxDedup(t,e.login,"loginM",.72),n=lxDedup(t,e.inter,"interM",.78);h("ops-t-dau",c(e.dau)),h("ops-t-mau",c(e.mau)),h("ops-t-dau-login",c(e.loginAvg)),h("ops-t-mau-login",c(e.loginM)),h("ops-t-login",c(s)),h("ops-t-inter",c(n)),h("ops-t-login-sub",`${lxDedupLabel(t)} · 累计 ${c(e.login)}`),h("ops-t-inter-sub",`${lxDedupLabel(t)} · 累计 ${c(e.inter)}`),_("ops-t-user-trend",a,[{name:"DAU",data:t.map(i=>i.dau),color:r.blue,fill:!0},{name:"登录",data:t.map(i=>i.login),color:r.green},{name:"MAU",data:t.map(i=>i.mau),color:r.purple,yAxisIndex:1}],!0);const o=K(t),u=o.reduce((i,x)=>i+x.value,0),b=document.getElementById("ops-t-media-table");b&&(b.innerHTML=o.slice(0,10).map(i=>`<tr>
      <td style="text-align:left;font-weight:500">${i.name}</td>
      <td class="${l.value==="pv"?"ops-primary-cell":""}">${c(i.pv)}</td>
      <td class="${l.value==="uv"?"ops-primary-cell":""}">${c(i.uv)}</td>
      <td class="${l.value==="login"?"ops-primary-cell":""}">${c(i.login)}</td>
      <td class="${l.value==="inter"?"ops-primary-cell":""}">${c(i.inter)}</td>
      <td>${pt(i.value,u)}</td>
    </tr>`).join("")),X("ops-t-media-chart",o.slice(0,10).map(i=>i.name),[{name:`${M[l.value].label}占比%`,data:o.slice(0,10).map(i=>u?Number((i.value/u*100).toFixed(1)):0),color:r.blue}],!0);const y=Q(t);V("ops-t-port-chart",y.slice(0,8).map(i=>({name:i.name,value:i.value,color:i.color}))),_("ops-t-port-trend",a,y.slice(0,5).map((i,x)=>({name:`${i.name}${M[l.value].label}`,data:t.map(T=>Math.round(H(T)*i.weights[x%i.weights.length])),color:i.color})));const w=[{name:"消费",value:Math.round((l.value==="inter"?e.inter:e.login)*.58),color:r.blue},{name:"SMB",value:Math.round((l.value==="inter"?e.inter:e.login)*.28),color:r.amber},{name:"政企",value:Math.round((l.value==="inter"?e.inter:e.login)*.14),color:r.purple}];V("ops-t-biz-chart",w),_("ops-t-biz-trend",a,w.map((i,x)=>({name:`${i.name}${l.value==="inter"?"互动":"登录"}`,data:t.map(T=>Math.round((l.value==="inter"?T.inter:T.login)*[.58,.28,.14][x])),color:i.color})))}function H(t){return l.value==="pv"?Math.round(t.dau*1.46):l.value==="uv"?t.dau:t[l.value]}function K(t){const a=Math.round($(t,"dau")*1.22),e=$(t,"login"),s=$(t,"inter"),n=D.reduce((o,u)=>o+u.weight,0);return D.map(o=>{const u=Math.round(a*o.weight/n),b=Math.round(e*o.weight/n),y=Math.round(s*o.weight/n),w=Math.round(u*1.46);return{...o,pv:w,uv:u,login:b,inter:y,value:{pv:w,uv:u,login:b,inter:y}[l.value]}}).sort((o,u)=>u.value-o.value)}function Q(t){const a=t.reduce((s,n)=>s+H(n),0),e=[.34,.22,.16,.12,.07,.04,.03,.02];return q.map((s,n)=>({name:s,value:Math.round(a*e[n]),color:j[n],weights:e}))}function _(t,a,e,s=!1){const n=O(t);n&&(n.setOption({...C(),color:e.map(o=>o.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:46,right:s?46:18,top:36,bottom:28,containLabel:!0},xAxis:{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:s?[{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{show:!1}}]:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:e.map(o=>({name:o.name,type:"line",smooth:!0,data:o.data,yAxisIndex:o.yAxisIndex||0,areaStyle:o.fill?{color:Z(o.color)}:void 0,lineStyle:{color:o.color,width:2},itemStyle:{color:o.color,borderColor:"#fff",borderWidth:1.5},symbol:"circle",symbolSize:5,animationDelay:W}))}),requestAnimationFrame(()=>n.resize()))}function X(t,a,e,s=!1){const n=O(t);n&&(n.setOption({...C(),color:e.map(o=>o.color),tooltip:{trigger:"axis"},legend:{top:0,textStyle:{fontSize:11,color:"#6b7280"}},grid:{left:s?92:46,right:18,top:36,bottom:28,containLabel:!0},xAxis:s?{type:"value",axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}}:{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"},axisTick:{alignWithLabel:!0}},yAxis:s?{type:"category",data:a,axisLabel:{fontSize:10,color:"#6b7280"}}:{type:"value",min:0,axisLabel:{fontSize:10,color:"#6b7280"},splitLine:{lineStyle:{color:"#eef2f7"}}},series:e.map(o=>({name:o.name,type:"bar",data:o.data,itemStyle:{color:tt(o.color),borderRadius:s?[0,3,3,0]:[3,3,0,0]},barMaxWidth:s?18:26,animationDelay:W}))}),requestAnimationFrame(()=>n.resize()))}function V(t,a){const e=O(t);e&&(e.setOption({...C(),color:a.map(s=>s.color),tooltip:{trigger:"item"},legend:{type:"scroll",bottom:0,textStyle:{fontSize:11,color:"#6b7280"}},series:[{type:"pie",radius:["42%","66%"],center:["50%","44%"],avoidLabelOverlap:!0,itemStyle:{borderRadius:4,borderColor:"#fff",borderWidth:2},label:{show:!0,color:"#6b7280",fontSize:10,formatter:"{b}\\n{d}%"},labelLine:{length:14,length2:10,lineStyle:{width:1}},data:a.map(s=>({name:s.name,value:s.value,itemStyle:{color:s.color}})),animationDelay:Y}]}),requestAnimationFrame(()=>e.resize()))}function C(){return{animation:!0,animationDuration:720,animationEasing:"cubicOut",animationDurationUpdate:360,animationEasingUpdate:"cubicOut"}}function W(t){return Math.min(t*22,260)}function Y(t){return Math.min(t*70,360)}function Z(t){return p!=null&&p.graphic?new p.graphic.LinearGradient(0,0,0,1,[{offset:0,color:z(t,.14)},{offset:1,color:z(t,.02)}]):t}function tt(t){return p!=null&&p.graphic?new p.graphic.LinearGradient(0,0,1,0,[{offset:0,color:z(t,.72)},{offset:1,color:t}]):t}function z(t,a){const e=t.replace("#",""),s=parseInt(e.slice(0,2),16),n=parseInt(e.slice(2,4),16),o=parseInt(e.slice(4,6),16);return`rgba(${s},${n},${o},${a})`}function O(t){const a=document.getElementById(t);if(!a||!p)return null;const e=p.init(a);return L.push(e),e}function E(){var t;for(;L.length;)(t=L.pop())==null||t.dispose()}function h(t,a){const e=document.getElementById(t);e&&(e.textContent=a)}return(t,a)=>(lt(),nt("div",{class:"ops-traffic-native",innerHTML:U.value},null,8,ut))}});export{gt as default};
