<template>
  <section ref="rootEl" class="agreement-order-native" v-html="pageHtml"></section>
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

const pageId = 'order.agreement'
const router = useRouter()
const appStore = useAppStore()
const rootEl = ref<HTMLElement | null>(null)
const pageHtml = ref('')

onMounted(async () => {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '协议采购订单 - 乐享 AI 工作台'
  await ensureNativeWorkbenchRuntime(router)
  pageHtml.value = renderNativeWorkbenchPage(pageId)
  await nextTick()
  runNativeWorkbenchPageInit(pageId)
})
</script>
