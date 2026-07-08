<template>
  <div class="ai-messages" id="ai-messages" ref="messagesEl">
    <template v-if="showWelcome">
      <div class="ai-msg assistant ai-welcome-msg">
        <div class="bubble">
          <div class="ai-empty-state ai-doc-flow">
            <div class="ai-doc-message">
              <p>你好！我是乐享 AI 助手。</p>
              <p>你可以在底部输入框里直接描述要完成的运营任务，例如查数据、生成报告、配置商品或查询知识库。涉及写入或发布时，我会先展示影响范围并等待确认。</p>
            </div>
            <div class="ai-doc-prompt-group" aria-label="推荐提问">
              <button type="button" class="ai-doc-prompt" @click="$emit('quick-send', '帮我说明联想门户工作台当前可以怎么使用')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10v12H5z"/><path d="M8 8h4M8 11h4"/></svg></span>
                <b>工作台说明</b>
              </button>
              <button type="button" class="ai-doc-prompt" @click="$emit('quick-send', '帮我生成一份运营任务报告草稿，先列出需要的参数')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h5l3 3v11H6z"/><path d="M11 3v3h3M8 10h4M8 13h5"/></svg></span>
                <b>生成报告</b>
              </button>
              <button type="button" class="ai-doc-prompt" @click="$emit('quick-send', '查询知识库，帮我按关键词整理相关条目')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.2c1.8-.8 3.5-.8 5.2 0v10.5c-1.7-.8-3.4-.8-5.2 0zM10.8 5.2c1.7-.8 3.4-.8 5.2 0v10.5c-1.8-.8-3.5-.8-5.2 0z"/></svg></span>
                <b>查询知识库</b>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="messages.length">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="ai-msg"
        :class="[msg.role, { 'ai-structured-msg': isStructuredMessage(msg) }]"
      >
        <div class="bubble">
          <div v-html="renderMsg(msg)"></div>
          <AgentConversationStates :items="msg.activityItems || []" />
          <div v-if="msg.todoList" class="ai-todo-card">
            <div class="ai-todo-head">
              <span class="ai-todo-title">
                <span class="ai-todo-orb" aria-hidden="true"></span>
                <b>{{ msg.todoList.title }}</b>
              </span>
              <span class="ai-todo-progress">{{ msg.todoList.done }}/{{ msg.todoList.total }}</span>
            </div>
            <div class="ai-todo-list">
              <div
                v-for="item in msg.todoList.items"
                :key="item.id"
                class="ai-todo-item"
                :class="`is-${item.status}`"
              >
                <span class="todo-status" aria-hidden="true"></span>
                <span>{{ item.text }}</span>
              </div>
            </div>
          </div>
          <div v-if="msg.authRequest" class="ai-auth-card">
            <div class="ai-auth-head">
              <span class="ai-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 16 6v4.1c0 3.1-2.1 5.4-6 6.4-3.9-1-6-3.3-6-6.4V6l6-2.5Z"/><path d="M10 8v3M10 14h.01"/></svg>
              </span>
              <div>
                <b>{{ msg.authRequest.title }}</b>
                <em>{{ msg.authRequest.risk }}</em>
              </div>
            </div>
            <div class="ai-auth-meta">namespace: {{ msg.authRequest.namespace }}</div>
            <pre class="ai-auth-command"><code>{{ msg.authRequest.command }}</code></pre>
            <p>{{ msg.authRequest.detail }}</p>
            <div class="ai-auth-actions">
              <button
                type="button"
                class="ai-auth-approve"
                @click="$emit('run-action', { type: 'auth_approve', label: msg.authRequest.approveLabel, value: msg.authRequest.command })"
              >
                {{ msg.authRequest.approveLabel }}
              </button>
              <button
                type="button"
                class="ai-auth-reject"
                @click="$emit('run-action', { type: 'auth_reject', label: msg.authRequest.rejectLabel, value: msg.authRequest.command })"
              >
                {{ msg.authRequest.rejectLabel }}
              </button>
            </div>
          </div>
          <div v-if="msg.artifacts?.length" class="ai-report-artifact-list">
            <div v-for="reportId in msg.artifacts" :key="reportId" class="ai-result-card">
              <div class="ai-result-card-head">
                <span class="ai-result-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h5l3 3v11H6z"/><path d="M11 3v3h3M8 10h4M8 13h5"/></svg>
                </span>
                <div>
                  <b>{{ reportDisplayTitle(reportId) }}</b>
                  <em>可展开为临时页签，多开对比</em>
                </div>
              </div>
              <p>{{ reportArtifact(reportId)?.summary }}</p>
              <div class="ai-result-card-foot">
                <span class="ai-result-tags">
                  <span v-for="chip in reportChips(reportId)" :key="chip">{{ chip }}</span>
                </span>
                <button type="button" class="secondary" :disabled="reportArtifact(reportId)?.saved" @click="$emit('save-report', reportId)">
                  {{ reportArtifact(reportId)?.saved ? '已保存' : '保存' }}
                </button>
                <button type="button" @click="$emit('open-report', reportId)">展开报告</button>
              </div>
            </div>
          </div>
          <div v-if="msg.actionItems?.length" class="ai-task-actions">
            <div class="ai-task-actions-title">可继续执行</div>
            <div class="ai-task-actions-row">
              <button
                v-for="item in msg.actionItems"
                :key="`${item.type}-${item.label}`"
                type="button"
                class="ai-task-btn"
                @click="$emit('run-action', item)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="ai-msg assistant ai-typing-row">
      <div class="bubble ai-typing-bubble" role="status" aria-live="polite">
        <span class="ai-typing-orb" aria-hidden="true"></span>
        <span class="ai-typing-label">正在整理上下文</span>
        <span class="ai-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
    </div>
    <div v-if="loading && activityItems.length" class="ai-msg assistant ai-state-row">
      <div class="bubble">
        <AgentConversationStates :items="activityItems" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import AgentConversationStates from '@/components/agent/AgentConversationStates.vue'
