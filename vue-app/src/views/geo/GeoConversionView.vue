<template>
  <section ref="rootEl" class="geo-conversion-native" v-html="pageHtml"></section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  ensureNativeWorkbenchRuntime,
  renderNativeWorkbenchPage,
  runNativeWorkbenchPageInit
} from '@/adapters/legacyWorkbench/nativeWorkbenchRuntime'

const pageId = 'dashboard.geoConversion'
const router = useRouter()
const appStore = useAppStore()
const rootEl = ref<HTMLElement | null>(null)
const pageHtml = ref('')
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
let resizeFrame = 0
const observed = new WeakSet<Element>()
function observeCharts() {
  rootEl.value?.querySelectorAll<HTMLElement>('[id^="gc-"]').forEach(el => {
    if (!el.id.includes('trend') && !el.id.includes('donut')) return
    if (!observed.has(el)) { observed.add(el); resizeObserver?.observe(el) }
  })
}
function resizeCharts() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    const charts = (window as unknown as { echarts?: { getInstanceByDom: (el: HTMLElement) => { resize: () => void } | undefined } }).echarts
    rootEl.value?.querySelectorAll<HTMLElement>('[id^="gc-"]').forEach(el => charts?.getInstanceByDom(el)?.resize())
  })
}
onBeforeUnmount(() => { resizeObserver?.disconnect(); mutationObserver?.disconnect(); cancelAnimationFrame(resizeFrame) })

onMounted(async () => {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '联想门户工作台'

  await ensureNativeWorkbenchRuntime(router)
  pageHtml.value = renderNativeWorkbenchPage(pageId)
  await nextTick()
  runNativeWorkbenchPageInit(pageId)
  resizeObserver = new ResizeObserver(resizeCharts)
  mutationObserver = new MutationObserver(observeCharts)
  if (rootEl.value) { mutationObserver.observe(rootEl.value, { childList: true, subtree: true }); resizeObserver.observe(rootEl.value) }
  observeCharts()
  resizeCharts()
})
</script>

<style scoped>
.geo-conversion-native { min-width: 0; container-type: inline-size; }
.geo-conversion-native :deep(.geo-conv-section) { padding: 20px; margin-bottom: 20px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.geo-conversion-native :deep(.geo-conv-title) { font-size: 16px; font-weight: 600; line-height: 24px; margin-bottom: 16px; }
.geo-conversion-native :deep(.geo-panel) { min-width: 0 !important; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle); background: var(--color-surface); box-shadow: none; }
.geo-conversion-native :deep(.gpnl-title) { font-size: 14px; line-height: 20px; font-weight: 600; margin-bottom: 12px; }
.geo-conversion-native :deep(.geo-row) { display: grid !important; grid-template-columns: minmax(160px,.65fr) repeat(2,minmax(0,1fr)); gap: 16px !important; align-items: stretch; margin-bottom: 20px !important; }
.geo-conversion-native :deep(.geo-row > .geo-panel) { height: auto !important; align-self: stretch; }
.geo-conversion-native :deep([id^="gc-"][id*="trend"]),
.geo-conversion-native :deep([id^="gc-"][id*="donut"]) { width: 100% !important; height: 280px !important; min-width: 0; }
.geo-conversion-native :deep(#gc-section-official .geo-row:last-child) { grid-template-columns: minmax(0,2fr) repeat(2,minmax(0,1fr)); margin-bottom: 0 !important; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel) { margin-bottom: 16px !important; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child) { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1.3fr); gap: 16px !important; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div) { min-width: 0 !important; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div:first-child) { grid-column: 1; padding: 16px; background: var(--color-bg-subtle); border-radius: var(--radius-md); }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div:nth-child(2)) { grid-column: 1; grid-row: 2; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div:nth-child(3)) { grid-column: 2; grid-row: 2; overflow-x: auto; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div:last-child) { grid-column: 2; grid-row: 1; display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px !important; }
.geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div:last-child > div) { padding: 16px !important; border: 0 !important; border-radius: var(--radius-md) !important; background: var(--color-bg-subtle) !important; }
.geo-conversion-native :deep(.geo-conv-grid) { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; align-items: stretch; }
.geo-conversion-native :deep(.geo-conv-grid > div) { min-width: 0; padding: 16px; border-radius: var(--radius-md); }
.geo-conversion-native :deep(table) { width: 100%; }
.geo-conversion-native :deep(th:first-child) { min-width: 48px; white-space: nowrap; }
.geo-conversion-native :deep(th), .geo-conversion-native :deep(td) { padding: 8px 12px; height: 40px; }
@container (max-width: 1100px) {
  .geo-conversion-native :deep(.geo-row) { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .geo-conversion-native :deep(.geo-row > .geo-panel:first-child) { grid-column: 1 / -1; }
  .geo-conversion-native :deep(#gc-section-official .geo-row:last-child) { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .geo-conversion-native :deep(.geo-conv-grid) { grid-template-columns: repeat(3,minmax(0,1fr)); }
}
@container (max-width: 720px) {
  .geo-conversion-native :deep(.geo-row), .geo-conversion-native :deep(#gc-section-official .geo-row:last-child) { grid-template-columns: minmax(0,1fr); }
  .geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child) { grid-template-columns: minmax(0,1fr); }
  .geo-conversion-native :deep(#gc-section-biz .geo-panel > div:last-child > div) { grid-column: 1 !important; grid-row: auto !important; }
  .geo-conversion-native :deep(.geo-conv-grid) { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
</style>
