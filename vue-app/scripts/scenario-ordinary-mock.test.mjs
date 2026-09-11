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
const skillIds = ['product-knowledge', 'employee-certification-insight']
const reviewer = { id: 'ordinary-mock-independent-reviewer', permissions: ['scenario-package:review'] }
afterEach(() => { for (const host of mounted.splice(0).reverse()) host.unmount() })
after(async () => {
  await server.close()
  httpHost.close()
  if (previousStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = previousStorage
})

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

async function flow() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const account = useAppStore()
  account.user = 'ordinary-mock-creator'
  account.permissions = ['*']
  const store = useScenarioSkillPackagesStore()
  const events = []
  const trialEvents = []
  const { state: create } = mount(Create, reactive({}), pinia, (...event) => events.push(event))
  const { state: composer, exposed } = mount(Composer, reactive({
    allowTrialExample: false,
    get skills() { return create.publishedSkills.value },
    get modelValue() { return create.chain.value },
    get trialErrors() { return create.trialErrors.value },
    get trialSuggestions() { return create.trialSuggestions.value },
    get trialStale() { return !create.isTestCurrent.value },
  }), pinia, (event, value) => { if (event === 'update:modelValue') create.chain.value = value })
  create.composer.value = exposed
  const { state: trial } = mount(Trial, reactive({
    get draft() { return create.currentDraft() },
    get skills() { return create.publishedSkills.value },
    get actor() { return create.actor.value },
    get modelValue() { return create.testRequest.value },
    get report() { return create.testReport.value },
    get disabled() { return !create.canEditDraft.value },
  }), pinia, (event, value) => {
    trialEvents.push([event, value])
    if (event === 'update:modelValue') create.testRequest.value = value
    if (event === 'update:report') create.testReport.value = value
    if (event === 'running') create.trialRunning.value = value
    if (event === 'edit-chain') create.returnToComposition(value)
  })
  for (const [index, id] of skillIds.entries()) {
    composer.addSkill(id, { x: 48 + index * 376, y: 96 })
    await nextTick()
  }
  assert.equal(composer.connectNodes(create.chain.value[0].id, create.chain.value[1].id), true)
  await nextTick()
  assert.ok(create.chain.value.every(step => step.task === '' && step.expectedOutput === ''), 'ordinary additions must keep task and expected output inputs empty')
  return { pinia, account, store, create, composer, trial, events, trialEvents }
}

async function renderTrial(current) {
  const { create, trial, pinia } = current
  const app = createSSRApp({ ...Trial, setup() { return trial } }, {
    draft: create.currentDraft(),
    skills: create.publishedSkills.value,
    actor: create.actor.value,
    modelValue: create.testRequest.value,
    report: create.testReport.value,
    disabled: !create.canEditDraft.value,
  })
  app.use(pinia)
  return renderToString(app)
}

test('ordinary linked nodes use published tasks and return one valid and one invalid data sample', async () => {
  const { create, trial } = await flow()
  const raw = copy(create.chain.value)
  const draft = create.currentDraft()
  assert.deepEqual(draft.steps.map(step => step.task), skillIds.map(id => create.publishedSkills.value.find(skill => skill.id === id).description))
  assert.deepEqual(copy(create.chain.value), raw, 'resolving default tasks cannot populate or mutate configuration inputs')
  create.goNext()
  create.goNext()
  assert.equal(create.activeStep.value, 3)
  await trial.runTrial()
  await nextTick()
  assert.equal(create.testRequest.value.mockDataMode, 'mixed-feedback')
  const [first, second] = create.testReport.value.nodes
  assert.deepEqual([first.status, second.status], ['completed', 'blocked'])
  assert.ok(first.output && second.output, 'the failed data fixture must retain actual feedback, rather than report only a missing task')
  assert.match(second.output, /共有\s*3\s*名员工/)
  assert.doesNotMatch(second.output, /已认证|待补充材料/)
  assert.match(second.errors.join(' '), /缺失|缺少|未提供|未返回/)
  assert.doesNotMatch(second.errors.join(' '), /本节点任务尚未填写/)
  assert.ok(second.errors.length && second.suggestions.length)
  assert.equal(second.inputs.find(input => input.source === 'upstream' && input.nodeId === first.id)?.value, first.output)
  assert.equal(create.trialGate.value.ok, false)
})

