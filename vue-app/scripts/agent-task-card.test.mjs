import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createRenderer, createSSRApp, h, nextTick, reactive, ssrContextKey } from 'vue'
import { renderToString } from 'vue/server-renderer'

const host = createHttpServer()
const server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'error', server: { middlewareMode: true, hmr: { server: host } }, appType: 'custom' })
const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
const mounted = []
afterEach(() => { for (const app of mounted.splice(0).reverse()) app.unmount() })
after(async () => { await server.close(); host.close() })

async function openComponent(path, input) {
  const { default: Component } = await server.ssrLoadModule(path)
  const props = reactive(input)
  const events = []
  let state
  const app = renderer.createApp({ setup() {
    state = Component.setup(props, { expose() {}, emit: (...event) => events.push(event) })
    return () => h('div')
  } })
  app.provide(ssrContextKey, {})
  app.mount({}); mounted.push(app)
  return { props, state, events, html: () => renderToString(createSSRApp({ ...Component, setup: () => state }, props)) }
}

test('ordinary activity details stay collapsed and never duplicate an authorization request', async () => {
  const view = await openComponent('/src/components/agent/AgentConversationStates.vue', { items: [
    { id: 'run', kind: 'tool_call', status: 'running', title: '读取统计', detail: '过程的详细说明' },
    { id: 'auth', kind: 'confirm', status: 'blocked', title: '另一张重复确认卡', detail: '授权说明' }
  ] })
  assert.doesNotMatch(await view.html(), /过程的详细说明|另一张重复确认卡/)
  view.state.expanded.value = true
  assert.match(await view.html(), /过程的详细说明/)
  assert.doesNotMatch(await view.html(), /另一张重复确认卡/)
})

test('an unresolved legacy authorization is a readonly expired record, not an active approval', async () => {
  const view = await openComponent('/src/components/agent/AgentMessageList.vue', {
    messages: [{ id: 'old-message', role: 'assistant', text: '旧任务说明', at: '2026-09-14T00:00:00.000Z', authRequest: {
      title: '旧查询', command: 'old-command', scope: '旧范围', summary: '旧查询说明', impact: '仅读取', risk: '只读', approveLabel: '旧授权按钮', batchApproveLabel: '旧批量按钮', rejectLabel: '旧拒绝按钮'
    } }], loading: false, activityItems: [], currentPageId: 'portal.home'
  })
  const html = await view.html()
  assert.match(html, /已过期|已失效/)
  assert.match(html, /重新发起/)
  assert.doesNotMatch(html, /旧授权按钮|旧批量按钮|旧拒绝按钮/)
})

test('legacy decisions keep their original result explanation without new controls', async () => {
  const view = await openComponent('/src/components/agent/AgentMessageList.vue', {
    messages: [{ id: 'decided-message', role: 'assistant', text: '历史任务', at: '2026-09-14T00:00:00.000Z',
      authRequest: { title: '旧查询', scope: '原范围' },
      authResult: { status: 'rejected', title: '原决定', detail: '原拒绝原因：范围需要重新核对。' }
    }], loading: false, activityItems: [], currentPageId: 'portal.home'
  })
  const html = await view.html()
  assert.match(html, /历史已拒绝/)
  assert.match(html, /原拒绝原因：范围需要重新核对/)
  assert.doesNotMatch(html, /授权选中项|单独授权此项/)
})

function sampleTask() {
  return {
    id: 'task-A', conversationId: 'conversation-A', title: '核对本月统计', mode: 'preview', createdAt: Date.now(), expiresAt: Date.now() + 60_000,
    requests: [
      { id: 'read-A', revision: 2, label: '读取转化', scope: '本月当前组织', impact: '仅查询', kind: 'read', batchable: true, approvalGroup: 'group-A', status: 'pending' },
      { id: 'read-B', revision: 3, label: '读取信源', scope: '本月当前组织', impact: '仅查询', kind: 'read', batchable: true, approvalGroup: 'group-A', status: 'pending' },
      { id: 'export-A', revision: 1, label: '导出明细', scope: '本月明细', impact: '需要单独确认', kind: 'export', batchable: false, approvalGroup: 'export', status: 'pending' },
      { id: 'other-read', revision: 1, label: '另一授权范围', scope: '另一组织', impact: '仅查询', kind: 'read', batchable: true, approvalGroup: 'group-B', status: 'pending' }
    ]
  }
}

