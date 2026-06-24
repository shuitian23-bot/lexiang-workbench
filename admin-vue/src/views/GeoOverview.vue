<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">GEO · 整体数据概览</div>
        <div class="page-desc">联想 AI 搜索引擎优化效果监控 · 数据来源：点亮AI</div>
      </div>
      <button class="btn btn-sm btn-primary" @click="loadData">刷新</button>
    </div>

    <div class="geo-dark">
      <!-- scope tab -->
      <div class="geo-scope-bar">
        <div
          v-for="s in scopeList" :key="s.key"
          class="geo-scope-tab"
          :class="{ active: scope === s.key }"
          @click="setScope(s.key)"
        >{{ s.label }}</div>
      </div>

      <!-- 平台筛选 -->
      <div class="geo-filter-row">
        <span class="geo-label">AI 平台</span>
        <div
          v-for="p in platformList" :key="p.key"
          class="geo-pill"
          :class="{ active: platform === p.key }"
          @click="togglePlatform(p.key)"
        >{{ p.label }}</div>
        <span class="geo-pill-disabled" title="项目未开启该平台">千问 (未开启)</span>
        <span class="geo-pill-disabled" title="项目未开启该平台">文心 (未开启)</span>
        <span class="geo-pill-disabled" title="项目未开启该平台">夸克 (未开启)</span>
      </div>

      <!-- 时间范围 -->
      <div class="geo-filter-row" style="flex-wrap:wrap;gap:8px">
        <span class="geo-label">时间范围</span>
        <input type="date" v-model="dateStart" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" @change="onDateChange">
        <span style="font-size:12px;color:#6b7280">至</span>
        <input type="date" v-model="dateEnd" style="padding:4px 8px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;cursor:pointer" @change="onDateChange">
        <div style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;margin-left:4px">
          <button
            v-for="p in periodList" :key="p.key"
            class="geo-period-btn"
            :style="period === p.key ? 'background:#2563eb;color:#fff' : 'background:#fff;color:#374151'"
            style="padding:4px 12px;font-size:12px;border:none;cursor:pointer;transition:all .15s"
            @click="quickPeriod(p.key)"
          >{{ p.label }}</button>
        </div>
        <span class="geo-label" style="margin-left:12px">意图筛选</span>
        <select v-model="selectedQuestion" @change="onQuestionChange" style="padding:5px 10px;border-radius:8px;font-size:12px;background:#f9fafb;color:#374151;border:1px solid #d1d5db;min-width:200px;max-width:320px;cursor:pointer">
          <option value="">全部意图</option>
          <option v-for="q in stableIntents" :key="q.question || q" :value="q.question || q">
            {{ (q.question || q).length > 40 ? (q.question || q).slice(0,40)+'...' : (q.question || q) }}
          </option>
        </select>
      </div>

      <div class="geo-status-line">{{ statusText }}</div>
      <div class="geo-context-line">{{ contextLine }}</div>
      <div class="geo-interface-note">
        接口说明：0605 已支持稳定意图、分竞品可见性趋势、wiki 引用累计和信源 page_size/brands；转化与分竞品推荐类指标未提供时显示"待接口提供数据"。
      </div>

      <!-- 对比视角 -->
      <div v-if="scope !== 'leai'" style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">分析模式</span>
          <div style="display:inline-flex;border:1px solid #d1d5db;border-radius:8px;overflow:hidden">
            <button
              v-for="m in compareModes" :key="m.key"
              :style="compareMode === m.key ? 'background:#2563eb;color:#fff' : 'background:#fff;color:#374151'"
              style="padding:5px 16px;font-size:12px;border:none;cursor:pointer;font-weight:500;transition:all .15s"
              @click="setCompareMode(m.key)"
            >{{ m.label }}</button>
          </div>
        </div>
        <div v-if="compareMode === 'compare'" style="width:1px;height:20px;background:#e5e7eb"></div>
        <div v-if="compareMode === 'compare'" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">竞品品牌 · 已选 {{ selectedCompetitors.length }}/5</span>
          <button
            v-for="c in competitorList" :key="c.key"
            class="geo-comp-pill"
            :style="compPillStyle(c.key)"
            @click="toggleCompetitor(c.key)"
          >{{ c.label }}</button>
          <span v-if="compLimitMsg" style="font-size:11px;color:#dc2626">{{ compLimitMsg }}</span>
          <span v-else style="font-size:11px;color:#9ca3af">最多5个</span>
        </div>
      </div>
      <div v-if="scope === 'leai'" style="font-size:12px;color:#6b7280;margin-bottom:14px">联想乐享看板仅展示品牌表现，不提供竞品对比。</div>

      <!-- 4 KPI -->
      <div class="geo-kpi-grid cols-4" style="margin-bottom:16px">
        <div
          v-for="kpi in kpiCards" :key="kpi.metric"
          class="geo-kpi"
          :class="{ highlight: selectedKpi === kpi.metric }"
          style="cursor:pointer"
          @click="selectKpi(kpi.metric)"
        >
          <div class="gk-tip" :title="kpi.tip">?</div>
          <div class="gk-val">{{ kpiValues[kpi.metric]?.brand ?? '--' }}</div>
          <div class="gk-label">{{ kpi.label }}</div>
          <div v-if="compareMode === 'compare' && selectedCompetitors.length" class="gk-sub" style="margin-top:6px">
            <div style="font-size:10px;color:#6b7280">竞品综合 {{ kpiValues[kpi.metric]?.comp ?? PENDING }}</div>
          </div>
        </div>
      </div>

      <!-- 趋势折线图 -->
      <div class="geo-row geo-compare-trend-row single" style="margin-bottom:12px">
        <div class="geo-panel" style="flex:2;min-width:0">
          <div style="margin-bottom:8px">
            <div class="gpnl-title">{{ scope === 'all' ? '可见性趋势' : scopeLabel + '可见性趋势' }}</div>
          </div>
          <div id="geo-trend-legend-vue" style="display:flex;align-items:center;gap:16px;margin-bottom:8px;font-size:11px;color:#6b7280;flex-wrap:wrap">
            <span v-for="(s, i) in trendSeries" :key="i">
              <span :style="'display:inline-block;width:20px;height:3px;background:'+trendColors[i]+';border-radius:2px;vertical-align:middle;margin-right:4px'"></span>
              {{ s.field_name }}
            </span>
          </div>
          <div style="position:relative">
            <canvas ref="trendCanvas" width="800" height="280" style="width:100%;height:280px;cursor:crosshair"></canvas>
            <div ref="trendTooltip" style="display:none;position:fixed;background:rgba(0,0,0,.85);color:#fff;padding:8px 12px;border-radius:6px;font-size:11px;pointer-events:none;z-index:100;line-height:1.6"></div>
          </div>
        </div>
      </div>

      <!-- 信源分布 Treemap + 排行榜 -->
      <div class="geo-row">
        <div class="geo-panel">
          <div class="gpnl-title">信源分布图</div>
          <div class="geo-interface-note">接口说明：官网/乐享品牌词信源口径需服务商按品牌词返回；当前接口未明确区分品牌词时，本模块展示的是当前接口结果，不代表官网/乐享专属信源数据。</div>
          <div style="min-height:260px" v-html="treemapHtml || pendingHtml()"></div>
        </div>
        <div class="geo-panel">
          <div class="gpnl-title">信源排行榜 Top20</div>
          <div class="geo-interface-note">接口说明：选择 AI 平台后按平台请求；品牌词口径如接口未返回，则展示当前接口结果，不代表官网/乐享专属排行。</div>
          <div class="geo-scroll-wrap" style="max-height:320px" v-html="siteRankHtml || pendingHtml()"></div>
        </div>
      </div>

      <!-- 各平台引用次数 + Top50 -->
      <div class="geo-row wide-right">
        <div class="geo-panel">
          <div class="gpnl-title">各 AI 平台引用次数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 联想链接 + 各 wiki 页面</span></div>
          <div class="geo-kpi-grid cols-3" style="margin-bottom:12px">
            <div class="geo-kpi" v-for="c in citationKpis" :key="c.key">
              <div class="gk-val">{{ citationValues[c.key] ?? '--' }}</div>
              <div class="gk-label">{{ c.label }}</div>
            </div>
          </div>
          <div class="geo-interface-note">接口缺口：官网/乐享品牌词引用口径、wiki-商城、wiki-消费、wiki-SMB、wiki-政企引用次数需服务商返回；未返回时显示待接口提供数据或当前接口结果。</div>
          <div class="geo-plat-grid" v-html="platDistHtml || pendingHtml('加载中...')"></div>
        </div>
        <div class="geo-panel">
          <div class="gpnl-title">联想域名 AI 引用 Top50 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 共 <strong>{{ sitesTotal ?? '--' }}</strong> 个联想站点</span></div>
          <div class="geo-scroll-wrap" style="max-height:380px;overflow-y:auto" v-html="linkTop50Html || pendingHtml('加载中...')"></div>
        </div>
      </div>

      <!-- 联想官网引用 URL Top10（source-top10，生产在线功能） -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div class="gpnl-title">联想官网引用 URL Top10 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 固定项目143，05-01累计</span></div>
        <div v-html="sourceTop10Html || pendingHtml('加载中...')"></div>
      </div>

      <!-- 各优化平台意图总数 -->
      <div class="geo-panel" style="margin-bottom:12px">
        <div class="gpnl-title">各优化平台意图总数 <span style="font-size:11px;color:#9ca3af;font-weight:400">· 每平台覆盖意图数量</span></div>
        <div class="geo-interface-note">接口说明：稳定覆盖意图及官网/乐享品牌词意图总数需服务商按平台返回；当前为前端基于现有字段推导。</div>
        <div v-html="intentPlatSummaryHtml || pendingHtml('加载中...')"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// ===== 常量 =====
