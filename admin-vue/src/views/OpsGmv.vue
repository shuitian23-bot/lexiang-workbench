<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">GMV 分析</div>
        <div class="page-desc">整体趋势 · 分业务 · 官网/非官网 · 业务GMV=登录口径+平台交易回算 · 口径同日报指标定义</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="ops-time-filter">
          <div class="dash-filter-bar">
            <button
              v-for="v in timeRanges"
              :key="v.value"
              class="dash-pill"
              :class="{ active: gmvRange === v.value }"
              @click="setRange(v.value)"
            >{{ v.label }}</button>
          </div>
          <span v-if="gmvRange === 'custom'" class="ops-custom-range">
            <input type="date" class="ops-date-input" v-model="customStart" @change="onCustomChange" />
            <span>至</span>
            <input type="date" class="ops-date-input" v-model="customEnd" @change="onCustomChange" />
          </span>
        </div>
        <button class="btn btn-sm btn-secondary ai-insight-btn" @click="aiInsight">AI 解读</button>
      </div>
    </div>

    <div class="ops-section-title">GMV 核心指标</div>
    <div class="grid-4">
      <div class="ops-kpi highlight">
        <div class="ops-kpi-val">{{ kpi.total }}</div>
        <div class="ops-kpi-label">整体 GMV</div>
        <div class="ops-kpi-sub">购买 {{ kpi.buy }} 人</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.consumer }}</div>
        <div class="ops-kpi-label">消费业务 GMV</div>
        <div class="ops-kpi-sub">购买 {{ kpi.consumerBuy }} 人</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.smb }}</div>
        <div class="ops-kpi-label">SMB 业务 GMV</div>
        <div class="ops-kpi-sub">购买 {{ kpi.smbBuy }} 人</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.gov }}</div>
        <div class="ops-kpi-label">政企业务 GMV</div>
        <div class="ops-kpi-sub">购买 {{ kpi.govBuy }} 人</div>
      </div>
    </div>

    <div class="ops-section-title">GMV 趋势</div>
    <div class="ops-card">
      <div class="dash-filter-bar" style="justify-content:flex-end;margin-bottom:8px">
        <button
          v-for="s in scopeList"
          :key="s.value"
          class="dash-pill"
          :class="{ active: gmvTrendScope === s.value }"
          @click="setScope(s.value)"
        >{{ s.label }}</button>
      </div>
      <div class="chart-wrap">
        <div ref="chartGmvTrend" class="ops-chart"></div>
      </div>
    </div>

    <div class="ops-section-title">分业务 GMV</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>业务GMV占比</h3>
        <div class="chart-wrap-sm">
          <div ref="chartBizPie" class="ops-chart"></div>
        </div>
      </div>
      <div class="ops-card">
        <div class="ops-card-head">
          <h3>业务贡献明细</h3>
          <div class="dash-card-note">登录口径 + 平台交易回算 · 口径同日报</div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align:left">业务</th>
              <th>GMV</th><th>登录口径</th><th>平台回算</th><th>购买人数</th><th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in bizTableRows" :key="r.name">
              <td style="text-align:left;font-weight:500">
                <span class="ops-dot" :style="{ background: r.color }"></span>{{ r.name }}
              </td>
              <td>{{ r.gmvFmt }}</td>
              <td>{{ r.loginGmvFmt }}</td>
              <td>{{ r.platformGmvFmt }}</td>
              <td>{{ r.buyFmt }}</td>
              <td>{{ r.pct }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">分平台 GMV（官网/非官网）</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>官网 vs 非官网</h3>
        <div class="chart-wrap-sm">
          <div ref="chartPlatformPie" class="ops-chart"></div>
        </div>
      </div>
      <div class="ops-card">
        <h3>平台趋势</h3>
        <div class="chart-wrap">
          <div ref="chartPlatformTrend" class="ops-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

const OPS_CHART_COLORS = {
  blue: '#3f78c5', teal: '#3f9ead', green: '#58a86a', amber: '#c89532',
  purple: '#9070c3', rose: '#b45f86', gray: '#6f879e', dark: '#4f6578'
}

// ---- 状态 ----
const gmvRange = ref('30d')
const gmvTrendScope = ref('all')
const customStart = ref('')
const customEnd = ref('')

const timeRanges = [
  { value: '1d', label: '今日' }, { value: '7d', label: '近7天' },
  { value: '14d', label: '近14天' }, { value: '30d', label: '近30天' },
  { value: 'custom', label: '自定义' }
]
const scopeList = [
  { value: 'all', label: '整体' }, { value: 'consumer', label: '消费' },
  { value: 'smb', label: 'SMB' }, { value: 'gov', label: '政企' }
]
const bizColors = [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple]

// ---- chart refs ----
const chartGmvTrend = ref(null)
const chartBizPie = ref(null)
const chartPlatformPie = ref(null)
const chartPlatformTrend = ref(null)

let _charts = {}

// ---- 数据辅助 ----
function getData() { return typeof window.leaiGetData === 'function' ? window.leaiGetData() : null }

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
  return { gmv: 0, buy: 0, offGmv: 0, offBuy: 0, nonGmv: 0, nonBuy: 0 }
}

