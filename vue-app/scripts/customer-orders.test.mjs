import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { computed, reactive, ref } from 'vue'

const serviceUrl = new URL('../src/services/customerOrders.js', import.meta.url)
const viewUrl = new URL('../src/views/order/CustomerOrdersView.vue', import.meta.url)

async function mountOrders(query = {}) {
  const source = await readFile(viewUrl, 'utf8')
  const setup = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm, ''))
  const service = await import(serviceUrl)
  const downloads = [], messages = [], watchers = []
  const route = { meta: { pageId: 'sales.customerOrders' }, query }
  const context = vm.createContext({
    ...service, computed, reactive, ref,
    useRoute: () => route, useRouter: () => ({ replace() {} }),
    useAppStore: () => ({ ensureStaticTab() {} }), onMounted() {}, useDialogFocusManager() {},
    watch: (sources, callback) => watchers.push(callback),
    downloadTextFile: file => downloads.push(file), showWorkbenchToast: message => messages.push(message)
  })
  vm.runInContext(setup, context, { filename: 'CustomerOrdersView.vue setup' })
  const state = vm.runInContext('({ draftFilters, appliedFilters, result, activeTab, currentPage, selectedOrder, openDetails, applyFilters, resetFilters, exportOrders })', context)
  return { ...state, route, downloads, messages, changeQuery(value, pageId = 'sales.customerOrders') {
    route.query.tab = value; route.meta.pageId = pageId
    for (const callback of watchers) callback([pageId, value])
  } }
}

test('customer order tabs expose the six HTML views and filter real rows', async () => {
  const { CUSTOMER_ORDER_TABS, normalizeCustomerOrderTab, queryCustomerOrders } = await import(serviceUrl)

  assert.deepEqual(CUSTOMER_ORDER_TABS.map(tab => tab.key), [
    'customer', 'latest', 'pending', 'unpaid', 'abnormal', 'failed'
  ])
  assert.equal(queryCustomerOrders({ tab: 'customer' }).total, 6)
  assert.equal(queryCustomerOrders({ tab: 'pending' }).total, 4)
  assert.deepEqual(queryCustomerOrders({ tab: 'unpaid' }).items.map(row => row.no), [
    'B2026102606485001X', 'B2026102405103001X'
  ])
  assert.deepEqual(queryCustomerOrders({ tab: 'abnormal' }).items.map(row => row.orderStatus), ['订单异常'])
  assert.deepEqual(queryCustomerOrders({ tab: 'failed' }).items.map(row => row.orderStatus), ['下单失败'])
  assert.equal(normalizeCustomerOrderTab('pending'), 'pending')
  assert.equal(normalizeCustomerOrderTab(['unpaid']), 'unpaid')
  assert.equal(normalizeCustomerOrderTab(undefined), 'customer')
  assert.equal(normalizeCustomerOrderTab(null), 'customer')
  assert.equal(normalizeCustomerOrderTab('not-a-tab'), 'customer')
})

test('customer order query combines business values without display prefixes', async () => {
  const { queryCustomerOrders } = await import(serviceUrl)

  const result = queryCustomerOrders({
    filters: {
      number: '6485',
      name: '昊刻',
      verificationStatus: '未核销',
      orderType: '协议产品',
      orderStart: '2026-10-26',
      orderEnd: '2026-10-26'
    }
  })

  assert.equal(result.error, '')
  assert.equal(result.total, 1)
  assert.equal(result.items[0].no, 'B2026102606485001X')
})

test('customer order query rejects reversed dates and paginates valid results', async () => {
  const { queryCustomerOrders } = await import(serviceUrl)

  assert.deepEqual(queryCustomerOrders({
    filters: { orderStart: '2026-10-27', orderEnd: '2026-10-26' }
  }), {
    items: [],
    total: 0,
    page: 1,
    pageSize: 6,
    error: '下单开始日期不能晚于结束日期。'
  })

  const page = queryCustomerOrders({ page: 2, pageSize: 2 })
  assert.equal(page.total, 6)
  assert.equal(page.page, 2)
  assert.deepEqual(page.items.map(row => row.no), ['B2026102506184001X', 'B2026102405103001X'])
})

test('customer order page uses 1109 filters and accessible local interactions', async () => {
  const view = await readFile(viewUrl, 'utf8')

  assert.equal((view.match(/<ContentPageHeader\b/g) || []).length, 1)
  assert.match(view, /<FilterField\s+layout="placeholder"\s+label="编号查询"/)
  assert.match(view, /<option value="全部">核销状态 - 全部<\/option>/)
  assert.match(view, /<option value="协议产品">订单类型 - 协议产品<\/option>/)
  assert.match(view, /class="filter-date-placeholder"[^>]*>下单开始日期<\/span>/)
  assert.match(view, /class="filter-date-placeholder"[^>]*>下单结束日期<\/span>/)
  assert.match(view, /currentPage\.value = 1/)
  assert.match(view, /router\.replace\(\{ query:/)
  assert.match(view, /watch\(\[\(\) => route\.meta\.pageId, \(\) => route\.query\.tab\]/)
  assert.match(view, /if \(pageId !== PAGE_ID\) \{\s*closeDetails\(\)\s*return/)
  assert.match(view, /normalizeCustomerOrderTab\(value\)/)
  assert.match(view, /downloadTextFile/)
  assert.match(view, /已生成本地支付提醒/)
  assert.match(view, /class="customer-order-dialog"/)
  assert.match(view, /aria-labelledby="customer-order-dialog-title"/)
  assert.match(view, /useDialogFocusManager/)
  assert.match(view, /<FeedbackState/)
})

test('customer order export uses actual applied filters and resets after validation errors', async () => {
  const page = await mountOrders()
  page.draftFilters.orderStart = '2026-10-27'
  page.draftFilters.orderEnd = '2026-10-26'
  page.applyFilters()
  assert.equal(page.result.value.error, '下单开始日期不能晚于结束日期。')
  page.exportOrders()
  assert.equal(page.downloads.length, 0, 'An invalid date range must not produce a misleading empty export')
  assert.equal(page.messages.at(-1), page.result.value.error)
  page.resetFilters()
  page.draftFilters.name = '昊刻'
  page.applyFilters()
  page.exportOrders()
  assert.equal(page.downloads.length, 1)
  assert.equal(page.downloads[0].content.split('\n').length, 3)
  assert.match(page.downloads[0].content, /B2026102606485001X/)
  assert.doesNotMatch(page.downloads[0].content, /华北银行/)
})

test('customer order cached page normalizes actual query changes and ignores other pages', async () => {
  const page = await mountOrders({ tab: ['unpaid', 'failed'] })
  assert.equal(page.activeTab.value, 'unpaid')
  page.currentPage.value = 3
  page.changeQuery(null)
  assert.equal(page.activeTab.value, 'customer')
  assert.equal(page.currentPage.value, 1)
  page.changeQuery('pending')
  assert.equal(page.activeTab.value, 'pending')
  page.changeQuery('failed', 'sales.agreementProducts')
  assert.equal(page.activeTab.value, 'pending')
  page.changeQuery('not-a-tab')
  assert.equal(page.activeTab.value, 'customer')
})

test('leaving cached customer orders closes its dialog before another page receives keyboard input', async () => {
  const page = await mountOrders()
  page.openDetails(page.result.value.items[0])
  assert.equal(page.selectedOrder.value.no, 'B2026102606488001X')
  page.changeQuery('not-ordered', 'sales.agreementProducts')
  assert.equal(page.selectedOrder.value, null)
})
