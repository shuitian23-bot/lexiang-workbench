<template>
  <div class="topbar-right">
    <button
      v-show="!aiOpen"
      type="button"
      class="ai-toggle"
      id="ai-toggle-btn"
      :class="{ active: aiOpen }"
      @click="$emit('toggle-ai')"
      title="打开 AI 助手"
      aria-label="打开 AI 助手"
    >
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 2.8v2.4M5.8 5.1 4.5 3.8M14.2 5.1l1.3-1.3"/>
        <rect x="4" y="6" width="12" height="9" rx="3"/>
        <path d="M7.5 10h.01M12.5 10h.01M8 13h4"/>
      </svg>
      <span>AI 助手</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  aiOpen: {
    type: Boolean,
    default: false
  }
})
defineEmits(['toggle-ai'])
</script>
