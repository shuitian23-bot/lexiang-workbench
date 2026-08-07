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
                <span>申请人姓名 <em>必填</em></span>
                <input v-model.trim="form.name" :class="{ invalid: errors.name }" placeholder="请输入姓名" @blur="validateBasic">
                <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
              </label>
              <label>
                <span>申请人 ITCode</span>
                <input :value="itcode" readonly>
              </label>
              <label>
                <span>所属部门 <em>必填</em></span>
                <input v-model.trim="form.department" :class="{ invalid: errors.department }" placeholder="例如：乐享运营" @blur="validateBasic">
                <small v-if="errors.department" class="field-error">{{ errors.department }}</small>
              </label>
              <label>
                <span>直线经理</span>
                <input v-model.trim="form.manager" readonly>
                <small class="field-help">POC 根据组织关系自动带出。</small>
              </label>
              <label>
                <span>手机号</span>
                <input v-model.trim="form.mobile" placeholder="用于审批沟通">
              </label>
              <label>
                <span>邮箱</span>
                <input v-model.trim="form.email" type="email" placeholder="name@lenovo.com">
              </label>
              <label class="full">
                <span>申请原因 <em>必填</em></span>
                <textarea v-model.trim="form.reason" :class="{ invalid: errors.reason }" rows="4" placeholder="请说明需要访问工作台的业务场景" @blur="validateBasic"></textarea>
                <small v-if="errors.reason" class="field-error">{{ errors.reason }}</small>
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
            <label class="tenant-field">
              <span>所属租户 <em>必填</em></span>
              <select v-model="form.tenant" :class="{ invalid: errors.tenant }" @change="errors.tenant = ''">
                <option value="" disabled>请选择所属租户</option>
                <option v-for="tenant in tenantOptions" :key="tenant" :value="tenant">{{ tenant }}</option>
              </select>
              <small v-if="errors.tenant" class="field-error">{{ errors.tenant }}</small>
            </label>

            <div class="scope-section">
              <div class="scope-title">
                <b>角色与功能权限 <em>至少选择 1 个角色</em></b>
                <small>勾选角色后，可在卡片中查看自动包含的功能和数据范围。</small>
              </div>
              <div class="role-grid">
                <label v-for="role in roles" :key="role.id" :class="['role-card', { selected: selectedRoleIds.includes(role.id) }]">
                  <input v-model="selectedRoleIds" type="checkbox" :value="role.id" @change="errors.roles = ''">
                  <span class="role-check">✓</span>
                  <b>{{ role.name }}</b>
                  <p>{{ role.description }}</p>
                  <small>业务负责人：{{ role.owner }}</small>
                  <div class="permission-tags">
                    <span v-for="permission in role.functions" :key="permission">{{ permission }}</span>
                    <span v-for="permission in role.data" :key="permission" class="data">{{ permission }}</span>
                  </div>
                </label>
              </div>
              <p v-if="errors.roles" class="field-error scope-error">{{ errors.roles }}</p>
            </div>

            <div class="scope-section">
              <div class="scope-title">
                <b>额外数据权限</b>
                <small>仅勾选角色默认范围之外确有业务需要的数据。</small>
              </div>
              <div class="data-grid">
                <label v-for="permission in dataPermissions" :key="permission.id" :class="{ selected: selectedDataIds.includes(permission.id) }">
                  <input v-model="selectedDataIds" type="checkbox" :value="permission.id">
                  <span>
                    <b>{{ permission.name }}</b>
                    <small>{{ permission.group }}</small>
                  </span>
                </label>
              </div>
            </div>
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
  businessInfo: { tenant: string; organizations: string[] }
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
const selectedDataIds = ref<string[]>([])
const tenantOptions = ['联想集团', '联想中国区', '乐享业务租户']
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

const itcode = computed(() => String(route.query.itcode || appStore.user || 'noaccess'))
const form = reactive({
  name: '',
  department: '',
  manager: 'sunll1',
  mobile: '',
  email: '',
  reason: '首次申请访问乐享 AI 工作台。',
  tenant: ''
})
const errors = reactive({ name: '', department: '', reason: '', tenant: '', roles: '' })
const selectedRoles = computed(() => roles.filter((role) => selectedRoleIds.value.includes(role.id)))
const businessOwners = computed(() => [...new Set(selectedRoles.value.map((role) => role.owner))])
const selectedFunctionIds = computed(() => [...new Set(selectedRoles.value.flatMap((role) => role.functionIds))])
const selectedRoleDataIds = computed(() => [...new Set(selectedRoles.value.flatMap((role) => role.dataIds))])

