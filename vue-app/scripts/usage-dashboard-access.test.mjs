import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {
  resolveUsageDashboardAccess, canViewUsageDashboard, canViewUsageDetail,
  filterUsageRows, canExportUsageRows, usageDashboardRouteAllowed,
  loadUsageDashboardIdentity
} from '../src/domain/usageDashboardAccess.js'

const creatorEvidence = [
  { creatorId: 'alice', skillId: 'skill-a' },
  { creatorId: 'alice', skillId: 'skill-a' },
  { creatorId: 'alice', skillId: 'skill-b' },
  { creatorId: 'bob', skillId: 'skill-other' }
]
const sampleEvidence = [{ creatorId: 'sample.creator-a', skillId: 'sample.skill-a' }]
const identity = (userId, permissions = []) => ({ verified: true, userId, permissions })
const resolve = options => resolveUsageDashboardAccess({ creatorEvidence, sampleEvidence, ...options })
const admin = () => resolve({ identity: identity('admin', ['*']) })
const person = () => resolve({ identity: identity('alice') })

test('unverified identities cannot inherit administrator fallback permissions', () => {
  const access = resolve({ identity: { userId: 'admin', permissions: ['*'], verified: false }, role: '平台管理员' })
  assert.equal(access.scope, 'none')
  assert.equal(access.canEnter, false)
  assert.equal(access.canPreview, false)
  assert.equal(resolve({ identity: identity('admin'), role: '平台管理员' }).scope, 'none')
})

test('verified administrator can enter all views without creator evidence', () => {
  const access = resolveUsageDashboardAccess({ identity: identity('admin', ['*']) })
  assert.equal(access.scope, 'admin')
  assert.equal(access.allowedSource, 'all')
  for (const view of ['overview', 'rankings', 'skills', 'creators']) assert.equal(canViewUsageDashboard(access, view), true)
  assert.equal(canViewUsageDashboard(access, 'unknown'), false)
})

test('positive ownership evidence confirms a creator, while an incomplete catalog cannot prove absence', () => {
  const access = resolve({ identity: identity(' Alice ') })
  assert.equal(access.scope, 'person')
  assert.equal(access.currentCreatorITCode, 'alice')
  assert.deepEqual(access.ownedSkillIds, ['skill-a', 'skill-b'])
  assert.equal(resolve({ identity: identity('unknown') }).reason, 'creator-unknown')
  assert.equal(resolve({ identity: identity('unknown'), catalogComplete: true }).reason, 'not-creator')
  assert.equal(resolve({ identity: identity('alice@example.com') }).scope, 'none', 'Do not guess an IT Code from an email')
})

test('personal scope permits rankings and own creator view, never global overview or Skill list', () => {
  const access = person()
  assert.equal(canViewUsageDashboard(access, 'rankings'), true)
  assert.equal(canViewUsageDashboard(access, 'creators'), true)
  assert.equal(canViewUsageDashboard(access, 'overview'), false)
  assert.equal(canViewUsageDashboard(access, 'skills'), false)
})

test('own creator and Skill details use verified ownership rather than a supplied owner label', () => {
  const access = person()
  assert.equal(canViewUsageDetail(access, 'creators', 'alice', 'daily'), true)
  assert.equal(canViewUsageDetail(access, 'creators', 'bob', 'daily'), false)
  assert.equal(canViewUsageDetail(access, 'skills', 'skill-a', 'daily'), true)
  assert.equal(canViewUsageDetail(access, 'skills', 'skill-other', 'daily'), false)
  assert.equal(canViewUsageDetail(access, 'skills', '', 'daily'), false)
  assert.equal(canViewUsageDetail(access, 'skills', 'sample.skill-a', 'sample'), false)
  assert.equal(canViewUsageDetail(resolve({}), 'creators', 'alice', 'daily'), false)
})

test('personal row filtering and export cannot include another creator or unknown Skill', () => {
  const rows = [{ id: 'skill-a' }, { id: 'skill-other', creatorId: 'alice' }]
  const before = structuredClone(rows)
  assert.deepEqual(filterUsageRows(person(), rows, 'skills', 'daily'), [{ id: 'skill-a' }])
  assert.equal(canExportUsageRows(person(), rows, 'skills', 'daily'), false)
  assert.equal(canExportUsageRows(person(), [rows[0]], 'skills', 'daily'), true)
  assert.equal(canExportUsageRows(person(), [], 'skills', 'daily'), false)
  assert.deepEqual(filterUsageRows(person(), [{ id: 'alice' }, { id: 'bob' }], 'creators', 'daily'), [{ id: 'alice' }])
  assert.deepEqual(rows, before)
})

test('direct-link requests cannot override a personal scope with view, target or source query values', () => {
  const access = person()
  assert.equal(usageDashboardRouteAllowed(access, { view: 'overview', role: 'admin' }), false)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'skills' }), false)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'rankings' }), true)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'creators', creatorId: 'alice', skillId: 'skill-a' }), true)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'creators', creatorId: 'bob' }), false)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'creators', creatorId: 'alice', skillId: 'skill-other' }), false)
  assert.equal(usageDashboardRouteAllowed(access, { view: 'rankings', source: 'sample' }), false)
})

