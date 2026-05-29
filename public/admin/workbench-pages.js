// ===== PAGE RENDERERS =====
function renderPage(pageId) {
  const content = document.getElementById('page-content');
  const renderer = PAGE_RENDERERS[pageId];
  if (renderer) {
    content.innerHTML = renderer();
  } else {
    content.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">${getPageLabel(pageId)}</div>
        <div class="page-desc">功能开发中，敬请期待</div></div>
      </div>
      <div class="empty-state">
        <div class="icon">🚧</div>
        <div class="title">${getPageLabel(pageId)}</div>
        <div>该模块正在建设中，可通过右侧 AI 助手使用自然语言操作</div>
      </div>`;
  }
}

function updateSkillCardEmptyState() {
  const activeSection = document.querySelector('.skill-manager-section.active') || document;
  const cards = Array.from(activeSection.querySelectorAll('.agent-skill-card, .atomic-capability-card'));
  const empty = document.getElementById('skill-page-empty');
  if (!empty) return;
  empty.style.display = cards.some(card => card.style.display !== 'none') ? 'none' : '';
}

function filterSkillCards(status, btn) {
  document.querySelectorAll('.skill-page-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.skill-summary-card').forEach(card => card.classList.remove('active'));
  btn?.classList.add('active');
  clearSkillPackageAction();
  document.querySelectorAll('.agent-skill-card').forEach(card => {
    card.dataset.filterVisible = status === 'all' || card.dataset.skillStatus === status ? '1' : '0';
  });
  searchSkillCards(document.querySelector('.skill-page-search')?.value || '');
}

function filterSkillSummary(kind, value, el) {
  document.querySelectorAll('.skill-summary-card').forEach(card => card.classList.remove('active'));
  el?.classList.add('active');
  const input = document.querySelector('.skill-page-search');
  if (input) input.value = '';
  if (kind === 'package') {
    document.querySelectorAll('.skill-page-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.skillFilter === value);
    });
    clearSkillPackageAction();
    document.querySelectorAll('.agent-skill-card').forEach(card => {
      const filters = value.split(',');
      card.dataset.filterVisible = value === 'all' || filters.includes(card.dataset.skillStatus) ? '1' : '0';
    });
  } else {
    document.querySelectorAll('.atomic-capability-card').forEach(card => {
      const risks = value.split(',');
      card.dataset.filterVisible = value === 'all' || risks.includes(card.dataset.atomicRisk) ? '1' : '0';
    });
  }
  searchSkillCards('');
}

function searchSkillCards(keyword) {
  const q = (keyword || '').trim().toLowerCase();
  const activeSection = document.querySelector('.skill-manager-section.active') || document;
  activeSection.querySelectorAll('.agent-skill-card, .atomic-capability-card').forEach(card => {
    const filterVisible = card.dataset.filterVisible !== '0';
    const textVisible = !q || card.textContent.toLowerCase().includes(q);
    card.style.display = filterVisible && textVisible ? '' : 'none';
  });
  updateSkillCardEmptyState();
}

function switchSkillManagerView(view, btn) {
  document.querySelectorAll('.skill-layer-tab').forEach(tab => tab.classList.remove('active'));
  btn?.classList.add('active');
  document.querySelectorAll('.skill-manager-section').forEach(section => {
    section.classList.toggle('active', section.dataset.skillView === view);
  });
  document.querySelectorAll('.skill-summary-group').forEach(group => {
    group.classList.toggle('active', group.dataset.summaryView === view);
  });
  document.querySelectorAll('.skill-summary-card').forEach(card => card.classList.remove('active'));
  document.querySelectorAll('.skill-package-only-action').forEach(action => {
    action.style.display = view === 'atomic' ? 'none' : '';
  });
  if (view === 'atomic') clearSkillPackageAction();
  const statusTabs = document.querySelector('.skill-page-tabs');
  if (statusTabs) statusTabs.style.display = view === 'atomic' ? 'none' : '';
  const empty = document.getElementById('skill-page-empty');
  if (empty) empty.textContent = view === 'atomic' ? '当前筛选下暂无 Skill 能力' : '当前筛选下暂无技能包';
  const input = document.querySelector('.skill-page-search');
  if (input) {
    input.value = '';
    input.placeholder = view === 'atomic' ? '搜索 Skill 能力、分类、调用方式' : '搜索技能包名称、分类或用途';
  }
  document.querySelectorAll('.agent-skill-card, .atomic-capability-card').forEach(card => {
    card.style.display = '';
    card.dataset.filterVisible = '1';
  });
  document.querySelectorAll('.skill-page-tab').forEach((tab, index) => {
    tab.classList.toggle('active', index === 0);
  });
  updateSkillCardEmptyState();
}

function openSkillManagerOverlay() {
  let overlay = document.getElementById('agent-skill-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'agent-skill-modal';
    overlay.className = 'agent-skill-modal';
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSkillManagerOverlay();
    });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = renderAgentSkillsManager({ mode: 'modal' });
  overlay.classList.add('open');
  document.body.classList.add('agent-skill-modal-open');
}

function closeSkillManagerOverlay() {
  const overlay = document.getElementById('agent-skill-modal');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('agent-skill-modal-open');
}

function openSkillPackageAction(title, status, action) {
  const panel = document.getElementById('skill-package-action-panel');
  if (!panel) return;
  const statusText = {
    available: '可用',
    requestable: '可申请',
    pending: '待审批',
    disabled: '已禁用',
    admin: '管理员配置'
  }[status] || '查看';
  const categoryText = {
    available: '使用技能包',
    requestable: '申请技能包',
    pending: '查看审批进度',
    disabled: '查看禁用原因',
    admin: '查看配置说明'
  }[status] || '查看详情';
  const body = {
    available: `
      <div class="skill-action-row"><span>使用方式</span><strong>通过右侧 AI 助手自然语言调用</strong></div>
      <div class="skill-action-row"><span>下一步</span><strong>在底部输入框描述任务目标、时间范围和业务线</strong></div>
      <div class="skill-action-row"><span>执行控制</span><strong>只读分析可直接执行；写入动作仍需二次确认</strong></div>
      <div class="skill-action-actions">
        <button class="btn btn-primary" onclick="startSkillPackageInline('${title}')">在本页开始</button>
      </div>`,
    requestable: `
      <div class="skill-action-row"><span>申请人</span><input value="${STATE.user || 'admin'}" readonly></div>
      <div class="skill-action-row"><span>申请场景</span><textarea placeholder="例如：用于每周活动复盘，需要查看渠道表现和优化建议"></textarea></div>
      <div class="skill-action-row"><span>使用范围</span><select><option>仅本人使用</option><option>本团队使用</option><option>按业务线授权</option></select></div>
      <div class="skill-action-actions">
        <button class="btn btn-secondary" onclick="clearSkillPackageAction()">取消</button>
        <button class="btn btn-primary" onclick="submitSkillPackageAction('${title}', '申请已生成')">提交申请</button>
      </div>`,
    pending: `
      <div class="skill-action-row"><span>申请状态</span><strong>待审批</strong></div>
      <div class="skill-action-row"><span>当前节点</span><strong>业务负责人审批</strong></div>
      <div class="skill-action-row"><span>提交时间</span><strong>2026-05-29 10:20</strong></div>
      <div class="skill-action-row"><span>预计处理</span><strong>1 个工作日内</strong></div>
      <div class="skill-action-actions">
        <button class="btn btn-secondary" onclick="clearSkillPackageAction()">收起</button>
        <button class="btn btn-primary" onclick="submitSkillPackageAction('${title}', '已提醒审批人')">提醒审批人</button>
      </div>`,
    disabled: `
      <div class="skill-action-row"><span>禁用原因</span><strong>权限策略调整中，暂不开放灰度发布和回滚演练</strong></div>
      <div class="skill-action-row"><span>影响范围</span><strong>普通运营不可申请或使用，历史任务记录可继续查看</strong></div>
      <div class="skill-action-row"><span>恢复方式</span><strong>等待平台管理员更新发布权限策略</strong></div>
      <div class="skill-action-actions">
        <button class="btn btn-secondary" onclick="clearSkillPackageAction()">收起</button>
      </div>`,
    admin: `
      <div class="skill-action-row"><span>配置内容</span><strong>写入、发布、批量导出等高风险动作的确认与留痕规则</strong></div>
      <div class="skill-action-row"><span>可见范围</span><strong>普通运营可查看说明；配置权限后续按组织和角色开放</strong></div>
      <div class="skill-action-row"><span>当前规则</span><strong>L4/L5 二次确认，L6 审批后执行</strong></div>
      <div class="skill-action-actions">
        <button class="btn btn-secondary" onclick="clearSkillPackageAction()">收起</button>
      </div>`
  }[status] || `<div class="skill-action-row"><span>说明</span><strong>暂无可操作内容</strong></div>`;
  panel.innerHTML = `
    <div class="skill-action-panel-card">
      <div class="skill-action-panel-head">
        <div>
          <div class="skill-action-kicker">${categoryText}</div>
          <div class="skill-action-title">${title}<span>${statusText}</span></div>
        </div>
        <button class="agent-skill-modal-close compact" onclick="clearSkillPackageAction()" title="收起">×</button>
      </div>
      <div class="skill-action-panel-body">${body}</div>
    </div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearSkillPackageAction() {
  const panel = document.getElementById('skill-package-action-panel');
  if (panel) panel.innerHTML = '';
}

function submitSkillPackageAction(title, message) {
  const panel = document.getElementById('skill-package-action-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="skill-action-panel-card success">
      <div class="skill-action-panel-head">
        <div>
          <div class="skill-action-kicker">操作已记录</div>
          <div class="skill-action-title">${title}<span>${message}</span></div>
        </div>
        <button class="agent-skill-modal-close compact" onclick="clearSkillPackageAction()" title="收起">×</button>
      </div>
      <div class="skill-action-panel-body">
        <div class="skill-action-row"><span>后续处理</span><strong>当前仍停留在技能管理弹层内，可继续查看或申请其他技能包。</strong></div>
      </div>
    </div>`;
}

function startSkillPackageInline(title) {
  const panel = document.getElementById('skill-package-action-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="skill-action-panel-card success">
      <div class="skill-action-panel-head">
        <div>
          <div class="skill-action-kicker">已进入技能包使用准备</div>
          <div class="skill-action-title">${title}<span>本页闭环</span></div>
        </div>
        <button class="agent-skill-modal-close compact" onclick="clearSkillPackageAction()" title="收起">×</button>
      </div>
      <div class="skill-action-panel-body">
        <div class="skill-action-row"><span>当前状态</span><strong>已选择该技能包，后续参数在当前管理弹层内补充。</strong></div>
        <div class="skill-action-row"><span>所需信息</span><input placeholder="例如：近 7 天、消费业务、官网渠道"></div>
        <div class="skill-action-row"><span>执行方式</span><strong>只读类任务可直接生成预览；写入类任务会先展示二次确认。</strong></div>
        <div class="skill-action-actions">
          <button class="btn btn-secondary" onclick="clearSkillPackageAction()">取消</button>
          <button class="btn btn-primary" onclick="submitSkillPackageAction('${title}', '已生成任务预览')">生成任务预览</button>
        </div>
      </div>
    </div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAgentSkillsManager(options = {}) {
  const isModal = options.mode === 'modal';
  const skills = [
    { icon: '📊', color: '#3370ff', title: '经营指标解读', status: 'available', badge: '可用', desc: '读取当前看板上下文，输出指标结论、异常证据、原因推测和下一步运营动作。', tags: ['数据分析', '运营总览'], usage: '2.1k 次使用', action: '使用' },
    { icon: '📦', color: '#ff8f1f', title: '商品配置助手', status: 'available', badge: '可用', desc: '协助检查商品卡片、推荐位、价格和上下架配置，写入前必须二次确认。', tags: ['商品运营', '配置'], usage: '860 次使用', action: '使用' },
    { icon: '📄', color: '#10b981', title: '内容发布检查', status: 'available', badge: '可用', desc: '检查 CMS 内容、活动页文案、跳转链接和发布前风险项。', tags: ['内容运营', '质量巡检'], usage: '748 次使用', action: '使用' },
    { icon: '🎯', color: '#7c3aed', title: '活动复盘报告', status: 'requestable', badge: '可申请', desc: '基于活动周期数据生成复盘框架，包含目标达成、渠道表现和优化建议。', tags: ['活动运营', '报告'], usage: '申请后可用', action: '申请' },
    { icon: '👥', color: '#14b8a6', title: '会员分层洞察', status: 'requestable', badge: '可申请', desc: '分析会员分层、权益使用和认证转化表现，辅助制定运营策略。', tags: ['用户/会员', '分析'], usage: '申请后可用', action: '申请' },
    { icon: '🧾', color: '#6366f1', title: '认证失败用户导出', status: 'pending', badge: '待审批', desc: '导出认证失败用户和失败原因，用于客服回访和运营复盘。', tags: ['用户/会员', '数据导出'], usage: '申请已提交', action: '查看进度' },
    { icon: '🧪', color: '#94a3b8', title: '灰度发布助手', status: 'disabled', badge: '已禁用', desc: '用于灰度发布和回滚演练，当前因权限策略调整暂不可用。', tags: ['平台配置', '发布'], usage: '管理员已停用', action: '查看原因' },
    { icon: '🛡️', color: '#f97316', title: '发布风险确认', status: 'admin', badge: '管理员配置', desc: '对写入、发布、批量导出等高风险操作进行确认和留痕。', tags: ['平台配置', '权限'], usage: '管理员可配置', action: '查看' },
    { icon: '🔎', color: '#0ea5e9', title: '链路巡检', status: 'requestable', badge: '可申请', desc: '巡检页面链接、接口响应、埋点和数据缺失，输出异常清单。', tags: ['质量巡检', '平台操作'], usage: '申请后可用', action: '申请' }
  ];
  const atomicAbilities = [
    { id: 'metric.gmv.query', name: '查询 GMV 指标', category: '数据查询', risk: 'L1', status: 'enabled', invoke: '自然语言 / 技能包编排', input: '时间范围、业务线、渠道', output: 'GMV、订单数、同比环比', packages: ['经营指标解读', '活动复盘报告'] },
    { id: 'context.page.read', name: '读取当前页面上下文', category: '上下文理解', risk: 'L1', status: 'enabled', invoke: '进入页面后自动读取', input: '当前菜单、筛选条件、页面指标', output: '页面上下文摘要', packages: ['经营指标解读', '链路巡检'] },
    { id: 'content.report.generate', name: '生成运营报告草稿', category: '内容生成', risk: 'L2', status: 'enabled', invoke: '自然语言 / 技能包编排', input: '目标、周期、指标结果', output: '报告结构与文案草稿', packages: ['活动复盘报告', '经营指标解读'] },
    { id: 'product.config.validate', name: '校验商品配置', category: '商品运营', risk: 'L2', status: 'enabled', invoke: '技能包编排', input: '商品 ID、推荐位、上下架状态', output: '配置问题与修复建议', packages: ['商品配置助手', '内容发布检查'] },
    { id: 'product.config.write', name: '写入商品推荐位配置', category: '平台配置', risk: 'L4', status: 'controlled', invoke: '二次确认后执行', input: '推荐位、商品列表、生效时间', output: '配置变更结果', packages: ['商品配置助手'] },
    { id: 'cert.user.export', name: '导出认证失败用户', category: '用户/会员', risk: 'L6', status: 'approval', invoke: '审批通过后执行', input: '认证状态、时间范围、失败原因', output: '用户清单与失败原因', packages: ['认证失败用户导出'] },
    { id: 'approval.task.create', name: '创建审批任务', category: '审批流', risk: 'L3', status: 'enabled', invoke: '高风险动作自动触发', input: '申请人、操作摘要、影响范围', output: '审批单号与审批链路', packages: ['商品配置助手', '发布风险确认'] },
    { id: 'knowledge.query', name: '查询知识库', category: '知识问答', risk: 'L1', status: 'enabled', invoke: '自然语言', input: '问题、业务场景、关键词', output: '答案、引用来源、建议追问', packages: ['经营指标解读', '内容发布检查'] }
  ];
  const atomicRiskMeta = {
    L1: { label: '低风险', desc: '只读查询 / 上下文读取', tone: 'low' },
    L2: { label: '内容生成', desc: '生成草稿或建议，不直接写入', tone: 'low' },
    L3: { label: '流程动作', desc: '创建任务、通知或审批单', tone: 'medium' },
    L4: { label: '受控写入', desc: '影响页面配置，执行前二次确认', tone: 'high' },
    L5: { label: '发布变更', desc: '影响线上发布或批量生效', tone: 'high' },
    L6: { label: '高敏审批', desc: '涉及用户数据导出或敏感操作', tone: 'critical' }
  };
  const atomicStatusMeta = {
    enabled: { label: '启用', desc: '当前用户可在技能包或自然语言任务中触发' },
    controlled: { label: '受控', desc: '可被触发，但执行前必须二次确认并留痕' },
    approval: { label: '审批', desc: '需要走审批流，审批通过后才执行' },
    disabled: { label: '停用', desc: '暂不可调用，只保留展示和依赖关系' }
  };
  const statusMeta = {
    all: { label: '全部', count: skills.length },
    available: { label: '可用的', count: skills.filter(s => s.status === 'available').length },
    requestable: { label: '可申请的', count: skills.filter(s => s.status === 'requestable').length },
    pending: { label: '待审批', count: skills.filter(s => s.status === 'pending').length },
    disabled: { label: '禁用的', count: skills.filter(s => s.status === 'disabled').length },
    admin: { label: '管理员配置', count: skills.filter(s => s.status === 'admin').length }
  };
  const atomicSummary = {
    all: { label: '全部能力', count: atomicAbilities.length, risks: 'all' },
    low: { label: '低风险', count: atomicAbilities.filter(a => a.risk === 'L1').length, risks: 'L1' },
    medium: { label: '内容/流程', count: atomicAbilities.filter(a => ['L2', 'L3'].includes(a.risk)).length, risks: 'L2,L3' },
    high: { label: '高风险能力', count: atomicAbilities.filter(a => ['L4', 'L5', 'L6'].includes(a.risk)).length, risks: 'L4,L5,L6' }
  };
  const tabs = Object.entries(statusMeta).map(([key, meta], i) =>
    `<button class="skill-page-tab ${i === 0 ? 'active' : ''}" data-skill-filter="${key}" onclick="filterSkillCards('${key}', this)">${meta.label}<span>${meta.count}</span></button>`
  ).join('');
  const card = s => `
    <div class="agent-skill-card" data-skill-status="${s.status}">
      <div class="agent-skill-card-head">
        <div style="display:flex;gap:12px;min-width:0">
          <div class="agent-skill-card-icon" style="background:${s.color}">${s.icon}</div>
          <div>
            <div class="agent-skill-card-title">${s.title}<span class="agent-skill-card-badge status-${s.status}">${s.badge}</span></div>
          </div>
        </div>
        <span class="agent-skill-card-more">···</span>
      </div>
      <div class="agent-skill-card-desc">${s.desc}</div>
      <div class="agent-skill-card-meta">${s.tags.map(t => `<span class="agent-skill-card-tag">${t}</span>`).join('')}</div>
      <div class="agent-skill-card-foot">
        <span>${s.usage}</span>
        <button class="agent-skill-card-action" onclick="openSkillPackageAction('${s.title}', '${s.status}', '${s.action}')">${s.action}</button>
      </div>
    </div>`;
  const atomicCard = item => `
    <div class="atomic-capability-card" data-filter-visible="1" data-atomic-risk="${item.risk}">
      <div class="atomic-capability-head">
        <div>
          <div class="atomic-capability-name">${item.name}<span>${item.id}</span></div>
          <div class="atomic-capability-sub">${item.category} · ${item.invoke}</div>
        </div>
        <div class="atomic-risk ${atomicRiskMeta[item.risk]?.tone || 'low'}" title="${item.risk}：${atomicRiskMeta[item.risk]?.desc || ''}">
          <strong>${atomicRiskMeta[item.risk]?.label || item.risk}</strong>
          <span>${item.risk}</span>
        </div>
      </div>
      <div class="atomic-capability-body">
        <div><b>输入</b><span>${item.input}</span></div>
        <div><b>输出</b><span>${item.output}</span></div>
        <div><b>技能包引用</b><span>${item.packages.join(' / ')}</span></div>
      </div>
      <div class="atomic-capability-foot">
        <span class="atomic-status status-${item.status}" title="${atomicStatusMeta[item.status]?.desc || ''}">${atomicStatusMeta[item.status]?.label || item.status}</span>
        <button class="agent-skill-card-action" title="把该能力带入右侧 AI 输入框，由 AI 说明参数与确认步骤" onclick="aiQuick('试调用 Skill 能力：${item.name}。请先说明适用场景、需要的参数、风险等级和下一步确认方式，不要直接执行写入。'); ${isModal ? 'closeSkillManagerOverlay();' : ''}">试调用</button>
      </div>
    </div>`;
  const headerActions = isModal
    ? `<button class="agent-skill-modal-close" onclick="closeSkillManagerOverlay()" title="关闭">×</button>`
    : `<button class="btn btn-secondary" onclick="switchPage('dashboard.overview')">返回工作台</button>`;
  return `
    <div class="${isModal ? 'agent-skill-modal-panel' : ''}" role="${isModal ? 'dialog' : 'region'}" aria-label="Skills 管理">
      <div class="page-header ${isModal ? 'agent-skill-modal-head' : ''}">
        <div>
          <div class="page-title">技能管理</div>
          <div class="page-desc">技能包面向业务使用；Skill 能力展示底层可调用能力与编排关系。</div>
        </div>
        <div class="agent-skill-page-actions">
          ${headerActions}
        </div>
      </div>
      <div class="skill-page-shell">
        <div class="skill-layer-tabs">
          <button class="skill-layer-tab active" onclick="switchSkillManagerView('packages', this)">技能包<span>${skills.length}</span></button>
          <button class="skill-layer-tab" onclick="switchSkillManagerView('atomic', this)">Skill 能力<span>${atomicAbilities.length}</span></button>
        </div>
        <div class="skill-page-summary skill-summary-group active" data-summary-view="packages">
          <button class="skill-summary-card" onclick="filterSkillSummary('package', 'available', this)"><strong>${statusMeta.available.count}</strong><span>可用技能包</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('package', 'requestable', this)"><strong>${statusMeta.requestable.count}</strong><span>可申请</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('package', 'pending', this)"><strong>${statusMeta.pending.count}</strong><span>待审批</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('package', 'disabled,admin', this)"><strong>${statusMeta.disabled.count + statusMeta.admin.count}</strong><span>禁用/配置</span></button>
        </div>
        <div class="skill-page-summary skill-summary-group" data-summary-view="atomic">
          <button class="skill-summary-card" onclick="filterSkillSummary('atomic', '${atomicSummary.all.risks}', this)"><strong>${atomicSummary.all.count}</strong><span>${atomicSummary.all.label}</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('atomic', '${atomicSummary.low.risks}', this)"><strong>${atomicSummary.low.count}</strong><span>${atomicSummary.low.label}</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('atomic', '${atomicSummary.medium.risks}', this)"><strong>${atomicSummary.medium.count}</strong><span>${atomicSummary.medium.label}</span></button>
          <button class="skill-summary-card" onclick="filterSkillSummary('atomic', '${atomicSummary.high.risks}', this)"><strong>${atomicSummary.high.count}</strong><span>${atomicSummary.high.label}</span></button>
        </div>
        <div class="skill-page-toolbar">
          <div class="skill-page-tabs">
            ${tabs}
          </div>
          <div class="skill-page-toolbar-actions">
            <button class="btn btn-primary skill-package-only-action" onclick="openSkillPackageAction('新技能包申请', 'requestable', '申请')">申请技能包</button>
            <input class="skill-page-search" placeholder="搜索技能包名称、分类或用途" oninput="searchSkillCards(this.value)">
          </div>
        </div>
        <div class="skill-manager-section active" data-skill-view="packages">
          <div id="skill-package-action-panel" class="skill-package-action-panel"></div>
          <div class="skill-page-grid">
            ${skills.map(card).join('')}
          </div>
          <div class="skill-page-empty-note">
            技能包是给运营、业务和销售使用的低门槛入口。一个技能包可以编排多个 Skill 能力，用户通过右侧 AI 助手自然语言调用。
          </div>
        </div>
        <div class="skill-manager-section" data-skill-view="atomic">
          <div class="atomic-capability-intro">
            <div><b>Skill 能力</b><span>底层最小能力单元，可以被技能包编排，也可以由右侧 AI 助手根据自然语言任务自动调用。</span></div>
            <div><b>调用路径</b><span>自然语言输入 → 意图识别 → 匹配技能包 → 拆解 Skill 能力 → 权限/风险校验 → 执行或审批。</span></div>
          </div>
          <div class="atomic-capability-grid">
            ${atomicAbilities.map(atomicCard).join('')}
          </div>
        </div>
        <div class="skill-page-empty" id="skill-page-empty" style="display:none;">当前筛选下暂无 Skill</div>
      </div>
    </div>`;
}

const LEAI_DASH_STATE = {
  overviewRange: '1d',
  overviewCustomStart: '',
  overviewCustomEnd: '',
  overviewScenarioMode: 'all',
  overviewProductMetric: 'views'
};

const LEAI_PRODUCT_ROWS = [
  { name: 'ThinkPad X9-14 Aura AI元启版', views: 15847, buyers: 761, cvr: 4.8 },
  { name: 'YOGA Air 14 Aura AI元启版', views: 13203, buyers: 700, cvr: 5.3 },
  { name: '拯救者 R7000P 2025 AI元启', views: 11876, buyers: 487, cvr: 4.1 },
  { name: '联想小新Pro14GT AI元启版', views: 9543, buyers: 305, cvr: 3.2 },
  { name: 'ThinkPad P14s 2025 AI元启版', views: 7810, buyers: 203, cvr: 2.6 }
];

function leaiGetData() {
  return typeof LEAI_DATA !== 'undefined' ? LEAI_DATA : null;
}

function leaiRangeSize(range) {
  return range === '1d' ? 1 : range === '7d' ? 7 : range === '14d' ? 14 : 30;
}

function leaiRangeLabel(range) {
  return ({ '1d': '最近1天', '7d': '最近7天', '14d': '最近14天', '30d': '最近30天', custom: '自定义' })[range] || '最近1天';
}

function leaiDataYear() {
  const L = leaiGetData();
  return (L?.updated || '2026').slice(0, 4);
}

function leaiRowIso(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [m, day] = String(d).split('/');
  return `${leaiDataYear()}-${String(m || '').padStart(2, '0')}-${String(day || '').padStart(2, '0')}`;
}

function leaiDateBounds(source) {
  const L = leaiGetData();
  const rows = source || L?.daily || [];
  return {
    min: leaiRowIso(rows[0]?.d || ''),
    max: leaiRowIso(rows[rows.length - 1]?.d || '')
  };
}

function leaiRows(range, source, customStart, customEnd) {
  const L = leaiGetData();
  const rows = source || L?.daily || [];
  if ((range || '1d') === 'custom') {
    const bounds = leaiDateBounds(rows);
    const start = customStart || bounds.min;
    const end = customEnd || bounds.max;
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    return rows.filter(r => {
      const d = leaiRowIso(r.d);
      return (!lo || d >= lo) && (!hi || d <= hi);
    });
  }
  const n = Math.min(leaiRangeSize(range || '1d'), rows.length);
  return rows.slice(-n);
}

function leaiSum(rows, key) {
  return rows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0);
}

function leaiAvg(rows, key) {
  return rows.length ? Math.round(leaiSum(rows, key) / rows.length) : 0;
}

function leaiFmtW(v) {
  v = Number(v) || 0;
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString();
}

function leaiFmtY(v) {
  v = Number(v) || 0;
  return v >= 100000000 ? (v / 100000000).toFixed(2) + '亿' : v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString();
}

function leaiFmtPct(part, total) {
  return total ? (part / total * 100).toFixed(1) + '%' : '-';
}

function leaiPeriodText(rows) {
  const first = rows[0]?.d || '';
  const last = rows[rows.length - 1]?.d || '';
  const toFull = d => d ? '2026.' + d.replace('/', '.') : '-';
  return first === last ? toFull(last) : `${toFull(first)} - ${toFull(last)}`;
}

function leaiBuildSummary(range, customStart, customEnd) {
  const rows = leaiRows(range, undefined, customStart, customEnd);
  return {
    rows,
    dau: leaiAvg(rows, 'dau'),
    wau: leaiAvg(rows, 'wau'),
    mau: leaiAvg(rows, 'mau'),
    login: leaiSum(rows, 'login'),
    loginAvg: leaiAvg(rows, 'login'),
    inter: leaiSum(rows, 'inter'),
    interAvg: leaiAvg(rows, 'inter'),
    buy: leaiSum(rows, 'buy'),
    gmv: leaiSum(rows, 'gmv'),
    offGmv: leaiSum(rows, 'offGmv'),
    nonGmv: leaiSum(rows, 'nonGmv'),
    offBuy: leaiSum(rows, 'offBuy'),
    nonBuy: leaiSum(rows, 'nonBuy'),
    loginM: leaiAvg(rows, 'loginM'),
    interM: leaiAvg(rows, 'interM')
  };
}

function leaiBizSummary(rows, source) {
  const dates = new Set(rows.map(r => r.d));
  const picked = (source || []).filter(r => dates.has(r.d));
  return { gmv: leaiSum(picked, 'gmv'), buy: leaiSum(picked, 'buy'), login: leaiSum(picked, 'login'), inter: leaiSum(picked, 'inter') };
}

function leaiDistributeAmount(total, weights) {
  total = Math.max(0, Math.round(Number(total) || 0));
  const sum = weights.reduce((s, v) => s + (Number(v) || 0), 0);
  const shares = sum ? weights.map(v => (Number(v) || 0) / sum) : weights.map(() => 1 / Math.max(weights.length, 1));
  const raw = shares.map(v => v * total);
  const ints = raw.map(Math.floor);
  let left = total - ints.reduce((s, v) => s + v, 0);
  raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (left > 0) { ints[i] += 1; left -= 1; } });
  return ints;
}

function leaiBizTradeSummaries(rows) {
  const L = leaiGetData();
  const meta = [
    { key: 'consumer', label: '消费业务', source: L?.consumer || [], color: '#2563eb' },
    { key: 'smb', label: 'SMB 业务', source: L?.smb || [], color: '#f59e0b' },
    { key: 'gov', label: '政企业务', source: L?.gov || [], color: '#8b5cf6' }
  ];
  const loginRows = meta.map(m => ({ ...m, ...leaiBizSummary(rows, m.source) }));
  const loginGmvTotal = loginRows.reduce((s, r) => s + r.gmv, 0);
  const loginBuyTotal = loginRows.reduce((s, r) => s + r.buy, 0);
  const extraGmv = Math.max(0, leaiSum(rows, 'gmv') - loginGmvTotal);
  const extraBuy = Math.max(0, leaiSum(rows, 'buy') - loginBuyTotal);
  const gmvAdds = leaiDistributeAmount(extraGmv, loginRows.map(r => r.gmv));
  const buyAdds = leaiDistributeAmount(extraBuy, loginRows.map(r => r.buy));
  return loginRows.map((r, i) => ({
    ...r,
    loginGmv: r.gmv,
    loginBuy: r.buy,
    platformGmv: gmvAdds[i],
    platformBuy: buyAdds[i],
    gmv: r.gmv + gmvAdds[i],
    buy: r.buy + buyAdds[i]
  }));
}

function leaiMetricDelta(rows, key) {
  if (rows.length < 2) return '单日快照';
  const first = Number(rows[0]?.[key]) || 0;
  const last = Number(rows[rows.length - 1]?.[key]) || 0;
  if (!first) return '较首日 -';
  const pct = (last - first) / first * 100;
  return `较首日 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function leaiSparklineHtml(rows, key, label, fmt, displayValue, subText) {
  const vals = rows.map(r => Number(r?.[key]) || 0);
  const max = Math.max(...vals, 1);
  const value = displayValue == null ? (vals[vals.length - 1] || 0) : displayValue;
  return `<div class="dash-spark-card">
    <div class="dash-spark-head"><span>${label}</span><b>${fmt(value)}</b></div>
    <div class="dash-spark-bars">
      ${vals.map((v, i) => `<span title="${rows[i]?.d || ''} ${fmt(v)}" style="height:${Math.max(v / max * 100, 4)}%"></span>`).join('')}
    </div>
    <div class="dash-spark-sub">${subText || leaiMetricDelta(rows, key)}</div>
  </div>`;
}

function leaiScenarioRows(summary) {
  const mode = LEAI_DASH_STATE.overviewScenarioMode;
  const total = mode === 'active' ? summary.login : summary.inter;
  const weights = mode === 'active'
    ? [0.16, 0.31, 0.18, 0.09, 0.12, 0.14]
    : [0.20, 0.27, 0.16, 0.10, 0.13, 0.14];
  return ['会员', '电商', '服务', '门店', '方案', '咨询'].map((name, i) => ({
    name,
    value: Math.round(total * weights[i])
  }));
}

function leaiScenarioChartHtml(summary) {
  const rows = leaiScenarioRows(summary);
  const max = Math.max(...rows.map(r => r.value), 1);
  const pill = mode => `dash-pill ${LEAI_DASH_STATE.overviewScenarioMode === mode ? 'active' : ''}`;
  return `<div class="card">
    <div class="card-header">
      <div class="card-title">Query 场景分布</div>
      <div class="dash-filter-bar">
        <button class="${pill('all')}" onclick="leaiSetScenarioMode('all')">整体</button>
        <button class="${pill('active')}" onclick="leaiSetScenarioMode('active')">主动</button>
      </div>
    </div>
    <div class="dash-bar-chart">
      ${rows.map(r => `<div class="dash-bar-item">
        <div class="dash-bar-value">${leaiFmtW(r.value)}</div>
        <div class="dash-bar" style="height:${Math.max(r.value / max * 128, 12)}px"></div>
        <div class="dash-bar-label">${r.name}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function leaiProductTableHtml() {
  const metric = LEAI_DASH_STATE.overviewProductMetric;
  const pill = m => `dash-pill ${metric === m ? 'active' : ''}`;
  const sorted = [...LEAI_PRODUCT_ROWS].sort((a, b) => {
    if (metric === 'buyers') return b.buyers - a.buyers;
    if (metric === 'cvr') return b.cvr - a.cvr;
    return b.views - a.views;
  });
  return `<div class="card">
    <div class="card-header">
      <div class="card-title">热门商品 TOP5</div>
      <div class="dash-filter-bar">
        <button class="${pill('views')}" onclick="leaiSetProductMetric('views')">浏览</button>
        <button class="${pill('buyers')}" onclick="leaiSetProductMetric('buyers')">购买</button>
        <button class="${pill('cvr')}" onclick="leaiSetProductMetric('cvr')">转化率</button>
      </div>
    </div>
    <table>
      <tr><th>商品</th><th>浏览量</th><th>购买人数</th><th>转化率</th></tr>
      ${sorted.map(p => `<tr><td>${p.name}</td><td>${p.views.toLocaleString()}</td><td>${p.buyers.toLocaleString()}</td><td><span class="badge ${p.cvr >= 4 ? 'status-on' : 'status-warn'}">${p.cvr.toFixed(1)}%</span></td></tr>`).join('')}
    </table>
  </div>`;
}

function leaiAiNum(v) {
  return (Number(v) || 0).toLocaleString();
}

function leaiAiMoney(v) {
  return leaiFmtY(v) + ` (${leaiAiNum(v)}元)`;
}

function leaiAiPct(part, total) {
  return total ? (part / total * 100).toFixed(2) + '%' : '-';
}

function leaiAiTrend(rows, key, fmt) {
  if (!rows || rows.length === 0) return `${key}: 无数据`;
  const first = Number(rows[0]?.[key]) || 0;
  const last = Number(rows[rows.length - 1]?.[key]) || 0;
  const values = rows.map(r => Number(r?.[key]) || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const maxRow = rows[values.indexOf(max)];
  const minRow = rows[values.indexOf(min)];
  const change = first ? ((last - first) / first * 100).toFixed(1) + '%' : '-';
  return `${fmt(first)} -> ${fmt(last)}，首尾变化 ${change}，峰值 ${fmt(max)}(${maxRow?.d || '-'})，低点 ${fmt(min)}(${minRow?.d || '-'})`;
}

function leaiAiTopDays(rows, key, fmt, n = 3) {
  return [...(rows || [])]
    .sort((a, b) => (Number(b?.[key]) || 0) - (Number(a?.[key]) || 0))
    .slice(0, n)
    .map(r => `${r.d}:${fmt(r[key])}`)
    .join('、') || '-';
}

function leaiCurrentOverviewAiContext(goal) {
  const L = leaiGetData();
  if (!L) return '';
  const range = LEAI_DASH_STATE.overviewRange;
  const bounds = leaiDateBounds();
  const customStart = LEAI_DASH_STATE.overviewCustomStart || bounds.min;
  const customEnd = LEAI_DASH_STATE.overviewCustomEnd || bounds.max;
  const summary = leaiBuildSummary(range, customStart, customEnd);
  const rows = summary.rows || [];
  const [consumer, smb, gov] = leaiBizTradeSummaries(rows);
  const platformTotal = summary.offGmv + summary.nonGmv;
  const activeBase = summary.dau * Math.max(rows.length, 1);
  const aov = summary.buy ? Math.round(summary.gmv / summary.buy) : 0;
  const productRows = [...LEAI_PRODUCT_ROWS].sort((a, b) => b.buyers - a.buyers).slice(0, 5);

  return [
    `页面: 乐享运营 / 运营总览`,
    `时间范围: ${leaiRangeLabel(range)}，${leaiPeriodText(rows)}，统计天数 ${rows.length}，数据更新 ${L.updated}`,
    goal ? `阶段目标: ${goal}` : '阶段目标: 未填写',
    '',
    '核心指标:',
    `- DAU日均: ${leaiFmtW(summary.dau)} (${leaiAiNum(summary.dau)})`,
    `- WAU均值: ${leaiFmtW(summary.wau)} (${leaiAiNum(summary.wau)})`,
    `- MAU均值: ${leaiFmtW(summary.mau)} (${leaiAiNum(summary.mau)})`,
    `- GMV累计: ${leaiAiMoney(summary.gmv)}`,
    `- 购买人数累计: ${leaiAiNum(summary.buy)}，客单价约 ${leaiAiMoney(aov)}`,
    '',
    '关键经营链路:',
    `- 登录用户: ${leaiFmtW(summary.login)}，登录/日活 ${leaiAiPct(summary.login, activeBase)}`,
    `- 互动用户: ${leaiFmtW(summary.inter)}，互动/登录 ${leaiAiPct(summary.inter, summary.login)}`,
    `- 购买人数: ${leaiAiNum(summary.buy)}，购买/互动 ${leaiAiPct(summary.buy, summary.inter)}`,
    `- 成交GMV: ${leaiAiMoney(summary.gmv)}，日均 ${leaiAiMoney(leaiAvg(rows, 'gmv'))}`,
    '',
    '分业务交易:',
    `- 消费业务: GMV ${leaiAiMoney(consumer.gmv)}，购买 ${leaiAiNum(consumer.buy)}，GMV占比 ${leaiAiPct(consumer.gmv, summary.gmv)}`,
    `- SMB业务: GMV ${leaiAiMoney(smb.gmv)}，购买 ${leaiAiNum(smb.buy)}，GMV占比 ${leaiAiPct(smb.gmv, summary.gmv)}`,
    `- 政企业务: GMV ${leaiAiMoney(gov.gmv)}，购买 ${leaiAiNum(gov.buy)}，GMV占比 ${leaiAiPct(gov.gmv, summary.gmv)}`,
    '',
    '分平台交易:',
    `- 官网: GMV ${leaiAiMoney(summary.offGmv)}，购买 ${leaiAiNum(summary.offBuy)}，占比 ${leaiAiPct(summary.offGmv, platformTotal)}`,
    `- 非官网: GMV ${leaiAiMoney(summary.nonGmv)}，购买 ${leaiAiNum(summary.nonBuy)}，占比 ${leaiAiPct(summary.nonGmv, platformTotal)}`,
    '',
    '趋势特征:',
    `- DAU: ${leaiAiTrend(rows, 'dau', leaiFmtW)}`,
    `- 登录: ${leaiAiTrend(rows, 'login', leaiFmtW)}`,
    `- 互动: ${leaiAiTrend(rows, 'inter', leaiFmtW)}`,
    `- GMV: ${leaiAiTrend(rows, 'gmv', leaiFmtY)}`,
    `- GMV高点: ${leaiAiTopDays(rows, 'gmv', leaiFmtY)}`,
    '',
    '热门商品TOP5:',
    ...productRows.map(p => `- ${p.name}: 浏览 ${leaiAiNum(p.views)}，购买 ${leaiAiNum(p.buyers)}，转化率 ${p.cvr.toFixed(1)}%`),
    '',
    '日序列:',
    ...rows.map(r => `- ${r.d}: DAU ${leaiAiNum(r.dau)}，登录 ${leaiAiNum(r.login)}，互动 ${leaiAiNum(r.inter)}，购买 ${leaiAiNum(r.buy)}，GMV ${leaiAiNum(r.gmv)}`)
  ].join('\n');
}

function leaiAskOverview(kind) {
  const range = leaiRangeLabel(LEAI_DASH_STATE.overviewRange);
  const prompts = {
    overview: `基于当前运营总览看板，分析${range}的主要趋势、核心风险、增长机会和优先动作。`,
    funnel: `基于当前运营总览看板，重点分析${range}从登录、互动到购买和GMV的转化链路，指出瓶颈和需要补充的数据。`,
    goal: '基于当前运营总览看板和我输入的阶段目标，评估目标达成路径、关键缺口、优先动作和需要业务补充的数据。'
  };
  aiQuick(prompts[kind] || prompts.overview);
}

function leaiSetOverviewRange(range) {
  LEAI_DASH_STATE.overviewRange = range;
  if (range === 'custom') {
    const bounds = leaiDateBounds();
    LEAI_DASH_STATE.overviewCustomStart ||= bounds.min;
    LEAI_DASH_STATE.overviewCustomEnd ||= bounds.max;
  }
  switchPage('dashboard.overview');
}

function leaiOverviewTimeFilterHtml(bounds, customStart, customEnd) {
  const range = LEAI_DASH_STATE.overviewRange;
  const pill = v => `dash-pill ${range === v ? 'active' : ''}`;
  const customFilter = range === 'custom' ? `
    <span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${bounds.min}" max="${bounds.max}" value="${customStart}" onchange="leaiSetOverviewCustom('start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${bounds.min}" max="${bounds.max}" value="${customEnd}" onchange="leaiSetOverviewCustom('end',this.value)">
    </span>` : '';
  return `<div class="ops-time-filter">
    <div class="dash-filter-bar">
      ${['1d', '7d', '14d', '30d', 'custom'].map(v => `<button class="${pill(v)}" onclick="leaiSetOverviewRange('${v}')">${leaiRangeLabel(v)}</button>`).join('')}
    </div>
    ${customFilter}
  </div>`;
}

function leaiSetOverviewCustom(part, value) {
  LEAI_DASH_STATE.overviewRange = 'custom';
  if (part === 'start') LEAI_DASH_STATE.overviewCustomStart = value;
  if (part === 'end') LEAI_DASH_STATE.overviewCustomEnd = value;
  if (LEAI_DASH_STATE.overviewCustomStart && LEAI_DASH_STATE.overviewCustomEnd && LEAI_DASH_STATE.overviewCustomStart > LEAI_DASH_STATE.overviewCustomEnd) {
    if (part === 'start') LEAI_DASH_STATE.overviewCustomEnd = LEAI_DASH_STATE.overviewCustomStart;
    if (part === 'end') LEAI_DASH_STATE.overviewCustomStart = LEAI_DASH_STATE.overviewCustomEnd;
  }
  switchPage('dashboard.overview');
}

function leaiSetScenarioMode(mode) {
  LEAI_DASH_STATE.overviewScenarioMode = mode;
  switchPage('dashboard.overview');
}

function leaiSetProductMetric(metric) {
  LEAI_DASH_STATE.overviewProductMetric = metric;
  switchPage('dashboard.overview');
}

const PAGE_RENDERERS = {
  'agent.skills': () => renderAgentSkillsManager(),
  'dashboard.overview': () => {
    const L = leaiGetData();
    if (!L) return '<div class="empty-state"><div class="title">暂无运营数据</div></div>';
    const range = LEAI_DASH_STATE.overviewRange;
    const bounds = leaiDateBounds();
    const customStart = LEAI_DASH_STATE.overviewCustomStart || bounds.min;
    const customEnd = LEAI_DASH_STATE.overviewCustomEnd || bounds.max;
    const summary = leaiBuildSummary(range, customStart, customEnd);
    const [lc, ls, lg] = leaiBizTradeSummaries(summary.rows);
    const platformTotal = summary.offGmv + summary.nonGmv;
    const activeBase = summary.dau * Math.max(summary.rows.length, 1);
    return `
    <div class="page-header">
      <div>
        <div class="page-title">运营总览</div>
        <div class="page-desc">乐享全渠道数据 · ${leaiPeriodText(summary.rows)} · 数据更新于 ${L.updated}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${leaiOverviewTimeFilterHtml(bounds, customStart, customEnd)}
        <button class="btn btn-sm btn-secondary" onclick="leaiAskOverview('overview')">AI 解读</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">DAU（日活跃用户）</div>
        <div class="kpi-value">${leaiFmtW(summary.dau)}</div>
        <div class="kpi-sub">日均登录 ${leaiFmtW(summary.loginAvg)} · ${leaiMetricDelta(summary.rows, 'dau')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">WAU（周活跃用户）</div>
        <div class="kpi-value">${leaiFmtW(summary.wau)}</div>
        <div class="kpi-sub">${leaiRangeLabel(range)}均值 · ${leaiMetricDelta(summary.rows, 'wau')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">MAU（月活跃用户）</div>
        <div class="kpi-value">${leaiFmtW(summary.mau)}</div>
        <div class="kpi-sub">月登录均值 ${leaiFmtW(summary.loginM)} · ${leaiMetricDelta(summary.rows, 'mau')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">GMV</div>
        <div class="kpi-value">${leaiFmtY(summary.gmv)}</div>
        <div class="kpi-sub">购买 ${summary.buy.toLocaleString()}人 · ${leaiMetricDelta(summary.rows, 'gmv')}</div>
      </div>
    </div>

    <div class="card dash-funnel-card">
      <div class="card-header">
        <div class="card-title">关键经营链路</div>
        <button class="btn btn-sm btn-secondary" onclick="leaiAskOverview('funnel')">问 AI</button>
      </div>
      <div class="dash-funnel-grid">
        <div class="dash-funnel-item">
          <div class="dash-funnel-label">登录用户</div>
          <div class="dash-funnel-value">${leaiFmtW(summary.login)}</div>
          <div class="dash-funnel-sub">登录 / 日活 ${leaiFmtPct(summary.login, activeBase)}</div>
        </div>
        <div class="dash-funnel-item">
          <div class="dash-funnel-label">互动用户</div>
          <div class="dash-funnel-value">${leaiFmtW(summary.inter)}</div>
          <div class="dash-funnel-sub">互动 / 登录 ${leaiFmtPct(summary.inter, summary.login)}</div>
        </div>
        <div class="dash-funnel-item">
          <div class="dash-funnel-label">购买人数</div>
          <div class="dash-funnel-value">${summary.buy.toLocaleString()}</div>
          <div class="dash-funnel-sub">购买 / 互动 ${leaiFmtPct(summary.buy, summary.inter)}</div>
        </div>
        <div class="dash-funnel-item">
          <div class="dash-funnel-label">成交 GMV</div>
          <div class="dash-funnel-value">${leaiFmtY(summary.gmv)}</div>
          <div class="dash-funnel-sub">日均 ${leaiFmtY(leaiAvg(summary.rows, 'gmv'))}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div class="card-title">交易指标 · 分业务</div>
        <div class="dash-card-note">登录口径 + 平台交易回算</div>
      </div>
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0">
        <div class="kpi-card" style="border-left:3px solid #2563eb">
          <div class="kpi-label">消费业务 GMV</div>
          <div class="kpi-value" style="font-size:20px">${leaiFmtY(lc.gmv)}</div>
          <div class="kpi-sub">购买 ${lc.buy.toLocaleString()}人 · 占比 ${leaiFmtPct(lc.gmv, summary.gmv)}</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid #f59e0b">
          <div class="kpi-label">SMB 业务 GMV</div>
          <div class="kpi-value" style="font-size:20px">${leaiFmtY(ls.gmv)}</div>
          <div class="kpi-sub">购买 ${ls.buy.toLocaleString()}人 · 占比 ${leaiFmtPct(ls.gmv, summary.gmv)}</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid #8b5cf6">
          <div class="kpi-label">政企业务 GMV</div>
          <div class="kpi-value" style="font-size:20px">${leaiFmtY(lg.gmv)}</div>
          <div class="kpi-sub">购买 ${lg.buy.toLocaleString()}人 · 占比 ${leaiFmtPct(lg.gmv, summary.gmv)}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">交易指标 · 分平台</div></div>
      <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:0">
        <div class="kpi-card" style="border-left:3px solid #2563eb">
          <div class="kpi-label">官网 GMV</div>
          <div class="kpi-value" style="font-size:20px">${leaiFmtY(summary.offGmv)}</div>
          <div class="kpi-sub">占比 ${leaiFmtPct(summary.offGmv, platformTotal)} · 购买 ${summary.offBuy.toLocaleString()}人</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid #94a3b8">
          <div class="kpi-label">非官网 GMV</div>
          <div class="kpi-value" style="font-size:20px">${leaiFmtY(summary.nonGmv)}</div>
          <div class="kpi-sub">占比 ${leaiFmtPct(summary.nonGmv, platformTotal)} · 购买 ${summary.nonBuy.toLocaleString()}人</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">核心趋势速览</div></div>
      <div class="dash-spark-grid">
        ${leaiSparklineHtml(summary.rows, 'dau', 'DAU', leaiFmtW, summary.dau, `${leaiRangeLabel(range)}日均 · ${leaiMetricDelta(summary.rows, 'dau')}`)}
        ${leaiSparklineHtml(summary.rows, 'inter', '互动用户', leaiFmtW, summary.inter, `${leaiRangeLabel(range)}累计 · ${leaiMetricDelta(summary.rows, 'inter')}`)}
        ${leaiSparklineHtml(summary.rows, 'gmv', 'GMV', leaiFmtY, summary.gmv, `${leaiRangeLabel(range)}累计 · ${leaiMetricDelta(summary.rows, 'gmv')}`)}
      </div>
    </div>

    <div class="grid-2">
      ${leaiScenarioChartHtml(summary)}
      ${leaiProductTableHtml()}
    </div>
  `;},

  // ===== GEO DASHBOARD =====
  'dashboard.geo': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 整体数据概览</div><div class="page-desc">联想 AI 搜索引擎优化效果监控 · 数据来源：点亮AI</div></div>
      <button class="btn btn-sm btn-primary" onclick="geoLoadData()">刷新</button>
    </div>
    <div class="geo-dark">
      <div class="geo-scope-bar">
        <div class="geo-scope-tab active" data-scope="all" onclick="geoSetScope(this)">整体</div>
        <div class="geo-scope-tab" data-scope="leai" onclick="geoSetScope(this)">联想乐享</div>
        <div class="geo-scope-tab" data-scope="official" onclick="geoSetScope(this)">联想官网</div>
      </div>
      <div class="geo-filter-row">
        <span class="geo-label">AI 平台</span>
        <div class="geo-pill active" data-model="all" onclick="geoTogglePlatform(this)">全平台</div>
        <div class="geo-pill" data-model="doubao" onclick="geoTogglePlatform(this)">豆包</div>
        <div class="geo-pill" data-model="deepseek" onclick="geoTogglePlatform(this)">DeepSeek</div>
        <div class="geo-pill" data-model="yuanbao" onclick="geoTogglePlatform(this)">元宝</div>
        <div class="geo-pill" data-model="kimi" onclick="geoTogglePlatform(this)">Kimi</div>
        <span class="geo-pill-disabled" title="项目未开启该平台">千问 (未开启)</span>
        <span class="geo-pill-disabled" title="项目未开启该平台">文心 (未开启)</span>
        <span class="geo-pill-disabled" title="项目未开启该平台">夸克 (未开启)</span>
      </div>
      <div class="geo-filter-row" style="flex-wrap:wrap;gap:8px">
        <span class="geo-label">时间范围</span>
        <input type="date" id="geo-date-start" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" onchange="geoDateRangeChanged()">
        <span style="font-size:12px;color:#6b7280">至</span>
        <input type="date" id="geo-date-end" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" onchange="geoDateRangeChanged()">
        <div style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;margin-left:4px">
          <button onclick="geoQuickPeriod('7d')" class="geo-period-btn" data-period="7d" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#fff;color:#374151;transition:all .15s">近7天</button>
          <button onclick="geoQuickPeriod('30d')" class="geo-period-btn active" data-period="30d" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#2563eb;color:#fff;transition:all .15s">近30天</button>
        </div>
        <span class="geo-label" style="margin-left:12px;">意图筛选</span>
        <select id="geo-questions-select" onchange="geoSetQuestionFromSelect(this.value)" style="padding:5px 10px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;min-width:200px;max-width:320px;cursor:pointer">
          <option value="">全部意图</option>
        </select>
      </div>
      <div class="geo-status-line" id="geo-status">加载中...</div>

      <!-- 对比视角 + 竞品选择器 合并一行 -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">对比视角</span>
          <div id="geo-compare-toggle" style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden">
            <button onclick="geoSetCompare('brand')" class="geo-cmp-btn active" data-cmp="brand" style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s;background:#2563eb;color:#fff">品牌</button>
            <button onclick="geoSetCompare('competitor')" class="geo-cmp-btn" data-cmp="competitor" style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s;background:#fff;color:#374151">竞品</button>
            <button onclick="geoSetCompare('both')" class="geo-cmp-btn" data-cmp="both" style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s;background:#fff;color:#374151">对比</button>
          </div>
        </div>
        <div style="width:1px;height:20px;background:#e5e7eb"></div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">竞品对比</span>
          <button class="geo-comp-pill" data-brand="hp" onclick="geoToggleCompetitor(this)">惠普</button>
          <button class="geo-comp-pill" data-brand="dell" onclick="geoToggleCompetitor(this)">戴尔</button>
          <button class="geo-comp-pill" data-brand="huawei" onclick="geoToggleCompetitor(this)">华为</button>
          <button class="geo-comp-pill" data-brand="apple" onclick="geoToggleCompetitor(this)">苹果</button>
          <button class="geo-comp-pill" data-brand="asus" onclick="geoToggleCompetitor(this)">华硕</button>
          <button class="geo-comp-pill" data-brand="xiaomi" onclick="geoToggleCompetitor(this)">小米</button>
          <button class="geo-comp-pill" data-brand="acer" onclick="geoToggleCompetitor(this)">宏碁</button>
          <button class="geo-comp-pill" data-brand="honor" onclick="geoToggleCompetitor(this)">荣耀</button>
          <span style="font-size:10px;color:#9ca3af">最多5个</span>
        </div>
      </div>

      <!-- 4 个核心 KPI（可点选） -->
      <div class="geo-kpi-grid cols-4" id="geo-kpi-cards" style="margin-bottom:16px">
        <div class="geo-kpi highlight" data-metric="visible" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中提及目标品牌的问题数占比，衡量品牌基础曝光能力">?</div>
          <div class="gk-val" id="gv-brand-visible">--</div>
          <div class="gk-label">品牌可见度</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub">竞品可见度 <span id="gv-comp-visible">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="rec" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中推荐目标品牌/产品的次数占比">?</div>
          <div class="gk-val" id="gv-brand-rec">--</div>
          <div class="gk-label">品牌推荐率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub">竞品推荐率 <span id="gv-comp-rec">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="top1" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中目标品牌/产品出现在推荐首位（置顶）的次数占比">?</div>
          <div class="gk-val" id="gv-brand-top1">--</div>
          <div class="gk-label">品牌推荐置顶率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub">竞品置顶率 <span id="gv-comp-top1">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="top3" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中目标品牌/产品出现在推荐列表前 3 位的次数占比">?</div>
          <div class="gk-val" id="gv-brand-top3">--</div>
          <div class="gk-label">品牌推荐前三率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub">竞品前三率 <span id="gv-comp-top3">--</span></div>
        </div>
      </div>

      <!-- 趋势折线图 + 品牌vs竞品 并排 -->
      <div class="geo-row" style="margin-bottom:12px">
        <div class="geo-panel" style="flex:2;min-width:0">
          <div style="margin-bottom:8px">
            <div class="gpnl-title" style="margin:0">可见性趋势</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;font-size:11px;color:#6b7280;flex-wrap:wrap">
            <span><span style="display:inline-block;width:20px;height:3px;background:#9333ea;border-radius:2px;vertical-align:middle;margin-right:4px"></span>整体可见性</span>
            <span><span style="display:inline-block;width:20px;height:3px;background:#2563eb;border-radius:2px;vertical-align:middle;margin-right:4px"></span>联想官网可见性</span>
            <span><span style="display:inline-block;width:20px;height:3px;background:#10b981;border-radius:2px;vertical-align:middle;margin-right:4px"></span>联想乐享可见性</span>
            <span><span style="display:inline-block;width:20px;height:3px;background:#6b7280;border-radius:2px;vertical-align:middle;margin-right:4px"></span>竞品可见性</span>
          </div>
          <canvas id="geo-trend-canvas" width="800" height="280" style="width:100%;height:280px;cursor:crosshair"></canvas>
          <div id="geo-trend-tooltip" style="display:none;position:absolute;background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:6px;font-size:11px;pointer-events:none;z-index:100;line-height:1.6"></div>
        </div>
        <div class="geo-panel" style="flex:1;min-width:280px">
          <div class="gpnl-title">品牌 vs 竞品 对比</div>
          <div id="geo-trend-chart" style="padding:8px 0"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
        </div>
      </div>

      <!-- 第二行：信源分布 Treemap + 排行榜 -->
      <div class="geo-row">
        <div class="geo-panel">
          <div class="gpnl-title">信源分布图</div>
          <div id="geo-sites-treemap" style="min-height:260px"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
        </div>
        <div class="geo-panel">
          <div class="gpnl-title">信源排行榜 Top20</div>
          <div class="geo-scroll-wrap" style="max-height:320px">
            <div id="geo-sites-rank"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
          </div>
        </div>
      </div>

      <!-- 第三行：各平台引用次数 -->
      <div class="geo-row wide-right">
        <div class="geo-panel">
          <div class="gpnl-title">各 AI 平台引用次数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· wiki + 官网合计</span></div>
          <div class="geo-kpi-grid cols-2" style="margin-bottom:12px">
            <div class="geo-kpi"><div class="gk-val" id="gv-lenovo-cite">--</div><div class="gk-label">联想官网引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-wiki-cite">--</div><div class="gk-label">乐享/业务 wiki 引用次数</div></div>
          </div>
          <div class="geo-plat-grid" id="geo-plat-dist"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
        </div>
        <div class="geo-panel">
          <div class="gpnl-title">联想域名 AI 引用 Top50 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 共 <span id="gv-sites-total">--</span> 个联想站点</span></div>
          <div class="geo-scroll-wrap" style="max-height:380px;overflow-y:auto">
            <div id="geo-link-top50"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
          </div>
        </div>
      </div>

      <!-- 各优化平台意图总数 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div class="gpnl-title">各优化平台意图总数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 每平台覆盖意图数量</span></div>
        <div id="geo-intent-platform-summary"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
      </div>

    </div>
  `,

  'dashboard.geoSource': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 各平台信源分布</div><div class="page-desc">各 AI 模型引用的内容发布平台分布及占比</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="geo-source-model" onchange="geoLoadSourcePage()" style="padding:5px 10px;border-radius:14px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer;">
          <option value="all">全平台</option>
          <option value="doubao">豆包</option>
          <option value="deepseek">DeepSeek</option>
          <option value="yuanbao">元宝</option>
          <option value="kimi">Kimi</option>
        </select>
      </div>
    </div>
    <div class="geo-dark">
      <div class="geo-status-line" id="geo-source-status">加载中...</div>
      <div id="geo-source-list"><div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">加载中...</div></div>
      <div id="geo-source-pager" style="text-align:center;margin-top:12px"></div>
    </div>
  `,

  'dashboard.geoIntent': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 各平台意图分布</div><div class="page-desc">各 AI 平台覆盖意图总数及可见性矩阵</div></div>
      <button class="btn btn-sm btn-secondary" onclick="geoLoadIntentPage()">🔄 刷新</button>
    </div>
    <div class="geo-dark">
      <!-- 各优化平台意图总数 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div class="gpnl-title">各优化平台意图总数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 每平台覆盖意图数量</span></div>
        <div id="geo-intent-platform-summary"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
      </div>

      <!-- 意图列表 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div class="gpnl-title" style="margin:0">GEO 意图列表 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 共 <span id="gv-q-count">--</span> 个意图 · 按模型展示可见性</span></div>
          <div id="geo-intent-plat-filter" style="display:inline-flex;gap:4px;flex-wrap:wrap"></div>
        </div>
        <div class="geo-scroll-wrap" style="max-height:600px">
          <div id="geo-questions-table"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
        </div>
      </div>
    </div>
  `,

  'dashboard.geoConversion': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 转化看板</div><div class="page-desc">通过 AI 搜索平台入站的访问 / 登录 / 注册 / 购买转化</div></div>
    </div>
    <div class="geo-dark">
      <div class="geo-status-line">AI搜索平台：豆包、元宝、Kimi、DS、千问 &nbsp;|&nbsp; 交易：当日访问，当日购买</div>

      <div class="geo-conv-section">
        <div class="geo-conv-title">GEO看板 · 整体（URL 包含 lenovo，排除 wiki.lenovo.com.cn）</div>
        <div class="geo-conv-grid">
          <div class="geo-conv-cell"><div class="gcc-label">访问联想UV</div><div class="gcc-val" id="gc-all-uv">--</div><div class="gcc-def">通过AI搜索平台访问联想域名的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">登录用户</div><div class="gcc-val" id="gc-all-login">--</div><div class="gcc-def">访问联想的用户中，有Lenovoid登录行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新注册用户</div><div class="gcc-val" id="gc-all-newreg">--</div><div class="gcc-def">访问联想的登录用户中，是新注册的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">付费用户</div><div class="gcc-val" id="gc-all-paid">--</div><div class="gcc-def">用户入站后，发生了购买行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">CA</div><div class="gcc-val" id="gc-all-ca">--</div><div class="gcc-def">购买用户产生的订单销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">GMV</div><div class="gcc-val" id="gc-all-gmv">--</div><div class="gcc-def">购买用户产生的订单交易额</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费用户</div><div class="gcc-val" id="gc-all-newpaid">--</div><div class="gcc-def">购买用户中，是首次发生购买行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费CA</div><div class="gcc-val" id="gc-all-newca">--</div><div class="gcc-def">首次购买用户，产生的订单销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费GMV</div><div class="gcc-val" id="gc-all-newgmv">--</div><div class="gcc-def">首次购买用户，产生的交易额</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享·下单用户</div><div class="gcc-val" id="gc-all-leai-user">--</div><div class="gcc-def">付费用户中，通过乐享自主下单功能，发生购买行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享-CA</div><div class="gcc-val" id="gc-all-leai-ca">--</div><div class="gcc-def">通过乐享自主下单功能，发生购买行为的用户产生的销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享-GMV</div><div class="gcc-val" id="gc-all-leai-gmv">--</div><div class="gcc-def">通过乐享自主下单功能，发生购买行为的用户产生的交易额</div></div>
        </div>
      </div>

      <div class="geo-conv-section">
        <div class="geo-conv-title">GEO看板 · 联想乐享（URL 包含 leai.lenovo.com.cn / wiki.lenovo.com.cn）</div>
        <div class="geo-conv-grid">
          <div class="geo-conv-cell"><div class="gcc-label">访问联想乐享UV</div><div class="gcc-val" id="gc-leai-uv">--</div><div class="gcc-def">通过AI搜索平台访问联想乐享的用户</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">登录用户-乐享</div><div class="gcc-val" id="gc-leai-login">--</div><div class="gcc-def">访问联想乐享的用户中，有Lenovoid登录行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新注册用户-乐享</div><div class="gcc-val" id="gc-leai-newreg">--</div><div class="gcc-def">访问联想乐享的登录用户中，是新注册的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">互动用户数</div><div class="gcc-val" id="gc-leai-interact">--</div><div class="gcc-def">访问联想乐享的用户中，至少有1次会话的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">登录状态下互动人数</div><div class="gcc-val" id="gc-leai-login-interact">--</div><div class="gcc-def">互动用户中，是有登录状态的互动用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">付费用户数</div><div class="gcc-val" id="gc-leai-paid">--</div><div class="gcc-def">访问联想乐享后，在站内发生了购买行为的用户数</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">CA</div><div class="gcc-val" id="gc-leai-ca">--</div><div class="gcc-def">访问联想乐享后的购买用户，产生的订单销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">GMV</div><div class="gcc-val" id="gc-leai-gmv">--</div><div class="gcc-def">访问联想乐享后的购买用户，产生的订单交易额</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费用户</div><div class="gcc-val" id="gc-leai-newpaid">--</div><div class="gcc-def">访问联想乐享后发生购买的用户中，首次购买的用户</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费CA</div><div class="gcc-val" id="gc-leai-newca">--</div><div class="gcc-def">首次购买用户，产生的订单销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">新付费GMV</div><div class="gcc-val" id="gc-leai-newgmv">--</div><div class="gcc-def">首次购买用户，产生的交易额</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享·下单用户</div><div class="gcc-val" id="gc-leai-order-user">--</div><div class="gcc-def">付费用户中，通过乐享自主下单功能，发生购买行为的用户</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享-CA</div><div class="gcc-val" id="gc-leai-order-ca">--</div><div class="gcc-def">通过乐享自主下单功能，购买用户产生的销量</div></div>
          <div class="geo-conv-cell"><div class="gcc-label">乐享-GMV</div><div class="gcc-val" id="gc-leai-order-gmv">--</div><div class="gcc-def">通过乐享自主下单功能，购买用户产生的交易额</div></div>
        </div>
      </div>
    </div>
  `,

  'dashboard.geoKnowledge': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 手工上传知识</div><div class="page-desc">上传文档或手动添加 QA 对，补充 AI 搜索引擎可抓取的知识内容</div></div>
    </div>
    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-label">文档总数</div><div class="kpi-value" style="font-size:20px" id="stat-docs">-</div></div>
      <div class="kpi-card"><div class="kpi-label">向量数</div><div class="kpi-value" style="font-size:20px" id="stat-vectors">-</div></div>
      <div class="kpi-card"><div class="kpi-label">QA 对数</div><div class="kpi-value" style="font-size:20px" id="stat-qa">-</div></div>
      <div class="kpi-card"><div class="kpi-label">图谱实体</div><div class="kpi-value" style="font-size:20px" id="stat-kg">-</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="tab-bar" style="display:flex;border-bottom:1px solid var(--border-light);margin-bottom:16px">
        <div class="tab-item active" onclick="switchKbTab('upload',this)" style="padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid var(--primary);color:var(--primary)">上传文档</div>
        <div class="tab-item" onclick="switchKbTab('qa',this)" style="padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid transparent;color:var(--text-tertiary)">手动添加 QA</div>
        <div class="tab-item" onclick="switchKbTab('docs',this)" style="padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid transparent;color:var(--text-tertiary)">文档列表</div>
        <div class="tab-item" onclick="switchKbTab('qalist',this)" style="padding:10px 20px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid transparent;color:var(--text-tertiary)">QA 列表</div>
      </div>
      <div id="kb-tab-upload">
        <div style="padding:20px;text-align:center;border:2px dashed var(--border-light);border-radius:10px;margin:0 16px 16px">
          <div style="font-size:32px;margin-bottom:8px">📄</div>
          <div style="margin-bottom:12px;color:var(--text-secondary);font-size:13px">支持 .txt / .md / .pdf / .docx / .xlsx 格式</div>
          <input type="file" id="kb-file-input" accept=".txt,.md,.pdf,.docx,.xlsx,.csv" onchange="handleKBFileSelect(this)" style="display:none">
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('kb-file-input').click()">选择文件</button>
          <button class="btn btn-sm btn-primary" id="kb-upload-btn" disabled onclick="submitKBUpload()">上传并处理</button>
          <div id="kb-upload-status" style="display:none;margin-top:10px;font-size:12px"></div>
        </div>
      </div>
      <div id="kb-tab-qa" style="display:none">
        <div style="padding:0 16px 16px">
          <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">问题</label><input type="text" id="manual-qa-q" placeholder="输入问题" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
          <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">答案</label><textarea id="manual-qa-a" placeholder="输入答案" rows="4" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea></div>
          <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:4px">场景标签（可选）</label><input type="text" id="manual-qa-scene" placeholder="如：售前咨询、产品对比" style="width:100%;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
          <button class="btn btn-sm btn-primary" onclick="submitManualQA()">保存 QA 对</button>
          <div id="manual-qa-status" style="display:none;margin-top:10px;font-size:12px"></div>
        </div>
      </div>
      <div id="kb-tab-docs" style="display:none"><div id="kb-docs" style="padding:0 16px 16px"><div style="color:var(--text-tertiary);font-size:12px">加载中...</div></div></div>
      <div id="kb-tab-qalist" style="display:none"><div style="padding:0 16px 16px"><div style="margin-bottom:8px;font-size:12px;color:var(--text-tertiary)" id="qa-count-label">共 - 条</div><table id="qa-table" style="width:100%"><tr><td style="text-align:center;color:var(--text-tertiary)">加载中...</td></tr></table></div></div>
    </div>
  `,

  // ===== QUERY ANALYSIS =====
  'dashboard.query': () => `
    <div class="page-header"><div><div class="page-title">Query 分析</div><div class="page-desc">智能体交互数据深度分析</div></div></div>
    <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);">
      <div class="kpi-card"><div class="kpi-label">Query 总数</div><div class="kpi-value" style="font-size:22px" id="qa-total">-</div></div>
      <div class="kpi-card"><div class="kpi-label">今日 Query</div><div class="kpi-value" style="font-size:22px" id="qa-today">-</div></div>
      <div class="kpi-card"><div class="kpi-label">总对话数</div><div class="kpi-value" style="font-size:22px" id="qa-convs">-</div></div>
      <div class="kpi-card"><div class="kpi-label">好评数</div><div class="kpi-value" style="font-size:22px;color:var(--green)" id="qa-likes">-</div></div>
      <div class="kpi-card"><div class="kpi-label">差评数</div><div class="kpi-value" style="font-size:22px;color:var(--red)" id="qa-dislikes">-</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">7日 Query 趋势</div></div>
        <div id="qa-trend" style="display:flex;align-items:flex-end;gap:12px;height:140px;padding-top:10px"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">热门 Query TOP10</div></div>
        <div id="qa-top"><div style="text-align:center;padding:20px;color:var(--text-tertiary)">加载中...</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">差评 Query</div><button class="btn btn-sm btn-primary" onclick="switchPage('content.knowledge')">去补充知识</button></div>
      <div id="qa-bad"><div style="text-align:center;padding:20px;color:var(--text-tertiary)">加载中...</div></div>
    </div>
  `,

  // ===== CUSTOMER BEHAVIOR =====
  'dashboard.behavior': () => `
    <div class="page-header"><div><div class="page-title">客户行为分析</div><div class="page-desc">客户转化、流失、营销、商机等行为指标</div></div></div>
    <div class="demo-banner"><span class="demo-icon">💡</span> 以下为示例数据，接入埋点系统后将展示真实行为分析</div>
    <div class="tab-bar">
      <div class="tab-item active" onclick="switchBehaviorTab('conversion',this)">转化漏斗</div>
      <div class="tab-item" onclick="switchBehaviorTab('intent',this)">意向分析</div>
      <div class="tab-item" onclick="switchBehaviorTab('churn',this)">流失预警</div>
      <div class="tab-item" onclick="switchBehaviorTab('marketing',this)">营销效果</div>
      <div class="tab-item" onclick="switchBehaviorTab('member',this)">会员分析</div>
    </div>
    <div id="behavior-conversion">
      <div class="kpi-grid" style="grid-template-columns:repeat(6,1fr);">
        <div class="kpi-card"><div class="kpi-label">浏览商品客户</div><div class="kpi-value" style="font-size:18px;">456,789</div></div>
        <div class="kpi-card"><div class="kpi-label">收藏行为客户</div><div class="kpi-value" style="font-size:18px;">123,456</div></div>
        <div class="kpi-card"><div class="kpi-label">对比行为客户</div><div class="kpi-value" style="font-size:18px;">89,012</div></div>
        <div class="kpi-card"><div class="kpi-label">加购客户</div><div class="kpi-value" style="font-size:18px;">67,890</div></div>
        <div class="kpi-card"><div class="kpi-label">未支付客户</div><div class="kpi-value" style="font-size:18px;color:var(--orange);">23,456</div></div>
        <div class="kpi-card"><div class="kpi-label">Query→转化客户</div><div class="kpi-value" style="font-size:18px;color:var(--green);">34,567</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">转化漏斗</div></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:12px;"><span style="width:100px;font-size:12px;text-align:right;">浏览</span><div style="flex:1;height:32px;background:var(--primary);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">456,789 (100%)</div></div>
          <div style="display:flex;align-items:center;gap:12px;"><span style="width:100px;font-size:12px;text-align:right;">收藏/对比</span><div style="width:46%;height:32px;background:rgba(51,112,255,0.7);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">212,468 (46.5%)</div></div>
          <div style="display:flex;align-items:center;gap:12px;"><span style="width:100px;font-size:12px;text-align:right;">加购</span><div style="width:15%;height:32px;background:rgba(51,112,255,0.5);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">67,890 (14.9%)</div></div>
          <div style="display:flex;align-items:center;gap:12px;"><span style="width:100px;font-size:12px;text-align:right;">下单</span><div style="width:10%;height:32px;background:rgba(51,112,255,0.3);border-radius:4px;display:flex;align-items:center;padding:0 10px;font-size:12px;">44,434 (9.7%)</div></div>
          <div style="display:flex;align-items:center;gap:12px;"><span style="width:100px;font-size:12px;text-align:right;">支付</span><div style="width:7.5%;height:32px;background:var(--green);border-radius:4px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:12px;">34,567 (7.6%)</div></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><div class="card-title">跨品类浏览客户</div></div><div style="font-size:26px;font-weight:700;margin-bottom:6px;">78,901</div><div style="font-size:12px;color:var(--text-secondary);">浏览 ≥2 个品类的客户，购买意向更广泛</div></div>
        <div class="card"><div class="card-header"><div class="card-title">多次咨询客户</div></div><div style="font-size:26px;font-weight:700;margin-bottom:6px;">45,678</div><div style="font-size:12px;color:var(--text-secondary);">同一客户多次咨询，高意向客户</div></div>
      </div>
    </div>
    <div id="behavior-intent" style="display:none;">
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">高意向未转化</div><div class="kpi-value" style="font-size:22px;color:var(--red);">12,345</div><div class="kpi-sub">多次咨询/加购但未下单</div></div>
        <div class="kpi-card"><div class="kpi-label">以旧换新咨询</div><div class="kpi-value" style="font-size:22px;">8,765</div><div class="kpi-sub">换机需求客户</div></div>
        <div class="kpi-card"><div class="kpi-label">企业采购咨询</div><div class="kpi-value" style="font-size:22px;">3,456</div><div class="kpi-sub">SMB 线索</div></div>
        <div class="kpi-card"><div class="kpi-label">推荐未采纳</div><div class="kpi-value" style="font-size:22px;color:var(--orange);">15,678</div><div class="kpi-sub">需优化推荐算法</div></div>
      </div>
    </div>
    <div id="behavior-churn" style="display:none;">
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="kpi-label">咨询后离开客户</div><div class="kpi-value" style="font-size:22px;color:var(--orange);">34,567</div></div>
        <div class="kpi-card"><div class="kpi-label">流失风险客户</div><div class="kpi-value" style="font-size:22px;color:var(--red);">8,456</div></div>
        <div class="kpi-card"><div class="kpi-label">服务不满意客户</div><div class="kpi-value" style="font-size:22px;color:var(--red);">3,201</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">流失风险客户列表</div><button class="btn btn-sm btn-primary" onclick="aiQuick('批量发送挽留优惠')">批量发送挽留优惠</button></div>
        <table><tr><th>客户</th><th>最后活跃</th><th>历史消费</th><th>风险等级</th><th>操作</th></tr>
          <tr><td>用户 A***8</td><td>14 天前</td><td>¥12,890</td><td><span class="badge badge-red">高</span></td><td><button class="btn btn-sm btn-primary">发送优惠</button></td></tr>
          <tr><td>用户 B***3</td><td>21 天前</td><td>¥8,456</td><td><span class="badge badge-red">高</span></td><td><button class="btn btn-sm btn-primary">发送优惠</button></td></tr>
          <tr><td>用户 C***7</td><td>10 天前</td><td>¥5,678</td><td><span class="badge badge-orange">中</span></td><td><button class="btn btn-sm btn-primary">发送优惠</button></td></tr>
        </table>
      </div>
    </div>
    <div id="behavior-marketing" style="display:none;">
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="kpi-label">优惠券使用客户</div><div class="kpi-value" style="font-size:22px;">56,789</div></div>
        <div class="kpi-card"><div class="kpi-label">优惠券领取未使用</div><div class="kpi-value" style="font-size:22px;color:var(--orange);">45,678</div></div>
        <div class="kpi-card"><div class="kpi-label">负反馈内容</div><div class="kpi-value" style="font-size:22px;color:var(--red);">156</div></div>
      </div>
    </div>
    <div id="behavior-member" style="display:none;">
      <div class="card">
        <div class="card-header"><div class="card-title">会员等级分布</div></div>
        <div class="bar-chart" style="height:140px;">
          <div class="bar-col"><div class="bar-value">58%</div><div class="bar" style="height:87%;background:#8f959e;"></div><div class="bar-label">普通</div></div>
          <div class="bar-col"><div class="bar-value">22%</div><div class="bar" style="height:66%;background:#c0c0c0;"></div><div class="bar-label">银卡</div></div>
          <div class="bar-col"><div class="bar-value">14%</div><div class="bar" style="height:42%;background:#ffd700;"></div><div class="bar-label">金卡</div></div>
          <div class="bar-col"><div class="bar-value">6%</div><div class="bar" style="height:18%;background:#b8860b;"></div><div class="bar-label">铂金</div></div>
        </div>
      </div>
    </div>
  `,

  // ===== 在职员工管理模块 =====
  'employee.overview': () => `
    <div class="page-header">
      <div>
        <div class="page-title">在职员工管理</div>
        <div class="page-desc">查看和管理所有在职员工信息</div>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px;">
      <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#059669); color:#fff; cursor:pointer;" onclick="filterAndNavigate('all')">
        <div style="font-size:12px; opacity:0.9; margin-bottom:8px;">在职员工总数</div>
        <div style="font-size:32px; font-weight:700; margin-bottom:8px;" id="kpi-total">2,847</div>
        <div style="font-size:12px; opacity:0.8;">↑ 8% 较上月</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#059669); color:#fff; cursor:pointer;" onclick="filterAndNavigate('approved')">
        <div style="font-size:12px; opacity:0.9; margin-bottom:8px;">已认证工数</div>
        <div style="font-size:32px; font-weight:700; margin-bottom:8px;" id="kpi-approved">2,341</div>
        <div style="font-size:12px; opacity:0.8;">82.3% 认证率</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#059669); color:#fff; cursor:pointer;" onclick="filterAndNavigate('rejected')">
        <div style="font-size:12px; opacity:0.9; margin-bottom:8px;">已驳回工</div>
        <div style="font-size:32px; font-weight:700; margin-bottom:8px;" id="kpi-rejected">45</div>
        <div style="font-size:12px; opacity:0.8;">需重新认证</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#059669); color:#fff; cursor:pointer;" onclick="filterAndNavigate('pending')">
        <div style="font-size:12px; opacity:0.9; margin-bottom:8px;">本月新增</div>
        <div style="font-size:32px; font-weight:700; margin-bottom:8px;" id="kpi-pending">187</div>
        <div style="font-size:12px; opacity:0.8;">↑ 15% 环比</div>
      </div>
    </div>

    <!-- 认证方式分布 -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title">认证方式分布</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; padding:20px;">
        <div style="padding:20px; background:var(--bg); border-radius:6px; text-align:center; cursor:pointer;" onclick="filterByMethod('email')">
          <div style="font-size:24px; color:#10b981; font-weight:700; margin-bottom:4px;" id="method-email">1,051</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">企业邮箱</div>
          <div style="font-size:12px; color:var(--text-secondary);">45%</div>
        </div>
        <div style="padding:20px; background:var(--bg); border-radius:6px; text-align:center; cursor:pointer;" onclick="filterByMethod('contract')">
          <div style="font-size:24px; color:#10b981; font-weight:700; margin-bottom:4px;" id="method-contract">703</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">劳动合同</div>
          <div style="font-size:12px; color:var(--text-secondary);">30%</div>
        </div>
        <div style="padding:20px; background:var(--bg); border-radius:6px; text-align:center; cursor:pointer;" onclick="filterByMethod('tax')">
          <div style="font-size:24px; color:#10b981; font-weight:700; margin-bottom:4px;" id="method-tax">422</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">个人所得税</div>
          <div style="font-size:12px; color:var(--text-secondary);">18%</div>
        </div>
        <div style="padding:20px; background:var(--bg); border-radius:6px; text-align:center; cursor:pointer;" onclick="filterByMethod('other')">
          <div style="font-size:24px; color:#10b981; font-weight:700; margin-bottom:4px;" id="method-other">165</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">其他材料</div>
          <div style="font-size:12px; color:var(--text-secondary);">7%</div>
        </div>
      </div>
    </div>

    <!-- 员工列表 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">在职员工列表</span>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <input type="text" id="emp-ov-search-name" placeholder="姓名..." style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <input type="text" id="emp-ov-search-position" placeholder="岗位信息..." style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <input type="text" id="emp-ov-search-company" placeholder="所属企业..." style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <select id="emp-ov-search-status" style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);">
            <option value="">全部状态</option>
            <option value="approved">认证成功</option>
            <option value="rejected">认证失败</option>
          </select>
          <input type="date" id="emp-ov-date-start" title="认证时间起" style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <span style="color:var(--text-secondary); font-size:12px;">至</span>
          <input type="date" id="emp-ov-date-end" title="认证时间止" style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <button class="btn btn-sm btn-secondary" onclick="loadEmployeeOverviewTable()">搜索</button>
        </div>
      </div>
      <table style="width:100%; font-size:12px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); background:var(--bg);">
            <th style="text-align:center; padding:12px; width:40px;"><input type="checkbox"/></th>
            <th style="text-align:left; padding:12px;">账号</th>
            <th style="text-align:left; padding:12px;">真实姓名</th>
            <th style="text-align:left; padding:12px;">LenovoID</th>
            <th style="text-align:left; padding:12px;">关联手机号</th>
            <th style="text-align:left; padding:12px;">岗位信息</th>
            <th style="text-align:left; padding:12px;">所属企业</th>
            <th style="text-align:left; padding:12px;">职员认证状态</th>
            <th style="text-align:left; padding:12px;">认证方式</th>
            <th style="text-align:left; padding:12px;">认证时间</th>
            <th style="text-align:left; padding:12px;">当前状态</th>
            <th style="text-align:left; padding:12px;">操作</th>
          </tr>
        </thead>
        <tbody id="emp-overview-tbody">
          <tr><td colspan="13" style="text-align:center; padding:20px;">加载中...</td></tr>
        </tbody>
      </table>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
        <div style="color:var(--text-secondary); font-size:12px;">
          共 <span id="emp-overview-count">0</span> 条记录，当前第 <span id="emp-overview-page">1</span> 页，共 <span id="emp-overview-total-pages">1</span> 页
        </div>
        <div style="display:flex; gap:8px;">
          <button id="emp-overview-prev-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeOverviewTable(Math.max(1, parseInt(document.getElementById('emp-overview-page').textContent) - 1))">上一页</button>
          <button id="emp-overview-next-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeOverviewTable(parseInt(document.getElementById('emp-overview-page').textContent) + 1)">下一页</button>
        </div>
      </div>
    </div>
  `,

  'employee.list': () => `
    <div class="page-header">
      <div>
        <div class="page-title">员工列表</div>
        <div class="page-desc">查看、搜索在职员工信息</div>
      </div>
      <button class="btn btn-primary" onclick="exportEmployeeList()">📥 导出</button>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">在职员工列表</span>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <input type="text" id="emp-search-name" placeholder="姓名..." style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <input type="text" id="emp-search-position" placeholder="岗位信息..." style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <input type="text" id="emp-search-company" placeholder="所属企业..." style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <select id="emp-search-status" style="width:120px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);">
            <option value="">全部状态</option>
            <option value="approved">认证成功</option>
            <option value="rejected">认证失败</option>
          </select>
          <input type="date" id="emp-date-start" title="认证时间起" style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <span style="color:var(--text-secondary); font-size:12px;">至</span>
          <input type="date" id="emp-date-end" title="认证时间止" style="width:140px; padding:6px 8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text);"/>
          <button class="btn btn-sm btn-secondary" onclick="loadEmployeeList(1)">搜索</button>
        </div>
      </div>
      <table style="width:100%; font-size:12px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); background:var(--bg);">
            <th style="text-align:center; padding:12px; width:40px;"><input type="checkbox"/></th>
            <th style="text-align:left; padding:12px;">账号</th>
            <th style="text-align:left; padding:12px;">真实姓名</th>
            <th style="text-align:left; padding:12px;">LenovoID</th>
            <th style="text-align:left; padding:12px;">关联手机号</th>
            <th style="text-align:left; padding:12px;">岗位信息</th>
            <th style="text-align:left; padding:12px;">所属企业</th>
            <th style="text-align:left; padding:12px;">职员认证状态</th>
            <th style="text-align:left; padding:12px;">认证方式</th>
            <th style="text-align:left; padding:12px;">认证时间</th>
            <th style="text-align:left; padding:12px;">当前状态</th>
            <th style="text-align:left; padding:12px;">操作</th>
          </tr>
        </thead>
        <tbody id="emp-list-tbody">
          <tr><td colspan="13" style="text-align:center; padding:20px;">加载中...</td></tr>
        </tbody>
      </table>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
        <div style="color:var(--text-secondary); font-size:12px;">
          共 <span id="emp-total-count">0</span> 条记录，当前第 <span id="emp-current-page">1</span> 页，共 <span id="emp-total-pages">1</span> 页
        </div>
        <div style="display:flex; gap:8px;">
          <button id="emp-prev-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeList(Math.max(1, parseInt(document.getElementById('emp-current-page').textContent) - 1))">上一页</button>
          <button id="emp-next-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeList(parseInt(document.getElementById('emp-current-page').textContent) + 1)">下一页</button>
        </div>
      </div>
    </div>
  `,

  'employee.certification': () => `
    <div class="page-header">
      <div>
        <div class="page-title">✓ 认证审核管理</div>
        <div class="page-desc">查看认证记录，对认证失败的用户可修改认证结果</div>
      </div>
    </div>

    <!-- 标签页 -->
    <div style="display:flex; gap:0; margin-bottom:0; border-bottom:2px solid var(--border);">
      <button class="tab-btn" data-status="rejected" onclick="switchCertTab('rejected', this)" style="padding:12px 24px; border:none; background:none; cursor:pointer; border-bottom:3px solid #ef4444; color:var(--text); font-size:14px;" id="tab-rejected">
        <span>认证失败</span> <span style="color:var(--red);">(156)</span>
      </button>
      <button class="tab-btn" data-status="approved" onclick="switchCertTab('approved', this)" style="padding:12px 24px; border:none; background:none; color:var(--text-secondary); cursor:pointer; border-bottom:3px solid transparent; font-size:14px;">
        <span>认证成功</span> <span style="color:var(--green);">(2,341)</span>
      </button>
      <button class="tab-btn" data-status="expired" onclick="switchCertTab('expired', this)" style="padding:12px 24px; border:none; background:none; color:var(--text-secondary); cursor:pointer; border-bottom:3px solid transparent; font-size:14px;">
        <span>已失效</span> <span style="color:var(--text-tertiary);">(45)</span>
      </button>
    </div>

    <div class="card" style="border-radius:0; border-top:2px solid var(--red);">
      <!-- 搜索过滤区 -->
      <div style="padding:16px 20px; background:rgba(255,0,0,0.02); border-bottom:1px solid var(--border);">
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <input type="text" id="cert-search-no" placeholder="搜索申请编号/座号" style="flex:1; min-width:200px; padding:8px 12px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text); font-size:13px;"/>
          <select id="cert-search-method" style="padding:8px 12px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text); font-size:13px;">
            <option value="">认证方式 - 全部</option>
            <option value="email">企业邮箱</option>
            <option value="contract">劳动合同</option>
            <option value="tax">个人所得税</option>
            <option value="other">其他材料</option>
          </select>
          <button class="btn btn-primary" onclick="loadCertificationTable()" style="padding:8px 24px; font-size:13px;">🔍 搜索</button>
        </div>
      </div>

      <!-- 认证列表表格 -->
      <table style="width:100%;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); background:var(--bg);">
            <th style="text-align:center; padding:12px; font-size:12px; width:40px;">
              <input type="checkbox" style="cursor:pointer;"/>
            </th>
            <th style="text-align:left; padding:12px; font-size:12px;">申请编号</th>
            <th style="text-align:left; padding:12px; font-size:12px;">用户</th>
            <th style="text-align:left; padding:12px; font-size:12px;">认证方式</th>
            <th style="text-align:left; padding:12px; font-size:12px;">企业名称</th>
            <th style="text-align:left; padding:12px; font-size:12px;">认证时间</th>
            <th style="text-align:left; padding:12px; font-size:12px;">状态</th>
            <th style="text-align:left; padding:12px; font-size:12px;">操作</th>
          </tr>
        </thead>
        <tbody id="cert-list-tbody">
          <tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-tertiary);">加载中...</td></tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-top:1px solid var(--border); font-size:12px;">
        <div style="color:var(--text-secondary);">
          共 <span id="cert-total-count">0</span> 条记录 | 第 <span id="cert-current-page">1</span> 页 / 共 <span id="cert-total-pages">1</span> 页
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-secondary" onclick="loadCertificationTable(Math.max(1, parseInt(document.getElementById('cert-current-page').textContent) - 1))">上一页</button>
          <span style="padding:4px 12px; border:1px solid var(--border); border-radius:4px; background:var(--bg);">
            <input type="number" id="cert-page-input" value="1" style="width:40px; text-align:center; border:none; background:transparent; color:var(--text);" min="1"/>
          </span>
          <button class="btn btn-sm btn-secondary" onclick="goToCertPage()">跳转</button>
          <button class="btn btn-sm btn-secondary" onclick="loadCertificationTable(parseInt(document.getElementById('cert-current-page').textContent) + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 审核详情面板 -->
    <div class="card" style="margin-top:24px;" id="cert-detail-card">
      <div class="card-header">
        <span class="card-title">审核详情</span>
      </div>
      <div style="padding:20px; text-align:center; color:var(--text-secondary); font-size:12px;">
        点击表格中的行查看详情
      </div>
    </div>
  `,

  'employee.cert-detail': () => {
    const cert = window.currentCertification;
    if (!cert) {
      return `<div class="page-header"><h1>认证详情</h1></div><div class="empty-state"><div>未找到申请数据</div></div>`;
    }

    const firstLetter = (cert.applicant_name || '-').charAt(0).toUpperCase();
    const applicantMasked = cert.applicant_name || '-';
    const methodLabel = cert.method === 'email' ? '企业邮箱' : cert.method === 'contract' ? '劳动合同' : cert.method === 'tax' ? '个人所得税' : '其他材料';

    return `
      <div style="padding:20px;">
        <button class="btn btn-secondary" onclick="switchPage('employee.certification')" style="margin-bottom:20px;">← 返回列表</button>

        <div style="display:grid; grid-template-columns: 280px 1fr; gap:30px;">
          <!-- 左侧用户卡片 -->
          <div class="card" style="height:fit-content; text-align:center;">
            <div style="width:100px; height:100px; border-radius:50%; background:linear-gradient(135deg, #3370ff, #06b6d4); color:#fff; font-size:40px; font-weight:700; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
              ${firstLetter}
            </div>
            <div style="font-size:18px; font-weight:600; margin-bottom:4px;">${cert.applicant_name}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">昵称：${cert.nickname || '-'}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">LenovoID：${cert.lenovo_id || '-'}</div>

            <div style="border-top:1px solid var(--border); padding-top:12px; font-size:12px;">
              <div style="margin-bottom:8px;">申请时间：${cert.created_at}</div>
              <div style="margin-bottom:8px;">申请类型：${cert.cert_type || '首次申请'}</div>
              <div style="margin-top:8px;">
                <span style="display:inline-block; padding:4px 8px; background:#3370ff08; color:#3370ff; border-radius:3px; font-size:11px;">
                  ${cert.status === 'approved' ? '✓ 认证成功' : cert.status === 'rejected' ? '✗ 认证失败' : '已失效'}
                </span>
              </div>
            </div>
          </div>

          <!-- 右侧信息区 -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <!-- 申请基本信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">申请基本信息</span>
              </div>
              <div style="padding:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:13px;">
                  <div>
                    <div style="color:var(--text-secondary); margin-bottom:4px;">申请编号</div>
                    <div style="font-weight:600;">${cert.id}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); margin-bottom:4px;">申请类型</div>
                    <div>${cert.cert_type || '首次申请'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); margin-bottom:4px;">认证方式</div>
                    <div>${methodLabel}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 用户信息审核 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">用户信息审核</span>
              </div>
              <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                  <div>
                    <div style="font-weight:600;">真实姓名</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${cert.real_name || cert.applicant_name}</div>
                  </div>
                  <div style="color:#34c724; font-size:14px;">✓ 与实名认证信息一致</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
                  <div>
                    <div style="font-weight:600;">企业信息</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${cert.company || '-'}</div>
                  </div>
                  <div style="color:#34c724; font-size:14px;">✓ 已核实</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0;">
                  <div>
                    <div style="font-weight:600;">职位信息</div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${cert.position || '-'}</div>
                  </div>
                  <div style="color:#34c724; font-size:14px;">✓ 已核实</div>
                </div>
              </div>
            </div>

            <!-- 认证材料审核 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">认证材料审核</span>
              </div>
              <div style="padding:20px;">
                <div style="color:var(--text-secondary); font-size:12px; margin-bottom:12px;">已上传材料：</div>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:20px;">
                  <div style="aspect-ratio:1; background:var(--border); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:40px; cursor:pointer; transition:all 0.2s;" onclick="showMaterialPreview('${cert.method}', '📄')" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='var(--border)'">
                    📄
                  </div>
                  <div style="aspect-ratio:1; background:var(--border); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:40px; cursor:pointer; transition:all 0.2s;" onclick="showMaterialPreview('在职证明', '📄')" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='var(--border)'">
                    📄
                  </div>
                </div>

                <div style="color:var(--text-secondary); font-size:12px; margin-bottom:12px;">验证项：</div>
                <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
                  <label><input type="checkbox" checked/> 姓名是否匹配</label>
                  <label><input type="checkbox" checked/> 企业名称是否匹配</label>
                  <label><input type="checkbox" checked/> 有效期是否符合（六个月内）</label>
                  <label><input type="checkbox" checked/> 印章是否清晰</label>
                </div>
              </div>
            </div>

            <!-- 状态修改操作 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">修改认证结果</span>
                <span style="font-size:11px; color:var(--text-tertiary);">仅用于客服人工介入，将认证失败的用户改为认证成功</span>
              </div>
              <div style="padding:20px;">
                <div style="padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; margin-bottom:20px; font-size:12px; color:#b91c1c;">
                  ⚠️ 此操作将直接变更用户认证状态为"认证成功"，请确认已核实用户身份信息。
                </div>

                <div style="margin-bottom:20px;">
                  <label style="display:block; color:var(--text-secondary); font-size:12px; margin-bottom:8px;">操作备注（必填）</label>
                  <textarea id="cert-review-remark" style="width:100%; height:80px; padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--card-bg); color:var(--text); font-size:12px;" placeholder="请说明修改原因，如：用户重新提交了清晰的合同照片"></textarea>
                </div>

                <div style="display:flex; gap:8px;">
                  <button class="btn btn-primary" onclick="submitCertReview('${cert.id}')" style="flex:1; background:#10b981; border:none;">✓ 变更为认证成功</button>
                  <button class="btn btn-secondary" onclick="switchPage('employee.certification')" style="flex:1;">取消</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  'employee.detail': () => {
    const emp = window.currentEmployee;
    if (!emp) {
      return `<div class="page-header"><h1>员工信息</h1></div><div class="empty-state"><div>未找到员工数据</div></div>`;
    }

    const firstLetter = (emp.real_name || '-').charAt(0).toUpperCase();
    const accountMasked = emp.account ? emp.account.slice(0, 2) + '*'.repeat(4) + emp.account.slice(-2) : '-';
    const statusBadgeColor = emp.is_realname?.includes('✓') ? '#34c724' : '#999';

    return `
      <div style="padding:20px;">
        <button class="btn btn-secondary" onclick="switchPage('employee.overview')" style="margin-bottom:20px;">← 返回列表</button>

        <div style="display:grid; grid-template-columns: 280px 1fr; gap:30px;">
          <!-- 左侧用户卡片 -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="card" style="text-align:center; padding:30px 20px;">
              <div style="width:120px; height:120px; border-radius:50%; background:linear-gradient(135deg, #3370ff, #06b6d4); color:#fff; font-size:48px; font-weight:700; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                ${firstLetter}
              </div>
              <div style="font-size:18px; font-weight:600; margin-bottom:4px;">${emp.real_name || '-'}</div>
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">账号: ${accountMasked}</div>
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">LenovoID: ${emp.lenovo_id || '-'}</div>
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">联想账号</div>
              <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <span style="display:inline-block; padding:4px 8px; background:#34c72408; color:#34c724; border-radius:3px; font-size:12px;">✓ 已实名</span>
                <span style="display:inline-block; padding:4px 8px; background:#3370ff08; color:#3370ff; border-radius:3px; font-size:12px;">${emp.dept_status || '-'}</span>
              </div>
            </div>
          </div>

          <!-- 右侧信息区域 -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            <!-- 个人基本信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">个人基本信息</span>
              </div>
              <div style="padding:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">真实姓名</div>
                    <div style="font-size:14px;">${emp.real_name || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">岗位</div>
                    <div style="font-size:14px;">${emp.position || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">关联手机号</div>
                    <div style="font-size:14px;">${emp.phone || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">注册时间</div>
                    <div style="font-size:14px;">${emp.register_time || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">用户类型</div>
                    <div style="font-size:14px;">${emp.user_type || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 会员信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">会员信息</span>
              </div>
              <div style="padding:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">成为企业会员时间</div>
                    <div style="font-size:14px;">${emp.register_time?.split(' ')[0] || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">会员等级</div>
                    <div style="font-size:14px;">
                      <span style="display:inline-block; padding:2px 6px; background:#3370ff08; color:#3370ff; border-radius:3px; font-size:12px;">${emp.member_level || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">企业等级</div>
                    <div style="font-size:14px;">
                      <span style="display:inline-block; padding:2px 6px; background:#f5a62408; color:#f5a624; border-radius:3px; font-size:12px;">黄金会员</span>
                    </div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">激活状态</div>
                    <div style="font-size:14px;">
                      <span style="display:inline-block; padding:2px 6px; background:#34c72408; color:#34c724; border-radius:3px; font-size:12px;">${emp.activation_status || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">黑金VIP</div>
                    <div style="font-size:14px;">${emp.vip_status || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">注册渠道</div>
                    <div style="font-size:14px;">LENOVO_SHOP_PC</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 企业信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">企业信息</span>
              </div>
              <div style="padding:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">所属企业</div>
                    <div style="font-size:14px;">${emp.company_name || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">企业号</div>
                    <div style="font-size:14px;">${emp.company_code || '-'}</div>
                  </div>
                  <div style="grid-column:1/-1;">
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">企业邮箱</div>
                    <div style="font-size:14px;">${emp.email || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 职员认证信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">职员认证信息</span>
              </div>
              <div style="padding:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">职员认证状态</div>
                    <div style="font-size:14px;">
                      <span style="display:inline-block; padding:4px 8px; background:#3370ff08; color:#3370ff; border-radius:3px; font-size:12px;">${emp.dept_status || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">职员认证方式</div>
                    <div style="font-size:14px;">${emp.cert_method || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">认证职员信息时间</div>
                    <div style="font-size:14px;">${emp.cert_start_date || '-'}</div>
                  </div>
                  <div>
                    <div style="color:var(--text-secondary); font-size:12px; margin-bottom:8px;">认证失效时间</div>
                    <div style="font-size:14px;">${emp.cert_end_date || '-'}</div>
                  </div>
                </div>

                <div style="border-top:1px solid var(--border); padding-top:16px;">
                  <div style="color:var(--text-secondary); font-size:12px; margin-bottom:12px;">企业邮箱验证记录</div>
                  <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
                    <div>✓ 邮箱: ${emp.email || '-'}</div>
                    <div>✓ 验证状态: ${emp.cert_verified || '-'}</div>
                    <div>✓ 验证时间: ${emp.cert_start_date || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 认证材料 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">认证材料</span>
              </div>
              <div style="padding:20px;">
                <div style="color:var(--text-secondary); font-size:12px; margin-bottom:12px;">上传的认证材料</div>
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;">
                  <div style="aspect-ratio:1; background:var(--border); border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='var(--border)'" onclick="showMaterialPreview('劳动合同', '📄')">
                    📄 劳动合同
                  </div>
                  <div style="aspect-ratio:1; background:var(--border); border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='var(--border)'" onclick="showMaterialPreview('在职证明', '📄')">
                    📄 在职证明
                  </div>
                </div>
                <div style="color:var(--text-secondary); font-size:12px; margin-top:12px;">点击图围可查看大图</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
};

function ovTimeRangeChanged(val) {
  leaiSetOverviewRange(val);
}
