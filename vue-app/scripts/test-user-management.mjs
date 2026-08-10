import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/agent/AgentPermissionsView.vue', import.meta.url), 'utf8')

const userEditorStart = source.indexOf('v-if="userWorkspace.visible"')
const userEditorEnd = source.indexOf('<PermissionRolePickerModal', userEditorStart)
const userEditor = source.slice(userEditorStart, userEditorEnd)
assert.ok(userEditor.includes('用户 ITCode') && userEditor.includes('关联人 ITCode'), '用户基本信息必须按人员类型对齐权限申请字段口径')
for (const removedField of ['用户显示名称', '用户账号 <em>', '内部 AD 账户', '是否绑定 ITCode']) {
  assert.equal(userEditor.includes(removedField), false, `用户基本信息不得展示 ${removedField}`)
}
assert.ok(userEditor.includes('userWorkspace.draft.tenant.includes(tenant)') && userEditor.includes('toggleUserTenant(tenant)'), '所属租户必须是必填多选')
assert.ok(userEditor.includes('userWorkspace.draft.organization.includes(org)') && userEditor.includes('toggleUserOrganization(org)'), '所属组织必须支持多选')
assert.equal(userEditor.includes('v-model.trim="userWorkspace.applicationNo"'), false, '用户权限变更不得手工填写申请单号')
assert.ok(source.includes("return userPermissionChanged.value ? '提交权限变更申请' : '保存基本信息'"), '用户编辑必须区分基本信息直存与权限变更申请')

assert.equal((source.match(/<PermissionRolePickerModal/g) || []).length, 2, '权限申请和用户管理必须复用同一个添加角色组件')
const userRolePickerStart = source.indexOf('<PermissionRolePickerModal', userEditorStart)
const userRolePickerEnd = source.indexOf('/>', userRolePickerStart)
const userRolePicker = source.slice(userRolePickerStart, userRolePickerEnd)
for (const contract of ['@toggle-role="toggleUserRoleSelection"', '@toggle-function="toggleUserRoleModalFunctionPermission"', '@toggle-data="toggleUserRoleModalDataPermission"', 'syncUserRoleModalDetailWithResults()']) {
  assert.ok(userRolePicker.includes(contract), `用户管理添加角色必须接入共享交互：${contract}`)
}
const userRoleLogicStart = source.indexOf('function openUserRoleModal')
const userRoleLogicEnd = source.indexOf('function openUserStatusConfirm', userRoleLogicStart)
const userRoleLogic = source.slice(userRoleLogicStart, userRoleLogicEnd)
assert.ok(userRoleLogic.includes('if (firstRole) openUserRoleDetail(firstRole)'), '添加角色打开后必须默认展示已选或首个角色详情')
assert.ok(userRoleLogic.includes('if (willSelect) ensureUserRoleModalDetailRoleSelected()'), '勾选功能或数据权限必须自动选中对应角色')
assert.ok(userRoleLogic.includes('selectedRoleFunctionPermissionIds = selectedRoleFunctionIds'), '确认角色后必须保留所选角色内的功能权限范围')

const statusStart = source.indexOf('function confirmUserStatusChange()')
const statusEnd = source.indexOf('function appendUserChange', statusStart)
const statusFlow = source.slice(statusStart, statusEnd)
assert.ok(statusFlow.includes("user.status = enabled ? 'enabled' : 'disabled'"), '系统管理员启停必须直接改变账号状态')
assert.equal(statusFlow.includes('upsertUserApproval'), false, '用户管理启停不得创建审批记录')
assert.equal(statusFlow.includes('generateApplicationNo'), false, '用户管理启停不得生成申请单号')

const permissionDiffStart = source.indexOf('function hasUserPermissionChanged')
const permissionDiffEnd = source.indexOf('function generateApplicationNo', permissionDiffStart)
const permissionDiff = source.slice(permissionDiffStart, permissionDiffEnd)
assert.ok(source.includes('normalizeOrganizationList(nextUser.organization)'), '历史单组织数据必须归一化为数组')
assert.ok(permissionDiff.includes('normalizeTenantList(original.tenant)') && permissionDiff.includes('pendingUserPermissionApproval'), '租户必须纳入权限差异，且相同用户待审批时必须可识别')
assert.ok(permissionDiff.includes('userInheritedFunctionIds(original)') && permissionDiff.includes('userInheritedFunctionIds(draft)'), '角色内功能权限变化必须触发权限变更审批')

const saveStart = source.indexOf('function saveUserWorkspace()')
const saveEnd = source.indexOf('function sortedIds', saveStart)
const saveFlow = source.slice(saveStart, saveEnd)
assert.ok(saveFlow.includes('const ticketNo = generateApplicationNo()'), '权限变更提交时必须自动生成申请单号')
assert.ok(saveFlow.includes("source: 'user-management'") && saveFlow.includes('baselineUser: currentUser'), '权限审批必须记录用户管理来源和生效前基线')
assert.ok(saveFlow.includes('userWithCurrentPermissionState(currentUser, proposedUser)'), '审批提交后必须保留当前生效权限')

const executionStart = source.indexOf('function applyApprovedUserPermissionChange')
const executionEnd = source.indexOf('function createApprovalRow', executionStart)
const executionFlow = source.slice(executionStart, executionEnd)
assert.ok(executionFlow.includes("row.source !== 'user-management'") && executionFlow.includes('applyApprovedUserPermissionChange(row, time)'), '只有用户管理权限变更在审批完成后落地一次')
assert.ok(executionFlow.includes('user.tenant = permissionState.tenant') && executionFlow.includes('user.roleIds = permissionState.roleIds'), '审批通过必须同时应用租户、角色和数据权限状态')
assert.ok(executionFlow.includes('user.selectedRoleFunctionPermissionIds = permissionState.selectedRoleFunctionPermissionIds'), '审批通过必须应用角色内最终功能权限范围')

console.log('user management workflow tests passed')