import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinnedScenarioStep, evaluateScenarioTrialForSubmit } from '../src/domain/scenarioSkillPackages.js'
import { createScenarioSimulationRequest, runScenarioSimulation } from '../src/domain/scenarioPackageTesting.js'

const owner = { id: 'inventory-owner', permissions: ['*'] }
const skill = (id, name, version, menu) => ({
  id, name, version, online: version, status: 'published', onlineStatus: 'published', menu,
  permissions: { menu: [`menu:${menu}`], skill: [`skill:${id}`], data: [`data:${id}`], action: [`action:${id}`] }
})

function recoveredInventory({ id = 'legacy-inventory-alert', version = 'v0.9.0' } = {}) {
  const catalog = [
    skill('enterprise-customer-followup', '企业客户跟进建议', 'v1.0.0', '企业客户管理'),
    skill(id, '旧版库存预警', version, '乐享运营')
  ]
  const draft = {
    id: 'recovered-inventory', name: '企业客户库存预警协同', ownerId: owner.id,
    description: '结合企业客户跟进目标与库存预警制定供货建议。', targetAudience: '企业客户运营人员',
    steps: catalog.map((item, index) => createPinnedScenarioStep(item, {
      id: `node-${index}`, predecessorId: index ? 'node-0' : null, required: true,
      task: index ? '核对机型 A 的库存与历史预警阈值并提出供货建议。' : '确认企业客户 A 的采购需求与跟进目标。',
      expectedOutput: ''
    }))
  }
  return { catalog, draft, request: createScenarioSimulationRequest(draft) }
}

function run(state, actor = owner) {
  state.draft.testRequest = state.request
  state.draft.testReport = runScenarioSimulation(state.draft, state.catalog, state.request, actor)
  return state.draft.testReport
}

function recoveredWeather(version = 'v1.0.0') {
  const state = recoveredInventory()
  state.catalog[1] = skill('weather-query', '实时天气查询', version, '乐享运营')
  state.draft = {
    ...state.draft, id: 'recovered-weather', name: '企业客户活动安排',
    description: '结合企业客户跟进目标和活动地点天气安排线下活动。',
    steps: [state.draft.steps[0], createPinnedScenarioStep(state.catalog[1], {
      id: 'node-1', predecessorId: 'node-0', kind: 'conditional', required: false,
      condition: '需要安排线下活动时', task: '查询活动地点的天气并提示降水风险。', expectedOutput: ''
    })]
  }
  state.request = { ...createScenarioSimulationRequest(state.draft), mockDataMode: 'mixed-feedback' }
  return state
}

test('a recovered and reselected inventory v0.9.0 uses a complete simulated fixture', () => {
  const state = recoveredInventory()
  const report = run(state)
  assert.deepEqual(report.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(report.mode, 'simulation')
  assert.equal(report.executionPerformed, false)
  const inventory = report.nodes[1]
  assert.equal(inventory.outputSource, 'fixture')
  assert.match(inventory.output, /模拟样例.*库存.*预警阈值.*供货/)
  assert.match(inventory.output, /未调整库存/)
  assert.deepEqual(inventory.errors, [])
  assert.equal(inventory.inputs.find(input => input.source === 'upstream').value, report.nodes[0].output)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)
})

test('inventory keeps a repairable first-run failure and completes on the retry phase', () => {
  const state = recoveredInventory()
  state.request.mockDataMode = 'mixed-feedback'
  const first = run(state)
  assert.deepEqual(first.nodes.map(node => node.status), ['completed', 'blocked'])
  assert.equal(first.nodes[1].outputSource, 'fixture')
  assert.match(first.nodes[1].output, /模拟样例.*库存/)
  assert.match(first.nodes[1].errors.join(' '), /预警阈值/)
  assert.match(first.nodes[1].suggestions.join(' '), /返回修改.*预期输出/)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)

  state.request = { ...state.request, mockDataPhase: 'retry' }
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false, 'the old failed report cannot authorize a retry')
  const retry = run(state)
  assert.deepEqual(retry.nodes.map(node => node.status), ['completed', 'completed'])
  assert.notEqual(retry.nodes[1].output, first.nodes[1].output)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)
  assert.equal(first.nodes[1].status, 'blocked', 'a retry must preserve the previous report')
})

