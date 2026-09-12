import { scenarioPmPermissions } from './helpers/scenarioActors.mjs'
import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, createSSRApp, h, nextTick, reactive, ssrContextKey } from 'vue'
import { renderToString } from 'vue/server-renderer'

const previousStorage = globalThis.localStorage
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} }
const root = fileURLToPath(new URL('../', import.meta.url))
const httpHost = createHttpServer()
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: { server: httpHost } }, appType: 'custom' })
const [{ default: Create }, { default: Composer }, { default: Trial }, { useAppStore }, { useScenarioSkillPackagesStore }] = await Promise.all([
  server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageCreateView.vue'),
  server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageComposer.vue'),
  server.ssrLoadModule('/src/views/agent/ScenarioPackageTrialPanel.vue'),
  server.ssrLoadModule('/src/stores/app.ts'),
  server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts'),
])
const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
const mounted = []
const copy = value => JSON.parse(JSON.stringify(value))
const skillIds = ['employee-certification-insight', 'workplace-segment-operations']
afterEach(() => { for (const host of mounted.splice(0).reverse()) host.unmount() })
after(async () => {
  await server.close()
  httpHost.close()
  if (previousStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = previousStorage
})

function scope() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const account = useAppStore()
  account.user = 'trial-example-creator'
  account.permissions = scenarioPmPermissions([])
  const store = useScenarioSkillPackagesStore()
  account.permissions = scenarioPmPermissions(store.selectableSkills)
  return { pinia, account, store }
}

function mount(component, props, pinia, emit = () => {}) {
  let state
  let exposed
  const host = renderer.createApp({ setup() {
    state = component.setup(props, { expose(value) { exposed = value }, emit })
    return () => h('div')
  } })
  host.provide(ssrContextKey, {})
  host.use(pinia)
  host.mount({})
  mounted.push(host)
  return { state, exposed }
}

function standalone() {
  const current = scope()
  const events = []
  const props = reactive({ skills: current.store.selectableSkills, modelValue: [] })
  const { state: composer } = mount(Composer, props, current.pinia, (event, value) => {
    events.push([event, value])
    if (event === 'update:modelValue') props.modelValue = value
  })
  return { ...current, composer, props, events }
}

for (const context of ['new', 'existing rejected draft']) {
  test(`the ${context} creation canvas keeps drag guidance without a trial example entry`, async () => {
    const current = scope()
    const props = context === 'existing rejected draft' ? { draft: {
      id: 'existing-empty-rejected-draft', name: '保留的场景包', description: '用户已保存的适用场景',
      targetAudience: '企业运营', ownerId: 'trial-example-creator', status: 'rejected', steps: [],
    } } : {}
    const PreparedCreate = { ...Create, setup(componentProps, setupContext) {
      const state = Create.setup(componentProps, setupContext)
      state.activeStep.value = 2
      return state
    } }
    const app = createSSRApp(PreparedCreate, props)
    app.use(current.pinia)
    const html = await renderToString(app)
    assert.match(html, /将 Skill 拖到这里/)
    assert.match(html, /自由摆放节点，连接端口建立执行顺序。/)
    assert.doesNotMatch(html, /使用试运行示例|两个节点，体验报错提示与修改后重试。/)
  })
}

function assertLinkedSteps(steps) {
  assert.equal(steps.length, 2)
  assert.deepEqual(steps.map(step => step.skillId), skillIds)
  assert.deepEqual(steps.map(step => step.pinnedVersion), ['v1.0.0', 'v1.2.0'])
  assert.equal(steps[0].predecessorId, null)
  assert.equal(steps[1].predecessorId, steps[0].id)
  assert.equal(new Set(steps.map(step => step.id)).size, 2)
  assert.ok(steps.every(step => step.required && step.kind === 'required'))
  assert.ok(steps[0].expectedOutput.trim())
  assert.equal(steps[1].expectedOutput, '', 'missing output requirements select incomplete mock feedback')
  assert.ok(steps[0].task.trim())
  assert.equal(steps[1].task, '', 'empty tasks remain placeholders and inherit the published task during execution')
  assert.ok(steps.every(step => !step.requiresApproval && !step.requiresConfirmation))
  assert.ok(steps.every(step => Number.isFinite(step.position?.x) && Number.isFinite(step.position?.y)))
}

test('ordinary additions keep empty inputs, snapshot permissions, and preserve existing nodes', async () => {
  const { composer, props, events } = standalone()
  composer.addSkill(skillIds[0], { x: 100, y: 140 })
  await nextTick()
  assert.equal(props.modelValue.length, 1)
  assert.equal(props.modelValue[0].task, '')
  assert.equal(props.modelValue[0].expectedOutput, '')
  const before = copy(props.modelValue)
  composer.addSkill(skillIds[0], { x: 200, y: 240 })
  await nextTick()
  assert.equal(events.length, 1)
  assert.deepEqual(copy(props.modelValue), before)
  const sourcePermissions = props.skills.find(skill => skill.id === skillIds[0]).permissions
  props.modelValue[0].permissions.menu.push('test-only-mutation')
  assert.equal(sourcePermissions.menu.includes('test-only-mutation'), false, 'a node must snapshot catalog permissions')
})