function getBizTrade(rows) {
  const L = getData()
  if (!L) return [{ gmv: 0, buy: 0 }, { gmv: 0, buy: 0 }, { gmv: 0, buy: 0 }]
  if (typeof window.leaiBizTradeSummaries === 'function') return window.leaiBizTradeSummaries(rows)
  const bizData = [L.consumer, L.smb, L.gov]
  return bizData.map(b => {
    if (typeof window.leaiBizSummary === 'function') return window.leaiBizSummary(rows, b)
    const dates = new Set(rows.map(r => r.d))
    const picked = (b || []).filter(r => dates.has(r.d))
    return { gmv: picked.reduce((s, r) => s + (Number(r.gmv) || 0), 0), buy: picked.reduce((s, r) => s + (Number(r.buy) || 0), 0) }
  })
}

function fmtY(v) {
  if (typeof window.leaiFmtY === 'function') return window.leaiFmtY(v)
  const n = Number(v) || 0
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}

function fmtPct(part, total) {
  if (typeof window.leaiFmtPct === 'function') return window.leaiFmtPct(part, total)
  return total ? (part / total * 100).toFixed(1) + '%' : '-'
}

// ---- KPI ----
const kpi = reactive({
  total: '-', buy: '-', consumer: '-', consumerBuy: '-',
  smb: '-', smbBuy: '-', gov: '-', govBuy: '-'
})

