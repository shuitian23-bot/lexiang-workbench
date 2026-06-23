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

function renderPortalHomePage() {
  return `
    <div class="portal-home portal-home-v2">
      <section class="portal-home-command portal-home-command-solo">
        <div class="portal-home-command-copy">
          <div class="portal-home-kicker">LEAIBOT WORKBENCH</div>
          <div class="page-title">门户工作台</div>
          <div class="page-desc">统一承载运营看板、业务后台、风险审核与 AI 助手能力，让团队在一个入口完成查询、分析、处理和协作。</div>
          <div class="portal-home-actions">
            <button class="btn btn-secondary" onclick="openSkillManagerOverlay()">管理技能包</button>
            <button class="btn btn-primary" onclick="openSkillCreatePage()">创建 Skill</button>
          </div>
        </div>
      </section>

      <div class="portal-home-grid portal-home-spotlight">
        <button class="portal-home-card" onclick="toggleAI(true)">
          <span>AI</span>
          <b>全局 AI 助手</b>
          <p>右侧助手独立存在，可用自然语言发起数据查询、报告生成、知识维护、商品配置等任务。</p>
        </button>
        <button class="portal-home-card" onclick="switchPage('dashboard.overview')">
          <span>OP</span>
          <b>运营分析</b>
          <p>聚合乐享运营、Query、质量、流量和 GMV 数据，支持按业务视角查看趋势和异常。</p>
        </button>
        <button class="portal-home-card" onclick="openSkillCreatePage()">
          <span>PM</span>
          <b>Skill 创建</b>
          <p>平台侧和 PM 可从账号入口创建 Skill，并在 Skill Hub 中跟踪提交、审批、启停和发布状态。</p>
        </button>
        <button class="portal-home-card" onclick="openSkillManagerOverlay()">
          <span>SK</span>
          <b>技能包管理</b>
          <p>业务用户通过右上角管理技能查看可用技能包、申请权限，并通过 AI 助手调用。</p>
        </button>
      </div>

      <div class="portal-home-layout portal-home-workgrid">
        <div class="card portal-home-entry-card">
          <div class="card-header">
            <div class="card-title">常用入口</div>
            <button class="btn btn-secondary btn-sm" onclick="switchPage('dashboard.overview')">进入运营总览</button>
          </div>
          <div class="portal-home-entry-list">
            <button onclick="switchPage('employee.overview')"><i>01</i><b>在职员工管理</b><span>认证审核、职工数据、认证方式分布</span></button>
            <button onclick="switchPage('dashboard.overview')"><i>02</i><b>乐享运营</b><span>经营指标、流量质量、GMV 分析</span></button>
            <button onclick="switchPage('lead.dashboard')"><i>03</i><b>企业客户管理</b><span>线索看板、线索池和分配跟进</span></button>
            <button onclick="switchPage('search.categories')"><i>04</i><b>搜索后台</b><span>分类标签、筛选、直达和词典管理</span></button>
            <button onclick="switchPage('risk.overview')"><i>05</i><b>风控管理</b><span>策略、限购、DPL 和数据查询</span></button>
          </div>
        </div>

        <div class="card portal-home-flow-card">
          <div class="card-header"><div class="card-title">基础操作流程</div></div>
          <div class="portal-home-flow">
            <div><span>1</span><p>从左侧菜单进入确定性的后台页面，完成固定流程和人工审核。</p></div>
            <div><span>2</span><p>在右侧 AI 助手输入任务，补充查询、分析、生成和配置类工作。</p></div>
            <div><span>3</span><p>涉及写入、发布、导出等高影响操作时，先展示影响范围，再确认执行并留下任务记录。</p></div>
            <div><span>4</span><p>PM 从左下角账号入口进入 Skill Hub 管理提交状态；业务从右上角管理技能使用技能包。</p></div>
          </div>
        </div>
      </div>
    </div>
  `;
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
  if (status === 'available') {
    aiQuick(`使用${title}。请基于当前页面上下文识别任务目标，并询问我还缺哪些必要参数；涉及写入或发布时必须先二次确认。`);
    closeSkillManagerOverlay();
    return;
  }
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
    requestable: '申请技能包',
    pending: '查看审批进度',
    disabled: '查看禁用原因',
    admin: '查看配置说明'
  }[status] || '查看详情';
  const body = {
    requestable: `
      <div class="skill-action-row"><span>申请人</span><input value="${STATE.user || 'admin'}" readonly></div>
      <div class="skill-action-row"><span>申请场景</span><textarea placeholder="例如：用于每周活动复盘，需要查看渠道表现和优化建议"></textarea></div>
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

const PM_SKILL_HUB_ITEMS = [
  { name: 'workplace-cert-analysis', platform: 'lexiang', desc: '职场认证数据分析 Skill，支持认证方式分布、通过率趋势、失败原因和待审核积压分析。', version: 'v1.0.0', online: '未发布', status: 'draft', statusText: '草稿', category: '数据查询', tags: ['认证', '统计'], owner: 'admin', updated: '2026-06-10 14:20' },
  { name: 'low-stock-auto-offline', platform: 'lexiang', desc: '低库存自动下架 Skill，根据库存阈值和活动排除条件生成下架建议。', version: 'v0.3.0', online: '未发布', status: 'review', statusText: '待审批', category: '商品运营', tags: ['库存', '商品'], owner: 'admin', updated: '2026-06-10 11:36' },
  { name: 'product-knowledge', platform: 'lexiang', desc: '识别用户产品知识查询需求，返回配置参数、性能差异和可选机型说明。', version: 'v1.0.7', online: 'v1.0.7', status: 'published', statusText: '已发布', category: '知识问答', tags: ['查询', '商品', '+2'], owner: 'product-pm', updated: '2026-06-06 18:42' },
  { name: 'voucher-recommend', platform: 'lexiang', desc: '识别虚拟品充值、会员充值和券包权益推荐需求，输出推荐卡片。', version: 'v0.1.3', online: 'v0.1.3', status: 'published', statusText: '已发布', category: '权益推荐', tags: ['权益', '推荐'], owner: 'growth-pm', updated: '2026-06-06 12:13' },
  { name: 'driver-download-guide', platform: 'lexiang', desc: '联想驱动下载指导 Skill，支持驱动查询、版本差异对比和安装说明生成。', version: 'v1.0.0', online: '未发布', status: 'review', statusText: '待审批', category: '服务支持', tags: ['下载', '驱动'], owner: 'service-pm', updated: '2026-06-05 16:45' },
  { name: 'lenovo-order-detail-query', platform: 'lexiang,aiadmin', desc: '联想商城订单明细查询助手，支持自然语言查询订单状态和售后发货信息。', version: 'v1.0.0', online: '未发布', status: 'approved', statusText: '已审批', category: '订单服务', tags: ['订单'], owner: 'ops-pm', updated: '2026-06-02 17:15' },
  { name: 'weather-query', platform: 'lexiang', desc: '根据用户指定地点查询实时天气数据，支持默认城市和运营活动场景。', version: 'v1.0.0', online: '未发布', status: 'disabled', statusText: '已禁用', category: '工具服务', tags: ['工具'], owner: 'admin', updated: '2026-06-02 11:16' }
];

let skillHubEvaluationTimer = null;

function getSkillHubRole() {
  return (typeof STATE !== 'undefined' && STATE.permissions?.includes('*')) ? 'admin' : 'pm';
}

function skillHubStatusLabel(status) {
  return {
    draft: '草稿',
    review: '待审批',
    approved: '已审批',
    published: '已发布',
    disabled: '已禁用',
    rejected: '已驳回'
  }[status] || status;
}

function renderSkillHubActions(item, role) {
  const pmActions = {
    draft: ['提交审核', '编辑', '测试', '删除'],
    review: ['查看', '撤回', '测试'],
    approved: ['发布', '编辑', '测试'],
    published: ['禁用', '编辑', '测试'],
    disabled: ['启用', '编辑', '测试'],
    rejected: ['查看', '编辑', '测试']
  };
  const adminActions = {
    draft: ['查看', '编辑'],
    review: ['审批', '驳回', '查看', '测试'],
    approved: ['发布', '禁用', '查看'],
    published: ['禁用', '查看', '测试'],
    disabled: ['启用', '查看'],
    rejected: ['查看', '编辑']
  };
  const actions = (role === 'admin' ? adminActions : pmActions)[item.status] || ['查看'];
  return actions.map(action => {
    const tone = action === '删除' || action === '驳回' ? 'danger' : action === '审批' || action === '发布' || action === '启用' ? 'success' : action === '提交审核' ? 'warning' : 'normal';
    return `<button class="skill-hub-action ${tone}" onclick="handleSkillHubAction('${item.name}', '${action}')">${action}</button>`;
  }).join('');
}

function handleSkillHubAction(name, action) {
  if (action === '查看') {
    openSkillHubDetail(name);
    return;
  }
  if (['发布', '禁用', '审批', '驳回'].includes(action)) {
    openSkillHubConfirm(name, action);
    return;
  }
  if (action === '测试') {
    openSkillHubEvaluation(name);
    return;
  }
  if (action === '审批') {
    updateSkillHubReviewStatus(name, 'approved');
    return;
  }
  if (action === '驳回') {
    updateSkillHubReviewStatus(name, 'rejected');
    return;
  }
  const toast = document.createElement('div');
  toast.className = 'skill-hub-toast';
  toast.textContent = `${name}：${action}操作已记录`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 1800);
}

function skillHubToast(message) {
  const toast = document.createElement('div');
  toast.className = 'skill-hub-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 1800);
}

function getSkillHubItem(name) {
  return PM_SKILL_HUB_ITEMS.find(item => item.name === name);
}

function closeSkillHubDetail() {
  document.getElementById('skill-hub-detail-modal')?.classList.remove('open');
}

function closeSkillHubConfirm() {
  document.getElementById('skill-hub-confirm-modal')?.classList.remove('open');
}

function closeSkillHubEvaluation() {
  if (skillHubEvaluationTimer) {
    clearTimeout(skillHubEvaluationTimer);
    skillHubEvaluationTimer = null;
  }
  document.getElementById('skill-hub-eval-modal')?.classList.remove('open');
}

function getSkillHubConfirmMeta(action) {
  return {
    发布: {
      title: '确认发布 Skill',
      desc: '发布后该 Skill 将进入线上可用状态，业务用户可在授权范围内调用。',
      confirmText: '确认发布',
      tone: 'success'
    },
    禁用: {
      title: '确认禁用 Skill',
      desc: '禁用后该 Skill 将暂不可用，已配置的调用入口会停止响应。',
      confirmText: '确认禁用',
      tone: 'danger'
    },
    审批: {
      title: '确认审批通过',
      desc: '审批通过后该 Skill 可进入后续发布或上传流程。',
      confirmText: '审批通过',
      tone: 'success'
    },
    驳回: {
      title: '确认驳回 Skill',
      desc: '驳回后提交人需要补充材料、业务边界或测试用例后重新提交。',
      confirmText: '确认驳回',
      tone: 'danger'
    }
  }[action] || {
    title: `确认${action}`,
    desc: '该操作会改变 Skill 当前状态，请确认后继续。',
    confirmText: '确认',
    tone: 'normal'
  };
}

function openSkillHubConfirm(name, action) {
  const item = getSkillHubItem(name);
  if (!item) {
    skillHubToast(`${name}：未找到 Skill 信息`);
    return;
  }
  const meta = getSkillHubConfirmMeta(action);
  let overlay = document.getElementById('skill-hub-confirm-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'skill-hub-confirm-modal';
    overlay.className = 'skill-hub-confirm-modal';
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSkillHubConfirm();
    });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="skill-hub-confirm-panel" role="dialog" aria-label="${meta.title}">
      <div class="skill-hub-confirm-head">
        <h3>${meta.title}</h3>
        <button type="button" class="skill-hub-confirm-close" onclick="closeSkillHubConfirm()" aria-label="关闭">×</button>
      </div>
      <div class="skill-hub-confirm-body">
        <p>${meta.desc}</p>
        <div class="skill-hub-confirm-info">
          <span>Skill</span><b>${item.name}</b>
          <span>当前状态</span><b>${item.statusText}</b>
          <span>当前版本</span><b>${item.version}</b>
          <span>绑定平台</span><b>${item.platform}</b>
        </div>
      </div>
      <div class="skill-hub-confirm-foot">
        <button class="btn btn-secondary" onclick="closeSkillHubConfirm()">取消</button>
        <button class="btn ${meta.tone === 'danger' ? 'btn-danger' : 'btn-primary'}" onclick="confirmSkillHubAction('${item.name}', '${action}')">${meta.confirmText}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function confirmSkillHubAction(name, action) {
  closeSkillHubConfirm();
  if (action === '审批') {
    updateSkillHubReviewStatus(name, 'approved');
    return;
  }
  if (action === '驳回') {
    updateSkillHubReviewStatus(name, 'rejected');
    return;
  }
  updateSkillHubLifecycleStatus(name, action);
}

function openSkillHubDetail(name) {
  const item = getSkillHubItem(name);
  if (!item) {
    skillHubToast(`${name}：未找到 Skill 信息`);
    return;
  }
  let overlay = document.getElementById('skill-hub-detail-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'skill-hub-detail-modal';
    overlay.className = 'skill-hub-detail-modal';
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSkillHubDetail();
    });
    document.body.appendChild(overlay);
  }
  const role = getSkillHubRole();
  const canReview = role === 'admin' && item.status === 'review';
  const itemIndex = PM_SKILL_HUB_ITEMS.indexOf(item);
  const detail = {
    id: item.id || String(14 + Math.max(itemIndex, 0)),
    skillName: item.name,
    currentVersion: item.version,
    status: `<em class="skill-hub-status status-${item.status}">${item.statusText}</em>`,
    author: item.author || item.owner || '-',
    submitter: item.submitter || item.owner || '-',
    desc: item.desc || '-',
    submitNote: item.submitNote || `同步技能：${item.name}`,
    reviewer: item.reviewer || (['approved', 'published'].includes(item.status) ? 'admin' : '-'),
    reviewTime: item.reviewTime || (['approved', 'published'].includes(item.status) ? item.updated : '-'),
    reviewNote: item.reviewNote || '-',
    created: item.created || item.updated || '-',
    updated: item.updated || '-'
  };
  const historyRows = (item.history || []).length
    ? item.history.map(row => `<tr><td>${row.version}</td><td>${row.status}</td><td>${row.operator}</td><td>${row.time}</td><td>${row.note}</td></tr>`).join('')
    : `<tr><td colspan="5" class="skill-hub-detail-empty">暂无历史记录</td></tr>`;
  overlay.innerHTML = `
    <div class="skill-hub-detail-panel" role="dialog" aria-label="Skill 详情">
      <div class="skill-hub-detail-head">
        <h3>Skill 详情</h3>
        <button type="button" class="skill-hub-detail-close" onclick="closeSkillHubDetail()" aria-label="关闭">×</button>
      </div>
      <div class="skill-hub-detail-body">
        <table class="skill-hub-detail-table">
          <tbody>
            <tr>
              <th>ID</th><td>${detail.id}</td>
              <th>Skill 名称</th><td>${detail.skillName}</td>
            </tr>
            <tr>
              <th>当前版本</th><td>${detail.currentVersion}</td>
              <th>状态</th><td>${detail.status}</td>
            </tr>
            <tr>
              <th>作者</th><td>${detail.author}</td>
              <th>提交人</th><td>${detail.submitter}</td>
            </tr>
            <tr>
              <th>绑定平台</th><td>${item.platform}</td>
              <th>所属菜单</th><td>${item.category}</td>
            </tr>
            <tr>
              <th>描述</th><td colspan="3">${detail.desc}</td>
            </tr>
            <tr>
              <th>提交备注</th><td colspan="3">${detail.submitNote}</td>
            </tr>
            <tr>
              <th>审批人</th><td>${detail.reviewer}</td>
              <th>审批时间</th><td>${detail.reviewTime}</td>
            </tr>
            <tr>
              <th>审批备注</th><td colspan="3">${detail.reviewNote}</td>
            </tr>
            <tr>
              <th>创建时间</th><td>${detail.created}</td>
              <th>更新时间</th><td>${detail.updated}</td>
            </tr>
            <tr>
              <th>标签</th><td colspan="3" class="skill-hub-detail-tags">${item.tags.map(tag => `<i>${tag}</i>`).join('')}</td>
            </tr>
          </tbody>
        </table>
        <div class="skill-hub-detail-history">
          <b>历史版本记录</b>
          <table>
            <thead><tr><th>版本</th><th>状态</th><th>操作人</th><th>时间</th><th>备注</th></tr></thead>
            <tbody>${historyRows}</tbody>
          </table>
        </div>
      </div>
      <div class="skill-hub-detail-foot">
        <button class="btn btn-secondary" onclick="closeSkillHubDetail()">关闭</button>
        ${canReview ? `
          <button class="btn btn-danger" onclick="updateSkillHubReviewStatus('${item.name}', 'rejected')">驳回</button>
          <button class="btn btn-primary" onclick="updateSkillHubReviewStatus('${item.name}', 'approved')">审批通过</button>
        ` : ''}
      </div>
    </div>`;
  overlay.classList.add('open');
}

function openSkillHubEvaluation(name) {
  const item = getSkillHubItem(name);
  if (!item) {
    skillHubToast(`${name}：未找到 Skill 信息`);
    return;
  }
  let overlay = document.getElementById('skill-hub-eval-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'skill-hub-eval-modal';
    overlay.className = 'skill-hub-eval-modal';
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSkillHubEvaluation();
    });
    document.body.appendChild(overlay);
  }
  if (skillHubEvaluationTimer) clearTimeout(skillHubEvaluationTimer);
  overlay.innerHTML = `
    <div class="skill-hub-eval-panel running" role="dialog" aria-label="评估验证">
      <div class="skill-hub-eval-head">
        <div>
          <h3>评估验证</h3>
          <p>${item.name} · 由 Skill Hub 重新触发 · 正在执行评估</p>
        </div>
        <button type="button" class="skill-hub-detail-close" onclick="closeSkillHubEvaluation()" aria-label="关闭">×</button>
      </div>
      <div class="skill-hub-eval-running">
        <div class="skill-eval-spinner" aria-hidden="true"></div>
        <div>
          <b>正在重新触发评估</b>
          <p>系统正在读取当前 Skill 草稿、测试用例和权限配置，重新计算静态评分、结果评分、过程评分和效率评分。</p>
        </div>
        <ol>
          <li class="active"><span></span>加载 Skill 配置</li>
          <li class="active"><span></span>执行测试用例</li>
          <li><span></span>汇总评估结果</li>
          <li><span></span>生成审批建议</li>
        </ol>
      </div>
    </div>`;
  overlay.classList.add('open');
  skillHubEvaluationTimer = setTimeout(() => renderSkillHubEvaluationResult(item), 900);
}

function renderSkillHubEvaluationResult(item) {
  skillHubEvaluationTimer = null;
  const overlay = document.getElementById('skill-hub-eval-modal');
  if (!overlay) return;
  const canReview = getSkillHubRole() === 'admin' && item.status === 'review';
  overlay.innerHTML = `
    <div class="skill-hub-eval-panel ready" role="dialog" aria-label="评估验证">
      <div class="skill-hub-eval-head">
        <div>
          <h3>评估验证</h3>
          <p>${item.name} · 由 Skill Hub 重新触发 · 第 1 轮（最多 5 轮）</p>
        </div>
        <button type="button" class="skill-hub-detail-close" onclick="closeSkillHubEvaluation()" aria-label="关闭">×</button>
      </div>
      <div class="skill-hub-eval-body">
        <div class="skill-score-grid">
          <div class="skill-score-card"><span>静态评分</span><b>0.872</b><i style="--score:87.2%"></i></div>
          <div class="skill-score-card"><span>结果评分</span><b>0.846</b><i style="--score:84.6%"></i></div>
          <div class="skill-score-card"><span>过程评分</span><b>0.831</b><i style="--score:83.1%"></i></div>
          <div class="skill-score-card"><span>效率评分</span><b>0.888</b><i style="--score:88.8%"></i></div>
          <div class="skill-score-card featured pass"><span>综合评分</span><b>0.859</b><i style="--score:85.9%"></i><em>已达及格线 0.80</em></div>
        </div>
        <div class="skill-eval-pass">
          <b>评估通过</b>
          <span>综合评分 0.859，已达到提交审核门槛。可提交审核，等待管理员审批后再进入上传或发布链路。</span>
        </div>
        <div class="skill-eval-table">
          <div><span>PASS</span><b>基本信息规范</b><em>1.00</em></div>
          <div><span>PASS</span><b>流程步骤清晰</b><em>1.00</em></div>
          <div><span>PASS</span><b>异常处理完善</b><small>已覆盖无数据、字段缺失、权限不足时的兜底话术</small><em>0.90</em></div>
          <div><span>PASS</span><b>关键节点确认</b><small>导出 CSV、定时报告、异常提醒前均有确认节点</small><em>0.86</em></div>
          <div><span>PASS</span><b>指令具体明确</b><em>1.00</em></div>
          <div><span>PASS</span><b>资源引用有效</b><em>1.00</em></div>
          <div><span>PASS</span><b>平台适配合规</b><em>1.00</em></div>
          <div><span>PASS</span><b>测试用例充分</b><em>1.00</em></div>
        </div>
        <div class="skill-eval-summary">
          <div>
            <b>评估结论</b>
            <p>核心风险已补齐，可提交审核。后续优化可继续补充更多真实失败样例。</p>
          </div>
          <button class="btn btn-secondary" onclick="skillHubToast('${item.name}：已同步评估结论到需求澄清')">同步到需求澄清</button>
        </div>
        <div class="skill-eval-suggestions">
          <div><span>1</span><b>异常处理规则已补齐</b><p>已增加无数据、字段缺失、接口失败、权限不足时的回复模板。</p></div>
          <div><span>2</span><b>关键节点确认已配置</b><p>导出 CSV、开启定时报告、发送异常提醒前，都会先展示范围、对象和影响。</p></div>
          <div><span>3</span><b>失败 case 已覆盖</b><p>已新增权限不足、企业名称为空、个税认证数据缺失、失败原因字段异常等测试样例。</p></div>
        </div>
      </div>
      <div class="skill-hub-detail-foot">
        <button class="btn btn-secondary" onclick="closeSkillHubEvaluation()">关闭</button>
        ${canReview ? `
          <button class="btn btn-danger" onclick="updateSkillHubReviewStatus('${item.name}', 'rejected'); closeSkillHubEvaluation();">驳回</button>
          <button class="btn btn-primary" onclick="updateSkillHubReviewStatus('${item.name}', 'approved'); closeSkillHubEvaluation();">审批通过</button>
        ` : ''}
      </div>
    </div>`;
  overlay.classList.add('open');
}

function updateSkillHubLifecycleStatus(name, action) {
  const item = getSkillHubItem(name);
  if (!item) {
    skillHubToast(`${name}：未找到 Skill 信息`);
    return;
  }
  if (action === '发布') {
    item.status = 'published';
    item.statusText = '已发布';
    item.online = item.version;
    item.updated = '2026-06-11 19:10';
    skillHubToast(`${name}：已发布`);
  } else if (action === '禁用') {
    item.status = 'disabled';
    item.statusText = '已禁用';
    item.updated = '2026-06-11 19:10';
    skillHubToast(`${name}：已禁用`);
  } else {
    skillHubToast(`${name}：${action}操作已记录`);
  }
  if (STATE?.currentPage === 'agent.skills') renderPage('agent.skills');
}

function updateSkillHubReviewStatus(name, nextStatus) {
  const item = getSkillHubItem(name);
  if (!item) {
    skillHubToast(`${name}：未找到 Skill 信息`);
    return;
  }
  if (nextStatus === 'approved') {
    item.status = 'approved';
    item.statusText = '已审批';
    item.reviewer = STATE?.user || 'admin';
    item.reviewTime = '2026-06-11 18:45';
    item.reviewNote = '审批通过，允许后续发布或启用。';
    item.updated = '2026-06-11 18:45';
    closeSkillHubDetail();
    if (STATE?.currentPage === 'agent.skills') renderPage('agent.skills');
    skillHubToast(`${name}：审批通过`);
    return;
  }
  if (nextStatus === 'rejected') {
    item.status = 'rejected';
    item.statusText = '已驳回';
    item.reviewer = STATE?.user || 'admin';
    item.reviewTime = '2026-06-11 18:45';
    item.reviewNote = '驳回：请补充业务边界、测试用例或审批材料后重新提交。';
    item.updated = '2026-06-11 18:45';
    closeSkillHubDetail();
    if (STATE?.currentPage === 'agent.skills') renderPage('agent.skills');
    skillHubToast(`${name}：已驳回`);
  }
}

function submitSkillCreateReview() {
  if (window.__skillCreateReviewSubmitted) {
    handleSkillHubAction('workplace-cert-analysis', '已在审核中，可前往 Skill Hub 查看');
    return;
  }
  const skillName = (document.getElementById('skill-create-name')?.value || '职场人群认证数据分析').trim();
  const menuName = document.getElementById('skill-create-menu')?.value || '在职员工管理';
  const existing = PM_SKILL_HUB_ITEMS.find(item => item.name === 'workplace-cert-analysis');
  const submitted = {
    name: 'workplace-cert-analysis',
    platform: 'lexiang',
    desc: `${skillName} Skill，归属${menuName}，支持认证方式分布、通过率趋势、失败原因和待审核积压分析。`,
    version: 'v1.0.0',
    online: '未发布',
    status: 'review',
    statusText: '待审批',
    category: '数据查询',
    tags: ['认证', '统计'],
    owner: STATE?.user || 'admin',
    updated: '2026-06-11 18:30'
  };
  if (existing) {
    Object.assign(existing, submitted);
  } else {
    PM_SKILL_HUB_ITEMS.unshift(submitted);
  }
  window.__skillCreateReviewSubmitted = true;
  const submitBtn = document.getElementById('skill-create-submit-review-btn');
  if (submitBtn) {
    submitBtn.textContent = '已提交审核';
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
  }
  const reviewStatus = document.getElementById('skill-create-review-status');
  if (reviewStatus) reviewStatus.textContent = '已提交审核，当前 Skill Hub 状态为待审批';
  handleSkillHubAction(submitted.name, '已提交审核，等待管理员审批');
}

function filterSkillHub() {
  const keyword = (document.getElementById('skill-hub-search')?.value || '').trim().toLowerCase();
  const status = document.getElementById('skill-hub-status')?.value || 'all';
  const category = document.getElementById('skill-hub-category')?.value || 'all';
  const tag = document.getElementById('skill-hub-tag')?.value || 'all';
  document.querySelectorAll('.skill-hub-row').forEach(row => {
    const matchKeyword = !keyword || row.textContent.toLowerCase().includes(keyword);
    const matchStatus = status === 'all' || row.dataset.status === status;
    const matchCategory = category === 'all' || row.dataset.category === category;
    const matchTag = tag === 'all' || row.dataset.tags.split(',').includes(tag);
    row.style.display = matchKeyword && matchStatus && matchCategory && matchTag ? '' : 'none';
  });
}

function renderAgentSkillsManager(options = {}) {
  const isModal = options.mode === 'modal';
  const skills = [
    { icon: 'metrics', title: '经营指标解读', status: 'available', badge: '可用', desc: '读取当前看板上下文，输出指标结论、异常证据、原因推测和下一步运营动作。', tags: ['数据分析', '运营总览'], usage: '2.1k 次使用', action: '使用' },
    { icon: 'product', title: '商品配置助手', status: 'available', badge: '可用', desc: '协助检查商品卡片、推荐位、价格和上下架配置，写入前必须二次确认。', tags: ['商品运营', '配置'], usage: '860 次使用', action: '使用' },
    { icon: 'content', title: '内容发布检查', status: 'available', badge: '可用', desc: '检查 CMS 内容、活动页文案、跳转链接和发布前风险项。', tags: ['内容运营', '质量巡检'], usage: '748 次使用', action: '使用' },
    { icon: 'review', title: '活动复盘报告', status: 'requestable', badge: '可申请', desc: '基于活动周期数据生成复盘框架，包含目标达成、渠道表现和优化建议。', tags: ['活动运营', '报告'], usage: '申请后可用', action: '申请' },
    { icon: 'member', title: '会员分层洞察', status: 'requestable', badge: '可申请', desc: '分析会员分层、权益使用和认证转化表现，辅助制定运营策略。', tags: ['用户/会员', '分析'], usage: '申请后可用', action: '申请' },
    { icon: 'export', title: '认证失败用户导出', status: 'pending', badge: '待审批', desc: '导出认证失败用户和失败原因，用于客服回访和运营复盘。', tags: ['用户/会员', '数据导出'], usage: '申请已提交', action: '查看进度' },
    { icon: 'release', title: '灰度发布助手', status: 'disabled', badge: '已禁用', desc: '用于灰度发布和回滚演练，当前因权限策略调整暂不可用。', tags: ['平台配置', '发布'], usage: '管理员已停用', action: '查看原因' },
    { icon: 'risk', title: '发布风险确认', status: 'admin', badge: '管理员配置', desc: '对写入、发布、批量导出等高风险操作进行确认和留痕。', tags: ['平台配置', '权限'], usage: '管理员可配置', action: '查看' },
    { icon: 'inspect', title: '链路巡检', status: 'requestable', badge: '可申请', desc: '巡检页面链接、接口响应、埋点和数据缺失，输出异常清单。', tags: ['质量巡检', '平台操作'], usage: '申请后可用', action: '申请' }
  ];
  const skillIconSvg = paths => `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const skillIcons = {
    metrics: skillIconSvg('<path d="M4 15.8V9.4"/><path d="M10 15.8V4.2"/><path d="M16 15.8v-8"/><path d="M3.4 16.2h13.2"/>'),
    product: skillIconSvg('<path d="M10 3.2 16 6.5v7L10 16.8 4 13.5v-7l6-3.3Z"/><path d="m4.4 6.7 5.6 3.1 5.6-3.1"/><path d="M10 9.8v6.6"/>'),
    content: skillIconSvg('<path d="M5.2 3.2h6l3.6 3.6v10H5.2z"/><path d="M11.2 3.2v3.6h3.6"/><path d="m7.5 12 1.5 1.5 3.5-4"/>'),
    review: skillIconSvg('<circle cx="10" cy="10" r="6.2"/><circle cx="10" cy="10" r="2.6"/><path d="M10 3.8V2.6M10 17.4v-1.2M16.2 10h1.2M2.6 10h1.2"/>'),
    member: skillIconSvg('<path d="M8 9a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 8 9Z"/><path d="M3.6 16c.4-2.5 2-3.8 4.4-3.8s4 1.3 4.4 3.8"/><path d="M13.4 8.6a2.1 2.1 0 1 0 0-4.2"/><path d="M13.8 12.1c1.7.3 2.8 1.5 3.1 3.5"/>'),
    export: skillIconSvg('<path d="M5.5 3.2h6l3 3v10.6h-9z"/><path d="M11.5 3.2v3h3"/><path d="M10 8.7v5"/><path d="m7.9 11.7 2.1 2.1 2.1-2.1"/><path d="M7.5 16h5"/>'),
    release: skillIconSvg('<path d="M5.5 4.5h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.7 4.5V2.8M12.3 4.5V2.8"/><path d="M8 12.2c1.4.8 2.7.8 4 0"/>'),
    risk: skillIconSvg('<path d="M10 2.8 15.8 5v4.2c0 3.6-2.2 6.5-5.8 8-3.6-1.5-5.8-4.4-5.8-8V5L10 2.8Z"/><path d="M10 6.8v4.2"/><path d="M10 14h.01"/>'),
    inspect: skillIconSvg('<path d="M8.8 13.6a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6Z"/><path d="m12.4 12.4 3.7 3.7"/><path d="M6.5 8.8h4.6M8.8 6.5v4.6"/>')
  };
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
        <div class="agent-skill-card-main">
          <div class="agent-skill-card-icon">${skillIcons[s.icon] || skillIcons.metrics}</div>
          <div class="agent-skill-card-title">
            <span class="agent-skill-card-name">${s.title}</span>
            <span class="agent-skill-card-badge status-${s.status}">${s.badge}</span>
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
    : `<button class="btn btn-secondary" onclick="goPortalHome()">返回工作台</button>`;
  if (isModal) {
    return `
      <div class="agent-skill-modal-panel" role="dialog" aria-label="技能包管理">
        <div class="page-header agent-skill-modal-head">
          <div>
            <div class="page-title">技能包管理</div>
            <div class="page-desc">面向业务使用的技能包入口。业务用户可使用、申请或查看审批进度。</div>
          </div>
          <div class="agent-skill-page-actions">${headerActions}</div>
        </div>
        <div class="skill-page-shell">
          <div class="skill-page-summary skill-summary-group active" data-summary-view="packages">
            <button class="skill-summary-card" onclick="filterSkillSummary('package', 'available', this)"><strong>${statusMeta.available.count}</strong><span>可用技能包</span></button>
            <button class="skill-summary-card" onclick="filterSkillSummary('package', 'requestable', this)"><strong>${statusMeta.requestable.count}</strong><span>可申请</span></button>
            <button class="skill-summary-card" onclick="filterSkillSummary('package', 'pending', this)"><strong>${statusMeta.pending.count}</strong><span>待审批</span></button>
            <button class="skill-summary-card" onclick="filterSkillSummary('package', 'disabled,admin', this)"><strong>${statusMeta.disabled.count + statusMeta.admin.count}</strong><span>禁用/配置</span></button>
          </div>
          <div class="skill-page-toolbar">
            <div class="skill-page-tabs">${tabs}</div>
            <div class="skill-page-toolbar-actions">
              <button class="btn btn-primary skill-package-only-action" onclick="openSkillPackageAction('新技能包申请', 'requestable', '申请')">申请技能包</button>
              <input class="skill-page-search" placeholder="搜索技能包名称、分类或用途" oninput="searchSkillCards(this.value)">
            </div>
          </div>
          <div class="skill-manager-section active" data-skill-view="packages">
            <div id="skill-package-action-panel" class="skill-package-action-panel"></div>
            <div class="skill-page-grid">${skills.map(card).join('')}</div>
            <div class="skill-page-empty-note">技能包面向运营、业务和销售使用，一个技能包可以编排多个底层 Skill 能力，并通过右侧 AI 助手自然语言调用。</div>
          </div>
          <div class="skill-page-empty" id="skill-page-empty" style="display:none;">当前筛选下暂无技能包</div>
        </div>
      </div>`;
  }
  const role = getSkillHubRole();
  const statusOptions = ['draft', 'review', 'approved', 'published', 'disabled', 'rejected']
    .map(status => `<option value="${status}">${skillHubStatusLabel(status)}</option>`).join('');
  const categories = [...new Set(PM_SKILL_HUB_ITEMS.map(item => item.category))]
    .map(category => `<option value="${category}">${category}</option>`).join('');
  const tags = [...new Set(PM_SKILL_HUB_ITEMS.flatMap(item => item.tags.map(tag => tag.replace(/^\+/, ''))))]
    .filter(tag => !/^\d+$/.test(tag))
    .map(tag => `<option value="${tag}">${tag}</option>`).join('');
  const ownCount = PM_SKILL_HUB_ITEMS.filter(item => item.owner === (STATE.user || 'admin')).length;
  const reviewCount = PM_SKILL_HUB_ITEMS.filter(item => item.status === 'review').length;
  const publishedCount = PM_SKILL_HUB_ITEMS.filter(item => item.status === 'published').length;
  const disabledCount = PM_SKILL_HUB_ITEMS.filter(item => item.status === 'disabled').length;
  const rows = PM_SKILL_HUB_ITEMS.map(item => `
    <tr class="skill-hub-row" data-status="${item.status}" data-category="${item.category}" data-tags="${item.tags.map(tag => tag.replace(/^\+/, '')).join(',')}">
      <td>
        <div class="skill-hub-name"><span class="skill-hub-doc-icon">▤</span><strong>${item.name}</strong></div>
      </td>
      <td>${item.platform}</td>
      <td><div class="skill-hub-desc">${item.desc}</div></td>
      <td><span class="skill-hub-version">${item.version}</span></td>
      <td><span class="skill-hub-online ${item.online === '未发布' ? 'empty' : ''}">${item.online}</span></td>
      <td><span class="skill-hub-status status-${item.status}">${item.statusText}</span></td>
      <td><div class="skill-hub-tags">${item.tags.map(tag => `<span>${tag}</span>`).join('')}</div></td>
      <td>${item.updated}</td>
      <td><div class="skill-hub-actions">${renderSkillHubActions(item, role)}</div></td>
    </tr>`).join('');
  return `
    <div class="skill-hub-page" role="region" aria-label="Skill Hub">
      <div class="page-header">
        <div>
          <div class="page-title">Skill Hub</div>
          <div class="page-desc">${role === 'admin' ? '管理员可审批、发布、启用或禁用 Skill；PM 可查看自己提交的 Skill 状态。' : 'PM 查看自己提交的 Skill 状态，并对自己的 Skill 执行提交审核、编辑、测试、启用或禁用。'}</div>
        </div>
        <div class="agent-skill-page-actions">
          <button class="btn btn-primary" onclick="openSkillCreatePage()">创建 Skill</button>
          ${headerActions}
        </div>
      </div>

      <div class="skill-hub-summary">
        <div><strong>${PM_SKILL_HUB_ITEMS.length}</strong><span>全部 Skill</span></div>
        <div><strong>${ownCount}</strong><span>我的提交</span></div>
        <div><strong>${reviewCount}</strong><span>待审批</span></div>
        <div><strong>${publishedCount}</strong><span>已发布</span></div>
        <div><strong>${disabledCount}</strong><span>已禁用</span></div>
      </div>

      <div class="skill-hub-toolbar">
        <input id="skill-hub-search" placeholder="搜索技能名称或描述" oninput="filterSkillHub()">
        <select id="skill-hub-status" onchange="filterSkillHub()"><option value="all">状态</option>${statusOptions}</select>
        <select id="skill-hub-category" onchange="filterSkillHub()"><option value="all">分类</option>${categories}</select>
        <select id="skill-hub-tag" onchange="filterSkillHub()"><option value="all">标签</option>${tags}</select>
        <button class="btn btn-primary" onclick="filterSkillHub()">搜索</button>
      </div>

      <div class="skill-hub-table-card">
        <table class="skill-hub-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>绑定平台</th>
              <th>描述</th>
              <th>版本</th>
              <th>上线版本</th>
              <th>状态</th>
              <th>标签</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
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

function leaiPctValue(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, part / total * 100));
}

function leaiPctWidth(part, total, min = 4) {
  const v = leaiPctValue(part, total);
  return v ? Math.max(v, min).toFixed(1) : 0;
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

function leaiTrendDelta(rows, key) {
  if (rows.length < 2) return { text: '单日', tone: 'flat' };
  const first = Number(rows[0]?.[key]) || 0;
  const last = Number(rows[rows.length - 1]?.[key]) || 0;
  if (!first) return { text: '持平', tone: 'flat' };
  const pct = (last - first) / first * 100;
  return {
    text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
    tone: pct >= 0 ? 'up' : 'down'
  };
}

function leaiLineTrendHtml(rows, key, label, fmt, displayValue, subText, color = '#3f78c5') {
  const vals = rows.map(r => Number(r?.[key]) || 0);
  const value = displayValue == null ? (vals[vals.length - 1] || 0) : displayValue;
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const range = Math.max(max - min, 1);
  const width = 260;
  const height = 82;
  const padX = 10;
  const padY = 10;
  const points = vals.map((v, i) => {
    const x = vals.length <= 1 ? width / 2 : padX + (width - padX * 2) * i / (vals.length - 1);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return { x, y, v, d: rows[i]?.d || '' };
  });
  const pointStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = points[0] || { x: padX, y: height - padY };
  const last = points[points.length - 1] || { x: width - padX, y: height - padY };
  const areaD = `M ${first.x.toFixed(1)} ${(height - padY).toFixed(1)} L ${pointStr} L ${last.x.toFixed(1)} ${(height - padY).toFixed(1)} Z`;
  const delta = leaiTrendDelta(rows, key);
  return `<div class="overview-line-card" data-metric="${key}" style="--trend-color:${color}">
    <div class="overview-line-head">
      <span>${label}</span>
      <em class="overview-line-delta is-${delta.tone}">${delta.text}</em>
    </div>
    <div class="overview-line-value">${fmt(value)}</div>
    <svg class="overview-line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${label} 趋势">
      <path class="overview-line-area" d="${areaD}"></path>
      <polyline class="overview-line-stroke" points="${pointStr}"></polyline>
      <circle class="overview-line-dot" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5"></circle>
    </svg>
    <div class="overview-line-sub">${subText || leaiMetricDelta(rows, key)}</div>
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

function switchSkillCreateTab(tab, btn) {
  document.querySelectorAll('.skill-create-tab').forEach(item => {
    item.classList.toggle('active', item.dataset.skillCreateTab === tab);
  });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.skill-create-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.skillCreatePanel === tab);
  });
}

