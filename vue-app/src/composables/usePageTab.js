/**
 * 通用 composable：在页面 onMounted 时自动注册页签
 *
 * 用法：在任意 View 组件中
 *   import { usePageTab } from '@/composables/usePageTab'
 *   usePageTab('dashboard.overview', '运营总览', '乐享运营')
 */
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

export function usePageTab(pageId, title, groupLabel) {
  const appStore = useAppStore()
  onMounted(() => {
    appStore.ensureTab(pageId, title, groupLabel)
    appStore.setActiveTab(pageId)
  })
}
