import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8')
  } catch {
    return ''
  }
}

test('enterprise customer and order menus add the requested entries without replacing existing order management', async () => {
  const appStore = await source('../src/stores/app.ts')

  assert.match(appStore, /'lead\.governmentPool':\s*\{ label: '线索池-政企', path: '\/lead\/government-pool' \}/)
  assert.match(appStore, /'order\.purchaseOrders':\s*\{ label: '协议采购单管理', path: '\/order\/purchase-orders' \}/)
  assert.match(appStore, /'order\.agreement':\s*\{ label: '协议产品订单管理', path: '\/order\/agreement' \}/)
})

test('new menu entries have isolated visible routes and an order detail route', async () => {
  const router = await source('../src/router/index.ts')

  assert.match(router, /LeadGovernmentPool\s*=\s*\(\) => import\('@\/views\/lead\/LeadGovernmentPoolView\.vue'\)/)
  assert.match(router, /AgreementOrder\s*=\s*\(\) => import\('@\/views\/order\/AgreementOrderView\.vue'\)/)
  assert.match(router, /path: 'lead\/government-pool',[\s\S]{0,140}pageId: 'lead\.governmentPool'/)
  assert.match(router, /path: 'order\/agreement',[\s\S]{0,140}pageId: 'order\.agreement'/)
  assert.match(router, /path: 'hidden\/order\/agreement-detail',[\s\S]{0,160}pageId: 'order\.agreement\.detail'/)
  assert.match(router, /path: 'order\/purchase-orders',[\s\S]{0,160}pageId: 'order\.purchaseOrders'/)
})

test('advertising product video POC is added without replacing existing menu entries', async () => {
  const appStore = await source('../src/stores/app.ts')

  assert.match(appStore, /advertising:\s*\{[\s\S]{0,240}label: '广告管理'/)
  assert.match(appStore, /'advertising\.productVideo':\s*\{ label: '商品视频管理', path: '\/advertising\/product-videos' \}/)
  assert.match(appStore, /\['employee', 'lead', 'order', 'advertising'\]/)
  assert.match(appStore, /'lead\.governmentPool':\s*\{ label: '线索池-政企'/)
  assert.match(appStore, /'order\.agreement':\s*\{ label: '协议产品订单管理'/)
})

test('advertising product video POC keeps its route and mock data isolated', async () => {
  const router = await source('../src/router/index.ts')
  const view = await source('../src/views/advertising/ProductVideoConfigView.vue')
  const service = await source('../src/services/productVideos.ts')

  assert.match(router, /ProductVideoConfig\s*=\s*\(\) => import\('@\/views\/advertising\/ProductVideoConfigView\.vue'\)/)
  assert.match(router, /path: 'advertising\/product-videos',[\s\S]{0,180}pageId: 'advertising\.productVideo'/)
  assert.match(router, /path: 'agent\/permissions',[\s\S]{0,180}pageId: 'agent\.permissions'/)
  assert.match(view, /from '@\/services\/productVideos'/)
  assert.match(view, /from '@\/components\/content\/ContentPageHeader\.vue'/)
  assert.match(view, /from '\.\/components\/ProductVideoSectionHeader\.vue'/)
  assert.doesNotMatch(view, /@\/components\/content-slot/)
  assert.match(view, /appStore\.ensureStaticTab\('advertising\.productVideo'\)/)
  assert.match(service, /export function listProductVideos/)
  assert.match(service, /export function saveProductVideo/)
  assert.match(service, /export function updateVideoStatus/)
})

test('new pages use the established native runtime bridge', async () => {
  const governmentView = await source('../src/views/lead/LeadGovernmentPoolView.vue')
  const agreementView = await source('../src/views/order/AgreementOrderView.vue')
  const adapter = await source('../src/adapters/legacyWorkbench/nativeWorkbenchRuntime.ts')

  assert.match(governmentView, /const pageId = 'lead\.governmentPool'/)
  assert.match(agreementView, /const pageId = 'order\.agreement'/)
  assert.match(adapter, /admin-runtime\/workbench-agreement-orders\.js/)
  assert.match(adapter, /pageId === 'lead\.governmentPool'/)
  assert.match(adapter, /pageId === 'order\.agreement'/)
})

test('government lead runtime is added without importing unrelated score-model changes', async () => {
  const leadRuntime = await source('../public/admin-runtime/workbench-lead.js')

  assert.match(leadRuntime, /function renderGovernmentPool\(\)/)
  assert.match(leadRuntime, /function governmentPoolRefresh\(\)/)
  assert.match(leadRuntime, /PAGE_RENDERERS\['lead\.governmentPool'\] = renderGovernmentPool/)
  assert.doesNotMatch(leadRuntime, /const RULE_SITES=/)
  assert.doesNotMatch(leadRuntime, /LEAD\.scoreSiteFilter/)
})

test('agreement product order runtime keeps the requested list and detail behavior isolated', async () => {
  const orderRuntime = await source('../public/admin-runtime/workbench-agreement-orders.js')

  assert.match(orderRuntime, /PAGE_RENDERERS\['order\.agreement'\]=renderProductOrders/)
  assert.match(orderRuntime, /PAGE_RENDERERS\['order\.agreement\.detail'\]=renderAgreementProductOrderDetail/)
  assert.match(orderRuntime, /采购单编号/)
  assert.match(orderRuntime, /收货地址明细/)
  assert.match(orderRuntime, /agreementProductOrderQuery/)
})
