import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

function functionBlock(runtime, name, nextName) {
  const start = runtime.indexOf(`function ${name}(`)
  const end = runtime.indexOf(`function ${nextName}(`, start + 1)
  assert.notEqual(start, -1, `${name} must exist`)
  return runtime.slice(start, end === -1 ? runtime.length : end)
}

test('government lead pool follows the package filter and metadata contract', async () => {
  const [runtime, slots] = await Promise.all([
    source('../public/admin-runtime/workbench-lead.js'),
    source('../src/content-slot/contentSlotDefinitions.js')
  ])
  const filter = functionBlock(runtime, 'governmentPoolFilterHtml', 'poolTableHtml')

  assert.match(slots, /pageId:\s*'lead\.governmentPool'[\s\S]*?path:\s*'\/lead\/government-pool'/)
  assert.match(runtime, /function clearGovernmentHiddenFilters\(\)/)
  assert.match(filter, /dateRangeCtl\('create'\)/)
  assert.match(filter, /fLeadNo[\s\S]*?fLenovo[\s\S]*?fPhone[\s\S]*?fName[\s\S]*?fCompany/)
  assert.match(filter, /fCustomerManagerCodes[\s\S]*?lead-score-min[\s\S]*?lead-score-max[\s\S]*?fdGrade/)
  assert.doesNotMatch(filter, /fown|所属IS/)
})

test('government lead pool uses the package read-only table and shared actions', async () => {
  const runtime = await source('../public/admin-runtime/workbench-lead.js')
  const table = functionBlock(runtime, 'poolTableHtml', 'poolRefresh')

  assert.match(runtime, /function poolTableHtml\(government\)/)
  assert.match(runtime, /const governmentHead =/)
  assert.match(runtime, /const governmentCells =/)
  assert.match(runtime, /government \? `leadShowDetail\('\$\{l\.rowId\}', 'lead\.governmentPool'\)`/)
  assert.match(runtime, /function governmentPoolToolbarHtml\(\)[\s\S]*?leadExportCSV\(\)[\s\S]*?leadExportApproval\(\)/)
  assert.doesNotMatch(table.match(/const governmentHead =[\s\S]*?;\n/)?.[0] || '', /所属IS|线索状态|分配状态|是否MQL|SQL金额|推送销售时间/)
  for (const field of ['REL-GAB IS', 'REL-KAB IS', 'REL-新兴市场 IS']) assert.match(table, new RegExp(field))
})

test('lead dashboard follows the 0902 metrics, role filters and single product filter contract', async () => {
  const [runtime, view] = await Promise.all([
    source('../public/admin-runtime/workbench-lead.js'),
    source('../src/views/lead/LeadDashboardView.vue')
  ])
  const metricsStart = runtime.indexOf('const KB_TEAM_METRICS =')
  const metricsEnd = runtime.indexOf('const KB_TEAM_RAW', metricsStart)
  const metrics = runtime.slice(metricsStart, metricsEnd)

  assert.match(view, /document\.title = '线索看板 - 乐享 AI 工作台'/)
  assert.match(metrics, /label: '激活CA'/)
  assert.match(metrics, /label: '激活金额\(万\)'/)
  assert.doesNotMatch(metrics, /订单CA|订单金额|B4激活/)
  assert.match(runtime, /productType: ''/)
  assert.match(runtime, /function leaderTeam\(\)/)
  assert.match(runtime, /msHtml\('team', TEAM_OPTS, LEAD\.kbFilters\.team, '销售团队'\)/)
  assert.match(runtime, /leadSetKbProductType/)
  assert.match(runtime, /<select class="ops-select"[^>]*title="产品类型"/)
  assert.match(runtime, /KB_GRADE_OPTS = \[\.\.\.GRADE_OPTS,[\s\S]*?value: '__none__', label: '无'/)
  assert.match(runtime, /POOL_MS_OPTS = \{[^\n]*fdGrade: GRADE_OPTS/)
  assert.match(runtime, /name: '激活客户数'[\s\S]*?激活金额/)
})

test('agreement orders follow the 0902 hierarchy and list-action contract', async () => {
  const runtime = await source('../public/admin-runtime/workbench-agreement-orders.js')
  const renderer = functionBlock(runtime, 'renderProductOrders', 'detailField')
  const rows = functionBlock(runtime, 'tableRows', 'pager')

  assert.match(runtime, /var purchaseStates =/)
  assert.match(runtime, /var purchaseMainOrders =/)
  assert.match(runtime, /var purchaseOrders =/)
  assert.match(runtime, /function purchaseStatus\(o\)/)
  assert.match(runtime, /function poShippingStatus\(o\)/)
  assert.doesNotMatch(renderer, /导出（脱敏）|导出（明文）|apo-head-actions/)
  assert.match(rows, /agreementProductOrderViewPlain[\s\S]*?purchase/)
  assert.doesNotMatch(renderer, />重置<|agreementProductOrderReset/)
  assert.doesNotMatch(runtime, /window\.agreementProductOrderReset/)
  assert.match(runtime, /link\.download='协议产品订单_'/)
  assert.match(runtime, /URL\.createObjectURL|text\/csv/)
})

test('agreement order detail follows the package purchase and PO grouping contract', async () => {
  const runtime = await source('../public/admin-runtime/workbench-agreement-orders.js')

  assert.match(runtime, /← 返回协议采购订单/)
  assert.match(runtime, /function purchaseMembers\(purchase\)/)
  assert.match(runtime, /function renderPoDetail\(po,members\)/)
  assert.match(runtime, /查看明文信息/)
  assert.match(runtime, /function maskAddress\(value\)/)
  assert.match(runtime, /detailField\('主订单',purchaseMainOrders\[state\.detailPurchase\]/)
  assert.match(runtime, /detailField\('订单号',joinedValues\(members,'no'\)\)/)
  assert.match(runtime, /detailField\('主订单号',purchaseMainOrders\[o\.purchase\]/)
  assert.match(runtime, /<span>订单号：'\+esc\(o\.no\)/)
  assert.match(runtime, /\.apo-section h2:before/)
  assert.match(runtime, /@media\(max-width:900px\)/)
})
