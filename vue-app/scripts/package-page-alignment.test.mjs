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

test('agreement orders follow the package list and export contract', async () => {
  const runtime = await source('../public/admin-runtime/workbench-agreement-orders.js')
  const renderer = functionBlock(runtime, 'renderProductOrders', 'detailField')

  assert.match(runtime, /agreement:\s*'KO260403250008'/)
  assert.match(runtime, /agreementName:\s*'单显示器'/)
  assert.match(renderer, /onclick="agreementProductOrderExport\(\)">导出<\/button>/)
  assert.doesNotMatch(renderer, />重置<|agreementProductOrderReset/)
  assert.doesNotMatch(runtime, /window\.agreementProductOrderReset/)
  assert.match(runtime, /workspaceNotify\('协议产品订单导出已生成'\)/)
  assert.doesNotMatch(runtime, /URL\.createObjectURL|text\/csv/)
})

test('agreement order detail follows the package address and section styling', async () => {
  const runtime = await source('../public/admin-runtime/workbench-agreement-orders.js')

  assert.match(runtime, /← 返回协议产品订单管理/)
  assert.match(runtime, /<div class="apo-address-item"><b>地址 2<\/b>/)
  assert.match(runtime, /北京市朝阳区望京街道/)
  assert.match(runtime, /\.apo-section h2:before/)
  assert.match(runtime, /@media\(max-width:900px\)[\s\S]*?\.apo-address-item\{grid-template-columns:1fr\}/)
})

