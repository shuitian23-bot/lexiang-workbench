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
      <button type="button" class="ai-icon-action ai-action-settings" @click="$emit('open-skill-manager')" data-tooltip="管理技能" data-tooltip-placement="bottom" aria-label="管理技能">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 2.8h2.6l.5 2a5.4 5.4 0 0 1 1.3.8l2-.6 1.3 2.2-1.5 1.4c.1.4.2.9.2 1.4s-.1 1-.2 1.4l1.5 1.4-1.3 2.2-2-.6c-.4.3-.8.6-1.3.8l-.5 2H8.7l-.5-2a5.4 5.4 0 0 1-1.3-.8l-2 .6-1.3-2.2 1.5-1.4A5.5 5.5 0 0 1 4.9 10c0-.5.1-1 .2-1.4L3.6 7.2 4.9 5l2 .6c.4-.3.8-.6 1.3-.8l.5-2z"/><circle cx="10" cy="10" r="2.3"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-new" @click="$emit('new-conversation')" data-tooltip="新开会话" data-tooltip-placement="bottom" aria-label="新开会话">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-history" @click="$emit('open-history')" data-tooltip="历史对话" data-tooltip-placement="bottom" aria-label="历史对话">
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 5.8A7 7 0 1 1 3 10"/><path d="M4.2 5.8H7M4.2 5.8V3"/><path d="M10 6.4v4l2.6 1.6"/></svg>
      </button>
      <button type="button" class="ai-icon-action ai-action-collapse" @click="$emit('toggle-ai')" data-tooltip="收起 AI 助手" data-tooltip-placement="bottom" data-tooltip-align="end" aria-label="收起 AI 助手">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/>
          <rect x="8.6" y="6.3" width="1.8" height="11.4" rx="0.9" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  attentionLabel: {
    type: String,
    default: '联想门户工作台'
  }
})

defineEmits(['open-skill-manager', 'new-conversation', 'open-history', 'toggle-ai'])
</script>
