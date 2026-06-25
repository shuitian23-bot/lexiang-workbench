<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">流量分析</div>
        <div class="page-desc">核心活跃趋势 · 监测入口 · 分端口 · 分业务 · 默认近30天 · 口径同日报</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="ops-time-filter">
          <div class="dash-filter-bar">
            <button
              v-for="v in timeRanges"
              :key="v.value"
              class="dash-pill"
              :class="{ active: trafficRange === v.value }"
              @click="setRange(v.value)"
            >{{ v.label }}</button>
          </div>
          <span v-if="trafficRange === 'custom'" class="ops-custom-range">
            <input type="date" class="ops-date-input" v-model="customStart" @change="onCustomChange" />
            <span>至</span>
            <input type="date" class="ops-date-input" v-model="customEnd" @change="onCustomChange" />
          </span>
        </div>
        <button class="btn btn-sm btn-secondary ai-insight-btn" @click="aiInsight">AI 解读</button>
      </div>
    </div>

    <div class="ops-section-title">核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.dau }}</div>
        <div class="ops-kpi-label">DAU（日活）</div>
        <div class="ops-kpi-sub">日均登录 {{ kpi.dauLogin }}</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.mau }}</div>
        <div class="ops-kpi-label">MAU（月活）</div>
        <div class="ops-kpi-sub">月登录均值 {{ kpi.mauLogin }}</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.loginDedup }}</div>
        <div class="ops-kpi-label">登录用户</div>
        <div class="ops-kpi-sub">{{ kpi.loginSub }}</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.interDedup }}</div>
        <div class="ops-kpi-label">互动用户</div>
        <div class="ops-kpi-sub">{{ kpi.interSub }}</div>
      </div>
    </div>

    <div class="ops-section-title">DAU / MAU 趋势</div>
    <div class="ops-card">
      <div class="chart-wrap">
        <div ref="chartUserTrend" class="ops-chart"></div>
      </div>
    </div>

    <div class="ops-section-title">监测媒体流量</div>
    <div class="grid-2">
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>TOP10 媒体排行</h3>
          <div class="dash-filter-bar">
            <button
              v-for="m in metricList"
              :key="m.value"
              class="dash-pill"
              :class="{ active: trafficMetric === m.value }"
              @click="setMetric(m.value)"
            >{{ m.label }}</button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align:left">媒体</th>
              <th>PV</th><th>UV</th><th>登录</th><th>互动</th><th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in mediaTableRows" :key="r.name">
              <td style="text-align:left;font-weight:500">{{ r.name }}</td>
              <td :class="{ 'ops-primary-cell': trafficMetric === 'pv' }">{{ r.pvFmt }}</td>
              <td :class="{ 'ops-primary-cell': trafficMetric === 'uv' }">{{ r.uvFmt }}</td>
              <td :class="{ 'ops-primary-cell': trafficMetric === 'login' }">{{ r.loginFmt }}</td>
              <td :class="{ 'ops-primary-cell': trafficMetric === 'inter' }">{{ r.interFmt }}</td>
              <td>{{ r.pct }}</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">
          按选中指标在统计周期内降序排行 · PV 按 UV 比例估算 · 媒体来源待接入日报「流量来源监测」字段，当前按固定权重估算
        </div>
      </div>
      <div class="ops-card">
        <h3>媒体流量占比分布</h3>
        <div class="chart-wrap">
          <div ref="chartMediaChart" class="ops-chart"></div>
        </div>
      </div>
    </div>

    <div class="ops-section-title">分端口流量</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>端口占比</h3>
        <div class="chart-wrap-sm">
          <div ref="chartPortChart" class="ops-chart"></div>
        </div>
      </div>
      <div class="ops-card">
        <h3>分端口趋势</h3>
        <div class="chart-wrap">
          <div ref="chartPortTrend" class="ops-chart"></div>
        </div>
      </div>
    </div>

    <div class="ops-section-title">分业务流量</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>业务占比</h3>
        <div class="chart-wrap-sm">
          <div ref="chartBizChart" class="ops-chart"></div>
        </div>
      </div>
      <div class="ops-card">
        <h3>分业务趋势</h3>
        <div class="chart-wrap">
          <div ref="chartBizTrend" class="ops-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'

// ---- 常量 ----
const OPS_CHART_COLORS = {
  blue: '#3f78c5', teal: '#3f9ead', green: '#58a86a', amber: '#c89532',
  purple: '#9070c3', rose: '#b45f86', gray: '#6f879e', dark: '#4f6578'
}
const OPS_PV_PER_UV = 1.46
const OPS_MEDIA_SPLIT = [
  { name: '百度搜索', weight: 22 }, { name: '微信生态', weight: 18 },
  { name: '抖音', weight: 14 }, { name: '小红书', weight: 11 },
  { name: '今日头条', weight: 9 }, { name: 'B站', weight: 8 },
  { name: '知乎', weight: 6 }, { name: '微博', weight: 5 },
  { name: '腾讯广告', weight: 4 }, { name: '自然外链', weight: 3 }
]

