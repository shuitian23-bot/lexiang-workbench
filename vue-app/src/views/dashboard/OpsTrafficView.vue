<template>
  <div ref="trafficRoot" class="ops-traffic-native" v-html="trafficHtml"></div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ECharts } from 'echarts'
import { useAIStore } from '@/stores/ai'
import { useAppStore } from '@/stores/app'
import {
  OPS_CHART_COLORS,
  OPS_ROWS,
  type OpsRangeKey,
  type OpsRow,
  avgRows,
  fmtPct,
  fmtW,
  rangeLabel,
  rowIso,
  rowsForRange,
  sumRows
} from './opsData'

declare global {
  interface Window {
    opsAskTraffic?: (kind: string) => void
    opsCustomTimeChanged?: (id: string, part: string, value: string) => void
    opsSetTrafficMetric?: (metric: string) => void
    opsTimeChanged?: (id: string, value: OpsRangeKey) => void
  }
}

type MetricKey = 'pv' | 'uv' | 'login' | 'inter'
type EChartsRuntime = typeof import('echarts')
type TrafficChart = ECharts

const appStore = useAppStore()
const aiStore = useAIStore()
let echartsRuntime: EChartsRuntime | null = null
const trafficMetrics: Record<MetricKey, { label: string; field: MetricKey }> = {
  pv: { label: 'PV', field: 'pv' },
  uv: { label: 'UV', field: 'uv' },
  login: { label: '登录', field: 'login' },
  inter: { label: '互动', field: 'inter' }
}
const mediaWeights = [
  { name: '百度搜索', weight: 22 },
  { name: '微信生态', weight: 18 },
  { name: '抖音', weight: 14 },
  { name: '小红书', weight: 11 },
  { name: '今日头条', weight: 9 },
  { name: 'B站', weight: 8 },
  { name: '知乎', weight: 6 },
  { name: '微博', weight: 5 },
  { name: '腾讯广告', weight: 4 },
  { name: '自然外链', weight: 3 }
]
const portNames = ['APP端', 'PC端', 'WAP端', '微信小程序', '联想小程序', '服务号', '活动页', '其他']
const portColors = [
  OPS_CHART_COLORS.slate,
  OPS_CHART_COLORS.blue,
  OPS_CHART_COLORS.purple,
  OPS_CHART_COLORS.greenSoft,
  OPS_CHART_COLORS.amber,
  OPS_CHART_COLORS.green,
  OPS_CHART_COLORS.blueSoft,
  OPS_CHART_COLORS.neutral
]
const range = ref<OpsRangeKey>('30d')
const metric = ref<MetricKey>('uv')
const customStart = ref(rowIso(OPS_ROWS[0].d))
const customEnd = ref(rowIso(OPS_ROWS[OPS_ROWS.length - 1].d))
const trafficHtml = ref(buildTrafficHtml())
const trafficRoot = ref<HTMLElement | null>(null)
const charts: TrafficChart[] = []
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  appStore.ensureStaticTab('ops.traffic')
  appStore.setActiveStaticTab('ops.traffic')
  document.title = '联想门户工作台'
  installTrafficHandlers()
  echartsRuntime = await import('echarts')
  await nextTick()
  renderTraffic()
  if (trafficRoot.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => charts.forEach(chart => chart.resize())))
    resizeObserver.observe(trafficRoot.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  disposeCharts()
  delete window.opsAskTraffic
  delete window.opsCustomTimeChanged
  delete window.opsSetTrafficMetric
  delete window.opsTimeChanged
})

