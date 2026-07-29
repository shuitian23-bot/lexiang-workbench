<template>
  <section ref="rootEl" class="lead-pool-native" v-html="pageHtml"></section>
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

const pageId = 'lead.pool'
const router = useRouter()
const appStore = useAppStore()
const rootEl = ref<HTMLElement | null>(null)
const pageHtml = ref('')

onMounted(async () => {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '联想门户工作台'

  await ensureNativeWorkbenchRuntime(router)
  pageHtml.value = renderNativeWorkbenchPage(pageId)
  await nextTick()
  runNativeWorkbenchPageInit(pageId)
})
</script>
