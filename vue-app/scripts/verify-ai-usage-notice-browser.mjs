import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
let playwright
for (const modulePath of [process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(modulePath); break } catch {}
}
if (!playwright) throw new Error('Playwright required')
const base = (process.env.USAGE_NOTICE_BASE_URL || 'https://new.leaibot.cn/admin-vue').replace(/\/$/, '')
const out = process.env.USAGE_NOTICE_QA_DIR || path.join(os.tmpdir(), 'ai-usage-notice-qa')
await fs.mkdir(out, { recursive: true })
const browser = await playwright.chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_BROWSER_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_BROWSER_EXECUTABLE } : {}) })
const results = []
async function runCase(name, action) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  const writes = [], errors = []
  // All API calls are intercepted: no real login, chat, business write or permission change.
  await context.route('**/api/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname
    if (!['GET', 'HEAD'].includes(request.method())) writes.push({ path: pathname, method: request.method(), body: request.postData() })
    if (pathname === '/api/admin/me') return route.fulfill({ json: { admin: { username: 'qa-usage-alice' } } })
    if (pathname === '/api/harness/menu') return route.fulfill({ json: { menus: ['dashboard', 'agent', 'lead'], permissions: ['*'] } })
    if (pathname.includes('/chat')) return route.fulfill({ json: { reply: 'QA isolated response', convId: 'qa-usage-only' } })
    return route.fulfill({ json: {} })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(10000)
  try {
    await action({ page, writes, context })
    assert.deepEqual(errors, [], 'Notice flow must not throw browser errors')
    results.push({ name, status: 'PASS', writes })
  } catch (error) {
    await page.screenshot({ path: path.join(out, name + '-failure.png'), fullPage: true })
    results.push({ name, status: 'FAIL', error: error.message, url: page.url(), writes, errors })
  } finally { await context.close() }
}
async function expectNotice(page) {
  const dialog = page.getByRole('dialog', { name: '使用提示', exact: true })
  await dialog.waitFor({ timeout: 2500 }).catch(() => {})
  assert.equal(await dialog.isVisible(), true, 'First use must show 使用提示 before opening or sending')
  return dialog
}
try {
  await runCase('first-open-consent-and-review', async ({ page, writes }) => {
    await page.goto(base + '/portal/home')
    await page.locator('#ai-toggle-btn').click()
    const dialog = await expectNotice(page)
    assert.equal(await page.locator('#ai-panel').getAttribute('aria-hidden'), 'true')
    assert.equal(writes.length, 0)
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '再想想')
    await page.keyboard.press('Escape')
    assert.equal(await dialog.isVisible(), false)
    assert.equal(await page.locator('#ai-toggle-btn').evaluate(el => el === document.activeElement), true)
    await page.locator('#ai-toggle-btn').click()
    await expectNotice(page)
    await dialog.getByRole('button', { name: '再想想', exact: true }).click()
    assert.equal(writes.length, 0)
    await page.locator('#ai-toggle-btn').click()
    await expectNotice(page)
    assert.equal(await dialog.locator('.ai-usage-notice__item').count(), 5)
    const links = dialog.getByRole('link')
    assert.deepEqual(await links.evaluateAll(items => items.map(el => ({ href: el.href, target: el.target, rel: el.rel }))), [
      { href: 'https://myhub.lenovo.com/sites/compliance/corporate_policies/Pages/policy27', target: '_blank', rel: 'noopener noreferrer' },
      { href: 'https://myhub.lenovo.com/sites/legal/Pages/cn/Privacy.aspx', target: '_blank', rel: 'noopener noreferrer' }
    ])
    for (const key of ['Tab', 'Shift+Tab']) for (let i = 0; i < 12; i++) {
      await page.keyboard.press(key)
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'Keyboard focus remains inside modal through a complete cycle')
    }
    await dialog.getByRole('button', { name: '同意', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#ai-panel')?.classList.contains('open'))
    assert.equal(await page.locator('#ai-input').evaluate(el => el === document.activeElement), true)
    await page.getByRole('button', { name: '使用提示', exact: true }).click()
    await expectNotice(page)
    assert.equal(await dialog.getByRole('button', { name: '同意', exact: true }).count(), 0)
    await dialog.getByRole('button', { name: '我知道了', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '使用提示', exact: true }).evaluate(el => el === document.activeElement), true)
    await page.reload()
    await page.locator('#ai-toggle-btn').click()
    await expectNotice(page)
    assert.equal(writes.length, 0)
  })
  await runCase('quick-send-waits-for-consent', async ({ page, writes }) => {
    await page.goto(base + '/dashboard/overview')
    await page.getByRole('button', { name: 'AI 解读', exact: true }).click()
    const dialog = await expectNotice(page)
    assert.equal(writes.length, 0, 'Shortcut must not send before agreement')
    const draft = await page.locator('#ai-input').inputValue()
    assert.ok(draft.includes('运营总览看板'))
    await dialog.getByRole('button', { name: '再想想', exact: true }).click()
    assert.equal(writes.length, 0, 'Reconsider must not send')
    assert.equal(await page.locator('#ai-input').inputValue(), draft, 'Reconsider preserves draft')
    await page.getByRole('button', { name: 'AI 解读', exact: true }).click()
    await expectNotice(page)
    await dialog.getByRole('button', { name: '同意', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#ai-panel')?.classList.contains('open'))
    const originalMessage = page.locator('.ai-msg.user').filter({ hasText: draft })
    await originalMessage.first().waitFor()
    assert.equal(await originalMessage.count(), 1, 'Agreement resumes original shortcut exactly once')
    assert.equal(writes.length, 0, 'This existing local preview still requires its separate business authorization')
  })
  if (process.env.USAGE_NOTICE_RED_ONLY !== 'true') await runCase('short-window-scroll-and-background', async ({ page, writes }) => {
    await page.setViewportSize({ width: 1280, height: 480 })
    await page.goto(base + '/portal/home')
    await page.locator('#ai-toggle-btn').click()
    const dialog = await expectNotice(page)
    await page.locator('#ai-toggle-btn').click({ timeout: 1000 }).then(() => assert.fail('Background control must be inert'), error => {
      assert.ok(error.message.includes('intercepts pointer events') || error.message.includes('Timeout'))
    })
    const body = dialog.locator('.ai-usage-notice__body')
    assert.ok(await body.evaluate(el => el.scrollHeight > el.clientHeight), 'Short window scrolls notice body')
    await body.evaluate(el => { el.scrollTop = el.scrollHeight })
    const geometry = await dialog.getByRole('button', { name: '同意', exact: true }).boundingBox()
    assert.ok(geometry.y >= 0 && geometry.y + geometry.height <= 480)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: path.join(out, 'short-window.png'), fullPage: true })
    await dialog.getByRole('button', { name: '关闭使用提示', exact: true }).click()
    assert.equal(writes.length, 0)
  })
} finally {
  await browser.close()
  await fs.writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ base, results }, null, 2) + '\n')
  console.log(JSON.stringify({ base, results }, null, 2))
}
if (results.some(row => row.status !== 'PASS')) process.exitCode = 1
