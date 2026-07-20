<template>
  <article ref="reportRoot" class="skill-data-dashboard">
    <section class="dashboard-kpis" aria-label="核心指标">
      <article
        v-for="(metric, index) in primaryMetrics"
        :key="metric.label"
        :class="['dashboard-kpi', { 'dashboard-kpi-primary': index === 0 }]"
      >
        <div class="dashboard-kpi-head">
          <span>{{ metric.label }}</span>
          <i aria-hidden="true">{{ metric.symbol }}</i>
        </div>
        <b>{{ metric.value }}<small v-if="metric.unit">{{ metric.unit }}</small></b>
        <p>{{ metric.note }}</p>
      </article>
    </section>

    <section class="data-trust-strip" aria-label="数据口径与完整性">
      <div class="data-trust-title">
        <span>口径校验</span>
        <b>本报告以 LenovoID 去重后数据为准</b>
      </div>
      <div><span>原始记录</span><b>{{ formatNumber(report.truth.rawRecords) }}</b></div>
      <div><span>识别重复</span><b>{{ formatNumber(report.truth.duplicateRecords) }}</b><small>涉及 {{ formatNumber(report.truth.duplicateUsers) }} 人</small></div>
      <div><span>独立用户</span><b>{{ formatNumber(report.truth.uniqueUsers) }}</b></div>
      <div><span>时段字段覆盖</span><b>{{ timeCoverage }}</b><small>{{ formatNumber(missingTimeUsers) }} 人待补齐</small></div>
    </section>

    <section class="dashboard-group" aria-labelledby="analysis-heading">
      <div class="dashboard-group-heading">
        <h2 id="analysis-heading">分析摘要</h2>
        <p>由原始数据计算的趋势差异、转化效率与结构集中度</p>
      </div>
      <div class="diagnostic-grid">
        <article v-for="item in diagnosticCards" :key="item.label" :class="`diagnostic-${item.tone}`">
          <div><span>{{ item.label }}</span><b>{{ item.value }}</b></div>
          <div class="diagnostic-meter"><i :style="{ width: `${item.score}%` }"></i></div>
          <p>{{ item.conclusion }}</p>
          <small>{{ item.evidence }}</small>
        </article>
      </div>
    </section>

    <section class="dashboard-section trend-section">
      <div class="dashboard-section-heading">
        <div>
          <h2>时间趋势</h2>
          <p>{{ trendSummary }}</p>
        </div>
        <div class="trend-heading-meta">
          <span>{{ report.dateStart }} 至 {{ report.dateEnd }}</span>
          <span class="trend-legend"><i></i>工作日 <i></i>周末</span>
        </div>
      </div>
      <div ref="trendChartEl" class="dashboard-chart chart-trend" aria-label="每日新增认证用户柱状图"></div>
    </section>

    <section class="dashboard-group analysis-loop-section" aria-labelledby="loop-heading">
      <div class="dashboard-group-heading">
        <h2 id="loop-heading">数据发现闭环</h2>
        <p>每个突出数字都连接到判断、建议动作和可量化的复验指标</p>
      </div>
      <div class="analysis-loop-list">
        <article v-for="(item, index) in analysisLoops" :key="item.signal" :class="`loop-${item.tone}`">
          <span class="loop-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="loop-node loop-signal">
            <span>数据发现</span>
            <b>{{ item.signal }}</b>
            <p>{{ item.evidence }}</p>
          </div>
          <div class="loop-node">
            <span>分析判断</span>
            <p>{{ item.judgement }}</p>
          </div>
          <div class="loop-node">
            <span>建议动作</span>
            <p>{{ item.action }}</p>
          </div>
          <div class="loop-node loop-validation">
            <span>复验指标</span>
            <p>{{ item.validation }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="dashboard-group" aria-labelledby="profile-heading">
      <div class="dashboard-group-heading">
        <h2 id="profile-heading">用户基础画像</h2>
        <p>认证方式、行业与岗位结构</p>
      </div>
      <div class="profile-grid">
        <article class="dashboard-panel method-panel">
          <div class="panel-title">
            <div><h3>认证方式分布</h3><p>{{ methodSummary }}</p></div>
          </div>
          <div ref="methodChartEl" class="dashboard-chart chart-profile" aria-label="认证方式环形图"></div>
        </article>

        <article class="dashboard-panel industry-panel">
          <div class="panel-title">
            <div><h3>行业 Top 10</h3><p>{{ industrySummary }}</p></div>
          </div>
          <div ref="industryChartEl" class="dashboard-chart chart-profile" aria-label="行业 Top10 条形图"></div>
        </article>

        <article class="dashboard-panel role-panel">
          <div class="panel-title">
            <div><h3>认证岗位分类汇总</h3><p>{{ roleSummary }}</p></div>
          </div>
          <div ref="roleChartEl" class="dashboard-chart chart-profile" aria-label="认证岗位分类条形图"></div>
        </article>
      </div>
    </section>

    <section class="dashboard-group" aria-labelledby="behavior-heading">
      <div class="dashboard-group-heading">
        <h2 id="behavior-heading">认证行为与转化</h2>
        <p>从原始记录、认证时段到购买结果</p>
      </div>
      <div class="behavior-grid">
        <article class="dashboard-panel time-panel">
          <div class="panel-title">
            <div><h3>认证时段分布</h3><p>14-22 时是认证主力窗口</p></div>
            <span>人数</span>
          </div>
          <div ref="timeChartEl" class="dashboard-chart chart-behavior" aria-label="认证时段分布条形图"></div>
        </article>

        <article class="dashboard-panel conversion-panel">
          <div class="panel-title">
            <div><h3>认证购买转化</h3><p>按 LenovoID 去重后计算</p></div>
          </div>
          <div class="conversion-funnel">
            <div class="funnel-row funnel-raw">
              <span>原始认证记录</span><b>{{ formatNumber(report.truth.rawRecords) }}</b>
            </div>
            <div class="funnel-row funnel-verified">
              <span>独立认证用户</span><b>{{ formatNumber(report.truth.uniqueUsers) }}</b>
            </div>
            <div class="funnel-row funnel-purchased">
              <span>已购用户</span><b>{{ purchasedUsers }}</b>
            </div>
          </div>
          <div class="conversion-stats">
            <div><span>去重记录</span><b>{{ formatNumber(report.truth.duplicateRecords) }}</b></div>
            <div><span>购买转化率</span><b>{{ conversionRate }}</b></div>
            <div><span>认证未购</span><b>{{ unpurchasedUsers }}</b></div>
          </div>
        </article>
      </div>
    </section>

    <section class="dashboard-group" aria-labelledby="product-heading">
      <div class="dashboard-group-heading">
        <h2 id="product-heading">商品购买转化</h2>
        <p>认证已购用户的 Top10 商品偏好</p>
      </div>
      <div class="product-grid">
        <article class="dashboard-panel product-chart-panel">
          <div class="panel-title">
            <div><h3>Top10 商品购买人数</h3><p>按购买用户去重排序</p></div>
            <span>人数</span>
          </div>
          <div ref="productChartEl" class="dashboard-chart chart-product" aria-label="Top10 商品购买人数条形图"></div>
        </article>

        <article class="dashboard-panel product-table-panel">
          <div class="panel-title">
            <div><h3>商品转化明细</h3><p>购买人数与已购用户占比</p></div>
          </div>
          <div class="product-table-scroll">
            <table>
              <thead><tr><th>排名</th><th>商品</th><th>购买人数</th><th>占比</th></tr></thead>
              <tbody>
                <tr v-for="(item, index) in report.products" :key="item.label">
                  <td>{{ String(index + 1).padStart(2, '0') }}</td>
                  <td>{{ item.label }}</td>
                  <td>{{ item.value }}</td>
                  <td>{{ item.share }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>

    <section class="dashboard-insights" aria-labelledby="insight-heading">
      <div class="dashboard-group-heading">
        <h2 id="insight-heading">数据洞察</h2>
        <p>从上方指标与图表中提取的关键结论</p>
      </div>
      <div class="insight-grid">
        <article v-for="(insight, index) in visibleInsights" :key="insight.title">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <div><h3>{{ insight.title }}</h3><p>{{ insight.evidence.join('；') }}</p></div>
        </article>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'
import type { SkillApplicationReportData } from '@/stores/app'

const props = defineProps<{ report: SkillApplicationReportData }>()

type EChartsRuntime = typeof import('echarts')

const reportRoot = ref<HTMLElement | null>(null)
const trendChartEl = ref<HTMLElement | null>(null)
const methodChartEl = ref<HTMLElement | null>(null)
const industryChartEl = ref<HTMLElement | null>(null)
const roleChartEl = ref<HTMLElement | null>(null)
const timeChartEl = ref<HTMLElement | null>(null)
const productChartEl = ref<HTMLElement | null>(null)
const charts: ECharts[] = []
let echartsRuntime: EChartsRuntime | null = null
let resizeObserver: ResizeObserver | null = null

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
  neutral: '#aeb8c8',
  danger: '#d94b4b'
}

const CHART_PALETTE = [
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

const CHART_LEGEND = {
  bottom: 6,
  itemWidth: 18,
  itemHeight: 8,
  itemGap: 16,
  padding: [8, 0, 0, 0],
  textStyle: { color: '#646a73', fontSize: 10, lineHeight: 14 }
}

const purchasedUsers = computed(() => metricText('已购用户'))
const conversionRate = computed(() => metricText('认证购买转化率'))
const unpurchasedUsers = computed(() => metricText('认证未购池'))
const totalGmv = computed(() => metricNumber('总 GMV'))
const averageOrderValue = computed(() => metricNumber('平均客单价'))
const purchasedUserCount = computed(() => metricNumber('已购用户'))
const unpurchasedUserCount = computed(() => metricNumber('认证未购池'))
const orderCount = computed(() => Number(metricNote('已购用户').replace(/[^\d]/g, '')) || 0)
const visibleInsights = computed(() => props.report.insights.filter(item => !item.action).slice(0, 4))

const dailyAverage = computed(() => average(props.report.dailyTrend.map(item => item.value)))
const weekendAverage = computed(() => average(props.report.dailyTrend
  .filter(item => isWeekend(item.date))
  .map(item => item.value)))
const weekdayAverage = computed(() => average(props.report.dailyTrend
  .filter(item => !isWeekend(item.date))
  .map(item => item.value)))
const weekendLift = computed(() => weekdayAverage.value
  ? (weekendAverage.value / weekdayAverage.value - 1) * 100
  : 0)
const timeCoveredUsers = computed(() => props.report.timeBuckets.reduce((sum, item) => sum + item.value, 0))
const missingTimeUsers = computed(() => Math.max(props.report.truth.uniqueUsers - timeCoveredUsers.value, 0))
const timeCoverage = computed(() => props.report.truth.uniqueUsers
  ? `${(timeCoveredUsers.value / props.report.truth.uniqueUsers * 100).toFixed(1)}%`
  : '0.0%')
const roleTop2Share = computed(() => {
  const management = props.report.roles.find(item => item.label === '管理层')?.value || 0
  const engineer = props.report.roles.find(item => item.label === '工程师')?.value || 0
  return props.report.truth.uniqueUsers
    ? (management + engineer) / props.report.truth.uniqueUsers * 100
    : 0
})
const unpurchasedShare = computed(() => props.report.truth.uniqueUsers
  ? unpurchasedUserCount.value / props.report.truth.uniqueUsers * 100
  : 0)
const ordersPerBuyer = computed(() => purchasedUserCount.value
  ? orderCount.value / purchasedUserCount.value
  : 0)
const gmvPerBuyer = computed(() => purchasedUserCount.value
  ? totalGmv.value / purchasedUserCount.value
  : 0)
const diagnosticCards = computed(() => [
  {
    label: '周末认证强度',
    value: `${weekendLift.value >= 0 ? '+' : ''}${weekendLift.value.toFixed(1)}%`,
    score: clamp(Math.abs(weekendLift.value), 8, 100),
    tone: 'blue',
    conclusion: '周末日均认证明显高于工作日，呈现集中提交特征。',
    evidence: `周末日均 ${weekendAverage.value.toFixed(1)} 人 · 工作日日均 ${weekdayAverage.value.toFixed(1)} 人`
  },
  {
    label: '购买转化效率',
    value: conversionRate.value,
    score: clamp(metricNumber('认证购买转化率'), 8, 100),
    tone: 'green',
    conclusion: '过半认证用户已完成购买，认证到交易链路具备稳定承接能力。',
    evidence: `${purchasedUsers.value} / ${formatNumber(props.report.truth.uniqueUsers)} 人 · 人均 ${ordersPerBuyer.value.toFixed(2)} 笔订单`
  },
  {
    label: '主力人群集中度',
    value: `${roleTop2Share.value.toFixed(1)}%`,
    score: clamp(roleTop2Share.value, 8, 100),
    tone: 'purple',
    conclusion: '管理层与工程师占据过半认证人群，适合优先做两类人群下钻。',
    evidence: '管理层 335 人 · 工程师 136 人'
  },
  {
    label: '认证未购机会池',
    value: `${unpurchasedUsers.value} 人`,
    score: clamp(unpurchasedShare.value, 8, 100),
    tone: 'amber',
    conclusion: '未购人群仍占较高比例，是后续召回和商品匹配的主要增量池。',
    evidence: `未购占比 ${unpurchasedShare.value.toFixed(1)}% · 已购用户人均 GMV ¥${formatNumber(Math.round(gmvPerBuyer.value))}`
  }
])

const analysisLoops = computed(() => {
  const sortedTrend = [...props.report.dailyTrend].sort((a, b) => b.value - a.value)
  const peak = sortedTrend[0]
  const mainWindowUsers = props.report.timeBuckets
    .filter(item => item.label.includes('14-18') || item.label.includes('18-22'))
    .reduce((sum, item) => sum + item.value, 0)
  const mainWindowShare = timeCoveredUsers.value
    ? mainWindowUsers / timeCoveredUsers.value * 100
    : 0
  return [
    {
      signal: `${peak?.label || '-'} 峰值 ${peak?.value || 0} 人`,
      evidence: `周末日均比工作日高 ${weekendLift.value.toFixed(1)}%`,
      judgement: '峰值与周末整体抬升同时出现，更像集中提交，不是单日孤立异常。',
      action: '建议在周五完成审核容量和提醒排期，周末以监控与调度为主。',
      validation: '下一周期对比周末日均、峰值日审核时长和待审积压。',
      tone: 'blue'
    },
    {
      signal: `${purchasedUsers.value} 人已购 / ${unpurchasedUsers.value} 人未购`,
      evidence: `认证购买转化率 ${conversionRate.value}，人均 ${ordersPerBuyer.value.toFixed(2)} 笔订单`,
      judgement: '认证后交易承接已过半，但 44.0% 的认证未购人群仍是最明确的增量空间。',
      action: '按只读边界生成未购圈选口径，再按商品偏好拆分召回人群，不直接触达。',
      validation: '复验 7 日/14 日购买转化率、新增 GMV 和已购用户人均订单数。',
      tone: 'green'
    },
    {
      signal: `管理层 + 工程师 ${roleTop2Share.value.toFixed(1)}%`,
      evidence: '管理层 335 人，工程师 136 人',
      judgement: '主力岗位高度集中，但当前只能证明认证规模，不能直接推断购买偏好。',
      action: '先下钻两类岗位的转化率、客单价和 Top 商品，再决定是否分群运营。',
      validation: '对比岗位分层转化率、GMV/人与 Top3 商品差异，无差异则不分群。',
      tone: 'purple'
    },
    {
      signal: `时段覆盖 ${timeCoverage.value}`, 
      evidence: `14-22 时覆盖 ${mainWindowUsers} 人，占已知时段 ${mainWindowShare.toFixed(1)}%`,
      judgement: `主力时段结论基于 ${formatNumber(timeCoveredUsers.value)} 人，仍有 ${formatNumber(missingTimeUsers.value)} 人缺少时段字段。`,
      action: '先补齐或标记缺失字段后重算时段分布；未补齐前始终展示覆盖率。',
      validation: '字段覆盖率达到 99% 以上，且 14-22 时占比复算变化小于 2 个百分点。',
      tone: 'amber'
    }
  ]
})

const primaryMetrics = computed(() => [
  { label: '已认证独立用户', value: formatNumber(props.report.truth.uniqueUsers), note: `${props.report.dayCount} 天累计`, symbol: '人', unit: '' },
  { label: '已购用户', value: purchasedUsers.value, note: `${conversionRate.value} 转化率`, symbol: '购', unit: '' },
  { label: '总 GMV', value: `${Math.round(totalGmv.value / 10_000)}`, note: `${formatNumber(totalGmv.value)} 元`, symbol: '增', unit: '万' },
  { label: '平均客单价', value: formatNumber(averageOrderValue.value), note: '总 GMV ÷ 订单笔数', symbol: '¥', unit: '元' }
])

const trendSummary = computed(() => {
  const sorted = [...props.report.dailyTrend].sort((a, b) => b.value - a.value)
  const peak = sorted[0]
  const secondary = sorted[1]
  const last = props.report.dailyTrend[props.report.dailyTrend.length - 1]
  return `${props.report.dayCount} 天日均 ${dailyAverage.value.toFixed(1)} 人 · ${peak?.label || '-'} 峰值 ${peak?.value || 0} · ${secondary?.label || '-'} 次高 ${secondary?.value || 0} · ${last?.label || '-'} 增量 ${last?.value || 0}`
})

const methodSummary = computed(() => {
  const first = props.report.methods[0]
  return first ? `${first.label} ${first.share} 占主导` : '按独立认证用户统计'
})

const industrySummary = computed(() => {
  const first = props.report.industries[0]
  return first ? `${first.label}，${first.value} 人` : '按认证用户数排序'
})

const roleSummary = computed(() => {
  const management = props.report.roles.find(item => item.label === '管理层')?.value || 0
  const engineer = props.report.roles.find(item => item.label === '工程师')?.value || 0
  const share = props.report.truth.uniqueUsers
    ? ((management + engineer) / props.report.truth.uniqueUsers * 100).toFixed(1)
    : '0.0'
  return `${props.report.roles.reduce((sum, item) => sum + item.value, 0)} 个原始岗位归并为 ${props.report.roles.length} 大类，管理层 + 工程师 ${share}%`
})

onMounted(async () => {
  echartsRuntime = await import('echarts')
  await nextTick()
  renderCharts()
  if (reportRoot.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => charts.forEach(chart => chart.resize()))
    resizeObserver.observe(reportRoot.value)
  }
})

watch(() => props.report, async () => {
  await nextTick()
  renderCharts()
}, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  disposeCharts()
})