function buildTrafficHtml() {
  return `
    <div class="page-header">
      <div><div class="page-title">流量分析</div><div class="page-desc">核心活跃趋势 · 监测入口 · 分端口 · 分业务 · 默认近30天 · 口径同日报</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${timeFilterHtml()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskTraffic('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">核心流量指标</div>
    <div class="grid-4">
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-dau">-</div><div class="ops-kpi-label">DAU（日活）</div><div class="ops-kpi-sub">日均登录 <span id="ops-t-dau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-mau">-</div><div class="ops-kpi-label">MAU（月活）</div><div class="ops-kpi-sub">月登录均值 <span id="ops-t-mau-login">-</span></div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-login">-</div><div class="ops-kpi-label">登录用户</div><div class="ops-kpi-sub" id="ops-t-login-sub">选期排重</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-t-inter">-</div><div class="ops-kpi-label">互动用户</div><div class="ops-kpi-sub" id="ops-t-inter-sub">选期排重</div></div>
    </div>

    <div class="ops-section-title">DAU / MAU 趋势</div>
    <div class="ops-card"><div class="chart-wrap"><div id="ops-t-user-trend" class="ops-chart"></div></div></div>

    <div class="ops-section-title">监测媒体流量</div>
    <div class="grid-2 ops-media-flow-grid">
      <div class="ops-card ops-media-table-card">
        <div class="ops-card-head">
          <h3>TOP10 媒体排行</h3>
          <div class="dash-filter-bar">${metricPillsHtml()}</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">媒体</th><th>PV</th><th>UV</th><th>登录</th><th>互动</th><th>占比</th></tr></thead>
          <tbody id="ops-t-media-table"></tbody>
        </table>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">按选中指标在统计周期内降序排行 · PV 按 UV 比例估算 · 媒体来源待接入日报「流量来源监测」字段，当前按固定权重估算</div>
      </div>
      <div class="ops-card ops-media-chart-card">
        <h3>媒体流量占比分布</h3>
        <div class="chart-wrap ops-media-chart-wrap"><div id="ops-t-media-chart" class="ops-chart"></div></div>
      </div>
    </div>

    <div class="ops-section-title">分端口流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>端口占比</h3><div class="chart-wrap-sm"><div id="ops-t-port-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分端口趋势</h3><div class="chart-wrap"><div id="ops-t-port-trend" class="ops-chart"></div></div></div>
    </div>

    <div class="ops-section-title">分业务流量</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务占比</h3><div class="chart-wrap-sm"><div id="ops-t-biz-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>分业务趋势</h3><div class="chart-wrap"><div id="ops-t-biz-trend" class="ops-chart"></div></div></div>
    </div>
  `
}

function timeFilterHtml() {
  const customFilter = range.value === 'custom'
    ? `<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${rowIso(OPS_ROWS[0].d)}" max="${rowIso(OPS_ROWS[OPS_ROWS.length - 1].d)}" value="${customStart.value}" onchange="opsCustomTimeChanged('traffic-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${rowIso(OPS_ROWS[0].d)}" max="${rowIso(OPS_ROWS[OPS_ROWS.length - 1].d)}" value="${customEnd.value}" onchange="opsCustomTimeChanged('traffic-time','end',this.value)">
    </span>` : ''
  return `<div class="ops-time-filter" id="traffic-time">
    <div class="dash-filter-bar">
      ${(['1d', '7d', '14d', '30d', 'custom'] as OpsRangeKey[]).map(value => `<button class="dash-pill ${range.value === value ? 'active' : ''}" onclick="opsTimeChanged('traffic-time','${value}')">${rangeLabel(value)}</button>`).join('')}
    </div>
    ${customFilter}
    <span class="ops-date-range" id="traffic-time-range"></span>
  </div>`
}

function metricPillsHtml() {
  return (Object.keys(trafficMetrics) as MetricKey[])
    .map(value => `<button class="dash-pill ${metric.value === value ? 'active' : ''}" onclick="opsSetTrafficMetric('${value}')">${trafficMetrics[value].label}</button>`)
    .join('')
}

function installTrafficHandlers() {
  window.opsTimeChanged = async (_id, value) => {
    range.value = value
    if (value === 'custom') {
      customStart.value ||= rowIso(OPS_ROWS[0].d)
      customEnd.value ||= rowIso(OPS_ROWS[OPS_ROWS.length - 1].d)
    }
    await rerender()
  }
  window.opsCustomTimeChanged = async (_id, part, value) => {
    range.value = 'custom'
    if (part === 'start') customStart.value = value
    if (part === 'end') customEnd.value = value
    if (customStart.value > customEnd.value) {
      if (part === 'start') customEnd.value = customStart.value
      else customStart.value = customEnd.value
    }
    await rerender()
  }
  window.opsSetTrafficMetric = async (value) => {
    metric.value = value as MetricKey
    await rerender()
  }
  window.opsAskTraffic = () => {
    aiStore.toggleOpen(true)
    aiStore.quickSend('基于当前流量分析看板，分析流量趋势、入口结构、媒体贡献、异常波动和下一步动作。', 'ops.traffic')
  }
}

async function rerender() {
  trafficHtml.value = buildTrafficHtml()
  await nextTick()
  renderTraffic()
}

