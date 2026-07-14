// ===== 质量分析看板 =====
// 从 quality.html 提取，适配 workbench 上下文

const Q_CHART = {
  blue: '#3f78c5',
  blueMid: '#5b8def',
  blueSoft: '#9bbcff',
  green: '#58a86a',
  greenSoft: '#6ac69a',
  purple: '#7c5cff',
  purpleSoft: '#a996ff',
  teal: '#3f9ead',
  slate: '#8da2bf',
  amber: '#d6a458',
  amberSoft: '#e8c98f',
  neutral: '#aeb8c8',
  danger: '#c96464',
  dangerSoft: '#e3a1a1'
};
const Q_PALETTE = [Q_CHART.blue, Q_CHART.green, Q_CHART.purple, Q_CHART.blueMid, Q_CHART.greenSoft, Q_CHART.slate, Q_CHART.amber, Q_CHART.blueSoft, Q_CHART.neutral, Q_CHART.teal];
const Q_NEGATIVE_PALETTE = [Q_CHART.blue, Q_CHART.slate, Q_CHART.amber, Q_CHART.greenSoft, Q_CHART.blueSoft, Q_CHART.neutral];

let _qualityCharts = {};
let _qualityDateFrom = '';
let _qualityDateTo = '';
let _firstTokenMode = 'think';
let _waitLenMode = 'short';
let _qualityData = null;
let _currentQData = null;
let _currentQDates = [];

