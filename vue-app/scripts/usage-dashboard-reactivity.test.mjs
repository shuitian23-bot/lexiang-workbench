import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

// Run the real controller and app store; only the two external identity requests
// are deferred so the footer can read its policy before the response arrives.
const previousFetch = globalThis.fetch
const previousStorage = globalThis.localStorage
const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}
const cacheDir = await mkdtemp(join(tmpdir(), 'usage-access-reactivity-'))
const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({
  root, configFile: false, envFile: false, cacheDir,
  resolve: { alias: { '@': join(root, 'src') } },
  logLevel: 'silent', server: { middlewareMode: true, hmr: false }
})
after(async () => {
  globalThis.fetch = previousFetch
  if (previousStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = previousStorage
  await server.close()
  await rm(cacheDir, { recursive: true, force: true })
})
const { useAppStore } = await server.ssrLoadModule('/src/stores/app.ts')
const { useUsageDashboardAccess } = await server.ssrLoadModule('/src/composables/useUsageDashboardAccess.ts')

function session(user) {
  const requests = []
  globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ url, options, resolve }))
  setActivePinia(createPinia())
  const app = useAppStore()
  app.user = user
  return { app, access: useUsageDashboardAccess(), requests }
}

async function respond(requests, user, permissions = [], start = 0) {
  const batch = requests.slice(start, start + 2)
  assert.deepEqual(batch.map(row => row.url), ['/api/admin/me', '/api/harness/menu'])
  for (const request of batch) {
    assert.equal(request.options.credentials, 'same-origin')
    assert.equal(request.options.cache, 'no-store')
    request.resolve({ ok: true, json: async () => request.url === '/api/admin/me'
      ? { admin: { username: user } } : { menus: {}, permissions } })
  }
  // Drain the actual async loader/controller plus computed consumers.
  await new Promise(resolve => setImmediate(resolve))
  await nextTick()
}

for (const user of ['zhangrui32', 'xinghy4']) {
  test(`首次首页读取后，已验证创建者 ${user} 的入口无需刷新即出现，仍仅可看本人`, async () => {
    const { access, requests } = session(user)
    assert.equal(access.canEnter.value, false)
    assert.equal(access.scope.value, 'none')
    await respond(requests, user)
    assert.equal(access.canEnter.value, true)
    assert.equal(access.scope.value, 'person')
    assert.equal(access.currentCreatorITCode.value, user)
    assert.equal(access.canPreview.value, false)
    assert.equal(access.canView('overview'), false)
    assert.equal(access.canViewDetail('creators', user), true)
    assert.equal(access.canViewDetail('creators', 'unrelated-creator'), false)
  })
}

test('异步验证后，无创建证据的 admin 名称仍不能进入；通配权限才允许管理员总览', async () => {
  const denied = session('admin')
  assert.equal(denied.access.canEnter.value, false)
  await respond(denied.requests, 'admin')
  assert.equal(denied.access.canEnter.value, false)
  assert.equal(denied.access.canPreview.value, false)
  const granted = session('admin')
  assert.equal(granted.access.canEnter.value, false)
  await respond(granted.requests, 'admin', ['*'])
  assert.equal(granted.access.scope.value, 'admin')
  assert.equal(granted.access.canView('overview'), true)
})

test('退出或切换账号立即撤销旧范围，迟到的旧账号响应不能恢复权限', async () => {
  const { app, access, requests } = session('zhangrui32')
  assert.equal(access.canEnter.value, false)
  app.user = 'unknown-reader'
  assert.equal(access.canEnter.value, false)
  await respond(requests, 'zhangrui32')
  assert.equal(access.canEnter.value, false)
  await respond(requests, 'unknown-reader', [], 2)
  assert.equal(access.canEnter.value, false)
  app.user = 'zhangrui32'
  assert.equal(access.canEnter.value, false)
  await respond(requests, 'zhangrui32', [], 4)
  assert.equal(access.canEnter.value, true)
  app.user = null
  assert.equal(access.canEnter.value, false)
  assert.equal(access.currentCreatorITCode.value, null)
})
