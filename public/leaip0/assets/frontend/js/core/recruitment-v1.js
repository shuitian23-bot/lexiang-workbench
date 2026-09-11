(function () {
  'use strict';
  const runtime = window.__lxQueryResults;
  if (!runtime || window.__lxRecruitment) return;
  const escape = runtime.escape, listId = 'info:recruitment:latest';
  const dataUrl = '/assets/data/recruitment-20260911.json?p0v=deac4c17367b3d33';
  const icon = '<img src="/assets/icons/global-next.svg" alt="" aria-hidden="true">';
  let cached;
  const disclaimer = '由联想乐享 AI 根据官网信息整理，仅供参考；职位状态、完整要求与申请结果以联想招聘官网为准。';
  const meta = job => [job.city,job.direction,'全职',job.experience].map(escape).join(' · ');
  function row(job,index) {
    return `<button type="button" class="lx-job-row" data-job-open="${escape(job.id)}" aria-label="查看${escape(job.title)}招聘详情"><span class="lx-job-row-copy"><span class="lx-job-row-heading"><strong>${escape(job.title)}</strong>${index < 3 ? '<small class="lx-job-recommend">优先推荐</small>' : ''}</span><span class="lx-job-meta">${meta(job)}</span><span class="lx-job-summary">${escape(job.summary)}</span><span class="lx-job-source">联想 · 职位编号 ${escape(job.reqId)}</span></span><span class="lx-job-row-end"><span>${escape(job.posted)} 发布</span><span class="lx-job-detail-link">查看详情 ${icon}</span></span></button>`;
  }
  function list(data) {
    return `<section class="lx-recruitment-page" data-job-list data-job-layout="3"><header class="lx-wp-head lx-job-page-head"><h2>招聘推荐</h2></header><div class="lx-job-list" data-job-rows>${data.jobs.map(row).join('')}</div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
  }
  function bullets(items) { return '<ul>'+items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>'; }
  function detail(payload) {
    const {job,checkedAt} = payload;
    return `<section class="lx-recruitment-page lx-job-detail" data-job-layout="4" data-job-detail="${escape(job.id)}"><div class="lx-job-overview"><header class="lx-job-detail-head"><div class="lx-job-heading-copy"><div class="lx-job-title-row"><button type="button" class="lx-job-back" data-job-back aria-label="返回招聘列表" title="返回招聘列表">${icon}</button><h2>${escape(job.title)}</h2></div><div class="lx-job-heading-body"><div class="lx-job-tags"><span>联想招聘</span><span>${escape(job.direction)}</span><span>全职</span></div>${job.officialTitle !== job.title ? '<p class="lx-job-official-title">官网职位名称：'+escape(job.officialTitle)+'</p>' : ''}<p class="lx-job-lead">${escape(job.summary)}</p><p class="lx-job-source">职位编号 ${escape(job.reqId)} · ${escape(job.posted)} 发布 · ${escape(checkedAt)} 核对</p></div></div><div class="lx-job-apply-area"><button type="button" class="lx-job-primary" data-job-apply="${escape(job.reqId)}" aria-describedby="job-apply-note-${escape(job.reqId)}">一键应聘</button><span id="job-apply-note-${escape(job.reqId)}" data-job-apply-note>应聘流程演示 · 不实际投递</span></div></header><dl class="lx-job-facts"><div><dt>工作地点</dt><dd>${escape(job.city)}</dd></div><div><dt>经验要求</dt><dd>${escape(job.experience)}</dd></div><div><dt>学历要求</dt><dd>${escape(job.education)}</dd></div><div><dt>薪资信息</dt><dd>官网未公开</dd></div></dl></div><section class="lx-job-fit"><div class="lx-job-fit-heading"><h3><img src="/assets/icons/global-sparkle.svg" alt="" aria-hidden="true">乐享推荐</h3><small>AI 整理 · 供方向参考</small></div><p>${escape(job.reason)}</p></section><div class="lx-job-detail-body"><div class="lx-job-requirement-grid"><section class="lx-job-section"><h3>岗位职责</h3>${bullets(job.duties)}</section><section class="lx-job-section"><h3>任职要求</h3>${bullets(job.requirements)}</section></div><section class="lx-job-section lx-job-application"><h3>申请方式</h3><p>点击“一键应聘”向乐享发送当前岗位的应聘请求，体验简历匹配、投递反馈与成功提示。本流程为演示，不读取或发送真实简历；正式应聘请通过下方联想招聘官网入口完成。</p><a href="${escape(job.url)}" target="_blank" rel="noopener noreferrer">查看官方完整职位描述</a></section></div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
  }
  function matches(query) { return /^(?:请|帮我|我想)?(?:查看|看看|查询|了解)?联想(?:最新的?|现在的?|目前的?)?(?:招聘信息|招聘职位|招聘岗位|招聘)(?:有哪些|推荐)?[。！？!?]?$/.test(String(query||'').replace(/\s+/g,'')); }
  async function load() {
    const response = await fetch(dataUrl,{cache:'no-cache'});
    if (!response.ok) throw new Error('招聘列表暂时不可用');
    const data = await response.json();
    if (!data.jobs?.length || data.jobs.some(job=>!job.id || !job.reqId || !job.applyUrl?.startsWith('https://jobs.lenovo.com/'))) throw new Error('职位信息不完整');
    cached = data;
    return data;
  }
  function currentData() {
    const tab = window.__lxState?.tabs?.find(item=>item.id===listId);
    if (tab?.payload?.jobs?.length) return tab.payload;
    if (cached) return cached;
    try { return JSON.parse(localStorage.getItem('lexiang.resultTabs.v1')||'[]').find(item=>item.id===listId)?.payload; } catch { return null; }
  }
  const applyQuery = job => `我要应聘联想的「${job.title}」（${job.reqId}）`;
  function parseApplyQuery(query) {
    return /^我要应聘联想的「([^「」\n]+)」[（(](WD\d+)[）)][。！？!?]?$/.exec(String(query||'').trim());
  }
  async function loadApplication(query) {
    const parsed = parseApplyQuery(query);
    let data = currentData(), job = data?.jobs.find(item=>item.reqId===parsed?.[2]);
    if (!job) { data = await load(); job = data.jobs.find(item=>item.reqId===parsed?.[2]); }
    if (!job) throw new Error('未找到当前应聘岗位');
    // P0 demonstration only: no resume read, match score, email or application API.
    return {job,mode:'demo'};
  }
  function applicationAnswer({job}) {
    return [
      `发现你的简历，**经检测最符合联想「${job.title}」岗位**，无需修改，可直接用于本次应聘。`,
      '模拟投递反馈：我已帮你发送到联想该职位的招聘邮箱，**2 个工作日内会与您联系**，请耐心等待。',
      '**简历投递成功**'
    ].join('\n\n');
  }
  runtime.register('recruitment-application',{
    matches:query=>!!parseApplyQuery(query),load:loadApplication,responseOnly:true,
    skill:'联想招聘应聘（演示）',complete:()=> '已完成 Skill(联想招聘应聘)：演示简历匹配与投递反馈，未实际投递',
    answer:applicationAnswer,
    errorAnswer:'本次**应聘演示未完成**，暂时无法确认对应岗位。请重新打开招聘列表，进入岗位详情后再试。未读取或发送简历。',
    errorStatus:'本次未完成，未找到对应岗位'
  });
  let applying = false;
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-job-apply]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(applying || window.__lxState?.sending)return;
    const page=button.closest('[data-job-detail]'),id=page?.dataset.jobDetail;
    const data=currentData(),tabs=window.__lxState?.tabs||[];
    const job=data?.jobs.find(item=>item.id===id)||tabs.find(tab=>tab.payload?.job?.id===id)?.payload?.job;
    const note=button.parentElement.querySelector('[data-job-apply-note]');
    if(!job || typeof window.__lxBridge?.sendChat!=='function'){
      if(note){note.textContent='暂时无法发起应聘，请重新打开岗位后再试';note.setAttribute('role','status');}
      return;
    }
    applying=true;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='正在处理…';
    try { await window.__lxBridge.sendChat(applyQuery(job)); }
    catch(error) {
      if(note && error?.name!=='AbortError'){note.textContent='本次演示未完成，请重试';note.setAttribute('role','status');}
    } finally {
      applying=false;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='一键应聘';
    }
  },true);
  runtime.register('recruitment-list',{
    matches,load,skill:'联想招聘推荐',complete:data=>'已完成 Skill(联想招聘推荐)：整理 '+data.jobs.length+' 个官方公开职位',
    answer:data=>[
      `已从联想招聘官网整理 **${data.jobs.length} 个近期公开职位**，包含 AI 智能运维、算力产品营销、产品安全与项目管理等方向，信息核对日期为 ${data.checkedAt}。`,
      '目前你还没有提供工作城市和职业背景，我先按**岗位方向与发布时间**整理，方便你在右侧逐项查看相关机会。',
      '点击职位可查看职责和任职要求，详情中的**一键应聘**可体验简历匹配与投递反馈演示，正式应聘请使用详情中的官网入口。AI 整理内容仅供参考，招聘状态与完整要求以官网为准。'
    ].join('\n\n'),cardTitle:'查看招聘推荐',cardDescription:data=>'已整理 '+data.jobs.length+' 个职位 · 查看详情与应聘',
    result:data=>runtime.page('recruitment-list',listId,'招聘推荐',data),render:list
  });
  runtime.register('recruitment-detail',{matches:()=>false,render:detail});
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-job-open],[data-job-back]'); if(!button)return;
    event.preventDefault();
    if(button.hasAttribute('data-job-back')){if(!window.__lxBridge.restoreResultTab(listId)){const data=currentData();if(data)runtime.open(runtime.page('recruitment-list',listId,'招聘推荐',data));}return;}
    const data=currentData(),job=data?.jobs.find(item=>item.id===button.dataset.jobOpen);
    if(job)runtime.open(runtime.page('recruitment-detail','info:recruitment-job:'+job.reqId,job.title+'详情',{job,checkedAt:data.checkedAt}));
  });
  function refreshLegacyPages() {
    const pages=document.querySelectorAll('[data-job-list]:not([data-job-layout="3"]),[data-job-detail]:not([data-job-layout="4"])');
    if(!pages.length)return;
    let stored=[];try{stored=JSON.parse(localStorage.getItem('lexiang.resultTabs.v1')||'[]');}catch{}
    const tabs=window.__lxState?.tabs||[],data=currentData();
    pages.forEach(old=>{
      if(old.hasAttribute('data-job-list')&&data){
        const html=list(data);old.outerHTML=html;
        const tab=tabs.find(item=>item.id===listId)||stored.find(item=>item.id===listId);
        if(tab){tab.html=html;runtime.remember(tab);window.__lxSaveConversationNow?.();}
      }else if(old.dataset.jobDetail){
        const id=old.dataset.jobDetail,tab=tabs.find(item=>item.payload?.job?.id===id),saved=tab||stored.find(item=>item.payload?.job?.id===id);
        const payload=saved?.payload||(data?.jobs.find(job=>job.id===id)?{job:data.jobs.find(job=>job.id===id),checkedAt:data.checkedAt}:null);
        if(!payload)return;
        const html=detail(payload);old.outerHTML=html;
        if(saved){saved.html=html;runtime.remember(saved);window.__lxSaveConversationNow?.();}
      }
    });
  }
  let refreshQueued=false;
  new MutationObserver(()=>{if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;refreshLegacyPages();});}).observe(document.body,{childList:true,subtree:true});
  refreshLegacyPages();
  window.__lxRecruitment={matches,list,detail,load};
})();
