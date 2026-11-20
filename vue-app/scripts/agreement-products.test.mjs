import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const serviceUrl = new URL('../src/services/agreementProducts.js', import.meta.url)
const viewUrl = new URL('../src/views/order/AgreementProductsView.vue', import.meta.url)

test('agreement product tabs partition the ten HTML preview rows', async () => {
  const { AGREEMENT_PRODUCT_TABS, normalizeAgreementProductTab, queryAgreementProducts } = await import(serviceUrl)

  assert.deepEqual(AGREEMENT_PRODUCT_TABS.map(tab => tab.key), ['all', 'outOfStock', 'expiring', 'pendingAddition', 'ordered'])
  assert.deepEqual(Object.fromEntries(AGREEMENT_PRODUCT_TABS.map(tab => [tab.key, queryAgreementProducts({ tab: tab.key }).total])), {
    all: 10,
    outOfStock: 2,
    expiring: 2,
    pendingAddition: 2,
    ordered: 2
  })
  assert.equal(normalizeAgreementProductTab('expiring'), 'expiring')
  assert.equal(normalizeAgreementProductTab(['ordered']), 'ordered')
  assert.equal(normalizeAgreementProductTab(undefined), 'all')
  assert.equal(normalizeAgreementProductTab(null), 'all')
  assert.equal(normalizeAgreementProductTab('not-a-tab'), 'all')
})

test('agreement product query combines raw business values and explicit dates', async () => {
  const { queryAgreementProducts } = await import(serviceUrl)
  const result = queryAgreementProducts({
    filters: {
      projectNo: 'LP20261025',
      name: '中州',
      productStatus: '待追加',
      publishedStart: '2026-10-26',
      publishedEnd: '2026-10-26',
      expiresStart: '2027-04-30',
      expiresEnd: '2027-04-30'
    }
  })

  assert.equal(result.error, '')
  assert.equal(result.total, 1)
  assert.equal(result.items[0].productCode, 'CTO-M90QG5-032')
})

test('agreement product query rejects either reversed range and paginates', async () => {
  const { queryAgreementProducts } = await import(serviceUrl)

  assert.equal(queryAgreementProducts({ filters: { publishedStart: '2026-10-27', publishedEnd: '2026-10-26' } }).error, '发布开始日期不能晚于结束日期。')
  assert.equal(queryAgreementProducts({ filters: { expiresStart: '2027-05-01', expiresEnd: '2027-04-30' } }).error, '过期开始日期不能晚于结束日期。')

  const page = queryAgreementProducts({ page: 2, pageSize: 3 })
  assert.equal(page.total, 10)
  assert.deepEqual(page.items.map(row => row.projectNo), ['LP20260918', 'LP20260806', 'LP20260722'])
})

test('agreement product page follows 1109 filter and local-action contracts', async () => {
  const view = await readFile(viewUrl, 'utf8')

  assert.equal((view.match(/<ContentPageHeader\b/g) || []).length, 1)
  assert.ok((view.match(/<FilterField\s+layout="placeholder"/g) || []).length >= 5)
  assert.match(view, /<option value="全部">产品状态 - 全部<\/option>/)
  assert.match(view, />发布时间开始<\/span>/)
  assert.match(view, />发布时间结束<\/span>/)
  assert.match(view, />过期开始日期<\/span>/)
  assert.match(view, />过期结束日期<\/span>/)
  assert.match(view, /currentPage\.value = 1/)
  assert.match(view, /router\.replace\(\{ query:/)
  assert.match(view, /watch\(\[\(\) => route\.meta\.pageId, \(\) => route\.query\.tab\]/)
  assert.match(view, /if \(pageId !== PAGE_ID\) return/)
  assert.match(view, /normalizeAgreementProductTab\(value\)/)
  assert.match(view, /id="agreement-products-published-date-error"/)
  assert.match(view, /id="agreement-products-expires-date-error"/)
  assert.match(view, /:aria-describedby="publishedDateError/)
  assert.match(view, /:aria-describedby="expiresDateError/)
  assert.match(view, /代客下单能力待接入业务系统/)
  assert.match(view, /<FeedbackState/)
  assert.match(view, /<DataTable/)
  assert.match(view, /<Pagination/)
})
