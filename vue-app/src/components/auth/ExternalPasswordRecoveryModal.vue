<template>
  <div
    v-if="visible"
    class="password-recovery-layer"
    role="presentation"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <section class="password-recovery-panel" role="dialog" aria-modal="true" aria-labelledby="password-recovery-title">
      <button type="button" class="password-recovery-close" aria-label="关闭找回密码" @click="emit('close')">×</button>
      <header class="password-recovery-head">
        <span>外部用户</span>
        <h2 id="password-recovery-title">找回密码</h2>
        <p>通过账号已绑定的手机号或邮箱验证身份，验证通过后即可设置新密码。</p>
      </header>

      <ol class="password-recovery-steps" aria-label="找回密码步骤">
        <li v-for="(stepLabel, index) in stepLabels" :key="stepLabel" :class="{ active: state.step === index, done: state.step > index }">
          <i>{{ state.step > index ? '✓' : index + 1 }}</i>
          <span>{{ stepLabel }}</span>
        </li>
      </ol>

      <div v-if="state.step === 0" class="password-recovery-body">
        <div class="recovery-method-field">
          <span class="recovery-field-label">验证方式</span>
          <div class="recovery-method-switch" role="radiogroup" aria-label="验证方式">
            <button type="button" role="radio" :aria-checked="state.method === 'mobile'" :class="{ active: state.method === 'mobile' }" @click="setMethod('mobile')">手机号验证</button>
            <button type="button" role="radio" :aria-checked="state.method === 'email'" :class="{ active: state.method === 'email' }" @click="setMethod('email')">邮箱验证</button>
          </div>
        </div>

        <label class="recovery-form-field">
          <span>用户名 <em>必填</em></span>
          <input ref="accountInput" v-model.trim="state.account" autocomplete="username" :class="{ invalid: state.errors.account }" placeholder="请输入外部用户登录名" @blur="validateIdentity">
          <small v-if="state.errors.account" class="recovery-field-error">{{ state.errors.account }}</small>
        </label>

        <label class="recovery-form-field">
          <span>{{ state.method === 'mobile' ? '手机号' : '邮箱' }} <em>必填</em></span>
          <input
            v-model.trim="state.contact"
            :type="state.method === 'email' ? 'email' : 'tel'"
            :inputmode="state.method === 'mobile' ? 'numeric' : 'email'"
            :autocomplete="state.method === 'mobile' ? 'tel' : 'email'"
            :class="{ invalid: state.errors.contact }"
            :placeholder="state.method === 'mobile' ? '请输入账号已绑定的手机号' : '请输入账号已绑定的邮箱'"
            @blur="validateIdentity"
          >
          <small v-if="state.errors.contact" class="recovery-field-error">{{ state.errors.contact }}</small>
        </label>

        <label class="recovery-form-field">
          <span>验证码 <em>必填</em></span>
          <div class="recovery-code-row">
            <input v-model.trim="state.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" :class="{ invalid: state.errors.code }" placeholder="请输入 6 位验证码" @input="normalizeCode">
            <button type="button" :disabled="state.sending || state.countdown > 0" @click="sendCode">
              {{ state.sending ? '发送中…' : state.countdown > 0 ? state.countdown + 's 后重发' : state.codeSent ? '重新发送' : '获取验证码' }}
            </button>
          </div>
          <small v-if="state.errors.code" class="recovery-field-error">{{ state.errors.code }}</small>
          <small v-else-if="state.notice" class="recovery-field-help" role="status">{{ state.notice }}</small>
          <small v-if="allowPreviewAuth && state.codeSent" class="recovery-preview-code">本地预览验证码：{{ PREVIEW_CODE }}</small>
        </label>

        <p class="password-recovery-security-note">为保护账号安全，无论填写的信息是否匹配，系统均使用相同提示。</p>
      </div>

      <div v-else-if="state.step === 1" class="password-recovery-body">
        <div class="password-recovery-verified">
          <i>✓</i>
          <div><b>身份验证已通过</b><span>{{ maskedContact }}</span></div>
        </div>
        <label class="recovery-form-field">
          <span>新密码 <em>必填</em></span>
          <input ref="newPasswordInput" v-model="state.newPassword" type="password" autocomplete="new-password" :class="{ invalid: state.errors.newPassword }" placeholder="请输入至少 8 位的新密码" @blur="validatePassword">
          <small v-if="state.errors.newPassword" class="recovery-field-error">{{ state.errors.newPassword }}</small>
          <small v-else class="recovery-field-help">密码长度至少 8 位，建议同时包含字母、数字和符号。</small>
        </label>
        <label class="recovery-form-field">
          <span>确认新密码 <em>必填</em></span>
          <input v-model="state.confirmPassword" type="password" autocomplete="new-password" :class="{ invalid: state.errors.confirmPassword }" placeholder="请再次输入新密码" @blur="validatePassword">
          <small v-if="state.errors.confirmPassword" class="recovery-field-error">{{ state.errors.confirmPassword }}</small>
        </label>
        <div v-if="state.submitError" class="password-recovery-submit-error" role="alert">{{ state.submitError }}</div>
      </div>

      <div v-else class="password-recovery-success" role="status">
        <i>✓</i>
        <h3>密码修改成功</h3>
        <p>请返回外部用户登录，使用新密码登录工作台。</p>
      </div>

      <footer class="password-recovery-actions">
        <button v-if="state.step < 2" type="button" class="recovery-secondary-btn" :disabled="state.submitting || state.verifying" @click="emit('close')">取消</button>
        <button v-if="state.step === 0" type="button" class="recovery-primary-btn" :disabled="state.verifying" @click="verifyCode">
          {{ state.verifying ? '校验中…' : '下一步' }}
        </button>
        <button v-else-if="state.step === 1" type="button" class="recovery-primary-btn" :disabled="state.submitting" @click="submitPassword">
          {{ state.submitting ? '提交中…' : '确认修改密码' }}
        </button>
        <button v-else type="button" class="recovery-primary-btn" @click="emit('complete', state.account)">返回登录</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { allowPreviewAuth } from '@/config/runtimeMode'

