<template>
  <div class="ai-panel-header">
    <div class="ai-panel-title">
      <span class="ai-assistant-avatar">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v2.2M6 5.2 4.8 4M14 5.2 15.2 4"/><rect x="4" y="6.2" width="12" height="9" rx="3"/><path d="M7.5 10.2h.01M12.5 10.2h.01M8.2 13h3.6"/></svg>
      </span>
      <span class="ai-title-copy">
        <span class="ai-title-name">AI 助手</span>
        <span class="ai-title-subtitle ai-attention-pill" :title="`正在关注:${attentionLabel}`">
          <span class="ai-attention-dot"></span>正在关注:{{ attentionLabel }}
        </span>
      </span>
    </div>
    <div class="ai-panel-actions">
      <button type="button" class="ai-icon-action ai-action-settings" @click="$emit('open-skill-manager')" title="管理技能" aria-label="管理技能">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 2.8h2.6l.5 2a5.4 5.4 0 0 1 1.3.8l2-.6 1.3 2.2-1.5 1.4c.1.4.2.9.2 1.4s-.1 1-.2 1.4l1.5 1.4-1.3 2.2-2-.6c-.4.3-.8.6-1.3.8l-.5 2H8.7l-.5-2a5.4 5.4 0 0 1-1.3-.8l-2 .6-1.3-2.2 1.5-1.4A5.5 5.5 0 0 1 4.9 10c0-.5.1-1 .2-1.4L3.6 7.2 4.9 5l2 .6c.4-.3.8-.6 1.3-.8l.5-2z"/><circle cx="10" cy="10" r="2.3"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-new" @click="$emit('new-conversation')" title="新开会话" aria-label="新开会话">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-history" @click="$emit('open-history')" title="历史对话" aria-label="历史对话">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 5.8A7 7 0 1 1 3 10"/><path d="M4.2 5.8H7M4.2 5.8V3"/><path d="M10 6.4v4l2.6 1.6"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-collapse" @click="$emit('toggle-ai')" title="收起 AI 助手" aria-label="收起 AI 助手">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="3.5" width="14.4" height="13" rx="2.4"/><line x1="12" y1="3.5" x2="12" y2="16.5"/><path d="M8.2 8 6.1 10l2.1 2"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  attentionLabel: {
    type: String,
    default: '门户工作台'
  }
})

defineEmits(['open-skill-manager', 'new-conversation', 'open-history', 'toggle-ai'])
</script>
