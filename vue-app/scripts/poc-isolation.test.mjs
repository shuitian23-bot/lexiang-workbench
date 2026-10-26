import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { POC_STORAGE_PREFIX, pocLoginEnabled, runtimePaths, scopedDemoStorage } from '../src/services/pocIsolation.ts'

test('Production demo is an explicit opt-in, independent of real auth', () => {
  assert.equal(pocLoginEnabled(undefined, false), false)
  assert.equal(pocLoginEnabled(undefined, true), true)
  assert.equal(pocLoginEnabled('true', false), true)
  for (const value of ['false', '', '1', 'TRUE', 'preview']) assert.equal(pocLoginEnabled(value, true), false)
})

test('Only the exact POC path enters the isolated route tree', () => {
  for (const path of ['/admin-vue/poc/', '/admin-vue/poc/login', '/admin-vue/poc']) {
    assert.equal(runtimePaths('/admin-vue/', path).sandbox, true)
  }
  for (const path of ['/admin-vue/login', '/admin-vue/poc-other/login', '/poc/login']) {
    assert.equal(runtimePaths('/admin-vue/', path).sandbox, false)
  }
  assert.equal(runtimePaths('/admin-vue/', '/admin-vue/poc/login').routerBase, '/admin-vue/poc/')
})

test('Demo storage cannot read, overwrite or remove normal records', () => {
  const data = new Map([['approval', 'normal-record'], ['preview_user', 'legacy-user']])
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const demo = scopedDemoStorage(() => storage, true)
  assert.equal(demo.getItem('approval'), null)
  demo.setItem('approval', 'demo-record')
  assert.equal(data.get('approval'), 'normal-record')
  assert.equal(data.get(POC_STORAGE_PREFIX + 'approval'), 'demo-record')
  demo.removeItem('preview_user')
  assert.equal(data.get('preview_user'), 'legacy-user')
  const normal = scopedDemoStorage(() => storage, false)
  assert.equal(normal.getItem('approval'), 'normal-record')
})

test('Storage errors remain visible instead of granting a session', () => {
  const demo = scopedDemoStorage(() => { throw new Error('blocked') }, true)
  assert.throws(() => demo.getItem('x'), /blocked/)
  assert.throws(() => demo.setItem('x', 'y'), /blocked/)
})

test('Demo routes do not mount the real workbench or restore preview identities', () => {
  const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  const isolatedTree = router.slice(router.indexOf('const demoRoutes'), router.indexOf('const router ='))
  assert.doesNotMatch(isolatedTree, /AppLayout|PortalHome|NativeWorkbenchPage/)
  assert.doesNotMatch(router, /usePreviewSession|preview_user/)
  for (const file of ['LoginView.vue', 'AdfsLoginView.vue']) {
    const source = readFileSync(new URL('../src/views/' + file, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /usePreviewSession/)
    assert.match(source, /if \(isPocSandbox\)/)
  }
})
