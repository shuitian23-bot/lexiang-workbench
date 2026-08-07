<template>
  <main class="access-denied-page">
    <section class="access-shell">
      <header class="access-header">
        <div class="access-brand">
          <div class="access-logo">L</div>
          <span>联想乐享</span>
        </div>
        <button type="button" class="text-btn" @click="backToLogin">返回登录页</button>
      </header>

      <div v-if="submittedApplication" class="success-panel">
        <span class="success-icon">✓</span>
        <p class="access-eyebrow success">申请已提交</p>
        <h1>首次访问权限申请已进入审批</h1>
        <p>申请单号：<b>{{ submittedApplication.id }}</b>。审批全部通过后，系统会一次性开通所申请的权限。</p>
        <div class="approval-flow">
          <article class="current">
            <span>1</span>
            <b>申请人直线经理</b>
            <small>{{ submittedApplication.applicantManager }}</small>
          </article>
          <article v-for="(owner, index) in submittedApplication.businessOwners" :key="owner">
            <span>{{ index + 2 }}</span>
            <b>业务负责人</b>
            <small>{{ owner }}</small>
          </article>
          <article>
            <span>{{ submittedApplication.businessOwners.length + 2 }}</span>
            <b>系统自动生效</b>
            <small>全部审批通过后执行</small>
          </article>
        </div>
        <div class="success-actions">
          <button type="button" class="secondary-btn" @click="backToLogin">返回登录页</button>
        </div>
      </div>

      <template v-else>
        <section class="access-intro">
          <p class="access-eyebrow">访问权限未开通</p>
          <h1>当前账号暂无乐享 AI 工作台访问权限</h1>
          <p>您的内部账号已完成认证，无需另行申请账号。请在当前页面补充基本信息并选择权限范围，提交后进入统一审批。</p>
          <div class="account-strip">
            <span>当前 ITCode</span>
            <b>{{ itcode }}</b>
            <em>内部用户首次访问</em>
          </div>
        </section>

        <nav class="step-tabs" aria-label="首次访问权限申请步骤">
          <button
            v-for="(step, index) in steps"
            :key="step"
            type="button"
            :class="{ active: currentStep === index, completed: index < currentStep }"
            :disabled="index > maxStep"
            @click="currentStep = index"
          >
            <span>{{ index + 1 }}</span>{{ step }}
          </button>
        </nav>

        <form class="application-form" @submit.prevent="nextOrSubmit">
          <section v-if="currentStep === 0" class="form-step">
            <div class="section-heading">
              <div>
                <h2>填写基本信息</h2>
                <p>账号信息用于识别申请人，联系方式用于审批沟通。</p>
              </div>
              <span>首次访问申请</span>
            </div>
            <div class="form-grid">
              <label>
                <span>申请人 ITCode</span>
                <input :value="itcode" readonly>
                <small class="field-help">登录认证后自动带出。</small>
              </label>
              <label>
                <span>直线经理</span>
                <input v-model.trim="form.manager" readonly>
                <small class="field-help">根据组织关系自动带出。</small>
              </label>
              <label>
                <span>手机号 <em class="optional">选填</em></span>
                <input v-model.trim="form.mobile" placeholder="用于审批沟通">
              </label>
              <label>
                <span>邮箱 <em class="optional">选填</em></span>
                <input v-model.trim="form.email" type="email" placeholder="name@lenovo.com">
              </label>
              <label class="full">
                <span>申请原因 <em class="optional">选填</em></span>
                <textarea v-model.trim="form.reason" rows="4" placeholder="可补充需要访问工作台的业务场景"></textarea>
              </label>
            </div>
          </section>

          <section v-else-if="currentStep === 1" class="form-step">
            <div class="section-heading">
              <div>
                <h2>选择权限范围</h2>
                <p>角色会自动带入对应功能权限和数据权限，也可以额外补充数据权限。</p>
              </div>
              <span>{{ selectedRoleIds.length }} 个角色</span>
            </div>
            <div class="scope-action-bar">
              <button type="button" class="primary-btn" @click="openRoleModal">添加角色</button>
              <button type="button" class="secondary-btn" :disabled="!!copiedFromUser" @click="openCopyModal">{{ copiedFromUser ? '已复制他人权限' : '复制他人权限' }}</button>
              <button type="button" class="secondary-btn" @click="openDataModal">添加数据权限</button>
            </div>

            <div class="tenant-field">
              <span>所属租户 <em>必填</em></span>
              <div :class="['tenant-multi-options', { invalid: errors.tenant }]">
                <label v-for="tenant in tenantOptions" :key="tenant" :class="{ selected: form.tenant.includes(tenant) }">
                  <input v-model="form.tenant" type="checkbox" :value="tenant" @change="errors.tenant = ''">
                  <span>{{ tenant }}</span>
                </label>
              </div>
              <small v-if="errors.tenant" class="field-error">{{ errors.tenant }}</small>
              <small v-else class="field-help">可多选，审批通过后将一次性开通所选租户。</small>
            </div>

            <div class="scope-source-stack">
              <div v-if="!hasPermissionSources" class="scope-empty">
                <b>还没有选择权限范围</b>
                <p>请使用上方三个入口添加角色、复制他人权限或添加数据权限。</p>
              </div>

              <article v-if="selectedRoles.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div><b>添加角色</b><small>{{ selectedRoles.length }} 个角色</small></div>
                  <button type="button" class="text-btn" @click="openRoleModal">调整角色</button>
                </div>
                <div class="source-role-list">
                  <div v-for="role in selectedRoles" :key="role.id" class="source-role-card">
                    <div><b>{{ role.name }}</b><small>{{ role.description }}</small></div>
                    <button type="button" class="text-btn danger" @click="removeRole(role.id)">移除</button>
                  </div>
                </div>
              </article>

              <article v-if="copiedFromUser" class="scope-source-panel copied">
                <div class="scope-panel-head">
                  <div><b>复制他人权限</b><small>复制自 {{ copiedFromUser.name }}（{{ copiedFromUser.itcode }}）</small></div>
                  <span class="readonly-badge">复制结果只读</span>
                </div>
                <div class="permission-tags">
                  <span v-for="role in copiedRoles" :key="role.id">角色 · {{ role.name }}</span>
                  <span v-for="permission in copiedDataPermissions" :key="permission.id" class="data">数据 · {{ permission.name }}</span>
                </div>
              </article>

              <article v-if="manualDataPermissions.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div><b>添加数据权限</b><small>{{ manualDataPermissions.length }} 项本次新增</small></div>
                  <button type="button" class="text-btn" @click="openDataModal">调整数据权限</button>
                </div>
                <div class="permission-tags">
                  <span v-for="permission in manualDataPermissions" :key="permission.id" class="data removable">
                    {{ permission.name }}
                    <button type="button" @click="removeDataPermission(permission.id)">×</button>
                  </span>
                </div>
              </article>
            </div>
            <p v-if="errors.roles" class="field-error scope-error">{{ errors.roles }}</p>
          </section>

          <section v-else class="form-step">
            <div class="section-heading">
              <div>
                <h2>确认并提交</h2>
                <p>本页仅确认审批流。权限变化明细将在审批侧展示。</p>
              </div>
              <span>等待提交</span>
            </div>
            <div class="approval-flow">
              <article>
                <span>1</span>
                <b>申请人直线经理</b>
                <small>{{ form.manager }}</small>
              </article>
              <article v-for="(owner, index) in businessOwners" :key="owner">
                <span>{{ index + 2 }}</span>
                <b>业务负责人</b>
                <small>{{ owner }}</small>
              </article>
              <article>
                <span>{{ businessOwners.length + 2 }}</span>
                <b>系统自动生效</b>
                <small>全部审批通过后执行</small>
              </article>
            </div>
            <div class="submit-note">
              <b>全部业务负责人必须审批通过</b>
              <p>审批完成前不会提前开通部分权限；整张申请通过后，系统一次性生效。</p>
            </div>
          </section>

          <p v-if="submitError" class="submit-error">{{ submitError }}</p>
          <footer class="form-actions">
            <button v-if="currentStep > 0" type="button" class="secondary-btn" @click="currentStep -= 1">上一步</button>
            <button type="submit" class="primary-btn">{{ currentStep === steps.length - 1 ? '提交申请' : '下一步' }}</button>
          </footer>
        </form>

        <div v-if="roleModal.visible" class="permission-modal" @click.self="closeRoleModal">
          <section class="modal-panel permission-picker-modal">
            <button type="button" class="modal-close" aria-label="关闭" @click="closeRoleModal">×</button>
            <h3>添加角色</h3>
            <p>仅按角色名称和角色中包含的功能权限搜索。</p>
            <input v-model.trim="roleModal.keyword" class="modal-search-input" placeholder="搜索角色名称、功能权限">
            <div class="modal-role-list">
              <article v-for="role in filteredRoles" :key="role.id" :class="{ active: roleModal.detailRoleId === role.id }" @click="roleModal.detailRoleId = role.id">
                <label>
                  <input type="checkbox" :checked="roleModal.selectedIds.includes(role.id)" :disabled="copiedRoleIds.includes(role.id)" @change="toggleRoleDraft(role.id)">
                  <span><b>{{ role.name }}</b><small>{{ role.description }}</small></span>
                </label>
                <button type="button" class="text-btn" @click.stop="roleModal.detailRoleId = role.id">查看详情</button>
              </article>
            </div>
            <div v-if="roleModalDetail" class="modal-role-detail">
              <h4>{{ roleModalDetail.name }}</h4>
              <p>业务负责人：{{ roleModalDetail.owner }}</p>
              <b>功能权限</b>
              <div class="modal-permission-checks">
                <label v-for="(permission, index) in roleModalDetail.functions" :key="roleModalDetail.functionIds[index]">
                  <input type="checkbox" :checked="roleModal.selectedFunctionIds.includes(roleModalDetail.functionIds[index])" :disabled="copiedRoleIds.includes(roleModalDetail.id)" @change="toggleRoleFunctionDraft(roleModalDetail.functionIds[index])">
                  <span>{{ permission }}</span>
                </label>
              </div>
              <b>数据权限</b>
              <div class="modal-permission-checks data">
                <label v-for="(permission, index) in roleModalDetail.data" :key="roleModalDetail.dataIds[index]">
                  <input type="checkbox" :checked="roleModal.selectedDataIds.includes(roleModalDetail.dataIds[index])" :disabled="copiedRoleIds.includes(roleModalDetail.id)" @change="toggleRoleDataDraft(roleModalDetail.dataIds[index])">
                  <span>{{ permission }}</span>
                </label>
              </div>
            </div>
            <footer class="modal-actions">
              <button type="button" class="secondary-btn" @click="closeRoleModal">取消</button>
              <button type="button" class="primary-btn" @click="confirmRoleSelection">确认</button>
            </footer>
          </section>
        </div>

        <div v-if="copyModal.visible" class="permission-modal" @click.self="closeCopyModal">
          <section class="modal-panel small">
            <button type="button" class="modal-close" aria-label="关闭" @click="closeCopyModal">×</button>
            <h3>复制他人权限</h3>
            <p>复制对方当前有效的角色、功能权限、数据权限和用户级例外；复制结果只读。</p>
            <label class="modal-form-field">
              <span>对方 ITCode <em>必填</em></span>
              <input v-model.trim="copyModal.itcode" :class="{ invalid: copyModal.error }" placeholder="例如 wangxt8" @keyup.enter="confirmCopyPermissions">
              <small v-if="copyModal.error" class="field-error">{{ copyModal.error }}</small>
            </label>
            <small class="field-help">可试用：wangxt8、liwen08、temp-bpo</small>
            <footer class="modal-actions">
              <button type="button" class="secondary-btn" @click="closeCopyModal">取消</button>
              <button type="button" class="primary-btn" @click="confirmCopyPermissions">确认复制</button>
            </footer>
          </section>
        </div>

        <div v-if="dataModal.visible" class="permission-modal" @click.self="closeDataModal">
          <section class="modal-panel permission-picker-modal">
            <button type="button" class="modal-close" aria-label="关闭" @click="closeDataModal">×</button>
            <h3>添加数据权限</h3>
            <p>复制带入的数据权限保持锁定，只能调整本次手工添加的数据权限。</p>
            <input v-model.trim="dataModal.keyword" class="modal-search-input" placeholder="搜索数据权限名称或分组">
            <div class="modal-data-list">
              <label v-for="permission in filteredDataPermissions" :key="permission.id" :class="{ selected: dataModal.selectedIds.includes(permission.id), locked: copiedDataIds.includes(permission.id) }">
                <input type="checkbox" :checked="dataModal.selectedIds.includes(permission.id)" :disabled="copiedDataIds.includes(permission.id)" @change="toggleDataDraft(permission.id)">
                <span><b>{{ permission.name }}</b><small>{{ permission.group }}</small></span>
                <em v-if="copiedDataIds.includes(permission.id)">复制带入</em>
              </label>
            </div>
            <footer class="modal-actions">
              <button type="button" class="secondary-btn" @click="closeDataModal">取消</button>
              <button type="button" class="primary-btn" @click="confirmDataSelection">确认</button>
            </footer>
          </section>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

