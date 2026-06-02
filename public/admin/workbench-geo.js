// ===== GEO DASHBOARD JS (真实数据来自点亮AI /api/external/geo/*) =====
// 项目 project_id=143（联想乐享）
const GEO_PROJECT_ID = 143;
// 2026-05-13 接口：overview 不再支持 period/sources，品牌口径用 brands 切片。
// 当前外部接口只接受单个 brands 值，多品牌定义先保留在前端口径中。
const GEO_SCOPE_CONFIG = {
  all: {
    label: '整体',
    requestBrand: null,
    brandLabel: '联想品牌',
    trendField: 'all',
    aliases: ['联想','联想乐享','联想官方AI助手','联想企业超级智能体','联想超级智能体','联想官网','联想商城','Lenovo']
  },
  official: {
    label: '联想官网',
    requestBrand: '联想官网',
    brandLabel: '联想官网',
    trendField: 'brand_composite_exposure_rate',
    aliases: ['联想','联想官网','联想商城','Lenovo']
  },
  leai: {
    label: '联想乐享',
    requestBrand: '联想乐享',
    brandLabel: '联想乐享',
    trendField: 'brand_precise_exposure_rate',
    aliases: ['联想乐享','联想官方AI助手','联想企业超级智能体','联想超级智能体']
  }
};
// 联想乐享项目(143) 点亮AI 实际开启的平台：豆包/DeepSeek/元宝/Kimi（千问/文心/夸克未开启）
const GEO_PLATFORMS = ['doubao','deepseek','yuanbao','kimi'];
const geoState = { scope:'all', platform:'all', period:'30d', startDate:null, endDate:null, questions:[], apiData:null, platData:{}, compare:'brand', competitors:[], selectedKpi:'visible', _intentPlatform:'all', _intentVisibilityFilter:'all' };
const geoConversionState = { period:'30d', startDate:null, endDate:null };

// 算时段窗口：用户选了用用户的，否则按接口默认口径从昨天往前回推
function geoResolveDateRange() {
  if (geoState.startDate && geoState.endDate) return { start_date: geoState.startDate, end_date: geoState.endDate };
  const days = geoState.period === '7d' ? 7 : 30;
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { start_date: geoFmtDate(start), end_date: geoFmtDate(end) };
}
const GEO_COMPETITOR_COLORS = { hp:'#0096d6', dell:'#007db8', huawei:'#cf0a2c', apple:'#555555', asus:'#00529b', xiaomi:'#ff6900', acer:'#83b81a', honor:'#d4003c' };
const GEO_COMPETITOR_NAMES = { hp:'惠普', dell:'戴尔', huawei:'华为', apple:'苹果', asus:'华硕', xiaomi:'小米', acer:'宏碁', honor:'荣耀', oppo:'oppo', vivo:'vivo', samsung:'三星' };
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi' };
const geoPlatColors = { doubao:'#6366f1', deepseek:'#3b82f6', yuanbao:'#10b981', kimi:'#f59e0b' };
const GEO_PENDING_TEXT = '待接口提供数据';

function geoFmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function geoEscape(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function geoNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function geoFmtPct(v) {
  const n = geoNum(v);
  return n === null ? GEO_PENDING_TEXT : n.toFixed(2) + '%';
}

function geoFmtCount(v) {
  const n = geoNum(v);
  return n === null ? GEO_PENDING_TEXT : n.toLocaleString();
}

function geoSetValue(id, value, formatter = geoFmtCount) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = formatter(value);
  el.textContent = text;
  el.classList.toggle('is-pending', text === GEO_PENDING_TEXT);
}

function geoPendingHtml(message = GEO_PENDING_TEXT) {
  return `<div class="geo-pending"><div class="geo-pending-title">${geoEscape(message)}</div></div>`;
}

function geoPendingInline(message = GEO_PENDING_TEXT) {
  return `<span class="geo-pending-inline">${geoEscape(message)}</span>`;
}

function geoSetSectionPending(ids) {
  ids.forEach(id => geoSetValue(id, null));
}

function geoScopeConfig(scope = geoState.scope) {
  return GEO_SCOPE_CONFIG[scope] || GEO_SCOPE_CONFIG.all;
}

function geoRequestBrand(scope = geoState.scope) {
  return geoScopeConfig(scope).requestBrand;
}

function geoBrandLabel(scope = geoState.scope) {
  return geoScopeConfig(scope).brandLabel;
}

function geoTrendField(scope = geoState.scope) {
  return geoScopeConfig(scope).trendField;
}

function geoPickFirst(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return null;
}

function geoCitationMetrics(row = {}) {
  return {
    link: geoPickFirst(row, ['lenovo_link_citation_count','lenovo_citation_count','official_citation_count']),
    wiki: geoPickFirst(row, ['lenovo_wiki_citation_count','wiki_citation_count']),
    shop: geoPickFirst(row, ['wiki_shop_citation_count','shop_wiki_citation_count','lenovo_wiki_shop_citation_count']),
    consumer: geoPickFirst(row, ['wiki_c_citation_count','consumer_wiki_citation_count','lenovo_wiki_c_citation_count']),
    smb: geoPickFirst(row, ['wiki_b_citation_count','smb_wiki_citation_count','lenovo_wiki_b_citation_count']),
    biz: geoPickFirst(row, ['wiki_biz_citation_count','biz_wiki_citation_count','lenovo_wiki_biz_citation_count'])
  };
}

function geoDrawCanvasPending(canvas, message = GEO_PENDING_TEXT) {
  if (!canvas) return;
  if (canvas.id === 'geo-trend-canvas') {
    const legend = document.getElementById('geo-trend-legend');
    if (legend) legend.innerHTML = geoPendingInline(message);
  }
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 800;
  const height = rect.height || canvas.height || 280;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e5e7eb';
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.fillStyle = '#8f959e';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, width / 2, height / 2);
}

function geoSelectedModels() {
  return geoState.platform === 'all' ? [] : geoState.platform.split(',').filter(Boolean);
}

function geoSelectedQuestion() {
  return geoState.questions?.[0] || '';
}

function geoSelectedCompetitors() {
  return (geoState.competitors || []).map(k => GEO_COMPETITOR_NAMES[k] || k).filter(Boolean);
}

function geoCurrentPlatformLabel() {
  const models = geoSelectedModels();
  if (!models.length) return '全平台';
  return models.map(m => geoPlatNames[m] || m).join('、');
}

function geoCurrentDateLabel() {
  const range = geoResolveDateRange();
  return `${range.start_date} ~ ${range.end_date}`;
}

function geoCurrentModeLabel() {
  if (geoState.scope === 'leai') return '品牌表现';
  return geoState.compare === 'compare' ? '竞品对比' : '品牌表现';
}

function geoCurrentScopeText() {
  const cfg = geoScopeConfig();
  const scopeWord = geoState.scope === 'all' ? '联想品牌词' : `${cfg.label}品牌词`;
  return `当前口径：${scopeWord} · ${geoCurrentPlatformLabel()} · ${geoCurrentDateLabel()} · ${geoCurrentModeLabel()}`;
}

function geoUpdateContextLine() {
  const el = document.getElementById('geo-context-line');
  if (el) el.textContent = geoCurrentScopeText();
  const title = document.getElementById('geo-trend-title');
  if (title) title.textContent = `${geoBrandLabel()}可见性趋势`;
  const trendGap = document.getElementById('geo-trend-gap-note');
  if (trendGap) {
    const showCompareGap = geoState.scope !== 'leai' && geoState.compare === 'compare';
    trendGap.style.display = showCompareGap ? '' : 'none';
    trendGap.textContent = showCompareGap
      ? '接口缺口：当前仅返回竞品综合趋势；各竞品独立趋势待接口提供数据。'
      : '';
  }
}

function geoSyncCompetitorButtons() {
  document.querySelectorAll('.geo-comp-pill').forEach(el => {
    const brand = el.dataset.brand;
    const active = geoState.competitors.includes(brand);
    const color = GEO_COMPETITOR_COLORS[brand] || '#6b7280';
    el.style.background = active ? color : '#fff';
    el.style.color = active ? '#fff' : '#374151';
    el.style.borderColor = active ? color : '#d1d5db';
  });
  const counter = document.getElementById('geo-comp-counter');
  if (counter) counter.textContent = `竞品品牌 · 已选 ${geoState.competitors.length}/5`;
}