async function startTrial(current) {
  current.create.goNext()
  current.create.goNext()
  assert.equal(current.create.activeStep.value, 3)
  await current.trial.runTrial()
  await nextTick()
}

test('repairing the failed output contract retains guidance, requires rerun, and saves runnable tasks for independent review', async () => {
  const current = await flow()
  const { create, composer, trial, store, events } = current
  await startTrial(current)
  const report = copy(create.testReport.value)
  assert.deepEqual(report.nodes.map(node => node.status), ['completed', 'blocked'])
  const failed = report.nodes[1]
  assert.equal(trial.activeNodeId.value, failed.id)
  assert.ok(failed.output && failed.errors.length && failed.suggestions.length)
  assert.match(failed.suggestions.join(' '), /预期输出/)
  await create.submitPackage()
  assert.equal(events.length, 0)

  trial.returnToChain(failed.id)
  await nextTick()
  assert.equal(create.activeStep.value, 2)
  assert.equal(composer.selectedStepId.value, failed.id)
  assert.deepEqual(copy(composer.selectedTrialErrors.value), failed.errors)
  assert.deepEqual(copy(composer.selectedTrialSuggestions.value), failed.suggestions)
  assert.deepEqual(copy(create.testReport.value), report)
  composer.updateSelectedStep({ expectedOutput: '输出总人数、已认证人数和待补材料人数。' })
  await nextTick()
  assert.equal(create.chain.value[1].task, '', 'using the published task is independent of editing the failed output contract')
  assert.equal(create.isTestCurrent.value, false)
  assert.equal(trial.stale.value, true)
  assert.equal(create.trialGate.value.ok, false)
  assert.deepEqual(copy(create.testReport.value), report, 'the prior report must remain available after a repair')
  assert.deepEqual(copy(composer.selectedTrialErrors.value), failed.errors)
  assert.deepEqual(copy(composer.selectedTrialSuggestions.value), failed.suggestions)
  await create.submitPackage()
  assert.equal(events.length, 0, 'editing alone cannot submit the failed or stale trial')
  create.goNext()
  assert.equal(create.activeStep.value, 3)
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(create.testRequest.value.mockDataMode, 'mixed-feedback')
  assert.equal(create.trialGate.value.ok, true)
  assert.equal(trial.stale.value, false)
  const [first, second] = create.testReport.value.nodes
  assert.notEqual(second.output, failed.output, 'a repair must return the normal data fixture, not relabel the failed feedback')
  assert.equal(second.inputs.find(input => input.source === 'upstream' && input.nodeId === first.id)?.value, first.output)
  assert.equal(first.downstream[0].status, 'received')
  assert.deepEqual(copy(create.trialErrors.value), {})
  assert.deepEqual(copy(create.testRequest.value.sampleOutputs), {})

  create.goNext()
  assert.equal(create.activeStep.value, 4)
  await create.submitPackage()
  assert.equal(events.length, 1)
  assert.equal(events[0][0], 'submitted')
  const submitted = store.findPackage(events[0][1].id)
  assert.equal(submitted.status, 'review')
  const expectedTasks = create.currentDraft().steps.map(step => step.task)
  assert.ok(expectedTasks.every(task => task.trim()))
  assert.deepEqual(submitted.steps.map(step => step.task), expectedTasks)
  const beforeSelfReview = copy(submitted)
  assert.equal(store.reviewDecision(submitted.id, create.actor.value).ok, false)
  assert.throws(() => store.approvePackage(submitted.id, create.actor.value), /本人|自己|其他管理员/)
  assert.deepEqual(copy(store.findPackage(submitted.id)), beforeSelfReview)
  assert.equal(store.prepareRunPlan(submitted.id, create.actor.value).status, 'blocked')
  assert.equal(store.reviewDecision(submitted.id, reviewer).ok, true)
  const published = store.approvePackage(submitted.id, reviewer)
  assert.equal(published.status, 'published')
  const runPlan = store.prepareRunPlan(published.id, create.actor.value)
  assert.notEqual(runPlan.status, 'blocked')
  assert.deepEqual(runPlan.steps.map(step => step.task), expectedTasks, 'published execution must retain the exact effective tasks used during trial')
})

