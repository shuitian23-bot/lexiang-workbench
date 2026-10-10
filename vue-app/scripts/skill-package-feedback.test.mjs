import assert from 'node:assert/strict'
import test from 'node:test'
import { createSkillPackageFeedbackStore } from '../src/services/skillPackageFeedback.js'

function makeStorage() {
  const entries = new Map()
  return {
    entries,
    getItem(key) { return entries.get(key) ?? null },
    setItem(key, value) { entries.set(key, String(value)) },
    removeItem(key) { entries.delete(key) },
  }
}

test('selecting, switching, and selecting again changes one personal choice', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  assert.equal(feedback.read('alice', 'skill-1'), null)
  assert.deepEqual(feedback.toggle('alice', 'skill-1', 'up'), { ok: true, value: 'up' })
  assert.equal(feedback.read('alice', 'skill-1'), 'up')
  assert.deepEqual(feedback.toggle('alice', 'skill-1', 'down'), { ok: true, value: 'down' })
  assert.equal(feedback.read('alice', 'skill-1'), 'down')
  assert.deepEqual(feedback.toggle('alice', 'skill-1', 'down'), { ok: true, value: null })
  assert.equal(feedback.read('alice', 'skill-1'), null)
  assert.equal(storage.entries.size, 0)
})

test('a new store reloads choices and each account and skill stays isolated', () => {
  const storage = makeStorage()
  const first = createSkillPackageFeedbackStore(() => storage)
  first.toggle('alice', 'skill-1', 'up')
  first.toggle('alice', 'skill-2', 'down')
  first.toggle('bob', 'skill-1', 'down')
  const reloaded = createSkillPackageFeedbackStore(() => storage)
  assert.equal(reloaded.read('alice', 'skill-1'), 'up')
  assert.equal(reloaded.read('alice', 'skill-2'), 'down')
  assert.equal(reloaded.read('bob', 'skill-1'), 'down')
  assert.equal(reloaded.read('bob', 'skill-2'), null)
  assert.equal(storage.entries.size, 3)
  assert.deepEqual(reloaded.toggle('alice', 'skill-1', 'up'), { ok: true, value: null })
  assert.equal(reloaded.read('alice', 'skill-2'), 'down')
  assert.equal(reloaded.read('bob', 'skill-1'), 'down')
})

test('toggle reads current storage so another store cannot leave stale selection', () => {
  const storage = makeStorage()
  const first = createSkillPackageFeedbackStore(() => storage)
  const second = createSkillPackageFeedbackStore(() => storage)
  first.toggle('alice', 'skill-1', 'up')
  assert.deepEqual(second.toggle('alice', 'skill-1', 'up'), { ok: true, value: null })
  assert.equal(first.read('alice', 'skill-1'), null)
})

test('blank identity and invalid value never write storage', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  for (const account of [null, undefined, '', '  ']) {
    assert.equal(feedback.read(account, 'skill-1'), null)
    assert.deepEqual(feedback.toggle(account, 'skill-1', 'up'), { ok: false, value: null })
  }
  for (const skill of [null, undefined, '', '  ']) {
    assert.equal(feedback.read('alice', skill), null)
    assert.deepEqual(feedback.toggle('alice', skill, 'up'), { ok: false, value: null })
  }
  for (const value of [null, undefined, 'UP', 'like', 1]) {
    assert.deepEqual(feedback.toggle('alice', 'skill-1', value), { ok: false, value: null })
  }
  assert.equal(storage.entries.size, 0)
})

test('malformed or unsupported records read as empty and can be replaced', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  feedback.toggle('alice', 'skill-1', 'up')
  const key = [...storage.entries.keys()][0]
  for (const record of ['{broken', '"up"', '{"version":999,"value":"up"}', '{"version":1,"value":"sideways"}']) {
    storage.entries.set(key, record)
    assert.equal(feedback.read('alice', 'skill-1'), null)
  }
  assert.deepEqual(feedback.toggle('alice', 'skill-1', 'down'), { ok: true, value: 'down' })
  assert.equal(feedback.read('alice', 'skill-1'), 'down')
})

test('prototype-like IDs and separator characters remain separate records', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  feedback.toggle('__proto__', 'constructor', 'up')
  feedback.toggle('a:b', 'c', 'down')
  feedback.toggle('a', 'b:c', 'up')
  assert.equal(feedback.read('__proto__', 'constructor'), 'up')
  assert.equal(feedback.read('a:b', 'c'), 'down')
  assert.equal(feedback.read('a', 'b:c'), 'up')
  assert.equal(storage.entries.size, 3)
})

test('provider or read failures cannot blindly overwrite a previous choice', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  feedback.toggle('alice', 'skill-1', 'up')
  const original = [...storage.entries.values()][0]
  const unavailable = createSkillPackageFeedbackStore(() => { throw new Error('blocked') })
  assert.equal(unavailable.read('alice', 'skill-1'), null)
  assert.deepEqual(unavailable.toggle('alice', 'skill-1', 'down'), { ok: false, value: null })
  const readBlocked = createSkillPackageFeedbackStore(() => ({ ...storage, getItem() { throw new Error('blocked') } }))
  assert.equal(readBlocked.read('alice', 'skill-1'), null)
  assert.deepEqual(readBlocked.toggle('alice', 'skill-1', 'down'), { ok: false, value: null })
  assert.equal([...storage.entries.values()][0], original)
})

test('failed write and failed cancellation return the previous choice', () => {
  const storage = makeStorage()
  const feedback = createSkillPackageFeedbackStore(() => storage)
  feedback.toggle('alice', 'skill-1', 'up')
  const writeBlocked = createSkillPackageFeedbackStore(() => ({ ...storage, setItem() { throw new Error('quota') } }))
  assert.deepEqual(writeBlocked.toggle('alice', 'skill-1', 'down'), { ok: false, value: 'up' })
  assert.equal(feedback.read('alice', 'skill-1'), 'up')
  const removeBlocked = createSkillPackageFeedbackStore(() => ({ ...storage, removeItem() { throw new Error('blocked') } }))
  assert.deepEqual(removeBlocked.toggle('alice', 'skill-1', 'up'), { ok: false, value: 'up' })
  assert.equal(feedback.read('alice', 'skill-1'), 'up')
})
