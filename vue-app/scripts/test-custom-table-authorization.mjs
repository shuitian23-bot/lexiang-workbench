import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  CUSTOM_TABLE_AUTH_LOGIC,
  CUSTOM_TABLE_AUTH_LOGICS,
  CUSTOM_TABLE_CATALOG,
  CUSTOM_TABLE_TAG_LIMIT,
  CUSTOM_TABLE_TAG_MAX_LENGTH,
  CUSTOM_TABLE_TAG_STORAGE_KEY,
  applyCustomTableBatchSelection,
  availableCustomTables,
  createCustomTableRule,
  customRulesSignature,
  hydrateCustomTableTags,
  intersectCustomTableFields,
  isCustomTableCellGranted,
  normalizeCustomDataRules,
  normalizeCustomTableLogic,
  normalizeCustomTableTags,
  setCustomTableTags,
  validateCustomTableRules,
  validateCustomTableTags
} from '../src/components/permissions/customTableAuthorization.js'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))

assert.equal(CUSTOM_TABLE_AUTH_LOGIC, 'AND')
assert.deepEqual(CUSTOM_TABLE_AUTH_LOGICS, ['AND'])
assert.equal(normalizeCustomTableLogic('OR'), 'AND', '历史 OR 必须统一迁移为 AND')
assert.ok(CUSTOM_TABLE_CATALOG.length >= 3)
CUSTOM_TABLE_CATALOG.forEach((table) => {
  assert.ok(table.id && table.name)
  assert.ok(table.tags.length, `${table.name} 必须提供可筛选标签`)
  assert.ok(table.rowDimensions.length, `${table.name} 必须按业务维度组织行权限`)
  assert.deepEqual(table.rows, table.rowDimensions.flatMap((dimension) => dimension.values))
  assert.ok(table.rows.length && table.columns.length)
})

assert.equal(CUSTOM_TABLE_TAG_LIMIT, 5)
assert.equal(CUSTOM_TABLE_TAG_MAX_LENGTH, 12)
assert.deepEqual(normalizeCustomTableTags([' 重点数据 ', '重点数据', '经营分析']), ['重点数据', '经营分析'])
assert.match(validateCustomTableTags(['重复', '重复']), /不能重复/)
assert.match(validateCustomTableTags(['1234567890123']), /不能超过 12 个字符/)
assert.match(validateCustomTableTags(['一', '二', '三', '四', '五', '六']), /最多设置 5 个标签/)

const productTable = CUSTOM_TABLE_CATALOG.find((table) => table.id === 'product-operations-table')
const originalProductTags = [...productTable.tags]
const tagStorage = {
  value: '',
  getItem(key) { return key === CUSTOM_TABLE_TAG_STORAGE_KEY ? this.value : null },
  setItem(key, value) { if (key === CUSTOM_TABLE_TAG_STORAGE_KEY) this.value = value }
}
setCustomTableTags(productTable.id, ['商品运营', '重点数据'], { storage: tagStorage })
assert.deepEqual(productTable.tags, ['商品运营', '重点数据'])
assert.deepEqual(JSON.parse(tagStorage.value)[productTable.id], ['商品运营', '重点数据'])
setCustomTableTags(productTable.id, originalProductTags, { storage: null })
assert.equal(hydrateCustomTableTags(tagStorage), true)
assert.deepEqual(productTable.tags, ['商品运营', '重点数据'], '标签目录必须可从 POC 本地存储恢复')
setCustomTableTags(productTable.id, originalProductTags, { storage: null })

const defaultRule = createCustomTableRule('ops-metrics-table')
const opsTable = CUSTOM_TABLE_CATALOG.find((table) => table.id === 'ops-metrics-table')
assert.ok(defaultRule && opsTable)
assert.equal(defaultRule.logic, 'AND')
assert.deepEqual(defaultRule.rowFieldIds, opsTable.rows.map((row) => row.id), '新勾选数据集必须默认全选全部行')
assert.deepEqual(defaultRule.columnFieldIds, opsTable.columns.map((column) => column.id), '新勾选数据集必须默认全选全部列')
assert.equal(validateCustomTableRules([defaultRule]), '')
assert.equal(availableCustomTables([defaultRule]).some((table) => table.id === defaultRule.tableId), false)
assert.deepEqual(availableCustomTables(CUSTOM_TABLE_CATALOG.map((table) => createCustomTableRule(table.id))), [])