// ---- 状态 ----
const trafficRange = ref('30d')
const trafficMetric = ref('uv')
const customStart = ref('')
const customEnd = ref('')

const timeRanges = [
  { value: '1d', label: '今日' }, { value: '7d', label: '近7天' },
  { value: '14d', label: '近14天' }, { value: '30d', label: '近30天' },
  { value: 'custom', label: '自定义' }
]
const metricList = [
  { value: 'pv', label: 'PV' }, { value: 'uv', label: 'UV' },
  { value: 'login', label: '登录' }, { value: 'inter', label: '互动' }
]

// ---- chart refs ----
const chartUserTrend = ref(null)
const chartMediaChart = ref(null)
const chartPortChart = ref(null)
const chartPortTrend = ref(null)
const chartBizChart = ref(null)
const chartBizTrend = ref(null)

let _charts = {}

// ---- 数据获取 ----
function getData() {
  return typeof window.leaiGetData === 'function' ? window.leaiGetData() : null
}

function getRows(range, source, csStart, csEnd) {
  if (typeof window.leaiRows === 'function') return window.leaiRows(range, source, csStart, csEnd)
  if (!source) return []
  if (range === '1d') return source.slice(-1)
  if (range === '7d') return source.slice(-7)
  if (range === '14d') return source.slice(-14)
  if (range === 'custom' && csStart && csEnd) return source.filter(r => r.d >= csStart && r.d <= csEnd)
  return source.slice(-30)
}

function getSummary(range, csStart, csEnd) {
  if (typeof window.leaiBuildSummary === 'function') return window.leaiBuildSummary(range, csStart, csEnd)
  return { dau: 0, mau: 0, loginAvg: 0, loginM: 0, loginDedup: 0, interDedup: 0, loginDedupEst: false, interDedupEst: false, login: 0, inter: 0 }
}

function fmtW(v) {
  if (typeof window.leaiFmtW === 'function') return window.leaiFmtW(v)
  const n = Number(v) || 0
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString()
}

function fmtPct(part, total) {
  if (typeof window.leaiFmtPct === 'function') return window.leaiFmtPct(part, total)
  return total ? (part / total * 100).toFixed(1) + '%' : '-'
}

function leaiSum(rows, key) {
  if (typeof window.leaiSum === 'function') return window.leaiSum(rows, key)
  return (rows || []).reduce((s, r) => s + (Number(r?.[key]) || 0), 0)
}

function distribute(total, weights) {
  if (typeof window.leaiDistributeAmount === 'function') return window.leaiDistributeAmount(total, weights)
  const sum = weights.reduce((s, w) => s + w, 0)
  return weights.map(w => Math.round((Number(total) || 0) * w / sum))
}

// ---- 计算媒体行 ----
function buildMediaRows(rows, metric) {
  const L = getData()
  if (!L) return []
  const portTotals = buildPortSummary(rows, metric)
  const totals = {
    pv: portTotals.reduce((s, r) => s + r.pv, 0),
    uv: portTotals.reduce((s, r) => s + r.uv, 0),
    login: portTotals.reduce((s, r) => s + r.login, 0),
    inter: portTotals.reduce((s, r) => s + r.inter, 0)
  }
  const weights = OPS_MEDIA_SPLIT.map(r => r.weight)
  const pv = distribute(totals.pv, weights)
  const uv = distribute(totals.uv, weights)
  const login = distribute(totals.login, weights)
  const inter = distribute(totals.inter, weights)
  return OPS_MEDIA_SPLIT.map((r, i) => ({
    name: r.name,
    pv: pv[i], uv: uv[i], login: login[i], inter: inter[i],
    value: ({ pv, uv, login, inter })[metric]?.[i] ?? uv[i]
  })).sort((a, b) => b.value - a.value)
}

function buildPortSummary(rows, metric) {
  const L = getData()
  if (!L) return []
  const dates = new Set(rows.map(r => r.d))
  return Object.entries(L.traffic || {}).map(([name, portRows]) => {
    const picked = portRows.filter(r => dates.has(r.d))
    const uv = leaiSum(picked, 'uv')
    const stat = {
      name,
      pv: Math.round(uv * OPS_PV_PER_UV),
      uv, login: leaiSum(picked, 'login'), inter: leaiSum(picked, 'inter'),
      buy: leaiSum(picked, 'buy'), gmv: leaiSum(picked, 'gmv')
    }
    stat.value = metric === 'pv' ? stat.pv : leaiSum(picked, metric)
    return stat
  }).filter(r => r.value > 0).sort((a, b) => b.value - a.value)
}

