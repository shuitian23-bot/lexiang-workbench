import test from 'node:test'
import assert from 'node:assert/strict'
import * as capability from '../src/services/skillCapabilityChanges.js'

const DEMO_NAME = 'capability-update-failure-demo'
const RECORD_ID = 'capability-change-failure-demo-20260917'
const TASK_ID = 'capability-update-capability-change-failure-demo-20260917'
const PHASE = '能力上下文扫描'

function failedItem() {
  const update = capability.getSeedCapabilityUpdate(DEMO_NAME)
  assert.ok(update, 'the failure demo must be available as a fixed seed')
  return {
    name: DEMO_NAME,
    cnName: '运营数据查询',
    category: '乐享运营',
    desc: '查询运营数据并解释字段含义。',
    owner: 'admin',
    version: 'v1.0.0',
    online: 'v1.0.0',
    onlineStatus: 'published',
    status: 'published',
    statusText: '已发布',
    workflowStatus: 'published',
    capabilityUpdate: update
  }
}

function demoReply(name, update) {
  assert.equal(typeof capability.getCapabilityUpdateDemoReply, 'function', 'the explicitly scoped demo reply must exist')
  return capability.getCapabilityUpdateDemoReply(name, update)
}

test('the failure seed exposes a published failure with actionable error details', () => {
  const item = failedItem()
  const update = item.capabilityUpdate
  assert.deepEqual(capability.skillHubRowPresentation(item), {
    mainStatus: 'published', mainStatusLabel: '已发布', updateStatus: 'failed', updateStatusLabel: '更新失败'
  })
  assert.equal(update.recordId, RECORD_ID)
  assert.equal(update.contextId, 'dashboard.query')
  assert.equal(update.baseMenu, '乐享运营')
  assert.deepEqual(update.currentContextCodes, ['dashboard.query'])
  assert.ok(update.affectedContexts.some(context => context.contextId === 'dashboard.query'))
  assert.ok(update.changes.length > 0)
  assert.ok(update.reportMarkdown.length > 0)
  assert.equal(update.hasDraftEdits, false)
  assert.equal(update.task.id, TASK_ID)
  assert.equal(update.task.kind, 'initial')
  assert.equal(update.task.status, 'failed')
  assert.equal(update.task.phase, PHASE)
  assert.equal(update.task.errorCode, 'CAPABILITY_SCAN_TIMEOUT')
  assert.equal(update.task.error, '读取运营数据字段说明超时，未生成更新草稿。')
  assert.equal(update.task.retryAdvice, '可重试当前任务；本示例将模拟恢复成功，线上版本保持不变。')
  assert.match(update.task.startedAt, /^2026-09-17 /)
  assert.match(update.task.completedAt, /^2026-09-17 /)
  assert.equal(update.task.rollback.version, 'v1.0.0')
  assert.equal(update.task.rollback.workflowStatus, 'published')
  assert.equal(update.task.rollback.onlineStatus, 'published')
  assert.equal(update.task.rollback.draft, undefined)
})

test('changing one failure seed cannot alter other callers or a refreshed seed', () => {
  const original = failedItem().capabilityUpdate
  const changed = failedItem().capabilityUpdate
  changed.task.error = 'edited error'
  changed.task.rollback.version = 'v9.0.0'
  changed.changes[0].impact = 'edited impact'
  changed.affectedContexts[0].targetVersion = 'edited target'
  assert.deepEqual(failedItem().capabilityUpdate, original)
})

test('failure actions permit the owner recovery and retain governance without premature publishing', () => {
  const item = failedItem()
  assert.deepEqual(capability.resolveSkillHubAllowedActions(item, { role: 'admin', user: 'admin' }).map(action => action.code), [
    'view_change', 'view_update_error', 'retry_update', 'ignore_update', 'disable'
  ])
  assert.deepEqual(capability.resolveSkillHubAllowedActions(item, { role: 'pm', user: 'other-owner' }).map(action => action.code), [
    'view_change', 'view_update_error'
  ])
  assert.equal(capability.skillHubMutationDecision(item, { role: 'admin', user: 'admin' }, 'submit_review', 0.9).allowed, false)
})