function geoOverviewBody(models) {
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange() };
  const pickedModels = models || geoSelectedModels();
  if (pickedModels.length) body.models = pickedModels;
  const brand = geoRequestBrand();
  if (brand) body.brands = brand;
  if (geoState.questions && geoState.questions.length) body.questions = geoState.questions;
  const competitors = geoState.compare === 'compare' ? geoSelectedCompetitors() : [];
  if (competitors.length) body.competitors = competitors;
  return body;
}

function geoSitesBody(extra = {}) {
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange(), ...extra };
  if (!body.model || body.model === 'all') delete body.model;
  const brand = geoRequestBrand();
  if (brand && !body.brands) body.brands = brand;
  const q = geoSelectedQuestion();
  if (q && !body.question) body.question = q;
  return body;
}

function geoCitationsBody(extra = {}) {
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange(), ...extra };
  if (!body.model || body.model === 'all') delete body.model;
  const brand = geoRequestBrand();
  if (brand && !body.brands) body.brands = brand;
  const q = geoSelectedQuestion();
  if (q && !body.question) body.question = q;
  return body;
}

function geoResetPlatformPills() {
  document.querySelectorAll('.geo-pill').forEach(p => p.classList.remove('active'));
  const all = document.querySelector('.geo-pill[data-model="all"]');
  if (all) all.classList.add('active');
  geoState.platform = 'all';
}

function geoSyncScopeUi() {
  const isLeai = geoState.scope === 'leai';
  if (isLeai) {
    geoState.compare = 'brand';
    geoState.competitors = [];
  }
  document.querySelectorAll('.geo-cmp-btn').forEach(b => {
    const active = b.dataset.cmp === geoState.compare;
    b.style.background = active ? '#2563eb' : '#fff';
    b.style.color = active ? '#fff' : '#374151';
  });
  const compareControl = document.getElementById('geo-compare-control');
  if (compareControl) compareControl.style.display = isLeai ? 'none' : 'flex';
  const picker = document.getElementById('geo-competitor-picker');
  const divider = document.querySelector('.geo-comp-divider');
  const showPicker = !isLeai && geoState.compare === 'compare';
  if (picker) picker.style.display = showPicker ? 'flex' : 'none';
  if (divider) divider.style.display = showPicker ? '' : 'none';
  const note = document.getElementById('geo-scope-note');
  if (note) {
    note.style.display = isLeai ? '' : 'none';
    note.textContent = isLeai ? '联想乐享看板仅展示品牌表现，不提供竞品对比。' : '';
  }
  geoSyncCompetitorButtons();
  geoUpdateContextLine();
  geoRenderCompareDetail();
}

