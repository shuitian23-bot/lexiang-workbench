import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const host = createHttpServer()
const server = await createServer({ root, server: { middlewareMode: true, hmr: { server: host } }, appType: 'custom', logLevel: 'error' })
after(async () => { await server.close(); host.close() })
const { default: Panel } = await server.ssrLoadModule('/src/views/agent/ScenarioPackageTrialPanel.vue')
const { createPinnedScenarioStep } = await server.ssrLoadModule('/src/domain/scenarioSkillPackages.js')
const { createScenarioSimulationRequest, runScenarioSimulation, getScenarioTestFingerprint } = await server.ssrLoadModule('/src/domain/scenarioPackageTesting.js')
const skills = [['employee-certification-insight', 'v1.0.0'], ['workplace-segment-operations', 'v1.2.0']].map(([id, version]) => ({ id, version, name: id, menu: id, status: 'published', onlineStatus: 'published', online: version, permissions: { menu: [id], skill: [id], data: [id], action: [id] } }))
const actor = { id: 'creator', permissions: ['*'] }
function props(options = {}) {
  const steps = skills.map((skill, index) => createPinnedScenarioStep(skill, { id: `n${index}`, task: `执行节点 ${index} 的查询分析任务`, expectedOutput: `输出节点 ${index} 的查询结果与分析建议`, predecessorId: index ? 'n0' : null, requiresConfirmation: index === 1 && !options.conditional, kind: index === 1 && options.conditional ? 'conditional' : 'required', condition: index === 1 && options.conditional ? '需要分析时' : '', required: !options.conditional || index === 0 }))
  const draft = { id: 'run-actions', name: '场景', description: '查询后分析', targetAudience: '运营', ownerId: actor.id, steps }
  return { draft, skills, actor, report: null, modelValue: createScenarioSimulationRequest(draft), disabled: Boolean(options.disabled) }
}
async function setup(values) {
  let state
  const events = []
  const Wrapped = { ...Panel, setup(p, context) { state = Panel.setup(p, context); return state } }
  await renderToString(createSSRApp({ render: () => h(Wrapped, { ...values, 'onUpdate:report': report => events.push(['report', report]), 'onUpdate:modelValue': request => events.push(['request', request]), onRunning: value => events.push(['running', value]) }) }))
  return { state, events, report: () => events.findLast(([key, value]) => key === 'report' && value)?.[1] }
}
test('confirming one required node retries the whole chain without approving any other node', async () => {
  const values = props(), before = structuredClone(values)
  const run = await setup(values)
  await run.state.runTrial()
  assert.equal(run.report().nodes[1].status, 'blocked')
  await run.state.confirmAndRetry('n1')
  assert.deepEqual(run.report().request.confirmedStepIds, ['n1'])
  assert.deepEqual(run.report().request.approvedStepIds, [])
  assert.equal(run.report().nodes[1].status, 'completed')
  assert.deepEqual(values, before)
})
test('conditional branch can be tested and then skipped again by explicit retry', async () => {
  const values = props({ conditional: true })
  const run = await setup(values)
  await run.state.toggleBranchAndRetry('n1')
  assert.equal(run.report().nodes[1].status, 'completed')
  const again = await setup({ ...values, modelValue: run.report().request })
  await again.state.toggleBranchAndRetry('n1')
  assert.equal(again.report().nodes[1].status, 'skipped')
  assert.deepEqual(again.report().request.activeOptionalStepIds, [])
})
test('new trial discards hidden handwritten sample overrides and records built-in output', async () => {
  const values = props()
  values.modelValue.sampleOutputs.n0 = '过往手工伪造反馈'
  const run = await setup(values)
  await run.state.runTrial()
  assert.deepEqual(run.report().request.sampleOutputs, {})
  assert.equal(run.report().nodes[0].outputSource, 'fixture')
  assert.notEqual(run.report().nodes[0].output, '过往手工伪造反馈')
  assert.deepEqual(run.events.find(([key]) => key === 'request')[1].sampleOutputs, {})
  assert.equal(values.modelValue.sampleOutputs.n0, '过往手工伪造反馈')
})
test('readonly, concurrent actions and invalid targets cannot change runtime choices', async () => {
  const locked = await setup(props({ disabled: true }))
  await locked.state.confirmAndRetry('n1')
  await locked.state.toggleBranchAndRetry('n1')
  await locked.state.runTrial()
  assert.deepEqual(locked.events, [])
  const run = await setup(props())
  await run.state.confirmAndRetry('n0')
  await run.state.toggleBranchAndRetry('n1')
  assert.deepEqual(run.events, [])
  const first = run.state.runTrial()
  await run.state.confirmAndRetry('n1')
  await first
  assert.equal(run.events.filter(([key, value]) => key === 'report' && value).length, 1)
  assert.deepEqual(run.report().request.confirmedStepIds, [])
})


test('an old successful report rejected by the current task check asks for a new trial without relabelling its historical nodes', async () => {
  const values = props({ conditional: true })
  values.report = runScenarioSimulation(values.draft, skills, values.modelValue, actor)
  values.draft.steps[0].task = ''
  values.modelValue = createScenarioSimulationRequest(values.draft)
  values.report.request = structuredClone(values.modelValue)
  values.report.fingerprint = getScenarioTestFingerprint(values.draft, skills, values.modelValue)
  values.report.nodes[0].task = ''
  values.report.nodes[0].inputs[0].value = values.modelValue.input
  const before = structuredClone(values.report)
  const html = await renderToString(createSSRApp({ render: () => h(Panel, values) }))
  assert.match(html, /当前报告不满足提交条件，请重新试运行以查看节点报错和修改建议/)
  assert.doesNotMatch(html, /本轮存在错误，不能提交/)
  assert.deepEqual(values.report, before)
})
