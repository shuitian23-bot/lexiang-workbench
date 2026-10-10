import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const origin = process.env.SKILL_FEEDBACK_QA_ORIGIN || 'http://127.0.0.1:19439'
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin), 'This test is local-only')
const output = process.env.SKILL_FEEDBACK_QA_OUTPUT || '/private/tmp/skill-package-feedback-browser'
mkdirSync(output, { recursive: true })
const report = { origin, cases: [], pageErrors: [], unexpectedRequests: [], passed: false }
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, timeout: 15000, ...(existsSync(chrome) ? { executablePath: chrome } : {}) })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin !== origin || !['GET', 'HEAD'].includes(req.method())) {
      report.unexpectedRequests.push({ url: req.url(), method: req.method() }); return route.abort()
    }
    if (url.pathname.startsWith('/api/')) {
      const body = url.pathname === '/api/admin/me' ? { admin: { username: 'feedback-alice' } }
        : url.pathname === '/api/harness/menu' ? { permissions: ['*'], menus: ['agent', 'employee', 'lead', 'order', 'dashboard'] }
          : {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    return route.continue()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => report.pageErrors.push(error.message))
  const modal = page.locator('#agent-skill-modal.open')
  const cards = modal.locator('.agent-skill-card')
  const up = index => cards.nth(index).locator('[data-feedback="up"]')
  const down = index => cards.nth(index).locator('[data-feedback="down"]')
  const expectChoice = async (index, expected) => {
    await page.waitForFunction(({ index, expected }) => {
      const card = document.querySelectorAll('#agent-skill-modal.open .agent-skill-card')[index]
      return ['up', 'down'].every(value => card?.querySelector(`[data-feedback="${value}"]`)?.getAttribute('aria-pressed') === String(value === expected))
    }, { index, expected }, { timeout: 10000 })
  }
  const open = async () => {
    await page.getByRole('button', { name: '管理技能包', exact: true }).click()
    await modal.waitFor()
    await up(0).waitFor()
  }
  const close = async () => { await modal.locator('.agent-skill-modal-close').click(); await modal.waitFor({ state: 'hidden' }) }
  const actor = async username => page.evaluate(async username => {
    const { useAppStore } = await import('/admin-vue/src/stores/app.ts')
    useAppStore().user = username
  }, username)
  console.log('Open actual local portal and skill manager')
  await page.goto(origin + '/admin-vue/portal/home', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.getByRole('button', { name: '管理技能包', exact: true }).waitFor()
  await open()
  const count = await cards.count()
  assert.ok(count > 1)
  assert.equal(await modal.locator('[data-feedback]').count(), count * 2)
  assert.equal(await modal.locator('.skill-package-feedback').count(), count)
  assert.equal((await modal.locator('.skill-package-feedback').allTextContents()).join('').trim(), '', 'Icons have no aggregate counts')
  await expectChoice(0, null)
  await up(0).click(); await expectChoice(0, 'up')
  await down(0).click(); await expectChoice(0, 'down')
  await down(0).click(); await expectChoice(0, null)
  await up(0).click(); await down(1).click()
  await expectChoice(0, 'up'); await expectChoice(1, 'down')
  report.cases.push({ name: 'real-cards-select-switch-cancel-independent', cards: count })

  await close(); await open()
  await expectChoice(0, 'up'); await expectChoice(1, 'down')
  await close(); await page.reload({ waitUntil: 'domcontentloaded' }); await open()
  await expectChoice(0, 'up'); await expectChoice(1, 'down')
  report.cases.push({ name: 'reopen-and-reload-restores-choice' })
  await actor('feedback-bob'); await expectChoice(0, null); await expectChoice(1, null)
  await down(0).click(); await expectChoice(0, 'down')
  await actor('feedback-alice'); await expectChoice(0, 'up'); await expectChoice(1, 'down')
  await actor(null); await expectChoice(0, null); assert.equal(await up(0).isDisabled(), true)
  await actor('feedback-alice'); await expectChoice(0, 'up')
  report.cases.push({ name: 'account-isolation-and-no-guest-feedback' })

  const title = await cards.nth(0).locator('.agent-skill-card-name').innerText()
  await modal.locator('.skill-page-search').fill(title)
  assert.equal(await cards.filter({ visible: true }).count(), 1)
  await expectChoice(0, 'up')
  await modal.locator('.skill-page-search').fill('')
  const switcher = cards.nth(0).locator('.skill-package-switch')
  const enabled = await switcher.getAttribute('aria-pressed')
  await switcher.click(); assert.notEqual(await switcher.getAttribute('aria-pressed'), enabled); await expectChoice(0, 'up')
  await switcher.click(); assert.equal(await switcher.getAttribute('aria-pressed'), enabled)
  await modal.locator('[data-skill-filter="disabled"]').click()
  const visibleStatus = await cards.filter({ visible: true }).evaluateAll(elements => elements.map(el => el.getAttribute('data-skill-status')))
  assert.ok(visibleStatus.every(status => status === 'disabled'))
  await modal.locator('[data-skill-filter="all"]').click(); await expectChoice(0, 'up')
  report.cases.push({ name: 'search-filter-switch-preserved' })

  await down(0).focus(); await page.keyboard.press('Enter'); await expectChoice(0, 'down')
  await page.keyboard.press('Space'); await expectChoice(0, null)
  await up(0).click(); await expectChoice(0, 'up')
  await page.evaluate(() => { window.__feedbackSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key.startsWith('leaibot:skill-package-feedback:')) throw new DOMException('Blocked', 'QuotaExceededError'); return window.__feedbackSetItem.call(this, key, value) } })
  await down(0).click(); await expectChoice(0, 'up')
  await page.getByText('未能保存反馈，请检查浏览器存储权限后重试。', { exact: true }).waitFor()
  await page.evaluate(() => { Storage.prototype.setItem = window.__feedbackSetItem; delete window.__feedbackSetItem })
  report.cases.push({ name: 'keyboard-and-storage-failure-keeps-old-choice' })
  await page.getByText('未能保存反馈，请检查浏览器存储权限后重试。', { exact: true }).waitFor({ state: 'hidden' })

  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const geometry = await cards.nth(0).evaluate(card => {
      const footer = card.querySelector('.agent-skill-card-foot'), group = card.querySelector('.skill-package-feedback'), toggle = card.querySelector('.skill-package-switch'), usage = footer.querySelector(':scope > span:not(.skill-package-feedback)')
      const rect = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height } }
      return { pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, footer: rect(footer), group: rect(group), toggle: rect(toggle), usage: rect(usage) }
    })
    assert.ok(geometry.pageOverflow <= 1)
    assert.ok(geometry.usage.right <= geometry.group.left && geometry.group.right <= geometry.toggle.left)
    assert.ok(geometry.toggle.right <= geometry.footer.right + 1)
    await page.screenshot({ path: path.join(output, `skill-package-feedback-${width}.png`), animations: 'disabled' })
    report.cases.push({ name: 'layout', width, geometry })
  }

  await page.evaluate(() => {
    const grid = document.querySelector('#agent-skill-modal .skill-page-grid')
    grid.replaceChildren(...Array.from({ length: 62 }, (_, index) => {
      const card = document.createElement('div'); card.className = 'agent-skill-card'; card.dataset.skillId = `fixture-${index}`; card.dataset.skillStatus = 'enabled'
      card.innerHTML = `<div class="agent-skill-card-name">动态技能 ${index + 1}</div><div class="agent-skill-card-foot"><span>0 次使用</span><button class="skill-package-switch is-on" type="button" aria-pressed="true"><span></span><em>开</em></button></div>`
      return card
    }))
  })
  await page.waitForFunction(() => document.querySelectorAll('#agent-skill-modal.open [data-feedback]').length === 124)
  await up(61).click(); await expectChoice(61, 'up')
  await expectChoice(0, null)
  await page.evaluate(() => { const grid = document.querySelector('#agent-skill-modal .skill-page-grid'); grid.prepend(grid.lastElementChild) })
  await expectChoice(0, 'up'); await expectChoice(1, null)
  assert.equal(await modal.locator('.skill-package-feedback').count(), 62)
  report.cases.push({ name: '62-dynamic-fixture-cards-reorder-stable-identity', fixtureNotRealBackendData: true })
  await close(); await open(); assert.equal(await cards.count(), count); await expectChoice(0, 'up')
  for (let i = 0; i < 3; i++) { await close(); await open() }
  assert.equal(await modal.locator('.skill-package-feedback').count(), count)
  await up(0).click(); await expectChoice(0, null)
  await close(); await open(); await expectChoice(0, null)
  report.cases.push({ name: 'repeated-rebuild-no-duplicate-buttons-and-cancellation-persists' })

  // Legacy rendering uses titles as skill identities. Repeated display cards
  // for that identity must remain mounted and show the same personal choice.
  await page.evaluate(() => {
    const grid = document.querySelector('#agent-skill-modal .skill-page-grid')
    const clone = grid.querySelector('.agent-skill-card').cloneNode(true)
    clone.querySelector('.skill-package-feedback')?.remove()
    grid.append(clone)
  })
  await page.waitForFunction(expected => document.querySelectorAll('#agent-skill-modal.open [data-feedback]').length === expected, (count + 1) * 2)
  await up(count).click(); await expectChoice(count, 'up'); await expectChoice(0, 'up')
  await down(0).click(); await expectChoice(0, 'down'); await expectChoice(count, 'down')
  report.cases.push({ name: 'duplicate-legacy-identity-mounts-all-cards-and-shares-choice' })

  await page.evaluate(() => {
    const footer = document.querySelector('#agent-skill-modal .agent-skill-card-foot')
    footer.innerHTML = '<span>99 次使用</span><button class="skill-package-switch is-on" type="button" aria-pressed="true"><span></span><em>开</em></button>'
  })
  await up(0).waitFor(); await expectChoice(0, 'down')
  await up(0).click(); await expectChoice(0, 'up'); await expectChoice(count, 'up')
  await page.evaluate(() => document.querySelector('#agent-skill-modal .skill-package-feedback').remove())
  await up(0).waitFor(); await expectChoice(0, 'up')
  assert.equal(await modal.locator('.skill-package-feedback').count(), count + 1)
  report.cases.push({ name: 'same-footer-innerHTML-and-control-removal-remount-safely' })
  await close(); await open()
  assert.equal(await modal.locator('.skill-package-feedback').count(), count)
  await page.evaluate(() => {
    const grid = document.querySelector('#agent-skill-modal .skill-page-grid')
    const first = grid.querySelector('.agent-skill-card')
    first.dataset.skillId = 'same-title-distinct-a'
    const clone = first.cloneNode(true)
    clone.dataset.skillId = 'same-title-distinct-b'
    clone.querySelector('.skill-package-feedback')?.remove()
    grid.append(clone)
  })
  await page.waitForFunction(expected => document.querySelectorAll('#agent-skill-modal.open [data-feedback]').length === expected, (count + 1) * 2)
  await expectChoice(0, null); await expectChoice(count, null)
  await up(0).click(); await expectChoice(0, 'up'); await expectChoice(count, null)
  await down(count).click(); await expectChoice(count, 'down'); await expectChoice(0, 'up')
  report.cases.push({ name: 'same-title-distinct-explicit-identities-remain-independent' })
  assert.deepEqual(report.pageErrors, [])
  assert.deepEqual(report.unexpectedRequests, [])
  report.passed = true
  await context.close()
} catch (error) {
  report.failure = error.stack || String(error)
  throw error
} finally {
  await browser.close()
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
