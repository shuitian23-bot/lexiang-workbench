<template>
  <!-- RouterView 会渲染 LoginView 或 AppLayout，不需要额外包层 -->
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

onMounted(() => {
  // 恢复深色模式偏好
  appStore.applyDarkMode(appStore.darkMode)
})
</script>