test('unchanged retries and layout-only changes use complete mock feedback, while a fresh ordinary flow repeats the initial failure', async () => {
  const current = await flow()
  const { create, composer, trial } = current
  await startTrial(current)
  const report = copy(create.testReport.value)
  const raw = copy(create.chain.value)
  assert.deepEqual(report.nodes.map(node => node.status), ['completed', 'blocked'])
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.notEqual(create.testReport.value.nodes[1].output, report.nodes[1].output)
  assert.equal(create.testRequest.value.mockDataPhase, 'retry')
  assert.deepEqual(copy(create.chain.value), raw, 'the complete retry fixture cannot silently edit node configuration')
  assert.equal(create.trialGate.value.ok, true)
  trial.returnToChain(report.nodes[1].id)
  await nextTick()
  composer.updateSelectedStep({ position: { x: 650, y: 275 } })
  await nextTick()
  create.goNext()
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.notEqual(create.testReport.value.nodes[1].output, report.nodes[1].output)
  assert.equal(create.trialGate.value.ok, true)
  assert.equal(create.testRequest.value.mockDataMode, 'mixed-feedback')
  const fresh = await flow()
  await startTrial(fresh)
  assert.equal(fresh.create.testRequest.value.mockDataPhase, undefined)
  assert.deepEqual(fresh.create.testReport.value.nodes.map(node => node.status), ['completed', 'blocked'])
})

for (const route of ['top return button', 'failed node return button', 'footer previous button', 'composition step tab']) {
  test(`returning through ${route} and retrying unchanged uses complete feedback`, async () => {
    const current = await flow()
    const { create, composer, trial } = current
    await startTrial(current)
    const failedReport = copy(create.testReport.value)
    const failed = failedReport.nodes[1]
    const originalChain = copy(create.chain.value)
    if (route === 'top return button') trial.returnToChain()
    if (route === 'failed node return button') trial.returnToChain(failed.id)
    if (route === 'footer previous button') create.goPrevious()
    if (route === 'composition step tab') create.goToStep(2)
    await nextTick()
    assert.equal(create.activeStep.value, 2)
    assert.deepEqual(copy(create.testReport.value), failedReport, 'returning to configuration preserves node errors and suggestions')
    if (route === 'failed node return button') {
      assert.equal(composer.selectedStepId.value, failed.id)
      assert.deepEqual(copy(composer.selectedTrialErrors.value), failed.errors)
      assert.deepEqual(copy(composer.selectedTrialSuggestions.value), failed.suggestions)
    }
    create.goNext()
    assert.equal(create.activeStep.value, 3)
    assert.deepEqual(copy(create.chain.value), originalChain)
    await trial.runTrial()
    await nextTick()
    assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
    assert.equal(create.testRequest.value.mockDataPhase, 'retry')
    assert.equal(create.trialGate.value.ok, true)
    assert.equal(create.isTestCurrent.value, true)
    assert.notEqual(create.testReport.value.nodes[1].output, failed.output)
    assert.deepEqual(copy(create.trialErrors.value), {})
  })
}

test('an unchanged second trial can submit the tested effective tasks for independent approval', async () => {
  const current = await flow()
  const { create, trial, store, events } = current
  await startTrial(current)
  const raw = copy(create.chain.value)
  const effectiveTasks = create.currentDraft().steps.map(step => step.task)
  assert.ok(effectiveTasks.every(task => task.trim()))
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.deepEqual(copy(create.chain.value), raw)
  create.goNext()
  assert.equal(create.activeStep.value, 4)
  await create.submitPackage()
  assert.equal(events.length, 1)
  const submitted = store.findPackage(events[0][1].id)
  assert.equal(submitted.status, 'review')
  assert.deepEqual(submitted.steps.map(step => step.task), effectiveTasks)
  assert.equal(submitted.testRequest.mockDataPhase, 'retry')
  assert.equal(store.reviewDecision(submitted.id, create.actor.value).ok, false)
  assert.throws(() => store.approvePackage(submitted.id, create.actor.value), /本人|自己|其他管理员/)
  assert.equal(store.reviewDecision(submitted.id, reviewer).ok, true)
  const published = store.approvePackage(submitted.id, reviewer)
  const plan = store.prepareRunPlan(published.id, create.actor.value)
  assert.notEqual(plan.status, 'blocked')
  assert.deepEqual(plan.steps.map(step => step.task), effectiveTasks)
})

