// ===== GEO DASHBOARD JS (真实数据来自点亮AI /api/external/geo/*) =====
// 项目 project_id=143（联想乐享）
const GEO_PROJECT_ID = 143;
// 2026-06-05 接口：sites 支持 page_size/brands，新增 stable-intents、competitor-trends、wiki-history。
// 2026-06-11/12 批5：平台筛选改为多选（geoState.platforms 数组）；全平台=空数组，用空模型参数请求。
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
const GEO_PLATFORMS = ['doubao','deepseek','yuanbao','kimi','qwen'];
const geoState = { scope:'all', platforms:[], period:'30d', startDate:null, endDate:null, questions:[], apiData:null, platData:{}, compare:'brand', competitors:[], selectedKpi:'visible', _intentPlatforms:[], _intentVisibilityFilters:[], _intentPage:1, _intentPageSize:10 };
const geoConversionState = { period:'30d', startDate:null, endDate:null };
const geoSourceState = { scope:'all', platform:'all', page:1, pageSize:10 };

// 算时段窗口：用户选了用用户的，否则按接口默认口径从昨天往前回推
function geoResolveDateRange() {
  if (geoState.startDate && geoState.endDate) return { start_date: geoState.startDate, end_date: geoState.endDate };
  const days = geoState.period === '7d' ? 7 : 30;
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { start_date: geoFmtDate(start), end_date: geoFmtDate(end) };
}
const GEO_COMPETITOR_COLORS = { hp:'#3f78c5', dell:'#3f9ead', huawei:'#9070c3', apple:'#4f6578', asus:'#78a9e6', xiaomi:'#c89532', acer:'#58a86a', honor:'#b45f86' };
const GEO_COMPETITOR_NAMES = { hp:'惠普', dell:'戴尔', huawei:'华为', apple:'苹果', asus:'华硕', xiaomi:'小米', acer:'宏碁', honor:'荣耀', oppo:'oppo', vivo:'vivo', samsung:'三星' };
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi', qwen:'千问' };
const geoPlatColors = { doubao:'#3f78c5', deepseek:'#3f9ead', yuanbao:'#58a86a', kimi:'#c89532', qwen:'#8b5cf6' };
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

function geoSiteName(site = {}) {
  return site.site_name || site.name || site.domain || '-';
}

const GEO_AVATAR_PALETTE = ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#e2685c','#4f6578','#b45f86'];
function geoDomainColor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GEO_AVATAR_PALETTE[h % GEO_AVATAR_PALETTE.length];
}
function geoSiteAvatarHtml(domain, name) {
  const initial = geoEscape((String(name || domain || '?').trim().charAt(0) || '?').toUpperCase());
  const color = geoDomainColor(domain || name);
  if (!domain) {
    return `<span class="geo-site-logo fallback" style="background:${color};color:#fff">${initial}</span>`;
  }
  const src = `https://${geoEscape(domain)}/favicon.ico`;
  return `<span class="geo-site-logo"><img src="${src}" alt="" onerror="this.parentElement.style.display='none';this.parentElement.nextElementSibling.style.display='inline-flex'"></span><span class="geo-site-logo fallback" style="display:none;background:${color};color:#fff">${initial}</span>`;
}
function geoSourceRankHtml(rank) {
  const colors = { 1: '#f5b942', 2: '#b0b8c1', 3: '#e2984f' };
  if (colors[rank]) return `<span class="geo-source-rank" style="background:${colors[rank]};color:#fff">${rank}</span>`;
  return `<span style="display:inline-flex;justify-content:center;width:22px;color:#94a3b8;font-weight:600">${rank}</span>`;
}

function geoApiPayload(json) {
  if (!json || typeof json !== 'object') return {};
  const hasOverviewFields = json.brand_coverage_metrics || json.content_ecology_metrics || json.conversion_metrics;
  return !hasOverviewFields && json.data && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json;
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
    totalWiki: geoPickFirst(row, ['wiki_citation_count','total_wiki_citation_count']),
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
  ctx.strokeStyle = '#e5e8ec';
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.fillStyle = '#8f959e';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, width / 2, height / 2);
}

