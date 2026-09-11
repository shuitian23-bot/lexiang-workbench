import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, nextTick, shallowRef } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter, matchedRouteKey } from 'vue-router'

const previousStorage = globalThis.localStorage
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} }
const root = fileURLToPath(new URL('../', import.meta.url))
const httpHost = createHttpServer()
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: { server: httpHost } }, appType: 'custom' })
const [{ default: View }, { useAppStore }, { useScenarioSkillPackagesStore }] = await Promise.all([
  server.ssrLoadModule('/src/views/agent/AgentSkillsView.vue'),
  server.ssrLoadModule('/src/stores/app.ts'),
  server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts'),
])
const copy = value => JSON.parse(JSON.stringify(value))
after(async () => {
  await server.close()
  httpHost.close()
  if (previousStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = previousStorage
})

async function fixture({ actor = 'independent-package-reviewer', permissions = ['*'], mode, recordId = 'seed-scenario-pending-review' } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const account = useAppStore()
  account.user = actor
  account.permissions = permissions
  const notices = []
  account.notify = message => notices.push(message)
  const store = useScenarioSkillPackagesStore()
  const record = store.findPackage(recordId)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/agent/skills', component: { template: '<div />' } }] })
  await router.push('/agent/skills?tab=packages')
  let state
  const Prepared = { ...View, setup(props, context) {
    state = View.setup(props, context)
    if (mode !== undefined) state.openPackageDetail(record, undefined, mode)
    return state
  } }
  const app = createSSRApp(Prepared)
  app.use(pinia)
  app.use(router)
  app.provide(matchedRouteKey, shallowRef(router.currentRoute.value.matched[0]))
  const context = {}
  const html = await renderToString(app, context)
  await nextTick()
  return { state, store, account, record, notices, html, dialog: context.teleports?.body || '' }
}

function rowActions(html, name) {
  const row = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].find(match => match[0].includes(name))?.[0]
  assert.ok(row, `missing package row: ${name}`)
  return [...row.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)].map(match => match[1].trim())
}

test('an independent administrator sees separate detail, approve and reject actions for a pending package', async () => {
  const { html, record, store } = await fixture()
  assert.deepEqual(rowActions(html, record.name), ['详情', '审批', '驳回'])
  assert.equal(store.findPackage(record.id).status, 'review')
})

for (const audience of [
  { label: 'the original creator', actor: 'pm-li' },
  { label: 'an account without review permission', permissions: [] },
  { label: 'a published package', recordId: 'seed-workplace-certification-operations' },
]) {
  test(`${audience.label} retains detail without approve or reject row actions`, async () => {
    const { state, html, record } = await fixture(audience)
    assert.deepEqual(rowActions(html, record.name), ['详情'])
    assert.equal(state.canReviewPackage(record), false)
    for (const mode of ['approve', 'reject']) {
      state.openPackageDetail(record, undefined, mode)
      assert.equal(state.packageDetailId.value, '', 'unauthorized review entry must not open a dialog')
      assert.equal(state.packageReviewMode.value, 'detail')
    }
    state.openPackageDetail(record)
    assert.equal(state.packageDetailId.value, record.id, 'read-only detail remains available')
    assert.equal(state.packageReviewMode.value, 'detail')
  })
}

for (const mode of ['detail', 'approve', 'reject']) {
  test(`${mode} opens a distinct dialog without changing package state or audit history`, async () => {
    const { state, store, record, dialog } = await fixture({ mode })
    assert.equal(state.packageReviewMode.value, mode)
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
    const heading = dialog.match(/<h3\b[^>]*>(.*?)<\/h3>/)?.[1]
    assert.ok(heading?.includes(record.name))
    const footer = dialog.slice(dialog.lastIndexOf('class="skill-hub-detail-foot"'))
    if (mode === 'detail') {
      assert.equal(heading, record.name)
      assert.doesNotMatch(dialog, /<textarea\b|scenario-package-review-section/)
      assert.doesNotMatch(footer, /审批通过并发布|确认驳回/)
    } else {
      assert.ok(heading.includes(mode === 'approve' ? '审批场景技能包' : '驳回场景技能包'))
      assert.match(dialog, /<textarea\b/)
      assert.match(footer, mode === 'approve' ? /审批通过并发布/ : /确认驳回/)
      assert.doesNotMatch(footer, mode === 'approve' ? /确认驳回/ : /审批通过并发布/)
      if (mode === 'reject') assert.match(dialog, /驳回原因/)
    }
    state.packageReviewNote.value = '临时备注'
    state.packageReviewError.value = '旧错误'
    state.closePackageDetail()
    await nextTick()
    assert.equal(state.packageDetailId.value, '')
    assert.equal(state.packageReviewMode.value, 'detail')
    state.openPackageDetail(record, undefined, mode)
    assert.equal(state.packageReviewNote.value, '')
    assert.equal(state.packageReviewError.value, '')
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
  })
}

