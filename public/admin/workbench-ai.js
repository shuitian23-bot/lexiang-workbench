// ===== AI PANEL =====
const AI_PANEL_DEFAULT_WIDTH = 380;
const AI_PANEL_COLLAPSED_NAV_EXTRA_WIDTH = 112;
let aiPanelAutoCollapsedSidebar = false;

function aiPanelMaxWidth() {
  return Math.max(
    AI_PANEL_DEFAULT_WIDTH,
    Math.min(AI_PANEL_DEFAULT_WIDTH + AI_PANEL_COLLAPSED_NAV_EXTRA_WIDTH, window.innerWidth - 320)
  );
}

function aiSetPanelWidth(width) {
  const panel = document.getElementById('ai-panel');
  if (!panel) return AI_PANEL_DEFAULT_WIDTH;
  const maxW = aiPanelMaxWidth();
  const nextW = Math.min(Math.max(width, AI_PANEL_DEFAULT_WIDTH), maxW);
  panel.style.width = `${nextW}px`;
  panel.style.setProperty('--ai-panel-width', `${nextW}px`);
  document.body.style.setProperty('--active-ai-panel-width', `${nextW}px`);

  const sidebar = document.getElementById('sidebar');
  const atMax = nextW >= maxW - 1;
  if (sidebar && atMax && !sidebar.classList.contains('collapsed')) {
    sidebar.classList.add('collapsed');
    if (typeof updateSidebarCollapseControl === 'function') updateSidebarCollapseControl();
    aiPanelAutoCollapsedSidebar = true;
  } else if (sidebar && !atMax && aiPanelAutoCollapsedSidebar) {
    sidebar.classList.remove('collapsed');
    if (typeof updateSidebarCollapseControl === 'function') updateSidebarCollapseControl();
    aiPanelAutoCollapsedSidebar = false;
  }
  document.body.classList.toggle('ai-squeeze', atMax);
  return nextW;
}

function toggleAI(forceState) {
  if (typeof forceState === 'boolean') {
    STATE.aiOpen = forceState;
  } else {
    STATE.aiOpen = !STATE.aiOpen;
  }
  const panel = document.getElementById('ai-panel');
  panel.classList.toggle('open', STATE.aiOpen);
  document.body.classList.toggle('ai-open', STATE.aiOpen);
  if (STATE.aiOpen) {
    document.body.style.setProperty('--active-ai-panel-width', `${panel.offsetWidth || AI_PANEL_DEFAULT_WIDTH}px`);
  }
  // 关闭时清掉拖拽留下的 inline width + 挤压状态，避免关不掉
  if (!STATE.aiOpen) {
    panel.style.width = '';
    panel.style.removeProperty('--ai-panel-width');
    document.body.style.removeProperty('--active-ai-panel-width');
    document.body.classList.remove('ai-squeeze');
    const sb = document.getElementById('sidebar');
    if (sb && aiPanelAutoCollapsedSidebar) {
      sb.classList.remove('collapsed');
      if (typeof updateSidebarCollapseControl === 'function') updateSidebarCollapseControl();
    }
    aiPanelAutoCollapsedSidebar = false;
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
    aiSetPanelWidth(startW + diff);
  }
  function onUp() {
    panel.classList.remove('resizing');
    handle.classList.remove('active');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('resize', () => {
    if (!STATE.aiOpen || !panel.style.width) return;
    aiSetPanelWidth(panel.offsetWidth);
  });
})();

const AI_CONVERSATION_STORAGE_KEY = 'leai_ai_conversations';

function aiCurrentPageAttentionLabel(pageId = STATE.currentPage) {
  const group = typeof findPageGroup === 'function' ? findPageGroup(pageId) : null;
  const pageLabel = typeof getPageLabel === 'function' ? getPageLabel(pageId) : '';
  if (group?.label && pageLabel && group.label !== pageLabel) return `${group.label} / ${pageLabel}`;
  return pageLabel || group?.label || '门户工作台';
}

function updateAiAttentionLabel(pageId = STATE.currentPage) {
  const el = document.querySelector('.ai-title-subtitle');
  if (!el) return;
  const label = aiCurrentPageAttentionLabel(pageId);
  el.title = `正在关注:${label}`;
  el.innerHTML = `<span class="ai-attention-dot"></span>正在关注:${escapeHtml(label)}`;
}

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
    container.innerHTML = aiEmptyWelcomeMessageHtml();
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
  container.innerHTML = aiEmptyWelcomeMessageHtml();
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
  const askedReport = /(报表|报告|日报|周报|月报|复盘|总结|解读|分析|洞察|原因|方案|数据)/.test(source);
  const looksStructured = /(^|\n)#{1,3}\s*|一、|二、|三、|四、|五、|\|.+\|/.test(assistantText || '');
  return askedReport && looksStructured && (assistantText || '').trim().length > 180;
}

