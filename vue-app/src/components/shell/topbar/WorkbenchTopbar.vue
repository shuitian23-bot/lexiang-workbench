<template>
  <div class="topbar">
    <StaticTabs
      ref="staticTabsRef"
      :group-label="groupLabel"
      :static-tabs="staticTabs"
      :active-static-tab-id="activeStaticTabId"
      @activate="activateTab"
      @close="closeTab"
    />
    <TopbarActions
      :ai-open="aiOpen"
      @toggle-ai="aiStore.toggleOpen()"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore, getGroupLabel, pageIdToPath } from '@/stores/app'
import { useAIStore } from '@/stores/ai'
import StaticTabs from '@/components/topbar/StaticTabs.vue'
import TopbarActions from '@/components/topbar/TopbarActions.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const aiStore = useAIStore()

const { staticTabs, activeStaticTabId } = storeToRefs(appStore)
const { open: aiOpen } = storeToRefs(aiStore)
const staticTabsRef = ref(null)

const groupLabel = computed(() => {
  return getGroupLabel(activeStaticTabId.value || route.meta?.pageId || 'portal.home')
})

watch(() => route.meta?.pageId, (pageId) => {
  if (!pageId) return
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  revealActiveTab()
}, { immediate: true })

function activateTab(pageId) {
  // 静态页签与动态报告页签可同时保留，但点击基础业务页签必须回到该页内容。
  // 不能只依赖路由 watch：当前静态页签已在同一路由时，router.push 不会触发切换。
  appStore.setActiveTempTab(null)
  appStore.setActiveStaticTab(pageId)
  const path = pageIdToPath(pageId)
  if (path) router.push(path)
  revealActiveTab()
}

function closeTab(pageId) {
  const nextId = appStore.closeStaticTab(pageId)
  if (nextId) {
    appStore.setActiveStaticTab(nextId)
    const path = pageIdToPath(nextId)
    if (path) router.push(path)
  }
  revealActiveTab()
}

function revealActiveTab() {
  nextTick(() => staticTabsRef.value?.revealActiveTab())
}
</script>