const GEO_PROJECT_ID = 143
const GEO_PLATFORMS = ['doubao','deepseek','yuanbao','kimi']
const PENDING = '待接口提供数据'
const geoPlatNames = { doubao:'豆包', deepseek:'DeepSeek', yuanbao:'元宝', kimi:'Kimi' }
const geoPlatColors = { doubao:'#3f78c5', deepseek:'#3f9ead', yuanbao:'#58a86a', kimi:'#c89532' }
const GEO_COMPETITOR_COLORS = { hp:'#3f78c5', dell:'#3f9ead', huawei:'#9070c3', apple:'#4f6578', asus:'#78a9e6', xiaomi:'#c89532', acer:'#58a86a', honor:'#b45f86' }
const GEO_COMPETITOR_NAMES = { hp:'惠普', dell:'戴尔', huawei:'华为', apple:'苹果', asus:'华硕', xiaomi:'小米', acer:'宏碁', honor:'荣耀' }
const GEO_TREEMAP_COLORS = ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#b45f86','#6f879e','#4f6578','#78a9e6','#6fc2cf','#78c487','#e0b75b','#b795df','#d383a8','#9bb0c5','#7f96aa']
const GEO_SCOPE_CONFIG = {
  all:      { label:'整体',     requestBrand: null,       brandLabel:'联想品牌', trendField:'all' },
  official: { label:'联想官网', requestBrand:'联想官网',  brandLabel:'联想官网', trendField:'brand_composite_exposure_rate' },
  leai:     { label:'联想乐享', requestBrand:'联想乐享',  brandLabel:'联想乐享', trendField:'brand_precise_exposure_rate' },
}

