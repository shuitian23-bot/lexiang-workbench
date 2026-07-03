<template>
  <div class="ops-gmv-native" v-html="gmvHtml"></div>
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
  fmtPct,
  fmtY,
  rangeLabel,
  rowIso,
  rowsForRange,
  sumRows
} from './opsData'

declare global {
  interface Window {
    opsAskGmv?: (kind: string) => void
    opsCustomTimeChanged?: (id: string, part: string, value: string) => void
    opsSetGmvTrendScope?: (scope: GmvScope) => void
    opsTimeChanged?: (id: string, value: OpsRangeKey) => void
  }
}

type EChartsRuntime = typeof import('echarts')
type GmvScope = 'all' | 'consumer' | 'smb' | 'gov'
type GmvChart = ECharts

const appStore = useAppStore()
const aiStore = useAIStore()
let echartsRuntime: EChartsRuntime | null = null
const range = ref<OpsRangeKey>('30d')
const customStart = ref(rowIso(OPS_ROWS[0].d))
const customEnd = ref(rowIso(OPS_ROWS[OPS_ROWS.length - 1].d))
const trendScope = ref<GmvScope>('all')
const gmvHtml = ref(buildGmvHtml())
const charts: GmvChart[] = []

const bizConfigs = [
  { name: '消费', key: 'consumer' as const, color: OPS_CHART_COLORS.blue, weight: 0.66 },
  { name: 'SMB', key: 'smb' as const, color: OPS_CHART_COLORS.amber, weight: 0.30 },
  { name: '政企', key: 'gov' as const, color: OPS_CHART_COLORS.purple, weight: 0.04 }
]

onMounted(async () => {
  appStore.ensureStaticTab('ops.gmv')
  appStore.setActiveStaticTab('ops.gmv')
  document.title = 'GMV 分析 - 乐享 AI 工作台'
  installGmvHandlers()
  echartsRuntime = await import('echarts')
  await nextTick()
  renderGmv()
})

onBeforeUnmount(() => {
  disposeCharts()
  delete window.opsAskGmv
  delete window.opsCustomTimeChanged
  delete window.opsSetGmvTrendScope
  delete window.opsTimeChanged
})

function buildGmvHtml() {
  return `
    <div class="page-header">
      <div><div class="page-title">GMV 分析</div><div class="page-desc">整体趋势 · 分业务 · 官网/非官网 · 业务GMV=登录口径+平台交易回算 · 口径同日报指标定义</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        ${timeFilterHtml()}
        <button class="btn btn-sm btn-secondary ai-insight-btn" onclick="opsAskGmv('overview')">AI 解读</button>
      </div>
    </div>
    <div class="ops-section-title">GMV 核心指标</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-val" id="ops-g-total">-</div><div class="ops-kpi-label">整体 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-consumer">-</div><div class="ops-kpi-label">消费业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-consumer-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-smb">-</div><div class="ops-kpi-label">SMB 业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-smb-buy">-</span>人</div></div>
      <div class="ops-kpi"><div class="ops-kpi-val" id="ops-g-gov">-</div><div class="ops-kpi-label">政企业务 GMV</div><div class="ops-kpi-sub">购买 <span id="ops-g-gov-buy">-</span>人</div></div>
    </div>

    <div class="ops-section-title">GMV 趋势</div>
    <div class="ops-card">
      <div class="dash-filter-bar" style="justify-content:flex-end;margin-bottom:8px">
        <button class="dash-pill" id="gmv-scope-all" onclick="opsSetGmvTrendScope('all')">整体</button>
        <button class="dash-pill" id="gmv-scope-consumer" onclick="opsSetGmvTrendScope('consumer')">消费</button>
        <button class="dash-pill" id="gmv-scope-smb" onclick="opsSetGmvTrendScope('smb')">SMB</button>
        <button class="dash-pill" id="gmv-scope-gov" onclick="opsSetGmvTrendScope('gov')">政企</button>
      </div>
      <div class="chart-wrap"><div id="ops-g-trend-chart" class="ops-chart"></div></div>
    </div>

    <div class="ops-section-title">分业务 GMV</div>
    <div class="grid-2">
      <div class="ops-card"><h3>业务GMV占比</h3><div class="chart-wrap-sm"><div id="ops-g-biz-pie" class="ops-chart"></div></div></div>
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>业务贡献明细</h3>
          <div class="dash-card-note">登录口径 + 平台交易回算 · 口径同日报</div>
        </div>
        <table class="data-table">
          <thead><tr><th style="text-align:left">业务</th><th>GMV</th><th>登录口径</th><th>平台回算</th><th>购买人数</th><th>占比</th></tr></thead>
          <tbody id="ops-g-biz-table"></tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">分平台 GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card"><h3>官网 vs 非官网</h3><div class="chart-wrap-sm"><div id="ops-g-platform-chart" class="ops-chart"></div></div></div>
      <div class="ops-card"><h3>平台趋势</h3><div class="chart-wrap"><div id="ops-g-platform-trend" class="ops-chart"></div></div></div>
    </div>
  `
}