test('own date-by-Skill and safe-call exports preserve ownership checks without inventing aggregate IDs', () => {
  const owned = { date: '2026-11-05', skillId: 'skill-a', creatorId: 'alice' }
  const other = { date: '2026-11-05', skillId: 'skill-other', creatorId: 'alice' }
  assert.equal(canExportUsageRows(person(), [owned], 'skills', 'daily'), true)
  assert.equal(canExportUsageRows(person(), [owned], 'creators', 'daily'), true)
  assert.equal(canExportUsageRows(person(), [other], 'creators', 'daily'), false)
  assert.equal(canExportUsageRows(person(), [{ ...owned, creatorId: 'bob' }], 'skills', 'daily'), false)
  assert.equal(canExportUsageRows(admin(), [{ date: '2026-11-05', calls: 5 }], 'skills', 'daily'), true)
  assert.equal(canExportUsageRows(person(), [{ date: '2026-11-05', calls: 5 }], 'skills', 'daily'), false)
  assert.equal(canExportUsageRows(person(), [null], 'skills', 'daily'), false)
})

test('administrator personal preview is an explicit reduction with separate daily and sample ownership', () => {
  const access = resolve({ identity: identity('admin', ['*']), preview: { source: 'daily', creatorId: 'alice' } })
  assert.equal(access.scope, 'person')
  assert.equal(access.canPreview, true)
  assert.equal(access.isPreview, true)
  assert.equal(access.currentCreatorITCode, 'alice')
  assert.equal(canViewUsageDashboard(access, 'overview'), false)
  const sample = resolve({ identity: identity('admin', ['*']), preview: { source: 'sample', creatorId: 'sample.creator-a' } })
  assert.equal(sample.allowedSource, 'sample')
  assert.equal(canViewUsageDetail(sample, 'skills', 'sample.skill-a', 'sample'), true)
  assert.equal(canViewUsageDetail(sample, 'skills', 'skill-a', 'daily'), false)
  assert.equal(resolve({ identity: identity('admin', ['*']), preview: { source: 'sample', creatorId: 'alice' } }).scope, 'none')
  assert.equal(admin().scope, 'admin', 'A cleared preview restores only the original verified administrator')
})

test('a real personal or unknown identity cannot enable administrator preview or select another creator', () => {
  const access = resolve({ identity: identity('alice'), preview: { source: 'daily', creatorId: 'bob' } })
  assert.equal(access.scope, 'person')
  assert.equal(access.currentCreatorITCode, 'alice')
  assert.equal(access.canPreview, false)
  assert.equal(access.isPreview, false)
  assert.equal(resolve({ preview: { source: 'sample', creatorId: 'sample.creator-a' } }).scope, 'none')
})

test('server identity requires both successful session and explicit permission responses', async () => {
  const calls = []
  const loaded = await loadUsageDashboardIdentity(async (url, options) => {
    calls.push([url, options.credentials, options.cache])
    return { ok: true, json: async () => url.endsWith('/me') ? { admin: { username: 'alice' } } : { permissions: [] } }
  })
  assert.deepEqual(loaded, identity('alice'))
  assert.deepEqual(calls.map(x => x[0]).sort(), ['/api/admin/me', '/api/harness/menu'])
  assert.ok(calls.every(x => x[1] === 'same-origin' && x[2] === 'no-store'))
  const unavailable = await loadUsageDashboardIdentity(async url => ({ ok: !url.endsWith('/menu'), json: async () => ({ admin: { username: 'admin' }, permissions: ['*'] }) }))
  assert.equal(unavailable.verified, false)
  const malformed = await loadUsageDashboardIdentity(async () => ({ ok: true, json: async () => ({ username: 'admin', permissions: '*' }) }))
  assert.equal(malformed.verified, false)
})

test('the real route guard waits for identity before replacing a forbidden personal direct link', async () => {
  let release
  const ready = new Promise(resolve => { release = resolve })
  let loaded = false, guard
  const access = {
    scope: { get value() { return loaded ? 'person' : 'none' } },
    canEnter: { get value() { return loaded } },
    async ensureLoaded() { await ready; loaded = true },
    routeAllowed: request => usageDashboardRouteAllowed(person(), request)
  }
  const source = fs.readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
    .replace(/^import[^\n]*\n/gm, '').replace(/export default router\s*;?/, '')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  const context = vm.createContext({
    isPocSandbox: false, isPocWorkbench: false, allowPocLogin: false, appBase: '/admin-vue/', normalAppBase: '/admin-vue/',
    aiInspectRoutes: [], ACTIVITY_POINTS_MENU: { children: {} }, canUseActivityPoints: () => true,
    useAppStore: () => ({ user: 'alice', permissions: [] }), useUsageDashboardAccess: () => access,
    createWebHistory: value => value,
    createRouter: () => ({ beforeEach: value => { guard = value } }),
    showWorkbenchToast() {}
  })
  vm.runInContext(code, context)
  let complete = false
  const result = guard({ path: '/agent/usage-dashboard', fullPath: '/agent/usage-dashboard?view=overview', query: { view: 'overview' }, meta: { pageId: 'agent.usageDashboard' } }).then(value => { complete = true; return value })
  await Promise.resolve()
  assert.equal(complete, false, 'No early denial or grant while authoritative identity is pending')
  release()
  assert.deepEqual(JSON.parse(JSON.stringify(await result)), { path: '/agent/usage-dashboard', query: { view: 'rankings' }, replace: true })
})