function goSkillCreateNext(current) {
  const order = ['config', 'clarify', 'draft', 'verify', 'review'];
  const next = order[order.indexOf(current) + 1];
  if (!next) return;
  const btn = document.querySelector(`.skill-create-tab[data-skill-create-tab="${next}"]`);
  switchSkillCreateTab(next, btn);
}

function focusSkillClarifyInput() {
  switchSkillCreateTab('clarify', document.querySelector('[data-skill-create-tab=clarify]'));
  setTimeout(() => document.getElementById('skill-clarify-input')?.focus(), 0);
}

function submitSkillClarifyMessage() {
  const input = document.getElementById('skill-clarify-input');
  const chat = document.getElementById('skill-clarify-chat');
  const value = input?.value?.trim();
  if (!input || !chat || !value) return;
  const userBubble = document.createElement('div');
  userBubble.className = 'skill-chat-user';
  userBubble.textContent = value;
  chat.appendChild(userBubble);
  input.value = '';

  const aiBubble = document.createElement('div');
  aiBubble.className = 'skill-chat-ai';
  aiBubble.textContent = '已记录。请继续确认这个需求是否需要固定时间触发、是否允许导出 CSV，以及是否有需要审批的高风险操作。';
  chat.appendChild(aiBubble);
  chat.scrollTop = chat.scrollHeight;
}

