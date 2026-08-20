import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

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
const baseUrl = process.env.SKILL_HUB_QA_BASE_URL || 'http://127.0.0.1:4173/admin-vue'
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

await context.addInitScript(() => {
  localStorage.clear()
  localStorage.setItem('preview_user', 'admin')
})

const page = await context.newPage()
await page.route('**/api/admin/me', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ admin: { username: 'admin' } })
}))
await page.route('**/api/harness/menu', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ permissions: ['*'], menus: ['dashboard', 'geo', 'employee', 'lead', 'order'] })
}))
await page.goto(`${baseUrl}/agent/skills`, { waitUntil: 'networkidle' })
await page.locator('.skill-hub-page').waitFor()

const cards = page.locator('.skill-hub-stat')
const rows = page.locator('.skill-hub-table tbody .skill-hub-row')
assert.equal(await cards.count(), 6, 'Skill Hub 应展示六张汇总筛选卡')

const allRows = Number(await cards.nth(0).locator('strong').textContent())
assert.equal(await rows.count(), allRows, '默认列表数量应与全部 Skill 卡一致')

for (let index = 0; index < await cards.count(); index += 1) {
  const card = cards.nth(index)
  await card.click()
  const expectedRows = Number(await card.locator('strong').innerText())
  assert.equal(await card.getAttribute('aria-pressed'), 'true', `第 ${index + 1} 张卡点击后应进入选中态`)
  assert.equal(await rows.count(), expectedRows, `第 ${index + 1} 张卡的数字应与筛选结果一致`)

  if (index > 0) {
    await card.click()
    assert.equal(await cards.nth(0).getAttribute('aria-pressed'), 'true', '再次点击当前卡应恢复全部 Skill')
    assert.equal(await rows.count(), allRows, '恢复全部后列表数量应回到全部 Skill')
  }
}

const keyword = page.locator('.skill-hub-toolbar input').first()
const status = page.locator('.skill-hub-toolbar select').nth(0)
const category = page.locator('.skill-hub-toolbar select').nth(1)
await keyword.fill('不会命中的关键词')
await status.selectOption('review')
await category.selectOption({ index: 1 })
await cards.nth(3).click()
assert.equal(await keyword.inputValue(), '', '点击汇总卡应清空关键词')
assert.equal(await status.inputValue(), 'all', '点击汇总卡应清空状态条件')
assert.equal(await category.inputValue(), 'all', '点击汇总卡应清空分类条件')

await cards.nth(1).click()
const ownedRows = page.locator('.skill-hub-table tbody .skill-hub-row')
assert.equal(await ownedRows.count(), Number(await cards.nth(1).locator('strong').innerText()), '我的 Skill 卡应只展示本人 Skill')
for (let index = 0; index < await ownedRows.count(); index += 1) {
  assert.equal(await ownedRows.nth(index).getByRole('button', { name: '编辑', exact: true }).count(), 1, '本人非更新 Skill 应有且只有一个编辑入口')
}

const rejectedRow = page.locator('.skill-hub-row[data-status="rejected"]').first()
await rejectedRow.getByRole('button', { name: '编辑', exact: true }).click()
await page.waitForURL(/\/admin-vue\/agent\/skill-create/)
const rejectedDraft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('leai.skillCreateDraft') || '{}'))
assert.equal(rejectedDraft.rejected, true, '已驳回 Skill 点击编辑应保留驳回修改上下文')

await page.goto(`${baseUrl}/agent/skills`, { waitUntil: 'networkidle' })
await page.locator('.skill-hub-page').waitFor()
for (const skillName of ['product-knowledge', 'voucher-recommend']) {
  const updateRow = page.locator('.skill-hub-row').filter({ hasText: skillName })
  assert.equal(await updateRow.getByRole('button', { name: '编辑', exact: true }).count(), 0, '能力更新 Skill 不得出现普通编辑入口')
}
const otherOwnerRow = page.locator('.skill-hub-row').filter({ hasText: 'lenovo-order-detail-query' })
assert.equal(await otherOwnerRow.getByRole('button', { name: '编辑', exact: true }).count(), 0, '非本人 Skill 不得出现普通编辑入口')

await context.close()
await browser.close()
console.log('Skill Hub summary card browser verification passed.')
