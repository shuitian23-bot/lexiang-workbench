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
              <button type="button" class="ai-doc-prompt" @click="$emit('quick-send', '帮我说明门户工作台当前可以怎么使用')">
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
  return Boolean(msg?.artifacts?.length || msg?.activityItems?.length || msg?.actionItems?.length)
}

function reportArtifact(id) {
  return AI_REPORT_ARTIFACTS[id] || null
}

function reportDisplayTitle(id) {
  const report = reportArtifact(id)
  if (!report) return '当前页面 · 数据解读报告'
  const sourceLabel = report.sourcePageLabel || getPageLabel(props.currentPageId) || '当前页面'
  const title = report.title || '数据解读报告'
  return title.startsWith(`${sourceLabel} ·`) ? title : `${sourceLabel} · ${title}`
}

function reportChips(id) {
  return (reportArtifact(id)?.chips || []).slice(0, 3)
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