// ===== Mock Data =====
function _genMockData() {
  const dates = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  function walk(base, variance, min, max) {
    let val = base;
    return dates.map((_, i) => {
      val += (Math.random() - 0.48) * variance;
      val = Math.max(min, Math.min(max, val));
      const dow = new Date(today); dow.setDate(dow.getDate() - (29 - i));
      const day = dow.getDay();
      if (day === 0 || day === 6) val *= 0.75 + Math.random() * 0.1;
      return +val.toFixed(2);
    });
  }

  function walkInt(base, variance, min, max) {
    return walk(base, variance, min, max).map(v => Math.round(v));
  }

  const baseQueries = 9500;
  const activeQueries = walkInt(baseQueries, 300, 7000, 13000);
  const csQueries = walkInt(2800, 150, 1800, 4200);
  const thumbdownRates = walk(1.6, 0.08, 0.8, 3.2);
  const lowSatRates = walk(3.5, 0.12, 1.8, 6.0);
  const surveyRate = walk(0.38, 0.01, 0.28, 0.50);

  const daily = dates.map((d, i) => {
    const aq = activeQueries[i];
    const cq = csQueries[i];
    const tdRate = thumbdownRates[i];
    const lsRate = lowSatRates[i];
    const sr = surveyRate[i];
    const surveySamples = Math.round(aq * sr);
    const thumbdown = Math.round(aq * tdRate / 100);
    const lowSat = Math.round(surveySamples * lsRate / 100);
    const likeBase = Math.round(aq * (0.12 + Math.random() * 0.04));
    const dislike = Math.round(likeBase * (tdRate / 8 + 0.05));

    const perfBase = Math.max(200, 480 - i * 4 + (Math.random() - 0.5) * 40);
    const firstTokenAvg = Math.round(perfBase + (Math.random() - 0.5) * 30);
    const firstTokenP90 = Math.round(firstTokenAvg * 1.6 + (Math.random() - 0.5) * 50);
    const firstTokenP95 = Math.round(firstTokenP90 * 1.15 + (Math.random() - 0.5) * 40);
    const firstTokenP99 = Math.round(firstTokenP95 * 1.2 + (Math.random() - 0.5) * 60);

    const nocacheBase = Math.max(280, perfBase + 80 + (Math.random() - 0.5) * 30);
    const ftNoCacheAvg = Math.round(nocacheBase);
    const ftNoCacheP90 = Math.round(ftNoCacheAvg * 1.55 + (Math.random() - 0.5) * 50);
    const ftNoCacheP95 = Math.round(ftNoCacheP90 * 1.12 + (Math.random() - 0.5) * 40);
    const ftNoCacheP99 = Math.round(ftNoCacheP95 * 1.18 + (Math.random() - 0.5) * 60);

    const qaThinkBase = Math.max(300, 450 - i * 3 + (Math.random() - 0.5) * 30);
    const qaThinkP90 = Math.round(qaThinkBase * 1.55 + (Math.random() - 0.5) * 40);
    const qaThinkP99 = Math.round(qaThinkP90 * 1.18 + (Math.random() - 0.5) * 50);
    const qaNothinkBase = Math.max(140, 230 - i * 2 + (Math.random() - 0.5) * 20);
    const qaNothinkP90 = Math.round(qaNothinkBase * 1.5 + (Math.random() - 0.5) * 30);
    const qaNothinkP99 = Math.round(qaNothinkP90 * 1.15 + (Math.random() - 0.5) * 40);

    const osat = +(78 + i * 0.25 + (Math.random() - 0.5) * 2).toFixed(1);
    const nps = +(25 + i * 0.4 + (Math.random() - 0.5) * 5).toFixed(1);
    const netScore = +((likeBase - dislike) / (likeBase + dislike) * 100).toFixed(1);

    const turn1 = Math.round(aq * (0.38 + (Math.random() - 0.5) * 0.04));
    const turn2 = Math.round(aq * (0.22 + (Math.random() - 0.5) * 0.03));
    const turn3_4 = Math.round(aq * (0.18 + (Math.random() - 0.5) * 0.02));
    const turn5_9 = Math.round(aq * (0.12 + (Math.random() - 0.5) * 0.02));
    const turn10_19 = Math.round(aq * (0.06 + (Math.random() - 0.5) * 0.01));
    const turn20p = Math.round(aq * (0.04 + (Math.random() - 0.5) * 0.01));
    const totalSessions = turn1 + turn2 + turn3_4 + turn5_9 + turn10_19 + turn20p;
    const avgTurns = +((1*turn1 + 2*turn2 + 3.5*turn3_4 + 7*turn5_9 + 14.5*turn10_19 + 25*turn20p) / totalSessions).toFixed(1);
    const avgInteractions = +(avgTurns * 1.15 + (Math.random() - 0.5) * 0.3).toFixed(1);
    const multiTurnPct = +((totalSessions - turn1) / totalSessions * 100).toFixed(1);
    const singleTurnPct = +(turn1 / totalSessions * 100).toFixed(1);

    return {
      date: d,
      active_queries: aq,
      cs_queries: cq,
      thumbdown_count: thumbdown,
      low_sat_count: lowSat,
      survey_samples: surveySamples,
      cs_thumbdown: Math.round(cq * (tdRate / 100 * 0.6 + 0.005)),
      cs_transfer_rate: +(3.5 - i * 0.03 + (Math.random() - 0.5) * 0.6).toFixed(1),
      first_token_avg: firstTokenAvg,
      first_token_p90: firstTokenP90,
      first_token_p95: firstTokenP95,
      first_token_p99: firstTokenP99,
      first_token_nocache_avg: ftNoCacheAvg,
      first_token_nocache_p90: ftNoCacheP90,
      first_token_nocache_p95: ftNoCacheP95,
      first_token_nocache_p99: ftNoCacheP99,
      session_wait_avg: +(1.6 - i * 0.012 + (Math.random() - 0.5) * 0.15).toFixed(2),
      answer_wait_short: +(1.0 - i * 0.008 + (Math.random() - 0.5) * 0.1).toFixed(2),
      answer_wait_long: +(2.0 - i * 0.012 + (Math.random() - 0.5) * 0.15).toFixed(2),
      avg_turns: avgTurns,
      avg_interactions: avgInteractions,
      multi_turn_pct: multiTurnPct,
      single_turn_pct: singleTurnPct,
      error_pct: +(1.2 - i * 0.01 + (Math.random() - 0.5) * 0.3).toFixed(1),
      mcp_error: Math.round(8 - i * 0.1 + (Math.random() - 0.5) * 4),
      interrupt_rate: +(2.5 - i * 0.02 + (Math.random() - 0.5) * 0.4).toFixed(1),
      empty_resp_rate: +(0.3 + (Math.random() - 0.5) * 0.15).toFixed(2),
      osat: osat,
      nps: nps,
      net_score: netScore,
      like_count: likeBase,
      dislike_count: dislike,
      qa_think_avg: Math.round(qaThinkBase),
      qa_think_p90: qaThinkP90,
      qa_think_p99: qaThinkP99,
      qa_nothink_avg: Math.round(qaNothinkBase),
      qa_nothink_p90: qaNothinkP90,
      qa_nothink_p99: qaNothinkP99,
    };
  });

  const intentBase = [
    { intent: '电商售前', think: 580, nothink: 280 },
    { intent: '电商售后', think: 520, nothink: 250 },
    { intent: '服务场景', think: 650, nothink: 310 },
    { intent: '门店场景', think: 450, nothink: 220 },
    { intent: '会员场景', think: 480, nothink: 230 },
    { intent: '超级咨询', think: 560, nothink: 260 },
  ];
  const intentFirstToken = {
    think: intentBase.map(x => ({ intent: x.intent, avg: x.think + Math.round((Math.random() - 0.5) * 50) })),
    nothink: intentBase.map(x => ({ intent: x.intent, avg: x.nothink + Math.round((Math.random() - 0.5) * 30) })),
  };

  const qaFirstToken = {
    think: { avg: 420 + Math.round((Math.random() - 0.5) * 40), p90: 680 + Math.round((Math.random() - 0.5) * 60), p99: 900 + Math.round((Math.random() - 0.5) * 80) },
    nothink: { avg: 220 + Math.round((Math.random() - 0.5) * 30), p90: 380 + Math.round((Math.random() - 0.5) * 40), p99: 520 + Math.round((Math.random() - 0.5) * 60) },
  };

  const toolFailureBase = [
    { tool: '通用知识服务', base: 8 }, { tool: '商品知识服务', base: 5 },
    { tool: '解决方案服务', base: 4 }, { tool: '商品推荐服务', base: 2 },
    { tool: '维修知识检索', base: 3 }, { tool: '活动优惠服务', base: 2 },
    { tool: '商品优惠服务', base: 1 }, { tool: '行情洞察分析', base: 1 },
    { tool: '会员权益服务', base: 2 }, { tool: '会员权益一键领取', base: 1 },
    { tool: '设备中心', base: 3 }, { tool: '设备绑定服务', base: 1 },
    { tool: '门店知识检索', base: 2 }, { tool: '联想门店服务', base: 1 },
    { tool: '门店预约服务-更新', base: 1 }, { tool: '门店预约服务-取消', base: 1 },
    { tool: '门店预约服务-创建', base: 1 }, { tool: '订单详情', base: 2 },
    { tool: '会员中心', base: 1 }, { tool: '资产中心', base: 1 },
    { tool: '教育优惠认证', base: 1 }, { tool: '教育优惠认证-重选身份', base: 0 },
    { tool: '教育优惠认证-重发链接', base: 0 }, { tool: '臻选推荐服务', base: 1 },
    { tool: '立即支付', base: 1 }, { tool: '立即购买', base: 1 },
    { tool: '转人工', base: 2 }, { tool: '乐豆推荐商品', base: 1 },
    { tool: '优惠券ID查询商品接口', base: 0 }, { tool: '维修工单中心', base: 1 },
  ];
  const toolFailures = toolFailureBase.map(t => ({
    tool: t.tool,
    count: Math.max(0, t.base + Math.round((Math.random() - 0.5) * 3))
  }));

  const sceneFailures = [
    { scene: '电商售前', count: 8 + Math.round(Math.random() * 6) },
    { scene: '电商售后', count: 6 + Math.round(Math.random() * 5) },
    { scene: '服务场景', count: 7 + Math.round(Math.random() * 6) },
    { scene: '门店场景', count: 4 + Math.round(Math.random() * 4) },
    { scene: '会员场景', count: 3 + Math.round(Math.random() * 3) },
    { scene: '超级咨询场景', count: 5 + Math.round(Math.random() * 5) },
  ];

  const agentErrors = [
    { type: '超出工具集范围', count: 4 + Math.round(Math.random() * 4) },
    { type: '结果形态-格式错乱', count: 3 + Math.round(Math.random() * 3) },
    { type: '参数校验异常', count: 5 + Math.round(Math.random() * 5) },
    { type: '结果形态-空结果', count: 2 + Math.round(Math.random() * 3) },
    { type: '响应超时', count: 3 + Math.round(Math.random() * 4) },
    { type: '权限调用异常', count: 1 + Math.round(Math.random() * 2) },
    { type: '风控拦截', count: 1 + Math.round(Math.random() * 2) },
    { type: '大模型调用失败', count: 2 + Math.round(Math.random() * 2) },
  ];

  const coreToolErrors = [
    { tool: '立即支付', count: Math.round(Math.random() * 2) },
    { tool: '立即购买', count: Math.round(Math.random() * 2) },
    { tool: '设备绑定服务', count: Math.round(Math.random()) },
    { tool: '设备解绑服务', count: Math.round(Math.random() * 0.5) },
    { tool: '订单详情', count: Math.round(Math.random() * 2) },
    { tool: '乐豆推荐商品', count: Math.round(Math.random()) },
    { tool: '会员中心', count: Math.round(Math.random()) },
    { tool: '资产中心', count: Math.round(Math.random() * 0.5) },
    { tool: '教育优惠认证', count: Math.round(Math.random()) },
  ];

  const turnDepth = [
    { label: '1轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.38), 0) },
    { label: '2轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.22), 0) },
    { label: '3-4轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.18), 0) },
    { label: '5-9轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.12), 0) },
    { label: '10-19轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.06), 0) },
    { label: '20轮+', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.04), 0) },
  ];

  return { daily, intentFirstToken, qaFirstToken, toolFailures, sceneFailures, agentErrors, coreToolErrors, turnDepth };
}

function _filterData(data) {
  if (!_qualityDateFrom && !_qualityDateTo) return data;
  return {
    ...data,
    daily: data.daily.filter(d => {
      if (_qualityDateFrom && d.date < _qualityDateFrom) return false;
      if (_qualityDateTo && d.date > _qualityDateTo) return false;
      return true;
    })
  };
}

function qualityApplyFilter() {
  const fEl = document.getElementById('qDateFrom');
  const tEl = document.getElementById('qDateTo');
  if (fEl) _qualityDateFrom = fEl.value;
  if (tEl) _qualityDateTo = tEl.value;
  qualityRefresh();
}

function qualityClearFilter() {
  _qualityDateFrom = '';
  _qualityDateTo = '';
  const fEl = document.getElementById('qDateFrom');
  const tEl = document.getElementById('qDateTo');
  if (fEl) fEl.value = '';
  if (tEl) tEl.value = '';
  qualityRefresh();
}

function _setStyle(id, css) { const el = document.getElementById(id); if (el) el.style.cssText = css; }

function switchFirstTokenMode(mode) {
  _firstTokenMode = mode;
  _setStyle('q-ft-tab-think', mode === 'think' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)');
  _setStyle('q-ft-tab-nothink', mode === 'nothink' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)');
  renderFirstTokenByIntent();
  if (_currentQData) renderQaFirstToken(_currentQData, _currentQDates);
}

function switchWaitLenMode(mode) {
  _waitLenMode = mode;
  _setStyle('q-wait-tab-short', mode === 'short' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)');
  _setStyle('q-wait-tab-long', mode === 'long' ? 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06)' : 'padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)');
  renderAnswerWaitTrend(_currentQData);
}

function fmtNum(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  return n.toLocaleString();
}

function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function qualityRefresh() {
  if (!document.getElementById('qk-thumbdown-rate')) {
    setTimeout(qualityRefresh, 150);
    return;
  }
  if (!_qualityData) _qualityData = _genMockData();
  const data = _filterData(_qualityData);
  const t1Idx = Math.max(0, data.daily.length - 2);
  const latest = data.daily[t1Idx] || {};
  _setText('qk-thumbdown-rate', latest.active_queries ? (latest.thumbdown_count / (latest.active_queries - latest.cs_queries) * 100).toFixed(2) + '%' : '--');
  _setText('qk-lowsat-rate', latest.survey_samples ? (latest.low_sat_count / latest.survey_samples * 100).toFixed(2) + '%' : '--');
  _setText('qk-thumbdown-count', fmtNum(latest.thumbdown_count || 0));
  _setText('qk-lowsat-count', fmtNum(latest.low_sat_count || 0));
  _setText('qk-cs-thumbdown-rate', latest.cs_queries ? (latest.cs_thumbdown / latest.cs_queries * 100).toFixed(2) + '%' : '--');
  _setText('qk-cs-thumbdown-count', fmtNum(latest.cs_thumbdown || 0));
  _setText('qk-cs-total', fmtNum(latest.cs_queries || 0));
  _setText('qk-cs-transfer-rate', (latest.cs_transfer_rate || 0) + '%');
  _setText('qk-first-token-avg', (latest.first_token_avg || 0) + 'ms');
  _setText('qk-first-token-p90', (latest.first_token_p90 || 0) + 'ms');
  _setText('qk-first-token-p95', (latest.first_token_p95 || 0) + 'ms');
  _setText('qk-first-token-p99', (latest.first_token_p99 || 0) + 'ms');
  _setText('qk-avg-turns', latest.avg_turns || '--');
  _setText('qk-avg-interactions', latest.avg_interactions || '--');
  _setText('qk-multi-turn-pct', (latest.multi_turn_pct || 0) + '%');
  _setText('qk-single-turn-pct', (latest.single_turn_pct || 0) + '%');
  _setText('qk-error-pct', (latest.error_pct || 0) + '%');
  _setText('qk-mcp-error', latest.mcp_error || 0);
  _setText('qk-interrupt-rate', (latest.interrupt_rate || 0) + '%');
  _setText('qk-empty-resp-rate', (latest.empty_resp_rate || 0) + '%');
  _setText('qk-osat', (latest.osat || 0));
  _setText('qk-nps', (latest.nps || 0));
  _setText('qk-net-score', (latest.net_score || 0));
  if (window.echarts) {
    initCharts();
    renderAllCharts(data);
  }
}

let _qualityResizeBound = false;
function initCharts() {
  const ids = [
    'qChartSatisfactionTrend', 'qChartRateTrend', 'qChartCsThumbdownTrend',
    'qChartFirstTokenByIntent', 'qChartQaFirstToken', 'qChartSessionWait',
    'qChartFirstTokenTrend', 'qChartFirstTokenNoCacheTrend', 'qChartAnswerWaitTrend',
    'qChartTurnDepth', 'qChartInteractionTrend',
    'qChartSceneFailure',
    'qChartOsatTrend', 'qChartNpsTrend', 'qChartNetScoreTrend'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && !_qualityCharts[id]) {
      _qualityCharts[id] = echarts.init(el);
    }
  });
  if (!_qualityResizeBound) {
    _qualityResizeBound = true;
    window.addEventListener('resize', () => {
      Object.values(_qualityCharts).forEach(c => { try { c.resize(); } catch(e) {} });
    });
  }
}

