// ===== AI PANEL =====
function toggleAI(forceState) {
  if (typeof forceState === 'boolean') {
    STATE.aiOpen = forceState;
  } else {
    STATE.aiOpen = !STATE.aiOpen;
  }
  const panel = document.getElementById('ai-panel');
  panel.classList.toggle('open', STATE.aiOpen);
  // 关闭时清掉拖拽留下的 inline width + 挤压状态，避免关不掉
  if (!STATE.aiOpen) {
    panel.style.width = '';
    document.body.classList.remove('ai-squeeze');
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('collapsed');
  }
  const btn = document.getElementById('ai-toggle-btn');
  btn.classList.toggle('active', STATE.aiOpen);
  btn.style.display = STATE.aiOpen ? 'none' : '';
  localStorage.setItem('ai_panel_open', STATE.aiOpen ? '1' : '0');
}
function restoreAIState() {
  const saved = localStorage.getItem('ai_panel_open');
  // 默认打开（saved === null 表示首次访问）
  const shouldOpen = saved === null || saved === '1';
  if (shouldOpen) toggleAI(true);
}

// ===== AI Panel 拖拽调整宽度 =====
(function() {
  const panel = document.getElementById('ai-panel');
  const handle = document.getElementById('ai-resize-handle');
  if (!handle) return;
  let startX, startW;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    startW = panel.offsetWidth;
    panel.classList.add('resizing');
    handle.classList.add('active');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    const diff = startX - e.clientX;
    // 上限放宽到视口 - 320px (留 56 侧边栏 + 最小 260 主内容)，下限 280px
    const newW = Math.min(Math.max(startW + diff, 280), window.innerWidth - 320);
    panel.style.width = newW + 'px';
    // 主内容区偏窄时自动折叠侧边栏 + 降 KPI 列数
    const sidebar = document.getElementById('sidebar');
    const sidebarW = sidebar && sidebar.classList.contains('collapsed') ? 56 : 220;
    const mainRemain = window.innerWidth - newW - sidebarW;
    const squeeze = mainRemain < 900;
    document.body.classList.toggle('ai-squeeze', squeeze);
    if (sidebar) sidebar.classList.toggle('collapsed', squeeze);
  }
  function onUp() {
    panel.classList.remove('resizing');
    handle.classList.remove('active');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
})();

const AI_CONVERSATION_STORAGE_KEY = 'leai_ai_conversations';

function aiNewLocalConversationId() {
  return `aic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function aiLoadConversations() {
  try {
    const list = JSON.parse(localStorage.getItem(AI_CONVERSATION_STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function aiSaveConversations(list) {
  localStorage.setItem(AI_CONVERSATION_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

function aiConversationTitle(messages) {
  const firstUser = (messages || []).find(item => item.role === 'user' && item.text);
  if (!firstUser) return '新会话';
  return firstUser.text.replace(/\s+/g, ' ').replace(/^📎\s*/, '').slice(0, 28) || '新会话';
}

function aiCurrentConversation() {
  if (!STATE.aiLocalConvId) {
    STATE.aiLocalConvId = aiNewLocalConversationId();
    STATE.aiLocalMessages = [];
  }
  return {
    id: STATE.aiLocalConvId,
    remoteConvId: STATE.aiConvId || null,
    title: aiConversationTitle(STATE.aiLocalMessages || []),
    messages: STATE.aiLocalMessages || [],
    updatedAt: new Date().toISOString()
  };
}

function aiPersistCurrentConversation() {
  const current = aiCurrentConversation();
  if (!current.messages.length) return;
  const list = aiLoadConversations().filter(item => item.id !== current.id);
  aiSaveConversations([current, ...list]);
}

function aiRecordMessage(role, text) {
  if (!text) return;
  if (!STATE.aiLocalConvId) {
    STATE.aiLocalConvId = aiNewLocalConversationId();
    STATE.aiLocalMessages = [];
  }
  STATE.aiLocalMessages.push({ role, text, at: new Date().toISOString() });
  aiPersistCurrentConversation();
}

function aiInitConversationStore() {
  if (!STATE.aiLocalConvId) {
    STATE.aiLocalConvId = aiNewLocalConversationId();
    STATE.aiLocalMessages = [];
  }
}

function aiRenderConversationMessages(messages) {
  const container = document.getElementById('ai-messages');
  if (!container) return;
  if (!messages || !messages.length) {
    container.innerHTML = `<div class="ai-msg assistant"><div class="bubble">${aiCurrentWelcomeHtml()}</div></div>`;
    return;
  }
  container.innerHTML = messages.map(item => {
    const html = item.role === 'assistant' ? renderAiMarkdown(item.text) : escapeHtml(item.text);
    return `<div class="ai-msg ${item.role}"><div class="bubble">${html}</div></div>`;
  }).join('');
  scrollAiToBottom();
}

function newAiConversation(skipPersist) {
  if (!skipPersist) aiPersistCurrentConversation();
  STATE.aiConvId = null;
  STATE.aiLocalConvId = aiNewLocalConversationId();
  STATE.aiLocalMessages = [];
  const container = document.getElementById('ai-messages');
  container.innerHTML = `<div class="ai-msg assistant"><div class="bubble">${aiCurrentWelcomeHtml()}</div></div>`;
}

function aiOpenConversationHistory() {
  aiPersistCurrentConversation();
  const list = aiLoadConversations();
  let overlay = document.getElementById('ai-conversation-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-conversation-modal';
    overlay.className = 'ai-conversation-modal';
    overlay.addEventListener('click', event => {
      if (event.target === overlay) aiCloseConversationHistory();
    });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="ai-conversation-panel" role="dialog" aria-label="AI 历史会话">
      <div class="ai-conversation-head">
        <div>
          <div class="ai-conversation-title">历史会话</div>
          <div class="ai-conversation-meta">查看、恢复或删除右侧 AI 助手的会话记录</div>
        </div>
        <div class="ai-conversation-actions">
          <button class="btn btn-primary" onclick="newAiConversation(); aiCloseConversationHistory();">新开会话</button>
          <button class="agent-skill-modal-close" onclick="aiCloseConversationHistory()" title="关闭">×</button>
        </div>
      </div>
      <div class="ai-conversation-body">
        ${list.length ? list.map(item => aiConversationHistoryItem(item)).join('') : '<div class="ai-conversation-empty">暂无历史会话。开始提问后，这里会自动保存记录。</div>'}
      </div>
    </div>`;
  overlay.classList.add('open');
  document.body.classList.add('agent-skill-modal-open');
}

