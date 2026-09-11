import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'
import * as domain from '../src/domain/scenarioSkillPackages.js'
import { runScenarioSimulation } from '../src/domain/scenarioPackageTesting.js'

const at = '2026-09-09T10:00:00.000Z'
const owner = { id: 'creator', permissions: ['*'] }
const reviewer = { id: 'reviewer', permissions: ['scenario-package:review'] }
const skill = id => ({ id, name: id, menu: id, version: 'v1', online: 'v1', status: 'published', onlineStatus: 'published', permissions: { menu: [`menu:${id}`], skill: [`skill:${id}`], data: [`data:${id}`], action: [`action:${id}`] } })
const catalog = [skill('a'), skill('b')]
const draft = (skills = catalog) => ({ id: 'review-package', name: '独立审核包', description: '跨菜单经营任务', targetAudience: '运营人员', ownerId: owner.id, steps: skills.slice(0, 2).map((s, i) => domain.createPinnedScenarioStep(s, { predecessorId: i ? skills[0].id : null, task: `使用${s.name}分析本次运营对象并汇总结果`, expectedOutput: '' })) })
const submitted = () => ({ ...draft(), status: 'review', submittedAt: at, submittedBy: owner.id, auditEvents: [{ type: 'submitted', actorId: owner.id, at }] })

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

test('domain rejects owner self-approval even with wildcard permission', () => {
  assert.throws(() => domain.publishScenarioPackage(submitted(), owner, at, catalog), /本人|自己|其他管理员|自审/)
})

test('domain rejects publication that bypasses submitted review state', () => {
  for (const status of [undefined, 'draft', 'rejected', 'published', 'disabled']) {
    assert.throws(() => domain.publishScenarioPackage({ ...submitted(), status }, owner, at, catalog), /待审核|提交|状态/)
  }
})

test('domain rejects missing submission evidence and a distinct submitter reviewing their own submission', () => {
  assert.throws(() => domain.publishScenarioPackage({ ...submitted(), auditEvents: [] }, reviewer, at, catalog), /提交/)
  assert.throws(() => domain.publishScenarioPackage({ ...submitted(), ownerId: 'another-owner' }, owner, at, catalog), /本人|自己|其他管理员|自审/)
})

let server
let modules
async function fixture() {
  if (!modules) {
    server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'silent', server: { middlewareMode: true } })
    const [pinia, scenario, hub] = await Promise.all([import('pinia'), server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts'), server.ssrLoadModule('/src/stores/skillHub.ts')])
    modules = { pinia, scenario, hub }
  }
  modules.pinia.setActivePinia(modules.pinia.createPinia())
  const store = modules.scenario.useScenarioSkillPackagesStore()
  const currentDraft = draft(store.selectableSkills.filter(s => ['employee-certification-insight', 'workplace-segment-operations'].includes(s.id)))
  return { store, hub: modules.hub.useSkillHubStore(), draft: withTrial(currentDraft, store.selectableSkills, owner) }
}
after(async () => { await server?.close() })

test('submission requires creation permissions but never self-approval permission or publication evidence', async () => {
  const { store, draft } = await fixture()
  const creator = { id: owner.id, permissions: ['scenario-package:create', 'scenario-package:compose:cross-menu', ...draft.steps.flatMap(s => [`skill:${s.skillId}:metadata:read`, `skill:${s.skillId}:reference`])] }
  assert.equal(store.evaluateDraft(draft, creator).ok, true)
  assert.equal(store.evaluateDraft(draft, creator).policy.canSelfApprove, false)
  const result = store.submitDraft({ ...draft, status: 'published', approvedAt: at, publishedAt: at, reviewedBy: 'fake', auditEvents: [{ type: 'published', actorId: 'fake', at }] }, creator)
  assert.equal(result.status, 'review')
  assert.equal(result.submittedBy, owner.id)
  assert.equal(result.reviewedBy, undefined)
  assert.equal(result.approvedAt, undefined)
  assert.equal(result.publishedAt, undefined)
  assert.deepEqual(result.auditEvents.map(e => e.type), ['submitted'])
  assert.equal(store.evaluateRuntimeAccess(result.id, owner).status, 'blocked')
  result.steps[0].task = 'external mutation'
  assert.equal(store.findPackage(result.id).steps[0].task, draft.steps[0].task)
})

