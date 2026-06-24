<template>
  <div class="ai-panel" :class="{ open: visible }" ref="panelRef">
    <!-- 拖拽调宽手柄 -->
    <div class="ai-resize-handle" ref="handleRef"></div>

    <!-- 头部 -->
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
        <button type="button" class="ai-icon-action ai-action-settings" @click="openSkillManager" title="管理技能" aria-label="管理技能">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 2.8h2.6l.5 2a5.4 5.4 0 0 1 1.3.8l2-.6 1.3 2.2-1.5 1.4c.1.4.2.9.2 1.4s-.1 1-.2 1.4l1.5 1.4-1.3 2.2-2-.6c-.4.3-.8.6-1.3.8l-.5 2H8.7l-.5-2a5.4 5.4 0 0 1-1.3-.8l-2 .6-1.3-2.2 1.5-1.4A5.5 5.5 0 0 1 4.9 10c0-.5.1-1 .2-1.4L3.6 7.2 4.9 5l2 .6c.4-.3.8-.6 1.3-.8l.5-2z"/><circle cx="10" cy="10" r="2.3"/></svg>
        </button>
        <button type="button" class="ai-icon-action ai-action-new" @click="newConversation" title="新开会话" aria-label="新开会话">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>
        </button>
        <button type="button" class="ai-icon-action ai-action-history" @click="openHistory" title="历史对话" aria-label="历史对话">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 5.8A7 7 0 1 1 3 10"/><path d="M4.2 5.8H7M4.2 5.8V3"/><path d="M10 6.4v4l2.6 1.6"/></svg>
        </button>
        <button type="button" class="ai-icon-action ai-action-collapse" @click="$emit('toggle')" title="收起 AI 助手" aria-label="收起 AI 助手">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="3.5" width="14.4" height="13" rx="2.4"/><line x1="12" y1="3.5" x2="12" y2="16.5"/><path d="M8.2 8 6.1 10l2.1 2"/></svg>
        </button>
      </div>
    </div>

    <!-- 消息区 -->
    <div class="ai-messages" ref="messagesRef">
      <!-- 欢迎屏（无消息时） -->
      <div v-if="messages.length === 0" class="ai-msg assistant ai-welcome-msg">
        <div class="bubble">
          <div class="ai-empty-state ai-doc-flow">
            <div class="ai-doc-message">
              <p>你好！我是乐享 AI 助手。</p>
              <p>你可以在底部输入框里直接描述要完成的运营任务，例如查数据、生成报告、配置商品或查询知识库。涉及写入或发布时，我会先展示影响范围并等待确认。</p>
            </div>
            <div class="ai-doc-prompt-group" aria-label="推荐提问">
              <button type="button" class="ai-doc-prompt" @click="aiQuick('帮我说明门户工作台当前可以怎么使用')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10v12H5z"/><path d="M8 8h4M8 11h4"/></svg></span>
                <b>工作台说明</b>
              </button>
              <button type="button" class="ai-doc-prompt" @click="aiQuick('帮我生成一份运营任务报告草稿，先列出需要的参数')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h5l3 3v11H6z"/><path d="M11 3v3h3M8 10h4M8 13h5"/></svg></span>
                <b>生成报告</b>
              </button>
              <button type="button" class="ai-doc-prompt" @click="aiQuick('查询知识库，帮我按关键词整理相关条目')">
                <span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.2c1.8-.8 3.5-.8 5.2 0v10.5c-1.7-.8-3.4-.8-5.2 0zM10.8 5.2c1.7-.8 3.4-.8 5.2 0v10.5c-1.8-.8-3.5-.8-5.2 0z"/></svg></span>
                <b>查询知识库</b>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <template v-for="(msg, idx) in messages" :key="idx">
        <!-- typing 动画 -->
        <div v-if="msg.typing" class="ai-msg assistant ai-typing-row">
          <div class="bubble ai-typing-bubble" role="status" aria-live="polite">
            <span class="ai-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="ai-typing-label">{{ msg.typingText || 'AI 正在思考' }}</span>
          </div>
        </div>
        <!-- 普通消息（用户/AI）：渲染 innerHTML（含 markdown），需要 v-html -->
        <div v-else class="ai-msg" :class="msg.role">
          <div class="bubble" v-html="renderBubble(msg)"></div>
        </div>
      </template>
    </div>

    <!-- 文件预览条 -->
    <div
      v-show="pendingFile"
      style="display:flex;padding:6px 12px;background:var(--primary-light);font-size:12px;align-items:center;gap:6px;border-top:1px solid var(--border-light)"
    >
      <span>📎</span>
      <span>{{ pendingFile ? `${pendingFile.name} (${(pendingFile.size / 1024).toFixed(1)}KB)` : '' }}</span>
      <span style="cursor:pointer;margin-left:auto;color:var(--text-tertiary)" @click="clearFile">✕</span>
    </div>

    <!-- 输入区 -->
    <div class="ai-input-area" ref="inputAreaRef" :class="{ 'has-file': !!pendingFile, 'is-sending': sending }">
      <input
        type="file"
        ref="fileInputRef"
        style="display:none"
        accept=".txt,.md,.pdf,.docx,.xlsx,.csv,.json"
        @change="onFileChange"
      >
      <div class="ai-input-combo">
        <!-- 快捷 chips -->
        <div class="ai-scope-row" aria-label="选择提问范围">
          <button
            type="button"
            class="ai-scope-arrow left"
            ref="scopeLeftRef"
            aria-label="向左滚动项目标签"
            @click="scrollShortcuts(-1)"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 5-5 5 5 5"/></svg>
          </button>
          <div class="ai-shortcuts" ref="shortcutsRef" role="toolbar" aria-label="快捷查询">
            <button
              v-for="(item, i) in shortcutItems"
              :key="i"
              type="button"
              class="ai-shortcut"
              :data-ai-shortcut="i"
              @click="runShortcut(i)"
              @keydown="onShortcutKeydown($event, i)"
            >{{ item.label }}</button>
          </div>
          <button
            type="button"
            class="ai-scope-arrow right"
            ref="scopeRightRef"
            aria-label="向右滚动项目标签"
            @click="scrollShortcuts(1)"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 5 5-5 5"/></svg>
          </button>
          <select
            class="ai-scope-select"
            ref="scopeSelectRef"
            aria-label="选择提问范围"
            @change="onScopeSelectChange"
          >
            <option v-for="(item, i) in shortcutItems" :key="i" :value="i">{{ item.label }}</option>
          </select>
        </div>

        <!-- 输入框 + 发送 -->
        <div class="ai-composer-box">
          <button
            type="button"
            class="ai-composer-action"
            :disabled="sending"
            @click="fileInputRef.click()"
            title="上传文件"
            aria-label="上传文件"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 10.5 11 7a2.2 2.2 0 1 1 3.1 3.1l-5 5a3.6 3.6 0 0 1-5.1-5.1l5.5-5.5"/></svg>
          </button>
          <textarea
            class="ai-input"
            ref="inputRef"
            v-model="inputText"
            :placeholder="inputPlaceholder"
            rows="1"
            @input="onInputChange"
            @keydown="onInputKeydown"
          ></textarea>
          <button
            class="ai-send"
            :disabled="sending || !canSend"
            :aria-disabled="(sending || !canSend) ? 'true' : 'false'"
            :title="sending ? 'AI 正在回复' : canSend ? '发送' : '请输入内容后发送'"
            @click="aiSend"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 16 3l-3.2 14-3.1-5.6L3 10z"/><path d="m9.7 11.4 3.8-4.8"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-composer-hint">支持数据、报告、配置、知识库，写入前确认。</div>
    </div>

    <!-- 历史会话弹窗 -->
    <div v-if="historyOpen" class="ai-conversation-modal open" @click.self="historyOpen = false">
      <div class="ai-conversation-panel" role="dialog" aria-label="AI 历史会话">
        <div class="ai-conversation-head">
          <div>
            <div class="ai-conversation-title">历史会话</div>
            <div class="ai-conversation-meta">查看、恢复或删除右侧 AI 助手的会话记录</div>
          </div>
          <div class="ai-conversation-actions">
            <button class="btn btn-primary" @click="newConversation(); historyOpen = false">新开会话</button>
            <button class="agent-skill-modal-close" @click="historyOpen = false" title="关闭">×</button>
          </div>
        </div>
        <div class="ai-conversation-body">
          <div v-if="conversationList.length === 0" class="ai-conversation-empty">
            暂无历史会话。开始提问后，这里会自动保存记录。
          </div>
          <div
            v-for="item in conversationList"
            :key="item.id"
            class="ai-conversation-item"
            :class="{ active: item.id === localConvId }"
          >
            <div class="ai-conversation-item-main">
              <div class="ai-conversation-item-title">{{ item.title || '未命名会话' }}</div>
              <div class="ai-conversation-item-preview">{{ getConvPreview(item) }}</div>
              <div class="ai-conversation-item-meta">
                {{ new Date(item.updatedAt || Date.now()).toLocaleString('zh-CN') }} · {{ (item.messages || []).length }} 条消息{{ item.id === localConvId ? ' · 当前会话' : '' }}
              </div>
            </div>
            <div class="ai-conversation-item-actions">
              <button class="btn btn-secondary" @click="restoreConversation(item.id)">打开</button>
              <button class="btn btn-secondary danger" @click="deleteConversation(item.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// ===== Props & Emits =====