function appendSkillClarifyAssistant(message) {
  const chat = document.getElementById('skill-clarify-chat');
  if (!chat || !message) return;
  const aiBubble = document.createElement('div');
  aiBubble.className = 'skill-chat-ai';
  aiBubble.textContent = message;
  chat.appendChild(aiBubble);
  chat.scrollTop = chat.scrollHeight;
}

function refreshSkillClarifySummary(btn) {
  const summary = document.getElementById('skill-clarify-summary-content');
  const updated = document.getElementById('skill-clarify-summary-updated');
  const chat = document.getElementById('skill-clarify-chat');
  if (!summary) return;
  const userTurns = chat ? Array.from(chat.querySelectorAll('.skill-chat-user')).map(item => item.textContent.trim()).filter(Boolean) : [];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  btn?.classList.add('loading');
  btn?.setAttribute('disabled', 'disabled');
  setTimeout(() => {
    summary.innerHTML = `
      <div class="skill-summary-item">
        <span>基本信息</span>
        <p>name: workplace-cert-analysis；描述：职场认证数据分析 Skill；版本：1.0.0；已基于 ${userTurns.length} 轮自然语言澄清更新。</p>
      </div>
      <div class="skill-summary-item">
        <span>触发场景</span>
        <p>自然语言查询、日报/周报/月报、待审核积压提醒、认证方式失败率异常提醒。</p>
      </div>
      <div class="skill-summary-item">
        <span>文件结构</span>
        <p>生成 skill.yaml、business_rules.md、test_cases.json、sample_queries.md；附件材料只作为需求和字段依据。</p>
      </div>
      <div class="skill-summary-item">
        <span>输出格式</span>
        <p>默认先返回 direct_response 文本结论，再返回 display_info 表格明细；允许提供 link_list 脱敏 CSV 下载。</p>
      </div>
      <div class="skill-summary-item">
        <span>测试用例方向</span>
        <p>认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势、异常输入兜底。</p>
      </div>
      <div class="skill-summary-item">
        <span>评估重点</span>
        <p>数据准确性、查询解析正确性、输出格式合规性、权限与脱敏可靠性、定时任务稳定性。</p>
      </div>
      <div class="skill-summary-item">
        <span>复杂度</span>
        <p>medium；只读分析为主，涉及多字段过滤、聚合统计、脱敏导出和异常提醒。</p>
      </div>
      <div class="skill-summary-item">
        <span>Phoenix 输出</span>
        <p>使用 direct_response + display_info + link_list，不触发认证状态修改动作。</p>
      </div>`;
    if (updated) updated.textContent = `已刷新 ${time}`;
    btn?.classList.remove('loading');
    btn?.removeAttribute('disabled');
  }, 360);
}

