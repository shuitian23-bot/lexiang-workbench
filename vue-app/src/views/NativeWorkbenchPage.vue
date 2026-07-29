<template>
  <section ref="rootEl" class="native-workbench-page"></section>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, getPageLabel } from '@/stores/app'
import {
  ensureNativeWorkbenchRuntime,
  renderNativeWorkbenchPage,
  runNativeWorkbenchPageInit
} from '@/adapters/legacyWorkbench/nativeWorkbenchRuntime'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const rootEl = ref(null)

async function renderPage() {
  const pageId = route.meta?.pageId
  if (!pageId || !rootEl.value) return
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  await ensureNativeWorkbenchRuntime(router)
  rootEl.value.innerHTML = renderNativeWorkbenchPage(pageId)
  await nextTick()
  runNativeWorkbenchPageInit(pageId)
  document.title = '联想门户工作台'
}

onMounted(renderPage)
watch(() => route.meta?.pageId, renderPage)
</script>