const emptyRule = createCustomTableRule('ops-metrics-table', { selectAll: false })
assert.match(validateCustomTableRules([emptyRule]), /行字段和一个列字段/)
assert.match(validateCustomTableRules([{ ...emptyRule, rowFieldIds: ['east'] }]), /列字段/)
assert.match(validateCustomTableRules([{ ...emptyRule, columnFieldIds: ['gmv'] }]), /行字段/)

const intersectionRule = { ...emptyRule, rowFieldIds: ['east'], columnFieldIds: ['gmv'], logic: 'OR' }
assert.equal(isCustomTableCellGranted(intersectionRule, 'east', 'gmv'), true)
assert.equal(isCustomTableCellGranted(intersectionRule, 'east', 'traffic'), false, '只命中行不得授权')
assert.equal(isCustomTableCellGranted(intersectionRule, 'north', 'gmv'), false, '只命中列不得授权')
assert.equal(normalizeCustomDataRules([intersectionRule])[0].logic, 'AND')
assert.equal(
  customRulesSignature([intersectionRule]),
  customRulesSignature([{ ...intersectionRule, logic: 'AND', id: 'runtime-other' }]),
  '历史逻辑和临时 ID 不应制造虚假权限变更'
)

const reordered = { ...intersectionRule, rowFieldIds: ['north', 'east'], columnFieldIds: ['traffic', 'gmv'] }
const sameSelection = { ...intersectionRule, id: 'different', rowFieldIds: ['east', 'north'], columnFieldIds: ['gmv', 'traffic'] }
assert.equal(customRulesSignature([reordered]), customRulesSignature([sameSelection]))

const [legacyOpsRule] = normalizeCustomDataRules([
  { id: 'legacy-ops', dataset: '运营数据集', fields: 'GMV、流量、转化', region: '华东区', logic: 'OR' }
])
assert.equal(legacyOpsRule.tableId, 'ops-metrics-table')
assert.equal(legacyOpsRule.logic, 'AND')
assert.deepEqual(legacyOpsRule.rowFieldIds, ['east'])
assert.deepEqual(legacyOpsRule.columnFieldIds, ['gmv', 'traffic', 'conversion'])

const initialBatchRules = CUSTOM_TABLE_CATALOG.map((table) => createCustomTableRule(table.id))
const allTableIntersection = intersectCustomTableFields(initialBatchRules.map((rule) => rule.tableId))
assert.deepEqual(allTableIntersection.rowDimensions.map((group) => ({ id: group.id, values: group.values.map((value) => value.id) })), [{ id: 'region', values: ['nationwide'] }])
assert.deepEqual(allTableIntersection.columns.map((column) => column.id), ['record-status'])
assert.equal(allTableIntersection.columns.some((column) => column.id === 'gmv' || column.id === 'publish-status'), false, '批量选项不得混入只属于部分数据集的列')

const twoTableIntersection = intersectCustomTableFields(['ops-metrics-table', 'enterprise-leads-table'])
assert.deepEqual(twoTableIntersection.rowDimensions[0].values.map((value) => value.id), ['east', 'north', 'south', 'nationwide'])
assert.deepEqual(twoTableIntersection.columns.map((column) => column.id), ['lead-status', 'customer-name', 'intent-level', 'follow-status', 'record-status'])

const allTableBatchResult = applyCustomTableBatchSelection(initialBatchRules, {
  rowFieldIds: ['nationwide'],
  columnFieldIds: ['record-status']
})
assert.deepEqual(allTableBatchResult.appliedTableIds, ['ops-metrics-table', 'product-operations-table', 'enterprise-leads-table'])
assert.deepEqual(allTableBatchResult.skipped, [])