const props = defineProps<{
  visible: boolean
  initialAccount?: string
}>()

const emit = defineEmits<{
  close: []
  complete: [account: string]
}>()

const PREVIEW_CODE = '246810'
const stepLabels = ['身份验证', '设置新密码', '完成']
const accountInput = ref<HTMLInputElement | null>(null)
const newPasswordInput = ref<HTMLInputElement | null>(null)
let countdownTimer: ReturnType<typeof window.setInterval> | null = null

const state = reactive({
  step: 0,
  method: 'mobile' as 'mobile' | 'email',
  account: '',
  contact: '',
  code: '',
  codeSent: false,
  sending: false,
  verifying: false,
  countdown: 0,
  recoveryToken: '',
  newPassword: '',
  confirmPassword: '',
  submitting: false,
  notice: '',
  submitError: '',
  errors: {
    account: '',
    contact: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  }
})

const maskedContact = computed(() => {
  if (state.method === 'email') {
    const parts = state.contact.split('@')
    const name = parts[0] || ''
    const domain = parts[1] || ''
    const visibleName = name.length <= 2 ? name.slice(0, 1) + '*' : name.slice(0, 2) + '***'
    return '已通过邮箱 ' + visibleName + '@' + domain + ' 完成验证'
  }
  return '已通过手机号 ' + state.contact.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2') + ' 完成验证'
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      clearCountdown()
      return
    }
    reset()
    nextTick(() => accountInput.value?.focus())
  }
)

function clearCountdown() {
  if (countdownTimer != null) window.clearInterval(countdownTimer)
  countdownTimer = null
  state.countdown = 0
}

function resetErrors() {
  Object.keys(state.errors).forEach((key) => {
    state.errors[key as keyof typeof state.errors] = ''
  })
}

function reset() {
  clearCountdown()
  state.step = 0
  state.method = 'mobile'
  state.account = props.initialAccount?.trim() || ''
  state.contact = ''
  state.code = ''
  state.codeSent = false
  state.sending = false
  state.verifying = false
  state.recoveryToken = ''
  state.newPassword = ''
  state.confirmPassword = ''
  state.submitting = false
  state.notice = ''
  state.submitError = ''
  resetErrors()
}

function setMethod(method: 'mobile' | 'email') {
  if (state.method === method) return
  state.method = method
  state.contact = ''
  state.code = ''
  state.codeSent = false
  state.notice = ''
  state.errors.contact = ''
  state.errors.code = ''
  clearCountdown()
}

