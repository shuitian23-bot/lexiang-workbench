<template>
  <section ref="cardEl" class="agent-task-card" data-agent-task-card :aria-label="task.title">
    <div class="task-summary">
      <div class="task-title-row">
        <span class="task-batch-label">批量授权</span>
        <h3 ref="summaryEl" class="task-title" tabindex="-1">{{ task.title }}</h3>
      </div>
      <span class="task-progress" role="status" aria-live="polite" aria-atomic="true">{{ progress.label }} · 已完成 {{ progress.done }}/{{ progress.total }} 项操作</span>
    </div>
    <p class="task-preview-notice">使用示例数据，不会执行真实查询、导出或修改。</p>
    <dl v-if="displayTask.requests.length" class="task-scope-summary">
      <div><dt>授权范围</dt><dd>{{ scopeSummary }}</dd></div>
      <div><dt>影响说明</dt><dd>{{ impactSummary }}</dd></div>
    </dl>
    <p v-if="pendingRequests.length" class="task-execution-summary">一次授权，执行本次 Skill 的全部 {{ pendingStepCount }} 个步骤。</p>
    <p v-if="task.notice" class="task-notice" role="status">{{ task.notice }}</p>
    <details v-if="displayTask.requests.length" class="task-details" :open="expanded" @toggle="onDetailsToggle">
      <summary>执行详情</summary>
      <div ref="bodyEl" class="task-request-scroll">
        <ol class="task-request-list">
          <li v-for="request in displayTask.requests" :key="request.id" class="task-request" :class="`is-${request.status}`">
            <div class="task-request-heading">
              <strong v-if="displayTask.requests.length > 1">{{ request.label }}</strong>
              <span class="task-request-status">{{ requestStatus(request.status) }}</span>
            </div>
            <dl v-if="displayTask.requests.length > 1" class="task-request-scope">
              <div v-if="scopeValues.length > 1"><dt>授权范围</dt><dd>{{ request.scope }}</dd></div>
              <div v-if="impactValues.length > 1"><dt>影响说明</dt><dd>{{ request.impact }}</dd></div>
            </dl>
            <ol v-if="request.steps?.length" class="task-step-descriptions" aria-label="本次操作的步骤说明">
              <li v-for="(step, stepIndex) in request.steps" :key="stepIndex">{{ step }}</li>
            </ol>
            <p v-if="request.detail" class="task-request-detail">{{ request.detail }}</p>
            <pre v-if="request.command" class="task-technical-details"><code>{{ request.command }}</code></pre>
          </li>
        </ol>
      </div>
    </details>
    <p v-else class="task-empty">当前没有待执行操作。</p>
    <div v-if="pendingRequests.length" class="task-execution-actions">
      <button type="button" data-task-action :disabled="sending || expired" @click="decide('reject')">拒绝</button>
      <button type="button" data-task-action class="task-primary" :disabled="sending || expired" @click="decide('approve')">授权</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { expireTask, taskProgress, type AiTaskBlock, type RequestStatus, type TaskDecision } from '@/stores/aiTaskAuthorization'

const props = defineProps<{ task: AiTaskBlock }>()
const emit = defineEmits<{ decision: [decision: TaskDecision] }>()
const cardEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
const summaryEl = ref<HTMLElement | null>(null)
const now = ref(Date.now())
const expired = computed(() => (!Number.isFinite(props.task.expiresAt) || now.value >= props.task.expiresAt)
  && props.task.requests.some(request => ['pending', 'approved', 'running'].includes(request.status)))
const displayTask = computed(() => expired.value ? expireTask(props.task) : props.task)
const progress = computed(() => taskProgress(displayTask.value))
const pendingRequests = computed(() => displayTask.value.requests.filter(request => request.status === 'pending'))
const pendingStepCount = computed(() => pendingRequests.value.reduce((count, request) => count + (request.steps?.length || 1), 0))
const scopeValues = computed(() => [...new Set(displayTask.value.requests.map(request => request.scope).filter(Boolean))])
const impactValues = computed(() => [...new Set(displayTask.value.requests.map(request => request.impact).filter(Boolean))])
const scopeSummary = computed(() => scopeValues.value.join('；') || '当前 Skill 的本次执行')
const impactSummary = computed(() => impactValues.value.join('；') || '请核对本次操作的影响')
const expanded = ref(false)
const sending = ref(false)
let expiryTimer: ReturnType<typeof setTimeout> | undefined
let mounted = false

