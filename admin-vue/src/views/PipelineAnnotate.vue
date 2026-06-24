<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">Query 分析</div>
        <div class="page-desc">智能体交互数据深度分析</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">FROM</span>
          <input type="date" v-model="dateFrom" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
        </div>
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">TO</span>
          <input type="date" v-model="dateTo" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
        </div>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" @click="applyDateFilter">筛选</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" @click="clearDateFilter">清除</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" @click="refreshDashboard" title="刷新">&#8635;</button>
        <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px;border-radius:5px" @click="downloadExcel" title="下载Excel">&#8595;</button>
        <button class="btn btn-primary" style="padding:3px 10px;font-size:11px;border-radius:5px" @click="$refs.uploadInput.click()">上传</button>
      </div>
    </div>
    <input ref="uploadInput" type="file" accept=".xlsx,.xls,.csv" style="display:none">

    <!-- KPI -->
    <div class="kpi-grid" style="grid-template-columns:repeat(8,1fr)">
      <div class="kpi-card"><div class="kpi-label">Query 总数</div><div class="kpi-value" style="color:var(--primary);font-size:20px">{{ kpi.total }}</div></div>
      <div class="kpi-card"><div class="kpi-label">昨日 Query</div><div class="kpi-value" style="color:var(--primary);font-size:20px">{{ kpi.yday }}</div></div>
      <div class="kpi-card"><div class="kpi-label">总用户数</div><div class="kpi-value" style="color:var(--orange);font-size:20px">{{ kpi.users }}</div></div>
      <div class="kpi-card"><div class="kpi-label">总对话数</div><div class="kpi-value" style="color:var(--green);font-size:20px">{{ kpi.sessions }}</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·客服</div><div class="kpi-value" style="color:var(--green);font-size:20px">{{ kpi.gcs }}</div></div>
      <div class="kpi-card"><div class="kpi-label">好评·原生</div><div class="kpi-value" style="color:var(--green);font-size:20px">{{ kpi.gn }}</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·客服</div><div class="kpi-value" style="color:var(--red);font-size:20px">{{ kpi.bcs }}</div></div>
      <div class="kpi-card"><div class="kpi-label">差评·原生</div><div class="kpi-value" style="color:var(--red);font-size:20px">{{ kpi.bn }}</div></div>
    </div>

    <!-- 图表区 -->
    <div style="margin-top:16px">
      <div class="grid-2">
        <div class="card"><div class="card-header"><div class="card-title">一级分类·整体</div></div><div ref="cTagAll" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">一级分类·主动语义</div></div><div ref="cTagSem" style="height:300px"></div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">渠道分布</div></div><div ref="cChannel" style="height:300px"></div></div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">三级分类 TOP20</div>
            <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
              <span
                style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
                :style="tag3Mode==='active'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,.06)'}:{color:'var(--text-tertiary)'}"
                @click="switchTag3Mode('active')">主动</span>
              <span
                style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
                :style="tag3Mode==='nokouling'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,.06)'}:{color:'var(--text-tertiary)'}"
                @click="switchTag3Mode('nokouling')">去口令</span>
            </div>
          </div>
          <div ref="cTag3" style="height:300px"></div>
        </div>
      </div>

      <!-- 日度趋势 -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <div class="card-title">日度查询量趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span>
            <input type="date" v-model="trendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span>
            <input type="date" v-model="trendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" @click="applyTrendFilter('daily')">确定</button>
          </div>
        </div>
        <div ref="cDaily" style="height:280px"></div>
      </div>

      <!-- 场景分布趋势 -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <div class="card-title">场景分布趋势</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
            <span style="font-size:10px">从</span>
            <input type="date" v-model="tagTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <span style="font-size:10px">至</span>
            <input type="date" v-model="tagTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" @click="applyTrendFilter('tag')">确定</button>
          </div>
        </div>
        <div ref="cTagTrend" style="height:280px"></div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <!-- 主被动趋势 -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">主被动 Query 趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span>
              <input type="date" v-model="apTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span>
              <input type="date" v-model="apTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" @click="applyTrendFilter('ap')">确定</button>
            </div>
          </div>
          <div ref="cApTrend" style="height:280px"></div>
        </div>
        <!-- 主动场景趋势 -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">主动场景变化趋势</div>
            <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-tertiary);margin-left:auto">
              <span style="font-size:10px">从</span>
              <input type="date" v-model="atTrendFrom" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <span style="font-size:10px">至</span>
              <input type="date" v-model="atTrendTo" style="padding:2px 6px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
              <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:10px" @click="applyTrendFilter('at')">确定</button>
            </div>
          </div>
          <div ref="cAtTrend" style="height:280px"></div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <!-- 热门 Query -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">热门 Query TOP10</div>
            <div style="display:flex;gap:4px;margin-left:auto;background:var(--bg);border-radius:6px;padding:2px">
              <span v-for="m in hotModes" :key="m.key"
                style="padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer"
                :style="hotMode===m.key?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,.06)'}:{color:'var(--text-tertiary)'}"
                @click="switchHotMode(m.key)">{{ m.label }}</span>
            </div>
          </div>
          <div style="overflow-y:auto;max-height:300px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr>
                <th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:28px">#</th>
                <th style="text-align:left;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light)">Query</th>
                <th style="text-align:right;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-bottom:1px solid var(--border-light);width:60px">频次</th>
              </tr></thead>
              <tbody>
                <tr v-if="!hotRows.length">
                  <td colspan="3" style="padding:20px;text-align:center;color:var(--text-tertiary)">暂无数据</td>
                </tr>
                <tr v-for="(row, i) in hotRows" :key="i" style="border-bottom:1px solid var(--border-light)">
                  <td style="padding:8px 10px;text-align:center"
                    :style="{color: i < 3 ? 'var(--orange)' : 'var(--text-tertiary)', fontWeight: i < 3 ? '600' : '400'}">{{ i + 1 }}</td>
                  <td style="padding:8px 10px;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="row.query">{{ row.query }}</td>
                  <td style="padding:8px 10px;color:var(--primary);text-align:right;font-size:10px">{{ fmtCount(row.count) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">商品咨询 TOP20</div></div><div ref="cProduct" style="height:300px"></div></div>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="card-header"><div class="card-title">来源分布</div></div><div ref="cSource" style="height:300px"></div></div>
        <div class="card"><div class="card-header"><div class="card-title">终端类型分布</div></div><div ref="cMedium" style="height:300px"></div></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

// ---- 颜色常量 ----
const TAG_COLORS = { '电商': '#3370ff', '服务': '#34c724', '会员': '#722ed1', '门店': '#ff7d00', '咨询': '#e2001a', '其他': '#8f959e', '多模态': '#00b578' }
const PALETTE = ['#3370ff', '#34c724', '#722ed1', '#ff7d00', '#e2001a', '#8f959e', '#00b578', '#f59e0b', '#ec4899', '#14b8a6']
const TAG_ORDER = ['电商', '服务', '会员', '门店', '咨询', '其他', '多模态']
const AP_COLOR = { '主动': '#3370ff', '被动': '#ff7d00', '口令活动': '#e2001a' }
function tagColor(name) { return TAG_COLORS[name] || PALETTE[Object.keys(TAG_COLORS).indexOf(name) % PALETTE.length] }

// ---- 日期筛选状态 ----
const dateFrom = ref('')
const dateTo = ref('')
const trendFrom = ref('')
const trendTo = ref('')
const tagTrendFrom = ref('')
const tagTrendTo = ref('')
const apTrendFrom = ref('')
const apTrendTo = ref('')
const atTrendFrom = ref('')
const atTrendTo = ref('')

// ---- 模式 ----
const tag3Mode = ref('active')
const hotMode = ref('active')
const hotModes = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '主动' },
  { key: 'passive', label: '被动' },
]

