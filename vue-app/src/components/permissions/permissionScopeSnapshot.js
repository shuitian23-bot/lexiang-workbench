export function sortedUniqueIds(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))].sort()
}

export function normalizePermissionScopeSnapshot(snapshot = {}) {
  return {
    tenantIds: sortedUniqueIds(snapshot.tenantIds || snapshot.tenant || []),
    roleIds: sortedUniqueIds(snapshot.roleIds || [...(snapshot.selectedRoleIds || []), ...(snapshot.copiedRoleIds || [])]),
    functionIds: sortedUniqueIds(snapshot.functionIds || snapshot.selectedFunctionPermissionIds || []),
    dataIds: sortedUniqueIds(snapshot.dataIds || snapshot.selectedDataPermissionIds || []),
    exceptionIds: sortedUniqueIds(snapshot.exceptionIds || snapshot.suppressedPermissionIds || [])
  }
}

export function permissionScopeDiff(current, baseline) {
  const currentScope = normalizePermissionScopeSnapshot(current)
  const baselineScope = normalizePermissionScopeSnapshot(baseline)
  return ['tenantIds', 'roleIds', 'functionIds', 'dataIds', 'exceptionIds'].filter((key) => currentScope[key].join('\u0000') !== baselineScope[key].join('\u0000'))
}

export function resolvePermissionScopeFunctionIds(snapshot = {}, roleFunctionIds = [], copiedRoleFunctionIds = []) {
  const allowedIds = new Set([...roleFunctionIds, ...copiedRoleFunctionIds])
  const requestedIds = snapshot.selectedFunctionPermissionIds ?? snapshot.functionIds
  const selectedIds = Array.isArray(requestedIds) ? requestedIds : roleFunctionIds
  return sortedUniqueIds([
    ...selectedIds.filter((id) => allowedIds.has(id)),
    ...copiedRoleFunctionIds
  ])
}

export const PERMISSION_SCOPE_TENANT_REQUIRED_MESSAGE = '请至少选择一个所属租户，便于后台按租户开通权限。'

export function permissionScopeValidation(snapshot = {}) {
  const scope = normalizePermissionScopeSnapshot(snapshot)
  return { tenantError: scope.tenantIds.length ? '' : PERMISSION_SCOPE_TENANT_REQUIRED_MESSAGE }
}

export function hasPermissionScopeChanged(current, baseline) {
  return permissionScopeDiff(current, baseline).length > 0
}
