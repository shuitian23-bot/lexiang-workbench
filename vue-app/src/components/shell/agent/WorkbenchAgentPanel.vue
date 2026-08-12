<template>
  <!--
    完整还原原版 #ai-panel 结构，class 一字不改。
    .open 类 → aiOpen  (对应原 panel.classList.toggle('open', STATE.aiOpen))
    拖拽调宽、快捷标签、历史会话弹层均在此组件内实现。
  -->
  <div
    class="ai-panel"
    id="ai-panel"
    :class="{ open: aiOpen }"
    :style="panelWidthStyle"
    :aria-hidden="aiOpen ? undefined : 'true'"
    :inert="aiOpen ? undefined : true"
    ref="panelEl"
  >
    <!-- 左边拖拽把手 -->
    <div class="ai-resize-handle" id="ai-resize-handle" ref="handleEl"></div>

    <AgentPanelHeader
      :attention-label="attentionLabel"
      @open-skill-manager="openSkillManager"
      @new-conversation="aiStore.newConversation()"
      @open-history="openHistory"
      @toggle-ai="aiStore.toggleOpen()"
    />

    <AgentMessageList
      :messages="messages"
      :loading="loading"
      :activity-items="activityItems"
      :current-page-id="route.meta?.pageId || ''"
      @quick-send="quickSend"
      @open-report="openReportArtifact"
      @save-report="saveReportArtifact"
      @run-action="runTaskAction"
    />

    <AgentComposer
      :input-text="aiStore.inputText"
      :attached-file="attachedFile"
      :attached-files="attachedFiles"
      :active-shortcut="activeShortcut"
      :shortcuts="shortcuts"
      :input-placeholder="inputPlaceholder"
      :queued-messages="queuedMessages"
      :queue-notice="queueNotice"
      :loading="loading"
      :shortcut-query="aiStore.shortcutQuery"
      @update-input="value => { aiStore.inputText = value }"
      @send="sendMsg"
      @send-shortcut="sendShortcut"
      @attach-file="aiStore.attachFile"
      @clear-file="aiStore.clearFile"
    />
  </div>

  <!-- ===== 历史对话弹层（对应原 #ai-conversation-modal）===== -->
  <Teleport to="body">
    <div
      v-if="historyVisible"
      class="ai-conversation-modal open"
      id="ai-conversation-modal"
      @click.self="closeHistory"
    >
      <div class="ai-conversation-panel" role="dialog" aria-label="AI 历史会话">
        <div class="ai-conversation-head">
          <div>
            <div class="ai-conversation-title">历史会话</div>
            <div class="ai-conversation-meta">查看、恢复或删除右侧 AI 助手的会话记录</div>
          </div>
          <div class="ai-conversation-actions">
            <button class="btn btn-primary" @click="doNewConversation">新开会话</button>
            <button class="agent-skill-modal-close" @click="closeHistory" title="关闭">×</button>
          </div>
        </div>
        <div class="ai-conversation-body">
          <div v-if="!historyList.length" class="ai-conversation-empty">
            <b>暂无历史会话</b>
            <span>开始提问后，这里会自动保存记录。</span>
            <button v-if="lastDeletedConversation" type="button" class="btn btn-secondary" @click="undoDelete">撤销删除</button>
          </div>
          <div
            v-for="item in historyList"
            :key="item.id"
            class="ai-conversation-item"
            :class="{ active: item.id === aiStore.localConvId }"
          >
            <div class="ai-conversation-item-main">
              <div class="ai-conversation-item-title">{{ item.title || '未命名会话' }}</div>
              <div class="ai-conversation-item-preview">{{ historyPreview(item) }}</div>
              <div class="ai-conversation-item-meta">
                {{ formatDate(item.updatedAt) }} · {{ item.messages?.length || 0 }} 条消息{{ item.id === aiStore.localConvId ? ' · 当前会话' : '' }}
              </div>
            </div>
            <div class="ai-conversation-item-actions">
              <template v-if="pendingDeleteId === item.id">
                <span class="ai-conversation-delete-confirm">确认删除？</span>
                <button class="btn btn-secondary" @click="pendingDeleteId = ''">取消</button>
                <button class="btn btn-danger" @click="confirmDelete(item.id)">确认删除</button>
              </template>
              <template v-else>
                <button class="btn btn-secondary" @click="doRestore(item.id)">打开</button>
                <button class="btn btn-secondary danger" @click="requestDelete(item.id)">删除</button>
              </template>
            </div>
          </div>
          <div v-if="taskLogs.length" class="ai-conversation-empty" style="text-align:left">
            <b style="display:block;margin-bottom:8px;color:var(--text)">任务日志</b>
            <div
              v-for="log in taskLogs"
              :key="log.id"
              class="ai-conversation-item"
              style="margin-top:8px"
            >
              <div class="ai-conversation-item-main">
                <div class="ai-conversation-item-title">{{ log.title }}</div>
                <div class="ai-conversation-item-preview">{{ log.pageLabel }} · {{ log.status }}</div>
                <div class="ai-conversation-item-meta">{{ formatDate(log.at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAIStore } from '@/stores/ai'
import { useAppStore, getPageLabel } from '@/stores/app'
import { ensureNativeWorkbenchRuntime } from '@/adapters/legacyWorkbench/nativeWorkbenchRuntime'
import { useBodyClass } from '@/composables/useBodyClass'
import { useAiPanelLayout } from '@/composables/useAiPanelLayout'
import AgentPanelHeader from '@/components/agent/AgentPanelHeader.vue'
import AgentMessageList from '@/components/agent/AgentMessageList.vue'
import AgentComposer from '@/components/agent/AgentComposer.vue'

const aiStore  = useAIStore()
const appStore = useAppStore()
const route    = useRoute()
const router   = useRouter()

const {
  open: aiOpen, messages, loading, panelWidth,
  attachedFile, attachedFiles, activeShortcut, shortcuts, inputPlaceholder,
  queuedMessages, queueNotice, taskLogs, activityItems
} = storeToRefs(aiStore)

// ---- DOM 引用 ----
const panelEl     = ref(null)
const handleEl    = ref(null)

const { panelWidthStyle, syncBodyPanelState } = useAiPanelLayout(panelEl)
const modalBodyClass = useBodyClass('agent-skill-modal-open')

let _layoutResizeTimer = 0

function notifyWorkbenchResize() {
  window.dispatchEvent(new Event('resize'))
  window.clearTimeout(_layoutResizeTimer)
  _layoutResizeTimer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 320)
}

watch(aiOpen, (isOpen) => {
  if (!isOpen && panelEl.value?.contains(document.activeElement)) {
    nextTick(() => document.getElementById('ai-toggle-btn')?.focus())
  }
  nextTick(notifyWorkbenchResize)
})

watch(panelWidth, () => nextTick(notifyWorkbenchResize))

// ---- 关注标签（对应 aiCurrentPageAttentionLabel）----
const attentionLabel = computed(() => {
  const pid = route.meta?.pageId || ''
  return getPageLabel(pid) || '联想门户工作台'
})

function openReportArtifact(id) {
  aiStore.openReportArtifact(id, appStore)
}

function saveReportArtifact(id) {
  aiStore.saveReportArtifact(id, appStore)
  appStore.notify('AI 报告已保存')
}

// ---- 发送消息 ----
async function sendMsg() {
  const pageId = route.meta?.pageId || ''
  await aiStore.send(pageId, { router, appStore })
}

function quickSend(text) {
  aiStore.quickSend(text, route.meta?.pageId || '', { router, appStore })
}

function sendShortcut(label) {
  aiStore.sendShortcut(label, route.meta?.pageId || '', { router, appStore })
}

function runTaskAction(action) {
  aiStore.runTaskAction(action, route.meta?.pageId || '', { router, appStore })
}

// ---- 历史对话 ----
const historyVisible = ref(false)
const historyList    = ref([])
const pendingDeleteId = ref('')
const lastDeletedConversation = ref(null)

function openHistory() {
  historyList.value = aiStore.loadConversations()
  pendingDeleteId.value = ''
  historyVisible.value = true
  modalBodyClass.add()
}

function closeHistory() {
  historyVisible.value = false
  modalBodyClass.remove()
}

function doNewConversation() {
  aiStore.newConversation()
  closeHistory()
}

function doRestore(id) {
  aiStore.restoreConversation(id)
  closeHistory()
}

function requestDelete(id) {
  pendingDeleteId.value = id
}

function confirmDelete(id) {
  lastDeletedConversation.value = historyList.value.find(item => item.id === id) || null
  aiStore.deleteConversation(id)
  historyList.value = aiStore.loadConversations()
  pendingDeleteId.value = ''
}

function undoDelete() {
  if (!lastDeletedConversation.value) return
  aiStore.saveConversations([lastDeletedConversation.value, ...aiStore.loadConversations()])
  historyList.value = aiStore.loadConversations()
  lastDeletedConversation.value = null
}

function historyPreview(item) {
  const msgs = item.messages || []
  const last = msgs[msgs.length - 1]
  return last?.text ? last.text.replace(/\s+/g, ' ').slice(0, 80) : '暂无内容'
}

function formatDate(dateStr) {
  try { return new Date(dateStr || Date.now()).toLocaleString('zh-CN') } catch { return '' }
}

// ---- 打开 Skill 管理 ----
async function openSkillManager() {
  try {
    await ensureNativeWorkbenchRuntime(router)
    window.openSkillManagerOverlay?.()
  } catch {
    appStore.ensureStaticTab('agent.skills')
    appStore.setActiveStaticTab('agent.skills')
    router.push('/agent/skills')
  }
}

// ---- 拖拽调宽（对应原 IIFE resize 逻辑）----
let _startX = 0
let _startW = 0

function _onDragMove(e) {
  const diff = _startX - e.clientX
  aiStore.setPanelWidth(_startW + diff, appStore, window.innerWidth)
  syncBodyPanelState()
}

function _onDragUp() {
  panelEl.value?.classList.remove('resizing')
  handleEl.value?.classList.remove('active')
  document.removeEventListener('mousemove', _onDragMove)
  document.removeEventListener('mouseup', _onDragUp)
}

function _initDragResize() {
  const handle = handleEl.value
  if (!handle) return
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault()
    _startX = e.clientX
    _startW = panelEl.value?.offsetWidth || panelWidth.value
    panelEl.value?.classList.add('resizing')
    handle.classList.add('active')
    document.addEventListener('mousemove', _onDragMove)
    document.addEventListener('mouseup', _onDragUp)
  })
}

// ---- window resize：重新计算面板宽度边界 ----
function _onWindowResize() {
  if (!aiOpen.value || !panelEl.value?.style.width) return
  aiStore.setPanelWidth(panelEl.value.offsetWidth, appStore, window.innerWidth)
  syncBodyPanelState()
}

onMounted(() => {
  _initDragResize()
  window.addEventListener('resize', _onWindowResize)
  aiStore.restoreState()
  aiStore.seedDemoReportCards(route.meta?.pageId || 'portal.home')
})

onBeforeUnmount(() => {
  window.clearTimeout(_layoutResizeTimer)
  window.removeEventListener('resize', _onWindowResize)
  document.removeEventListener('mousemove', _onDragMove)
  document.removeEventListener('mouseup', _onDragUp)
})
</script>
