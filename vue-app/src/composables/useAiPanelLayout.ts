import { computed, onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAIStore } from '@/stores/ai'

export function useAiPanelLayout(panelEl: Ref<HTMLElement | null>) {
  const aiStore = useAIStore()
  const { open, panelWidth } = storeToRefs(aiStore)

  const panelWidthStyle = computed(() => (
    open.value && panelWidth.value
      ? { width: `${panelWidth.value}px`, '--ai-panel-width': `${panelWidth.value}px` }
      : {}
  ))

  function syncBodyPanelState() {
    const panel = panelEl?.value
    const isOpen = open.value
    const width = panelWidth.value
    const maxWidth = aiStore.maxPanelWidth(window.innerWidth)
    const atMax = isOpen && width >= maxWidth - 1

    document.body.classList.toggle('ai-open', isOpen)
    document.body.classList.toggle('ai-squeeze', atMax)

    if (isOpen && width) {
      document.body.style.setProperty('--active-ai-panel-width', `${width}px`)
      panel?.style.setProperty('--ai-panel-width', `${width}px`)
    } else {
      document.body.classList.remove('ai-squeeze')
      document.body.style.removeProperty('--active-ai-panel-width')
      panel?.style.removeProperty('--ai-panel-width')
      panel?.style.removeProperty('width')
    }
  }

  const stopSync = watch([open, panelWidth], syncBodyPanelState, {
    immediate: true,
    flush: 'post'
  })

  onBeforeUnmount(() => {
    stopSync()
    document.body.classList.remove('ai-open', 'ai-squeeze')
    document.body.style.removeProperty('--active-ai-panel-width')
  })

  return {
    panelWidthStyle,
    syncBodyPanelState
  }
}
