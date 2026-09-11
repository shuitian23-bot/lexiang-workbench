import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'
import * as domain from '../src/domain/scenarioSkillPackages.js'
import { runScenarioSimulation } from '../src/domain/scenarioPackageTesting.js'

const actor = { id: 'admin', permissions: ['*'] }
const reviewer = { id: 'reviewer', permissions: ['scenario-package:review'] }
const pendingReview = draft => ({ ...draft, status: 'review', submittedBy: draft.ownerId, submittedAt: at, auditEvents: [{ type: 'submitted', actorId: draft.ownerId, at }] })
const at = '2026-09-07T10:00:00.000Z'
const catalog = ['a', 'b', 'c'].map(id => ({
  id, name: `Skill ${id}`, menu: `菜单 ${id}`, version: 'v1.0.0', online: 'v1.0.0',
  status: 'published', onlineStatus: 'published',
  permissions: { menu: [`menu:${id}`], skill: [`skill:${id}`], data: [`data:${id}`], action: [`action:${id}`] }
}))
const step = (id, predecessorId, overrides = {}) => ({
  ...domain.createPinnedScenarioStep(catalog.find(skill => skill.id === id), { id }),
  ...(predecessorId === undefined ? {} : { predecessorId }),
  ...overrides
})
const draft = steps => ({
  id: 'graph-package', name: '图编排场景', description: '连接多个菜单的已发布 Skill。',
  targetAudience: '运营人员',
  ownerId: 'admin', steps
})
const runtimePackage = steps => ({
  ...draft(steps), status: 'published',
  auditEvents: [{ type: 'approved', actorId: 'reviewer', at }, { type: 'published', actorId: 'reviewer', at }]
})
const ids = steps => steps.map(item => item.id)

function withTrial(draft, skills, actor) {
  const testRequest = {
    input: '使用手工样例检查当前场景链路。',
    expectedOutput: '各节点按既定链路传递手工样例。',
    activeOptionalStepIds: draft.steps.filter(step => step.kind === 'conditional').map(step => step.id),
    confirmedStepIds: draft.steps.filter(step => step.requiresConfirmation).map(step => step.id),
    approvedStepIds: draft.steps.filter(step => step.requiresApproval).map(step => step.id),
    sampleOutputs: Object.fromEntries(draft.steps.map(step => [step.id, `节点 ${step.id} 的手工模拟输出。`]))
  }
  return { ...draft, testRequest, testReport: runScenarioSimulation(draft, skills, testRequest, actor, at) }
}

test('legacy steps keep their supplied order without requiring explicit connections', () => {
  assert.equal(typeof domain.resolveScenarioChain, 'function', 'chain resolution must be available to all gates')
  const result = domain.resolveScenarioChain([step('c'), step('a'), step('b')])
  assert.equal(result.ok, true)
  assert.deepEqual(ids(result.steps), ['c', 'a', 'b'])
  assert.equal(domain.evaluatePackageForPublish(draft(result.steps), actor).ok, true)
})

test('explicit connections determine order independently of array order and node positions', () => {
  const input = [step('c', 'b', { position: { x: 0, y: 0 } }), step('a', null, { position: { x: 900, y: 800 } }), step('b', 'a')]
  const result = domain.resolveScenarioChain(input)
  assert.equal(result.ok, true)
  assert.deepEqual(result.reasons, [])
  assert.deepEqual(ids(result.steps), ['a', 'b', 'c'])
  assert.deepEqual(ids(input), ['c', 'a', 'b'])
})

const invalidGraphs = [
  ['disconnected roots', () => [step('a', null), step('b', null)], /起点|连接/],
  ['cycle', () => [step('a', 'b'), step('b', 'a')], /环/],
  ['disconnected cycle', () => [step('a', null), step('b', 'c'), step('c', 'b')], /环|连接/],
  ['fork', () => [step('a', null), step('b', 'a'), step('c', 'a')], /后继|分叉/],
  ['dangling predecessor', () => [step('a', null), step('b', 'missing')], /不存在/],
  ['self connection', () => [step('a', null), step('b', 'b')], /自身|自己/],
  ['mixed legacy and explicit connections', () => [step('a', null), step('b')], /完整|混合|前序/],
  ['invalid predecessor value', () => [step('a', null), step('b', 7)], /前序|连接/]
]

for (const [name, fixture, reasonPattern] of invalidGraphs) {
  test(`${name} is rejected by resolution, policy, publication and runtime`, () => {
    const steps = fixture()
    const resolved = domain.resolveScenarioChain(steps)
    assert.equal(resolved.ok, false)
    assert.match(resolved.reasons.join('；'), reasonPattern)
    assert.equal(domain.evaluatePackageForPublish(draft(steps), actor).ok, false)
    assert.throws(() => domain.publishScenarioPackage(pendingReview(draft(steps)), reviewer, at, catalog))
    const runtime = domain.evaluateRuntimeAccess(runtimePackage(steps), actor)
    assert.equal(runtime.status, 'blocked')
    assert.deepEqual(runtime.effectiveSteps, [])
    assert.match(runtime.explanations.join('；'), reasonPattern)
  })
}