function renderCharts() {
  if (!echartsRuntime) return
  disposeCharts()
  createChart(trendChartEl.value, trendOption())
  createChart(methodChartEl.value, methodOption())
  createChart(industryChartEl.value, industryOption())
  createChart(roleChartEl.value, roleOption())
  createChart(timeChartEl.value, timeOption())
  createChart(productChartEl.value, productOption())
}

function createChart(element: HTMLElement | null, option: EChartsOption) {
  if (!element || !echartsRuntime) return
  const chart = echartsRuntime.init(element)
  chart.setOption(option)
  charts.push(chart)
}

function disposeCharts() {
  charts.splice(0).forEach(chart => chart.dispose())
}

function axisTooltip() {
  return {
    trigger: 'axis' as const,
    backgroundColor: '#ffffff',
    borderColor: '#e5e6eb',
    borderWidth: 1,
    textStyle: { color: '#1f2329', fontSize: 12 },
    padding: [9, 11],
    confine: true,
    extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08);border-radius:8px;'
  }
}

function chartMotion() {
  return {
    animation: true,
    animationDuration: 720,
    animationEasing: 'cubicOut' as const,
    animationDurationUpdate: 360,
    animationEasingUpdate: 'cubicOut' as const
  }
}

function trendOption(): EChartsOption {
  const values = props.report.dailyTrend.map(item => item.value)
  const peak = Math.max(...values, 0)
  return {
    ...chartMotion(),
    tooltip: axisTooltip(),
    grid: { left: 54, right: 24, top: 34, bottom: 42 },
    xAxis: {
      type: 'category',
      data: props.report.dailyTrend.map(item => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dee0e3' } },
      axisLabel: { color: '#8f959e', fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'value',
      max: (value: { max: number }) => Math.ceil(value.max / 30) * 30,
      axisLabel: { color: '#8f959e', fontSize: 10 },
      splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }
    },
    series: [{
      name: '新增认证',
      type: 'bar',
      barMaxWidth: 48,
      data: values.map((value, index) => ({
        value,
        itemStyle: {
          color: isWeekend(props.report.dailyTrend[index]?.date || '')
            ? chartBarGradient(CHART_COLORS.green)
            : value === peak ? chartBarGradient(CHART_COLORS.blueMid) : chartBarGradient(CHART_COLORS.blue),
          borderRadius: [4, 4, 0, 0]
        }
      })),
      animationDelay: (index: number) => index * 28,
      emphasis: { focus: 'series' },
      markLine: {
        symbol: 'none',
        silent: true,
        lineStyle: { color: CHART_COLORS.slate, type: 'dashed', width: 1 },
        label: { color: '#646a73', fontSize: 9, position: 'insideEndTop', formatter: `日均 ${dailyAverage.value.toFixed(1)}` },
        data: [{ yAxis: Number(dailyAverage.value.toFixed(1)) }]
      },
      markPoint: {
        symbolSize: 38,
        label: { color: '#ffffff', fontSize: 9, formatter: '{c}' },
        data: [
          { type: 'max', name: '峰值', itemStyle: { color: CHART_COLORS.blueMid } },
          { type: 'min', name: '低点', itemStyle: { color: CHART_COLORS.amber } }
        ]
      }
    }]
  }
}

function methodOption(): EChartsOption {
  return {
    ...chartMotion(),
    color: CHART_PALETTE,
    tooltip: { ...axisTooltip(), trigger: 'item', formatter: '{b}<br/>{c} 人 · {d}%' },
    legend: {
      ...CHART_LEGEND,
      type: 'scroll',
      left: 'center',
      icon: 'roundRect'
    },
    series: [{
      name: '认证方式',
      type: 'pie',
      radius: ['43%', '69%'],
      center: ['50%', '44%'],
      padAngle: 1.5,
      itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 700 } },
      data: props.report.methods.map((item, index) => ({
        name: item.label,
        value: item.value,
        itemStyle: { color: CHART_PALETTE[index % CHART_PALETTE.length] }
      })),
      animationDelay: (index: number) => index * 45
    }]
  }
}

