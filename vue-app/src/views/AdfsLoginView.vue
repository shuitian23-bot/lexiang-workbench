<template>
  <main class="adfs-page">
    <section class="adfs-visual" aria-hidden="true">
      <div class="adfs-line one"></div>
      <div class="adfs-line two"></div>
      <div class="adfs-ring"></div>
    </section>
    <section class="adfs-panel">
      <h1>Lenovo Corporation</h1>
      <p>Please login with your ITCode / Password and OTP code (if required).</p>
      <form class="adfs-form" @submit.prevent="submitAdfs">
        <label>
          <span>ITCode</span>
          <input v-model.trim="itcode" autocomplete="username" autofocus>
        </label>
        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password">
        </label>
        <label>
          <span>OTP Code</span>
          <input v-model.trim="otp" inputmode="numeric">
        </label>
        <p v-if="errorMsg" class="adfs-error">{{ errorMsg }}</p>
        <label class="adfs-check">
          <input v-model="remember" type="checkbox">
          <span>使我保持登录状态</span>
        </label>
        <button type="submit">Submit</button>
      </form>
      <footer>© 2026 Lenovo</footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const itcode = ref(String(route.query.itcode || 'noaccess'))
const password = ref('password')
const otp = ref('')
const remember = ref(false)
const errorMsg = ref('')

function submitAdfs() {
  const user = itcode.value.trim() || 'noaccess'
  if (user.toLowerCase() === 'noaccess') {
    router.replace({ path: '/access-denied', query: { itcode: user } })
    return
  }
  errorMsg.value = '当前 POC 仅 mock 无权限用户链路；有权限用户请返回使用外部账号密码登录。'
}
</script>

<style scoped>
.adfs-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  background: #fff;
  color: #111827;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.adfs-visual {
  position: relative;
  overflow: hidden;
  background: #3f92db;
}

.adfs-visual::before,
.adfs-visual::after,
.adfs-line,
.adfs-ring {
  position: absolute;
  content: '';
  pointer-events: none;
}

.adfs-visual::before {
  inset: -18% 38% -8% 12%;
  transform: rotate(-20deg);
  background: rgba(255, 255, 255, 0.12);
}

.adfs-visual::after {
  left: -10%;
  bottom: -18%;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  border: 80px solid rgba(35, 128, 217, 0.34);
}

.adfs-line {
  width: 120%;
  height: 2px;
  background: rgba(161, 230, 255, 0.48);
  transform-origin: left center;
}

.adfs-line.one {
  top: 30%;
  left: -10%;
  transform: rotate(-32deg);
}

.adfs-line.two {
  bottom: 24%;
  left: -5%;
  transform: rotate(-12deg);
}

.adfs-ring {
  left: 36px;
  bottom: 42px;
  width: 82px;
  height: 82px;
  border-radius: 50%;
  border: 12px solid rgba(92, 219, 255, 0.46);
  box-shadow: 90px -44px 0 28px rgba(255, 255, 255, 0.16);
}

.adfs-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 58px 54px;
}

.adfs-panel h1 {
  margin: 0 0 66px;
  font-size: 30px;
  font-weight: 500;
}

.adfs-panel p {
  margin: 0 0 34px;
  font-size: 17px;
  line-height: 1.35;
}

.adfs-form {
  display: grid;
  gap: 18px;
}

.adfs-form label:not(.adfs-check) {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  font-size: 18px;
}

.adfs-form input {
  height: 34px;
  border: 1px solid #b9b9b9;
  padding: 4px 8px;
  font-size: 16px;
}

.adfs-form input:focus {
  outline: 2px solid #111827;
  outline-offset: 0;
}

.adfs-error {
  margin: 0;
  color: #e53935;
  font-size: 14px;
  line-height: 1.5;
}

.adfs-check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 58px;
  font-size: 16px;
}

.adfs-check input {
  width: 16px;
  height: 16px;
}

.adfs-form button {
  justify-self: start;
  min-height: 44px;
  border: 0;
  border-radius: 4px;
  background: #168ddb;
  color: #fff;
  padding: 0 22px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.adfs-panel footer {
  margin-top: auto;
  color: #777;
  font-size: 14px;
}

@media (max-width: 760px) {
  .adfs-page {
    grid-template-columns: 1fr;
  }
  .adfs-visual {
    display: none;
  }
  .adfs-panel {
    padding: 42px 24px;
  }
}
</style>
