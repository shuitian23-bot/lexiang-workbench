<template>
  <div class="review-analysis-panel" :data-variant="variant">
    <section class="ra-panel ra-range-panel" aria-labelledby="review-analysis-range-title">
      <SectionHeader id="review-analysis-range-title" title="时间段" />
      <div class="ra-range-bar">
        <div class="ra-range-tabs" role="group" aria-label="时间范围">
          <button
            v-for="item in rangeOptions"
            :key="item.value"
            type="button"
            :class="{ active: activeRange === item.value }"
            :aria-pressed="activeRange === item.value"
            @click="setRange(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="ra-date-range" aria-label="自定义时间段">
          <input
            v-model="customStart"
            type="date"
            aria-label="开始日期"
            @change="activeRange = 'custom'"
          />
          <span>~</span>
          <input
            v-model="customEnd"
            type="date"
            aria-label="结束日期"
            @change="activeRange = 'custom'"
          />
        </div>
        <label v-if="variant === 'assist'" class="ra-source-filter">
          <span>来源</span>
          <select v-model="activeSource">
            <option value="all">全部</option>
            <option value="乐享">乐享</option>
            <option value="商城">商城</option>
          </select>
        </label>
        <p>{{ rangeText }}</p>
        <button
          class="btn btn-primary btn-sm ra-export-button"
          type="button"
          @click="exportAnalysis"
        >
          导出
        </button>
      </div>
    </section>

    <MetricGrid :columns="3" data-flow-role="summary" aria-label="核心指标">
      <MetricCard
        v-for="item in kpis"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :trend="item.delta"
        :title="item.tip"
        :aria-description="item.tip"
      />
    </MetricGrid>

    <section class="ra-chart-grid" aria-label="分析图表">
      <article
        v-for="chart in charts"
        :key="chart.title"
        class="ra-chart-card"
        :data-span="chart.span"
        :data-chart-type="chart.type"
      >
        <header>
          <SectionHeader :title="chart.title" />
          <span
            class="ra-help"
            tabindex="0"
            :aria-label="chart.tip"
            :data-tooltip="chart.tip"
            data-tooltip-placement="top"
          >
            ?
          </span>
        </header>

        <ReviewChart :option="chartOption(chart)" :label="chart.title" />

      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import ReviewChart from './ReviewChart.vue'
import type { EChartsOption } from 'echarts'
import SectionHeader from '@/components/content/SectionHeader.vue'
import MetricGrid from '@/components/content/MetricGrid.vue'
import MetricCard from '@/components/content/MetricCard.vue'
import { computed, ref } from 'vue'

type Variant = 'summary' | 'assist'
type RangeValue = 'today' | '7' | '15' | '30' | 'custom'
type Tone = 'blue' | 'green' | 'purple' | 'blue2' | 'green2' | 'blue3' | 'gray' | 'orange' | 'red'
type Trend = 'up' | 'down'
type AssistSource = 'all' | '乐享' | '商城'

interface KpiCard {
  label: string
  value: string
  delta: string
  trend: Trend
  tone: Tone
  tip: string
}

interface ChartSeries {
  name: string
  tone: Tone
  values: number[]
}

interface ChartSegment {
  name: string
  value: number
  tone: Tone
}

interface ChartCard {
  title: string
  tip: string
  span: 'half' | 'third' | 'wide'
  type: 'line' | 'bar' | 'pie'
  labels?: string[]
  series?: ChartSeries[]
  maxValue?: number
  segments?: ChartSegment[]
}

const props = defineProps<{
  variant: Variant
}>()

const rangeOptions: Array<{ label: string; value: RangeValue }> = [
  { label: '今天', value: 'today' },
  { label: '近 7 天', value: '7' },
  { label: '近 15 天', value: '15' },
  { label: '近 30 天', value: '30' }
]

const activeRange = ref<RangeValue>('today')
const activeSource = ref<AssistSource>('all')
const customStart = ref('')
const customEnd = ref('')

const fixedEndDate = new Date(2026, 8, 10)
const summaryPattern = [1680, 1820, 1760, 2040, 2260, 2180, 2480]
const assistPattern = [3820, 4150, 4360, 4680, 4920, 5160, 5480]
const passRatePattern = [58, 60, 57, 62, 64, 63, 66]
const interceptPattern = [18, 22, 16, 26, 20, 24, 19]

