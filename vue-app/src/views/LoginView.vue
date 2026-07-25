<template>
  <!-- 原 #login-screen，class/结构/样式一字不改 -->
  <div id="login-screen">
    <div class="login-card">
      <div class="login-logo" style="margin-bottom:40px;">
        <div class="icon">L</div>
        <span>联想乐享</span>
      </div>
      <div class="login-title">登录</div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input
          class="form-input"
          v-model="username"
          placeholder="admin"
          autofocus
          @keydown.enter="doLogin"
        />
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input
          class="form-input"
          v-model="password"
          type="password"
          placeholder="••••••"
          @keydown.enter="doLogin"
        />
      </div>
      <!-- 原 #login-error：有错误时才显示，保留原来的 display:block 效果 -->
      <div
        class="login-error"
        :style="{ display: errorMsg ? 'block' : '' }"
      >{{ errorMsg }}</div>
      <button class="btn btn-primary login-btn" @click="doLogin">登录工作台</button>
      <div class="login-register-entry">
        <span>还没有工作台账号？</span>
        <button type="button" class="login-register-btn" @click="openRegisterModal">创建账户/注册</button>
      </div>
    </div>

    <div v-if="registerModalVisible" class="register-modal-layer" @click.self="closeRegisterModal">
      <div class="register-modal-panel" role="dialog" aria-modal="true" aria-labelledby="register-modal-title">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterModal">×</button>
        <div class="register-modal-head">
          <div>
            <h2 id="register-modal-title">创建账户/注册</h2>
            <p>无账号用户可先提交账号创建申请，审批通过后开通门户工作台和初始权限。</p>
          </div>
          <span>{{ registerSubmitted ? '已提交' : '免登录申请' }}</span>
        </div>

        <div class="register-steps" aria-label="创建账号申请步骤">
          <button
            v-for="(step, index) in registerSteps"
            :key="step.key"
            type="button"
            :class="{ active: registerStep === index, locked: index > maxRegisterStep }"
            :disabled="index > maxRegisterStep || registerSubmitted"
            @click="goRegisterStep(index)"
          >{{ step.label }}</button>
        </div>

        <div v-if="currentRegisterStepKey === 'info'" class="register-step-body">
          <h3>填写信息</h3>
          <p>请填写申请人和待创建账号人员信息，审批人会基于这些信息确认开通对象。</p>
          <div class="register-form-grid">
            <label>
              <span>人员类型 <em>必填</em></span>
              <select v-model="registerForm.personType">
                <option value="internal">内部人员</option>
                <option value="external">外部人员</option>
              </select>
            </label>
            <label>
              <span>申请人 <em>必填</em></span>
              <input v-model.trim="registerForm.applicant" :class="{ invalid: registerErrors.applicant }" placeholder="请输入申请人姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.applicant">{{ registerErrors.applicant }}</small>
            </label>
            <label>
              <span>申请人 ITCode <em>必填</em></span>
              <input v-model.trim="registerForm.applicantItcode" :class="{ invalid: registerErrors.applicantItcode }" placeholder="请输入申请人 ITCode" @blur="validateRegisterInfo">
              <small v-if="registerErrors.applicantItcode">{{ registerErrors.applicantItcode }}</small>
            </label>
            <label>
              <span>待创建账号人员 <em>必填</em></span>
              <input v-model.trim="registerForm.targetUser" :class="{ invalid: registerErrors.targetUser }" placeholder="请输入姓名或 ITCode" @blur="validateRegisterInfo">
              <small v-if="registerErrors.targetUser">{{ registerErrors.targetUser }}</small>
            </label>
            <label>
              <span>手机号</span>
              <input v-model.trim="registerForm.mobile" placeholder="用于审批沟通或账号开通">
            </label>
            <label>
              <span>邮箱</span>
              <input v-model.trim="registerForm.email" placeholder="name@lenovo.com">
            </label>
            <label>
              <span>申请人直线经理</span>
              <input v-model.trim="registerForm.applicantManager" placeholder="请输入经理 ITCode 或姓名">
            </label>
            <label>
              <span>被申请人直线经理</span>
              <input v-model.trim="registerForm.targetManager" placeholder="请输入经理 ITCode 或姓名">
            </label>
            <label class="full" v-if="registerForm.personType === 'external'">
              <span>关联账号 / 关联人员 <em>必填</em></span>
              <input v-model.trim="registerForm.relatedAccount" :class="{ invalid: registerErrors.relatedAccount }" placeholder="请输入负责对接的内部员工 ITCode 或姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.relatedAccount">{{ registerErrors.relatedAccount }}</small>
            </label>
            <label class="full">
              <span>申请原因 / 需求描述 <em>必填</em></span>
              <textarea v-model.trim="registerForm.reason" :class="{ invalid: registerErrors.reason }" rows="4" placeholder="请描述业务场景、需要开通的权限和使用周期。" @blur="validateRegisterInfo"></textarea>
              <small v-if="registerErrors.reason">{{ registerErrors.reason }}</small>
            </label>
          </div>
        </div>

        <div v-else-if="currentRegisterStepKey === 'scope'" class="register-step-body">
          <h3>权限范围</h3>
          <p>账号创建默认包含登录工作台能力，可按岗位选择初始角色和数据权限。</p>
          <div class="register-scope-section">
            <b>初始角色</b>
            <div class="register-option-grid">
              <button
                v-for="role in roleOptions"
                :key="role.id"
                type="button"
                :class="{ active: registerForm.roleIds.includes(role.id) }"
                @click="toggleRegisterId(registerForm.roleIds, role.id)"
              >
                <span>{{ role.name }}</span>
                <small>{{ role.desc }}</small>
              </button>
            </div>
          </div>
          <div class="register-scope-section">
            <b>数据权限</b>
            <div class="register-option-grid">
              <button
                v-for="item in dataScopeOptions"
                :key="item.id"
                type="button"
                :class="{ active: registerForm.dataScopeIds.includes(item.id) }"
                @click="toggleRegisterId(registerForm.dataScopeIds, item.id)"
              >
                <span>{{ item.name }}</span>
                <small>{{ item.desc }}</small>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="register-step-body">
          <h3>提交审批</h3>
          <p>{{ registerSubmitted ? '申请已进入审批流程，请等待审批和账号开通通知。' : '提交后将进入账号创建审批流程，审批通过后由后台执行开通。' }}</p>
          <div class="register-approval-route">
            <div v-for="node in approvalRoute" :key="node.label" :class="{ done: node.done }">
              <span>{{ node.step }}</span>
              <b>{{ node.label }}</b>
              <small>{{ node.owner }}</small>
            </div>
          </div>
          <div class="register-submit-summary">
            <b>{{ registerSubmitted ? '账号创建申请已提交' : '将提交的申请' }}</b>
            <p>{{ registerForm.targetUser || '待创建账号人员' }} · {{ selectedRoleNames }} · {{ selectedDataScopeNames }}</p>
          </div>
        </div>

        <div class="register-modal-actions">
          <button type="button" class="register-ghost-btn" :disabled="registerStep === 0 || registerSubmitted" @click="prevRegisterStep">上一步</button>
          <button v-if="registerStep < registerSteps.length - 1" type="button" class="register-primary-btn" @click="nextRegisterStep">下一步</button>
          <button v-else type="button" class="register-primary-btn" :disabled="registerSubmitted" @click="submitRegisterApplication">{{ registerSubmitted ? '已提交' : '提交审批' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPreviewAuth } from '@/config/runtimeMode'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const registerModalVisible = ref(false)
const registerStep = ref(0)
const maxRegisterStep = ref(0)
const registerSubmitted = ref(false)

const registerSteps = [
  { key: 'info', label: '1. 填写信息' },
  { key: 'scope', label: '2. 权限范围' },
  { key: 'approve', label: '3. 提交审批' }
]

const roleOptions = [
  { id: 'role-workbench-basic', name: '工作台基础角色', desc: '门户首页、个人任务和基础 Agent 入口。' },
  { id: 'role-ops-viewer', name: '运营查看角色', desc: '运营看板、商品和会员数据的只读查看。' },
  { id: 'role-skill-user', name: 'Skill 使用角色', desc: 'Skill Hub 查看、试用和申请创建能力。' }
]

const dataScopeOptions = [
  { id: 'data-region-default', name: '默认组织数据', desc: '按申请人组织带出默认数据范围。' },
  { id: 'data-ops-summary', name: '运营汇总数据', desc: 'GMV、流量、转化等汇总指标。' },
  { id: 'data-member-basic', name: '会员基础标签', desc: '会员分层、权益和基础画像标签。' }
]

const registerForm = reactive({
  personType: 'internal',
  applicant: '',
  applicantItcode: '',
  targetUser: '',
  mobile: '',
  email: '',
  applicantManager: '',
  targetManager: '',
  relatedAccount: '',
  reason: '',
  roleIds: ['role-workbench-basic'],
  dataScopeIds: ['data-region-default']
})

const registerErrors = reactive({
  applicant: '',
  applicantItcode: '',
  targetUser: '',
  relatedAccount: '',
  reason: ''
})

const currentRegisterStepKey = computed(() => registerSteps[registerStep.value]?.key || 'info')
const selectedRoleNames = computed(() => roleOptions.filter((item) => registerForm.roleIds.includes(item.id)).map((item) => item.name).join('、') || '未选择角色')
const selectedDataScopeNames = computed(() => dataScopeOptions.filter((item) => registerForm.dataScopeIds.includes(item.id)).map((item) => item.name).join('、') || '默认无额外数据权限')
const approvalRoute = computed(() => [
  { step: '1', label: '申请人提交', owner: registerForm.applicant || '待填写', done: true },
  { step: '2', label: '申请人直线经理审批', owner: registerForm.applicantManager || '待带出', done: false },
  { step: '3', label: '被申请人直线经理审批', owner: registerForm.targetManager || '待带出', done: false },
  { step: '4', label: '业务审批', owner: '账号与权限管理员', done: false },
  { step: '5', label: '系统审批 / 后台执行', owner: 'sunzh4', done: false }
])

// 对应原 doLogin()
async function doLogin() {
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) { showLoginError('请输入用户名和密码'); return }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    const data = await res.json()
    if (!res.ok) { showLoginError(data.error || '登录失败'); return }

    // 写入 store，然后跳转（等价于原来隐藏 login-screen、显示 sidebar + main）
    appStore.user = data.username || u
    await appStore.loadUserContext()
    router.replace(String(route.query.redirect || '/'))
  } catch {
    if (!allowPreviewAuth) {
      showLoginError('登录服务暂不可用，请稍后重试')
      return
    }
    localStorage.setItem('preview_user', u)
    appStore.usePreviewSession(u)
    router.replace(String(route.query.redirect || '/'))
  }
}

