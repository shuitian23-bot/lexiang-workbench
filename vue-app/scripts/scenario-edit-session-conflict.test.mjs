import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, createSSRApp, h, nextTick, reactive, shallowRef, ssrContextKey } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter, matchedRouteKey } from 'vue-router'
import { scenarioPmActor, scenarioPmPermissions } from './helpers/scenarioActors.mjs'

const previousStorage = globalThis.localStorage
const data = new Map()
globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
const host = createHttpServer()
const server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'error', server: { middlewareMode: true, hmr: { server: host } }, appType: 'custom' })
const [{ default: View }, { default: Create }, { useAppStore }, { useScenarioSkillPackagesStore }, domain, sim] = await Promise.all([
  server.ssrLoadModule('/src/views/agent/AgentSkillsView.vue'),
  server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageCreateView.vue'),
  server.ssrLoadModule('/src/stores/app.ts'), server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts'),
  server.ssrLoadModule('/src/domain/scenarioSkillPackages.js'), server.ssrLoadModule('/src/domain/scenarioPackageTesting.js')
])
const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
const mounted = []
const actor = scenarioPmActor('session-owner', [])
const packageId = 'cross-page-edit-session'
beforeEach(() => data.clear())
afterEach(() => { for (const app of mounted.splice(0).reverse()) app.unmount() })
after(async () => {
  await server.close(); host.close()
  if (previousStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = previousStorage
})

function scope() {
  const pinia = createPinia(); setActivePinia(pinia)
  const account = useAppStore(); account.user = actor.id; account.permissions = [...actor.permissions]
  const store = useScenarioSkillPackagesStore()
  actor.permissions = scenarioPmPermissions(store.selectableSkills, [packageId])
  account.permissions = [...actor.permissions]
  return { pinia, account, store }
}

async function openedEditor() {
  const current = scope()
  const catalog = current.store.selectableSkills.filter(item => ['employee-certification-insight', 'workplace-segment-operations'].includes(item.id))
  current.store.saveDraft({
    id: packageId, name: '已保存的场景', description: '分析职场认证与经营情况。', targetAudience: '运营人员', ownerId: actor.id,
    steps: catalog.map((item, index) => domain.createPinnedScenarioStep(item, { id: `n${index}`, predecessorId: index ? 'n0' : null, task: '分析当前授权范围内的业务情况。' }))
  }, actor)
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/agent/skills', component: { template: '<div />' } },
    { path: '/elsewhere', component: { template: '<div />' } }
  ] })
  await router.push({ path: '/agent/skills', query: { tab: 'packages', mode: 'create', edit: packageId } })
  let view, editor
  const events = []
  // Keep the real setup lifetimes mounted so route and permission watchers remain active.
  const root = renderer.createApp({ setup() { view = View.setup({}, { expose() {} }); return () => h('div') } })
  root.use(current.pinia); root.use(router)
  root.provide(ssrContextKey, {}); root.provide(matchedRouteKey, shallowRef(router.currentRoute.value.matched[0]))
  const previousDocument = globalThis.document
  globalThis.document = { title: '', querySelector() { return null } }
  try { root.mount({}) }
  finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
  mounted.push(root)
  const props = reactive({ get draft() { return view.editingPackage.value } })
  const child = renderer.createApp({ setup() {
    editor = Create.setup(props, { expose() {}, emit: (...event) => events.push(event) })
    return () => h('div')
  } })
  child.use(current.pinia); child.provide(ssrContextKey, {}); child.mount({}); mounted.push(child)
  async function editorHtml() {
    const app = createSSRApp({ ...Create, setup() { return editor } }, { draft: view.editingPackage.value }); app.use(current.pinia)
    return renderToString(app)
  }
  return { ...current, router, view, editor, events, editorHtml }
}