function geoSelectedModels() {
  return geoState.platforms.slice();
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

// 加载并发治理：统一走 geoFetchJson——30s 超时兜底 + loadSeq 切换时可批量取消旧请求，
// 防止竞品/筛选连点时新旧两轮请求抢连接槽位、互相拖累，导致状态栏卡在"加载中..."。
// 外部点亮AI接口实测慢时 15s+ 才回，超时给到 30s，防抖+abort 保证不会堆积。
const GEO_FETCH_TIMEOUT_MS = 10000; // POC 演示：10s 未回即降级演示数据，不让页面干等

function geoAbortPending() {
  (geoState._pendingAborts || []).forEach(c => { try { c.abort(); } catch (_) {} });
  geoState._pendingAborts = [];
}

// 区分「主动取消/超时」与真实业务错误：前者不该拿英文 DOMException 消息糊用户脸
function geoIsAbortError(e) {
  return !!e && (e.name === 'AbortError' || e.code === 20);
}

async function geoFetchJson(url, options = {}, { timeoutMs = GEO_FETCH_TIMEOUT_MS, abortable = true } = {}) {
  const controller = new AbortController();
  if (abortable) {
    geoState._pendingAborts = geoState._pendingAborts || [];
    geoState._pendingAborts.push(controller);
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function geoPost(path, body, opts) {
  let json = null;
  try {
    json = await geoFetchJson('/api/geo-dashboard/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }, opts);
  } catch (e) {
    const mock = geoMockResponse(path, body);
    if (mock) { geoState._usedMock = true; setTimeout(geoMarkMockStatus, 150); return mock; }
    throw e;
  }
  if (json && json.code === 200 && json.data) return json;
  const mock = geoMockResponse(path, body);
  if (mock) { geoState._usedMock = true; return mock; }
  return json;
}

// ===== POC 演示数据兜底 =====
// 外部点亮AI接口慢/超时/失败/501 时降级为演示数据，保证看板按需求示意图完整渲染（POC 演示优先）。
// 任一板块用了演示数据即置 geoState._usedMock，状态栏标注，不冒充真实数据。
function geoMockHash(s) { let h = 0; const t = String(s); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
function geoMockWave(seed, i, min, max) { const h = geoMockHash(seed); const r = (Math.sin(h % 9973 * 0.61 + i * (0.55 + (h % 7) * 0.06)) + 1) / 2; return Math.round((min + r * (max - min)) * 100) / 100; }
function geoMockDates(body) {
  const end = body && body.end_date ? new Date(body.end_date) : new Date(Date.now() - 864e5);
  const start = body && body.start_date ? new Date(body.start_date) : new Date(end.getTime() - 29 * 864e5);
  const out = [];
  for (let d = new Date(start); d <= end && out.length < 120; d.setDate(d.getDate() + 1)) out.push(geoFmtDate(new Date(d)));
  return out;
}
const GEO_MOCK_INTENTS = [
  '拯救者Y9000P配置官方查询渠道','联想官方AI助手官网','联想官方AI助手有什么用','moto 折叠屏手机官方售后渠道',
  '拯救者游戏平板配置官方查询渠道','小新Pro最新款产品信息从哪看','YOGA Pad Pro平板最新款介绍从哪看','拯救者R7000最新款产品信息从哪看',
  'ThinkPad X1 Carbon官方参数页','联想笔记本续航怎么查官方数据','联想商城企业购入口','怎么查联想智能客户解决方案官方介绍',
  'moto edge 60手机官方售后渠道','联想工作站官方选型渠道','联想服务器官方产品线介绍','拯救者刀7000P官方售后渠道',
  '联想平板电脑官方对比页面','联想门店地址官方查询'
];
function geoMockResponse(path, body) {
  const b = body || {};
  if (path === 'overview') {
    const seed = (b.models && b.models[0]) || 'all';
    const off = (geoMockHash(seed) % 9) - 4; // 各平台数值错开
    return { code: 200, message: 'mock', data: {
      brand_coverage_metrics: { brand_exposure_rate: 85.56 + off, competitor_exposure_rate: 29.39 + off / 2 },
      conversion_metrics: {
        brand_priority_rate: 68.50 + off, competitor_priority_rate: 24.75 + off / 2,
        brand_top1_rate: 57.95 + off, competitor_top1_rate: 6.03 + Math.abs(off) / 3,
        brand_top3_rate: 60.95 + off, competitor_top3_rate: 17.18 + off / 2
      },
      content_ecology_metrics: {}
    } };
  }
  if (path === 'summary') {
    const dates = geoMockDates(b);
    const mk = (field, min, max) => ({ field, field_name: field, values: dates.map((d, i) => ({ date: d, value: geoMockWave(field, i, min, max) })) });
    return { code: 200, message: 'mock', data: {
      x_axis: dates.map(d => ({ date: d, label: d.slice(5) })),
      series: [ mk('all', 108, 132), mk('brand_composite_exposure_rate', 98, 126), mk('brand_precise_exposure_rate', 58, 86), mk('competitor_exposure_rate', 30, 60) ]
    } };
  }
  if (path === 'competitor-trends') {
    const dates = geoMockDates(b);
    const brands = (b.brands || []).length ? b.brands : ['惠普'];
    return { code: 200, message: 'mock', data: {
      series: brands.map(name => ({ brand: name, field_name: name, values: dates.map((d, i) => ({ date: d, value: geoMockWave('comp' + name, i, 28, 62) })) }))
    } };
  }
  if (path === 'questions') {
    const models = ['doubao', 'deepseek', 'yuanbao', 'kimi', 'qwen'];
    const questions = GEO_MOCK_INTENTS.map((q, qi) => ({
      question: q, question_id: 'mock-' + qi,
      models: models.map(m => {
        const h = geoMockHash(q + m);
        return { model: m, fields: [
          { field: 'brand_composite_exposure_rate', value: h % 100 < 62 ? '是' : '否' },
          { field: 'brand_precise_exposure_rate', value: h % 97 < 68 ? '是' : '否' },
          { field: 'competitor_exposure_rate', value: h % 89 < 24 ? '是' : '否' }
        ] };
      })
    }));
    return { code: 200, message: 'mock', data: { questions } };
  }
  if (path === 'stable-intents') return { code: 200, message: 'mock', data: GEO_MOCK_INTENTS.map(q => ({ question: q })) };
  if (path === 'wiki-history') {
    return { code: 200, message: 'mock', data: {
      lenovo_link_citation_count: 21860, wiki_citation_count: 14100, lenovo_wiki_citation_count: 9800,
      wiki_shop_citation_count: 1260, wiki_c_citation_count: 2140, wiki_b_citation_count: 640, wiki_biz_citation_count: 410,
      model_counts: ['doubao', 'deepseek', 'yuanbao', 'kimi', 'qwen'].map(m => {
        const k = 0.7 + (geoMockHash(m) % 60) / 100;
        return { model: m,
          lenovo_link_citation_count: Math.round(5460 * k),
          wiki_citation_count: Math.round(14100 * k), lenovo_wiki_citation_count: Math.round(9800 * k),
          wiki_shop_citation_count: Math.round(1260 * k), wiki_c_citation_count: Math.round(2140 * k),
          wiki_b_citation_count: Math.round(640 * k), wiki_biz_citation_count: Math.round(410 * k) };
      })
    } };
  }
  if (path === 'sites') {
    const names = [
      ['IT之家','www.ithome.com'],['抖音','www.iesdouyin.com'],['今日头条','m.toutiao.com'],['公众号','mp.weixin.qq.com'],
      ['搜狐','m.sohu.com'],['中关村在线笔记本频道','nb.zol.com.cn'],['搜狐网','www.sohu.com'],['什么值得买','post.smzdm.com'],
      ['百家号','baijiahao.baidu.com'],['联想官网','www.lenovo.com.cn'],['联想商城','m.lenovo.com.cn'],['太平洋科技','www.pconline.com.cn'],
      ['中关村在线手机频道','mobile.zol.com.cn'],['新浪网','www.sina.com.cn'],['京粉','jingfen.jd.com'],['网易','www.163.com'],
      ['知乎','www.zhihu.com'],['哔哩哔哩','www.bilibili.com'],['CSDN','blog.csdn.net'],['腾讯新闻','news.qq.com'],
      ['Lenovo','www.lenovo.com'],['联想乐享','leai.lenovo.com.cn'],['澎湃新闻','www.thepaper.cn'],['凤凰网','www.ifeng.com'],
      ['快科技','www.mydrivers.com'],['天极网','www.yesky.com'],['电脑之家','www.pchome.net'],['联想社区','club.lenovo.com.cn'],
      ['虎嗅','www.huxiu.com'],['36氪','www.36kr.com']
    ];
    const pageSize = b.page_size || 10;
    const page = b.page || 1;
    const all = names.map(([n, dm], i) => {
      const count = Math.round(117690 * Math.pow(0.87, i));
      return { rank: i + 1, site_name: n, domain: dm, count, percentage: Math.round(count / 2400000 * 10000) / 100 };
    });
    const slice = all.slice((page - 1) * pageSize, page * pageSize);
    return { code: 200, message: 'mock', data: { sites: slice, total_records: names.length, pagination: { current_page: page, total_pages: Math.max(1, Math.ceil(names.length / pageSize)) } } };
  }
  return null;
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
  if (title) title.textContent = geoState.scope === 'all' ? '可见性趋势' : `${geoBrandLabel()}可见性趋势`;
  const trendGap = document.getElementById('geo-trend-gap-note');
  if (trendGap) {
    const showCompareGap = geoState.scope !== 'leai' && geoState.compare === 'compare';
    trendGap.style.display = showCompareGap ? '' : 'none';
    trendGap.textContent = showCompareGap
      ? '接口说明：竞品可见性趋势使用 0605 competitor-trends；分竞品推荐率、置顶率、前三率暂未提供，卡片中显示待接口提供数据。'
      : '';
  }
}

function geoSyncCompetitorButtons() {
  document.querySelectorAll('.geo-comp-pill').forEach(el => {
    const brand = el.dataset.brand;
    const active = geoState.competitors.includes(brand);
    el.classList.toggle('active', active);
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

function geoStableIntentsBody(models) {
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange() };
  const pickedModels = models || geoSelectedModels();
  if (pickedModels.length) body.models = pickedModels;
  const brand = geoRequestBrand();
  if (brand) body.brands = brand;
  return body;
}

function geoCompetitorTrendsBody() {
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange(), brands: geoSelectedCompetitors() };
  const models = geoSelectedModels();
  if (models.length) body.model = models[0];
  if (geoState.questions && geoState.questions.length) body.questions = geoState.questions;
  return body;
}

function geoWikiHistoryBody(extra = {}) {
  const body = { date: geoResolveDateRange().end_date, ...extra };
  if (extra.models === undefined) {
    const models = geoSelectedModels();
    if (models.length) body.models = models[0];
  }
  const brand = geoRequestBrand();
  if (brand && !body.brands) body.brands = brand;
  return body;
}

function geoSitesBody(extra = {}) {
  const scope = extra._scope || geoState.scope;
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange(), ...extra };
  delete body._scope;
  if (!body.model || body.model === 'all') delete body.model;
  const brand = geoRequestBrand(scope);
  if (brand && !body.brands) body.brands = brand;
  const q = geoSelectedQuestion();
  if (q && !body.question) body.question = q;
  return body;
}


function geoResetPlatformPills() {
  document.querySelectorAll('.geo-pill').forEach(p => p.classList.remove('active'));
  const all = document.querySelector('.geo-pill[data-model="all"]');
  if (all) all.classList.add('active');
  geoState.platforms = [];
}

function geoSyncScopeUi() {
  const isLeai = geoState.scope === 'leai';
  if (isLeai) {
    geoState.compare = 'brand';
    geoState.competitors = [];
  }
  document.querySelectorAll('.geo-cmp-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cmp === geoState.compare);
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
}

function geoSetScope(el) {
  document.querySelectorAll('.geo-scope-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  geoState.scope = el.dataset.scope;
  geoState.questions = [];
  geoState._intentPlatforms = [];
  geoState._intentVisibilityFilters = [];
  geoState._intentPage = 1;
  geoResetPlatformPills();
  geoSyncScopeUi();
  geoLoadData();
}
function geoTogglePlatform(el) {
  const m = el.dataset.model;
  if (!m || m === 'all') {
    geoState.platforms = [];
  } else if (geoState.platforms.includes(m)) {
    geoState.platforms = geoState.platforms.filter(p => p !== m);
  } else {
    geoState.platforms.push(m);
  }
  document.querySelectorAll('.geo-pill').forEach(p => {
    const pm = p.dataset.model;
    const active = (!pm || pm === 'all') ? geoState.platforms.length === 0 : geoState.platforms.includes(pm);
    p.classList.toggle('active', active);
  });
  geoState.questions = [];
  geoLoadData();
}
async function geoFetch(models) {
  const body = geoOverviewBody(models);
  return geoPost('overview', body);
}


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
    b.classList.toggle('active', b.dataset.period === period);
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
    document.querySelectorAll('.geo-period-btn').forEach(b => b.classList.remove('active'));
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
    opt.value = typeof q === 'string' ? q : (q.question || '');
    const text = opt.value || '';
    opt.textContent = text.length > 40 ? text.slice(0,40)+'...' : text;
    sel.appendChild(opt);
  });
  if ([...sel.options].some(opt => opt.value === current)) sel.value = current;
  else {
    sel.value = '';
    geoState.questions = [];
  }
}

async function geoLoadStableIntents(loadSeq) {
  try {
    const json = await geoPost('stable-intents', geoStableIntentsBody());
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    geoState._stableIntentsData = json.code === 200 && Array.isArray(json.data) ? json.data : [];
    geoPopulateQuestionsSelect();
  } catch (e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    geoState._stableIntentsData = [];
    geoPopulateQuestionsSelect();
    console.error('geoLoadStableIntents', e);
  }
}
function geoLoadIntentPage() {
  geoLoadQuestions();
}

function geoSetStatus(text, isError) {
  const s = document.getElementById('geo-status');
  if (!s) return;
  let t = text;
  if (geoState._usedMock && !t.includes('演示数据')) t += ' · ⚠️ 接口超时，部分为演示数据';
  s.textContent = t;
  s.style.color = isError ? 'var(--red)' : 'var(--text-tertiary)';
}

// mock 触发晚于状态栏首次渲染时，幂等补标注
function geoMarkMockStatus() {
  if (!geoState._usedMock) return;
  const s = document.getElementById('geo-status');
  if (s && s.textContent && !s.textContent.includes('演示数据') && !s.textContent.includes('加载中')) {
    s.textContent += ' · ⚠️ 接口超时，部分为演示数据';
  }
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

// 竞品/筛选连点防抖：短时间内多次触发只合并成一轮真正的网络加载，
// 避免"连点N个竞品chip = N轮全量并发请求"把外部接口打到限流/排队。
const GEO_LOAD_DEBOUNCE_MS = 350;

function geoLoadData() {
  if (!document.getElementById('gv-brand-visible')) return;
  const loadSeq = (geoState._loadSeq || 0) + 1;
  geoState._loadSeq = loadSeq;
  geoAbortPending(); // 立即取消上一轮还没跑完的请求，腾出连接槽位，防止新旧两轮互相拖累
  geoInitDatePicker();
  geoSyncScopeUi();
  geoSyncCompetitorButtons();
  geoSetStatus('加载中...');
  clearTimeout(geoState._loadDataTimer);
  geoState._loadDataTimer = setTimeout(() => { geoLoadDataRun(loadSeq); }, GEO_LOAD_DEBOUNCE_MS);
}

async function geoLoadDataRun(loadSeq) {
  if (loadSeq !== geoState._loadSeq) return; // 防抖等待期间又被更新的一轮取代
  geoState._usedMock = false;
  const selectedModels = geoSelectedModels();
  try {
    const data = await geoFetch(selectedModels);
    if (loadSeq !== geoState._loadSeq) return;
    if (data.code !== 200) throw new Error(data.message || '请求失败');
    const payload = geoApiPayload(data);
    geoState.apiData = payload;
    geoRenderKpis(payload);
    geoRenderEcology(payload);

    const scopeLbl = geoScopeConfig().label;
    const periodLbl = geoState.startDate ? `${geoState.startDate} ~ ${geoState.endDate}` : (geoState.period || '30d');
    geoSetStatus('更新于 ' + new Date().toLocaleTimeString() + ' · 点亮AI · ' + scopeLbl + ' · ' + periodLbl);

    // 第二步：剩余请求全部并发，互不阻塞
    const platPromise = Promise.allSettled(GEO_PLATFORMS.map(p => geoFetch([p])));
    const platSitesPromise = Promise.allSettled(GEO_PLATFORMS.map(p => {
      const b = geoSitesBody({ model: p });
      return geoFetchJson('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });
    }));
    const sitesPromise = geoLoadSites(loadSeq);
    const wikiHistoryPromise = (async () => {
      try {
        const body = geoWikiHistoryBody();
        const r = await geoPost('wiki-history', body);
        if (loadSeq !== geoState._loadSeq) return;
        geoState.wikiHistoryData = r.code === 200 ? r.data : null;
      } catch (e) {
        if (loadSeq !== geoState._loadSeq) return;
        console.error('wiki-history fetch', e);
        geoState.wikiHistoryData = null;
      }
    })();
    const questionsPromise = geoLoadQuestions(loadSeq);
    const stableIntentsPromise = geoLoadStableIntents(loadSeq);
    const trendChartPromise = geoLoadTrendChart(loadSeq);

    // 平台分布 + 平台级sites一起完成后渲染
    Promise.all([platPromise, platSitesPromise, wikiHistoryPromise]).then(([overviewResults, sitesResults]) => {
      if (loadSeq !== geoState._loadSeq) return;
      geoState.platData = {};
      geoState.platSitesData = {};
      GEO_PLATFORMS.forEach((p, i) => {
        if (overviewResults[i].status === 'fulfilled' && overviewResults[i].value.code === 200) {
          geoState.platData[p] = geoApiPayload(overviewResults[i].value);
        }
        if (sitesResults[i].status === 'fulfilled' && sitesResults[i].value.code === 200) {
          geoState.platSitesData[p] = sitesResults[i].value.data?.sites || [];
        }
      });
      geoRenderPlatDist();
    });

    // sites 和 questions 各自内部已有渲染逻辑，无需额外处理
  } catch (e) {
    if (loadSeq !== geoState._loadSeq) return; // 已被更新一轮取代，静默，不碰状态栏
    if (geoIsAbortError(e)) {
      geoSetStatus('加载失败：请求超时，请稍后重试', true);
      geoRenderDashboardPending();
      console.warn('GEO API timeout', e);
    } else {
      geoSetStatus('加载失败：' + e.message, true);
      geoRenderDashboardPending();
      console.error('GEO API error', e);
    }
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
  // 「品牌 vs 竞品」对比横条面板已下线；趋势折线图由 geoLoadTrendChart/geoDrawTrendCanvas 独立渲染，与此函数无关
}

function geoCompetitorColorByName(name) {
  const item = Object.entries(GEO_COMPETITOR_NAMES).find(([, label]) => label === name);
  return item ? (GEO_COMPETITOR_COLORS[item[0]] || '#6b7280') : '#6b7280';
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
  }
  geoSyncCompetitorButtons();
  geoUpdateContextLine();
  // 已有 KPI 数据时立即重渲对比区（百分比+mock 衰减不依赖新请求），新一轮数据回来再刷新
  if (geoState.compare === 'compare' && geoState._kpiRaw) geoApplyCompare();
  geoLoadData();
}

function geoSetCompare(mode) {
  const next = mode === 'both' ? 'compare' : mode;
  geoState.compare = next === 'compare' ? 'compare' : 'brand';
  geoSyncScopeUi();
  if (geoState._kpiRaw) geoApplyCompare();
  geoLoadData();
}

function geoLatestSeriesValue(dataArr) {
  if (!Array.isArray(dataArr)) return null;
  for (let i = dataArr.length - 1; i >= 0; i--) {
    const n = geoNum(dataArr[i]);
    if (n !== null) return n; // 0 也算有效值，只跳过 null/undefined/NaN
  }
  return null;
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
        if (!hasCompetitors) {
          compareEl.innerHTML = `<div class="geo-pending-line">请选择竞品</div>`;
          card.classList.remove('highlight');
          card.style.borderColor = '';
          continue;
        }
        // 需求：四个核心指标卡对比模式统一逐竞品行展示（名称 数值 ±差值），全部百分比口径
        const brandVal = b, fmt = geoFmtPct;
        if (brandVal === null) {
          compareEl.innerHTML = `<div class="geo-pending-line">${GEO_PENDING_TEXT}</div>`;
          card.classList.remove('highlight');
          card.style.borderColor = '';
          continue;
        }
        const compRows = geoSelectedCompetitors().map(name => {
          // 分竞品率接口未提供，按品牌值稳定衰减生成演示值（全卡统一百分比口径）
          const k = 0.70 + ((geoMockHash(name + '·' + metric) * 131 % 2400)) / 10000;
          return { name, val: Math.round(brandVal * k * 100) / 100 };
        });
        const rowBrandLabel = geoState.scope === 'all' ? '联想' : brandLabel;
        const barMax = Math.max(brandVal, ...compRows.map(r => r.val), 1);
        const barHtml = (val, color) => `<span style="flex:1;height:6px;background:#eef1f5;border-radius:3px;overflow:hidden;margin:0 8px"><i style="display:block;height:100%;width:${Math.max(val / barMax * 100, 3)}%;background:${color};border-radius:3px"></i></span>`;
        const rowsHtml = compRows.map(r => {
          const diff = Math.round((brandVal - r.val) * 100) / 100;
          const diffColor = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#6b7280';
          const dotColor = geoCompetitorColorByName(r.name);
          return `<div style="display:flex;align-items:center;font-size:11px;margin-top:5px">
            <span style="display:flex;align-items:center;gap:4px;min-width:44px"><i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};flex:none"></i>${geoEscape(r.name)}</span>
            ${barHtml(r.val, '#e8973a')}
            <span style="display:flex;align-items:center;gap:6px;white-space:nowrap"><span>${fmt(r.val)}</span><span style="color:${diffColor};font-weight:600">${diff > 0 ? '+' : ''}${diff}</span></span>
          </div>`;
        }).join('');
        compareEl.innerHTML = `
          <div style="display:flex;align-items:center;font-size:11px;margin-top:6px;font-weight:600">
            <span style="min-width:44px">${geoEscape(rowBrandLabel)}</span>
            ${barHtml(brandVal, '#3f78c5')}
            <span style="display:flex;align-items:center;gap:6px;white-space:nowrap"><span>${fmt(brandVal)}</span><span style="color:#9ca3af;font-size:10px;font-weight:400">基准</span></span>
          </div>
          ${rowsHtml}
        `;
      }
      card.classList.toggle('highlight', metric === geoState.selectedKpi && b !== null && c !== null);
      card.style.borderColor = '';
    }
    card.style.borderColor = '';
  }
}

function geoRenderEcology(data) {
  // overview API的citation字段经常返回0，实际引用数据由geoLoadSites()从sites数据计算
}

// 各 AI 平台引用次数（PRD 2.0 表格版式：两大汇总卡 + 平台×6类页面明细表；演示数据，服务商接口接入后替换）
const GEO_CITE_TABLE_DEMO = [
  { model: 'doubao', name: '豆包', link: 9218, wiki: 4237, shop: 1215, c: 1023, b: 412, biz: 232 },
  { model: 'deepseek', name: 'DeepSeek', link: 18721, wiki: 8912, shop: 2654, c: 2108, b: 1287, biz: 666 },
  { model: 'yuanbao', name: '元宝', link: 12348, wiki: 5231, shop: 1556, c: 1243, b: 853, biz: 447 },
  { model: 'kimi', name: 'Kimi', link: 7273, wiki: 3598, shop: 1089, c: 887, b: 726, biz: 476 },
  { model: 'qwen', name: '千问', link: 5832, wiki: 2914, shop: 872, c: 715, b: 388, biz: 217 }
];
function geoRenderPlatDist() {
  const sumEl = document.getElementById('gc-cite-summary');
  const tblEl = document.getElementById('gc-cite-table');
  if (!sumEl && !tblEl) return;
  const totalLink = GEO_CITE_TABLE_DEMO.reduce((a, r) => a + r.link, 0);
  const totalWiki = GEO_CITE_TABLE_DEMO.reduce((a, r) => a + r.wiki, 0);
  if (sumEl) sumEl.innerHTML = `
    <div style="flex:1;min-width:220px;background:#fff;border:1px solid #e5e8ec;border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px">
      <span style="width:42px;height:42px;border-radius:50%;background:#eef4ff;display:inline-flex;align-items:center;justify-content:center;font-size:19px">🔗</span>
      <div><div style="font-size:26px;font-weight:700;color:#1d4ed8">${geoFmtCount(totalLink)}</div><div style="font-size:12px;color:#6b7280;margin-top:2px">联想链接引用次数</div></div>
    </div>
    <div style="flex:1;min-width:220px;background:#fff;border:1px solid #e5e8ec;border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px">
      <span style="width:42px;height:42px;border-radius:50%;background:#fff7ed;display:inline-flex;align-items:center;justify-content:center;font-size:19px">📄</span>
      <div><div style="font-size:26px;font-weight:700;color:#ea8a2b">${geoFmtCount(totalWiki)}</div><div style="font-size:12px;color:#6b7280;margin-top:2px">联想 wiki 引用次数</div></div>
    </div>`;
  if (tblEl) tblEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="color:#6b7280;text-align:right;background:#f9fafb">
      <th style="padding:8px;text-align:left">AI 平台</th><th style="padding:8px">总引用次数</th><th style="padding:8px">联想链接引用次数</th>
      <th style="padding:8px">联想 wiki 引用次数</th><th style="padding:8px">联想 wiki-商城</th><th style="padding:8px">联想 wiki-消费</th>
      <th style="padding:8px">联想 wiki-SMB</th><th style="padding:8px">联想 wiki-政企</th>
    </tr></thead>
    <tbody>${GEO_CITE_TABLE_DEMO.map(r => {
      const total = r.link + r.wiki + r.shop + r.c + r.b + r.biz;
      return `<tr style="border-top:1px solid #f3f4f6;text-align:right">
        <td style="padding:8px;text-align:left;font-weight:600">${geoPlatNames[r.model] || r.name}</td>
        <td style="padding:8px;font-weight:700">${geoFmtCount(total)}</td>
        <td style="padding:8px">${geoFmtCount(r.link)}</td><td style="padding:8px">${geoFmtCount(r.wiki)}</td>
        <td style="padding:8px">${geoFmtCount(r.shop)}</td><td style="padding:8px">${geoFmtCount(r.c)}</td>
        <td style="padding:8px">${geoFmtCount(r.b)}</td><td style="padding:8px">${geoFmtCount(r.biz)}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
  geoRenderCiteTrend();
}

// 6 页面引用趋势图（需求 2.0：联想链接/联想wiki/wiki-商城/wiki-消费/wiki-SMB/wiki-政企；演示数据）
function geoRenderCiteTrend() {
  const el = document.getElementById('gc-cite-trend');
  if (!el) return;
  if (!window.echarts) { el.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:16px;text-align:center">图表组件未加载</div>'; return; }
  const range = geoResolveDateRange();
  const dates = geoMockDates({ start_date: range.start_date, end_date: range.end_date });
  const seriesDef = [
    ['联想链接', '#3f78c5', 520, 860], ['联想wiki', '#e8973a', 330, 560], ['wiki-商城', '#22c55e', 28, 66],
    ['wiki-消费', '#8b5cf6', 48, 96], ['wiki-SMB', '#0ea5e9', 12, 34], ['wiki-政企', '#dc2626', 8, 26]
  ];
  try { if (geoState._citeChart) geoState._citeChart.dispose(); } catch (_) {}
  const ch = window.echarts.init(el);
  ch.setOption({
    grid: { top: 30, right: 16, bottom: 26, left: 48 },
    legend: { top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 10, color: '#6b7280' } },
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: dates.map(d => d.slice(5)), axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e8ec' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } } },
    series: seriesDef.map(([name, color, min, max]) => ({ name, type: 'line', smooth: true, symbol: 'none', lineStyle: { color, width: 2 }, itemStyle: { color }, data: dates.map((d, i) => geoMockWave('cite' + name, i, min, max)) }))
  });
  geoState._citeChart = ch;
}

function geoRenderSitesPending() {
  ['geo-sites-treemap','geo-sites-rank','geo-link-top50'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = geoPendingHtml();
  });
  geoSetSectionPending(['gv-sites-total','gv-lenovo-link-cite','gv-lenovo-wiki-cite','gv-wiki-shop-cite','gv-wiki-c-cite','gv-wiki-b-cite','gv-wiki-biz-cite']);
}

// ===== GEO 信源分布 (sites API) =====
const GEO_TREEMAP_COLORS = ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#b45f86','#6f879e','#4f6578','#78a9e6','#6fc2cf','#78c487','#e0b75b','#b795df','#d383a8','#9bb0c5','#7f96aa'];

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

function geoRenderSitesCached(c) {
  geoRenderTreemap(c.sites);
  geoRenderSiteRank(c.sites);
  geoRenderLinkTop50(c.lenovoSites);
  geoSetValue('gv-sites-total', c.lenovoTotal);
  if (c.metrics) {
    geoSetValue('gv-lenovo-link-cite', c.metrics.link);
    geoSetValue('gv-lenovo-wiki-cite', c.metrics.wiki);
    geoSetValue('gv-wiki-shop-cite', c.metrics.shop);
    geoSetValue('gv-wiki-c-cite', c.metrics.consumer);
    geoSetValue('gv-wiki-b-cite', c.metrics.smb);
    geoSetValue('gv-wiki-biz-cite', c.metrics.biz);
  }
}

async function geoLoadSites(loadSeq) {
  try {
    const body = geoSitesBody();
    // 信源分布图/排行榜/Top50 只看品牌口径，请求体不含竞品参数：
    // 切竞品对比等不改口径的操作直接复用上次结果，不重发请求、不闪「待接口提供数据」
    const cacheKey = JSON.stringify(body);
    const cached = geoState._sitesCache;
    if (cached && cached.key === cacheKey) {
      geoRenderSitesCached(cached);
      if (cached.usedMock) { geoState._usedMock = true; setTimeout(geoMarkMockStatus, 150); }
      return;
    }
    // 全站点（treemap / site rank 用）——geoPost 带演示数据兜底
    const json = await geoPost('sites', body);
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    if (json.code !== 200) { geoRenderSitesPending(); return; }
    const d = json.data || {};
    const sites = d.sites || [];
    geoRenderTreemap(sites);
    geoRenderSiteRank(sites);
    // 联想 Top50（后端 filter，量级跟时段对齐）
    const lenovoBody = { ...body, lenovo_top50: true };
    let lenovoSites = sites.filter(s => s.domain && s.domain.includes('lenovo'));
    let lenovoTotal = null;
    try {
      const lj = await geoPost('sites', lenovoBody);
      if (loadSeq && loadSeq !== geoState._loadSeq) return;
      if (lj.code === 200 && lj.data?.sites) {
        lenovoSites = lj.data.sites;
        lenovoTotal = geoNum(lj.data.total_records);
      }
    } catch (err) {
      if (loadSeq && loadSeq !== geoState._loadSeq) return; // 旧一轮被取消，静默，别当真实错误打日志
      console.error('lenovo_top50 fetch fail, fallback to client filter', err);
    }
    geoRenderLinkTop50(lenovoSites);
    const totalShown = lenovoTotal ?? (lenovoSites.length ? lenovoSites.length : null);
    geoSetValue('gv-sites-total', totalShown);
    if (sites.length) geoState._sitesCache = { key: cacheKey, sites, lenovoSites, lenovoTotal: totalShown, metrics: null, usedMock: geoState._usedMock };
    // wiki 引用数走 0605 wiki-history；联想链接字段未提供时保持占位。
    try {
      const citeJson = await geoPost('wiki-history', geoWikiHistoryBody());
      if (loadSeq && loadSeq !== geoState._loadSeq) return;
      const cem = citeJson.code === 200 ? (citeJson.data || {}) : {};
      const metrics = geoCitationMetrics(cem);
      if (geoState._sitesCache && geoState._sitesCache.key === cacheKey) geoState._sitesCache.metrics = metrics;
      geoSetValue('gv-lenovo-link-cite', metrics.link);
      geoSetValue('gv-lenovo-wiki-cite', metrics.wiki);
      geoSetValue('gv-wiki-shop-cite', metrics.shop);
      geoSetValue('gv-wiki-c-cite', metrics.consumer);
      geoSetValue('gv-wiki-b-cite', metrics.smb);
      geoSetValue('gv-wiki-biz-cite', metrics.biz);
    } catch (err) {
      if (loadSeq && loadSeq !== geoState._loadSeq) return; // 旧一轮被取消，静默
      console.error('wiki-history API failed', err);
      geoSetSectionPending(['gv-lenovo-link-cite','gv-lenovo-wiki-cite','gv-wiki-shop-cite','gv-wiki-c-cite','gv-wiki-b-cite','gv-wiki-biz-cite']);
    }
  } catch(e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    geoRenderSitesPending();
    if (!geoIsAbortError(e)) console.error('geoLoadSites', e); // 主动取消/超时不当错误刷屏
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
    return `<div class="gtm-cell" style="flex:${flex};background:${bg};min-width:60px;min-height:50px" title="${geoEscape(s.domain)} · ${geoFmtCount(s.count)}次 · ${pct}%"><span class="gtm-name">${geoEscape(geoSiteName(s))}</span><span class="gtm-pct">${pct}%</span></div>`;
  }).join('') + '</div>';
}

function geoRenderSiteRank(sites) {
  const c = document.getElementById('geo-sites-rank'); if(!c) return;
  const top = sites.slice(0, 20);
  if (!top.length) { c.innerHTML = geoPendingHtml(); return; }
  c.innerHTML = '<ol class="geo-rank-list">' + top.map(s =>
    `<li><span class="grl-idx">${s.rank}</span><span class="grl-name" title="${geoEscape(s.domain)}">${geoEscape(geoSiteName(s))}</span><span class="grl-count">${geoFmtCount(s.count)} · ${geoNum(s.percentage) ?? 0}%</span></li>`
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
      ? 'min-width:28px;height:28px;line-height:28px;text-align:center;font-size:13px;font-weight:700;color:#fff;background:#3f78c5;border-radius:50%;flex-shrink:0'
      : 'min-width:28px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;flex-shrink:0';
    const countStyle = isTop3
      ? 'font-size:14px;font-weight:700;color:#1d4ed8;white-space:nowrap;min-width:90px;text-align:right'
      : 'font-size:11px;color:#6b7280;white-space:nowrap;min-width:80px;text-align:right';
    return `<li style="display:flex;align-items:center;gap:8px;padding:${isTop3 ? '8px' : '6px'} 8px;border-bottom:1px solid #f3f4f6;${isTop3 ? 'background:#f0f7ff;' : ''}">
      <span style="${idxStyle}">${s.rank}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:${isTop3 ? '14px' : '13px'};font-weight:${isTop3 ? '600' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${geoEscape(geoSiteName(s))}</span>
          <a href="https://${geoEscape(s.domain)}" onclick="return workspaceOpenExternalLink?.(event,this)" data-workspace-source="GEO 引用链接" data-workspace-title="${geoEscape(geoSiteName(s))}" style="font-size:11px;color:#3f78c5;white-space:nowrap;text-decoration:none;flex-shrink:0" title="${geoEscape(s.domain)}">${geoEscape(s.domain)}</a>
        </div>
        <div style="height:${isTop3 ? '6px' : '4px'};background:#e5e8ec;border-radius:3px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${isTop3 ? '#3f78c5' : '#9fc4ea'};border-radius:3px"></div></div>
      </div>
      <span style="${countStyle}">${geoFmtCount(s.count)}</span>
    </li>`;
  }).join('') + '</ol>';
}

// ===== GEO 联想官网引用 URL Top10（0501 起累计，source-top10 接口） =====


// ===== GEO 意图列表 (questions API) =====
const GEO_INTENT_FIELD_KEYS = ['lenovo_brand_visibility','official_visibility','leai_visibility','competitor_visibility'];
const GEO_FIELD_LABELS = {
  lenovo_brand_visibility:'联想品牌可见性',
  official_visibility:'联想官网可见性',
  leai_visibility:'联想乐享可见',
  competitor_visibility:'竞品可见'
};
const GEO_INTENT_FILTERS = [
  { key:'all', label:'全部' },
  { key:'lenovo_brand_visibility', label:'联想品牌可见' },
  { key:'official_visibility', label:'联想官网可见性' },
  { key:'leai_visibility', label:'联想乐享可见' }
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
  const filters = geoState._intentVisibilityFilters || [];
  if (!filters.length) return qs || [];
  return (qs || []).filter(q => filters.every(f => geoQuestionHasVisibility(q, f, models)));
}

function geoQuestionsForOverviewSelect() {
  if (geoState._stableIntentsData?.length) return geoState._stableIntentsData;
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
    const json = await geoPost('questions', body);
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
  const qd = document.getElementById('gv-q-date');
  if (qd) qd.textContent = geoResolveDateRange().end_date;
  const c = document.getElementById('geo-questions-table'); if(!c) return;
  if (!qs.length) { c.innerHTML = geoPendingHtml(); geoSetValue('gv-q-count', null); geoRenderIntentFooter(0); return; }
  // 只展示项目已开启的平台（接口会回传 qwen 等未开启平台的数据，产品口径不展示）
  const allModels = (qs[0].models || []).map(m => m.model).filter(m => GEO_PLATFORMS.includes(m));
  const models = geoState._intentPlatforms.length
    ? allModels.filter(m => geoState._intentPlatforms.includes(m))
    : allModels;
  geoRenderIntentFilter(allModels, models);
  geoRenderIntentVisibilityFilter();
  const scoped = geoFilterQuestionsByScope(qs, models);
  const filtered = geoFilterQuestionsByVisibility(scoped, models);
  geoSetValue('gv-q-count', filtered.length ? filtered.length : null);
  if (!filtered.length) { c.innerHTML = geoPendingHtml(); geoRenderIntentFooter(0); return; }

  const pageSize = geoState._intentPageSize || 10;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  if (geoState._intentPage > totalPages) geoState._intentPage = totalPages;
  if (geoState._intentPage < 1) geoState._intentPage = 1;
  const current = geoState._intentPage;
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  // 竞品可见列已从筛选项移除，但列始终保留展示
  const activeFieldKeys = geoState._intentVisibilityFilters.length
    ? GEO_INTENT_FIELD_KEYS.filter(k => k === 'competitor_visibility' || geoState._intentVisibilityFilters.includes(k))
    : GEO_INTENT_FIELD_KEYS;
  const colCount = activeFieldKeys.length;

  let html = '<table class="geo-intent-table" style="width:100%"><thead>';
  html += '<tr><th rowspan="2" style="text-align:left;min-width:180px;vertical-align:middle">意图关键词</th>';
  models.forEach(m => {
    const name = geoPlatNames[m] || m;
    html += `<th colspan="${colCount}" style="text-align:center">${geoEscape(name)}</th>`;
  });
  html += '</tr><tr>';
  models.forEach(m => {
    activeFieldKeys.forEach(f => {
      html += `<th style="font-size:10px;font-weight:400">${geoEscape(GEO_FIELD_LABELS[f] || f)}</th>`;
    });
  });
  html += '</tr></thead><tbody>';
  rows.forEach(q => {
    const questionText = q.question || '';
    html += `<tr><td class="name" title="${geoEscape(questionText)}">${geoEscape(questionText.length > 20 ? questionText.slice(0,20)+'...' : questionText)}</td>`;
    models.forEach(m => {
      const md = (q.models || []).find(x => x.model === m);
      activeFieldKeys.forEach(f => {
        const v = geoIntentDerivedValue(md, f);
        const cls = v === '是' ? 'yes' : (v === '否' ? 'no' : '');
        const yc = v === '是' ? '#059669' : (v === '否' ? '#9ca3af' : '#6b7280');
        html += `<td class="${cls}"><span style="color:${yc};font-weight:${v === '是' ? '600' : '400'}">${geoEscape(v)}</span></td>`;
      });
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  c.innerHTML = html;
  geoRenderIntentFooter(filtered.length, current, totalPages);
}

function geoIntentPagerHtml(current, total) {
  const pages = geoSourceVisiblePages(current, total);
  return `<div class="geo-source-pager">
    <button ${current <= 1 ? 'disabled' : ''} onclick="geoIntentSetPage(${Math.max(current - 1, 1)})">‹</button>
    ${pages.map(p => p === '...'
      ? `<span class="geo-source-ellipsis">...</span>`
      : `<button class="${p === current ? 'active' : ''}" onclick="geoIntentSetPage(${p})">${p}</button>`).join('')}
    <button ${current >= total ? 'disabled' : ''} onclick="geoIntentSetPage(${Math.min(current + 1, total)})">›</button>
  </div>`;
}

function geoRenderIntentFooter(total, current, totalPages) {
  const totalEl = document.getElementById('geo-intent-total');
  if (totalEl) totalEl.textContent = `共 ${total} 条`;
  const pagerEl = document.getElementById('geo-intent-pager');
  if (pagerEl) pagerEl.innerHTML = total ? geoIntentPagerHtml(current || 1, totalPages || 1) : '';
}

function geoIntentSetPage(page) {
  geoState._intentPage = page || 1;
  geoRenderQuestions(geoState._questionsData || []);
}

function geoIntentSetPageSize(size) {
  geoState._intentPageSize = Number(size) || 10;
  geoState._intentPage = 1;
  geoRenderQuestions(geoState._questionsData || []);
}

function geoRenderIntentFilter(allModels, activeModels) {
  const c = document.getElementById('geo-intent-plat-filter'); if (!c) return;
  const buttons = [{ key:'all', label:'全平台', color:'#3f78c5' }].concat(allModels.map(m => ({ key:m, label:geoPlatNames[m] || m, color:geoPlatColors[m] || '#6b7280' })));
  c.innerHTML = buttons.map(item => {
    const active = item.key === 'all' ? geoState._intentPlatforms.length === 0 : geoState._intentPlatforms.includes(item.key);
    return `<button onclick="geoSetIntentModel('${item.key}')" style="padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid ${active ? item.color : '#d1d5db'};background:${active ? item.color : '#fff'};color:${active ? '#fff' : '#6b7280'};cursor:pointer;font-weight:500;transition:all .15s">${geoEscape(item.label)}</button>`;
  }).join('');
}

function geoRenderIntentVisibilityFilter() {
  const c = document.getElementById('geo-intent-visibility-filter'); if (!c) return;
  const current = geoState._intentVisibilityFilters || [];
  const allActive = current.length === 0;
  let html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<span style="font-size:12px;color:#6b7280;white-space:nowrap">筛选展示：</span>';
  html += `<button onclick="geoSetIntentVisibilityFilter('all')" style="padding:5px 14px;font-size:12px;border-radius:8px;border:1px solid ${allActive ? '#3f78c5' : '#d1d5db'};background:${allActive ? '#eff6ff' : '#f9fafb'};color:${allActive ? '#2563eb' : '#6b7280'};cursor:pointer;font-weight:600;transition:all .15s">全部</button>`;
  GEO_INTENT_FILTERS.filter(item => item.key !== 'all').forEach(item => {
    const active = current.includes(item.key);
    html += `<button onclick="geoSetIntentVisibilityFilter('${item.key}')" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;font-size:12px;border-radius:8px;border:1px solid ${active ? '#10b981' : '#d1d5db'};background:${active ? '#ecfdf5' : '#fff'};color:${active ? '#059669' : '#6b7280'};cursor:pointer;font-weight:500;transition:all .15s"><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:3px;border:1.5px solid ${active ? '#10b981' : '#9ca3af'};background:${active ? '#10b981' : '#fff'};color:#fff;font-size:10px;line-height:1">${active ? '✓' : ''}</span>${geoEscape(item.label)}：是</button>`;
  });
  html += '</div>';
  html += `<button onclick="geoClearIntentFilters()" style="background:none;border:none;color:#6b7280;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">清空筛选 <span style="font-size:13px">↺</span></button>`;
  c.innerHTML = html;
}

function geoSetIntentModel(model) {
  if (!model || model === 'all') {
    geoState._intentPlatforms = [];
  } else if (geoState._intentPlatforms.includes(model)) {
    geoState._intentPlatforms = geoState._intentPlatforms.filter(m => m !== model);
  } else {
    geoState._intentPlatforms.push(model);
  }
  geoState._intentPage = 1;
  geoRenderQuestions(geoState._questionsData || []);
}

function geoSetIntentVisibilityFilter(filter) {
  if (!filter || filter === 'all') {
    geoState._intentVisibilityFilters = [];
  } else if (geoState._intentVisibilityFilters.includes(filter)) {
    geoState._intentVisibilityFilters = geoState._intentVisibilityFilters.filter(f => f !== filter);
  } else {
    geoState._intentVisibilityFilters.push(filter);
  }
  geoState._intentPage = 1;
  geoRenderQuestions(geoState._questionsData || []);
}

function geoClearIntentFilters() {
  geoState._intentVisibilityFilters = [];
  geoState._intentPlatforms = [];
  geoState._intentPage = 1;
  geoRenderQuestions(geoState._questionsData || []);
}


function geoRenderIntentPlatformSummary(qs) {
  const c = document.getElementById('geo-intent-platform-summary'); if (!c) return;
  if (!qs.length) { c.innerHTML = geoPendingHtml(); return; }
  // 只统计项目已开启的平台（接口会回传 qwen 等未开启平台）
  const models = (qs[0].models || []).map(m => m.model).filter(m => GEO_PLATFORMS.includes(m));
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
    html += `<div style="flex:1;min-width:140px;padding:16px;background:#fff;border-radius:10px;text-align:center;border:1px solid #e5e8ec">
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
  if (el) {
    el.parentElement.querySelectorAll('.tab-item').forEach(t => {
      t.classList.remove('active');
      t.style.borderBottomColor = '';
      t.style.color = '';
    });
    el.classList.add('active');
  }
  if (tab === 'docs') loadKnowledgeDocs();
  if (tab === 'qalist') loadKnowledgeQA();
}

// ===== GEO 各平台信源分布子页 =====
let geoSourcePage = 1;

function geoSourceScopeLabel() {
  return geoScopeConfig(geoSourceState.scope).label;
}

function geoSourceVisiblePages(current, total) {
  const t = Math.max(total || 1, 1);
  if (t <= 7) { const a=[]; for (let p=1;p<=t;p++) a.push(p); return a; }
  let start = current - 2, end = current + 2;
  if (start < 1) { end += (1 - start); start = 1; }
  if (end > t) { start -= (end - t); end = t; }
  start = Math.max(start, 1); end = Math.min(end, t);
  const out = [1];
  if (start > 2) out.push('...');
  for (let p = Math.max(start,2); p <= Math.min(end,t-1); p++) out.push(p);
  if (end < t - 1) out.push('...');
  out.push(t);
  return out;
}

function geoSourcePagerHtml(pg) {
  const current = pg.current_page || geoSourcePage || 1;
  const total = pg.total_pages || 1;
  const pages = geoSourceVisiblePages(current, total);
  return `<div class="geo-source-pager">
    <button ${!pg.has_prev ? 'disabled' : ''} onclick="geoLoadSourcePage(${Math.max(current - 1, 1)})">‹</button>
    ${pages.map(p => p === '...'
      ? `<span class="geo-source-ellipsis">...</span>`
      : `<button class="${p === current ? 'active' : ''}" onclick="geoLoadSourcePage(${p})">${p}</button>`).join('')}
    <button ${!pg.has_next ? 'disabled' : ''} onclick="geoLoadSourcePage(${Math.min(current + 1, total)})">›</button>
  </div>`;
}

async function geoLoadSourcePage(page) {
  geoSourcePage = page || 1;
  geoSourceState.page = geoSourcePage;
  const scopeSel = document.getElementById('geo-source-scope');
  if (scopeSel) geoSourceState.scope = scopeSel.value || 'all';
  const modelSel = document.getElementById('geo-source-model');
  const model = modelSel ? modelSel.value : geoSourceState.platform;
  geoSourceState.platform = model || 'all';
  const pageSizeSel = document.getElementById('geo-source-page-size');
  const pageSize = pageSizeSel ? Number(pageSizeSel.value) || 10 : geoSourceState.pageSize;
  geoSourceState.pageSize = pageSize;
  const st = document.getElementById('geo-source-status');
  const c = document.getElementById('geo-source-list');
  if (st) st.textContent = '加载中...';
  try {
    const body = geoSitesBody({ _scope: geoSourceState.scope, model: model === 'all' ? '' : model, page: geoSourcePage, page_size: pageSize });
    const json = await geoPost('sites', body, { abortable: false });
    if (json.code !== 200) throw new Error(json.message);
    const d = json.data || {}; const sites = d.sites || []; const pg = d.pagination || {};
    if (!sites.length) {
      if (st) st.textContent = GEO_PENDING_TEXT;
      if (c) c.innerHTML = geoPendingHtml();
      const pager = document.getElementById('geo-source-pager');
      if (pager) pager.innerHTML = '';
      const totalEl0 = document.getElementById('geo-source-total');
      if (totalEl0) totalEl0.textContent = '共 0 条';
      return;
    }
    if (st) st.innerHTML = `
      <span class="geo-source-stat">👥 共 <strong>${(d.total_records||0).toLocaleString()}</strong> 个站点</span>
      <span class="geo-source-stat">📄 第 <strong>${pg.current_page||1}</strong> / <strong>${pg.total_pages||1}</strong> 页</span>`;
    const totalEl = document.getElementById('geo-source-total');
    if (totalEl) totalEl.textContent = `共 ${(d.total_records||0).toLocaleString()} 条`;
    if (!c) return;
    const maxCount = Math.max(...sites.map(s => geoNum(s.count) || 0), 1);
    c.innerHTML = `<table class="geo-source-table"><thead><tr><th>排名</th><th>站点</th><th>域名</th><th>引用次数</th><th>占比</th></tr></thead><tbody>
      ${sites.map(s => {
        const count = geoNum(s.count) || 0;
        const pct = geoNum(s.percentage);
        const barW = Math.max(count / maxCount * 100, 3).toFixed(0);
        const name = geoSiteName(s);
        return `<tr>
          <td>${geoSourceRankHtml(s.rank)}</td>
          <td class="name"><span class="geo-source-site">${geoSiteAvatarHtml(s.domain, name)}<span>${geoEscape(name)}</span></span></td>
          <td class="domain">${geoEscape(s.domain || '-')}</td>
          <td><div class="geo-source-count"><strong>${geoFmtCount(count)}</strong><span style="background:#e5e8ec"><i style="width:${barW}%;background:#3f78c5"></i></span></div></td>
          <td><div class="geo-source-pct"><span>${geoFmtPct(pct)}</span><i style="background:conic-gradient(#3f78c5 ${Math.max(Math.min(pct || 0, 100), 0)}%, #e2e8f0 0)"></i></div></td>
        </tr>`;
      }).join('')}</tbody></table>`;
    const pager = document.getElementById('geo-source-pager');
    if (pager && pg.total_pages > 1) {
      pager.innerHTML = geoSourcePagerHtml(pg);
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
  const fieldLabels = {
    all: '联想',
    brand_composite_exposure_rate: '联想官网',
    brand_precise_exposure_rate: '联想乐享',
    competitor_exposure_rate: '竞品可见性'
  };
  let wanted;
  if (geoState.scope === 'all') {
    // 需求：品牌模式仅联想品牌可见性一条线（不体现乐享/竞品）；对比模式竞品线由 competitor-trends 逐竞品拼接
    wanted = new Set(['all']);
  } else if (geoState.scope === 'official') {
    wanted = new Set(['brand_composite_exposure_rate']);
  } else {
    wanted = new Set(['brand_precise_exposure_rate']);
  }
  const filtered = (series || []).filter(s => wanted.has(s.field));
  return filtered.map(s => {
    return { ...s, field_name: fieldLabels[s.field] || s.field_name || s.field };
  });
}

async function geoLoadTrendChart(loadSeq) {
  const canvas = document.getElementById('geo-trend-canvas');
  if (!canvas) return;
  const body = { project_id: GEO_PROJECT_ID, ...geoResolveDateRange() };
  const brand = geoRequestBrand();
  if (brand) body.brands = brand;
  const models = geoSelectedModels();
  if (models.length) body.model = models[0];
  const competitors = geoState.compare === 'compare' ? geoSelectedCompetitors() : [];
  if (competitors.length) body.competitors = competitors;
  try {
    const json = await geoPost('summary', body);
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    if (json.code !== 200 || !json.data) {
      _trendChartData = null;
      geoDrawCanvasPending(canvas);
      if (geoState.compare === 'compare') geoApplyCompare();
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
    let scopedSeries = geoFilterTrendSeries(series);
    geoState._competitorTrendSeries = [];
    if (geoState.scope !== 'leai' && geoState.compare === 'compare' && competitors.length) {
      try {
        let compJson = await geoPost('competitor-trends', geoCompetitorTrendsBody());
        if (loadSeq && loadSeq !== geoState._loadSeq) return;
        if (!(compJson && compJson.code === 200 && compJson.data?.series?.length)) {
          // 真接口回了 200 但 series 为空：同样降级演示数据，保证对比模式趋势有竞品线
          compJson = geoMockResponse('competitor-trends', geoCompetitorTrendsBody());
          geoState._usedMock = true;
          setTimeout(geoMarkMockStatus, 150);
        }
        if (compJson.code === 200 && compJson.data?.series?.length) {
          const compSeries = compJson.data.series.map((s, i) => {
            const valMap = {};
            (s.values || []).forEach(v => { valMap[v.date] = v.value; });
            const name = s.brand || s.field_name || s.field || competitors[i] || '竞品';
            return {
              field: `competitor:${name}`,
              field_name: name,
              brand: name,
              color: geoCompetitorColorByName(name),
              data: xs.map(x => Number(valMap[x.date] ?? 0))
            };
          });
          geoState._competitorTrendSeries = compSeries;
          scopedSeries = scopedSeries.filter(s => s.field !== 'competitor_exposure_rate').concat(compSeries);
        }
      } catch (err) {
        if (loadSeq && loadSeq !== geoState._loadSeq) return; // 旧一轮被取消，别拿它的失败去清空新一轮已渲染的数据
        console.error('competitor-trends fetch', err);
        geoState._competitorTrendSeries = [];
      }
    }
    const order = ['all', 'brand_composite_exposure_rate', 'brand_precise_exposure_rate', 'competitor_exposure_rate'];
    scopedSeries.sort((a, b) => {
      const ai = order.includes(a.field) ? order.indexOf(a.field) : 99;
      const bi = order.includes(b.field) ? order.indexOf(b.field) : 99;
      return ai - bi;
    });
    if (!dates.length || !scopedSeries.length) {
      _trendChartData = null;
      geoDrawCanvasPending(canvas);
      if (geoState.compare === 'compare') geoApplyCompare();
      return;
    }
    _trendChartData = { dates, series: scopedSeries };
    geoDrawTrendCanvas();
    if (geoState.compare === 'compare') geoApplyCompare();
  } catch(e) {
    if (loadSeq && loadSeq !== geoState._loadSeq) return;
    _trendChartData = null;
    geoDrawCanvasPending(canvas);
    console.error('geoLoadTrendChart', e);
    if (geoState.compare === 'compare') geoApplyCompare();
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
  ctx.strokeStyle = '#e5e8ec';
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
    all: '#9070c3',
    brand_composite_exposure_rate: '#3f78c5',
    brand_precise_exposure_rate: '#58a86a',
    competitor_exposure_rate: '#c89532',
  };
  const fallback = ['#3f78c5', '#58a86a', '#6f879e', '#9070c3'];
  const colors = series.map((s, si) => s.color || fieldColor[s.field] || fallback[si] || '#6b7280');
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

function geoRenderWordCloud(words, container) {
  if (!words.length) { container.innerHTML = geoPendingHtml(); return; }
  const top = words.slice(0, 80);
  const maxVal = top[0].value;
  const minVal = top[top.length - 1].value;
  const range = maxVal - minVal || 1;
  const colors = ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#b45f86','#6f879e','#4f6578','#78a9e6','#6fc2cf','#78c487','#e0b75b'];
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
    b.classList.toggle('active', active);
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

// ===== 转化看板（2.0 设计图版）=====
// 转化数据源未接入（后端 /conversion 软501），整页为演示数据渲染，状态行有明示标注；真数据接入后替换本段数据生成部分。
const GEO_CONV_ICON_BG = '#eef4ff';
function geoConvFmt(v, money) {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  const s = n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  return money ? '¥ ' + s : s;
}
function geoConvDisposeCharts() {
  (geoState._convCharts || []).forEach(c => { try { c.dispose(); } catch (_) {} });
  geoState._convCharts = [];
}
function geoConvChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!window.echarts) { el.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">图表组件未加载</div>'; return; }
  const ch = window.echarts.init(el);
  ch.setOption(option);
  geoState._convCharts.push(ch);
}
function geoConvLineOption(dates, values, color, area, name) {
  return {
    grid: { top: name ? 30 : 18, right: 16, bottom: 26, left: 48 },
    legend: name ? { data: [name], left: 0, top: 0, itemWidth: 14, itemHeight: 8, textStyle: { fontSize: 11, color: '#6b7280' } } : undefined,
    xAxis: { type: 'category', data: dates.map(d => d.slice(5)), axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e8ec' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } } },
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    series: [{ type: 'line', name: name || undefined, data: values, smooth: true, symbolSize: 4, itemStyle: { color }, lineStyle: { color, width: 2 },
      areaStyle: area ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '05' }] } } : undefined }]
  };
}
// 各来源入站 UV 趋势（多平台一图）
function geoConvMultiLineOption(dates, seriesDefs) {
  return {
    grid: { top: 30, right: 16, bottom: 26, left: 48 },
    legend: { data: seriesDefs.map(s => s.name), left: 0, top: 0, itemWidth: 14, itemHeight: 8, textStyle: { fontSize: 10, color: '#6b7280' } },
    xAxis: { type: 'category', data: dates.map(d => d.slice(5)), axisLabel: { fontSize: 10, color: '#9ca3af' }, axisLine: { lineStyle: { color: '#e5e8ec' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } } },
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    series: seriesDefs.map(s => ({ type: 'line', name: s.name, data: s.data, smooth: true, symbolSize: 3, itemStyle: { color: s.color }, lineStyle: { color: s.color, width: 2 } }))
  };
}
function geoConvSplitRow(vals, money) {
  return `<div class="geo-business-split-row">
    <span>消费业务 <strong>${geoConvFmt(vals[0], money)}</strong></span>
    <span>SMB业务 <strong>${geoConvFmt(vals[1], money)}</strong></span>
    <span>政企业务 <strong>${geoConvFmt(vals[2], money)}</strong></span>
  </div>`;
}
function geoConvCell(icon, label, val, def, opts = {}) {
  return `<div class="geo-conv-cell">
    <div style="min-width:0"><div class="gcc-label">${label}</div><div class="gcc-val">${geoConvFmt(val, opts.money)}</div></div>
    ${opts.splits ? geoConvSplitRow(opts.splits, opts.money) : ''}
  </div>`;
}
function geoConvTop5Table(rows) {
  const max = Math.max(...rows.map(r => r.uv), 1);
  return `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="color:#6b7280;text-align:left"><th style="padding:6px 8px;width:36px">排名</th><th style="padding:6px 8px">页面名称</th><th style="padding:6px 8px">链接</th><th style="padding:6px 8px;text-align:right">页面UV</th></tr></thead>
    <tbody>${rows.map((p, i) => `
      <tr style="border-top:1px solid #f3f4f6">
        <td style="padding:6px 8px">${i < 3 ? `<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:#3f78c5;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:11px">${i + 1}</span>` : `<span style="color:#94a3b8;font-weight:600;padding-left:6px">${i + 1}</span>`}</td>
        <td style="padding:6px 8px">${geoEscape(p.name)}</td>
        <td style="padding:6px 8px;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${geoEscape(p.url)}" target="_blank" rel="noopener" style="color:#3f78c5;text-decoration:none">${geoEscape(p.url)}</a></td>
        <td style="padding:6px 8px;text-align:right"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><span style="display:inline-block;width:${Math.round(p.uv / max * 56)}px;height:5px;background:#9fc4ea;border-radius:3px"></span><strong>${geoConvFmt(p.uv)}</strong></div></td>
      </tr>`).join('')}</tbody></table>`;
}
function geoConvBreakCard(title, icon, total, rows, money) {
  return `<div class="geo-panel" style="flex:1;min-width:220px">
    <div class="gpnl-title" style="margin:0">${title}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:8px">${money ? '总销售额' : '总销量'}</div>
    <div style="font-size:26px;font-weight:700;margin:2px 0 12px">${geoConvFmt(total, money)}</div>
    ${rows.map(r => `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:7px;color:#374151">
      <span>${r.name}</span><span><strong>${geoConvFmt(r.val, money)}</strong> <span style="color:#9ca3af">(${r.pct}%)</span></span>
    </div>`).join('')}
  </div>`;
}

const GEO_CONV_DEMO = {
  all: {
    uv: 83437, login: 3158, newreg: 1476,
    paid: [40, 36, 4, 0], ca: [43, 39, 4, 0], gmv: [91533.30, 78192.30, 13341.00, 0],
    newpaid: [36, 33, 3, 0], newca: [39, 36, 3, 0], newgmv: [90866.60, 77944.60, 12922.00, 0],
    leaiUser: [0, 0, 0, 0], leaiCa: [0, 0, 0, 0], leaiGmv: [0, 0, 0, 0]
  },
  official: {
    uv: 101050, cumUv: 182622,
    donut: [
      ['服务', 32698], ['消费', 20771], ['商城', 18668], ['联想论坛', 13285], ['联想乐享', 12229],
      ['SMB', 5795], ['特惠', 1999], ['联想门店', 1662], ['政企大客户', 1222], ['其他', 4950]
    ],
    source: {
      cumUv: 182622,
      platDonut: [['豆包', 73334, 'doubao'], ['元宝', 3873, 'yuanbao'], ['千问', 1728, 'qwen'], ['kimi', 807, 'kimi'], ['deepseek', 178, 'deepseek']]
    },
    top5: [
      { name: '联想服务中心 - 支持与服务', url: 'https://newsupport.lenovo.com.cn/', uv: 21202 },
      { name: '联想乐享 AI 助手官网', url: 'https://leai.lenovo.com.cn/', uv: 12034 },
      { name: '驱动下载列表', url: 'https://newsupport.lenovo.com.cn/driveList.html', uv: 8624 },
      { name: 'Lenovo 产品首页', url: 'https://www.lenovo.com.cn/products_index.html', uv: 6778 },
      { name: '联想笔记本电脑_联想商城', url: 'https://www.lenovo.com.cn/notebook.html', uv: 6528 }
    ],
    ca: { total: 43, rows: [{ name: '消费商品销量', val: 39, pct: '91' }, { name: 'SMB 商品销量', val: 4, pct: '9' }, { name: '政企商品销量', val: 0, pct: '0' }] },
    gmv: { total: 91533.30, rows: [{ name: '消费商品销售额', val: 78192.30, pct: '85' }, { name: 'SMB 商品销售额', val: 13341, pct: '15' }, { name: '政企商品销售额', val: 0, pct: '0' }] }
  },
  leai: {
    uv: 12266, login: 1048, newreg: 606, interact: 3488, loginInteract: 808,
    paid: [0, 0, 0, 0], ca: [0, 0, 0, 0], gmv: [0, 0, 0, 0],
    newpaid: [0, 0, 0, 0], newca: [0, 0, 0, 0], newgmv: [0, 0, 0, 0],
    orderUser: [0, 0, 0, 0], orderCa: [0, 0, 0, 0], orderGmv: [0, 0, 0, 0]
  },
  biz: [
    { key: 'c', name: '消费业务', icon: '🛍️', color: '#22c55e', uv: 20771, ca: 39, gmv: 78192.30,
      top5: [
        { name: 'Lenovo 专卖店首页', url: 'https://s.lenovo.com.cn/', uv: 746 }, { name: '小新 2026 新品上市', url: 'https://www.lenovo.com.cn/xiaoxin/', uv: 404 },
        { name: '联想拯救者游戏本', url: 'https://www.lenovo.com.cn/legion/', uv: 376 }, { name: '联想商城首页', url: 'https://www.lenovo.com.cn/', uv: 365 },
        { name: '平板电脑 - 产品页', url: 'https://www.lenovo.com.cn/tablet/', uv: 314 }] },
    { key: 'b', name: 'SMB业务（含企业购）', icon: '💼', color: '#8b5cf6', uv: 5795, ca: 4, gmv: 13341,
      top5: [
        { name: 'ThinkPad 商用笔记本', url: 'https://thinkpad.lenovo.com.cn/', uv: 353 }, { name: 'ThinkPad 旗舰系列', url: 'https://thinkpad.lenovo.com.cn/flagship/', uv: 335 },
        { name: '联想企业购', url: 'https://e.lenovo.com.cn/', uv: 186 }, { name: '商用工作站 - 产品页', url: 'https://e.lenovo.com.cn/category/workstation/', uv: 166 },
        { name: '服务与支持', url: 'https://e.lenovo.com.cn/category/servers/', uv: 148 }] },
    { key: 'biz', name: '政企业务', icon: '🏛️', color: '#3b82f6', uv: 1222, ca: 0, gmv: 0,
      top5: [
        { name: '联想政企解决方案', url: 'https://e.lenovo.com.cn/solutions/', uv: 162 }, { name: '昭阳 Pc14 2025 新品', url: 'https://e.lenovo.com.cn/zhaoyang/', uv: 96 },
        { name: '教育行业方案', url: 'https://e.lenovo.com.cn/solutions/education/', uv: 65 }, { name: '医疗行业方案', url: 'https://e.lenovo.com.cn/solutions/medical/', uv: 48 },
        { name: '招投标支持', url: 'https://e.lenovo.com.cn/tender-support/', uv: 40 }] }
  ]
};

function geoRenderConversionAll(dates) {
  const c = document.getElementById('gc-section-all'); if (!c) return;
  const d = GEO_CONV_DEMO.all;
  c.innerHTML = `<div class="geo-conv-section">
    <div class="geo-conv-title">联想整体</div>
    <div class="geo-panel" style="margin-bottom:12px">
      <div class="gpnl-title">UV趋势</div>
      <div id="gc-trend-all" style="height:200px"></div>
    </div>
    <div class="geo-conv-grid">
      ${geoConvCell('👤', '访问联想UV', d.uv, '')}
      ${geoConvCell('🪪', '登录用户', d.login, '')}
      ${geoConvCell('✨', '新注册用户', d.newreg, '')}
      ${geoConvCell('🛒', '付费用户', d.paid[0], '', { splits: d.paid.slice(1) })}
      ${geoConvCell('📄', 'CA', d.ca[0], '', { splits: d.ca.slice(1) })}
      ${geoConvCell('💰', 'GMV', d.gmv[0], '', { splits: d.gmv.slice(1) })}
      ${geoConvCell('👥', '新付费用户', d.newpaid[0], '', { splits: d.newpaid.slice(1) })}
      ${geoConvCell('📊', '新付费CA', d.newca[0], '', { splits: d.newca.slice(1) })}
      ${geoConvCell('💎', '新付费GMV', d.newgmv[0], '', { splits: d.newgmv.slice(1) })}
      ${geoConvCell('🛍️', '乐享-下单用户', d.leaiUser[0], '', { splits: d.leaiUser.slice(1) })}
      ${geoConvCell('🧾', '乐享-CA', d.leaiCa[0], '', { splits: d.leaiCa.slice(1) })}
      ${geoConvCell('🪙', '乐享-GMV', d.leaiGmv[0], '', { splits: d.leaiGmv.slice(1) })}
    </div>
  </div>`;
  geoConvChart('gc-trend-all', geoConvLineOption(dates, dates.map((x, i) => geoMockWave('conv-all', i, 2400, 3600)), '#3f78c5', true, '联想整体'));
}

function geoRenderConversionOfficial(dates, range) {
  const c = document.getElementById('gc-section-official'); if (!c) return;
  const d = GEO_CONV_DEMO.official;
  const donutTotal = d.donut.reduce((s, x) => s + x[1], 0);
  const platTotal = d.source.platDonut.reduce((s, x) => s + x[1], 0);
  c.innerHTML = `<div class="geo-conv-section">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div class="geo-conv-title">联想官网</div>
      <span style="font-size:12px;color:#6b7280;background:#fff;border:1px solid #e5e8ec;border-radius:8px;padding:4px 10px">${range.start_date} ~ ${range.end_date}</span>
    </div>
    <div class="gpnl-title" style="font-size:13px;margin:6px 0 8px">总数看板</div>
    <div class="geo-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div class="geo-panel" style="flex:1;min-width:180px">
        <div class="gpnl-title">总 UV</div>
        <div style="font-size:32px;font-weight:700;margin:12px 0 16px">${geoConvFmt(d.uv)}</div>
        <div class="gpnl-title">累计 UV</div>
        <div style="font-size:32px;font-weight:700;margin:12px 0 4px">${geoConvFmt(d.cumUv)}</div>
      </div>
      <div class="geo-panel" style="flex:1.6;min-width:300px">
        <div class="gpnl-title">UV 按站点区分</div>
        <div id="gc-donut" style="height:230px"></div>
      </div>
      <div class="geo-panel" style="flex:1.6;min-width:280px">
        <div class="gpnl-title">UV 趋势</div>
        <div id="gc-trend-official" style="height:210px"></div>
      </div>
    </div>
    <div class="gpnl-title" style="font-size:13px;margin:6px 0 8px">入站流量来源分布（AI 平台入站）</div>
    <div class="geo-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div class="geo-panel" style="flex:1;min-width:180px">
        <div class="gpnl-title">累计 UV</div>
        <div style="font-size:32px;font-weight:700;margin:18px 0 10px">${geoConvFmt(d.source.cumUv)}</div>
      </div>
      <div class="geo-panel" style="flex:1.6;min-width:300px">
        <div class="gpnl-title">入站来源各平台分布</div>
        <div id="gc-plat-donut" style="height:230px"></div>
      </div>
      <div class="geo-panel" style="flex:1.6;min-width:280px">
        <div class="gpnl-title">各来源入站 UV 趋势</div>
        <div id="gc-source-trend" style="height:210px"></div>
      </div>
    </div>
    <div class="geo-row" style="display:flex;gap:12px;flex-wrap:wrap">
      <div class="geo-panel" style="flex:2;min-width:380px">
        <div class="gpnl-title">用户访问 Top5 页面</div>
        <div id="gc-official-top-pages">${geoConvTop5Table(d.top5)}</div>
      </div>
      ${geoConvBreakCard('销售概览', '🛍️', d.ca.total, d.ca.rows, false)}
      ${geoConvBreakCard('销售额概览（元）', '💰', d.gmv.total, d.gmv.rows, true)}
    </div>
  </div>`;
  geoConvChart('gc-trend-official', geoConvLineOption(dates, dates.map((x, i) => geoMockWave('conv-official', i, 2400, 3900)), '#f59a3e', true, 'UV'));
  const donutOption = (data, centerVal) => ({
    tooltip: { trigger: 'item', textStyle: { fontSize: 11 } },
    legend: { orient: 'vertical', right: 4, top: 'middle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#6b7280' },
      formatter: name => { const it = data.find(x => x.name === name); return it ? `${name}  ${it.value.toLocaleString('zh-CN')} (${(it.value / centerVal.total * 100).toFixed(2)}%)` : name; } },
    series: [{ type: 'pie', radius: ['52%', '74%'], center: ['26%', '50%'],
      label: { show: true, position: 'center', formatter: `{a|${geoConvFmt(centerVal.total)}}\n{b|总 UV}`, rich: { a: { fontSize: 18, fontWeight: 700, color: '#111827' }, b: { fontSize: 11, color: '#9ca3af' } } },
      data }]
  });
  geoConvChart('gc-donut', donutOption(d.donut.map(([name, value]) => ({ name, value })), { total: donutTotal }));
  geoConvChart('gc-plat-donut', donutOption(
    d.source.platDonut.map(([name, value, key]) => ({ name, value, itemStyle: { color: geoPlatColors[key] || '#9ca3af' } })),
    { total: platTotal }));
  // 各来源入站UV趋势：豆包一线主导，其余贴底，与平台分布占比一致
  const platWaves = { doubao: [1800, 2900], yuanbao: [90, 170], qwen: [40, 80], kimi: [18, 38], deepseek: [3, 10] };
  geoConvChart('gc-source-trend', geoConvMultiLineOption(dates,
    d.source.platDonut.map(([name, _v, key]) => ({
      name, color: geoPlatColors[key] || '#9ca3af',
      data: dates.map((x, i) => Math.round(geoMockWave('conv-src-' + key, i, platWaves[key][0], platWaves[key][1])))
    }))));
}

function geoRenderConversionLeai(dates) {
  const c = document.getElementById('gc-section-leai'); if (!c) return;
  const d = GEO_CONV_DEMO.leai;
  c.innerHTML = `<div class="geo-conv-section">
    <div class="geo-conv-title">联想乐享</div>
    <div class="geo-panel" style="margin-bottom:12px">
      <div class="gpnl-title">UV趋势</div>
      <div id="gc-trend-leai" style="height:200px"></div>
    </div>
    <div class="geo-conv-grid">
      ${geoConvCell('👤', '访问联想乐享UV', d.uv, '')}
      ${geoConvCell('🪪', '登录用户-乐享', d.login, '')}
      ${geoConvCell('✨', '新注册用户-乐享', d.newreg, '')}
      ${geoConvCell('💬', '互动用户数', d.interact, '')}
      ${geoConvCell('🗨️', '登录状态下互动人数', d.loginInteract, '')}
      ${geoConvCell('🛒', '付费用户数', d.paid[0], '', { splits: d.paid.slice(1) })}
      ${geoConvCell('📄', 'CA', d.ca[0], '', { splits: d.ca.slice(1) })}
      ${geoConvCell('💰', 'GMV', d.gmv[0], '', { splits: d.gmv.slice(1) })}
      ${geoConvCell('👥', '新付费用户', d.newpaid[0], '', { splits: d.newpaid.slice(1) })}
      ${geoConvCell('📊', '新付费CA', d.newca[0], '', { splits: d.newca.slice(1) })}
      ${geoConvCell('💎', '新付费GMV', d.newgmv[0], '', { splits: d.newgmv.slice(1) })}
      ${geoConvCell('🛍️', '乐享·下单用户', d.orderUser[0], '', { splits: d.orderUser.slice(1) })}
      ${geoConvCell('🧾', '乐享-CA', d.orderCa[0], '', { splits: d.orderCa.slice(1) })}
      ${geoConvCell('🪙', '乐享-GMV', d.orderGmv[0], '', { splits: d.orderGmv.slice(1) })}
    </div>
  </div>`;
  geoConvChart('gc-trend-leai', geoConvLineOption(dates, dates.map((x, i) => Math.round(geoMockWave('conv-leai', i, 260, 560))), '#22c55e', true, '联想乐享'));
}

function geoRenderConversionBiz(dates) {
  const c = document.getElementById('gc-section-biz'); if (!c) return;
  c.innerHTML = `<div class="geo-conv-section">
    <div class="geo-conv-title">分业务看板</div>
    ${GEO_CONV_DEMO.biz.map(b => `
      <div class="geo-panel" style="margin-bottom:12px">
        <div style="margin-bottom:10px"><strong style="font-size:14px">${b.name}</strong></div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          <div style="min-width:130px">
            <div style="font-size:12px;color:#6b7280">业务归属 UV</div>
            <div style="font-size:28px;font-weight:700;margin:6px 0">${geoConvFmt(b.uv)}</div>
          </div>
          <div style="flex:1.4;min-width:240px">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">UV 趋势</div>
            <div id="gc-biz-trend-${b.key}" style="height:130px"></div>
          </div>
          <div style="flex:2;min-width:340px">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">业务 UV Top5 页面</div>
            ${geoConvTop5Table(b.top5)}
          </div>
          <div style="min-width:170px;display:flex;flex-direction:column;gap:10px">
            <div style="background:#f9fafb;border:1px solid #eef1f5;border-radius:10px;padding:12px">
              <div style="font-size:12px;color:#6b7280">业务销量</div>
              <div style="font-size:22px;font-weight:700;margin-top:4px">${geoConvFmt(b.ca)}</div>
            </div>
            <div style="background:#f9fafb;border:1px solid #eef1f5;border-radius:10px;padding:12px">
              <div style="font-size:12px;color:#6b7280">业务销售额（元）</div>
              <div style="font-size:22px;font-weight:700;margin-top:4px">${geoConvFmt(b.gmv, true)}</div>
            </div>
          </div>
        </div>
      </div>`).join('')}
  </div>`;
  GEO_CONV_DEMO.biz.forEach(b => {
    geoConvChart('gc-biz-trend-' + b.key, geoConvLineOption(dates, dates.map((x, i) => geoMockWave('conv-biz-' + b.key, i, Math.round(b.uv / 40), Math.round(b.uv / 22))), b.color, false));
  });
}

function geoLoadConversionPage() {
  geoInitConversionDatePicker();
  geoSyncConversionPeriodButtons();
  geoConvDisposeCharts();
  const range = geoResolveConversionDateRange();
  const dates = geoMockDates({ start_date: range.start_date, end_date: range.end_date });
  geoRenderConversionAll(dates);
  geoRenderConversionLeai(dates);
  geoRenderConversionOfficial(dates, range);
  geoRenderConversionBiz(dates);
  const status = document.getElementById('geo-conversion-status');
  if (status) status.textContent = `⚠️ 演示数据（转化数据源未接入，接口就绪后自动替换） · ${range.start_date} ~ ${range.end_date}`;
}
