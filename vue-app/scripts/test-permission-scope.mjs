import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPermissionScopeCatalog, groupDataPermissionsByDirectory } from '../src/components/permissions/permissionScopeCatalog.ts'
import { hasPermissionScopeChanged, normalizePermissionScopeSnapshot, permissionScopeDiff, permissionScopeValidation, resolvePermissionScopeFunctionIds } from '../src/components/permissions/permissionScopeSnapshot.js'

const baseline = {
  tenant: ['leaibot-cn', 'shop-chat'],
  roleIds: ['ops-pm'],
  functionIds: ['func.report.generate', 'func.dashboard.view'],
  dataIds: ['data.ops.region.east']
}

assert.deepEqual(normalizePermissionScopeSnapshot({
  tenant: ['shop-chat', 'leaibot-cn', 'shop-chat'],
  selectedRoleIds: ['ops-pm', 'ops-pm'],
  selectedFunctionPermissionIds: ['func.dashboard.view', 'func.report.generate'],
  selectedDataPermissionIds: ['data.ops.region.east']
}), normalizePermissionScopeSnapshot(baseline), '排序与重复 ID 不应产生差异')

assert.equal(hasPermissionScopeChanged({ ...baseline, copiedFromItcode: 'wangxt8' }, baseline), false, '仅执行复制但最终权限一致时不应算变更')
assert.equal(hasPermissionScopeChanged({ ...baseline, tenant: ['leaibot-cn'] }, baseline), true, '租户变化必须被识别')
assert.deepEqual(permissionScopeDiff({ ...baseline, roleIds: ['product-op'] }, baseline), ['roleIds'], '角色变化必须被单独识别')
assert.deepEqual(permissionScopeDiff({ ...baseline, dataIds: [] }, baseline), ['dataIds'], '数据权限移除必须被识别')
assert.deepEqual(permissionScopeDiff({ ...baseline, exceptionIds: ['data.member.profile.level'] }, baseline), ['exceptionIds'], '用户级数据权限例外变化必须被识别')
assert.equal(permissionScopeValidation({ tenant: [] }).tenantError, '请至少选择一个所属租户，便于后台按租户开通权限。', '三处必须复用同一租户必填文案')
assert.equal(permissionScopeValidation({ tenant: ['leaibot-cn'] }).tenantError, '', '已选择租户时不得报错')

const catalog = createPermissionScopeCatalog()
assert.equal(catalog.tenantOptions.length, 4, '三个场景必须使用同一租户目录')
assert.ok(catalog.roles.length > 0 && catalog.functionPermissions.length > 0 && catalog.dataPermissions.length > 0, '共享权限目录不能为空')
const dataDirectories = groupDataPermissionsByDirectory(catalog.dataPermissions)
assert.deepEqual(dataDirectories.map((directory) => directory.name), ['乐享运营', 'GEO 看板', '企业客户管理'], '数据权限一级目录必须与门户工作台目录一致')
assert.deepEqual(dataDirectories.flatMap((directory) => directory.datasets.map((dataset) => dataset.id)).sort(), catalog.dataPermissions.map((permission) => permission.id).sort(), '一级目录化不得丢失或重复数据权限')
assert.equal(dataDirectories.some((directory) => directory.datasets.some((dataset) => dataset.name.includes('·'))), false, '数据集名称不得拼接目录或类型前缀')
assert.ok(dataDirectories.find((directory) => directory.name === '乐享运营')?.datasets.some((dataset) => dataset.name === '华东区'), '一级目录下必须直接使用原始数据集名称')
catalog.copyableUsers.forEach((user) => {
  assert.ok(user.roleIds.length > 0, user.itcode + ' 必须包含可复制角色')
  assert.ok(Array.isArray(user.extraDataPermissionIds), user.itcode + ' 必须显式提供用户单独授权的数据权限')
  assert.ok(Array.isArray(user.dataPermissions), user.itcode + ' 必须显式提供最终数据权限及来源')
  assert.equal(['functionIds', 'functionPermissionIds', 'extraFunctionPermissionIds'].some((key) => key in user), false, '复制对象不得携带用户级功能权限')
  assert.equal('tenant' in user || 'tenantIds' in user || 'organization' in user || 'account' in user, false, '复制对象不得携带租户、组织或账号资料')
  const inheritedDataIds = [...new Set(catalog.roles.filter((role) => user.roleIds.includes(role.id)).flatMap((role) => role.dataPermissionIds))].sort()
  const roleSourceIds = user.dataPermissions.filter((permission) => permission.source === '角色继承').map((permission) => permission.id).sort()
  const directSourceIds = user.dataPermissions.filter((permission) => permission.source === '用户单独授权').map((permission) => permission.id).sort()
  assert.deepEqual(roleSourceIds, inheritedDataIds, user.itcode + ' 的角色继承数据必须从角色目录推导')
  assert.deepEqual(directSourceIds, user.extraDataPermissionIds.filter((id) => !inheritedDataIds.includes(id)).sort(), user.itcode + ' 的用户单独授权数据来源必须准确')
})

