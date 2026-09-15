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
  const decision = { taskId: task.id, conversationId: task.conversationId, decision: 'approve', selections: [{ requestId: 'read-A', revision: 2 }] }
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

test('a readonly group name cannot merge an export into batch controls', async () => {
  const task = sampleTask()
  task.requests[0].approvalGroup = '__individual__'
  task.requests = [task.requests[0], task.requests[2]]
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  const html = await view.html()
  assert.match(html, /单独授权此项/)
  assert.equal(view.state.requestGroups.value.length, 2)
})

test('a shared readonly scope appears once while each impact stays visible', async () => {
  const task = sampleTask()
  task.requests = task.requests.slice(0, 2)
  task.requests[0].impact = '仅查询转化，不修改数据'
  task.requests[1].impact = '仅查询信源，不修改数据'
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  const html = await view.html()
  assert.equal((html.match(/<dt[^>]*>授权范围<\/dt>/g) || []).length, 1)
  assert.match(html, /仅查询转化，不修改数据/)
  assert.match(html, /仅查询信源，不修改数据/)
  assert.match(html, /本月当前组织/)
})

test('different scopes within a readonly group stay explicit on each item', async () => {
  const task = sampleTask()
  task.requests = task.requests.slice(0, 2)
  task.requests[1].scope = '另一产品的本月统计'
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  const html = await view.html()
  assert.equal((html.match(/<dt[^>]*>授权范围<\/dt>/g) || []).length, 2)
  assert.match(html, /本月当前组织/)
  assert.match(html, /另一产品的本月统计/)
})

test('batch selection emits only the selected readonly group and its displayed revisions', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  assert.equal(view.state.selected.value.length, 0)
  view.state.toggleGroup('group-A')
  view.state.toggleRequest(view.props.task.requests[3])
  await view.state.submitSelected('approve')
  assert.deepEqual(view.events, [['decision', {
    taskId: 'task-A', conversationId: 'conversation-A', decision: 'approve',
    selections: [{ requestId: 'read-A', revision: 2 }, { requestId: 'read-B', revision: 3 }]
  }]])
  assert.ok(view.props.task.requests.every(request => request.status === 'pending'), 'the component must not invent an approval result')
})

test('an export is excluded from batch selection and confirmed with its own request only', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  view.state.toggleGroup('group-A')
  view.state.toggleRequest(view.props.task.requests[2])
  await view.state.decideSingle(view.props.task.requests[2], 'approve')
  assert.deepEqual(view.events[0], ['decision', {
    taskId: 'task-A', conversationId: 'conversation-A', decision: 'approve', selections: [{ requestId: 'export-A', revision: 1 }]
  }])
  assert.equal(view.state.selected.value.length, 2)
})

test('changed revisions discard stale selection without auto-selecting new requests', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  view.state.toggleGroup('group-A')
  view.props.task.requests[0].revision = 8
  view.props.task.requests.push({ ...view.props.task.requests[1], id: 'later-read' })
  await nextTick()
  await view.state.submitSelected('reject')
  assert.deepEqual(view.events[0][1].selections, [{ requestId: 'read-B', revision: 3 }])
})

test('approval is not completion and completion collapses the task without losing its history', async () => {
  const task = sampleTask()
  task.requests = [task.requests[0]]
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  view.props.task.requests[0].status = 'approved'
  await nextTick()
  assert.equal(view.state.expanded.value, true)
  assert.match(await view.html(), /已授权|等待执行/)
  view.props.task.requests[0].status = 'succeeded'
  await nextTick()
  assert.equal(view.state.expanded.value, false)
  view.state.setExpanded(true)
  assert.match(await view.html(), /读取转化/)
})

test('a completed selection returns focus to the summary while other requests remain pending', async () => {
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task: sampleTask() })
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  let focused = 0
  const activeButton = { hasAttribute: name => name === 'data-task-action', disabled: true }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: activeButton } })
  view.state.cardEl.value = { contains: item => item === activeButton }
  view.state.summaryEl.value = { focus: () => { focused += 1 } }
  try {
    view.props.task.requests[0].status = 'approved'
    await nextTick()
    await nextTick()
    assert.equal(focused, 1)
    assert.equal(view.state.expanded.value, true)
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('expired task controls cannot emit a decision and technical commands remain escaped in closed details', async () => {
  const task = sampleTask()
  task.expiresAt = Date.now() - 1
  task.requests[0].command = '<script>alert(1)</script> --long-parameter'
  const view = await openComponent('/src/components/agent/AgentTaskCard.vue', { task })
  view.state.toggleGroup('group-A')
  await view.state.decideSingle(view.props.task.requests[2], 'approve')
  assert.deepEqual(view.events, [])
  view.state.setExpanded(true)
  const html = await view.html()
  assert.match(html, /已过期|已失效/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>|<details[^>]*\bopen(?:[ =>])/)
})