// ---- KPI ----
const kpi = reactive({ total: '--', yday: '--', users: '--', sessions: '--', gcs: '--', gn: '--', bcs: '--', bn: '--' })

// ---- 数据 ----
let _allRecords = []
let _dashRecords = []

// ---- chart refs ----
const uploadInput = ref(null)
const cTagAll = ref(null)
const cTagSem = ref(null)
const cChannel = ref(null)
const cTag3 = ref(null)
const cDaily = ref(null)
const cTagTrend = ref(null)
const cApTrend = ref(null)
const cAtTrend = ref(null)
const cProduct = ref(null)
const cSource = ref(null)
const cMedium = ref(null)

let _charts = {}
let _autoRefreshTimer = null

// ---- 热门 Query 计算属性 ----
const hotRows = computed(() => {
  if (!_dashRecords.length) return []
  const merged = _mergeHotQueries(_dashRecords)
  const rows = merged[hotMode.value] || []
  return rows.slice(0, 10)
})

// ---- 工具函数 ----
function fmtNum(n) {
  n = Number(n) || 0
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万'
  return n.toLocaleString()
}

function fmtCount(n) {
  n = Number(n) || 0
  return n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : n.toLocaleString()
}

function _cleanRecordKeys(rec) {
  const tagKeys = ['tag_dist_all', 'tag_dist_active', 'tag_dist_semantic', 'channel_dist', 'source_dist', 'product_dist', 'medium_dist', 'turn_distribution']
  for (const key of tagKeys) {
    const dist = rec[key]
    if (!dist || typeof dist !== 'object') continue
    const cleaned = {}
    for (const [k, v] of Object.entries(dist)) {
      const ck = k.trim()
      cleaned[ck] = (cleaned[ck] || 0) + v
    }
    rec[key] = cleaned
  }
  return rec
}

