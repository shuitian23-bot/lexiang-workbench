<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { formatUsageMiniTrendValue, getUsageMiniTrend, getUsageMiniTrendIndex, getUsageTrendValue } from '@/domain/usageMiniTrend.js'

type TrendRow = { date: string; [key: string]: number | string | null | undefined }
const props = withDefaults(defineProps<{
  rows: TrendRow[]; series: { key: string; label: string }[]; label: string; sourceLabel: string
  format?: 'number' | 'decimal' | 'percent'; tone?: 'blue' | 'purple' | 'green' | 'slate'
}>(), { format: 'number', tone: 'blue' })
const displayRows = computed(() => props.rows.map(row => {
  const projected = { ...row }
  for (const entry of props.series) projected[entry.key] = getUsageTrendValue(row[entry.key])
  return projected
}))
const model = computed(() => getUsageMiniTrend(props.series.map(entry => ({ ...entry, values: displayRows.value.map(row => row[entry.key]) }))))
const description = computed(() => `${props.label}，${props.rows[0]?.date || '暂无日期'} 至 ${props.rows[props.rows.length - 1]?.date || '暂无日期'}，${props.sourceLabel}，${props.series.map(entry => entry.label).join('、')}`)
const activeIndex = ref<number | null>(null)
const tooltipId = `usage-mini-tooltip-${getCurrentInstance()?.uid ?? 0}`
const activeRow = computed(() => activeIndex.value == null ? null : displayRows.value[activeIndex.value] ?? null)
const activeX = computed(() => activeIndex.value == null ? 0 : props.rows.length <= 1 ? 130 : 10 + 240 * activeIndex.value / (props.rows.length - 1))
const activePoints = computed(() => model.value.series.flatMap((entry, seriesIndex) => {
  const point = entry.segments.flatMap(segment => segment.points).find(item => item.index === activeIndex.value)
  return point ? [{ ...point, key: entry.key, seriesIndex }] : []
}))
const tooltipStyle = computed(() => activeIndex.value != null && activeIndex.value > (props.rows.length - 1) / 2
  ? { right: 'var(--space-1, 4px)' } : { left: 'var(--space-1, 4px)' })
function color(index: number) {
  return props.series.length > 1 ? index % 2 === 0 ? 'var(--chart-1, var(--color-primary))' : 'var(--chart-3, var(--color-success))' : 'var(--usage-mini-color)'
}
function clearActive() { activeIndex.value = null }
function onPointerMove(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  activeIndex.value = bounds.width > 0 ? getUsageMiniTrendIndex((event.clientX - bounds.left) / bounds.width * 260, props.rows.length) : null
}
function onFocus() { if (model.value.hasData && props.rows.length) activeIndex.value = props.rows.length - 1 }
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); clearActive(); return }
  if (!model.value.hasData || !props.rows.length || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const current = activeIndex.value ?? props.rows.length - 1
  activeIndex.value = event.key === 'Home' ? 0 : event.key === 'End' ? props.rows.length - 1
    : Math.max(0, Math.min(props.rows.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)))
}
watch(() => [props.rows, props.series, props.format, props.sourceLabel, props.label], clearActive, { deep: true, flush: 'sync' })
</script>

