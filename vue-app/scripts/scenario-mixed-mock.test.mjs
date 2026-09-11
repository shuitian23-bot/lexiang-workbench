import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinnedScenarioStep, evaluateScenarioTrialForSubmit, getScenarioTestFingerprint, normalizeScenarioSimulationRequest, submitScenarioPackage } from '../src/domain/scenarioSkillPackages.js'
import { createScenarioSimulationRequest, runScenarioSimulation } from '../src/domain/scenarioPackageTesting.js'

const actor = { id: 'creator', permissions: ['*'] }
const catalog = [
  ['product-knowledge', 'v1.0.7', '产品知识问答'],
  ['employee-certification-insight', 'v1.0.0', '职场认证状态查询'],
  ['voucher-recommend', 'v0.1.3', '券包权益推荐'],
  ['gmv-daily-summary', 'v1.2.0', 'GMV 日报汇总'],
  ['workplace-segment-operations', 'v1.2.0', '职场人群经营分析'],
  ['enterprise-customer-followup', 'v1.0.0', '企业客户跟进建议']
].map(([id, version, name]) => ({ id, version, name, menu: name, online: version, status: 'published', onlineStatus: 'published', permissions: { menu: [`menu:${id}`], skill: [`skill:${id}`], data: [`data:${id}`], action: [`action:${id}`] } }))

function fixture(selected = catalog.slice(0, 2)) {
  const steps = selected.map((skill, index) => createPinnedScenarioStep(skill, { id: `n${index}`, predecessorId: index ? `n${index - 1}` : null, task: `使用 ${skill.name} 完成本节点任务。`, expectedOutput: '' }))
  const draft = { id: 'mixed-feedback', name: '反馈数据测试', description: '按顺序运行节点并核对输出反馈。', targetAudience: '运营人员', ownerId: actor.id, steps }
  const request = { ...createScenarioSimulationRequest(draft), mockDataMode: 'mixed-feedback' }
  return { draft, request }
}

function run(state, currentActor = actor, skills = catalog) {
  state.draft.testRequest = state.request
  state.draft.testReport = runScenarioSimulation(state.draft, skills, state.request, currentActor, '2026-09-10T03:00:00Z')
  return state.draft.testReport
}

test('mixed mock keeps legacy request shape and only accepts its exact mode', () => {
  const legacy = normalizeScenarioSimulationRequest({ input: '场景' })
  assert.equal(Object.hasOwn(legacy, 'mockDataMode'), false)
  assert.deepEqual(normalizeScenarioSimulationRequest({ input: '场景', mockDataMode: 'other' }), legacy)
  assert.equal(normalizeScenarioSimulationRequest({ input: '场景', mockDataMode: 'mixed-feedback' }).mockDataMode, 'mixed-feedback')
})

test('normal trial produces one successful node and one incomplete data example with a specific repair', () => {
  const state = fixture()
  const report = run(state)
  assert.deepEqual(report.nodes.map(node => node.status), ['completed', 'blocked'])
  assert.equal(report.status, 'blocked')
  const [first, second] = report.nodes
  assert.match(first.output, /机型 A/)
  assert.equal(first.outputSource, 'fixture')
  assert.equal(second.outputSource, 'fixture')
  assert.match(second.output, /共有 3 名员工/)
  assert.doesNotMatch(second.output, /已认证|待补充材料/)
  assert.match(second.errors.join(' '), /已认证.*待补充材料/)
  assert.match(second.suggestions.join(' '), /预期输出/)
  assert.equal(second.inputs.find(input => input.source === 'upstream').value, first.output)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, catalog).ok, false)
})

test('the failure repeats until configured output is repaired and only the new run permits submission', () => {
  const state = fixture()
  const original = structuredClone(state.draft)
  const first = run(state)
  assert.deepEqual(state.draft.steps, original.steps)
  assert.deepEqual(run(state).nodes, first.nodes)
  state.draft.steps[1].expectedOutput = '按认证状态汇总人数，分别列出已认证和待补充材料人数。'
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, catalog).ok, false, 'editing alone must not approve a failed report')
  const passed = run(state)
  assert.deepEqual(passed.nodes.map(node => node.status), ['completed', 'completed'])
  assert.match(passed.nodes[1].output, /已认证 2 名、待补充材料 1 名/)
  assert.equal(passed.nodes[0].downstream[0].status, 'received')
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, catalog).ok, true)
  assert.equal(submitScenarioPackage(state.draft, actor, undefined, catalog).status, 'review')
  assert.equal(first.nodes[1].status, 'blocked', 'rerun must retain the previous failure snapshot')
})

test('mock errors are derived again at submission even if report statuses and error lists are forged', () => {
  const state = fixture()
  run(state)
  state.draft.testReport.status = 'attention'
  state.draft.testReport.nodes[1].status = 'completed'
  state.draft.testReport.nodes[1].errors = []
  state.draft.testReport.nodes[1].issues = []
  const evaluation = evaluateScenarioTrialForSubmit(state.draft, catalog)
  assert.equal(evaluation.ok, false)
  assert.match(evaluation.reasons.join(' '), /已认证.*待补充材料/)
})

