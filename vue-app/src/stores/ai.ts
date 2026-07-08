/**
 * AI 面板状态管理
 * 由封板工作台 AI 运行时迁移到 Pinia 的面板状态与核心函数
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getGroupLabel, getPageLabel, pageIdToPath } from '@/stores/app'
import { STORAGE_KEYS, readBooleanStorage, writeBooleanStorage } from '@/constants/storageKeys'

type AnyRecord = Record<string, unknown>
type ShortcutLabel = '今日指标' | '查数据' | '商品管理' | '知识库' | 'CMS' | '运营建议'
type MessageRole = 'user' | 'assistant'
type ConversationActivityKind = 'thinking' | 'tool_call' | 'tool_result' | 'follow_up' | 'confirm' | 'streaming' | 'error'
type ConversationActivityStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'

interface AttachedFile {
  name: string
  text?: string
  type?: string
  dataUrl?: string
  isImage?: boolean
}

interface TaskAction {
  type: 'report' | 'navigate' | 'skill' | 'prompt' | 'auth_approve' | 'auth_reject'
  label: string
  value?: string
}

interface AiMessage {
  role: MessageRole
  text: string
  at: string
  demoReportQuery?: boolean
  demoReportEntry?: boolean
  artifacts?: string[]
  actionItems?: TaskAction[]
  activityItems?: ConversationActivityItem[]
  todoList?: TodoListBlock
  authRequest?: AuthRequestBlock
}

interface ConversationActivityItem {
  id: string
  kind: ConversationActivityKind
  status: ConversationActivityStatus
  title: string
  detail?: string
}

interface TodoListBlock {
  title: string
  done: number
  total: number
  items: Array<{
    id: string
    text: string
    status: 'done' | 'running' | 'pending'
  }>
}

interface AuthRequestBlock {
  title: string
  namespace: string
  command: string
  risk: string
  detail: string
  approveLabel: string
  rejectLabel: string
}

interface ReportArtifact {
  id: string
  title: string
  sourcePage: string
  sourcePageLabel: string
  groupLabel: string
  summary: string
  chips: string[]
  content?: string
  previewHtml?: string
  createdAt: string
  saved?: boolean
}

interface ComposerPayload {
  pageId: string
  text: string
  userMsg: string
  apiMessage: string
  fileName: string
  shortcut: string
  contextSummary: string
}

const HARNESS_CHAT_ENDPOINT = '/api/harness/chat'

interface QueuedPayload extends ComposerPayload {
  context: AiRuntimeContext
  queueId: string
}

interface ConversationItem {
  id: string
  remoteConvId: string | null
  title: string
  messages: AiMessage[]
  updatedAt: string
}

interface TaskLog {
  id: string
  type: string
  title: string
  pageId: string
  pageLabel: string
  at: string
  status: string
}

interface AppStoreBridge {
  sidebarCollapsed?: boolean
  setSidebarCollapsed?: (value: boolean, options?: { persist?: boolean }) => void
  openTempTab?: (payload: ReportArtifact) => unknown
  ensureStaticTab?: (pageId: string) => void
  setActiveStaticTab?: (pageId: string) => void
  tempTabs?: Array<{ id: string; saved?: boolean }>
}

interface RouterBridge {
  push: (path: string) => unknown
}

interface AiRuntimeContext {
  router?: RouterBridge
  appStore?: AppStoreBridge
}

export const AI_PANEL_DEFAULT_WIDTH             = 380
export const AI_PANEL_COLLAPSED_NAV_EXTRA_WIDTH = 112
const AI_CONVERSATION_STORAGE_KEY        = 'leai_ai_conversations'
const AI_REPORT_STORAGE_KEY              = 'leai_ai_saved_reports'
const AI_PREVIEW_RESPONSE_DELAY_MS       = import.meta.env.DEV ? 3600 : 0

// 全局 report artifacts 缓存（对应原 AI_REPORT_ARTIFACTS 对象）
export const AI_REPORT_ARTIFACTS: Record<string, ReportArtifact> = {}

export const useAIStore = defineStore('ai', () => {
  // ---- 面板开关（对应 STATE.aiOpen）----
  const open        = ref(false)
  // ---- 当前会话（对应 STATE.aiConvId / aiLocalConvId / aiLocalMessages）----
  const convId      = ref<string | null>(null)       // 后端 conv_id
  const localConvId = ref(_newLocalId())
  const messages    = ref<AiMessage[]>([])         // [{ role, text, at }]
  // ---- 发送状态 ----
  const loading     = ref(false)
  const queuedMessages = ref<QueuedPayload[]>([])
  const queueNotice = ref('')
  const taskLogs = ref<TaskLog[]>([])
  const activityItems = ref<ConversationActivityItem[]>([])
  // ---- 面板宽度（内联 style 用）----
  const panelWidth  = ref(AI_PANEL_DEFAULT_WIDTH) // 0 表示用 CSS 默认
  // ---- 是否因 AI 面板展开而自动折叠了侧栏 ----
  const autoCollapsedSidebar = ref(false)
  // ---- 输入框内容 ----
  const inputText   = ref('')
  // ---- 上传的文件 ----
  const attachedFile = ref<AttachedFile | null>(null)  // { name, text }
  // ---- 当前选中的快捷标签 ----
  const activeShortcut = ref('')
  const pendingShortcut = ref('')
  // ---- 快捷标签列表 ----
  const shortcuts = ref<ShortcutLabel[]>(['今日指标', '查数据', '商品管理', '知识库', 'CMS', '运营建议'])
  const shortcutQueries: Record<ShortcutLabel, string> = {
    '今日指标': '查看当前页面的今日核心指标，先给出异常项和需要我确认的下一步动作。',
    '查数据': '基于当前页面查询关键数据，请先说明查询口径、时间范围和可用筛选项。',
    '商品管理': '进入商品管理任务模式，请先确认要配置的商品范围、影响页面和发布前确认步骤。',
    '知识库': '查询知识库并整理相关条目，请按命中内容、缺口和补充建议输出。',
    'CMS': '进入 CMS 配置任务模式，请先确认配置对象、上线范围、回滚方式和审批风险。',
    '运营建议': '基于当前页面数据给出运营建议，请按问题、证据、建议动作和风险确认输出。'
  }

  let activeAbortController: AbortController | null = null
  let stopRequested = false
  let queueSeq = 0

  // ---- 输入框 placeholder ----
  const inputPlaceholder = computed(() => '描述你要查询、生成或配置的任务...')

  // ===== toggleOpen（对应原 toggleAI）=====
  function toggleOpen(forceState?: boolean) {
    const next = typeof forceState === 'boolean' ? forceState : !open.value
    open.value = next

    if (!next) {
      panelWidth.value = AI_PANEL_DEFAULT_WIDTH
      autoCollapsedSidebar.value = false
    }

    writeBooleanStorage(STORAGE_KEYS.aiOpen, next)
  }

  // ===== 恢复 AI 状态（对应原 restoreAIState）=====
  function restoreState() {
    const shouldOpen = readBooleanStorage(
      STORAGE_KEYS.aiOpen,
      STORAGE_KEYS.legacyAiOpen,
      true
    )
    if (shouldOpen) toggleOpen(true)
  }

  // ===== 计算面板最大宽度（对应 aiPanelMaxWidth）=====
  function maxPanelWidth(viewportWidth = window.innerWidth) {
    return Math.max(
      AI_PANEL_DEFAULT_WIDTH,
      Math.min(AI_PANEL_DEFAULT_WIDTH + AI_PANEL_COLLAPSED_NAV_EXTRA_WIDTH, viewportWidth - 320)
    )
  }

  // ===== 设置面板宽度（对应 aiSetPanelWidth）=====
  function setPanelWidth(width: number, appStore?: AppStoreBridge, viewportWidth = window.innerWidth) {
    const maxW  = maxPanelWidth(viewportWidth)
    const nextW = Math.min(Math.max(width, AI_PANEL_DEFAULT_WIDTH), maxW)
    panelWidth.value = nextW

    const atMax = nextW >= maxW - 1
    const canAutoCollapse = viewportWidth <= 1320
    if (atMax && canAutoCollapse && appStore?.setSidebarCollapsed && !appStore.sidebarCollapsed) {
      appStore.setSidebarCollapsed(true, { persist: false })
      autoCollapsedSidebar.value = true
    } else if ((!atMax || !canAutoCollapse) && autoCollapsedSidebar.value && appStore?.setSidebarCollapsed) {
      appStore.setSidebarCollapsed(false, { persist: false })
      autoCollapsedSidebar.value = false
    }
    return nextW
  }

  // ===== 新建会话（对应 newAiConversation）=====
  function newConversation(skipPersist = false) {
    if (!skipPersist) _persistConversation()
    if (loading.value) stopCurrentResponse()
    convId.value      = null
    localConvId.value = _newLocalId()
    messages.value    = []
    inputText.value   = ''
    attachedFile.value = null
    queuedMessages.value = []
    queueNotice.value = ''
    activityItems.value = []
  }

  // ===== 发送消息（对应 aiSend：发送 / 排队 / 停止三态）=====
  async function send(pageId: string, context: AiRuntimeContext = {}) {
    const payload = _createComposerPayload(pageId)

    if (loading.value) {
      if (payload) {
        _clearComposerDraft()
        _queuePayload(payload, context)
      } else {
        stopCurrentResponse()
      }
      return
    }

    if (!payload) return

    _clearComposerDraft()
    if (_tryLocalCommand(payload, context)) return
    await _runPayload(payload)
  }

  function _createComposerPayload(pageId: string): ComposerPayload | null {
    const text = inputText.value.trim()
    const file = attachedFile.value
    if (!text && !file) return null
    const contextSummary = _buildPageContext(pageId)
    const pageDataContext = _buildPageDataContext(pageId)

    const userMsg = file
      ? (text ? `📎 ${file.name}\n${text}` : `📎 ${file.name}`)
      : text
    const apiMessage = file
      ? `${contextSummary}\n\n${pageDataContext}\n\n${file.text || `📎 ${file.name}`}\n\n${text || '请分析这个文件'}`
      : `${contextSummary}\n\n${pageDataContext}\n\n${text}`

    return {
      pageId: pageId || '',
      text,
      userMsg,
      apiMessage,
      fileName: file?.name || '',
      shortcut: pendingShortcut.value || activeShortcut.value,
      contextSummary
    }
  }

  function _clearComposerDraft() {
    inputText.value = ''
    attachedFile.value = null
    pendingShortcut.value = ''
  }

  function _queuePayload(payload: ComposerPayload, context: AiRuntimeContext = {}) {
    queuedMessages.value.push({
      ...payload,
      context,
      queueId: `aiq_${Date.now()}_${++queueSeq}`
    })
    queueNotice.value = `已加入队列 · ${queuedMessages.value.length} 条待发送`
  }

  async function _runPayload(payload: ComposerPayload) {
    _recordMessage('user', payload.userMsg)
    loading.value = true
    stopRequested = false
    activeAbortController = new AbortController()
    _setActivityItems(_baseRunningActivities(payload))
    queueNotice.value = queuedMessages.value.length
      ? `正在回答，队列中还有 ${queuedMessages.value.length} 条`
      : ''

    try {
      if (AI_PREVIEW_RESPONSE_DELAY_MS) {
        await _delay(AI_PREVIEW_RESPONSE_DELAY_MS)
        if (stopRequested) throw new DOMException('Aborted', 'AbortError')
      }

      const body: Record<string, string | null> = {
        message:     payload.apiMessage,
        convId:      convId.value,
        currentPage: payload.pageId || 'portal.home',
        shortcut:    payload.shortcut || activeShortcut.value
      }
      if (payload.fileName) {
        body.file_name = payload.fileName
      }

      const res  = await fetch(HARNESS_CHAT_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  activeAbortController.signal
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      _markActivityDone('tool_call')
      _upsertActivity('tool_result', 'done', '工具结果已返回', '已拿到 AI 回复内容，正在整理为可读回答。')
      _upsertActivity('streaming', 'running', '生成回复', '正在输出结论、后续动作和可展开结果。')
      const data = await res.json() as { reply?: string; message?: string; convId?: string; conv_id?: string }
      const reply = data.reply || data.message || '（无回复）'
      convId.value = data.convId || data.conv_id || convId.value
      _markActivityDone('streaming')
      _appendPostReplyActivities(payload, reply)
      _recordAssistantReply(payload, reply)
    } catch (e) {
      if ((e instanceof DOMException && e.name === 'AbortError') || stopRequested) {
        _setActivityItems([
          _createActivity('error', 'blocked', '回答已停止', '当前生成已被手动停止，队列消息会继续按顺序处理。')
        ])
        _recordMessage('assistant', '已停止当前回答。', { activityItems: _snapshotActivities() })
      } else {
        await _delay(850)
        _settleActivity('thinking', 'done')
        _settleActivity('tool_call', 'failed', '接口调用失败', e instanceof Error ? e.message : '远端接口暂不可用。')
        _settleActivity('tool_result', 'failed', '工具结果不可用', '接口失败后未返回火山引擎结果。')
        _settleActivity('error', 'blocked', '火山引擎不可用', '未生成本地模拟解读，避免把演示内容误当真实分析。')
        _recordAssistantReply(payload, _mockReply(payload, e))
      }
    } finally {
      _finishResponse()
    }
  }

  function stopCurrentResponse() {
    if (!loading.value || !activeAbortController) return
    stopRequested = true
    activeAbortController.abort()
    queueNotice.value = queuedMessages.value.length
      ? `已停止，准备发送队列 · ${queuedMessages.value.length} 条待发送`
      : '已停止当前回答'
  }

  function _finishResponse() {
    loading.value = false
    activeAbortController = null
    stopRequested = false

    if (queuedMessages.value.length) {
      const next = queuedMessages.value.shift()
      if (!next) return
      queueNotice.value = queuedMessages.value.length
        ? `正在发送队列 · 剩余 ${queuedMessages.value.length} 条`
        : ''
      setTimeout(() => {
        if (!_tryLocalCommand(next, next.context || {})) _runPayload(next)
      }, 0)
    } else {
      queueNotice.value = ''
    }
  }

  function seedDemoReportCards(pageId = '') {
    const reports: ReportArtifact[] = _createDemoReports(pageId)
    reports.forEach(report => { AI_REPORT_ARTIFACTS[report.id] = report })
    if (!open.value) toggleOpen(true)
    if (messages.value.some(msg => msg.demoReportEntry)) return
    _recordMessage('user', '我准备了几份动态页签走查报告。点击卡片里的“展开报告”，会从 Agent 区推送到中间工作区动态页签。', {
      demoReportQuery: true
    })
    _recordMessage('assistant', '已根据你的 query 生成动态页签走查报告，可点击卡片里的“展开报告”推送到中间工作区动态页签。', {
      demoReportEntry: true,
      artifacts: reports.map(report => report.id)
    })
  }

  function openReportArtifact(id: string, appStore?: AppStoreBridge) {
    const report = AI_REPORT_ARTIFACTS[id]
    if (!report || !appStore?.openTempTab) return
    appStore.openTempTab(report)
  }

  function saveReportArtifact(id: string, appStore?: AppStoreBridge) {
    const report = AI_REPORT_ARTIFACTS[id]
    if (!report) return
    report.saved = true
    const saved = readJsonArray<ReportArtifact>(AI_REPORT_STORAGE_KEY)
    const next = [report, ...saved.filter(item => item.id !== id)].slice(0, 20)
    localStorage.setItem(AI_REPORT_STORAGE_KEY, JSON.stringify(next))
    if (appStore?.tempTabs?.some(item => item.id === id)) {
      const tab = appStore.tempTabs.find(item => item.id === id)
      if (tab) tab.saved = true
    }
  }

  function runTaskAction(action: TaskAction, pageId = '', context: AiRuntimeContext = {}) {
    if (!action) return
    if (action.type === 'report') {
      const report = _createActionReport(pageId, action.value || action.label)
      AI_REPORT_ARTIFACTS[report.id] = report
      context.appStore?.openTempTab?.(report)
      _recordTaskLog('report', `生成报告：${report.title}`, pageId || 'portal.home')
      _recordMessage('assistant', `已生成「${report.title}」，可以在顶部动态页签中继续查看。`, {
        artifacts: [report.id]
      })
      return
    }
    if (action.type === 'navigate') {
      const target = pageIdToPath(action.value || '')
      if (target) {
        context.router?.push(target)
        _recordTaskLog('navigate', `打开页面：${getPageLabel(action.value || '')}`, action.value || '')
        _recordMessage('assistant', `已为你打开「${getPageLabel(action.value || '')}」。`)
      }
      return
    }
    if (action.type === 'skill') {
      context.appStore?.ensureStaticTab?.('agent.skills')
      context.appStore?.setActiveStaticTab?.('agent.skills')
      context.router?.push('/agent/skills')
      _recordTaskLog('skill', '打开 Skill Hub', 'agent.skills')
      _recordMessage('assistant', '已打开 Skill Hub，可以继续查看技能包详情、启停、审批和评价。')
      return
    }
    if (action.type === 'prompt') {
      quickSend(action.value || action.label || '', pageId)
      return
    }
    if (action.type === 'auth_approve') {
      _recordTaskLog('auth', action.value || '授权执行', pageId || 'portal.home')
      _recordMessage('assistant', '已记录授权。当前为 POC 状态展示，不会实际执行命令。', {
        activityItems: [
          _createActivity('confirm', 'done', '授权已确认', '用户已批准执行，高影响操作进入下一步。'),
          _createActivity('tool_call', 'done', '执行动作已登记', action.value || '授权动作已进入任务日志。')
        ]
      })
      return
    }
    if (action.type === 'auth_reject') {
      _recordTaskLog('auth', action.value || '拒绝执行', pageId || 'portal.home')
      _recordMessage('assistant', '已拒绝执行。任务已停止，没有触发任何写入、发布、导出或命令执行。', {
        activityItems: [
          _createActivity('confirm', 'failed', '授权已拒绝', '用户拒绝执行，高影响操作已停止。')
        ]
      })
    }
  }

  // ===== 快捷发送（对应 aiQuick）=====
  function quickSend(text: string, pageId: string, context: AiRuntimeContext = {}) {
    inputText.value = text
    send(pageId, context)
  }

  function sendShortcut(label: ShortcutLabel, pageId: string, context: AiRuntimeContext = {}) {
    pendingShortcut.value = label
    quickSend(shortcutQueries[label] || `在「${label}」范围内分析当前页面，并告诉我下一步需要确认什么。`, pageId, context)
  }

  // ===== 快捷标签切换 =====
  function setShortcut(label: string) {
    activeShortcut.value = label
  }

  function shortcutQuery(label: string) {
    return isShortcutLabel(label) ? shortcutQueries[label] : ''
  }

  // ===== 附件 =====
  function attachFile(file: AttachedFile) {
    attachedFile.value = file
  }
  function clearFile() {
    attachedFile.value = null
  }

  // ===== 对话历史（localStorage）=====
  function loadConversations(): ConversationItem[] {
    return readJsonArray<ConversationItem>(AI_CONVERSATION_STORAGE_KEY)
  }

  function saveConversations(list: ConversationItem[]) {
    localStorage.setItem(AI_CONVERSATION_STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
  }

  function restoreConversation(id: string) {
    _persistConversation()
    const item = loadConversations().find(c => c.id === id)
    if (!item) return
    localConvId.value = item.id
    convId.value      = item.remoteConvId || null
    messages.value    = item.messages || []
    if (!open.value) toggleOpen(true)
  }

  function deleteConversation(id: string) {
    saveConversations(loadConversations().filter(c => c.id !== id))
    if (localConvId.value === id) newConversation(true)
  }

  // ===== 内部工具函数 =====
  function _newLocalId() {
    return `aic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function _recordMessage(role: MessageRole, text: string, extra: Partial<AiMessage> = {}) {
    if (!text) return
    messages.value.push({ role, text, at: new Date().toISOString(), ...extra })
    _persistConversation()
  }

  function _recordAssistantReply(payload: ComposerPayload, reply: string) {
    const artifacts: string[] = []
    if (_shouldCreateReportArtifact(payload, reply)) {
      if (_hasActivityKind('tool_call')) {
        _markActivityDone('tool_call')
      } else {
        _upsertActivity('tool_call', 'done', '生成报告卡片', '已根据当前页面和回复内容生成可展开的报告 artifact。')
      }
      if (!_hasActivityKind('tool_result')) {
        _upsertActivity('tool_result', 'done', '报告结果已就绪', '报告可保存，也可展开为顶部动态页签。')
      }
      const report = _createReportArtifact(payload, reply)
      AI_REPORT_ARTIFACTS[report.id] = report
      artifacts.push(report.id)
    }
    _appendPostReplyActivities(payload, reply)
    _recordMessage('assistant', reply, {
      ...(artifacts.length ? { artifacts } : {}),
      actionItems: _taskActionItems(payload, reply),
      activityItems: _snapshotActivities()
    })
  }

  function _tryLocalCommand(payload: ComposerPayload, context: AiRuntimeContext = {}) {
    const text = payload.text || payload.userMsg || ''
    const targetPageId = _matchNavigationTarget(text)
    if (targetPageId) {
      const targetPath = pageIdToPath(targetPageId)
      if (targetPath) {
        _recordMessage('user', payload.userMsg)
        _setActivityItems([
          _createActivity('thinking', 'done', '识别导航意图', `匹配到目标页面：${getPageLabel(targetPageId)}。`),
          _createActivity('tool_call', 'done', '执行页面跳转', targetPath),
          _createActivity('tool_result', 'done', '页面已打开', '静态页签已同步到目标页面。'),
          _createActivity('follow_up', 'blocked', '等待下一步问题', '你可以继续围绕当前页面提问或生成报告。')
        ])
        context.appStore?.ensureStaticTab?.(targetPageId)
        context.appStore?.setActiveStaticTab?.(targetPageId)
        context.router?.push(targetPath)
        _recordTaskLog('navigate', `切换页面：${getPageLabel(targetPageId)}`, targetPageId)
        _recordMessage('assistant', `已切换到「${getPageLabel(targetPageId)}」，我会继续围绕这个页面回答。`, {
          actionItems: _taskActionItems({ ...payload, pageId: targetPageId }, ''),
          activityItems: _snapshotActivities()
        })
        _clearActivityItems()
        return true
      }
    }

    if (/skill\s*hub|技能包|技能管理|创建\s*skill|创建技能/i.test(text)) {
      _recordMessage('user', payload.userMsg)
      _setActivityItems([
        _createActivity('thinking', 'done', '识别 Skill 任务', '当前请求属于 Skill 管理或创建链路。'),
        _createActivity('tool_call', 'done', '打开 Skill 工作区', '切换到 Skill Hub 静态页签。'),
        _createActivity('tool_result', 'done', '入口已就绪', '可以继续创建、审批或查看 Skill。'),
        _createActivity('confirm', 'blocked', '等待用户选择', '涉及启停、发布或权限动作时，需要先确认影响范围。')
      ])
      context.appStore?.ensureStaticTab?.('agent.skills')
      context.appStore?.setActiveStaticTab?.('agent.skills')
      context.router?.push('/agent/skills')
      _recordTaskLog('skill', '打开 Skill Hub', 'agent.skills')
      _recordMessage('assistant', '已打开 Skill Hub。你可以从顶部入口创建 Skill，也可以在卡片中查看详情、申请、启停和评价。', {
        actionItems: [
          { type: 'navigate', label: '创建 Skill', value: 'agent.skillCreate' },
          { type: 'skill', label: '查看 Skill Hub', value: 'agent.skills' },
          { type: 'navigate', label: '权限管理', value: 'agent.permissions' }
        ],
        activityItems: _snapshotActivities()
      })
      _clearActivityItems()
      return true
    }

    if (/todo|待办|任务清单/i.test(text)) {
      _recordMessage('user', payload.userMsg)
      _setActivityItems([
        _createActivity('thinking', 'done', '理解任务意图', '已根据当前页面和输入内容拆解任务。'),
        _createActivity('tool_call', 'running', '生成 TODO 列表', '正在建立可追踪的步骤清单。'),
        _createActivity('tool_result', 'pending', '等待任务执行', '后续步骤会按完成状态更新。')
      ])
      _recordMessage('assistant', '已创建任务清单，我会按步骤推进并同步完成状态。', {
        activityItems: _snapshotActivities(),
        todoList: _demoTodoList()
      })
      _clearActivityItems()
      return true
    }

    if (/授权|批准|执行命令|高风险|需要确认|python|命令/i.test(text)) {
      _recordMessage('user', payload.userMsg)
      _setActivityItems([
        _createActivity('thinking', 'done', '理解执行请求', '已识别该任务包含高影响执行动作。'),
        _createActivity('tool_call', 'running', '准备执行命令', '已生成命令与执行参数，等待授权前不会真正执行。'),
        _createActivity('confirm', 'blocked', '等待用户授权', '涉及本地命令、导出、发布或配置变更，需要明确批准。')
      ])
      const command = /python/i.test(text)
        ? 'python3 -c "import random; print(random.randint(0, 100))"'
        : 'npm run deploy-preview -- --dry-run'
      _recordMessage('assistant', '该操作需要授权后才能继续执行。请确认命令、命名空间和影响范围。', {
        activityItems: _snapshotActivities(),
        authRequest: {
          title: '请求执行命令',
          namespace: 'main',
          command,
          risk: '高影响操作',
          detail: '授权后才会执行。拒绝后任务会停止，并保留当前状态链路用于走查。',
          approveLabel: '批准执行',
          rejectLabel: '拒绝'
        }
      })
      _clearActivityItems()
      return true
    }

    if (/并行|多个步骤|思考过程|同时进行/i.test(text)) {
      _recordMessage('user', payload.userMsg)
      _setActivityItems([
        _createActivity('thinking', 'running', '理解任务意图', '正在结合页面上下文、快捷标签和附件内容判断任务类型。'),
        _createActivity('tool_call', 'running', '读取参考内容', '正在读取生成所需的参考内容和页面状态。'),
        _createActivity('tool_result', 'pending', '等待工具结果', '工具返回后会继续整理为回复、报告或后续动作。'),
        _createActivity('follow_up', 'pending', '准备追问', '如发现缺少口径，会在生成前提出确认问题。')
      ])
      _recordMessage('assistant', '已进入多步骤并行处理状态。状态卡会展示当前进行中的步骤数量和每一步进度。', {
        activityItems: _snapshotActivities()
      })
      _clearActivityItems()
      return true
    }

    if (_isReportIntent(text)) {
      _recordMessage('user', payload.userMsg)
      _setActivityItems(_reportActivities(payload))
      const reply = _reportIntentReply(payload)
      _recordAssistantReply(payload, reply)
      _clearActivityItems()
      return true
    }

    return false
  }

  function _matchNavigationTarget(text: string): string | null {
    const source = String(text || '').toLowerCase()
    const entries: Array<[string, string[]]> = [
      ['portal.home', ['联想门户工作台', '首页', 'home']],
      ['dashboard.overview', ['运营总览', '运营概览']],
      ['pipeline.annotate', ['query 分析', 'query分析', '查询分析']],
      ['pipeline.quality', ['质量分析', '质量']],
      ['ops.traffic', ['流量分析', '流量']],
      ['ops.gmv', ['gmv 分析', 'gmv']],
      ['dashboard.geo', ['geo 看板', 'geo概览', '整体数据概览']],
      ['dashboard.geoSource', ['信源分布', '平台信源']],
      ['dashboard.geoIntent', ['意图分布']],
      ['dashboard.geoConversion', ['geo 转化', '转化看板']],
      ['dashboard.geoKnowledge', ['手工上传知识', '上传知识']],
      ['employee.overview', ['职场员工概览', '员工概览']],
      ['employee.certification', ['职场员工审核', '认证审核', '员工认证']],
      ['lead.dashboard', ['线索看板']],
      ['lead.pool', ['线索池']],
      ['lead.score', ['打分模型']],
      ['agent.skills', ['skill hub', '技能包管理']],
      ['agent.skillCreate', ['创建 skill', '创建skill', '创建技能']],
      ['agent.permissions', ['权限管理']]
    ]
    const hasNavVerb = /打开|进入|查看|跳转|切到|切换/.test(source)
    const matched = entries.find(([, aliases]) => aliases.some(alias => source.includes(alias.toLowerCase())))
    return matched && (hasNavVerb || source.length <= 16) ? matched[0] : null
  }

  function _isReportIntent(text: string) {
    return /生成|创建|展开|预览|输出|整理/.test(text || '') && /报告|报表|复盘|分析|总结|解读/.test(text || '')
  }

  function _shouldCreateReportArtifact(payload: ComposerPayload, reply: string) {
    const text = `${payload?.text || payload?.userMsg || ''}\n${reply || ''}`
    if (_isRemoteFailureReply(reply)) return false
    return _isReportIntent(text) || /##|核心结论|建议动作|指标|异常/.test(reply || '')
  }

  function _createReportArtifact(payload: ComposerPayload, reply: string): ReportArtifact {
    const sourcePage = payload.pageId || 'portal.home'
    const sourcePageLabel = getPageLabel(sourcePage) || '当前页面'
    const title = _reportTitle(payload.text || payload.userMsg || '', sourcePageLabel)
    return {
      id: `ai_report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      sourcePage,
      sourcePageLabel,
      groupLabel: getGroupLabel(sourcePage) || 'AI 报告',
      summary: _reportSummary(reply, sourcePageLabel),
      chips: _reportChips(payload.text || reply || '', sourcePageLabel),
      content: _normalizeReportContent(reply, sourcePageLabel, payload),
      createdAt: new Date().toISOString()
    }
  }

  function _buildPageContext(pageId: string) {
    const safePageId = pageId || 'portal.home'
    const pageLabel = getPageLabel(safePageId) || '当前页面'
    const groupLabel = getGroupLabel(safePageId) || '工作台'
    return [
      '【当前工作台上下文】',
      `- 当前页面：${pageLabel}`,
      `- 页面 ID：${safePageId}`,
      `- 所属模块：${groupLabel}`,
      '- 回答要求：先说明口径、影响范围和需要确认的动作；涉及写入、发布、导出时必须等待确认。'
    ].join('\n')
  }

  function _buildPageDataContext(pageId: string) {
    if (pageId !== 'dashboard.overview') return ''
    return [
      '【当前页面可见数据】',
      '- 页面：运营总览；数据日期：2026-06-16。',
      '- 顶部指标：DAU 39.0万，WAU 184.0万，MAU 639.9万，GMV 9801.7万。',
      '- 关键经营链路：登录用户 19.1万，互动用户 10.7万，购买人数 9,212 人，成交 GMV 9801.7万。',
      '- 链路转化：互动转化 55.9%，购买转化 8.6%，客单价 ¥10,640。',
      '- GMV 结构：消费业务 7836.6万，占比 80.0%；SMB 业务 1820.3万，占比 18.6%；政企业务 144.8万，占比 1.5%。',
      '- 平台结构：非官网 6604.4万，占比 67.4%；官网 3197.2万，占比 32.6%；官网客单价 ¥8,911，非官网客单价 ¥11,743。',
      '- 趋势速览：DAU 较首日 +16.7%，互动用户较首日 +50.0%，GMV 较首日 +205.7%。',
      '- 口径限制：只围绕页面展示的运营数据、经营链路、GMV 结构和趋势输出；不要引入风控、策略命中、DPL、限购等无关主题。'
    ].join('\n')
  }

  function _recordTaskLog(type: string, title: string, pageId = '') {
    taskLogs.value.unshift({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      pageId,
      pageLabel: getPageLabel(pageId) || '当前页面',
      at: new Date().toISOString(),
      status: '已完成'
    })
    taskLogs.value = taskLogs.value.slice(0, 50)
  }

  function _createActivity(
    kind: ConversationActivityKind,
    status: ConversationActivityStatus,
    title: string,
    detail = ''
  ): ConversationActivityItem {
    return {
      id: `act_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      status,
      title,
      detail
    }
  }

  function _setActivityItems(items: ConversationActivityItem[]) {
    activityItems.value = items
  }

  function _clearActivityItems() {
    activityItems.value = []
  }

  function _snapshotActivities() {
    return activityItems.value.map(item => ({ ...item }))
  }

  function _markActivityDone(kind: ConversationActivityKind) {
    activityItems.value = activityItems.value.map(item =>
      item.kind === kind && item.status !== 'failed'
        ? { ...item, status: 'done' }
        : item
    )
  }

  function _settleActivity(
    kind: ConversationActivityKind,
    status: ConversationActivityStatus,
    title?: string,
    detail?: string
  ) {
    let matched = false
    activityItems.value = activityItems.value.map(item => {
      if (item.kind !== kind) return item
      matched = true
      return {
        ...item,
        status,
        title: title || item.title,
        detail: detail || item.detail
      }
    })
    if (!matched && title) {
      activityItems.value = [...activityItems.value, _createActivity(kind, status, title, detail || '')]
    }
  }

  function _hasActivityKind(kind: ConversationActivityKind) {
    return activityItems.value.some(item => item.kind === kind)
  }

  function _upsertActivity(
    kind: ConversationActivityKind,
    status: ConversationActivityStatus,
    title: string,
    detail = ''
  ) {
    const current = activityItems.value.find(item => item.kind === kind && item.title === title)
    if (current) {
      activityItems.value = activityItems.value.map(item =>
        item.id === current.id ? { ...item, status, detail: detail || item.detail } : item
      )
      return
    }
    activityItems.value = [...activityItems.value, _createActivity(kind, status, title, detail)]
  }

  function _baseRunningActivities(payload: ComposerPayload) {
    const pageLabel = getPageLabel(payload.pageId) || '当前页面'
    return [
      _createActivity('thinking', 'running', '理解任务意图', `结合「${pageLabel}」页面上下文、快捷标签和附件内容判断任务类型。`),
      _createActivity('tool_call', 'running', '调用火山引擎会话接口', `向 ${HARNESS_CHAT_ENDPOINT} 发送当前消息与页面上下文。`),
      _createActivity('tool_result', 'pending', '等待工具结果', '接口返回后会转换为回复、报告卡片或后续动作。')
    ]
  }

  function _demoTodoList(): TodoListBlock {
    return {
      title: 'Todo List',
      done: 0,
      total: 9,
      items: [
        { id: 'todo-1', text: '校验当前状态与生成前确认', status: 'running' },
        { id: 'todo-2', text: '调用 pre_generate_scripts 生成脚本产物', status: 'pending' },
        { id: 'todo-3', text: '生成 SKILL.md', status: 'pending' },
        { id: 'todo-4', text: '确认脚本输出已写入 SKILL.md', status: 'pending' },
        { id: 'todo-5', text: '生成 evals/evals.json', status: 'pending' },
        { id: 'todo-6', text: '生成 references/api-contracts.md', status: 'pending' },
        { id: 'todo-7', text: '生成 references/call-chain.md', status: 'pending' },
        { id: 'todo-8', text: '生成 references/field-rules.md', status: 'pending' },
        { id: 'todo-9', text: '最终校验所有必需产物', status: 'pending' }
      ]
    }
  }

  function _reportActivities(payload: ComposerPayload) {
    const pageLabel = getPageLabel(payload.pageId) || '当前页面'
    return [
      _createActivity('thinking', 'done', '识别报告意图', `确认要围绕「${pageLabel}」生成分析报告。`),
      _createActivity('tool_call', 'done', '生成报告 artifact', '已创建可展开、可保存的报告卡片。'),
      _createActivity('tool_result', 'done', '报告结果已就绪', '点击展开报告可进入顶部动态页签。'),
      _createActivity('follow_up', 'blocked', '等待补充口径', '可继续补充时间范围、指标口径或异常项。')
    ]
  }

  function _appendPostReplyActivities(payload: ComposerPayload, reply: string) {
    const text = `${payload?.text || ''}\n${reply || ''}`
    if (/确认|是否|需要|范围|审批|导出|发布|写入|配置/.test(text)) {
      _upsertActivity('confirm', 'blocked', '等待用户确认', '涉及范围、权限、导出、发布或配置变更前，需要用户确认。')
    } else {
      _upsertActivity('follow_up', 'blocked', '可继续追问', '可以继续补充条件、要求生成报告，或执行下方推荐动作。')
    }
  }

  function _createActionReport(pageId: string, titleHint = ''): ReportArtifact {
    const sourcePage = pageId || 'portal.home'
    const label = getPageLabel(sourcePage) || '当前页面'
    const title = titleHint || `${label} · 运营分析报告`
    return {
      id: `ai_action_report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      sourcePage,
      sourcePageLabel: label,
      groupLabel: getGroupLabel(sourcePage) || 'AI 报告',
      summary: `围绕「${label}」生成的本地 mock 报告，用于验证 Agent 任务动作到动态页签的交互。`,
      chips: _reportChips(titleHint, label),
      content: `# ${title}

## 核心结论
- 当前报告来自 Agent 任务动作，已按封板项目的动态页签规范打开。
- 静态页签保留业务页面上下文，报告作为动态页签展示。
- 超过 10 个动态页签时，会自动关闭最早打开的非活跃报告。

## 建议动作
- 对比当前页面指标、筛选项和报告摘要是否一致。
- 继续走查保存、关闭、切换和暗色模式下的样式表现。`,
      createdAt: new Date().toISOString()
    }
  }

  function _reportIntentReply(payload: ComposerPayload) {
    const label = getPageLabel(payload.pageId) || '当前页面'
    const query = payload.text || payload.userMsg || '生成报告'
    return `已生成「${label}」的报告草稿。

## 核心结论
- 已根据你的请求「${query}」整理为动态报告卡片。
- 报告会以 Agent 卡片形式出现在对话区，点击“展开报告”进入顶部动态页签。
- 当前为 Vue 预览假数据，重点用于走查报告卡片、页签联动和保存态。

## 建议动作
- 先检查报告标题、来源页面和标签是否符合预期。
- 再验证动态页签打开、关闭、最多 10 个的限制和暗色模式样式。`
  }

  function _reportTitle(text: string, pageLabel: string) {
    if (pageLabel === '运营总览' || /运营总览|DAU|WAU|MAU|关键经营链路|GMV结构|经营链路/i.test(text)) {
      if (/漏斗|转化链路|登录|互动|购买/.test(text)) return '运营总览 · 转化链路分析'
      if (/gmv|成交|结构|客单价/i.test(text)) return '运营总览 · GMV 结构解读'
      return '运营总览 · 经营指标解读'
    }
    if (/质量/.test(text)) return '质量分析 · 数据解读报告'
    if (/流量/.test(text)) return '流量分析 · 入口质量报告'
    if (/gmv/i.test(text)) return 'GMV 分析 · 业务贡献报告'
    if (/geo/i.test(text)) return 'GEO 看板 · 汇总分析'
    if (/线索/.test(text)) return '线索看板 · 转化分析'
    if (/风控|限购|dpl/i.test(text)) return '风控概况 · 策略命中分析'
    return `${pageLabel} · 数据解读报告`
  }

  function _reportSummary(reply: string, pageLabel: string) {
    const firstBullet = String(reply || '').split('\n').find(line => /^[-•]\s+/.test(line))
    return firstBullet
      ? firstBullet.replace(/^[-•]\s+/, '').slice(0, 90)
      : `围绕「${pageLabel}」生成的本地动态报告，可用于检查 Agent 卡片和顶部动态页签联动。`
  }

  function _reportChips(text: string, pageLabel: string) {
    const chips = [pageLabel]
    const chipRules: Array<[string, RegExp]> = [
      ['质量', /质量|点踩|差评/],
      ['Query', /query|查询|无答案/i],
      ['流量', /流量|dau|入口/i],
      ['GMV', /gmv|购买|成交/i],
      ['GEO', /geo|信源|意图/i],
      ['线索', /线索|客户|转化/],
      ['风控', /风控|限购|dpl/i],
      ['报告', /报告|报表|复盘|总结|解读/]
    ]
    chipRules.forEach(([chip, reg]) => {
      if (pageLabel === '运营总览' && chip === '风控') return
      if (reg.test(text || '') && !chips.includes(chip)) chips.push(chip)
    })
    return chips.slice(0, 4)
  }

  function _isRemoteFailureReply(reply: string) {
    return /未配置火山引擎|火山引擎暂不可用|火山引擎调用失败|无法完成真实页面解读|接口失败后未返回火山引擎结果/.test(reply || '')
  }

  function _normalizeReportContent(reply: string, pageLabel: string, payload: ComposerPayload) {
    if (/^#\s/m.test(reply || '')) return reply
    return `# ${pageLabel} · 数据解读报告

${reply || _reportIntentReply(payload)}

## 来源信息
- 来源页面：${pageLabel}
- 生成方式：AI 对话
- 数据类型：本地 mock 数据`
  }

  function _taskActionItems(payload: ComposerPayload, reply: string): TaskAction[] {
    const text = `${payload?.text || payload?.userMsg || ''}\n${reply || ''}`
    const actions: TaskAction[] = []
    if (_shouldCreateReportArtifact(payload, reply)) {
      actions.push({ type: 'report', label: '重新生成报告', value: `${getPageLabel(payload.pageId) || '当前页面'} · 运营分析报告` })
    }
    actions.push({ type: 'prompt', label: '补充异常项', value: '请补充当前页面需要重点关注的异常项，并按优先级排序。' })
    if (/skill|技能|配置|发布|审批/i.test(text)) {
      actions.push({ type: 'skill', label: '查看 Skill Hub', value: 'agent.skills' })
    }
    if (payload?.pageId && payload.pageId !== 'portal.home') {
      actions.push({ type: 'navigate', label: '回到联想门户工作台', value: 'portal.home' })
    }
    return actions.slice(0, 3)
  }

  function _createDemoReports(pageId: string): ReportArtifact[] {
    const now = new Date().toISOString()
    return [
      {
        id: 'demo_quality_report',
        title: '质量分析 · 数据解读报告',
        sourcePage: 'pipeline.quality',
        sourcePageLabel: '质量分析',
        groupLabel: '乐享运营',
        summary: '用于走查动态页签、报告页头、保存状态和关闭按钮的质量分析 mock 报告。',
        chips: ['质量分析', '点踩率', '性能', '异常监控'],
        content: `# 质量分析 · 数据解读报告

## 核心结论
- 点踩率维持在 1.42%，售后咨询和商品推荐是主要问题来源。
- 首 token P95 为 2.6s，问答类正文链路存在局部抖动。
- MCP 工具超时样本集中在保修查询与网点查询。

## 建议动作
- 优先补齐售后政策类知识，并对高频未命中 Query 建立标注闭环。
- 将工具超时按场景拆分，单独观察保修查询链路。`,
        createdAt: now
      },
      {
        id: 'demo_ops_preview',
        title: '本地预览报告',
        sourcePage: pageId || 'dashboard.overview',
        sourcePageLabel: '运营总览',
        groupLabel: '乐享运营',
        summary: '用于检查 HTML 预览类动态页签在中间内容槽中的展示。',
        chips: ['本地预览', 'HTML', '运营报告'],
        previewHtml: '<!doctype html><html><body style="font-family:-apple-system,PingFang SC,sans-serif;padding:28px;background:#f6f8fb;color:#1f2329"><h1 style="font-size:22px;margin:0 0 12px">运营总览预览报告</h1><p style="color:#646a73">这是用于走查动态页签 iframe 预览样式的 mock 内容。</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px"><section style="background:#fff;border:1px solid #e5e6eb;border-radius:10px;padding:16px"><b>访问用户</b><div style="font-size:26px;font-weight:700;margin-top:8px">128.6万</div></section><section style="background:#fff;border:1px solid #e5e6eb;border-radius:10px;padding:16px"><b>活跃会员</b><div style="font-size:26px;font-weight:700;margin-top:8px">42.3万</div></section><section style="background:#fff;border:1px solid #e5e6eb;border-radius:10px;padding:16px"><b>异常预警</b><div style="font-size:26px;font-weight:700;margin-top:8px">7</div></section></div></body></html>',
        createdAt: now
      },
      {
        id: 'demo_geo_saved',
        title: 'GEO 转化看板 · 汇总分析',
        sourcePage: 'dashboard.geoConversion',
        sourcePageLabel: 'GEO 转化看板',
        groupLabel: 'GEO 看板',
        summary: '用于走查已保存态、长标题截断和跨分组报告来源展示。',
        chips: ['GEO', '转化', '已保存'],
        content: `# GEO 转化看板 · 汇总分析

## 转化概览
- 总转化 3,416，官网承接占比 61.2%。
- 豆包、Kimi、通义是当前主要来源平台。
- 企业线索增长明显，但电商页承接仍需优化。

## 下一步
- 将高转化 Query 沉淀为官方知识条目。
- 对非官网路径做来源归因和内容一致性检查。`,
        saved: true,
        createdAt: now
      },
      {
        id: 'demo_query_review',
        title: 'Query 分析 · 质量复盘',
        sourcePage: 'pipeline.annotate',
        sourcePageLabel: 'Query 分析',
        groupLabel: '乐享运营',
        summary: '用于走查 Query 分析来源的动态页签，包含无答案率、意图命中和标注闭环建议。',
        chips: ['Query', '无答案率', '标注闭环'],
        content: `# Query 分析 · 质量复盘

## 核心结论
- 高频无答案 Query 集中在活动政策、驱动下载和企业采购报价。
- 意图命中率稳定，但多意图 Query 的拆解仍不充分。
- 差评样本需要按“知识缺失、意图识别错误、回答不完整”拆分处理。

## 建议动作
- 将活动政策和驱动下载补充为结构化 FAQ。
- 对企业采购报价类 Query 增加信息收集表单。
- 将差评 Query 自动流转到标注队列。`,
        createdAt: now
      },
      {
        id: 'demo_lead_report',
        title: '线索看板 · 转化分析',
        sourcePage: 'lead.dashboard',
        sourcePageLabel: '线索看板',
        groupLabel: '企业客户管理',
        summary: '用于走查企业客户来源的动态页签，关注线索评分、负责人跟进和阶段转化。',
        chips: ['线索', '企业客户', '转化'],
        content: `# 线索看板 · 转化分析

## 核心结论
- 高意向线索主要来自企业采购、方案咨询和 AI 搜索入口。
- 跟进中线索积压在“报价确认”和“方案匹配”两个阶段。
- 部分高分线索缺少负责人，影响首响效率。

## 建议动作
- 将 85 分以上线索自动分配给行业负责人。
- 对报价确认阶段增加提醒和超时升级。
- 在 AI 助手中补充企业采购问询的标准采集字段。`,
        createdAt: now
      },
      ...([
        ['demo_employee_report', '在职员工管理 · 职场员工审核分析', 'employee.certification', '职场员工审核', '在职员工管理', ['员工', '认证', '审核'], '职场员工审核积压集中在劳动合同和个税视频两类材料，需要优化审核分流。'],
        ['demo_gmv_report', 'GMV 分析 · 业务贡献分析', 'ops.gmv', 'GMV 分析', '乐享运营', ['GMV', '购买', '客单价'], '消费商品贡献主要 GMV，SMB 商品增长稳定，政企商品需要提升线索承接。'],
        ['demo_traffic_report', '流量分析 · 入口质量分析', 'ops.traffic', '流量分析', '乐享运营', ['流量', 'DAU', '入口'], 'App 首页和服务频道流量稳定，活动页转化效率低于整体均值。'],
        ['demo_geo_source_report', 'GEO 信源分布 · 引用分析', 'dashboard.geoSource', '各平台信源分布', 'GEO 看板', ['GEO', '信源', '引用'], '官方信源引用稳定，但社区信源内容一致性需要进一步校验。'],
        ['demo_skill_report', 'Skill Hub · 启停状态分析', 'agent.skills', 'Skill Hub', 'AI 助手', ['Skill', '审批', '启停'], '报告生成和知识维护 Skill 使用频次较高，部分 Skill 待审批时间偏长。']
      ] satisfies Array<[string, string, string, string, string, string[], string]>).map(([id, title, sourcePage, sourcePageLabel, groupLabel, chips, summary]) => ({
        id,
        title,
        sourcePage,
        sourcePageLabel,
        groupLabel,
        summary,
        chips,
        content: `# ${title}

## 核心结论
- ${summary}
- 当前报告用于验证 Agent 输出 artifact 到动态页签的打开、切换、关闭和超限逻辑。
- 连续展开超过 10 个报告时，系统会自动关闭最早打开的非活跃动态页签。

## 建议动作
- 保留当前静态业务页上下文，不把报告写入静态页签。
- 检查动态页签标题截断、已保存状态和关闭后的回退行为。
- 后续接入真实数据时，替换这里的 mock content 和 summary。`,
        createdAt: now
      }))
    ]
  }

  function _persistConversation() {
    if (!messages.value.length) return
    const current = {
      id:           localConvId.value,
      remoteConvId: convId.value || null,
      title:        _convTitle(),
      messages:     messages.value,
      updatedAt:    new Date().toISOString()
    }
    const list = loadConversations().filter(c => c.id !== current.id)
    saveConversations([current, ...list])
  }

  function _convTitle() {
    const first = messages.value.find(m => m.role === 'user' && m.text)
    if (!first) return '新会话'
    return first.text.replace(/\s+/g, ' ').replace(/^📎\s*/, '').slice(0, 28) || '新会话'
  }

  function _mockReply(payload: ComposerPayload, error: unknown) {
    const label = payload.shortcut || activeShortcut.value || '当前任务'
    const message = error instanceof Error ? error.message : ''
    return [
      `已收到「${label}」请求。`,
      '',
      payload.contextSummary || '',
      '',
      `> ${payload.text || payload.userMsg}`,
      '',
      '- 火山引擎暂不可用，未完成真实页面解读。',
      '- 我没有生成本地 mock 分析内容，避免把演示兜底误当成真实结论。',
      '',
      message ? `调用失败原因：${message}` : ''
    ].filter(Boolean).join('\n')
  }

  function _delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function isShortcutLabel(label: string): label is ShortcutLabel {
    return shortcuts.value.includes(label as ShortcutLabel)
  }

  function readJsonArray<T>(key: string): T[] {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]')
      return Array.isArray(value) ? value as T[] : []
    } catch {
      return []
    }
  }

  return {
    open, convId, localConvId, messages, loading,
    queuedMessages, queueNotice, taskLogs, activityItems,
    panelWidth, autoCollapsedSidebar,
    inputText, attachedFile, activeShortcut, shortcuts, inputPlaceholder,
    toggleOpen, restoreState, maxPanelWidth, setPanelWidth,
    newConversation, send, stopCurrentResponse, quickSend, sendShortcut, runTaskAction,
    setShortcut, shortcutQuery, attachFile, clearFile,
    seedDemoReportCards, openReportArtifact, saveReportArtifact,
    loadConversations, saveConversations, restoreConversation, deleteConversation
  }
})
