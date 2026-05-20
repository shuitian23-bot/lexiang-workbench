// ===== 运营分析模块 =====
// 流量分析 / GMV分析 / 敏感词库 / Query业务分析

// ===== 敏感词库：localStorage持久化（API-ready） =====
function opsLoadKeywords() {
  try { return JSON.parse(localStorage.getItem('ops_keywords') || '[]'); } catch { return []; }
}
function opsSaveKeywords(list) { localStorage.setItem('ops_keywords', JSON.stringify(list)); }

const OPS_STATE = {
  trafficRange: '30d',
  trafficCustomStart: '',
  trafficCustomEnd: '',
  trafficMetric: 'uv',
  gmvRange: '30d',
  gmvCustomStart: '',
  gmvCustomEnd: '',
  gmvTrendScope: 'all'
};

const OPS_TRAFFIC_METRICS = {
  uv: { label: '访问', field: 'uv' },
  login: { label: '登录', field: 'login' },
  inter: { label: '互动', field: 'inter' }
};

// ===== 通用时间筛选HTML =====
function opsTimeKind(id) {
  return id.startsWith('traffic') ? 'traffic' : 'gmv';
}

function opsEnsureCustomRange(kind) {
  const bounds = typeof leaiDateBounds === 'function' ? leaiDateBounds() : { min: '', max: '' };
  if (kind === 'traffic') {
    OPS_STATE.trafficCustomStart ||= bounds.min;
    OPS_STATE.trafficCustomEnd ||= bounds.max;
  } else {
    OPS_STATE.gmvCustomStart ||= bounds.min;
    OPS_STATE.gmvCustomEnd ||= bounds.max;
  }
}

function opsTimeFilter(id) {
  const kind = opsTimeKind(id);
  const range = kind === 'traffic' ? OPS_STATE.trafficRange : OPS_STATE.gmvRange;
  const bounds = typeof leaiDateBounds === 'function' ? leaiDateBounds() : { min: '', max: '' };
  const customStart = kind === 'traffic' ? (OPS_STATE.trafficCustomStart || bounds.min) : (OPS_STATE.gmvCustomStart || bounds.min);
  const customEnd = kind === 'traffic' ? (OPS_STATE.trafficCustomEnd || bounds.max) : (OPS_STATE.gmvCustomEnd || bounds.max);
  const customFilter = range === 'custom' ? `
    <span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${bounds.min}" max="${bounds.max}" value="${customStart}" onchange="opsCustomTimeChanged('${id}','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${bounds.min}" max="${bounds.max}" value="${customEnd}" onchange="opsCustomTimeChanged('${id}','end',this.value)">
    </span>` : '';
  return `<div class="ops-time-filter" id="${id}">
    <select class="ops-select" onchange="opsTimeChanged('${id}',this.value)">
      ${['1d','7d','14d','30d','custom'].map(v => `<option value="${v}" ${range === v ? 'selected' : ''}>${leaiRangeLabel(v)}</option>`).join('')}
    </select>
    ${customFilter}
    <span class="ops-date-range" id="${id}-range"></span>
  </div>`;
}
function opsTimeChanged(id, val) {
  if (opsTimeKind(id) === 'traffic') {
    OPS_STATE.trafficRange = val;
    if (val === 'custom') opsEnsureCustomRange('traffic');
    switchPage('ops.traffic');
  } else {
    OPS_STATE.gmvRange = val;
    if (val === 'custom') opsEnsureCustomRange('gmv');
    switchPage('ops.gmv');
  }
}