const sourceConfig = computed(() => {
  if (activeSource.value === '乐享') {
    return {
      label: '乐享',
      scale: 0.56,
      passOffset: 1.4,
      interceptScale: 0.42,
      responseOffset: -0.08
    }
  }
  if (activeSource.value === '商城') {
    return {
      label: '商城',
      scale: 0.44,
      passOffset: -1.1,
      interceptScale: 0.58,
      responseOffset: 0.12
    }
  }
  return { label: '全部', scale: 1, passOffset: 0, interceptScale: 1, responseOffset: 0 }
})

const chartLabels = computed(() => buildLabels())
const summaryBase = computed(() => buildSeries(summaryPattern, 1))
const assistBase = computed(() => buildSeries(assistPattern, sourceConfig.value.scale))
const passRateBase = computed(() =>
  buildRateSeries(passRatePattern).map((value) =>
    clamp(value + sourceConfig.value.passOffset, 45, 80)
  )
)
const interceptBase = computed(() =>
  buildSeries(interceptPattern, sourceConfig.value.interceptScale, 0)
)

const kpis = computed<KpiCard[]>(() =>
  props.variant === 'summary' ? summaryKpis : assistKpis.value
)
const charts = computed<ChartCard[]>(() =>
  props.variant === 'summary' ? summaryCharts.value : assistCharts.value
)

const rangeSuffix = computed(() => {
  if (activeRange.value === 'custom' && customStart.value && customEnd.value)
    return `（${customStart.value} ~ ${customEnd.value}）`
  if (activeRange.value === 'today') return '（今天）'
  return `（近 ${activeRange.value} 天）`
})

const rangeText = computed(() => {
  const sourceText =
    props.variant === 'assist' && activeSource.value !== 'all'
      ? `，来源：${activeSource.value}`
      : ''
  if (activeRange.value === 'custom') {
    if (customStart.value && customEnd.value)
      return `统计范围：${customStart.value} ~ ${customEnd.value}${sourceText}`
    return '请选择自定义时间段'
  }
  if (activeRange.value === 'today') return `统计范围：今天，按小时聚合${sourceText}`
  return `统计范围：近 ${activeRange.value} 天，按日聚合${sourceText}`
})

const summaryAccuracyRate = 94.1

const summaryKpis: KpiCard[] = [
  {
    label: '已生成总结商品数',
    value: '3,842',
    delta: '▲ 6.2% 较上周',
    trend: 'up',
    tone: 'blue',
    tip: '当前已成功生成评价总结的商品去重数。计算：COUNT(DISTINCT 商品编号 WHERE 总结状态=已生成)。'
  },
  {
    label: '累计生成次数',
    value: '28,915',
    delta: '▲ 9.1% 较上周',
    trend: 'up',
    tone: 'green',
    tip: '统计周期内总结生成任务成功执行的累计次数，同一商品重算按多次计。'
  },
  {
    label: '总结不合格率',
    value: `${(100 - summaryAccuracyRate).toFixed(1)}%`,
    delta: '▼ 0.7%',
    trend: 'down',
    tone: 'red',
    tip: '人工抽检中判定不合格的评价总结占比。计算：抽检不合格条数 ÷ 抽检总条数 ×100%。'
  },
  {
    label: '评价总结准确率',
    value: `${summaryAccuracyRate.toFixed(1)}%`,
    delta: '▲ 0.7%',
    trend: 'up',
    tone: 'green',
    tip: '人工抽检中总结结论与原始评价一致的比例。计算：抽检合格条数 ÷ 抽检总条数 ×100%，无虚假事实与错误归因。'
  },
  {
    label: 'AI 文案重复率',
    value: '7.2%',
    delta: '▼ 0.5%',
    trend: 'down',
    tone: 'orange',
    tip: '不同商品间生成文案的相似度占比。计算：相似度≥阈值的文案对数 ÷ 文案总对数 ×100%，数值越低表示表达越多样。'
  }
]