function isValidContact() {
  if (state.method === 'mobile') return /^1\d{10}$/.test(state.contact)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact)
}

function validateIdentity() {
  state.errors.account = state.account ? '' : '请输入外部用户登录名。'
  if (!state.contact) {
    state.errors.contact = '请输入账号已绑定的' + (state.method === 'mobile' ? '手机号' : '邮箱') + '。'
  } else {
    state.errors.contact = isValidContact() ? '' : '请输入正确的' + (state.method === 'mobile' ? '手机号' : '邮箱') + '格式。'
  }
  return !state.errors.account && !state.errors.contact
}

function startCountdown() {
  clearCountdown()
  state.countdown = 60
  countdownTimer = window.setInterval(() => {
    state.countdown -= 1
    if (state.countdown <= 0) clearCountdown()
  }, 1000)
}

async function sendCode() {
  if (!validateIdentity()) return
  state.sending = true
  state.errors.code = ''
  state.notice = ''
  try {
    const response = await fetch('/api/admin/password-recovery/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.account,
        method: state.method,
        contact: state.contact
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error('验证码发送失败')
    state.recoveryToken = data.token || ''
  } catch {
    if (!allowPreviewAuth) {
      state.errors.code = '验证码发送失败，请稍后重试。'
      return
    }
    state.recoveryToken = 'preview-password-recovery'
  } finally {
    state.sending = false
  }
  state.codeSent = true
  state.notice = '如账号信息匹配，验证码将发送至该' + (state.method === 'mobile' ? '手机号' : '邮箱') + '，10 分钟内有效。'
  startCountdown()
}

function normalizeCode(event: Event) {
  const target = event.target as HTMLInputElement
  state.code = target.value.replace(/\D/g, '').slice(0, 6)
  state.errors.code = ''
}

async function verifyCode() {
  if (!validateIdentity()) return
  if (!state.codeSent) {
    state.errors.code = '请先获取验证码。'
    return
  }
  if (!/^\d{6}$/.test(state.code)) {
    state.errors.code = '请输入 6 位验证码。'
    return
  }
  if (allowPreviewAuth) {
    if (state.code !== PREVIEW_CODE) {
      state.errors.code = '验证码错误，请重新输入。'
      return
    }
  } else {
    state.verifying = true
    try {
      const response = await fetch('/api/admin/password-recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: state.account,
          method: state.method,
          contact: state.contact,
          code: state.code,
          token: state.recoveryToken
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('验证码错误或已过期，请重新获取。')
      state.recoveryToken = data.token || state.recoveryToken
    } catch (error) {
      state.errors.code = error instanceof Error ? error.message : '验证码校验失败，请稍后重试。'
      return
    } finally {
      state.verifying = false
    }
  }
  state.errors.code = ''
  state.step = 1
  clearCountdown()
  nextTick(() => newPasswordInput.value?.focus())
}

function validatePassword() {
  state.errors.newPassword = state.newPassword.length >= 8 ? '' : '新密码至少需要 8 位。'
  state.errors.confirmPassword = state.confirmPassword ? '' : '请再次输入新密码。'
  if (state.confirmPassword && state.newPassword !== state.confirmPassword) {
    state.errors.confirmPassword = '两次输入的新密码不一致。'
  }
  return !state.errors.newPassword && !state.errors.confirmPassword
}

async function submitPassword() {
  if (!validatePassword()) return
  state.submitting = true
  state.submitError = ''
  try {
    const response = await fetch('/api/admin/password-recovery/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.account,
        method: state.method,
        contact: state.contact,
        code: state.code,
        token: state.recoveryToken,
        new_password: state.newPassword
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '密码修改失败')
  } catch (error) {
    if (!allowPreviewAuth) {
      state.submitError = error instanceof Error ? error.message : '密码修改失败，请稍后重试。'
      return
    }
  } finally {
    state.submitting = false
  }
  state.step = 2
}

onUnmounted(clearCountdown)
</script>

<style scoped>
.password-recovery-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.46);
}