function opsCustomTimeChanged(id, part, value) {
  const kind = opsTimeKind(id);
  if (kind === 'traffic') {
    OPS_STATE.trafficRange = 'custom';
    if (part === 'start') OPS_STATE.trafficCustomStart = value;
    if (part === 'end') OPS_STATE.trafficCustomEnd = value;
    if (OPS_STATE.trafficCustomStart && OPS_STATE.trafficCustomEnd && OPS_STATE.trafficCustomStart > OPS_STATE.trafficCustomEnd) {
      if (part === 'start') OPS_STATE.trafficCustomEnd = OPS_STATE.trafficCustomStart;
      if (part === 'end') OPS_STATE.trafficCustomStart = OPS_STATE.trafficCustomEnd;
    }
    switchPage('ops.traffic');
  } else {
    OPS_STATE.gmvRange = 'custom';
    if (part === 'start') OPS_STATE.gmvCustomStart = value;
    if (part === 'end') OPS_STATE.gmvCustomEnd = value;
    if (OPS_STATE.gmvCustomStart && OPS_STATE.gmvCustomEnd && OPS_STATE.gmvCustomStart > OPS_STATE.gmvCustomEnd) {
      if (part === 'start') OPS_STATE.gmvCustomEnd = OPS_STATE.gmvCustomStart;
      if (part === 'end') OPS_STATE.gmvCustomStart = OPS_STATE.gmvCustomEnd;
    }
    switchPage('ops.gmv');
  }
}

function opsRows(range, source, customStart, customEnd) {
  return typeof leaiRows === 'function' ? leaiRows(range, source, customStart, customEnd) : (source || []).slice(-30);
}

function opsRowsForDates(source, baseRows) {
  const dates = new Set(baseRows.map(r => r.d));
  return (source || []).filter(r => dates.has(r.d));
}

function opsSeriesForDates(source, baseRows, key) {
  const map = new Map((source || []).map(r => [r.d, r]));
  return baseRows.map(r => Number(map.get(r.d)?.[key]) || 0);
}

function opsPortSummary(baseRows, metric) {
  const L = leaiGetData();
  const dates = new Set(baseRows.map(r => r.d));
  return Object.entries(L?.traffic || {}).map(([name, rows]) => {
    const picked = rows.filter(r => dates.has(r.d));
    return {
      name,
      uv: leaiSum(picked, 'uv'),
      login: leaiSum(picked, 'login'),
      inter: leaiSum(picked, 'inter'),
      buy: leaiSum(picked, 'buy'),
      gmv: leaiSum(picked, 'gmv'),
      value: leaiSum(picked, metric)
    };
  }).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
}

function opsSetGmvTrendScope(scope) {
  OPS_STATE.gmvTrendScope = scope;
  opsRenderGMV();
}

function opsSetTrafficMetric(metric) {
  OPS_STATE.trafficMetric = metric;
  opsRenderTraffic();
}

function opsTrafficMetricPills() {
  return Object.entries(OPS_TRAFFIC_METRICS).map(([key, meta]) =>
    `<button class="dash-pill ${OPS_STATE.trafficMetric === key ? 'active' : ''}" onclick="opsSetTrafficMetric('${key}')">${meta.label}</button>`
  ).join('');
}