const assistKpis = computed<KpiCard[]>(() => {
  const generatedCount = sumValues(assistBase.value)
  const passRate = averageValue(passRateBase.value)
  const userCount = Math.round(generatedCount * 0.43)
  const interceptCount = sumValues(interceptBase.value)
  const responseSeconds = clamp(
    1.32 + sourceConfig.value.responseOffset + selectedDayCount() * 0.002,
    1.1,
    1.8
  )
  const blockRate = clamp((interceptCount / Math.max(generatedCount, 1)) * 100 + 0.62, 0.72, 1.48)
  return [
    {
      label: '累计生成草稿次数',
      value: formatInteger(generatedCount),
      delta: trendDelta(8.6 + sourceConfig.value.scale * 2.8, 'up', '%'),
      trend: 'up',
      tone: 'blue',
      tip: '统计周期内 AI 生成评价草稿的累计次数，每次调用（含换一版）计 1 次。'
    },
    {
      label: '草稿采纳率',
      value: `${passRate.toFixed(1)}%`,
      delta: trendDelta(activeSource.value === '商城' ? 1.6 : 2.8, 'up', '%'),
      trend: 'up',
      tone: 'green',
      tip: '用户最终提交的评价中来自 AI 草稿的比例。计算：采纳草稿的评价数 ÷ 生成过草稿的评价数 ×100%。'
    },
    {
      label: '使用用户数',
      value: formatInteger(userCount),
      delta: trendDelta(3.8 + sourceConfig.value.scale * 2.1, 'up', '%'),
      trend: 'up',
      tone: 'orange',
      tip: '统计周期内使用过 AI 辅助生成的去重用户数。计算：周期内整体 COUNT(DISTINCT 用户ID)，同一用户在周期内多日使用只计 1 次（≠ 各日 UV 之和）。'
    },
    {
      label: '高频拦截次数',
      value: formatInteger(interceptCount),
      delta: trendDelta(
        activeSource.value === '商城' ? 0.4 : 0.9,
        activeSource.value === '商城' ? 'up' : 'down',
        '%'
      ),
      trend: activeSource.value === '商城' ? 'up' : 'down',
      tone: 'red',
      tip: '因短时间重复调用触发频控被拦截的累计次数，用于识别刷量行为。'
    },
    {
      label: '草稿生成时间',
      value: `${responseSeconds.toFixed(1)}s`,
      delta: trendDelta(
        activeSource.value === '商城' ? 0.1 : 0.2,
        responseSeconds > 1.45 ? 'up' : 'down',
        's'
      ),
      trend: responseSeconds > 1.45 ? 'up' : 'down',
      tone: 'green',
      tip: '从用户发起生成到草稿返回的平均耗时。计算：SUM(单次耗时) ÷ 生成次数，单位秒。'
    },
    {
      label: '生成内容拦截率',
      value: `${blockRate.toFixed(2)}%`,
      delta: trendDelta(
        activeSource.value === '商城' ? 0.08 : 0.11,
        activeSource.value === '商城' ? 'up' : 'down',
        '%'
      ),
      trend: activeSource.value === '商城' ? 'up' : 'down',
      tone: 'red',
      tip: '生成内容被安全策略拦截的比例。计算：(生成前拦截数 + 生成后拦截数) ÷ 总生成次数 ×100%。'
    }
  ]
})

