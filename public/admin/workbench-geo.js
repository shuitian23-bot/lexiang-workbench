// ===== GEO DASHBOARD JS (真实数据来自点亮AI /api/geo/overview) =====
// 项目 project_id=143（联想乐享），通过 sources 参数切片不同站点
const GEO_PROJECT_ID = 143;
// scope → sources 切片：all=不传（整体），leai=乐享站，official=官网
const GEO_SOURCES = {
  all: null,
  leai: ['leai.lenovo.com.cn'],
  official: ['www.lenovo.com.cn', 'shop.lenovo.com.cn'],
};
// 联想乐享项目(143) 点亮AI 实际开启的平台：豆包/DeepSeek/元宝/Kimi（千问/文心/夸克未开启）
const GEO_PLATFORMS = ['doubao','deepseek','yuanbao','kimi'];
const geoState = { scope:'all', platform:'all', period:'30d', startDate:null, endDate:null, questions:[], apiData:null, platData:{}, compare:'brand', competitors:[] };
const GEO_COMPETITOR_COLORS = { hp:'#0096d6', dell:'#007db8', huawei:'#cf0a2c', apple:'#555555', asus:'#00529b', xiaomi:'#ff6900', acer:'#83b81a', honor:'#d4003c' };
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi' };
const geoPlatColors = { doubao:'#6366f1', deepseek:'#3b82f6', yuanbao:'#10b981', kimi:'#f59e0b' };