function saveSkillCreateDraft() {
  const sub = document.querySelector('.skill-workspace-sub');
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (sub) sub.textContent = `职场人群认证 · 草稿已保存 ${time}`;
}

function runSkillCreateLocalCheck() {
  switchSkillCreateTab('verify', document.querySelector('[data-skill-create-tab=verify]'));
}

function toggleSkillContextItem(btn) {
  btn?.classList.toggle('selected');
  syncSkillContextSelection();
}

function syncSkillContextSelection() {
  const selected = Array.from(document.querySelectorAll('.skill-context-item.selected')).map(item => {
    const name = item.querySelector('b')?.textContent?.trim() || '';
    const code = item.querySelector('span')?.textContent?.trim() || '';
    return { name, code };
  }).filter(item => item.name);
  const count = document.getElementById('skill-selected-count');
  if (count) count.textContent = `已选 ${selected.length}`;
  const tags = document.getElementById('skill-selected-tags');
  if (tags) {
    tags.innerHTML = selected.length
      ? selected.map(item => `<span title="${item.code}">${item.name}</span>`).join('')
      : '<span class="muted">请先从左侧选择能力上下文</span>';
  }
  const summary = document.getElementById('skill-context-summary');
  if (summary) {
    summary.textContent = selected.length
      ? `已选择 ${selected.length} 个能力：${selected.map(item => item.name).join('、')}。AI 将基于这些能力继续追问应用场景、边界和输入输出。`
      : '尚未选择能力上下文。请先从左侧勾选可被 Skill 编排的底层能力。';
  }
}

function fillSkillCreateTemplate(type) {
  const templates = {
    query: {
      name: '查询经营指标',
      menu: '乐享运营',
      scene: '运营同学用自然语言查询 GMV、订单、转化率等指标，并返回可解释口径。',
      input: '时间范围、业务线、渠道、指标名称',
      output: '指标数值、同比环比、口径说明、异常提示'
    },
    generate: {
      name: '生成活动复盘',
      menu: '乐享运营',
      scene: '基于活动数据和知识库生成结构化复盘草稿，供运营二次确认。',
      input: '活动名称、时间范围、目标指标、数据结果',
      output: '复盘摘要、亮点、问题、行动建议'
    },
    action: {
      name: '配置商品推荐位',
      menu: '乐享运营',
      scene: '根据运营策略生成商品推荐位配置草案，高风险动作需审批后执行。',
      input: '商品 ID、推荐位、上线时间、目标人群',
      output: '配置草案、影响范围、审批单'
    }
  };
  const t = templates[type];
  if (!t) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('skill-create-name', t.name);
  set('skill-create-menu', t.menu);
  set('skill-create-scene', t.scene);
  set('skill-create-input', t.input);
  set('skill-create-output', t.output);
  switchSkillCreateTab('config', document.querySelector('[data-skill-create-tab=config]'));
}

