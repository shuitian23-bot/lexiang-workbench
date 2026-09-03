import { customTableById, normalizeCustomDataRules } from './customTableAuthorization.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function uniqueSorted(values) {
  return [...new Set(asArray(values).map(text).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'zh-CN'),
  )
}

function roleIdentity(role, index) {
  const roleId = text(role?.roleId ?? role?.id ?? role?.key) || `role-${index + 1}`
  const roleName = text(role?.roleName ?? role?.name ?? role?.title) || roleId
  return { roleId, roleName }
}

/**
 * Return the AND-only canonical form used by role conflict comparison.
 * Temporary ids, display order and historic logic values deliberately do not
 * participate in the signature.
 */
export function normalizeCustomDataRoleRule(rule) {
  const [normalizedRule = {}] = normalizeCustomDataRules(rule ? [rule] : [])
  const datasetId = text(normalizedRule.tableId ?? rule?.tableId)
  const datasetName = text(normalizedRule.tableName ?? rule?.tableName) || datasetId
  const rowPermissionIds = uniqueSorted(normalizedRule.rowFieldIds ?? rule?.rowFieldIds)
  const columnPermissionIds = uniqueSorted(
    normalizedRule.columnFieldIds ?? rule?.columnFieldIds,
  )

  return {
    datasetId,
    datasetName,
    logic: 'AND',
    rowPermissionIds,
    columnPermissionIds,
    signature: JSON.stringify([rowPermissionIds, columnPermissionIds]),
  }
}

function mergeRulesForDataset(current, next) {
  if (!current) return next
  const rowPermissionIds = uniqueSorted([
    ...current.rowPermissionIds,
    ...next.rowPermissionIds,
  ])
  const columnPermissionIds = uniqueSorted([
    ...current.columnPermissionIds,
    ...next.columnPermissionIds,
  ])

  return {
    datasetId: current.datasetId,
    datasetName: current.datasetName || next.datasetName,
    logic: 'AND',
    rowPermissionIds,
    columnPermissionIds,
    signature: JSON.stringify([rowPermissionIds, columnPermissionIds]),
  }
}

function roleRuleSummary(role, rule) {
  const table = customTableById(rule.datasetId)
  const rowNameById = new Map((table?.rows || []).map((item) => [item.id, item.name]))
  const columnNameById = new Map((table?.columns || []).map((item) => [item.id, item.name]))
  return {
    roleId: role.roleId,
    roleName: role.roleName,
    datasetId: rule.datasetId,
    datasetName: rule.datasetName,
    logic: 'AND',
    rowPermissionIds: rule.rowPermissionIds,
    columnPermissionIds: rule.columnPermissionIds,
    rowSummary: rule.rowPermissionIds.map((id) => rowNameById.get(id) || id).join('、') || '未配置',
    columnSummary: rule.columnPermissionIds.map((id) => columnNameById.get(id) || id).join('、') || '未配置',
    signature: rule.signature,
  }
}

/**
 * Finds incompatible custom data rules supplied by roles.
 *
 * Rules on different datasets are independent. Multiple roles may grant the
 * same dataset only when both their normalized row set and column set are
 * identical. User-level custom rules are intentionally not accepted here.
 */
export function detectCustomDataRoleConflicts(roles = []) {
  const datasets = new Map()

  asArray(roles).forEach((role, roleIndex) => {
    const identity = roleIdentity(role, roleIndex)
    const roleDatasets = new Map()

    for (const sourceRule of asArray(role?.customDataRules)) {
      const rule = normalizeCustomDataRoleRule(sourceRule)
      if (!rule.datasetId) continue
      roleDatasets.set(
        rule.datasetId,
        mergeRulesForDataset(roleDatasets.get(rule.datasetId), rule),
      )
    }

    for (const rule of roleDatasets.values()) {
      const entry = datasets.get(rule.datasetId) || {
        datasetId: rule.datasetId,
        datasetName: rule.datasetName,
        roleSummaries: [],
      }
      entry.datasetName = entry.datasetName || rule.datasetName
      entry.roleSummaries.push(roleRuleSummary(identity, rule))
      datasets.set(rule.datasetId, entry)
    }
  })

  return [...datasets.values()]
    .filter(
      (entry) =>
        entry.roleSummaries.length > 1 &&
        new Set(entry.roleSummaries.map((role) => role.signature)).size > 1,
    )
    .map((entry) => ({
      datasetId: entry.datasetId,
      datasetName: entry.datasetName,
      roleIds: entry.roleSummaries.map((role) => role.roleId),
      roleNames: entry.roleSummaries.map((role) => role.roleName),
      roleSummaries: entry.roleSummaries,
    }))
    .sort((left, right) => left.datasetId.localeCompare(right.datasetId, 'zh-CN'))
}

export const findCustomDataRoleConflicts = detectCustomDataRoleConflicts

export function hasCustomDataRoleConflicts(roles = []) {
  return detectCustomDataRoleConflicts(roles).length > 0
}
