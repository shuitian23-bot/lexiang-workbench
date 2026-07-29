<template>
  <div class="pipeline-annotate-native">
    <div class="page-header">
      <div><div class="page-title">Query 分析</div>
        <div class="page-desc">智能体交互数据深度分析</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">FROM</span>
          <input type="date" id="dateFrom" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center" @change="applyDateFilter">
        </div>
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">TO</span>
          <input type="date" id="dateTo" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center" @change="applyDateFilter">
        </div>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" type="button" @click="applyDateFilter">筛选</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" type="button" @click="clearDateFilter">清除</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" type="button" title="刷新" @click="refreshDashboard">&#8635;</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" type="button" title="下载Excel" @click="downloadExcel">&#8595;</button>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" type="button" @click="uploadInput?.click()">上传</button>
      </div>
    </div>
    <input
      ref="uploadInput" type="file" id="anno-upload" accept=".xlsx,.xls,.csv" style="display:none"
      @change="pipelineAnnotate"
    >

    <div class="kpi-grid" style="grid-template-columns:repeat(8,1fr)">
      <div class="kpi-card"><div class="kpi-label">Query 总数</div><div class="kpi-value" style="color:var(--primary);font-size:20px" id="dk-total">--</div></div>
      <div class="kpi-card"><div class="kpi-label">昨日 Query</div><div class="kpi-value" style="color:var(--primary);font-size:20px" id="dk-yday">--</div></div>
      <div class="kpi-card"><div class="kpi-label">总用户数</div><div class="kpi-value" style="color:var(--orange);font-size:20px" id="dk-users">--</div></div>
      <div class="kpi-card"><div class="kpi-label">总对话数</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-sessions">--</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·客服</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-gcs">--</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·原生</div><div class="kpi-value" style="color:var(--green);font-size:20px" id="dk-gn">--</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·客服</div><div class="kpi-value" style="color:var(--red);font-size:20px" id="dk-bcs">--</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·原生</div><div class="kpi-value" style="color:var(--red);font-size:20px" id="dk-bn">--</div></div>
    </div>

    <div style="margin-top:16px">
      <div class="grid-2">
        <div class="card"><div class="card-header"><div class="card-title">一级分类·整体</div></div><div id="cTagAll" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">一级分类·主动语义</div></div><div id="cTagSem" style="height:300px"></div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">渠道分布</div></div><div id="cChannel" style="height:300px"></div></div>
        <div class="card"><div class="card-header">
          <div class="card-title">三级分类 TOP20</div>
          <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
            <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)" id="tag3-tab-active" @click="switchTag3Mode('active')">主动</span>
            <span style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="tag3-tab-nokouling" @click="switchTag3Mode('nokouling')">去口令</span>
          </div>
        </div><div id="cTag3" style="height:300px"></div></div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><div class="card-title">日度查询量趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span><input type="date" id="trendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span><input type="date" id="trendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" type="button" @click="applyTrendFilter('daily')">确定</button>
          </div>
        </div>
        <div id="cDaily" style="height:280px"></div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><div class="card-title">场景分布趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span><input type="date" id="tagTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span><input type="date" id="tagTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" type="button" @click="applyTrendFilter('tag')">确定</button>
          </div>
        </div>
        <div id="cTagTrend" style="height:280px"></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-header"><div class="card-title">主被动 Query 趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span><input type="date" id="apTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span><input type="date" id="apTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" type="button" @click="applyTrendFilter('ap')">确定</button>
            </div>
          </div>
          <div id="cApTrend" style="height:280px"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">主动场景变化趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span><input type="date" id="atTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span><input type="date" id="atTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" type="button" @click="applyTrendFilter('at')">确定</button>
            </div>
          </div>
          <div id="cAtTrend" style="height:280px"></div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">热门 Query TOP10</div>
            <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="hot-tab-all" @click="switchHotMode('all')">全部</span>
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)" id="hot-tab-active" @click="switchHotMode('active')">主动</span>
              <span style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)" id="hot-tab-passive" @click="switchHotMode('passive')">被动</span>
            </div>
          </div>
          <div style="overflow-y:auto;max-height:300px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr><th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:28px">#</th><th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)">Query</th><th style="text-align:right;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:60px">频次</th></tr></thead>
              <tbody id="hot-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">商品咨询 TOP20</div></div><div id="cProduct" style="height:300px"></div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">来源分布</div></div><div id="cSource" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">终端类型分布</div></div><div id="cMedium" style="height:300px"></div></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()
