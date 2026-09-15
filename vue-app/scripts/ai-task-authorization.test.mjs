import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTaskDecision, updateTaskRequest, expireTask, taskProgress } from '../src/stores/aiTaskAuthorization.ts'

function request(id, overrides = {}) {
  return { id, revision: 1, label: `查询 ${id}`, scope: '本任务的已列明统计数据', impact: '使用示例数据，无真实操作', kind: 'read', batchable: true, approvalGroup: 'same-query-scope', status: 'pending', ...overrides }
}

function task(overrides = {}) {
  return { id: 'task-A', conversationId: 'conversation-A', title: '查询任务', mode: 'preview', createdAt: 1000, expiresAt: 2000, requests: [request('a'), request('b'), request('c')], ...overrides }
}

function decision(selections = [{ requestId: 'a', revision: 1 }], overrides = {}) {
  return { taskId: 'task-A', conversationId: 'conversation-A', selections, decision: 'approve', ...overrides }
}

function freeze(value) {
  Object.freeze(value)
  for (const item of Object.values(value)) if (item && typeof item === 'object') freeze(item)
  return value
}

test('batch approval changes exactly the selected requests and leaves the input immutable', () => {
  const source = freeze(task())
  const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'c', revision: 1 }]), 'conversation-A', 1500)
  assert.equal(result.error, undefined)
  assert.deepEqual(result.acceptedIds, ['a', 'c'])
  assert.deepEqual(result.task.requests.map(item => item.status), ['approved', 'pending', 'approved'])
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'pending', 'pending'])
  assert.notEqual(result.task, source)
})

for (const [name, change] of [
  ['another task', { taskId: 'task-B' }],
  ['another decision conversation', { conversationId: 'conversation-B' }],
  ['no selected requests', { selections: [] }],
  ['duplicate selected ID', { selections: [{ requestId: 'a', revision: 1 }, { requestId: 'a', revision: 1 }] }],
  ['unknown selected ID', { selections: [{ requestId: 'a', revision: 1 }, { requestId: 'missing', revision: 1 }] }],
  ['stale selected revision', { selections: [{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 0 }] }],
  ['unknown decision', { decision: 'allow-everything' }],
]) {
  test(`invalid selection is rejected atomically: ${name}`, () => {
    const source = freeze(task())
    const result = applyTaskDecision(source, decision(undefined, change), 'conversation-A', 1500)
    assert.deepEqual(result.acceptedIds, [])
    assert.ok(result.error)
    assert.deepEqual(result.task, source)
  })
}

test('a decision cannot act on a task belonging to a different active conversation', () => {
  const source = freeze(task())
  const result = applyTaskDecision(source, decision(), 'conversation-B', 1500)
  assert.deepEqual(result.acceptedIds, [])
  assert.ok(result.error)
  assert.deepEqual(result.task, source)
})

for (const extra of [
  { kind: 'export' }, { kind: 'write' }, { kind: 'unknown' },
  { batchable: false }, { approvalGroup: 'other-scope' }, { approvalGroup: ' ' },
  { status: 'approved' }, { status: 'running' }, { status: 'succeeded' }, { status: 'rejected' },
]) {
  test(`batch approval does not partially accept an incompatible request: ${JSON.stringify(extra)}`, () => {
    const source = freeze(task({ requests: [request('a'), request('b', extra)] }))
    const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }]), 'conversation-A', 1500)
    assert.deepEqual(result.acceptedIds, [])
    assert.ok(result.error)
    assert.deepEqual(result.task, source)
  })
}

test('read requests with a shared but empty approval group cannot be batch-approved', () => {
  const source = freeze(task({ requests: [request('a', { approvalGroup: '' }), request('b', { approvalGroup: '' })] }))
  const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }]), 'conversation-A', 1500)
  assert.deepEqual(result.acceptedIds, [])
  assert.ok(result.error)
  assert.deepEqual(result.task, source)
})

test('a duplicated ID in the task itself cannot approve multiple requests implicitly', () => {
  const source = freeze(task({ requests: [request('a'), request('a')] }))
  const result = applyTaskDecision(source, decision(), 'conversation-A', 1500)
  assert.deepEqual(result.acceptedIds, [])
  assert.ok(result.error)
  assert.deepEqual(result.task, source)
})

test('high-impact requests may be confirmed individually but are never executed by approval', () => {
  for (const kind of ['export', 'write', 'unknown']) {
    const source = freeze(task({ requests: [request('a', { kind, batchable: false, approvalGroup: '' })] }))
    const result = applyTaskDecision(source, decision(), 'conversation-A', 1500)
    assert.equal(result.error, undefined)
    assert.deepEqual(result.acceptedIds, ['a'])
    assert.equal(result.task.requests[0].status, 'approved')
    assert.equal(source.requests[0].status, 'pending')
    assert.equal(taskProgress(result.task).done, 0)
  }
})

