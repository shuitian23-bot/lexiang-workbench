<script setup lang="ts">
import { ref, nextTick, onMounted, onActivated, onDeactivated, onBeforeUnmount, watch } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'
const props = defineProps<{ option: EChartsOption; label: string }>()
const host = ref<HTMLElement | null>(null)
const failed = ref(false)
let instance: ECharts | null = null
let observer: ResizeObserver | null = null
let disposed = false
let active = false
let activationId = 0
function resolveTokens(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/var\((--[\w-]+)\)/g, (_, token: string) =>
    host.value ? getComputedStyle(host.value).getPropertyValue(token).trim() : '')
  if (Array.isArray(value)) return value.map(resolveTokens)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTokens(item)]))
  return value
}
function render() {
  if (active) instance?.setOption(resolveTokens(props.option) as EChartsOption, { notMerge: true })
}

async function activateChart() {
  if (disposed || active) return
  active = true
  const currentActivation = ++activationId
  await nextTick()
  try {
    if (!instance) {
      const runtime = await import('echarts')
      if (disposed || !active || currentActivation !== activationId || !host.value) return
      instance = runtime.init(host.value)
    }
    if (disposed || !active || currentActivation !== activationId || !host.value) return
    failed.value = false
    render()
    instance.resize()
    observer ??= new ResizeObserver(() => {
      if (active) instance?.resize()
    })
    observer.observe(host.value)
  } catch {
    if (active && !disposed && currentActivation === activationId) failed.value = true
  }
}

function deactivateChart() {
  active = false
  activationId += 1
  observer?.disconnect()
}

onMounted(activateChart)
onActivated(activateChart)
onDeactivated(deactivateChart)
watch(() => props.option, render, { deep: true })
onBeforeUnmount(() => {
  disposed = true
  deactivateChart()
  observer = null
  instance?.dispose()
  instance = null
})
</script>
<template>
  <div class="review-chart" ref="host" role="img" :aria-label="label">
    <p v-if="failed" role="alert">图表加载失败，请刷新重试</p>
  </div>
</template>
<style scoped>
.review-chart { width: 100%; height: 100%; min-width: 0; min-height: 0; }
.review-chart p { color: var(--color-text-secondary); font-size: var(--text-sm, 13px); }
</style>