test('a message renders one task instead of duplicate legacy cards and forwards its exact decision', async () => {
  const task = sampleTask()
  const view = await openComponent('/src/components/agent/AgentMessageList.vue', {
    messages: [{ id: 'task-message', role: 'assistant', text: '请确认本次操作', task, at: '2026-09-15T00:00:00.000Z',
      authRequest: { title: '重复的旧授权', scope: '旧范围' },
      activityItems: [{ id: 'duplicate', kind: 'tool_call', status: 'running', title: '重复的处理过程' }]
    }], loading: false, activityItems: [], currentPageId: 'portal.home'
  })
  const html = await view.html()
  assert.equal((html.match(/class="agent-task-card"/g) || []).length, 1)
  assert.doesNotMatch(html, /重复的旧授权|重复的处理过程|class="ai-legacy-authorization"/)
  const decision = { scope: 'skill-execution', taskId: task.id, conversationId: task.conversationId, decision: 'approve', selections: [{ requestId: 'read-A', revision: 2 }] }
  view.state.forwardTaskDecision(decision)
  assert.deepEqual(view.events, [['run-action', { type: 'auth_task_decide', label: '任务授权', decision }]])
})

test('scrolling a latest pending task reveals its own title instead of an earlier task or the bottom', async () => {
  const view = await openComponent('/src/components/agent/AgentMessageList.vue', {
    messages: [
      { id: 'earlier', role: 'assistant', text: '早任务', task: { ...sampleTask(), id: 'early-task' } },
      { id: 'latest', role: 'assistant', text: '当前任务', task: sampleTask() }
    ], loading: false, activityItems: [], currentPageId: 'portal.home'
  })
  const queries = []
  const card = { getBoundingClientRect: () => ({ top: 50, bottom: 450 }) }
  const container = {
    scrollTop: 600, scrollHeight: 1800, clientHeight: 500, clientTop: 0,
    getBoundingClientRect: () => ({ top: 100, bottom: 600 }),
    querySelector: selector => {
      queries.push(selector)
      assert.match(selector, /data-agent-message-index="1"/)
      return { querySelector: () => card }
    }
  }
  view.state.messagesEl.value = container
  view.state.scrollToBottom()
  await nextTick()
  assert.equal(view.state.messagesEl.value.scrollTop, 550)
  assert.equal(queries.length, 1)
})

test('a fully visible pending task stays still and ordinary newer messages retain bottom scrolling', async () => {
  const view = await openComponent('/src/components/agent/AgentMessageList.vue', {
    messages: [{ id: 'latest', role: 'assistant', text: '当前任务', task: sampleTask() }],
    loading: false, activityItems: [], currentPageId: 'portal.home'
  })
  const container = {
    scrollTop: 600, scrollHeight: 1800, clientHeight: 500, clientTop: 0,
    getBoundingClientRect: () => ({ top: 100, bottom: 600 }),
    querySelector: () => ({ querySelector: () => ({ getBoundingClientRect: () => ({ top: 120, bottom: 570 }) }) })
  }
  view.state.messagesEl.value = container
  view.state.scrollToBottom()
  await nextTick()
  assert.equal(view.state.messagesEl.value.scrollTop, 600)
  view.props.messages.push({ id: 'newer', role: 'assistant', text: '普通回答' })
  await nextTick()
  await nextTick()
  assert.equal(view.state.messagesEl.value.scrollTop, 1800)
})