const scopeList = [
  { key:'all', label:'整体' },
  { key:'official', label:'联想官网' },
  { key:'leai', label:'联想乐享' },
]
const platformList = [
  { key:'all', label:'全平台' },
  { key:'doubao', label:'豆包' },
  { key:'deepseek', label:'DeepSeek' },
  { key:'yuanbao', label:'元宝' },
  { key:'kimi', label:'Kimi' },
]
const periodList = [
  { key:'7d', label:'近7天' },
  { key:'30d', label:'近30天' },
]
const compareModes = [
  { key:'brand', label:'品牌表现' },
  { key:'compare', label:'竞品对比' },
]
const competitorList = Object.entries(GEO_COMPETITOR_NAMES).map(([key, label]) => ({ key, label }))

const kpiCards = [
  { metric:'visible', label:'品牌可见度', tip:'AI 答案中提及目标品牌的问题数占比，衡量品牌基础曝光能力' },
  { metric:'rec',     label:'品牌推荐率', tip:'AI 答案中推荐目标品牌/产品的次数占比' },
  { metric:'top1',    label:'品牌推荐置顶率', tip:'AI 答案中目标品牌/产品出现在推荐首位（置顶）的次数占比' },
  { metric:'top3',    label:'品牌推荐前三率', tip:'AI 答案中目标品牌/产品出现在推荐列表前 3 位的次数占比' },
]
const citationKpis = [
  { key:'link', label:'联想链接引用次数' },
  { key:'wiki', label:'联想wiki引用次数' },
  { key:'shop', label:'联想wiki-商城引用次数' },
  { key:'consumer', label:'联想wiki-消费引用次数' },
  { key:'smb',  label:'联想wiki-SMB引用次数' },
  { key:'biz',  label:'联想wiki-政企引用次数' },
]

// ===== 状态 =====
const scope = ref('all')
const platform = ref('all')
const period = ref('30d')
const dateStart = ref('')
const dateEnd = ref('')
const compareMode = ref('brand')
const selectedCompetitors = ref([])
const selectedKpi = ref('visible')
const selectedQuestion = ref('')
const compLimitMsg = ref('')

const statusText = ref('加载中...')
const stableIntents = ref([])

const kpiValues = ref({ visible:{brand:null,comp:null}, rec:{brand:null,comp:null}, top1:{brand:null,comp:null}, top3:{brand:null,comp:null} })
const citationValues = ref({ link:null, wiki:null, shop:null, consumer:null, smb:null, biz:null })
const sitesTotal = ref(null)

const trendSeries = ref([])
const trendColors = ref([])

const treemapHtml = ref('')
const siteRankHtml = ref('')
const linkTop50Html = ref('')
const platDistHtml = ref('')
const intentPlatSummaryHtml = ref('')
const sourceTop10Html = ref('')

const trendCanvas = ref(null)
const trendTooltip = ref(null)

let _trendChartData = null
let _apiData = null
let _platData = {}
let _wikiHistoryData = null
let _questionsData = []
let _loadSeq = 0

// ===== computed =====
const scopeConfig = computed(() => GEO_SCOPE_CONFIG[scope.value] || GEO_SCOPE_CONFIG.all)
const scopeLabel = computed(() => scopeConfig.value.label)
const contextLine = computed(() => {
  const platLabel = platform.value === 'all' ? '全平台' : (geoPlatNames[platform.value] || platform.value)
  const modeLabel = scope.value === 'leai' ? '品牌表现' : (compareMode.value === 'compare' ? '竞品对比' : '品牌表现')
  const dateLabel = dateStart.value && dateEnd.value ? `${dateStart.value} ~ ${dateEnd.value}` : (period.value || '30d')
  const scopeWord = scope.value === 'all' ? '联想品牌词' : `${scopeLabel.value}品牌词`
  return `当前口径：${scopeWord} · ${platLabel} · ${dateLabel} · ${modeLabel}`
})

