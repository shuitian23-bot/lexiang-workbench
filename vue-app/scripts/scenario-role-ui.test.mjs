import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, shallowRef } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter, matchedRouteKey } from 'vue-router'

const previousStorage = globalThis.localStorage
const previousDocument = globalThis.document
globalThis.document = { querySelector() { return null } }
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} }
const host = createHttpServer()
const server = await createServer({
  root: new URL('..', import.meta.url).pathname,
  logLevel: 'error', server: { middlewareMode: true, hmr: { server: host } }, appType: 'custom',
  plugins: [{ name: 'role-entry-test-boundaries', enforce: 'pre', transform(source, id) {
    if (id.endsWith('/src/stores/scenarioSkillPackages.ts')) return `
      import { defineStore } from 'pinia'
      import { ref } from 'vue'
      export const useScenarioSkillPackagesStore = defineStore('scenarioRoleEntryTest', () => ({
        packages: ref([]), selectableSkills: ref([]), findPackage: () => undefined, editableDraft: () => null
      }))`
    if (id.endsWith('/src/views/agent/ScenarioSkillPackageCreateView.vue')) return '<template><div data-role-create-form>作者配置</div></template>'
  } }]
})
const [{ default: View }, { default: Footer }, { useAppStore }] = await Promise.all([
  server.ssrLoadModule('/src/views/agent/AgentSkillsView.vue'),
  server.ssrLoadModule('/src/components/sidebar/SidebarFooter.vue'),
  server.ssrLoadModule('/src/stores/app.ts')
])
after(async () => {
  await server.close(); host.close()
  if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage
  if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument
})
const pmPermissions = ['scenario-package:create', 'scenario-package:compose:cross-menu']

async function renderRole(permissions, query = {}, username = 'same-account', path = '/agent/skills') {
  const pinia = createPinia(); setActivePinia(pinia)
  const account = useAppStore(); account.user = username; account.permissions = permissions
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/agent/skills', component: { template: '<div />' } },
    { path: '/agent/scenario-package-create', component: { template: '<div />' } }
  ] })
  await router.push({ path, query: { tab: 'packages', ...query } })
  let state
  const app = createSSRApp({ ...View, setup(props, context) { state = View.setup(props, context); return state } })
  app.use(pinia); app.use(router); app.provide(matchedRouteKey, shallowRef(router.currentRoute.value.matched[0]))
  return { html: await renderToString(app), state, router }
}

for (const [name, permissions] of [['review-only administrator', ['scenario-package:review']], ['read-only account', []], ['incomplete author permissions', ['scenario-package:create']]]) {
  test(`${name} has no package-create entry and cannot open either direct create route`, async () => {
    const list = await renderRole(permissions)
    assert.doesNotMatch(list.html, />创建场景技能包</)
    await list.state.openPackageCreate()
    assert.equal(list.router.currentRoute.value.path, '/agent/skills')
    assert.equal(list.router.currentRoute.value.query.mode, undefined)
    for (const path of ['/agent/skills', '/agent/scenario-package-create']) {
      const direct = await renderRole(permissions, { mode: 'create' }, 'same-account', path)
      assert.equal(Boolean(direct.state.isPackageCreate.value), false)
      assert.doesNotMatch(direct.html, /data-role-create-form/)
    }
  })
}

for (const [name, permissions] of [['PM author', pmPermissions], ['wildcard administrator', ['*']], ['administrator with author permissions', ['scenario-package:review', ...pmPermissions]]]) {
  test(`${name} opens the dedicated entry while both direct creation routes remain available`, async () => {
    const list = await renderRole(permissions, {}, 'admin')
    assert.match(list.html, />创建场景技能包</)
    await list.state.openPackageCreate()
    assert.equal(list.router.currentRoute.value.path, '/agent/scenario-package-create')
    assert.equal(list.router.currentRoute.value.query.mode, undefined)
    for (const path of ['/agent/skills', '/agent/scenario-package-create']) {
      const direct = await renderRole(permissions, path === '/agent/skills' ? { mode: 'create' } : {}, 'admin', path)
      assert.equal(Boolean(direct.state.isPackageCreate.value), true)
      assert.match(direct.html, /data-role-create-form/)
    }
  })
}

test('a signed-out account cannot open either creation route even with stale author permissions', async () => {
  for (const path of ['/agent/skills', '/agent/scenario-package-create']) {
    const direct = await renderRole(pmPermissions, { mode: 'create' }, '', path)
    assert.equal(Boolean(direct.state.isPackageCreate.value), false)
    assert.doesNotMatch(direct.html, /data-role-create-form/)
  }
})

test('the account menu hides only package creation when author access is absent', async () => {
  for (const allowed of [false, true]) {
    const context = {}
    await renderToString(createSSRApp(Footer, { userMenuVisible: true, canCreateScenarioPackage: allowed }), context)
    const menu = context.teleports.body
    assert.equal(/<b\b[^>]*>创建场景技能包<\/b>/.test(menu), allowed)
    for (const name of ['创建 Skill', 'Skill Hub', '权限管理']) assert.match(menu, new RegExp(`<b\\b[^>]*>${name}</b>`))
  }
})