function aiConversationHistoryItem(item) {
  const messages = item.messages || [];
  const last = messages[messages.length - 1];
  const preview = last?.text ? last.text.replace(/\s+/g, ' ').slice(0, 80) : '暂无内容';
  const isCurrent = item.id === STATE.aiLocalConvId;
  return `
    <div class="ai-conversation-item ${isCurrent ? 'active' : ''}">
      <div class="ai-conversation-item-main">
        <div class="ai-conversation-item-title">${escapeHtml(item.title || '未命名会话').replace(/<br>/g, '')}</div>
        <div class="ai-conversation-item-preview">${escapeHtml(preview).replace(/<br>/g, '')}</div>
        <div class="ai-conversation-item-meta">${new Date(item.updatedAt || Date.now()).toLocaleString('zh-CN')} · ${messages.length} 条消息${isCurrent ? ' · 当前会话' : ''}</div>
      </div>
      <div class="ai-conversation-item-actions">
        <button class="btn btn-secondary" onclick="aiRestoreConversation('${item.id}')">打开</button>
        <button class="btn btn-secondary danger" onclick="aiDeleteConversation('${item.id}')">删除</button>
      </div>
    </div>`;
}

function aiRestoreConversation(id) {
  aiPersistCurrentConversation();
  const item = aiLoadConversations().find(conv => conv.id === id);
  if (!item) return;
  STATE.aiLocalConvId = item.id;
  STATE.aiConvId = item.remoteConvId || null;
  STATE.aiLocalMessages = item.messages || [];
  aiRenderConversationMessages(STATE.aiLocalMessages);
  aiCloseConversationHistory();
  if (!STATE.aiOpen) toggleAI(true);
}

function aiDeleteConversation(id) {
  if (!confirm('确认删除这条会话记录？')) return;
  aiSaveConversations(aiLoadConversations().filter(item => item.id !== id));
  if (STATE.aiLocalConvId === id) newAiConversation(true);
  aiOpenConversationHistory();
}

function aiCloseConversationHistory() {
  const overlay = document.getElementById('ai-conversation-modal');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('agent-skill-modal-open');
}

function aiQuick(text) {
  if (!STATE.aiOpen) toggleAI();
  document.getElementById('ai-input').value = text;
  aiSend();
}

const AI_REPORT_STORAGE_KEY = 'leai_ai_saved_reports';
const AI_REPORT_ARTIFACTS = {};

function aiShouldCreateReportArtifact(userText, assistantText) {
  const source = `${userText || ''}\n${assistantText || ''}`;
  const askedReport = /(报表|报告|日报|周报|月报|复盘|总结)/.test(userText || '');
  const looksStructured = /(^|\n)#{1,3}\s*|一、|二、|三、|四、|五、|\|.+\|/.test(assistantText || '');
  return askedReport && looksStructured && (assistantText || '').trim().length > 180;
}