function _mergeDist(recs, ...keys) {
  const merged = {}
  recs.forEach(r => {
    for (const key of keys) {
      const dist = r[key]
      if (!dist || typeof dist !== 'object') continue
      for (const [k, v] of Object.entries(dist)) {
        const ck = k.trim()
        merged[ck] = (merged[ck] || 0) + v
      }
    }
  })
  return merged
}

function _mergeHotQueries(recs) {
  const merged = { all: [], active: [], passive: [] }
  const qMap = { all: {}, active: {}, passive: {} }
  recs.forEach(r => {
    const hq = r.hot_queries_top20 || {}
    for (const mode of ['all', 'active', 'passive']) {
      for (const item of (hq[mode] || [])) {
        const q = item.query || ''
        if (!q) continue
        qMap[mode][q] = (qMap[mode][q] || 0) + item.count
      }
    }
  })
  for (const mode of ['all', 'active', 'passive']) {
    merged[mode] = Object.entries(qMap[mode])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }))
  }
  return merged
}

function filteredRecords() {
  let recs = _allRecords
  if (dateFrom.value) recs = recs.filter(r => r.date >= dateFrom.value)
  if (dateTo.value) recs = recs.filter(r => r.date <= dateTo.value)
  return recs
}

function trendFilteredRecords() {
  let recs = _allRecords
  if (trendFrom.value) recs = recs.filter(r => r.date >= trendFrom.value)
  if (trendTo.value) recs = recs.filter(r => r.date <= trendTo.value)
  return recs
}

function tagTrendFilteredRecords() {
  let recs = _allRecords
  if (tagTrendFrom.value) recs = recs.filter(r => r.date >= tagTrendFrom.value)
  if (tagTrendTo.value) recs = recs.filter(r => r.date <= tagTrendTo.value)
  return recs
}

function apTrendFilteredRecords() {
  let recs = _allRecords
  if (apTrendFrom.value) recs = recs.filter(r => r.date >= apTrendFrom.value)
  if (apTrendTo.value) recs = recs.filter(r => r.date <= apTrendTo.value)
  return recs
}

function atTrendFilteredRecords() {
  let recs = _allRecords
  if (atTrendFrom.value) recs = recs.filter(r => r.date >= atTrendFrom.value)
  if (atTrendTo.value) recs = recs.filter(r => r.date <= atTrendTo.value)
  return recs
}

// ---- KPI 渲染 ----
function renderKPI(recs) {
  const sumTotal = recs.reduce((s, r) => s + (r.total || 0), 0)
  const sumUsers = recs.reduce((s, r) => s + (r.total_users || 0), 0)
  const sumSessions = recs.reduce((s, r) => s + (r.total_sessions || 0), 0)
  const sumRating = { good_cs: 0, good_native: 0, bad_cs: 0, bad_native: 0 }
  recs.forEach(r => { const rt = r.rating || {}; for (const k in sumRating) sumRating[k] += rt[k] || 0 })

  kpi.total = fmtNum(sumTotal)
  let yrec = null
  if (_allRecords.length) {
    const latestDate = _allRecords[_allRecords.length - 1].date
    yrec = _allRecords.find(x => x.date === latestDate)
  }
  kpi.yday = fmtNum(yrec ? yrec.total : 0)
  kpi.users = fmtNum(sumUsers)
  kpi.sessions = fmtNum(sumSessions)
  kpi.gcs = fmtNum(sumRating.good_cs)
  kpi.gn = fmtNum(sumRating.good_native)
  kpi.bcs = fmtNum(sumRating.bad_cs)
  kpi.bn = fmtNum(sumRating.bad_native)
}