const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['toggle'])

const route = useRoute()
const router = useRouter()

// ===== Refs =====
const panelRef = ref(null)
const handleRef = ref(null)
const messagesRef = ref(null)
const inputRef = ref(null)
const fileInputRef = ref(null)
const inputAreaRef = ref(null)
const shortcutsRef = ref(null)
const scopeLeftRef = ref(null)
const scopeRightRef = ref(null)
const scopeSelectRef = ref(null)

// ===== State =====
const messages = ref([])       // { role: 'user'|'assistant', text: '', html: '', typing: false, typingText: '' }
const inputText = ref('')
const sending = ref(false)
const pendingFile = ref(null)  // { name, type, content, size }
const shortcutItems = ref([])
const historyOpen = ref(false)
const conversationList = ref([])

// 会话持久化
const AI_CONVERSATION_STORAGE_KEY = 'leai_ai_conversations'
const AI_REPORT_STORAGE_KEY = 'leai_ai_saved_reports'
// 内存报告缓存（工作台 tab 打开期间有效）
const reportArtifacts = {}

let localConvId = ref('')
let remoteConvId = ref(null)  // 后端 convId

// ===== 计算属性 =====
const canSend = computed(() => !!(inputText.value.trim() || pendingFile.value))

// 当前页面关注标签 — 跟随路由
const attentionLabel = computed(() => {
  const path = route.path.replace(/^\/admin-vue/, '').replace(/^\//, '')
  const pageKey = path.replace('/', '.')
  // 从 AppShell 的 MENU_TREE 逻辑中复制，这里用 window.getPageLabel（若原生有），否则 fallback
  if (typeof window.getPageLabel === 'function') return window.getPageLabel(pageKey) || '门户工作台'
  return pageKey || '门户工作台'
})

const inputPlaceholder = computed(() => {
  const label = attentionLabel.value
  return label ? `在「${label}」中查询...` : '输入指令或查询...'
})

// ===== 路由感知：切页刷新快捷 chips =====
watch(() => route.path, () => {
  const path = route.path.replace(/^\/admin-vue/, '').replace(/^\//, '')
  const pageKey = path.replace('/', '.')
  shortcutItems.value = aiShortcutItemsForPage(pageKey)
  nextTick(updateScopeArrows)
})

// ===== 工具函数 =====
function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

function renderAiMarkdown(text) {
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let toolTag = ''
  s = s.replace(/\n*🔧 调用了: (.+)$/m, (_, tools) => {
    toolTag = `<div class="ai-tool-tag">🔧 ${tools}</div>`
    return ''
  })

  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  s = s.replace(/^## (.+)$/gm, '<h3>$1</h3>')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = String(url || '').replace(/"/g, '&quot;')
    return `<a href="${safeUrl}" onclick="event.preventDefault()">${label}</a>`
  })
  s = s.replace(/^---$/gm, '<hr>')

  // 卡片块
  s = s.replace(/(\d+)\.\s*<strong>(.+?)<\/strong>\s*\n((?:[-–]\s*.+\n?)+)/g, (_, num, title, body) => {
    const lines = body.trim().split('\n').map(l => l.replace(/^[-–]\s*/, '').trim()).filter(Boolean)
    const desc = lines.map(l => `<div>${l}</div>`).join('')
    const icon = title.includes('指南') ? '📘' : title.includes('安全') ? '🔒' : title.includes('设置') ? '⚙️' : title.includes('导出') ? '📥' : title.includes('商品') ? '📦' : title.includes('知识') ? '📚' : title.includes('营销') ? '📣' : '📄'
    return `<div class="ai-card"><div class="card-icon">${icon}</div><div class="card-body"><div class="card-title">${num}. ${title}</div><div class="card-desc">${desc}</div></div></div>`
  })

  // 表格
  s = s.replace(/((?:^[ \t]*\|.+\|[ \t]*\n?){2,})/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return tableBlock
    const sepIdx = rows.findIndex(r => /^\s*\|[\s\-:]+\|/.test(r) && r.replace(/[\s|:\-]/g, '') === '')
    const headerRow = sepIdx > 0 ? rows[sepIdx - 1] : rows[0]
    const dataRows = sepIdx >= 0 ? rows.filter((_, i) => i !== sepIdx && i !== sepIdx - 1) : rows.slice(1)
    const parseCells = r => r.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
    const thCells = parseCells(headerRow)
    let html = '<table style="width:100%;font-size:12px;margin:8px 0;border-collapse:collapse">'
    if (sepIdx >= 0) {
      html += '<tr>' + thCells.map(c => `<th style="padding:6px 8px;border-bottom:2px solid var(--border);text-align:left;font-weight:600;white-space:nowrap">${c}</th>`).join('') + '</tr>'
    } else {
      dataRows.unshift(headerRow)
    }
    dataRows.forEach(r => {
      const cells = parseCells(r)
      html += '<tr>' + cells.map(c => `<td style="padding:5px 8px;border-bottom:1px solid var(--border-light)">${c}</td>`).join('') + '</tr>'
    })
    html += '</table>'
    return html
  })

  // 追问按钮
  s = s.replace(/^[-•]\s+(.+[？?])\s*$/gm, (_, q) => {
    const plain = q.replace(/<strong>|<\/strong>/g, '').replace(/^\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}📥📊🔍📦📚📣📘🔒⚙️📄]+\s*/u, '').trim()
    const escQ = plain.replace(/'/g, "\\'").replace(/"/g, '&quot;')
    return `<button class="ai-suggest-btn" data-quick="${escQ}">${q}</button>`
  })

  s = s.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
  s = s.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>')
  s = s.replace(/^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅❌⚠️🔍📦📚📣📊🧠💡🔧📥📘🔒⚙️]+)\s*<strong>(.+?)<\/strong>/gmu, '<h3>$1 $2</h3>')
  s = s.replace(/\n/g, '<br>')
  s = s.replace(/(<\/h3>)<br>/g, '$1')
  s = s.replace(/(<\/ul>)<br>/g, '$1')
  s = s.replace(/(<hr>)<br>/g, '$1')
  s = s.replace(/(<\/table>)<br>/g, '$1')
  s = s.replace(/(<\/div><\/div><\/div>)<br>/g, '$1')
  s = s.replace(/<br><br><br>/g, '<br>')
  return s + toolTag
}