const summaryCharts = computed<ChartCard[]>(() => {
  const labels = chartLabels.value
  const summaryValues = summaryBase.value
  const feedbackSeries: ChartSeries[] = [
    { name: '点赞', tone: 'blue', values: summaryValues.map((value) => Math.round(value * 0.68)) },
    { name: '点踩', tone: 'gray', values: summaryValues.map((value) => Math.round(value * 0.08)) }
  ]
  return [
    {
      type: 'line',
      title: '模块曝光趋势',
      span: 'half',
      labels,
      series: [
        {
          name: '商详页',
          tone: 'blue',
          values: summaryValues.map((value) => Math.round(value * 14))
        },
        {
          name: '评价页',
          tone: 'green',
          values: summaryValues.map((value) => Math.round(value * 6.4))
        }
      ],
      maxValue: 36000,
      tip: '评价总结模块的曝光次数（PV）。计算：模块进入可视区域即计 1 次曝光，同一用户多次曝光累计。'
    },
    {
      type: 'line',
      title: `总结次数趋势${rangeSuffix.value}`,
      span: 'half',
      labels,
      series: [{ name: '生成次数', tone: 'blue', values: summaryValues }],
      maxValue: 2600,
      tip: '统计周期内系统为商品生成/更新评价总结的累计次数。同一商品多次重算按多次计。计算：SUM(总结生成任务成功数)，按日聚合。'
    },
    {
      type: 'bar',
      title: '访问模块人数趋势',
      span: 'half',
      labels,
      series: [
        {
          name: '商详页',
          tone: 'blue',
          values: summaryValues.map((value) => Math.round(value * 8))
        },
        {
          name: '评价页',
          tone: 'green',
          values: summaryValues.map((value) => Math.round(value * 3.4))
        }
      ],
      maxValue: 21000,
      tip: '访问评价总结模块的去重人数（UV），按入口拆分。计算：按日 COUNT(DISTINCT 用户ID)，同一用户当日多次访问只计 1 次；跨日分别计入各自日期。'
    },
    {
      type: 'pie',
      title: '访问终端分布',
      span: 'half',
      segments: [
        { name: 'PC', value: 39, tone: 'blue' },
        { name: 'H5', value: 24, tone: 'green' },
        { name: '联想APP', value: 28, tone: 'purple' },
        { name: '联想小程序', value: 9, tone: 'blue2' }
      ],
      tip: '访问评价总结模块的人数按终端拆分占比。计算：周期内各终端整体去重 UV ÷ 全终端整体去重 UV ×100%。同一用户跨终端访问时在各终端分别计入，故各终端之和可能大于全终端 UV。终端含 PC / H5 / 联想APP / 联想小程序。'
    },
    {
      type: 'pie',
      title: '观点维度分布（全站）',
      span: 'half',
      segments: [
        { name: '屏幕', value: 24, tone: 'blue' },
        { name: '性能', value: 20, tone: 'green' },
        { name: '外观', value: 16, tone: 'purple' },
        { name: '物流', value: 14, tone: 'blue2' },
        { name: '服务', value: 10, tone: 'green2' },
        { name: '续航', value: 9, tone: 'blue3' },
        { name: '价格', value: 7, tone: 'gray' }
      ],
      tip: '对全站有效评价做维度抽取后的观点提及占比。计算：某维度提及数 ÷ 各维度提及总数 ×100%。同一条评价命中多个维度时分别计入。'
    },
    {
      type: 'line',
      title: '展开收起趋势',
      span: 'half',
      labels,
      series: [
        {
          name: '展开',
          tone: 'blue',
          values: summaryValues.map((value) => Math.round(value * 2.7))
        },
        {
          name: '收起',
          tone: 'gray',
          values: summaryValues.map((value) => Math.round(value * 1.5))
        }
      ],
      maxValue: 7200,
      tip: '用户对评价总结的展开/收起点击次数。计算：分别累计"展开全文"与"收起"按钮的点击 PV，可用于评估总结内容吸引力。'
    },
    {
      type: 'bar',
      title: `点赞/点踩趋势${rangeSuffix.value}`,
      span: 'wide',
      labels,
      series: feedbackSeries,
      maxValue: maxSeriesValue(feedbackSeries),
      tip: '统计周期内用户对评价总结的点赞、点踩反馈次数，按反馈时间聚合；悬停柱形可查看每个时间点的数量。'
    },
    {
      type: 'line',
      title: '问乐享点击数趋势',
      span: 'wide',
      labels,
      series: [
        {
          name: '商详页',
          tone: 'blue',
          values: summaryValues.map((value) => Math.round(value * 4.1))
        },
        {
          name: '评价页',
          tone: 'green',
          values: summaryValues.map((value) => Math.round(value * 2.3))
        }
      ],
      maxValue: 11000,
      tip: '评价总结内"问乐享"入口的点击次数，按来源页面拆分。计算：COUNT(点击事件)，同一用户多次点击累计。'
    }
  ]
})

const assistCharts = computed<ChartCard[]>(() => {
  const labels = chartLabels.value
  const assistValues = assistBase.value
  const passRateValues = passRateBase.value
  const interceptValues = interceptBase.value
  const userValues = assistValues.map((value) => Math.round(value * 0.29))
  return [
    {
      type: 'line',
      title: `草稿生成次数${assistTitleSuffix()}`,
      span: 'half',
      labels,
      series: sourceSeries(assistValues, '草稿生成次数'),
      maxValue: maxSeriesValue(sourceSeries(assistValues, '草稿生成次数')),
      tip: '统计周期内 AI 为用户生成评价草稿的累计次数。含标签生成、提示词生成、标签+提示词及换一版，每次调用计 1 次。'
    },
    {
      type: 'pie',
      title: `生成方式占比${sourceSuffix()}`,
      span: 'half',
      segments: generationWaySegments(),
      tip: '各生成方式的调用占比。计算：某方式生成次数 ÷ 总生成次数 ×100%。方式含标签生成、提示词生成、标签+提示词、换一版。'
    },
    {
      type: 'line',
      title: `草稿采纳率趋势${assistTitleSuffix()}`,
      span: 'third',
      labels,
      series: sourceRateSeries(passRateValues),
      maxValue: 80,
      tip: '用户最终提交的评价中来自 AI 草稿的比例。计算：采纳草稿的评价数 ÷ 生成过草稿的评价数 ×100%。用户编辑后提交仍计为采纳。'
    },
    {
      type: 'bar',
      title: `使用用户数趋势${assistTitleSuffix()}`,
      span: 'third',
      labels,
      series: sourceSeries(userValues, '使用用户数'),
      maxValue: maxSeriesValue(sourceSeries(userValues, '使用用户数')),
      tip: '使用过 AI 辅助生成功能的去重人数。计算：按日 COUNT(DISTINCT 用户ID)，同一用户当日多次使用只计 1 次；各日之和不等于周期总 UV。'
    },
    {
      type: 'line',
      title: `高频拦截次数趋势${assistTitleSuffix()}`,
      span: 'third',
      labels,
      series: sourceSeries(interceptValues, '高频拦截次数'),
      maxValue: maxSeriesValue(sourceSeries(interceptValues, '高频拦截次数')),
      tip: '因短时间内重复调用触发频控而被拦截的次数。计算：COUNT(频控拦截事件)，用于识别刷量与异常行为。'
    }
  ]
})

