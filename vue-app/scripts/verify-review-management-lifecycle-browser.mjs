import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
const origin = process.env.REVIEW_QA_ORIGIN || 'http://127.0.0.1:19449'
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const output = process.env.REVIEW_QA_OUTPUT || path.join(os.tmpdir(), 'review-management-lifecycle-browser')
mkdirSync(output, { recursive: true })
const report = { cases: [], errors: [], unexpectedRequests: [], passed: false }
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', timeout: 15000 })

async function createSafeContext(beforeContinue) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) {
      report.unexpectedRequests.push({ url: request.url(), method: request.method() })
      return route.abort()
    }
    if (url.pathname.startsWith('/api/')) {
      const body = url.pathname === '/api/admin/me' ? { admin: { username: 'review-poc-qa' } }
        : url.pathname === '/api/harness/menu' ? { permissions: [], menus: ['dashboard'] } : {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    }
    await beforeContinue?.(url)
    return route.continue()
  })
  await context.addInitScript(() => {
    const NativeResizeObserver = window.ResizeObserver
    window.__reviewObserverAudit = []
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback) {
        super(callback)
        this.audit = { review: false, observing: false }
        window.__reviewObserverAudit.push(this.audit)
      }
      observe(target, ...args) {
        if (target.matches?.('.review-chart')) this.audit.review = true
        this.audit.observing = true
        return super.observe(target, ...args)
      }
      disconnect() {
        this.audit.observing = false
        return super.disconnect()
      }
    }
  })
  return context
}

async function openPage(context, route) {
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => report.errors.push(error.message))
  await page.goto(origin + '/admin-vue' + route, { waitUntil: 'domcontentloaded' })
  await page.locator('.nav-group[data-group="reviews"]').waitFor()
  return page
}

async function navigate(page, name) {
  await page.locator('.nav-group[data-group="reviews"]').getByRole('button', { name, exact: true }).click()
  await page.getByRole('heading', { name, exact: true, level: 1 }).waitFor()
}

async function summaryTab(page, name) {
  await page.getByRole('tablist', { name: '评估视图', exact: true }).getByRole('tab', { name, exact: typeof name === 'string' }).click()
}

async function backWithNoModal(page, name, route) {
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.locator('#app').getAttribute('inert'), '')
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(expected => location.pathname.endsWith(expected), route)
  await page.waitForFunction(() => !document.getElementById('app').inert && !document.querySelector('.rs-detail-layer,.ag-modal-layer,.rse-modal-layer'))
  report.cases.push({ name, route, dialogs: await page.getByRole('dialog').count(), appInert: false })
}