function seriesForDates(source, baseRows, key) {
  if (typeof window.opsSeriesForDates === 'function') return window.opsSeriesForDates(source, baseRows, key)
  const map = new Map((source || []).map(r => [r.d, r]))
  return baseRows.map(r => Number(map.get(r.d)?.[key]) || 0)
}

// ---- KPI ----
const kpi = reactive({
  dau: '-', mau: '-', dauLogin: '-', mauLogin: '-',
  loginDedup: '-', interDedup: '-', loginSub: '选期排重', interSub: '选期排重'
})

function updateKpi(summary) {
  kpi.dau = fmtW(summary.dau)
  kpi.mau = fmtW(summary.mau)
  kpi.dauLogin = fmtW(summary.loginAvg)
  kpi.mauLogin = fmtW(summary.loginM)
  kpi.loginDedup = fmtW(summary.loginDedup)
  kpi.interDedup = fmtW(summary.interDedup)
  kpi.loginSub = `选期排重${summary.loginDedupEst ? '·估算' : ''} · 累计 ${fmtW(summary.login)}`
  kpi.interSub = `选期排重${summary.interDedupEst ? '·估算' : ''} · 累计 ${fmtW(summary.inter)}`
}

// ---- 媒体表格行（computed） ----
const mediaTableRows = computed(() => {
  const L = getData()
  if (!L) return []
  const rows = getRows(trafficRange.value, L.daily, customStart.value, customEnd.value)
  const metric = trafficMetric.value
  const mediaRows = buildMediaRows(rows, metric)
  const totalValue = mediaRows.reduce((s, r) => s + r.value, 0)
  return mediaRows.slice(0, 10).map(r => ({
    name: r.name,
    pvFmt: fmtW(r.pv), uvFmt: fmtW(r.uv), loginFmt: fmtW(r.login), interFmt: fmtW(r.inter),
    pct: fmtPct(r.value, totalValue)
  }))
})

// ---- 图表 ----
function destroyCharts() {
  Object.values(_charts).forEach(c => {
    if (!c) return
    if (typeof c.dispose === 'function') c.dispose()
    else if (typeof c.destroy === 'function') c.destroy()
  })
  _charts = {}
}