function assistTitleSuffix() {
  if (activeSource.value === 'all') return rangeSuffix.value
  return `${rangeSuffix.value} · ${activeSource.value}`
}

function sourceSuffix() {
  return activeSource.value === 'all' ? '' : `（${activeSource.value}）`
}

function sourceSeries(values: number[], name: string): ChartSeries[] {
  if (activeSource.value === 'all') {
    return [
      { name: '乐享', tone: 'blue', values: values.map((value) => Math.round(value * 0.56)) },
      { name: '商城', tone: 'green', values: values.map((value) => Math.round(value * 0.44)) }
    ]
  }
  return [
    {
      name: `${activeSource.value}${name ? ` ${name}` : ''}`,
      tone: activeSource.value === '乐享' ? 'blue' : 'green',
      values
    }
  ]
}

function sourceRateSeries(values: number[]): ChartSeries[] {
  if (activeSource.value === 'all') {
    return [
      { name: '乐享', tone: 'blue', values: values.map((value) => clamp(value + 1.4, 45, 80)) },
      { name: '商城', tone: 'green', values: values.map((value) => clamp(value - 1.1, 45, 80)) }
    ]
  }
  return [
    { name: activeSource.value, tone: activeSource.value === '乐享' ? 'blue' : 'green', values }
  ]
}

function generationWaySegments(): ChartSegment[] {
  if (activeSource.value === '乐享') {
    return [
      { name: '标签生成', value: 48, tone: 'blue' },
      { name: '提示词生成', value: 24, tone: 'green' },
      { name: '标签+提示词', value: 18, tone: 'purple' },
      { name: '换一版', value: 10, tone: 'blue2' }
    ]
  }
  if (activeSource.value === '商城') {
    return [
      { name: '标签生成', value: 38, tone: 'blue' },
      { name: '提示词生成', value: 31, tone: 'green' },
      { name: '标签+提示词', value: 10, tone: 'purple' },
      { name: '换一版', value: 21, tone: 'blue2' }
    ]
  }
  return [
    { name: '标签生成', value: 44, tone: 'blue' },
    { name: '提示词生成', value: 27, tone: 'green' },
    { name: '标签+提示词', value: 14, tone: 'purple' },
    { name: '换一版', value: 15, tone: 'blue2' }
  ]
}

function maxSeriesValue(series: ChartSeries[]) {
  return Math.max(...series.flatMap((item) => item.values), 1)
}

