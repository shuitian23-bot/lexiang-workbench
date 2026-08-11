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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPreviewAuth } from '@/config/runtimeMode'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

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
</script>
