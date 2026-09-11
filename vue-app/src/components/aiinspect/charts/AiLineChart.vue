<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

const props = defineProps<{
  points: number[]
  labels: string[]
  color?: string
}>()

const W = 600
const H = 200
const PAD_X = 28
const PAD_TOP = 18
const PAD_BOTTOM = 26

const color = computed(() => props.color || 'var(--color-primary)')

const coords = computed(() => {
  const values = props.points
  const max = Math.max(...values, 100)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  return values.map((value, index) => {
    const x = values.length <= 1 ? W / 2 : PAD_X + ((W - PAD_X * 2) * index) / (values.length - 1)
    const y = H - PAD_BOTTOM - ((value - min) / span) * (H - PAD_TOP - PAD_BOTTOM)
    return { x, y, value }
  })
})

const linePath = computed(() => coords.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const areaPath = computed(() => {
  const first = coords.value[0] || { x: PAD_X, y: H - PAD_BOTTOM }
  const last = coords.value[coords.value.length - 1] || { x: W - PAD_X, y: H - PAD_BOTTOM }
  return `M ${first.x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} L ${linePath.value} L ${last.x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} Z`
})
const gradientId = `ai-inspect-line-gradient-${getCurrentInstance()?.uid}`
</script>

<template>
  <div class="ai-line">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="ai-line__svg" role="img" aria-label="趋势折线图">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.18" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path class="ai-line__area" :d="areaPath" :fill="`url(#${gradientId})`" />
      <polyline class="ai-line__stroke" :points="linePath" :stroke="color" fill="none" />
      <circle
        v-for="(p, i) in coords"
        :key="i"
        class="ai-line__dot"
        :cx="p.x"
        :cy="p.y"
        r="3"
        :fill="color"
      />
      <text
        v-for="(p, i) in coords"
        :key="`t${i}`"
        :x="p.x"
        :y="p.y - 8"
        text-anchor="middle"
        class="ai-line__value"
      >{{ p.value }}%</text>
    </svg>
    <div class="ai-line__x">
      <span v-for="(label, i) in labels" :key="i">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ai-line { width: 100%; }
.ai-line__svg { width: 100%; height: 200px; display: block; }
.ai-line__stroke { stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.ai-line__value { font-size: 12px; font-weight: 600; fill: var(--color-text-secondary); }
.ai-line__x {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