test('publication stores connected order and runtime follows connections while skipping inactive conditions', () => {
  const steps = [step('c', 'b'), step('a', null), step('b', 'a', { kind: 'conditional', required: false, condition: '需要跟进时' })]
  const published = domain.publishScenarioPackage(pendingReview(draft(steps)), reviewer, at, catalog)
  assert.deepEqual(ids(published.steps), ['a', 'b', 'c'])
  const active = domain.evaluateRuntimeAccess(runtimePackage(steps), actor, ['b'])
  assert.equal(active.status, 'ready')
  assert.deepEqual(ids(active.effectiveSteps), ['a', 'b', 'c'])
  const inactive = domain.evaluateRuntimeAccess(runtimePackage(steps), actor)
  assert.deepEqual(ids(inactive.effectiveSteps), ['a', 'c'])
})

test('constructor, catalog rebuild, resolver and publication isolate position snapshots', () => {
  const position = { x: 24, y: 48 }
  const created = domain.createPinnedScenarioStep(catalog[0], { id: 'a', predecessorId: null, position })
  assert.equal(created.predecessorId, null)
  assert.deepEqual(created.position, { x: 24, y: 48 })
  position.x = 999
  assert.equal(created.position.x, 24)
  const input = draft([created, step('b', 'a', { position: { x: 200, y: 48 } })])
  const rebuilt = domain.rebuildDraftFromCatalog(input, catalog)
  const resolved = domain.resolveScenarioChain(input.steps)
  const published = domain.publishScenarioPackage(pendingReview(input), reviewer, at, catalog)
  const runtime = domain.evaluateRuntimeAccess(runtimePackage(input.steps), actor)
  for (const resultSteps of [rebuilt.draft.steps, resolved.steps, published.steps, runtime.effectiveSteps]) {
    assert.equal(resultSteps[1].predecessorId, 'a')
    resultSteps[0].position.x = 300
    resultSteps[0].permissions.menu.push('injected')
    assert.equal(input.steps[0].position.x, 24)
    assert.deepEqual(input.steps[0].permissions.menu, ['menu:a'])
  }
})

test('malformed canvas coordinates are discarded without changing executable connections', () => {
  for (const position of [{ x: NaN, y: 3 }, { x: Infinity, y: 2 }, { x: 1, y: '2' }, { x: 2 }, null]) {
    const created = domain.createPinnedScenarioStep(catalog[0], { id: 'a', predecessorId: null, position })
    assert.equal(created.position, undefined)
    const input = draft([step('a', null, { position }), step('b', 'a')])
    const published = domain.publishScenarioPackage(pendingReview(input), reviewer, at, catalog)
    assert.deepEqual(ids(published.steps), ['a', 'b'])
    assert.equal(published.steps[0].position, undefined)
  }
})

let server
after(async () => server?.close())

test('store evaluates and publishes connected order with isolated canvas snapshots', async () => {
  server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'silent', server: { middlewareMode: true } })
  const [{ createPinia, setActivePinia }, module] = await Promise.all([
    import('pinia'), server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts')
  ])
  setActivePinia(createPinia())
  const store = module.useScenarioSkillPackagesStore()
  const skills = ['employee-certification-insight', 'workplace-segment-operations'].map(id => store.selectableSkills.find(skill => skill.id === id))
  const a = { ...domain.createPinnedScenarioStep(skills[0], { id: 'a' }), predecessorId: null, position: { x: 24, y: 48 } }
  const b = { ...domain.createPinnedScenarioStep(skills[1], { id: 'b' }), predecessorId: 'a', position: { x: 300, y: 48 } }
  const input = draft([b, a])
  assert.deepEqual(ids(store.evaluateDraft(input, actor).draft.steps), ['a', 'b'])
  store.submitDraft(withTrial(input, store.selectableSkills, actor), actor)
  const published = store.approvePackage(input.id, reviewer)
  assert.deepEqual(ids(published.steps), ['a', 'b'])
  input.steps[1].position.x = 900
  published.steps[0].position.x = 800
  const found = store.findPackage(input.id)
  assert.equal(found.steps[0].position.x, 24)
  found.steps[0].position.x = 700
  assert.equal(store.findPackage(input.id).steps[0].position.x, 24)
  assert.deepEqual(ids(store.evaluateRuntimeAccess(input.id, actor).effectiveSteps), ['a', 'b'])
  const invalid = { ...input, id: 'disconnected-package', steps: [{ ...a, predecessorId: null }, { ...b, predecessorId: null }] }
  assert.equal(store.evaluateDraft(invalid, actor).ok, false)
  assert.throws(() => store.submitDraft(invalid, actor))
  assert.equal(store.findPackage(invalid.id), undefined)
})