try {
  const context = await createSafeContext()
  const page = await openPage(context, '/reviews/assist')
  await navigate(page, '评价总结')
  await summaryTab(page, '查询')
  const summary = page.locator('.review-summary-page')
  await summary.getByPlaceholder('商品名称', { exact: true }).fill('ThinkBook')
  await summary.getByRole('button', { name: '查询', exact: true }).click()
  await page.getByRole('button', { name: '查看总结', exact: true }).first().click()
  await backWithNoModal(page, 'Summary detail closes on browser back', '/reviews/assist')
  await navigate(page, '评价总结')
  assert.equal(await summary.getByPlaceholder('商品名称', { exact: true }).inputValue(), 'ThinkBook')
  assert.equal(await summary.locator('tbody tr').count(), 1)
  assert.equal(await page.getByRole('dialog').count(), 0)
  report.cases.push({ name: 'Cached summary filter is retained without reopening its detail' })
  await summary.getByRole('button', { name: '重置', exact: true }).click()
  await summaryTab(page, '标注')
  await page.getByRole('button', { name: '查看抽样规则', exact: true }).click()
  await backWithNoModal(page, 'Sampling rules close on browser back', '/reviews/assist')
  await navigate(page, '评价总结')
  await summaryTab(page, /^处置/)
  await page.getByRole('button', { name: '查看流转', exact: true }).first().click()
  await backWithNoModal(page, 'Ticket flow closes on browser back', '/reviews/assist')
  await navigate(page, '评价总结')
  await page.getByLabel('当前角色', { exact: true }).selectOption('仲裁员')
  await page.getByRole('button', { name: '裁决', exact: true }).click()
  await backWithNoModal(page, 'Ticket action closes on browser back', '/reviews/assist')
  await navigate(page, '评价总结')
  assert.equal(await page.getByLabel('当前角色', { exact: true }).inputValue(), '仲裁员')
  assert.equal(await page.getByRole('dialog').count(), 0)
  await navigate(page, '辅助生成')
  await page.getByRole('button', { name: '查看草稿', exact: true }).first().click()
  await backWithNoModal(page, 'Draft detail closes on browser back', '/reviews/summary')

  await summaryTab(page, '分析')
  await page.locator('.review-chart canvas').first().waitFor()
  const chartHosts = await page.locator('.review-chart').elementHandles()
  assert.equal(chartHosts.length, 8)
  await navigate(page, '辅助生成')
  await page.setViewportSize({ width: 1280, height: 1000 })
  assert.equal((await Promise.all(chartHosts.map(host => host.evaluate(node => node.isConnected)))).every(connected => !connected), true)
  const observers = await page.evaluate(() => window.__reviewObserverAudit.filter(item => item.review))
  assert.equal(observers.length, 8)
  assert.equal(observers.every(item => !item.observing), true)
  report.cases.push({ name: 'All eight chart ResizeObservers suspend while route is cached', observers })
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: '评价总结', exact: true, level: 1 }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('.review-chart')].every(node => {
    const canvas = node.querySelector('canvas')
    return canvas && node.clientWidth > 0 && Math.abs(canvas.clientWidth - node.clientWidth) <= 1
  }))
  const chartSizes = await page.locator('.review-chart').evaluateAll(nodes => nodes.map(node => ({ width: node.clientWidth, canvasWidth: node.querySelector('canvas')?.clientWidth })))
  assert.equal(chartSizes.length, 8)
  report.cases.push({ name: 'Reactivated charts resize from 1440 to 1280 without duplicate canvases', chartSizes })
  assert.equal(await page.locator('.review-chart canvas').count(), 8)
  await page.screenshot({ path: path.join(output, 'reactivated-charts.png'), fullPage: true })
  await context.close()

  // Delay Vite's ECharts runtime import while the first analysis route is deactivated.
  let releaseRuntime
  const runtimeGate = new Promise(resolve => { releaseRuntime = resolve })
  const delayedContext = await createSafeContext(async url => {
    if (/\/echarts\.js$/.test(url.pathname)) await runtimeGate
  })
  try {
    const delayedPage = await openPage(delayedContext, '/reviews/summary')
    const runtimeRequest = delayedPage.waitForRequest(request => /\/echarts\.js$/.test(new URL(request.url()).pathname))
    await summaryTab(delayedPage, '分析')
    const requestedUrl = (await runtimeRequest).url()
    const pendingHosts = await delayedPage.locator('.review-chart').elementHandles()
    assert.equal(pendingHosts.length, 8)
    await navigate(delayedPage, '辅助生成')
    releaseRuntime()
    await delayedPage.evaluate(async url => { await import(/* @vite-ignore */ url) }, requestedUrl)
    await delayedPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const hiddenCanvases = await Promise.all(pendingHosts.map(host => host.evaluate(node => node.querySelectorAll('canvas').length)))
    assert.deepEqual(hiddenCanvases, Array(8).fill(0))
    assert.equal(await delayedPage.evaluate(() => window.__reviewObserverAudit.some(item => item.review)), false)
    await navigate(delayedPage, '评价总结')
    await delayedPage.waitForFunction(() => document.querySelectorAll('.review-chart canvas').length === 8)
    report.cases.push({ name: 'Delayed runtime does not initialize cached charts; activation creates eight visible charts', hiddenCanvases })
  } finally {
    releaseRuntime()
    await delayedContext.close()
  }
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.unexpectedRequests, [])
  report.passed = true
} catch (error) {
  report.error = String(error)
  process.exitCode = 1
} finally {
  await browser.close()
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
