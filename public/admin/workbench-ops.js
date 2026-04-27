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
  const L = typeof LEAI_DATA !== 'undefined' ? LEAI_DATA : null;
  if (!L) return;
  const lt = L.latest;
  const days = L.daily.map(r => r.d);

  // 分端口：取最新日各端口UV
  const portNames = Object.keys(L.traffic);
  const portColors = ['#0f3460','#2563eb','#7c3aed','#06b6d4','#f59e0b','#10b981','#e94560','#94a3b8'];
  const latestPortUV = portNames.map(p => { const arr = L.traffic[p]; return arr[arr.length-1]?.uv || 0; });

  opsChart('ops-t-port-chart', 'doughnut', portNames, [{
    data: latestPortUV, backgroundColor: portColors.slice(0, portNames.length)
  }]);

  const topPorts = portNames.filter((_, i) => latestPortUV[i] > 1000).slice(0, 5);
  opsChart('ops-t-port-trend', 'line', days, topPorts.map((p,i) => ({
    label: p, data: L.traffic[p].map(r => r.uv),
    borderColor: portColors[portNames.indexOf(p)], tension: 0.3, fill: false
  })));

  // 分业务：登录用户数
  const bizNames = ['消费','SMB','政企'];
  const bizData = [L.consumer, L.smb, L.gov];
  const latestBizLogin = bizData.map(b => b[b.length-1]?.login || 0);
  opsChart('ops-t-biz-chart', 'doughnut', bizNames, [{
    data: latestBizLogin, backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }]);

  opsChart('ops-t-biz-trend', 'line', days, bizNames.map((b,i) => ({
    label: b, data: bizData[i].map(r => r.login),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  // 分监测入口：用渠道数据
  const srcNames = portNames.slice(0, 8);
  opsChart('ops-t-source-chart', 'bar', srcNames, [{
    label: '日UV', data: latestPortUV.slice(0, 8),
    backgroundColor: portColors.slice(0, 8)
  }]);

  // 登录/未登录互动
  opsChart('ops-t-login-chart', 'doughnut', ['登录互动','非登录互动'], [{
    data: [lt.logInter, lt.anonInter], backgroundColor: ['#2563eb','#d1d5db']
  }]);

  // DAU趋势(登录/非登录拆分)
  opsChart('ops-t-dau-trend', 'bar', days, [
    { label: '登录用户', data: L.daily.map(r => r.login), backgroundColor: 'rgba(37,99,235,0.7)' },
    { label: '非登录(DAU-登录)', data: L.daily.map(r => r.dau - r.login), backgroundColor: 'rgba(15,52,96,0.4)' }
  ], { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });

  // 填充 KPI
  const fmtW = v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v?.toLocaleString() || '-';
  const el = id => document.getElementById(id);
  if (el('ops-t-dau')) el('ops-t-dau').textContent = fmtW(lt.dau);
  if (el('ops-t-mau')) el('ops-t-mau').textContent = fmtW(lt.mau);
  if (el('ops-t-sessions')) el('ops-t-sessions').textContent = fmtW(lt.inter);
  if (el('ops-t-pv')) el('ops-t-pv').textContent = fmtW(lt.logInter + lt.anonInter);
  if (el('ops-t-login-active')) el('ops-t-login-active').textContent = fmtW(lt.logInter);
  if (el('ops-t-anon-active')) el('ops-t-anon-active').textContent = fmtW(lt.anonInter);
  if (el('ops-t-login-total')) el('ops-t-login-total').textContent = fmtW(lt.logInter);
  if (el('ops-t-anon-total')) el('ops-t-anon-total').textContent = fmtW(lt.anonInter);
}

function opsRenderGMV() {
  opsDestroyCharts();
  const L = typeof LEAI_DATA !== 'undefined' ? LEAI_DATA : null;
  if (!L) return;
  const lt = L.latest;
  const days = L.daily.map(r => r.d);
  const fmtY = v => v >= 100000000 ? (v/100000000).toFixed(2)+'亿' : v >= 10000 ? (v/10000).toFixed(1)+'万' : v?.toLocaleString() || '-';
  const el = id => document.getElementById(id);

  // 填充KPI
  if (el('ops-g-total')) el('ops-g-total').textContent = fmtY(lt.gmvM);
  if (el('ops-g-orders')) el('ops-g-orders').textContent = lt.buyM?.toLocaleString() || '-';

  // 总GMV趋势
  opsChart('ops-g-trend-chart', 'line', days, [{
    label: '日GMV(元)', data: L.daily.map(r => r.gmv),
    borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3
  }]);

  // 分业务GMV
  const bizNames = ['消费','SMB','政企'];
  const bizData = [L.consumer, L.smb, L.gov];
  const latestBizGmvM = bizData.map(b => b[b.length-1]?.gmvM || 0);
  opsChart('ops-g-biz-pie', 'doughnut', bizNames, [{
    data: latestBizGmvM, backgroundColor: ['#2563eb','#f59e0b','#8b5cf6']
  }]);

  opsChart('ops-g-biz-trend', 'line', days, bizNames.map((b,i) => ({
    label: b, data: bizData[i].map(r => r.gmv),
    borderColor: ['#2563eb','#f59e0b','#8b5cf6'][i], tension: 0.3, fill: false
  })));

  // 分端口GMV
  const portNames = Object.keys(L.traffic).filter(p => {
    const arr = L.traffic[p]; return arr[arr.length-1]?.gmv > 0;
  }).slice(0, 5);
  const portColors = ['#0f3460','#2563eb','#7c3aed','#06b6d4','#f59e0b'];
  const latestPortGmv = portNames.map(p => { const arr = L.traffic[p]; return arr[arr.length-1]?.gmv || 0; });
  opsChart('ops-g-port-pie', 'doughnut', portNames, [{
    data: latestPortGmv, backgroundColor: portColors
  }]);

  opsChart('ops-g-port-trend', 'line', days, portNames.map((p,i) => ({
    label: p, data: L.traffic[p].map(r => r.gmv),
    borderColor: portColors[i], tension: 0.3, fill: false
  })));

  // 分平台GMV（官网/非官网）
  opsChart('ops-g-platform-chart', 'doughnut', ['官网','非官网'], [{
    data: [lt.offGmvM, lt.nonGmvM], backgroundColor: ['#2563eb','#94a3b8']
  }]);

  opsChart('ops-g-platform-trend', 'line', days, [
    { label: '官网', data: L.daily.map(r => r.offGmv), borderColor: '#2563eb', tension: 0.3, fill: false },
    { label: '非官网', data: L.daily.map(r => r.nonGmv), borderColor: '#94a3b8', tension: 0.3, fill: false }
  ]);

  // 商品TOP10 — 暂无商品粒度数据
  const tbody = el('ops-g-product-table');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:20px">商品粒度GMV数据待对接</td></tr>';
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