const Q_MOTION = {
  animation: true,
  animationDuration: 720,
  animationEasing: 'cubicOut',
  animationDurationUpdate: 360,
  animationEasingUpdate: 'cubicOut'
};

const Q_LEGEND = {
  bottom: 6,
  itemWidth: 18,
  itemHeight: 8,
  itemGap: 16,
  padding: [8, 0, 0, 0],
  textStyle: { color: '#646a73', fontSize: 10, lineHeight: 14 }
};

const TH = {
  ...Q_MOTION,
  backgroundColor: 'transparent', textStyle: { color: '#646a73' },
  legend: Q_LEGEND,
  tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,0.08)' }
};

function _qLegend(data, extra) {
  return { ...Q_LEGEND, ...(data ? { data } : {}), ...(extra || {}) };
}

function _qAnimDelay(index) {
  return Math.min(index * 22, 260);
}

function _qPieDelay(index) {
  return Math.min(index * 70, 360);
}

function _qAlpha(color, alpha) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function _qArea(color) {
  return new echarts.graphic.LinearGradient(0,0,0,1,[
    { offset: 0, color: _qAlpha(color, 0.14) },
    { offset: 1, color: _qAlpha(color, 0.02) }
  ]);
}

function _qBar(color) {
  return new echarts.graphic.LinearGradient(0,0,1,0,[
    { offset: 0, color: _qAlpha(color, 0.72) },
    { offset: 1, color }
  ]);
}