test('mode is part of the fingerprint and a legacy all-pass report cannot authorize a mixed run', () => {
  const state = fixture()
  const legacyRequest = { ...state.request }
  delete legacyRequest.mockDataMode
  state.draft.testReport = runScenarioSimulation(state.draft, catalog, legacyRequest, actor)
  assert.deepEqual(state.draft.testReport.nodes.map(node => node.status), ['completed', 'completed'])
  state.draft.testRequest = state.request
  assert.notEqual(getScenarioTestFingerprint(state.draft, catalog, legacyRequest), getScenarioTestFingerprint(state.draft, catalog, state.request))
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, catalog).ok, false)
})

for (const skill of catalog) {
  test(`${skill.name} has a distinct incomplete fixture and a usable expected-output repair`, () => {
    const predecessor = catalog.find(item => item.id !== skill.id)
    const state = fixture([predecessor, skill])
    const failed = run(state).nodes[1]
    assert.equal(failed.status, 'blocked')
    assert.ok(failed.output.trim())
    assert.ok(failed.errors.length)
    assert.match(failed.suggestions.join(' '), /预期输出/)
    state.draft.steps[1].expectedOutput = failed.suggestions.join(' ')
    const repaired = run(state).nodes[1]
    assert.equal(repaired.status, 'completed')
    assert.notEqual(repaired.output, failed.output)
  })
}

test('selected node follows resolved execution order and excludes inactive conditional nodes', () => {
  const state = fixture(catalog.slice(0, 3))
  Object.assign(state.draft.steps[1], { kind: 'conditional', required: false, condition: '需要认证查询时' })
  state.draft.steps.reverse()
  assert.deepEqual(run(state).nodes.map(node => [node.id, node.status]), [['n0', 'completed'], ['n1', 'skipped'], ['n2', 'blocked']])
  state.request.activeOptionalStepIds = ['n1']
  const activated = run(state)
  assert.deepEqual(activated.nodes.map(node => [node.id, node.status]), [['n0', 'completed'], ['n1', 'blocked'], ['n2', 'blocked']])
  assert.match(activated.nodes[2].errors.join(' '), /上游/)
})

test('a failed data example stays inspectable but is never recorded as sent to a third node', () => {
  const state = fixture(catalog.slice(0, 3))
  const [first, failed, downstream] = run(state).nodes
  assert.deepEqual([first.status, failed.status, downstream.status], ['completed', 'blocked', 'blocked'])
  assert.match(failed.output, /共有 3 名员工/)
  assert.equal(first.downstream[0].status, 'received')
  assert.deepEqual(failed.downstream.map(({ nodeId, status, sentValue, receivedValue }) => ({ nodeId, status, sentValue, receivedValue })), [{ nodeId: 'n2', status: 'blocked', sentValue: '', receivedValue: '' }])
  assert.ok(downstream.inputs.every(input => input.nodeId !== failed.id))
  state.draft.steps[1].expectedOutput = '按认证状态汇总已认证和待补充材料人数。'
  const repaired = run(state)
  assert.ok(repaired.nodes.every(node => node.status === 'completed'))
  assert.equal(repaired.nodes[1].downstream[0].status, 'received')
  assert.equal(repaired.nodes[1].downstream[0].sentValue, repaired.nodes[1].output)
  assert.equal(repaired.nodes[1].downstream[0].receivedValue, repaired.nodes[1].output)
})

test('only one executed node has no injected failure', () => {
  const state = fixture()
  Object.assign(state.draft.steps[1], { kind: 'conditional', required: false, condition: '需要认证查询时' })
  assert.deepEqual(run(state).nodes.map(node => node.status), ['completed', 'skipped'])
})

test('missing task, permissions, ownership and unavailable fixture remain authoritative', () => {
  const emptyTask = fixture()
  emptyTask.draft.steps[0].task = ''
  const taskReport = run(emptyTask)
  assert.deepEqual(taskReport.nodes.map(node => node.status), ['blocked', 'blocked'])
  assert.equal(taskReport.nodes[1].output, '')
  for (const currentActor of [{ id: actor.id, permissions: [] }, { id: 'another', permissions: ['*'] }]) {
    const report = run(fixture(), currentActor)
    assert.deepEqual(report.nodes.map(node => node.status), ['blocked', 'blocked'])
    assert.ok(report.nodes.every(node => !node.output && node.outputSource === 'none'))
  }
  const unknownCatalog = catalog.map(skill => skill.id === catalog[1].id ? { ...skill, version: 'v9.9.9', online: 'v9.9.9' } : skill)
  const unknown = fixture(unknownCatalog.slice(0, 2))
  const unknownReport = run(unknown, actor, unknownCatalog)
  assert.equal(unknownReport.nodes[1].status, 'blocked')
  assert.equal(unknownReport.nodes[1].output, '')
  assert.match(unknownReport.nodes[1].errors.join(' '), /没有本地样例/)
})

test('manual legacy outputs cannot override a mixed data failure', () => {
  const state = fixture()
  state.request.sampleOutputs = { n1: '伪造完整结果' }
  const report = run(state)
  assert.equal(report.nodes[1].status, 'blocked')
  assert.notEqual(report.nodes[1].output, state.request.sampleOutputs.n1)
  assert.equal(report.nodes[1].outputSource, 'fixture')
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, catalog).ok, false)
})
