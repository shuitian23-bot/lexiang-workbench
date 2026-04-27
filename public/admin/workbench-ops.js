// ===== 运营分析模块 =====
// 流量分析 / GMV分析 / 敏感词库 / Query业务分析

// ===== 敏感词库：localStorage持久化（API-ready） =====
function opsLoadKeywords() {
  try { return JSON.parse(localStorage.getItem('ops_keywords') || '[]'); } catch { return []; }
}
function opsSaveKeywords(list) { localStorage.setItem('ops_keywords', JSON.stringify(list)); }

// ===== 通用时间筛选HTML =====
function opsTimeFilter(id) {
  return `<div class="ops-time-filter" id="${id}">
    <select class="ops-select" onchange="opsTimeChanged('${id}',this.value)">
      <option value="7d">最近7天</option><option value="14d">最近14天</option>
      <option value="30d" selected>最近30天</option><option value="90d">最近90天</option>
      <option value="custom">自定义</option>
    </select>
    <span class="ops-date-range" id="${id}-range"></span>
  </div>`;
}
function opsTimeChanged(id, val) {
  const range = document.getElementById(id + '-range');
  if (!range) return;
  if (val === 'custom') {
    range.innerHTML = '<input type="date" class="ops-date-input"> 至 <input type="date" class="ops-date-input">';
  } else {
    range.textContent = '';
  }
}