// ===== 工具函数 =====
function geoFmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function resolveDateRange() {
  if (dateStart.value && dateEnd.value) return { start_date: dateStart.value, end_date: dateEnd.value }
  const days = period.value === '7d' ? 7 : 30
  const end = new Date(); end.setDate(end.getDate() - 1)
  const start = new Date(end.getTime() - (days - 1) * 86400000)
  return { start_date: geoFmtDate(start), end_date: geoFmtDate(end) }
}
function initDatePicker() {
  if (dateStart.value && dateEnd.value) return
  const range = resolveDateRange()
  dateStart.value = range.start_date
  dateEnd.value = range.end_date
}
function geoNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function geoFmtPct(v) {
  const n = geoNum(v)
  return n === null ? PENDING : n.toFixed(2) + '%'
}
function geoFmtCount(v) {
  const n = geoNum(v)
  return n === null ? PENDING : n.toLocaleString()
}
function pendingHtml(msg) {
  return `<div class="geo-pending"><div class="geo-pending-title">${msg || PENDING}</div></div>`
}
function geoEsc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function geoSiteName(s) { return s.site_name || s.name || s.domain || '-' }
function geoSiteLogoHtml(domain, name) {
  const d = String(domain||'').replace(/^https?:\/\//,'').split('/')[0]
  const fallback = geoEsc(String(name||d||'?').trim().slice(0,1).toUpperCase()||'?')
  if (!d) return `<span class="geo-site-logo fallback">${fallback}</span>`
  if (/lenovo\.(com|com\.cn|cn)$/i.test(d)||d.includes('.lenovo.')) return `<span class="geo-site-logo"><img src="assets/logo-icon.png" alt=""></span>`
  const url = `https://www.google.com/s2/favicons?sz=32&domain_url=https://${encodeURIComponent(d)}`
  return `<span class="geo-site-logo" data-fallback="${fallback}"><img src="${url}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('fallback');this.parentElement.textContent=this.parentElement.dataset.fallback||'?'"></span>`
}
function geoPickFirst(obj, keys) {
  for (const k of keys) { if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k] }
  return null
}
function geoCitationMetrics(row) {
  return {
    totalWiki: geoPickFirst(row, ['wiki_citation_count','total_wiki_citation_count']),
    link: geoPickFirst(row, ['lenovo_link_citation_count','lenovo_citation_count','official_citation_count']),
    wiki: geoPickFirst(row, ['lenovo_wiki_citation_count','wiki_citation_count']),
    shop: geoPickFirst(row, ['wiki_shop_citation_count','shop_wiki_citation_count','lenovo_wiki_shop_citation_count']),
    consumer: geoPickFirst(row, ['wiki_c_citation_count','consumer_wiki_citation_count','lenovo_wiki_c_citation_count']),
    smb: geoPickFirst(row, ['wiki_b_citation_count','smb_wiki_citation_count','lenovo_wiki_b_citation_count']),
    biz: geoPickFirst(row, ['wiki_biz_citation_count','biz_wiki_citation_count','lenovo_wiki_biz_citation_count'])
  }
}
function geoApiPayload(json) {
  if (!json || typeof json !== 'object') return {}
  const hasOverviewFields = json.brand_coverage_metrics || json.content_ecology_metrics || json.conversion_metrics
  return !hasOverviewFields && json.data && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : json
}
function getSelectedModels() {
  return platform.value && platform.value !== 'all' ? [platform.value] : []
}
function getRequestBrand() { return scopeConfig.value.requestBrand }
function getTrendField() { return scopeConfig.value.trendField }

// ===== API =====
async function geoPost(path, body) {
  const r = await fetch('/api/geo-dashboard/' + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) })
  return r.json()
}
function buildOverviewBody(models) {
  const body = { project_id: GEO_PROJECT_ID, ...resolveDateRange() }
  const m = models || getSelectedModels()
  if (m.length) body.models = m
  const brand = getRequestBrand()
  if (brand) body.brands = brand
  if (selectedQuestion.value) body.questions = [selectedQuestion.value]
  if (compareMode.value === 'compare') {
    const comps = selectedCompetitors.value.map(k => GEO_COMPETITOR_NAMES[k]).filter(Boolean)
    if (comps.length) body.competitors = comps
  }
  return body
}
function buildSitesBody(extra) {
  const sc = extra?._scope || scope.value
  const body = { project_id: GEO_PROJECT_ID, ...resolveDateRange(), ...extra }
  delete body._scope
  if (!body.model || body.model === 'all') delete body.model
  const brand = GEO_SCOPE_CONFIG[sc]?.requestBrand
  if (brand && !body.brands) body.brands = brand
  return body
}
function buildWikiHistoryBody(extra) {
  const body = { date: resolveDateRange().end_date, ...extra }
  if (extra?.models === undefined) {
    const m = getSelectedModels()
    if (m.length) body.models = m[0]
  }
  const brand = getRequestBrand()
  if (brand && !body.brands) body.brands = brand
  return body
}

// ===== 渲染函数 =====
function renderTreemap(sites) {
  const top = sites.slice(0, 20)
  const totalPct = top.reduce((s,x) => s + (geoNum(x.percentage)||0), 0)
  if (!top.length) return pendingHtml()
  return '<div class="geo-treemap">' + top.map((s,i) => {
    const bg = GEO_TREEMAP_COLORS[i % GEO_TREEMAP_COLORS.length]
    const pct = geoNum(s.percentage) || 0
    const flex = Math.max(totalPct ? pct/totalPct*100 : 3, 3)
    return `<div class="gtm-cell" style="flex:${flex};background:${bg};min-width:60px;min-height:50px" title="${geoEsc(s.domain)} · ${geoFmtCount(s.count)}次 · ${pct}%"><span class="gtm-name">${geoEsc(geoSiteName(s))}</span><span class="gtm-pct">${pct}%</span></div>`
  }).join('') + '</div>'
}

