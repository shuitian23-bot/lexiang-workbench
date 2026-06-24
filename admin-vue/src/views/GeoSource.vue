<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">GEO · 各平台信源分布</div>
        <div class="page-desc">各 AI 模型引用的内容发布平台分布及占比</div>
      </div>
      <div class="geo-source-controls">
        <select v-model="filterScope" @change="loadPage(1)">
          <option value="all">整体</option>
          <option value="official">联想官网</option>
          <option value="leai">联想乐享</option>
        </select>
        <select v-model="filterModel" @change="loadPage(1)">
          <option value="all">全平台</option>
          <option value="doubao">豆包</option>
          <option value="deepseek">DeepSeek</option>
          <option value="yuanbao">元宝</option>
          <option value="kimi">Kimi</option>
        </select>
        <select v-model="filterPageSize" @change="loadPage(1)">
          <option value="10">10条/页</option>
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
        <div class="geo-source-meta" v-html="statusHtml"></div>
      </div>
      <div v-html="listHtml || pendingHtml('加载中...')"></div>
      <div v-html="pagerHtml"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const GEO_PROJECT_ID = 143
const GEO_SCOPE_CONFIG = {
  all:      { requestBrand: null },
  official: { requestBrand: '联想官网' },
  leai:     { requestBrand: '联想乐享' },
}
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi' }
const PENDING = '待接口提供数据'

const filterScope = ref('all')
const filterModel = ref('all')
const filterPageSize = ref('10')
const currentPage = ref(1)
const statusHtml = ref('加载中...')
const listHtml = ref('')
const pagerHtml = ref('')