function renderSkillCreatePage() {
  return `
    <div class="skill-create-page">
      <div class="page-header">
        <div>
          <div class="page-title">Skill 创建</div>
          <div class="page-desc">从业务场景出发定义 Skill 能力、输入输出、权限风险和审批边界。</div>
        </div>
        <div class="agent-skill-page-actions">
          <button class="btn btn-secondary" onclick="goPortalHome()">返回工作台</button>
          <button class="btn btn-secondary" onclick="switchPage('agent.skills')">查看 Skills 管理</button>
        </div>
      </div>

      <div class="skill-create-studio">
        <aside class="skill-context-pane">
            <div class="skill-pane-title">能力上下文 <span id="skill-selected-count">已选 4</span></div>
          <div class="skill-context-list">
            <button class="skill-context-item selected" onclick="toggleSkillContextItem(this)"><b>商品查询</b><span>product.query</span><em>商品中心</em></button>
            <button class="skill-context-item selected" onclick="toggleSkillContextItem(this)"><b>库存查询</b><span>inventory.query</span><em>库存中心</em></button>
            <button class="skill-context-item selected" onclick="toggleSkillContextItem(this)"><b>商品上下架</b><span>product.shelf</span><em>商品中心</em></button>
            <button class="skill-context-item selected" onclick="toggleSkillContextItem(this)"><b>通知发送</b><span>notify.send</span><em>通知中心</em></button>
          </div>

          <div class="skill-pane-title">推荐能力 <button onclick="alert('已刷新推荐能力')">刷新</button></div>
          <div class="skill-context-list compact">
            <button class="skill-context-item" onclick="toggleSkillContextItem(this)"><b>活动商品判断</b><span>activity.judge</span><em>商品中心</em></button>
            <button class="skill-context-item" onclick="toggleSkillContextItem(this)"><b>商品价格查询</b><span>price.query</span><em>价格中心</em></button>
            <button class="skill-context-item" onclick="toggleSkillContextItem(this)"><b>标签管理</b><span>tag.manage</span><em>商品中心</em></button>
          </div>

          <div class="skill-context-quick">
            <label>快速加入上下文</label>
            <input placeholder="输入能力名或业务对象">
            <div>
              <button onclick="fillSkillCreateTemplate('query')">库存查询</button>
              <button onclick="fillSkillCreateTemplate('action')">商品上下架</button>
            </div>
          </div>

          <div class="skill-context-metrics">
            <div><b>12</b><span>API</span></div>
            <div><b>4</b><span>DB 表</span></div>
            <div><b>5</b><span>Tool</span></div>
            <div><b>8</b><span>权限点</span></div>
          </div>
        </aside>

        <div class="skill-main-stack">
          <section class="skill-workspace-pane">
            <div class="skill-workspace-head">
              <div>
                <div class="skill-workspace-title">Skill Workspace</div>
          <div class="skill-workspace-sub">职场人群认证 · 迭代 0 轮 · 基础配置中</div>
              </div>
            </div>

          <div class="skill-create-tabs" role="tablist" aria-label="Skill 创建页签">
            <button type="button" class="skill-create-tab active" data-skill-create-tab="config" onclick="switchSkillCreateTab('config', this)">1. 基础配置</button>
            <button type="button" class="skill-create-tab" data-skill-create-tab="clarify" onclick="switchSkillCreateTab('clarify', this)">2. 需求澄清</button>
            <button type="button" class="skill-create-tab" data-skill-create-tab="draft" onclick="switchSkillCreateTab('draft', this)">3. 草稿生成</button>
            <button type="button" class="skill-create-tab" data-skill-create-tab="verify" onclick="switchSkillCreateTab('verify', this)">4. 评估验证</button>
            <button type="button" class="skill-create-tab" data-skill-create-tab="review" onclick="switchSkillCreateTab('review', this)">5. 提交审核</button>
          </div>

          <div class="skill-create-panel active" data-skill-create-panel="config">
            <div class="skill-step-banner">当前阶段：先完成 Skill 基础配置，明确必填的 Skill 名称、所属菜单，以及可选的适用场景、输入输出和能力边界。</div>
            <div class="skill-create-form">
              <div class="skill-create-field">
                <label for="skill-create-name">Skill 名称 <span class="field-required">*</span></label>
                <input id="skill-create-name" value="职场人群认证数据分析" required>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-menu">菜单 <span class="field-required">*</span></label>
                <select id="skill-create-menu" required><option>在职员工管理</option><option>乐享运营</option><option>GEO 看板</option><option>企业客户管理</option><option>搜索后台</option><option>风控管理</option></select>
              </div>
              <div class="skill-create-field full">
                <label for="skill-create-scene">适用场景 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-scene">运营和 PM 通过自然语言查询职场人群认证数据，分析认证方式分布、通过率趋势、失败原因和待审核积压，并生成文本摘要或表格报告。</textarea>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-input">输入参数 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-input">时间范围、认证方式、认证状态、企业名称、岗位信息、失败原因、输出格式</textarea>
              </div>
              <div class="skill-create-field">
                <label for="skill-create-output">输出结果 <span class="field-optional">非必填</span></label>
                <textarea id="skill-create-output">指标摘要、认证方式分布表、失败原因 TopN、趋势判断、可下载 CSV 链接</textarea>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" onclick="saveSkillCreateDraft()">保存草稿</button>
              <button class="btn btn-primary" onclick="goSkillCreateNext('config')">下一步：需求澄清</button>
            </div>
          </div>

          <div class="skill-create-panel" data-skill-create-panel="clarify">
            <div class="skill-step-banner">当前阶段：基于基础配置、左侧能力上下文和附件材料，通过与 AI 对话补齐应用场景、约束条件和执行边界。</div>
            <div class="skill-clarify-layout">
              <div class="skill-chat-sim" id="skill-clarify-chat">
                <div class="skill-chat-context">
                  <b>我已理解你选择的能力上下文</b>
                  <div class="skill-ai-tags" id="skill-selected-tags"><span title="product.query">商品查询</span><span title="inventory.query">库存查询</span><span title="product.shelf">商品上下架</span><span title="notify.send">通知发送</span></div>
                  <p id="skill-context-summary">已选择 4 个能力：商品查询、库存查询、商品上下架、通知发送。AI 将结合基础配置继续追问应用场景、边界和输入输出。</p>
                </div>
                <div class="skill-chat-user">根据职场认证 PRD、后台字段说明和测试样例，创建一个帮助 PM 和运营分析认证数据的 Skill。</div>
                <div class="skill-chat-ai">我已读取基础配置和附件材料。这个 Skill 的核心目标是帮助团队查询职场认证数据、识别认证方式分布、通过率趋势、失败原因和待审核积压。为了更准确地设计这个 Skill，我先确认一个关键点：输出结果需要偏文本总结、表格明细，还是两者都要？</div>
                <div class="skill-chat-user">两者都要。默认先给文字结论，再给表格。</div>
                <div class="skill-chat-ai">好的。接下来确认触发场景：除了自然语言查询，例如“最近 7 天个税认证通过率”，是否还需要定时报告或异常提醒？</div>
                <div class="skill-chat-user">需要。支持日报，也要能发现待审核过多、某种认证方式失败率异常。</div>
                <div class="skill-chat-ai">明白。再确认权限和边界：这个 Skill 是否只读？是否允许导出明细 CSV？是否可以修改认证状态？</div>
                <div class="skill-chat-user">只读，可以导出脱敏 CSV，不能修改认证状态。</div>
                <div class="skill-chat-ai">我会将能力边界记录为：只读查询与分析、默认脱敏、导出需带权限校验、不触发认证状态变更。接下来为了验证 Skill，我建议准备 5 个测试用例：认证方式分布、失败原因 TopN、待审核积压、单企业认证明细、个税认证趋势。是否需要覆盖所有这些场景？</div>
                <div class="skill-chat-user">需要，5 个都保留。</div>
                <div class="skill-chat-ai">好的。最后确认交付结构：我会生成 Skill 配置、业务规则说明、测试用例和示例问法。前端展示适配为 direct_response 文本摘要、display_info 表格卡片、link_list 导出链接。这样理解是否准确？</div>
                <div class="skill-chat-user">准确，可以进入草稿生成。</div>
                <div class="skill-chat-ai">需求澄清已完成。当前 Skill 将支持自然语言查询、定时报告、异常提醒、脱敏导出和只读数据分析。下一步我会基于这些结论生成 Skill 草稿。</div>
              </div>
              <div class="skill-clarify-card skill-clarify-summary">
                <div class="skill-summary-head">
                  <div>
                    <b>澄清结论</b>
                    <small id="skill-clarify-summary-updated">根据当前对话生成</small>
                  </div>
                  <button type="button" class="skill-summary-refresh" title="刷新澄清总结" aria-label="刷新澄清总结" onclick="refreshSkillClarifySummary(this)"><span>↻</span></button>
                </div>
                <div id="skill-clarify-summary-content">
                  <div class="skill-summary-item">
                    <span>基本信息</span>
                    <p>name: workplace-cert-analysis；描述：职场认证数据分析 Skill；版本：1.0.0</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>触发场景</span>
                    <p>自然语言查询、日报/周报/月报、待审核积压和失败率异常提醒。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>文件结构</span>
                    <p>生成 skill.yaml、business_rules.md、test_cases.json、sample_queries.md。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>输出格式</span>
                    <p>direct_response 文本结论、display_info 表格明细、link_list 脱敏 CSV 下载。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>测试用例方向</span>
                    <p>认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>评估重点</span>
                    <p>数据准确性、查询解析正确性、输出格式合规性、权限与脱敏可靠性。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>复杂度</span>
                    <p>medium；只读分析为主，涉及多字段过滤、聚合统计和权限校验。</p>
                  </div>
                  <div class="skill-summary-item">
                    <span>Phoenix 输出</span>
                    <p>使用 direct_response + display_info + link_list，不触发状态修改动作。</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="skill-rule-grid skill-clarify-actions" aria-label="需求澄清辅助动作">
              <button onclick="appendSkillClarifyAssistant('已根据当前澄清结论生成测试用例方向：认证方式分布、失败原因 TopN、待审核积压、单企业明细、个税认证趋势。')">生成测试用例</button>
              <button onclick="appendSkillClarifyAssistant('已检查权限与依赖：当前 Skill 仅做只读分析，导出使用脱敏 CSV，依赖认证记录表、认证方式字段、失败原因字段和组织权限。')">检查权限与依赖</button>
              <button onclick="appendSkillClarifyAssistant('已完成运行预览：自然语言查询将返回文本摘要、表格明细和脱敏 CSV 链接，不触发认证状态修改。')">运行预览</button>
              <button onclick="appendSkillClarifyAssistant('已给出优化逻辑：建议补充异常输入处理、失败 case、定时报告频率和待审核积压阈值。')">优化逻辑</button>
              <button onclick="appendSkillClarifyAssistant('已完成风险评估：主要风险为敏感字段泄露、导出权限不足、统计口径不一致；需默认脱敏并记录导出日志。')">风险评估</button>
              <button onclick="appendSkillClarifyAssistant('已生成发布建议：先按只读分析能力提交审核，通过后再进入上传发布链路；当前创建流程止于提交审核。')">发布建议</button>
            </div>
            <div class="skill-chat-composer">
              <button type="button" class="skill-chat-attach" aria-label="添加附件" onclick="alert('已添加附件：业务说明文档 / 数据样例')">📎</button>
              <textarea id="skill-clarify-input" placeholder="继续补充需求，例如：输出字段、使用人群、定时频率、权限边界..."></textarea>
              <button type="button" aria-label="发送澄清内容" onclick="submitSkillClarifyMessage()">➤</button>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" onclick="saveSkillCreateDraft()">保存草稿</button>
              <button class="btn btn-secondary" onclick="switchSkillCreateTab('config', document.querySelector('[data-skill-create-tab=config]'))">上一步</button>
              <button class="btn btn-primary" onclick="goSkillCreateNext('clarify')">下一步：生成 Skill 草稿</button>
            </div>
          </div>

          <div class="skill-create-panel" data-skill-create-panel="draft">
            <div class="skill-code-card">
              <pre>skill:
  name: employee_certification_analysis
  title: 职场人群认证数据分析
  trigger: natural_language | scheduled_report
  scope:
    - 认证记录查询
    - 认证方式分布
    - 通过率和失败原因分析
  boundary:
    - 只读分析
    - 不修改用户认证状态
    - 不导出敏感明文信息
  outputs:
    - text_summary
    - table
    - csv_link</pre>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" onclick="saveSkillCreateDraft()">保存草稿</button>
              <button class="btn btn-secondary" onclick="switchSkillCreateTab('clarify', document.querySelector('[data-skill-create-tab=clarify]'))">上一步</button>
              <button class="btn btn-primary" onclick="goSkillCreateNext('draft')">下一步：评估验证</button>
            </div>
          </div>

          <div class="skill-create-panel" data-skill-create-panel="verify">
            <div class="skill-eval-head">
              <div>
                <b>评估验证</b>
                <p>第 1 轮（最多 5 轮）：静态评估 + A/B 动态 + LLM 打分。及格线：综合评分 ≥ 0.80。</p>
              </div>
              <button class="btn btn-secondary" onclick="alert('已发起重新评估')">重新评估</button>
            </div>
            <div class="skill-score-grid">
              <div class="skill-score-card"><span>静态评分</span><b>0.872</b><i style="--score:87.2%"></i></div>
              <div class="skill-score-card"><span>结果评分</span><b>0.846</b><i style="--score:84.6%"></i></div>
              <div class="skill-score-card"><span>过程评分</span><b>0.831</b><i style="--score:83.1%"></i></div>
              <div class="skill-score-card"><span>效率评分</span><b>0.888</b><i style="--score:88.8%"></i></div>
              <div class="skill-score-card featured pass"><span>综合评分</span><b>0.859</b><i style="--score:85.9%"></i><em>已达及格线 0.80</em></div>
            </div>
            <div class="skill-eval-gate pass">
              <b>评估通过</b>
              <span>综合评分 0.859，已达到提交审核门槛。可进入提交审核，等待管理员审批后再进入上传或发布链路。</span>
            </div>
            <div class="skill-eval-list">
              <div><span class="pass">PASS</span><b>基本信息规范</b><em>1.00</em></div>
              <div><span class="pass">PASS</span><b>流程步骤清晰</b><em>1.00</em></div>
              <div><span class="pass">PASS</span><b>异常处理完善<small>已覆盖无数据、字段缺失、权限不足时的兜底话术</small></b><em>0.90</em></div>
              <div><span class="pass">PASS</span><b>关键节点确认<small>导出 CSV、定时报告、异常提醒前均有确认节点</small></b><em>0.86</em></div>
              <div><span class="pass">PASS</span><b>指令具体明确</b><em>1.00</em></div>
              <div><span class="pass">PASS</span><b>资源引用有效</b><em>1.00</em></div>
              <div><span class="pass">PASS</span><b>平台适配合规</b><em>1.00</em></div>
              <div><span class="pass">PASS</span><b>测试用例充分</b><em>1.00</em></div>
            </div>
            <div class="skill-optimization-panel">
              <div class="skill-optimization-head">
                <div>
                  <b>评估结论</b>
                  <span>核心风险已补齐，可提交审核。后续优化可继续补充更多真实失败样例。</span>
                </div>
                <button class="btn btn-secondary" onclick="appendSkillClarifyAssistant('评估已通过：异常兜底、关键确认和失败 case 已补齐；可进入提交审核。')">同步到需求澄清</button>
              </div>
              <div class="skill-optimization-list">
                <div>
                  <span>1</span>
                  <b>异常处理规则已补齐</b>
                  <p>已增加无数据、字段缺失、接口失败、权限不足时的回复模板，并要求输出可继续追问的下一步。</p>
                  <button onclick="switchSkillCreateTab('clarify', document.querySelector('[data-skill-create-tab=clarify]'))">查看澄清</button>
                </div>
                <div>
                  <span>2</span>
                  <b>关键节点确认已配置</b>
                  <p>导出 CSV、开启定时报告、发送异常提醒前，都会先展示范围、对象、频率和影响，再由 PM 确认。</p>
                  <button onclick="switchSkillCreateTab('draft', document.querySelector('[data-skill-create-tab=draft]'))">查看草稿</button>
                </div>
                <div>
                  <span>3</span>
                  <b>失败 case 已覆盖</b>
                  <p>已新增权限不足、企业名称为空、个税认证数据缺失、失败原因字段异常等测试样例。</p>
                  <button onclick="switchSkillCreateTab('clarify', document.querySelector('[data-skill-create-tab=clarify]'))">查看用例</button>
                </div>
              </div>
            </div>
            <div class="skill-case-list">
              <b>用例对比</b>
              <div><span>case-1 · 20.9s</span><em>得分 0.88</em></div>
              <div><span>case-2 · 25.6s</span><em>得分 0.82</em></div>
              <div><span>case-3 · 26.6s</span><em>得分 0.90</em></div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" onclick="saveSkillCreateDraft()">保存草稿</button>
              <button class="btn btn-secondary" onclick="switchSkillCreateTab('draft', document.querySelector('[data-skill-create-tab=draft]'))">上一步</button>
              <button class="btn btn-secondary" onclick="switchSkillCreateTab('clarify', document.querySelector('[data-skill-create-tab=clarify]'))">返回修改</button>
              <button class="btn btn-primary" onclick="goSkillCreateNext('verify')">下一步：提交审核</button>
            </div>
          </div>

          <div class="skill-create-panel" data-skill-create-panel="review">
            <div class="skill-doc-grid">
              <div class="skill-upload-box">
                <b>提交审核</b>
                <p>综合评分已达标，可提交 PM/平台管理员审核。创建流程到提交审核结束；审核通过后才进入上传或发布，不属于当前创建流程。</p>
                <button class="btn btn-secondary" onclick="switchSkillCreateTab('verify', document.querySelector('[data-skill-create-tab=verify]'))">返回评估验证</button>
              </div>
              <div class="skill-doc-list">
                <div><span>门槛</span><b>综合评分 ≥ 0.80</b></div>
                <div><span>状态</span><b>当前综合评分 0.859，已达到审核门槛</b></div>
                <div><span>动作</span><b id="skill-create-review-status">提交审核后停留当前页面，Skill Hub 状态变为待审批</b></div>
                <div><span>后续</span><b>审核通过后才可上传发布</b></div>
              </div>
            </div>
            <div class="skill-create-step-actions">
              <button class="btn btn-secondary skill-draft-save" onclick="saveSkillCreateDraft()">保存草稿</button>
              <button class="btn btn-secondary" onclick="switchSkillCreateTab('verify', document.querySelector('[data-skill-create-tab=verify]'))">上一步</button>
              <button id="skill-create-submit-review-btn" class="btn btn-primary" onclick="submitSkillCreateReview()">提交审核</button>
            </div>
          </div>
          </section>
        </div>
      </div>
    </div>
  `;
}