interface FirstAccessApplication {
  id: string
  typeKey: string
  type: string
  applicant: string
  applicantItcode: string
  applicantPersonType: string
  target: string
  targetItcode: string
  personType: string
  applicantManager: string
  targetManager: string
  businessApprover: string
  businessOwners: string[]
  approverItcode: string
  handlers: string[]
  nodeType: string
  node: string
  status: string
  statusKey: string
  time: string
  reason: string
  mobile: string
  email: string
  businessInfo: { tenant: string[]; organizations: string[] }
  permissionSnapshot: Record<string, unknown>
  approvalLogs: Array<Record<string, string>>
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const steps = ['基本信息', '权限范围', '提交申请']
const currentStep = ref(0)
const maxStep = ref(0)
const submitError = ref('')
const submittedApplication = ref<FirstAccessApplication | null>(null)
const selectedRoleIds = ref<string[]>([])
const copiedRoleIds = ref<string[]>([])
const copiedFunctionIds = ref<string[]>([])
const copiedDataIds = ref<string[]>([])
const selectedRoleFunctionIds = ref<string[]>([])
const selectedRoleDataIds = ref<string[]>([])
const manualDataIds = ref<string[]>([])
const copiedFromItcode = ref('')
const tenantOptions = ['leaibot-cn', 'shop-chat', 'b-chat', 'biz-chat']
const roles = [
  { id: 'ops-pm', name: '运营分析 PM', description: '查看运营总览并生成运营分析报告。', owner: 'zhangjq4', functionIds: ['func.dashboard.view', 'func.report.generate', 'func.data.export'], functions: ['运营总览', '报告生成', '数据导出'], dataIds: ['data.ops.region.east'], data: ['华东区运营数据'] },
  { id: 'product-op', name: '商品运营', description: '维护商品、推荐位和上下架策略。', owner: 'huangjq5', functionIds: ['func.dashboard.view', 'func.product.config', 'func.publish.confirm'], functions: ['运营总览', '商品配置', '发布确认'], dataIds: ['data.ops.region.north', 'data.ops.metric.gmv'], data: ['华北区运营数据', 'GMV 指标'] },
  { id: 'geo-analyst', name: 'GEO 分析师', description: '查看信源、引用和搜索表现数据。', owner: 'zhangxy43', functionIds: ['func.geo.monitor', 'func.report.generate'], functions: ['GEO 信源监测', '报告生成'], dataIds: ['data.geo.source.official', 'data.geo.source.community'], data: ['官方信源', '社区信源'] },
  { id: 'lead-operator', name: '线索运营', description: '查看企业客户线索并完成分配跟进。', owner: 'sunll1', functionIds: ['func.lead.assign'], functions: ['线索分配'], dataIds: ['data.lead.pool.assigned'], data: ['已分配线索'] }
]
const dataPermissions = [
  { id: 'data.ops.region.east', name: '华东区运营数据', group: '乐享运营' },
  { id: 'data.ops.region.north', name: '华北区运营数据', group: '乐享运营' },
  { id: 'data.ops.region.south', name: '华南区运营数据', group: '乐享运营' },
  { id: 'data.ops.metric.gmv', name: 'GMV 指标', group: '乐享运营' },
  { id: 'data.geo.source.official', name: '官方信源', group: 'GEO 看板' },
  { id: 'data.geo.source.community', name: '社区信源', group: 'GEO 看板' },
  { id: 'data.lead.pool.assigned', name: '已分配线索', group: '企业客户管理' }
]
const copyableUsers = [
  { itcode: 'wangxt8', name: '王晓天', roleIds: ['ops-pm'], functionIds: ['func.data.export'], dataIds: ['data.ops.region.east', 'data.ops.metric.gmv'] },
  { itcode: 'liwen08', name: '李雯', roleIds: ['geo-analyst'], functionIds: [], dataIds: ['data.geo.source.official', 'data.geo.source.community'] },
  { itcode: 'temp-bpo', name: '外部协作账号', roleIds: ['lead-operator'], functionIds: [], dataIds: ['data.lead.pool.assigned'] }
]
const roleModal = reactive({ visible: false, keyword: '', selectedIds: [] as string[], selectedFunctionIds: [] as string[], selectedDataIds: [] as string[], detailRoleId: '' })
const copyModal = reactive({ visible: false, itcode: '', error: '' })
const dataModal = reactive({ visible: false, keyword: '', selectedIds: [] as string[] })

const itcode = computed(() => String(route.query.itcode || appStore.user || 'noaccess'))
const form = reactive({
  manager: 'sunll1',
  mobile: '',
  email: '',
  reason: '',
  tenant: [] as string[]
})
const errors = reactive({ tenant: '', roles: '' })
const selectedRoles = computed(() => roles.filter((role) => selectedRoleIds.value.includes(role.id)))
const copiedRoles = computed(() => roles.filter((role) => copiedRoleIds.value.includes(role.id)))
const allSelectedRoles = computed(() => [...selectedRoles.value, ...copiedRoles.value.filter((role) => !selectedRoleIds.value.includes(role.id))])
const copiedFromUser = computed(() => copyableUsers.find((user) => user.itcode === copiedFromItcode.value) || null)
const copiedDataPermissions = computed(() => dataPermissions.filter((permission) => copiedDataIds.value.includes(permission.id)))
const manualDataPermissions = computed(() => dataPermissions.filter((permission) => manualDataIds.value.includes(permission.id)))
const selectedFunctionIds = computed(() => [...new Set([...selectedRoleFunctionIds.value, ...copiedRoles.value.flatMap((role) => role.functionIds), ...copiedFunctionIds.value])])
const selectedDataIds = computed(() => [...new Set([...selectedRoleDataIds.value, ...copiedDataIds.value, ...manualDataIds.value])])
const businessOwners = computed(() => [...new Set(allSelectedRoles.value.map((role) => role.owner))])
const hasPermissionSources = computed(() => selectedRoles.value.length > 0 || !!copiedFromUser.value || manualDataPermissions.value.length > 0)
const filteredRoles = computed(() => {
  const keyword = roleModal.keyword.toLowerCase()
  return roles.filter((role) => [role.name, role.description, ...role.functions].join(' ').toLowerCase().includes(keyword))
})
const roleModalDetail = computed(() => roles.find((role) => role.id === roleModal.detailRoleId) || null)
const filteredDataPermissions = computed(() => {
  const keyword = dataModal.keyword.toLowerCase()
  return dataPermissions.filter((permission) => `${permission.name} ${permission.group}`.toLowerCase().includes(keyword))
})

function validateBasic() {
  return true
}

function validateScope() {
  errors.tenant = form.tenant.length ? '' : '请至少选择一个所属租户。'
  errors.roles = allSelectedRoles.value.length ? '' : '请至少添加一个角色或复制一份有效权限。'
  return !errors.tenant && !errors.roles
}

function openRoleModal() {
  roleModal.visible = true
  roleModal.keyword = ''
  roleModal.selectedIds = [...selectedRoleIds.value]
  roleModal.selectedFunctionIds = [...selectedRoleFunctionIds.value]
  roleModal.selectedDataIds = [...selectedRoleDataIds.value]
  roleModal.detailRoleId = selectedRoleIds.value[0] || roles[0].id
}

function closeRoleModal() {
  roleModal.visible = false
}

function toggleRoleDraft(roleId: string) {
  if (copiedRoleIds.value.includes(roleId)) return
  const role = roles.find((item) => item.id === roleId)
  if (!role) return
  if (roleModal.selectedIds.includes(roleId)) {
    roleModal.selectedIds = roleModal.selectedIds.filter((id) => id !== roleId)
    const remainingRoles = roles.filter((item) => roleModal.selectedIds.includes(item.id))
    const remainingFunctionIds = new Set(remainingRoles.flatMap((item) => item.functionIds))
    const remainingDataIds = new Set(remainingRoles.flatMap((item) => item.dataIds))
    roleModal.selectedFunctionIds = roleModal.selectedFunctionIds.filter((id) => remainingFunctionIds.has(id))
    roleModal.selectedDataIds = roleModal.selectedDataIds.filter((id) => remainingDataIds.has(id))
  } else {
    roleModal.selectedIds.push(roleId)
    roleModal.selectedFunctionIds = [...new Set([...roleModal.selectedFunctionIds, ...role.functionIds])]
    roleModal.selectedDataIds = [...new Set([...roleModal.selectedDataIds, ...role.dataIds])]
  }
}

function toggleRoleFunctionDraft(permissionId: string) {
  if (!roleModal.selectedIds.includes(roleModal.detailRoleId)) roleModal.selectedIds.push(roleModal.detailRoleId)
  roleModal.selectedFunctionIds = roleModal.selectedFunctionIds.includes(permissionId)
    ? roleModal.selectedFunctionIds.filter((id) => id !== permissionId)
    : [...roleModal.selectedFunctionIds, permissionId]
}

function toggleRoleDataDraft(permissionId: string) {
  if (!roleModal.selectedIds.includes(roleModal.detailRoleId)) roleModal.selectedIds.push(roleModal.detailRoleId)
  roleModal.selectedDataIds = roleModal.selectedDataIds.includes(permissionId)
    ? roleModal.selectedDataIds.filter((id) => id !== permissionId)
    : [...roleModal.selectedDataIds, permissionId]
}

function confirmRoleSelection() {
  selectedRoleIds.value = [...roleModal.selectedIds]
  selectedRoleFunctionIds.value = [...roleModal.selectedFunctionIds]
  selectedRoleDataIds.value = [...roleModal.selectedDataIds]
  errors.roles = ''
  closeRoleModal()
}

function removeRole(roleId: string) {
  selectedRoleIds.value = selectedRoleIds.value.filter((id) => id !== roleId)
  const remainingRoles = roles.filter((role) => selectedRoleIds.value.includes(role.id))
  const remainingFunctionIds = new Set(remainingRoles.flatMap((role) => role.functionIds))
  const remainingDataIds = new Set(remainingRoles.flatMap((role) => role.dataIds))
  selectedRoleFunctionIds.value = selectedRoleFunctionIds.value.filter((id) => remainingFunctionIds.has(id))
  selectedRoleDataIds.value = selectedRoleDataIds.value.filter((id) => remainingDataIds.has(id))
}

function openCopyModal() {
  if (copiedFromUser.value) return
  copyModal.visible = true
  copyModal.itcode = ''
  copyModal.error = ''
}

function closeCopyModal() {
  copyModal.visible = false
}

function confirmCopyPermissions() {
  const user = copyableUsers.find((item) => item.itcode.toLowerCase() === copyModal.itcode.toLowerCase())
  if (!user) {
    copyModal.error = '没有找到该 ITCode 的 POC 权限，请检查后再试。'
    return
  }
  copiedFromItcode.value = user.itcode
  copiedRoleIds.value = [...user.roleIds]
  copiedFunctionIds.value = [...user.functionIds]
  copiedDataIds.value = [...user.dataIds]
  errors.roles = ''
  closeCopyModal()
}

function openDataModal() {
  dataModal.visible = true
  dataModal.keyword = ''
  dataModal.selectedIds = [...new Set([...manualDataIds.value, ...copiedDataIds.value])]
}

function closeDataModal() {
  dataModal.visible = false
}

function toggleDataDraft(permissionId: string) {
  if (copiedDataIds.value.includes(permissionId)) return
  dataModal.selectedIds = dataModal.selectedIds.includes(permissionId)
    ? dataModal.selectedIds.filter((id) => id !== permissionId)
    : [...dataModal.selectedIds, permissionId]
}

function confirmDataSelection() {
  manualDataIds.value = dataModal.selectedIds.filter((id) => !copiedDataIds.value.includes(id))
  closeDataModal()
}

function removeDataPermission(permissionId: string) {
  manualDataIds.value = manualDataIds.value.filter((id) => id !== permissionId)
}

function nextOrSubmit() {
  submitError.value = ''
  if (currentStep.value === 0 && !validateBasic()) return
  if (currentStep.value === 1 && !validateScope()) return
  if (currentStep.value < steps.length - 1) {
    currentStep.value += 1
    maxStep.value = Math.max(maxStep.value, currentStep.value)
    return
  }
  submitApplication()
}

function applicationNumber() {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `PA-${date}-${String(now.getTime()).slice(-6)}`
}

function submitApplication() {
  if (!validateBasic() || !validateScope()) {
    currentStep.value = 1
    return
  }
  try {
    const storageKey = 'leaibot-first-access-applications'
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as FirstAccessApplication[]
    const existing = stored.find((item) => item.applicantItcode.toLowerCase() === itcode.value.toLowerCase() && item.statusKey === 'pending')
    if (existing) {
      submittedApplication.value = existing
      return
    }
    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    const application: FirstAccessApplication = {
      id: applicationNumber(),
      typeKey: 'change',
      type: '首次访问权限',
      applicant: itcode.value,
      applicantItcode: itcode.value,
      applicantPersonType: 'internal',
      target: itcode.value,
      targetItcode: itcode.value,
      personType: 'internal',
      applicantManager: form.manager,
      targetManager: form.manager,
      businessApprover: businessOwners.value.join('、'),
      businessOwners: businessOwners.value,
      approverItcode: form.manager,
      handlers: [form.manager],
      nodeType: 'applicant-manager',
      node: '申请人直线经理审批',
      status: '审批中',
      statusKey: 'pending',
      time: now,
      reason: form.reason || '未填写',
      mobile: form.mobile,
      email: form.email || `${itcode.value}@lenovo.com`,
      businessInfo: { tenant: [...form.tenant], organizations: [] },
      permissionSnapshot: {
        selectedRoleIds: [...selectedRoleIds.value],
        copiedFromItcode: copiedFromItcode.value,
        copiedRoleIds: [...copiedRoleIds.value],
        copiedFunctionPermissionIds: [...copiedFunctionIds.value],
        selectedFunctionPermissionIds: selectedFunctionIds.value,
        selectedDataPermissionIds: selectedDataIds.value,
        manualDataPermissionIds: [...manualDataIds.value],
        copiedDataSourceMap: {},
        tenant: [...form.tenant],
        changeSummary: [`首次开通 ${allSelectedRoles.value.length} 个角色`, `包含 ${selectedFunctionIds.value.length} 项功能权限`, `包含 ${selectedDataIds.value.length} 项数据权限`, `开通 ${form.tenant.length} 个租户`]
      },
      approvalLogs: [{ node: '申请提交', action: 'submit', operator: itcode.value, opinion: '内部用户在无权限页提交首次访问申请。', time: now }]
    }
    stored.unshift(application)
    window.localStorage.setItem(storageKey, JSON.stringify(stored.slice(0, 20)))
    submittedApplication.value = application
  } catch {
    submitError.value = '申请暂时无法保存，请稍后重试。'
  }
}

function restorePendingApplication() {
  try {
    const stored = JSON.parse(window.localStorage.getItem('leaibot-first-access-applications') || '[]') as FirstAccessApplication[]
    submittedApplication.value = stored.find((item) => item.applicantItcode.toLowerCase() === itcode.value.toLowerCase() && item.statusKey === 'pending') || null
  } catch {
    submittedApplication.value = null
  }
}

function backToLogin() {
  appStore.user = null
  router.replace('/login')
}

onMounted(restorePendingApplication)
</script>

<style scoped>
.access-denied-page { box-sizing: border-box; height: 100vh; overflow-x: hidden; overflow-y: auto; padding: 32px 18px; background: #f3f6fb; color: #172033; font-family: Arial, "Microsoft YaHei", sans-serif; }
.access-shell { width: min(980px, 100%); margin: 0 auto; overflow: hidden; border: 1px solid #dfe7f2; border-radius: 12px; background: #fff; box-shadow: 0 18px 44px rgba(15, 23, 42, .1); }
.access-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e6edf5; padding: 16px 28px; }
.access-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.access-logo { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; background: #e2231a; color: #fff; }
.text-btn { border: 0; background: transparent; color: #316dff; cursor: pointer; }
.access-intro, .success-panel { box-sizing: border-box; width: min(860px, 100%); margin: 0 auto; padding: 28px 36px 22px; }
.access-eyebrow { display: inline-flex; margin: 0 0 10px; border-radius: 999px; padding: 5px 10px; background: #fff4e5; color: #b45309; font-size: 12px; font-weight: 800; }
.access-eyebrow.success { background: #ecfdf3; color: #027a48; }
h1 { margin: 0; color: #101828; font-size: 26px; line-height: 1.35; }
.access-intro > p:not(.access-eyebrow), .success-panel > p { margin: 10px 0 0; color: #667085; line-height: 1.7; }
.account-strip { display: flex; align-items: center; gap: 14px; margin-top: 20px; border: 1px solid #dce8f8; border-radius: 8px; padding: 12px 14px; background: #f7faff; }
.account-strip span { color: #667085; font-size: 13px; }
.account-strip em { margin-left: auto; color: #52637a; font-size: 12px; font-style: normal; }
.step-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border-block: 1px solid #e6edf5; background: #f8fafc; padding: 0 36px; }
.step-tabs button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 56px; border: 0; border-bottom: 3px solid transparent; background: transparent; color: #7b8798; font-weight: 700; cursor: pointer; }
.step-tabs button.active { border-bottom-color: #316dff; color: #245dde; }
.step-tabs button.completed { color: #027a48; }
.step-tabs button:disabled { cursor: not-allowed; opacity: .55; }
.step-tabs span { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #e8edf5; font-size: 12px; }
.step-tabs .active span { background: #316dff; color: #fff; }
.application-form { box-sizing: border-box; width: min(860px, 100%); margin: 0 auto; padding: 28px 36px 32px; }
.form-step { min-height: 360px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.section-heading h2 { margin: 0; font-size: 20px; }
.section-heading p { margin: 7px 0 0; color: #667085; font-size: 14px; }
.section-heading > span { border-radius: 999px; padding: 5px 10px; background: #eef4ff; color: #245dde; font-size: 12px; font-weight: 700; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
label > span, .tenant-field > span { display: block; margin-bottom: 7px; color: #344054; font-size: 13px; font-weight: 700; }
label em, .scope-title em { color: #d92d20; font-size: 11px; font-style: normal; }
label em.optional { color: #7b8798; font-weight: 400; }
input, textarea, select { box-sizing: border-box; width: 100%; border: 1px solid #cfd8e6; border-radius: 7px; padding: 10px 12px; background: #fff; color: #172033; font: inherit; }
input[readonly] { background: #f5f7fa; color: #52637a; }
input:focus, textarea:focus, select:focus { border-color: #316dff; outline: 2px solid rgba(49, 109, 255, .12); }
.invalid { border-color: #d92d20; }
.full { grid-column: 1 / -1; }
.field-error, .field-help { display: block; margin-top: 5px; color: #d92d20; font-size: 12px; }
.field-help { color: #7b8798; }
.scope-action-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.scope-action-bar button:disabled { cursor: not-allowed; opacity: .55; }
.tenant-field { display: block; margin-bottom: 24px; }
.tenant-multi-options { display: flex; flex-wrap: wrap; gap: 9px; border: 1px solid #d9e2ef; border-radius: 8px; padding: 10px; }
.tenant-multi-options.invalid { border-color: #d92d20; }
.tenant-multi-options label { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; border: 1px solid #d9e2ef; border-radius: 7px; padding: 0 11px; color: #52637a; cursor: pointer; }
.tenant-multi-options label.selected { border-color: #316dff; background: #f1f6ff; color: #245dde; }
.tenant-multi-options input { width: 15px; height: 15px; accent-color: #316dff; }
.scope-source-stack { display: grid; gap: 12px; }
.scope-empty { border: 1px dashed #cfd9e7; border-radius: 9px; padding: 28px; text-align: center; background: #fafcff; }
.scope-empty p { margin: 7px 0 0; color: #7b8798; }
.scope-source-panel { border: 1px solid #dce4ef; border-radius: 9px; padding: 15px; background: #fff; }
.scope-source-panel.copied { background: #f8fbff; }
.scope-panel-head, .source-role-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.scope-panel-head small, .source-role-card small { display: block; margin-top: 4px; color: #7b8798; }
.source-role-list { display: grid; gap: 9px; margin-top: 12px; }
.source-role-card { border-top: 1px solid #edf1f6; padding-top: 10px; }
.text-btn.danger { color: #d92d20; }
.readonly-badge { border-radius: 999px; padding: 4px 8px; background: #e8edf5; color: #52637a; font-size: 11px; font-weight: 700; }
.scope-section + .scope-section { margin-top: 26px; border-top: 1px solid #edf1f6; padding-top: 24px; }
.scope-title { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.scope-title small { color: #7b8798; }
.role-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.role-card { position: relative; display: block; border: 1px solid #dce4ef; border-radius: 9px; padding: 15px 16px; cursor: pointer; }
.role-card.selected { border-color: #316dff; background: #f7faff; box-shadow: inset 0 0 0 1px #316dff; }
.role-card > input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.role-check { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid #cbd5e1; border-radius: 5px; color: transparent; }
.role-card.selected .role-check { border-color: #316dff; background: #316dff; color: #fff; }
.role-card > b { padding-right: 28px; }
.role-card > p { margin: 7px 0; color: #667085; font-size: 13px; }
.role-card > small { color: #52637a; }
.permission-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.permission-tags span { border-radius: 999px; padding: 4px 8px; background: #eef4ff; color: #245dde; font-size: 11px; }
.permission-tags span.data { background: #ecfdf3; color: #027a48; }
.permission-tags span.removable { display: inline-flex; align-items: center; gap: 5px; }
.permission-tags span.removable button { border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; }
.scope-error { margin-top: 8px; }
.data-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.data-grid label { display: flex; align-items: center; gap: 10px; border: 1px solid #dce4ef; border-radius: 8px; padding: 12px; cursor: pointer; }
.data-grid label.selected { border-color: #316dff; background: #f7faff; }
.data-grid input { width: 16px; height: 16px; }
.data-grid label span { margin: 0; }
.data-grid small { display: block; margin-top: 3px; color: #7b8798; font-weight: 400; }
.approval-flow { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 20px; }
.approval-flow article { position: relative; border: 1px solid #dce4ef; border-radius: 9px; padding: 16px; }
.approval-flow article.current { border-color: #316dff; background: #f7faff; }
.approval-flow article span { display: grid; place-items: center; width: 24px; height: 24px; margin-bottom: 12px; border-radius: 50%; background: #e8edf5; color: #52637a; font-size: 12px; font-weight: 800; }
.approval-flow article b, .approval-flow article small { display: block; }
.approval-flow article small { margin-top: 6px; color: #667085; }
.submit-note { margin-top: 20px; border: 1px solid #cfe0ff; border-radius: 8px; padding: 14px 16px; background: #f5f8ff; }
.submit-note b { color: #244ea3; }
.submit-note p { margin: 6px 0 0; color: #52637a; line-height: 1.6; }
.form-actions, .success-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 26px; border-top: 1px solid #edf1f6; padding-top: 20px; }
.primary-btn, .secondary-btn { min-height: 40px; border-radius: 8px; padding: 0 18px; font-weight: 800; cursor: pointer; }
.primary-btn { border: 1px solid #316dff; background: #316dff; color: #fff; }
.secondary-btn { border: 1px solid #d8e1ee; background: #fff; color: #455468; }
.submit-error { margin: 16px 0 0; color: #d92d20; }
.success-panel { padding-block: 54px; text-align: center; }
.success-icon { display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto 18px; border-radius: 50%; background: #12b76a; color: #fff; font-size: 28px; }
.success-panel .approval-flow { text-align: left; }
.permission-modal { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 24px; background: rgba(15, 23, 42, .48); }
.modal-panel { position: relative; box-sizing: border-box; width: min(860px, 100%); max-height: calc(100vh - 48px); overflow-y: auto; border-radius: 12px; padding: 24px; background: #fff; box-shadow: 0 24px 64px rgba(15, 23, 42, .22); }
.modal-panel.small { width: min(520px, 100%); }
.modal-panel h3 { margin: 0; font-size: 20px; }
.modal-panel > p { margin: 7px 32px 16px 0; color: #667085; line-height: 1.6; }
.modal-close { position: absolute; top: 15px; right: 16px; border: 0; background: transparent; color: #667085; font-size: 24px; cursor: pointer; }
.modal-search-input { margin-bottom: 14px; }
.modal-role-list { display: grid; gap: 8px; max-height: 280px; overflow-y: auto; }
.modal-role-list article { display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid #dce4ef; border-radius: 8px; padding: 11px 12px; cursor: pointer; }
.modal-role-list article.active { border-color: #316dff; background: #f7faff; }
.modal-role-list label { display: flex; align-items: flex-start; gap: 10px; flex: 1; cursor: pointer; }
.modal-role-list label input { width: 16px; height: 16px; margin-top: 2px; }
.modal-role-list label span { margin: 0; }
.modal-role-list label small, .modal-role-detail p, .modal-data-list small { display: block; margin-top: 4px; color: #7b8798; font-weight: 400; }
.modal-role-detail { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fafcff; }
.modal-role-detail h4 { margin: 0; }
.modal-role-detail > b { display: block; margin-top: 12px; font-size: 13px; }
.modal-permission-checks { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.modal-permission-checks label { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #d7e3f5; border-radius: 999px; padding: 5px 9px; background: #eef4ff; color: #245dde; cursor: pointer; }
.modal-permission-checks.data label { border-color: #ccebdc; background: #ecfdf3; color: #027a48; }
.modal-permission-checks input { width: 14px; height: 14px; }
.modal-form-field { display: block; }
.modal-data-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; max-height: 420px; overflow-y: auto; }
.modal-data-list label { display: flex; align-items: center; gap: 10px; border: 1px solid #dce4ef; border-radius: 8px; padding: 11px; cursor: pointer; }
.modal-data-list label.selected { border-color: #316dff; background: #f7faff; }
.modal-data-list label.locked { background: #f5f7fa; cursor: not-allowed; }
.modal-data-list input { width: 16px; height: 16px; }
.modal-data-list label span { flex: 1; margin: 0; }
.modal-data-list em { color: #667085; font-size: 11px; font-style: normal; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #edf1f6; padding-top: 16px; }
@media (max-width: 760px) {
  .access-denied-page { padding: 0; }
  .access-shell { border: 0; border-radius: 0; box-shadow: none; }
  .access-header, .access-intro, .application-form, .success-panel { padding-inline: 20px; }
  .step-tabs { padding-inline: 12px; }
  .step-tabs button { flex-direction: column; gap: 4px; font-size: 12px; }
  .form-grid, .role-grid, .data-grid, .modal-data-list { grid-template-columns: 1fr; }
  .section-heading, .scope-title { align-items: flex-start; flex-direction: column; }
  .account-strip { align-items: flex-start; flex-direction: column; }
  .account-strip em { margin-left: 0; }
  .permission-modal { align-items: start; padding: 12px; }
  .modal-panel { max-height: calc(100vh - 24px); padding: 20px; }
}
</style>
