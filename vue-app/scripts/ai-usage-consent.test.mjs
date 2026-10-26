import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

const saved = Object.fromEntries(['window', 'document', 'localStorage', 'fetch'].map(key => [key, globalThis[key]]))
const entries = new Map(), requests = []
const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)), removeItem: key => entries.delete(key) }
globalThis.localStorage = storage
globalThis.window = { localStorage: storage, innerWidth: 1280, location: { origin: 'http://notice.test' } }
globalThis.document = { documentElement: { classList: { add() {}, remove() {} } }, body: { classList: { add() {}, remove() {} } }, querySelector() { return null } }
globalThis.fetch = async (url, options) => { requests.push({ url, body: options?.body }); return { ok: true, json: async () => ({ reply: 'QA isolated reply' }) } }
const host = createHttpServer()
const server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: { server: host } } })
const { useAIStore } = await server.ssrLoadModule('/src/stores/ai.ts')
const { useAppStore } = await server.ssrLoadModule('/src/stores/app.ts')
const { useScenarioSkillPackagesStore } = await server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts')
beforeEach(() => { entries.clear(); requests.length = 0; setActivePinia(createPinia()) })
after(async () => {
  await server.close(); host.close()
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key]
    else globalThis[key] = value
  }
})
function fixture() {
  const app = useAppStore(); app.user = 'notice-alice'; app.permissions = ['*']
  return { app, ai: useAIStore(), scenario: useScenarioSkillPackagesStore() }
}
function pendingApplicationFixture() {
  const { scenario } = fixture()
  const item = JSON.parse(JSON.stringify(scenario.packages.find(row => row.status === 'published' && row.health.status === 'upgrade_required')))
  assert.ok(item)
  for (const row of [item, item.publishedSnapshot].filter(Boolean)) { row.id = 'usage-application-fixture'; row.requiresConfirmation = true }
  storage.setItem('leai_scenario_skill_packages_v1', JSON.stringify({ schemaVersion: 2, packages: [item], seededOwners: [] }))
  setActivePinia(createPinia())
  return { ...fixture(), id: item.id }
}

test('opening, reconsidering and reviewing never grant consent or execute a request', async () => {
  const { ai } = fixture()
  ai.inputText = '保留草稿'
  ai.attachFile({ name: 'draft.txt', text: 'attachment draft' })
  ai.toggleOpen(true)
  assert.equal(ai.open, false)
  assert.equal(ai.usageNoticeOpen, true)
  ai.dismissUsageNotice()
  assert.equal(ai.inputText, '保留草稿')
  assert.equal(ai.attachedFiles.length, 1)
  assert.equal(ai.messages.length, 0)
  ai.reviewUsageNotice()
  await ai.acceptUsageNotice()
  assert.equal(ai.open, false)
  ai.dismissUsageNotice()
  ai.toggleOpen(true)
  assert.equal(ai.usageNoticeMode, 'consent')
  await ai.acceptUsageNotice()
  assert.equal(ai.open, true)
  assert.equal(requests.length, 0)
  ai.toggleOpen(false); ai.toggleOpen(true)
  assert.equal(ai.usageNoticeOpen, false)
})

test('shortcut waits without sending or clearing draft and agreement resumes exactly once', async () => {
  const { ai } = fixture()
  ai.toggleOpen(true)
  ai.quickSend('QA original request', 'portal.home')
  ai.quickSend('QA duplicate must not replace original', 'portal.home')
  assert.equal(ai.inputText, 'QA original request')
  assert.equal(ai.messages.length, 0)
  assert.equal(ai.queuedMessages.length, 0)
  assert.equal(requests.length, 0)
  ai.dismissUsageNotice()
  assert.equal(ai.inputText, 'QA original request')
  ai.quickSend('QA original request', 'portal.home')
  const resumed = ai.acceptUsageNotice()
  await ai.acceptUsageNotice()
  await resumed
  assert.equal(requests.length, 1)
  assert.equal(ai.messages.filter(row => row.role === 'user').length, 1)
  assert.equal(ai.inputText, '')
})