test('store rejects own review, unprivileged review, forged owner, duplicate submit and old direct publish', async () => {
  const { store, draft } = await fixture()
  assert.throws(() => store.submitDraft({ ...draft, ownerId: 'forged-owner' }, owner), /所有者|主责任人/)
  store.submitDraft(draft, owner)
  for (const actor of [owner, { ...reviewer, permissions: [] }, { ...reviewer, permissions: { action: ['scenario-package:review'] } }]) {
    assert.equal(store.reviewDecision(draft.id, actor).ok, false)
    assert.throws(() => store.approvePackage(draft.id, actor))
    assert.throws(() => store.rejectPackage(draft.id, actor, '补充目标'))
  }
  assert.throws(() => store.submitDraft(draft, owner), /已存在/)
  assert.ok(!store.publishDraft || (() => { assert.throws(() => store.publishDraft({ ...draft, id: 'bypass' }, owner)); return true })())
  assert.equal(store.findPackage(draft.id).status, 'review')
})

test('another reviewer publishes once while preserving configured tasks, blank optional output and isolated audit history', async () => {
  const { store, draft } = await fixture()
  store.submitDraft(draft, owner)
  assert.equal(store.reviewDecision(draft.id, reviewer).ok, true)
  const published = store.approvePackage(draft.id, reviewer, '  审核通过  ')
  assert.equal(published.status, 'published')
  assert.equal(published.reviewedBy, reviewer.id)
  assert.equal(published.reviewNote, '审核通过')
  assert.deepEqual(published.auditEvents.map(e => e.type), ['submitted', 'approved', 'published'])
  assert.deepEqual(published.auditEvents.map(e => e.actorId), ['creator', 'reviewer', 'reviewer'])
  assert.equal(published.steps[0].task, draft.steps[0].task)
  assert.equal(published.steps[0].expectedOutput, '')
  assert.equal(store.prepareRunPlan(published.id, owner).steps[0].task, draft.steps[0].task)
  assert.throws(() => store.approvePackage(draft.id, reviewer), /待审核|状态/)
  assert.throws(() => store.rejectPackage(draft.id, reviewer, '重复操作'), /待审核|状态/)
  published.auditEvents[0].actorId = 'changed'
  assert.equal(store.findPackage(draft.id).auditEvents[0].actorId, owner.id)
})

test('reject requires a reason; only the original owner can resubmit and prior audit survives', async () => {
  const { store, draft } = await fixture()
  store.submitDraft(draft, owner)
  assert.throws(() => store.rejectPackage(draft.id, reviewer, '  '), /理由|原因/)
  assert.equal(store.findPackage(draft.id).status, 'review')
  const rejected = store.rejectPackage(draft.id, reviewer, '  补充使用场景  ')
  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.reviewNote, '补充使用场景')
  assert.equal(rejected.auditEvents.at(-1).note, '补充使用场景')
  assert.equal(store.prepareRunPlan(draft.id, owner).status, 'blocked')
  assert.throws(() => store.resubmitDraft({ ...draft, ownerId: reviewer.id }, reviewer), /所有者|主责任人/)
  assert.throws(() => store.resubmitDraft({ ...draft, ownerId: reviewer.id }, owner), /所有者|主责任人/)
  const revised = withTrial({ ...draft, description: '当需要跨菜单分析经营情况时使用', auditEvents: [] }, store.selectableSkills, owner)
  const again = store.resubmitDraft(revised, owner)
  assert.equal(again.status, 'review')
  assert.equal(again.reviewedBy, undefined)
  assert.equal(again.reviewNote, undefined)
  assert.deepEqual(again.auditEvents.map(e => e.type), ['submitted', 'rejected', 'submitted'])
  assert.equal(again.auditEvents[1].note, '补充使用场景')
  assert.throws(() => store.resubmitDraft(draft, owner), /驳回/)
  assert.equal(store.approvePackage(draft.id, reviewer).status, 'published')
})

test('approval rechecks disabled dependencies and current online version without consuming review', async () => {
  for (const mutation of ['disabled', 'version']) {
    const { store, hub, draft } = await fixture()
    store.submitDraft(draft, owner)
    const source = hub.items.find(s => s.name === draft.steps[0].skillId)
    if (mutation === 'disabled') source.onlineStatus = 'disabled'
    else source.online = 'v99.0.0'
    assert.throws(() => store.approvePackage(draft.id, reviewer), /禁用|发布|版本|重新/)
    const current = store.findPackage(draft.id)
    assert.equal(current.status, 'review')
    assert.deepEqual(current.auditEvents.map(e => e.type), ['submitted'])
  }
})

test('review and rejected states never run even if injected with approval audit', () => {
  for (const status of ['review', 'rejected', 'disabled']) {
    const item = { ...submitted(), status, auditEvents: [{ type: 'approved', actorId: reviewer.id, at }, { type: 'published', actorId: reviewer.id, at }] }
    assert.equal(domain.evaluateRuntimeAccess(item, owner).status, 'blocked')
  }
})