function geoSetScope(el) {
  document.querySelectorAll('.geo-scope-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active'); geoState.scope = el.dataset.scope; geoLoadData();
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
  geoLoadData();
}
async function geoFetch(models) {
  const body = { project_id: GEO_PROJECT_ID };
  if (geoState.startDate && geoState.endDate) {
    body.start_date = geoState.startDate;
    body.end_date = geoState.endDate;
  } else {
    body.period = geoState.period || '30d';
  }
  if (models && models.length) body.models = models;
  const srcs = GEO_SOURCES[geoState.scope];
  if (srcs && srcs.length) body.sources = srcs;
  if (geoState.questions && geoState.questions.length) body.questions = geoState.questions;
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
  const days = period === '7d' ? 7 : 30;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  const fmt = d => d.toISOString().slice(0,10);
  geoState.startDate = fmt(startDate);
  geoState.endDate = fmt(endDate);
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
  const today = new Date();
  const end = today.toISOString().slice(0,10);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  startEl.value = start.toISOString().slice(0,10);
  endEl.value = end;
}
function geoSetQuestions(text) {
  geoState.questions = (text || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
  geoLoadData();
}

function geoSetStatus(text, isError) {
  const s = document.getElementById('geo-status');
  if (s) { s.textContent = text; s.style.color = isError ? 'var(--red)' : 'var(--text-tertiary)'; }
}
function geoFmtPct(v) { return (v == null || v === '' || isNaN(v)) ? '—' : (+v).toFixed(2) + '%'; }

async function geoLoadData() {
  if (!document.getElementById('gv-brand-visible')) return;
  geoInitDatePicker();
  geoSetStatus('加载中...');
  const selectedModels = geoState.platform === 'all' ? [] : geoState.platform.split(',');
  try {
    const data = await geoFetch(selectedModels);
    if (data.code !== 200) throw new Error(data.message || '请求失败');
    geoState.apiData = data;
    geoRenderKpis(data);
    geoRenderEcology(data);

    const scopeLbl = { all:'整体', leai:'联想乐享', official:'联想官网' }[geoState.scope] || '整体';
    const periodLbl = geoState.startDate ? `${geoState.startDate} ~ ${geoState.endDate}` : (geoState.period || '30d');
    geoSetStatus('更新于 ' + new Date().toLocaleTimeString() + ' · 点亮AI · ' + scopeLbl + ' · ' + periodLbl);

    // 第二步：剩余请求全部并发，互不阻塞
    const platPromise = Promise.allSettled(GEO_PLATFORMS.map(p => geoFetch([p])));
    const sitesPromise = geoLoadSites();
    const questionsPromise = geoLoadQuestions();
    const trendPromise = geoFetchTrend(selectedModels);
    const trendChartPromise = geoLoadTrendChart();
    const wordCloudPromise = geoLoadWordCloud(30);

    // 平台分布完成后立即渲染
    platPromise.then(results => {
      geoState.platData = {};
      GEO_PLATFORMS.forEach((p, i) => {
        if (results[i].status === 'fulfilled' && results[i].value.code === 200) {
          geoState.platData[p] = results[i].value;
        }
      });
      geoRenderPlatDist();
    });

    // sites 和 questions 各自内部已有渲染逻辑，无需额外处理
  } catch (e) {
    geoSetStatus('加载失败：' + e.message, true);
    console.error('GEO API error', e);
  }
}

function geoClampPct(v) { return (v == null || isNaN(v)) ? null : Math.min(+v, 100); }

async function geoFetchTrend(models) {
  try {
    const prevBody = { project_id: GEO_PROJECT_ID };
    if (geoState.startDate && geoState.endDate) {
      const s = new Date(geoState.startDate), e = new Date(geoState.endDate);
      const days = Math.round((e - s) / 86400000) + 1;
      const prevEnd = new Date(s); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
      prevBody.start_date = prevStart.toISOString().slice(0,10);
      prevBody.end_date = prevEnd.toISOString().slice(0,10);
    } else {
      const p = geoState.period || '30d';
      const days = p === '7d' ? 7 : p === '30d' ? 30 : 365;
      const today = new Date();
      const end = new Date(today); end.setDate(end.getDate() - days);
      const start = new Date(end); start.setDate(start.getDate() - days + 1);
      prevBody.start_date = start.toISOString().slice(0,10);
      prevBody.end_date = end.toISOString().slice(0,10);
    }
    if (models && models.length) prevBody.models = models;
    const srcs = GEO_SOURCES[geoState.scope];
    if (srcs && srcs.length) prevBody.sources = srcs;
    const resp = await fetch('/api/geo-dashboard/overview', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(prevBody) });
    const prev = await resp.json();
    if (prev.code !== 200) return;
    const raw = geoState._kpiRaw; if (!raw) return;
    const pbcm = prev.brand_coverage_metrics || {};
    const pcm = prev.conversion_metrics || {};
    const prevRaw = {
      visible: pbcm.brand_exposure_rate, rec: pcm.brand_priority_rate,
      top1: pcm.brand_top1_rate, top3: pcm.brand_top3_rate
    };
    geoState._trendPrev = prevRaw;
    geoRenderTrend();
  } catch(e) { console.error('geoFetchTrend', e); }
}