function _qLineSeries(dates, series, colors, yAxisOpts) {
  return {
    tooltip: { trigger: 'axis' },
    legend: _qLegend(series.map(s => s.name)),
    grid: { left: 50, right: 16, top: 20, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, ...yAxisOpts }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: series.map((s, i) => ({
      name: s.name, type: 'line', data: s.data, smooth: true, symbol: 'circle', symbolSize: 4,
      lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i] },
      areaStyle: s.area ? { color: _qArea(colors[i]) } : undefined,
      animationDelay: _qAnimDelay,
    }))
  };
}

function renderAllCharts(data) {
  const dates = data.daily.map(d => d.date.slice(5));
  _currentQData = data;
  _currentQDates = dates;
  renderSatisfactionTrend(data, dates);
  renderRateTrend(data, dates);
  renderCsThumbdownTrend(data, dates);
  renderFirstTokenByIntent();
  renderQaFirstToken(data, dates);
  renderSessionWaitTrend(data, dates);
  renderFirstTokenTrend(data, dates);
  renderFirstTokenNoCacheTrend(data, dates);
  renderAnswerWaitTrend(data, dates);
  renderTurnDepth(data);
  renderInteractionTrend(data, dates);
  renderToolFailures(data);
  renderSceneFailure(data, dates);
  renderAgentErrors(data);
  renderCoreToolErrors(data);
  renderOsatTrend(data, dates);
  renderNpsTrend(data, dates);
  renderNetScoreTrend(data, dates);
}

