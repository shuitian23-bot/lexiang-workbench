<template>
  <div v-if="items.length" class="conversation-states" aria-label="AI 会话状态">
    <div v-if="showStateSummary" class="conversation-state-summary">
      <span class="summary-orb" aria-hidden="true"></span>
      <b>处理过程</b>
      <em>{{ summaryText }}</em>
      <button
        v-if="canToggle"
        type="button"
        class="state-toggle"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : '展开' }}
      </button>
    </div>
    <div
      v-for="item in visibleItems"
      :key="item.id"
      class="conversation-state"
      :class="[`is-${item.kind}`, `status-${item.status}`]"
    >
      <span class="state-icon" aria-hidden="true">
        <svg v-if="item.kind === 'thinking'" viewBox="0 0 20 20"><path d="M6.2 13.8a5 5 0 1 1 7.5-.5l-.8 1.1H7.1l-.9-.6Z"/><path d="M7.7 17h4.6"/></svg>
        <svg v-else-if="item.kind === 'tool_call'" viewBox="0 0 20 20"><path d="m12.8 4.2 3 3-3.5 3.5-3-3 3.5-3.5Z"/><path d="m9.3 7.7-5.1 5.1a2.1 2.1 0 0 0 3 3l5.1-5.1"/></svg>
        <svg v-else-if="item.kind === 'tool_result'" viewBox="0 0 20 20"><path d="M4 5.5h12v9H4z"/><path d="m7 10 2 2 4-4"/></svg>
        <svg v-else-if="item.kind === 'follow_up'" viewBox="0 0 20 20"><path d="M4 5h12v8H8l-4 3V5Z"/><path d="M7 8h6M7 11h4"/></svg>
        <svg v-else-if="item.kind === 'confirm'" viewBox="0 0 20 20"><path d="M10 3.5 16 6v4.1c0 3.1-2.1 5.4-6 6.4-3.9-1-6-3.3-6-6.4V6l6-2.5Z"/><path d="m7.4 10 1.8 1.8 3.6-4"/></svg>
        <svg v-else-if="item.kind === 'streaming'" viewBox="0 0 20 20"><path d="M4 5.5h7"/><path d="M4 10h12"/><path d="M4 14.5h9"/><path d="m14 4 2 2-2 2"/></svg>
        <svg v-else-if="item.kind === 'error'" viewBox="0 0 20 20"><path d="M10 3.5 17 16H3l7-12.5Z"/><path d="M10 8v3M10 14h.01"/></svg>
        <svg v-else viewBox="0 0 20 20"><path d="M4 10h12"/><path d="M11 5l5 5-5 5"/></svg>
      </span>
      <span class="state-body">
        <span class="state-title-row">
          <b>{{ item.title }}</b>
          <em>{{ statusLabel(item.status) }}</em>
        </span>
        <span v-if="item.detail" class="state-detail">{{ item.detail }}</span>
      </span>
      <span v-if="item.status === 'running'" class="state-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const expanded = ref(false)
const runningCount = computed(() => props.items.filter(item => item.status === 'running').length)
const pendingCount = computed(() => props.items.filter(item => item.status === 'pending').length)
const failedCount = computed(() => props.items.filter(item => item.status === 'failed').length)
const blockedCount = computed(() => props.items.filter(item => item.status === 'blocked').length)
const visibleItems = computed(() => {
  if (expanded.value) return props.items
  const activeItems = props.items.filter(item => item.status !== 'done' && item.kind !== 'confirm')
  return activeItems.slice(0, 3)
})
const hiddenCount = computed(() => Math.max(props.items.length - visibleItems.value.length, 0))
const canToggle = computed(() => props.items.length > visibleItems.value.length || expanded.value)
const showStateSummary = computed(() => props.items.length > 1 || runningCount.value > 0 || hiddenCount.value > 0)
const summaryText = computed(() => {
  if (runningCount.value) return `${runningCount.value} 步进行中${pendingCount.value ? ` · ${pendingCount.value} 步等待` : ''}`
  if (failedCount.value) return `${failedCount.value} 步失败`
  if (blockedCount.value) return `${blockedCount.value} 步待确认${hiddenCount.value ? ` · ${hiddenCount.value} 步已收起` : ''}`
  return `${props.items.length} 步已记录${hiddenCount.value ? ` · ${hiddenCount.value} 步已收起` : ''}`
})

function statusLabel(status) {
  const labels = {
    pending: '等待中',
    running: '进行中',
    done: '已完成',
    failed: '失败',
    blocked: '待确认'
  }
  return labels[status] || '进行中'
}
</script>

<style lang="scss" scoped>
.conversation-states {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
}

.conversation-state-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.4;
}

.conversation-state-summary b {
  color: var(--color-text, #1f2329);
  font-size: 13px;
}

.conversation-state-summary em {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: normal;
}

.state-toggle {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(51, 112, 255, .24);
  border-radius: 999px;
  background: #fff;
  color: var(--color-primary, #3370ff);
  font-size: 12px;
  line-height: 22px;
  cursor: pointer;
}

.state-toggle:hover {
  background: rgba(51, 112, 255, .08);
}

.summary-orb {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(51, 112, 255, .18);
  border-top-color: var(--color-primary, #3370ff);
  border-radius: 999px;
  animation: state-spin .9s linear infinite;
}

.conversation-state {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: flex-start;
  padding: 9px 10px;
  border: 1px solid rgba(31, 35, 41, .08);
  border-radius: 8px;
  background: #f7f9ff;
  color: var(--color-text, #1f2329);
  animation: state-card-enter .22s cubic-bezier(.2, .8, .2, 1) both;
  transition: background-color .18s ease, border-color .18s ease, transform .18s ease;
}

.conversation-state:hover {
  transform: translateY(-1px);
}

@keyframes state-card-enter {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.state-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #fff;
  color: var(--color-primary, #3370ff);
}

.state-icon svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.state-body {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.state-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.state-title-row b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.4;
}

.state-title-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-text-secondary, #646a73);
}

.state-detail {
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.5;
}

.state-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding-top: 8px;
}

.state-dots i {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-primary, #3370ff);
  animation: state-dot 1s infinite ease-in-out;
}

.state-dots i:nth-child(2) {
  animation-delay: .14s;
}

.state-dots i:nth-child(3) {
  animation-delay: .28s;
}

.status-done {
  background: #f6fffb;
}

.is-streaming {
  background: #f7faff;
}

.is-streaming .state-icon {
  color: var(--color-primary, #3370ff);
}

.status-blocked,
.is-confirm {
  background: #fffaf0;
}

.status-failed,
.is-error {
  background: #fff5f5;
}

.status-failed .state-icon,
.is-error .state-icon {
  color: #d92d20;
}

.is-confirm .state-icon {
  color: #b76e00;
}

@keyframes state-dot {
  0%, 80%, 100% { opacity: .35; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}

@keyframes state-spin {
  to { transform: rotate(360deg); }
}
</style>
