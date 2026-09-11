import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinnedScenarioStep, rebuildDraftFromCatalog, publishScenarioPackage, submitScenarioPackage } from '../src/domain/scenarioSkillPackages.js'
import { getScenarioNodeContract, getScenarioNodeInputs } from '../src/domain/scenarioNodeContracts.js'
import { runScenarioSimulation } from '../src/domain/scenarioPackageTesting.js'

const skill = (id, menu = id) => ({ id, name: id, menu, version: 'v1', online: 'v1', status: 'published', onlineStatus: 'published', description: `处理${id}任务`, inputDescription: `${id}输入`, outputDescription: `${id}结果`, permissions: { menu: [`menu:${menu}`], skill: [`skill:${id}`], data: [`data:${id}`], action: [`action:${id}`] } })
const catalog = [skill('a'), skill('b')]
const draft = steps => ({ id: 'contract-package', name: '经营管理', description: '串联查询分析', targetAudience: '运营', ownerId: 'admin', steps })

function withTrial(draft, skills, actor) {
  const testRequest = {
    input: '使用手工样例检查当前场景链路。',
    expectedOutput: '各节点按既定链路传递手工样例。',
    activeOptionalStepIds: draft.steps.filter(step => step.kind === 'conditional').map(step => step.id),
    confirmedStepIds: draft.steps.filter(step => step.requiresConfirmation).map(step => step.id),
    approvedStepIds: draft.steps.filter(step => step.requiresApproval).map(step => step.id),
    sampleOutputs: Object.fromEntries(draft.steps.map(step => [step.id, `节点 ${step.id} 的手工模拟输出。`]))
  }
  return { ...draft, testRequest, testReport: runScenarioSimulation(draft, skills, testRequest, actor, '2026-09-09T00:00:00Z') }
}

test('new nodes receive task and input/output from published catalog', () => {
  const step = createPinnedScenarioStep(catalog[0])
  assert.equal(step.task, '处理a任务')
  assert.equal(step.inputDescription, 'a输入')
  assert.equal(step.expectedOutput, 'a结果')
  assert.equal(step.fixedRequirements, '')
})

test('overrides including explicit empty strings survive catalog rebuild and publication', () => {
  const steps = [createPinnedScenarioStep(catalog[0], { predecessorId: null, task: '当前场景任务', fixedRequirements: '只汇总有依据的结果', expectedOutput: '' }), createPinnedScenarioStep(catalog[1], { predecessorId: 'a' })]
  const current = catalog.map(s => ({ ...s, description: '后来的说明', outputDescription: '后来的结果' }))
  const rebuilt = rebuildDraftFromCatalog(draft(steps), current)
  const owner = { id: 'admin', permissions: ['*'] }
  const published = publishScenarioPackage(submitScenarioPackage(withTrial(rebuilt.draft, current, owner), owner, '2026-09-09T00:00:00Z', current), { id: 'reviewer', permissions: ['scenario-package:review'] }, '2026-09-09T00:00:00Z', current)
  assert.equal(published.steps[0].task, '当前场景任务')
  assert.equal(published.steps[0].fixedRequirements, '只汇总有依据的结果')
  assert.equal(published.steps[0].expectedOutput, '')
  steps[0].task = '外部修改'
  assert.equal(published.steps[0].task, '当前场景任务')
})

const inputNode = (id, predecessorId, overrides = {}) => ({
  id, name: `节点 ${id}`, skillId: `skill-${id}`, predecessorId,
  kind: 'required', inputDescription: `${id}本次输入`, expectedOutput: `${id}预期结果`,
  ...overrides
})
const ancestorIds = inputs => inputs.filter(input => input.kind === 'upstream').map(input => input.nodeId)