test('retry preserves the task and record and creates only one v1.0.1 draft', () => {
  const failed = failedItem()
  const snapshot = structuredClone(failed)
  const started = capability.beginCapabilityUpdate(failed, '2026-09-17 10:00')
  assert.deepEqual(failed, snapshot)
  assert.equal(started.capabilityUpdate.status, 'preparing')
  assert.equal(started.capabilityUpdate.recordId, RECORD_ID)
  assert.equal(started.capabilityUpdate.task.id, TASK_ID)
  assert.equal(started.capabilityUpdate.task.kind, 'initial')
  assert.equal(started.capabilityUpdate.task.status, 'generating')
  assert.equal(started.capabilityUpdate.task.phase, PHASE)
  assert.equal(started.online, 'v1.0.0')
  assert.equal(started.onlineStatus, 'published')
  assert.equal(started.editVersion, 'v1.0.1')
  assert.equal(started.version, 'v1.0.1')
  assert.equal(started.draft.clarifyMessages.filter(message => message.autoExecute).length, 1)
  const repeated = capability.beginCapabilityUpdate(started, '2026-09-17 10:01')
  assert.equal(repeated.editVersion, 'v1.0.1')
  assert.equal(repeated.capabilityUpdate.task.id, TASK_ID)
  assert.equal(repeated.capabilityUpdate.task.startedAt, '2026-09-17 10:00')
  assert.deepEqual(repeated.draft, started.draft)
})

test('only an active retry receives an explicitly simulated and isolated clarification document', () => {
  const started = capability.beginCapabilityUpdate(failedItem(), '2026-09-17 10:00')
  const before = structuredClone(started)
  const reply = demoReply(DEMO_NAME, started.capabilityUpdate)
  assert.ok(reply)
  assert.match(JSON.stringify(reply), /模拟/)
  assert.match(JSON.stringify(reply), /v1\.0\.0/)
  assert.equal(typeof reply.title, 'string')
  assert.ok(reply.sections.length > 0)
  assert.equal(typeof reply.closing, 'string')
  for (const section of reply.sections) {
    assert.equal(typeof section.title, 'string')
    assert.ok(section.items.length > 0)
    assert.ok(section.items.every(item => typeof item === 'string' && item.length > 0))
  }
  assert.deepEqual(started, before)
  const second = demoReply(DEMO_NAME, started.capabilityUpdate)
  reply.sections[0].items[0] = 'caller mutation'
  assert.notEqual(second.sections[0].items[0], 'caller mutation')
  assert.deepEqual(demoReply(DEMO_NAME, started.capabilityUpdate), second)
})

test('completing the demo leaves v1.0.0 online and cannot generate or complete twice', () => {
  const started = capability.beginCapabilityUpdate(failedItem(), '2026-09-17 10:00')
  const reply = demoReply(DEMO_NAME, started.capabilityUpdate)
  const draft = structuredClone(started.draft)
  draft.clarifyMessages.push({ id: 'demo-reply', kind: 'assistant', text: '', clarifyDoc: reply })
  const completed = capability.completeCapabilityUpdate(started, draft, '2026-09-17 10:01')
  assert.equal(completed.capabilityUpdate.status, 'processing')
  assert.equal(completed.capabilityUpdate.task.status, 'succeeded')
  assert.equal(completed.capabilityUpdate.task.id, TASK_ID)
  assert.equal(completed.capabilityUpdate.recordId, RECORD_ID)
  assert.equal(completed.workflowStatus, 'draft')
  assert.equal(completed.editVersion, 'v1.0.1')
  assert.equal(completed.online, 'v1.0.0')
  assert.equal(completed.onlineStatus, 'published')
  assert.equal(completed.draft.clarifyMessages.filter(message => message.kind === 'assistant').length, 1)
  assert.equal(demoReply(DEMO_NAME, completed.capabilityUpdate), null)
  assert.deepEqual(capability.beginCapabilityUpdate(completed, '2026-09-17 10:02'), completed)
  assert.deepEqual(capability.completeCapabilityUpdate(completed, draft, '2026-09-17 10:02'), completed)
  assert.deepEqual(capability.hydrateCapabilityUpdate(completed, capability.getSeedCapabilityUpdate(DEMO_NAME)).capabilityUpdate, completed.capabilityUpdate)
})

test('another initial failure rolls back cleanly and retries the same version and task', () => {
  const started = capability.beginCapabilityUpdate(failedItem(), '2026-09-17 10:00')
  const failed = capability.failCapabilityUpdate(started, '再次读取超时', '2026-09-17 10:01')
  assert.equal(failed.capabilityUpdate.status, 'failed')
  assert.equal(failed.version, 'v1.0.0')
  assert.equal(failed.online, 'v1.0.0')
  assert.equal(failed.draft, undefined)
  assert.equal(failed.editVersion, undefined)
  assert.equal(failed.capabilityUpdate.task.id, TASK_ID)
  const retried = capability.beginCapabilityUpdate(failed, '2026-09-17 10:02')
  assert.equal(retried.editVersion, 'v1.0.1')
  assert.equal(retried.capabilityUpdate.recordId, RECORD_ID)
  assert.equal(retried.capabilityUpdate.task.id, TASK_ID)
  assert.ok(demoReply(DEMO_NAME, retried.capabilityUpdate))
})