function industryOption(): EChartsOption {
  const items = [...props.report.industries].slice(0, 10).reverse()
  return horizontalBarOption(items, CHART_COLORS.blue, 128, false)
}

function roleOption(): EChartsOption {
  const items = [...props.report.roles].reverse()
  const palette = [
    CHART_COLORS.blueSoft,
    CHART_COLORS.blueSoft,
    CHART_COLORS.blueMid,
    CHART_COLORS.greenSoft,
    CHART_COLORS.slate,
    CHART_COLORS.purpleSoft,
    CHART_COLORS.green,
    CHART_COLORS.blue,
    CHART_COLORS.purple
  ]
  return {
    ...chartMotion(),
    tooltip: axisTooltip(),
    grid: { left: 88, right: 50, top: 14, bottom: 18 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: items.map(item => item.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#646a73', fontSize: 10, fontWeight: 600 }
    },
    series: [{
      name: '认证人数',
      type: 'bar',
      showBackground: true,
      backgroundStyle: { color: '#eef1f4', borderRadius: 10 },
      barWidth: 18,
      data: items.map((item, index) => ({
        value: item.value,
        itemStyle: { color: chartBarGradient(palette[index % palette.length]), borderRadius: [10, 10, 10, 10] }
      })),
      label: { show: true, position: 'right', color: '#646a73', fontSize: 10, fontWeight: 700 },
      animationDelay: (index: number) => index * 34
    }]
  }
}

function timeOption(): EChartsOption {
  return horizontalBarOption([...props.report.timeBuckets].reverse(), CHART_COLORS.green, 66, true)
}

function productOption(): EChartsOption {
  return horizontalBarOption([...props.report.products].slice(0, 10).reverse(), CHART_COLORS.blueMid, 142, false)
}

function horizontalBarOption(
  items: Array<{ label: string; value: number; share: string }>,
  color: string,
  left: number,
  showShare: boolean
): EChartsOption {
  return {
    ...chartMotion(),
    tooltip: axisTooltip(),
    grid: { left, right: 48, top: 14, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#8f959e', fontSize: 9 },
      splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: items.map(item => shorten(item.label, 18)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#646a73', fontSize: 10 }
    },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      data: items.map(item => ({ value: item.value, itemStyle: { color: chartBarGradient(color), borderRadius: [0, 5, 5, 0] } })),
      label: {
        show: true,
        position: 'right',
        color: '#646a73',
        fontSize: 9,
        formatter: ({ dataIndex }: { dataIndex: number }) => showShare ? items[dataIndex]?.share || '' : `${items[dataIndex]?.value || 0}`
      },
      animationDelay: (index: number) => index * 30
    }]
  }
}