// ===== PAGE RENDERERS =====
Object.assign(PAGE_RENDERERS, {

  'ops.traffic': () => `
    <div class="page-header">
      <div><div class="page-title">流量分析</div><div class="page-desc">核心活跃趋势 · 监测入口 · 分端口 · 分业务</div></div>
      ${opsTimeFilter('traffic-time')}
    </div>
    <div class="ops-section-title">核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-dau">-</div><div class="ops-kpi-label">DAU（日活）</div><div class="ops-kpi-sub">日均登录 <span id="ops-t-dau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-mau">-</div><div class="ops-kpi-label">MAU（月活）</div><div class="ops-kpi-sub">月登录均值 <span id="ops-t-mau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-login">-</div><div class="ops-kpi-label">登录用户</div><div class="ops-kpi-sub">选期累计</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-inter">-</div><div class="ops-kpi-label">互动用户</div><div class="ops-kpi-sub">选期累计</div></div>
    </div>

    <div class="ops-section-title">DAU / MAU 趋势</div>
    <div class="ops-card"><div class="chart-wrap"><canvas id="ops-t-user-trend"></canvas></div></div>

    <div class="ops-section-title">监测入口 TOP10</div>
    <div class="ops-card">
      <div class="ops-card-head">
        <h3>按入口查看流量贡献</h3>
        <div class="dash-filter-bar">${opsTrafficMetricPills()}</div>
      </div>
      <table class="data-table">
        <thead><tr><th style="text-align:left">入口</th><th>访问量</th><th>登录</th><th>互动</th><th>购买</th><th>占比</th></tr></thead>
        <tbody id="ops-t-source-table"></tbody>
      </table>
    </div>

    <div class="ops-section-title">分端口流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><canvas id="ops-t-port-chart"></canvas></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><canvas id="ops-t-port-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">分业务流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务占比</h3><div class="chart-wrap-sm"><canvas id="ops-t-biz-chart"></canvas></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><canvas id="ops-t-biz-trend"></canvas></div></div>
    </div>
  `,

  'ops.gmv': () => `
    <div class="page-header">
      <div><div class="page-title">GMV 分析</div><div class="page-desc">整体趋势 · 分业务 · 官网/非官网</div></div>
      ${opsTimeFilter('gmv-time')}
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
      <div class="chart-wrap"><canvas id="ops-g-trend-chart"></canvas></div>
    </div>

    <div class="ops-section-title">分业务 GMV</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务GMV占比</h3><div class="chart-wrap-sm"><canvas id="ops-g-biz-pie"></canvas></div></div>
      <div class="ops-card">
        <h3>业务贡献明细</h3>
        <table class="data-table">
          <thead><tr><th style="text-align:left">业务</th><th>GMV</th><th>购买人数</th><th>占比</th></tr></thead>
          <tbody id="ops-g-biz-table"></tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">分平台 GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>官网 vs 非官网</h3><div class="chart-wrap-sm"><canvas id="ops-g-platform-chart"></canvas></div></div>
      <div class="ops-card"><h3>平台趋势</h3><div class="chart-wrap"><canvas id="ops-g-platform-trend"></canvas></div></div>
    </div>
  `,

  'ops.keywords': () => {
    const keywords = opsLoadKeywords();
    const grouped = {};
    keywords.forEach(k => { (grouped[k.category] = grouped[k.category] || []).push(k); });
    return `
    <div class="page-header">
      <div><div class="page-title">敏感词库</div><div class="page-desc">维护业务敏感词，统计分析相关Query命中情况</div></div>
      <button class="btn btn-primary" onclick="opsShowAddKeyword()">+ 添加词条</button>
    </div>
    <div class="ops-kw-stats">
      <div class="ops-kpi"><div class="ops-kpi-val">${keywords.length}</div><div class="ops-kpi-label">词库总数</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val">${Object.keys(grouped).length}</div><div class="ops-kpi-label">分类数</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val">-</div><div class="ops-kpi-label">今日命中Query</div><div class="ops-kpi-sub">待接入</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val">-</div><div class="ops-kpi-label">命中率</div><div class="ops-kpi-sub">待接入</div></div>
    </div>

    <div id="ops-kw-add-form" style="display:none" class="ops-card" style="margin-bottom:16px">
      <h3>添加敏感词</h3>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <input id="ops-kw-word" class="ops-input" placeholder="敏感词" style="flex:2">
        <select id="ops-kw-cat" class="ops-select" style="flex:1">
          <option value="政企">政企</option><option value="消费">消费</option><option value="SMB">SMB</option>
          <option value="品牌">品牌</option><option value="竞品">竞品</option><option value="其他">其他</option>
        </select>
        <select id="ops-kw-level" class="ops-select" style="flex:1">
          <option value="高">高敏感</option><option value="中">中敏感</option><option value="低">低敏感</option>
        </select>
        <button class="btn btn-primary" onclick="opsAddKeyword()">添加</button>
        <button class="btn btn-secondary" onclick="document.getElementById('ops-kw-add-form').style.display='none'">取消</button>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-tertiary)">支持批量：多个词用逗号分隔</div>
    </div>

    <div class="ops-section-title">📋 词库列表</div>
    ${Object.keys(grouped).length === 0 ? '<div class="ops-card" style="text-align:center;padding:40px;color:var(--text-tertiary)">词库为空，点击上方按钮添加敏感词</div>' :
      Object.entries(grouped).map(([cat, words]) => `
        <div class="ops-card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3>${cat} <span style="font-size:12px;color:var(--text-tertiary);font-weight:400">(${words.length}个)</span></h3>
          </div>
          <div class="ops-kw-tags">${words.map(w => `<span class="ops-kw-tag ${w.level === '高' ? 'danger' : w.level === '中' ? 'warn' : ''}" title="${w.level}敏感" data-word="${w.word}" data-cat="${w.category}">
            ${w.word} <span class="ops-kw-del" onclick="opsDelKeyword('${w.word}','${w.category}')">×</span>
          </span>`).join('')}</div>
        </div>`).join('')}

    <div class="ops-section-title">📊 命中分析</div>
    <div class="ops-card">
      <div style="text-align:center;padding:30px;color:var(--text-tertiary)">
        命中分析功能将在Query数据接入后自动启用。<br>
        将展示：各敏感词被Query命中的次数、趋势、热力图。
      </div>
    </div>
    `;
  },

  'ops.queryBiz': () => `
    <div class="page-header">
      <div><div class="page-title">Query 业务分析</div><div class="page-desc">按业务维度分析Query，重点分析政企相关场景</div></div>
      ${opsTimeFilter('qbiz-time')}
    </div>

    <div class="ops-section-title">📊 业务维度 Query 概览</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-q-total">-</div><div class="ops-kpi-label">总Query数</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-q-consumer">-</div><div class="ops-kpi-label">消费业务Query</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-q-smb">-</div><div class="ops-kpi-label">SMB业务Query</div></div>
      <div class="ops-kpi" style="border-color:#8b5cf6"><div class="ops-kpi-val" style="color:#8b5cf6" id="ops-q-gov">-</div><div class="ops-kpi-label">政企业务Query</div></div>
    </div>

    <div class="ops-section-title">🏛️ 政企 Query 深度分析</div>
    <div class="ops-card" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-color:#c4b5fd">
      <h3 style="color:#6d28d9">政企Query四象限分析</h3>
      <div class="ops-gov-matrix">
        <table class="data-table">
          <thead>
            <tr><th></th><th style="background:#f5f3ff">政企问题</th><th style="background:#fef3c7">非政企问题</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600;background:#f5f3ff">政企客群</td>
              <td id="ops-q-gov-gov">
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">政企用户问政企问题</div>
                </div>
              </td>
              <td id="ops-q-gov-other">
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">政企用户问非政企问题</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-weight:600;background:#fef3c7">非政企客群</td>
              <td id="ops-q-other-gov">
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">非政企用户问政企问题</div>
                </div>
              </td>
              <td style="color:var(--text-tertiary);text-align:center">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">📋 政企答复分析</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>包含政企内容的答复（政企客群）</h3>
        <div class="ops-placeholder" id="ops-q-reply-gov">
          <div>待数据接入后展示</div>
          <div class="ops-placeholder-desc">统计政企客群收到的包含政企内容的答复数量及占比</div>
        </div>
      </div>
      <div class="ops-card">
        <h3>包含政企内容的答复（非政企客群）</h3>
        <div class="ops-placeholder" id="ops-q-reply-other">
          <div>待数据接入后展示</div>
          <div class="ops-placeholder-desc">统计非政企客群收到的包含政企内容的答复数量及占比</div>
        </div>
      </div>
    </div>

    <div class="ops-section-title">📈 业务Query趋势</div>
    <div class="ops-card"><div class="chart-wrap"><canvas id="ops-q-biz-trend"></canvas></div></div>

    <div class="ops-section-title">🔍 业务Query分类详情</div>
    <div class="grid-2">
      <div class="ops-card"><h3>各业务Query占比</h3><div class="chart-wrap-sm"><canvas id="ops-q-biz-pie"></canvas></div></div>
      <div class="ops-card"><h3>政企子场景分布</h3><div class="chart-wrap"><canvas id="ops-q-gov-sub"></canvas></div></div>
    </div>
    <div class="ops-note">💡 业务Query分类依赖用户画像标签（客群识别）和Query意图分类引擎。当前为结构展示，数据就位后自动对接。</div>
  `
});

