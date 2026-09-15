<template>
  <section ref="cardEl" class="agent-task-card" data-agent-task-card :aria-label="task.title">
    <button ref="summaryEl" type="button" class="task-summary" :aria-expanded="expanded" :aria-controls="bodyId" @click="setExpanded(!expanded)">
      <span class="task-summary-content"><strong>{{ task.title }}</strong><span role="status" aria-live="polite" aria-atomic="true">{{ progress.label }} · 已完成 {{ progress.done }}/{{ progress.total }} 项</span></span>
      <svg class="task-chevron" :class="{ 'is-expanded': expanded }" viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
    </button>
    <p class="task-preview-notice">使用示例数据，不会执行真实查询、导出或修改。</p>
    <p v-if="task.notice" class="task-notice" role="status">{{ task.notice }}</p>
    <div v-if="expanded" :id="bodyId" ref="bodyEl" class="task-body">
      <div class="task-request-scroll">
        <fieldset v-for="group in requestGroups" :key="`${group.batch ? 'batch' : 'single'}:${group.id}`" class="task-request-group">
          <legend>{{ group.batch ? '只读操作' : '单独确认' }}</legend>
          <dl v-if="group.scope" class="task-group-scope"><div><dt>授权范围</dt><dd>{{ group.scope }}</dd></div></dl>
          <label v-if="group.batch && pendingGroup(group.id).length" class="task-select-all">
            <input type="checkbox" data-task-action :checked="groupSelected(group.id)" :indeterminate="groupPartSelected(group.id)" :disabled="sending || !canSelectGroup(group.id)" @change="toggleGroup(group.id)">
            <span>全选以下 {{ pendingGroup(group.id).length }} 项只读操作</span>
          </label>
          <ol class="task-request-list">
            <li v-for="request in group.requests" :key="request.id" class="task-request" :class="`is-${request.status}`">
              <div class="task-request-heading">
                <label v-if="group.batch && request.status === 'pending'" class="task-request-choice">
                  <input type="checkbox" data-task-action :checked="isSelected(request)" :disabled="sending || !canSelect(request)" :aria-label="`${request.label}，${request.scope}`" @change="toggleRequest(request)">
                  <strong>{{ request.label }}</strong>
                </label>
                <strong v-else>{{ request.label }}</strong>
                <span class="task-request-status">{{ requestStatus(request.status) }}</span>
              </div>
              <dl class="task-request-scope">
                <div v-if="!group.scope"><dt>授权范围</dt><dd>{{ request.scope }}</dd></div>
                <div><dt>影响说明</dt><dd>{{ request.impact }}</dd></div>
              </dl>
              <p v-if="request.detail" class="task-request-detail">{{ request.detail }}</p>
              <details v-if="request.command" class="task-technical-details">
                <summary>技术详情</summary>
                <pre><code>{{ request.command }}</code></pre>
              </details>
              <div v-if="!group.batch && request.status === 'pending'" class="task-single-actions">
                <span>仅确认这一项，原有权限与审批要求仍然有效。</span>
                <button type="button" data-task-action :disabled="sending || expired" @click="decideSingle(request, 'reject')">拒绝此项</button>
                <button type="button" data-task-action class="task-primary" :disabled="sending || expired" @click="decideSingle(request, 'approve')">单独授权此项</button>
              </div>
            </li>
          </ol>
        </fieldset>
        <p v-if="!task.requests.length" class="task-empty">当前没有待执行操作。</p>
      </div>
      <div v-if="hasBatchRequests" class="task-batch-actions">
        <p class="task-selection-hint" role="status">已选 {{ selectedRequests.length }} 项；仅限所选操作，新增操作需重新确认。</p>
        <div class="task-batch-buttons">
          <button type="button" data-task-action :disabled="!selectedRequests.length || sending || expired" @click="submitSelected('reject')">拒绝选中项</button>
          <button type="button" data-task-action class="task-primary" :disabled="!selectedRequests.length || sending || expired" @click="submitSelected('approve')">授权选中项（{{ selectedRequests.length }}）</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { expireTask, taskProgress, type AiTaskBlock, type RequestStatus, type TaskDecision, type TaskRequest } from '@/stores/aiTaskAuthorization'

const props = defineProps<{ task: AiTaskBlock }>()
const emit = defineEmits<{ decision: [decision: TaskDecision] }>()
const cardEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
const summaryEl = ref<HTMLButtonElement | null>(null)
const bodyId = `agent-task-body-${getCurrentInstance()?.uid}`
const now = ref(Date.now())
const expired = computed(() => (!Number.isFinite(props.task.expiresAt) || now.value >= props.task.expiresAt)
  && props.task.requests.some(request => ['pending', 'approved', 'running'].includes(request.status)))
