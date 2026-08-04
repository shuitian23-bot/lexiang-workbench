<template>
  <main class="adfs-login-page">
    <section class="adfs-visual" aria-hidden="true">
      <div class="adfs-line line-a"></div>
      <div class="adfs-line line-b"></div>
      <div class="adfs-line line-c"></div>
      <div class="adfs-circle circle-a"></div>
      <div class="adfs-circle circle-b"></div>
      <div class="adfs-circle circle-c"></div>
    </section>

    <section class="adfs-panel" aria-label="Lenovo ADFS 登录">
      <form class="adfs-form" @submit.prevent="submitAdfsLogin">
        <h1>Lenovo Corporation</h1>
        <p>Please login with your ITCode / Password and OTP code (if required).</p>

        <label class="adfs-row">
          <span>ITCode</span>
          <input v-model.trim="itcode" autofocus autocomplete="username" />
        </label>
        <label class="adfs-row">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <label class="adfs-row">
          <span>OTP Code</span>
          <input v-model.trim="otpCode" inputmode="numeric" autocomplete="one-time-code" />
        </label>

        <p class="adfs-register">If this is the first time you are using Lenovo OTP, please <button type="button">register</button>.</p>

        <label class="adfs-remember">
          <input v-model="rememberMe" type="checkbox" />
          <span>使我保持登录状态</span>
        </label>
        <div v-if="errorMsg" class="adfs-error">{{ errorMsg }}</div>
        <button class="adfs-submit" type="submit">Submit</button>
      </form>
      <footer>© 2026 Lenovo</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const itcode = ref('')
const password = ref('')
const otpCode = ref('')
const rememberMe = ref(false)
const errorMsg = ref('')
const noAccessAccounts = ['noaccess', 'guest01']

async function submitAdfsLogin() {
  const account = itcode.value.trim()
  if (!account || !password.value) {
    errorMsg.value = '请输入 ITCode 和 Password。'
    return
  }

  if (noAccessAccounts.includes(account.toLowerCase())) {
    localStorage.removeItem('preview_user')
    appStore.user = null
    await router.replace({ path: '/access-denied', query: { itcode: account } })
    return
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: account, password: password.value, otpCode: otpCode.value, rememberMe: rememberMe.value, loginType: 'adfs' })
    })
    const data = await res.json()
    if (!res.ok) {
      errorMsg.value = data.error || '登录失败'
      return
    }
    appStore.user = data.username || account
    await appStore.loadUserContext()
    await router.replace(String(route.query.redirect || '/'))
  } catch {
    errorMsg.value = '登录服务暂不可用，请稍后重试'
  }
}
</script>

<style scoped>
.adfs-login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 458px;
  background: #fff;
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
}

.adfs-visual {
  position: relative;
  overflow: hidden;
  background: #4697de;
}

.adfs-visual::before,
.adfs-visual::after {
  content: '';
  position: absolute;
  inset: -18% auto auto -8%;
  width: 46%;
  height: 130%;
  background: rgba(255, 255, 255, 0.12);
  transform: rotate(-18deg);
}

.adfs-visual::after {
  inset: auto -10% -18% auto;
  width: 38%;
  height: 120%;
  background: rgba(8, 97, 180, 0.16);
}

.adfs-line {
  position: absolute;
  height: 2px;
  background: rgba(150, 230, 255, 0.72);
  transform-origin: left center;
}

.line-a { top: 36%; left: 0; width: 58%; transform: rotate(-30deg); }
.line-b { top: 3%; left: 29%; width: 44%; transform: rotate(-35deg); }
.line-c { bottom: 20%; left: 42%; width: 78%; transform: rotate(-13deg); }

.adfs-circle {
  position: absolute;
  border-radius: 999px;
  border: 3px solid rgba(117, 223, 255, 0.42);
  background: rgba(255, 255, 255, 0.08);
}

.circle-a { left: 8%; bottom: 11%; width: 148px; height: 148px; }
.circle-b { left: 15%; bottom: -6%; width: 228px; height: 228px; }
.circle-c { left: 2%; bottom: 4%; width: 76px; height: 76px; }

.adfs-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 66px 66px 34px;
  background: #fff;
}

.adfs-form h1 {
  margin: 0 0 86px;
  font-size: 34px;
  font-weight: 400;
  letter-spacing: 0;
}

.adfs-form > p:not(.adfs-register) {
  margin: 0 0 34px;
  font-size: 17px;
  line-height: 1.35;
}

.adfs-row {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  font-size: 18px;
}

.adfs-row input {
  width: 100%;
  height: 39px;
  border: 1px solid #9b9b9b;
  padding: 5px 8px;
  background: #fff;
  color: #111827;
  font-size: 16px;
}

.adfs-row input:focus {
  outline: 2px solid #111827;
  outline-offset: -2px;
  background: #eaf2ff;
}

.adfs-register {
  margin: 0 0 42px;
  font-size: 18px;
  line-height: 1.35;
}

.adfs-register button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #1683f5;
  font: inherit;
  cursor: pointer;
}

.adfs-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 16px;
}

.adfs-remember input {
  width: 16px;
  height: 16px;
}

.adfs-error {
  margin: 0 0 8px;
  color: #d92d20;
  font-size: 14px;
}

.adfs-submit {
  min-width: 104px;
  min-height: 48px;
  border: 0;
  border-radius: 3px;
  background: #0787e5;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.adfs-submit:hover {
  background: #0678cc;
}

.adfs-panel footer {
  color: #6b7280;
  font-size: 16px;
}

@media (max-width: 900px) {
  .adfs-login-page {
    grid-template-columns: 1fr;
  }

  .adfs-visual {
    min-height: 180px;
  }

  .adfs-panel {
    padding: 36px 24px 28px;
  }

  .adfs-form h1 {
    margin-bottom: 36px;
    font-size: 28px;
  }

  .adfs-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