// ---- 业务表格行 ----
const bizTableRows = ref([])

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
  const echarts = window.echarts
  if (!echarts) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary)">图表库加载中</div>'
    return
  }
  const key = el.dataset.key || (el.dataset.key = Math.random())
  if (_charts[key]) { try { _charts[key].dispose() } catch (_) {} }
  const chart = echarts.init(el)
  _charts[key] = chart

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
    option = {
      color: palette.length ? palette : [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.green, OPS_CHART_COLORS.purple, OPS_CHART_COLORS.amber],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
      grid: { left: horizontal ? 92 : 46, right: 18, top: 36, bottom: 28, containLabel: true },
      xAxis: horizontal
        ? { type: 'value', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } }
        : { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' }, axisTick: { alignWithLabel: true } },
      yAxis: horizontal
        ? { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#6b7280' } }
        : { type: 'value', min: 0, axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: datasets.map(d => ({
        name: d.label, type: type === 'line' ? 'line' : 'bar',
        data: (d.data || []).map(v => Number(v) || 0),
        smooth: type === 'line',
        areaStyle: type === 'line' && d.fill ? { opacity: 0.12 } : undefined,
        lineStyle: d.borderColor ? { color: d.borderColor, width: 2 } : undefined,
        itemStyle: { color: d.borderColor || d.backgroundColor },
        barMaxWidth: 26
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

  const range = gmvRange.value
  const rows = getRows(range, L.daily, customStart.value, customEnd.value)
  const days = rows.map(r => r.d)
  const summary = getSummary(range, customStart.value, customEnd.value)
  const bizNames = ['消费', 'SMB', '政企']
  const bizKeys = ['consumer', 'smb', 'gov']
  const bizData = [L.consumer, L.smb, L.gov]
  const bizTrade = getBizTrade(rows)
  const bizGmv = bizTrade.map(b => b.gmv)
  const bizBuy = bizTrade.map(b => b.buy)

  // KPI
  kpi.total = fmtY(summary.gmv)
  kpi.buy = (summary.buy || 0).toLocaleString()
  kpi.consumer = fmtY(bizGmv[0])
  kpi.smb = fmtY(bizGmv[1])
  kpi.gov = fmtY(bizGmv[2])
  kpi.consumerBuy = bizBuy[0].toLocaleString()
  kpi.smbBuy = bizBuy[1].toLocaleString()
  kpi.govBuy = bizBuy[2].toLocaleString()

  // 业务表格
  bizTableRows.value = bizNames.map((name, i) => ({
    name, color: bizColors[i],
    gmvFmt: fmtY(bizGmv[i]),
    loginGmvFmt: fmtY(bizTrade[i]?.loginGmv ?? bizGmv[i]),
    platformGmvFmt: fmtY(bizTrade[i]?.platformGmv ?? 0),
    buyFmt: bizBuy[i].toLocaleString(),
    pct: fmtPct(bizGmv[i], summary.gmv)
  }))

  // GMV 趋势
  let trendSets
  if (gmvTrendScope.value === 'all') {
    trendSets = [{ label: '整体GMV', data: rows.map(r => r.gmv), borderColor: OPS_CHART_COLORS.blue, backgroundColor: 'rgba(63,120,197,0.12)', fill: true }]
  } else {
    const idx = bizKeys.indexOf(gmvTrendScope.value)
    trendSets = [{ label: bizNames[idx] + 'GMV', data: rows.map(r => {
      const dayTrade = getBizTrade([r])
      return dayTrade[idx]?.gmv || 0
    }), borderColor: bizColors[idx], backgroundColor: bizColors[idx] + '22', fill: true }]
  }
  makeChart(chartGmvTrend.value, 'line', days, trendSets)

  // 业务占比
  makeChart(chartBizPie.value, 'doughnut', bizNames, [{ data: bizGmv, backgroundColor: bizColors }])

  // 平台占比
  makeChart(chartPlatformPie.value, 'doughnut', ['官网', '非官网'], [{
    data: [summary.offGmv, summary.nonGmv], backgroundColor: [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.gray]
  }])

  // 平台趋势
  makeChart(chartPlatformTrend.value, 'line', days, [
    { label: '官网', data: rows.map(r => r.offGmv), borderColor: OPS_CHART_COLORS.blue, fill: false },
    { label: '非官网', data: rows.map(r => r.nonGmv), borderColor: OPS_CHART_COLORS.gray, fill: false }
  ])
}

// ---- 事件 ----
function setRange(val) {
  gmvRange.value = val
  renderCharts()
}

function setScope(val) {
  gmvTrendScope.value = val
  renderCharts()
}

function onCustomChange() {
  if (customStart.value && customEnd.value) renderCharts()
}

function aiInsight() {
  if (typeof window.aiQuick === 'function') {
    window.aiQuick('基于当前GMV分析看板，分析GMV趋势、分业务贡献、平台结构、风险和优先动作。')
  }
}

function handleResize() {
  Object.values(_charts).forEach(c => { if (c && typeof c.resize === 'function') c.resize() })
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
.ops-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
