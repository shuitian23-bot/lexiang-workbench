<template>
  <div class="sidebar-header" @click="$emit('home')" title="返回首页">
    <div class="brand-lockup">
      <img class="logo-full" src="/assets/logo-full.png" alt="联想乐享" />
    </div>
    <img class="logo-icon-img" src="/assets/logo-icon.png" alt="联想乐享" />
    <button
      class="sidebar-collapse-btn"
      :class="{ 'is-collapsed': collapsed, 'is-expanded': !collapsed }"
      :data-tooltip="collapsed ? '展开侧栏' : '收起侧栏'"
      data-tooltip-placement="bottom"
      :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
      @click.stop="$emit('toggle')"
    >
      <svg class="sidebar-panel-toggle-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/>
        <rect v-if="collapsed" x="8.6" y="6.3" width="1.8" height="11.4" rx="0.9" fill="currentColor"/>
        <rect v-else x="13.6" y="6.3" width="1.8" height="11.4" rx="0.9" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['home', 'toggle'])
</script>