function renderSiteRank(sites) {
  const top = sites.slice(0, 20)
  if (!top.length) return pendingHtml()
  return '<ol class="geo-rank-list">' + top.map(s =>
    `<li><span class="grl-idx">${s.rank}</span>${geoSiteLogoHtml(s.domain,geoSiteName(s))}<span class="grl-name" title="${geoEsc(s.domain)}">${geoEsc(geoSiteName(s))}</span><span class="grl-count">${geoFmtCount(s.count)} · ${geoNum(s.percentage)??0}%</span></li>`
  ).join('') + '</ol>'
}

function renderLinkTop50(sites) {
  const top = (sites||[]).slice(0,50).map((s,i) => ({...s, rank:i+1}))
  if (!top.length) return pendingHtml()
  const maxCount = Math.max(...top.map(s => s.count), 1)
  return '<ol class="geo-rank-list" style="margin:0;padding:0">' + top.map(s => {
    const barW = Math.max((s.count/maxCount*100),2).toFixed(0)
    const isTop3 = s.rank <= 3
    const idxStyle = isTop3 ? 'min-width:28px;height:28px;line-height:28px;text-align:center;font-size:13px;font-weight:700;color:#fff;background:#3f78c5;border-radius:50%;flex-shrink:0' : 'min-width:28px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;flex-shrink:0'
    const countStyle = isTop3 ? 'font-size:14px;font-weight:700;color:#1d4ed8;white-space:nowrap;min-width:90px;text-align:right' : 'font-size:11px;color:#6b7280;white-space:nowrap;min-width:80px;text-align:right'
    return `<li style="display:flex;align-items:center;gap:8px;padding:${isTop3?'8px':'6px'} 8px;border-bottom:1px solid #f3f4f6;${isTop3?'background:#f0f7ff;':''}">
      <span style="${idxStyle}">${s.rank}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">${geoSiteLogoHtml(s.domain,geoSiteName(s))}<span style="font-size:${isTop3?'14px':'13px'};font-weight:${isTop3?'600':'500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${geoEsc(geoSiteName(s))}</span><a href="https://${geoEsc(s.domain)}" target="_blank" rel="noopener" style="font-size:11px;color:#3f78c5;white-space:nowrap;text-decoration:none;flex-shrink:0" title="${geoEsc(s.domain)}">${geoEsc(s.domain)}</a></div>
        <div style="height:${isTop3?'6px':'4px'};background:#e5e8ec;border-radius:3px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${isTop3?'#3f78c5':'#9fc4ea'};border-radius:3px"></div></div>
      </div>
      <span style="${countStyle}">${geoFmtCount(s.count)}</span>
    </li>`
  }).join('') + '</ol>'
}

function renderPlatDist(platData, wikiHistoryData) {
  const cit = wikiHistoryData || {}
  const modelCitationMap = {}
  const modelCountsMap = {}
  ;(cit.model_counts||[]).forEach(mc => {
    const metrics = geoCitationMetrics(mc)
    modelCitationMap[mc.model] = metrics
    const total = geoPickFirst(mc, ['wiki_citation_count','total_count','citation_count'])
    const wiki = geoNum(metrics.totalWiki ?? metrics.wiki)
    const link = geoNum(metrics.link)
    const totalNum = geoNum(total)
    if (totalNum !== null) modelCountsMap[mc.model] = totalNum
    else if (wiki !== null || link !== null) modelCountsMap[mc.model] = (wiki||0)+(link||0)
  })
  return GEO_PLATFORMS.map(p => {
    const d = platData[p]
    if (!d) return `<div class="geo-plat-card"><div class="gpc-name">${geoPlatNames[p]||p}</div><span class="geo-pending-inline">${PENDING}</span></div>`
    const cites = modelCountsMap[p] ?? null
    const m = modelCitationMap[p] || {}
    return `<div class="geo-plat-card">
      <div class="gpc-name">${geoPlatNames[p]||p}</div>
      <div class="gpc-row"><span>wiki总引用</span><span class="gpc-val ${cites===null?'is-pending':''}">${geoFmtCount(cites)}</span></div>
      <div class="gpc-row"><span>联想链接</span><span class="gpc-val is-pending">${PENDING}</span></div>
      <div class="gpc-row"><span>联想wiki</span><span class="gpc-val ${geoNum(m.wiki)===null?'is-pending':''}">${geoFmtCount(m.wiki)}</span></div>
      <div class="gpc-row"><span>wiki-商城</span><span class="gpc-val ${geoNum(m.shop)===null?'is-pending':''}">${geoFmtCount(m.shop)}</span></div>
      <div class="gpc-row"><span>wiki-消费</span><span class="gpc-val ${geoNum(m.consumer)===null?'is-pending':''}">${geoFmtCount(m.consumer)}</span></div>
      <div class="gpc-row"><span>wiki-SMB</span><span class="gpc-val ${geoNum(m.smb)===null?'is-pending':''}">${geoFmtCount(m.smb)}</span></div>
      <div class="gpc-row"><span>wiki-政企</span><span class="gpc-val ${geoNum(m.biz)===null?'is-pending':''}">${geoFmtCount(m.biz)}</span></div>
    </div>`
  }).join('')
}