// ===== 敏感词库操作 =====
function opsShowAddKeyword() {
  document.getElementById('ops-kw-add-form').style.display = 'block';
  document.getElementById('ops-kw-word').focus();
}

function opsAddKeyword() {
  const wordInput = document.getElementById('ops-kw-word').value.trim();
  const cat = document.getElementById('ops-kw-cat').value;
  const level = document.getElementById('ops-kw-level').value;
  if (!wordInput) return;

  const words = wordInput.split(/[,，、;；\s]+/).filter(Boolean);
  const list = opsLoadKeywords();
  let added = 0;
  words.forEach(w => {
    if (!list.some(k => k.word === w && k.category === cat)) {
      list.push({ word: w, category: cat, level, addedAt: new Date().toISOString() });
      added++;
    }
  });
  opsSaveKeywords(list);
  if (added > 0) switchPage('ops.keywords');
}

function opsDelKeyword(word, cat) {
  const list = opsLoadKeywords().filter(k => !(k.word === word && k.category === cat));
  opsSaveKeywords(list);
  switchPage('ops.keywords');
}

// ===== Chart rendering for ops =====
let _opsCharts = {};
function opsDestroyCharts() { Object.values(_opsCharts).forEach(c => c && c.destroy()); _opsCharts = {}; }

function opsChart(id, type, labels, datasets, opts) {
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return;
  if (_opsCharts[id]) _opsCharts[id].destroy();
  _opsCharts[id] = new Chart(el, {
    type, data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: true, aspectRatio: type === 'doughnut' ? 1.6 : 2,
      plugins: { legend: { position: type === 'doughnut' ? 'right' : 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
      ...(type === 'bar' || type === 'line' ? { scales: { x: { ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { font: { size: 10 } } } } } : {}),
      ...opts }
  });
}

function opsRenderTraffic() {
  opsDestroyCharts();
  const L = leaiGetData();
  if (!L) return;
  const range = OPS_STATE.trafficRange;
  const rows = opsRows(range, L.daily, OPS_STATE.trafficCustomStart, OPS_STATE.trafficCustomEnd);
  const days = rows.map(r => r.d);
  const summary = leaiBuildSummary(range, OPS_STATE.trafficCustomStart, OPS_STATE.trafficCustomEnd);
  const metric = OPS_STATE.trafficMetric;
  const metricField = OPS_TRAFFIC_METRICS[metric]?.field || 'uv';
  const metricLabel = OPS_TRAFFIC_METRICS[metric]?.label || '访问';
  const portColors = ['#0f3460','#2563eb','#7c3aed','#06b6d4','#f59e0b','#10b981','#e94560','#94a3b8'];
  const portRows = opsPortSummary(rows, metricField);
  const topPortRows = portRows.slice(0, 8);

  opsChart('ops-t-user-trend', 'line', days, [
    { label: 'DAU', data: rows.map(r => r.dau), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.3, yAxisID: 'y' },
    { label: '登录', data: rows.map(r => r.login), borderColor: '#10b981', tension: 0.3, fill: false, yAxisID: 'y' },
    { label: 'MAU', data: rows.map(r => r.mau), borderColor: '#7c3aed', tension: 0.3, fill: false, yAxisID: 'y1' }
  ], {
    scales: {
      x: { ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } }
    }
  });

  opsChart('ops-t-port-chart', 'doughnut', topPortRows.map(r => r.name), [{
    data: topPortRows.map(r => r.value), backgroundColor: portColors.slice(0, topPortRows.length)
  }]);

  const topPorts = topPortRows.slice(0, 5).map(r => r.name);
  opsChart('ops-t-port-trend', 'line', days, topPorts.map((p,i) => ({
    label: `${p}${metricLabel}`, data: opsSeriesForDates(L.traffic[p], rows, metricField),
    borderColor: portColors[i], tension: 0.3, fill: false
  })));

  const bizNames = ['消费','SMB','政企'];
  const bizData = [L.consumer, L.smb, L.gov];
  const bizPicked = bizData.map(b => opsRowsForDates(b, rows));
  const bizField = metric === 'inter' ? 'inter' : 'login';
  const bizMetric = bizPicked.map(b => leaiSum(b, bizField));
  opsChart('ops-t-biz-chart', 'doughnut', bizNames, [{
    data: bizMetric, backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }]);

  opsChart('ops-t-biz-trend', 'line', days, bizNames.map((b,i) => ({
    label: `${b}${bizField === 'inter' ? '互动' : '登录'}`, data: opsSeriesForDates(bizData[i], rows, bizField),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  const tbody = document.getElementById('ops-t-source-table');
  if (tbody) {
    const totalValue = portRows.reduce((s, r) => s + r.value, 0);
    tbody.innerHTML = portRows.slice(0, 10).map(r => `<tr>
      <td style="text-align:left;font-weight:500">${r.name}</td>
      <td class="${metric === 'uv' ? 'ops-primary-cell' : ''}">${leaiFmtW(r.uv)}</td>
      <td class="${metric === 'login' ? 'ops-primary-cell' : ''}">${leaiFmtW(r.login)}</td>
      <td class="${metric === 'inter' ? 'ops-primary-cell' : ''}">${leaiFmtW(r.inter)}</td>
      <td>${r.buy.toLocaleString()}</td>
      <td>${leaiFmtPct(r.value, totalValue)}</td>
    </tr>`).join('');
  }

  const el = id => document.getElementById(id);
  if (el('ops-t-dau')) el('ops-t-dau').textContent = leaiFmtW(summary.dau);
  if (el('ops-t-mau')) el('ops-t-mau').textContent = leaiFmtW(summary.mau);
  if (el('ops-t-dau-login')) el('ops-t-dau-login').textContent = leaiFmtW(summary.loginAvg);
  if (el('ops-t-mau-login')) el('ops-t-mau-login').textContent = leaiFmtW(summary.loginM);
  if (el('ops-t-login')) el('ops-t-login').textContent = leaiFmtW(summary.login);
  if (el('ops-t-inter')) el('ops-t-inter').textContent = leaiFmtW(summary.inter);
}

function opsRenderGMV() {
  opsDestroyCharts();
  const L = leaiGetData();
  if (!L) return;
  const range = OPS_STATE.gmvRange;
  const rows = opsRows(range, L.daily, OPS_STATE.gmvCustomStart, OPS_STATE.gmvCustomEnd);
  const days = rows.map(r => r.d);
  const summary = leaiBuildSummary(range, OPS_STATE.gmvCustomStart, OPS_STATE.gmvCustomEnd);
  const el = id => document.getElementById(id);
  const bizNames = ['消费','SMB','政企'];
  const bizKeys = ['consumer','smb','gov'];
  const bizData = [L.consumer, L.smb, L.gov];
  const bizPicked = bizData.map(b => opsRowsForDates(b, rows));
  const bizGmv = bizPicked.map(b => leaiSum(b, 'gmv'));
  const bizBuy = bizPicked.map(b => leaiSum(b, 'buy'));

  if (el('ops-g-total')) el('ops-g-total').textContent = leaiFmtY(summary.gmv);
  if (el('ops-g-buy')) el('ops-g-buy').textContent = summary.buy.toLocaleString();
  if (el('ops-g-consumer')) el('ops-g-consumer').textContent = leaiFmtY(bizGmv[0]);
  if (el('ops-g-smb')) el('ops-g-smb').textContent = leaiFmtY(bizGmv[1]);
  if (el('ops-g-gov')) el('ops-g-gov').textContent = leaiFmtY(bizGmv[2]);
  if (el('ops-g-consumer-buy')) el('ops-g-consumer-buy').textContent = bizBuy[0].toLocaleString();
  if (el('ops-g-smb-buy')) el('ops-g-smb-buy').textContent = bizBuy[1].toLocaleString();
  if (el('ops-g-gov-buy')) el('ops-g-gov-buy').textContent = bizBuy[2].toLocaleString();

  ['all', 'consumer', 'smb', 'gov'].forEach(scope => {
    const btn = el('gmv-scope-' + scope);
    if (btn) btn.classList.toggle('active', OPS_STATE.gmvTrendScope === scope);
  });

  const colors = ['#2563eb','#f59e0b','#8b5cf6'];
  let trendSets;
  if (OPS_STATE.gmvTrendScope === 'all') {
    trendSets = [{ label: '整体GMV', data: rows.map(r => r.gmv), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.10)', fill: true, tension: 0.3 }];
  } else {
    const idx = bizKeys.indexOf(OPS_STATE.gmvTrendScope);
    trendSets = [{ label: bizNames[idx] + 'GMV', data: opsSeriesForDates(bizData[idx], rows, 'gmv'), borderColor: colors[idx], backgroundColor: colors[idx] + '22', fill: true, tension: 0.3 }];
  }
  opsChart('ops-g-trend-chart', 'line', days, trendSets);

  opsChart('ops-g-biz-pie', 'doughnut', bizNames, [{
    data: bizGmv, backgroundColor: colors
  }]);

  const bizTable = el('ops-g-biz-table');
  if (bizTable) {
    const rowsHtml = bizNames.map((name, i) => `<tr>
      <td style="text-align:left;font-weight:500"><span class="ops-dot" style="background:${colors[i]}"></span>${name}</td>
      <td>${leaiFmtY(bizGmv[i])}</td>
      <td>${bizBuy[i].toLocaleString()}</td>
      <td>${leaiFmtPct(bizGmv[i], summary.gmv)}</td>
    </tr>`).join('');
    bizTable.innerHTML = rowsHtml;
  }

  opsChart('ops-g-platform-chart', 'doughnut', ['官网','非官网'], [{
    data: [summary.offGmv, summary.nonGmv], backgroundColor: ['#2563eb','#94a3b8']
  }]);

  opsChart('ops-g-platform-trend', 'line', days, [
    { label: '官网', data: rows.map(r => r.offGmv), borderColor: '#2563eb', tension: 0.3, fill: false },
    { label: '非官网', data: rows.map(r => r.nonGmv), borderColor: '#94a3b8', tension: 0.3, fill: false }
  ]);
}

function opsRenderQueryBiz() {
  opsDestroyCharts();
  const L = typeof LEAI_DATA !== 'undefined' ? LEAI_DATA : null;
  if (!L) return;
  const days = L.daily.map(r => r.d);
  const bizNames = ['消费','SMB','政企'];
  const bizData = [L.consumer, L.smb, L.gov];

  // 用互动用户数作为Query量近似
  opsChart('ops-q-biz-trend', 'line', days, bizNames.map((b,i) => ({
    label: b, data: bizData[i].map(r => r.inter),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  const latestInter = bizData.map(b => b[b.length-1]?.inter || 0);
  opsChart('ops-q-biz-pie', 'doughnut', bizNames, [{
    data: latestInter, backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }]);

  // 政企子场景 — 暂无子场景分类数据，用互动数展示
  const govSubs = ['产品咨询','采购/报价','售后支持','批量定制','政策/补贴','其他'];
  opsChart('ops-q-gov-sub', 'bar', govSubs, [{
    label: '互动数(占位)', data: [15, 10, 8, 4, 2, 1],
    backgroundColor: '#8b5cf6'
  }], { indexAxis: 'y' });

  // 填充KPI
  const fmtW = v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v?.toLocaleString() || '-';
  const el = id => document.getElementById(id);
  const totalInter = latestInter.reduce((s,v) => s+v, 0);
  if (el('ops-q-total')) el('ops-q-total').textContent = fmtW(totalInter);
  if (el('ops-q-consumer')) el('ops-q-consumer').textContent = fmtW(latestInter[0]);
  if (el('ops-q-smb')) el('ops-q-smb').textContent = fmtW(latestInter[1]);
  if (el('ops-q-gov')) el('ops-q-gov').textContent = fmtW(latestInter[2]);
}

// ===== HOOK switchPage =====
const _origSwitchOps = switchPage;
switchPage = function(pageId) {
  _origSwitchOps(pageId);
  if (pageId.startsWith('ops.')) opsDestroyCharts();
  const map = {
    'ops.traffic': opsRenderTraffic,
    'ops.gmv': opsRenderGMV,
    'ops.queryBiz': opsRenderQueryBiz
  };
  if (map[pageId]) setTimeout(map[pageId], 80);
};
