<script setup lang="ts">
import MetricGrid from '@/components/content/MetricGrid.vue'
import UsageTrendMetricCard from './UsageTrendMetricCard.vue'
import type { getUsagePeriodOverview } from '@/domain/usagePeriodOverview.js'
import { getUsageCardComparison } from '@/domain/usageCardComparison.js'

type PeriodModel = ReturnType<typeof getUsagePeriodOverview>
type Metric = { key: string; label: string; unit?: string; meta: string; format?: 'number' | 'decimal' | 'percent' }
const props = defineProps<{ model: PeriodModel; metrics: Metric[]; sourceLabel: string }>()
const tones = ['blue', 'purple', 'green', 'slate'] as const
function value(item: Metric) {
  const number = props.model.current?.[item.key]
  if (number == null) return '—'
  if (item.format === 'percent') return `${(number * 100).toFixed(1)}%`
  return item.format === 'decimal' ? number.toFixed(2) : number.toLocaleString('zh-CN')
}
function comparison(item: Metric) {
  return getUsageCardComparison({ change: props.model.changes[item.key], metricKey: item.key, startDate: props.model.startDate, endDate: props.model.endDate, format: item.format })
}
function changeClass(item: Metric) {
  const change = comparison(item)
  const up = change.text.includes('↑'), down = change.text.includes('↓')
  const positive = item.key === 'firstTokenSeconds' ? down : up
  return { 'is-increase': !change.isMock && positive, 'is-decrease': !change.isMock && (up || down) && !positive }
}
function changeTitle(item: Metric) {
  const change = props.model.changes[item.key]
  const reason = change?.reason === 'missing' ? '当前或前期数据未完整提供。' : change?.reason === 'zero-base' && item.format !== 'percent' ? '前期值为0，无法计算增长率。' : ''
  return `对比 ${props.model.previousStartDate || '—'} 至 ${props.model.previousEndDate || '—'}；前期值 ${change?.previousValue == null ? '—' : item.format === 'percent' ? `${(change.previousValue * 100).toFixed(1)}%` : change.previousValue.toLocaleString('zh-CN')}。${reason}${comparison(item).title}`
}
</script>

<template>
  <div class="usage-metric-overview">
    <MetricGrid :columns="metrics.length === 3 ? 3 : 4" class="usage-metric-grid" role="group" aria-label="核心指标与趋势">
      <UsageTrendMetricCard v-for="(item, index) in metrics" :key="item.key" :label="item.label" :meta="item.meta" :rows="model.points" :series="[{ key: item.key, label: item.label }]" :source-label="sourceLabel" :format="item.format" :tone="tones[index % tones.length]">
        <template #comparison><span class="usage-metric-change" :class="changeClass(item)" :title="changeTitle(item)" :data-comparison-mock="comparison(item).isMock || undefined">{{ comparison(item).text }}</span></template>
        <template #value><strong class="usage-metric-number">{{ value(item) }}<small v-if="item.unit && model.current?.[item.key] != null">{{ item.unit }}</small></strong></template>
      </UsageTrendMetricCard>
    </MetricGrid>
    <p class="usage-metric-note">{{ model.startDate || '—' }} 至 {{ model.endDate || '—' }} · 环比对比 {{ model.previousStartDate || '—' }} 至 {{ model.previousEndDate || '—' }}（前 {{ model.days }} 天）；比率展示百分点变化。环比不可计算时以 Mock 演示；趋势图无数据日期按0展示，周期指标缺失仍显示“—”。</p>
  </div>
</template>

<style scoped>
.usage-metric-overview { display: grid; gap: var(--space-3, 12px); min-width: 0; container-type: inline-size; }
.usage-metric-number { font-size: var(--text-2xl, 24px); font-weight: 700; }
.usage-metric-number small { margin-left: var(--space-1, 4px); font-size: var(--text-sm, 13px); font-weight: 400; }
.usage-metric-note { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; line-height: 1.65; }
</style>
