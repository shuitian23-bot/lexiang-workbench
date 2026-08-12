<template>
  <div class="page-header">
    <div>
      <div class="page-title">运营总览</div>
      <div class="page-desc">核心经营指标、访问用户、业务趋势总览</div>
    </div>
  </div>
  <div class="card" style="padding:32px;text-align:center;color:var(--text-tertiary);margin-top:16px">
    <p style="font-size:28px;margin-bottom:12px">🚧</p>
    <p style="font-size:15px;font-weight:500;margin-bottom:8px;color:var(--text-secondary)">运营总览模块迁移中</p>
    <p style="font-size:13px">功能正在从原版 HTML 迁移至 Vue 架构，可先通过右侧 AI 助手完成操作</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
onMounted(() => {
  appStore.ensureStaticTab('dashboard.overview')
  appStore.setActiveStaticTab('dashboard.overview')
})
</script>
