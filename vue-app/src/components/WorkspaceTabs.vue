<template>
  <!-- 动态页签区（对应原 #workspace-tabs，用于 AI 生成的临时报告页签）-->
  <div class="workspace-tabs-inner">
    <!-- 如需实现动态 tabs，在此扩展 -->
    <slot />
  </div>
</template>

<script setup>
// 预留：动态页签逻辑可从 aiStore.tempTabs 驱动
</script>