function renderSatisfactionTrend(data, dates) {
  const ch = _qualityCharts['qChartSatisfactionTrend']; if (!ch) return;
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: _qLegend(['点踩case', '低满意度case']),
    grid: { left: 50, right: 16, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: [
      { name: '点踩case', type: 'bar', stack: 'total', data: data.daily.map(d => d.thumbdown_count), itemStyle: { color: _qBar(Q_CHART.blue), borderRadius: [2,2,0,0] }, barWidth: '55%', animationDelay: _qAnimDelay },
      { name: '低满意度case', type: 'bar', stack: 'total', data: data.daily.map(d => d.low_sat_count), itemStyle: { color: _qBar(Q_CHART.amber), borderRadius: [2,2,0,0] }, animationDelay: _qAnimDelay },
    ]
  });
}

function renderRateTrend(data, dates) {
  const ch = _qualityCharts['qChartRateTrend']; if (!ch) return;
  const tdRates = data.daily.map(d => d.active_queries ? +(d.thumbdown_count / (d.active_queries - d.cs_queries) * 100).toFixed(2) : 0);
  const lsRates = data.daily.map(d => d.survey_samples ? +(d.low_sat_count / d.survey_samples * 100).toFixed(2) : 0);
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis' },
    legend: _qLegend(['点踩率', '低满意率']),
    grid: { left: 50, right: 50, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: [
      { type: 'value', name: '点踩率', axisLabel: { color: Q_CHART.blue, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, nameTextStyle: { color: Q_CHART.blue, fontSize: 10 } },
      { type: 'value', name: '低满意率', axisLabel: { color: Q_CHART.amber, fontSize: 10, formatter: '{value}%' }, splitLine: { show: false }, nameTextStyle: { color: Q_CHART.amber, fontSize: 10 } },
    ],
    series: [
      { name: '点踩率', type: 'line', data: tdRates, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.blue }, itemStyle: { color: Q_CHART.blue }, animationDelay: _qAnimDelay },
      { name: '低满意率', type: 'line', yAxisIndex: 1, data: lsRates, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.amber }, itemStyle: { color: Q_CHART.amber }, animationDelay: _qAnimDelay },
    ]
  });
}