function aiReportTitle(userText, assistantText) {
  const firstHeading = (assistantText || '').match(/^#{1,3}\s*(.+)$/m);
  if (firstHeading) return firstHeading[1].trim().slice(0, 40);
  if (/日报/.test(userText || '')) return '运营日报';
  if (/周报/.test(userText || '')) return '运营周报';
  if (/月报/.test(userText || '')) return '运营月报';
  return 'AI 生成报表';
}

function aiAttachReportArtifact(bubbleEl, userText, assistantText) {
  if (!bubbleEl || !aiShouldCreateReportArtifact(userText, assistantText)) return;
  const id = `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  AI_REPORT_ARTIFACTS[id] = {
    id,
    title: aiReportTitle(userText, assistantText),
    content: assistantText,
    source: userText || '',
    createdAt: new Date().toISOString()
  };
  const action = document.createElement('div');
  action.className = 'ai-report-actions';
  action.innerHTML = `
    <button class="ai-report-btn secondary" onclick="aiSaveReportArtifact('${id}', this)">保存</button>
    <button class="ai-report-btn" onclick="aiDownloadReportArtifact('${id}')">下载</button>`;
  bubbleEl.appendChild(action);
}

function aiTaskActionItems(userText, assistantText) {
  const source = `${userText || ''}\n${assistantText || ''}`.toLowerCase();
  const items = [];
  const add = item => {
    if (!items.some(existing => existing.label === item.label)) items.push(item);
  };

  if (/query|查询分析|热词|标注|非官网|渠道|转化/.test(source)) {
    add({ label: '打开 Query 分析', kind: 'page', value: 'pipeline.annotate' });
  }
  if (/gmv|订单|销售|交易|转化/.test(source)) {
    add({ label: '查看 GMV 分析', kind: 'page', value: 'ops.gmv' });
  }
  if (/流量|dau|mau|入口|访问|互动/.test(source)) {
    add({ label: '查看流量分析', kind: 'page', value: 'ops.traffic' });
  }
  if (/商品|推荐位|价格|上下架|配置/.test(source)) {
    add({ label: '打开商品管理', kind: 'prompt', value: '打开商品管理' });
  }
  if (/知识库|知识|问答|文档/.test(source)) {
    add({ label: '打开知识库', kind: 'prompt', value: '打开知识库' });
  }
  if (/报表|报告|日报|周报|月报|复盘|总结/.test(source)) {
    add({ label: '继续生成报表', kind: 'prompt', value: '基于刚才的问题，继续生成一份结构化运营报表。' });
  } else {
    add({ label: '生成报表', kind: 'prompt', value: '基于当前页面和刚才的问题，生成一份结构化运营报表。' });
  }
  add({ label: '继续追问', kind: 'prompt', value: '基于刚才的回答，继续追问最关键的原因和下一步动作。' });
  add({ label: '管理技能', kind: 'skill', value: 'skills' });
  return items.slice(0, 4);
}

function aiAttachTaskActions(bubbleEl, userText, assistantText) {
  if (!bubbleEl || bubbleEl.querySelector('.ai-task-actions')) return;
  const items = aiTaskActionItems(userText, assistantText);
  if (!items.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'ai-task-actions';
  wrap.innerHTML = `<div class="ai-task-actions-title">可继续执行</div>`;
  const row = document.createElement('div');
  row.className = 'ai-task-actions-row';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-task-btn';
    btn.textContent = item.label;
    btn.addEventListener('click', () => aiRunTaskAction(item));
    row.appendChild(btn);
  });
  wrap.appendChild(row);
  bubbleEl.appendChild(wrap);
}

function aiRunTaskAction(item) {
  if (!item) return;
  if (item.kind === 'page') {
    aiOpenPageInNewWindow(item.value);
    addAiMessage('assistant', `已在新页面打开 **${getPageLabel(item.value)}**`);
    return;
  }
  if (item.kind === 'skill') {
    aiOpenSkillManagement();
    return;
  }
  aiQuick(item.value);
}

function aiOpenPageInNewWindow(pageId) {
  const url = new URL(window.location.href);
  url.pathname = '/admin/workbench.html';
  url.searchParams.set('page', pageId);
  url.hash = '';
  window.open(url.toString(), '_blank', 'noopener');
}

function aiSaveReportArtifact(id, trigger) {
  const report = AI_REPORT_ARTIFACTS[id];
  if (!report) return;
  const saved = JSON.parse(localStorage.getItem(AI_REPORT_STORAGE_KEY) || '[]');
  const next = [report, ...saved.filter(item => item.id !== id)].slice(0, 20);
  localStorage.setItem(AI_REPORT_STORAGE_KEY, JSON.stringify(next));
  const panel = trigger?.closest('.ai-report-actions') || document.querySelector('.ai-report-actions');
  if (panel) {
    panel.querySelector('.ai-report-save-tip')?.remove();
    const tip = document.createElement('span');
    tip.className = 'ai-report-save-tip';
    tip.textContent = '已保存';
    panel.prepend(tip);
  }
}

function aiDownloadReportArtifact(id) {
  const report = AI_REPORT_ARTIFACTS[id];
  if (!report) return;
  const blob = new Blob([`# ${report.title}\n\n${report.content}`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function aiCurrentWelcomeHtml() {
  const page = STATE.currentPage;
  if (page === 'dashboard.overview') {
    return '我会基于当前运营总览的时间范围、核心指标、链路转化、分业务和分平台数据做分析。你也可以填写阶段目标，我会一起评估目标缺口和动作优先级。';
  }
  if (page === 'ops.traffic') {
    return '我会基于当前流量分析页的时间范围、DAU/MAU、登录互动、媒体TOP10、端口和业务流量结构回答问题。';
  }
  if (page === 'ops.gmv') {
    return '我会基于当前GMV分析页的时间范围、GMV趋势、购买人数、分业务和官网/非官网结构回答问题。';
  }
  return '你好！我是乐享 AI 助手。你可以在底部输入框里描述要完成的运营任务，例如导航、查数据、生成报告、配置商品或查询知识库。';
}

function aiShortcutItemsForPage(page) {
  if (page === 'dashboard.overview') {
    return [
      { label: '总览解读', text: '基于当前运营总览看板，分析主要趋势、风险和机会。' },
      { label: '链路瓶颈', text: '基于当前运营总览看板，找出登录、互动、购买、GMV链路中的最大瓶颈。' },
      { label: '增长动作', text: '基于当前运营总览看板，给出未来两周最优先的运营动作。' },
      { label: '补数建议', text: '基于当前运营总览看板，指出还缺少哪些数据才能判断问题原因。' }
    ];
  }
  if (page === 'ops.traffic') {
    return [
      { label: '入口贡献', text: '当前时间范围内，哪些入口贡献最大？这些入口的登录和互动质量怎么样？' },
      { label: '媒体TOP10', text: '分析监测媒体TOP10的访问、登录、互动贡献，并给出优化建议。' },
      { label: '登录转化', text: '当前流量的登录率和互动率是否异常？瓶颈在哪里？' },
      { label: '端口结构', text: '分端口流量结构有什么变化？APP、WAP、PC分别应该怎么优化？' },
      { label: '补数建议', text: '流量分析还缺哪些数据，才能判断渠道质量和转化原因？' }
    ];
  }
  if (page === 'ops.gmv') {
    return [
      { label: 'GMV解读', text: '基于当前GMV分析看板，分析GMV趋势、风险和机会。' },
      { label: '业务贡献', text: '消费、SMB、政企业务谁在拉动GMV，谁拖后腿？' },
      { label: '平台结构', text: '官网和非官网GMV结构是否健康？下一步怎么优化？' },
      { label: '目标缺口', text: '如果阶段目标是GMV提升10%，当前看板显示最大的缺口在哪里？' }
    ];
  }
  return [
    { label: '今日指标', text: '今日核心指标' },
    { label: '查数据', text: '最近7天订单按渠道汇总' },
    { label: '商品管理', text: '打开商品管理' },
    { label: '知识库', text: '打开知识库' },
    { label: 'CMS', text: '打开页面管理' },
    { label: '运营建议', text: '本周运营建议' }
  ];
}

function aiRefreshPageAssistant() {
  const shortcuts = document.getElementById('ai-shortcuts');
  if (shortcuts) {
    const items = aiShortcutItemsForPage(STATE.currentPage);
    shortcuts.innerHTML = items.map((item, i) => `<span class="ai-shortcut" data-ai-shortcut="${i}">${escapeHtml(item.label).replace(/<br>/g, '')}</span>`).join('');
    shortcuts.querySelectorAll('[data-ai-shortcut]').forEach(el => {
      el.addEventListener('click', () => {
        const item = items[Number(el.dataset.aiShortcut)];
        if (item) aiQuick(item.text);
      });
    });
  }

  const bar = document.getElementById('ai-page-context');
  if (!bar) return;
  const page = STATE.currentPage;
  if (page === 'dashboard.overview') {
    const saved = localStorage.getItem('ai_goal_dashboard_overview') || '';
    bar.style.display = '';
    bar.innerHTML = `
      <div class="ai-goal-card">
        <div class="ai-goal-head">
          <span>阶段目标</span>
          <button type="button" onclick="aiSendGoalAnalysis()">分析</button>
        </div>
        <textarea id="ai-stage-goal" rows="2" placeholder="例如：近30天GMV提升10%，互动率不下降">${escapeHtml(saved).replace(/<br>/g, '\n')}</textarea>
      </div>`;
    const input = document.getElementById('ai-stage-goal');
    if (input) input.addEventListener('input', () => localStorage.setItem('ai_goal_dashboard_overview', input.value.trim()));
  } else {
    bar.style.display = 'none';
    bar.innerHTML = '';
  }
}

function aiOpenSkillManagement() {
  if (!STATE.aiOpen) toggleAI(true);
  if (typeof openSkillManagerOverlay === 'function') openSkillManagerOverlay();
  else switchPage('agent.skills');
}

function aiOpenTaskLog() {
  if (!STATE.aiOpen) toggleAI(true);
  addAiMessage('assistant', `
    <strong>任务执行记录</strong><br>
    后续所有关键任务都会记录：任务名称、状态、执行人、时间、关联 Skill 和执行结果。<br><br>
    示例：修改首页商品模块 / 待确认 / 张瑞 / 关联 Skill：商品配置。
  `);
}

function aiPageGoal() {
  const el = document.getElementById('ai-stage-goal');
  return (el?.value || '').trim();
}

function aiSendGoalAnalysis() {
  if (!STATE.aiOpen) toggleAI(true);
  const goal = aiPageGoal();
  if (!goal) {
    addAiMessage('assistant', '先填一个阶段目标，比如“近30天GMV提升10%，互动率不下降”。');
    return;
  }
  const input = document.getElementById('ai-input');
  input.value = `我的阶段目标是：${goal}。请基于当前运营总览看板评估目标达成路径、关键指标缺口、优先动作和需要补充的数据。`;
  aiSend();
}

function aiBuildPageContextForMessage() {
  const goal = aiPageGoal();
  if (STATE.currentPage === 'dashboard.overview' && typeof leaiCurrentOverviewAiContext === 'function') {
    return leaiCurrentOverviewAiContext(goal);
  }
  if (STATE.currentPage === 'ops.traffic' && typeof opsCurrentTrafficAiContext === 'function') {
    return opsCurrentTrafficAiContext(goal);
  }
  if (STATE.currentPage === 'ops.gmv' && typeof opsCurrentGmvAiContext === 'function') {
    return opsCurrentGmvAiContext(goal);
  }
  return '';
}

function aiHasLeaiOpsContext() {
  return ['dashboard.overview', 'ops.traffic', 'ops.gmv'].includes(STATE.currentPage);
}

function aiAttachPageContext(msgForApi, hadFile) {
  if (hadFile) return msgForApi;
  const context = aiBuildPageContextForMessage();
  if (!context) return msgForApi;
  return `【乐享运营看板上下文】
以下数据来自当前页面已选择的时间范围和筛选条件，是本轮回答的可信数据源。不要改用通用统计覆盖这些数据；没有提供的数据请明确说缺少，并说明应向业务补充什么。

${context}

【用户问题】
${msgForApi}

【回答要求】
1. 只基于上述页面数据和用户问题做分析，不要编造未提供的数据。
2. 先给结论，再说明关键证据、可能原因、建议动作。
3. 如果判断原因还需要更多数据，列出需要补充的数据口径和用途。`;
}

// AI导航指令映射 — 自然语言→页面ID
const AI_NAV_MAP = [
  { keywords: ['运营总览','数据总览','dashboard','首页','大盘','概览'], page: 'dashboard.overview' },
  { keywords: ['geo','seo','搜索引擎','站外'], page: 'dashboard.geo' },
  { keywords: ['query分析','查询分析','query','热词','标注看板','数据标注','标注'], page: 'pipeline.annotate' },
  { keywords: ['客户行为','行为分析','漏斗','留存'], page: 'dashboard.behavior' },
  { keywords: ['统计分析','统计','数据统计'], page: 'pipeline.stats' },
  { keywords: ['口令过滤','过滤口令','去口令'], page: 'pipeline.filter' },
  { keywords: ['监控看板','监控','流水线','pipeline监控','流水线监控'], page: 'pipeline.monitor' },
  { keywords: ['质量分析','质量','满意度','性能','异常','评分','osat','nps'], page: 'pipeline.quality' },
];

function aiTryNavigate(text) {
  const lower = text.toLowerCase().trim();
  // 必须有明确的导航动词，或者消息极短（≤6字）且等于关键词
  const navMatch = lower.match(/^(?:打开|去|跳转到?|切换到?|进入|查看|show|open|goto|go to)\s*(.+)/);
  const target = navMatch ? navMatch[1].trim() : null;

  // 只有两种情况触发导航：
  // 1. 以导航动词开头（"打开skill管理"）
  // 2. 消息极短且整体就是一个页面名（"技能管理"、"订单"）
  const isShortNavOnly = !target && lower.length <= 6;
  const matchText = target || (isShortNavOnly ? lower : null);
  if (!matchText) return null;

  for (const rule of AI_NAV_MAP) {
    for (const kw of rule.keywords) {
      if (target ? matchText.includes(kw) : matchText === kw) {
        // pipeline 页面仅管理员可访问
        if (rule.page.startsWith('pipeline.') && !STATE.permissions.includes('*')) {
          return '⚠️ 数据流水线功能仅管理员可用';
        }
        switchPage(rule.page);
        const label = getPageLabel(rule.page);
        return `已为你打开 **${label}**`;
      }
    }
  }
  return null;
}

function aiTryLocalCommand(text) {
  const lower = text.toLowerCase().trim();
  const isAdmin = STATE.permissions.includes('*');

  // 日期解析
  function parseDateRange(input) {
    const today = new Date(); today.setHours(0,0,0,0);
    const fmt = d => d.toISOString().slice(0,10);
    const m = input.match(/昨[天日]/); if (m) { const d = new Date(today-86400000); return {from:fmt(d),to:fmt(d),label:'昨天'}; }
    const m7 = input.match(/近\s*(\d+)\s*天/); if (m7) { const n=parseInt(m7[1]); return {from:fmt(new Date(today-n*86400000)),to:fmt(today),label:`近${n}天`}; }
    if (/近7天|7天/.test(input)) return {from:fmt(new Date(today-7*86400000)),to:fmt(today),label:'近7天'};
    if (/近30天|30天/.test(input)) return {from:fmt(new Date(today-30*86400000)),to:fmt(today),label:'近30天'};
    if (/本周/.test(input)) { const d=today.getDay()||7; return {from:fmt(new Date(today-(d-1)*86400000)),to:fmt(today),label:'本周'}; }
    if (/上周/.test(input)) { const d=today.getDay()||7; return {from:fmt(new Date(today-(d+6)*86400000)),to:fmt(new Date(today-d*86400000)),label:'上周'}; }
    if (/本月/.test(input)) { const y=today.getFullYear(),m=today.getMonth(); return {from:fmt(new Date(y,m,1)),to:fmt(today),label:'本月'}; }
    if (/上月/.test(input)) { const y=today.getFullYear(),m=today.getMonth(); return {from:fmt(new Date(y,m-1,1)),to:fmt(new Date(y,m,0)),label:'上月'}; }
    return null;
  }

  // 帮我标注
  if (/^(帮我标注|开始标注|上传标注|标注文件)$/.test(lower)) {
    switchPage('pipeline.task');
    setTimeout(() => { const el = document.getElementById('task-upload'); if (el) el.click(); }, 350);
    return '📁 已打开标注页面，请选择要标注的文件';
  }
  // 标注记录
  if (/^(标注记录|标注历史|标注任务)$/.test(lower)) {
    switchPage('pipeline.task');
    return '📋 已打开标注记录';
  }
  // 导出数据
  if (/^(导出|导出数据|下载|下载数据)$/.test(lower)) {
    return '请选择导出格式：\n- **标注明细** → 详细的每条query分类结果\n- **分类占比** → 一级分类分布统计\n- **三级分类** → 细分类别分布\n\n请在聊天中告诉我你要哪种格式，或直接在看板页面点击导出按钮。';
  }
  // 二级分类
  if (/^(二级分类|细分类别|意图分析)$/.test(lower)) {
    switchPage('pipeline.stats');
    setTimeout(() => { const el = document.getElementById('stats-upload'); if (el) el.click(); }, 350);
    return '📊 已打开二级分类分析页面，请上传已标注的文件';
  }
  // 更新看板
  if (/^(更新看板|刷新看板|刷新数据)$/.test(lower)) {
    if (!isAdmin) return '⚠️ 仅管理员可操作';
    if (typeof initDashboard === 'function') { initDashboard(); return '✅ 看板数据已刷新'; }
    return '⚠️ 当前不在看板页面，请先打开 Query 分析看板';
  }
  // 启动流水线
  if (/^(启动流水线|开始流水线|开启流水线)$/.test(lower)) {
    if (!isAdmin) return '⚠️ 仅管理员可操作';
    switchPage('pipeline.monitor');
    return '🚀 已打开流水线监控页面，请点击启动按钮';
  }
  // 总结标注结果
  if (/^(总结|总结标注|总结结果|总结标注结果)$/.test(lower)) {
    fetch('/api/pipeline/classify/tasks?user_id=' + (STATE.admin?.username || ''), { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        const tasks = data.tasks || [];
        const done = tasks.filter(t => t.status === 'done');
        if (done.length === 0) { addAiMessage('assistant', '暂无已完成的标注任务'); return; }
        const latest = done[0];
        fetch('/api/pipeline/classify/' + latest.task_id, { credentials: 'include' })
          .then(r => r.ok ? r.json() : Promise.reject(r))
          .then(task => {
            const r = task.result || {};
            let msg = `**最新标注结果** (${latest.filename})\n\n`;
            msg += `- 总条数：${r.total || '-'}\n`;
            msg += `- 意图不明：${r.unclear_count || 0}\n`;
            if (r.llm_fixed_count) msg += `- LLM 兜底修正：${r.llm_fixed_count}\n`;
            if (r.distribution) {
              msg += '\n**一级分类分布：**\n';
              for (const [k,v] of Object.entries(r.distribution).sort((a,b) => b[1]-a[1])) {
                const pct = ((v / r.total) * 100).toFixed(1);
                msg += `- ${k}：${v} (${pct}%)\n`;
              }
            }
            if (r.issues?.length) msg += `\n⚠️ 问题：${r.issues.join('、')}`;
            addAiMessage('assistant', msg);
          })
          .catch(() => addAiMessage('assistant', '获取标注详情失败'));
      })
      .catch(() => addAiMessage('assistant', '获取标注记录失败'));
    return '⏳ 正在获取最近标注结果...';
  }
  // 日期+分析/分布/统计
  const dateRange = parseDateRange(lower);
  if (dateRange && /(分析|分布|统计|query|数据)/.test(lower) && !aiHasLeaiOpsContext()) {
    const url = `/api/pipeline/stats/summary?from=${dateRange.from}&to=${dateRange.to}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (data.error) { addAiMessage('assistant', `⚠️ ${data.error}`); return; }
        let msg = `**${dateRange.label}统计** (${data.from} ~ ${data.to})\n\n`;
        msg += `- 总 Query：${data.total_queries || 0}\n`;
        msg += `- 总用户：${data.total_users || 0}\n`;
        msg += `- 统计天数：${data.days || 0}\n`;
        if (data.tag_dist && Object.keys(data.tag_dist).length) {
          msg += '\n**一级分类分布：**\n';
          for (const [k,v] of Object.entries(data.tag_dist).sort((a,b) => b[1]-a[1])) {
            msg += `- ${k}：${v}\n`;
          }
        }
        if (data.tag_dist_active && Object.keys(data.tag_dist_active).length) {
          msg += '\n**主动query分类：**\n';
          for (const [k,v] of Object.entries(data.tag_dist_active).sort((a,b) => b[1]-a[1])) {
            msg += `- ${k}：${v}\n`;
          }
        }
        addAiMessage('assistant', msg);
      })
      .catch(() => addAiMessage('assistant', '获取统计数据失败，可能暂无该时段数据'));
    return `⏳ 正在查询${dateRange.label}统计数据...`;
  }
  // 热重载
  if (['热重载', '重载规则', 'reload', '热加载', '重新加载规则'].includes(lower)) {
    if (!isAdmin) return '⚠️ 热重载仅管理员可用';
    fetch('/api/pipeline/classify/rules/status', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        const msg = data.files.map(f => `• \`${f.path}\` — 修改时间 ${f.mtime}`).join('\n');
        addAiMessage('assistant', `✅ 标注规则已就绪，下次标注将直接使用最新规则。\n\n规则文件：\n${msg}`);
      })
      .catch(() => {
        addAiMessage('assistant', '✅ 标注规则热重载完成。每次标注会从磁盘实时读取规则文件，修改后无需重启服务，下次标注自动生效。');
      });
    return '⏳ 正在检查规则文件...';
  }

  return null;
}