test('ignoring a failed demo restores ordinary list actions without changing online data and refresh restores the failure', () => {
  const failed = failedItem()
  const ignored = capability.ignoreCapabilityUpdate(failed, { operator: 'admin', reason: '' }, '2026-09-17 10:02')
  assert.equal(ignored.capabilityUpdate.status, 'ignored')
  assert.equal(ignored.version, 'v1.0.0')
  assert.equal(ignored.online, 'v1.0.0')
  assert.equal(ignored.onlineStatus, 'published')
  assert.equal(ignored.workflowStatus, 'published')
  assert.equal(ignored.draft, undefined)
  assert.equal(capability.skillHubRowPresentation(ignored).updateStatusLabel, '')
  assert.deepEqual(capability.resolveSkillHubAllowedActions(ignored, { role: 'admin', user: 'admin' }).map(action => action.code), [
    'view', 'edit', 'evaluate', 'test', 'disable'
  ])
  assert.equal(demoReply(DEMO_NAME, ignored.capabilityUpdate), null)
  assert.equal(capability.hydrateCapabilityUpdate(ignored, capability.getSeedCapabilityUpdate(DEMO_NAME)).capabilityUpdate.status, 'ignored')
  assert.deepEqual(failedItem(), failed)
})

for (const kind of ['initial', undefined]) {
  test(`ignoring an initial failure restores submission after editing (task kind: ${kind || 'legacy missing'})`, () => {
    const failed = failedItem()
    if (kind === undefined) delete failed.capabilityUpdate.task.kind
    const ignored = capability.ignoreCapabilityUpdate(failed, { operator: 'admin', reason: '' }, '2026-09-17 10:02')
    const edited = { ...ignored, workflowStatus: 'draft', editStatus: 'draft' }
    assert.equal(capability.skillHubMutationDecision(edited, { role: 'admin', user: 'admin' }, 'submit_review', 0.9).allowed, true)
    assert.equal(capability.skillHubMutationDecision(edited, { role: 'admin', user: 'admin' }, 'submit_review', 0.7).allowed, false)
    assert.equal(capability.skillHubMutationDecision(edited, { role: 'pm', user: 'other-owner' }, 'submit_review', 0.9).allowed, false)
  })
}

test('ignoring an initial failure never clears active or additional-change submission gates', () => {
  for (const [status, taskStatus, kind] of [
    ['ignored', 'failed', 'additional_change'],
    ['ignored', 'generating', 'initial'],
    ['failed', 'failed', 'initial'],
    ['processing', 'failed', 'initial'],
    ['processing', 'failed', undefined],
    ['resolved', 'failed', 'initial'],
    ['ignored', 'failed', 'unknown-kind'],
    ['ignored', 'failed', null]
  ]) {
    const item = failedItem()
    item.workflowStatus = 'draft'
    item.capabilityUpdate.status = status
    item.capabilityUpdate.task.status = taskStatus
    item.capabilityUpdate.task.kind = kind
    assert.equal(capability.skillHubMutationDecision(item, { role: 'admin', user: 'admin' }, 'submit_review', 0.9).allowed, false,
      `${status}/${taskStatus}/${kind} must remain blocked`)
  }
})

for (const [label, change] of [
  ['another Skill name', () => 'product-knowledge'],
  ['another change record', update => { update.recordId = 'another-record' }],
  ['another task', update => { update.task.id = 'another-task' }],
  ['a failed task', update => { update.task.status = 'failed' }],
  ['a completed task', update => { update.task.status = 'succeeded' }],
  ['a processing update', update => { update.status = 'processing' }],
  ['an available update', update => { update.status = 'available' }],
  ['an additional change', update => { update.task.kind = 'additional_change' }],
  ['a missing task kind', update => { delete update.task.kind }],
  ['another phase', update => { update.task.phase = '自动发布' }],
  ['a missing phase', update => { delete update.task.phase }]
]) {
  test(`the local reply does not intercept ${label}`, () => {
    const started = capability.beginCapabilityUpdate(failedItem(), '2026-09-17 10:00')
    const name = change(started.capabilityUpdate) || DEMO_NAME
    assert.equal(demoReply(name, started.capabilityUpdate), null)
  })
}

test('missing input and all existing Skill seeds retain the ordinary path', () => {
  assert.equal(demoReply(DEMO_NAME, undefined), null)
  assert.equal(demoReply(undefined, {}), null)
  for (const name of ['product-knowledge', 'voucher-recommend', 'capability-draft-demo', 'low-stock-auto-offline', 'lenovo-order-detail-query', 'weather-query']) {
    const update = capability.getSeedCapabilityUpdate(name)
    assert.equal(update.status, 'available')
    assert.equal(demoReply(name, update), null)
    const started = capability.beginCapabilityUpdate({ name, online: 'v1.0.0', version: 'v1.0.0', status: 'published', capabilityUpdate: update }, '2026-09-17 10:00')
    assert.equal(demoReply(name, started.capabilityUpdate), null)
    assert.equal(started.capabilityUpdate.task.phase, undefined)
  }
})