const displayTask = computed(() => expired.value ? expireTask(props.task) : props.task)
const progress = computed(() => taskProgress(displayTask.value))
const expanded = ref(!progress.value.terminal)
const selected = ref<TaskDecision['selections']>([])
const sending = ref(false)
let expiryTimer: ReturnType<typeof setTimeout> | undefined
let mounted = false

function isBatchRequest(request: TaskRequest) {
  return request.kind === 'read' && request.batchable && Boolean(request.approvalGroup.trim())
}

const requestGroups = computed(() => {
  const groups = new Map<string, { id: string; batch: boolean; requests: TaskRequest[] }>()
  displayTask.value.requests.forEach(request => {
    const batch = isBatchRequest(request)
    const id = batch ? request.approvalGroup : '__individual__'
    const key = `${batch ? 'batch' : 'single'}:${id}`
    const group = groups.get(key) || { id, batch, requests: [] }
    group.requests.push(request)
    groups.set(key, group)
  })
  return [...groups.values()].map(group => ({
    ...group,
    scope: group.batch && group.requests.every(request => request.scope === group.requests[0].scope) ? group.requests[0].scope : ''
  }))
})
const hasBatchRequests = computed(() => displayTask.value.requests.some(request => isBatchRequest(request) && request.status === 'pending'))
const selectedRequests = computed(() => expired.value ? [] : selected.value.flatMap(selection => {
  const request = props.task.requests.find(item => item.id === selection.requestId && item.revision === selection.revision && item.status === 'pending' && isBatchRequest(item))
  return request ? [request] : []
}))
const selectedGroup = computed(() => selectedRequests.value[0]?.approvalGroup || '')