for (const [mode, action] of [['detail', 'approve'], ['detail', 'reject'], ['approve', 'reject'], ['reject', 'approve']]) {
  test(`${mode} mode cannot execute the unrelated ${action} decision`, async () => {
    const { state, store, record, notices } = await fixture({ mode })
    state.packageReviewNote.value = '请完善适用场景。'
    await state.reviewPackage(action)
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
    assert.equal(notices.length, 0)
  })
}

test('rejection requires a nonblank reason and preserves the pending record until confirmed', async () => {
  const { state, store, record, notices } = await fixture({ mode: 'reject' })
  for (const note of ['', ' \n  ']) {
    state.packageReviewNote.value = note
    await state.reviewPackage('reject')
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
    assert.equal(state.packageReviewBusy.value, false)
    assert.equal(state.packageReviewMode.value, 'reject')
    assert.match(state.packageReviewError.value, /请填写驳回原因/)
    assert.equal(notices.length, 0)
  }
  state.packageReviewNote.value = '  请补充企业客户跟进建议的适用范围。  '
  await state.reviewPackage('reject')
  const rejected = store.findPackage(record.id)
  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.reviewNote, '请补充企业客户跟进建议的适用范围。')
  assert.equal(rejected.reviewedBy, 'independent-package-reviewer')
  assert.deepEqual(rejected.auditEvents.map(event => event.type), ['submitted', 'rejected'])
  assert.equal(state.packageReviewMode.value, 'detail')
  assert.equal(state.packageReviewError.value, '')
  assert.equal(state.packageReviewBusy.value, false)
  assert.equal(notices.length, 1)
})

test('approval publishes only after the explicit matching confirmation and records the independent administrator', async () => {
  const { state, store, record, notices } = await fixture({ mode: 'approve' })
  assert.equal(store.findPackage(record.id).status, 'review')
  state.packageReviewNote.value = '  配置与试运行反馈已核对。  '
  await state.reviewPackage('approve')
  const published = store.findPackage(record.id)
  assert.equal(published.status, 'published')
  assert.equal(published.reviewedBy, 'independent-package-reviewer')
  assert.equal(published.reviewNote, '配置与试运行反馈已核对。')
  assert.deepEqual(published.auditEvents.map(event => event.type), ['submitted', 'approved', 'published'])
  assert.equal(state.packageReviewMode.value, 'detail')
  assert.equal(state.packageReviewBusy.value, false)
  assert.equal(notices.length, 1)
})

for (const action of ['approve', 'reject']) {
  for (const change of ['permission lost', 'account becomes the creator']) {
    test(`${action} rechecks authority when ${change} after opening the dialog`, async () => {
      const { state, store, record, account, notices } = await fixture({ mode: action })
      if (change === 'permission lost') account.permissions = []
      else account.user = record.ownerId
      state.packageReviewNote.value = '请补充输入范围。'
      await nextTick()
      assert.equal(state.packageReviewDecision.value.ok, false)
      await state.reviewPackage(action)
      assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
      assert.equal(notices.length, 0)
      assert.equal(state.packageReviewBusy.value, false)
    })
  }

  test(`${action} cannot self-review even when dialog state is set directly`, async () => {
    const { state, store, record, notices } = await fixture({ actor: 'pm-li' })
    state.packageDetailId.value = record.id
    state.packageReviewMode.value = action
    state.packageReviewNote.value = '请补充适用范围。'
    await state.reviewPackage(action)
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
    assert.equal(notices.length, 0)
  })

  test(`${action} ignores an in-flight action and records a later double confirmation only once`, async () => {
    const { state, store, record, notices } = await fixture({ mode: action })
    state.packageReviewNote.value = '已检查，需按本轮意见处理。'
    state.packageReviewBusy.value = true
    await state.reviewPackage(action)
    assert.deepEqual(copy(store.findPackage(record.id)), copy(record))
    assert.equal(notices.length, 0)
    state.packageReviewBusy.value = false
    await Promise.all([state.reviewPackage(action), state.reviewPackage(action)])
    const decided = copy(store.findPackage(record.id))
    assert.equal(decided.auditEvents.filter(event => event.type === (action === 'approve' ? 'approved' : 'rejected')).length, 1)
    assert.equal(notices.length, 1)
    state.packageReviewMode.value = action
    await state.reviewPackage(action)
    assert.deepEqual(copy(store.findPackage(record.id)), decided, 'a stale review dialog must not repeat a completed decision')
    assert.equal(notices.length, 1)
  })
}