function validateBasic() {
  errors.name = form.name ? '' : '请输入申请人姓名。'
  errors.department = form.department ? '' : '请输入所属部门。'
  errors.reason = form.reason ? '' : '请填写申请原因。'
  return !errors.name && !errors.department && !errors.reason
}

function validateScope() {
  errors.tenant = form.tenant ? '' : '请选择所属租户。'
  errors.roles = selectedRoleIds.value.length ? '' : '请至少选择一个角色。'
  return !errors.tenant && !errors.roles
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
    currentStep.value = errors.name || errors.department || errors.reason ? 0 : 1
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
      applicant: form.name,
      applicantItcode: itcode.value,
      applicantPersonType: 'internal',
      target: form.name,
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
      reason: form.reason,
      mobile: form.mobile,
      email: form.email || `${itcode.value}@lenovo.com`,
      businessInfo: { tenant: form.tenant, organizations: [form.department] },
      permissionSnapshot: {
        selectedRoleIds: [...selectedRoleIds.value],
        copiedFromItcode: '',
        copiedRoleIds: [],
        copiedFunctionPermissionIds: [],
        selectedFunctionPermissionIds: selectedFunctionIds.value,
        selectedDataPermissionIds: [...new Set([...selectedRoleDataIds.value, ...selectedDataIds.value])],
        manualDataPermissionIds: [...selectedDataIds.value],
        copiedDataSourceMap: {},
        tenant: form.tenant,
        changeSummary: [`首次开通 ${selectedRoleIds.value.length} 个角色`, `包含 ${selectedFunctionIds.value.length} 项功能权限`, `包含 ${new Set([...selectedRoleDataIds.value, ...selectedDataIds.value]).size} 项数据权限`]
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
.access-denied-page { min-height: 100vh; padding: 32px 18px; background: #f3f6fb; color: #172033; font-family: Arial, "Microsoft YaHei", sans-serif; }
.access-shell { width: min(1120px, 100%); margin: 0 auto; overflow: hidden; border: 1px solid #dfe7f2; border-radius: 12px; background: #fff; box-shadow: 0 18px 44px rgba(15, 23, 42, .1); }
.access-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e6edf5; padding: 16px 28px; }
.access-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; }
.access-logo { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; background: #e2231a; color: #fff; }
.text-btn { border: 0; background: transparent; color: #316dff; cursor: pointer; }
.access-intro, .success-panel { padding: 28px 36px 22px; }
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
.application-form { padding: 28px 36px 32px; }
.form-step { min-height: 360px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.section-heading h2 { margin: 0; font-size: 20px; }
.section-heading p { margin: 7px 0 0; color: #667085; font-size: 14px; }
.section-heading > span { border-radius: 999px; padding: 5px 10px; background: #eef4ff; color: #245dde; font-size: 12px; font-weight: 700; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
label > span, .tenant-field > span { display: block; margin-bottom: 7px; color: #344054; font-size: 13px; font-weight: 700; }
label em, .scope-title em { color: #d92d20; font-size: 11px; font-style: normal; }
input, textarea, select { box-sizing: border-box; width: 100%; border: 1px solid #cfd8e6; border-radius: 7px; padding: 10px 12px; background: #fff; color: #172033; font: inherit; }
input[readonly] { background: #f5f7fa; color: #52637a; }
input:focus, textarea:focus, select:focus { border-color: #316dff; outline: 2px solid rgba(49, 109, 255, .12); }
.invalid { border-color: #d92d20; }
.full { grid-column: 1 / -1; }
.field-error, .field-help { display: block; margin-top: 5px; color: #d92d20; font-size: 12px; }
.field-help { color: #7b8798; }
.tenant-field { display: block; max-width: 420px; margin-bottom: 24px; }
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
@media (max-width: 760px) {
  .access-denied-page { padding: 0; }
  .access-shell { border: 0; border-radius: 0; box-shadow: none; }
  .access-header, .access-intro, .application-form, .success-panel { padding-inline: 20px; }
  .step-tabs { padding-inline: 12px; }
  .step-tabs button { flex-direction: column; gap: 4px; font-size: 12px; }
  .form-grid, .role-grid, .data-grid { grid-template-columns: 1fr; }
  .section-heading, .scope-title { align-items: flex-start; flex-direction: column; }
  .account-strip { align-items: flex-start; flex-direction: column; }
  .account-strip em { margin-left: 0; }
}
</style>