function renderTraffic() {
  disposeCharts()
  const rows = rowsForRange(OPS_ROWS, range.value, customStart.value, customEnd.value)
  const days = rows.map(row => row.d)
  const summary = {
    dau: avgRows(rows, 'dau'),
    mau: avgRows(rows, 'mau'),
    login: sumRows(rows, 'login'),
    inter: sumRows(rows, 'inter'),
    loginAvg: avgRows(rows, 'login'),
    loginM: avgRows(rows, 'loginM')
  }
  const dedupLogin = Math.round(summary.login * (range.value === '1d' ? 1 : 0.72))
  const dedupInter = Math.round(summary.inter * (range.value === '1d' ? 1 : 0.78))

  text('ops-t-dau', fmtW(summary.dau))
  text('ops-t-mau', fmtW(summary.mau))
  text('ops-t-dau-login', fmtW(summary.loginAvg))
  text('ops-t-mau-login', fmtW(summary.loginM))
  text('ops-t-login', fmtW(dedupLogin))
  text('ops-t-inter', fmtW(dedupInter))
  text('ops-t-login-sub', `选期排重${range.value === '1d' ? '' : '·估算'} · 累计 ${fmtW(summary.login)}`)
  text('ops-t-inter-sub', `选期排重${range.value === '1d' ? '' : '·估算'} · 累计 ${fmtW(summary.inter)}`)

  renderLine('ops-t-user-trend', days, [
    { name: 'DAU', data: rows.map(row => row.dau), color: OPS_CHART_COLORS.blue, fill: true },
    { name: '登录', data: rows.map(row => row.login), color: OPS_CHART_COLORS.green },
    { name: 'MAU', data: rows.map(row => row.mau), color: OPS_CHART_COLORS.purple, yAxisIndex: 1 }
  ], true)

  const mediaRows = buildMediaRows(rows)
  const mediaTotal = mediaRows.reduce((total, row) => total + row.value, 0)
  const mediaTable = document.getElementById('ops-t-media-table')
  if (mediaTable) {
    mediaTable.innerHTML = mediaRows.slice(0, 10).map(row => `<tr>
      <td style="text-align:left;font-weight:500">${row.name}</td>
      <td class="${metric.value === 'pv' ? 'ops-primary-cell' : ''}">${fmtW(row.pv)}</td>
      <td class="${metric.value === 'uv' ? 'ops-primary-cell' : ''}">${fmtW(row.uv)}</td>
      <td class="${metric.value === 'login' ? 'ops-primary-cell' : ''}">${fmtW(row.login)}</td>
      <td class="${metric.value === 'inter' ? 'ops-primary-cell' : ''}">${fmtW(row.inter)}</td>
      <td>${fmtPct(row.value, mediaTotal)}</td>
    </tr>`).join('')
  }
  renderBar('ops-t-media-chart', mediaRows.slice(0, 10).map(row => row.name), [{
    name: `${trafficMetrics[metric.value].label}占比%`,
    data: mediaRows.slice(0, 10).map(row => mediaTotal ? Number((row.value / mediaTotal * 100).toFixed(1)) : 0),
    color: OPS_CHART_COLORS.blue
  }], true)

  const ports = buildPortRows(rows)
  renderDonut('ops-t-port-chart', ports.slice(0, 8).map(row => ({ name: row.name, value: row.value, color: row.color })))
  renderLine('ops-t-port-trend', days, ports.slice(0, 5).map((port, index) => ({
    name: `${port.name}${trafficMetrics[metric.value].label}`,
    data: rows.map(row => Math.round(metricValue(row) * port.weights[index % port.weights.length])),
    color: port.color
  })))

  const bizRows = [
    { name: '消费', value: Math.round((metric.value === 'inter' ? summary.inter : summary.login) * 0.58), color: OPS_CHART_COLORS.blue },
    { name: 'SMB', value: Math.round((metric.value === 'inter' ? summary.inter : summary.login) * 0.28), color: OPS_CHART_COLORS.amber },
    { name: '政企', value: Math.round((metric.value === 'inter' ? summary.inter : summary.login) * 0.14), color: OPS_CHART_COLORS.purple }
  ]
  renderDonut('ops-t-biz-chart', bizRows)
  renderLine('ops-t-biz-trend', days, bizRows.map((biz, index) => ({
    name: `${biz.name}${metric.value === 'inter' ? '互动' : '登录'}`,
    data: rows.map(row => Math.round((metric.value === 'inter' ? row.inter : row.login) * [0.58, 0.28, 0.14][index])),
    color: biz.color
  })))
}

function metricValue(row: OpsRow) {
  if (metric.value === 'pv') return Math.round(row.dau * 1.46)
  if (metric.value === 'uv') return row.dau
  return row[metric.value]
}

function buildMediaRows(rows: OpsRow[]) {
  const totalUv = Math.round(sumRows(rows, 'dau') * 1.22)
  const totalLogin = sumRows(rows, 'login')
  const totalInter = sumRows(rows, 'inter')
  const weightTotal = mediaWeights.reduce((total, item) => total + item.weight, 0)
  return mediaWeights.map(item => {
    const uv = Math.round(totalUv * item.weight / weightTotal)
    const login = Math.round(totalLogin * item.weight / weightTotal)
    const inter = Math.round(totalInter * item.weight / weightTotal)
    const pv = Math.round(uv * 1.46)
    return { ...item, pv, uv, login, inter, value: { pv, uv, login, inter }[metric.value] }
  }).sort((a, b) => b.value - a.value)
}