test('rejection can cover selected pending requests of different kinds without affecting others', () => {
  const source = freeze(task({ requests: [request('a'), request('b', { kind: 'write', batchable: false, approvalGroup: 'separate' }), request('c')] }))
  const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }], { decision: 'reject' }), 'conversation-A', 1500)
  assert.equal(result.error, undefined)
  assert.deepEqual(result.acceptedIds, ['a', 'b'])
  assert.deepEqual(result.task.requests.map(item => item.status), ['rejected', 'rejected', 'pending'])
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'pending', 'pending'])
})

test('replayed approval never yields another accepted action', () => {
  const first = applyTaskDecision(task(), decision(), 'conversation-A', 1500)
  const second = applyTaskDecision(freeze(first.task), decision(), 'conversation-A', 1501)
  assert.deepEqual(second.acceptedIds, [])
  assert.deepEqual(second.task, first.task)
})

test('expiry at the exact deadline invalidates live requests but preserves terminal results', () => {
  const source = freeze(task({ requests: [request('a'), request('b', { status: 'approved' }), request('c', { status: 'running' }), request('d', { status: 'succeeded', detail: '已完成结果' })] }))
  const result = applyTaskDecision(source, decision(), 'conversation-A', 2000)
  assert.deepEqual(result.acceptedIds, [])
  assert.ok(result.error)
  assert.deepEqual(result.task.requests.map(item => item.status), ['expired', 'expired', 'expired', 'succeeded'])
  assert.equal(result.task.requests[3].detail, '已完成结果')
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'approved', 'running', 'succeeded'])
})

test('invalid time or request revisions cannot pass the decision gate', () => {
  for (const [source, input, now] of [
    [task(), decision(), Number.NaN],
    [task(), decision(), Number.POSITIVE_INFINITY],
    [task({ expiresAt: Number.NaN }), decision(), 1500],
    [task({ expiresAt: Number.POSITIVE_INFINITY }), decision(), 1500],
    [task({ requests: [request('a', { revision: -1 })] }), decision([{ requestId: 'a', revision: -1 }]), 1500],
    [task({ requests: [request('a', { revision: 1.5 })] }), decision([{ requestId: 'a', revision: 1.5 }]), 1500],
  ]) {
    const result = applyTaskDecision(freeze(source), input, 'conversation-A', now)
    assert.deepEqual(result.acceptedIds, [])
    assert.ok(result.error)
    assert.deepEqual(result.task, source)
  }
})

test('only an approved request may run, then succeed, with immutable progress updates', () => {
  const pending = freeze(task())
  for (const status of ['approved', 'running', 'succeeded', 'failed']) {
    assert.deepEqual(updateTaskRequest(pending, 'a', 1, status), pending)
  }
  const approved = freeze(applyTaskDecision(pending, decision(), 'conversation-A', 1500).task)
  assert.deepEqual(updateTaskRequest(approved, 'a', 1, 'succeeded'), approved)
  const running = freeze(updateTaskRequest(approved, 'a', 1, 'running', '正在使用示例数据'))
  assert.equal(running.requests[0].status, 'running')
  assert.equal(approved.requests[0].status, 'approved')
  const succeeded = updateTaskRequest(running, 'a', 1, 'succeeded', '示例处理完成')
  assert.equal(succeeded.requests[0].status, 'succeeded')
  assert.equal(succeeded.requests[0].detail, '示例处理完成')
  assert.equal(taskProgress(succeeded).done, 1)
})

test('stale, unknown or ambiguous update targets cannot change requests', () => {
  const approved = freeze(task({ requests: [request('a', { status: 'approved' })] }))
  assert.deepEqual(updateTaskRequest(approved, 'a', 0, 'running'), approved)
  assert.deepEqual(updateTaskRequest(approved, 'missing', 1, 'running'), approved)
  const duplicated = freeze(task({ requests: [request('a', { status: 'approved' }), request('a', { status: 'approved' })] }))
  assert.deepEqual(updateTaskRequest(duplicated, 'a', 1, 'running'), duplicated)
})

test('terminal outcomes and their details cannot be overwritten by late events', () => {
  for (const status of ['succeeded', 'failed', 'rejected', 'expired']) {
    const source = freeze(task({ requests: [request('a', { status, detail: '已记录的最终结果' })] }))
    for (const next of ['pending', 'approved', 'running', 'succeeded', 'failed', 'rejected', 'expired']) {
      assert.deepEqual(updateTaskRequest(source, 'a', 1, next, '迟到事件'), source)
    }
  }
})