function geoSetScope(el) {
  document.querySelectorAll('.geo-scope-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  geoState.scope = el.dataset.scope;
  geoState.questions = [];
  geoState._intentPlatform = 'all';
  geoState._intentVisibilityFilter = 'all';
  geoResetPlatformPills();
  geoSyncScopeUi();
  geoLoadData();
}
function geoTogglePlatform(el) {
  const m = el.dataset.model;
  if (m === 'all') {
    document.querySelectorAll('.geo-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); geoState.platform = 'all';
  } else {
    document.querySelector('.geo-pill[data-model="all"]').classList.remove('active');
    el.classList.toggle('active');
    const act = document.querySelectorAll('.geo-pill.active:not([data-model="all"])');
    if (!act.length) { document.querySelector('.geo-pill[data-model="all"]').classList.add('active'); geoState.platform = 'all'; }
    else geoState.platform = Array.from(act).map(p => p.dataset.model).join(',');
  }
  geoState.questions = [];
  geoLoadData();
}
async function geoFetch(models) {
  const body = geoOverviewBody(models);
  const resp = await fetch('/api/geo-dashboard/overview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

function geoSetPeriod(v) { geoState.period = v; geoState.startDate = null; geoState.endDate = null; geoLoadData(); }

function geoQuickPeriod(period) {
  const endEl = document.getElementById('geo-date-end');
  const endDate = endEl && endEl.value ? new Date(endEl.value) : new Date();
  if (!endEl || !endEl.value) endDate.setDate(endDate.getDate() - 1);
  const days = period === '7d' ? 7 : 30;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  geoState.startDate = geoFmtDate(startDate);
  geoState.endDate = geoFmtDate(endDate);
  geoState.period = null;
  const startEl = document.getElementById('geo-date-start');
  if (startEl) startEl.value = geoState.startDate;
  if (endEl && !endEl.value) endEl.value = geoState.endDate;
  document.querySelectorAll('.geo-period-btn').forEach(b => {
    const active = b.dataset.period === period;
    b.style.background = active ? '#2563eb' : '#fff';
    b.style.color = active ? '#fff' : '#374151';
  });
  geoLoadData();
}

function geoDateRangeChanged() {
  const s = document.getElementById('geo-date-start');
  const e = document.getElementById('geo-date-end');
  if (s && s.value && e && e.value) {
    geoState.startDate = s.value;
    geoState.endDate = e.value;
    geoState.period = null;
    document.querySelectorAll('.geo-period-btn').forEach(b => { b.style.background = '#fff'; b.style.color = '#374151'; });
    geoLoadData();
  }
}

function geoInitDatePicker() {
  const startEl = document.getElementById('geo-date-start');
  const endEl = document.getElementById('geo-date-end');
  if (!startEl || !endEl || startEl.value) return;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const end = geoFmtDate(endDate);
  const start = new Date(endDate);
  start.setDate(start.getDate() - 29);
  startEl.value = geoFmtDate(start);
  endEl.value = end;
}
function geoSetQuestions(text) {
  geoState.questions = (text || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
  geoLoadData();
}
function geoSetQuestionFromSelect(val) {
  geoState.questions = val ? [val] : [];
  geoLoadData();
}
function geoPopulateQuestionsSelect() {
  const sel = document.getElementById('geo-questions-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">全部意图</option>';
  geoQuestionsForOverviewSelect().forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.question || '';
    const text = q.question || '';
    opt.textContent = text.length > 40 ? text.slice(0,40)+'...' : text;
    sel.appendChild(opt);
  });
  if ([...sel.options].some(opt => opt.value === current)) sel.value = current;
  else {
    sel.value = '';
    geoState.questions = [];
  }
}
function geoLoadIntentPage() {
  geoLoadQuestions();
}

function geoSetStatus(text, isError) {
  const s = document.getElementById('geo-status');
  if (s) { s.textContent = text; s.style.color = isError ? 'var(--red)' : 'var(--text-tertiary)'; }
}

function geoRenderDashboardPending(message = GEO_PENDING_TEXT) {
  document.querySelectorAll('.geo-kpi[data-metric]').forEach(k => k.classList.remove('highlight'));
  ['gv-brand-visible','gv-comp-visible','gv-brand-rec','gv-comp-rec','gv-brand-top1','gv-comp-top1','gv-brand-top3','gv-comp-top3','gv-lenovo-link-cite','gv-lenovo-wiki-cite','gv-wiki-shop-cite','gv-wiki-c-cite','gv-wiki-b-cite','gv-wiki-biz-cite','gv-sites-total','gv-q-count'].forEach(id => geoSetValue(id, null));
  const chart = document.getElementById('geo-trend-chart');
  if (chart) chart.innerHTML = geoPendingHtml(message);
  const canvas = document.getElementById('geo-trend-canvas');
  if (canvas) geoDrawCanvasPending(canvas, message);
  ['geo-sites-treemap','geo-sites-rank','geo-link-top50','geo-plat-dist','geo-intent-platform-summary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = geoPendingHtml(message);
  });
}

async function geoLoadData() {
  if (!document.getElementById('gv-brand-visible')) return;
  const loadSeq = (geoState._loadSeq || 0) + 1;
  geoState._loadSeq = loadSeq;
  geoInitDatePicker();
  geoSyncScopeUi();
  geoSyncCompetitorButtons();
  geoSetStatus('加载中...');
  const selectedModels = geoSelectedModels();
  try {
    const data = await geoFetch(selectedModels);
    if (loadSeq !== geoState._loadSeq) return;
    if (data.code !== 200) throw new Error(data.message || '请求失败');
    geoState.apiData = data;
    geoRenderKpis(data);
    geoRenderEcology(data);

    const scopeLbl = geoScopeConfig().label;
    const periodLbl = geoState.startDate ? `${geoState.startDate} ~ ${geoState.endDate}` : (geoState.period || '30d');
    geoSetStatus('更新于 ' + new Date().toLocaleTimeString() + ' · 点亮AI · ' + scopeLbl + ' · ' + periodLbl);

    // 第二步：剩余请求全部并发，互不阻塞
    const platPromise = Promise.allSettled(GEO_PLATFORMS.map(p => geoFetch([p])));
    const platSitesPromise = Promise.allSettled(GEO_PLATFORMS.map(p => {
      const b = geoSitesBody({ model: p });
      return fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json());
    }));
    const sitesPromise = geoLoadSites(loadSeq);
    const citationsPromise = (async () => {
      try {
        const body = geoCitationsBody();
        const r = await fetch('/api/geo-dashboard/citations', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
        if (loadSeq !== geoState._loadSeq) return;
        geoState.citationsData = await r.json();
      } catch (e) { console.error('citations fetch', e); geoState.citationsData = null; }
    })();
    const questionsPromise = geoLoadQuestions(loadSeq);
    const trendChartPromise = geoLoadTrendChart(loadSeq);
    const wordCloudPromise = geoLoadWordCloud(30);

    // 平台分布 + 平台级sites一起完成后渲染
    Promise.all([platPromise, platSitesPromise, citationsPromise]).then(([overviewResults, sitesResults]) => {
      if (loadSeq !== geoState._loadSeq) return;
      geoState.platData = {};
      geoState.platSitesData = {};
      GEO_PLATFORMS.forEach((p, i) => {
        if (overviewResults[i].status === 'fulfilled' && overviewResults[i].value.code === 200) {
          geoState.platData[p] = overviewResults[i].value;
        }
        if (sitesResults[i].status === 'fulfilled' && sitesResults[i].value.code === 200) {
          geoState.platSitesData[p] = sitesResults[i].value.data?.sites || [];
        }
      });
      geoRenderPlatDist();
    });

    // sites 和 questions 各自内部已有渲染逻辑，无需额外处理
  } catch (e) {
    if (loadSeq !== geoState._loadSeq) return;
    geoSetStatus('加载失败：' + e.message, true);
    geoRenderDashboardPending();
    console.error('GEO API error', e);
  }
}

function geoClampPct(v) {
  const n = geoNum(v);
  return n === null ? null : Math.min(n, 100);
}


function geoRenderKpis(data) {
  const bcm = data.brand_coverage_metrics || {};
  const cm = data.conversion_metrics || {};
  geoState._kpiRaw = {
    visible: { brand: bcm.brand_exposure_rate, comp: geoClampPct(bcm.competitor_exposure_rate) },
    rec:     { brand: cm.brand_priority_rate,  comp: geoClampPct(cm.competitor_priority_rate) },
    top1:    { brand: cm.brand_top1_rate,       comp: geoClampPct(cm.competitor_top1_rate) },
    top3:    { brand: cm.brand_top3_rate,       comp: geoClampPct(cm.competitor_top3_rate) },
  };
  geoApplyCompare();
  geoRenderTrendChart();
}

function geoRenderTrendChart() {
  geoRenderCompareDetail();
}

function geoRenderCompareDetail() {
  const c = document.getElementById('geo-trend-chart');
  const panel = document.getElementById('geo-compare-detail-panel');
  const row = document.getElementById('geo-trend-row');
  const showCompare = geoState.scope !== 'leai' && geoState.compare === 'compare';
  if (panel) panel.style.display = showCompare ? '' : 'none';
  if (row) row.classList.toggle('single', !showCompare);
  if (!c) return;
  if (!showCompare) {
    c.innerHTML = '';
    return;
  }
  if (!geoState.competitors.length) {
    c.innerHTML = geoPendingHtml('请选择最多5个竞品');
    return;
  }
  const raw = geoState._kpiRaw || {};
  const items = [
    { label: '可见度', key: 'visible' },
    { label: '推荐率', key: 'rec' },
    { label: '置顶率', key: 'top1' },
    { label: '前三率', key: 'top3' },
  ];
  const names = geoSelectedCompetitors();
  const aggregate = items.map(item => {
    const b = geoNum(raw[item.key]?.brand);
    const cVal = geoNum(raw[item.key]?.comp);
    return `<div class="geo-compare-row">
      <span>${geoEscape(item.label)}</span>
      <strong class="${b === null ? 'is-pending' : ''}">${geoFmtPct(b)}</strong>
      <strong class="${cVal === null ? 'is-pending' : ''}">${geoFmtPct(cVal)}</strong>
    </div>`;
  }).join('');
  const competitors = names.map(name => `<div class="geo-compare-card">
    <div class="geo-compare-card-name">${geoEscape(name)}</div>
    <div class="geo-compare-pending">${GEO_PENDING_TEXT}：分竞品指标和趋势暂未返回</div>
  </div>`).join('');
  c.innerHTML = `
    <div class="geo-compare-summary">
      <div class="geo-compare-head"><span>${geoEscape(geoBrandLabel())}</span><span>竞品综合</span></div>
      ${aggregate}
    </div>
    <div class="geo-compare-note">接口缺口：当前接口仅返回竞品综合数据，分竞品四核心指标与分竞品趋势待接口提供。</div>
    <div class="geo-compare-list">${competitors}</div>`;
}

function geoSelectKpi(el) {
  const metric = el.dataset.metric;
  geoState.selectedKpi = metric;
  document.querySelectorAll('.geo-kpi[data-metric]').forEach(k => {
    k.classList.toggle('highlight', k.dataset.metric === metric);
  });
  geoRenderTrendChart();
}

function geoToggleCompetitor(el) {
  const brand = el.dataset.brand;
  const idx = geoState.competitors.indexOf(brand);
  if (idx >= 0) {
    geoState.competitors.splice(idx, 1);
    el.style.background = '#fff';
    el.style.color = '#374151';
    el.style.borderColor = '#d1d5db';
  } else {
    if (geoState.competitors.length >= 5) {
      const msg = document.getElementById('geo-comp-limit-msg');
      if (msg) {
        msg.textContent = '最多选择 5 个竞品，请先取消一个';
        msg.style.color = '#dc2626';
        clearTimeout(geoState._compWarnTimer);
        geoState._compWarnTimer = setTimeout(() => {
          const current = document.getElementById('geo-comp-limit-msg');
          if (current) {
            current.textContent = '最多5个';
            current.style.color = '#9ca3af';
          }
        }, 1800);
      }
      return;
    }
    geoState.competitors.push(brand);
    const color = GEO_COMPETITOR_COLORS[brand] || '#6b7280';
    el.style.background = color;
    el.style.color = '#fff';
    el.style.borderColor = color;
  }
  geoSyncCompetitorButtons();
  geoUpdateContextLine();
  geoLoadData();
}

function geoSetCompare(mode) {
  const next = mode === 'both' ? 'compare' : mode;
  geoState.compare = next === 'compare' ? 'compare' : 'brand';
  geoSyncScopeUi();
  geoLoadData();
}

function geoApplyCompare() {
  const raw = geoState._kpiRaw;
  if (!raw) return;
  const mode = geoState.compare === 'compare' ? 'compare' : 'brand';
  const brandLabel = geoBrandLabel();
  const labels = {
    visible: [`${brandLabel}可见度`, '竞品综合可见度'],
    rec: [`${brandLabel}推荐率`, '竞品综合推荐率'],
    top1: [`${brandLabel}推荐置顶率`, '竞品综合置顶率'],
    top3: [`${brandLabel}推荐前三率`, '竞品综合前三率']
  };
  const idMap = { visible: ['gv-brand-visible','gv-comp-visible'], rec: ['gv-brand-rec','gv-comp-rec'], top1: ['gv-brand-top1','gv-comp-top1'], top3: ['gv-brand-top3','gv-comp-top3'] };
  const hasCompetitors = geoState.competitors.length > 0;

  for (const [metric, ids] of Object.entries(idMap)) {
    const valEl = document.getElementById(ids[0]);
    const compEl = document.getElementById(ids[1]);
    const card = valEl?.closest('.geo-kpi');
    if (!card) continue;
    const labelEl = card.querySelector('.gk-label');
    const brandSubEl = card.querySelector('.gk-brand-sub');
    const compareEl = card.querySelector('.gk-compare');
    const b = geoNum(raw[metric].brand);
    const c = geoNum(raw[metric].comp);

    if (mode === 'brand') {
      geoSetValue(ids[0], b, geoFmtPct);
      labelEl.textContent = labels[metric][0];
      if (brandSubEl) brandSubEl.style.display = 'none';
      if (compareEl) compareEl.style.display = 'none';
      card.classList.toggle('highlight', metric === geoState.selectedKpi && b !== null);
    } else {
      geoSetValue(ids[0], b, geoFmtPct);
      labelEl.textContent = labels[metric][0];
      if (brandSubEl) brandSubEl.style.display = 'none';
      if (compareEl) {
        compareEl.style.display = '';
        if (!hasCompetitors || b === null || c === null) {
          compareEl.innerHTML = `<div class="geo-pending-line">${!hasCompetitors ? '请选择竞品' : GEO_PENDING_TEXT}</div>`;
          card.classList.remove('highlight');
          card.style.borderColor = '';
          continue;
        }
        const bv = b, cv = c;
        const diff = bv - cv;
        const diffSign = diff > 0 ? '+' : '';
        const diffColor = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#6b7280';
        const maxV = Math.max(bv, cv, 1);
        compareEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:2px"><span>品牌</span><span>${geoFmtPct(b)}</span></div>
              <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${(bv/maxV*100).toFixed(0)}%;background:#2563eb;border-radius:3px"></div></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:2px"><span>竞品综合</span><span>${geoFmtPct(c)}</span></div>
              <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${(cv/maxV*100).toFixed(0)}%;background:#f59e0b;border-radius:3px"></div></div>
            </div>
          </div>
          <div style="font-size:10px;color:${diffColor};margin-top:3px;font-weight:600">差值 ${diffSign}${diff.toFixed(2)}pp</div>
        `;
      }
      card.classList.toggle('highlight', metric === geoState.selectedKpi && b !== null && c !== null);
      card.style.borderColor = '';
    }
    card.style.borderColor = '';
  }
  geoRenderCompareDetail();
}

function geoRenderEcology(data) {
  // overview API的citation字段经常返回0，实际引用数据由geoLoadSites()从sites数据计算
}

function geoRenderPlatDist() {
  const c = document.getElementById('geo-plat-dist'); if (!c) return;
  const pd = geoState.platData;
  const psd = geoState.platSitesData || {};
  // 优先用 citations API 的 model_counts，失败回退 sites 合计
  const cit = geoState.citationsData || {};
  const modelCountsMap = {};
  const modelCitationMap = {};
  (cit.model_counts || []).forEach(mc => {
    const metrics = geoCitationMetrics(mc);
    modelCitationMap[mc.model] = metrics;
    const total = geoPickFirst(mc, ['total_count','citation_count']);
    const wiki = geoNum(metrics.wiki);
    const link = geoNum(metrics.link);
    const totalNum = geoNum(total);
    if (totalNum !== null) modelCountsMap[mc.model] = totalNum;
    else if (wiki !== null || link !== null) modelCountsMap[mc.model] = (wiki || 0) + (link || 0);
  });
  const rows = GEO_PLATFORMS.map(p => {
    const d = pd[p];
    if (!d) return { p, cites: null, metrics: {}, missing: true };
    const bcm = d.brand_coverage_metrics || {};
    let cites = modelCountsMap[p];
    if (cites === undefined) {
      const sites = psd[p] || [];
      cites = sites.length ? geoCitesFromSites(sites).total : null;
    }
    return { p, cites, brand: geoNum(bcm.brand_exposure_rate), metrics: modelCitationMap[p] || {}, missing: false };
  });
  c.innerHTML = rows.map(r => {
    if (r.missing) {
      return `<div class="geo-plat-card"><div class="gpc-name">${geoPlatNames[r.p] || r.p}</div>${geoPendingInline()}</div>`;
    }
    const m = r.metrics || {};
    return `<div class="geo-plat-card">
      <div class="gpc-name">${geoPlatNames[r.p] || r.p}</div>
      <div class="gpc-row"><span>总引用次数</span><span class="gpc-val ${r.cites === null ? 'is-pending' : ''}">${geoFmtCount(r.cites)}</span></div>
      <div class="gpc-row"><span>联想链接</span><span class="gpc-val ${geoNum(m.link) === null ? 'is-pending' : ''}">${geoFmtCount(m.link)}</span></div>
      <div class="gpc-row"><span>联想wiki</span><span class="gpc-val ${geoNum(m.wiki) === null ? 'is-pending' : ''}">${geoFmtCount(m.wiki)}</span></div>
      <div class="gpc-row"><span>wiki-商城</span><span class="gpc-val ${geoNum(m.shop) === null ? 'is-pending' : ''}">${geoFmtCount(m.shop)}</span></div>
      <div class="gpc-row"><span>wiki-消费</span><span class="gpc-val ${geoNum(m.consumer) === null ? 'is-pending' : ''}">${geoFmtCount(m.consumer)}</span></div>
      <div class="gpc-row"><span>wiki-SMB</span><span class="gpc-val ${geoNum(m.smb) === null ? 'is-pending' : ''}">${geoFmtCount(m.smb)}</span></div>
      <div class="gpc-row"><span>wiki-政企</span><span class="gpc-val ${geoNum(m.biz) === null ? 'is-pending' : ''}">${geoFmtCount(m.biz)}</span></div>
    </div>`;
  }).join('');
}

function geoRenderSitesPending() {
  ['geo-sites-treemap','geo-sites-rank','geo-link-top50'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = geoPendingHtml();
  });
  geoSetSectionPending(['gv-sites-total','gv-lenovo-link-cite','gv-lenovo-wiki-cite','gv-wiki-shop-cite','gv-wiki-c-cite','gv-wiki-b-cite','gv-wiki-biz-cite']);
}

// ===== GEO 信源分布 (sites API) =====
const GEO_TREEMAP_COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#4f46e5','#15803d','#b45309','#9333ea','#0e7490','#be123c','#6366f1','#047857','#ea580c'];

function geoCitesFromSites(sites) {
  const lenovo = sites.filter(s => s.domain && s.domain.includes('lenovo'));
  const isWiki = d => /leai\.|wiki\.|iknow\./.test(d);
  const wiki = lenovo.filter(s => isWiki(s.domain));
  const official = lenovo.filter(s => !isWiki(s.domain));
  return {
    wiki: wiki.reduce((sum, s) => sum + (s.count || 0), 0),
    official: official.reduce((sum, s) => sum + (s.count || 0), 0),
    total: lenovo.reduce((sum, s) => sum + (s.count || 0), 0),
    count: lenovo.length,
  };
}

async function geoLoadSites(loadSeq) {
  try {
    const body = geoSitesBody();
    // 全站点（treemap / site rank 用）
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    if (json.code !== 200) { geoRenderSitesPending(); return; }
    const d = json.data || {};
    const sites = d.sites || [];
    geoRenderTreemap(sites);
    geoRenderSiteRank(sites);
    // 联想 Top50（后端 filter，量级跟时段对齐）
    const lenovoBody = { ...body, lenovo_top50: true };
    let lenovoSites = sites.filter(s => s.domain && s.domain.includes('lenovo'));
    try {
      const lr = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(lenovoBody) });
      const lj = await lr.json();
      if (loadSeq && loadSeq !== geoState._loadSeq) return;
      if (lj.code === 200 && lj.data?.sites) lenovoSites = lj.data.sites;
    } catch (err) { console.error('lenovo_top50 fetch fail, fallback to client filter', err); }
    geoRenderLinkTop50(lenovoSites);
    geoSetValue('gv-sites-total', lenovoSites.length ? lenovoSites.length : null);
    // wiki/lenovo 引用数走 citations 接口（content_ecology_metrics），sites 域名合计不准
    try {
      const citeResp = await fetch('/api/geo-dashboard/citations', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(geoCitationsBody()) });
      const citeJson = await citeResp.json();
      if (loadSeq && loadSeq !== geoState._loadSeq) return;
      const cem = citeJson.content_ecology_metrics || {};
      const metrics = geoCitationMetrics(cem);
      geoSetValue('gv-lenovo-link-cite', metrics.link);
      geoSetValue('gv-lenovo-wiki-cite', metrics.wiki);
      geoSetValue('gv-wiki-shop-cite', metrics.shop);
      geoSetValue('gv-wiki-c-cite', metrics.consumer);
      geoSetValue('gv-wiki-b-cite', metrics.smb);
      geoSetValue('gv-wiki-biz-cite', metrics.biz);
    } catch (err) {
      console.error('citations API failed', err);
      const cites = geoCitesFromSites(lenovoSites);
      geoSetValue('gv-lenovo-link-cite', lenovoSites.length ? cites.official : null);
      geoSetValue('gv-lenovo-wiki-cite', lenovoSites.length ? cites.wiki : null);
      geoSetSectionPending(['gv-wiki-shop-cite','gv-wiki-c-cite','gv-wiki-b-cite','gv-wiki-biz-cite']);
    }
  } catch(e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    geoRenderSitesPending();
    console.error('geoLoadSites', e);
  }
}

function geoRenderTreemap(sites) {
  const c = document.getElementById('geo-sites-treemap'); if(!c) return;
  const top = sites.slice(0, 20);
  const totalPct = top.reduce((s,x) => s + (geoNum(x.percentage) || 0), 0);
  if (!top.length) { c.innerHTML = geoPendingHtml(); return; }
  c.innerHTML = '<div class="geo-treemap">' + top.map((s, i) => {
    const bg = GEO_TREEMAP_COLORS[i % GEO_TREEMAP_COLORS.length];
    const pct = geoNum(s.percentage) || 0;
    const flex = Math.max(totalPct ? pct / totalPct * 100 : 3, 3);
    return `<div class="gtm-cell" style="flex:${flex};background:${bg};min-width:60px;min-height:50px" title="${geoEscape(s.domain)} · ${geoFmtCount(s.count)}次 · ${pct}%"><span class="gtm-name">${geoEscape(s.name)}</span><span class="gtm-pct">${pct}%</span></div>`;
  }).join('') + '</div>';
}

function geoRenderSiteRank(sites) {
  const c = document.getElementById('geo-sites-rank'); if(!c) return;
  const top = sites.slice(0, 20);
  if (!top.length) { c.innerHTML = geoPendingHtml(); return; }
  c.innerHTML = '<ol class="geo-rank-list">' + top.map(s =>
    `<li><span class="grl-idx">${s.rank}</span><span class="grl-name" title="${geoEscape(s.domain)}">${geoEscape(s.name)}</span><span class="grl-count">${geoFmtCount(s.count)} · ${geoNum(s.percentage) ?? 0}%</span></li>`
  ).join('') + '</ol>';
}

// ===== GEO AI引用链接 Top50（仅联想域名，后端 lenovo_top50 已 filter） =====
function geoRenderLinkTop50(sites) {
  const c = document.getElementById('geo-link-top50'); if (!c) return;
  const top = (sites || []).slice(0, 50).map((s, i) => ({...s, rank: i + 1}));
  if (!top.length) { c.innerHTML = geoPendingHtml(); return; }
  const maxCount = Math.max(...top.map(s => s.count), 1);
  c.innerHTML = '<ol class="geo-rank-list" style="margin:0;padding:0">' + top.map(s => {
    const barW = Math.max((s.count / maxCount * 100), 2).toFixed(0);
    const isTop3 = s.rank <= 3;
    const idxStyle = isTop3
      ? 'min-width:28px;height:28px;line-height:28px;text-align:center;font-size:13px;font-weight:700;color:#fff;background:#2563eb;border-radius:50%;flex-shrink:0'
      : 'min-width:28px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;flex-shrink:0';
    const countStyle = isTop3
      ? 'font-size:14px;font-weight:700;color:#1d4ed8;white-space:nowrap;min-width:90px;text-align:right'
      : 'font-size:11px;color:#6b7280;white-space:nowrap;min-width:80px;text-align:right';
    return `<li style="display:flex;align-items:center;gap:8px;padding:${isTop3 ? '8px' : '6px'} 8px;border-bottom:1px solid #f3f4f6;${isTop3 ? 'background:#f0f7ff;' : ''}">
      <span style="${idxStyle}">${s.rank}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:${isTop3 ? '14px' : '13px'};font-weight:${isTop3 ? '600' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${geoEscape(s.name)}</span>
          <a href="https://${geoEscape(s.domain)}" target="_blank" rel="noopener" style="font-size:11px;color:#2563eb;white-space:nowrap;text-decoration:none;flex-shrink:0" title="${geoEscape(s.domain)}">${geoEscape(s.domain)}</a>
        </div>
        <div style="height:${isTop3 ? '6px' : '4px'};background:#e5e7eb;border-radius:3px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${isTop3 ? '#2563eb' : '#93c5fd'};border-radius:3px"></div></div>
      </div>
      <span style="${countStyle}">${geoFmtCount(s.count)}</span>
    </li>`;
  }).join('') + '</ol>';
}

// ===== GEO 意图列表 (questions API) =====
const GEO_INTENT_FIELD_KEYS = ['lenovo_brand_visibility','official_visibility','leai_visibility','competitor_visibility'];
const GEO_FIELD_LABELS = {
  lenovo_brand_visibility:'联想品牌可见性',
  official_visibility:'联想官网可见性',
  leai_visibility:'联想乐享可见',
  competitor_visibility:'竞品可见'
};
const GEO_INTENT_FILTERS = [
  { key:'all', label:'全部展示' },
  { key:'lenovo_brand_visibility', label:'联想品牌可见' },
  { key:'official_visibility', label:'联想官网可见' },
  { key:'leai_visibility', label:'联想乐享可见' },
  { key:'competitor_visibility', label:'竞品可见' }
];

function geoModelFieldValue(modelData, field) {
  const fd = (modelData?.fields || []).find(x => x.field === field);
  return fd ? fd.value : '-';
}

function geoIntentDerivedValue(modelData, key) {
  const official = geoModelFieldValue(modelData, 'brand_composite_exposure_rate');
  const leai = geoModelFieldValue(modelData, 'brand_precise_exposure_rate');
  const competitor = geoModelFieldValue(modelData, 'competitor_exposure_rate');
  if (key === 'official_visibility') return official;
  if (key === 'leai_visibility') return leai;
  if (key === 'competitor_visibility') return competitor;
  if (key === 'lenovo_brand_visibility') return official === '是' || leai === '是' ? '是' : (official === '否' && leai === '否' ? '否' : '-');
  return '-';
}

function geoQuestionModels(q) {
  return (q?.models || []).map(m => m.model).filter(Boolean);
}

function geoQuestionHasVisibility(q, fieldKey, models) {
  const targetModels = models?.length ? models : geoQuestionModels(q);
  return targetModels.some(m => {
    const md = (q.models || []).find(x => x.model === m);
    return geoIntentDerivedValue(md, fieldKey) === '是';
  });
}

function geoScopeIntentKey() {
  if (geoState.scope === 'official') return 'official_visibility';
  if (geoState.scope === 'leai') return 'leai_visibility';
  return 'lenovo_brand_visibility';
}

function geoFilterQuestionsByScope(qs, models) {
  const key = geoScopeIntentKey();
  return (qs || []).filter(q => geoQuestionHasVisibility(q, key, models));
}

function geoFilterQuestionsByVisibility(qs, models) {
  const filter = geoState._intentVisibilityFilter || 'all';
  if (filter === 'all') return qs || [];
  return (qs || []).filter(q => geoQuestionHasVisibility(q, filter, models));
}

function geoQuestionsForOverviewSelect() {
  const qs = geoState._questionsData || [];
  if (!qs.length) return [];
  const firstModels = geoQuestionModels(qs[0]);
  const models = geoSelectedModels();
  const activeModels = models.length ? models : firstModels;
  return geoFilterQuestionsByScope(qs, activeModels);
}

async function geoLoadQuestions(loadSeq) {
  try {
    const body = { project_id: GEO_PROJECT_ID, date: geoResolveDateRange().end_date };
    const brand = geoRequestBrand();
    if (brand) body.brands = brand;
    const models = geoSelectedModels();
    if (models.length) body.models = models;
    const resp = await fetch('/api/geo-dashboard/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    if (json.code !== 200) {
      geoState._questionsData = [];
      geoSetValue('gv-q-count', null);
      geoRenderQuestions([]);
      geoRenderIntentPlatformSummary([]);
      geoPopulateQuestionsSelect();
      return;
    }
    const qs = json.data?.questions || [];
    geoState._questionsData = qs;
    geoRenderQuestions(qs);
    geoRenderIntentPlatformSummary(qs);
    geoPopulateTrendQuestions();
    geoPopulateQuestionsSelect();
  } catch(e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    geoState._questionsData = [];
    geoSetValue('gv-q-count', null);
    geoRenderQuestions([]);
    geoRenderIntentPlatformSummary([]);
    geoPopulateQuestionsSelect();
    console.error('geoLoadQuestions', e);
  }
}

function geoRenderQuestions(qs) {
  geoState._questionsData = qs;
  const c = document.getElementById('geo-questions-table'); if(!c) return;
  if (!qs.length) { c.innerHTML = geoPendingHtml(); return; }
  const allModels = (qs[0].models || []).map(m => m.model);
  const models = geoState._intentPlatform && geoState._intentPlatform !== 'all'
    ? allModels.filter(m => m === geoState._intentPlatform)
    : allModels;
  geoRenderIntentFilter(allModels, models);
  geoRenderIntentVisibilityFilter();
  const scoped = geoFilterQuestionsByScope(qs, models);
  const rows = geoFilterQuestionsByVisibility(scoped, models);
  geoSetValue('gv-q-count', rows.length ? rows.length : null);
  if (!rows.length) { c.innerHTML = geoPendingHtml(); return; }
  let html = '<table class="geo-intent-table" style="width:100%"><thead><tr><th style="text-align:left;min-width:180px">意图</th>';
  models.forEach(m => { const name = geoPlatNames[m] || m; GEO_INTENT_FIELD_KEYS.forEach(f => { html += `<th>${geoEscape(name)}<br><span style="font-size:10px;font-weight:400">${geoEscape(GEO_FIELD_LABELS[f] || f)}</span></th>`; }); });
  html += '</tr></thead><tbody>';
  rows.forEach(q => {
    const questionText = q.question || '';
    html += `<tr><td class="name" title="${geoEscape(questionText)}">${geoEscape(questionText.length > 20 ? questionText.slice(0,20)+'...' : questionText)}</td>`;
    models.forEach(m => {
      const md = (q.models || []).find(x => x.model === m);
      GEO_INTENT_FIELD_KEYS.forEach(f => {
        const v = geoIntentDerivedValue(md, f);
        const cls = v === '是' ? 'yes' : (v === '否' ? 'no' : '');
        html += `<td class="${cls}"><span class="geo-yn-badge ${cls}">${geoEscape(v)}</span></td>`;
      });
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

function geoRenderIntentFilter(allModels, activeModels) {
  const c = document.getElementById('geo-intent-plat-filter'); if (!c) return;
  const buttons = [{ key:'all', label:'全平台', color:'#2563eb' }].concat(allModels.map(m => ({ key:m, label:geoPlatNames[m] || m, color:geoPlatColors[m] || '#6b7280' })));
  c.innerHTML = buttons.map(item => {
    const active = item.key === 'all' ? activeModels.length === allModels.length : activeModels.length === 1 && activeModels.includes(item.key);
    return `<button onclick="geoSetIntentModel('${item.key}')" style="padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid ${active ? item.color : '#d1d5db'};background:${active ? item.color : '#fff'};color:${active ? '#fff' : '#6b7280'};cursor:pointer;font-weight:500;transition:all .15s">${geoEscape(item.label)}</button>`;
  }).join('');
}

function geoRenderIntentVisibilityFilter() {
  const c = document.getElementById('geo-intent-visibility-filter'); if (!c) return;
  const current = geoState._intentVisibilityFilter || 'all';
  c.innerHTML = GEO_INTENT_FILTERS.map(item => {
    const active = item.key === current;
    return `<button onclick="geoSetIntentVisibilityFilter('${item.key}')" style="padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid ${active ? '#2563eb' : '#d1d5db'};background:${active ? '#2563eb' : '#fff'};color:${active ? '#fff' : '#6b7280'};cursor:pointer;font-weight:500;transition:all .15s">${geoEscape(item.label)}</button>`;
  }).join('');
}

function geoSetIntentModel(model) {
  geoState._intentPlatform = model || 'all';
  geoRenderQuestions(geoState._questionsData || []);
}

function geoSetIntentVisibilityFilter(filter) {
  geoState._intentVisibilityFilter = filter || 'all';
  geoRenderQuestions(geoState._questionsData || []);
}

function geoToggleIntentModel(model) {
  geoSetIntentModel(model);
}

function geoRenderIntentPlatformSummary(qs) {
  const c = document.getElementById('geo-intent-platform-summary'); if (!c) return;
  if (!qs.length) { c.innerHTML = geoPendingHtml(); return; }
  const models = (qs[0].models || []).map(m => m.model);
  const totalCount = geoFilterQuestionsByScope(qs, models).length;
  const platStats = {};
  models.forEach(m => { platStats[m] = geoFilterQuestionsByScope(qs, [m]).length; });
  if (!totalCount) { c.innerHTML = geoPendingHtml(); return; }
  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:8px 0">';
  html += `<div style="flex:1;min-width:140px;padding:16px;background:#f0f7ff;border-radius:10px;text-align:center;border:1px solid #dbeafe">
    <div style="font-size:28px;font-weight:700;color:#1e40af">${totalCount}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">优化意图总数</div>
  </div>`;
  models.forEach(m => {
    const name = geoPlatNames[m] || m;
    const color = geoPlatColors[m] || '#6b7280';
    const count = platStats[m] || 0;
    html += `<div style="flex:1;min-width:140px;padding:16px;background:#fff;border-radius:10px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px;font-weight:700;color:${color}">${count}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${name} 覆盖意图数</div>
    </div>`;
  });
  html += '</div>';
  c.innerHTML = html;
}

// ===== GEO 知识库 tab 切换 =====
function switchKbTab(tab, el) {
  ['upload','qa','docs','qalist'].forEach(t => { const d = document.getElementById('kb-tab-' + t); if (d) d.style.display = t === tab ? '' : 'none'; });
  if (el) { el.parentElement.querySelectorAll('.tab-item').forEach(t => { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-tertiary)'; }); el.style.borderBottomColor = 'var(--primary)'; el.style.color = 'var(--primary)'; }
  if (tab === 'docs') loadKnowledgeDocs();
  if (tab === 'qalist') loadKnowledgeQA();
}

// ===== GEO 各平台信源分布子页 =====
let geoSourcePage = 1;
async function geoLoadSourcePage(page) {
  geoSourcePage = page || 1;
  const modelSel = document.getElementById('geo-source-model');
  const model = modelSel ? modelSel.value : 'all';
  const pageSizeSel = document.getElementById('geo-source-page-size');
  const pageSize = pageSizeSel ? Number(pageSizeSel.value) || 100 : 100;
  const st = document.getElementById('geo-source-status');
  const c = document.getElementById('geo-source-list');
  if (st) st.textContent = '加载中...';
  try {
    const body = geoSitesBody({ model: model === 'all' ? '' : model, page: geoSourcePage, page_size: pageSize });
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (json.code !== 200) throw new Error(json.message);
    const d = json.data || {}; const sites = d.sites || []; const pg = d.pagination || {};
    if (!sites.length) {
      if (st) st.textContent = GEO_PENDING_TEXT;
      if (c) c.innerHTML = geoPendingHtml();
      const pager = document.getElementById('geo-source-pager');
      if (pager) pager.innerHTML = '';
      return;
    }
    const shownPageSize = pg.per_page || pageSize;
    const pageSizeNote = shownPageSize !== pageSize ? ' · 接口暂未按所选条数返回' : '';
    if (st) st.textContent = `共 ${(d.total_records||0).toLocaleString()} 个站点 · 每页 ${shownPageSize} 条 · 第 ${pg.current_page || 1}/${pg.total_pages || 1} 页${pageSizeNote}`;
    if (!c) return;
    c.innerHTML = '<table class="geo-intent-table" style="width:100%"><thead><tr><th style="width:50px">排名</th><th style="text-align:left">站点</th><th style="text-align:left">域名</th><th>引用次数</th><th>占比</th></tr></thead><tbody>' +
      sites.map(s => `<tr><td>${s.rank}</td><td class="name">${geoEscape(s.name)}</td><td class="name" style="font-size:11px;color:#6b7280">${geoEscape(s.domain)}</td><td>${geoFmtCount(s.count)}</td><td>${geoNum(s.percentage) ?? 0}%</td></tr>`).join('') + '</tbody></table>';
    const pager = document.getElementById('geo-source-pager');
    if (pager && pg.total_pages > 1) {
      let ph = '';
      if (pg.has_prev) ph += `<button onclick="geoLoadSourcePage(${pg.prev_page})" style="margin:0 4px;padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px">上一页</button>`;
      ph += `<span style="font-size:12px;color:#6b7280;margin:0 8px">第 ${pg.current_page} / ${pg.total_pages} 页</span>`;
      if (pg.has_next) ph += `<button onclick="geoLoadSourcePage(${pg.next_page})" style="margin:0 4px;padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px">下一页</button>`;
      pager.innerHTML = ph;
    } else if (pager) { pager.innerHTML = ''; }
  } catch(e) {
    if (st) st.textContent = GEO_PENDING_TEXT;
    if (c) c.innerHTML = geoPendingHtml();
    const pager = document.getElementById('geo-source-pager');
    if (pager) pager.innerHTML = '';
    console.error('geoLoadSourcePage', e);
  }
}

// ===== GEO 趋势折线图（真实数据 from 点亮AI） =====
let _trendChartData = null;

function geoFilterTrendSeries(series) {
  const brandField = geoTrendField();
  const showCompare = geoState.scope !== 'leai' && geoState.compare === 'compare' && geoState.competitors.length;
  const wanted = new Set([brandField]);
  if (showCompare) wanted.add('competitor_exposure_rate');
  const filtered = (series || []).filter(s => wanted.has(s.field));
  return filtered.map(s => {
    if (s.field === brandField) return { ...s, field_name: geoBrandLabel() + '可见性' };
    if (s.field === 'competitor_exposure_rate') return { ...s, field_name: '竞品综合可见性' };
    return s;
  });
}

async function geoLoadTrendChart(loadSeq) {
  const canvas = document.getElementById('geo-trend-canvas');
  if (!canvas) return;
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange() };
  const brand = geoRequestBrand();
  if (brand) body.brands = brand;
  const platform = geoState.platform;
  const models = geoSelectedModels();
  if (platform && platform !== 'all' && models.length === 1) body.model = models[0];
  const competitors = geoState.compare === 'compare' ? geoSelectedCompetitors() : [];
  if (competitors.length) body.competitors = competitors;
  try {
    const resp = await fetch('/api/geo-dashboard/summary', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    if (json.code !== 200 || !json.data) {
      _trendChartData = null;
      geoDrawCanvasPending(canvas);
      return;
    }
    const d = json.data;
    const xs = d.x_axis || [];
    const dates = xs.map(x => x.label || x.date);
    const series = (d.series || []).map(s => {
      const valMap = {};
      (s.values || []).forEach(v => { valMap[v.date] = v.value; });
      return {
        field: s.field,
        field_name: s.field_name,
        data: xs.map(x => Number(valMap[x.date] ?? 0))
      };
    });
    const scopedSeries = geoFilterTrendSeries(series);
    scopedSeries.sort((a, b) => (a.field === geoTrendField() ? -1 : b.field === geoTrendField() ? 1 : 0));
    if (!dates.length || !scopedSeries.length) {
      _trendChartData = null;
      geoDrawCanvasPending(canvas);
      return;
    }
    _trendChartData = { dates, series: scopedSeries };
    geoDrawTrendCanvas();
  } catch(e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    _trendChartData = null;
    geoDrawCanvasPending(canvas);
    console.error('geoLoadTrendChart', e);
  }
}

function geoPopulateTrendQuestions() {
  const sel = document.getElementById('geo-trend-question');
  if (!sel || !geoState._questionsData) return;
  if (sel.options.length > 1) return;
  geoState._questionsData.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.question_id || q.id || '';
    opt.textContent = q.question.length > 30 ? q.question.slice(0,30)+'…' : q.question;
    sel.appendChild(opt);
  });
}

function geoDrawTrendCanvas() {
  const canvas = document.getElementById('geo-trend-canvas');
  if (!canvas) return;
  if (!_trendChartData) { geoDrawCanvasPending(canvas); return; }
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || canvas.width || 800;
  const H = rect.height || canvas.height || 280;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const dates = _trendChartData.dates || [];
  const series = _trendChartData.series || [];
  if (!dates.length || !series.length) { geoDrawCanvasPending(canvas); return; }
  const denom = Math.max(dates.length - 1, 1);

  const allVals = series.flatMap(s => s.data);
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(...allVals, 0);
  const range = maxV - minV || 1;
  const yPad = range * 0.1;
  const yMin = Math.max(0, minV - yPad);
  const yMax = maxV + yPad;
  const yRange = yMax - yMin || 1;

  // Y axis gridlines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const v = yMin + (yRange / ySteps) * i;
    const y = pad.top + plotH - (v - yMin) / yRange * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(v), pad.left - 6, y + 3);
  }

  // X axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  const step = Math.max(1, Math.floor(dates.length / 8));
  dates.forEach((d, i) => {
    if (i % step === 0 || i === dates.length - 1) {
      const x = pad.left + (i / denom) * plotW;
      ctx.fillText(d, x, H - pad.bottom + 18);
    }
  });

  // Draw lines
  const fieldColor = {
    all: '#9333ea',
    brand_composite_exposure_rate: '#2563eb',
    brand_precise_exposure_rate: '#10b981',
    competitor_exposure_rate: '#f59e0b',
  };
  const fallback = ['#2563eb', '#10b981', '#6b7280', '#9333ea'];
  const colors = series.map((s, si) => fieldColor[s.field] || fallback[si] || '#6b7280');
  geoRenderTrendLegend(series, colors);
  series.forEach((s, si) => {
    const color = colors[si];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = pad.left + (i / denom) * plotW;
      const y = pad.top + plotH - (v - yMin) / yRange * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    s.data.forEach((v, i) => {
      const x = pad.left + (i / denom) * plotW;
      const y = pad.top + plotH - (v - yMin) / yRange * plotH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Tooltip on hover
  canvas.onmousemove = (e) => {
    const bRect = canvas.getBoundingClientRect();
    const mx = e.clientX - bRect.left;
    const idx = Math.round((mx - pad.left) / plotW * denom);
    if (idx < 0 || idx >= dates.length) { document.getElementById('geo-trend-tooltip').style.display = 'none'; return; }
    const tip = document.getElementById('geo-trend-tooltip');
    let html = `<div style="font-weight:600;margin-bottom:4px">${dates[idx]}</div>`;
    series.forEach((s, si) => {
      const color = colors[si] || '#6b7280';
      html += `<div><span style="color:${color}">●</span> ${s.field_name}: ${s.data[idx]}</div>`;
    });
    tip.innerHTML = html;
    tip.style.display = 'block';
    tip.style.left = (e.pageX + 12) + 'px';
    tip.style.top = (e.pageY - 10) + 'px';
  };
  canvas.onmouseleave = () => { document.getElementById('geo-trend-tooltip').style.display = 'none'; };
}

function geoRenderTrendLegend(series, colors) {
  const legend = document.getElementById('geo-trend-legend');
  if (!legend) return;
  if (!series?.length) {
    legend.innerHTML = geoPendingInline();
    return;
  }
  legend.innerHTML = series.map((s, i) => `<span><span style="display:inline-block;width:20px;height:3px;background:${colors[i] || '#6b7280'};border-radius:2px;vertical-align:middle;margin-right:4px"></span>${geoEscape(s.field_name || s.field)}</span>`).join('');
}

// ===== GEO 词云 =====
async function geoLoadWordCloud(days) {
  days = days || 30;
  document.querySelectorAll('.geo-wc-btn').forEach(b => {
    const active = +b.dataset.days === days;
    b.style.background = active ? '#2563eb' : '#fff';
    b.style.color = active ? '#fff' : '#374151';
  });
  const c = document.getElementById('geo-word-cloud');
  if (!c) return;
  try {
    const resp = await fetch('/api/geo-dashboard/word-cloud?days=' + days);
    const json = await resp.json();
    if (!json.success || !json.data) { c.innerHTML = geoPendingHtml(); return; }
    geoRenderWordCloud(json.data, c);
  } catch(e) { console.error('geoLoadWordCloud', e); c.innerHTML = geoPendingHtml(); }
}

function geoRenderWordCloud(words, container) {
  if (!words.length) { container.innerHTML = geoPendingHtml(); return; }
  const top = words.slice(0, 80);
  const maxVal = top[0].value;
  const minVal = top[top.length - 1].value;
  const range = maxVal - minVal || 1;
  const colors = ['#1e40af','#2563eb','#3b82f6','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#be185d','#4f46e5','#0d9488','#b45309'];
  const W = container.clientWidth || 700;
  const H = 320;
  const cx = W / 2, cy = H / 2;
  const shuffled = top.map((w,i) => ({...w, origIdx: i}));
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.random() * (i+1)|0; [shuffled[i],shuffled[j]] = [shuffled[j],shuffled[i]]; }
  shuffled.sort((a,b) => b.value - a.value);
  const placed = [];
  let html = `<div style="position:relative;width:100%;height:${H}px;overflow:hidden">`;
  shuffled.forEach((w, idx) => {
    const ratio = (w.value - minVal) / range;
    const size = 13 + ratio * 30;
    const color = colors[w.origIdx % colors.length];
    const fw = ratio > 0.6 ? 700 : ratio > 0.3 ? 500 : 400;
    const rotate = idx > 5 ? (Math.random() < 0.25 ? (Math.random() < 0.5 ? 90 : -90) : (Math.random()*30-15)|0) : 0;
    const charW = size * 0.65 * w.name.length;
    const charH = size * 1.3;
    let bestX = cx, bestY = cy, found = false;
    for (let spiral = 0; spiral < 300 && !found; spiral++) {
      const angle = spiral * 0.5;
      const r = 3 + spiral * 1.2;
      const tx = cx + r * Math.cos(angle) - charW/2;
      const ty = cy + r * Math.sin(angle) - charH/2;
      if (tx < 0 || ty < 0 || tx + charW > W || ty + charH > H) continue;
      let overlap = false;
      for (const p of placed) {
        if (tx < p.x+p.w+4 && tx+charW+4 > p.x && ty < p.y+p.h+2 && ty+charH+2 > p.y) { overlap=true; break; }
      }
      if (!overlap) { bestX=tx; bestY=ty; found=true; }
    }
    if (!found) { bestX = Math.random()*(W-charW); bestY = Math.random()*(H-charH); }
    placed.push({x:bestX,y:bestY,w:charW,h:charH});
    html += `<span style="position:absolute;left:${bestX.toFixed(0)}px;top:${bestY.toFixed(0)}px;font-size:${size.toFixed(0)}px;color:${color};font-weight:${fw};transform:rotate(${rotate}deg);white-space:nowrap;cursor:default;line-height:1.2;transition:opacity .2s" title="${geoEscape(w.name)}: ${geoFmtCount(w.value)}">${geoEscape(w.name)}</span>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

const GEO_CONVERSION_VALUE_IDS = [
  'gc-all-uv','gc-all-login','gc-all-newreg','gc-all-paid','gc-all-ca','gc-all-gmv','gc-all-newpaid','gc-all-newca','gc-all-newgmv','gc-all-leai-user','gc-all-leai-ca','gc-all-leai-gmv',
  'gc-leai-uv','gc-leai-login','gc-leai-newreg','gc-leai-interact','gc-leai-login-interact','gc-leai-paid','gc-leai-ca','gc-leai-gmv','gc-leai-newpaid','gc-leai-newca','gc-leai-newgmv','gc-leai-order-user','gc-leai-order-ca','gc-leai-order-gmv',
  'gc-official-uv','gc-official-home-uv','gc-official-shop-uv','gc-official-c-uv','gc-official-b-uv','gc-official-biz-uv','gc-official-service-uv','gc-official-other-uv','gc-official-c-ca','gc-official-b-ca','gc-official-biz-ca','gc-official-c-gmv','gc-official-b-gmv','gc-official-biz-gmv'
];

function geoResolveConversionDateRange() {
  if (geoConversionState.startDate && geoConversionState.endDate) return { start_date: geoConversionState.startDate, end_date: geoConversionState.endDate };
  const days = geoConversionState.period === '7d' ? 7 : 30;
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { start_date: geoFmtDate(start), end_date: geoFmtDate(end) };
}

function geoInitConversionDatePicker() {
  const startEl = document.getElementById('geo-conv-date-start');
  const endEl = document.getElementById('geo-conv-date-end');
  if (!startEl || !endEl) return;
  const range = geoResolveConversionDateRange();
  startEl.value = range.start_date;
  endEl.value = range.end_date;
}

function geoSyncConversionPeriodButtons() {
  document.querySelectorAll('.geo-conv-period-btn').forEach(b => {
    const active = geoConversionState.period && b.dataset.period === geoConversionState.period;
    b.style.background = active ? '#2563eb' : '#fff';
    b.style.color = active ? '#fff' : '#374151';
  });
}

function geoConversionQuickPeriod(period) {
  geoConversionState.period = period;
  geoConversionState.startDate = null;
  geoConversionState.endDate = null;
  geoInitConversionDatePicker();
  geoSyncConversionPeriodButtons();
  geoLoadConversionPage();
}

function geoConversionDateRangeChanged() {
  const startEl = document.getElementById('geo-conv-date-start');
  const endEl = document.getElementById('geo-conv-date-end');
  if (!startEl?.value || !endEl?.value) return;
  geoConversionState.startDate = startEl.value;
  geoConversionState.endDate = endEl.value;
  geoConversionState.period = null;
  geoSyncConversionPeriodButtons();
  geoLoadConversionPage();
}

function geoLoadConversionPage() {
  geoInitConversionDatePicker();
  geoSyncConversionPeriodButtons();
  GEO_CONVERSION_VALUE_IDS.forEach(id => geoSetValue(id, null));
  const topPages = document.getElementById('gc-official-top-pages');
  if (topPages) topPages.innerHTML = geoPendingHtml('用户访问Top5页面待接口提供数据');
  const status = document.getElementById('geo-conversion-status');
  const range = geoResolveConversionDateRange();
  if (status) status.textContent = `${GEO_PENDING_TEXT} · ${range.start_date} ~ ${range.end_date} · 数据T+1更新`;
}
