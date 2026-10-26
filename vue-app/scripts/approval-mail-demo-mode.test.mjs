import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src/config/runtimeMode.ts'), 'utf8')
const compiled = ts.transpileModule(source.replaceAll('import.meta.env', 'runtimeEnvironment'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText

function runtime({ mode, dev = false, hostname, hasWindow = true }) {
  const context = {
    exports: {},
    runtimeEnvironment: { DEV: dev, ...(mode === undefined ? {} : { VITE_AUTH_MODE: mode }) }
  }
  if (hasWindow) context.window = { location: { hostname } }
  vm.runInNewContext(compiled, context)
  return context.exports
}

test('NEW enables approval mail demo without enabling preview authentication', () => {
  const state = runtime({ mode: 'server', hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('production defaults retain server authentication while allowing NEW approval demo', () => {
  const state = runtime({ hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})

for (const hostname of ['leaibot.cn', 'localhost', '127.0.0.1', 'new.leaibot.cn.example.com', 'not-new.leaibot.cn']) {
  test(`server approval demo stays disabled on ${hostname}`, () => {
    const state = runtime({ mode: 'server', hostname })
    assert.equal(state.allowPreviewAuth, false)
    assert.equal(state.allowApprovalMailDemo, false)
  })
}

test('server execution without a browser fails closed', () => {
  const state = runtime({ mode: 'server', hasWindow: false })
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, false)
})

test('explicit preview retains the existing local POC behavior', () => {
  const state = runtime({ mode: 'preview', hostname: 'localhost' })
  assert.equal(state.allowPreviewAuth, true)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('development default preview remains unchanged', () => {
  const state = runtime({ dev: true, hostname: 'localhost' })
  assert.equal(state.AUTH_MODE, 'preview')
  assert.equal(state.allowPreviewAuth, true)
  assert.equal(state.allowApprovalMailDemo, true)
})

test('an explicit server mode still overrides the development preview default', () => {
  const state = runtime({ mode: 'server', dev: true, hostname: 'new.leaibot.cn' })
  assert.equal(state.AUTH_MODE, 'server')
  assert.equal(state.allowPreviewAuth, false)
  assert.equal(state.allowApprovalMailDemo, true)
})