function timeFilterHtml() {
  const customFilter = range.value === 'custom'
    ? `<span class="ops-custom-range">
      <input type="date" class="ops-date-input" min="${rowIso(OPS_ROWS[0].d)}" max="${rowIso(OPS_ROWS[OPS_ROWS.length - 1].d)}" value="${customStart.value}" onchange="opsCustomTimeChanged('gmv-time','start',this.value)">
      <span>至</span>
      <input type="date" class="ops-date-input" min="${rowIso(OPS_ROWS[0].d)}" max="${rowIso(OPS_ROWS[OPS_ROWS.length - 1].d)}" value="${customEnd.value}" onchange="opsCustomTimeChanged('gmv-time','end',this.value)">
    </span>` : ''
  return `<div class="ops-time-filter" id="gmv-time">
    <div class="dash-filter-bar">
      ${(['1d', '7d', '14d', '30d', 'custom'] as OpsRangeKey[]).map(value => `<button class="dash-pill ${range.value === value ? 'active' : ''}" onclick="opsTimeChanged('gmv-time','${value}')">${rangeLabel(value)}</button>`).join('')}
    </div>
    ${customFilter}
    <span class="ops-date-range" id="gmv-time-range"></span>
  </div>`
}

function installGmvHandlers() {
  window.opsTimeChanged = async (_id, value) => {
    range.value = value
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
  window.opsSetGmvTrendScope = async (scope) => {
    trendScope.value = scope
    renderGmv()
  }
  window.opsAskGmv = () => {
    aiStore.toggleOpen(true)
    aiStore.quickSend('基于当前GMV分析看板，分析GMV趋势、分业务贡献、平台结构、风险和优先动作。', 'ops.gmv')
  }
}

async function rerender() {
  gmvHtml.value = buildGmvHtml()
  await nextTick()
  renderGmv()
}

function renderGmv() {
  disposeCharts()
  const rows = rowsForRange(OPS_ROWS, range.value, customStart.value, customEnd.value)
  const days = rows.map(row => row.d)
  const summary = {
    gmv: sumRows(rows, 'gmv'),
    buy: sumRows(rows, 'buy'),
    offGmv: sumRows(rows, 'offGmv'),
    nonGmv: sumRows(rows, 'nonGmv'),
    offBuy: sumRows(rows, 'offBuy'),
    nonBuy: sumRows(rows, 'nonBuy')
  }
  const bizRows = buildBizRows(summary.gmv, summary.buy)

  text('ops-g-total', fmtY(summary.gmv))
  text('ops-g-buy', summary.buy.toLocaleString())
  text('ops-g-consumer', fmtY(bizRows[0].value))
  text('ops-g-smb', fmtY(bizRows[1].value))
  text('ops-g-gov', fmtY(bizRows[2].value))
  text('ops-g-consumer-buy', bizRows[0].buy.toLocaleString())
  text('ops-g-smb-buy', bizRows[1].buy.toLocaleString())
  text('ops-g-gov-buy', bizRows[2].buy.toLocaleString())

  ;(['all', 'consumer', 'smb', 'gov'] as GmvScope[]).forEach(scope => {
    document.getElementById(`gmv-scope-${scope}`)?.classList.toggle('active', trendScope.value === scope)
  })

  renderLine('ops-g-trend-chart', days, trendSeries(rows))
  renderDonut('ops-g-biz-pie', bizRows.map(row => ({ name: row.name, value: row.value, color: row.color })))
  renderBizTable(bizRows, summary.gmv)
  renderDonut('ops-g-platform-chart', [
    { name: '官网', value: summary.offGmv, color: OPS_CHART_COLORS.blue },
    { name: '非官网', value: summary.nonGmv, color: OPS_CHART_COLORS.slate }
  ])
  renderLine('ops-g-platform-trend', days, [
    { name: '官网', data: rows.map(row => row.offGmv), color: OPS_CHART_COLORS.blue },
    { name: '非官网', data: rows.map(row => row.nonGmv), color: OPS_CHART_COLORS.slate }
  ])
}

function buildBizRows(totalGmv: number, totalBuy: number) {
  return bizConfigs.map(config => {
    const value = Math.round(totalGmv * config.weight)
    const buy = Math.round(totalBuy * config.weight)
    const loginGmv = Math.round(value * 0.72)
    return { ...config, value, buy, loginGmv, platformGmv: value - loginGmv }
  })
}

function trendSeries(rows: OpsRow[]) {
  if (trendScope.value === 'all') {
    return [{ name: '整体GMV', data: rows.map(row => row.gmv), color: OPS_CHART_COLORS.blue, fill: true }]
  }
  const config = bizConfigs.find(item => item.key === trendScope.value) || bizConfigs[0]
  return [{
    name: `${config.name}GMV`,
    data: rows.map(row => Math.round(row.gmv * config.weight)),
    color: config.color,
    fill: true
  }]
}

function renderBizTable(rows: ReturnType<typeof buildBizRows>, totalGmv: number) {
  const table = document.getElementById('ops-g-biz-table')
  if (!table) return
  table.innerHTML = rows.map(row => `<tr>
    <td style="text-align:left;font-weight:500"><span class="ops-dot" style="background:${row.color}"></span>${row.name}</td>
    <td>${fmtY(row.value)}</td>
    <td>${fmtY(row.loginGmv)}</td>
    <td>${fmtY(row.platformGmv)}</td>
    <td>${row.buy.toLocaleString()}</td>
    <td>${fmtPct(row.value, totalGmv)}</td>
  </tr>`).join('')
}

function renderLine(id: string, labels: string[], series: Array<{ name: string; data: number[]; color: string; fill?: boolean }>) {
  const chart = initChart(id)
  if (!chart) return
  chart.setOption({
    ...chartMotion(),
    color: series.map(item => item.color),
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
    grid: { left: 46, right: 18, top: 36, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' }, axisTick: { alignWithLabel: true } },
    yAxis: { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: series.map(item => ({
      name: item.name,
      type: 'line',
      smooth: true,
      data: item.data,
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
  while (charts.length) charts.pop()?.dispose()
}

function text(id: string, value: string) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}
</script>