function sumValues(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function averageValue(values: number[]) {
  if (!values.length) return 0
  return sumValues(values) / values.length
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

function trendDelta(value: number, trend: Trend, unit: '%' | 's') {
  const icon = trend === 'up' ? '▲' : '▼'
  const suffix = unit === '%' ? '%' : 's'
  return `${icon} ${value.toFixed(1)}${suffix} 较上期`
}

function setRange(value: RangeValue) {
  activeRange.value = value
}

function exportAnalysis() {
  const analysisName = props.variant === 'summary' ? '评价总结分析' : '辅助生成分析'
  const rows: string[][] = [
    [analysisName],
    ['统计范围', rangeText.value],
    [],
    ['核心指标', '指标值', '变化']
  ]

  kpis.value.forEach((item) => rows.push([item.label, item.value, item.delta]))

  charts.value.forEach((chart) => {
    rows.push([], [chart.title])
    if (chart.series?.length) {
      rows.push(['时间点', ...chart.series.map((series) => series.name)])
      ;(chart.labels || []).forEach((label, index) => {
        rows.push([label, ...chart.series!.map((series) => String(series.values[index] ?? ''))])
      })
      return
    }
    if (chart.segments?.length) {
      rows.push(['分类', '占比'])
      chart.segments.forEach((segment) => rows.push([segment.name, `${segment.value}%`]))
    }
  })

  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${analysisName}_${exportRangeLabel()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function exportRangeLabel() {
  const sourceSuffix =
    props.variant === 'assist' && activeSource.value !== 'all' ? `_${activeSource.value}` : ''
  if (activeRange.value === 'custom' && customStart.value && customEnd.value) {
    return `${customStart.value}_${customEnd.value}${sourceSuffix}`
  }
  if (activeRange.value === 'today') return `今天${sourceSuffix}`
  if (activeRange.value === 'custom') return `自定义时间段${sourceSuffix}`
  return `近${activeRange.value}天${sourceSuffix}`
}

function buildLabels() {
  if (activeRange.value === 'today')
    return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
  const dayCount = selectedDayCount()
  const endDate = resolveEndDate()
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - dayCount + index + 1)
    return formatShortDate(date)
  })
}

function buildSeries(pattern: number[], scale = 1, minValue = 1) {
  const labels = chartLabels.value
  const dayCount = selectedDayCount()
  const periodScale = activeRange.value === 'today' ? 0.18 : 1 + Math.max(dayCount - 7, 0) * 0.006
  const offset =
    activeRange.value === 'today'
      ? -1.1
      : activeRange.value === '15'
        ? 0.7
        : activeRange.value === '30'
          ? 1.4
          : activeRange.value === 'custom'
            ? 2.1
            : 0
  return labels.map((_, index) => {
    const base = pattern[index % pattern.length]
    const trend = 1 + (index / Math.max(labels.length - 1, 1)) * 0.08
    const wave = 1 + Math.sin(index * 0.9 + offset) * 0.055 + ((index % 5) - 2) * 0.01
    return Math.max(minValue, Math.round(base * scale * periodScale * trend * wave))
  })
}

function buildRateSeries(pattern: number[]) {
  const labels = chartLabels.value
  const offset =
    activeRange.value === 'today'
      ? -0.6
      : activeRange.value === '15'
        ? 0.5
        : activeRange.value === '30'
          ? 0.9
          : activeRange.value === 'custom'
            ? 1.2
            : 0
  return labels.map((_, index) => {
    const base = pattern[index % pattern.length]
    const wave = Math.sin(index * 0.8 + offset) * 1.2 + ((index % 4) - 1.5) * 0.35
    return Number(clamp(base + wave, 45, 80).toFixed(1))
  })
}

function selectedDayCount() {
  if (activeRange.value === 'custom') {
    const start = parseDateValue(customStart.value)
    const end = parseDateValue(customEnd.value)
    if (!start || !end) return 7
    return clamp(Math.abs(daysBetween(start, end)) + 1, 1, 30)
  }
  if (activeRange.value === 'today') return 7
  return Number(activeRange.value)
}

function resolveEndDate() {
  if (activeRange.value === 'custom') {
    const start = parseDateValue(customStart.value)
    const end = parseDateValue(customEnd.value)
    if (start && end) return start > end ? start : end
  }
  return fixedEndDate
}

function parseDateValue(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function daysBetween(start: Date, end: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / dayMs)
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toneColor(tone: Tone) {
  // Fixed categorical palette from the design Skill's project chart color contract.
  const colorMap: Record<Tone, string> = {
    blue: 'var(--chart-blue)',
    green: 'var(--chart-green)',
    purple: 'var(--chart-purple)',
    blue2: 'var(--chart-blue-2)',
    green2: 'var(--chart-green-2)',
    blue3: 'var(--chart-blue-3)',
    gray: 'var(--chart-slate)',
    orange: 'var(--chart-amber)',
    red: 'var(--chart-danger)'
  }
  return colorMap[tone]
}
function chartOption(chart: ChartCard): EChartsOption {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const shared: EChartsOption = {
    animation: !reduced, animationDuration: 400, animationDurationUpdate: 300,
    textStyle: { color: '#646a73', fontFamily: 'inherit' },
    tooltip: { trigger: chart.type === 'pie' ? 'item' : 'axis', backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1,
      textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,.08)' },
    legend: { type: 'scroll', bottom: 0, left: 'center', itemWidth: 16, itemHeight: 6, itemGap: 16, textStyle: { color: '#646a73', fontSize: 12 } }
  }
  if (chart.type === 'pie') return { ...shared,
    tooltip: { ...shared.tooltip, trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '44%'], padAngle: 1.5,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      emphasis: { scale: true, scaleSize: 6 },
      label: { color: '#646a73', fontSize: 12, formatter: '{b}\n{d}%' },
      data: (chart.segments || []).map(item => ({ name: item.name, value: item.value, itemStyle: { color: toneColor(item.tone) } })) }]
  }
  return { ...shared,
    grid: { left: 16, right: 16, top: 16, bottom: 56, containLabel: true },
    xAxis: { type: 'category', boundaryGap: chart.type === 'bar', data: chart.labels, axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e8ec' } }, axisLabel: { color: '#9aa3af', fontSize: 12, hideOverlap: true, showMinLabel: true, showMaxLabel: true } },
    yAxis: { type: 'value', show: false, min: 0 },
    series: (chart.series || []).map(item => chart.type === 'line' ? {
      type: 'line', name: item.name, data: item.values, symbol: 'circle', symbolSize: 6, showSymbol: false,
      lineStyle: { color: toneColor(item.tone), width: 2 }, itemStyle: { color: toneColor(item.tone) },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
        { offset: 0, color: toneColor(item.tone) + '2e' }, { offset: 1, color: toneColor(item.tone) + '14' }] } }
    } : { type: 'bar', name: item.name, data: item.values, barMaxWidth: 16,
      itemStyle: { color: toneColor(item.tone), borderRadius: [4, 4, 0, 0] } })
  }
}