async function decide(decision: TaskDecision['decision']) {
  now.value = Date.now()
  if (sending.value || expired.value || !pendingRequests.value.length) return
  const selections = pendingRequests.value.map(request => ({ requestId: request.id, revision: request.revision }))
  sending.value = true
  try {
    emit('decision', { scope: 'skill-execution', taskId: props.task.id, conversationId: props.task.conversationId, decision, selections })
    await nextTick()
  } finally { sending.value = false }
}
function setExpanded(value: boolean) {
  const focusedInside = typeof document !== 'undefined' && bodyEl.value?.contains(document.activeElement)
  expanded.value = value
  if (!value && focusedInside) nextTick(() => summaryEl.value?.focus())
}
function onDetailsToggle(event: Event) {
  expanded.value = (event.target as HTMLDetailsElement).open
}
function scheduleExpiry() {
  clearTimeout(expiryTimer)
  now.value = Date.now()
  const delay = props.task.expiresAt - now.value
  if (mounted && Number.isFinite(delay) && delay > 0 && !progress.value.terminal) expiryTimer = setTimeout(scheduleExpiry, Math.min(delay, 2_147_483_647))
}
watch(() => props.task, (task, previous) => {
  const active = typeof document !== 'undefined' ? document.activeElement : null
  const focusedAction = active instanceof Object && cardEl.value?.contains(active as Node) && (active as Element).hasAttribute('data-task-action')
  if (task.id !== previous?.id || task.conversationId !== previous?.conversationId) setExpanded(false)
  scheduleExpiry()
  if (progress.value.terminal) setExpanded(false)
  if (focusedAction) nextTick(() => {
    if (!progress.value.pending || !cardEl.value?.contains(active as Node) || (active as HTMLButtonElement).disabled) summaryEl.value?.focus()
  })
}, { deep: true })
watch(() => progress.value.terminal, terminal => { if (terminal) setExpanded(false) })
onMounted(() => { mounted = true; scheduleExpiry() })
onBeforeUnmount(() => { mounted = false; clearTimeout(expiryTimer) })

function requestStatus(status: RequestStatus) {
  return { pending: '等待授权', approved: '已授权，等待执行', running: '进行中', succeeded: '已完成', failed: '执行失败', rejected: '已拒绝', expired: '已过期，请重新发起' }[status]
}
</script>

<style scoped>
.agent-task-card { min-width: 0; max-width: 100%; margin-top: 12px; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); }
.task-summary { display: grid; gap: 4px; min-width: 0; }
.task-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.task-batch-label { display: inline-flex; align-items: center; flex: 0 0 auto; min-height: 24px; padding: 0 8px; border-radius: var(--radius-sm); background: var(--color-primary-subtle); color: var(--color-primary); font-size: 12px; font-weight: 500; line-height: 1.5; white-space: nowrap; }
.agent-task-card .task-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.task-progress { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; overflow-wrap: anywhere; }
.agent-task-card p.task-preview-notice, .agent-task-card p.task-notice, .agent-task-card p.task-execution-summary, .agent-task-card p.task-empty { margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--color-text-secondary); overflow-wrap: anywhere; }
.agent-task-card p.task-notice, .agent-task-card p.task-execution-summary { color: var(--color-text); }
.task-scope-summary, .task-request-scope { display: grid; gap: 4px; margin: 8px 0 0; font-size: 12px; line-height: 1.5; }
.task-scope-summary > div, .task-request-scope > div { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; min-width: 0; }
.task-scope-summary dt, .task-request-scope dt { color: var(--color-text-secondary); }
.task-scope-summary dd, .task-request-scope dd { margin: 0; overflow-wrap: anywhere; }
.task-details { min-width: 0; margin-top: 8px; font-size: 12px; }
.task-details > summary { color: var(--color-primary); cursor: pointer; }
.task-request-scroll { min-width: 0; max-height: min(16rem, 32dvh); overflow-y: auto; overscroll-behavior: contain; padding: 8px 0; }
.agent-task-card ol.task-request-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.agent-task-card li.task-request { min-width: 0; margin: 0; padding-top: 8px; border-top: 1px solid var(--color-border-subtle); }
.agent-task-card ol.task-step-descriptions { display: grid; gap: 4px; margin: 8px 0 0; padding-left: 20px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; }
.agent-task-card .task-step-descriptions > li { margin: 0; overflow-wrap: anywhere; }
.task-request-heading { display: flex; align-items: flex-start; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.task-request-heading strong { font-size: 13px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.task-request-status { max-width: 100%; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.is-running .task-request-status, .is-approved .task-request-status { color: var(--color-primary); }
.is-failed .task-request-status { color: var(--color-danger); }
.is-succeeded .task-request-status { color: var(--color-success); }
.agent-task-card p.task-request-detail { margin: 8px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.task-technical-details { max-width: 100%; margin: 8px 0 0; padding: 12px; border-radius: var(--radius-sm); background: var(--color-bg-subtle); white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: 12px; line-height: 1.5; }
.agent-task-card .task-technical-details code { padding: 0; border-radius: 0; background: transparent; font: inherit; }
.task-execution-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.task-execution-actions button { height: 36px; padding: 0 16px; max-width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; }
.task-execution-actions .task-primary { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); }
.task-primary:hover:not(:disabled) { border-color: var(--color-primary-hover); background: var(--color-primary-hover); }
.task-execution-actions button:disabled { cursor: not-allowed; color: var(--color-text-disabled); border-color: var(--color-border-subtle); background: var(--color-bg-muted); }
.agent-task-card :is(button,summary,.task-title):focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