// ---- 图表工具 ----
function getChart(elRef) {
  const echarts = window.echarts
  if (!echarts || !elRef.value) return null
  const key = elRef.value.__chartKey || (elRef.value.__chartKey = Math.random())
  if (!_charts[key]) {
    _charts[key] = echarts.init(elRef.value)
  }
  return _charts[key]
}

const TH = {
  backgroundColor: 'transparent',
  textStyle: { color: '#646a73' },
  legend: { textStyle: { color: '#646a73', fontSize: 10 } },
  tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08)' }
}

function donutChart(elRef, data, useTagColor) {
  const ch = getChart(elRef); if (!ch) return
  const n = Object.keys(data), v = Object.values(data)
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    series: [{
      type: 'pie', radius: ['40%', '68%'], center: ['50%', '46%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: n.map((t, i) => ({ name: t, value: v[i], itemStyle: { color: useTagColor ? tagColor(t) : PALETTE[i % PALETTE.length] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } },
      animationType: 'scale', animationEasing: 'elasticOut', animationDelay: i => i * 50
    }]
  })
}

function donutChannel(elRef, data) {
  const ch = getChart(elRef); if (!ch) return
  const cm = { '主动': '#3370ff', '被动': '#ff7d00', '口令活动': '#e2001a' }
  const n = Object.keys(data), v = Object.values(data)
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } },
    series: [{
      type: 'pie', radius: ['40%', '68%'], center: ['50%', '46%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: n.map((t, i) => ({ name: t, value: v[i], itemStyle: { color: cm[t] || PALETTE[i] } })),
      label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{c}' },
      emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } },
      animationType: 'scale', animationEasing: 'elasticOut'
    }]
  })
}

function hbarChart(elRef, data, color, left) {
  const ch = getChart(elRef); if (!ch) return
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 20)
  const n = sorted.map(e => e[0]).reverse()
  const v = sorted.map(e => e[1]).reverse()
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: left || 170, right: 16, top: 4, bottom: 20 },
    xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'category', data: n, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#646a73', fontSize: 10, width: (left || 170) - 24, overflow: 'truncate' } },
    series: [{ type: 'bar', data: v, itemStyle: { color, borderRadius: [0, 3, 3, 0] }, barWidth: '55%' }]
  })
}

function renderDailyVolume(recs) {
  const ch = getChart(cDaily); if (!ch) return
  const echarts = window.echarts
  const m = {}
  recs.forEach(r => { Object.entries(r.daily_volume || {}).forEach(([d, v]) => { if (d !== '1970-01-01') m[d] = (m[d] || 0) + v }) })
  const dates = Object.keys(m).sort()
  const vals = dates.map(d => m[d])
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'axis', formatter: p => `${p[0].axisValue}<br/>查询量: <b>${p[0].value.toLocaleString()}</b>` },
    grid: { left: 64, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: v => v >= 1e4 ? (v / 1e4).toFixed(0) + '万' : v } },
    series: [{
      type: 'line', data: vals, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { color: '#3370ff', width: 1.5 }, itemStyle: { color: '#3370ff', borderColor: '#fff', borderWidth: 1.5 },
      areaStyle: echarts ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(51,112,255,.10)' }, { offset: 1, color: 'rgba(51,112,255,0)' }]) } : undefined
    }]
  })
}

function _expandRecordsByDailyVolume(recs) {
  const expanded = []
  recs.forEach(r => {
    const dv = r.daily_volume || {}
    const dvClean = Object.entries(dv).filter(([d]) => d !== '1970-01-01')
    if (dvClean.length <= 1) { expanded.push(r); return }
    const dvTotal = dvClean.reduce((s, [, v]) => s + v, 0) || 1
    const tagAll = r.tag_dist_all || {}
    dvClean.forEach(([day, vol]) => {
      const ratio = vol / dvTotal
      const splitTag = {}
      for (const [t, c] of Object.entries(tagAll)) { splitTag[t] = Math.round(c * ratio) }
      expanded.push({ ...r, date: day, daily_volume: { [day]: vol }, tag_dist_all: splitTag })
    })
  })
  return expanded
}

