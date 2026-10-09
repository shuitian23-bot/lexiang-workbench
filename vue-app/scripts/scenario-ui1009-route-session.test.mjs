import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick, shallowRef, ssrContextKey } from 'vue'
import { matchedRouteKey } from 'vue-router'

test('dedicated package creation returns results and focus to the independently cached list', async t => {
  const previousGlobals = Object.fromEntries(['localStorage', 'sessionStorage', 'document'].map(key => [key, globalThis[key]]))
  const entries = new Map()
  globalThis.localStorage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  }
  globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  globalThis.document = { title: '', querySelector() { return null }, addEventListener() {}, removeEventListener() {} }
  const host = createHttpServer()
  const server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'error', appType: 'custom',
    server: { middlewareMode: true, hmr: { server: host } },
    plugins: [{
      name: 'route-session-environment', enforce: 'pre',
      transform(source, id) {
        // Keep the production route table and guards; only replace the browser environment.
        if (id.endsWith('/src/router/index.ts')) return source.replaceAll('createWebHistory', 'createMemoryHistory')
        if (id.endsWith('.vue')) return source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
      }
    }]
  })
  const roots = []
  try {
    const [{ default: View }, { default: router }, { useAppStore }, { useScenarioSkillPackagesStore }] = await Promise.all([
      server.ssrLoadModule('/src/views/agent/AgentSkillsView.vue'),
      server.ssrLoadModule('/src/router/index.ts'),
      server.ssrLoadModule('/src/stores/app.ts'),
      server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts')
    ])
    const pinia = createPinia()
    setActivePinia(pinia)
    const account = useAppStore()
    account.user = 'route-session-owner'
    account.permissions = ['*']
    account.notify = () => {}
    const store = useScenarioSkillPackagesStore()
    const renderer = createRenderer({
      createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
      insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
      parentNode: () => null, nextSibling: () => null
    })
    function mountView() {
      let state
      const app = renderer.createApp({
        setup() {
          state = View.setup({}, { expose() {} })
          return () => h('div')
        }
      })
      app.use(pinia)
      app.use(router)
      app.provide(ssrContextKey, {})
      app.provide(matchedRouteKey, shallowRef(router.currentRoute.value.matched[0]))
      app.mount({})
      roots.push(app)
      return state
    }
    async function settleNavigation() {
      // Returning to the list consumes a result query in a second navigation.
      await new Promise(resolve => setImmediate(resolve))
      await nextTick()
    }
    function observeRow(list, id) {
      const calls = { focus: 0, scroll: 0 }
      list.packageRowElements.set(id, {
        focus() { calls.focus += 1 },
        scrollIntoView() { calls.scroll += 1 }
      })
      return calls
    }

    await router.push({ path: '/agent/skills', query: { tab: 'packages' } })
    const list = mountView()
    await t.test('the real route table retains account enablement and gives creation its own page identity', async () => {
      assert.equal(router.resolve('/account-enable-request').meta.public, true)
      await list.openPackageCreate()
      await nextTick()
      assert.equal(router.currentRoute.value.path, '/agent/scenario-package-create')
      assert.equal(router.currentRoute.value.meta.pageId, 'agent.scenarioPackageCreate')
    })

    // AppLayout keys its KeepAlive views by route path. These two live setups represent
    // the cached list and dedicated creator, sharing the real router and real stores.
    const creator = mountView()
    await t.test('the dedicated page starts a fresh authorized session', () => {
      assert.equal(Boolean(creator.isPackageCreate.value), true)
      assert.equal(creator.packageEditId.value, '')
      assert.equal(creator.editingPackage.value, undefined)
      assert.equal(creator.newPackageSessionOwner.value, 'route-session-owner')
      assert.equal(account.activeStaticTabId, 'agent.scenarioPackageCreate')
    })
    await t.test('account changes cannot retain the previous author session or bypass author permissions', async () => {
      account.user = 'read-only-account'
      account.permissions = []
      await nextTick()
      assert.equal(creator.canCreatePackage.value, false)
      assert.equal(creator.editingPackage.value, undefined)
      assert.notEqual(creator.newPackageSessionOwner.value, 'route-session-owner')
      account.user = 'route-session-owner'
      account.permissions = ['*']
      await nextTick()
      assert.equal(Boolean(creator.isPackageCreate.value), true)
    })
    await t.test('cancel restores the actual list button focus, preserves filters and resets the next session', async () => {
      let focusCalls = 0
      list.activeCreateButton.value = { focus() { focusCalls += 1 } }
      list.packageKeyword.value = 'keep-my-search'
      const previousSession = creator.packageCreateSession.value
      await creator.closePackageCreate()
      await settleNavigation()
      assert.equal(router.currentRoute.value.path, '/agent/skills')
      assert.deepEqual(router.currentRoute.value.query, { tab: 'packages' })
      assert.equal(focusCalls, 1)
      assert.equal(list.packageKeyword.value, 'keep-my-search')
      await list.openPackageCreate()
      await nextTick()
      assert.ok(creator.packageCreateSession.value > previousSession)
      assert.equal(Boolean(creator.isPackageCreate.value), true)
    })
    const saved = store.saveDraft({
      id: 'route-session-draft', name: '专用页返回草稿', description: '', targetAudience: '',
      ownerId: 'route-session-owner', steps: []
    }, { id: 'route-session-owner', permissions: ['*'] })
    const rowCalls = observeRow(list, saved.id)
    await t.test('save clears stale list filters and focuses the newly saved draft in the actual list', async () => {
      list.packageKeyword.value = 'hide-the-new-package'
      list.packageStatusFilter.value = 'disabled'
      assert.equal(saved.status, 'draft')
      await creator.handlePackageSaved(saved)
      await settleNavigation()
      assert.equal(router.currentRoute.value.path, '/agent/skills')
      assert.deepEqual(router.currentRoute.value.query, { tab: 'packages' })
      assert.equal(list.packageKeyword.value, '')
      assert.equal(list.packageStatusFilter.value, 'draft')
      assert.equal(list.highlightedPackageId.value, saved.id)
      assert.ok(list.filteredScenarioPackages.value.some(item => item.id === saved.id))
      assert.deepEqual(rowCalls, { focus: 1, scroll: 1 })
    })
    await t.test('submission completion selects the review list and focuses the result without changing domain state', async () => {
      await list.openPackageCreate()
      list.packageKeyword.value = 'old-search'
      list.packageStatusFilter.value = 'disabled'
      const previousRecord = JSON.stringify(store.findPackage(saved.id))
      // Exercise the child's completion event; domain submission is covered by the
      // scenario workflow suites. This navigation handler must never submit itself.
      await creator.handlePackageSubmitted(saved)
      await settleNavigation()
      assert.deepEqual(router.currentRoute.value.query, { tab: 'packages' })
      assert.equal(list.packageKeyword.value, '')
      assert.equal(list.packageStatusFilter.value, 'review')
      assert.equal(list.highlightedPackageId.value, saved.id)
      assert.deepEqual(rowCalls, { focus: 2, scroll: 2 })
      assert.equal(JSON.stringify(store.findPackage(saved.id)), previousRecord)
    })
  } finally {
    for (const app of roots.reverse()) app.unmount()
    await server.close()
    host.close()
    for (const [key, value] of Object.entries(previousGlobals)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