test('the retry phase survives a missing report without leaking into a fresh creation', async () => {
  const current = await flow()
  const { create, trial } = current
  await startTrial(current)
  await trial.runTrial()
  await nextTick()
  assert.equal(create.testRequest.value.mockDataPhase, 'retry')
  create.testReport.value = null
  await nextTick()
  assert.equal(create.trialGate.value.ok, false)
  await trial.runTrial()
  await nextTick()
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(create.trialGate.value.ok, true)
  const fresh = await flow()
  await startTrial(fresh)
  assert.equal(fresh.create.testRequest.value.mockDataPhase, undefined)
  assert.deepEqual(fresh.create.testReport.value.nodes.map(node => node.status), ['completed', 'blocked'])
})

test('retry shows a running state, ignores duplicate clicks, and replaces retained errors with visible success feedback', async () => {
  const current = await flow()
  const { create, trial, trialEvents } = current
  await startTrial(current)
  const failedReport = copy(create.testReport.value)
  const eventStart = trialEvents.length
  const firstClick = trial.runTrial()
  const repeatedClick = trial.runTrial()
  await nextTick()
  assert.equal(trial.running.value, true, 'running must stay visible for a rendered frame after the click')
  assert.equal(create.trialRunning.value, true)
  assert.equal(trial.locked.value, true)
  assert.deepEqual(copy(create.testReport.value), failedReport, 'the previous report must remain available while retrying')
  assert.match(await renderTrial(current), /<button\b[^>]*data-trial-run[^>]*disabled[^>]*>正在试运行…<\/button>/)
  const editCount = trialEvents.filter(([event]) => event === 'edit-chain').length
  trial.returnToChain(failedReport.nodes[1].id)
  assert.equal(trialEvents.filter(([event]) => event === 'edit-chain').length, editCount, 'return navigation is locked while running')
  create.goPrevious()
  assert.equal(create.activeStep.value, 3)
  await Promise.all([firstClick, repeatedClick])
  await nextTick()
  const emitted = trialEvents.slice(eventStart)
  assert.deepEqual(emitted.filter(([event]) => event === 'running').map(([, value]) => value), [true, false])
  assert.equal(emitted.filter(([event]) => event === 'update:modelValue').length, 1)
  assert.equal(emitted.filter(([event]) => event === 'update:report').length, 1)
  assert.equal(trial.running.value, false)
  assert.equal(create.trialRunning.value, false)
  assert.deepEqual(create.testReport.value.nodes.map(node => node.status), ['completed', 'completed'])
  assert.equal(create.trialGate.value.ok, true)
  const html = await renderTrial(current)
  assert.match(html, /data-trial-status[^>]*role="status"[^>]*>[^<]*(?:成功|无错误|通过)[^<]*(?:提交|审核)/)
  assert.doesNotMatch(html, /本轮存在错误，不能提交/)
})

test('a whitespace task inherits the matching published description without replacing explicit node tasks', async () => {
  const { create } = await flow()
  create.chain.value[0].task = ' \n\t '
  create.chain.value[1].task = '仅统计本月已认证员工，并按部门汇总。'
  await nextTick()
  const raw = copy(create.chain.value)
  const draft = create.currentDraft()
  assert.equal(draft.steps[0].task, create.publishedSkills.value.find(skill => skill.id === skillIds[0]).description)
  assert.equal(draft.steps[1].task, raw[1].task)
  assert.deepEqual(copy(create.chain.value), raw)
})

for (const invalid of ['missing catalog entry', 'different published version', 'missing published description', 'blank published description']) {
  test(`an empty task cannot inherit an unsafe fallback from ${invalid}`, async () => {
    const { create, trial } = await flow()
    const catalog = create.publishedSkills.value
    const index = catalog.findIndex(skill => skill.id === skillIds[0])
    const skill = catalog[index]
    if (invalid === 'missing catalog entry') catalog.splice(index, 1)
    if (invalid === 'different published version') Object.assign(skill, { version: 'v9.0.0', online: 'v9.0.0' })
    if (invalid === 'missing published description') delete skill.description
    if (invalid === 'blank published description') skill.description = ' \n\t '
    const raw = copy(create.chain.value)
    assert.equal((create.currentDraft().steps[0].task || '').trim(), '')
    assert.deepEqual(copy(create.chain.value), raw)
    await trial.runTrial()
    await nextTick()
    assert.equal(create.testReport.value.nodes[0].status, 'blocked')
    assert.equal(create.trialGate.value.ok, false)
  })
}