function renderCsThumbdownTrend(data, dates) {
  const ch = _qualityCharts['qChartCsThumbdownTrend']; if (!ch) return;
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis' },
    legend: _qLegend(['点踩case']),
    grid: { left: 50, right: 16, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: [{ name: '点踩case', type: 'line', data: data.daily.map(d => d.cs_thumbdown), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.blue }, itemStyle: { color: Q_CHART.blue }, areaStyle: { color: _qArea(Q_CHART.blue) }, animationDelay: _qAnimDelay }]
  });
}

function renderFirstTokenByIntent() {
  const ch = _qualityCharts['qChartFirstTokenByIntent']; if (!ch) return;
  const items = _qualityData.intentFirstToken[_firstTokenMode];
  const sorted = [...items].sort((a, b) => a.avg - b.avg);
  ch.setOption({
    ...Q_MOTION, backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 30, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    yAxis: { type: 'category', data: sorted.map(s => s.intent), axisLabel: { color: '#646a73', fontSize: 11 } },
    series: [{ type: 'bar', data: sorted.map(s => s.avg), itemStyle: { color: Q_CHART.blue, borderRadius: [0,3,3,0] }, barWidth: '55%', label: { show: true, position: 'right', formatter: '{c}ms', fontSize: 10, color: '#646a73' }, animationDelay: _qAnimDelay }]
  });
}