// 对应原 showLoginError()
function showLoginError(msg: string) {
  errorMsg.value = msg
}

function openRegisterModal() {
  registerModalVisible.value = true
  registerStep.value = 0
  maxRegisterStep.value = 0
  registerSubmitted.value = false
  resetRegisterErrors()
}

function closeRegisterModal() {
  registerModalVisible.value = false
}

function resetRegisterErrors() {
  Object.keys(registerErrors).forEach((key) => {
    registerErrors[key as keyof typeof registerErrors] = ''
  })
}

function validateRegisterInfo() {
  registerErrors.applicant = registerForm.applicant ? '' : '请填写申请人姓名。'
  registerErrors.applicantItcode = registerForm.applicantItcode ? '' : '请填写申请人 ITCode。'
  registerErrors.targetUser = registerForm.targetUser ? '' : '请填写待创建账号人员。'
  registerErrors.relatedAccount = registerForm.personType === 'external' && !registerForm.relatedAccount ? '外部人员需要填写内部关联人员。' : ''
  registerErrors.reason = registerForm.reason ? '' : '请填写申请原因和业务场景。'
  return !Object.values(registerErrors).some(Boolean)
}

function goRegisterStep(index: number) {
  if (index > maxRegisterStep.value || registerSubmitted.value) return
  registerStep.value = index
}

