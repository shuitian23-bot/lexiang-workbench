<template>
  <div class="workspace-tabs" id="workspace-tabs" v-if="tempTabs.length">
    <div class="workspace-tabs-list">
      <button
        v-for="tab in tempTabs"
        :key="tab.id"
        type="button"
        class="workspace-tab workspace-tab-report"
        :class="{ active: tab.id === activeTempTabId, saved: tab.saved }"
        @click="$emit('activate', tab.id)"
      >
        <span class="workspace-tab-spark" aria-hidden="true">*</span>
        <span class="workspace-tab-title">{{ reportTabTitle(tab) }}</span>
        <span v-if="tab.saved" class="workspace-tab-saved">已保存</span>
        <span
          class="workspace-tab-close"
          role="button"
          tabindex="0"
          title="关闭页签"
          @click.stop="$emit('close', tab.id)"
          @keydown.enter.prevent.stop="$emit('close', tab.id)"
          @keydown.space.prevent.stop="$emit('close', tab.id)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tempTabs: {
    type: Array,
    default: () => []
  },
  activeTempTabId: {
    type: String,
    default: null
  }
})

defineEmits(['activate', 'close'])

function reportTabTitle(tab) {
  const page = tab.sourcePageLabel || ''
  let clean = String(tab.title || '')
    .replace(/^AI\s*报告\s*[·:：-]\s*/i, '')
    .replace(/\s*#\d+\s*$/g, '')
    .trim()
  if (page) clean = clean.replace(new RegExp(`^${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[·:：-]?\\s*`), '').trim()
  const compact = (clean || '数据报告')
    .replace(/本地预览报告/g, '预览报告')
    .replace(/数据解读报告/g, '解读报告')
    .replace(/原因分析$/, '分析')
    .replace(/汇总分析$/, '汇总')
    .replace(/数据分析$/, '分析')
    .trim()
  return (compact || '数据报告').slice(0, 10)
}
</script>