const uploadInput = ref(null)

const CHART_COLORS = {
  blue: '#3f78c5',
  blueMid: '#5b8def',
  blueSoft: '#9bbcff',
  green: '#58a86a',
  greenSoft: '#6ac69a',
  purple: '#7c5cff',
  purpleSoft: '#a996ff',
  slate: '#8da2bf',
  amber: '#d6a458',
  neutral: '#aeb8c8'
}
const TAG_COLORS = {
  电商: CHART_COLORS.blue,
  服务: CHART_COLORS.green,
  会员: CHART_COLORS.purple,
  门店: CHART_COLORS.blueMid,
  咨询: CHART_COLORS.greenSoft,
  其他: CHART_COLORS.slate,
  多模态: CHART_COLORS.blueSoft
}
const PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.blueMid,
  CHART_COLORS.greenSoft,
  CHART_COLORS.blueSoft,
  CHART_COLORS.slate,
  CHART_COLORS.amber,
  CHART_COLORS.neutral
]
const TAG_ORDER = ['电商', '服务', '会员', '门店', '咨询', '其他', '多模态']
const AP_COLOR = { 主动: CHART_COLORS.blue, 被动: CHART_COLORS.green, 口令活动: CHART_COLORS.purple }
const CHART_LEGEND = {
  bottom: 6,
  itemWidth: 18,
  itemHeight: 8,
  itemGap: 16,
  padding: [8, 0, 0, 0],
  textStyle: { color: '#646a73', fontSize: 10, lineHeight: 14 }
}

let availableDates = []
let dashCharts = {}
let dashRecords = []
let allRecords = []
let dateFrom = ''
let dateTo = ''
let trendFrom = ''
let trendTo = ''
let tagTrendFrom = ''
let tagTrendTo = ''
let apTrendFrom = ''
let apTrendTo = ''
let atTrendFrom = ''
let atTrendTo = ''
let autoRefreshTimer = null
let tag3Mode = 'active'
let hotMode = 'active'

onMounted(async () => {
  appStore.ensureStaticTab('pipeline.annotate')
  appStore.setActiveStaticTab('pipeline.annotate')
  document.title = '联想门户工作台'
  await nextTick()
  await ensureECharts()
  initDashboard()
  autoRefreshTimer = setInterval(refreshDashboard, 30000)
})

onBeforeUnmount(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  Object.values(dashCharts).forEach(chart => {
    try { chart.dispose() } catch {}
  })
  dashCharts = {}
})

function applyDateFilter() {
  const fromEl = document.getElementById('dateFrom')
  const toEl = document.getElementById('dateTo')
  if (fromEl) dateFrom = fromEl.value
  if (toEl) dateTo = toEl.value
  dashRecords = filteredRecords()
  if (dashRecords.length) {
    renderDashboardKPI(dashRecords)
    renderDashboardCharts(dashRecords)
  }
}

function clearDateFilter() {
  dateFrom = ''
  dateTo = ''
  const fromEl = document.getElementById('dateFrom')
  const toEl = document.getElementById('dateTo')
  if (fromEl) fromEl.value = ''
  if (toEl) toEl.value = ''
  dashRecords = allRecords
  if (dashRecords.length) {
    renderDashboardKPI(dashRecords)
    renderDashboardCharts(dashRecords)
  }
}

async function refreshDashboard() {
  try {
    const res = await fetch('/api/pipeline/stats/history')
    if (!res.ok) throw new Error('history unavailable')
    const data = await res.json()
    allRecords = (data.records || []).map(cleanRecordKeys)
  } catch {
    allRecords = buildFallbackRecords()
  }
  initDefaultDates()
  dashRecords = filteredRecords()
  if (!dashRecords.length) return
  renderDashboardKPI(dashRecords)
  renderDashboardCharts(dashRecords)
}

function downloadExcel() {
  let url = '/api/pipeline/download?'
  if (dateFrom) url += 'from=' + dateFrom + '&'
  if (dateTo) url += 'to=' + dateTo + '&'
  url += 'type=detail&'
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  link.click()
}