function renderQaFirstToken(data, dates) {
  const ch = _qualityCharts['qChartQaFirstToken']; if (!ch) return;
  const mode = _firstTokenMode;
  const prefix = mode === 'think' ? 'qa_think_' : 'qa_nothink_';
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis' },
    legend: _qLegend(['avg', 'p90', 'p99']),
    grid: { left: 50, right: 20, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: [
      { name: 'avg', type: 'line', data: data.daily.map(d => d[prefix + 'avg']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.blue }, itemStyle: { color: Q_CHART.blue }, areaStyle: { color: _qArea(Q_CHART.blue) }, animationDelay: _qAnimDelay },
      { name: 'p90', type: 'line', data: data.daily.map(d => d[prefix + 'p90']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.green }, itemStyle: { color: Q_CHART.green }, animationDelay: _qAnimDelay },
      { name: 'p99', type: 'line', data: data.daily.map(d => d[prefix + 'p99']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.purple }, itemStyle: { color: Q_CHART.purple }, animationDelay: _qAnimDelay },
    ]
  });
}

function renderSessionWaitTrend(data, dates) {
  const ch = _qualityCharts['qChartSessionWait']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: '平均等待(s)', data: data.daily.map(d => d.session_wait_avg), area: true },
  ], [Q_CHART.blue]), yAxis: { axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}s' } } });
}

function renderFirstTokenTrend(data, dates) {
  const ch = _qualityCharts['qChartFirstTokenTrend']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: 'avg' }, { name: 'p90' }, { name: 'p95' }, { name: 'p99' },
  ].map((s, i) => ({ ...s, data: data.daily.map(d => [d.first_token_avg, d.first_token_p90, d.first_token_p95, d.first_token_p99][i]) })), [Q_CHART.blue, Q_CHART.green, Q_CHART.purple, Q_CHART.slate]), yAxis: { axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' } } });
}

function renderFirstTokenNoCacheTrend(data, dates) {
  const ch = _qualityCharts['qChartFirstTokenNoCacheTrend']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: 'avg' }, { name: 'p90' }, { name: 'p95' }, { name: 'p99' },
  ].map((s, i) => ({ ...s, data: data.daily.map(d => [d.first_token_nocache_avg, d.first_token_nocache_p90, d.first_token_nocache_p95, d.first_token_nocache_p99][i]) })), [Q_CHART.blue, Q_CHART.green, Q_CHART.purple, Q_CHART.slate]), yAxis: { axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' } } });
}

function renderAnswerWaitTrend(data, dates) {
  const ch = _qualityCharts['qChartAnswerWaitTrend']; if (!ch) return;
  const key = _waitLenMode === 'short' ? 'answer_wait_short' : 'answer_wait_long';
  const label = _waitLenMode === 'short' ? '≤300字' : '>300字';
  const filtered = _filterData(_qualityData);
  const dts = filtered.daily.map(d => d.date.slice(5));
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis' },
    legend: _qLegend([label + '平均等待']),
    grid: { left: 50, right: 16, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dts, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}s' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: [{ name: label + '平均等待', type: 'line', data: filtered.daily.map(d => d[key]), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.blue }, itemStyle: { color: Q_CHART.blue }, areaStyle: { color: _qArea(Q_CHART.blue) }, animationDelay: _qAnimDelay }]
  });
}

function renderTurnDepth(data) {
  const ch = _qualityCharts['qChartTurnDepth']; if (!ch) return;
  const td = data.turnDepth || _qualityData.turnDepth;
  const total = td.reduce((s, t) => s + t.count, 0) || 1;
  ch.setOption({
    ...Q_MOTION, backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: _qLegend(),
    series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '44%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: td.map((t, i) => ({ name: t.label, value: t.count, itemStyle: { color: Q_PALETTE[i % Q_PALETTE.length] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } },
      animationDelay: _qPieDelay
    }]
  });
}

function renderInteractionTrend(data, dates) {
  const ch = _qualityCharts['qChartInteractionTrend']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: '平均对话轮数', data: data.daily.map(d => d.avg_turns) },
    { name: '人均交互次数', data: data.daily.map(d => d.avg_interactions) },
  ], [Q_CHART.blue, Q_CHART.purple]) });
}