const wang = catalog.copyableUsers.find((user) => user.itcode === 'wangxt8')
const wangRoleFunctionIds = [...new Set(catalog.roles.filter((role) => wang.roleIds.includes(role.id)).flatMap((role) => role.functionPermissionIds))].sort()
assert.equal(wangRoleFunctionIds.length, 4, 'wangxt8 的功能权限必须严格等于两个角色的 4 项去重并集')
assert.equal(wangRoleFunctionIds.includes('func.skill.manage'), false, '复制不得带入旧的用户级 Skill 管理功能权限')
assert.deepEqual(resolvePermissionScopeFunctionIds({ selectedFunctionPermissionIds: [...wangRoleFunctionIds, 'func.skill.manage'], copiedFunctionPermissionIds: ['func.skill.manage'] }, wangRoleFunctionIds), wangRoleFunctionIds, '角色范围外的历史直接功能授权必须被忽略')
assert.deepEqual(resolvePermissionScopeFunctionIds({ selectedFunctionPermissionIds: wangRoleFunctionIds.slice(0, 2) }, wangRoleFunctionIds), wangRoleFunctionIds.slice(0, 2), '手工角色内取消勾选的功能权限不得在快照中被重新补回')
assert.deepEqual(resolvePermissionScopeFunctionIds({ selectedFunctionPermissionIds: [] }, wangRoleFunctionIds, [wangRoleFunctionIds[0]]), [wangRoleFunctionIds[0]], '复制角色的功能权限必须始终锁定保留')