function renderIntentPlatSummary(qs) {
  if (!qs.length) return pendingHtml()
  const allModels = (qs[0].models||[]).map(m => m.model)
  function hasVis(q, fieldKey, mods) {
    return mods.some(m => {
      const md = (q.models||[]).find(x => x.model === m)
      const off = (md?.fields||[]).find(x => x.field==='brand_composite_exposure_rate')?.value
      const lea = (md?.fields||[]).find(x => x.field==='brand_precise_exposure_rate')?.value
      if (fieldKey==='official_visibility') return off === '是'
      if (fieldKey==='leai_visibility') return lea === '是'
      if (fieldKey==='lenovo_brand_visibility') return off === '是' || lea === '是'
      return false
    })
  }
  const scopeKey = scope.value==='official' ? 'official_visibility' : scope.value==='leai' ? 'leai_visibility' : 'lenovo_brand_visibility'
  const totalCount = qs.filter(q => hasVis(q, scopeKey, allModels)).length
  if (!totalCount) return pendingHtml()
  let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:8px 0">'
  html += `<div style="flex:1;min-width:140px;padding:16px;background:#f0f7ff;border-radius:10px;text-align:center;border:1px solid #dbeafe"><div style="font-size:28px;font-weight:700;color:#1e40af">${totalCount}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">优化意图总数</div></div>`
  allModels.forEach(m => {
    const count = qs.filter(q => hasVis(q, scopeKey, [m])).length
    const color = geoPlatColors[m] || '#6b7280'
    html += `<div style="flex:1;min-width:140px;padding:16px;background:#fff;border-radius:10px;text-align:center;border:1px solid #e5e8ec"><div style="font-size:28px;font-weight:700;color:${color}">${count}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">${geoPlatNames[m]||m} 覆盖意图数</div></div>`
  })
  html += '</div>'
  return html
}

// ===== source-top10（官网引用 URL Top10，生产在线） =====
async function loadSourceTop10(seq) {
  try {
    const date = resolveDateRange().end_date
    const json = await geoPost('source-top10', { date })
    if (seq !== _loadSeq) return
    if (json.code !== 200 || !json.data?.top_urls?.length) { sourceTop10Html.value = pendingHtml('暂无数据'); return }
    const urls = json.data.top_urls
    const maxCount = Math.max(...urls.map(u => u.citation_count), 1)
    sourceTop10Html.value = '<ol class="geo-rank-list" style="margin:0;padding:0">' + urls.map(u => {
      const isTop3 = u.rank <= 3
      const barW = Math.max((u.citation_count/maxCount*100),2).toFixed(0)
      const idxStyle = isTop3 ? 'min-width:28px;height:28px;line-height:28px;text-align:center;font-size:13px;font-weight:700;color:#fff;background:#3f78c5;border-radius:50%;flex-shrink:0' : 'min-width:28px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;flex-shrink:0'
      const countStyle = isTop3 ? 'font-size:14px;font-weight:700;color:#1d4ed8;white-space:nowrap;min-width:90px;text-align:right' : 'font-size:11px;color:#6b7280;white-space:nowrap;min-width:80px;text-align:right'
      return `<li style="display:flex;align-items:center;gap:8px;padding:${isTop3?'8px':'6px'} 8px;border-bottom:1px solid #f3f4f6;${isTop3?'background:#f0f7ff;':''}">
        <span style="${idxStyle}">${u.rank}</span>
        <div style="flex:1;min-width:0">
          <a href="${geoEsc(u.url)}" target="_blank" rel="noopener" style="display:block;font-size:${isTop3?'13px':'12px'};font-weight:${isTop3?'600':'400'};color:#3f78c5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none" title="${geoEsc(u.url)}">${geoEsc(u.url)}</a>
          <div style="height:${isTop3?'6px':'4px'};background:#e5e8ec;border-radius:3px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${barW}%;background:${isTop3?'#3f78c5':'#9fc4ea'};border-radius:3px"></div></div>
        </div>
        <span style="${countStyle}">${geoFmtCount(u.citation_count)}</span>
      </li>`
    }).join('') + '</ol>'
  } catch(e) {
    if (seq !== _loadSeq) return
    sourceTop10Html.value = pendingHtml('暂无数据')
    console.error('source-top10', e)
  }
}