function nextRegisterStep() {
  if (currentRegisterStepKey.value === 'info' && !validateRegisterInfo()) return
  registerStep.value = Math.min(registerStep.value + 1, registerSteps.length - 1)
  maxRegisterStep.value = Math.max(maxRegisterStep.value, registerStep.value)
}

function prevRegisterStep() {
  registerStep.value = Math.max(registerStep.value - 1, 0)
}

function toggleRegisterId(list: string[], id: string) {
  const index = list.indexOf(id)
  if (index >= 0) list.splice(index, 1)
  else list.push(id)
}

function submitRegisterApplication() {
  if (!validateRegisterInfo()) {
    registerStep.value = 0
    maxRegisterStep.value = Math.max(maxRegisterStep.value, 0)
    return
  }
  registerSubmitted.value = true
  registerStep.value = registerSteps.length - 1
  maxRegisterStep.value = registerSteps.length - 1
}
</script>

<style scoped>
.login-register-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--text-tertiary, #8a94a6);
  font-size: 13px;
}

.login-register-btn {
  border: 0;
  background: transparent;
  color: var(--primary, #316dff);
  font-weight: 700;
  cursor: pointer;
}

.login-register-btn:hover {
  text-decoration: underline;
}

.register-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.34);
  backdrop-filter: blur(8px);
}

