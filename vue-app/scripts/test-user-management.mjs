import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPermissionDemoRouteItems } from '../src/utils/permissionDemoRoute.js'

const source = await readFile(new URL('../src/views/agent/AgentPermissionsView.vue', import.meta.url), 'utf8')
const routeSource = await readFile(new URL('../src/utils/permissionDemoRoute.js', import.meta.url), 'utf8')

assert.ok(source.includes("{ key: 'workflow', label: '流程处理'") && source.includes("{ key: 'configuration', label: '权限配置'"), '权限模块导航必须按流程处理和权限配置分组')
assert.ok(source.includes('{{ modules.length }} 个入口') && source.includes('permission-module-search'), '权限模块栏必须展示入口总数并支持搜索')
assert.ok(source.includes('permission-module-badge') && source.includes('pendingApprovalCount'), '审批列表必须展示真实进行中数量')
assert.ok(source.includes('permission-demo-route') && source.includes('buildDemoApprovalRouteSteps'), '权限模块栏底部必须按真实申请单渲染本次演示链路')
assert.ok(source.includes('暂无进行中的申请') && source.includes('@click="resetDemo(demoIdentityKey)"'), '演示链路必须覆盖空状态并复用顶部重置动作')
assert.ok(source.includes('createPermissionDemoRouteItems'), '超过三步的演示链路必须使用可测试的三步窗口逻辑')
assert.ok(routeSource.includes("key: 'fold-before'") && routeSource.includes("key: 'fold-after'") && source.includes('toggleDemoRouteFold'), '演示链路必须支持前后步骤原地展开和收起')
assert.ok(source.includes('openCurrentDemoApprovalDetail') && source.includes('完整审批链路'), '完整链路必须通过查看详情进入审批详情区')
assert.ok(source.includes('.approval-filter-bar .approval-handler-filter .handler-combobox input'), '审批处理人组合输入框必须隔离全局输入框边框与焦点样式')
assert.ok(source.includes(':aria-current="activeModule === item.key ? \'page\' : undefined"'), '当前权限模块必须暴露可访问的选中状态')
assert.ok(source.includes('grid-template-columns: clamp(220px, 26%, 300px) minmax(0, 1fr) !important'), '权限模块栏必须与 Skill 创建左栏共用 220–300px 弹性宽度')
for (const legacyWidth of ['208px', '196px', '112px', '64px']) {
  assert.equal(source.includes(`grid-template-columns: ${legacyWidth} minmax(0, 1fr) !important`), false, `权限模块栏不得保留 ${legacyWidth} 私有锁宽`)
}
assert.equal(source.includes('grid-template-rows: auto minmax(0, 1fr)'), false, '权限模块导航不得降级为上下结构')

const routeFixture = Array.from({ length: 7 }, (_, index) => ({ key: `step-${index + 1}`, state: index === 3 ? 'current' : (index < 3 ? 'complete' : 'pending') }))
const collapsedRoute = createPermissionDemoRouteItems(routeFixture)
assert.deepEqual(collapsedRoute.map((item) => item.key), ['fold-before', 'step-3', 'step-4', 'step-5', 'fold-after'], '七步链路默认只显示上一步、当前步、下一步和前后折叠行')
assert.equal(collapsedRoute[0].label, '已完成 2 步', '前置折叠行必须显示已完成数量')
assert.equal(collapsedRoute.at(-1).label, '还有 2 步', '后置折叠行必须显示剩余数量')
assert.equal(createPermissionDemoRouteItems(routeFixture.slice(0, 3)).length, 3, '三步及以内必须全部展开')
assert.equal(createPermissionDemoRouteItems(routeFixture, { beforeExpanded: true }).length, 7, '前置步骤必须可以在原地展开')
assert.equal(createPermissionDemoRouteItems(routeFixture, { afterExpanded: true }).length, 7, '后置步骤必须可以在原地展开')

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
