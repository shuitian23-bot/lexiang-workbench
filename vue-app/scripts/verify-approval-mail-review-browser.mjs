import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
let playwright
for (const candidate of [process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break } catch {}
}
if (!playwright) throw new Error('Playwright required')
const base = process.env.PERMISSION_QA_BASE_URL || 'http://127.0.0.1:5176/admin-vue'
const approvalDemoHosts = ['new.leaibot.cn', 'leaibot.cn']
const authMode = process.env.APPROVAL_QA_AUTH_MODE || (approvalDemoHosts.includes(new URL(base).hostname) ? 'server' : 'preview')
assert.ok(['preview', 'server'].includes(authMode), 'APPROVAL_QA_AUTH_MODE must be preview or server')
const serverOffBase = process.env.APPROVAL_SERVER_QA_BASE_URL
if (authMode === 'server') assert.ok(serverOffBase, 'Server QA requires APPROVAL_SERVER_QA_BASE_URL for the local demo-disabled check')
if (serverOffBase) assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(serverOffBase).hostname), 'The demo-disabled server check must stay local')
const staticOrigin = process.env.APPROVAL_QA_STATIC_ORIGIN
if (staticOrigin) {
  assert.ok(approvalDemoHosts.includes(new URL(base).hostname), 'Static substitution requires an exact authorized demo browser hostname')
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(staticOrigin).hostname), 'Candidate static resources must stay local')
}
const out = process.env.APPROVAL_QA_OUTPUT_DIR || path.join(os.tmpdir(), 'approval-mail-review-qa')
await fs.mkdir(out, { recursive: true })
const browser = await playwright.chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })
context.setDefaultTimeout(15000)
const errors = []
const writeRequests = []
const sessionRequests = []
const realAuthChecks = []
const staticRequests = []
const staticResponses = []
const sessionPages = new Set()
// Only existing read-only session GETs are fulfilled; no browser profile or real account is used.
const sessionFixtures = new Map([
  ['/api/admin/me', { admin: { username: 'approval-qa' } }],
  ['/api/harness/menu', { menus: [], permissions: ['*'] }]
])
async function isolateNetwork(target, targetBase, authenticatedPages = new Set()) {
  await target.route('**/*', async route => {
    const request = route.request()
    const method = request.method()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      writeRequests.push({ method, url: request.url() })
      return route.abort('blockedbyclient')
    }
    const url = new URL(request.url())
    if (method === 'GET' && url.origin === new URL(targetBase).origin && sessionFixtures.has(url.pathname)) {
      const authenticated = authMode === 'server' && authenticatedPages.has(request.frame().page())
      sessionRequests.push({ url: request.url(), authenticated })
      return route.fulfill({ status: authenticated ? 200 : 401, contentType: 'application/json', body: JSON.stringify(authenticated ? sessionFixtures.get(url.pathname) : {}) })
    }
    if (staticOrigin && method === 'GET' && url.origin === new URL(base).origin && (url.pathname === '/admin-vue' || url.pathname.startsWith('/admin-vue/'))) {
      staticRequests.push(request.url())
      const response = await route.fetch({ url: new URL(url.pathname + url.search, staticOrigin).href, maxRedirects: 0 })
      assert.ok(response.ok(), 'Candidate static GET succeeded: ' + url.pathname)
      const body = await response.body()
      staticResponses.push({ path: url.pathname, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length })
      return route.fulfill({ response, body })
    }
    return route.continue()
  })
}
await isolateNetwork(context, base, sessionPages)
context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
const page = await context.newPage()
sessionPages.add(page)
const key = 'leaibot-approval-mail-mock-rows'
async function saved(tab, ticket) { return tab.evaluate(({ key, ticket }) => JSON.parse(localStorage.getItem(key)).find(row => row.id === ticket), { key, ticket }) }
async function assertNoPreviewSession(tab) { assert.equal(await tab.evaluate(() => localStorage.getItem('preview_user')), null, 'Server demo must not create a preview session') }
async function assertOnlyAnonymousCookies(target, targetBase) {
  const cookies = await target.cookies()
  assert.ok(cookies.length <= 1, 'Only the verified anonymous cookie may exist')
  for (const { name, domain, path, httpOnly } of cookies) {
    assert.deepEqual({ name, domain, path, httpOnly }, { name: 'lexiang-uid', domain: new URL(targetBase).hostname, path: '/', httpOnly: false }, 'Only the verified anonymous cookie is allowed; login cookies are forbidden')
  }
}
async function assertPrivateRouteRequiresSession(targetBase) {
  const anonymous = await browser.newContext({ serviceWorkers: 'block' })
  try {
    await isolateNetwork(anonymous, targetBase)
    const privatePage = await anonymous.newPage()
    await privatePage.goto(targetBase + '/agent/permissions?module=approval')
    await privatePage.waitForURL(url => url.pathname.endsWith('/login'))
    assert.equal(new URL(privatePage.url()).searchParams.get('redirect'), '/agent/permissions?module=approval')
    await assertNoPreviewSession(privatePage)
    await assertOnlyAnonymousCookies(anonymous, targetBase)
    if (approvalDemoHosts.includes(new URL(targetBase).hostname)) {
      const response = await anonymous.request.get(new URL('/api/admin/me', targetBase).href, { maxRedirects: 0 })
      realAuthChecks.push({ origin: new URL(targetBase).origin, path: '/api/admin/me', status: response.status() })
      assert.equal(response.status(), 401, 'The real session API rejects the anonymous context without page-route mocks')
      await response.dispose()
      await assertOnlyAnonymousCookies(anonymous, targetBase)
    }
  } finally { await anonymous.close() }
}
async function assertSimplifiedApproval(tab) {
  const body = tab.locator('.approval-workspace-body')
  assert.equal(await body.getByText('业务负责人审批进度', { exact: true }).count(), 0)
  assert.equal(await body.locator('.business-progress-panel, .business-task-card').count(), 0)
  assert.equal(await body.locator(':scope > section').first().locator('b').first().textContent(), '完整审批链路')
  await body.getByText('基本信息', { exact: true }).waitFor()
  assert.equal(await body.locator('.approval-detail-grid dt').filter({ hasText: /^业务负责人$/ }).count(), 1)
  assert.ok(await body.locator('.approval-full-route-list').getByText('业务负责人审批', { exact: true }).count())
}
try {
  if (authMode === 'server') await assertPrivateRouteRequiresSession(base)
  await page.goto(base + '/agent/permissions?module=approval')
  assert.equal(new URL(page.url()).hostname, new URL(base).hostname, 'Browser stays on the requested demo hostname')
  if (authMode === 'server') {
    await assertNoPreviewSession(page)
    assert.ok(sessionRequests.some(request => request.authenticated), 'Account demo uses only a mocked read-only server session')
  }
  await page.locator('tbody tr').filter({ hasText: '申请人直线经理审批' }).getByRole('button', { name: '审批', exact: true }).first().click()
  await page.getByText('完整权限范围', { exact: true }).waitFor()
  await assertSimplifiedApproval(page)
  await page.screenshot({ path: path.join(out, 'account-simplified.png'), fullPage: true })
  const popup = context.waitForEvent('page')
  await page.getByRole('button', { name: '审批邮件演示', exact: true }).click()
  const mail = await popup
  await mail.waitForLoadState()
  await mail.locator('.mail-tab[data-mail-role="applicant-manager"]').click()
  const guestUrl = await mail.getByRole('link', { name: '无账号审批', exact: true }).getAttribute('href')
  const accountUrl = await mail.getByRole('link', { name: '有账号审批', exact: true }).getAttribute('href')
  assert.ok(guestUrl.includes('/mail-approval/review?'))
  assert.ok(accountUrl.includes('/agent/permissions?'))
  const ticket = new URL(guestUrl).searchParams.get('ticket')
  const before = await saved(page, ticket)
  assert.equal(before.nodeType, 'applicant-manager')
  const guest = await context.newPage()
  // No login is used by the independent page; removing the preview session must not redirect it.
  await page.evaluate(() => localStorage.removeItem('preview_user'))
  await guest.goto(guestUrl)
  await guest.getByRole('heading', { name: '邮件审批', exact: true }).waitFor()
  await assertSimplifiedApproval(guest)
  assert.equal(await guest.locator('.permission-module-rail').count(), 0)
  assert.equal(await guest.getByText('完整权限范围', { exact: true }).count(), 0)
  assert.equal(await guest.getByRole('button', { name: '添加角色', exact: true }).count(), 0)
  assert.equal(await guest.evaluate(() => localStorage.getItem('preview_user')), null)
  await assertOnlyAnonymousCookies(context, base)
  for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
    await guest.setViewportSize({ width, height })
    const layout = await guest.evaluate(() => {
      const footer = document.querySelector('.standalone-approval-content .modal-actions').getBoundingClientRect()
      const body = document.querySelector('.approval-workspace-body')
      return { footerBottom: footer.bottom, footerTop: footer.top, viewport: innerHeight, scrollable: body.scrollHeight > body.clientHeight, overflow: getComputedStyle(body).overflowY }
    })
    assert.ok(layout.footerTop >= 0 && layout.footerBottom <= height, 'Footer stays in viewport')
    assert.equal(layout.overflow, 'auto')
    assert.ok(layout.scrollable, 'Long content has its own scroll area')
    const overflow = await guest.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    assert.ok(overflow <= 1, 'No horizontal overflow at ' + width + ': ' + overflow)
    await guest.screenshot({ path: path.join(out, 'guest-' + width + '.png'), fullPage: true })
    await guest.locator('.approval-workspace-body').evaluate(el => { el.scrollTop = el.scrollHeight })
    await guest.screenshot({ path: path.join(out, 'guest-bottom-' + width + '.png'), fullPage: true })
    await guest.locator('.approval-workspace-body').evaluate(el => { el.scrollTop = 0 })
  }
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('请选择审批结果，例如同意或驳回。').waitFor()
  const twin = await context.newPage()
  await twin.goto(guestUrl)
  await twin.getByRole('button', { name: '同意', exact: true }).click()
  await guest.getByRole('button', { name: '同意', exact: true }).click()
  await guest.locator('.approval-decision-panel textarea').fill('无账号领导演示通过')
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。').waitFor()
  await twin.getByText('当前节点无需您处理', { exact: false }).waitFor()
  assert.equal(await twin.getByRole('button', { name: '提交审批', exact: true }).count(), 0)
  const after = await saved(guest, ticket)
  assert.equal(after.approvalLogs.length, before.approvalLogs.length + 1)
  assert.deepEqual(after.permissionSnapshot, before.permissionSnapshot, 'Guest cannot edit permission snapshot')
  await guest.reload()
  assert.equal(await guest.getByRole('button', { name: '提交审批', exact: true }).count(), 0)
  await page.getByText('申请已在其他页面更新', { exact: false }).waitFor()
  await page.goto(accountUrl)
  await page.getByRole('button', { name: '查看', exact: true }).first().click()
  await page.getByText('完整权限范围', { exact: true }).waitFor()
  await mail.locator('.mail-tab[data-mail-role="target-manager"]').click()
  const targetGuestUrl = await mail.getByRole('link', { name: '无账号审批', exact: true }).getAttribute('href')
  const targetAccountUrl = await mail.getByRole('link', { name: '有账号审批', exact: true }).getAttribute('href')
  await guest.goto(targetGuestUrl)
  await guest.getByRole('button', { name: '同意', exact: true }).click()
  await guest.evaluate(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error('演示存储暂不可用')
      return original.call(this, name, value)
    }
  }, key)
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('演示存储暂不可用', { exact: true }).waitFor()
  assert.equal((await saved(page, ticket)).nodeType, 'target-manager', 'Storage failure does not advance the request')
  await guest.reload()
  await page.goto(targetAccountUrl)
  await page.getByRole('button', { name: '审批', exact: true }).click()
  await page.getByText('完整权限范围', { exact: true }).waitFor()
  await page.getByRole('button', { name: '添加角色', exact: true }).waitFor()
  await page.getByRole('button', { name: '同意', exact: true }).click()
  await page.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('当前节点无需您处理', { exact: false }).waitFor()
  assert.equal((await saved(page, ticket)).nodeType, 'business')
  await mail.locator('.mail-tab[data-mail-role^="business-owner:"]').first().click()
  const ownerUrl = await mail.getByRole('link', { name: '无账号审批', exact: true }).getAttribute('href')
  await guest.goto(ownerUrl)
  await assertSimplifiedApproval(guest)
  await guest.getByRole('button', { name: '同意', exact: true }).click()
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('请选择至少一个所属组织，便于后台按组织授权。').waitFor()
  await guest.getByRole('button', { name: '驳回', exact: true }).click()
  await guest.locator('.approval-decision-panel textarea').fill('请补充申请说明')
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。').waitFor()
  assert.equal((await saved(page, ticket)).statusKey, 'rejected')
  await assertSimplifiedApproval(guest)
  await guest.screenshot({ path: path.join(out, 'guest-rejected.png'), fullPage: true })
  await page.goto(accountUrl)
  await page.getByRole('button', { name: '查看', exact: true }).click()
  await page.getByText('完整权限范围', { exact: true }).waitFor()
  // A separate fixture verifies successful business-owner confirmation and final execution.
  const successUrl = new URL(ownerUrl)
  const successTicket = ticket + '-business-success'
  successUrl.searchParams.set('ticket', successTicket)
  await page.evaluate(({ key, ticket, successTicket }) => {
    const rows = JSON.parse(localStorage.getItem(key))
    const source = rows.find(row => row.id === ticket)
    const row = structuredClone(source)
    row.id = successTicket
    row.statusKey = 'pending'
    row.status = '待我审批'
    row.nodeType = 'business'
    row.node = '业务负责人审批'
    row.businessApprovalTasks.forEach(task => { task.status = 'pending'; task.organizations = [] })
    row.approverItcode = row.businessApprovalTasks[0].approver
    row.handlers = [row.approverItcode]
    localStorage.setItem(key, JSON.stringify([row, ...rows]))
  }, { key, ticket, successTicket })
  await guest.goto(successUrl.href)
  await guest.getByRole('button', { name: '同意', exact: true }).click()
  await guest.locator('.approval-business-form button').first().click()
  await guest.getByRole('button', { name: '提交审批', exact: true }).click()
  await guest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。').waitFor()
  assert.equal((await saved(page, successTicket)).statusKey, 'done')
  await guest.reload()
  await guest.getByText('当前节点无需您处理', { exact: false }).waitFor()
  // Invalid and expired links never expose applicant data or a submit control.
  const bad = new URL(guestUrl)
  bad.searchParams.set('token', 'invalid')
  await guest.goto(bad.href)
  await guest.getByRole('heading', { name: '暂时无法查看申请' }).waitFor()
  assert.equal(await guest.locator('.approval-workspace-modal').count(), 0)
  if (serverOffBase) {
    await assertPrivateRouteRequiresSession(serverOffBase)
    const server = await browser.newContext({ serviceWorkers: 'block' })
    await isolateNetwork(server, serverOffBase)
    const serverPage = await server.newPage()
    const serverUrl = serverOffBase + '/mail-approval/review' + new URL(targetGuestUrl).search
    await serverPage.goto(serverUrl)
    const validRow = await saved(page, ticket)
    validRow.nodeType = 'target-manager'
    validRow.statusKey = 'pending'
    validRow.approverItcode = validRow.targetManager
    await serverPage.evaluate(({ key, row }) => localStorage.setItem(key, JSON.stringify([row])), { key, row: validRow })
    await serverPage.reload()
    await serverPage.getByRole('heading', { name: '暂时无法查看申请' }).waitFor()
    assert.equal(await serverPage.locator('.approval-workspace-modal').count(), 0, 'Server mode rejects even a valid locally forged preview record')
    assert.equal(await serverPage.evaluate(() => localStorage.getItem('preview_user')), null)
    await server.close()
  }
  await page.evaluate(({ key, ticket }) => {
    const rows = JSON.parse(localStorage.getItem(key))
    rows.find(row => row.id === ticket).guestApprovalLinks['applicant-manager'].expiresAt = 1
    localStorage.setItem(key, JSON.stringify(rows))
  }, { key, ticket })
  await guest.goto(guestUrl)
  await guest.getByText('审批链接已过期，请联系申请人重新获取。').waitFor()
  assert.equal(await guest.locator('.approval-workspace-modal').count(), 0)
  if (authMode === 'server') {
    await assertNoPreviewSession(page)
    await assertNoPreviewSession(guest)
  }
  assert.deepEqual(writeRequests, [], 'Approval demo must not attempt real account, permission, approval or mail writes')
  if (staticOrigin) assert.ok(staticRequests.length, 'The authorized demo browser context uses the local candidate static resources')
  assert.deepEqual(errors, [])
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify({ passed: true, authMode, staticResponses, blockedWrites: writeRequests, realAuthChecks, guestURL: new URL(guestUrl).pathname, accountURL: new URL(accountUrl).pathname }, null, 2) + '\n')
  console.log('PASS: shared approval, both demo entries, guest isolation, unchanged permissions, cross-tab sync, duplicate guard, validation, expiry, 3 viewports, ' + authMode + ' auth and zero network writes')
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true })
  console.error('Browser errors:', errors)
  console.error('Blocked write requests:', writeRequests)
  throw error
} finally { await browser.close() }