test('input sources follow real ancestors in connected order and exclude unrelated canvas nodes', () => {
  const steps = [
    inputNode('unrelated', null, { position: { x: 1, y: 1 } }),
    inputNode('c', 'b', { position: { x: 2, y: 1 } }),
    inputNode('b', 'a', { position: { x: 400, y: 1 } }),
    inputNode('a', null, { position: { x: 800, y: 1 } })
  ]
  const inputs = getScenarioNodeInputs(steps, 'c')
  assert.equal(inputs[0].kind, 'run')
  assert.equal(inputs[0].description, 'c本次输入')
  assert.deepEqual(ancestorIds(inputs), ['a', 'b'])
  assert.deepEqual(inputs.filter(input => input.kind === 'upstream').map(input => input.description), ['a预期结果', 'b预期结果'])
})

test('reconnecting a node recomputes ancestry without retaining its old input producers', () => {
  const steps = [inputNode('a', null), inputNode('b', 'a'), inputNode('c', 'b'), inputNode('d', null)]
  const before = getScenarioNodeInputs(steps, 'c')
  steps[2].predecessorId = 'd'
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'c')), ['d'])
  assert.deepEqual(ancestorIds(before), ['a', 'b'])
})

test('disconnecting a node removes all upstream declarations instead of falling back to array order', () => {
  const steps = [inputNode('a', null), inputNode('b', 'a'), inputNode('c', 'b')]
  steps[2].predecessorId = null
  const inputs = getScenarioNodeInputs(steps, 'c')
  assert.deepEqual(ancestorIds(inputs), [])
  assert.equal(inputs.length, 1)
  assert.equal(inputs[0].kind, 'run')
  assert.equal(inputs[0].description, 'c本次输入')
})

test('legacy inputs use all earlier array entries without rewriting the legacy records', () => {
  const steps = ['c', 'a', 'b'].map(id => {
    const step = inputNode(id, undefined)
    delete step.predecessorId
    return step
  })
  const before = structuredClone(steps)
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'c')), [])
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'a')), ['c'])
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'b')), ['c', 'a'])
  assert.deepEqual(steps, before)
})

test('a missing predecessor in a mixed record does not guess a connection from array position', () => {
  const steps = [inputNode('a', null), inputNode('b', undefined), inputNode('c', 'b')]
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'b')), [])
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'c')), ['b'])
})

test('conditional input metadata declares expected output without claiming an actual artifact', () => {
  const steps = [inputNode('a', null), inputNode('b', 'a', { kind: 'conditional', expectedOutput: '  可选客户清单  ' }), inputNode('c', 'b')]
  const sources = getScenarioNodeInputs(steps, 'c').filter(input => input.kind === 'upstream')
  assert.equal(sources[0].conditional, false)
  assert.equal(sources[1].conditional, true)
  assert.equal(sources[1].nodeId, 'b')
  assert.equal(sources[1].description, '可选客户清单')
  assert.equal('result' in sources[1] || 'artifact' in sources[1] || 'value' in sources[1], false)
})

for (const [name, steps, targetId] of [
  ['self reference', [inputNode('a', 'a')], 'a'],
  ['cycle containing the target', [inputNode('a', 'b'), inputNode('b', 'a')], 'b'],
  ['cycle upstream from the target', [inputNode('a', 'b'), inputNode('b', 'a'), inputNode('c', 'b')], 'c']
]) {
  test(`${name} exposes only run input rather than fictional upstream data`, () => {
    const inputs = getScenarioNodeInputs(steps, targetId)
    assert.deepEqual(ancestorIds(inputs), [])
    assert.equal(inputs.length, 1)
    assert.equal(inputs[0].kind, 'run')
  })
}

test('dangling references stop at known ancestors and missing targets expose no inputs', () => {
  const steps = [inputNode('a', null), inputNode('b', 'missing'), inputNode('c', 'b')]
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'b')), [])
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'c')), ['b'])
  assert.deepEqual(getScenarioNodeInputs(steps, 'missing'), [])
})

test('legacy task fallback uses available identity and does not overwrite the source record', () => {
  const record = { id: 'a', name: '客户查询', skillId: 'customer-query' }
  const before = structuredClone(record)
  assert.match(getScenarioNodeContract(record).task, /客户查询/)
  assert.match(getScenarioNodeContract({ id: 'a', skillId: 'customer-query' }).task, /customer-query/)
  assert.ok(getScenarioNodeContract({ id: 'a' }).task.trim())
  assert.equal(getScenarioNodeContract(record).fixedRequirements, '')
  assert.equal(getScenarioNodeContract(record).expectedOutput, '')
  assert.deepEqual(record, before)
})