test('inventory can also repair the first-run requirement before running again', () => {
  const state = recoveredInventory()
  state.request.mockDataMode = 'mixed-feedback'
  const first = run(state)
  state.draft.steps[1].expectedOutput = first.nodes[1].suggestions.join(' ')
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
  const repaired = run(state)
  assert.deepEqual(repaired.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)
})

for (const [name, override] of [
  ['an unknown inventory version', { version: 'v0.9.1' }],
  ['an unrelated Skill with the same version', { id: 'unknown-inventory-alert' }]
]) {
  test(`${name} remains blocked without an explicit fixture`, () => {
    const state = recoveredInventory(override)
    state.request = { ...state.request, mockDataMode: 'mixed-feedback', mockDataPhase: 'retry' }
    const report = run(state)
    assert.equal(report.nodes[1].status, 'blocked')
    assert.equal(report.nodes[1].output, '')
    assert.equal(report.nodes[1].outputSource, 'none')
    assert.match(report.nodes[1].errors.join(' '), /没有本地样例/)
    assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
  })
}

for (const [name, change, actor] of [
  ['missing permissions', () => {}, { id: owner.id, permissions: [] }],
  ['another owner', () => {}, { id: 'another-owner', permissions: ['*'] }],
  ['a disabled source Skill', state => { state.catalog[1].onlineStatus = 'disabled' }, owner],
  ['an unresolved chain', state => { state.draft.steps[1].predecessorId = 'missing-node' }, owner],
  ['an outdated fixed version', state => { state.catalog[1].version = 'v0.9.1'; state.catalog[1].online = 'v0.9.1' }, owner]
]) {
  test(`the inventory fixture does not bypass ${name}`, () => {
    const state = recoveredInventory()
    state.request = { ...state.request, mockDataMode: 'mixed-feedback', mockDataPhase: 'retry' }
    change(state)
    const report = run(state, actor)
    assert.equal(report.status, 'blocked')
    assert.ok(report.nodes.every(node => node.status === 'blocked' && !node.output && node.outputSource === 'none'))
    assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
  })
}

test('changing the inventory catalog invalidates its previous successful report', () => {
  const state = recoveredInventory()
  run(state)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)
  state.catalog[1].permissions.data.push('data:inventory:new-scope')
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
})

test('a recovered weather branch stays skipped until activated and completes after its first-run repair', () => {
  const state = recoveredWeather()
  const skipped = run(state)
  assert.deepEqual(skipped.nodes.map(node => node.status), ['completed', 'skipped'])
  assert.equal(skipped.nodes[1].output, '')
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)

  state.request.activeOptionalStepIds = ['node-1']
  const first = run(state)
  assert.deepEqual(first.nodes.map(node => node.status), ['completed', 'blocked'])
  assert.equal(first.nodes[1].outputSource, 'fixture')
  assert.match(first.nodes[1].errors.join(' '), /降水/)
  assert.match(first.nodes[1].suggestions.join(' '), /返回修改.*预期输出/)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)

  state.request = { ...state.request, mockDataPhase: 'retry' }
  const repaired = run(state)
  assert.deepEqual(repaired.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(repaired.mode, 'simulation')
  assert.equal(repaired.executionPerformed, false)
  assert.match(repaired.nodes[1].output, /模拟样例.*天气.*降水/)
  assert.match(repaired.nodes[1].output, /未查询真实天气/)
  assert.notEqual(repaired.nodes[1].output, first.nodes[1].output)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, true)
})

test('a disabled weather source cannot run an activated branch using a known fixture', () => {
  const state = recoveredWeather()
  state.catalog[1].onlineStatus = 'disabled'
  state.request = { ...state.request, activeOptionalStepIds: ['node-1'], mockDataPhase: 'retry' }
  const report = run(state)
  assert.equal(report.status, 'blocked')
  assert.equal(report.nodes[1].output, '')
  assert.match(report.nodes[1].errors.join(' '), /禁用/)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
})

test('an activated weather branch at an unknown version still requires its own fixture', () => {
  const state = recoveredWeather('v1.0.1')
  state.request = { ...state.request, activeOptionalStepIds: ['node-1'], mockDataPhase: 'retry' }
  const report = run(state)
  assert.equal(report.nodes[1].status, 'blocked')
  assert.equal(report.nodes[1].outputSource, 'none')
  assert.equal(report.nodes[1].output, '')
  assert.match(report.nodes[1].errors.join(' '), /没有本地样例/)
  assert.equal(evaluateScenarioTrialForSubmit(state.draft, state.catalog).ok, false)
})