function geoRenderTrend() {
  const raw = geoState._kpiRaw;
  const prev = geoState._trendPrev;
  if (!raw || !prev) return;
  const metrics = ['visible','rec','top1','top3'];
  metrics.forEach(m => {
    const card = document.querySelector(`.geo-kpi[data-metric="${m}"]`);
    if (!card) return;
    let trendEl = card.querySelector('.gk-trend');
    if (!trendEl) { trendEl = document.createElement('div'); trendEl.className = 'gk-trend'; card.appendChild(trendEl); }
    const cur = raw[m].brand || 0;
    const prv = prev[m] || 0;
    const diff = cur - prv;
    if (Math.abs(diff) < 0.01) { trendEl.innerHTML = `<span style="font-size:11px;color:#6b7280">— 持平</span>`; return; }
    const up = diff > 0;
    const arrow = up ? '↑' : '↓';
    const color = up ? '#059669' : '#dc2626';
    trendEl.innerHTML = `<span style="font-size:11px;color:${color};font-weight:500">${arrow} ${Math.abs(diff).toFixed(2)}pp</span><span style="font-size:10px;color:#9ca3af;margin-left:4px">环比</span>`;
  });
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
  const c = document.getElementById('geo-trend-chart'); if (!c) return;
  const raw = geoState._kpiRaw; if (!raw) return;
  const items = [
    { label: '品牌可见度', key: 'visible' },
    { label: '品牌推荐率', key: 'rec' },
    { label: '推荐置顶率', key: 'top1' },
    { label: '推荐前三率', key: 'top3' },
  ];
  let html = '<div style="display:flex;flex-direction:column;gap:14px;padding:4px 0">';
  items.forEach(item => {
    const b = raw[item.key].brand || 0;
    const cv = raw[item.key].comp || 0;
    const diff = b - cv;
    const diffColor = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#6b7280';
    const diffSign = diff > 0 ? '+' : '';
    html += `<div style="padding:10px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:#374151">${item.label}</span>
        <span style="font-size:11px;font-weight:600;color:${diffColor}">${diffSign}${diff.toFixed(2)}pp</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:10px;color:#6b7280;width:24px">联想</span>
        <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(b,100).toFixed(0)}%;background:#2563eb;border-radius:3px"></div></div>
        <span style="font-size:11px;font-weight:600;color:#374151;min-width:48px;text-align:right">${b.toFixed(2)}%</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:#6b7280;width:24px">竞品</span>
        <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(cv,100).toFixed(0)}%;background:#f59e0b;border-radius:3px"></div></div>
        <span style="font-size:11px;font-weight:600;color:#374151;min-width:48px;text-align:right">${cv.toFixed(2)}%</span>
      </div>
    </div>`;
  });
  html += '</div>';
  c.innerHTML = html;
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
    if (geoState.competitors.length >= 5) return;
    geoState.competitors.push(brand);
    const color = GEO_COMPETITOR_COLORS[brand] || '#6b7280';
    el.style.background = color;
    el.style.color = '#fff';
    el.style.borderColor = color;
  }
}

function geoSetCompare(mode) {
  geoState.compare = mode;
  document.querySelectorAll('.geo-cmp-btn').forEach(b => {
    const active = b.dataset.cmp === mode;
    b.style.background = active ? '#2563eb' : '#fff';
    b.style.color = active ? '#fff' : '#374151';
  });
  geoApplyCompare();
}