// ====== AI 文件拖拽/上传 ======
let _aiPendingFile = null; // { name, type, content, size }

function aiFileSelected(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  _aiReadFile(file);
  inputEl.value = ''; // reset so same file can be re-selected
}

function _aiReadFile(file) {
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    addAiMessage('assistant', '文件过大（最大2MB），请压缩后重试');
    return;
  }
  const textTypes = ['.txt','.md','.csv','.json','.xml','.html','.js','.css','.log','.yaml','.yml','.sql','.ini','.conf','.sh','.py','.java','.ts','.tsx','.jsx'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const isText = textTypes.includes(ext) || file.type.startsWith('text/') || file.type === 'application/json';

  if (isText) {
    const reader = new FileReader();
    reader.onload = () => {
      _aiPendingFile = { name: file.name, type: file.type || ext, content: reader.result, size: file.size };
      _aiShowFilePreview();
    };
    reader.readAsText(file);
  } else if (ext === '.xlsx' || ext === '.xls' || ext === '.docx' || ext === '.pdf') {
    // 二进制文件：上传到服务端解析
    const formData = new FormData();
    formData.append('file', file);
    addAiMessage('assistant', '正在解析文件...');
    fetch('/api/harness/upload', { method: 'POST', body: formData })
      .then(r => r.json()).then(data => {
        if (data.content) {
          _aiPendingFile = { name: file.name, type: ext, content: data.content, size: file.size };
          _aiShowFilePreview();
        } else {
          addAiMessage('assistant', '文件解析失败: ' + (data.error || '不支持的格式'));
        }
      }).catch(() => {
        addAiMessage('assistant', '文件上传失败，请稍后重试');
      });
  } else {
    addAiMessage('assistant', '暂不支持此文件格式，支持: txt/md/csv/json/xlsx/docx/pdf');
  }
}