for (const change of ['submitted for review', 'saved a newer draft', 'removed by reset']) {
  test(`a save conflict keeps local input and disables writing after another page ${change}`, async () => {
    const current = await openedEditor()
    const opened = current.view.editingPackage.value
    current.editor.form.value.name = '本页尚未保存的修改'
    current.editor.chain.value[0].task = '本页尚未保存的节点任务。'
    await nextTick()
    const second = scope()
    const latest = second.store.editableDraft(packageId, actor)
    if (change === 'submitted for review') {
      const request = sim.createScenarioSimulationRequest(latest)
      second.store.submitDraft({ ...latest, testRequest: request, testReport: sim.runScenarioSimulation(latest, second.store.selectableSkills, request, actor) }, actor)
    } else if (change === 'saved a newer draft') second.store.saveDraft({ ...latest, name: '其他页面的新内容' }, actor)
    else second.store.resetToInitialMock()
    const disk = data.get('leai_scenario_skill_packages_v1')

    await current.editor.savePackageDraft(); await nextTick()
    assert.equal(Boolean(current.view.isPackageCreate.value), true, 'the parent must not unmount the editor on a failed save')
    assert.equal(current.view.editingPackage.value, opened, 'the opened revision must remain an independent session snapshot')
    assert.equal(current.editor.form.value.name, '本页尚未保存的修改')
    assert.equal(current.editor.chain.value[0].task, '本页尚未保存的节点任务。')
    assert.equal(current.editor.canEditDraft.value, false)
    assert.deepEqual(current.events, [])
    const html = await current.editorHtml()
    assert.match(html, /本页尚未保存的修改/)
    assert.match(html, /场景技能包已在其他页面更新/)
    assert.match(html, /<button\b[^>]*disabled[^>]*>保存草稿<\/button>/)
    current.editor.activeStep.value = 4
    assert.match(await current.editorHtml(), /<button\b[^>]*disabled[^>]*>重新提交审核<\/button>/)
    await current.editor.savePackageDraft(); await current.editor.submitPackage()
    assert.equal(data.get('leai_scenario_skill_packages_v1'), disk, 'a stale session cannot write or submit the newer record')
    assert.deepEqual(current.events, [])

    await current.view.closePackageCreate(); await nextTick()
    assert.equal(current.view.editingPackage.value, undefined)
    assert.equal(Boolean(current.view.isPackageCreate.value), false)
    await current.router.replace({ path: '/agent/skills', query: { tab: 'packages', mode: 'create', edit: packageId } }); await nextTick()
    if (change === 'saved a newer draft') {
      assert.equal(current.view.editingPackage.value.name, '其他页面的新内容')
      assert.notEqual(current.view.editingPackage.value.baseUpdatedAt, opened.baseUpdatedAt)
    } else {
      assert.equal(current.view.editingPackage.value, undefined, 'a pending or removed package cannot start a new edit session')
      assert.equal(Boolean(current.view.isPackageCreate.value), false)
      assert.ok(!current.store.actionsFor(packageId, actor).includes('edit'))
    }
  })
}

test('permission loss locks the existing session and switching accounts clears its snapshot', async () => {
  const current = await openedEditor()
  const opened = current.view.editingPackage.value
  current.editor.form.value.name = '权限变化前的本页修改'
  current.account.permissions = []
  await nextTick()
  assert.equal(current.view.editingPackage.value, opened)
  assert.equal(Boolean(current.view.isPackageCreate.value), true)
  assert.equal(current.editor.canEditDraft.value, false)
  assert.equal(current.editor.form.value.name, '权限变化前的本页修改')
  current.account.user = 'another-owner'; current.account.permissions = scenarioPmPermissions(current.store.selectableSkills, [packageId])
  await nextTick()
  assert.equal(current.view.editingPackage.value, undefined)
  assert.equal(Boolean(current.view.isPackageCreate.value), false)
})

test('leaving the package route clears the opened snapshot before a later visit', async () => {
  const current = await openedEditor()
  assert.ok(current.view.editingPackage.value)
  await current.router.push('/elsewhere'); await nextTick()
  assert.equal(current.view.editingPackage.value, undefined)
})