function aiReportTitle(userText, assistantText) {
  const userTopic = (userText || '')
    .replace(/\n+/g, ' ')
    .replace(/^📎\s*\S+\s*/, '')
    .replace(/^(帮我|请|基于当前页面|基于刚才的问题|继续)?(生成|写一份|输出|查看|分析|解读|总结)?/g, '')
    .replace(/[。！？!?.，,]\s*$/g, '')
    .trim();
  if (userTopic && userTopic.length <= 28 && !/^(报表|报告|日报|周报|月报|复盘|总结)$/.test(userTopic)) return userTopic;
  const firstHeading = (assistantText || '').match(/^#{1,3}\s*(.+)$/m);
  if (firstHeading) return firstHeading[1].trim().replace(/^AI\s*报告\s*[·:：-]\s*/, '').slice(0, 40);
  if (/日报/.test(userText || '')) return '运营日报';
  if (/周报/.test(userText || '')) return '运营周报';
  if (/月报/.test(userText || '')) return '运营月报';
  if (/解读|分析|洞察|原因/.test(userText || '')) return `${getPageLabel(STATE.currentPage) || '页面'}解读报告`;
  return 'AI 生成报表';
}

function aiPlainText(text) {
  return String(text || '').replace(/[#>*`|]/g, '').replace(/\s+/g, ' ').trim();
}

function aiReportSummary(assistantText) {
  const lines = String(assistantText || '').split('\n').map(line => line.trim()).filter(Boolean);
  const bullet = lines.find(line => /^[-•]\s+/.test(line));
  const conclusion = lines.find(line => /(结论|核心|整体|建议|风险)/.test(line) && line.length > 8);
  const fallback = lines.find(line => line.length > 16);
  return aiPlainText((bullet || conclusion || fallback || '已生成一份结构化 AI 报告，可展开到中间内容槽查看完整内容。').replace(/^[-•]\s+/, '')).slice(0, 96);
}

function aiReportChips(userText, assistantText) {
  const source = `${userText || ''}\n${assistantText || ''}`;
  const chips = [];
  const add = label => { if (!chips.includes(label)) chips.push(label); };
  if (/GMV|订单|交易|购买/.test(source)) add('GMV');
  if (/流量|DAU|WAU|MAU|入口/.test(source)) add('流量');
  if (/认证|员工|个税|企业邮箱|劳动合同/.test(source)) add('认证');
  if (/转化|漏斗|下单/.test(source)) add('转化');
  if (/Query|搜索|知识库/.test(source)) add('Query');
  if (/风险|异常|预警|DPL|限购/.test(source)) add('风险');
  add(getPageLabel(STATE.currentPage) || '当前页面');
  return chips.slice(0, 4);
}

function aiAttachReportArtifact(bubbleEl, userText, assistantText) {
  if (!bubbleEl || !aiShouldCreateReportArtifact(userText, assistantText)) return;
  if (bubbleEl.querySelector('.ai-result-card')) return;
  const id = `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sourceGroup = typeof findPageGroup === 'function' ? findPageGroup(STATE.currentPage) : null;
  AI_REPORT_ARTIFACTS[id] = {
    id,
    title: aiReportTitle(userText, assistantText),
    content: assistantText,
    source: userText || '',
    summary: aiReportSummary(assistantText),
    chips: aiReportChips(userText, assistantText),
    sourcePage: STATE.currentPage,
    sourcePageLabel: getPageLabel(STATE.currentPage),
    groupLabel: sourceGroup?.label || 'AI 报告',
    createdAt: new Date().toISOString()
  };
  const card = document.createElement('div');
  card.className = 'ai-result-card';
  card.innerHTML = aiReportCardHtml(id);
  bubbleEl.appendChild(card);
}

function aiReportCardHtml(id) {
  const report = AI_REPORT_ARTIFACTS[id];
  if (!report) return '';
  const displayTitle = `${report.sourcePageLabel || getPageLabel(STATE.currentPage) || '当前页面'} · ${report.title || '数据解读报告'}`;
  const chips = (report.chips || []).slice(0, 3).map(chip => `<span>${escapeHtml(chip).replace(/<br>/g, '')}</span>`).join('');
  return `
    <div class="ai-result-card-head">
      <span class="ai-result-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h5l3 3v11H6z"/><path d="M11 3v3h3M8 10h4M8 13h5"/></svg>
      </span>
      <div>
        <b>${escapeHtml(displayTitle).replace(/<br>/g, '')}</b>
        <em>可展开为临时页签，多开对比</em>
      </div>
    </div>
    <p>${escapeHtml(report.summary).replace(/<br>/g, '')}</p>
    <div class="ai-result-card-foot">
      <span class="ai-result-tags">${chips}</span>
      <button type="button" class="secondary" onclick="aiSaveReportArtifact('${id}', this)">保存</button>
      <button type="button" onclick="aiOpenReportArtifact('${id}')">展开报告</button>
    </div>`;
}

function aiTaskActionItems(userText, assistantText) {
  const source = `${userText || ''}\n${assistantText || ''}`.toLowerCase();
  const items = [];
  const add = item => {
    if (!items.some(existing => existing.label === item.label)) items.push(item);
  };

  if (/query|查询分析|热词|标注|非官网|渠道|转化/.test(source)) {
    add({ label: '展开 Query 报告', kind: 'report', value: 'pipeline.annotate' });
  }
  if (/gmv|订单|销售|交易|转化/.test(source)) {
    add({ label: '展开 GMV 报告', kind: 'report', value: 'ops.gmv' });
  }
  if (/流量|dau|mau|入口|访问|互动/.test(source)) {
    add({ label: '展开流量报告', kind: 'report', value: 'ops.traffic' });
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
  if (item.kind === 'report') {
    aiOpenActionReport(item.value);
    return;
  }
  if (item.kind === 'skill') {
    aiOpenSkillManagement();
    return;
  }
  aiQuick(item.value);
}

function aiSaveReportArtifact(id, trigger) {
  const report = AI_REPORT_ARTIFACTS[id];
  if (!report) return;
  const saved = JSON.parse(localStorage.getItem(AI_REPORT_STORAGE_KEY) || '[]');
  const next = [report, ...saved.filter(item => item.id !== id)].slice(0, 20);
  localStorage.setItem(AI_REPORT_STORAGE_KEY, JSON.stringify(next));
  if (trigger) {
    trigger.textContent = '已保存';
    trigger.disabled = true;
  }
  if (typeof workspaceSaveTempTab === 'function' && STATE.tempTabs?.some(item => item.id === id)) workspaceSaveTempTab(id);
}

function aiOpenReportArtifact(id) {
  const report = AI_REPORT_ARTIFACTS[id];
  if (!report || typeof workspaceOpenTempTab !== 'function') return;
  workspaceOpenTempTab(report);
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

function aiOpenMarkdownLink(event, linkEl) {
  if (typeof workspaceOpenExternalLink === 'function') {
    return workspaceOpenExternalLink(event, linkEl);
  }
  event?.preventDefault();
  return false;
}

function aiCurrentWelcomeHtml() {
  return '你好！我是乐享 AI 助手。';
}

function aiAssistantTodayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function aiEmptyStateHtml() {
  return `
    <div class="ai-empty-state ai-doc-flow">
      <div class="ai-doc-message">
        <p>你好！我是乐享 AI 助手。</p>
        <p>你可以在底部输入框里直接描述要完成的运营任务，例如查数据、生成报告、配置商品或查询知识库。涉及写入或发布时，我会先展示影响范围并等待确认。</p>
      </div>
      <div class="ai-doc-prompt-group" aria-label="推荐提问">
        <button type="button" class="ai-doc-prompt" onclick="aiQuick('帮我说明门户工作台当前可以怎么使用')">
          <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10v12H5z"/><path d="M8 8h4M8 11h4"/></svg></span>
          <b>工作台说明</b>
        </button>
        <button type="button" class="ai-doc-prompt" onclick="aiQuick('帮我生成一份运营任务报告草稿，先列出需要的参数')">
          <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h5l3 3v11H6z"/><path d="M11 3v3h3M8 10h4M8 13h5"/></svg></span>
          <b>生成报告</b>
        </button>
        <button type="button" class="ai-doc-prompt" onclick="aiQuick('查询知识库，帮我按关键词整理相关条目')">
          <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.2c1.8-.8 3.5-.8 5.2 0v10.5c-1.7-.8-3.4-.8-5.2 0zM10.8 5.2c1.7-.8 3.4-.8 5.2 0v10.5c-1.8-.8-3.5-.8-5.2 0z"/></svg></span>
          <b>查询知识库</b>
        </button>
      </div>
    </div>`;
}

function aiEmptyWelcomeMessageHtml() {
  return `<div class="ai-msg assistant ai-welcome-msg"><div class="bubble">${aiEmptyStateHtml()}</div></div>`;
}

function aiHideEmptyState() {
  document.querySelector('#ai-messages .ai-welcome-msg')?.remove();
}

function aiShortcutItemsForPage(page) {
  if (page === 'portal.home') {
    return [
      { label: '工作台说明', text: '介绍门户工作台的能力边界和基础操作流程' },
      { label: '技能包管理', text: '打开技能包管理' },
      { label: '权限说明', text: '说明菜单权限和技能权限的区别' },
      { label: '新手引导', text: '我第一次使用门户工作台，请给我一个操作路径' }
    ];
  }
  if (page === 'agent.skills') {
    return [
      { label: '技能包', text: '说明当前可用技能包的用途和使用方式' },
      { label: '权限说明', text: '说明使用技能包时需要哪些权限和审批' },
      { label: '申请技能包', text: '我想申请一个技能包，应该怎么做' },
      { label: '调用说明', text: '说明技能包调用前需要确认哪些参数、影响范围和风险' }
    ];
  }
  if (page === 'agent.skillCreate') {
    return [
      { label: '创建流程', text: '说明创建 Skill 从基础配置到提交审核的完整流程' },
      { label: '补全需求', text: '帮我检查当前 Skill 创建表单还缺少哪些关键信息' },
      { label: '评估验证', text: '解释静态评分、结果评分、过程评分和效率评分分别代表什么' },
      { label: '提交审核', text: '提交审核前需要确认哪些权限、边界和测试用例' }
    ];
  }
  if (page === 'agent.permissions') {
    return [
      { label: '权限说明', text: '说明菜单权限、Skill 权限和角色范围管理的区别' },
      { label: '角色边界', text: 'PM、平台管理员和业务用户分别能做什么' },
      { label: '审批规则', text: '高风险 Skill 动作应该如何设置审批和留痕' },
      { label: '后续规划', text: '权限管理后续可以补充哪些配置能力' }
    ];
  }
  if (page?.startsWith('employee.')) {
    return [
      { label: '认证总览', text: '总结当前在职员工认证数据和风险点' },
      { label: '待审核', text: '查看待审核认证，并提示优先处理建议' },
      { label: '失败原因', text: '分析最近认证失败原因 TopN' },
      { label: '认证方式', text: '统计企业邮箱、劳动合同、个人所得税和其他材料认证方式占比' },
      { label: '导出建议', text: '说明认证数据导出需要哪些权限和审批' }
    ];
  }
  if (page?.startsWith('lead.')) {
    return [
      { label: '线索看板', text: '总结企业客户线索看板关键变化' },
      { label: '线索池', text: '分析当前线索池待跟进情况' },
      { label: '分配建议', text: '根据线索状态给出分配和跟进建议' },
      { label: '客户风险', text: '识别企业客户跟进风险' }
    ];
  }
  if (page?.startsWith('search.')) {
    return [
      { label: '分类标签', text: '检查搜索分类标签配置是否完整' },
      { label: '筛选条件', text: '分析当前筛选条件配置风险' },
      { label: '活动直达', text: '检查活动直达配置和命中逻辑' },
      { label: '搜索框', text: '分析搜索框配置和用户体验问题' }
    ];
  }
  if (page?.startsWith('risk.')) {
    return [
      { label: '策略概览', text: '总结当前风控策略和风险点' },
      { label: '限购检查', text: '检查限购规则是否存在配置风险' },
      { label: 'DPL 查询', text: '说明 DPL 查询口径和使用注意事项' },
      { label: '风险数据', text: '分析当前风险数据异常' }
    ];
  }
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
      { label: '增长缺口', text: '如果GMV要提升10%，当前看板显示最大的缺口在哪里？' }
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

let _aiScopeIndex = -1;
let _aiScopeItems = [];
let _aiScopeDrag = null;
let _aiScopeResizeTimer = null;

function _aiScopePlaceholder(label) {
  return label ? `在「${label}」中查询...` : '输入指令或查询...';
}

function _aiUpdateScopePlaceholder() {
  const input = document.getElementById('ai-input');
  const label = (typeof getPageLabel === 'function' ? getPageLabel(STATE.currentPage) : '') || _aiScopeItems[0]?.label || '';
  if (input) input.placeholder = _aiScopePlaceholder(label);
}

function _aiSetScope(index, focusTag = false) {
  if (!_aiScopeItems.length) return;
  const next = Math.max(0, Math.min(index, _aiScopeItems.length - 1));
  _aiScopeIndex = next;
  const shortcuts = document.getElementById('ai-shortcuts');
  const select = document.getElementById('ai-scope-select');
  shortcuts?.querySelectorAll('[data-ai-shortcut]').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-selected');
    btn.tabIndex = 0;
    if (Number(btn.dataset.aiShortcut) === next) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      if (focusTag) btn.focus({ preventScroll: true });
    }
  });
  if (select) select.value = String(next);
  _aiUpdateScopePlaceholder();
  _aiUpdateScopeArrows();
}

function _aiRunShortcut(index) {
  const item = _aiScopeItems[index];
  if (!item?.text) return;
  aiQuick(item.text);
}

function _aiUpdateScopeArrows() {
  const scroller = document.getElementById('ai-shortcuts');
  const left = document.getElementById('ai-scope-left');
  const right = document.getElementById('ai-scope-right');
  if (!scroller || !left || !right) return;
  const overflow = scroller.scrollWidth > scroller.clientWidth + 2;
  const atStart = scroller.scrollLeft <= 1;
  const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
  left.hidden = !overflow;
  right.hidden = !overflow;
  left.disabled = !overflow || atStart;
  right.disabled = !overflow || atEnd;
  left.setAttribute('aria-disabled', left.disabled ? 'true' : 'false');
  right.setAttribute('aria-disabled', right.disabled ? 'true' : 'false');
}

function _aiScrollScope(direction) {
  const scroller = document.getElementById('ai-shortcuts');
  if (!scroller) return;
  scroller.scrollBy({ left: direction * Math.max(120, Math.round(scroller.clientWidth * .72)), behavior: 'smooth' });
  setTimeout(_aiUpdateScopeArrows, 260);
}

function _aiInitScopeTabs() {
  const scroller = document.getElementById('ai-shortcuts');
  const left = document.getElementById('ai-scope-left');
  const right = document.getElementById('ai-scope-right');
  const select = document.getElementById('ai-scope-select');
  if (!scroller || scroller.dataset.scopeReady === '1') {
    _aiUpdateScopePlaceholder();
    _aiUpdateScopeArrows();
    return;
  }
  scroller.dataset.scopeReady = '1';
  scroller.addEventListener('scroll', _aiUpdateScopeArrows, { passive: true });
  scroller.addEventListener('mousedown', e => {
    _aiScopeDrag = { x: e.clientX, left: scroller.scrollLeft, moved: false };
    scroller.classList.add('is-dragging');
  });
  window.addEventListener('mousemove', e => {
    if (!_aiScopeDrag) return;
    const dx = e.clientX - _aiScopeDrag.x;
    if (Math.abs(dx) > 3) _aiScopeDrag.moved = true;
    scroller.scrollLeft = _aiScopeDrag.left - dx;
  });
  window.addEventListener('mouseup', () => {
    if (!_aiScopeDrag) return;
    scroller.classList.remove('is-dragging');
    setTimeout(() => { _aiScopeDrag = null; }, 0);
  });
  left?.addEventListener('click', () => _aiScrollScope(-1));
  right?.addEventListener('click', () => _aiScrollScope(1));
  select?.addEventListener('change', () => _aiRunShortcut(Number(select.value)));
  window.addEventListener('resize', () => {
    clearTimeout(_aiScopeResizeTimer);
    _aiScopeResizeTimer = setTimeout(_aiUpdateScopeArrows, 120);
  });
  _aiUpdateScopePlaceholder();
  _aiUpdateScopeArrows();
}

function aiRefreshPageAssistant() {
  if (typeof updateAiAttentionLabel === 'function') {
    updateAiAttentionLabel(STATE.currentPage);
  }
  const shortcuts = document.getElementById('ai-shortcuts');
  if (shortcuts) {
    const items = aiShortcutItemsForPage(STATE.currentPage);
    _aiScopeItems = items;
    _aiScopeIndex = -1;
    shortcuts.innerHTML = items.map((item, i) => `
      <button type="button" class="ai-shortcut" data-ai-shortcut="${i}">
        ${escapeHtml(item.label).replace(/<br>/g, '')}
      </button>`).join('');
    shortcuts.querySelectorAll('[data-ai-shortcut]').forEach(el => {
      el.addEventListener('click', e => {
        if (_aiScopeDrag?.moved) {
          e.preventDefault();
          return;
        }
        _aiRunShortcut(Number(el.dataset.aiShortcut));
      });
      el.addEventListener('keydown', e => {
        const current = Number(el.dataset.aiShortcut);
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          _aiSetScope(current + 1, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          _aiSetScope(current - 1, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          _aiSetScope(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          _aiSetScope(items.length - 1, true);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _aiRunShortcut(current);
        }
      });
    });
    const select = document.getElementById('ai-scope-select');
    if (select) {
      select.innerHTML = items.map((item, i) => `<option value="${i}">${escapeHtml(item.label).replace(/<br>/g, '')}</option>`).join('');
      select.selectedIndex = -1;
    }
    _aiInitScopeTabs();
    _aiUpdateScopePlaceholder();
    _aiUpdateScopeArrows();
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

function aiSetFollowupChips() {
  const items = [
    { label: '按渠道拆分', text: '按渠道拆分购买转化瓶颈' },
    { label: '对比上周同期', text: '把购买转化和上周同期做对比' },
    { label: '导出为报告', text: '把这次转化分析导出为报告' }
  ];
  _aiScopeItems = items;
  _aiScopeIndex = -1;
  const shortcuts = document.getElementById('ai-shortcuts');
  if (!shortcuts) return;
  shortcuts.innerHTML = items.map((item, i) => `
    <button type="button" class="ai-shortcut" data-ai-shortcut="${i}">
      ${escapeHtml(item.label).replace(/<br>/g, '')}
    </button>`).join('');
  shortcuts.querySelectorAll('[data-ai-shortcut]').forEach(el => {
    el.addEventListener('click', () => _aiRunShortcut(Number(el.dataset.aiShortcut)));
  });
  const select = document.getElementById('ai-scope-select');
  if (select) {
    select.innerHTML = items.map((item, i) => `<option value="${i}">${escapeHtml(item.label).replace(/<br>/g, '')}</option>`).join('');
    select.selectedIndex = -1;
  }
  _aiUpdateScopePlaceholder();
  _aiUpdateScopeArrows();
}

function aiAddHtmlMessage(role, html, extraClass = '') {
  const container = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role} ${extraClass}`.trim();
  div.innerHTML = role === 'assistant' ? `<div class="bubble">${html}</div>` : `<div class="bubble">${html}</div>`;
  container.appendChild(div);
  aiRecordMessage(role, div.textContent || '');
  scrollAiToBottom();
  return div;
}

function aiOverviewStructuredReplyHtml() {
  return `
    <div class="ai-answer-card ai-insight-card">
      <div class="ai-thread-context"><svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 10.5 11 7a2.2 2.2 0 1 1 3.1 3.1l-5 5a3.6 3.6 0 0 1-5.1-5.1l5.5-5.5"/></svg>已引用 · 运营总览 · 最近 1 天</div>
      <div class="ai-bottleneck-panel">
        <div class="ai-bottleneck-main">
          <span>瓶颈环节 · 互动 → 下单</span>
          <div class="ai-bottleneck-metric">
            <strong>0.7%</strong>
            <em><b>下降</b> 较 7 日基线 1.1%</em>
          </div>
        </div>
        <div class="ai-bottleneck-side">
          <span>互动 8.2万</span>
          <span>下单 <b>575人</b></span>
        </div>
      </div>
      <p class="ai-insight-copy">登录到互动 <strong class="is-positive">48.4%</strong> 健康，问题出在互动后的承接。互动量增长 12% 但下单持平，<strong>新增流量未被承接</strong>，今日偏低主要来自<strong>消费业务</strong>。</p>
      <div class="ai-answer-actions">
        <button type="button" class="primary" onclick="aiOpenDemoOverviewReport()"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5h11"/><path d="M4.5 10h8.5"/><path d="M4.5 14.5h6.5"/><path d="M14 12.5 16.5 15 14 17.5"/></svg>展开报告</button>
        <button type="button" onclick="aiQuick('查看互动明细')">查看明细</button>
        <button type="button" onclick="aiQuick('生成针对消费业务的优化建议')">优化建议</button>
      </div>
      <div class="ai-reply-footer">
        <span class="ai-source-chip">转化漏斗</span>
        <span class="ai-source-chip">转化基线</span>
        <span class="spacer"></span>
        <button type="button" title="复制" aria-label="复制"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="9" height="9" rx="2"/><path d="M4 13V5a2 2 0 0 1 2-2h8"/></svg></button>
        <button type="button" title="点赞" aria-label="点赞"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 17H4.2A1.2 1.2 0 0 1 3 15.8V9.5a1.2 1.2 0 0 1 1.2-1.2h2.3M6.5 17h7.2a1.6 1.6 0 0 0 1.6-1.3l1-5.1A1.7 1.7 0 0 0 14.6 8.5h-3.1l.5-3.1A2 2 0 0 0 10 3L6.5 8.5V17z"/></svg></button>
        <button type="button" title="重新生成" aria-label="重新生成"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16 4.5V8h-3.5"/></svg></button>
      </div>
    </div>
    `;
}

function aiOpenDemoOverviewReport() {
  const content = `# 运营总览 · 购买转化原因分析

## 核心结论
- 购买转化 0.7% 的主要瓶颈集中在互动到下单环节。
- 登录到互动转化 48.4% 相对健康，新增流量没有被有效承接到购买。
- 今日 GMV 174.3 万，消费业务贡献 142.4 万，占比 81.7%，是优先排查对象。

## 关键证据
- 登录用户 17.0 万，互动用户 8.2 万，购买人数 575 人。
- 近 7 日购买转化基线约 1.1%，今日低于基线。
- 互动量增长 12%，但下单量基本持平，说明商品、权益或下单路径承接不足。

## 建议动作
- 优先检查消费业务入口商品承接、优惠展示和下单链路异常。
- 将非官网渠道与官网渠道拆开对比，确认是否为渠道质量或落地页差异导致。
- 补充互动明细、商品点击、加购和支付失败数据后再定位根因。`;
  const id = `air_demo_${Date.now()}`;
  const sourceGroup = typeof findPageGroup === 'function' ? findPageGroup(STATE.currentPage) : null;
  AI_REPORT_ARTIFACTS[id] = {
    id,
    title: '购买转化原因分析',
    content,
    source: '购买转化原因分析',
    summary: '互动到下单是当前主要瓶颈，消费业务贡献高但承接不足，需要优先排查商品、权益和下单链路。',
    chips: ['转化', 'GMV', '运营总览'],
    sourcePage: STATE.currentPage,
    sourcePageLabel: getPageLabel(STATE.currentPage),
    groupLabel: sourceGroup?.label || '乐享运营',
    createdAt: new Date().toISOString()
  };
  aiOpenReportArtifact(id);
}

const AI_DATA_MOCK_SCENARIOS = [
  {
    key: 'employee-cert',
    match: /(认证|个税|员工|在职|企业邮箱|劳动合同|审核|职场)/i,
    title: '职工认证数据分析',
    sourcePage: 'employee.overview',
    sourcePageLabel: '在职员工管理',
    groupLabel: '在职员工管理',
    chips: ['认证', '员工', '近7天'],
    primaryLabel: '待审核积压',
    primaryValue: '128',
    primaryDelta: '较昨日增加 18',
    side: ['通过率 86.4%', '个税失败 31'],
    summary: '近 7 天认证通过率稳定，但个税认证失败和待审核积压同步上升，需要优先处理材料缺失与企业名称不匹配。',
    actions: ['优先处理个税认证待审核队列', '补充企业名称不匹配的拦截提示', '导出失败原因明细给客服回访'],
    content: `# 职工认证数据分析

## 核心结论
- 近 7 天认证通过率为 86.4%，整体稳定，但待审核积压达到 128 单，较昨日增加 18 单。
- 个税认证失败 31 单，占失败样本的 42%，主要集中在任职受雇企业名称不匹配和录屏缺少关键页面。
- 企业邮箱认证通过率最高，为 94.8%，劳动合同认证平均处理时长最长，为 19.6 小时。

## 关键证据
- 企业邮箱认证 412 单，通过 391 单，通过率 94.8%。
- 劳动合同认证 226 单，通过 181 单，通过率 80.1%，平均处理时长 19.6 小时。
- 个人所得税认证 168 单，通过 121 单，通过率 72.0%，失败原因以企业名称不匹配和录屏不完整为主。

## 建议动作
- 将个税认证失败原因拆为企业名称不匹配、任职信息缺失、录屏不完整三类，便于客服回访。
- 对待审核超过 24 小时的材料建立优先队列，先处理企业客户批量提交用户。
- 在提交页增加示例图和必录字段提示，减少重复驳回。`
  },
  {
    key: 'order-channel',
    match: /(订单|渠道|gmv|交易|销售|付款|转化|下单|购买)/i,
    title: '订单渠道汇总分析',
    sourcePage: 'ops.gmv',
    sourcePageLabel: 'GMV 分析',
    groupLabel: '乐享运营',
    chips: ['GMV', '订单', '渠道'],
    primaryLabel: 'GMV',
    primaryValue: '174.3万',
    primaryDelta: '环比增加 6.8%',
    side: ['订单 1,286', '转化 0.7%'],
    summary: 'GMV 环比上升但购买转化偏低，官网渠道贡献稳定，非官网渠道带来访问增长但下单承接不足。',
    actions: ['拆分官网与非官网渠道落地页', '检查消费业务商品承接和权益展示', '补充加购与支付失败数据'],
    content: `# 订单渠道汇总分析

## 核心结论
- 今日 GMV 174.3 万，环比增加 6.8%，订单数 1,286 单。
- 官网渠道贡献 62.5% GMV，非官网渠道访问增长 15.2%，但购买转化只有 0.7%。
- 消费业务贡献 142.4 万，占比 81.7%，是本轮增长和风险的共同来源。

## 关键证据
- 官网渠道 GMV 108.9 万，订单 746 单，客单价 1,460 元。
- 非官网渠道 GMV 65.4 万，订单 540 单，访问增长但下单率低于 7 日基线。
- 互动用户 8.2 万，购买人数 575 人，互动到下单环节损耗最大。

## 建议动作
- 将非官网渠道按媒体、活动页、商品页拆开看承接效率。
- 对消费业务重点商品检查价格、优惠、库存和支付失败链路。
- 补充加购率、支付失败率、优惠券领取率，定位低转化原因。`
  },
  {
    key: 'traffic-data',
    match: /(流量|dau|wau|mau|入口|访问|互动|曝光|点击)/i,
    title: '流量访问数据分析',
    sourcePage: 'ops.traffic',
    sourcePageLabel: '流量分析',
    groupLabel: '乐享运营',
    chips: ['流量', '入口', '转化'],
    primaryLabel: '访问用户',
    primaryValue: '17.0万',
    primaryDelta: '较 7 日均值增加 12.4%',
    side: ['互动 8.2万', '购买 575人'],
    summary: '今日访问和互动同步增长，但互动后的购买承接偏弱，新增流量主要来自活动入口和非官网渠道。',
    actions: ['拆分活动入口与自然访问来源', '检查高访问低互动页面的承接内容', '联动 GMV 报告定位下单损耗'],
    content: `# 流量访问数据分析

## 核心结论
- 今日访问用户 17.0 万，较 7 日均值增加 12.4%，流量规模明显上升。
- 互动用户 8.2 万，登录到互动转化 48.4%，入口吸引力相对稳定。
- 购买人数 575 人，互动到购买转化偏低，说明新增流量没有被后续商品和权益充分承接。

## 关键证据
- 活动入口访问 5.6 万，占总访问 32.9%，是今日增长主来源。
- 非官网渠道访问增长 15.2%，但购买转化只有 0.7%，低于官网渠道。
- 商品详情页停留时长下降 9.8%，优惠曝光点击率低于近 7 日均值。

## 建议动作
- 将活动入口、官网入口、非官网入口拆开观察互动率和购买率。
- 对高访问低互动页面补充商品、权益和活动规则说明。
- 联动 GMV 与订单渠道报告，优先排查非官网渠道的落地页和下单链路。`
  },
  {
    key: 'risk-data',
    match: /(风控|风险|异常|限购|dpl|黑名单|拦截|预警)/i,
    title: '风控异常数据分析',
    sourcePage: 'risk.data',
    sourcePageLabel: '风控数据查询',
    groupLabel: '风控管理',
    chips: ['风控', '异常', '近24小时'],
    primaryLabel: '异常订单',
    primaryValue: '46',
    primaryDelta: '较昨日增加 12',
    side: ['拦截 31', '待复核 15'],
    summary: '近 24 小时异常订单小幅上升，集中在同设备多账号和高频下单，建议先复核限购策略和企业客户白名单。',
    actions: ['复核同设备多账号规则阈值', '确认企业客户白名单是否误伤', '导出待复核订单给风控同学'],
    content: `# 风控异常数据分析

## 核心结论
- 近 24 小时异常订单 46 单，较昨日增加 12 单。
- 已自动拦截 31 单，仍有 15 单待人工复核。
- 异常主要集中在同设备多账号、高频下单和疑似 DPL 命中三类。

## 关键证据
- 同设备多账号 18 单，占异常订单 39.1%。
- 高频下单 14 单，主要集中在 10:00-12:00 的活动流量峰值。
- 疑似 DPL 命中 9 单，其中 3 单来自企业客户白名单边界，需要人工确认。

## 建议动作
- 将同设备多账号阈值按活动期和非活动期分开配置。
- 对企业客户白名单增加订单来源与企业认证状态校验。
- 待复核订单先按金额和命中规则数量排序处理。`
  },
  {
    key: 'query-quality',
    match: /(query|查询|搜索|热词|知识库|无答案|质量|满意度|问答)/i,
    title: 'Query 质量数据分析',
    sourcePage: 'pipeline.annotate',
    sourcePageLabel: 'Query 分析',
    groupLabel: '乐享运营',
    chips: ['Query', '质量', '知识库'],
    primaryLabel: '无答案率',
    primaryValue: '8.6%',
    primaryDelta: '较 7 日均值增加 1.9pct',
    side: ['总 Query 12,840', '差评 92'],
    summary: 'Query 总量稳定，但无答案率和差评样本上升，问题集中在活动政策、驱动下载和企业采购报价三个知识缺口。',
    actions: ['补充活动政策和驱动下载知识', '复核企业采购报价类兜底话术', '把差评 Query 加入标注队列'],
    content: `# Query 质量数据分析

## 核心结论
- 近 7 天总 Query 12,840 条，无答案率 8.6%，较 7 日均值增加 1.9 个百分点。
- 差评样本 92 条，主要集中在活动政策、驱动下载和企业采购报价。
- 知识库命中率下降到 76.2%，说明近期业务活动内容和服务类知识更新不足。

## 关键证据
- 活动政策相关 Query 2,410 条，无答案率 12.4%。
- 驱动下载相关 Query 1,186 条，差评 27 条，用户常问机型兼容和安装步骤。
- 企业采购报价相关 Query 864 条，转人工率 18.1%，高于平均 9.7%。

## 建议动作
- 优先补充活动政策 FAQ、驱动下载步骤和企业采购报价边界说明。
- 将差评 Query 加入标注队列，拆分为知识缺失、意图识别错误、回答不完整三类。
- 对企业采购报价场景增加转人工前的信息收集表单。`
  }
];

function aiDataMockScenarioForText(text) {
  const source = String(text || '').trim();
  if (!source) return null;
  if (!/^(演示|示例|mock|demo|模拟)\s*/i.test(source)) return null;
  if (/^(打开|进入|跳转|切换|导出|下载|删除|保存|提交|发布)/.test(source)) return null;
  if (!/(查|查询|看|统计|汇总|分析|趋势|数据|报表|报告|原因)/i.test(source)) return null;
  return AI_DATA_MOCK_SCENARIOS.find(item => item.match.test(source)) || null;
}

function aiDataMockScenarioForPage(pageId) {
  return AI_DATA_MOCK_SCENARIOS.find(item => item.sourcePage === pageId) || null;
}

function aiCreateMockReportArtifact(scenario) {
  const id = `air_mock_${scenario.key}_${Date.now()}`;
  AI_REPORT_ARTIFACTS[id] = {
    id,
    title: scenario.title,
    content: scenario.content,
    source: scenario.title,
    summary: scenario.summary,
    chips: scenario.chips,
    sourcePage: scenario.sourcePage || STATE.currentPage,
    sourcePageLabel: scenario.sourcePageLabel || getPageLabel(STATE.currentPage),
    groupLabel: scenario.groupLabel || 'AI 报告',
    createdAt: new Date().toISOString()
  };
  return id;
}

function aiOpenActionReport(pageId) {
  const scenario = aiDataMockScenarioForPage(pageId);
  if (scenario) {
    const reportId = aiCreateMockReportArtifact(scenario);
    aiOpenReportArtifact(reportId);
    return;
  }
  const sourceGroup = typeof findPageGroup === 'function' ? findPageGroup(pageId) : null;
  const pageLabel = getPageLabel(pageId) || '数据分析';
  const id = `air_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  AI_REPORT_ARTIFACTS[id] = {
    id,
    title: `${pageLabel}报告`,
    content: `# ${pageLabel}报告

## 核心结论
- 已将该继续执行动作收敛为报告展开，不再跳转或打开新页面。
- 当前可在中间工作区以临时页签方式阅读、保存和下载。

## 建议动作
- 补充该页面的指标口径、筛选条件和异常样本。
- 需要接真实数据时，将这里的 mock 内容替换为接口返回的结构化报告。`,
    source: pageLabel,
    summary: `已按“展开报告”的方式打开 ${pageLabel}，不会再跳转到新页面。`,
    chips: ['继续执行', '报告', pageLabel],
    sourcePage: pageId || STATE.currentPage,
    sourcePageLabel: pageLabel,
    groupLabel: sourceGroup?.label || 'AI 报告',
    createdAt: new Date().toISOString()
  };
  aiOpenReportArtifact(id);
}

function aiMockDataScenarioHtml(scenario, reportId) {
  const side = (scenario.side || []).map(item => `<span>${escapeHtml(item).replace(/<br>/g, '')}</span>`).join('');
  const actions = (scenario.actions || []).slice(0, 3).map(item => `<li>${escapeHtml(item).replace(/<br>/g, '')}</li>`).join('');
  return `
    <div class="ai-answer-card ai-insight-card">
      <div class="ai-thread-context"><svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 10.5 11 7a2.2 2.2 0 1 1 3.1 3.1l-5 5a3.6 3.6 0 0 1-5.1-5.1l5.5-5.5"/></svg>已引用 · 示例数据 · ${escapeHtml(scenario.sourcePageLabel).replace(/<br>/g, '')}</div>
      <div class="ai-bottleneck-panel">
        <div class="ai-bottleneck-main">
          <span>${escapeHtml(scenario.primaryLabel).replace(/<br>/g, '')}</span>
          <div class="ai-bottleneck-metric">
            <strong>${escapeHtml(scenario.primaryValue).replace(/<br>/g, '')}</strong>
            <em>${escapeHtml(scenario.primaryDelta).replace(/<br>/g, '')}</em>
          </div>
        </div>
        <div class="ai-bottleneck-side">${side}</div>
      </div>
      <p class="ai-insight-copy">${escapeHtml(scenario.summary).replace(/<br>/g, '')}</p>
      <ul class="ai-mock-action-list">${actions}</ul>
      <div class="ai-answer-actions">
        <button type="button" class="primary" onclick="aiOpenReportArtifact('${reportId}')"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5h11"/><path d="M4.5 10h8.5"/><path d="M4.5 14.5h6.5"/><path d="M14 12.5 16.5 15 14 17.5"/></svg>展开报告</button>
        <button type="button" onclick="aiQuick('基于刚才的数据继续拆分原因')">拆分原因</button>
        <button type="button" onclick="aiQuick('把刚才的数据输出为行动清单')">行动清单</button>
      </div>
    </div>
    <div class="ai-result-card">${aiReportCardHtml(reportId)}</div>`;
}

function aiTryDataMockScenario(text) {
  const scenario = aiDataMockScenarioForText(text);
  if (!scenario) return false;
  const reportId = aiCreateMockReportArtifact(scenario);
  aiAddHtmlMessage('assistant', aiMockDataScenarioHtml(scenario, reportId), 'ai-structured-msg');
  return true;
}

function aiAddDemoTyping() {
  const typing = document.createElement('div');
  typing.className = 'ai-msg assistant ai-typing-row ai-demo-typing';
  typing.innerHTML = '<div class="bubble ai-typing-bubble" role="status" aria-live="polite"><span class="ai-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  document.getElementById('ai-messages').appendChild(typing);
  scrollAiToBottom();
  return typing;
}

function aiTryOverviewDemo(text) {
  if (!['dashboard.overview', 'ops.gmv', 'ops.traffic'].includes(STATE.currentPage)) return false;
  if (!/^(演示|示例|mock|demo|模拟)\s*/i.test(String(text || '').trim())) return false;
  if (/(承接方案|消费业务.*方案|写一份|优化建议)/.test(text)) {
    aiSetFollowupChips();
    aiAddDemoTyping();
    return true;
  }
  if (/(购买转化|0\.7|定位.*原因|互动明细|转化.*原因|瓶颈)/.test(text)) {
    aiAddHtmlMessage('assistant', aiOverviewStructuredReplyHtml(), 'ai-structured-msg');
    aiSetFollowupChips();
    return true;
  }
  return false;
}

function aiPageGoal() {
  return '';
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
  { keywords: ['门户工作台','工作台首页','门户首页'], page: 'portal.home' },
  { keywords: ['skill hub','skill管理','技能包管理','skills管理','技能管理'], page: 'agent.skills' },
  { keywords: ['创建skill','skill创建','新建skill','创建技能'], page: 'agent.skillCreate' },
  { keywords: ['权限管理','权限说明','菜单权限','skill权限'], page: 'agent.permissions' },
  { keywords: ['运营总览','数据总览','dashboard','首页','大盘','概览'], page: 'dashboard.overview' },
  { keywords: ['geo','seo','搜索引擎','站外'], page: 'dashboard.geo' },
  { keywords: ['在职员工','员工管理','认证审核','员工认证'], page: 'employee.overview' },
  { keywords: ['线索看板','企业客户','线索池','客户管理'], page: 'lead.dashboard' },
  { keywords: ['搜索后台','分类标签','筛选条件','词典管理'], page: 'search.categories' },
  { keywords: ['风控管理','风控','策略','限购','dpl'], page: 'risk.overview' },
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
let _aiSending = false;

function _aiAutoResizeInput() {
  const input = document.getElementById('ai-input');
  if (!input) return;
  if (!input.value) {
    input.style.height = '36px';
    input.style.overflowY = 'hidden';
    return;
  }
  const maxHeight = 76;
  const styles = getComputedStyle(input);
  const lineHeight = parseFloat(styles.lineHeight) || 19;
  const verticalPadding = 16;
  const lineCount = input.value.split('\n').length;
  const nextHeight = Math.min(maxHeight, Math.max(36, Math.ceil(verticalPadding + lineHeight * lineCount)));
  input.style.height = nextHeight + 'px';
  input.style.overflowY = nextHeight >= maxHeight ? 'auto' : 'hidden';
  input.classList.toggle('is-scrollable', nextHeight >= maxHeight);
}

function _aiCanSend() {
  const input = document.getElementById('ai-input');
  return !!((input && input.value.trim()) || _aiPendingFile);
}

function _aiSetComposerSending(sending) {
  _aiSending = !!sending;
  _aiUpdateComposerState();
}

function _aiUpdateComposerState() {
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  const fileBtn = document.querySelector('.ai-composer-action');
  const area = document.getElementById('ai-input-area');
  const canSend = _aiCanSend();

  if (sendBtn) {
    sendBtn.disabled = _aiSending || !canSend;
    sendBtn.setAttribute('aria-disabled', sendBtn.disabled ? 'true' : 'false');
    sendBtn.title = _aiSending ? 'AI 正在回复' : canSend ? '发送' : '请输入内容后发送';
  }
  if (fileBtn) {
    fileBtn.disabled = _aiSending;
    fileBtn.setAttribute('aria-disabled', _aiSending ? 'true' : 'false');
    fileBtn.title = _aiSending ? 'AI 回复中，暂不可上传' : '上传文件';
  }
  if (area) {
    area.classList.toggle('has-file', !!_aiPendingFile);
    area.classList.toggle('is-sending', _aiSending);
  }
  if (input) {
    input.setAttribute('aria-label', 'AI 助手输入框，Enter 发送，Shift 加 Enter 换行');
  }
}

function _aiCreateTyping(message = 'AI 正在思考') {
  const typing = document.createElement('div');
  typing.className = 'ai-msg assistant ai-typing-row';
  typing.innerHTML = `
    <div class="bubble ai-typing-bubble" role="status" aria-live="polite">
      <span class="ai-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="ai-typing-label">${escapeHtml(message)}</span>
    </div>`;
  document.getElementById('ai-messages').appendChild(typing);
  scrollAiToBottom();
  return typing;
}

function _aiSetTypingText(typingEl, text) {
  if (!typingEl) return;
  const label = typingEl.querySelector('.ai-typing-label');
  if (label) label.textContent = text;
}

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
  _aiUpdateComposerState();
}

function aiClearFile() {
  _aiPendingFile = null;
  const preview = document.getElementById('ai-file-preview');
  preview.style.display = 'none';
  _aiUpdateComposerState();
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
  if (_aiSending) return;
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text && !_aiPendingFile) {
    _aiUpdateComposerState();
    return;
  }
  aiHideEmptyState();

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
  _aiAutoResizeInput();
  aiClearFile();
  _aiSetComposerSending(true);

  if (aiTryDataMockScenario(text)) {
    _aiSetComposerSending(false);
    return;
  }

  // 先尝试本地命令（热重载、标注等）
  const localResult = aiTryLocalCommand(text);
  if (localResult) {
    addAiMessage('assistant', localResult);
    _aiSetComposerSending(false);
    return;
  }

  // 再尝试本地导航指令
  const navResult = aiTryNavigate(text);
  if (navResult) {
    addAiMessage('assistant', navResult);
    _aiSetComposerSending(false);
    return;
  }

  if (aiTryOverviewDemo(text)) {
    _aiSetComposerSending(false);
    return;
  }

  // Show typing
  const typing = _aiCreateTyping('AI 正在思考');

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
          if (typingEl && !streamMsgEl) _aiSetTypingText(typingEl, '正在执行 ' + toolsUsed.join(', '));
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
  } finally {
    _aiSetComposerSending(false);
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
    aiAttachReportArtifact(div.querySelector('.bubble'), '', text);
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
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = String(url || '').replace(/"/g, '&quot;');
    return `<a href="${safeUrl}" onclick="return aiOpenMarkdownLink(event,this)">${label}</a>`;
  });

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

// AI input: Enter sends, Shift+Enter keeps a new line.
function _aiInitComposer() {
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  if (!input) return;

  input.addEventListener('input', () => {
    _aiAutoResizeInput();
    _aiUpdateComposerState();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!_aiSending && _aiCanSend()) aiSend();
      return;
    }
    if (e.key === 'Enter' && e.shiftKey) {
      setTimeout(() => {
        _aiAutoResizeInput();
        _aiUpdateComposerState();
      }, 0);
    }
  });

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.setAttribute('aria-disabled', 'true');
  }
  if (!_aiScopeItems.length) _aiScopeItems = aiShortcutItemsForPage(STATE.currentPage);
  _aiInitScopeTabs();
  _aiUpdateScopePlaceholder();
  _aiUpdateScopeArrows();
  _aiAutoResizeInput();
  _aiUpdateComposerState();
}

_aiInitComposer();