test('active requests may fail and active progress details can update without adding requests', () => {
  for (const status of ['approved', 'running']) {
    const source = freeze(task({ requests: [request('a', { status })] }))
    const failed = updateTaskRequest(source, 'a', 1, 'failed', '示例处理失败')
    assert.equal(failed.requests[0].status, 'failed')
    assert.equal(taskProgress(failed).failed, 1)
  }
  const source = freeze(task({ requests: [request('a', { status: 'running', detail: '开始' })] }))
  const result = updateTaskRequest(source, 'a', 1, 'running', '已处理一半')
  assert.equal(result.requests.length, 1)
  assert.equal(result.requests[0].detail, '已处理一半')
  assert.equal(source.requests[0].detail, '开始')
})

test('expireTask invalidates only pending, approved and running requests and is idempotent', () => {
  const source = freeze(task({ requests: ['pending', 'approved', 'running', 'succeeded', 'failed', 'rejected', 'expired'].map((status, index) => request(String(index), { status, detail: '原有说明' })) }))
  const result = expireTask(source)
  assert.deepEqual(result.requests.map(item => item.status), ['expired', 'expired', 'expired', 'succeeded', 'failed', 'rejected', 'expired'])
  assert.equal(result.requests[3].detail, '原有说明')
  assert.equal(source.requests[0].status, 'pending')
  assert.deepEqual(expireTask(freeze(result)), result)
})

test('progress counts successful execution rather than approval and distinguishes live from terminal work', () => {
  const mixed = task({ requests: ['pending', 'approved', 'running', 'succeeded', 'failed', 'rejected', 'expired'].map((status, index) => request(String(index), { status })) })
  const { label, ...progress } = taskProgress(freeze(mixed))
  assert.equal(typeof label, 'string')
  assert.ok(label.length)
  assert.deepEqual(progress, { done: 1, total: 7, pending: 1, active: 2, failed: 1, terminal: false })
  const finished = task({ requests: [request('a', { status: 'succeeded' }), request('b', { status: 'rejected' })] })
  assert.equal(taskProgress(finished).terminal, true)
  assert.equal(taskProgress(finished).done, 1)
  assert.deepEqual(taskProgress(task({ requests: [] })), { label: '暂无待执行步骤', done: 0, total: 0, pending: 0, active: 0, failed: 0, terminal: true })
})

test('one Skill execution approval covers its exact listed mixed operations without executing them', () => {
  const source = freeze(task({ requests: [
    request('a'),
    request('b', { kind: 'export', batchable: false, approvalGroup: '' }),
    request('c', { kind: 'write', batchable: false, approvalGroup: 'write-scope' }),
    request('d', { kind: 'unknown', batchable: false, approvalGroup: 'unknown-scope' }),
  ] }))
  const input = decision([
    { requestId: 'c', revision: 1 }, { requestId: 'a', revision: 1 },
    { requestId: 'd', revision: 1 }, { requestId: 'b', revision: 1 },
  ], { scope: 'skill-execution' })
  const result = applyTaskDecision(source, input, 'conversation-A', 1500)
  assert.equal(result.error, undefined)
  assert.deepEqual(result.acceptedIds, ['c', 'a', 'd', 'b'])
  assert.deepEqual(result.task.requests.map(item => item.status), ['approved', 'approved', 'approved', 'approved'])
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'pending', 'pending', 'pending'])
  assert.equal(taskProgress(result.task).done, 0)
})

for (const action of ['approve', 'reject']) {
  test(`a Skill execution ${action} rejects a partial list atomically`, () => {
    const source = freeze(task())
    const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }], { scope: 'skill-execution', decision: action }), 'conversation-A', 1500)
    assert.ok(result.error)
    assert.deepEqual(result.acceptedIds, [])
    assert.deepEqual(result.task, source)
  })

  test(`a new pending step cannot be implicitly included in an earlier Skill execution ${action}`, () => {
    const snapshot = decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }], { scope: 'skill-execution', decision: action })
    const current = freeze(task({ requests: [request('a'), request('b'), request('new-step')] }))
    const result = applyTaskDecision(current, snapshot, 'conversation-A', 1500)
    assert.ok(result.error)
    assert.deepEqual(result.acceptedIds, [])
    assert.deepEqual(result.task, current)
  })
}