test('direct send and task actions cannot bypass usage agreement', async () => {
  const { ai } = fixture()
  ai.inputText = '批量授权演示'
  await ai.send('dashboard.geo')
  assert.equal(ai.messages.length, 0)
  assert.equal(ai.inputText, '批量授权演示')
  ai.dismissUsageNotice()
  await ai.runTaskAction({ type: 'report', label: 'QA report' }, 'portal.home')
  assert.equal(ai.messages.length, 0)
  ai.dismissUsageNotice()
  assert.equal(requests.length, 0)
})

test('accepting a captured request keeps a newer draft and a task action resumes once', async () => {
  const { ai } = fixture()
  await ai.runTaskAction({ type: 'report', label: 'QA report' }, 'portal.home')
  const resumed = ai.acceptUsageNotice()
  await ai.acceptUsageNotice(); await resumed
  assert.equal(ai.messages.length, 1)
  assert.equal(requests.length, 0)
  setActivePinia(createPinia())
  const fresh = fixture().ai
  fresh.inputText = 'QA original captured request'
  await fresh.send('portal.home')
  fresh.inputText = '更新后的草稿应保留'
  await fresh.acceptUsageNotice()
  assert.equal(fresh.inputText, '更新后的草稿应保留')
  assert.equal(requests.length, 1)
  assert.ok(requests[0].body.includes('QA original captured request'))
  assert.ok(!requests[0].body.includes('更新后的草稿应保留'))
})

test('a pending action is discarded on account changes and a fresh store asks again', async () => {
  const { app, ai } = fixture()
  ai.quickSend('QA account scoped request', 'portal.home')
  app.user = 'notice-bob'
  assert.equal(ai.usageNoticeOpen, false)
  app.user = 'notice-alice'
  await ai.acceptUsageNotice()
  assert.equal(ai.messages.length, 0)
  assert.equal(requests.length, 0)
  ai.toggleOpen(true)
  await ai.acceptUsageNotice()
  app.user = 'notice-bob'; ai.toggleOpen(true)
  assert.equal(ai.usageNoticeOpen, true)
  app.user = 'notice-alice'; ai.toggleOpen(true)
  assert.equal(ai.open, true)
  setActivePinia(createPinia())
  const reloaded = fixture().ai
  reloaded.toggleOpen(true)
  assert.equal(reloaded.open, false)
  assert.equal(reloaded.usageNoticeOpen, true)
  assert.equal(requests.length, 0)
})

test('cancelled application creates no confirmation and agreement rechecks current eligibility', async () => {
  const { ai, app, id } = pendingApplicationFixture()
  assert.equal(ai.applyScenarioPackage(id).ok, true)
  assert.equal(ai.usageNoticeOpen, true)
  assert.equal(ai.messages.length, 0, 'No application message or confirmation ticket before agreement')
  ai.dismissUsageNotice()
  assert.equal(ai.messages.length, 0)
  ai.applyScenarioPackage(id)
  app.permissions = []
  await ai.acceptUsageNotice()
  assert.equal(ai.messages.length, 0, 'Permissions revoked while notice was open must stop application')
  assert.equal(requests.length, 0)
})

test('agreement resumes a scenario once and retains its existing separate workflow confirmation', async () => {
  const { ai, id } = pendingApplicationFixture()
  ai.applyScenarioPackage(id)
  const resumed = ai.acceptUsageNotice()
  await ai.acceptUsageNotice(); await resumed
  const actions = ai.messages.flatMap(row => row.actionItems || []).filter(row => row.type === 'scenario_application_confirm')
  assert.equal(actions.length, 1)
  assert.equal(ai.messages.filter(row => row.role === 'user').length, 1)
  assert.equal(requests.length, 0)
})
