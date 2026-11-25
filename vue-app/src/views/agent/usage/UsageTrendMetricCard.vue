<script setup lang="ts">
import MetricCard from '@/components/content/MetricCard.vue'
import UsageMiniTrend from './UsageMiniTrend.vue'

type Tone = 'blue' | 'purple' | 'green' | 'slate'
withDefaults(defineProps<{
  label: string; meta: string; sourceLabel: string
  rows: { date: string; [key: string]: string | number | null | undefined }[]
  series: { key: string; label: string }[]
  format?: 'number' | 'decimal' | 'percent'; tone?: Tone
}>(), { format: 'number', tone: 'blue' })
const colors = { blue: 'var(--chart-1)', purple: 'var(--chart-5)', green: 'var(--chart-3)', slate: 'var(--chart-7)' }
</script>

<template>
  <MetricCard :label="label" :meta="meta" class="usage-trend-metric-card" :style="{ '--usage-card-accent': colors[tone] }">
    <template #header>
      <div class="usage-trend-metric-heading">
        <span class="cs-metric-card__label">{{ label }}</span>
        <div class="usage-trend-metric-comparisons"><slot name="comparison" /></div>
      </div>
    </template>
    <template #value>
      <div class="usage-trend-metric-value"><slot name="value" /></div>
      <UsageMiniTrend :rows="rows" :series="series" :label="label" :source-label="sourceLabel" :format="format" :tone="tone" />
    </template>
  </MetricCard>
</template>

<style scoped>
.usage-trend-metric-card { display: flex; flex-direction: column; min-width: 0; border-top: 3px solid var(--usage-card-accent); }
.usage-trend-metric-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2, 8px); min-height: calc(var(--space-5, 20px) * 2); }
.usage-trend-metric-heading > .cs-metric-card__label { min-width: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; line-height: 1.65; }
.usage-trend-metric-comparisons { display: grid; flex-shrink: 1; gap: var(--space-1, 4px); min-width: 0; max-width: 70%; text-align: right; }
.usage-trend-metric-comparisons :deep(span) { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; line-height: 1.65; overflow-wrap: anywhere; }
.usage-trend-metric-comparisons :deep(.is-increase) { color: var(--color-success); }
.usage-trend-metric-comparisons :deep(.is-decrease) { color: var(--chart-danger); }
.usage-trend-metric-card :deep(.cs-metric-card__value) { display: flex; flex: 1; flex-direction: column; gap: var(--space-3, 12px); }
.usage-trend-metric-value { flex: 1; min-width: 0; font-variant-numeric: tabular-nums; }
.usage-trend-metric-card :deep(.cs-metric-card__meta) { line-height: 1.65; }
</style>