</script>

<style scoped lang="scss">
.review-analysis-panel {
  --chart-blue: #3f78c5;
  --chart-green: #58a86a;
  --chart-purple: #7c5cff;
  --chart-blue-2: #5b8def;
  --chart-green-2: #6ac69a;
  --chart-blue-3: #9bbcff;
  --chart-slate: #8da2bf;
  --chart-amber: #d6a458;
  --chart-danger: #d94b4b;
  --chart-grid: #e5e8ec;
  --chart-axis: #9aa3af;
  display: grid;
  gap: 16px;
  min-width: 0;
}

.ra-panel,
.ra-kpi-card,
.ra-chart-card {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.ra-range-panel {
  padding: 20px;
}

.ra-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: var(--color-text);
  font-size: var(--text-md, 16px);
  font-weight: 700;
  line-height: 1.5;
}

.ra-section-title::before {
  display: block;
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  content: '';
}

.ra-range-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.ra-range-tabs {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.ra-range-tabs button {
  min-width: 72px;
  height: 32px;
  border: 0;
  border-right: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--text-sm, 13px);
  cursor: pointer;
}

.ra-range-tabs button:last-child {
  border-right: 0;
}

.ra-range-tabs button:hover,
.ra-range-tabs button:focus-visible {
  color: var(--color-primary);
}

.ra-range-tabs button.active {
  background: var(--color-primary);
  color: var(--color-surface);
}

.ra-date-range {
  display: inline-grid;
  grid-template-columns: minmax(0, 128px) 20px minmax(0, 128px);
  align-items: center;
  gap: 8px;
}

.ra-date-range input {
  min-width: 0;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0 8px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: var(--text-sm, 13px);
  outline: none;
}

.ra-date-range input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-subtle);
}

.ra-source-filter {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 120px);
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
}

.ra-source-filter select {
  height: 32px;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0 12px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm, 13px);
  outline: none;
}

.ra-source-filter select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-subtle);
}

.ra-date-range span,
.ra-range-bar p {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm, 13px);
}

.ra-range-bar p {
  margin: 0;
}

.ra-export-button {
  margin-left: auto;
}

.ra-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.ra-kpi-grid[data-columns='6'] {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.ra-kpi-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
}

.ra-kpi-card header,
.ra-chart-card header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ra-kpi-card header span:first-child,
.ra-chart-card h3 {
  min-width: 0;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  line-height: 1.5;
}

.ra-kpi-card strong {
  color: var(--color-text);
  font-size: var(--text-2xl, 24px);
  line-height: 1.2;
}

.ra-kpi-card em {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
  font-style: normal;
}

.ra-kpi-card em[data-trend='up'] {
  color: var(--color-success);
}

.ra-kpi-card em[data-trend='down'] {
  color: var(--color-warning);
}

.ra-kpi-card[data-tone='blue'] {
  border-top-color: var(--color-primary);
}

.ra-kpi-card[data-tone='green'] {
  border-top-color: var(--color-success);
}

.ra-kpi-card[data-tone='orange'] {
  border-top-color: var(--color-warning);
}

.ra-kpi-card[data-tone='red'] {
  border-top-color: var(--color-danger);
}