function geoApplyCompare() {
  const raw = geoState._kpiRaw;
  if (!raw) return;
  const mode = geoState.compare;
  const labels = { visible: ['品牌可见度','竞品可见度'], rec: ['品牌推荐率','竞品推荐率'], top1: ['品牌推荐置顶率','竞品推荐置顶率'], top3: ['品牌推荐前三率','竞品推荐前三率'] };
  const idMap = { visible: ['gv-brand-visible','gv-comp-visible'], rec: ['gv-brand-rec','gv-comp-rec'], top1: ['gv-brand-top1','gv-comp-top1'], top3: ['gv-brand-top3','gv-comp-top3'] };

  for (const [metric, ids] of Object.entries(idMap)) {
    const valEl = document.getElementById(ids[0]);
    const compEl = document.getElementById(ids[1]);
    const card = valEl?.closest('.geo-kpi');
    if (!card) continue;
    const labelEl = card.querySelector('.gk-label');
    const brandSubEl = card.querySelector('.gk-brand-sub');
    const compareEl = card.querySelector('.gk-compare');
    const b = raw[metric].brand;
    const c = raw[metric].comp;

    if (mode === 'brand') {
      valEl.textContent = geoFmtPct(b);
      labelEl.textContent = labels[metric][0];
      if (brandSubEl) { brandSubEl.style.display = ''; brandSubEl.innerHTML = `${labels[metric][1]} <span>${geoFmtPct(c)}</span>`; }
      if (compareEl) compareEl.style.display = 'none';
      card.classList.toggle('highlight', metric === 'visible');
    } else if (mode === 'competitor') {
      valEl.textContent = geoFmtPct(c);
      labelEl.textContent = labels[metric][1];
      if (brandSubEl) { brandSubEl.style.display = ''; brandSubEl.innerHTML = `${labels[metric][0]} <span>${geoFmtPct(b)}</span>`; }
      if (compareEl) compareEl.style.display = 'none';
      card.classList.remove('highlight');
      if (metric === 'visible') card.style.borderColor = '#f59e0b';
    } else {
      // both mode — show comparison bar
      valEl.textContent = geoFmtPct(b);
      labelEl.textContent = labels[metric][0];
      if (brandSubEl) brandSubEl.style.display = 'none';
      if (compareEl) {
        compareEl.style.display = '';
        const bv = b || 0, cv = c || 0;
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
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:2px"><span>竞品</span><span>${geoFmtPct(c)}</span></div>
              <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${(cv/maxV*100).toFixed(0)}%;background:#f59e0b;border-radius:3px"></div></div>
            </div>
          </div>
          <div style="font-size:10px;color:${diffColor};margin-top:3px;font-weight:600">差值 ${diffSign}${diff.toFixed(2)}pp</div>
        `;
      }
      card.classList.toggle('highlight', metric === 'visible');
      card.style.borderColor = '';
    }
    // reset border when not competitor mode
    if (mode !== 'competitor') card.style.borderColor = '';
  }
}

function geoRenderEcology(data) {
  const cem = data.content_ecology_metrics || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = (v || 0).toLocaleString(); };
  set('gv-wiki-cite', cem.wiki_citation_count);
  set('gv-lenovo-cite', cem.lenovo_citation_count);
}

function geoRenderPlatDist() {
  const c = document.getElementById('geo-plat-dist'); if (!c) return;
  const pd = geoState.platData;
  const rows = GEO_PLATFORMS.map(p => {
    const d = pd[p];
    if (!d) return { p, cites: 0, brand: 0, missing: true };
    const cem = d.content_ecology_metrics || {};
    const bcm = d.brand_coverage_metrics || {};
    return {
      p,
      cites: (cem.wiki_citation_count || 0) + (cem.lenovo_citation_count || 0),
      brand: bcm.brand_exposure_rate || 0,
      missing: false,
    };
  });
  const mx = Math.max(...rows.map(r => r.cites), 1);
  c.innerHTML = rows.map(r => {
    const color = geoPlatColors[r.p] || '#3b82f6';
    const pct = Math.min(r.brand, 100).toFixed(0);
    if (r.missing) {
      return `<div class="geo-plat-card"><div class="gpc-name">${geoPlatNames[r.p] || r.p}</div><div style="color:#6b7390;font-size:11px">无数据</div></div>`;
    }
    return `<div class="geo-plat-card">
      <div class="gpc-name">${geoPlatNames[r.p] || r.p}</div>
      <div class="gpc-row"><span>引用次数</span><span class="gpc-val">${r.cites.toLocaleString()}</span></div>
      <div class="gpc-row"><span>品牌可见度</span><span class="gpc-val">${r.brand.toFixed(1)}%</span></div>
      <div class="gpc-bar"><div class="gpc-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

// ===== GEO 信源分布 (sites API) =====
const GEO_TREEMAP_COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#4f46e5','#15803d','#b45309','#9333ea','#0e7490','#be123c','#6366f1','#047857','#ea580c'];

async function geoLoadSites() {
  try {
    const body = { project_id: GEO_PROJECT_ID };
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (json.code !== 200) return;
    const d = json.data;
    const sites = d.sites || [];
    geoRenderTreemap(sites);
    geoRenderSiteRank(sites);
    geoRenderLinkTop50(sites);
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('gv-sites-total', (d.total_records||0).toLocaleString());
  } catch(e) { console.error('geoLoadSites', e); }
}

function geoRenderTreemap(sites) {
  const c = document.getElementById('geo-sites-treemap'); if(!c) return;
  const top = sites.slice(0, 20);
  const totalPct = top.reduce((s,x) => s + x.percentage, 0);
  if (!top.length) { c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">暂无数据</div>'; return; }
  c.innerHTML = '<div class="geo-treemap">' + top.map((s, i) => {
    const bg = GEO_TREEMAP_COLORS[i % GEO_TREEMAP_COLORS.length];
    const flex = Math.max(s.percentage / totalPct * 100, 3);
    return `<div class="gtm-cell" style="flex:${flex};background:${bg};min-width:60px;min-height:50px" title="${s.domain} · ${s.count.toLocaleString()}次 · ${s.percentage}%"><span class="gtm-name">${s.name}</span><span class="gtm-pct">${s.percentage}%</span></div>`;
  }).join('') + '</div>';
}

function geoRenderSiteRank(sites) {
  const c = document.getElementById('geo-sites-rank'); if(!c) return;
  const top = sites.slice(0, 20);
  if (!top.length) { c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">暂无数据</div>'; return; }
  c.innerHTML = '<ol class="geo-rank-list">' + top.map(s =>
    `<li><span class="grl-idx">${s.rank}</span><span class="grl-name" title="${s.domain}">${s.name}</span><span class="grl-count">${s.count.toLocaleString()} · ${s.percentage}%</span></li>`
  ).join('') + '</ol>';
}

// ===== GEO AI引用链接 Top50 =====
function geoRenderLinkTop50(sites) {
  const c = document.getElementById('geo-link-top50'); if (!c) return;
  const top = sites.slice(0, 50);
  if (!top.length) { c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">暂无数据</div>'; return; }
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
          <span style="font-size:${isTop3 ? '14px' : '13px'};font-weight:${isTop3 ? '600' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
          <a href="https://${s.domain}" target="_blank" rel="noopener" style="font-size:11px;color:#2563eb;white-space:nowrap;text-decoration:none;flex-shrink:0" title="${s.domain}">${s.domain}</a>
        </div>
        <div style="height:${isTop3 ? '6px' : '4px'};background:#e5e7eb;border-radius:3px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${isTop3 ? '#2563eb' : '#93c5fd'};border-radius:3px"></div></div>
      </div>
      <span style="${countStyle}">${s.count.toLocaleString()}</span>
    </li>`;
  }).join('') + '</ol>';
}

// ===== GEO 意图列表 (questions API) =====
const GEO_FIELD_LABELS = { brand_composite_exposure_rate:'品牌综合可见', brand_precise_exposure_rate:'品牌精准可见', competitor_exposure_rate:'竞品可见', brand_exposure_rate:'品牌曝光率', brand_top3_rate:'品牌前三率' };

async function geoLoadQuestions() {
  try {
    const body = { project_id: GEO_PROJECT_ID };
    const resp = await fetch('/api/geo-dashboard/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (json.code !== 200) return;
    const qs = json.data.questions || [];
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('gv-q-count', qs.length);
    geoRenderQuestions(qs);
    geoRenderIntentPlatformSummary(qs);
    geoPopulateTrendQuestions();
  } catch(e) { console.error('geoLoadQuestions', e); }
}

function geoRenderQuestions(qs) {
  geoState._questionsData = qs;
  const visibleModels = geoState._visibleIntentModels || null;
  const c = document.getElementById('geo-questions-table'); if(!c) return;
  if (!qs.length) { c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">暂无意图</div>'; return; }
  const fieldKeys = [];
  if (qs[0].models && qs[0].models[0] && qs[0].models[0].fields) qs[0].models[0].fields.forEach(f => fieldKeys.push(f.field));
  const allModels = (qs[0].models || []).map(m => m.model);
  const models = visibleModels ? allModels.filter(m => visibleModels.includes(m)) : allModels;
  geoRenderIntentFilter(allModels, models);
  let html = '<table class="geo-intent-table" style="width:100%"><thead><tr><th style="text-align:left;min-width:180px">意图</th>';
  models.forEach(m => { const name = geoPlatNames[m] || m; fieldKeys.forEach(f => { html += `<th>${name}<br><span style="font-size:10px;font-weight:400">${GEO_FIELD_LABELS[f] || f}</span></th>`; }); });
  html += '</tr></thead><tbody>';
  qs.forEach(q => {
    html += `<tr><td class="name" title="${q.question}">${q.question.length > 20 ? q.question.slice(0,20)+'…' : q.question}</td>`;
    models.forEach(m => { const md = (q.models || []).find(x => x.model === m); fieldKeys.forEach(f => { const fd = md && (md.fields || []).find(x => x.field === f); const v = fd ? fd.value : '-'; const cls = v === '是' ? 'yes' : (v === '否' ? 'no' : ''); html += `<td class="${cls}">${v}</td>`; }); });
    html += '</tr>';
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

function geoRenderIntentFilter(allModels, activeModels) {
  const c = document.getElementById('geo-intent-plat-filter'); if (!c) return;
  c.innerHTML = allModels.map(m => {
    const name = geoPlatNames[m] || m;
    const color = geoPlatColors[m] || '#6b7280';
    const active = activeModels.includes(m);
    return `<button onclick="geoToggleIntentModel('${m}')" style="padding:3px 10px;font-size:11px;border-radius:12px;border:1px solid ${active ? color : '#d1d5db'};background:${active ? color : '#fff'};color:${active ? '#fff' : '#6b7280'};cursor:pointer;font-weight:500;transition:all .15s">${name}</button>`;
  }).join('');
}

function geoToggleIntentModel(model) {
  if (!geoState._questionsData) return;
  const allModels = (geoState._questionsData[0].models || []).map(m => m.model);
  let vis = geoState._visibleIntentModels || [...allModels];
  if (vis.includes(model)) {
    vis = vis.filter(m => m !== model);
    if (!vis.length) vis = [...allModels];
  } else {
    vis.push(model);
  }
  geoState._visibleIntentModels = vis.length === allModels.length ? null : vis;
  geoRenderQuestions(geoState._questionsData);
}

function geoRenderIntentPlatformSummary(qs) {
  const c = document.getElementById('geo-intent-platform-summary'); if (!c) return;
  if (!qs.length) { c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">暂无数据</div>'; return; }
  const models = (qs[0].models || []).map(m => m.model);
  const totalCount = qs.length;
  const platStats = {};
  models.forEach(m => { platStats[m] = 0; });
  qs.forEach(q => {
    (q.models || []).forEach(md => {
      const visible = (md.fields || []).some(f => f.value === '是');
      if (visible) platStats[md.model] = (platStats[md.model] || 0) + 1;
    });
  });
  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:8px 0">';
  html += `<div style="flex:1;min-width:140px;padding:16px;background:#f0f7ff;border-radius:10px;text-align:center;border:1px solid #dbeafe">
    <div style="font-size:28px;font-weight:700;color:#1e40af">${totalCount}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">优化意图总数</div>
  </div>`;
  models.forEach(m => {
    const name = geoPlatNames[m] || m;
    const color = geoPlatColors[m] || '#6b7280';
    const count = platStats[m] || 0;
    const pct = totalCount ? (count / totalCount * 100).toFixed(0) : 0;
    html += `<div style="flex:1;min-width:140px;padding:16px;background:#fff;border-radius:10px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px;font-weight:700;color:${color}">${count}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${name} 覆盖意图数</div>
      <div style="height:4px;background:#e5e7eb;border-radius:2px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:2px"></div></div>
      <div style="font-size:10px;color:#9ca3af;margin-top:2px">${pct}% 覆盖率</div>
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
  const st = document.getElementById('geo-source-status');
  const c = document.getElementById('geo-source-list');
  if (st) st.textContent = '加载中...';
  try {
    const body = { project_id: GEO_PROJECT_ID, model: model === 'all' ? '' : model, page: geoSourcePage };
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const json = await resp.json();
    if (json.code !== 200) throw new Error(json.message);
    const d = json.data; const sites = d.sites || []; const pg = d.pagination || {};
    if (st) st.textContent = `共 ${(d.total_records||0).toLocaleString()} 个站点 · 第 ${pg.current_page}/${pg.total_pages} 页`;
    if (!c) return;
    c.innerHTML = '<table class="geo-intent-table" style="width:100%"><thead><tr><th style="width:50px">排名</th><th style="text-align:left">站点</th><th style="text-align:left">域名</th><th>引用次数</th><th>占比</th></tr></thead><tbody>' +
      sites.map(s => `<tr><td>${s.rank}</td><td class="name">${s.name}</td><td class="name" style="font-size:11px;color:#6b7280">${s.domain}</td><td>${s.count.toLocaleString()}</td><td>${s.percentage}%</td></tr>`).join('') + '</tbody></table>';
    const pager = document.getElementById('geo-source-pager');
    if (pager && pg.total_pages > 1) {
      let ph = '';
      if (pg.has_prev) ph += `<button onclick="geoLoadSourcePage(${pg.prev_page})" style="margin:0 4px;padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px">上一页</button>`;
      ph += `<span style="font-size:12px;color:#6b7280;margin:0 8px">第 ${pg.current_page} / ${pg.total_pages} 页</span>`;
      if (pg.has_next) ph += `<button onclick="geoLoadSourcePage(${pg.next_page})" style="margin:0 4px;padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px">下一页</button>`;
      pager.innerHTML = ph;
    } else if (pager) { pager.innerHTML = ''; }
  } catch(e) { if (st) st.textContent = '加载失败：' + e.message; console.error('geoLoadSourcePage', e); }
}

// ===== GEO 趋势折线图（真实数据 from 点亮AI） =====
let _trendChartData = null;

async function geoLoadTrendChart() {
  const canvas = document.getElementById('geo-trend-canvas');
  if (!canvas) return;
  const modelSel = document.getElementById('geo-trend-model');
  const qSel = document.getElementById('geo-trend-question');
  const params = { project_id: GEO_PROJECT_ID };
  const days = (geoState.startDate && geoState.endDate) ? Math.round((new Date(geoState.endDate) - new Date(geoState.startDate)) / 86400000) + 1 : (geoState.period === '7d' ? 7 : 30);
  params.time_range = days <= 7 ? 7 : 30;
  if (modelSel && modelSel.value) params.filter_model = modelSel.value;
  if (qSel && qSel.value) params.filter_question = qSel.value;
  try {
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch('/api/geo-dashboard/project-chart?' + qs);
    const json = await resp.json();
    if (!json.success || !json.data?.project?.chart_data) return;
    _trendChartData = json.data.project.chart_data;
    geoDrawTrendCanvas();
  } catch(e) { console.error('geoLoadTrendChart', e); }
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
  if (!canvas || !_trendChartData) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const dates = _trendChartData.dates || [];
  const series = _trendChartData.series || [];
  if (!dates.length || !series.length) return;

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
      const x = pad.left + (i / (dates.length - 1)) * plotW;
      ctx.fillText(d, x, H - pad.bottom + 18);
    }
  });

  // Draw lines
  const colors = ['#2563eb', '#10b981', '#6b7280'];
  series.forEach((s, si) => {
    const color = colors[si] || '#6b7280';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = pad.left + (i / (dates.length - 1)) * plotW;
      const y = pad.top + plotH - (v - yMin) / yRange * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    s.data.forEach((v, i) => {
      const x = pad.left + (i / (dates.length - 1)) * plotW;
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
    const idx = Math.round((mx - pad.left) / plotW * (dates.length - 1));
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
    if (!json.success || !json.data) return;
    geoRenderWordCloud(json.data, c);
  } catch(e) { console.error('geoLoadWordCloud', e); c.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:12px">加载失败</div>'; }
}

function geoRenderWordCloud(words, container) {
  if (!words.length) { container.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:12px">暂无数据</div>'; return; }
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
    html += `<span style="position:absolute;left:${bestX.toFixed(0)}px;top:${bestY.toFixed(0)}px;font-size:${size.toFixed(0)}px;color:${color};font-weight:${fw};transform:rotate(${rotate}deg);white-space:nowrap;cursor:default;line-height:1.2;transition:opacity .2s" title="${w.name}: ${w.value}">${w.name}</span>`;
  });
  html += '</div>';
  container.innerHTML = html;
}