function renderAgentPermissionManager() {
  return `
    <div class="page-header skill-hub-header">
      <div>
        <div class="page-title">权限管理</div>
        <div class="page-desc">统一管理门户菜单权限、Skill 能力权限和角色范围，确保可见、可用、可审批边界清晰。</div>
      </div>
      <div class="skill-hub-actions">
        <button class="btn btn-secondary" onclick="goPortalHome()">返回工作台</button>
        <button class="btn btn-primary" onclick="openSkillManagerFromUserMenu()">查看 Skill Hub</button>
      </div>
    </div>
    <div class="permission-hub-grid">
      <section class="permission-hub-card">
        <span>MENU</span>
        <b>菜单权限</b>
        <p>控制左侧菜单、子菜单和后台页面的可见范围。默认按角色授予，特殊页面可按人员补充授权。</p>
        <div><em>在职员工管理</em><em>乐享运营</em><em>GEO 看板</em><em>风控管理</em></div>
      </section>
      <section class="permission-hub-card">
        <span>SKILL</span>
        <b>Skill 权限</b>
        <p>控制业务用户是否可以在右侧 Agent 中调用技能包，PM 可查看自己提交的 Skill 状态。</p>
        <div><em>可调用</em><em>可申请</em><em>待审批</em><em>已禁用</em></div>
      </section>
      <section class="permission-hub-card">
        <span>ROLE</span>
        <b>角色与审批</b>
        <p>区分业务用户、PM 和管理员。管理员负责审批 Skill、发布启停和配置高风险能力边界。</p>
        <div><em>业务用户</em><em>PM</em><em>管理员</em><em>审计留痕</em></div>
      </section>
    </div>
    <div class="permission-hub-table card">
      <div class="card-header"><div class="card-title">权限策略示例</div></div>
      <table class="table">
        <thead><tr><th>对象</th><th>可见范围</th><th>可操作</th><th>审批要求</th><th>状态</th></tr></thead>
        <tbody>
          <tr><td>创建 Skill</td><td>PM / 平台侧</td><td>创建、保存草稿、提交审核</td><td>提交后由管理员审批</td><td><span class="badge green">启用</span></td></tr>
          <tr><td>Skill Hub</td><td>PM / 管理员</td><td>查看状态、测试、审批、发布、启停</td><td>发布和禁用需确认</td><td><span class="badge green">启用</span></td></tr>
          <tr><td>管理技能包</td><td>业务用户</td><td>查看可用技能包、申请权限、调用说明</td><td>申请后审批</td><td><span class="badge blue">业务入口</span></td></tr>
        </tbody>
      </table>
    </div>
  `;
}