function applyTrendFilter(type) {
  if (type === 'tag') {
    tagTrendFrom = document.getElementById('tagTrendFrom')?.value || ''
    tagTrendTo = document.getElementById('tagTrendTo')?.value || ''
  } else if (type === 'ap') {
    apTrendFrom = document.getElementById('apTrendFrom')?.value || ''
    apTrendTo = document.getElementById('apTrendTo')?.value || ''
  } else if (type === 'at') {
    atTrendFrom = document.getElementById('atTrendFrom')?.value || ''
    atTrendTo = document.getElementById('atTrendTo')?.value || ''
  } else {
    trendFrom = document.getElementById('trendFrom')?.value || ''
    trendTo = document.getElementById('trendTo')?.value || ''
  }
  renderDashboardCharts(dashRecords)
}

function switchTag3Mode(mode) {
  tag3Mode = mode
  const active = document.getElementById('tag3-tab-active')
  const nokouling = document.getElementById('tag3-tab-nokouling')
  if (active) active.style.cssText = mode === 'active' ? activePillStyle('10px') : inactivePillStyle('10px')
  if (nokouling) nokouling.style.cssText = mode === 'nokouling' ? activePillStyle('10px') : inactivePillStyle('10px')
  renderTag3Current(mergedDashboardRecord(dashRecords))
}

function switchHotMode(mode) {
  hotMode = mode
  ;['all', 'active', 'passive'].forEach(item => {
    const el = document.getElementById('hot-tab-' + item)
    if (el) el.style.cssText = item === mode ? activePillStyle('8px') : inactivePillStyle('8px')
  })
  renderHotCurrent(mergedDashboardRecord(dashRecords))
}

function pipelineAnnotate(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  const suffix = file.name.split('.').pop()?.toLowerCase()
  if (!['csv', 'xlsx', 'xls'].includes(suffix)) {
    alert('不支持的文件格式：.' + suffix + '\n\n请上传 CSV (.csv) 或 Excel (.xlsx/.xls) 文件')
    return
  }
  appStore.notify('已接收标注文件：' + file.name)
  router.push('/hidden/pipeline/task')
}

function initDashboard() {
  const ids = ['cTagAll', 'cTagSem', 'cChannel', 'cTag3', 'cDaily', 'cTagTrend', 'cSource', 'cProduct', 'cMedium', 'cApTrend', 'cAtTrend']
  dashCharts = {}
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (el && window.echarts) dashCharts[id] = window.echarts.init(el)
  })
  window.addEventListener('resize', resizeCharts)
  refreshDashboard()
}

function resizeCharts() {
  Object.values(dashCharts).forEach(chart => {
    try { chart.resize() } catch {}
  })
}