// ===== PAGE RENDERERS =====
Object.assign(PAGE_RENDERERS, {

  'ops.traffic': () => `
    <div class="page-header">
      <div><div class="page-title">流量分析</div><div class="page-desc">分端口 · 分业务 · 分监测入口 · 登录态 · DAU/MAU</div></div>
      ${opsTimeFilter('traffic-time')}
    </div>
    <div class="ops-section-title">📊 核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-dau">-</div><div class="ops-kpi-label">DAU（日活）</div><div class="ops-kpi-sub">新用户 <span id="ops-t-dau-new">-</span> · 老用户 <span id="ops-t-dau-old">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-mau">-</div><div class="ops-kpi-label">MAU（月活）</div><div class="ops-kpi-sub">新用户 <span id="ops-t-mau-new">-</span> · 老用户 <span id="ops-t-mau-old">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-sessions">-</div><div class="ops-kpi-label">会话数</div><div class="ops-kpi-sub">人均 <span id="ops-t-avg-sess">-</span> 次</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-pv">-</div><div class="ops-kpi-label">PV（页面浏览）</div><div class="ops-kpi-sub">跳出率 <span id="ops-t-bounce">-</span></div></div>
    </div>

    <div class="ops-section-title">📱 分端口流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><canvas id="ops-t-port-chart"></canvas></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><canvas id="ops-t-port-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">🏢 分业务流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务占比</h3><div class="chart-wrap-sm"><canvas id="ops-t-biz-chart"></canvas></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><canvas id="ops-t-biz-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">📡 分监测入口</div>
    <div class="ops-card"><h3>各入口流量分布</h3><div class="chart-wrap"><canvas id="ops-t-source-chart"></canvas></div></div>

    <div class="ops-section-title">🔐 登录态分析</div>
    <div class="grid-2">
      <div class="ops-card"><h3>登录/未登录用户占比</h3><div class="chart-wrap-sm"><canvas id="ops-t-login-chart"></canvas></div></div>
      <div class="ops-card"><h3>互动行为（登录/未登录 × 主动/被动）</h3>
        <div class="ops-matrix">
          <table class="data-table">
            <thead><tr><th></th><th>主动互动</th><th>被动互动</th><th>合计</th></tr></thead>
            <tbody>
              <tr><td style="font-weight:600">登录用户</td><td id="ops-t-login-active">-</td><td id="ops-t-login-passive">-</td><td id="ops-t-login-total">-</td></tr>
              <tr><td style="font-weight:600">未登录用户</td><td id="ops-t-anon-active">-</td><td id="ops-t-anon-passive">-</td><td id="ops-t-anon-total">-</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="ops-section-title">📈 DAU/MAU 新老用户拆解</div>
    <div class="ops-card"><h3>日活用户趋势（新/老拆分）</h3><div class="chart-wrap"><canvas id="ops-t-dau-trend"></canvas></div></div>
    <div class="ops-note">💡 数据来源：乐享运营后台统计接口。DAU/MAU拆新老用户需求已提需求，待数据就位后自动对接。</div>
  `,

  'ops.gmv': () => `
    <div class="page-header">
      <div><div class="page-title">GMV 分析</div><div class="page-desc">交易额趋势 · 分业务 · 分端口 · 分平台 · 分商品</div></div>
      ${opsTimeFilter('gmv-time')}
    </div>
    <div class="ops-section-title">💰 GMV 核心指标</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-val" id="ops-g-total">-</div><div class="ops-kpi-label">总GMV</div><div class="ops-kpi-sub">较上期 <span id="ops-g-change">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-orders">-</div><div class="ops-kpi-label">订单数</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-aov">-</div><div class="ops-kpi-label">客单价</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-cvr">-</div><div class="ops-kpi-label">转化率</div></div>
    </div>

    <div class="ops-section-title">📈 总GMV趋势</div>
    <div class="ops-card"><div class="chart-wrap"><canvas id="ops-g-trend-chart"></canvas></div></div>

    <div class="ops-section-title">🏢 分业务GMV（消费/SMB/政企）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务GMV占比</h3><div class="chart-wrap-sm"><canvas id="ops-g-biz-pie"></canvas></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><canvas id="ops-g-biz-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">📱 分端口GMV</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><canvas id="ops-g-port-pie"></canvas></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><canvas id="ops-g-port-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">🌐 分平台GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>官网 vs 非官网</h3><div class="chart-wrap-sm"><canvas id="ops-g-platform-chart"></canvas></div></div>
      <div class="ops-card"><h3>分平台趋势</h3><div class="chart-wrap"><canvas id="ops-g-platform-trend"></canvas></div></div>
    </div>

    <div class="ops-section-title">🛒 分商品GMV TOP10</div>
    <div class="ops-card">
      <table class="data-table">
        <thead><tr><th>排名</th><th style="text-align:left">商品</th><th>GMV</th><th>订单数</th><th>占比</th></tr></thead>
        <tbody id="ops-g-product-table"></tbody>
      </table>
    </div>
    <div class="ops-note">💡 GMV数据待对接交易系统接口，当前为结构占位。数据就位后将自动展示。</div>
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
  const ports = ['PC Web', 'H5/移动Web', '小程序', 'APP'];
  const bizs = ['消费', 'SMB', '政企'];
  const sources = ['customer_service', 'xiaotian', 'club', 'ai_baji', 'product_detail', 'direct'];
  const days = Array.from({length:7}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-6+i); return (d.getMonth()+1)+'/'+d.getDate(); });

  opsChart('ops-t-port-chart', 'doughnut', ports, [{
    data: [42, 31, 18, 9], backgroundColor: ['#0f3460','#2563eb','#7c3aed','#06b6d4']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-t-port-trend', 'line', days, ports.map((p,i) => ({
    label: p, data: days.map(() => Math.floor(Math.random()*5000+2000)),
    borderColor: ['#0f3460','#2563eb','#7c3aed','#06b6d4'][i], tension: 0.3, fill: false
  })));

  opsChart('ops-t-biz-chart', 'doughnut', bizs, [{
    data: [58, 27, 15], backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-t-biz-trend', 'line', days, bizs.map((b,i) => ({
    label: b, data: days.map(() => Math.floor(Math.random()*8000+3000)),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  opsChart('ops-t-source-chart', 'bar', sources, [{
    label: '访问量', data: [44948, 5234, 1213, 760, 293, 1850],
    backgroundColor: ['#0f3460','#2563eb','#7c3aed','#f59e0b','#06b6d4','#10b981']
  }]);

  opsChart('ops-t-login-chart', 'doughnut', ['登录用户','未登录用户'], [{
    data: [62, 38], backgroundColor: ['#2563eb','#d1d5db']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-t-dau-trend', 'bar', days, [
    { label: '新用户', data: days.map(() => Math.floor(Math.random()*2000+800)), backgroundColor: 'rgba(37,99,235,0.7)' },
    { label: '老用户', data: days.map(() => Math.floor(Math.random()*6000+3000)), backgroundColor: 'rgba(15,52,96,0.7)' }
  ], { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
}

function opsRenderGMV() {
  opsDestroyCharts();
  const days = Array.from({length:14}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-13+i); return (d.getMonth()+1)+'/'+d.getDate(); });
  const bizs = ['消费','SMB','政企'];
  const ports = ['PC','H5','小程序','APP'];

  opsChart('ops-g-trend-chart', 'line', days, [{
    label: 'GMV(万元)', data: days.map(() => Math.floor(Math.random()*5000+8000)),
    borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3
  }]);

  opsChart('ops-g-biz-pie', 'doughnut', bizs, [{
    data: [55, 28, 17], backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-g-biz-trend', 'line', days, bizs.map((b,i) => ({
    label: b, data: days.map(() => Math.floor(Math.random()*3000+1000)),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  opsChart('ops-g-port-pie', 'doughnut', ports, [{
    data: [45, 30, 15, 10], backgroundColor: ['#0f3460','#2563eb','#7c3aed','#06b6d4']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-g-port-trend', 'line', days, ports.map((p,i) => ({
    label: p, data: days.map(() => Math.floor(Math.random()*2000+500)),
    borderColor: ['#0f3460','#2563eb','#7c3aed','#06b6d4'][i], tension: 0.3, fill: false
  })));

  opsChart('ops-g-platform-chart', 'doughnut', ['官网','非官网'], [{
    data: [68, 32], backgroundColor: ['#2563eb','#94a3b8']
  }], { plugins: { legend: { position: 'right' } } });

  opsChart('ops-g-platform-trend', 'line', days, [
    { label: '官网', data: days.map(() => Math.floor(Math.random()*4000+5000)), borderColor: '#2563eb', tension: 0.3, fill: false },
    { label: '非官网', data: days.map(() => Math.floor(Math.random()*2000+2000)), borderColor: '#94a3b8', tension: 0.3, fill: false }
  ]);

  const products = [
    ['ThinkPad X9-14 Aura AI元启版', 2847, 156],
    ['YOGA Air 14 Aura AI元启版', 2203, 134],
    ['拯救者 R7000P 2025 AI元启', 1876, 98],
    ['联想小新Pro14GT AI元启版', 1543, 87],
    ['ThinkPad P14s 2025 AI元启版', 1210, 72],
    ['ThinkBook 16+ 2025', 980, 65],
    ['YOGA Book 9i', 856, 43],
    ['拯救者 Y9000P 2025', 743, 51],
    ['联想小新Air15 2025', 621, 48],
    ['ThinkCentre M920', 534, 39]
  ];
  const total = products.reduce((s,p) => s+p[1], 0);
  const tbody = document.getElementById('ops-g-product-table');
  if (tbody) tbody.innerHTML = products.map((p,i) => `<tr>
    <td>${i+1}</td><td style="text-align:left">${p[0]}</td>
    <td style="font-weight:600">${p[1].toLocaleString()}万</td><td>${p[2].toLocaleString()}</td>
    <td>${(p[1]/total*100).toFixed(1)}%</td>
  </tr>`).join('');
}

function opsRenderQueryBiz() {
  opsDestroyCharts();
  const days = Array.from({length:14}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-13+i); return (d.getMonth()+1)+'/'+d.getDate(); });
  const bizs = ['消费','SMB','政企'];

  opsChart('ops-q-biz-trend', 'line', days, bizs.map((b,i) => ({
    label: b, data: days.map(() => Math.floor(Math.random()*3000+500)),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  opsChart('ops-q-biz-pie', 'doughnut', bizs, [{
    data: [62, 23, 15], backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }], { plugins: { legend: { position: 'right' } } });

  const govSubs = ['采购咨询','批量报价','政府补贴','集团定制','政企专属服务','售后支持'];
  opsChart('ops-q-gov-sub', 'bar', govSubs, [{
    label: 'Query数', data: [380, 295, 210, 185, 150, 120],
    backgroundColor: '#8b5cf6'
  }], { indexAxis: 'y' });
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