function _aiShowFilePreview() {
  if (!_aiPendingFile) return;
  const preview = document.getElementById('ai-file-preview');
  const nameEl = document.getElementById('ai-file-name');
  const sizeKb = (_aiPendingFile.size / 1024).toFixed(1);
  nameEl.textContent = _aiPendingFile.name + ' (' + sizeKb + 'KB)';
  preview.style.display = 'flex';
}

function aiClearFile() {
  _aiPendingFile = null;
  const preview = document.getElementById('ai-file-preview');
  preview.style.display = 'none';
}

// 拖拽初始化（在页面加载后调用）
function _aiInitDragDrop() {
  const area = document.getElementById('ai-input-area');
  if (!area) return;
  ['dragenter','dragover'].forEach(ev => {
    area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.style.borderColor = 'var(--primary)'; area.style.background = 'var(--primary-light)'; });
  });
  ['dragleave','drop'].forEach(ev => {
    area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.style.borderColor = ''; area.style.background = ''; });
  });
  area.addEventListener('drop', e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) _aiReadFile(file);
  });
}

function aiSend() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text && !_aiPendingFile) return;

  // 构建用户消息（含文件）
  let userMsg = text;
  let msgForApi = text;
  const hadFile = !!_aiPendingFile;
  if (_aiPendingFile) {
    const fileInfo = '📎 ' + _aiPendingFile.name;
    userMsg = text ? fileInfo + '\n' + text : fileInfo;
    // 将文件内容拼到消息中给AI
    const truncContent = _aiPendingFile.content.length > 8000
      ? _aiPendingFile.content.slice(0, 8000) + '\n...(内容过长已截断)'
      : _aiPendingFile.content;
    msgForApi = `[用户上传了文件: ${_aiPendingFile.name}]\n\n--- 文件内容 ---\n${truncContent}\n--- 文件结束 ---\n\n${text || '请分析这个文件'}`;
  }

  addAiMessage('user', userMsg);
  input.value = '';
  aiClearFile();

  // 先尝试本地命令（热重载、标注等）
  const localResult = aiTryLocalCommand(text);
  if (localResult) {
    addAiMessage('assistant', localResult);
    return;
  }

  // 再尝试本地导航指令
  const navResult = aiTryNavigate(text);
  if (navResult) {
    addAiMessage('assistant', navResult);
    return;
  }

  // Show typing
  const typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.textContent = '思考中...';
  document.getElementById('ai-messages').appendChild(typing);
  scrollAiToBottom();

  msgForApi = aiAttachPageContext(msgForApi, hadFile);

  // 流式调用 Harness Chat API
  streamHarnessChat(msgForApi, typing, userMsg);
}

