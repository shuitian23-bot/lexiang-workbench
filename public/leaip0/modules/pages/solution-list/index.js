/* 推荐方案列表 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/solution-list"]) {
window.__p0Modules.installed["pages/solution-list"]=true;

/* scripts/p0-source-runtime/leaip0/assets/frontend/js/core/solution-result.tabs-v120.js */
window.__p0Modules.sources["u6faaa8786b71f994"]=function(){
/* Shared solution-result interactions for home and every channel page. */
(function(){
  "use strict";
  if(window.__lxSolutionResultBound)return;
  window.__lxSolutionResultBound=true;
  document.addEventListener("click",function(event){
    var button=event.target.closest&&event.target.closest("[data-solution-filter]");
    if(!button)return;
    var root=button.closest(".lx-solution-center-page");
    if(!root)return;
    root.querySelectorAll("[data-solution-filter]").forEach(function(item){var selected=item===button;item.classList.toggle("active",selected);item.setAttribute("aria-pressed",selected?"true":"false")});
    var key=button.getAttribute("data-solution-filter");
    root.dataset.solutionSelected=key;
    root.querySelectorAll(".lx-solution-floor").forEach(function(floor){
      floor.style.display=key==="all"||floor.getAttribute("data-solution-industry")===key?"":"none";
    });
    var heading=root.closest(".info-page")?.querySelector(".reco-head h2");
    if(heading)heading.textContent=key==="all"?"全部解决方案":key+"行业解决方案";
    var state=window.__lxState;
    var tab=state?.tabs?.find(function(item){return item.id===state.activeTabId;});
    if(tab && /^info:solution(?::|-industry:)/.test(tab.id) || tab?.id==="info:solution"){
      tab.html=root.outerHTML;
      try{window.__lxSaveConversationNow?.();}catch(_){}
    }
    root.scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.addEventListener("click",function(event){
    var button=event.target.closest&&event.target.closest("[data-solution-shuffle]");
    if(!button)return;
    var floor=button.closest(".lx-solution-floor");var grid=floor&&floor.querySelector(".lx-floor-body");
    if(!grid||grid.children.length<2)return;
    button.classList.remove("is-spinning");void button.offsetWidth;button.classList.add("is-spinning");grid.appendChild(grid.firstElementChild);
    window.setTimeout(function(){button.classList.remove("is-spinning")},500);
  });
  /* Product/solution-card dwell assistance is temporarily disabled site-wide. */
  document.querySelectorAll(".ai-arrow,.lx-template-smart-cursor").forEach(function(node){node.remove()});
  document.body.classList.remove("cursor-awake");
  document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");
  document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active","assistant-glass-active");
  var promptList=document.querySelector("[data-hover-prompt-list]");if(promptList)promptList.innerHTML="";
  return;
  var cursor=document.querySelector(".lx-template-smart-cursor");
  if(!cursor){cursor=document.createElement("div");cursor.className="lx-template-smart-cursor";cursor.setAttribute("aria-hidden","true");cursor.innerHTML='<img src="../icons/smart-cursor.svg" alt=""><span class="lx-template-smart-cursor-label"><img src="../img/lx-icon-0016.png" alt="">乐享正在帮你</span>';document.body.appendChild(cursor)}
  var activeCard=null,dwellTimer=0,closeTimer=0;
  function esc(value){return String(value||"").replace(/[&<>\"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]})}
  function data(card){return{name:card.dataset.solutionTitle||card.querySelector("strong")?.textContent?.trim()||"这项联想解决方案",sector:card.dataset.solutionSector||card.querySelector(".lx-solution-card-tags small")?.textContent?.trim()||"行业方案",scenario:card.dataset.solutionScenario||"核心业务场景",summary:card.dataset.solutionIntro||card.querySelector(":scope > span")?.textContent?.trim()||"联想行业解决方案",image:card.dataset.solutionImage?"../img/solution/"+card.dataset.solutionImage:card.querySelector(".lx-solution-card-image")?.getAttribute("src")||""}}
  function hide(){document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active");var list=document.querySelector("[data-hover-prompt-list]");if(list)list.innerHTML=""}
  function show(card){if(card!==activeCard)return;if(window.__lxState?.sending||document.body.classList.contains("lx-agent-generating")){hide();return}var bottom=document.querySelector(".assistant-bottom"),panel=document.querySelector(".assistant-panel"),list=document.querySelector("[data-hover-prompt-list]");if(!bottom||!panel||!list)return;var s=data(card),short=s.name.replace(/^联想\s*/i,"").slice(0,14),asks=[s.sector+"方案该如何选择？",short+"适合哪些场景？",short+"详细解读"],thumb=s.image?'<img src="'+esc(s.image)+'" alt="'+esc(s.name)+'">':"<i></i>";list.innerHTML='<div class="pop"><div class="box"><button class="pop-close hover-prompt-close" type="button" aria-label="关闭方案推荐问题">×</button><div class="ctx"><div class="thumb">'+thumb+'</div><div class="ci"><div class="nm">'+esc(s.name)+'</div><div class="pr">'+esc(s.sector+" · "+s.scenario)+'</div></div><span class="badge"><img src="../icons/global-sparkle.svg" alt="">你在看</span></div><div class="body"><div class="sum">'+esc(s.summary)+'，乐享可以继续帮你分析方案能力、适用场景和落地方式。</div><div class="divider"><span>乐享建议你问问</span></div><div class="acts">'+asks.map(function(t){return'<button class="act" type="button" data-hover-prompt="'+esc(t)+'"><span class="ic"><img src="../icons/global-sparkle.svg" alt=""></span><span>'+esc(t)+'</span><span class="ar">›</span></button>'}).join("")+'</div></div></div></div>';bottom.classList.add("has-hover-prompts");panel.classList.add("assistant-hover-active")}
  function arm(card){window.clearTimeout(dwellTimer);activeCard=card;cursor.classList.remove("is-helping");dwellTimer=window.setTimeout(function(){if(activeCard===card&&card.isConnected&&card.matches(":hover")){cursor.classList.add("is-helping");show(card)}},3000)}
  document.addEventListener("pointermove",function(event){if(event.pointerType&&event.pointerType!=="mouse"&&event.pointerType!=="pen")return;var productCard=event.target.closest?.(".content .product-card,.content .lx-floor-product-card,.content [data-floor-product],.content .lx-floor-product,.content .lx-sim-card,.content .lx-p0-product-mini,.content .reco-row,.content .lx-edu-card");if(productCard)return;var card=event.target.closest?.(".lx-pick-btn")?null:event.target.closest?.(".content .lx-solution-card");cursor.style.transform="translate3d("+(event.clientX+2)+"px,"+(event.clientY+2)+"px,0)";if(!card){cursor.classList.remove("is-visible","is-helping");window.clearTimeout(dwellTimer);if(activeCard){activeCard=null;window.clearTimeout(closeTimer);closeTimer=window.setTimeout(hide,4000)}return}window.clearTimeout(closeTimer);cursor.classList.add("is-visible");if(card!==activeCard)arm(card)},true);
  document.addEventListener("pointerleave",function(){cursor.classList.remove("is-visible","is-helping");window.clearTimeout(dwellTimer);activeCard=null});
  document.addEventListener("click",function(event){if(event.target.closest?.(".hover-prompt-close"))hide()},true);
})();

;(function(){
  function sync(){
    var root=document.querySelector(".info-page .lx-solution-center-page");
    if(!root||!root.querySelector(".lx-solution-tabs"))return;
    if(!root.hasAttribute("data-solution-selected")){
      var id=window.__lxState?.activeTabId||"";
      if(id==="info:solution"||id.startsWith("info:solution-industry:"))window.__lxOpenFeature?.(id.slice(5));
      return;
    }
    var key=root.dataset.solutionSelected,heading=root.closest(".info-page")?.querySelector(".reco-head h2");
    var text=key==="all"?"全部解决方案":key+"行业解决方案";
    if(heading&&heading.textContent!==text)heading.textContent=text;
  }
  sync();new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
})();

};

/* public/leaip0/assets/frontend/js/core/manufacturing-solution-rows-v1.js */
window.__p0Modules.sources["ufbd06926b932b879"]=function(){
(function () {
  'use strict';
  const revision = 'manufacturing-content-20260911';
  const rows = [["AI研发平台","智慧研发","AI研发平台.jpg","面向制造企业的 AI 模型研发与迭代，将数据准备、模型训练、验证和上线管理连接为可追溯的工作流程。","解决研发数据分散、训练环境不一致、模型难以复用的问题；适合已积累生产或质检数据、需要建立 AI 研发流程的团队。","减少重复搭建环境的工作，支持研发与业务团队协同，让模型版本、实验结果和上线状态可追踪。","数据集与版本管理；训练资源调度；实验记录与模型评估；模型发布与效果监测。","可选 ThinkStation AI 工作站、ThinkSystem GPU 服务器及存储，结合 MLOps 软件；配置由数据量与模型规模确定。","电子装配企业集中管理缺陷样本，训练并评估检测模型，再将通过验证的版本交付产线使用。"],["数字化研发平台","智慧研发","EDA芯片设计解决方案.jpg","围绕产品设计与工程验证，整合设计文件、仿真计算和研发协作，支持跨团队共享研发资源。","解决设计版本不一致、仿真排队和研发资料分散的问题；适合多专业协同和频繁设计迭代。","提升设计资料的一致性，支持在试制前进行方案验证，减少重复传递文件与重复计算。","设计数据协同；仿真任务调度；研发版本管理；权限控制；设计与试验结果关联。","可选 ThinkStation 图形工作站、ThinkSystem 计算与存储，配合 CAD、CAE、PLM 等软件，按业务需求选型。","装备研发团队共享同一设计版本，对结构与热性能进行仿真验证，并将结果同步给试制团队。"],["AR数字孪生","智慧研发","AR数字孪生.jpg","将设备或产线的三维模型与运行数据关联，通过 AR 可视化呈现状态，辅助培训、巡检和远程协作。","解决复杂设备难理解、现场指导依赖经验、异常定位信息分散的问题；适合设备培训与辅助运维。","让设备状态与作业步骤更直观，帮助新人理解操作流程，并支持现场与远程人员协同排查问题。","三维场景建模；设备数据映射；AR 作业指引；远程协助；运行状态可视化。","可选 ThinkStation 图形工作站、ThinkEdge 边缘计算设备，以及适配的 AR 终端与数字孪生软件。","装配车间将设备模型叠加到现场视野，逐步展示维护位置与操作说明，供培训人员演练。"],["产线数字化","智慧生产","联想智能工厂解决方案.jpg","以产线为建设对象，连接设备、工位和生产系统，形成从任务下达到过程采集、异常处理的数字化闭环。","解决设备数据难采集、工位进度不透明、生产异常依赖人工通知的问题；适合从单线试点逐步推广。","提高生产过程可见性，帮助定位停机和质量异常，使现场协作与生产追溯更及时。","设备联网与数据采集；工位任务协同；电子作业指导；异常告警；生产看板与追溯。","可选 ThinkEdge 边缘计算设备、ThinkCentre 工位终端、ThinkSystem 服务器，配合工业网关与 MES 接口。","零部件产线连接关键工位，采集设备状态和工序结果，发生异常时关联批次并通知相关岗位处理。"],["Lenovo Edge AI 工业质检解决方案","智慧生产","Lenovo Edge AI工业质检解决方案.jpg","在生产现场部署视觉检测与边缘推理，将图像采集、缺陷识别和质量结果回传接入现有质检流程。","解决人工目检标准不一致、缺陷样本稀少、图像集中回传负担大的问题；适合明确的外观检测任务。","辅助检验员保持一致的判定流程，使缺陷图像与批次记录可追溯；上线效果需通过现场样本验证。","工业图像采集；缺陷识别；边缘推理；人工复核；模型更新与质量结果追溯。","可选 ThinkEdge 边缘 AI 设备、ThinkSystem 训练资源，配合工业相机、光源与视觉质检软件。","电子制造工位采集产品外观，模型标记疑似缺陷，检验员复核后将结果回写质量系统。"],["制造执行系统","智慧生产","产线数字化.jpg","连接生产计划与车间执行，统一管理工单、物料、工序、质量和设备信息，支持全过程追溯。","解决计划与现场脱节、在制品流转不清、质量记录难追溯的问题；适合多工序制造现场。","让管理者及时了解订单与车间进度，使物料、工序和质量记录形成关联，辅助生产协调。","工单下达；工序报工；在制品管理；物料与批次追溯；质量记录；ERP 与设备数据对接。","可选 ThinkSystem 服务器与存储、ThinkCentre 工位终端、ThinkEdge 数据采集设备及 MES 软件。","离散制造企业按工单记录每道工序的报工与检验结果，发生质量问题时追溯到物料批次和工位。"],["数字化供应链协同","智慧供应链","联想数字化供应链解决方案.jpg","连接采购、供应商、生产与交付信息，建立围绕订单和物料的协同视图。","解决供需信息更新滞后、物料短缺发现较晚、跨部门协调成本高的问题。","帮助识别缺料与交付风险，支持采购和生产团队共同调整补料及生产安排。","供需可视化；供应商协同；采购进度跟踪；物料齐套分析；交付异常预警。","可选 ThinkSystem 服务器、企业级存储与 ThinkCentre 业务终端，配合供应链协同软件。","装备企业对照生产订单检查关键物料到货情况，及时与供应商协商交期并调整装配计划。"],["供应链智慧运营","智慧供应链","联想供应链智慧运营解决方案.jpg","汇总库存、采购、物流与交付数据，建立供应链运营指标和异常分析视图。","解决运营报表分散、库存周转原因难分析、交付异常无法快速定位的问题。","为库存策略、物流安排和供应风险处理提供更完整的信息，辅助运营决策。","运营指标看板；库存与交付分析；异常归因；跨系统数据汇总；风险预警。","可选 ThinkSystem 数据分析服务器与存储、ThinkStation 分析工作站，结合 BI 与数据平台。","多工厂企业汇总库存及运输进度，对延迟订单分析供料、生产与物流环节的影响。"],["绿色制造与碳管理","绿色制造","联想绿色制造解决方案.jpg","围绕制造过程梳理能源与碳排放相关数据，建立统计口径、台账和持续改善流程。","解决能耗记录分散、排放边界不清、绿色改善措施缺少数据依据的问题。","支持企业识别资源消耗重点并跟踪改善进展，为内部管理与披露准备数据。","能源数据汇集；碳排放台账；核算口径管理；工序资源分析；改善措施跟踪。","可选 ThinkEdge 数据采集设备、ThinkSystem 服务器及绿色制造管理软件；核算方法需专业确认。","制造园区汇总各车间用电与能源记录，建立月度台账，对高消耗工序开展改善跟踪。"],["工业设备预测性维护","智慧运维","智能运维解决方案.jpg","采集设备运行信号并分析变化趋势，将异常线索与维修工单结合，辅助安排维护。","解决设备维护依赖固定周期、早期异常难发现、维修记录分散的问题。","辅助维护人员提前识别风险并合理安排检查，减少重复巡检和信息遗漏。","设备状态采集；振动与温度趋势分析；异常检测；维修工单联动；维护记录追踪。","可选 ThinkEdge 边缘设备、ThinkSystem 分析服务器，配合传感器和设备维护软件。","车间对关键电机采集振动与温度信号，发现趋势异常后安排现场检查，并记录维修结论。"],["工业安全智能监控","智慧安全","智能综合监控系统解决方案.jpg","结合现场视频与安全规则，对重点区域的作业风险进行辅助识别和告警管理。","解决高风险区域巡检覆盖不足、安全事件记录分散、告警处理缺少闭环的问题。","帮助安全管理人员及时发现需核实的风险线索，并追踪处置记录；人工复核仍是必要环节。","重点区域视频接入；作业风险识别；告警分级；人工复核；事件记录与权限管理。","可选 ThinkEdge 视频分析设备、ThinkSystem 存储与 ThinkVision 监控显示器，配合安全管理软件。","物流作业区对人车交汇位置进行监测，出现疑似风险时提示安全员核实并记录处置结果。"],["智能仓储与分拨","智慧物流","物流智能分拨中心解决方案.jpg","整合库位、库存、收发货和分拨设备信息，辅助仓库作业与产线物料配送。","解决库存位置不清、拣配信息不同步、库内设备与业务系统衔接困难的问题。","提升物料流转的可追踪性，帮助仓储团队协调补货、拣配和产线配送任务。","库存与库位管理；任务调度；条码追踪；分拨设备对接；收发货与配送看板。","可选 ThinkEdge 边缘设备、ThinkCentre 作业终端、ThinkSystem 服务器及仓储管理软件。","零件仓库按生产任务生成拣配清单，记录出库与工位签收，追踪缺料和配送异常。"],["研发高性能计算","智慧研发","汽车行业HPC解决方案.jpg","为仿真、工程分析和批量计算提供共享计算资源，支持研发团队提交与管理计算任务。","解决大型模型计算耗时、个人工作站资源不足、团队计算资源难统筹的问题。","支持更复杂的工程验证和多方案分析，提高计算资源使用的可管理性。","计算集群与任务调度；并行仿真；高速数据访问；项目配额；计算结果管理。","可选 ThinkSystem 高性能计算服务器、企业级存储与 ThinkStation 工作站，按 CAE 软件要求配置。","汽车零部件团队并行运行多个结构设计方案的仿真任务，对照结果筛选后续试制方案。"],["工业数据备份与容灾","数据保障","教育存储解决方案.jpg","围绕制造关键系统建立备份、恢复与容灾流程，保护生产数据和业务配置。","解决关键系统备份不完整、恢复过程未经演练、生产数据损坏后难以恢复的问题。","提升业务恢复准备度，让数据保留策略和恢复步骤可检查、可演练。","分级备份；副本隔离；恢复验证；容灾演练；备份监测与权限控制。","可选 ThinkSystem 服务器与企业级存储、备份软件及容灾资源，按恢复目标和网络条件设计。","工厂定期备份 MES 数据库与关键配置，在隔离环境演练恢复流程并记录所需时间。"],["工厂混合云平台","数字底座","DCM数据中心解决方案.jpg","统一规划工厂本地与云端资源，按业务时延、数据要求和资源需求安排应用部署。","解决多套资源平台管理分散、应用部署周期长、资源使用难统计的问题。","支持业务按需使用资源，并统一管理权限、容量和运维信息。","资源池管理；应用部署；访问控制；容量监测；本地与云端资源协同。","可选 ThinkSystem 服务器、存储与混合云管理软件；平台兼容性和部署范围需结合现网验证。","制造企业将现场低时延应用保留在本地，将研发测试与分析任务按规则安排到共享资源池。"],["工业边缘计算管理","数字底座","DCM数据中心管理平台.jpg","管理分布在车间和工厂的边缘计算节点，为现场应用提供就近计算与统一运维。","解决边缘节点数量多、配置不一致、软件升级与状态巡检困难的问题。","降低分散节点的管理负担，使现场应用部署和运行状态更可控。","节点纳管；应用分发；远程配置；健康监测；日志收集；升级回退。","可选 ThinkEdge 边缘计算设备、ThinkSystem 管理服务器，配合边缘节点与应用管理软件。","集团工厂统一管理多个车间的视觉检测节点，分批更新应用并监测节点运行情况。"],["工厂能耗精细化管理","能源管理","智慧电厂解决方案.jpg","采集并关联工厂、车间和关键设备的能源数据，分析能源消耗与生产活动之间的关系。","解决能耗只能按月汇总、异常用能难定位、工序能耗缺少比较依据的问题。","帮助识别空转和异常用能，跟踪节能措施的实际变化并辅助生产与用能安排。","计量数据采集；分项能耗统计；趋势分析；异常用能告警；单位产出能耗分析。","可选 ThinkEdge 采集设备、ThinkSystem 服务器及能源管理软件，配合具备通信能力的计量设备。","车间将设备运行记录与用电数据关联，检查非生产时段的异常耗电并跟踪整改情况。"],["制造知识助手","知识协同","联想魔方客服智能体解决方案.jpg","基于企业授权的作业指导、设备手册与维修记录，为员工提供带出处的知识检索和辅助问答。","解决手册查找耗时、经验难沉淀、新人不熟悉操作规范的问题。","帮助员工更快定位相关资料，促进维修经验复用；关键操作仍按正式规程执行。","文档接入与权限管理；知识检索；来源引用；问答反馈；内容版本更新。","可选 ThinkStation AI 工作站或 ThinkSystem AI 服务器，结合知识库与检索增强生成软件。","维修人员查询设备故障提示，助手返回相关手册章节和历史处理记录，由工程师核实后执行。"]];
  const fields = {'方案介绍':'summary','解决重点':'pain','方案价值':'value','核心能力':'ability','推荐产品':'products','客户案例':'cases'};
  const escape = text => String(text || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const asset = filename => '/assets/img/solution/' + encodeURIComponent(filename);
  const records = rows.map((row,index) => ({name:row[0],scenario:row[1],image:row[2],summary:row[3],pain:row[4],value:row[5],ability:row[6],products:row[7],cases:'场景示例（AI）：'+row[8],sector:'制造',suggested:index >= 6}));
  const byName = new Map(records.map(item => [item.name,item]));
  const disclaimer = 'AI 补充内容仅供选型参考；客户案例为场景示例，并非已交付项目。产品配置与实际交付范围以业务顾问确认为准。';
  const selector = '.content .lx-solution-floor[data-solution-industry="制造"]';
  let installedCatalog = null;
  function get(name, sector) {
    if (sector && !['制造','智能制造'].includes(sector)) return null;
    return byName.get(String(name || '').trim()) || null;
  }
  function registerCatalog() {
    const catalog = window.__lxIndustrySolutions?.catalog;
    if (!catalog || installedCatalog === catalog) return;
    catalog['制造'] = records.map(item => [item.name,item.scenario,(item.suggested ? 'AI 场景参考：' : '') + item.summary,item.image]);
    installedCatalog = catalog;
  }
  function cardHtml(item) {
    return `<article class="lx-floor-card lx-solution-card" data-solution="智能制造" data-solution-title="${escape(item.name)}" data-solution-industry="智能制造" data-solution-sector="制造" data-solution-scenario="${escape(item.scenario)}" data-solution-intro="${escape(item.summary)}" data-solution-image="${escape(item.image)}" role="button" tabindex="0" aria-label="查看${escape(item.name)}详情"><img class="lx-solution-card-image" src="${asset(item.image)}" alt="${escape(item.name)}方案场景图" loading="lazy"><div class="lx-solution-card-head"><div><strong>${escape(item.name)}</strong><div class="lx-solution-card-tags"><small>制造</small><small>${escape(item.scenario)}</small>${item.suggested ? '<small>AI 场景参考</small>' : ''}</div></div></div><span>${escape(item.summary)}</span><em>查看方案</em></article>`;
  }
  function addNotice(page) {
    if (page.querySelector('[data-lx-manufacturing-notice]')) return;
    const note = document.createElement('p');
    note.className = 'lx-p0-disclaimer';
    note.dataset.lxManufacturingNotice = revision;
    note.textContent = disclaimer;
    page.appendChild(note);
  }
  function updateGrids() {
    document.querySelectorAll(selector).forEach(floor => {
      const grid = floor.querySelector('.lx-floor-body');
      if (!grid) return;
      // Historical pages may retain the former multi-row scroll-region attributes.
      if (grid.style.getPropertyValue('--lx-manufacturing-row-height')) grid.style.removeProperty('--lx-manufacturing-row-height');
      if (grid.getAttribute('aria-label') === '制造行业解决方案列表，可向下滚动查看更多') {
        grid.removeAttribute('aria-label');grid.removeAttribute('tabindex');grid.removeAttribute('role');
      }
      if (grid.dataset.lxManufacturingContent === revision) return;
      // Keep all scenarios available to the shared single-row layout and shuffle action.
      const first = byName.get(grid.querySelector('.lx-solution-card')?.dataset.solutionTitle);
      const offset = first ? records.indexOf(first) : 0;
      grid.innerHTML = [...records.slice(offset),...records.slice(0,offset)].map(cardHtml).join('');
      grid.dataset.lxManufacturingContent = revision;
      const subtitle = floor.querySelector('.lx-floor-head p');
      if (subtitle) subtitle.textContent = '覆盖研发、生产、供应链与运维，含 AI 补充场景参考';
    });
  }
  function readPayload(node) {
    try { return JSON.parse(node.dataset.solutionCompareDetail || '{}'); } catch { return {}; }
  }
  function updateComparisons() {
    document.querySelectorAll('.content .lx-solution-compare-page').forEach(page => {
      if (page.dataset.lxManufacturingContent === revision) return;
      const headers = Array.from(page.querySelectorAll('.phead[data-col]'));
      const matches = headers.map(header => {
        const payload = readPayload(header);
        return get(payload.title || header.querySelector('strong')?.textContent,payload.sector);
      });
      if (!matches.some(Boolean)) return;
      headers.forEach((header,index) => {
        const item = matches[index];
        if (!item) return;
        const column = header.dataset.col;
        const payload = JSON.stringify({title:item.name,sector:'制造',industry:'智能制造',scenario:item.scenario,intro:item.summary,image:item.image});
        page.querySelectorAll('[data-col]').forEach(cell => { if (cell.dataset.col === column) cell.dataset.solutionCompareDetail = payload; });
        const image = header.querySelector('img');
        if (image) { image.src = asset(item.image); image.alt = item.name + '方案场景图'; }
        page.querySelectorAll('.tbl > .rowlabel').forEach(label => {
          const key = fields[label.textContent.trim()];
          if (!key) return;
          let cell = label.nextElementSibling;
          while (cell && !cell.classList.contains('rowlabel')) {
            if (cell.dataset.col === column) { cell.textContent = item[key]; break; }
            cell = cell.nextElementSibling;
          }
        });
      });
      if (matches.every(Boolean)) {
        const advice = page.querySelector('.lx-cmp-advice > span');
        const purposes = ['模型研发与版本管理','设计协同与仿真验证','可视化培训与远程协作','设备联网与工位协同','外观缺陷检测','工单执行与生产追溯','采购与物料协同','库存与交付分析','能源与碳数据管理','设备异常识别与维护','现场安全风险识别','仓储与物料配送','复杂工程仿真计算','关键系统数据恢复','本地与云端资源协同','分布式边缘节点运维','工序用能分析','手册检索与经验复用'];
        if (advice) advice.textContent = matches.map(item => item.name + '侧重' + purposes[records.indexOf(item)]).join('；') + '。建议按当前最紧迫的业务问题选择试点，再验证数据、接口与部署条件。';
      }
      addNotice(page);
      page.dataset.lxManufacturingContent = revision;
    });
  }
  function updateDetails(){return window.__p0Modules.invoke("pages/solution-detail#updateDetails:07e0989f1badb4452673119f",{get ["revision"](){return revision},get ["get"](){return get},get ["asset"](){return asset},get ["addNotice"](){return addNotice}},this,arguments);}
  function syncContent() { registerCatalog(); updateGrids(); updateComparisons(); updateDetails(); }
  function start() {
    syncContent();
    // Upgrade fresh results and restored historical HTML before the next paint.
    new MutationObserver(syncContent).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-solution-selected']});
  }
  window.__lxManufacturingSolutions = {revision,records,get};
  registerCatalog();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();

};
}
window.__p0Modules.dispatch(document.currentScript);