test('explicit empty contract strings remain empty and are not replaced by legacy defaults', () => {
  assert.deepEqual(getScenarioNodeContract({ id: 'a', name: '查询', task: '', fixedRequirements: '', expectedOutput: '' }), {
    task: '', fixedRequirements: '', expectedOutput: ''
  })
  assert.deepEqual(getScenarioNodeContract({ id: 'a', task: '  当前职责  ', fixedRequirements: ' 保持边界 ', expectedOutput: ' 原始说明 ' }), {
    task: '  当前职责  ', fixedRequirements: ' 保持边界 ', expectedOutput: ' 原始说明 '
  })
})

test('malformed contract values become empty strings rather than implicit text or invented instructions', () => {
  for (const value of [null, 0, false, [], { text: '不可当作配置' }]) {
    assert.deepEqual(getScenarioNodeContract({ id: 'a', task: value, fixedRequirements: value, expectedOutput: value }), {
      task: '', fixedRequirements: '', expectedOutput: ''
    })
  }
})

test('undeclared input and output text remain descriptions and cannot fabricate an upstream result', () => {
  const steps = [inputNode('a', null, { expectedOutput: null }), inputNode('b', 'a', { inputDescription: null })]
  const inputs = getScenarioNodeInputs(steps, 'b')
  assert.ok(inputs[0].description.trim())
  assert.equal(inputs[1].nodeId, 'a')
  assert.ok(inputs[1].description.trim())
  assert.equal('result' in inputs[1] || 'artifact' in inputs[1] || 'value' in inputs[1], false)
})

test('input descriptions are fresh snapshots rather than mutable aliases of node configuration', () => {
  const steps = [inputNode('a', null), inputNode('b', 'a')]
  const inputs = getScenarioNodeInputs(steps, 'b')
  inputs[0].description = '外部篡改'
  inputs[1].description = '外部篡改'
  inputs.push({ kind: 'upstream', nodeId: 'injected' })
  assert.equal(steps[0].expectedOutput, 'a预期结果')
  assert.equal(steps[1].inputDescription, 'b本次输入')
  assert.deepEqual(ancestorIds(getScenarioNodeInputs(steps, 'b')), ['a'])
  assert.equal(getScenarioNodeInputs(steps, 'b')[1].description, 'a预期结果')
})

test('catalog defaults apply only to their published version and never borrow editing input or output', async () => {
  const { createServer } = await import('vite')
  const server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'silent', server: { middlewareMode: true } })
  try {
    const { createSelectableScenarioSkills } = await server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts')
    const item = {
      name: 'employee-certification-insight', cnName: '认证分析', platform: 'lexiang', desc: '认证情况说明',
      version: 'v2.0.0', editVersion: 'v2.0.0', workflowStatus: 'draft', onlineStatus: 'published',
      online: 'v1.0.0', status: 'draft', statusText: '草稿', category: '员工管理', tags: [], owner: 'admin', updated: '2026-09-09',
      draft: { form: { name: 'employee-certification-insight', cnName: '认证分析', menu: '员工管理', scene: '编辑中的新职责', input: '未发布的输入', output: '未发布的输出' } }
    }
    const [current] = createSelectableScenarioSkills([item])
    assert.equal(current.version, 'v1.0.0')
    assert.ok(current.inputDescription.trim())
    assert.ok(current.outputDescription.trim())
    assert.notEqual(current.inputDescription, '未发布的输入')
    assert.notEqual(current.outputDescription, '未发布的输出')
    const [changed] = createSelectableScenarioSkills([{ ...item, online: 'v2.0.0' }])
    assert.equal(changed.inputDescription, '')
    assert.equal(changed.outputDescription, '')
  } finally {
    await server.close()
  }
})