async function streamHarnessChat(msgForApi, typingEl, displayMessage) {
  let streamMsgEl = null;
  let accumulated = '';
  let toolsUsed = [];

  const ensureMsgEl = () => {
    if (streamMsgEl) return streamMsgEl;
    if (typingEl) typingEl.remove();
    const container = document.getElementById('ai-messages');
    const div = document.createElement('div');
    div.className = 'ai-msg assistant';
    div.innerHTML = '<div class="bubble"></div>';
    container.appendChild(div);
    streamMsgEl = div.querySelector('.bubble');
    return streamMsgEl;
  };

  const render = () => {
    if (!streamMsgEl) return;
    let text = accumulated;
    if (toolsUsed.length) text += '\n\n🔧 调用了: ' + toolsUsed.join(', ');
    streamMsgEl.innerHTML = renderAiMarkdown(text);
    scrollAiToBottom();
  };

  try {
    const resp = await fetch('/api/harness/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msgForApi,
        displayMessage: displayMessage || msgForApi,
        convId: STATE.aiConvId,
        currentPage: STATE.currentPage,
        stream: true
      })
    });

    if (!resp.ok || !resp.body) {
      typingEl && typingEl.remove();
      addAiMessage('assistant', '请求失败: HTTP ' + resp.status);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let obj;
        try { obj = JSON.parse(payload); } catch { continue; }

        if (obj.type === 'start') {
          if (obj.convId) STATE.aiConvId = obj.convId;
          aiPersistCurrentConversation();
        } else if (obj.type === 'tools') {
          toolsUsed = obj.tools || [];
          // 工具调用中，更新 typing 提示
          if (typingEl && !streamMsgEl) typingEl.textContent = '🔧 执行 ' + toolsUsed.join(', ') + '...';
        } else if (obj.type === 'delta') {
          ensureMsgEl();
          accumulated += obj.text || '';
          render();
        } else if (obj.type === 'done') {
          if (obj.toolsUsed && obj.toolsUsed.length) {
            toolsUsed = obj.toolsUsed;
            render();
            _aiAutoRefreshPage(toolsUsed);
          }
          // 检查AI回复中是否包含导航指令标记
          const aiNavMatch = accumulated.match(/\[NAV:([^\]]+)\]/);
          if (aiNavMatch) {
            const pageId = aiNavMatch[1].trim();
            accumulated = accumulated.replace(/\[NAV:[^\]]+\]/, '');
            if (streamMsgEl) streamMsgEl.innerHTML = renderAiMarkdown(accumulated + (toolsUsed.length ? '\n\n🔧 调用了: ' + toolsUsed.join(', ') : ''));
            switchPage(pageId);
          }
          aiAttachReportArtifact(streamMsgEl, displayMessage || msgForApi, accumulated);
          aiAttachTaskActions(streamMsgEl, displayMessage || msgForApi, accumulated);
          if (streamMsgEl) aiRecordMessage('assistant', accumulated || '（无响应）');
        } else if (obj.type === 'error') {
          ensureMsgEl();
          accumulated += '\n\n⚠️ ' + obj.message;
          render();
        }
      }
    }
    if (typingEl) typingEl.remove();
    if (!streamMsgEl) {
      // 整个流没有任何 delta
      addAiMessage('assistant', '（无响应）');
    }
  } catch (err) {
    if (typingEl) typingEl.remove();
    if (streamMsgEl) {
      accumulated += '\n\n⚠️ 连接中断: ' + err.message;
      render();
    } else {
      addAiMessage('assistant', '请求失败: ' + err.message);
    }
  }
}

