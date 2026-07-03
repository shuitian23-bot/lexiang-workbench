<template>
  <!--
    三栏布局的三个根节点，对应封板工作台壳层：
      .sidebar  → AppSidebar
      .main     → 中间主区（topbar + workspace-tabs + page-content）
      .ai-panel → AppAIPanel
    注意：用 Fragment（多根节点）而不是包一层 div，保持与当前 CSS 选择器兼容
  -->
  <AppSidebar />

  <div class="main" id="main-area">
    <AppTopbar />

    <DynamicTabs
      :temp-tabs="tempTabs"
      :active-temp-tab-id="activeTempTabId"
      @activate="activateTempTab"
      @close="closeTempTab"
    />

    <!-- 页面内容区（对应原 #page-content）-->
    <div class="page-content" id="page-content" ref="pageContentEl">
      <!--
        KeepAlive 保留已访问页面的组件状态，避免切换时重新请求数据。
        当 activeTempTabId 有值时，显示 AI 报告临时页内容；
        否则显示 RouterView 路由页面。
      -->
      <TempTabView v-if="activeTempTabId" />
      <RouterView v-else v-slot="{ Component, route: matchedRoute }">
        <KeepAlive>
          <component :is="Component" :key="matchedRoute.path" />
        </KeepAlive>
      </RouterView>
    </div>
  </div>

  <AppAIPanel />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppSidebar   from './shell/sidebar/WorkbenchSidebar.vue'
import AppTopbar    from './shell/topbar/WorkbenchTopbar.vue'
import AppAIPanel   from './shell/agent/WorkbenchAgentPanel.vue'
import TempTabView  from './TempTabView.vue'
import DynamicTabs  from './topbar/DynamicTabs.vue'

const appStore = useAppStore()
const route    = useRoute()
const router   = useRouter()

const { tempTabs, activeTempTabId, darkMode } = storeToRefs(appStore)

const pageContentEl = ref(null)

// ---- 深色模式初始化 ----
onMounted(async () => {
  appStore.applyDarkMode(darkMode.value)

  // 加载菜单权限（对应原 doLogin 后的 loadUserContext）
  if (!appStore.visibleMenus.length) {
    await appStore.loadUserContext()
  }
  appStore.restoreSavedTempTabs()

})

watch(darkMode, (val) => {
  appStore.applyDarkMode(val)
})

// ---- 路由变化时：重置临时页签视图、滚回顶部（对应原 workspaceResetContentScroll）----
watch(() => route.path, () => {
  // 路由切换时退出临时 tab 视图
  if (activeTempTabId.value) {
    appStore.setActiveTempTab(null)
  }
  // 滚回顶部
  if (pageContentEl.value) {
    pageContentEl.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

// ---- 临时报告页签操作（对应 workspaceActivateTempTab / workspaceCloseTempTab）----
function activateTempTab(id) {
  appStore.setActiveTempTab(id)
  // 滚回顶部
  if (pageContentEl.value) {
    pageContentEl.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function closeTempTab(id) {
  const backToBase = appStore.closeTempTab(id)
  if (backToBase) {
    // 回到基础业务页
    if (pageContentEl.value) pageContentEl.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

</script>