function pendingHtml(msg) {
  return `<div class="geo-pending"><div class="geo-pending-title">${msg || PENDING}</div></div>`
}
function geoNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v); return Number.isFinite(n) ? n : null
}
function geoFmtCount(v) { const n = geoNum(v); return n === null ? PENDING : n.toLocaleString() }
function geoFmtPct(v) { const n = geoNum(v); return n === null ? PENDING : n.toFixed(2) + '%' }
function geoEsc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function geoSiteName(s) { return s.site_name || s.name || s.domain || '-' }
function geoSiteLogoHtml(domain, name) {
  const d = String(domain||'').replace(/^https?:\/\//,'').split('/')[0]
  const fallback = geoEsc(String(name||d||'?').trim().slice(0,1).toUpperCase()||'?')
  if (!d) return `<span class="geo-site-logo fallback">${fallback}</span>`
  if (/lenovo\.(com|com\.cn|cn)$/i.test(d)||d.includes('.lenovo.')) return `<span class="geo-site-logo"><img src="assets/logo-icon.png" alt=""></span>`
  const url = `https://www.google.com/s2/favicons?sz=32&domain_url=https://${encodeURIComponent(d)}`
  return `<span class="geo-site-logo" data-fallback="${fallback}"><img src="${url}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('fallback');this.parentElement.textContent=this.parentElement.dataset.fallback||'?'"></span>`
}

function buildSitesBody() {
  const sc = filterScope.value
  const body = {
    project_id: GEO_PROJECT_ID,
    page: currentPage.value,
    page_size: Number(filterPageSize.value) || 10,
  }
  // date range：近30天
  const end = new Date(); end.setDate(end.getDate()-1)
  const start = new Date(end.getTime()-29*86400000)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  body.start_date = fmt(start); body.end_date = fmt(end)
  const brand = GEO_SCOPE_CONFIG[sc]?.requestBrand
  if (brand) body.brands = brand
  const model = filterModel.value
  if (model && model !== 'all') body.model = model
  return body
}

function visiblePages(current, total) {
  const pages = []
  const safeTotal = Math.max(total||1,1)
  const add = p => { if (p>=1&&p<=safeTotal&&!pages.includes(p)) pages.push(p) }
  add(1); add(current-1); add(current); add(current+1); add(safeTotal)
  pages.sort((a,b)=>a-b)
  const out = []
  pages.forEach((p,i) => { if (i&&p-pages[i-1]>1) out.push('...'); out.push(p) })
  return out
}

function buildPagerHtml(pg) {
  const cur = pg.current_page || currentPage.value || 1
  const total = pg.total_pages || 1
  if (total <= 1) return ''
  const pages = visiblePages(cur, total)
  return `<div class="geo-source-pager">
    <button ${!pg.has_prev?'disabled':''} onclick="document.dispatchEvent(new CustomEvent('geo-source-page',{detail:${Math.max(cur-1,1)}}))">‹</button>
    ${pages.map(p => p==='...' ? '<span class="geo-source-ellipsis">...</span>' : `<button class="${p===cur?'active':''}" onclick="document.dispatchEvent(new CustomEvent('geo-source-page',{detail:${p}}))">${p}</button>`).join('')}
    <button ${!pg.has_next?'disabled':''} onclick="document.dispatchEvent(new CustomEvent('geo-source-page',{detail:${Math.min(cur+1,total)}}))">›</button>
  </div>`
}

async function loadPage(page) {
  currentPage.value = page || 1
  try {
    const body = buildSitesBody()
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const json = await resp.json()
    if (json.code !== 200) throw new Error(json.message)
    const d = json.data || {}; const sites = d.sites || []; const pg = d.pagination || {}
    if (!sites.length) { statusHtml.value = PENDING; listHtml.value = pendingHtml(); pagerHtml.value = ''; return }
    const shownPageSize = pg.per_page || Number(filterPageSize.value)
    const pageSizeNote = shownPageSize !== Number(filterPageSize.value) ? ' · 接口暂未按所选条数返回' : ''
    const scopeLabel = { all:'整体', official:'联想官网', leai:'联想乐享' }[filterScope.value] || filterScope.value
    const modelLabel = filterModel.value === 'all' ? '全平台' : (geoPlatNames[filterModel.value] || filterModel.value)
    statusHtml.value = `<span class="geo-source-stat"><strong>${(d.total_records||0).toLocaleString()}</strong> 个站点</span><span class="geo-source-stat">第 <strong>${pg.current_page||1} / ${pg.total_pages||1}</strong> 页</span><span class="geo-source-stat">${geoEsc(scopeLabel)} · ${geoEsc(modelLabel)} · ${shownPageSize} 条/页${geoEsc(pageSizeNote)}</span>`
    const maxCount = Math.max(...sites.map(s => geoNum(s.count)||0), 1)
    listHtml.value = `<table class="geo-source-table"><thead><tr><th>排名</th><th>站点</th><th>域名</th><th>引用次数</th><th>占比</th></tr></thead><tbody>
      ${sites.map(s => {
        const count = geoNum(s.count)||0
        const pct = geoNum(s.percentage)
        const barW = Math.max(count/maxCount*100,3).toFixed(0)
        const name = geoSiteName(s)
        return `<tr>
          <td><span class="geo-source-rank ${s.rank<=3?'top':''}">${s.rank}</span></td>
          <td class="name"><span class="geo-source-site">${geoSiteLogoHtml(s.domain,name)}<span>${geoEsc(name)}</span></span></td>
          <td class="domain">${geoEsc(s.domain||'-')}</td>
          <td><div class="geo-source-count"><strong>${geoFmtCount(count)}</strong><span><i style="width:${barW}%"></i></span></div></td>
          <td><div class="geo-source-pct"><span>${geoFmtPct(pct)}</span><i style="background:conic-gradient(#3f78c5 ${Math.max(Math.min(pct||0,100),0)}%,#e2e8f0 0)"></i></div></td>
        </tr>`
      }).join('')}</tbody></table>`
    pagerHtml.value = buildPagerHtml(pg)
  } catch(e) {
    statusHtml.value = PENDING; listHtml.value = pendingHtml(); pagerHtml.value = ''
    console.error('geoLoadSourcePage', e)
  }
}

onMounted(() => {
  loadPage(1)
  document.addEventListener('geo-source-page', e => loadPage(e.detail))
})
</script>
