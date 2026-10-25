import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let playwright
for (const candidate of [process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break } catch {}
}
if (!playwright) throw new Error('Playwright is required')
// Use a separate server/context by default; never reset the user's demo data.
process.env.VITE_PERMISSION_LAB = 'false'
process.env.VITE_AUTH_MODE = 'preview'
const server = process.env.PERMISSION_QA_BASE_URL ? null : await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { host: '127.0.0.1', port: 0 } })
if (server) await server.listen()
const base = process.env.PERMISSION_QA_BASE_URL || `http://127.0.0.1:${server.httpServer.address().port}/admin-vue`
const output = path.join(os.tmpdir(), 'account-request-status-qa')
mkdirSync(output, { recursive: true })
const key = 'leaibot-account-request-status-rows'
const row = {
  id: 'AP-20261009-4b45070f-4503-4869-9a90-32aae57ed64a', token: 'QA-status-token',
  typeKey: 'enable', type: '启用账号', applicant: 'internal-disabled', applicantItcode: 'internal-disabled',
  target: 'internal-disabled', personType: 'internal', systemApprover: 'sunzh4',
  node: '系统管理员审批', nodeType: 'system-admin', status: '待我审批', statusKey: 'pending',
  time: '2026-10-09 14:29', reason: '申请恢复账号，以便重新申请工作台权限。',
  logs: [{ node: '申请人提交', detail: '已提交账号启用申请，等待系统管理员审批。', time: '2026-10-09 14:29' }]
}
const browser = await playwright.chromium.launch({ headless: true })
const context = await browser.newContext()
context.setDefaultTimeout(10000)
await context.route('**/api/admin/me', route => route.fulfill({ status: 401, body: '{}' }))
const errors = []
context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
const page = await context.newPage()
const url = base + '/account-request/status?ticket=' + row.id + '&token=' + row.token
const measurements = []
async function seed(value) { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), { key, value }) }
async function measure() {
  await page.locator('.application-progress-summary').waitFor()
  return page.evaluate(() => {
    const panel = document.querySelector('.application-progress-summary')
    const main = document.querySelector('main')
    const title = panel.querySelector('h1')
    const rect = panel.getBoundingClientRect()
    return { viewport: innerWidth, width: rect.width, center: rect.x + rect.width / 2,
      overflow: Math.max(document.documentElement.scrollWidth - innerWidth, main.scrollWidth - main.clientWidth),
      font: getComputedStyle(title).fontSize, icon: panel.querySelector('.progress-icon').getBoundingClientRect().width }
  })
}
try {
  await page.goto(base + '/login')
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1040, height: 640 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const personType of ['internal', 'external']) {
      for (const state of ['pending', 'done', 'rejected']) {
        const current = { ...row, personType, statusKey: state,
          status: { pending: '待我审批', done: '已完成', rejected: '已驳回' }[state],
          nodeType: { pending: 'system-admin', done: 'done', rejected: 'rework' }[state],
          node: state === 'done' ? '执行完成' : '系统管理员审批' }
        await seed(current)
        await page.goto(url)
        await page.getByRole('heading', { name: { pending: '账号启用申请已进入审批', done: '账号已启用', rejected: '账号启用申请已驳回' }[state], exact: true }).waitFor()
        assert.equal(await page.locator('.approval-flow li').count(), 2)
        assert.equal(await page.locator('.status-details').getAttribute('open'), null)
        assert.equal(await page.locator('.status-actions a').getAttribute('href'), '/admin-vue/login?loginType=' + personType)
        assert.equal(await page.locator('.status-login-link').count(), 1)
        assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), [current], 'Progress page is read-only')
        const geometry = await measure()
        assert.equal(geometry.overflow, 0)
        assert.ok(Math.abs(geometry.center - viewport.width / 2) <= 10, 'Centered result with scrollbar allowance')
        measurements.push({ ...geometry, personType, state })
        if (personType === 'internal' && (state === 'pending' || viewport.width === 1040)) {
          await page.screenshot({ path: path.join(output, viewport.width + '-' + state + '.png'), fullPage: true })
        }
      }
    }
  }
  await page.setViewportSize({ width: 1040, height: 640 })
  await seed(row)
  await page.goto(url)
  const enableGeometry = await measure()
  // Same component and content width in the reference permission-application page.
  await page.evaluate(() => localStorage.setItem('leaibot-first-access-applications', JSON.stringify([{
    id: 'PA-QA-reference', applicantItcode: 'noaccess', targetItcode: 'noaccess', statusKey: 'pending', nodeType: 'applicant-manager',
    applicantManager: 'sunll1', businessOwners: ['zhangjq4']
  }])))
  await page.goto(base + '/access-denied?itcode=noaccess&userType=internal')
  await page.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
  const reference = await measure()
  assert.equal(reference.overflow, 0)
  assert.ok(Math.abs(reference.center - 520) <= 10)
  assert.equal(reference.width, enableGeometry.width)
  assert.equal(reference.font, enableGeometry.font)
  assert.equal(reference.icon, enableGeometry.icon)
  assert.equal(await page.locator('.approval-flow li').count(), 3)
  await page.screenshot({ path: path.join(output, 'reference-permission.png'), fullPage: true })
  // Long details stay readable and the bottom exit remains reachable.
  await seed({ ...row, reason: '很长的申请原因。'.repeat(80), logs: Array.from({ length: 21 }, (_, i) => ({ node: '处理记录 ' + i, detail: '状态说明。'.repeat(30), time: String(i) })) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url)
  await page.locator('summary').focus()
  await page.keyboard.press('Enter')
  assert.notEqual(await page.locator('details').getAttribute('open'), null)
  assert.equal(await page.locator('.status-timeline li').count(), 21)
  assert.equal((await measure()).overflow, 0)
  await page.locator('.status-actions a').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(output, 'mobile-long-details-bottom.png') })
  await page.locator('.status-actions a').click()
  await page.waitForURL('**/login?loginType=internal')
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('account-status-route')), false)
  // Actual storage event updates an already-open progress page; focus refresh does too.
  await seed(row)
  await page.goto(url)
  const writer = await context.newPage()
  await writer.goto(base + '/login')
  await writer.evaluate(({ key, row }) => localStorage.setItem(key, JSON.stringify([{ ...row, statusKey: 'done', nodeType: 'done', status: '已完成' }])), { key, row })
  await page.getByRole('heading', { name: '账号已启用', exact: true }).waitFor()
  await writer.close()
  await seed({ ...row, status: '已驳回', statusKey: 'rejected', nodeType: 'rework' })
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await page.getByRole('heading', { name: '账号启用申请已驳回', exact: true }).waitFor()
  await page.goto(url.replace(row.token, 'wrong-token'))
  await page.getByRole('heading', { name: '无法查询该申请进度', exact: true }).waitFor()
  assert.equal(await page.locator('.application-progress-summary').count(), 0)
  // The same presentation now covers all applicant request types, not only enable.
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const kind of ['change', 'create', 'disable']) {
      for (const state of ['pending', 'done', 'rejected']) {
        const names = { change: '权限', create: '账号创建', disable: '账号禁用' }
        const completed = { change: '权限申请已完成', create: '账号已创建', disable: '账号已禁用' }
        const value = { ...row, typeKey: kind, type: names[kind], applicantItcode: 'requester', targetItcode: 'target',
          applicantPersonType: 'internal', personType: kind === 'create' ? 'external' : 'internal', relatedAccount: 'requester',
          applicantManager: 'manager', targetManager: 'target-manager', businessApprover: 'business',
          statusKey: state, status: { pending: '待我审批', done: '已完成', rejected: '已驳回' }[state],
          nodeType: state === 'done' ? 'done' : kind === 'disable' ? 'system-admin' : 'applicant-manager' }
        await seed(value)
        await page.goto(url)
        await page.getByRole('heading', { name: state === 'done' ? completed[kind] : names[kind] + '申请已' + (state === 'pending' ? '进入审批' : '驳回'), exact: true }).waitFor()
        assert.equal(await page.locator('.approval-flow li').count(), { change: 4, create: 3, disable: 2 }[kind])
        assert.equal(await page.getByRole('button', { name: '提交审批', exact: true }).count(), 0)
        assert.equal(await page.locator('input,textarea,select').count(), 0)
        assert.equal((await measure()).overflow, 0)
        assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), [value])
        if (state === 'pending') await page.screenshot({ path: path.join(output, `${width}-${kind}.png`), fullPage: true })
      }
    }
  }
  // A legacy applicant email deep link must open the unified view, not an approver workspace.
  const approvalRow = { ...row, id: 'AP-applicant-mail', token: undefined, typeKey: 'change', type: '权限变更',
    applicantItcode: 'admin', targetItcode: 'target', applicantPersonType: 'internal', applicantManager: 'manager',
    targetManager: 'target-manager', businessApprover: 'business', nodeType: 'applicant-manager', approverItcode: 'manager', approvalRevision: 1 }
  const approvalKey = 'leaibot-approval-mail-mock-rows'
  await context.unroute('**/api/admin/me')
  await context.route('**/api/admin/me', route => route.fulfill({ json: { admin: { username: 'admin' } } }))
  await context.route('**/api/harness/menu', route => route.fulfill({ json: { menus: ['dashboard'], permissions: ['*'] } }))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(base + '/login')
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), { key: approvalKey, value: approvalRow })
  await page.goto(base + '/agent/permissions?module=approval&viewer=applicant&identity=applicant&ticket=' + approvalRow.id)
  await page.waitForURL('**/account-request/status?**')
  await page.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
  assert.equal(await page.locator('.approval-workspace-modal').count(), 0)
  assert.equal(await page.locator('.permission-module-rail').count(), 0)
  assert.equal(await page.locator('.status-actions a').innerText(), '返回权限管理')
  const applicantUrl = page.url()
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify([{ ...value, nodeType: 'business', approvalRevision: 2 }])), { key: approvalKey, value: approvalRow })
  await page.getByRole('button', { name: '刷新状态', exact: true }).click()
  await page.locator('.approval-flow li.current').filter({ hasText: '业务负责人' }).waitFor()
  await page.goto(applicantUrl.replace(/token=[^&]+/, 'token=invalid'))
  await page.getByRole('heading', { name: '无法查询该申请进度', exact: true }).waitFor()
  // Returning to the existing approver view still exposes the original approval detail.
  await page.goto(base + '/agent/permissions?module=approval')
  const target = page.locator('tbody tr').filter({ hasText: approvalRow.id })
  await target.getByRole('button', { name: '审批', exact: true }).click()
  await page.getByText('完整审批链路', { exact: true }).waitFor()
  await page.getByRole('button', { name: '提交审批', exact: true }).waitFor()
  const mailPopup = context.waitForEvent('page')
  await page.getByRole('button', { name: '审批邮件演示', exact: true }).click()
  const mail = await mailPopup
  await mail.locator('a.ticket').first().waitFor()
  const applicantLink = await mail.locator('a.ticket').first().getAttribute('href')
  assert(applicantLink.includes('/account-request/status?'), 'Applicant mail points to the unified status page')
  const mailProgress = await context.newPage()
  await mailProgress.goto(applicantLink)
  await mailProgress.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor()
  assert.equal(await mailProgress.getByRole('button', { name: '提交审批', exact: true }).count(), 0)
  await mailProgress.close()
  await mail.close()
  await page.goto(url)
  await page.evaluate(key => localStorage.setItem(key, 'invalid-json'), key)
  await page.reload()
  await page.getByRole('heading', { name: '无法查询该申请进度', exact: true }).waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'passed', measurements, reference, screenshots: output, errors }, null, 2))
} finally { await browser.close(); if (server) await server.close() }
