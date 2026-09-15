import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

// Exercise the real Pinia store and local query continuations; no remote calls.
const saved = Object.fromEntries(['window', 'document', 'localStorage', 'fetch'].map(key => [key, globalThis[key]]))
const entries = new Map()
const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)), removeItem: key => entries.delete(key) }
globalThis.localStorage = storage
globalThis.window = { localStorage: storage, innerWidth: 1280, location: { origin: 'http://task.test' } }
globalThis.document = { documentElement: { classList: { add() {}, remove() {} } }, body: { classList: { add() {}, remove() {} } }, querySelector() { return null } }
globalThis.fetch = () => { throw new Error('Authorization preview must not execute a remote operation') }
const host = createHttpServer()
const server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: { server: host } } })
const { useAIStore: useAiStore } = await server.ssrLoadModule('/src/stores/ai.ts')
beforeEach(() => { entries.clear(); setActivePinia(createPinia()) })
after(async () => {
  await server.close(); host.close()
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key]
    else globalThis[key] = value
  }
})

async function query(store, text = '查询 GEO 统计数据') {
  store.inputText = text
  await store.send('dashboard.geo')
  return store.messages.filter(message => message.authRequest || message.task).at(-1)
}

function decision(task, ids, action = 'approve') {
  return { type: 'auth_task_decide', label: '任务授权', decision: { taskId: task.id, conversationId: task.conversationId, decision: action, selections: ids.map(id => ({ requestId: id, revision: task.requests.find(request => request.id === id).revision })) } }
}

test('approving the earlier of two queries only resolves that query', async () => {
  const store = useAiStore()
  const a = await query(store, '查询 GEO 信源数据')
  const b = await query(store, '查询 GEO 转化数据')
  assert.ok(a.task && b.task, 'each query must carry a stable task identity')
  await store.runTaskAction(decision(a.task, [a.task.requests[0].id]), 'dashboard.geo')
  const currentA = store.messages.find(message => message.id === a.id)
  const currentB = store.messages.find(message => message.id === b.id)
  assert.equal(currentA.task.requests[0].status, 'succeeded')
  assert.equal(currentB.task.requests[0].status, 'pending')
  assert.equal(store.messages.filter(message => message.task).length, 2, 'updates do not append receipt cards')
})

test('batch preview authorizes only the selected requests and keeps export separate', async () => {
  const store = useAiStore()
  const message = await query(store, '批量授权演示')
  assert.ok(message?.task, 'the preview must expose a finite task request list')
  const requests = message.task.requests
  assert.equal(requests.filter(request => request.kind === 'read').length, 3)
  assert.equal(requests.filter(request => request.kind === 'export').length, 1)
  await store.runTaskAction(decision(message.task, requests.slice(0, 2).map(request => request.id)), 'dashboard.geo')
  const task = store.messages.find(item => item.id === message.id).task
  assert.deepEqual(task.requests.map(request => request.status), ['succeeded', 'succeeded', 'pending', 'pending'])
  const count = store.messages.length
  await store.runTaskAction(decision(message.task, [requests[0].id]), 'dashboard.geo')
  assert.equal(store.messages.length, count, 'repeated approval must not append or execute another result')
})

test('switching conversations expires old pending tasks and ignores stale approvals', async () => {
  const store = useAiStore()
  const message = await query(store)
  assert.ok(message.task)
  const oldConversation = store.localConvId
  const action = decision(message.task, [message.task.requests[0].id])
  store.newConversation()
  await store.runTaskAction(action, 'dashboard.geo')
  assert.equal(store.messages.length, 0)
  store.restoreConversation(oldConversation)
  const restored = store.messages.find(item => item.id === message.id)
  assert.equal(restored.task.requests[0].status, 'expired')
  const count = store.messages.length
  await store.runTaskAction(action, 'dashboard.geo')
  assert.equal(store.messages.length, count)
  assert.equal(store.messages.find(item => item.id === message.id).task.requests[0].status, 'expired')
})

test('legacy command-only approval cannot select the newest task implicitly', async () => {
  const store = useAiStore()
  const a = await query(store)
  const b = await query(store)
  const count = store.messages.length
  await store.runTaskAction({ type: 'auth_approve', label: '授权', value: a.authRequest?.command }, 'dashboard.geo')
  assert.equal(store.messages.length, count)
  assert.ok(b.task)
  assert.equal(store.messages.find(item => item.id === b.id).task.requests[0].status, 'pending')
})

test('a mixed read and export batch stays pending, while export can be confirmed alone', async () => {
  const store = useAiStore()
  const message = await query(store, '批量授权演示')
  const requests = message.task.requests
  await store.runTaskAction(decision(message.task, [requests[0].id, requests[3].id]), 'dashboard.geo')
  assert.deepEqual(store.messages.find(item => item.id === message.id).task.requests.map(item => item.status), ['pending', 'pending', 'pending', 'pending'])
  await store.runTaskAction(decision(message.task, [requests[3].id]), 'dashboard.geo')
  assert.deepEqual(store.messages.find(item => item.id === message.id).task.requests.map(item => item.status), ['pending', 'pending', 'pending', 'succeeded'])
})

test('rejecting an earlier query never continues or rejects the later query', async () => {
  const store = useAiStore()
  const a = await query(store)
  const b = await query(store)
  const count = store.messages.length
  await store.runTaskAction(decision(a.task, [a.task.requests[0].id], 'reject'), 'dashboard.geo')
  assert.equal(store.messages.length, count)
  assert.equal(store.messages.find(item => item.id === a.id).task.requests[0].status, 'rejected')
  assert.equal(store.messages.find(item => item.id === b.id).task.requests[0].status, 'pending')
})

test('changing conversation during preview execution prevents delayed results leaking back', async () => {
  const store = useAiStore()
  const message = await query(store)
  const oldConversation = store.localConvId
  const completion = store.runTaskAction(decision(message.task, [message.task.requests[0].id]), 'dashboard.geo')
  assert.equal(store.messages.find(item => item.id === message.id).task.requests[0].status, 'running')
  store.newConversation()
  await completion
  assert.equal(store.messages.length, 0)
  store.restoreConversation(oldConversation)
  assert.equal(store.messages.length, 2)
  assert.equal(store.messages.find(item => item.id === message.id).task.requests[0].status, 'expired')
})

test('a later batch request cannot execute a scope revision that was never approved', async () => {
  const store = useAiStore()
  const message = await query(store, '批量授权演示')
  const requests = message.task.requests
  const completion = store.runTaskAction(decision(message.task, requests.slice(0, 2).map(item => item.id)), 'dashboard.geo')
  assert.equal(store.messages.find(item => item.id === message.id).task.requests[0].status, 'running')
  store.messages = store.messages.map(item => item.id === message.id ? {
    ...item, task: { ...item.task, requests: item.task.requests.map((request, index) => index === 1 ? { ...request, revision: 2, scope: '新增的范围' } : request) }
  } : item)
  await completion
  const current = store.messages.find(item => item.id === message.id).task
  assert.equal(current.requests[0].status, 'succeeded')
  assert.notEqual(current.requests[1].status, 'succeeded')
  assert.notEqual(current.requests[1].status, 'running')
})