// ===== 趋势图 =====
function drawTrendCanvas() {
  const canvas = trendCanvas.value
  if (!canvas || !_trendChartData) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const W = rect.width || 800, H = rect.height || 280
  canvas.width = W*dpr; canvas.height = H*dpr
  ctx.setTransform(dpr,0,0,dpr,0,0)
  const pad = { top:20, right:20, bottom:40, left:45 }
  const plotW = W - pad.left - pad.right, plotH = H - pad.top - pad.bottom
  ctx.clearRect(0,0,W,H)
  const dates = _trendChartData.dates || []
  const series = _trendChartData.series || []
  if (!dates.length || !series.length) return
  const denom = Math.max(dates.length-1,1)
  const allVals = series.flatMap(s => s.data)
  const maxV = Math.max(...allVals,1), minV = Math.min(...allVals,0)
  const range = maxV-minV||1, yPad = range*0.1
  const yMin = Math.max(0,minV-yPad), yMax = maxV+yPad, yRange = yMax-yMin||1
  ctx.strokeStyle='#e5e8ec'; ctx.lineWidth=0.5; ctx.fillStyle='#9ca3af'; ctx.font='10px sans-serif'; ctx.textAlign='right'
  for (let i=0;i<=5;i++) {
    const v = yMin+(yRange/5)*i, y = pad.top+plotH-(v-yMin)/yRange*plotH
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke()
    ctx.fillText(Math.round(v), pad.left-6, y+3)
  }
  ctx.textAlign='center'; ctx.fillStyle='#9ca3af'
  const step = Math.max(1, Math.floor(dates.length/8))
  dates.forEach((d,i) => { if (i%step===0||i===dates.length-1) { const x=pad.left+(i/denom)*plotW; ctx.fillText(d,x,H-pad.bottom+18) } })
  const fieldColor = { all:'#9070c3', brand_composite_exposure_rate:'#3f78c5', brand_precise_exposure_rate:'#58a86a', competitor_exposure_rate:'#c89532' }
  const fallback = ['#3f78c5','#58a86a','#6f879e','#9070c3']
  const colors = series.map((s,si) => s.color||fieldColor[s.field]||fallback[si]||'#6b7280')
  trendSeries.value = series
  trendColors.value = colors
  series.forEach((s,si) => {
    const color = colors[si]
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.beginPath()
    s.data.forEach((v,i) => { const x=pad.left+(i/denom)*plotW, y=pad.top+plotH-(v-yMin)/yRange*plotH; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
    ctx.stroke()
    s.data.forEach((v,i) => { const x=pad.left+(i/denom)*plotW, y=pad.top+plotH-(v-yMin)/yRange*plotH; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill() })
  })
  canvas.onmousemove = (e) => {
    const bRect = canvas.getBoundingClientRect()
    const mx = e.clientX - bRect.left
    const idx = Math.round((mx-pad.left)/plotW*denom)
    const tip = trendTooltip.value
    if (!tip) return
    if (idx<0||idx>=dates.length) { tip.style.display='none'; return }
    let html = `<div style="font-weight:600;margin-bottom:4px">${dates[idx]}</div>`
    series.forEach((s,si) => { html += `<div><span style="color:${colors[si]||'#6b7280'}">●</span> ${s.field_name}: ${s.data[idx]}</div>` })
    tip.innerHTML = html; tip.style.display='block'; tip.style.left=(e.pageX+12)+'px'; tip.style.top=(e.pageY-10)+'px'
  }
  canvas.onmouseleave = () => { if (trendTooltip.value) trendTooltip.value.style.display='none' }
}

async function loadTrendChart(seq) {
  const body = { project_id: GEO_PROJECT_ID, ...resolveDateRange() }
  const brand = getRequestBrand()
  if (brand) body.brands = brand
  const m = getSelectedModels()
  if (m.length === 1) body.model = m[0]
  if (compareMode.value === 'compare') {
    const comps = selectedCompetitors.value.map(k => GEO_COMPETITOR_NAMES[k]).filter(Boolean)
    if (comps.length) body.competitors = comps
  }
  try {
    const resp = await fetch('/api/geo-dashboard/summary', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const json = await resp.json()
    if (seq !== _loadSeq) return
    if (json.code !== 200 || !json.data) { _trendChartData = null; return }
    const d = json.data
    const xs = d.x_axis || []
    const dates = xs.map(x => x.label||x.date)
    const fieldLabels = { all:'整体可见性', brand_composite_exposure_rate:'联想官网可见性', brand_precise_exposure_rate:'联想乐享可见性', competitor_exposure_rate:'竞品可见性' }
    let wanted
    if (scope.value==='all') wanted = new Set(['all','brand_composite_exposure_rate','brand_precise_exposure_rate','competitor_exposure_rate'])
    else if (scope.value==='official') wanted = new Set(['brand_composite_exposure_rate'])
    else wanted = new Set(['brand_precise_exposure_rate'])
    const series = (d.series||[]).filter(s => wanted.has(s.field)).map(s => {
      const valMap = {}; (s.values||[]).forEach(v => { valMap[v.date]=v.value })
      return { field:s.field, field_name:fieldLabels[s.field]||s.field_name||s.field, data:xs.map(x => Number(valMap[x.date]??0)) }
    })
    if (!dates.length || !series.length) { _trendChartData = null; return }
    _trendChartData = { dates, series }
    drawTrendCanvas()
  } catch(e) { if (seq!==_loadSeq) return; _trendChartData = null; console.error('trend', e) }
}

// ===== 主加载 =====
async function loadData() {
  _loadSeq++
  const seq = _loadSeq
  initDatePicker()
  statusText.value = '加载中...'
  const models = getSelectedModels()
  try {
    const data = await geoPost('overview', buildOverviewBody(models))
    if (seq !== _loadSeq) return
    if (data.code !== 200) throw new Error(data.message || '请求失败')
    const payload = geoApiPayload(data)
    _apiData = payload
    const bcm = payload.brand_coverage_metrics || {}
    const cm = payload.conversion_metrics || {}
    kpiValues.value = {
      visible: { brand: geoFmtPct(bcm.brand_exposure_rate), comp: geoFmtPct(bcm.competitor_exposure_rate) },
      rec:     { brand: geoFmtPct(cm.brand_priority_rate),  comp: geoFmtPct(cm.competitor_priority_rate) },
      top1:    { brand: geoFmtPct(cm.brand_top1_rate),       comp: geoFmtPct(cm.competitor_top1_rate) },
      top3:    { brand: geoFmtPct(cm.brand_top3_rate),       comp: geoFmtPct(cm.competitor_top3_rate) },
    }
    statusText.value = '更新于 ' + new Date().toLocaleTimeString() + ' · 点亮AI · ' + scopeLabel.value + ' · ' + (dateStart.value ? `${dateStart.value} ~ ${dateEnd.value}` : (period.value||'30d'))

    // 并发其余请求
    Promise.all(GEO_PLATFORMS.map(p => geoPost('overview', buildOverviewBody([p])).catch(() => null))).then(results => {
      if (seq !== _loadSeq) return
      GEO_PLATFORMS.forEach((p,i) => { if (results[i]?.code===200) _platData[p] = geoApiPayload(results[i]) })
    })

    geoPost('wiki-history', buildWikiHistoryBody({})).then(r => {
      if (seq !== _loadSeq) return
      _wikiHistoryData = r.code === 200 ? r.data : null
      const cem = r.code === 200 ? (r.data || {}) : {}
      const metrics = geoCitationMetrics(cem)
      citationValues.value = { link:geoFmtCount(metrics.link), wiki:geoFmtCount(metrics.wiki), shop:geoFmtCount(metrics.shop), consumer:geoFmtCount(metrics.consumer), smb:geoFmtCount(metrics.smb), biz:geoFmtCount(metrics.biz) }
    }).catch(() => {})

    loadSites(seq)
    loadTrendChart(seq)
    loadSourceTop10(seq)

    geoPost('stable-intents', { project_id: GEO_PROJECT_ID, ...resolveDateRange() }).then(r => {
      if (seq !== _loadSeq) return
      stableIntents.value = r.code === 200 && Array.isArray(r.data) ? r.data : []
    }).catch(() => {})

    geoPost('questions', { project_id: GEO_PROJECT_ID, date: resolveDateRange().end_date }).then(r => {
      if (seq !== _loadSeq) return
      _questionsData = r.code === 200 ? (r.data?.questions||[]) : []
      intentPlatSummaryHtml.value = renderIntentPlatSummary(_questionsData)
    }).catch(() => {})

  } catch(e) {
    if (seq !== _loadSeq) return
    statusText.value = '加载失败：' + e.message
    console.error('GEO loadData', e)
  }
}

async function loadSites(seq) {
  try {
    const body = buildSitesBody({})
    const resp = await fetch('/api/geo-dashboard/sites', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const json = await resp.json()
    if (seq !== _loadSeq) return
    if (json.code !== 200) return
    const sites = json.data?.sites || []
    treemapHtml.value = renderTreemap(sites)
    siteRankHtml.value = renderSiteRank(sites)
    // lenovo top50
    let lenovoSites = sites.filter(s => s.domain&&s.domain.includes('lenovo'))
    let lenovoTotal = null
    try {
      const lj = await geoPost('sites', {...body, lenovo_top50:true})
      if (seq !== _loadSeq) return
      if (lj.code===200 && lj.data?.sites) { lenovoSites=lj.data.sites; lenovoTotal=geoNum(lj.data.total_records) }
    } catch(e) {}
    linkTop50Html.value = renderLinkTop50(lenovoSites)
    sitesTotal.value = lenovoTotal ?? (lenovoSites.length||null)
    // plat dist
    const wikiBody = buildWikiHistoryBody({})
    const wikiR = await geoPost('wiki-history', wikiBody)
    if (seq !== _loadSeq) return
    _wikiHistoryData = wikiR.code===200 ? wikiR.data : null
    platDistHtml.value = renderPlatDist(_platData, _wikiHistoryData)
  } catch(e) { if (seq!==_loadSeq) return; console.error('loadSites', e) }
}

// ===== 交互 =====
function setScope(s) {
  scope.value = s
  selectedQuestion.value = ''
  platform.value = 'all'
  if (s === 'leai') { compareMode.value = 'brand'; selectedCompetitors.value = [] }
  loadData()
}
function togglePlatform(p) {
  platform.value = p
  selectedQuestion.value = ''
  loadData()
}
function quickPeriod(p) {
  period.value = p; dateStart.value = ''; dateEnd.value = ''
  loadData()
}
function onDateChange() {
  if (dateStart.value && dateEnd.value) { period.value = null; loadData() }
}
function onQuestionChange() { loadData() }
function setCompareMode(m) { compareMode.value = m; if (m==='brand') selectedCompetitors.value=[]; loadData() }
function selectKpi(metric) { selectedKpi.value = metric }
function toggleCompetitor(key) {
  const idx = selectedCompetitors.value.indexOf(key)
  if (idx >= 0) { selectedCompetitors.value.splice(idx,1); compLimitMsg.value='' }
  else if (selectedCompetitors.value.length >= 5) {
    compLimitMsg.value = '最多选择 5 个竞品，请先取消一个'
    setTimeout(() => { compLimitMsg.value = '' }, 1800)
  } else { selectedCompetitors.value.push(key) }
  loadData()
}
function compPillStyle(key) {
  const active = selectedCompetitors.value.includes(key)
  const color = GEO_COMPETITOR_COLORS[key] || '#6b7280'
  return active ? `background:${color};color:#fff;border-color:${color}` : 'background:#fff;color:#374151;border-color:#d1d5db'
}

onMounted(() => {
  initDatePicker()
  loadData()
})
</script>