import { AI_REPORT_ARTIFACTS } from '@/stores/ai'
import { getPageLabel } from '@/stores/app'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  activityItems: { type: Array, default: () => [] },
  currentPageId: { type: String, default: '' }
})

defineEmits(['quick-send', 'open-report', 'save-report', 'run-action'])

const messagesEl = ref(null)
const showWelcome = computed(() => !props.messages.some(msg => msg.role === 'user' && !msg.demoReportQuery))

function scrollToBottom() {
  nextTick(() => {
    const el = messagesEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => props.messages, scrollToBottom, { deep: true })
watch(() => props.loading, scrollToBottom)

function renderMsg(msg) {
  if (msg.role === 'assistant') return renderMarkdown(msg.text)
  return escapeHtml(msg.text)
}

function isStructuredMessage(msg) {
  return Boolean(
    msg?.artifacts?.length
    || msg?.activityItems?.length
    || msg?.actionItems?.length
    || msg?.todoList
    || msg?.authRequest
  )
}

function reportArtifact(id) {
  return AI_REPORT_ARTIFACTS[id] || null
}

function reportDisplayTitle(id) {
  const report = reportArtifact(id)
  if (!report) return '当前页面 · 数据解读报告'
  const sourceLabel = report.sourcePageLabel || getPageLabel(props.currentPageId) || '当前页面'
  const title = report.title || '数据解读报告'
  const isOverviewReport = report.sourcePage === 'dashboard.overview' || sourceLabel === '运营总览' || /运营总览/.test(title)
  if (isOverviewReport && /风控|策略命中|DPL|限购/i.test(title)) {
    return '运营总览 · 经营指标解读'
  }
  return title.startsWith(`${sourceLabel} ·`) ? title : `${sourceLabel} · ${title}`
}

function reportChips(id) {
  const report = reportArtifact(id)
  const chips = report?.chips || []
  const isOverviewReport = report?.sourcePage === 'dashboard.overview'
    || report?.sourcePageLabel === '运营总览'
    || /运营总览/.test(report?.title || '')
    || getPageLabel(props.currentPageId) === '运营总览'
  if (isOverviewReport) {
    return chips.filter(chip => !/风控|策略命中|DPL|限购/i.test(chip)).slice(0, 3)
  }
  return chips.slice(0, 3)
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function renderMarkdown(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
}
</script>

<style lang="scss" scoped>
.ai-todo-card,
.ai-auth-card {
  margin-top: 10px;
  border: 1px solid rgba(31, 35, 41, .1);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text, #1f2329);
}

.ai-todo-card {
  padding: 12px;
}

.ai-todo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(31, 35, 41, .08);
}

.ai-todo-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.ai-todo-title b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-todo-orb {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 3px solid rgba(51, 112, 255, .18);
  border-top-color: var(--color-primary, #3370ff);
  border-radius: 999px;
}

.ai-todo-progress {
  flex: 0 0 auto;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.4;
}

.ai-todo-list {
  display: grid;
  gap: 9px;
  padding-top: 10px;
}

.ai-todo-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  color: var(--color-text-secondary, #646a73);
  font-size: 13px;
  line-height: 1.45;
}

.ai-todo-item span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.todo-status {
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 2px solid rgba(31, 35, 41, .22);
  border-radius: 999px;
  background: #fff;
}

.ai-todo-item.is-done {
  color: var(--color-text, #1f2329);
}

.ai-todo-item.is-done .todo-status {
  border-color: var(--color-primary, #3370ff);
  background:
    linear-gradient(45deg, transparent 48%, #fff 49% 56%, transparent 57%) 5px 7px / 8px 5px no-repeat,
    var(--color-primary, #3370ff);
}

.ai-todo-item.is-running {
  color: var(--color-text, #1f2329);
}

.ai-todo-item.is-running .todo-status {
  border-color: rgba(51, 112, 255, .22);
  box-shadow: inset 0 0 0 3px #fff;
  background: var(--color-primary, #3370ff);
}

.ai-auth-card {
  padding: 12px;
  border-color: rgba(245, 158, 11, .42);
  background: #fffbf2;
}

.ai-auth-head {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.ai-auth-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: #b76e00;
}

.ai-auth-head b,
.ai-auth-head em {
  display: block;
  min-width: 0;
}

.ai-auth-head b {
  font-size: 14px;
  line-height: 1.45;
}

.ai-auth-head em {
  color: #8a5a00;
  font-style: normal;
  font-size: 12px;
}

.ai-auth-meta {
  margin-top: 10px;
  color: var(--color-text-secondary, #646a73);
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12px;
}

.ai-auth-command {
  margin: 8px 0 0;
  padding: 10px;
  border-radius: 7px;
  background: #1f2329;
  color: #fff;
  overflow-x: auto;
  white-space: pre;
  font-size: 12px;
  line-height: 1.5;
}

.ai-auth-command code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}

.ai-auth-card p {
  margin: 8px 0 0;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.5;
}

.ai-auth-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.ai-auth-actions button {
  min-width: 0;
  height: 34px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ai-auth-approve {
  border: 1px solid #20bf72;
  background: #20bf72;
  color: #fff;
}

.ai-auth-reject {
  border: 1px solid rgba(239, 68, 68, .5);
  background: #fff;
  color: #d92d20;
}
</style>