const mixedBatchResult = applyCustomTableBatchSelection(initialBatchRules, {
  rowFieldIds: ['east'],
  columnFieldIds: ['customer-name']
})
assert.deepEqual(mixedBatchResult.appliedTableIds, [], '任一数据集不匹配时不得部分应用')
assert.deepEqual(mixedBatchResult.skipped.map((item) => item.tableId), ['product-operations-table'])
assert.match(mixedBatchResult.skipped[0].reason, /缺少行字段.*缺少列字段/)
assert.equal(customRulesSignature(mixedBatchResult.rules), customRulesSignature(initialBatchRules), '严格校验失败时所有数据集都必须保留原配置')

const compatibleRules = initialBatchRules.filter((rule) => rule.tableId !== 'product-operations-table')
const compatibleBatchResult = applyCustomTableBatchSelection(compatibleRules, {
  rowFieldIds: ['east'],
  columnFieldIds: ['customer-name']
})
assert.deepEqual(compatibleBatchResult.appliedTableIds, ['ops-metrics-table', 'enterprise-leads-table'])
assert.deepEqual(compatibleBatchResult.skipped, [])
const appliedOps = compatibleBatchResult.rules.find((rule) => rule.tableId === 'ops-metrics-table')
assert.deepEqual(appliedOps.rowFieldIds, ['east'])
assert.deepEqual(appliedOps.columnFieldIds, ['customer-name'])

const partialMismatch = applyCustomTableBatchSelection(initialBatchRules, {
  rowFieldIds: ['nationwide'],
  columnFieldIds: ['customer-name']
})
assert.deepEqual(partialMismatch.appliedTableIds, [], '只匹配行字段时也必须阻止全部数据集应用')
assert.match(partialMismatch.skipped.find((item) => item.tableId === 'product-operations-table').reason, /缺少列字段：客户名称/)
assert.equal(customRulesSignature(partialMismatch.rules), customRulesSignature(initialBatchRules))

const componentSource = await readFile(`${sourceRoot}/components/permissions/CustomTableAuthorizationEditor.vue`, 'utf8')
assert.match(componentSource, /搜索名称、说明或标签/)
assert.match(componentSource, /data-testid="dataset-search-filter"/)
assert.match(componentSource, /data-testid="dataset-tag-filter-trigger"/)
assert.match(componentSource, /class="catalog-filter-bar"/)
assert.match(componentSource, /全选当前结果/)
assert.match(componentSource, /data-preview-table-id/)
assert.match(componentSource, /previewRule/)
assert.match(componentSource, /displayRule/)
assert.match(componentSource, /previewRuleDrafts/)
assert.match(componentSource, /promotePreviewRule/)
assert.match(componentSource, /待完善/)
assert.match(componentSource, /固定运算关系：与（AND）/)
assert.match(componentSource, /应用到已选数据集/)
assert.match(componentSource, /存在.*字段不匹配的数据集/)
assert.doesNotMatch(componentSource, /或（OR）|type="radio"/)
assert.match(componentSource, /<Teleport to="body">/)
assert.match(componentSource, /编辑标签/)
assert.match(componentSource, /保存后只影响检索和筛选/)
assert.match(componentSource, /canManageDatasetTags/)
assert.match(componentSource, /guardTagEditing/)
assert.match(componentSource, />编辑<\/button>/, '自定义授权主入口必须统一为“编辑”')
assert.match(componentSource, /编辑自定义授权数据集/)
assert.match(componentSource, /保存自定义授权/)
assert.match(componentSource, /role="combobox"/)
assert.match(componentSource, /标签筛选，已选/)
assert.match(componentSource, /tag-select-count/)
assert.match(componentSource, /role="listbox"/)

const agentPermissionsSource = await readFile(`${sourceRoot}/views/agent/AgentPermissionsView.vue`, 'utf8')
assert.match(agentPermissionsSource, /title="角色自定义授权"/)
assert.match(agentPermissionsSource, /title="用户自定义授权"/)
assert.equal((agentPermissionsSource.match(/<CustomTableAuthorizationEditor/g) || []).length, 2)
assert.equal((agentPermissionsSource.match(/can-manage-dataset-tags/g) || []).length, 2)
assert.match(agentPermissionsSource, /detectCustomDataRoleConflicts/)
assert.match(agentPermissionsSource, /roleModalCandidateConflicts/)
assert.match(agentPermissionsSource, /userRoleModalConflicts/)

console.log('custom table authorization tests passed')