const PAGE_RENDERERS = {
  'portal.home': () => renderPortalHomePage(),
  'agent.skills': () => renderAgentSkillsManager(),
  'agent.skillCreate': () => renderSkillCreatePage(),
  'agent.permissions': () => renderAgentPermissionManager(),
  'dashboard.overview': () => {
    const L = leaiGetData();
    if (!L) return '<div class="empty-state"><div class="title">暂无运营数据</div></div>';
    const range = LEAI_DASH_STATE.overviewRange;
    const bounds = leaiDateBounds();
    const customStart = LEAI_DASH_STATE.overviewCustomStart || bounds.min;
    const customEnd = LEAI_DASH_STATE.overviewCustomEnd || bounds.max;
    const summary = leaiBuildSummary(range, customStart, customEnd);
    const trendRows = leaiRows('14d');
    const [lc, ls, lg] = leaiBizTradeSummaries(summary.rows);
    const platformTotal = summary.offGmv + summary.nonGmv;
    const activeBase = summary.dau * Math.max(summary.rows.length, 1);
    const bizBuyTotal = lc.buy + ls.buy + lg.buy;
    const avgOrder = summary.buy ? Math.round(summary.gmv / summary.buy) : 0;
    const offAvgOrder = summary.offBuy ? Math.round(summary.offGmv / summary.offBuy) : 0;
    const nonAvgOrder = summary.nonBuy ? Math.round(summary.nonGmv / summary.nonBuy) : 0;
    return `
    <div class="page-header">
      <div>
        <div class="page-title">运营总览</div>
        <div class="page-desc">乐享全渠道数据 · ${leaiPeriodText(summary.rows)} · 数据更新于 ${L.updated}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${leaiOverviewTimeFilterHtml(bounds, customStart, customEnd)}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="leaiAskOverview('overview')">AI 解读</button>
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

    <div class="overview-insight-stack overview-insight-demo">
      <div class="card overview-chain-board">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">关键经营链路</div>
            <span class="overview-soft-tag">转化漏斗</span>
          </div>
          <div class="overview-board-actions">
            <span class="overview-flow-hint">登录 → 互动 → 购买 → 成交</span>
            <button class="btn btn-sm btn-secondary ai-insight-btn compact" onclick="leaiAskOverview('funnel')">问 AI</button>
          </div>
        </div>
        <div class="overview-chain-flow">
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>01</span><b>登录用户</b></div>
            <div class="overview-step-label">当日登录</div>
            <div class="overview-step-value">${leaiFmtW(summary.login)}</div>
            <div class="overview-step-meta">登录率 ${leaiFmtPct(summary.login, activeBase)}</div>
          </div>
          <div class="overview-chain-connector" style="--connector-color:#3f78c5">
            <i></i><span>${leaiFmtPct(summary.inter, summary.login)}</span><em>互动转化</em>
          </div>
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>02</span><b>互动用户</b></div>
            <div class="overview-step-label">产生有效互动</div>
            <div class="overview-step-value">${leaiFmtW(summary.inter)}</div>
            <div class="overview-step-meta">较登录漏出 ${leaiFmtPct(summary.login - summary.inter, summary.login)}</div>
          </div>
          <div class="overview-chain-connector is-warn" style="--connector-color:#d97706">
            <i></i><span>${leaiFmtPct(summary.buy, summary.inter)}</span><em>购买转化</em>
          </div>
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>03</span><b>购买人数</b></div>
            <div class="overview-step-label">完成下单</div>
            <div class="overview-step-value">${summary.buy.toLocaleString()}人</div>
            <div class="overview-step-meta">转化瓶颈 · 重点关注</div>
          </div>
          <div class="overview-chain-connector" style="--connector-color:#3f78c5">
            <i></i><span>¥${avgOrder.toLocaleString()}</span><em>客单价</em>
          </div>
          <div class="overview-chain-step is-result" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>04</span><b>成交 GMV</b></div>
            <div class="overview-step-label">当日成交额</div>
            <div class="overview-step-value">${leaiFmtY(summary.gmv)}</div>
            <div class="overview-step-meta">日均 ${leaiFmtY(leaiAvg(summary.rows, 'gmv'))}</div>
          </div>
        </div>
      </div>

      <div class="card overview-structure-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">GMV 结构拆解</div>
            <span class="overview-soft-tag">${leaiFmtY(summary.gmv)}</span>
          </div>
          <div class="dash-card-note">登录口径 + 平台交易回算</div>
        </div>
        <div class="overview-structure-grid">
          <div class="overview-breakdown-pane">
            <div class="overview-pane-title">
              <span>分业务</span>
              <b>合计 ${leaiFmtY(summary.gmv)} · ${bizBuyTotal.toLocaleString()}人</b>
            </div>
            <div class="overview-breakdown-row" style="--row-color:#3f78c5;--row-progress:${leaiPctWidth(lc.gmv, summary.gmv)}%">
              <div class="overview-row-main"><span>消费业务</span><b>${leaiFmtY(lc.gmv)}</b></div>
              <div class="overview-row-meta">购买 ${lc.buy.toLocaleString()} 人 <strong>${leaiFmtPct(lc.gmv, summary.gmv)}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row" style="--row-color:#5b8def;--row-progress:${leaiPctWidth(ls.gmv, summary.gmv)}%">
              <div class="overview-row-main"><span>SMB 业务</span><b>${leaiFmtY(ls.gmv)}</b></div>
              <div class="overview-row-meta">购买 ${ls.buy.toLocaleString()} 人 <strong>${leaiFmtPct(ls.gmv, summary.gmv)}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row" style="--row-color:#9bbcff;--row-progress:${leaiPctWidth(lg.gmv, summary.gmv)}%">
              <div class="overview-row-main"><span>政企业务</span><b>${leaiFmtY(lg.gmv)}</b></div>
              <div class="overview-row-meta">购买 ${lg.buy.toLocaleString()} 人 <strong>${leaiFmtPct(lg.gmv, summary.gmv)}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
          </div>
          <div class="overview-breakdown-pane overview-platform-pane">
            <div class="overview-pane-title">
              <span>分平台</span>
              <b>官网占比 ${leaiFmtPct(summary.offGmv, platformTotal)}</b>
            </div>
            <div class="overview-breakdown-row" style="--row-color:#58a86a;--row-progress:${leaiPctWidth(summary.nonGmv, platformTotal)}%">
              <div class="overview-row-main"><span>非官网</span><b>${leaiFmtY(summary.nonGmv)}</b></div>
              <div class="overview-row-meta">购买 ${summary.nonBuy.toLocaleString()} 人 <strong>${leaiFmtPct(summary.nonGmv, platformTotal)}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row" style="--row-color:#6ac69a;--row-progress:${leaiPctWidth(summary.offGmv, platformTotal)}%">
              <div class="overview-row-main"><span>官网</span><b>${leaiFmtY(summary.offGmv)}</b></div>
              <div class="overview-row-meta">购买 ${summary.offBuy.toLocaleString()} 人 <strong>${leaiFmtPct(summary.offGmv, platformTotal)}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-price-compare">
              <span>客单价对比</span>
              <b>官网 ¥${offAvgOrder.toLocaleString()} · 非官网 ¥${nonAvgOrder.toLocaleString()}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="card overview-trend-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">核心趋势速览</div>
            <span class="overview-soft-tag">近14天</span>
          </div>
          <div class="dash-card-note">环比对比上一周期</div>
        </div>
        <div class="overview-line-grid">
          ${leaiLineTrendHtml(trendRows, 'dau', 'DAU', leaiFmtW, summary.dau, `近14天日均 ${leaiFmtW(leaiAvg(trendRows, 'dau'))} · ${leaiMetricDelta(trendRows, 'dau')}`, '#3f78c5')}
          ${leaiLineTrendHtml(trendRows, 'inter', '互动用户', leaiFmtW, summary.inter, `近14天累计 · ${leaiMetricDelta(trendRows, 'inter')}`, '#7c5cff')}
          ${leaiLineTrendHtml(trendRows, 'gmv', 'GMV', leaiFmtY, summary.gmv, `近14天累计 · ${leaiMetricDelta(trendRows, 'gmv')}`, '#58a86a')}
        </div>
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
        <div class="geo-scope-tab" data-scope="official" onclick="geoSetScope(this)">联想官网</div>
        <div class="geo-scope-tab" data-scope="leai" onclick="geoSetScope(this)">联想乐享</div>
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
      <div class="geo-context-line" id="geo-context-line">当前口径：加载中...</div>
      <div class="geo-interface-note" id="geo-overview-gap-note">
        接口说明：0605 已支持稳定意图、分竞品可见性趋势、wiki 引用累计和信源 page_size/brands；转化与分竞品推荐类指标未提供时显示“待接口提供数据”。
      </div>

      <!-- 对比视角 + 竞品选择器 -->
      <div id="geo-compare-control" style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">分析模式</span>
          <div id="geo-compare-toggle" style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden">
            <button onclick="geoSetCompare('brand')" class="geo-cmp-btn active" data-cmp="brand" style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s;background:#2563eb;color:#fff">品牌表现</button>
            <button onclick="geoSetCompare('compare')" class="geo-cmp-btn" data-cmp="compare" style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s;background:#fff;color:#374151">竞品对比</button>
          </div>
        </div>
        <div class="geo-comp-divider" style="width:1px;height:20px;background:#e5e7eb"></div>
        <div id="geo-competitor-picker" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span id="geo-comp-counter" style="font-size:12px;color:#6b7280;white-space:nowrap">竞品品牌 · 已选 0/5</span>
          <button class="geo-comp-pill" data-brand="hp" onclick="geoToggleCompetitor(this)">惠普</button>
          <button class="geo-comp-pill" data-brand="dell" onclick="geoToggleCompetitor(this)">戴尔</button>
          <button class="geo-comp-pill" data-brand="huawei" onclick="geoToggleCompetitor(this)">华为</button>
          <button class="geo-comp-pill" data-brand="apple" onclick="geoToggleCompetitor(this)">苹果</button>
          <button class="geo-comp-pill" data-brand="asus" onclick="geoToggleCompetitor(this)">华硕</button>
          <button class="geo-comp-pill" data-brand="xiaomi" onclick="geoToggleCompetitor(this)">小米</button>
          <button class="geo-comp-pill" data-brand="acer" onclick="geoToggleCompetitor(this)">宏碁</button>
          <button class="geo-comp-pill" data-brand="honor" onclick="geoToggleCompetitor(this)">荣耀</button>
          <span id="geo-comp-limit-msg" style="font-size:11px;color:#9ca3af">最多5个</span>
        </div>
      </div>
      <div class="geo-scope-note" id="geo-scope-note" style="display:none"></div>

      <!-- 4 个核心 KPI（可点选） -->
      <div class="geo-kpi-grid cols-4" id="geo-kpi-cards" style="margin-bottom:16px">
        <div class="geo-kpi highlight" data-metric="visible" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中提及目标品牌的问题数占比，衡量品牌基础曝光能力">?</div>
          <div class="gk-val" id="gv-brand-visible">--</div>
          <div class="gk-label">品牌可见度</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub" style="display:none"><span id="gv-comp-visible">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="rec" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中推荐目标品牌/产品的次数占比">?</div>
          <div class="gk-val" id="gv-brand-rec">--</div>
          <div class="gk-label">品牌推荐率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub" style="display:none"><span id="gv-comp-rec">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="top1" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中目标品牌/产品出现在推荐首位（置顶）的次数占比">?</div>
          <div class="gk-val" id="gv-brand-top1">--</div>
          <div class="gk-label">品牌推荐置顶率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub" style="display:none"><span id="gv-comp-top1">--</span></div>
        </div>
        <div class="geo-kpi" data-metric="top3" onclick="geoSelectKpi(this)" style="cursor:pointer">
          <div class="gk-tip" title="AI 答案中目标品牌/产品出现在推荐列表前 3 位的次数占比">?</div>
          <div class="gk-val" id="gv-brand-top3">--</div>
          <div class="gk-label">品牌推荐前三率</div>
          <div class="gk-sub gk-compare" style="display:none"></div>
          <div class="gk-sub gk-brand-sub" style="display:none"><span id="gv-comp-top3">--</span></div>
        </div>
      </div>

      <!-- 对比横条卡 + 趋势折线图 -->
      <div class="geo-row geo-compare-trend-row single" id="geo-trend-row" style="margin-bottom:12px">
        <div class="geo-panel geo-compare-bars-panel" id="geo-compare-detail-panel" style="display:none">
          <div class="gpnl-title">品牌 vs 竞品 对比</div>
          <div id="geo-trend-chart" class="geo-compare-bars-body"><div style="color:#9ca3af;font-size:12px;padding:12px">请选择竞品</div></div>
        </div>
        <div class="geo-panel" style="flex:2;min-width:0">
          <div style="margin-bottom:8px">
            <div class="gpnl-title" id="geo-trend-title" style="margin:0">可见性趋势</div>
          </div>
          <div class="geo-interface-note" id="geo-trend-gap-note" style="display:none"></div>
          <div id="geo-trend-legend" style="display:flex;align-items:center;gap:16px;margin-bottom:8px;font-size:11px;color:#6b7280;flex-wrap:wrap"></div>
          <canvas id="geo-trend-canvas" width="800" height="280" style="width:100%;height:280px;cursor:crosshair"></canvas>
          <div id="geo-trend-tooltip" style="display:none;position:absolute;background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:6px;font-size:11px;pointer-events:none;z-index:100;line-height:1.6"></div>
        </div>
      </div>

      <!-- 第二行：信源分布 Treemap + 排行榜 -->
      <div class="geo-row">
        <div class="geo-panel">
          <div class="gpnl-title">信源分布图</div>
          <div class="geo-interface-note">接口说明：官网/乐享品牌词信源口径需服务商按品牌词返回；当前接口未明确区分品牌词时，本模块展示的是当前接口结果，不代表官网/乐享专属信源数据。</div>
          <div id="geo-sites-treemap" style="min-height:260px"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
        </div>
        <div class="geo-panel">
          <div class="gpnl-title">信源排行榜 Top20</div>
          <div class="geo-interface-note">接口说明：选择 AI 平台后按平台请求；品牌词口径如接口未返回，则展示当前接口结果，不代表官网/乐享专属排行。</div>
          <div class="geo-scroll-wrap" style="max-height:320px">
            <div id="geo-sites-rank"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
          </div>
        </div>
      </div>

      <!-- 第三行：各平台引用次数 -->
      <div class="geo-row wide-right">
        <div class="geo-panel">
          <div class="gpnl-title">各 AI 平台引用次数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 联想链接 + 各 wiki 页面</span></div>
          <div class="geo-kpi-grid cols-3" style="margin-bottom:12px">
            <div class="geo-kpi"><div class="gk-val" id="gv-lenovo-link-cite">--</div><div class="gk-label">联想链接引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-lenovo-wiki-cite">--</div><div class="gk-label">联想wiki引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-wiki-shop-cite">--</div><div class="gk-label">联想wiki-商城引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-wiki-c-cite">--</div><div class="gk-label">联想wiki-消费引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-wiki-b-cite">--</div><div class="gk-label">联想wiki-SMB引用次数</div></div>
            <div class="geo-kpi"><div class="gk-val" id="gv-wiki-biz-cite">--</div><div class="gk-label">联想wiki-政企引用次数</div></div>
          </div>
          <div class="geo-interface-note" id="geo-citation-gap-note">接口缺口：官网/乐享品牌词引用口径、wiki-商城、wiki-消费、wiki-SMB、wiki-政企引用次数需服务商返回；未返回时显示待接口提供数据或当前接口结果。</div>
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
        <div class="geo-interface-note">接口说明：稳定覆盖意图及官网/乐享品牌词意图总数需服务商按平台返回；当前为前端基于现有字段推导。</div>
        <div id="geo-intent-platform-summary"><div style="color:#9ca3af;font-size:12px;padding:12px">加载中...</div></div>
      </div>

    </div>
  `,

  'dashboard.geoSource': () => `
    <div class="page-header">
      <div><div class="page-title">GEO · 各平台信源分布</div><div class="page-desc">各 AI 模型引用的内容发布平台分布及占比</div></div>
      <div class="geo-source-controls">
        <select id="geo-source-scope" onchange="geoLoadSourcePage(1)">
          <option value="all">整体</option>
          <option value="official">联想官网</option>
          <option value="leai">联想乐享</option>
        </select>
        <select id="geo-source-model" onchange="geoLoadSourcePage(1)">
          <option value="all">全平台</option>
          <option value="doubao">豆包</option>
          <option value="deepseek">DeepSeek</option>
          <option value="yuanbao">元宝</option>
          <option value="kimi">Kimi</option>
        </select>
        <select id="geo-source-page-size" onchange="geoLoadSourcePage(1)">
          <option value="10" selected>10条/页</option>
          <option value="20">20条/页</option>
          <option value="50">50条/页</option>
          <option value="100">100条/页</option>
        </select>
      </div>
    </div>
    <div class="geo-dark">
      <div class="geo-source-head">
        <div>
          <div class="geo-source-title">GEO · 各平台信源分布</div>
          <div class="geo-source-desc">AI 检索场景下的站点信源分布与占比</div>
        </div>
        <div class="geo-source-meta" id="geo-source-status">加载中...</div>
      </div>
      <div id="geo-source-list"><div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">加载中...</div></div>
      <div id="geo-source-pager"></div>
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
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <div id="geo-intent-visibility-filter" style="display:inline-flex;gap:4px;flex-wrap:wrap"></div>
            <div id="geo-intent-plat-filter" style="display:inline-flex;gap:4px;flex-wrap:wrap"></div>
          </div>
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
      <div class="geo-filter-row" style="flex-wrap:wrap;gap:8px">
        <span class="geo-label">时间范围</span>
        <input type="date" id="geo-conv-date-start" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" onchange="geoConversionDateRangeChanged()">
        <span style="font-size:12px;color:#6b7280">至</span>
        <input type="date" id="geo-conv-date-end" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" onchange="geoConversionDateRangeChanged()">
        <div style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;margin-left:4px">
          <button onclick="geoConversionQuickPeriod('7d')" class="geo-conv-period-btn" data-period="7d" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#fff;color:#374151;transition:all .15s">近7天</button>
          <button onclick="geoConversionQuickPeriod('30d')" class="geo-conv-period-btn active" data-period="30d" style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;background:#2563eb;color:#fff;transition:all .15s">近30天</button>
        </div>
        <span class="geo-label" style="margin-left:8px">数据T+1更新</span>
      </div>
      <div class="geo-status-line" id="geo-conversion-status">待接口提供数据 · 数据T+1更新</div>

      <div class="geo-conv-section">
        <div class="geo-conv-title">UV 趋势</div>
        <div id="gc-uv-trend"><div class="geo-pending"><div class="geo-pending-title">UV 趋势待接口提供数据</div></div></div>
      </div>

      <div class="geo-conv-section">
        <div class="geo-conv-title">GEO看板 · 整体（URL 包含 lenovo，排除 wiki.lenovo.com.cn）</div>
        <div class="geo-interface-note">接口待提供：当前仅展示字段结构；访问、登录、注册、购买和乐享下单转化数据接入后替换占位。</div>
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
        <div class="geo-interface-note">接口待提供：当前仅展示字段结构；乐享访问、互动、购买和自主下单数据接入后替换占位。</div>
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

      <div class="geo-conv-section">
        <div class="geo-conv-title">联想官网 · 总数看板</div>
        <div class="geo-interface-note">接口待提供：UV 站点拆分、Top5 页面、销量/销售额总数及业务拆分接入后替换占位。</div>
        <div class="geo-official-board">
          <div class="geo-official-total-card">
            <div class="gcc-label">总 UV（不含挂奖页面）</div>
            <div class="gcc-val" id="gc-official-uv">--</div>
            <div class="gcc-def">按被触点归属统计后的联想官网访问用户数</div>
          </div>
          <div class="geo-official-donut-card">
            <div class="gcc-label">UV 按站点拆分</div>
            <div class="geo-official-donut">
              <div class="geo-donut-placeholder">待接口提供数据</div>
              <div class="geo-donut-list">
                <span>联想首页 <strong id="gc-official-home-uv">--</strong></span>
                <span>联想商城 <strong id="gc-official-shop-uv">--</strong></span>
                <span>消费业务 <strong id="gc-official-c-uv">--</strong></span>
                <span>SMB业务 <strong id="gc-official-b-uv">--</strong></span>
                <span>政企业务 <strong id="gc-official-biz-uv">--</strong></span>
                <span>服务 <strong id="gc-official-service-uv">--</strong></span>
                <span>其他 <strong id="gc-official-other-uv">--</strong></span>
              </div>
            </div>
          </div>
          <div class="geo-official-trend-card">
            <div class="gcc-label">UV 趋势（不含挂奖页面）</div>
            <div class="geo-pending compact">待接口提供数据</div>
          </div>
          <div class="geo-official-top-card">
            <div class="gcc-label">用户访问 Top5 页面</div>
            <div class="geo-conv-top-pages" id="gc-official-top-pages"></div>
          </div>
          <div class="geo-official-sales-card">
            <div class="gcc-label">销量概览</div>
            <div class="gcc-val" id="gc-official-total-ca">--</div>
            <div class="geo-business-split"><span>消费商品 <strong id="gc-official-c-ca">--</strong></span><span>SMB商品 <strong id="gc-official-b-ca">--</strong></span><span>政企商品 <strong id="gc-official-biz-ca">--</strong></span></div>
          </div>
          <div class="geo-official-sales-card">
            <div class="gcc-label">销售额概览（元）</div>
            <div class="gcc-val" id="gc-official-total-gmv">--</div>
            <div class="geo-business-split"><span>消费商品 <strong id="gc-official-c-gmv">--</strong></span><span>SMB商品 <strong id="gc-official-b-gmv">--</strong></span><span>政企商品 <strong id="gc-official-biz-gmv">--</strong></span></div>
          </div>
        </div>
        <div class="geo-business-title">分业务模块</div>
        <div class="geo-business-modules">
          ${['消费业务','SMB业务（含企业购）','政企业务'].map((name, idx) => `
            <div class="geo-business-module">
              <div class="geo-business-name">${name}</div>
              <div class="geo-business-grid">
                <div><span>业务归属 UV</span><strong>待接口提供数据</strong></div>
                <div><span>UV 趋势</span><strong>待接口提供数据</strong></div>
                <div class="wide"><span>业务 UV Top5 页面</span><strong>待接口提供数据</strong></div>
                <div><span>业务销量</span><strong>待接口提供数据</strong></div>
                <div><span>业务销售额</span><strong>待接口提供数据</strong></div>
              </div>
            </div>`).join('')}
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
    <div class="kpi-grid employee-kpi-grid">
      <div class="kpi-card employee-kpi-card" onclick="filterAndNavigate('all')">
        <div class="kpi-label">在职员工总数</div>
        <div class="kpi-value" id="kpi-total">2,847</div>
        <div class="kpi-sub"><span class="up">↑ 8%</span> 较上月</div>
      </div>
      <div class="kpi-card employee-kpi-card success" onclick="filterAndNavigate('approved')">
        <div class="kpi-label">已认证工数</div>
        <div class="kpi-value" id="kpi-approved">2,341</div>
        <div class="kpi-sub">82.3% 认证率</div>
      </div>
      <div class="kpi-card employee-kpi-card warning" onclick="filterAndNavigate('rejected')">
        <div class="kpi-label">已驳回工</div>
        <div class="kpi-value" id="kpi-rejected">45</div>
        <div class="kpi-sub">需重新认证</div>
      </div>
      <div class="kpi-card employee-kpi-card purple" onclick="filterAndNavigate('pending')">
        <div class="kpi-label">本月新增</div>
        <div class="kpi-value" id="kpi-pending">187</div>
        <div class="kpi-sub"><span class="up">↑ 15%</span> 环比</div>
      </div>
    </div>

    <!-- 认证方式分布 -->
    <div class="card employee-method-card">
      <div class="card-header">
        <span class="card-title">认证方式分布</span>
        <span class="employee-method-hint">点击筛选下方员工列表</span>
      </div>
      <div class="employee-method-grid">
        <button type="button" class="employee-method-tile" data-method="email" aria-pressed="false" onclick="filterByMethod('email')">
          <div class="employee-method-value" id="method-email">1,051</div>
          <div class="employee-method-label">企业邮箱</div>
          <div class="employee-method-sub">45%</div>
        </button>
        <button type="button" class="employee-method-tile success" data-method="contract" aria-pressed="false" onclick="filterByMethod('contract')">
          <div class="employee-method-value" id="method-contract">703</div>
          <div class="employee-method-label">劳动合同</div>
          <div class="employee-method-sub">30%</div>
        </button>
        <button type="button" class="employee-method-tile purple" data-method="tax" aria-pressed="false" onclick="filterByMethod('tax')">
          <div class="employee-method-value" id="method-tax">422</div>
          <div class="employee-method-label">个人所得税视频认证</div>
          <div class="employee-method-sub">18%</div>
        </button>
        <button type="button" class="employee-method-tile gray" data-method="other" aria-pressed="false" onclick="filterByMethod('other')">
          <div class="employee-method-value" id="method-other">165</div>
          <div class="employee-method-label">其他材料</div>
          <div class="employee-method-sub">7%</div>
        </button>
      </div>
    </div>

    <!-- 员工列表 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">在职员工列表</span>
        <span class="employee-active-filter" id="employee-method-filter-status" style="display:none"></span>
        <div class="employee-filter-row">
          <input type="text" id="emp-ov-search-name" placeholder="姓名..."/>
          <input type="text" id="emp-ov-search-position" placeholder="岗位信息..."/>
          <input type="text" id="emp-ov-search-company" placeholder="所属企业..."/>
          <select id="emp-ov-search-status">
            <option value="">全部状态</option>
            <option value="approved">认证成功</option>
            <option value="rejected">认证失败</option>
          </select>
          <input type="date" id="emp-ov-date-start" title="认证时间起"/>
          <span class="filter-separator">至</span>
          <input type="date" id="emp-ov-date-end" title="认证时间止"/>
          <button class="btn btn-sm btn-secondary" onclick="loadEmployeeOverviewTable()">搜索</button>
        </div>
      </div>
      <div class="employee-table-wrap">
      <table class="employee-data-table">
        <thead>
          <tr>
            <th class="check-col"><input type="checkbox"/></th>
            <th>账号</th>
            <th>真实姓名</th>
            <th>LenovoID</th>
            <th>关联手机号</th>
            <th>岗位信息</th>
            <th>所属企业</th>
            <th>职员认证状态</th>
            <th>认证方式</th>
            <th>认证时间</th>
            <th>当前状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="emp-overview-tbody">
          <tr><td colspan="13" class="table-empty-cell">加载中...</td></tr>
        </tbody>
      </table>
      </div>
      <div class="employee-pagination">
        <div>
          共 <span id="emp-overview-count">0</span> 条记录，当前第 <span id="emp-overview-page">1</span> 页，共 <span id="emp-overview-total-pages">1</span> 页
        </div>
        <div class="pagination-actions">
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
        <div class="employee-filter-row">
          <input type="text" id="emp-search-name" placeholder="姓名..."/>
          <input type="text" id="emp-search-position" placeholder="岗位信息..."/>
          <input type="text" id="emp-search-company" placeholder="所属企业..."/>
          <select id="emp-search-status">
            <option value="">全部状态</option>
            <option value="approved">认证成功</option>
            <option value="rejected">认证失败</option>
          </select>
          <input type="date" id="emp-date-start" title="认证时间起"/>
          <span class="filter-separator">至</span>
          <input type="date" id="emp-date-end" title="认证时间止"/>
          <button class="btn btn-sm btn-secondary" onclick="loadEmployeeList(1)">搜索</button>
        </div>
      </div>
      <div class="employee-table-wrap">
      <table class="employee-data-table">
        <thead>
          <tr>
            <th class="check-col"><input type="checkbox"/></th>
            <th>账号</th>
            <th>真实姓名</th>
            <th>LenovoID</th>
            <th>关联手机号</th>
            <th>岗位信息</th>
            <th>所属企业</th>
            <th>职员认证状态</th>
            <th>认证方式</th>
            <th>认证时间</th>
            <th>当前状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="emp-list-tbody">
          <tr><td colspan="13" class="table-empty-cell">加载中...</td></tr>
        </tbody>
      </table>
      </div>
      <div class="employee-pagination">
        <div>
          共 <span id="emp-total-count">0</span> 条记录，当前第 <span id="emp-current-page">1</span> 页，共 <span id="emp-total-pages">1</span> 页
        </div>
        <div class="pagination-actions">
          <button id="emp-prev-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeList(Math.max(1, parseInt(document.getElementById('emp-current-page').textContent) - 1))">上一页</button>
          <button id="emp-next-btn" class="btn btn-sm btn-secondary" onclick="loadEmployeeList(parseInt(document.getElementById('emp-current-page').textContent) + 1)">下一页</button>
        </div>
      </div>
    </div>
  `,

  'employee.certification': () => `
    <div class="page-header">
      <div>
        <div class="page-title">认证审核管理</div>
        <div class="page-desc">查看认证记录，对认证失败的用户可修改认证结果</div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="employee-cert-tabs">
      <button class="tab-btn active" data-status="rejected" onclick="switchCertTab('rejected', this)" id="tab-rejected">
        <span>认证失败</span> <span class="tab-count danger">(60)</span>
      </button>
      <button class="tab-btn" data-status="approved" onclick="switchCertTab('approved', this)">
        <span>认证成功</span> <span class="tab-count success">(645)</span>
      </button>
      <button class="tab-btn" data-status="pending" onclick="switchCertTab('pending', this)">
        <span>待审核</span> <span class="tab-count primary">(49)</span>
      </button>
      <button class="tab-btn" data-status="expired" onclick="switchCertTab('expired', this)">
        <span>已失效</span> <span class="tab-count muted">(0)</span>
      </button>
    </div>

    <div class="card employee-cert-card">
      <!-- 搜索过滤区 -->
      <div class="employee-cert-filter">
        <div class="employee-cert-filter-grid">
          <input type="text" id="cert-search-no" placeholder="搜索申请编号"/>
          <input type="text" id="cert-search-company" placeholder="企业名称..."/>
          <input type="text" id="cert-search-position" placeholder="岗位名称..."/>
          <select id="cert-search-method">
            <option value="">认证方式 - 全部</option>
            <option value="email">企业邮箱</option>
            <option value="contract">劳动合同</option>
            <option value="tax">个人所得税视频认证</option>
            <option value="other">其他材料</option>
          </select>
          <select id="cert-search-source">
            <option value="">来源 - 全部</option>
            <option value="online">线上</option>
            <option value="offline">线下</option>
          </select>
          <button class="btn btn-primary" onclick="loadCertificationTable()">搜索</button>
        </div>
      </div>

      <!-- 认证列表表格 -->
      <div class="employee-table-wrap">
      <table class="employee-cert-table">
        <thead>
          <tr>
            <th class="check-col">
              <input type="checkbox"/>
            </th>
            <th>申请编号</th>
            <th>用户</th>
            <th>认证方式</th>
            <th>企业名称</th>
            <th>认证时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="cert-list-tbody">
          <tr><td colspan="9" class="table-empty-cell">加载中...</td></tr>
        </tbody>
      </table>
      </div>

      <!-- 分页 -->
      <div class="employee-pagination in-card">
        <div>
          共 <span id="cert-total-count">0</span> 条记录 | 第 <span id="cert-current-page">1</span> 页 / 共 <span id="cert-total-pages">1</span> 页
        </div>
        <div class="pagination-actions">
          <button class="btn btn-sm btn-secondary" onclick="loadCertificationTable(Math.max(1, parseInt(document.getElementById('cert-current-page').textContent) - 1))">上一页</button>
          <span class="page-input-wrap">
            <input type="number" id="cert-page-input" value="1" min="1"/>
          </span>
          <button class="btn btn-sm btn-secondary" onclick="goToCertPage()">跳转</button>
          <button class="btn btn-sm btn-secondary" onclick="loadCertificationTable(parseInt(document.getElementById('cert-current-page').textContent) + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 审核详情面板 -->
    <div class="card employee-cert-detail-card" id="cert-detail-card">
      <div class="card-header">
        <span class="card-title">审核详情</span>
      </div>
      <div class="employee-empty-detail">
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
    const methodLabel = cert.method === 'email' ? '企业邮箱' : cert.method === 'contract' ? '劳动合同' : cert.method === 'tax' ? '个人所得税视频认证' : '其他材料';
    const isTaxVideo = cert.method === 'tax';
    const canModifyResult = cert.status === 'rejected' || cert.status === 'pending';
    const materialCards = isTaxVideo ? `
                  <div class="employee-material-tile" onclick="showMaterialPreview('${cert.method}', '▶')">
                    <div class="employee-material-icon">▶</div>
                    <div class="employee-material-name">个税APP任职受雇信息录屏.mp4</div>
                  </div>
                  <div class="employee-material-tile" onclick="showMaterialPreview('辅助职位证明', '📄')">
                    <div class="employee-material-icon">📄</div>
                    <div class="employee-material-name">辅助职位证明.jpg</div>
                  </div>
                ` : `
                  <div class="employee-material-tile" onclick="showMaterialPreview('${cert.method}', '📄')">
                    <div class="employee-material-icon">📄</div>
                    <div class="employee-material-name">${cert.method === 'contract' ? '劳动合同.pdf' : '认证材料.pdf'}</div>
                  </div>
                  <div class="employee-material-tile" onclick="showMaterialPreview('在职证明', '📄')">
                    <div class="employee-material-icon">📄</div>
                    <div class="employee-material-name">在职证明.jpg</div>
                  </div>
                `;
    const verificationItems = isTaxVideo ? `
                  <label><input type="checkbox" checked/> 视频页面是否为「任职受雇信息」</label>
                  <label><input type="checkbox" checked/> 姓名是否匹配</label>
                  <label><input type="checkbox" checked/> 任职受雇企业名称是否匹配</label>
                  <label><input type="checkbox" checked/> 任职状态是否有效</label>
                  <label><input type="checkbox" checked/> 录屏视频是否清晰完整</label>
                ` : `
                  <label><input type="checkbox" checked/> 姓名是否匹配</label>
                  <label><input type="checkbox" checked/> 企业名称是否匹配</label>
                  <label><input type="checkbox" checked/> 有效期是否符合（六个月内）</label>
                  <label><input type="checkbox" checked/> 印章是否清晰</label>
                `;

    return `
      <div class="employee-detail-page">
        <button class="btn btn-secondary employee-back-btn" onclick="switchPage('employee.certification')">← 返回列表</button>

        <div class="employee-detail-layout">
          <!-- 左侧用户卡片 -->
          <div class="card employee-profile-card">
            <div class="employee-avatar">
              ${firstLetter}
            </div>
            <div class="employee-profile-name">${cert.applicant_name}</div>
            <div class="employee-profile-meta">昵称：${cert.nickname || '-'}</div>
            <div class="employee-profile-meta">LenovoID：${cert.lenovo_id || '-'}</div>

            <div class="employee-profile-info">
              <div>申请时间：${cert.created_at}</div>
              <div>申请类型：${cert.cert_type || '首次申请'}</div>
              <div>
                <span class="status-pill ${cert.status === 'approved' ? 'success' : cert.status === 'rejected' ? 'danger' : 'muted'}">
                  ${cert.status === 'approved' ? '认证成功' : cert.status === 'rejected' ? '认证失败' : '已失效'}
                </span>
              </div>
            </div>
          </div>

          <!-- 右侧信息区 -->
          <div class="employee-detail-stack">
            <!-- 申请基本信息 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">申请基本信息</span>
              </div>
              <div class="employee-detail-section">
                <div class="employee-info-grid">
                  <div>
                    <div class="employee-field-label">申请编号</div>
                    <div class="employee-field-value strong">${cert.id}</div>
                  </div>
                  <div>
                    <div class="employee-field-label">申请类型</div>
                    <div class="employee-field-value">${cert.cert_type || '首次申请'}</div>
                  </div>
                  <div>
                    <div class="employee-field-label">认证方式</div>
                    <div class="employee-field-value">${methodLabel}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 用户信息审核 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">用户信息审核</span>
              </div>
              <div class="employee-detail-section">
                <div class="employee-audit-row">
                  <div>
                    <div class="employee-field-value strong">真实姓名</div>
                    <div class="employee-field-label">${cert.real_name || cert.applicant_name}</div>
                  </div>
                  <div class="employee-audit-pass">与实名认证信息一致</div>
                </div>
                <div class="employee-audit-row">
                  <div>
                    <div class="employee-field-value strong">企业信息</div>
                    <div class="employee-field-label">${cert.company || '-'}</div>
                  </div>
                  <div class="employee-audit-pass">已核实</div>
                </div>
                <div class="employee-audit-row last">
                  <div>
                    <div class="employee-field-value strong">职位信息</div>
                    <div class="employee-field-label">${cert.position || '-'}</div>
                  </div>
                  <div class="employee-audit-pass">已核实</div>
                </div>
              </div>
            </div>

            <!-- 认证材料审核 -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">认证材料审核</span>
              </div>
              <div class="employee-detail-section">
                <div class="employee-field-label">已上传材料：</div>
                <div class="employee-material-grid">
                  ${materialCards}
                </div>
                ${isTaxVideo ? `<div class="employee-helper-text">视频需展示个人所得税 APP「个人中心 - 任职受雇信息」页面，包含姓名、任职受雇公司和任职状态；如需证明具体岗位，可查看辅助职位材料。</div>` : ''}

                <div class="employee-field-label">验证项：</div>
                <div class="employee-check-list">
                  ${verificationItems}
                </div>
              </div>
            </div>

            <!-- 状态修改操作 -->
            ${canModifyResult ? `<div class="card">
              <div class="card-header employee-card-header">
                <span class="card-title">修改认证结果</span>
                <span class="card-note">仅用于客服人工介入，将认证失败的用户改为认证成功</span>
              </div>
              <div class="employee-detail-section">
                <div class="employee-alert warning">
                  此操作将直接变更用户认证状态为「认证成功」，请确认已核实用户身份信息。
                </div>

                <div class="employee-form-group">
                  <label>操作备注（必填）</label>
                  <textarea id="cert-review-remark" placeholder="请说明修改原因，如：用户重新提交了清晰的合同照片"></textarea>
                </div>

                <div class="employee-action-row">
                  <button class="btn btn-primary employee-review-action" onclick="submitCertReview('${cert.id}')">变更为认证成功</button>
                  <button class="btn btn-secondary employee-review-action" onclick="switchPage('employee.certification')">取消</button>
                </div>
              </div>
            </div>` : ''}
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