test('one Skill execution has only Authorize and Reject, with no repeated single-request title or selection controls', async () => {
  const task = sampleTask()
  task.requests = [{ ...task.requests[0], label: task.title }]
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  const html = await view.html()
  assert.equal((html.match(/<button\b/g) || []).length, 2)
  assert.match(html, />授权<\/button>/)
  assert.match(html, />拒绝<\/button>/)
  assert.doesNotMatch(html, /type="checkbox"|全选|已选|选中项|单独授权|单独确认/)
  assert.equal((html.match(/>核对本月统计<\//g) || []).length, 1)
  assert.match(html, /使用示例数据/)
})

test('multiple operations have one finite execution summary and closed steps while scopes and impacts stay visible', async () => {
  const task = sampleTask()
  task.requests[0].command = '<script>alert(1)</script> --long-parameter'
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  const html = await view.html()
  assert.match(html, /授权本次 Skill 执行的 4 项操作/)
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:[ =>])/)
  const visibleSummary = html.slice(0, html.indexOf('<details'))
  assert.match(visibleSummary, /本月当前组织/)
  assert.match(visibleSummary, /本月明细/)
  assert.match(visibleSummary, /另一组织/)
  assert.match(visibleSummary, /仅查询/)
  assert.match(visibleSummary, /需要单独确认/)
  assert.equal((visibleSummary.match(/本月当前组织/g) || []).length, 1)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})

test('Authorize emits all current pending IDs and revisions as this Skill execution, including different operation kinds', async () => {
  const task = sampleTask()
  task.requests[3].kind = 'write'
  task.requests.push({ ...task.requests[0], id: 'unknown-step', kind: 'unknown', batchable: false })
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  await view.state.decide('approve')
  assert.deepEqual(view.events, [['decision', {
    scope: 'skill-execution', taskId: 'task-A', conversationId: 'conversation-A', decision: 'approve',
    selections: task.requests.map(request => ({ requestId: request.id, revision: request.revision }))
  }]])
  assert.ok(view.props.task.requests.every(request => request.status === 'pending'), 'the UI must not invent an approval or execution result')
})

test('Reject includes every pending operation and leaves previous terminal operations outside the decision', async () => {
  const task = sampleTask()
  task.requests[0].status = 'succeeded'
  task.requests[1].status = 'rejected'
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  await view.state.decide('reject')
  assert.deepEqual(view.events[0], ['decision', {
    scope: 'skill-execution', taskId: 'task-A', conversationId: 'conversation-A', decision: 'reject',
    selections: [{ requestId: 'export-A', revision: 1 }, { requestId: 'other-read', revision: 1 }]
  }])
})

test('a click captures current revisions and cannot implicitly include an operation added afterwards', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  view.props.task.requests[0].revision = 8
  view.props.task.requests.push({ ...view.props.task.requests[1], id: 'added-before-click' })
  await nextTick()
  await view.state.decide('approve')
  view.props.task.requests.push({ ...view.props.task.requests[1], id: 'added-after-click' })
  await nextTick()
  assert.equal(view.events.length, 1)
  assert.equal(view.events[0][1].selections[0].revision, 8)
  assert.ok(view.events[0][1].selections.some(item => item.requestId === 'added-before-click'))
  assert.ok(view.events[0][1].selections.every(item => item.requestId !== 'added-after-click'))
})

test('repeated immediate clicks emit only one decision', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  await Promise.all([view.state.decide('approve'), view.state.decide('approve')])
  assert.equal(view.events.length, 1)
})

test('approved is not completed and completion closes details while retaining history', async () => {
  const task = sampleTask()
  task.requests = [task.requests[0]]
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  view.state.setExpanded(true)
  view.props.task.requests[0].status = 'approved'
  await nextTick()
  assert.equal(view.state.progress.value.done, 0)
  assert.match(await view.html(), /已授权|等待执行/)
  assert.doesNotMatch(await view.html(), />授权<\/button>/)
  view.props.task.requests[0].status = 'succeeded'
  await nextTick()
  assert.equal(view.state.expanded.value, false)
  view.state.setExpanded(true)
  assert.match(await view.html(), /已完成/)
  await view.state.decide('approve')
  assert.deepEqual(view.events, [])
})

test('removing execution actions returns keyboard focus to the Skill title', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  let focused = 0
  const activeButton = { hasAttribute: name => name === 'data-task-action', disabled: true }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: activeButton } })
  view.state.cardEl.value = { contains: item => item === activeButton }
  view.state.summaryEl.value = { focus: () => { focused += 1 } }
  try {
    view.props.task.requests.forEach(request => { request.status = 'approved' })
    await nextTick()
    await nextTick()
    assert.equal(focused, 1)
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('expired requests have no active authorization and cannot emit a new decision', async () => {
  const task = sampleTask()
  task.expiresAt = Date.now() - 1
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  await view.state.decide('approve')
  await view.state.decide('reject')
  assert.deepEqual(view.events, [])
  assert.match(await view.html(), /已过期|已失效/)
  assert.doesNotMatch(await view.html(), />授权<\/button>/)
})