function pendingGroup(groupId: string) {
  return displayTask.value.requests.filter(request => request.approvalGroup === groupId && isBatchRequest(request) && request.status === 'pending')
}
function isSelected(request: TaskRequest) {
  return selectedRequests.value.some(item => item.id === request.id && item.revision === request.revision)
}
function canSelectGroup(groupId: string) {
  return !expired.value && (!selectedGroup.value || selectedGroup.value === groupId)
}
function canSelect(request: TaskRequest) {
  return request.status === 'pending' && isBatchRequest(request) && canSelectGroup(request.approvalGroup)
}
function groupSelected(groupId: string) {
  const pending = pendingGroup(groupId)
  return pending.length > 0 && pending.every(isSelected)
}
function groupPartSelected(groupId: string) {
  return !groupSelected(groupId) && pendingGroup(groupId).some(isSelected)
}
function toggleRequest(request: TaskRequest) {
  if (sending.value || !canSelect(request)) return
  selected.value = isSelected(request)
    ? selected.value.filter(item => item.requestId !== request.id)
    : [...selected.value, { requestId: request.id, revision: request.revision }]
}
function toggleGroup(groupId: string) {
  if (sending.value || !canSelectGroup(groupId)) return
  selected.value = groupSelected(groupId) ? [] : pendingGroup(groupId).map(request => ({ requestId: request.id, revision: request.revision }))
}
async function sendDecision(requests: TaskRequest[], decision: TaskDecision['decision']) {
  now.value = Date.now()
  if (sending.value || expired.value || !requests.length) return
  if (requests.some(request => !props.task.requests.some(item => item.id === request.id && item.revision === request.revision && item.status === 'pending'))) return
  sending.value = true
  try {
    emit('decision', { taskId: props.task.id, conversationId: props.task.conversationId, decision, selections: requests.map(request => ({ requestId: request.id, revision: request.revision })) })
    await nextTick()
  } finally { sending.value = false }
}
function submitSelected(decision: TaskDecision['decision']) {
  return sendDecision(selectedRequests.value, decision)
}
function decideSingle(request: TaskRequest, decision: TaskDecision['decision']) {
  return sendDecision([request], decision)
}
function setExpanded(value: boolean) {
  const focusedInside = typeof document !== 'undefined' && bodyEl.value?.contains(document.activeElement)
  expanded.value = value
  if (!value && focusedInside) nextTick(() => summaryEl.value?.focus())
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
  if (task.id !== previous?.id || task.conversationId !== previous?.conversationId) selected.value = []
  selected.value = selectedRequests.value.map(request => ({ requestId: request.id, revision: request.revision }))
  scheduleExpiry()
  if (progress.value.pending) expanded.value = true
  else if (progress.value.terminal) setExpanded(false)
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
.agent-task-card { min-width: 0; max-width: 100%; margin-top: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); }
.task-summary { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 0; border-radius: var(--radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.task-summary-content { display: grid; flex: 1; min-width: 0; gap: 4px; }
.task-summary-content strong { font-size: 14px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.task-summary-content > span { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; overflow-wrap: anywhere; }
.task-chevron { flex: 0 0 16px; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.task-chevron.is-expanded { transform: rotate(90deg); }
.agent-task-card p.task-preview-notice, .agent-task-card p.task-notice { margin: 0; padding: 0 12px 12px; font-size: 12px; line-height: 1.5; color: var(--color-text-secondary); overflow-wrap: anywhere; }
.agent-task-card p.task-notice { color: var(--color-text); }
.task-body { min-width: 0; border-top: 1px solid var(--color-border-subtle); }
.task-request-scroll { min-width: 0; max-height: min(22rem, 40dvh); overflow-y: auto; overscroll-behavior: contain; padding: 12px; }
.task-request-group { min-width: 0; margin: 0; padding: 0; border: 0; }
.task-request-group + .task-request-group { margin-top: 16px; }
.task-request-group legend { padding: 0; color: var(--color-text-secondary); font-size: 12px; font-weight: 500; }
.task-select-all { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; font-size: 13px; line-height: 1.5; }
.agent-task-card ol.task-request-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.agent-task-card li.task-request { min-width: 0; margin: 0; padding-top: 8px; border-top: 1px solid var(--color-border-subtle); }
.task-request-heading { display: flex; align-items: flex-start; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.task-request-heading strong { font-size: 13px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.task-request-choice { display: flex; align-items: flex-start; flex: 1; gap: 8px; min-width: 0; }
.agent-task-card input[type="checkbox"] { flex: 0 0 16px; width: 16px; height: 16px; margin: 0; accent-color: var(--color-primary); cursor: pointer; }
.task-request-status { max-width: 100%; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.is-running .task-request-status, .is-approved .task-request-status { color: var(--color-primary); }
.is-failed .task-request-status { color: var(--color-danger); }
.is-succeeded .task-request-status { color: var(--color-success); }
.task-request-scope, .task-group-scope { display: grid; gap: 4px; margin: 4px 0 0; font-size: 12px; line-height: 1.5; }
.task-group-scope { margin-top: 8px; }
.task-request-scope > div, .task-group-scope > div { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; min-width: 0; }
.task-request-scope dt, .task-group-scope dt { color: var(--color-text-secondary); }
.task-request-scope dd, .task-group-scope dd { margin: 0; overflow-wrap: anywhere; }
.agent-task-card p.task-request-detail, .agent-task-card p.task-selection-hint, .agent-task-card p.task-empty { margin: 8px 0 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.task-technical-details { min-width: 0; margin-top: 8px; font-size: 12px; }
.task-technical-details summary { color: var(--color-primary); cursor: pointer; }
.task-technical-details pre { max-width: 100%; margin: 8px 0 0; padding: 12px; border-radius: var(--radius-sm); background: var(--color-bg-subtle); white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: 12px; line-height: 1.5; }
.agent-task-card .task-technical-details code { padding: 0; border-radius: 0; background: transparent; font: inherit; }
.task-single-actions, .task-batch-buttons { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.task-single-actions { margin-top: 12px; }
.task-single-actions > span { flex-basis: 100%; color: var(--color-text-secondary); font-size: 12px; line-height: 1.5; }
.task-batch-actions { padding: 12px; border-top: 1px solid var(--color-border-subtle); }
.agent-task-card .task-batch-actions p.task-selection-hint { margin: 0 0 12px; }
.task-single-actions button, .task-batch-buttons button { height: 36px; padding: 0 12px; max-width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; }
.task-single-actions .task-primary, .task-batch-buttons .task-primary { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); }
.task-primary:hover:not(:disabled) { border-color: var(--color-primary-hover); background: var(--color-primary-hover); }
.agent-task-card button:disabled, .agent-task-card input:disabled { cursor: not-allowed; color: var(--color-text-disabled); }
.task-single-actions button:disabled, .task-batch-buttons button:disabled { border-color: var(--color-border-subtle); background: var(--color-bg-muted); }
.agent-task-card :is(button,input,summary):focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