function buildPortRows(rows: OpsRow[]) {
  const total = rows.reduce((sum, row) => sum + metricValue(row), 0)
  const weights = [0.34, 0.22, 0.16, 0.12, 0.07, 0.04, 0.03, 0.02]
  return portNames.map((name, index) => ({
    name,
    value: Math.round(total * weights[index]),
    color: portColors[index],
    weights
  }))
}

function renderLine(id: string, labels: string[], series: Array<{ name: string; data: number[]; color: string; fill?: boolean; yAxisIndex?: number }>, dualAxis = false) {
  const chart = initChart(id)
  if (!chart) return
  chart.setOption({
    ...chartMotion(),
    color: series.map(item => item.color),
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
    grid: { left: 46, right: dualAxis ? 46 : 18, top: 36, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' }, axisTick: { alignWithLabel: true } },
    yAxis: dualAxis
      ? [
          { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
          { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { show: false } }
        ]
      : { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: series.map(item => ({
      name: item.name,
      type: 'line',
      smooth: true,
      data: item.data,
      yAxisIndex: item.yAxisIndex || 0,
      areaStyle: item.fill ? { color: chartArea(item.color) } : undefined,
      lineStyle: { color: item.color, width: 2 },
      itemStyle: { color: item.color, borderColor: '#fff', borderWidth: 1.5 },
      symbol: 'circle',
      symbolSize: 5,
      animationDelay: chartDataDelay
    }))
  })
  requestAnimationFrame(() => chart.resize())
}

function renderBar(id: string, labels: string[], series: Array<{ name: string; data: number[]; color: string }>, horizontal = false) {
  const chart = initChart(id)
  if (!chart) return
  chart.setOption({
    ...chartMotion(),
    color: series.map(item => item.color),
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
    grid: { left: horizontal ? 92 : 46, right: 18, top: 36, bottom: 28, containLabel: true },
    xAxis: horizontal
      ? { type: 'value', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } }
      : { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' }, axisTick: { alignWithLabel: true } },
    yAxis: horizontal
      ? { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' } }
      : { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: series.map(item => ({
      name: item.name,
      type: 'bar',
      data: item.data,
      itemStyle: { color: barGradient(item.color), borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] },
      barMaxWidth: horizontal ? 18 : 26,
      animationDelay: chartDataDelay
    }))
  })
  requestAnimationFrame(() => chart.resize())
}

function renderDonut(id: string, items: Array<{ name: string; value: number; color: string }>) {
  const chart = initChart(id)
  if (!chart) return
  chart.setOption({
    ...chartMotion(),
    color: items.map(item => item.color),
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
    series: [{
      type: 'pie',
      radius: ['42%', '66%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, color: '#6b7280', fontSize: 10, formatter: '{b}\\n{d}%' },
      labelLine: { length: 14, length2: 10, lineStyle: { width: 1 } },
      data: items.map(item => ({ name: item.name, value: item.value, itemStyle: { color: item.color } })),
      animationDelay: chartPieDelay
    }]
  })
  requestAnimationFrame(() => chart.resize())
}

function chartMotion() {
  return {
    animation: true,
    animationDuration: 720,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 360,
    animationEasingUpdate: 'cubicOut'
  } as const
}

function chartDataDelay(index: number) {
  return Math.min(index * 22, 260)
}

function chartPieDelay(index: number) {
  return Math.min(index * 70, 360)
}

function chartArea(color: string) {
  if (!echartsRuntime?.graphic) return color
  return new echartsRuntime.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: hexToRgba(color, 0.14) },
    { offset: 1, color: hexToRgba(color, 0.02) }
  ])
}

function barGradient(color: string) {
  if (!echartsRuntime?.graphic) return color
  return new echartsRuntime.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: hexToRgba(color, 0.72) },
    { offset: 1, color }
  ])
}

function hexToRgba(color: string, alpha: number) {
  const hex = color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function initChart(id: string) {
  const el = document.getElementById(id)
  if (!el || !echartsRuntime) return null
  const chart = echartsRuntime.init(el)
  charts.push(chart)
  return chart
}

function disposeCharts() {
  while (charts.length) {
    charts.pop()?.dispose()
  }
}

function text(id: string, value: string) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}
</script>

<style>
.ops-traffic-native .ops-media-flow-grid {
  align-items: stretch;
}

.ops-traffic-native .ops-media-flow-grid > .ops-card {
  margin-bottom: 0;
}

.ops-traffic-native .ops-media-chart-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.ops-traffic-native .ops-media-chart-card > h3 {
  flex: 0 0 auto;
}

.ops-traffic-native .ops-media-chart-wrap {
  flex: 1 1 auto;
  height: auto;
  min-height: clamp(340px, 34vw, 520px);
  max-height: none;
}

.ops-traffic-native .ops-media-chart-wrap canvas {
  max-height: none;
}

@media (max-width: 900px) {
  .ops-traffic-native .ops-media-chart-wrap {
    min-height: 300px;
  }
}
</style>