function ensureECharts() {
  if (window.echarts) return Promise.resolve()
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}assets/echarts.min.js`
    script.onload = resolve
    script.onerror = resolve
    document.head.appendChild(script)
  })
}

function initDefaultDates() {
  if (!allRecords.length) return
  availableDates = [...new Set(allRecords.map(item => item.date).filter(Boolean))].sort()
  if (!availableDates.length) return
  const defDate = availableDates[availableDates.length - 1]
  const minDate = availableDates[0]
  const maxDate = availableDates[availableDates.length - 1]
  ;['dateFrom', 'dateTo', 'trendFrom', 'trendTo', 'tagTrendFrom', 'tagTrendTo', 'apTrendFrom', 'apTrendTo', 'atTrendFrom', 'atTrendTo'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.min = minDate
    el.max = maxDate
  })
  setInputValue('dateFrom', dateFrom || defDate)
  setInputValue('dateTo', dateTo || defDate)
  dateFrom = document.getElementById('dateFrom')?.value || ''
  dateTo = document.getElementById('dateTo')?.value || ''
  const trendDef = availableDates[Math.max(0, availableDates.length - 30)]
  ;[
    ['trendFrom', 'trendTo', 'trendFrom', 'trendTo'],
    ['tagTrendFrom', 'tagTrendTo', 'tagTrendFrom', 'tagTrendTo'],
    ['apTrendFrom', 'apTrendTo', 'apTrendFrom', 'apTrendTo'],
    ['atTrendFrom', 'atTrendTo', 'atTrendFrom', 'atTrendTo']
  ].forEach(([fromId, toId]) => {
    setInputValue(fromId, document.getElementById(fromId)?.value || trendDef)
    setInputValue(toId, document.getElementById(toId)?.value || defDate)
  })
  trendFrom = document.getElementById('trendFrom')?.value || ''
  trendTo = document.getElementById('trendTo')?.value || ''
  tagTrendFrom = document.getElementById('tagTrendFrom')?.value || ''
  tagTrendTo = document.getElementById('tagTrendTo')?.value || ''
  apTrendFrom = document.getElementById('apTrendFrom')?.value || ''
  apTrendTo = document.getElementById('apTrendTo')?.value || ''
  atTrendFrom = document.getElementById('atTrendFrom')?.value || ''
  atTrendTo = document.getElementById('atTrendTo')?.value || ''
}

function setInputValue(id, value) {
  const el = document.getElementById(id)
  if (el && !el.value) el.value = value
}

function filteredRecords() {
  let records = allRecords
  if (dateFrom) records = records.filter(item => item.date >= dateFrom)
  if (dateTo) records = records.filter(item => item.date <= dateTo)
  return records
}

function recordsInRange(from, to) {
  let records = allRecords
  if (from) records = records.filter(item => item.date >= from)
  if (to) records = records.filter(item => item.date <= to)
  return records
}

function cleanRecordKeys(record) {
  const tagKeys = ['tag_dist_all', 'tag_dist_active', 'tag_dist_semantic', 'channel_dist', 'source_dist', 'product_dist', 'medium_dist', 'turn_distribution']
  tagKeys.forEach(key => {
    const dist = record[key]
    if (!dist || typeof dist !== 'object') return
    const cleaned = {}
    Object.entries(dist).forEach(([name, value]) => {
      const cleanName = name.trim()
      cleaned[cleanName] = (cleaned[cleanName] || 0) + value
    })
    record[key] = cleaned
  })
  return record
}

function renderDashboardKPI(records) {
  const sumTotal = records.reduce((sum, item) => sum + (item.total || 0), 0)
  const sumUsers = records.reduce((sum, item) => sum + (item.total_users || 0), 0)
  const sumSessions = records.reduce((sum, item) => sum + (item.total_sessions || 0), 0)
  const rating = { good_cs: 0, good_native: 0, bad_cs: 0, bad_native: 0 }
  records.forEach(item => {
    const current = item.rating || {}
    Object.keys(rating).forEach(key => { rating[key] += current[key] || 0 })
  })
  setText('dk-total', fmtNum(sumTotal))
  setText('dk-yday', fmtNum(allRecords[allRecords.length - 1]?.total || 0))
  setText('dk-users', fmtNum(sumUsers))
  setText('dk-sessions', fmtNum(sumSessions))
  setText('dk-gcs', fmtNum(rating.good_cs))
  setText('dk-gn', fmtNum(rating.good_native))
  setText('dk-bcs', fmtNum(rating.bad_cs))
  setText('dk-bn', fmtNum(rating.bad_native))
}

function renderDashboardCharts(records) {
  const merged = mergedDashboardRecord(records)
  const theme = chartTheme()
  donutChart('cTagAll', merged.tag_dist_all, true, theme)
  donutChart('cTagSem', merged.tag_dist_semantic, true, theme)
  donutChannel('cChannel', merged.channel_dist, theme)
  renderTag3Current(merged)
  renderDailyVolume(recordsInRange(trendFrom, trendTo), theme)
  renderTagTrend(recordsInRange(tagTrendFrom, tagTrendTo), theme)
  renderApTrend(recordsInRange(apTrendFrom, apTrendTo), theme)
  renderAtTrend(recordsInRange(atTrendFrom, atTrendTo), theme)
  renderHotCurrent(merged)
  hbarChart('cSource', merged.source_dist, CHART_COLORS.purple, theme, 100)
  hbarChart('cProduct', merged.product_dist, CHART_COLORS.blueMid, theme, 100)
  hbarChart('cMedium', merged.medium_dist, CHART_COLORS.green, theme, 100)
}

function mergedDashboardRecord(records) {
  const merged = {
    tag_dist_all: {},
    tag_dist_semantic: {},
    channel_dist: {},
    source_dist: {},
    product_dist: {},
    medium_dist: {},
    tag3_dist_top20_semantic: {},
    tag3_dist_top20_no_kouling: {},
    hot_queries_top20: { all: [], active: [], passive: [] }
  }
  mergeDist(records, merged.tag_dist_all, 'tag_dist_all')
  mergeDist(records, merged.tag_dist_semantic, 'tag_dist_semantic')
  mergeDist(records, merged.channel_dist, 'channel_dist')
  mergeDist(records, merged.source_dist, 'source_dist')
  mergeDist(records, merged.product_dist, 'product_dist')
  mergeDist(records, merged.medium_dist, 'medium_dist')
  mergeDist(records, merged.tag3_dist_top20_semantic, 'tag3_dist_top20_semantic')
  mergeDist(records, merged.tag3_dist_top20_no_kouling, 'tag3_dist_top20_no_kouling')
  merged.hot_queries_top20 = mergeHotQueries(records)
  return merged
}

function mergeDist(records, target, key) {
  records.forEach(item => {
    Object.entries(item[key] || {}).forEach(([name, value]) => {
      const cleanName = name.trim()
      target[cleanName] = (target[cleanName] || 0) + value
    })
  })
}

function mergeHotQueries(records) {
  const maps = { all: {}, active: {}, passive: {} }
  records.forEach(item => {
    const hot = item.hot_queries_top20 || {}
    ;['all', 'active', 'passive'].forEach(mode => {
      ;(hot[mode] || []).forEach(row => {
        if (!row.query) return
        maps[mode][row.query] = (maps[mode][row.query] || 0) + row.count
      })
    })
  })
  return Object.fromEntries(Object.entries(maps).map(([mode, map]) => [
    mode,
    Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([query, count]) => ({ query, count }))
  ]))
}

function chartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#646a73' },
    legend: CHART_LEGEND,
    tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08)' }
  }
}

function donutChart(id, data, useTagColor, theme) {
  const chart = dashCharts[id]
  if (!chart) return
  const names = Object.keys(data || {})
  chart.setOption({
    ...theme,
    tooltip: { ...theme.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { ...CHART_LEGEND, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '44%'],
      padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: names.map((name, index) => ({ name, value: data[name], itemStyle: { color: useTagColor ? tagColor(name) : PALETTE[index % PALETTE.length] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\\n{d}%' }
    }]
  })
}

function donutChannel(id, data, theme) {
  donutChart(id, data, false, theme)
}

function hbarChart(id, data, color, theme, left) {
  const chart = dashCharts[id]
  if (!chart) return
  const sorted = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 20)
  const names = sorted.map(item => item[0]).reverse()
  const values = sorted.map(item => item[1]).reverse()
  chart.setOption({
    ...theme,
    tooltip: { ...theme.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: left || 170, right: 16, top: 4, bottom: 20 },
    xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'category', data: names, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#646a73', fontSize: 10, width: (left || 170) - 24, overflow: 'truncate' } },
    series: [{ type: 'bar', data: values, itemStyle: { color: barGradient(color), borderRadius: [0, 3, 3, 0] }, barWidth: '55%' }]
  })
}

function renderTag3Current(record) {
  const data = tag3Mode === 'nokouling' ? record.tag3_dist_top20_no_kouling : record.tag3_dist_top20_semantic
  hbarChart('cTag3', data, tag3Mode === 'nokouling' ? CHART_COLORS.green : CHART_COLORS.blue, chartTheme(), 170)
}

function renderDailyVolume(records, theme) {
  const chart = dashCharts.cDaily
  if (!chart) return
  const map = {}
  records.forEach(item => {
    Object.entries(item.daily_volume || {}).forEach(([day, value]) => {
      if (day !== '1970-01-01') map[day] = (map[day] || 0) + value
    })
  })
  const dates = Object.keys(map).sort()
  chart.setOption(lineOption(dates, [{ name: '查询量', data: dates.map(day => map[day]), color: CHART_COLORS.blue }], theme, false))
}

function renderApTrend(records, theme) {
  const chart = dashCharts.cApTrend
  if (!chart) return
  const map = {}
  records.forEach(item => {
    Object.entries(item.daily_active_passive || {}).forEach(([day, dist]) => {
      map[day] ||= { 主动: 0, 被动: 0, 口令活动: 0 }
      Object.keys(AP_COLOR).forEach(key => { map[day][key] += dist[key] || 0 })
    })
  })
  const dates = Object.keys(map).sort()
  chart.setOption(lineOption(dates, Object.keys(AP_COLOR).map(key => ({ name: key, data: dates.map(day => map[day][key]), color: AP_COLOR[key] })), theme, true))
}

function lineOption(dates, series, theme, legend) {
  return {
    ...theme,
    tooltip: { ...theme.tooltip, trigger: 'axis' },
    legend: legend ? { ...CHART_LEGEND, type: 'scroll' } : undefined,
    grid: { left: 64, right: 16, top: 16, bottom: legend ? 54 : 24 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: value => value >= 10000 ? (value / 10000).toFixed(0) + '万' : value } },
    series: series.map(item => ({
      name: item.name,
      type: 'line',
      data: item.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: item.color, width: 1.5 },
      itemStyle: { color: item.color, borderColor: '#fff', borderWidth: 1.5 },
      areaStyle: legend ? undefined : { color: areaGradient(item.color) }
    }))
  }
}

function renderTagTrend(records, theme) {
  renderStacked('cTagTrend', records, 'tag_dist_all', theme)
}

function renderAtTrend(records, theme) {
  const chart = dashCharts.cAtTrend
  if (!chart) return
  const dateMap = {}
  records.forEach(item => {
    Object.entries(item.daily_active_tag || {}).forEach(([day, dist]) => {
      dateMap[day] ||= {}
      Object.entries(dist).forEach(([tag, count]) => { dateMap[day][tag] = (dateMap[day][tag] || 0) + count })
    })
  })
  renderStackedMap(chart, dateMap, theme)
}

function renderStacked(id, records, key, theme) {
  const chart = dashCharts[id]
  if (!chart) return
  const dateMap = {}
  records.forEach(item => {
    const day = item.date
    dateMap[day] ||= {}
    Object.entries(item[key] || {}).forEach(([tag, count]) => { dateMap[day][tag] = (dateMap[day][tag] || 0) + count })
  })
  renderStackedMap(chart, dateMap, theme)
}

function renderStackedMap(chart, dateMap, theme) {
  const dates = Object.keys(dateMap).sort()
  const tagSet = new Set()
  Object.values(dateMap).forEach(dist => Object.keys(dist).forEach(tag => tagSet.add(tag)))
  const tags = TAG_ORDER.filter(tag => tagSet.has(tag))
  chart.setOption({
    ...theme,
    tooltip: { ...theme.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    legend: { ...CHART_LEGEND, type: 'scroll' },
    grid: { left: 64, right: 16, top: 12, bottom: 54 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: value => value >= 10000 ? (value / 10000).toFixed(0) + '万' : value } },
    series: tags.map(tag => ({ name: tag, type: 'bar', stack: 't', itemStyle: { color: tagColor(tag) }, data: dates.map(day => (dateMap[day] || {})[tag] || 0) }))
  })
}

function renderHotCurrent(record) {
  const hot = record.hot_queries_top20 || {}
  const rows = hotMode === 'passive' ? hot.passive || [] : hotMode === 'all' ? hot.all || [] : hot.active || []
  const body = document.getElementById('hot-table-body')
  if (!body) return
  body.innerHTML = rows.slice(0, 10).map((row, index) => {
    const count = row.count >= 10000 ? (row.count / 10000).toFixed(1) + '万' : Number(row.count || 0).toLocaleString()
    const safeQuery = String(row.query || '').replace(/"/g, '&quot;')
    return `<tr style="border-bottom:1px solid var(--border-light)"><td style="padding:8px 10px;color:${index < 3 ? 'var(--orange)' : 'var(--text-tertiary)'};font-weight:${index < 3 ? '600' : '400'};text-align:center">${index + 1}</td><td style="padding:8px 10px;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${safeQuery}">${safeQuery}</td><td style="padding:8px 10px;color:var(--primary);text-align:right;font-size:10px">${count}</td></tr>`
  }).join('')
}

function buildFallbackRecords() {
  return ['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16'].map((date, index) => sampleRecord(date, index))
}

function sampleRecord(date, index) {
  const total = 180000 + index * 14200
  const active = Math.round(total * 0.68)
  const passive = total - active
  const tagAll = split(total, { 电商: 0.32, 服务: 0.22, 会员: 0.16, 门店: 0.09, 咨询: 0.08, 其他: 0.08, 多模态: 0.05 })
  const tagSem = split(active, { 电商: 0.36, 服务: 0.2, 会员: 0.17, 门店: 0.08, 咨询: 0.07, 其他: 0.06, 多模态: 0.06 })
  return {
    date,
    total,
    total_users: Math.round(total * 0.24),
    total_sessions: Math.round(total * 0.21),
    rating: { good_cs: 8200 + index * 420, good_native: 7600 + index * 380, bad_cs: 1100 + index * 80, bad_native: 760 + index * 60 },
    tag_dist_all: tagAll,
    tag_dist_semantic: tagSem,
    channel_dist: split(total, { 主动: 0.58, 被动: 0.31, 口令活动: 0.11 }),
    source_dist: split(total, { 首页搜索: 0.34, 商品详情: 0.22, 订单页: 0.15, 活动页: 0.13, 售后页: 0.09, 其他: 0.07 }),
    product_dist: split(total, { 'ThinkPad X9': 0.18, 'YOGA Air 14': 0.15, '拯救者 R7000P': 0.13, '小新 Pro14': 0.11, 'ThinkPad P14s': 0.09, 其他商品: 0.34 }),
    medium_dist: split(total, { iOS: 0.36, Android: 0.34, PC: 0.18, 小程序: 0.12 }),
    tag3_dist_top20_semantic: split(active, { 商品参数: 0.14, 售后进度: 0.12, 优惠券: 0.1, 门店地址: 0.08, 订单查询: 0.08, 会员权益: 0.07, 驱动下载: 0.07, 活动规则: 0.06, 发票服务: 0.05, 其他: 0.23 }),
    tag3_dist_top20_no_kouling: split(total, { 商品参数: 0.16, 售后进度: 0.13, 优惠券: 0.11, 门店地址: 0.08, 订单查询: 0.08, 会员权益: 0.06, 驱动下载: 0.06, 活动规则: 0.05, 发票服务: 0.05, 其他: 0.22 }),
    daily_volume: { [date]: total },
    daily_active_passive: { [date]: { 主动: active, 被动: passive, 口令活动: Math.round(total * 0.08) } },
    daily_active_tag: { [date]: tagSem },
    hot_queries_top20: {
      all: hotRows(index, 'all'),
      active: hotRows(index, 'active'),
      passive: hotRows(index, 'passive')
    }
  }
}

function split(total, weights) {
  return Object.fromEntries(Object.entries(weights).map(([key, weight]) => [key, Math.round(total * weight)]))
}

function hotRows(index, mode) {
  const rows = [
    ['ThinkPad X1 Carbon 和 X1 Nano 区别', 3600, 'active'],
    ['联想小新 Pro14 优惠券怎么领', 3100, 'active'],
    ['订单什么时候发货', 2860, 'passive'],
    ['附近联想门店地址', 2540, 'active'],
    ['拯救者 R7000P 是否支持扩展内存', 2180, 'active'],
    ['驱动下载入口在哪里', 2040, 'passive'],
    ['ThinkBook 14+ 适合办公吗', 1910, 'active'],
    ['会员积分怎么兑换', 1760, 'active'],
    ['发票在哪里开', 1620, 'passive'],
    ['售后维修进度怎么查', 1480, 'passive'],
    ['YOGA Air 14 续航多久', 1360, 'active'],
    ['联想企业采购入口', 1240, 'active']
  ]
  return rows
    .filter(row => mode === 'all' || row[2] === mode)
    .map(([query, count]) => ({ query, count: count + index * 37 }))
}

function tagColor(name) {
  return TAG_COLORS[name] || PALETTE[Math.max(0, Object.keys(TAG_COLORS).indexOf(name)) % PALETTE.length]
}

function barGradient(color) {
  if (!window.echarts?.graphic) return color
  return new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: softenColor(color, 0.28) },
    { offset: 1, color }
  ])
}

function areaGradient(color) {
  if (!window.echarts?.graphic) return color
  return new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: hexToRgba(color, 0.16) },
    { offset: 1, color: hexToRgba(color, 0) }
  ])
}

function softenColor(hex, mix) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const mixed = rgb.map(value => Math.round(value + (255 - value) * mix))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '')
  if (clean.length !== 6) return null
  return [0, 2, 4].map(index => parseInt(clean.slice(index, index + 2), 16))
}

function fmtNum(value) {
  const number = Number(value) || 0
  if (number >= 100000000) return (number / 100000000).toFixed(1).replace(/\.0$/, '') + '亿'
  if (number >= 10000) return (number / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return number.toLocaleString()
}

function setText(id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

function activePillStyle(paddingX) {
  return `padding:3px ${paddingX};border-radius:4px;font-size:10px;cursor:pointer;color:var(--primary);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)`
}

function inactivePillStyle(paddingX) {
  return `padding:3px ${paddingX};border-radius:4px;font-size:10px;cursor:pointer;color:var(--text-tertiary)`
}
</script>
