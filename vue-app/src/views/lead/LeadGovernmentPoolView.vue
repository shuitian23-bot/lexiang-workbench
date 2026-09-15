<template>
  <section ref="rootEl" class="lead-government-pool-native" v-html="pageHtml"></section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  ensureNativeWorkbenchRuntime,
  renderNativeWorkbenchPage,
  runNativeWorkbenchPageInit
} from '@/adapters/legacyWorkbench/nativeWorkbenchRuntime'

const pageId = 'lead.governmentPool'
const router = useRouter()
const appStore = useAppStore()
const rootEl = ref<HTMLElement | null>(null)
const pageHtml = ref('')

onMounted(async () => {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '线索池-政企 - 乐享 AI 工作台'
  await ensureNativeWorkbenchRuntime(router)
  pageHtml.value = renderNativeWorkbenchPage(pageId)
  await nextTick()
  runNativeWorkbenchPageInit(pageId)
})
</script>

<style scoped>
.lead-government-pool-native {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 24px;
  min-width: 0;
  container-type: inline-size;
}
.lead-government-pool-native :deep(> *) { grid-column: 1 / -1; min-width: 0; }
.lead-government-pool-native :deep(> .page-header) {
  grid-column: 1;
  grid-row: 1;
  margin: 0 0 20px;
  padding: 0;
}
.lead-government-pool-native :deep(> .lead-toolbar) {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding: 0;
}
.lead-government-pool-native :deep(> .lead-toolbar .btn) {
  height: 36px;
  min-height: 36px;
  padding: 0 16px;
  white-space: nowrap;
}
@container (max-width: 680px) {
  .lead-government-pool-native :deep(> .page-header) { grid-column: 1 / -1; margin-bottom: 12px; }
  .lead-government-pool-native :deep(> .lead-toolbar) { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start !important; margin-bottom: 16px; }
}
</style>
