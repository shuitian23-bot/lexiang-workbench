<script setup lang="ts">
import { computed } from 'vue'

interface Slice {
  name: string
  value: number
  hasSevere: boolean
}

const props = defineProps<{ segments: Slice[] }>()

const R = 70
const C = 2 * Math.PI * R

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0) || 1)

const arcs = computed(() => {
  let acc = 0
  return props.segments.map((s) => {
    const len = (s.value / total.value) * C
    const arc = {
      name: s.name,
      value: s.value,
      color: s.hasSevere ? 'var(--color-danger)' : 'var(--color-warning)',
      dasharray: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      dashoffset: (-acc).toFixed(2),
      share: ((s.value / total.value) * 100).toFixed(1)
    }
    acc += len
    return arc
  })
})
</script>

<template>
  <div class="ai-donut">
    <div class="ai-donut__chart">
      <svg viewBox="0 0 200 200" class="ai-donut__svg" role="img" aria-label="高频问题类型占比">
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" :r="R" fill="none" stroke="var(--color-border-subtle)" stroke-width="20" />
          <circle
            v-for="(arc, i) in arcs"
            :key="i"
            cx="100"
            cy="100"
            :r="R"
            fill="none"
            :stroke="arc.color"
            stroke-width="20"
            :stroke-dasharray="arc.dasharray"
            :stroke-dashoffset="arc.dashoffset"
          />
        </g>
        <text x="100" y="94" text-anchor="middle" class="ai-donut__total">{{ total }}</text>
        <text x="100" y="116" text-anchor="middle" class="ai-donut__caption">异常项总数</text>
      </svg>
    </div>
    <ul class="ai-donut__legend">
      <li v-for="(arc, i) in arcs" :key="i">
        <i class="ai-donut__swatch" :style="{ background: arc.color }" />
        <span class="ai-donut__name">{{ arc.name }}</span>
        <span class="ai-donut__count">{{ arc.value }}</span>
        <span class="ai-donut__share">{{ arc.share }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ai-donut { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.ai-donut__chart { width: 168px; height: 168px; flex-shrink: 0; }
.ai-donut__svg { width: 100%; height: 100%; }
.ai-donut__total { font-size: 30px; font-weight: 700; fill: var(--color-text); }
.ai-donut__caption { font-size: 12px; fill: var(--color-text-tertiary); }
.ai-donut__legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 180px; }
.ai-donut__legend li {
  display: grid;
  grid-template-columns: 12px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px dashed var(--color-border-subtle);
}
.ai-donut__legend li:last-child { border-bottom: none; }
.ai-donut__swatch { width: 10px; height: 10px; border-radius: var(--radius-sm); }
.ai-donut__name { color: var(--color-text); }
.ai-donut__count { color: var(--color-text-secondary); font-weight: 600; }
.ai-donut__share { color: var(--color-text-tertiary); width: 44px; text-align: right; }
</style>