function renderToolFailures(data) {
  const el = document.getElementById('qToolFailureTable'); if (!el) return;
  const tools = data.toolFailures || _qualityData.toolFailures;
  const sorted = [...tools].sort((a, b) => b.count - a.count);
  el.innerHTML = `<table class="data-table"><thead><tr><th style="text-align:left">工具</th><th>失败次数</th></tr></thead><tbody>` +
    sorted.map(t => `<tr><td style="text-align:left">${t.tool}</td><td style="color:${t.count > 5 ? 'var(--red)' : t.count > 2 ? 'var(--orange)' : 'var(--text)'}">${t.count}</td></tr>`).join('') +
    `</tbody></table>`;
}

function renderSceneFailure(data, dates) {
  const ch = _qualityCharts['qChartSceneFailure']; if (!ch) return;
  const scenes = data.sceneFailures || _qualityData.sceneFailures;
  const sorted = [...scenes].sort((a, b) => b.count - a.count);
  ch.setOption({
    ...Q_MOTION, backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    yAxis: { type: 'category', data: sorted.map(s => s.scene).reverse(), axisLabel: { color: '#646a73', fontSize: 11 } },
    series: [{ type: 'bar', data: sorted.map((s, i) => ({ value: s.count, itemStyle: { color: _qBar(Q_NEGATIVE_PALETTE[i % Q_NEGATIVE_PALETTE.length]) } })).reverse(), itemStyle: { borderRadius: [0,3,3,0] }, barWidth: '55%', label: { show: true, position: 'right', fontSize: 10, color: '#646a73' }, animationDelay: _qAnimDelay }]
  });
}

function renderAgentErrors(data) {
  const el = document.getElementById('qAgentErrorTable'); if (!el) return;
  const errors = data.agentErrors || _qualityData.agentErrors;
  const sorted = [...errors].sort((a, b) => b.count - a.count);
  el.innerHTML = `<table class="data-table"><thead><tr><th style="text-align:left">异常类型</th><th>次数</th></tr></thead><tbody>` +
    sorted.map(e => `<tr><td style="text-align:left">${e.type}</td><td style="color:${e.count > 5 ? 'var(--red)' : e.count > 2 ? 'var(--orange)' : 'var(--text)'}">${e.count}</td></tr>`).join('') +
    `</tbody></table>`;
}

function renderCoreToolErrors(data) {
  const el = document.getElementById('qCoreToolErrorTable'); if (!el) return;
  const tools = data.coreToolErrors || _qualityData.coreToolErrors;
  const sorted = [...tools].sort((a, b) => b.count - a.count);
  el.innerHTML = `<table class="data-table"><thead><tr><th style="text-align:left">核心工具</th><th>异常次数</th></tr></thead><tbody>` +
    sorted.map(t => `<tr><td style="text-align:left">${t.tool}</td><td style="color:${t.count > 3 ? 'var(--red)' : t.count > 1 ? 'var(--orange)' : 'var(--text)'}">${t.count}</td></tr>`).join('') +
    `</tbody></table>`;
}

function renderOsatTrend(data, dates) {
  const ch = _qualityCharts['qChartOsatTrend']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: 'OSAT', data: data.daily.map(d => d.osat), area: true },
  ], [Q_CHART.green]), yAxis: { min: 50, max: 100 } });
}

function renderNpsTrend(data, dates) {
  const ch = _qualityCharts['qChartNpsTrend']; if (!ch) return;
  ch.setOption({ ...TH, ..._qLineSeries(dates, [
    { name: 'NPS', data: data.daily.map(d => d.nps), area: true },
  ], [Q_CHART.purple]) });
}

function renderNetScoreTrend(data, dates) {
  const ch = _qualityCharts['qChartNetScoreTrend']; if (!ch) return;
  const netScores = data.daily.map(d => {
    const like = d.like_count || 0;
    const dislike = d.dislike_count || 0;
    const total = like + dislike;
    return total > 0 ? +((like - dislike) / total * 100).toFixed(2) : 0;
  });
  ch.setOption({
    ...TH, tooltip: { trigger: 'axis' },
    legend: _qLegend(['净评价值']),
    grid: { left: 50, right: 16, top: 10, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: [{ name: '净评价值', type: 'line', data: netScores, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: Q_CHART.blue }, itemStyle: { color: Q_CHART.blue }, areaStyle: { color: _qArea(Q_CHART.blue) }, animationDelay: _qAnimDelay }]
  });
}