// AI执行操作后自动刷新对应页面
function _aiAutoRefreshPage(toolsUsed) {
  const refreshMap = {
    'product_create': 'ecommerce.products',
    'marketing_create': 'marketing.tasks',
    'knowledge_create': 'content.knowledge',
    'page_navigate': null // 导航不需要刷新
  };
  for (const tool of toolsUsed) {
    const pageId = refreshMap[tool];
    if (pageId && STATE.currentPage === pageId) {
      setTimeout(() => switchPage(pageId), 500); // 延迟刷新让数据落库
    }
  }
}

function addAiMessage(role, text) {
  const container = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + role;
  if (role === 'assistant') {
    div.innerHTML = `<div class="bubble">${renderAiMarkdown(text)}</div>`;
    aiAttachTaskActions(div.querySelector('.bubble'), '', text);
  } else {
    div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  }
  container.appendChild(div);
  aiRecordMessage(role, text);
  scrollAiToBottom();
}

function scrollAiToBottom() {
  const el = document.getElementById('ai-messages');
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function renderAiMarkdown(text) {
  // 先安全转义
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 工具调用标签提取
  let toolTag = '';
  s = s.replace(/\n*🔧 调用了: (.+)$/m, (_, tools) => {
    toolTag = `<div class="ai-tool-tag">🔧 ${tools}</div>`;
    return '';
  });

  // 标题 ### / ##
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // 加粗 **text** 和 emoji标题行（如 ✅ **xxx**）
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 分隔线
  s = s.replace(/^---$/gm, '<hr>');

  // 卡片块识别：数字编号+加粗标题+内容（如 "1. **《xxx》**\n- 内容：...\n- 链接：..."）
  s = s.replace(/(\d+)\.\s*<strong>(.+?)<\/strong>\s*\n((?:[-–]\s*.+\n?)+)/g, (_, num, title, body) => {
    const lines = body.trim().split('\n').map(l => l.replace(/^[-–]\s*/, '').trim()).filter(Boolean);
    const desc = lines.map(l => {
      // 如果有链接，提取
      if (l.includes('<a ')) return l;
      return `<div>${l}</div>`;
    }).join('');
    const icon = title.includes('指南') ? '📘' : title.includes('安全') ? '🔒' : title.includes('设置') ? '⚙️' : title.includes('导出') ? '📥' : title.includes('商品') ? '📦' : title.includes('知识') ? '📚' : title.includes('营销') ? '📣' : '📄';
    return `<div class="ai-card"><div class="card-icon">${icon}</div><div class="card-body"><div class="card-title">${num}. ${title}</div><div class="card-desc">${desc}</div></div></div>`;
  });

  // Markdown 表格渲染
  s = s.replace(/((?:^[ \t]*\|.+\|[ \t]*\n?){2,})/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableBlock;
    // 检测分隔行 |---|---|
    const sepIdx = rows.findIndex(r => /^\s*\|[\s\-:]+\|/.test(r) && r.replace(/[\s|:\-]/g, '') === '');
    const headerRow = sepIdx > 0 ? rows[sepIdx - 1] : rows[0];
    const dataRows = sepIdx >= 0 ? rows.filter((_, i) => i !== sepIdx && i !== sepIdx - 1) : rows.slice(1);
    const parseCells = r => r.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    const thCells = parseCells(headerRow);
    let html = '<table style="width:100%;font-size:12px;margin:8px 0;border-collapse:collapse">';
    if (sepIdx >= 0) {
      html += '<tr>' + thCells.map(c => `<th style="padding:6px 8px;border-bottom:2px solid var(--border);text-align:left;font-weight:600;white-space:nowrap">${c}</th>`).join('') + '</tr>';
    } else {
      // 无分隔行，第一行也当数据
      dataRows.unshift(headerRow);
    }
    dataRows.forEach(r => {
      const cells = parseCells(r);
      html += '<tr>' + cells.map(c => `<td style="padding:5px 8px;border-bottom:1px solid var(--border-light)">${c}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    return html;
  });

  // 追问/建议按钮：以 - 开头、以 ？/? 结尾的 bullet 变成可点击按钮
  s = s.replace(/^[-•]\s+(.+[？?])\s*$/gm, (_, q) => {
    // 去掉前导 emoji / 加粗标签，保留纯文本用于发送
    const plain = q.replace(/<strong>|<\/strong>/g,'').replace(/^\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}📥📊🔍📦📚📣📘🔒⚙️📄]+\s*/u,'').trim();
    const escQ = plain.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<button class="ai-suggest-btn" onclick="aiQuick('${escQ}')">${q}</button>`;
  });

  // 普通列表 - xxx
  s = s.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');

  // emoji 标题行（✅ / 📦 / 🔍 等开头的行）变成小标题
  s = s.replace(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅❌⚠️🔍📦📚📣📊🧠💡🔧📥📘🔒⚙️]+)\s*<strong>(.+?)<\/strong>/gmu, '<h3>$1 $2</h3>');

  // 换行
  s = s.replace(/\n/g, '<br>');
  // 清理多余br
  s = s.replace(/(<\/h3>)<br>/g, '$1');
  s = s.replace(/(<\/ul>)<br>/g, '$1');
  s = s.replace(/(<hr>)<br>/g, '$1');
  s = s.replace(/(<\/table>)<br>/g, '$1');
  s = s.replace(/(<\/div><\/div><\/div>)<br>/g, '$1');
  s = s.replace(/<br><br><br>/g, '<br>');

  return s + toolTag;
}

// AI input: Enter to send, Shift+Enter for new line
document.getElementById('ai-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    aiSend();
  }
});