<template>
  <div class="usage-mini-trend" :class="`usage-mini-tone-${tone}`">
    <div v-if="model.hasData" class="usage-mini-canvas" tabindex="0" role="group" :aria-label="`${description}；左右方向键逐日查看，Home和End到首尾，Escape关闭读数`" :aria-describedby="activeRow ? tooltipId : undefined" @pointerenter="onPointerMove" @pointermove="onPointerMove" @pointerleave="clearActive" @focus="onFocus" @blur="clearActive" @keydown="onKeydown">
      <svg class="usage-mini-svg" viewBox="0 0 260 82" preserveAspectRatio="none" role="img" :aria-label="description">
        <title>{{ description }}</title>
        <g v-for="(entry, seriesIndex) in model.series" :key="entry.key" :style="{ color: color(seriesIndex) }">
          <g v-for="(segment, segmentIndex) in entry.segments" :key="segmentIndex">
            <path v-if="segment.areaPath" class="usage-mini-area" :d="segment.areaPath" />
            <path class="usage-mini-line" :d="segment.linePath" vector-effect="non-scaling-stroke" />
          </g>
          <circle v-for="marker in entry.markers" :key="marker.index" class="usage-mini-point" :cx="marker.x" :cy="marker.y" r="3" vector-effect="non-scaling-stroke"><title>{{ rows[marker.index]?.date }} · {{ entry.label }} {{ formatUsageMiniTrendValue(marker.value, format) }}</title></circle>
        </g>
        <g v-if="activeRow" class="usage-mini-hover" aria-hidden="true">
          <line class="usage-mini-hover-line" :x1="activeX" :x2="activeX" y1="10" y2="72" vector-effect="non-scaling-stroke" />
          <circle v-for="point in activePoints" :key="point.key" class="usage-mini-hover-point" :style="{ color: color(point.seriesIndex) }" :cx="point.x" :cy="point.y" r="3.5" vector-effect="non-scaling-stroke" />
        </g>
      </svg>
      <div v-if="activeRow" :id="tooltipId" class="usage-mini-tooltip" :style="tooltipStyle" role="tooltip" aria-live="polite" aria-atomic="true">
        <strong class="usage-mini-tooltip-date">{{ activeRow.date }}</strong>
        <dl><div v-for="(entry, index) in series" :key="entry.key"><dt><i aria-hidden="true" :style="{ color: color(index) }"></i>{{ entry.label }}</dt><dd>{{ formatUsageMiniTrendValue(activeRow[entry.key], format) }}</dd></div></dl>
      </div>
    </div>
    <div v-else class="usage-mini-empty" role="img" :aria-label="`${description}，暂无趋势数据`">暂无趋势数据</div>
    <div v-if="model.hasData && series.length > 1" class="usage-mini-legend" aria-label="趋势图例">
      <span v-for="(entry, index) in series" :key="entry.key"><i aria-hidden="true" :style="{ color: color(index) }"></i>{{ entry.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.usage-mini-trend { display: grid; gap: var(--space-1, 4px); min-width: 0; font-size: var(--text-xs, 12px); font-weight: 400; --usage-mini-color: var(--chart-1, var(--color-primary)); }
.usage-mini-tone-purple { --usage-mini-color: var(--chart-5, var(--color-primary)); }
.usage-mini-tone-green { --usage-mini-color: var(--chart-3, var(--color-success)); }
.usage-mini-tone-slate { --usage-mini-color: var(--chart-7, var(--color-text-secondary)); }
.usage-mini-canvas { position: relative; min-width: 0; }
.usage-mini-canvas:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: var(--radius-md); }
.usage-mini-svg { display: block; width: 100%; height: calc(var(--space-5, 20px) * 4); overflow: visible; }
.usage-mini-area { fill: currentColor; opacity: 0.1; }
.usage-mini-line { fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.usage-mini-point, .usage-mini-hover-point { fill: var(--color-surface); stroke: currentColor; stroke-width: 2; }
.usage-mini-hover { pointer-events: none; }
.usage-mini-hover-line { stroke: var(--color-text-tertiary); stroke-width: 1; stroke-dasharray: 3 3; }
.usage-mini-tooltip { position: absolute; top: var(--space-1, 4px); z-index: 5; box-sizing: border-box; width: max-content; max-width: calc(100% - var(--space-2, 8px)); min-width: 0; padding: var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-md); color: var(--color-text); font-size: var(--text-xs, 12px); font-weight: 400; line-height: 1.65; overflow-wrap: anywhere; pointer-events: none; }
.usage-mini-tooltip-date { display: block; font-weight: 600; }
.usage-mini-tooltip dl { display: grid; gap: var(--space-1, 4px); margin: var(--space-1, 4px) 0 0; }
.usage-mini-tooltip dl > div { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--space-1, 4px) var(--space-3, 12px); min-width: 0; }
.usage-mini-tooltip dt { display: inline-flex; align-items: center; gap: var(--space-1, 4px); min-width: 0; }
.usage-mini-tooltip dd { max-width: 100%; min-width: 0; margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.usage-mini-tooltip i { flex: none; width: var(--space-2, 8px); height: var(--space-2, 8px); border-radius: var(--radius-pill, 9999px); background: currentColor; }
.usage-mini-empty { display: grid; min-height: calc(var(--space-5, 20px) * 4); place-items: center; color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.usage-mini-legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-3, 12px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-mini-legend span { display: inline-flex; align-items: center; gap: var(--space-1, 4px); }
.usage-mini-legend i { width: var(--space-3, 12px); height: var(--space-1, 4px); border-radius: var(--radius-pill, 9999px); background: currentColor; }
</style>