.password-recovery-panel {
  position: relative;
  width: min(520px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  padding: 24px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.password-recovery-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  font-size: 20px;
  cursor: pointer;
}

.password-recovery-head {
  padding-right: 42px;
}

.password-recovery-head > span {
  color: var(--primary, #316dff);
  font-size: 12px;
  font-weight: 800;
}

.password-recovery-head h2,
.password-recovery-success h3 {
  margin: 6px 0 0;
  color: #111827;
}

.password-recovery-head p,
.password-recovery-success p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.password-recovery-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 22px 0 20px;
  padding: 0;
  list-style: none;
}

.password-recovery-steps li {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8a94a6;
  font-size: 12px;
  font-weight: 700;
}

.password-recovery-steps li::after {
  height: 1px;
  flex: 1 1 auto;
  background: #dfe7f3;
  content: '';
}

.password-recovery-steps li:last-child::after {
  display: none;
}

.password-recovery-steps i,
.password-recovery-success > i,
.password-recovery-verified > i {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #eef2f7;
  color: #667085;
  font-size: 12px;
  font-style: normal;
}

.password-recovery-steps li.active,
.password-recovery-steps li.done {
  color: var(--primary, #316dff);
}

.password-recovery-steps li.active i,
.password-recovery-steps li.done i,
.password-recovery-verified > i,
.password-recovery-success > i {
  background: var(--primary, #316dff);
  color: #fff;
}

.password-recovery-body {
  display: grid;
  gap: 16px;
}

.recovery-method-field,
.recovery-form-field {
  display: grid;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.recovery-form-field em {
  color: #ff4d4f;
  font-size: 12px;
  font-style: normal;
}

.recovery-method-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recovery-method-switch button {
  min-height: 38px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #455468;
  font-weight: 700;
  cursor: pointer;
}

.recovery-method-switch button.active {
  border-color: var(--primary, #316dff);
  background: #f2f6ff;
  color: var(--primary, #316dff);
}

.recovery-form-field input {
  width: 100%;
  min-height: 40px;
  box-sizing: border-box;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 9px 12px;
  color: #111827;
  font: inherit;
  font-weight: 500;
}

.recovery-form-field input.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.recovery-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px;
  gap: 10px;
}

.recovery-code-row button {
  border: 1px solid #bed0ff;
  border-radius: 8px;
  background: #f2f6ff;
  color: var(--primary, #316dff);
  font-weight: 700;
  cursor: pointer;
}

.recovery-code-row button:disabled,
.password-recovery-actions button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.recovery-field-error,
.password-recovery-submit-error {
  color: #d92d20;
  font-size: 12px;
  line-height: 1.5;
}

.recovery-field-help,
.recovery-preview-code {
  color: #667085;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.recovery-preview-code {
  color: #8a5a00;
}

.password-recovery-security-note {
  margin: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.password-recovery-verified {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #cfe8d7;
  border-radius: 8px;
  padding: 12px;
  background: #f2fbf5;
}

.password-recovery-verified b,
.password-recovery-verified span {
  display: block;
}

.password-recovery-verified b {
  color: #176b38;
  font-size: 13px;
}

.password-recovery-verified span {
  margin-top: 3px;
  color: #47705a;
  font-size: 12px;
}

.password-recovery-submit-error {
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff4f3;
}

.password-recovery-success {
  display: grid;
  justify-items: center;
  min-height: 220px;
  align-content: center;
  text-align: center;
}

.password-recovery-success > i {
  width: 52px;
  height: 52px;
  font-size: 24px;
}

.password-recovery-success h3 {
  margin-top: 16px;
}

.password-recovery-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  border-top: 1px solid #e8edf5;
  padding-top: 16px;
}

.password-recovery-actions button {
  min-height: 38px;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 700;
  cursor: pointer;
}

.recovery-secondary-btn {
  border: 1px solid #dfe7f3;
  background: #fff;
  color: #455468;
}

.recovery-primary-btn {
  border: 1px solid var(--primary, #316dff);
  background: var(--primary, #316dff);
  color: #fff;
}

.password-recovery-close:focus-visible,
.password-recovery-panel button:focus-visible,
.password-recovery-panel input:focus-visible {
  outline: 2px solid var(--primary, #316dff);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .password-recovery-layer {
    align-items: end;
    padding: 12px;
  }

  .password-recovery-panel {
    max-height: calc(100vh - 24px);
    padding: 20px;
  }

  .password-recovery-steps li span {
    display: none;
  }

  .recovery-code-row {
    grid-template-columns: minmax(0, 1fr) 112px;
  }
}
</style>
