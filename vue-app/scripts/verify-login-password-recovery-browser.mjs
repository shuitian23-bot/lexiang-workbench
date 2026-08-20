import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    'playwright',
    path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
  ].filter(Boolean)
  for (const candidate of candidates) {
    try { return require(candidate) } catch {}
  }
  throw new Error('未找到 Playwright。')
}

const { chromium } = loadPlaywright()
const baseUrl = process.env.PERMISSION_QA_BASE_URL || 'http://localhost:5173/admin-vue'
const browserErrors = []
const screenshots = []
const recoveryRequests = []

function attachDiagnostics(page) {
  page.on('pageerror', (error) => browserErrors.push('pageerror: ' + error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      browserErrors.push('console: ' + message.text())
    }
  })
}

async function screenshot(page, name) {
  const file = path.join(os.tmpdir(), 'leaibot-' + name + '.png')
  await page.screenshot({ path: file, fullPage: true })
  screenshots.push(file)
}

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
attachDiagnostics(page)

await page.route('**/api/admin/password-recovery/**', async (route) => {
  const request = route.request()
  recoveryRequests.push({ url: request.url(), body: request.postDataJSON() })
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, token: 'browser-test-recovery-token' })
  })
})

await page.goto(baseUrl + '/login', { waitUntil: 'domcontentloaded' })
await page.locator('#login-screen').waitFor()
assert.equal(await page.getByRole('button', { name: '忘记密码', exact: true }).count(), 0, '内部用户登录不得展示忘记密码入口')

await page.getByRole('tab', { name: '外部用户登录', exact: true }).click()
const forgotButton = page.getByRole('button', { name: '忘记密码', exact: true })
await forgotButton.waitFor()
await page.getByLabel('用户名').fill('external-demo')
await forgotButton.click()

let dialog = page.getByRole('dialog', { name: '找回密码', exact: true })
await dialog.waitFor()
assert.equal(await dialog.getAttribute('aria-modal'), 'true', '找回密码必须使用标准模态语义')
const accountInput = dialog.getByPlaceholder('请输入外部用户登录名')
assert.equal(await accountInput.inputValue(), 'external-demo', '应带入登录页已填写的用户名')
assert.equal(await accountInput.evaluate((element) => element === document.activeElement), true, '打开弹窗后应聚焦用户名')

await dialog.getByRole('button', { name: '下一步', exact: true }).click()
await dialog.getByText('请输入账号已绑定的手机号。', { exact: true }).waitFor()
const mobileInput = dialog.getByPlaceholder('请输入账号已绑定的手机号')
await mobileInput.fill('123')
await dialog.getByRole('button', { name: '获取验证码', exact: true }).click()
await dialog.getByText('请输入正确的手机号格式。', { exact: true }).waitFor()

await mobileInput.fill('13800138000')
await dialog.getByRole('button', { name: '获取验证码', exact: true }).click()
await dialog.getByText('本地预览验证码：246810', { exact: true }).waitFor()
assert.equal(await dialog.getByRole('button', { name: /后重发/ }).isDisabled(), true, '验证码发送后必须进入倒计时并禁止重复发送')
assert.equal(recoveryRequests.at(-1)?.body?.method, 'mobile', '手机号方式应按约定提交到验证码接口')

const codeInput = dialog.getByPlaceholder('请输入 6 位验证码')
await codeInput.fill('111111')
await dialog.getByRole('button', { name: '下一步', exact: true }).click()
await dialog.getByText('验证码错误，请重新输入。', { exact: true }).waitFor()
await codeInput.fill('246810')
await dialog.getByRole('button', { name: '下一步', exact: true }).click()
await dialog.getByText('身份验证已通过', { exact: true }).waitFor()
assert.equal(await dialog.getByPlaceholder('请输入至少 8 位的新密码').evaluate((element) => element === document.activeElement), true, '验证通过后应聚焦新密码')

await dialog.getByPlaceholder('请输入至少 8 位的新密码').fill('short')
await dialog.getByPlaceholder('请再次输入新密码').fill('short')
await dialog.getByRole('button', { name: '确认修改密码', exact: true }).click()
await dialog.getByText('新密码至少需要 8 位。', { exact: true }).waitFor()

await dialog.getByPlaceholder('请输入至少 8 位的新密码').fill('Password1')
await dialog.getByPlaceholder('请再次输入新密码').fill('Password2')
await dialog.getByRole('button', { name: '确认修改密码', exact: true }).click()
await dialog.getByText('两次输入的新密码不一致。', { exact: true }).waitFor()
await dialog.getByPlaceholder('请再次输入新密码').fill('Password1')
await dialog.getByRole('button', { name: '确认修改密码', exact: true }).click()
await dialog.getByText('密码修改成功', { exact: true }).waitFor()
assert.equal(recoveryRequests.at(-1)?.body?.new_password, 'Password1', '确认后应提交新密码到改密接口')
await screenshot(page, 'login-password-recovery-success-1440')

await dialog.getByRole('button', { name: '返回登录', exact: true }).click()
assert.equal(await page.getByLabel('用户名').inputValue(), 'external-demo', '完成后应回填账号')
assert.equal(await page.locator('#external-login-password').inputValue(), '', '完成后不得回填或保留密码')
assert.equal(await forgotButton.evaluate((element) => element === document.activeElement), true, '关闭后应恢复入口焦点')

await forgotButton.click()
dialog = page.getByRole('dialog', { name: '找回密码', exact: true })
await dialog.getByRole('radio', { name: '邮箱验证', exact: true }).click()
await dialog.getByPlaceholder('请输入账号已绑定的邮箱').fill('external@example.com')
await dialog.getByRole('button', { name: '获取验证码', exact: true }).click()
await dialog.getByText('本地预览验证码：246810', { exact: true }).waitFor()
assert.equal(recoveryRequests.at(-1)?.body?.method, 'email', '邮箱方式应按约定提交到验证码接口')
await dialog.getByRole('button', { name: '取消', exact: true }).click()

await page.setViewportSize({ width: 390, height: 844 })
await forgotButton.click()
dialog = page.getByRole('dialog', { name: '找回密码', exact: true })
const box = await dialog.boundingBox()
assert.ok(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844, '390×844 视口下弹窗不得溢出')
await screenshot(page, 'login-password-recovery-mobile-390')

assert.deepEqual(browserErrors, [], '浏览器控制台出现错误：' + browserErrors.join('; '))
await context.close()
await browser.close()
console.log(JSON.stringify({ screenshots, recoveryRequests: recoveryRequests.length, browserErrors }, null, 2))
