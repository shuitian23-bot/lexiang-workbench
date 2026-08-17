<template>
  <div class="ai-messages" id="ai-messages" ref="messagesEl">
    <template v-if="showWelcome">
      <div class="ai-msg assistant ai-welcome-msg">
        <div class="bubble ai-message-bubble">
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
          <time class="time ai-message-time ai-welcome-time" :datetime="welcomeAt">
            {{ formatMessageTimestamp(welcomeAt) }}
          </time>
        </div>
      </div>
    </template>

    <template v-if="messages.length">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="ai-msg"
        :class="[msg.role, {
          'ai-structured-msg': isStructuredMessage(msg),
          'ai-has-external-state': hasExternalState(msg),
          'ai-typewriter-msg': isTypewriterMessage(msg),
          'ai-typewriter-done': isTypewriterDone(msg, idx)
        }]"
      >
        <AgentConversationStates v-if="hasExternalState(msg)" :items="msg.activityItems || []" />
        <div class="bubble ai-message-bubble">
          <div v-html="renderMsg(msg, idx)"></div>
          <div v-if="msg.authRequest && canShowStructuredContent(msg, idx)" class="ai-auth-card">
            <div class="ai-auth-head">
              <span class="ai-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 16 6v4.1c0 3.1-2.1 5.4-6 6.4-3.9-1-6-3.3-6-6.4V6l6-2.5Z"/><path d="M10 8v3M10 14h.01"/></svg>
              </span>
              <div>
                <b>{{ msg.authRequest.title }}</b>
                <em>{{ msg.authRequest.risk }}</em>
              </div>
            </div>
            <section class="ai-auth-summary">
              <span>授权内容</span>
              <p>{{ msg.authRequest.summary || msg.authRequest.detail }}</p>
            </section>
            <div class="ai-auth-scope">
              <section>
                <span>授权范围</span>
                <p>{{ msg.authRequest.scope || '当前会话、本次任务' }}</p>
              </section>
              <section>
                <span>影响说明</span>
                <p>{{ msg.authRequest.impact || msg.authRequest.detail }}</p>
              </section>
            </div>
            <section v-if="msg.authRequest.steps?.length" class="ai-auth-steps">
              <span>执行内容</span>
              <ol>
                <li v-for="step in msg.authRequest.steps" :key="step">{{ step }}</li>
              </ol>
            </section>
            <p v-if="msg.authRequest.approveHint" class="ai-auth-hint">{{ msg.authRequest.approveHint }}</p>
            <div v-if="msg.authResult" class="ai-auth-result" :class="`is-${msg.authResult.status}`">
              <b>{{ msg.authResult.title }}</b>
              <span>{{ msg.authResult.detail }}</span>
            </div>
            <div v-else class="ai-auth-actions">
              <button
                type="button"
                class="ai-auth-approve"
                @click="$emit('run-action', { type: 'auth_approve', label: msg.authRequest.approveLabel, value: msg.authRequest.command })"
              >
                {{ msg.authRequest.approveLabel }}
              </button>
              <button
                v-if="msg.authRequest.batchApproveLabel"
                type="button"
                class="ai-auth-batch"
                @click="$emit('run-action', { type: 'auth_batch_approve', label: msg.authRequest.batchApproveLabel, value: msg.authRequest.command })"
              >
                {{ msg.authRequest.batchApproveLabel }}
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
          <div v-if="msg.artifacts?.length && canShowStructuredContent(msg, idx)" class="ai-report-artifact-list">
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
                <button type="button" class="secondary" @click="$emit('download-report', reportId)">下载</button>
                <button type="button" @click="$emit('open-report', reportId)">展开报告</button>
              </div>
            </div>
          </div>
          <div v-if="msg.actionItems?.length && canShowStructuredContent(msg, idx)" class="ai-task-actions">
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
          <div v-if="shouldShowFeedback(msg, idx)" class="ai-reply-feedback" aria-label="回答反馈">
            <button
              type="button"
              class="ai-feedback-btn"
              :class="{ active: feedbackState(feedbackKey(msg, idx)) === 'up' }"
              title="有帮助"
              aria-label="有帮助"
              :aria-pressed="feedbackState(feedbackKey(msg, idx)) === 'up'"
              @click="setFeedback(msg, idx, 'up')"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.3v8.2"/><path d="M3.5 8.8h3v7.4h-3a1 1 0 0 1-1-1V9.8a1 1 0 0 1 1-1Z"/><path d="M6.5 9 10 3.8c.5-.7 1.6-.4 1.6.5v3h3.2a1.6 1.6 0 0 1 1.6 1.9l-1 5.5a2 2 0 0 1-2 1.6H6.5"/></svg>
            </button>
            <button
              type="button"
              class="ai-feedback-btn"
              :class="{ active: feedbackState(feedbackKey(msg, idx)) === 'down' }"
              title="没帮助"
              aria-label="没帮助"
              :aria-pressed="feedbackState(feedbackKey(msg, idx)) === 'down'"
              @click="setFeedback(msg, idx, 'down')"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 11.7V3.5"/><path d="M16.5 11.2h-3V3.8h3a1 1 0 0 1 1 1v5.4a1 1 0 0 1-1 1Z"/><path d="M13.5 11 10 16.2c-.5.7-1.6.4-1.6-.5v-3H5.2a1.6 1.6 0 0 1-1.6-1.9l1-5.5a2 2 0 0 1 2-1.6h6.9"/></svg>
            </button>
          </div>
          <time class="time ai-message-time" :datetime="messageTime(msg).datetime">
            {{ messageTime(msg).label }}
          </time>
        </div>
      </div>
    </template>

    <div v-if="shouldShowLatestTodo" class="ai-msg assistant ai-todo-bubble-row">
      <div class="ai-todo-list-block" :class="{ 'is-complete': isTodoComplete }">
        <div class="ai-todo-card">
          <button
            type="button"
            class="ai-todo-head"
            :aria-expanded="todoExpanded"
            :aria-label="todoExpanded ? '收起 Todo List' : '展开 Todo List'"
            @click="todoExpanded = !todoExpanded"
          >
            <span class="ai-todo-title">
              <span class="ai-todo-orb" aria-hidden="true"></span>
              <b>{{ latestTodoList.title }}</b>
            </span>
            <span class="ai-todo-summary">
              <span class="ai-todo-progress">{{ latestTodoList.done }}/{{ latestTodoList.total }}</span>
              <svg class="ai-todo-toggle-icon" :class="{ 'is-collapsed': !todoExpanded }" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg>
            </span>
          </button>
          <div v-show="todoExpanded" class="ai-todo-list">
            <div v-for="item in latestTodoList.items" :key="item.id" class="ai-todo-item" :class="`is-${item.status}`">
              <span class="todo-status" aria-hidden="true"></span>
              <span>{{ item.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading && !activityItems.length" class="ai-msg assistant ai-typing-row">
      <div class="bubble ai-typing-bubble" role="status" aria-live="polite">
        <span class="ai-typing-orb" aria-hidden="true"></span>
        <span class="ai-typing-label">正在整理上下文</span>
        <span class="ai-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
    </div>
    <div v-if="loading && activityItems.length" class="ai-msg assistant ai-state-row">
      <AgentConversationStates :items="activityItems" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AgentConversationStates from '@/components/agent/AgentConversationStates.vue'
import { AI_REPORT_ARTIFACTS } from '@/stores/ai'
import { getPageLabel } from '@/stores/app'
import {
  createMessageTimestampResolver,
  formatMessageTimestamp
} from '@/utils/messageTimestamp'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  activityItems: { type: Array, default: () => [] },
  currentPageId: { type: String, default: '' }
})

