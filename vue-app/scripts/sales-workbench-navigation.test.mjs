import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('sales workbench exposes the five confirmed pages from the HTML migration', async () => {
  const appStore = await read('../src/stores/app.ts')
  const salesBlock = appStore.match(/\n  sales:\s*\{[\s\S]*?\n  \}/)?.[0] || ''

  assert.match(salesBlock, /label: '销售工作台'/)
  const children = [...salesBlock.matchAll(/'(sales\.[^']+)':\s*\{\s*label: '([^']+)',\s*path: '([^']+)'\s*\}/g)]
  assert.deepEqual(children.map(match => match.slice(1)), [
    ['sales.customerOrders', '客户订单管理', '/sales/customer-orders'],
    ['sales.agreementProductRelations', '协议产品关系维护', '/sales/agreement-product-relations'],
    ['sales.agreementProducts', '协议产品查询', '/sales/agreement-products'],
    ['sales.dashboard', '销售看板', '/sales/dashboard'],
    ['sales.agreementMembers', '协议会员管理', '/sales/agreement-members']
  ])
  assert.equal((salesBlock.match(/'sales\./g) || []).length, children.length)
})

test('sales workbench routes resolve to visible Vue pages with stable metadata', async () => {
  const router = await read('../src/router/index.ts')

  assert.match(router, /CustomerOrders\s*=\s*\(\) => import\('@\/views\/order\/CustomerOrdersView\.vue'\)/)
  assert.match(router, /AgreementProductRelations\s*=\s*\(\) => import\('@\/views\/order\/AgreementProductRelationsView\.vue'\)/)
  assert.match(router, /AgreementProducts\s*=\s*\(\) => import\('@\/views\/order\/AgreementProductsView\.vue'\)/)
  assert.match(router, /SalesDashboard\s*=\s*\(\) => import\('@\/views\/order\/SalesDashboardView\.vue'\)/)
  assert.match(router, /AgreementMembers\s*=\s*\(\) => import\('@\/views\/order\/AgreementMembersView\.vue'\)/)
  assert.match(router, /path: 'sales\/customer-orders',[\s\S]{0,180}pageId: 'sales\.customerOrders',[\s\S]{0,80}group: 'sales'/)
  assert.match(router, /path: 'sales\/agreement-product-relations',[\s\S]{0,210}pageId: 'sales\.agreementProductRelations',[\s\S]{0,80}group: 'sales'/)
  assert.match(router, /path: 'sales\/agreement-products',[\s\S]{0,180}pageId: 'sales\.agreementProducts',[\s\S]{0,80}group: 'sales'/)
  assert.match(router, /path: 'sales\/dashboard',[\s\S]{0,180}pageId: 'sales\.dashboard',[\s\S]{0,80}group: 'sales'/)
  assert.match(router, /path: 'sales\/agreement-members',[\s\S]{0,180}pageId: 'sales\.agreementMembers',[\s\S]{0,80}group: 'sales'/)
  assert.match(router, /path: 'sales\/workbench', redirect: '\/sales\/customer-orders'/)
  assert.doesNotMatch(router, /path: '\/sales\/agreement-members'/)
})

test('sales pages are registered with their approved content-slot page types', async () => {
  const extensions = JSON.parse(await read('../design-page-extensions.json'))
  const salesPages = extensions.pages.filter(page => page.pageId.startsWith('sales.'))

  assert.deepEqual(salesPages.map(({ pageId, route, pageType }) => ({ pageId, route, pageType })), [
    { pageId: 'sales.customerOrders', route: '/sales/customer-orders', pageType: 'T2' },
    { pageId: 'sales.agreementProductRelations', route: '/sales/agreement-product-relations', pageType: 'T7' },
    { pageId: 'sales.agreementProducts', route: '/sales/agreement-products', pageType: 'T2' },
    { pageId: 'sales.dashboard', route: '/sales/dashboard', pageType: 'T3' },
    { pageId: 'sales.agreementMembers', route: '/sales/agreement-members', pageType: 'T2' }
  ])
  assert.ok(salesPages.every(page => !page.remainingStates.some(state => state.includes('等待本轮浏览器验证'))))
})

test('sales dashboard keeps the four HTML workbench views in an accessible Vue page', async () => {
  const view = await read('../src/views/order/SalesDashboardView.vue')

  assert.match(view, /<ContentPageHeader title="销售看板"/)
  assert.match(view, /待办事项/)
  assert.match(view, /我的销售额/)
  assert.match(view, /榜单/)
  assert.match(view, /客户分析/)
  assert.match(view, /<ContentTabs/)
  assert.match(view, /aria-live="polite"/)
  assert.match(view, /watch\(visibleMail, \(items\) =>/)
  assert.match(view, /selectedMail\.value = items\[0\]/)
  assert.match(view, /onMounted\(\(\) => appStore\.ensureStaticTab\(PAGE_ID\)\)/)
})

test('agreement member page uses regular headings and white primary-action text', async () => {
  const view = await read('../src/views/order/AgreementMembersView.vue')

  assert.match(view, /class="btn btn-primary"[^>]*>查询<\/button>/)
  assert.match(view, /\.filter-actions \.btn-primary\s*\{[^}]*color:\s*var\(--color-on-primary\)/)
  assert.match(view, /\.member-page\.sales-workbench-page :deep\(\.content-page-header__title\)\s*\{[^}]*font-weight:\s*400/)
  assert.match(view, /\.member-toolbar strong\s*\{[^}]*font-weight:\s*400/)
})

test('package exposes one sales workbench verification entry', async () => {
  const pkg = JSON.parse(await read('../package.json'))
  assert.equal(
    pkg.scripts['test:sales-workbench'],
    'node --test scripts/sales-workbench-navigation.test.mjs scripts/customer-orders.test.mjs scripts/agreement-product-relations.test.mjs scripts/agreement-products.test.mjs'
  )
})