function chartBarGradient(color: string) {
  if (!echartsRuntime?.graphic) return color
  return new echartsRuntime.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: hexToRgba(color, .18) },
    { offset: 1, color }
  ])
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function metricText(label: string) {
  return props.report.metrics.find(item => item.label === label)?.value || '-'
}

function metricNote(label: string) {
  return props.report.metrics.find(item => item.label === label)?.note || ''
}

function metricNumber(label: string) {
  const value = metricText(label).replace(/[^\d.]/g, '')
  return Number(value) || 0
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function isWeekend(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay()
  return day === 0 || day === 6
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}
</script>

<style scoped>
.skill-data-dashboard {
  --dash-blue: #3f78c5;
  --dash-blue-strong: #3370ff;
  --dash-blue-soft: rgba(63, 120, 197, .1);
  --dash-green: #58a86a;
  --dash-amber: #d6a458;
  --dash-purple: #7c5cff;
  display: grid;
  gap: 18px;
  min-width: 0;
  color: var(--text, #1f2329);
}

.dashboard-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-kpi {
  min-width: 0;
  min-height: 128px;
  padding: 18px 20px;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(63, 120, 197, .08), rgba(255, 255, 255, .96)),
    #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .035);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}

.dashboard-kpi-primary {
  border-color: rgba(63, 120, 197, .24);
}

.dashboard-kpi:nth-child(2) {
  background: linear-gradient(135deg, rgba(63, 158, 173, .075), rgba(255, 255, 255, .96)), #fff;
}

.dashboard-kpi:nth-child(3) {
  background: linear-gradient(135deg, rgba(226, 0, 26, .045), rgba(255, 255, 255, .97)), #fff;
}

.dashboard-kpi:nth-child(4) {
  background: linear-gradient(135deg, rgba(124, 92, 255, .065), rgba(255, 255, 255, .97)), #fff;
}

.dashboard-kpi:hover {
  border-color: var(--central-module-hover-border, rgba(51, 112, 255, .36));
  box-shadow: var(--central-module-hover-shadow, 0 1px 2px rgba(15, 23, 42, .035), 0 6px 14px rgba(15, 23, 42, .055));
  transform: var(--central-module-hover-transform, translateY(-1px));
}

.dashboard-kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-kpi-head span {
  color: var(--text-tertiary, #8f959e);
  font-size: 12px;
  font-weight: 650;
}

.dashboard-kpi-head i {
  display: grid;
  width: 32px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
  color: var(--dash-blue);
  background: rgba(63, 120, 197, .1);
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.dashboard-kpi-primary .dashboard-kpi-head i {
  color: var(--dash-blue);
  background: rgba(63, 120, 197, .12);
}

.dashboard-kpi:nth-child(2) .dashboard-kpi-head i { color: var(--dash-green); background: rgba(88, 168, 106, .12); }
.dashboard-kpi:nth-child(3) .dashboard-kpi-head i { color: var(--dash-purple); background: rgba(124, 92, 255, .1); }
.dashboard-kpi:nth-child(4) .dashboard-kpi-head i { color: var(--dash-amber); background: rgba(214, 164, 88, .14); }

.dashboard-kpi > b {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 18px;
  overflow-wrap: anywhere;
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.dashboard-kpi > b small { font-size: 13px; }
.dashboard-kpi p { margin: 9px 0 0; color: var(--text-secondary, #646a73); font-size: 11px; font-weight: 600; }
.dashboard-kpi-primary > b { color: var(--dash-blue); }

.data-trust-strip {
  display: grid;
  grid-template-columns: minmax(230px, 1.35fr) repeat(4, minmax(120px, .65fr));
  overflow: hidden;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}

.data-trust-strip > div {
  min-width: 0;
  padding: 14px 16px;
  border-left: 1px solid var(--border-light, #e5e6eb);
}

.data-trust-strip > div:first-child { border-left: 0; }
.data-trust-title { display: grid; align-content: center; gap: 5px; background: rgba(51, 112, 255, .045); }
.data-trust-title > span { color: var(--dash-blue) !important; font-weight: 700; }
.data-trust-title > b { font-size: 11px !important; line-height: 1.5; }
.data-trust-strip span,
.data-trust-strip small { display: block; color: var(--text-tertiary, #8f959e); font-size: 9px; }
.data-trust-strip b { display: block; margin-top: 5px; font-size: 16px; font-variant-numeric: tabular-nums; }
.data-trust-strip small { margin-top: 3px; }

.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.diagnostic-grid article {
  --diagnostic-color: var(--dash-blue);
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}

.diagnostic-grid article.diagnostic-green { --diagnostic-color: var(--dash-green); }
.diagnostic-grid article.diagnostic-purple { --diagnostic-color: var(--dash-purple); }
.diagnostic-grid article.diagnostic-amber { --diagnostic-color: var(--dash-amber); }
.diagnostic-grid article > div:first-child { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.diagnostic-grid span { color: var(--text-secondary, #646a73); font-size: 10px; font-weight: 650; }
.diagnostic-grid b { color: var(--diagnostic-color); font-size: 18px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.diagnostic-meter { height: 5px; margin: 12px 0; overflow: hidden; border-radius: 999px; background: #eef1f4; }
.diagnostic-meter i { display: block; height: 100%; border-radius: inherit; background: var(--diagnostic-color); }
.diagnostic-grid p { min-height: 34px; margin: 0; font-size: 10px; font-weight: 650; line-height: 1.65; }
.diagnostic-grid small { display: block; margin-top: 8px; color: var(--text-tertiary, #8f959e); font-size: 9px; line-height: 1.55; }

.analysis-loop-list { display: grid; gap: 10px; }

.analysis-loop-list article {
  --loop-color: var(--dash-blue);
  display: grid;
  grid-template-columns: 38px minmax(150px, .9fr) repeat(3, minmax(145px, 1fr));
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}

.analysis-loop-list article.loop-green { --loop-color: var(--dash-green); }
.analysis-loop-list article.loop-purple { --loop-color: var(--dash-purple); }
.analysis-loop-list article.loop-amber { --loop-color: var(--dash-amber); }

.loop-index {
  display: grid;
  align-self: stretch;
  place-items: center;
  color: var(--loop-color);
  background: color-mix(in srgb, var(--loop-color) 10%, #fff);
  font-size: 10px;
  font-weight: 700;
}

.loop-node {
  position: relative;
  min-width: 0;
  padding: 13px 14px;
  border-left: 1px solid var(--border-light, #e5e6eb);
}

.loop-node > span { display: block; margin-bottom: 7px; color: var(--loop-color); font-size: 9px; font-weight: 700; }
.loop-node b { display: block; margin-bottom: 5px; font-size: 13px; line-height: 1.45; }
.loop-node p { margin: 0; color: var(--text-secondary, #646a73); font-size: 9px; line-height: 1.65; }
.loop-signal { background: rgba(51, 112, 255, .035); }
.loop-validation { background: #f8f9fb; }

.dashboard-section,
.dashboard-panel {
  min-width: 0;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .035);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}

.dashboard-section { padding: 26px 28px 18px; }

.dashboard-section-heading,
.dashboard-group-heading,
.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-section-heading h2,
.dashboard-group-heading h2,
.panel-title h3 { margin: 0; letter-spacing: 0; }

.dashboard-section-heading h2,
.dashboard-group-heading h2 { font-size: 18px; }
.panel-title h3 { font-size: 13px; }

.dashboard-section-heading p,
.dashboard-group-heading p,
.panel-title p {
  margin: 6px 0 0;
  color: var(--text-secondary, #646a73);
  font-size: 10px;
  line-height: 1.5;
}

.dashboard-section-heading > span,
.panel-title > span { color: var(--text-tertiary, #8f959e); font-size: 10px; white-space: nowrap; }

.trend-heading-meta { display: grid; justify-items: end; gap: 6px; color: var(--text-tertiary, #8f959e); font-size: 10px; }
.trend-legend { display: flex; align-items: center; gap: 5px; }
.trend-legend i { width: 8px; height: 8px; border-radius: 2px; background: var(--dash-blue); }
.trend-legend i:nth-of-type(2) { margin-left: 5px; background: var(--dash-green); }

.dashboard-group { min-width: 0; }
.dashboard-group-heading { margin: 0 2px 12px; }

.dashboard-chart { width: 100%; min-width: 0; }
.chart-trend { height: 350px; }
.chart-profile { height: 330px; }
.chart-behavior { height: 310px; }
.chart-product { height: 390px; }

.profile-grid {
  display: grid;
  grid-template-columns: minmax(260px, .7fr) minmax(310px, .82fr) minmax(460px, 1.48fr);
  gap: 14px;
}

.dashboard-panel { padding: 20px; }
.behavior-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(330px, .75fr); gap: 14px; }
.product-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(520px, 1fr); gap: 14px; }

.conversion-panel { display: grid; align-content: start; }
.conversion-funnel { display: grid; gap: 8px; margin: 26px auto 0; width: min(100%, 360px); }
.funnel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-inline: auto;
  padding: 13px 16px;
  border-radius: 6px;
  border: 1px solid rgba(221, 225, 230, .82);
  color: var(--text, #1f2329);
  background: #fff;
}
.funnel-row span { font-size: 11px; }
.funnel-row b { font-size: 19px; font-variant-numeric: tabular-nums; }
.funnel-raw { width: 100%; background: linear-gradient(135deg, rgba(141, 162, 191, .14), rgba(255, 255, 255, .98)); }
.funnel-verified { width: 82%; background: linear-gradient(135deg, rgba(63, 120, 197, .14), rgba(255, 255, 255, .98)); }
.funnel-purchased { width: 58%; background: linear-gradient(135deg, rgba(88, 168, 106, .14), rgba(255, 255, 255, .98)); }
.funnel-verified b { color: var(--dash-blue); }
.funnel-purchased b { color: var(--dash-green); }

.conversion-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid var(--border-light, #e5e6eb);
  border-radius: 6px;
  background: var(--border-light, #e5e6eb);
}
.conversion-stats div { min-width: 0; padding: 12px 10px; background: #f8fafc; text-align: center; }
.conversion-stats span { display: block; color: var(--text-tertiary, #8f959e); font-size: 9px; }
.conversion-stats b { display: block; margin-top: 6px; font-size: 15px; font-variant-numeric: tabular-nums; }

.product-table-panel { overflow: hidden; }
.product-table-scroll { max-height: 390px; margin-top: 16px; overflow: auto; border: 1px solid var(--border-light, #e5e6eb); border-radius: 6px; }
.product-table-scroll table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 10px; }
.product-table-scroll th,
.product-table-scroll td { padding: 11px 12px; border-bottom: 1px solid #edf0f4; text-align: left; }
.product-table-scroll th { position: sticky; top: 0; z-index: 1; color: var(--text-tertiary, #8f959e); background: #f5f7fa; font-weight: 600; }
.product-table-scroll td:first-child { color: var(--dash-blue); font-weight: 700; }
.product-table-scroll td:nth-child(3),
.product-table-scroll td:last-child { white-space: nowrap; }
.product-table-scroll tbody tr:hover { background: #f7faff; }

.dashboard-insights { min-width: 0; }
.insight-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.insight-grid article {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(221, 225, 230, .82);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
  transition: var(--central-module-hover-transition, border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease);
}
.insight-grid article > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 5px;
  color: var(--dash-blue);
  background: rgba(63, 120, 197, .1);
  font-size: 9px;
  font-weight: 700;
}
.insight-grid h3 { margin: 2px 0 6px; font-size: 11px; }
.insight-grid p { margin: 0; color: var(--text-secondary, #646a73); font-size: 9px; line-height: 1.65; }

@media (hover: hover) {
  .data-trust-strip:hover,
  .diagnostic-grid article:hover,
  .analysis-loop-list article:hover,
  .dashboard-section:hover,
  .dashboard-panel:hover,
  .insight-grid article:hover {
    border-color: var(--central-module-hover-border, rgba(51, 112, 255, .36));
    box-shadow: var(--central-module-hover-shadow, 0 1px 2px rgba(15, 23, 42, .035), 0 6px 14px rgba(15, 23, 42, .055));
    transform: var(--central-module-hover-transform, translateY(-1px));
  }
}

@media (max-width: 1500px) {
  .profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .role-panel { grid-column: 1 / -1; }
  .insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .diagnostic-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 1180px) {
  .dashboard-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .data-trust-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .data-trust-title { grid-column: 1 / -1; }
  .analysis-loop-list article { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 8px; }
  .loop-index { display: none; }
  .loop-node { border: 0; border-top: 1px solid #e7eaf0; }
  .loop-node:nth-child(2),
  .loop-node:nth-child(3) { border-top: 0; }
  .loop-node:not(:last-child)::after { display: none; }
  .behavior-grid,
  .product-grid { grid-template-columns: 1fr; }
}

@media (max-width: 860px) {
  .profile-grid { grid-template-columns: 1fr; }
  .role-panel { grid-column: auto; }
  .chart-trend { height: 300px; }
}

@media (max-width: 620px) {
  .dashboard-kpis,
  .diagnostic-grid,
  .insight-grid { grid-template-columns: 1fr; }
  .analysis-loop-list article { grid-template-columns: 1fr; }
  .loop-node:nth-child(3) { border-top: 1px solid #e7eaf0; }
  .data-trust-strip { grid-template-columns: 1fr; }
  .data-trust-title { grid-column: auto; }
  .data-trust-strip > div { border-top: 1px solid #e7eaf0; border-left: 0; }
  .data-trust-strip > div:first-child { border-top: 0; }
  .dashboard-section,
  .dashboard-panel { padding: 16px; }
  .dashboard-kpi { min-height: 132px; padding: 18px; }
  .dashboard-kpi > b { margin-top: 18px; font-size: 30px; }
  .dashboard-section-heading,
  .dashboard-group-heading { display: block; }
  .dashboard-section-heading > span { display: block; margin-top: 6px; }
  .chart-profile,
  .chart-behavior,
  .chart-product { height: 310px; }
  .conversion-stats { grid-template-columns: 1fr; }
}
</style>
