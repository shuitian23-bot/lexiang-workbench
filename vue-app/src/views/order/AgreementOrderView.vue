<template>
  <section ref="rootEl" class="agreement-order-native" v-html="pageHtml"></section>
  <Teleport v-if="headerTarget" :to="headerTarget">
    <ContentPageHeader
      title="协议采购订单"
      description="查看与处理用户在协议采购单中下单生成的协议产品订单，支持按地址拆单后的多订单跟踪"
    />
  </Teleport>
</template>

<script setup lang="ts">
import './agreement-order.css'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
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
const headerTarget = ref<HTMLElement | null>(null)

onMounted(async () => {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  document.title = '协议采购订单 - 乐享 AI 工作台'
  await ensureNativeWorkbenchRuntime(router)
  pageHtml.value = renderNativeWorkbenchPage(pageId)
  await nextTick()
  rootEl.value?.querySelector('.apo-filter')?.classList.add('standard-filter-controls')
  runNativeWorkbenchPageInit(pageId)
  const head = rootEl.value?.querySelector<HTMLElement>('.apo-page:not(.apo-detail) > .apo-head')
  const nativeTitle = head?.querySelector<HTMLElement>(':scope > div > h1')
  const heading = nativeTitle?.parentElement
  if (nativeTitle && heading) {
    const target = document.createElement('div')
    target.className = 'apo-vue-heading'
    nativeTitle.before(target)
    nativeTitle.remove()
    heading.querySelector(':scope > p')?.remove()
    headerTarget.value = target
  }
})
</script>