function renderTagTrend(recs) {
  const ch = getChart(cTagTrend); if (!ch) return
  const expanded = _expandRecordsByDailyVolume(recs)
  const dateMap = {}
  expanded.forEach(r => {
    const d = r.date
    if (!dateMap[d]) dateMap[d] = {}
    for (const [t, c] of Object.entries(r.tag_dist_all || {})) {
      dateMap[d][t] = (dateMap[d][t] || 0) + c
    }
  })
  const ts = new Set()
  Object.values(dateMap).forEach(dist => Object.keys(dist).forEach(t => ts.add(t)))
  const tags = TAG_ORDER.filter(t => ts.has(t))
  const dates = Object.keys(dateMap).sort()
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9, formatter: v => v >= 1e4 ? (v / 1e4).toFixed(0) + '万' : v } },
    series: tags.map((tag, i) => ({
      name: tag, type: 'bar', stack: 't', emphasis: { focus: 'series' },
      itemStyle: { color: tagColor(tag), borderRadius: tags.length - 1 === i ? [2, 2, 0, 0] : [0, 0, 0, 0] },
      data: dates.map(d => (dateMap[d] || {})[tag] || 0)
    }))
  })
}

function renderApTrend(recs) {
  const ch = getChart(cApTrend); if (!ch) return
  const dateMap = {}
  recs.forEach(r => {
    const dap = r.daily_active_passive || {}
    Object.entries(dap).forEach(([d, vals]) => {
      if (!dateMap[d]) dateMap[d] = { '主动': 0, '被动': 0, '口令活动': 0 }
      dateMap[d]['主动'] += (vals['主动'] || 0)
      dateMap[d]['被动'] += (vals['被动'] || 0)
      dateMap[d]['口令活动'] += (vals['口令活动'] || 0)
    })
  })
  const dates = Object.keys(dateMap).sort()
  const series = ['主动', '被动', '口令活动'].map(key => ({
    name: key, type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
    lineStyle: { width: 1.5 }, itemStyle: { color: AP_COLOR[key] },
    data: dates.map(d => dateMap[d][key] || 0)
  }))
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    series
  })
}

function renderAtTrend(recs) {
  const ch = getChart(cAtTrend); if (!ch) return
  const dateMap = {}
  recs.forEach(r => {
    const dat = r.daily_active_tag || {}
    Object.entries(dat).forEach(([d, dist]) => {
      if (!dateMap[d]) dateMap[d] = {}
      Object.entries(dist).forEach(([tag, cnt]) => {
        dateMap[d][tag] = (dateMap[d][tag] || 0) + cnt
      })
    })
  })
  const dates = Object.keys(dateMap).sort()
  const tagSet = new Set()
  Object.values(dateMap).forEach(dist => Object.keys(dist).forEach(t => tagSet.add(t)))
  const tags = TAG_ORDER.filter(t => tagSet.has(t))
  ch.setOption({
    ...TH,
    tooltip: { ...TH.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: '#646a73', fontSize: 10 } },
    grid: { left: 64, right: 16, top: 12, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dee0e3' } }, axisTick: { show: false }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, axisLabel: { color: '#8f959e', fontSize: 9 } },
    series: tags.map((tag, i) => ({
      name: tag, type: 'bar', stack: 't', emphasis: { focus: 'series' },
      itemStyle: { color: tagColor(tag), borderRadius: tags.length - 1 === i ? [2, 2, 0, 0] : [0, 0, 0, 0] },
      data: dates.map(d => (dateMap[d] || {})[tag] || 0)
    }))
  })
}

function renderTag3Current(recs) {
  const mergedSem = _mergeDist(recs, 'tag3_dist_top20_semantic')
  const mergedNoKou = _mergeDist(recs, 'tag3_dist_top20_no_kouling')
  const data = tag3Mode.value === 'nokouling' ? mergedNoKou : mergedSem
  const color = tag3Mode.value === 'nokouling' ? '#ff7d00' : '#3370ff'
  hbarChart(cTag3, data, color, 170)
}

