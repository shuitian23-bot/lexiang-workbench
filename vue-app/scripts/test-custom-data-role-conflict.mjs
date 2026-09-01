import assert from 'node:assert/strict'
import {
  detectCustomDataRoleConflicts,
  hasCustomDataRoleConflicts,
  normalizeCustomDataRoleRule,
} from '../src/components/permissions/customDataRoleConflict.js'

const OPS = 'ops-metrics-table'
const PRODUCT = 'product-operations-table'
const LEADS = 'enterprise-leads-table'

function rule(
  tableId,
  rowFieldIds,
  columnFieldIds,
  { tableName = tableId, logic = 'AND', id } = {},
) {
  return { id, tableId, tableName, logic, rowFieldIds, columnFieldIds }
}

function role(id, name, customDataRules) {
  return { id, name, customDataRules }
}

const canonical = normalizeCustomDataRoleRule(
  rule(OPS, ['south', 'north', 'north'], ['gmv', 'traffic'], {
    logic: 'OR',
    id: 'temporary-rule-1',
  }),
)
assert.deepEqual(canonical.rowPermissionIds, ['north', 'south'])
assert.deepEqual(canonical.columnPermissionIds, ['gmv', 'traffic'])
assert.equal(canonical.logic, 'AND')

const equivalentRoles = [
  role('role-a', '消费运营', [
    rule(OPS, ['north', 'south'], ['gmv', 'traffic'], {
      logic: 'OR',
      id: 'temporary-a',
    }),
  ]),
  role('role-b', '区域运营', [
    rule(OPS, ['south', 'north'], ['traffic', 'gmv'], {
      logic: 'AND',
      id: 'temporary-b',
    }),
  ]),
]
assert.deepEqual(
  detectCustomDataRoleConflicts(equivalentRoles),
  [],
  'ordering, temporary ids and historic logic must not create conflicts',
)

assert.deepEqual(
  detectCustomDataRoleConflicts([
    role('role-a', '消费运营', [rule(OPS, ['north'], ['gmv'])]),
    role('role-b', '库存运营', [rule(PRODUCT, ['nationwide'], ['stock'])]),
  ]),
  [],
  'rules for different datasets are independent',
)

const rowConflict = detectCustomDataRoleConflicts([
  role('role-a', '消费运营', [rule(OPS, ['north'], ['gmv'])]),
  role('role-b', '区域运营', [rule(OPS, ['south'], ['gmv'])]),
])
assert.equal(rowConflict.length, 1)
assert.equal(rowConflict[0].datasetId, OPS)
assert.deepEqual(rowConflict[0].roleIds, ['role-a', 'role-b'])
assert.deepEqual(rowConflict[0].roleNames, ['消费运营', '区域运营'])
assert.equal(rowConflict[0].roleSummaries.length, 2)
assert.equal(rowConflict[0].roleSummaries[0].rowSummary, '华北区')

const columnConflictRoles = [
  role('role-a', '消费运营', [rule(OPS, ['north'], ['gmv'])]),
  role('role-b', '区域运营', [rule(OPS, ['north'], ['traffic'])]),
]
assert.equal(
  detectCustomDataRoleConflicts(columnConflictRoles).length,
  1,
  'different column sets must conflict',
)
assert.equal(hasCustomDataRoleConflicts(columnConflictRoles), true)

const threeRoleConflict = detectCustomDataRoleConflicts([
  role('role-a', '角色 A', [rule(OPS, ['north'], ['gmv'])]),
  role('role-b', '角色 B', [rule(OPS, ['north'], ['gmv'])]),
  role('role-c', '角色 C', [rule(OPS, ['south'], ['gmv'])]),
])
assert.equal(threeRoleConflict.length, 1)
assert.deepEqual(threeRoleConflict[0].roleIds, ['role-a', 'role-b', 'role-c'])
assert.equal(threeRoleConflict[0].roleSummaries.length, 3)

const multipleConflicts = detectCustomDataRoleConflicts([
  role('role-a', '角色 A', [
    rule(OPS, ['north'], ['gmv']),
    rule(PRODUCT, ['nationwide'], ['stock']),
    rule(LEADS, ['north'], ['customer-name']),
  ]),
  role('role-b', '角色 B', [
    rule(OPS, ['south'], ['gmv']),
    rule(PRODUCT, ['nationwide'], ['price']),
    rule(LEADS, ['north'], ['customer-name']),
  ]),
])
assert.deepEqual(
  multipleConflicts.map((conflict) => conflict.datasetId),
  [OPS, PRODUCT],
  'all conflicting datasets must be returned while identical ones remain allowed',
)

assert.deepEqual(detectCustomDataRoleConflicts(), [])
assert.deepEqual(detectCustomDataRoleConflicts(null), [])
assert.deepEqual(
  detectCustomDataRoleConflicts([
    { id: 'role-a', name: '无自定义授权角色', customDataRules: [] },
    { id: 'role-b', name: '用户数据不参与', userCustomDataRules: [rule(OPS, ['north'], ['gmv'])] },
  ]),
  [],
)

console.log('custom data role conflict tests passed')