test('one Skill execution rejection handles every listed pending operation and preserves finished work', () => {
  const source = freeze(task({ requests: [request('a'), request('b', { kind: 'export', batchable: false }), request('done', { status: 'succeeded', detail: '完成记录' })] }))
  const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }], { scope: 'skill-execution', decision: 'reject' }), 'conversation-A', 1500)
  assert.equal(result.error, undefined)
  assert.deepEqual(result.acceptedIds, ['a', 'b'])
  assert.deepEqual(result.task.requests.map(item => item.status), ['rejected', 'rejected', 'succeeded'])
  assert.equal(result.task.requests[2].detail, '完成记录')
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'pending', 'succeeded'])
})

test('the Skill execution set includes only current pending requests and cannot replay old approval', () => {
  const source = freeze(task({ requests: [request('a'), request('b', { status: 'approved' }), request('c', { status: 'running' }), request('d', { status: 'succeeded' })] }))
  const input = decision([{ requestId: 'a', revision: 1 }], { scope: 'skill-execution' })
  const result = applyTaskDecision(source, input, 'conversation-A', 1500)
  assert.equal(result.error, undefined)
  assert.deepEqual(result.acceptedIds, ['a'])
  assert.deepEqual(result.task.requests.map(item => item.status), ['approved', 'approved', 'running', 'succeeded'])
  const replay = applyTaskDecision(freeze(result.task), input, 'conversation-A', 1501)
  assert.deepEqual(replay.acceptedIds, [])
  assert.deepEqual(replay.task, result.task)
})

test('Skill execution scope retains ID, revision, state, task and conversation checks', () => {
  const selections = [{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }, { requestId: 'c', revision: 1 }]
  for (const change of [
    { taskId: 'task-B' },
    { conversationId: 'conversation-B' },
    { selections: [...selections, { requestId: 'a', revision: 1 }] },
    { selections: [...selections.slice(0, 2), { requestId: 'unknown', revision: 1 }] },
    { selections: [...selections.slice(0, 2), { requestId: 'c', revision: 2 }] },
  ]) {
    const source = freeze(task())
    const result = applyTaskDecision(source, decision(selections, { scope: 'skill-execution', ...change }), 'conversation-A', 1500)
    assert.ok(result.error)
    assert.deepEqual(result.acceptedIds, [])
    assert.deepEqual(result.task, source)
  }
  const alreadyHandled = freeze(task({ requests: [request('a'), request('b'), request('c', { status: 'rejected' })] }))
  const result = applyTaskDecision(alreadyHandled, decision(selections, { scope: 'skill-execution' }), 'conversation-A', 1500)
  assert.ok(result.error)
  assert.deepEqual(result.acceptedIds, [])
  assert.deepEqual(result.task, alreadyHandled)
})

test('Skill execution approval cannot cross the expiry boundary', () => {
  const source = freeze(task())
  const result = applyTaskDecision(source, decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }, { requestId: 'c', revision: 1 }], { scope: 'skill-execution' }), 'conversation-A', 2000)
  assert.ok(result.error)
  assert.deepEqual(result.acceptedIds, [])
  assert.deepEqual(result.task.requests.map(item => item.status), ['expired', 'expired', 'expired'])
  assert.deepEqual(source.requests.map(item => item.status), ['pending', 'pending', 'pending'])
})

test('an unsupported authorization scope fails instead of falling back to legacy approval', () => {
  for (const scope of ['whole-conversation', '', null]) {
    const source = freeze(task())
    const result = applyTaskDecision(source, decision(undefined, { scope }), 'conversation-A', 1500)
    assert.ok(result.error)
    assert.deepEqual(result.acceptedIds, [])
    assert.deepEqual(result.task, source)
  }
})

test('new steps added after a Skill execution approval do not inherit it', () => {
  const input = decision([{ requestId: 'a', revision: 1 }, { requestId: 'b', revision: 1 }, { requestId: 'c', revision: 1 }], { scope: 'skill-execution' })
  const approved = applyTaskDecision(task(), input, 'conversation-A', 1500)
  assert.equal(approved.error, undefined)
  const withNewStep = freeze({ ...approved.task, requests: [...approved.task.requests, request('new-step')] })
  const replay = applyTaskDecision(withNewStep, input, 'conversation-A', 1501)
  assert.deepEqual(replay.acceptedIds, [])
  assert.deepEqual(replay.task.requests.map(item => item.status), ['approved', 'approved', 'approved', 'pending'])
  assert.deepEqual(replay.task, withNewStep)
  const empty = applyTaskDecision(withNewStep, decision([], { scope: 'skill-execution' }), 'conversation-A', 1501)
  assert.deepEqual(empty.acceptedIds, [])
  assert.ok(empty.error)
  assert.deepEqual(empty.task, withNewStep)
})