.ra-help {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: var(--color-bg-subtle);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
  line-height: 1;
  cursor: pointer;
  outline: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.ra-help:hover,
.ra-help:focus-visible {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.ra-chart-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.ra-chart-card {
  display: grid;
  grid-template-rows: auto var(--chart-plot-height, 260px);
  gap: 12px;
  min-height: 260px;
  min-width: 0;
  padding: 16px;
}

.ra-chart-card[data-span='half'] {
  grid-column: span 3;
}

.ra-chart-card[data-span='third'] {
  grid-column: span 2;
}

.ra-chart-card[data-span='wide'] {
  grid-column: span 6;
}

.ra-chart-plot,
.ra-bar-plot,
.ra-pie-plot {
  min-width: 0;
  min-height: 172px;
}

.ra-chart-plot {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  gap: 8px;
}

.ra-chart-plot svg {
  display: block;
  min-width: 0;
  width: 100%;
  height: 156px;
  border-bottom: 1px solid var(--chart-grid);
}

.ra-chart-plot polyline {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.ra-axis {
  display: flex;
  min-width: 0;
  justify-content: space-between;
  gap: 4px;
  color: var(--chart-axis);
  font-size: var(--text-xs, 12px);
}

.ra-axis span {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ra-bar-plot {
  display: grid;
  grid-template-columns: repeat(var(--bar-count), minmax(0, 1fr));
  align-items: end;
  gap: var(--space-chart-bar-gap, 2px);
  padding-top: 12px;
}

.ra-bar-group {
  display: grid;
  grid-template-rows: 148px;
  gap: 8px;
  min-width: 0;
}

.ra-bar-stack {
  height: var(--chart-bar-stack-height, 148px);
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-chart-bar-gap, 2px);
  border-bottom: 1px solid var(--chart-grid);
}

.ra-bar-stack span {
  display: block;
  flex: 1 1 0;
  min-width: 0;
  max-width: 16px;
  border-radius: 4px 4px 0 0;
}

.ra-bar-group em {
  overflow: hidden;
  color: var(--chart-axis);
  font-size: var(--text-xs, 12px);
  font-style: normal;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ra-pie-plot { display: grid; grid-template-rows: minmax(0, 1fr) auto; align-items: center; justify-items: center; gap: 12px; }
.ra-donut-svg { display: block; width: 100%; height: 100%; max-width: var(--chart-donut-max-width, 480px); }
.ra-donut-svg text { fill: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.ra-donut-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 16px; list-style: none; margin: 0; padding: 0; }
.ra-donut-legend li { display: inline-flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.ra-donut-legend i { width: 16px; height: 6px; border-radius: 4px; }
.ra-chart-card[data-chart-type='pie'] { grid-template-rows: auto var(--chart-donut-plot-height, 300px); }
.ra-chart-card[data-chart-type='pie'] > header { padding-bottom: 16px; border-bottom: 1px solid var(--color-border-subtle); }
.ra-chart-plot { position: relative; }
.ra-line-endpoint { position: absolute; width: 6px; height: 6px; box-sizing: border-box; border: 2px solid; border-radius: 50%; background: var(--color-surface); transform: translate(-50%, -50%); pointer-events: none; }

.ra-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs, 12px);
}

.ra-legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ra-legend i {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}

@container (max-width: 1039px) {
  .ra-kpi-grid,
  .ra-kpi-grid[data-columns='6'] {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .ra-chart-card[data-span='half'],
  .ra-chart-card[data-span='third'] {
    grid-column: span 3;
  }
}

@container (max-width: 719px) {
  .ra-export-button {
    margin-left: 0;
  }

  .ra-kpi-grid,
  .ra-kpi-grid[data-columns='6'],
  .ra-chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ra-chart-card[data-span='half'],
  .ra-chart-card[data-span='third'],
  .ra-chart-card[data-span='wide'] {
    grid-column: span 1;
  }

  .ra-pie-plot {
    justify-items: center;
  }
}

.ra-range-panel > :deep(.content-section-header) {
  margin-bottom: 16px;
}
.ra-chart-card {
  border-radius: var(--radius-lg);
  gap: 16px;
}
.ra-chart-card > header {
  align-items: flex-start;
}
.ra-chart-card > header > :deep(.content-section-header) {
  flex: 1;
}
.ra-range-bar {
  flex-wrap: wrap;
}
.ra-range-bar .btn {
  min-height: 36px;
  font-size: var(--text-sm, 13px);
}
.ra-range-tabs button {
  min-height: 36px;
}
.ra-range-tabs button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.ra-bar-panel { min-width: 0; display: grid; grid-template-rows: var(--chart-bars-height, 160px) auto; }
.ra-bar-panel .ra-bar-plot { min-height: 148px; }
.ra-bar-axis { margin-top: 8px; }
</style>