function makeChart(el, type, labels, datasets, opts) {
  if (!el) return
  if (!echarts) {
    el.innerHTML = '<div class="ops-chart-empty" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary)">图表库加载中</div>'
    return
  }
  if (_charts[el.id]) {
    try { _charts[el.id].dispose() } catch (_) {}
  }
  const chart = echarts.init(el)
  _charts[el.id || Math.random()] = chart

  const palette = datasets.map(d => d.borderColor || d.backgroundColor).filter(Boolean)
  let option
  if (type === 'doughnut') {
    const ds = datasets[0] || {}
    const colors = Array.isArray(ds.backgroundColor) ? ds.backgroundColor : palette
    option = {
      color: colors,
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', orient: 'vertical', right: 8, top: 'middle', textStyle: { fontSize: 11, color: '#6b7280' } },
      series: [{
        name: ds.label || '', type: 'pie', radius: ['45%', '70%'], center: ['38%', '50%'],
        avoidLabelOverlap: true, label: { show: false },
        data: labels.map((name, i) => ({ name, value: Number(ds.data?.[i]) || 0 }))
      }]
    }
  } else {
    const horizontal = opts?.indexAxis === 'y'
    const hasSecondAxis = datasets.some(d => d.yAxisID === 'y1')
    option = {
      color: palette.length ? palette : [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.green, OPS_CHART_COLORS.purple, OPS_CHART_COLORS.amber],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
      grid: { left: horizontal ? 92 : 46, right: hasSecondAxis ? 46 : 18, top: 36, bottom: 28, containLabel: true },
      xAxis: horizontal
        ? { type: 'value', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } }
        : { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' }, axisTick: { alignWithLabel: true } },
      yAxis: horizontal
        ? { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' } }
        : hasSecondAxis
          ? [
              { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
              { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { show: false } }
            ]
          : { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: datasets.map(d => ({
        name: d.label, type: type === 'line' ? 'line' : 'bar',
        data: (d.data || []).map(v => Number(v) || 0),
        smooth: type === 'line', yAxisIndex: !horizontal && d.yAxisID === 'y1' ? 1 : 0,
        areaStyle: type === 'line' && d.fill ? { opacity: 0.12 } : undefined,
        lineStyle: d.borderColor ? { color: d.borderColor, width: 2 } : undefined,
        itemStyle: { color: d.borderColor || d.backgroundColor },
        barMaxWidth: horizontal ? 18 : 26
      }))
    }
  }
  chart.setOption(option)
  requestAnimationFrame(() => chart.resize())
  setTimeout(() => chart.resize(), 120)
  return chart
}

function renderCharts() {
  destroyCharts()
  const L = getData()
  if (!L) return

  const range = trafficRange.value
  const rows = getRows(range, L.daily, customStart.value, customEnd.value)
  const days = rows.map(r => r.d)
  const summary = getSummary(range, customStart.value, customEnd.value)
  updateKpi(summary)

  const metric = trafficMetric.value
  const metricField = { pv: 'pv', uv: 'uv', login: 'login', inter: 'inter' }[metric] || 'uv'
  const portColors = [OPS_CHART_COLORS.dark, OPS_CHART_COLORS.blue, OPS_CHART_COLORS.purple, OPS_CHART_COLORS.teal, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.green, OPS_CHART_COLORS.rose, OPS_CHART_COLORS.gray]
  const portRows = buildPortSummary(rows, metricField)
  const mediaRows = buildMediaRows(rows, metricField)
  const topPortRows = portRows.slice(0, 8)

  // DAU/MAU 趋势
  makeChart(chartUserTrend.value, 'line', days, [
    { label: 'DAU', data: rows.map(r => r.dau), borderColor: OPS_CHART_COLORS.blue, backgroundColor: 'rgba(63,120,197,0.10)', fill: true, yAxisID: 'y' },
    { label: '登录', data: rows.map(r => r.login), borderColor: OPS_CHART_COLORS.green, fill: false, yAxisID: 'y' },
    { label: 'MAU', data: rows.map(r => r.mau), borderColor: OPS_CHART_COLORS.purple, fill: false, yAxisID: 'y1' }
  ])

  // 端口占比
  makeChart(chartPortChart.value, 'doughnut', topPortRows.map(r => r.name), [{
    data: topPortRows.map(r => r.value), backgroundColor: portColors.slice(0, topPortRows.length)
  }])

  // 端口趋势
  const topPorts = topPortRows.slice(0, 5).map(r => r.name)
  makeChart(chartPortTrend.value, 'line', days, topPorts.map((p, i) => ({
    label: p, data: seriesForDates(L.traffic?.[p], rows, metricField),
    borderColor: portColors[i], fill: false
  })))

  // 业务占比/趋势
  const bizNames = ['消费', 'SMB', '政企']
  const bizData = [L.consumer, L.smb, L.gov]
  const bizField = metric === 'inter' ? 'inter' : 'login'
  const bizPicked = bizData.map(b => {
    const dates = new Set(rows.map(r => r.d))
    return (b || []).filter(r => dates.has(r.d))
  })
  const bizMetric = bizPicked.map(b => leaiSum(b, bizField))
  makeChart(chartBizChart.value, 'doughnut', bizNames, [{
    data: bizMetric, backgroundColor: [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple]
  }])
  makeChart(chartBizTrend.value, 'line', days, bizNames.map((b, i) => ({
    label: `${b}${bizField === 'inter' ? '互动' : '登录'}`,
    data: seriesForDates(bizData[i], rows, bizField),
    borderColor: [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple][i], fill: false
  })))

  // 媒体条形图
  const totalValue = mediaRows.reduce((s, r) => s + r.value, 0)
  makeChart(chartMediaChart.value, 'bar', mediaRows.slice(0, 10).map(r => r.name), [{
    label: `${{ pv: 'PV', uv: 'UV', login: '登录', inter: '互动' }[metric] || 'UV'}占比%`,
    data: mediaRows.slice(0, 10).map(r => totalValue ? Number((r.value / totalValue * 100).toFixed(1)) : 0),
    backgroundColor: OPS_CHART_COLORS.blue
  }], { indexAxis: 'y' })
}

// ---- 事件 ----
function setRange(val) {
  trafficRange.value = val
  renderCharts()
}

function setMetric(val) {
  trafficMetric.value = val
  renderCharts()
}

function onCustomChange() {
  if (customStart.value && customEnd.value) renderCharts()
}

function aiInsight() {
  if (typeof window.aiQuick === 'function') {
    window.aiQuick('基于当前流量分析看板，分析流量趋势、入口结构、媒体贡献、异常波动和下一步动作。')
  }
}

function handleResize() {
  Object.values(_charts).forEach(c => {
    if (c && typeof c.resize === 'function') c.resize()
  })
}

onMounted(() => {
  renderCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  destroyCharts()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.ops-custom-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}
.ops-date-input {
  border: 1px solid var(--border-color, #e1e4e8);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  color: var(--text-primary, #1f2329);
  background: var(--bg-primary, #fff);
}
.ops-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary, #9199a6);
}
</style>