const editorSource = await readFile(new URL('../src/components/permissions/PermissionScopeEditor.vue', import.meta.url), 'utf8')
const accessDeniedSource = await readFile(new URL('../src/views/AccessDeniedView.vue', import.meta.url), 'utf8')
const agentPermissionsSource = await readFile(new URL('../src/views/agent/AgentPermissionsView.vue', import.meta.url), 'utf8')
const copyModalSource = await readFile(new URL('../src/components/permissions/PermissionCopyRoleModal.vue', import.meta.url), 'utf8')
const rolePickerSource = await readFile(new URL('../src/components/permissions/PermissionRolePickerModal.vue', import.meta.url), 'utf8')
const dataPickerSource = await readFile(new URL('../src/components/permissions/PermissionDataPickerModal.vue', import.meta.url), 'utf8')
const dataDirectorySource = await readFile(new URL('../src/components/permissions/PermissionDataDirectoryList.vue', import.meta.url), 'utf8')
assert.ok(editorSource.indexOf('所属租户') < editorSource.indexOf('scope-action-bar'), '所属租户必须位于三个权限按钮上方')
assert.deepEqual(['添加角色', '复制他人角色', '选择数据权限'].map((label) => editorSource.includes('>' + label + '<')), [true, true, true], '共享编辑器按钮文案必须固定')
assert.ok(accessDeniedSource.includes('<PermissionScopeEditor') && agentPermissionsSource.includes('<PermissionScopeEditor'), '首次访问和系统内流程必须复用共享编辑器')
assert.equal(editorSource.includes('用户级功能权限例外') || editorSource.includes('copiedExtraFunctionPermissions'), false, '共享编辑器不得展示用户级功能权限例外')
assert.equal(accessDeniedSource.includes('copiedFunctionPermissionIds') || agentPermissionsSource.includes('copiedFunctionPermissionIds'), false, '三个场景提交状态不得保留用户级功能权限字段')
assert.ok(copyModalSource.includes('角色对应的功能、数据权限') && copyModalSource.includes('用户单独授权的数据权限') && copyModalSource.includes('不复制租户、组织和账号资料'), '复制弹窗必须准确说明复制与不复制范围')
assert.ok(rolePickerSource.includes('<PermissionDataDirectoryList') && rolePickerSource.includes("activePermissionTab === 'function'"), '共享角色选择器必须仅在数据页签使用一级目录组件')
assert.ok(rolePickerSource.includes("@change=\"$emit('toggle-function', permission.id)\"") && rolePickerSource.includes(':disabled="lockedRoleIds.includes(detailRole.id)"'), '手工角色功能必须可勾选，复制角色功能必须锁定')
assert.ok(accessDeniedSource.includes('function toggleRoleFunctionDraft(permissionId: string)') && agentPermissionsSource.includes('function toggleRoleModalFunctionPermission(id)'), '首次访问、权限变更和创建账号必须实现同一功能权限勾选联动')
assert.ok(dataPickerSource.includes(':directories="directories"') && !dataPickerSource.includes('permission-tree-branch'), '独立数据权限弹窗不得保留页面/二级菜单层')
assert.ok(dataDirectorySource.includes('directory-search-trigger') && dataDirectorySource.includes('directoryKeyword(directory.id)'), '每个一级目录必须拥有独立搜索入口和关键词状态')
assert.ok(dataDirectorySource.includes('defaultExpanded: true'), '所有数据权限一级目录必须默认展开')
assert.ok(dataDirectorySource.includes("dataset.name.toLowerCase().includes(keyword)"), '目录内搜索必须只按当前目录的数据集名称过滤')
assert.ok(dataDirectorySource.includes('暂无匹配的数据集') && dataDirectorySource.includes("searchKeywords[id] = ''"), '目录搜索必须覆盖局部空态和关闭清空')
assert.ok(agentPermissionsSource.includes('<PermissionDataDirectoryList') && agentPermissionsSource.includes(':directories="dataPermissionDirectories"'), '角色管理和用户详情必须复用一级目录组件')
assert.equal(accessDeniedSource.includes('errors.roles'), false, '首次访问不得把角色或数据权限设为必填')
assert.ok(agentPermissionsSource.includes('permissionScopeDiff('), '权限变更必须使用归一化最终结果比较')
assert.ok(accessDeniedSource.includes('permissionScopeValidation(') && agentPermissionsSource.includes('permissionScopeValidation('), '三处必须复用共享租户校验')
assert.ok(agentPermissionsSource.includes('currentStep.value === 2 && hasPermissionScopeStep.value && !validatePermissionScopeStep()'), '系统内流程离开权限范围步骤前必须校验租户')
assert.ok([rolePickerSource, copyModalSource, dataPickerSource].every((source) => source.includes('permission-modal permission-scope-picker-modal') && source.includes('.permission-modal.permission-scope-picker-modal')), '三个共享权限弹窗必须使用专属根类隔离父页面同名 scoped 样式')
assert.equal((agentPermissionsSource.match(/permission-scope-submodal-layer': approvalWorkspace\.visible/g) || []).length, 3, '审批工作区必须为三个权限子弹窗统一启用嵌套层级')
assert.ok(agentPermissionsSource.includes('.permission-modal.permission-scope-picker-modal.permission-scope-submodal-layer') && agentPermissionsSource.includes('z-index: 1800'), '审批权限子弹窗必须拥有高于审批和详情弹窗的明确层级')
console.log('permission scope tests passed')