test('runtime rejects published records whose approval actor is the owner or submitter', () => {
  for (const ownerId of [owner.id, 'another-owner']) {
    const item = { ...submitted(), ownerId, status: 'published', auditEvents: [{ type: 'approved', actorId: owner.id, at }, { type: 'published', actorId: owner.id, at }] }
    assert.equal(domain.evaluateRuntimeAccess(item, owner).status, 'blocked')
  }
})

test('pending review seed identifies an example owner and can be approved against the current catalog', async () => {
  const { store } = await fixture()
  const pending = store.findPackage('seed-scenario-pending-review')
  assert.equal(pending.ownerId, 'pm-li')
  assert.equal(pending.status, 'review')
  assert.deepEqual(pending.auditEvents.map(e => e.type), ['submitted'])
  assert.equal(store.approvePackage(pending.id, reviewer).status, 'published')
})

test('independent reviewers may hold wildcard or structured policy review permission', () => {
  for (const permissions of [['*'], { policy: ['scenario-package:review'] }]) {
    const published = domain.publishScenarioPackage(submitted(), { id: reviewer.id, permissions }, at, catalog)
    assert.equal(published.status, 'published')
  }
})

test('malformed latest approval cannot fall back to an earlier valid approval or throw in runtime', () => {
  const item = { ...submitted(), status: 'published', auditEvents: [{ type: 'approved', actorId: reviewer.id, at }, { type: 'published', actorId: reviewer.id, at }, { type: 'approved', at }] }
  assert.equal(domain.evaluateRuntimeAccess(item, owner).status, 'blocked')
})

test('a scenario description without retired fields survives submit, reject, revision and independent publication', async () => {
  const { store, draft } = await fixture()
  const description = '当需要了解指定职场人群的认证情况与经营机会时调用；仅分析当前权限范围内的数据，不直接联系客户。'
  draft.description = description
  assert.equal(Object.hasOwn(draft, 'trigger'), false)
  assert.equal(Object.hasOwn(draft, 'completionCriteria'), false)
  assert.equal(store.evaluateDraft(draft, owner).ok, true)
  const queued = store.submitDraft(withTrial(draft, store.selectableSkills, owner), owner)
  assert.equal(queued.description, description)
  assert.equal(Object.hasOwn(queued, 'trigger'), false)
  assert.equal(Object.hasOwn(queued, 'completionCriteria'), false)
  const rejected = store.rejectPackage(draft.id, reviewer, '补充任务边界')
  assert.equal(rejected.description, description)
  const revisedDescription = `${description}信息不足时列出待补充项。`
  const revised = store.resubmitDraft(withTrial({ ...draft, description: revisedDescription }, store.selectableSkills, owner), owner)
  assert.equal(revised.description, revisedDescription)
  const published = store.approvePackage(draft.id, reviewer)
  assert.equal(published.description, revisedDescription)
  assert.equal(Object.hasOwn(published, 'trigger'), false)
  assert.equal(Object.hasOwn(published, 'completionCriteria'), false)
  assert.equal(store.findPackage(published.id).description, revisedDescription)
})

test('retired fields are discarded by submitted, rebuilt, published and rejected package outputs', () => {
  const legacy = { ...submitted(), trigger: '旧触发说明', completionCriteria: '旧完成标准' }
  const outputs = [
    domain.submitScenarioPackage(withTrial(legacy, catalog, owner), owner, at, catalog),
    domain.rebuildDraftFromCatalog(legacy, catalog).draft,
    domain.publishScenarioPackage(legacy, reviewer, at, catalog),
    domain.rejectScenarioPackage(legacy, reviewer, '补充适用场景', at)
  ]
  for (const output of outputs) {
    assert.equal(Object.hasOwn(output, 'trigger'), false)
    assert.equal(Object.hasOwn(output, 'completionCriteria'), false)
    assert.equal(output.description, '跨菜单经营任务')
  }
  assert.equal(legacy.trigger, '旧触发说明')
  assert.equal(legacy.completionCriteria, '旧完成标准')
})

test('retired fields never substitute for a missing scenario description', () => {
  for (const description of ['', '  ']) {
    const input = { ...draft(), description, trigger: '用户需要经营分析时', completionCriteria: '输出经营分析结果' }
    assert.equal(domain.evaluatePackageForPublish(input, owner).ok, false)
    assert.throws(() => domain.submitScenarioPackage(input, owner, at, catalog), /场景描述/)
  }
})