function renderBubble(msg) {
  if (msg.html) return msg.html  // 预渲染 HTML（流式或 mock 数据场景）
  if (msg.role === 'assistant') return renderAiMarkdown(msg.text || '')
  return escapeHtml(msg.text || '')
}

// ===== 消息区 =====
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  })
}

function pushMessage(role, text, html) {
  messages.value.push({ role, text: text || '', html: html || null })
  recordMessage(role, text || '')
  scrollToBottom()
}

function pushTyping(typingText = 'AI 正在思考') {
  const idx = messages.value.length
  messages.value.push({ typing: true, typingText })
  scrollToBottom()
  return idx
}

function removeTyping(idx) {
  if (messages.value[idx]?.typing) messages.value.splice(idx, 1)
}

// ===== 会话持久化 =====
function loadConversations() {
  try {
    const list = JSON.parse(localStorage.getItem(AI_CONVERSATION_STORAGE_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

function saveConversations(list) {
  localStorage.setItem(AI_CONVERSATION_STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
}

function convTitle() {
  const first = messages.value.find(m => m.role === 'user' && m.text)
  if (!first) return '新会话'
  return first.text.replace(/\s+/g, ' ').replace(/^📎\s*/, '').slice(0, 28) || '新会话'
}

function persistCurrentConversation() {
  if (!messages.value.length) return
  const current = {
    id: localConvId.value,
    remoteConvId: remoteConvId.value || null,
    title: convTitle(),
    messages: messages.value.filter(m => !m.typing).map(m => ({ role: m.role, text: m.text, at: new Date().toISOString() })),
    updatedAt: new Date().toISOString()
  }
  const list = loadConversations().filter(item => item.id !== current.id)
  saveConversations([current, ...list])
}

function recordMessage(role, text) {
  if (!text) return
  persistCurrentConversation()
}

function newLocalConvId() {
  return `aic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function newConversation(skipPersist = false) {
  if (!skipPersist) persistCurrentConversation()
  remoteConvId.value = null
  localConvId.value = newLocalConvId()
  messages.value = []
}

function getConvPreview(item) {
  const msgs = item.messages || []
  const last = msgs[msgs.length - 1]
  return last?.text ? last.text.replace(/\s+/g, ' ').slice(0, 80) : '暂无内容'
}

function openHistory() {
  persistCurrentConversation()
  conversationList.value = loadConversations()
  historyOpen.value = true
}

function restoreConversation(id) {
  persistCurrentConversation()
  const item = loadConversations().find(c => c.id === id)
  if (!item) return
  localConvId.value = item.id
  remoteConvId.value = item.remoteConvId || null
  messages.value = (item.messages || []).map(m => ({ role: m.role, text: m.text || '' }))
  historyOpen.value = false
  scrollToBottom()
}

function deleteConversation(id) {
  if (!confirm('确认删除这条会话记录？')) return
  saveConversations(loadConversations().filter(item => item.id !== id))
  if (localConvId.value === id) newConversation(true)
  conversationList.value = loadConversations()
}

// ===== 快捷 chips =====
function aiShortcutItemsForPage(page) {
  if (page === 'portal.home') return [
    { label: '工作台说明', text: '介绍门户工作台的能力边界和基础操作流程' },
    { label: '技能包管理', text: '打开技能包管理' },
    { label: '权限说明', text: '说明菜单权限和技能权限的区别' },
    { label: '新手引导', text: '我第一次使用门户工作台，请给我一个操作路径' }
  ]
  if (page === 'agent.skills') return [
    { label: '技能包', text: '说明当前可用技能包的用途和使用方式' },
    { label: '权限说明', text: '说明使用技能包时需要哪些权限和审批' },
    { label: '申请技能包', text: '我想申请一个技能包，应该怎么做' },
    { label: '调用说明', text: '说明技能包调用前需要确认哪些参数、影响范围和风险' }
  ]
  if (page === 'dashboard.overview') return [
    { label: '总览解读', text: '基于当前运营总览看板，分析主要趋势、风险和机会。' },
    { label: '链路瓶颈', text: '基于当前运营总览看板，找出登录、互动、购买、GMV链路中的最大瓶颈。' },
    { label: '增长动作', text: '基于当前运营总览看板，给出未来两周最优先的运营动作。' },
    { label: '补数建议', text: '基于当前运营总览看板，指出还缺少哪些数据才能判断问题原因。' }
  ]
  if (page === 'ops.traffic') return [
    { label: '入口贡献', text: '当前时间范围内，哪些入口贡献最大？这些入口的登录和互动质量怎么样？' },
    { label: '媒体TOP10', text: '分析监测媒体TOP10的访问、登录、互动贡献，并给出优化建议。' },
    { label: '登录转化', text: '当前流量的登录率和互动率是否异常？瓶颈在哪里？' },
    { label: '端口结构', text: '分端口流量结构有什么变化？APP、WAP、PC分别应该怎么优化？' }
  ]
  if (page === 'ops.gmv') return [
    { label: 'GMV解读', text: '基于当前GMV分析看板，分析GMV趋势、风险和机会。' },
    { label: '业务贡献', text: '消费、SMB、政企业务谁在拉动GMV，谁拖后腿？' },
    { label: '平台结构', text: '官网和非官网GMV结构是否健康？下一步怎么优化？' },
    { label: '增长缺口', text: '如果GMV要提升10%，当前看板显示最大的缺口在哪里？' }
  ]
  if (page?.startsWith('employee.')) return [
    { label: '认证总览', text: '总结当前在职员工认证数据和风险点' },
    { label: '待审核', text: '查看待审核认证，并提示优先处理建议' },
    { label: '失败原因', text: '分析最近认证失败原因 TopN' },
    { label: '认证方式', text: '统计企业邮箱、劳动合同、个人所得税和其他材料认证方式占比' }
  ]
  if (page?.startsWith('lead.')) return [
    { label: '线索看板', text: '总结企业客户线索看板关键变化' },
    { label: '线索池', text: '分析当前线索池待跟进情况' },
    { label: '分配建议', text: '根据线索状态给出分配和跟进建议' },
    { label: '客户风险', text: '识别企业客户跟进风险' }
  ]
  if (page?.startsWith('risk.')) return [
    { label: '策略概览', text: '总结当前风控策略和风险点' },
    { label: '限购检查', text: '检查限购规则是否存在配置风险' },
    { label: 'DPL 查询', text: '说明 DPL 查询口径和使用注意事项' },
    { label: '风险数据', text: '分析当前风险数据异常' }
  ]
  return [
    { label: '今日指标', text: '今日核心指标' },
    { label: '查数据', text: '最近7天订单按渠道汇总' },
    { label: '商品管理', text: '打开商品管理' },
    { label: '知识库', text: '打开知识库' },
    { label: 'CMS', text: '打开页面管理' },
    { label: '运营建议', text: '本周运营建议' }
  ]
}

function runShortcut(idx) {
  const item = shortcutItems.value[idx]
  if (item?.text) aiQuick(item.text)
}

function onShortcutKeydown(e, current) {
  const len = shortcutItems.value.length
  if (e.key === 'ArrowRight') { e.preventDefault(); focusShortcut(current + 1) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); focusShortcut(current - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusShortcut(0) }
  else if (e.key === 'End') { e.preventDefault(); focusShortcut(len - 1) }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runShortcut(current) }
}

function focusShortcut(idx) {
  if (!shortcutsRef.value) return
  const btn = shortcutsRef.value.querySelector(`[data-ai-shortcut="${Math.max(0, Math.min(idx, shortcutItems.value.length - 1))}"]`)
  btn?.focus({ preventScroll: true })
  btn?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
}

function scrollShortcuts(direction) {
  if (!shortcutsRef.value) return
  shortcutsRef.value.scrollBy({ left: direction * Math.max(120, Math.round(shortcutsRef.value.clientWidth * 0.72)), behavior: 'smooth' })
  setTimeout(updateScopeArrows, 260)
}

function onScopeSelectChange() {
  if (!scopeSelectRef.value) return
  runShortcut(Number(scopeSelectRef.value.value))
}

function updateScopeArrows() {
  const scroller = shortcutsRef.value
  const left = scopeLeftRef.value
  const right = scopeRightRef.value
  if (!scroller || !left || !right) return
  const overflow = scroller.scrollWidth > scroller.clientWidth + 2
  const atStart = scroller.scrollLeft <= 1
  const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1
  left.hidden = !overflow
  right.hidden = !overflow
  left.disabled = !overflow || atStart
  right.disabled = !overflow || atEnd
}

// ===== 文件处理 =====
function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  readFile(file)
  e.target.value = ''
}

function readFile(file) {
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    pushMessage('assistant', '文件过大（最大2MB），请压缩后重试')
    return
  }
  const textTypes = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.js', '.css', '.log', '.yaml', '.yml', '.sql', '.ini', '.conf', '.sh', '.py', '.java', '.ts', '.tsx', '.jsx']
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const isText = textTypes.includes(ext) || file.type.startsWith('text/') || file.type === 'application/json'

  if (isText) {
    const reader = new FileReader()
    reader.onload = () => {
      pendingFile.value = { name: file.name, type: file.type || ext, content: reader.result, size: file.size }
    }
    reader.readAsText(file)
  } else if (['.xlsx', '.xls', '.docx', '.pdf'].includes(ext)) {
    pushMessage('assistant', '正在解析文件...')
    const formData = new FormData()
    formData.append('file', file)
    fetch('/api/harness/upload', { method: 'POST', body: formData })
      .then(r => r.json()).then(data => {
        if (data.content) {
          pendingFile.value = { name: file.name, type: ext, content: data.content, size: file.size }
        } else {
          pushMessage('assistant', '文件解析失败: ' + (data.error || '不支持的格式'))
        }
      }).catch(() => {
        pushMessage('assistant', '文件上传失败，请稍后重试')
      })
  } else {
    pushMessage('assistant', '暂不支持此文件格式，支持: txt/md/csv/json/xlsx/docx/pdf')
  }
}

function clearFile() {
  pendingFile.value = null
}

// 拖拽上传
function initDragDrop() {
  const area = inputAreaRef.value
  if (!area) return
  const highlight = () => { area.style.borderColor = 'var(--primary)'; area.style.background = 'var(--primary-light)' }
  const unhighlight = () => { area.style.borderColor = ''; area.style.background = '' }
  ;['dragenter', 'dragover'].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); highlight() }))
  ;['dragleave', 'drop'].forEach(ev => area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); unhighlight() }))
  area.addEventListener('drop', e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0]
    if (file) readFile(file)
  })
}

// ===== 输入框自动高度 =====
function autoResizeInput() {
  const input = inputRef.value
  if (!input) return
  const styles = getComputedStyle(input)
  const lineHeight = parseFloat(styles.lineHeight) || 19.5
  const paddingTop = parseFloat(styles.paddingTop) || 0
  const paddingBottom = parseFloat(styles.paddingBottom) || 0
  const borderTop = parseFloat(styles.borderTopWidth) || 0
  const borderBottom = parseFloat(styles.borderBottomWidth) || 0
  const minHeight = parseFloat(styles.minHeight) || 36
  const maxHeight = Math.ceil(lineHeight * 3 + paddingTop + paddingBottom + borderTop + borderBottom)
  if (!input.value) {
    input.style.height = minHeight + 'px'
    input.style.overflowY = 'hidden'
    return
  }
  input.style.height = 'auto'
  const nextH = Math.min(maxHeight, Math.max(minHeight, input.scrollHeight + borderTop + borderBottom))
  input.style.height = nextH + 'px'
  input.style.overflowY = input.scrollHeight + borderTop + borderBottom > maxHeight ? 'auto' : 'hidden'
}

function onInputChange() {
  autoResizeInput()
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!sending.value && canSend.value) aiSend()
  }
}

// ===== 快捷发送 =====
function aiQuick(text) {
  inputText.value = text
  nextTick(aiSend)
}

// ===== 导航 =====
const AI_NAV_MAP = [
  { keywords: ['门户工作台', '工作台首页', '门户首页'], page: 'portal.home' },
  { keywords: ['skill hub', 'skill管理', '技能包管理', 'skills管理', '技能管理'], page: 'agent.skills' },
  { keywords: ['创建skill', 'skill创建', '新建skill', '创建技能'], page: 'agent.skillCreate' },
  { keywords: ['权限管理', '权限说明', '菜单权限', 'skill权限'], page: 'agent.permissions' },
  { keywords: ['运营总览', '数据总览', 'dashboard', '首页', '大盘', '概览'], page: 'dashboard.overview' },
  { keywords: ['geo', 'seo', '搜索引擎', '站外'], page: 'dashboard.geo' },
  { keywords: ['在职员工', '员工管理', '认证审核', '员工认证'], page: 'employee.overview' },
  { keywords: ['线索看板', '企业客户', '线索池', '客户管理'], page: 'lead.dashboard' },
  { keywords: ['搜索后台', '分类标签', '筛选条件', '词典管理'], page: 'search.categories' },
  { keywords: ['风控管理', '风控', '策略', '限购', 'dpl'], page: 'risk.overview' },
  { keywords: ['query分析', '查询分析', 'query', '热词', '标注看板', '数据标注', '标注'], page: 'pipeline.annotate' },
  { keywords: ['质量分析', '质量', '满意度', '性能', '异常', '评分', 'osat', 'nps'], page: 'pipeline.quality' },
]

function tryNavigate(text) {
  const lower = text.toLowerCase().trim()
  const navMatch = lower.match(/^(?:打开|去|跳转到?|切换到?|进入|查看|show|open|goto|go to)\s*(.+)/)
  const target = navMatch ? navMatch[1].trim() : null
  const isShortNavOnly = !target && lower.length <= 6
  const matchText = target || (isShortNavOnly ? lower : null)
  if (!matchText) return null
  for (const rule of AI_NAV_MAP) {
    for (const kw of rule.keywords) {
      if (target ? matchText.includes(kw) : matchText === kw) {
        const path = '/' + rule.page.replace('.', '/')
        router.push(path)
        return `已为你打开 **${rule.page}**`
      }
    }
  }
  return null
}

// ===== 发送消息（核心） =====
async function aiSend() {
  if (sending.value) return
  const text = inputText.value.trim()
  if (!text && !pendingFile.value) return

  // 构建消息
  let userMsg = text
  let msgForApi = text
  const hadFile = !!pendingFile.value
  if (pendingFile.value) {
    const fileInfo = '📎 ' + pendingFile.value.name
    userMsg = text ? fileInfo + '\n' + text : fileInfo
    const truncContent = pendingFile.value.content.length > 8000
      ? pendingFile.value.content.slice(0, 8000) + '\n...(内容过长已截断)'
      : pendingFile.value.content
    msgForApi = `[用户上传了文件: ${pendingFile.value.name}]\n\n--- 文件内容 ---\n${truncContent}\n--- 文件结束 ---\n\n${text || '请分析这个文件'}`
  }

  pushMessage('user', userMsg)
  inputText.value = ''
  nextTick(autoResizeInput)
  clearFile()
  sending.value = true

  // 本地导航
  const navResult = tryNavigate(text)
  if (navResult) {
    pushMessage('assistant', navResult)
    sending.value = false
    return
  }

  // SSE 流式
  const typingIdx = pushTyping('AI 正在思考')
  await streamHarnessChat(msgForApi, typingIdx, userMsg)
  sending.value = false
}

async function streamHarnessChat(msgForApi, typingIdx, displayMessage) {
  let accumulated = ''
  let toolsUsed = []
  let streamMsgIdx = -1

  const ensureStreamMsg = () => {
    if (streamMsgIdx >= 0) return
    removeTyping(typingIdx)
    messages.value.push({ role: 'assistant', text: '', html: '' })
    streamMsgIdx = messages.value.length - 1
  }

  const render = () => {
    if (streamMsgIdx < 0) return
    let text = accumulated
    if (toolsUsed.length) text += '\n\n🔧 调用了: ' + toolsUsed.join(', ')
    messages.value[streamMsgIdx].text = text
    messages.value[streamMsgIdx].html = null  // 清空，让 renderBubble 重渲
    scrollToBottom()
  }

  // 当前页面 key
  const path = route.path.replace(/^\/admin-vue/, '').replace(/^\//, '')
  const currentPage = path.replace('/', '.')

  try {
    const resp = await fetch('/api/harness/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msgForApi,
        displayMessage: displayMessage || msgForApi,
        convId: remoteConvId.value,
        currentPage,
        stream: true
      })
    })

    if (!resp.ok || !resp.body) {
      removeTyping(typingIdx)
      pushMessage('assistant', '请求失败: HTTP ' + resp.status)
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop()
      for (const evt of events) {
        const line = evt.split('\n').find(l => l.startsWith('data:'))
        if (!line) continue
        const payload = line.slice(5).trim()
        if (!payload) continue
        let obj
        try { obj = JSON.parse(payload) } catch { continue }

        if (obj.type === 'start') {
          if (obj.convId) remoteConvId.value = obj.convId
          persistCurrentConversation()
        } else if (obj.type === 'tools') {
          toolsUsed = obj.tools || []
          if (streamMsgIdx < 0 && typingIdx >= 0 && messages.value[typingIdx]?.typing) {
            messages.value[typingIdx].typingText = '正在执行 ' + toolsUsed.join(', ')
          }
        } else if (obj.type === 'delta') {
          ensureStreamMsg()
          accumulated += obj.text || ''
          render()
        } else if (obj.type === 'done') {
          if (obj.toolsUsed && obj.toolsUsed.length) {
            toolsUsed = obj.toolsUsed
            render()
          }
          // NAV 标记
          const aiNavMatch = accumulated.match(/\[NAV:([^\]]+)\]/)
          if (aiNavMatch) {
            const pageId = aiNavMatch[1].trim()
            accumulated = accumulated.replace(/\[NAV:[^\]]+\]/, '')
            if (streamMsgIdx >= 0) {
              messages.value[streamMsgIdx].text = accumulated + (toolsUsed.length ? '\n\n🔧 调用了: ' + toolsUsed.join(', ') : '')
              messages.value[streamMsgIdx].html = null
            }
            router.push('/' + pageId.replace('.', '/'))
          }
          if (streamMsgIdx >= 0) {
            recordMessage('assistant', accumulated || '（无响应）')
          }
        } else if (obj.type === 'error') {
          ensureStreamMsg()
          accumulated += '\n\n⚠️ ' + obj.message
          render()
        }
      }
    }

    // 移除 typing（若流没输出任何 delta）
    removeTyping(typingIdx)
    if (streamMsgIdx < 0) {
      pushMessage('assistant', '（无响应）')
    }
  } catch (err) {
    removeTyping(typingIdx)
    if (streamMsgIdx >= 0) {
      accumulated += '\n\n⚠️ 连接中断: ' + err.message
      render()
    } else {
      pushMessage('assistant', '请求失败: ' + err.message)
    }
  }
}

// ===== 技能管理 =====
function openSkillManager() {
  if (typeof window.openSkillManagerOverlay === 'function') {
    window.openSkillManagerOverlay()
  } else {
    router.push('/agent/skills')
  }
}

// ===== 拖拽调宽 =====
let dragState = null

function initResize() {
  const handle = handleRef.value
  const panel = panelRef.value
  if (!handle || !panel) return

  handle.addEventListener('mousedown', e => {
    e.preventDefault()
    dragState = { startX: e.clientX, startW: panel.offsetWidth }
    panel.classList.add('resizing')
    handle.classList.add('active')
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeUp)
  })

  function onResizeMove(e) {
    if (!dragState) return
    const diff = dragState.startX - e.clientX
    const maxW = Math.max(380, Math.min(380 + 112, window.innerWidth - 320))
    const nextW = Math.min(Math.max(380, dragState.startW + diff), maxW)
    panel.style.width = `${nextW}px`
  }

  function onResizeUp() {
    if (dragState) {
      panel.classList.remove('resizing')
      handle.classList.remove('active')
      dragState = null
    }
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeUp)
  }

  window.addEventListener('resize', () => {
    if (panel.style.width) {
      const maxW = Math.max(380, Math.min(380 + 112, window.innerWidth - 320))
      const cur = panel.offsetWidth
      if (cur > maxW) panel.style.width = `${maxW}px`
    }
  })
}

// ===== 生命周期 =====
onMounted(() => {
  localConvId.value = newLocalConvId()

  // 初始化 chips（当前路由）
  const path = route.path.replace(/^\/admin-vue/, '').replace(/^\//, '')
  shortcutItems.value = aiShortcutItemsForPage(path.replace('/', '.'))

  nextTick(() => {
    initResize()
    initDragDrop()
    autoResizeInput()
    updateScopeArrows()

    // shortcuts 滚动监听
    if (shortcutsRef.value) {
      shortcutsRef.value.addEventListener('scroll', updateScopeArrows, { passive: true })
    }
  })

  // 全局 quick 入口暴露（兼容原生页面调用 window.aiQuick）
  window.aiQuick = aiQuick
})

// 暴露 aiQuick 给外部（AppShell toggleAI 之后可以调用）
defineExpose({ aiQuick, newConversation })
</script>

<style scoped>
/* 历史弹窗覆盖层（仅此组件需要，全局 CSS 里没有） */
.ai-conversation-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 9999;
  align-items: center;
  justify-content: center;
}
.ai-conversation-modal.open {
  display: flex;
}
</style>
