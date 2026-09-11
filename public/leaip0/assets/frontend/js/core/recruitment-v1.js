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
    const cities = [...new Set(data.jobs.map(job=>job.city))];
    const directions = [...new Set(data.jobs.map(job=>job.direction))];
    return `<section class="lx-recruitment-page" data-job-list data-job-layout="2" data-job-source-date="${escape(data.checkedAt)}"><header class="lx-wp-head lx-job-page-head"><div><h2>招聘推荐</h2><p>联想官方公开职位 · ${escape(data.checkedAt)} 核对</p></div><a class="lx-job-secondary" href="https://jobs.lenovo.com/zh_CN/careers/SearchJobs" target="_blank" rel="noopener noreferrer">全部官方职位 ${icon}</a></header><div class="lx-job-toolbar" role="search" aria-label="筛选招聘职位"><label class="lx-job-search"><span>搜索职位</span><input type="search" data-job-search placeholder="搜索岗位、技能或职位编号" aria-label="搜索岗位、技能或职位编号"></label><label><span>工作地点</span><select data-job-city aria-label="工作地点"><option value="">全部地点</option>${cities.map(city=>`<option value="${escape(city)}">${escape(city)}</option>`).join('')}</select></label><label><span>职位方向</span><select data-job-direction aria-label="职位方向"><option value="">全部方向</option>${directions.map(item=>`<option value="${escape(item)}">${escape(item)}</option>`).join('')}</select></label><label><span>排序方式</span><select data-job-sort aria-label="排序方式"><option value="recommended">推荐顺序</option><option value="latest">最新发布</option></select></label></div><div class="lx-job-list-intro"><span data-job-count aria-live="polite">共 ${data.jobs.length} 个推荐职位</span><span>推荐依据：岗位方向与发布时间</span></div><div class="lx-job-list" data-job-rows>${data.jobs.map(row).join('')}</div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
  }
  function bullets(items) { return '<ul>'+items.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>'; }
  function detail(payload) {
    const {job,checkedAt} = payload;
    return `<section class="lx-recruitment-page lx-job-detail" data-job-layout="2" data-job-detail="${escape(job.id)}"><div class="lx-job-overview"><header class="lx-job-detail-head"><div class="lx-job-heading-copy"><div class="lx-job-title-row"><button type="button" class="lx-job-back" data-job-back aria-label="返回招聘列表" title="返回招聘列表">${icon}</button><h2>${escape(job.title)}</h2></div><div class="lx-job-heading-body"><div class="lx-job-tags"><span>联想招聘</span><span>${escape(job.direction)}</span><span>全职</span></div>${job.officialTitle !== job.title ? '<p class="lx-job-official-title">官网职位名称：'+escape(job.officialTitle)+'</p>' : ''}<p class="lx-job-lead">${escape(job.summary)}</p><p class="lx-job-source">职位编号 ${escape(job.reqId)} · ${escape(job.posted)} 发布 · ${escape(checkedAt)} 核对</p></div></div><div class="lx-job-apply-area"><a class="lx-job-primary" data-job-apply href="${escape(job.applyUrl)}" target="_blank" rel="noopener noreferrer">一键应聘</a><span>前往联想招聘官网提交简历</span></div></header><dl class="lx-job-facts"><div><dt>工作地点</dt><dd>${escape(job.city)}</dd></div><div><dt>经验要求</dt><dd>${escape(job.experience)}</dd></div><div><dt>学历要求</dt><dd>${escape(job.education)}</dd></div><div><dt>薪资信息</dt><dd>官网未公开</dd></div></dl></div><section class="lx-job-fit"><div class="lx-job-fit-heading"><h3><img src="/assets/icons/global-sparkle.svg" alt="" aria-hidden="true">乐享推荐</h3><small>AI 整理 · 供方向参考</small></div><p>${escape(job.reason)}</p></section><div class="lx-job-detail-body"><div class="lx-job-requirement-grid"><section class="lx-job-section"><h3>岗位职责</h3>${bullets(job.duties)}</section><section class="lx-job-section"><h3>任职要求</h3>${bullets(job.requirements)}</section></div><section class="lx-job-section lx-job-application"><h3>申请方式</h3><p>点击“一键应聘”进入该职位的联想官方申请入口，登录或创建招聘账户后，按官网要求填写资料并提交简历。</p><a href="${escape(job.url)}" target="_blank" rel="noopener noreferrer">查看官方完整职位描述</a></section></div><p class="lx-p0-disclaimer">${disclaimer}</p></section>`;
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
  function saveList(page) {
    const tab = window.__lxState?.tabs?.find(item=>item.id===listId);
    if (!tab) return;
    const snapshot = page.cloneNode(true);
    snapshot.querySelector('[data-job-search]').setAttribute('value',page.querySelector('[data-job-search]').value);
    for (const selector of ['[data-job-city]','[data-job-direction]','[data-job-sort]']) {
      const value=page.querySelector(selector).value;
      snapshot.querySelectorAll(selector+' option').forEach(option=>option.toggleAttribute('selected',option.value===value));
    }
    tab.html = snapshot.outerHTML;
    runtime.remember(tab);
    window.__lxSaveConversationNow?.();
  }
  function filter(page) {
    const data=currentData(); if (!data) return;
    const search=page.querySelector('[data-job-search]').value.trim().toLowerCase(),city=page.querySelector('[data-job-city]').value,direction=page.querySelector('[data-job-direction]').value,sort=page.querySelector('[data-job-sort]').value;
    const jobs=data.jobs.filter(job=>(!city||job.city===city)&&(!direction||job.direction===direction)&&(!search||[job.title,job.officialTitle,job.summary,job.reqId,...job.requirements].join(' ').toLowerCase().includes(search)));
    if(sort==='latest')jobs.sort((a,b)=>b.posted.localeCompare(a.posted));
    page.querySelector('[data-job-count]').textContent='共 '+jobs.length+' 个匹配职位';
    page.querySelector('[data-job-rows]').innerHTML=jobs.length?jobs.map(job=>row(job,data.jobs.indexOf(job))).join(''):'<div class="lx-job-empty"><h3>暂未找到匹配职位</h3><p>试试其他关键词，或放宽地点和职位方向。</p><button type="button" class="lx-job-secondary" data-job-reset>重置筛选</button></div>';
    saveList(page);
  }
  runtime.register('recruitment-list',{
    matches,load,skill:'联想招聘推荐',complete:data=>'已完成 Skill(联想招聘推荐)：整理 '+data.jobs.length+' 个官方公开职位',
    answer:data=>[
      `已从联想招聘官网整理 **${data.jobs.length} 个近期公开职位**，包含 AI 智能运维、算力产品营销、产品安全与项目管理等方向，信息核对日期为 ${data.checkedAt}。`,
      '目前你还没有提供工作城市和职业背景，我先按**岗位方向与发布时间**排序。你可以在右侧筛选地点、搜索关键词，进一步找到相关机会。',
      '点击职位可查看职责和任职要求，详情中的**一键应聘**会进入该岗位的联想官方申请入口。AI 整理内容仅供参考，招聘状态与完整要求以官网为准。'
    ].join('\n\n'),cardTitle:'查看招聘推荐',cardDescription:data=>'已整理 '+data.jobs.length+' 个职位 · 支持筛选、查看详情与应聘',
    result:data=>runtime.page('recruitment-list',listId,'招聘推荐',data),render:list
  });
  runtime.register('recruitment-detail',{matches:()=>false,render:detail});
  document.addEventListener('input',event=>{const page=event.target.closest?.('[data-job-list]');if(page&&event.target.matches('[data-job-search]'))filter(page);});
  document.addEventListener('change',event=>{const page=event.target.closest?.('[data-job-list]');if(page&&event.target.matches('select'))filter(page);});
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-job-open],[data-job-back],[data-job-reset]'); if(!button)return;
    event.preventDefault();
    if(button.hasAttribute('data-job-reset')){const page=button.closest('[data-job-list]');page.querySelector('[data-job-search]').value='';page.querySelector('[data-job-city]').value='';page.querySelector('[data-job-direction]').value='';page.querySelector('[data-job-sort]').value='recommended';filter(page);return;}
    if(button.hasAttribute('data-job-back')){if(!window.__lxBridge.restoreResultTab(listId)){const data=currentData();if(data)runtime.open(runtime.page('recruitment-list',listId,'招聘推荐',data));}return;}
    const data=currentData(),job=data?.jobs.find(item=>item.id===button.dataset.jobOpen);
    if(job)runtime.open(runtime.page('recruitment-detail','info:recruitment-job:'+job.reqId,job.title+'详情',{job,checkedAt:data.checkedAt}));
  });
  function refreshLegacyPages() {
    const pages=document.querySelectorAll('.lx-recruitment-page:not([data-job-layout="2"])');
    if(!pages.length)return;
    let stored=[];try{stored=JSON.parse(localStorage.getItem('lexiang.resultTabs.v1')||'[]');}catch{}
    const tabs=window.__lxState?.tabs||[],data=currentData();
    pages.forEach(old=>{
      if(old.hasAttribute('data-job-list')&&data){
        const values={};for(const key of ['search','city','direction','sort'])values[key]=old.querySelector('[data-job-'+key+']')?.value||'';
        const fragment=document.createElement('template');fragment.innerHTML=list(data);const page=fragment.content.firstElementChild;old.replaceWith(page);
        for(const [key,value] of Object.entries(values)){const control=page.querySelector('[data-job-'+key+']');if(control)control.value=value;}
        filter(page);
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