defineEmits(['quick-send', 'open-report', 'download-report', 'run-action'])

const messagesEl = ref(null)
const typewriterText = reactive({})
const typewriterDone = reactive({})
const messageFeedback = reactive({})
const typewriterTimers = new Map()
const todoExpanded = ref(true)
const welcomeAt = ref(new Date().toISOString())
const messageTime = createMessageTimestampResolver()
const showWelcome = computed(() => !props.messages.some(msg => msg.role === 'user' && !msg.demoReportQuery))
const latestTodoMessage = computed(() => [...props.messages]
  .reverse()
  .find(message => message?.role === 'assistant' && message.todoList) || null
)
const latestTodoList = computed(() => latestTodoMessage.value?.todoList || null)
const shouldShowLatestTodo = computed(() => {
  const message = latestTodoMessage.value
  if (!message?.todoList) return false
  const index = props.messages.indexOf(message)
  return !isTypewriterMessage(message) || isTypewriterDone(message, index)
})
const isTodoComplete = computed(() => Boolean(latestTodoList.value && latestTodoList.value.done >= latestTodoList.value.total))

function scrollToBottom() {
  nextTick(() => {
    const el = messagesEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => props.messages, scrollToBottom, { deep: true })
watch(() => props.loading, scrollToBottom)
watch(() => props.messages, syncTypewriterMessages, { deep: true, immediate: true })
watch(() => props.messages, (next, previous) => {
  if (next !== previous && !next.length) welcomeAt.value = new Date().toISOString()
})
watch(isTodoComplete, complete => { todoExpanded.value = !complete }, { immediate: true })

onBeforeUnmount(() => {
  typewriterTimers.forEach(timer => clearInterval(timer))
  typewriterTimers.clear()
})

function renderMsg(msg, idx) {
  const text = isTypewriterMessage(msg)
    ? (typewriterText[typewriterKey(msg, idx)] ?? '')
    : msg.text
  const visibleText = stripSeedDebugBlocks(text)
  if (msg.role === 'assistant') return renderMarkdown(visibleText)
  return escapeHtml(stripSeedDebugBlocks(msg.text))
}

function hasExternalState(msg) {
  return Boolean(msg?.activityItems?.length)
}

function isTypewriterMessage(msg) {
  return msg?.role === 'assistant' && msg?.renderMode === 'typewriter'
}

function typewriterKey(msg, idx) {
  return msg.id || `${idx}-${msg.at || ''}-${String(msg.text || '').slice(0, 12)}`
}

function isTypewriterDone(msg, idx) {
  if (!isTypewriterMessage(msg)) return true
  return Boolean(typewriterDone[typewriterKey(msg, idx)])
}

function canShowStructuredContent(msg, idx) {
  return !isTypewriterMessage(msg) || isTypewriterDone(msg, idx)
}

function shouldShowFeedback(msg, idx) {
  return msg?.role === 'assistant' && canShowStructuredContent(msg, idx)
}

function feedbackKey(msg, idx) {
  return msg.id || `${idx}-${msg.at || ''}-${String(msg.text || '').slice(0, 24)}`
}

function feedbackState(key) {
  return messageFeedback[key] || ''
}

function setFeedback(msg, idx, value) {
  const key = feedbackKey(msg, idx)
  messageFeedback[key] = messageFeedback[key] === value ? '' : value
}

function syncTypewriterMessages() {
  props.messages.forEach((msg, idx) => {
    if (!isTypewriterMessage(msg)) return
    const key = typewriterKey(msg, idx)
    if (typewriterDone[key] || typewriterTimers.has(key)) return
    typewriterText[key] = ''
    typewriterDone[key] = false
    let cursor = 0
    const source = stripSeedDebugBlocks(msg.text)
    const timer = window.setInterval(() => {
      cursor = Math.min(cursor + 2, source.length)
      typewriterText[key] = source.slice(0, cursor)
      scrollToBottom()
      if (cursor >= source.length) {
        window.clearInterval(timer)
        typewriterTimers.delete(key)
        typewriterDone[key] = true
        scrollToBottom()
      }
    }, 18)
    typewriterTimers.set(key, timer)
  })
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

function escapeHtmlText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripSeedDebugBlocks(str) {
  return String(str || '')
    .replace(/<seed:[^>]+\/>/g, '')
    .replace(/<seed:[^>]+>[\s\S]*?(?:<\/seed:[^>]+>|$)/g, '')
    .trim()
}

function escapeHtml(str) {
  return escapeHtmlText(str).replace(/\n/g, '<br>')
}

function renderMarkdown(text) {
  const codeBlocks = []
  const source = String(text || '').replace(/```([\s\S]*?)```/g, (_, content) => {
    const token = `@@AI_CODE_BLOCK_${codeBlocks.length}@@`
    codeBlocks.push(`<pre><code>${escapeHtmlText(content.trim())}</code></pre>`)
    return token
  })
  const lines = escapeHtmlText(source).split('\n')
  const renderedLines = []

  for (let index = 0; index < lines.length;) {
    if (isMarkdownTableStart(lines, index)) {
      const table = renderMarkdownTable(lines, index)
      renderedLines.push(table.html)
      index = table.nextIndex
      continue
    }
    renderedLines.push(lines[index])
    index += 1
  }

  const html = renderedLines.join('\n')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')

  return html.replace(/@@AI_CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || '')
}

function isMarkdownTableStart(lines, index) {
  if (index + 1 >= lines.length || !lines[index].includes('|')) return false
  const headers = splitMarkdownTableRow(lines[index])
  const dividers = splitMarkdownTableRow(lines[index + 1])
  return headers.length >= 2
    && dividers.length === headers.length
    && dividers.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}

function splitMarkdownTableRow(line) {
  const cells = []
  let cell = ''

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '\\' && line[index + 1] === '|') {
      cell += '|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell.trim())

  if (line.trim().startsWith('|')) cells.shift()
  if (line.trim().endsWith('|')) cells.pop()
  return cells
}

function renderMarkdownTable(lines, startIndex) {
  const headers = splitMarkdownTableRow(lines[startIndex])
  const dividers = splitMarkdownTableRow(lines[startIndex + 1])
  const alignments = dividers.map(cell => {
    const value = cell.replace(/\s/g, '')
    if (value.startsWith(':') && value.endsWith(':')) return 'center'
    if (value.endsWith(':')) return 'right'
    return 'left'
  })
  const rows = []
  let nextIndex = startIndex + 2

  while (nextIndex < lines.length && lines[nextIndex].trim() && lines[nextIndex].includes('|')) {
    const cells = splitMarkdownTableRow(lines[nextIndex])
    rows.push(headers.map((_, index) => cells[index] || ''))
    nextIndex += 1
  }

  const headerHtml = headers.map((cell, index) => `<th class="is-${alignments[index]}">${cell}</th>`).join('')
  const bodyHtml = rows.map(row => `<tr>${row.map((cell, index) => `<td class="is-${alignments[index]}">${cell}</td>`).join('')}</tr>`).join('')

  return {
    html: `<div class="ai-markdown-table-wrap" role="region" aria-label="AI 回复表格"><table class="ai-markdown-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
    nextIndex
  }
}
</script>

<style lang="scss" scoped>
.ai-message-bubble {
  position: relative;
  margin-bottom: 20px;
}

.ai-message-time {
  position: absolute;
  top: 100%;
  margin-top: 4px;
  color: var(--text-tertiary, #8f959e);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  white-space: nowrap;
}

.ai-msg.user .ai-message-time {
  right: 0;
  text-align: right;
}

.ai-msg.assistant .ai-message-time {
  left: 0;
  text-align: left;
}

.ai-todo-card,
.ai-auth-card {
  border: 1px solid rgba(31, 35, 41, .1);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text, #1f2329);
}

.ai-msg > .conversation-states {
  max-width: min(92%, 340px);
  margin: 0 0 6px;
}

.ai-msg.ai-has-external-state {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.ai-msg.ai-has-external-state > .conversation-states {
  width: 100%;
  max-width: 100%;
  margin-bottom: 8px;
}

.ai-msg.assistant.ai-has-external-state > .bubble {
  width: 100%;
  max-width: 100% !important;
}

.ai-msg.assistant.ai-has-external-state > .conversation-states {
  margin-left: 0;
}

.ai-msg.user.ai-has-external-state > .conversation-states {
  margin-left: auto;
}

:deep(.ai-markdown-table-wrap) {
  width: 100%;
  margin: 10px 0;
  overflow-x: auto;
  border: 1px solid var(--color-border, #e5e8ef);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  scrollbar-width: thin;
}

:deep(.ai-markdown-table) {
  width: 100%;
  min-width: 420px;
  border-collapse: collapse;
  color: var(--color-text, #1f2329);
  font-size: 12px;
  line-height: 1.5;
}

:deep(.ai-markdown-table th),
:deep(.ai-markdown-table td) {
  padding: 8px 10px;
  border-right: 1px solid var(--color-border, #e5e8ef);
  border-bottom: 1px solid var(--color-border, #e5e8ef);
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

:deep(.ai-markdown-table th) {
  background: var(--color-bg-muted, #f5f7fa);
  color: var(--color-text-secondary, #4e5969);
  font-weight: 650;
}

:deep(.ai-markdown-table td) {
  color: var(--color-text, #1f2329);
}

:deep(.ai-markdown-table tbody tr:nth-child(even) td) {
  background: rgba(31, 35, 41, .018);
}

:deep(.ai-markdown-table tbody tr:hover td) {
  background: rgba(51, 112, 255, .055);
}

:deep(.ai-markdown-table th:last-child),
:deep(.ai-markdown-table td:last-child) {
  border-right: 0;
}

:deep(.ai-markdown-table tbody tr:last-child td) {
  border-bottom: 0;
}

:deep(.ai-markdown-table .is-center) { text-align: center; }
:deep(.ai-markdown-table .is-right) { text-align: right; }

:global(body.dark-mode) :deep(.ai-markdown-table-wrap) {
  border-color: var(--color-border-subtle, #3a3d45);
  background: var(--color-surface, #25272d);
}

:global(body.dark-mode) :deep(.ai-markdown-table th) {
  background: var(--color-bg-muted, #2d3037);
  color: var(--color-text-secondary, #b8bdc7);
}

:global(body.dark-mode) :deep(.ai-markdown-table td) {
  color: var(--color-text, #f2f3f5);
}

.ai-todo-card {
  padding: 12px;
}

.ai-todo-list-block {
  width: 100%;
  margin-top: 8px;
  padding: 2px 2px 0;
  animation: ai-card-soft-enter .22s ease both;
}

.ai-todo-list-block .ai-todo-card {
  padding: 0;
  border: 0;
  background: transparent;
}

.ai-todo-list-block.is-complete {
  color: var(--color-primary, #3370ff);
}

.ai-todo-head {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(31, 35, 41, .08);
  border-top: 0;
  border-right: 0;
  border-left: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ai-todo-summary { display: inline-flex; align-items: center; gap: 6px; }
.ai-todo-toggle-icon { transition: transform .16s ease; }
.ai-todo-toggle-icon.is-collapsed { transform: rotate(180deg); }
.ai-todo-list-block.is-complete .ai-todo-orb { position: relative; border-color: var(--color-primary, #3370ff); background: var(--color-primary, #3370ff); }
.ai-todo-list-block.is-complete .ai-todo-orb::after { content: ''; position: absolute; left: 4px; top: 2px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

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

.ai-auth-summary,
.ai-auth-scope section,
.ai-auth-steps {
  margin-top: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(183, 110, 0, .16);
  border-radius: 7px;
  background: rgba(255, 255, 255, .68);
}

.ai-auth-summary > span,
.ai-auth-scope span,
.ai-auth-steps > span {
  display: block;
  color: #8a5a00;
  font-size: 11px;
  font-weight: 650;
}

.ai-auth-scope {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.ai-auth-steps ol {
  margin: 7px 0 0;
  padding-left: 18px;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.55;
}

.ai-auth-hint {
  padding-left: 2px;
}

.ai-auth-card p {
  margin: 8px 0 0;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
  line-height: 1.5;
}

.ai-auth-result {
  display: grid;
  gap: 3px;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 7px;
  border: 1px solid rgba(32, 191, 114, .24);
  background: rgba(32, 191, 114, .08);
  color: #176b3a;
  font-size: 12px;
  line-height: 1.45;
}

.ai-auth-result.is-rejected {
  border-color: rgba(239, 68, 68, .22);
  background: rgba(239, 68, 68, .08);
  color: #b42318;
}

.ai-auth-result b,
.ai-auth-result span {
  min-width: 0;
}

.ai-auth-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
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

.ai-auth-batch {
  border: 1px solid rgba(51, 112, 255, .45);
  background: #fff;
  color: var(--color-primary, #3370ff);
}

.ai-auth-reject {
  border: 1px solid rgba(239, 68, 68, .5);
  background: #fff;
  color: #d92d20;
}

.ai-reply-feedback {
  display: flex;
  gap: 4px;
  margin-top: 10px;
}

.ai-feedback-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-tertiary, #8f959e);
  cursor: pointer;
}

.ai-feedback-btn:hover,
.ai-feedback-btn.active {
  border-color: rgba(51, 112, 255, .22);
  background: rgba(51, 112, 255, .08);
  color: var(--color-primary, #3370ff);
}

.ai-typewriter-msg .bubble > div:first-child::after {
  content: '';
  display: inline-block;
  width: 6px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -2px;
  border-radius: 2px;
  background: currentColor;
  animation: ai-typewriter-cursor .9s steps(2, jump-none) infinite;
}

.ai-typewriter-done .bubble > div:first-child::after {
  content: none;
}

.ai-typewriter-done .ai-auth-card,
.ai-typewriter-done .ai-report-artifact-list,
.ai-typewriter-done .ai-task-actions,
.ai-typewriter-done .ai-todo-list-block {
  animation: ai-card-soft-enter .22s ease both;
}

@keyframes ai-typewriter-cursor {
  0%, 45% { opacity: 1; }
  46%, 100% { opacity: 0; }
}

@keyframes ai-card-soft-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