function flow() {
  const current = scope()
  const events = []
  const { state: create } = mount(Create, reactive({}), current.pinia, (...event) => events.push(event))
  const { state: composer, exposed } = mount(Composer, reactive({
    get skills() { return create.publishedSkills.value },
    get modelValue() { return create.chain.value },
    get trialErrors() { return create.trialErrors.value },
    get trialSuggestions() { return create.trialSuggestions.value },
    get trialStale() { return !create.isTestCurrent.value },
  }), current.pinia, (event, value) => { if (event === 'update:modelValue') create.chain.value = value })
  create.composer.value = exposed
  const { state: trial } = mount(Trial, reactive({
    get draft() { return create.currentDraft() },
    get skills() { return create.publishedSkills.value },
    get actor() { return create.actor.value },
    get modelValue() { return create.testRequest.value },
    get report() { return create.testReport.value },
    get disabled() { return !create.canEditDraft.value },
  }), current.pinia, (event, value) => {
    if (event === 'update:modelValue') create.testRequest.value = value
    if (event === 'update:report') create.testReport.value = value
    if (event === 'running') create.trialRunning.value = value
    if (event === 'edit-chain') create.returnToComposition(value)
  })
  return { ...current, create, composer, trial, events }
}

async function startLinkedTrial(current) {
  const { composer, create } = current
  for (const [index, id] of skillIds.entries()) {
    composer.addSkill(id, { x: 48 + index * 376, y: 96 })
    await nextTick()
  }
  assert.equal(composer.connectNodes(create.chain.value[0].id, create.chain.value[1].id), true)
  await nextTick()
  composer.selectStep(create.chain.value[0].id)
  composer.updateSelectedStep({
    task: '查询职场 A 本周员工认证状态，汇总已认证和待补充材料的人数。',
    expectedOutput: '输出已认证和待补充材料的人数，供下一节点分析。',
  })
  await nextTick()
  assertLinkedSteps(current.create.chain.value)
  current.create.goNext()
  current.create.goNext()
  assert.equal(current.create.activeStep.value, 3)
  await current.trial.runTrial()
  await nextTick()
}

test('linked nodes retain repair guidance while editing and use complete feedback on retry', async () => {
  const current = flow()
  const { create, composer, trial, store, events } = current
  await startLinkedTrial(current)
  const report = copy(create.testReport.value)
  assert.deepEqual(report.nodes.map(node => node.status), ['completed', 'blocked'])
  assert.equal(report.executionPerformed, false)
  assert.match(report.nodes[1].errors.join(' '), /缺少待跟进人群和对应运营建议/)
  assert.match(report.nodes[1].suggestions.join(' '), /预期输出.*重新试运行/)
  assert.equal(trial.activeNodeId.value, report.nodes[1].id)
  assert.equal(create.trialGate.value.ok, false)
  await create.submitPackage()
  assert.equal(events.length, 0)
  const retained = copy(create.testReport.value)
  trial.returnToChain(report.nodes[1].id)
  await nextTick()
  assert.equal(create.activeStep.value, 2)
  assert.equal(composer.selectedStepId.value, report.nodes[1].id)
  assert.deepEqual(copy(create.testReport.value), retained)
  assert.deepEqual(copy(composer.selectedTrialErrors.value), report.nodes[1].errors)
  assert.deepEqual(copy(composer.selectedTrialSuggestions.value), report.nodes[1].suggestions)
  composer.updateSelectedStep({ expectedOutput: '汇总已认证人群经营表现，列出待跟进人群和对应运营建议。' })
  await nextTick()
  assert.equal(create.isTestCurrent.value, false)
  assert.equal(trial.stale.value, true)
  assert.equal(create.trialGate.value.ok, false)
  assert.deepEqual(copy(create.testReport.value), retained, 'editing must retain the failed report as diagnostic history')
  await create.submitPackage()
  assert.equal(events.length, 0)
  create.goNext()
  assert.equal(create.activeStep.value, 3)
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(create.trialGate.value.ok, true)
  assert.equal(create.testRequest.value.mockDataPhase, 'retry')
  assert.equal(trial.stale.value, false)
  const [first, second] = create.testReport.value.nodes
  assert.ok(first.output && second.output)
  assert.equal(first.outputSource, 'fixture')
  assert.equal(second.outputSource, 'fixture')
  assert.deepEqual(first.downstream.map(({ nodeId, status, sentValue, receivedValue }) => ({ nodeId, status, sentValue, receivedValue })), [{ nodeId: second.id, status: 'received', sentValue: first.output, receivedValue: first.output }])
  assert.equal(second.inputs.find(input => input.source === 'upstream' && input.nodeId === first.id)?.value, first.output)
  assert.deepEqual(copy(create.trialErrors.value), {})
  assert.deepEqual(copy(create.testRequest.value.sampleOutputs), {})
  create.goNext()
  assert.equal(create.activeStep.value, 4)
  await create.submitPackage()
  assert.equal(events.length, 1)
  assert.equal(events[0][0], 'submitted')
  assert.equal(store.findPackage(events[0][1].id).status, 'review')
  assert.equal(store.reviewDecision(events[0][1].id, create.actor.value).ok, false)

  const fresh = flow()
  await startLinkedTrial(fresh)
  assert.deepEqual(fresh.create.testReport.value.nodes.map(node => node.status), ['completed', 'blocked'], 'a fresh creation must repeat the same failure and repair experience')
  assert.equal(fresh.create.chain.value[1].task, '')
})

test('linked nodes can retry unchanged with complete data and a fresh creation restores the initial mixed fixture', async () => {
  const current = flow()
  const { create, trial } = current
  await startLinkedTrial(current)
  const originalChain = copy(create.chain.value)
  const failedOutput = create.testReport.value.nodes[1].output
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(create.testRequest.value.mockDataPhase, 'retry')
  assert.equal(create.trialGate.value.ok, true)
  assert.deepEqual(copy(create.chain.value), originalChain)
  assert.notEqual(create.testReport.value.nodes[1].output, failedOutput)
  const fresh = flow()
  await startLinkedTrial(fresh)
  assert.equal(fresh.create.testRequest.value.mockDataPhase, undefined)
  assert.deepEqual(fresh.create.testReport.value.nodes.map(node => node.status), ['completed', 'blocked'])
})