function renderAllCharts(recs) {
  if (!window.echarts) return
  const mergedTagAll = _mergeDist(recs, 'tag_dist_all')
  const mergedTagSem = _mergeDist(recs, 'tag_dist_semantic')
  const mergedChannel = _mergeDist(recs, 'channel_dist')
  const mergedSource = _mergeDist(recs, 'source_dist')
  const mergedProduct = _mergeDist(recs, 'product_dist')
  const mergedMedium = _mergeDist(recs, 'medium_dist')

  donutChart(cTagAll, mergedTagAll, true)
  donutChart(cTagSem, mergedTagSem, true)
  donutChannel(cChannel, mergedChannel)
  renderTag3Current(recs)
  renderDailyVolume(trendFilteredRecords())
  renderTagTrend(tagTrendFilteredRecords())
  renderApTrend(apTrendFilteredRecords())
  renderAtTrend(atTrendFilteredRecords())
  hbarChart(cSource, mergedSource, '#722ed1', 100)
  hbarChart(cProduct, mergedProduct, '#ff7d00', 100)
  hbarChart(cMedium, mergedMedium, '#00b578', 100)
}

// ---- 数据刷新 ----
async function refreshDashboard() {
  try {
    const res = await fetch('/api/pipeline/stats/history')
    const data = await res.json()
    _allRecords = (data.records || []).map(_cleanRecordKeys)

    // 默认日期：最新一天
    if (_allRecords.length) {
      const latest = _allRecords[_allRecords.length - 1].date
      if (!dateFrom.value) dateFrom.value = latest
      if (!dateTo.value) dateTo.value = latest

      // 趋势默认近30天
      const d30 = new Date(latest + 'T00:00:00')
      d30.setDate(d30.getDate() - 29)
      const d30Str = d30.toISOString().slice(0, 10)
      if (!trendFrom.value) trendFrom.value = d30Str
      if (!trendTo.value) trendTo.value = latest
      if (!tagTrendFrom.value) tagTrendFrom.value = d30Str
      if (!tagTrendTo.value) tagTrendTo.value = latest
      if (!apTrendFrom.value) apTrendFrom.value = d30Str
      if (!apTrendTo.value) apTrendTo.value = latest
      if (!atTrendFrom.value) atTrendFrom.value = d30Str
      if (!atTrendTo.value) atTrendTo.value = latest
    }

    _dashRecords = filteredRecords()
    if (!_dashRecords.length) return
    renderKPI(_dashRecords)
    renderAllCharts(_dashRecords)
  } catch (e) {
    console.error('Dashboard refresh failed:', e)
  }
}

// ---- 事件 ----
function applyDateFilter() {
  _dashRecords = filteredRecords()
  if (_dashRecords.length) {
    renderKPI(_dashRecords)
    renderAllCharts(_dashRecords)
  }
}

function clearDateFilter() {
  dateFrom.value = ''
  dateTo.value = ''
  _dashRecords = _allRecords
  if (_dashRecords.length) {
    renderKPI(_dashRecords)
    renderAllCharts(_dashRecords)
  }
}

function applyTrendFilter(which) {
  // 趋势筛选不影响 KPI，只重绘对应图表
  if (!window.echarts) return
  if (which === 'daily') renderDailyVolume(trendFilteredRecords())
  else if (which === 'tag') renderTagTrend(tagTrendFilteredRecords())
  else if (which === 'ap') renderApTrend(apTrendFilteredRecords())
  else if (which === 'at') renderAtTrend(atTrendFilteredRecords())
}

function switchTag3Mode(mode) {
  tag3Mode.value = mode
  if (_dashRecords.length) renderTag3Current(_dashRecords)
}

function switchHotMode(mode) {
  hotMode.value = mode
  // hotRows 是 computed，自动更新
}

function downloadExcel() {
  let url = '/api/pipeline/download?'
  if (dateFrom.value) url += 'from=' + dateFrom.value + '&'
  if (dateTo.value) url += 'to=' + dateTo.value + '&'
  url += 'type=detail&'
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  a.click()
}

function handleResize() {
  Object.values(_charts).forEach(c => { try { c.resize() } catch (e) {} })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  refreshDashboard()
  _autoRefreshTimer = setInterval(refreshDashboard, 30000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer)
  Object.values(_charts).forEach(c => { try { c.dispose() } catch (e) {} })
  _charts = {}
})
</script>