.register-modal-panel {
  position: relative;
  width: min(920px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  cursor: pointer;
}

.register-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-right: 42px;
}

.register-modal-head h2,
.register-step-body h3 {
  margin: 0;
  color: #111827;
}

.register-modal-head p,
.register-step-body > p {
  margin: 8px 0 0;
  color: #667085;
  line-height: 1.7;
}

.register-modal-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 6px 10px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 700;
}

.register-steps {
  display: flex;
  gap: 6px;
  margin: 22px 0 20px;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  padding: 4px;
}

.register-steps button {
  flex: 1;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  font-weight: 700;
  cursor: pointer;
}

.register-steps button.active {
  background: #316dff;
  color: #fff;
}

.register-steps button.locked,
.register-steps button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.register-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 18px;
}

.register-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.register-form-grid label.full {
  grid-column: 1 / -1;
}

.register-form-grid em {
  color: #ff4d4f;
  font-style: normal;
  font-size: 12px;
}

.register-form-grid input,
.register-form-grid select,
.register-form-grid textarea {
  width: 100%;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 10px 12px;
  color: #111827;
  font: inherit;
  font-weight: 500;
  outline: none;
}

.register-form-grid input.invalid,
.register-form-grid textarea.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.register-form-grid small {
  color: #ff4d4f;
  font-weight: 600;
}

.register-scope-section {
  margin-top: 18px;
}

.register-scope-section > b {
  display: block;
  margin-bottom: 10px;
  color: #111827;
}

.register-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.register-option-grid button {
  min-height: 92px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.register-option-grid button.active {
  border-color: #316dff;
  background: #f4f7ff;
  box-shadow: inset 0 0 0 1px #316dff;
}

.register-option-grid span {
  display: block;
  color: #111827;
  font-weight: 800;
}

.register-option-grid small {
  display: block;
  margin-top: 8px;
  color: #667085;
  line-height: 1.5;
}

.register-approval-route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.register-approval-route > div {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-approval-route span {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #eef4ff;
  color: #316dff;
  font-weight: 800;
}

.register-approval-route b,
.register-approval-route small {
  display: block;
  margin-top: 8px;
}

.register-approval-route small {
  color: #667085;
}

.register-submit-summary {
  margin-top: 16px;
  border: 1px solid #b7ebc6;
  border-radius: 8px;
  padding: 14px 16px;
  background: #f0fff4;
  color: #166534;
}

.register-submit-summary b,
.register-submit-summary p {
  display: block;
  margin: 0;
}

.register-submit-summary p {
  margin-top: 6px;
}

.register-modal-actions {
  position: sticky;
  bottom: -24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 22px -24px -24px;
  border-top: 1px solid #e6edf7;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.96);
}

.register-primary-btn,
.register-ghost-btn {
  min-height: 36px;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 800;
  cursor: pointer;
}

.register-primary-btn {
  border: 1px solid #316dff;
  background: #316dff;
  color: #fff;
}

.register-ghost-btn {
  border: 1px solid #dfe7f3;
  background: #fff;
  color: #344054;
}

.register-primary-btn:disabled,
.register-ghost-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .register-form-grid,
  .register-option-grid,
  .register-approval-route {
    grid-template-columns: 1fr;
  }

  .register-modal-panel {
    padding: 18px;
  }

  .register-modal-actions {
    margin: 18px -18px -18px;
    padding: 12px 18px;
  }
}
</style>
