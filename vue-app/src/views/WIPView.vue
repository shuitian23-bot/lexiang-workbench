<template>
  <!-- 开发中占位页（对应原 renderPage 兜底模板）-->
  <div class="page-header">
    <div>
      <div class="page-title">{{ pageTitle }}</div>
      <div class="page-desc">功能开发中，敬请期待</div>
    </div>
  </div>
  <div class="empty-state">
    <div class="icon">🚧</div>
    <div class="title">{{ pageTitle }}</div>
    <div>该模块正在建设中，可通过右侧 AI 助手使用自然语言操作</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => route.meta?.label || '建设中')
</script>
