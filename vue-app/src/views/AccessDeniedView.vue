<template>
  <main class="access-denied-page">
    <section class="access-card">
      <div class="access-brand">
        <div class="access-logo">L</div>
        <span>联想乐享</span>
      </div>

      <div class="access-body">
        <span class="access-eyebrow">访问权限未开通</span>
        <h1>当前账号暂无乐享 AI 工作台访问权限</h1>
        <p>您已完成内部账号认证，但尚未配置工作台权限。点击“申请访问权限”后，可直接选择角色、功能权限和数据权限，并一次提交审批。</p>

        <dl class="access-summary">
          <div>
            <dt>当前 ITCode</dt>
            <dd>{{ itcode }}</dd>
          </div>
          <div>
            <dt>审批路径</dt>
            <dd>直线经理与业务负责人</dd>
          </div>
          <div>
            <dt>申请类型</dt>
            <dd>首次访问权限</dd>
          </div>
        </dl>

        <div class="access-tip">
          <b>无需单独申请账号</b>
          <p>内部账号已完成认证，本次只需选择所需权限范围。</p>
        </div>

        <div class="access-actions">
          <button type="button" class="secondary-btn" @click="backToLogin">返回登录页</button>
          <button type="button" class="primary-btn" @click="goToPermissionRequest">申请访问权限</button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const itcode = computed(() => String(route.query.itcode || 'noaccess'))

function goToPermissionRequest() {
  router.push({
    path: '/agent/permissions',
    query: {
      module: 'apply',
      entry: 'first-access',
      itcode: itcode.value
    }
  })
}

function backToLogin() {
  appStore.user = null
  router.replace('/login')
}
</script>

<style scoped>
.access-denied-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 18px;
  background: #f3f6fb;
  color: #172033;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.access-card {
  width: min(820px, 100%);
  overflow: hidden;
  border: 1px solid #dfe7f2;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
}

.access-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e6edf5;
  padding: 18px 28px;
  font-weight: 800;
}

.access-logo {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #e2231a;
  color: #fff;
}

.access-body {
  padding: 32px 36px 36px;
}

.access-eyebrow {
  display: inline-flex;
  margin-bottom: 14px;
  border-radius: 999px;
  padding: 5px 10px;
  background: #fff4e5;
  color: #b45309;
  font-size: 12px;
  font-weight: 800;
}

.access-body h1 {
  margin: 0;
  color: #101828;
  font-size: 26px;
  line-height: 1.35;
}

.access-body > p {
  margin: 12px 0 0;
  color: #667085;
  line-height: 1.8;
}

.access-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.access-summary div {
  border: 1px solid #e5edf7;
  border-radius: 8px;
  padding: 14px;
  background: #f8fbff;
}

.access-summary dt {
  color: #667085;
  font-size: 12px;
}

.access-summary dd {
  margin: 6px 0 0;
  color: #172033;
  font-weight: 800;
}

.access-tip {
  border: 1px solid #cfe0ff;
  border-radius: 8px;
  padding: 14px 16px;
  background: #f5f8ff;
}

.access-tip b {
  color: #244ea3;
}

.access-tip p {
  margin: 6px 0 0;
  color: #52637a;
  line-height: 1.6;
}

.access-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.primary-btn,
.secondary-btn {
  min-height: 40px;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid #316dff;
  background: #316dff;
  color: #fff;
}

.secondary-btn {
  border: 1px solid #d8e1ee;
  background: #fff;
  color: #455468;
}

@media (max-width: 760px) {
  .access-summary {
    grid-template-columns: 1fr;
  }

  .access-body {
    padding: 26px 22px 28px;
  }

  .access-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
