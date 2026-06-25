<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">Query 业务分析</div>
        <div class="page-desc">按业务维度分析Query，重点分析政企相关场景</div>
      </div>
      <div class="ops-time-filter">
        <div class="dash-filter-bar">
          <button
            v-for="v in timeRanges"
            :key="v.value"
            class="dash-pill"
            :class="{ active: qbizRange === v.value }"
            @click="setRange(v.value)"
          >{{ v.label }}</button>
        </div>
        <span v-if="qbizRange === 'custom'" class="ops-custom-range">
          <input type="date" class="ops-date-input" v-model="customStart" @change="onCustomChange" />
          <span>至</span>
          <input type="date" class="ops-date-input" v-model="customEnd" @change="onCustomChange" />
        </span>
      </div>
    </div>

    <div class="ops-section-title">📊 业务维度 Query 概览</div>
    <div class="grid-4">
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.total }}</div>
        <div class="ops-kpi-label">总Query数</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.consumer }}</div>
        <div class="ops-kpi-label">消费业务Query</div>
      </div>
      <div class="ops-kpi">
        <div class="ops-kpi-val">{{ kpi.smb }}</div>
        <div class="ops-kpi-label">SMB业务Query</div>
      </div>
      <div class="ops-kpi" :style="{ borderColor: purple }">
        <div class="ops-kpi-val" :style="{ color: purple }">{{ kpi.gov }}</div>
        <div class="ops-kpi-label">政企业务Query</div>
      </div>
    </div>

    <div class="ops-section-title">🏛️ 政企 Query 深度分析</div>
    <div class="ops-card" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-color:#c4b5fd">
      <h3 style="color:#6d28d9">政企Query四象限分析</h3>
      <div class="ops-gov-matrix">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              <th style="background:#f5f3ff">政企问题</th>
              <th style="background:#fef3c7">非政企问题</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600;background:#f5f3ff">政企客群</td>
              <td>
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">政企用户问政企问题</div>
                </div>
              </td>
              <td>
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">政企用户问非政企问题</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-weight:600;background:#fef3c7">非政企客群</td>
              <td>
                <div class="ops-q-cell">
                  <div class="ops-q-cell-val">-</div>
                  <div class="ops-q-cell-desc">非政企用户问政企问题</div>
                </div>
              </td>
              <td style="color:var(--text-tertiary);text-align:center">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ops-section-title">📋 政企答复分析</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>包含政企内容的答复（政企客群）</h3>
        <div class="ops-placeholder">
          <div>待数据接入后展示</div>
          <div class="ops-placeholder-desc">统计政企客群收到的包含政企内容的答复数量及占比</div>
        </div>
      </div>
      <div class="ops-card">
        <h3>包含政企内容的答复（非政企客群）</h3>
        <div class="ops-placeholder">
          <div>待数据接入后展示</div>
          <div class="ops-placeholder-desc">统计非政企客群收到的包含政企内容的答复数量及占比</div>
        </div>
      </div>
    </div>

    <div class="ops-section-title">📈 业务Query趋势</div>
    <div class="ops-card">
      <div class="chart-wrap">
        <div ref="chartBizTrend" class="ops-chart"></div>
      </div>
    </div>

    <div class="ops-section-title">🔍 业务Query分类详情</div>
    <div class="grid-2">
      <div class="ops-card">
        <h3>各业务Query占比</h3>
        <div class="chart-wrap-sm">
          <div ref="chartBizPie" class="ops-chart"></div>
        </div>
      </div>
      <div class="ops-card">
        <h3>政企子场景分布</h3>
        <div class="chart-wrap">
          <div ref="chartGovSub" class="ops-chart"></div>
        </div>
      </div>
    </div>

    <div class="ops-note">
      💡 业务Query分类依赖用户画像标签（客群识别）和Query意图分类引擎。当前为结构展示，数据就位后自动对接。
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

const OPS_CHART_COLORS = {
  blue: '#3f78c5', amber: '#c89532', purple: '#9070c3'
}
const purple = OPS_CHART_COLORS.purple

// ---- 状态 ----
const qbizRange = ref('30d')
const customStart = ref('')
const customEnd = ref('')

const timeRanges = [
  { value: '1d', label: '今日' }, { value: '7d', label: '近7天' },
  { value: '14d', label: '近14天' }, { value: '30d', label: '近30天' },
  { value: 'custom', label: '自定义' }
]

// ---- chart refs ----
const chartBizTrend = ref(null)
const chartBizPie = ref(null)
const chartGovSub = ref(null)

let _charts = {}

// ---- KPI ----
const kpi = reactive({ total: '-', consumer: '-', smb: '-', gov: '-' })

// ---- 数据辅助 ----
function getData() { return typeof window.leaiGetData === 'function' ? window.leaiGetData() : null }

function fmtW(v) {
  if (typeof window.leaiFmtW === 'function') return window.leaiFmtW(v)
  const n = Number(v) || 0
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString()
}

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
      color: palette.length ? palette : [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { fontSize: 11, color: '#6b7280' } },
      grid: { left: horizontal ? 80 : 46, right: 18, top: 36, bottom: 28, containLabel: true },
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

  const days = L.daily.map(r => r.d)
  const bizNames = ['消费', 'SMB', '政企']
  const bizData = [L.consumer, L.smb, L.gov]

  // 业务趋势（用互动用户数作为Query量近似）
  makeChart(chartBizTrend.value, 'line', days, bizNames.map((b, i) => ({
    label: b, data: (bizData[i] || []).map(r => r.inter),
    borderColor: [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple][i], fill: false
  })))

  // KPI（用最新一日互动数）
  const latestInter = bizData.map(b => (b || [])[b.length - 1]?.inter || 0)
  const totalInter = latestInter.reduce((s, v) => s + v, 0)
  kpi.total = fmtW(totalInter)
  kpi.consumer = fmtW(latestInter[0])
  kpi.smb = fmtW(latestInter[1])
  kpi.gov = fmtW(latestInter[2])

  // 业务占比
  makeChart(chartBizPie.value, 'doughnut', bizNames, [{
    data: latestInter, backgroundColor: [OPS_CHART_COLORS.blue, OPS_CHART_COLORS.amber, OPS_CHART_COLORS.purple]
  }])

  // 政企子场景（暂用固定占位数据）
  const govSubs = ['产品咨询', '采购/报价', '售后支持', '批量定制', '政策/补贴', '其他']
  makeChart(chartGovSub.value, 'bar', govSubs, [{
    label: '互动数(占位)', data: [15, 10, 8, 4, 2, 1],
    backgroundColor: OPS_CHART_COLORS.purple
  }], { indexAxis: 'y' })
}

// ---- 事件 ----
function setRange(val) {
  qbizRange.value = val
  renderCharts()
}

function onCustomChange() {
  if (customStart.value && customEnd.value) renderCharts()
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
.ops-placeholder {
  padding: 30px;
  text-align: center;
  color: var(--text-tertiary, #9199a6);
}
.ops-placeholder-desc {
  font-size: 12px;
  margin-top: 8px;
}
.ops-q-cell {
  padding: 8px;
}
.ops-q-cell-val {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #1f2329);
}
.ops-q-cell-desc {
  font-size: 11px;
  color: var(--text-tertiary, #9199a6);
  margin-top: 4px;
}
</style>
